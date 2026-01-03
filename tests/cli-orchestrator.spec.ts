import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CodexOrchestrator } from '../orchestrator/src/cli/orchestrator.js';
import { getTelemetrySchemas, validateCliManifest } from '../orchestrator/src/cli/telemetry/schema.js';
import { formatPlanPreview } from '../orchestrator/src/cli/utils/planFormatter.js';
import { resolveRunPaths } from '../orchestrator/src/cli/run/runPaths.js';
import { resolveEnvironmentPaths } from '../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths } from '../orchestrator/src/cli/run/environment.js';

const diagnosticsConfig = {
  defaultPipeline: 'simple',
  pipelines: [
    {
      id: 'simple',
      title: 'Simple pipeline',
      guardrailsRequired: false,
      stages: [
        {
          kind: 'command',
          id: 'echo-ok',
          title: 'emit ok',
          command: "node -e \"console.log('ok')\""
        }
      ]
    },
    {
      id: 'failable',
      title: 'Fail once pipeline',
      guardrailsRequired: false,
      stages: [
        {
          kind: 'command',
          id: 'fail-once',
          title: 'fail once',
          command: 'node fail-once.js'
        }
      ]
    },
    {
      id: 'parent',
      title: 'Parent pipeline',
      guardrailsRequired: false,
      stages: [
        {
          kind: 'subpipeline',
          id: 'child-simple',
          title: 'Run simple pipeline',
          pipeline: 'simple'
        }
      ]
    },
    {
      id: 'optional-parent',
      title: 'Optional child pipeline',
      guardrailsRequired: false,
      stages: [
        {
          kind: 'subpipeline',
          id: 'child-failable',
          title: 'Run failable pipeline optionally',
          pipeline: 'failable',
          optional: true
        }
      ]
    }
  ]
};

const TEST_TIMEOUT_MS = 15000;

describe('CodexOrchestrator CLI', () => {
  let tempDir: string;
  let runsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-cli-'));
    runsDir = path.join(tempDir, '.runs');
    process.env.CODEX_ORCHESTRATOR_ROOT = tempDir;
    process.env.CODEX_ORCHESTRATOR_RUNS_DIR = runsDir;
    process.env.CODEX_ORCHESTRATOR_OUT_DIR = path.join(tempDir, 'out');
    process.env.MCP_RUNNER_TASK_ID = '0101';

    await fs.writeFile(
      path.join(tempDir, 'codex.orchestrator.json'),
      `${JSON.stringify(diagnosticsConfig, null, 2)}\n`
    );

    const failScript = `const fs = require('fs');\nconst path = require('path');\nconst flag = path.join(process.cwd(), 'fail.flag');\nif (fs.existsSync(flag)) {\n  fs.unlinkSync(flag);\n  console.error('failing once');\n  process.exit(1);\n}\nconsole.log('ok');\n`;
    await fs.writeFile(path.join(tempDir, 'fail-once.js'), failScript, { mode: 0o755 });
  });

  afterEach(async () => {
    delete process.env.CODEX_ORCHESTRATOR_ROOT;
    delete process.env.CODEX_ORCHESTRATOR_RUNS_DIR;
    delete process.env.CODEX_ORCHESTRATOR_OUT_DIR;
    delete process.env.MCP_RUNNER_TASK_ID;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('runs the simple pipeline and writes manifest, metrics, and summary', async () => {
    const orchestrator = new CodexOrchestrator();
    const result = await orchestrator.start({ pipelineId: 'simple' });

    expect(result.manifest.status).toBe('succeeded');
    const manifestPath = path.join(tempDir, result.manifest.artifact_root, 'manifest.json');
    const manifestRaw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);
    expect(Array.isArray(manifest.commands)).toBe(true);
    expect(manifest.metrics_recorded).toBe(true);
    expect(manifest.summary).toContain('Guardrails: spec-guard command not found.');

    const metricsPath = path.join(runsDir, '0101', 'metrics.json');
    const metricsContent = await fs.readFile(metricsPath, 'utf8');
    expect(metricsContent.trim().length).toBeGreaterThan(0);

    const summaryPath = path.join(tempDir, result.manifest.run_summary_path as string);
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    expect(summary.runId).toBe(result.manifest.run_id);
  });

  it('resumes a failed run and clears resume flag', async () => {
    const orchestrator = new CodexOrchestrator();
    await fs.writeFile(path.join(tempDir, 'fail.flag'), 'fail');

    const failed = await orchestrator.start({ pipelineId: 'failable' });
    expect(failed.manifest.status).toBe('failed');

    const resumed = await orchestrator.resume({ runId: failed.manifest.run_id });
    expect(resumed.manifest.status).toBe('succeeded');
  });

  it('retains failure status_detail after heartbeat flush', async () => {
    const orchestrator = new CodexOrchestrator();
    await fs.writeFile(path.join(tempDir, 'fail.flag'), 'fail');

    const failed = await orchestrator.start({ pipelineId: 'failable' });
    expect(failed.manifest.status).toBe('failed');
    expect(failed.manifest.status_detail).toBe('stage:fail-once:failed');

    const manifestPath = path.join(tempDir, failed.manifest.artifact_root, 'manifest.json');
    const storedManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(storedManifest.status_detail).toBe('stage:fail-once:failed');
  });

  it('records child runs for sub-pipeline stages', async () => {
    const orchestrator = new CodexOrchestrator();
    const parent = await orchestrator.start({ pipelineId: 'parent' });
    expect(parent.manifest.child_runs).toHaveLength(1);

    const child = parent.manifest.child_runs[0];
    expect(child.status).toBe('succeeded');

    const env = normalizeEnvironmentPaths(resolveEnvironmentPaths());
    const childPaths = resolveRunPaths(env, child.run_id);
    const childManifest = JSON.parse(await fs.readFile(childPaths.manifestPath, 'utf8'));
    expect(childManifest.parent_run_id).toBe(parent.manifest.run_id);
  });

  it('propagates actual child run status for optional failures', async () => {
    const orchestrator = new CodexOrchestrator();
    await fs.writeFile(path.join(tempDir, 'fail.flag'), 'fail');

    const parent = await orchestrator.start({ pipelineId: 'optional-parent' });
    expect(parent.manifest.status).toBe('succeeded');
    expect(parent.manifest.commands[0]!.status).toBe('skipped');

    const childRecord = parent.manifest.child_runs[0];
    expect(childRecord.status).toBe('failed');
    expect(childRecord.run_id).toBe(parent.manifest.commands[0]!.sub_run_id);
  });

  it('previews pipeline plans in JSON and text formats', async () => {
    const orchestrator = new CodexOrchestrator();
    const preview = await orchestrator.plan({ pipelineId: 'parent' });

    expect(preview.pipeline.id).toBe('parent');
    expect(preview.pipeline.source).toBe('user');
    expect(preview.stages[0]).toMatchObject({
      kind: 'subpipeline',
      pipeline: 'simple'
    });
    expect(preview.plan.items).toHaveLength(1);

    const text = formatPlanPreview(preview);
    expect(text).toContain('Pipeline: parent — Parent pipeline [user]');
    expect(text).toContain('[subpipeline] Run simple pipeline (child-simple)');
    expect(text).toContain('pipeline: simple');
  });

  it('validates manifest structure via telemetry helper', async () => {
    const orchestrator = new CodexOrchestrator();
    const result = await orchestrator.start({ pipelineId: 'simple' });

    const schemas = getTelemetrySchemas();
    expect(schemas.manifest).toBeTruthy();

    const validation = validateCliManifest(result.manifest);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    const broken = { ...result.manifest, commands: null as unknown as [] };
    const brokenValidation = validateCliManifest(broken);
    expect(brokenValidation.valid).toBe(false);
    expect(brokenValidation.errors.length).toBeGreaterThan(0);
  });
}, TEST_TIMEOUT_MS);
