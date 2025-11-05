import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  ControlPlaneDriftReporter,
  ControlPlaneValidationError,
  ControlPlaneValidator
} from '../src/control-plane/index.js';
import { buildRunRequestV2 } from '../src/control-plane/request-builder.js';
import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { CliManifest, PipelineDefinition } from '../src/cli/types.js';
import type { TaskContext } from '../src/types.js';

function createManifest(runId: string, pipeline: PipelineDefinition): CliManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    task_id: 'autonomy-upgrade',
    task_slug: 'autonomy-upgrade',
    run_id: runId,
    parent_run_id: null,
    pipeline_id: pipeline.id,
    pipeline_title: pipeline.title,
    runner: 'codex-cli',
    approval_policy: null,
    status: 'queued',
    status_detail: null,
    started_at: now,
    completed_at: null,
    updated_at: now,
    heartbeat_at: now,
    heartbeat_interval_seconds: 5,
    heartbeat_stale_after_seconds: 30,
    artifact_root: `.runs/autonomy-upgrade/cli/${runId}`,
    compat_path: `.runs/autonomy-upgrade/cli/${runId}/compat`,
    log_path: `.runs/autonomy-upgrade/cli/${runId}/log.ndjson`,
    summary: null,
    metrics_recorded: false,
    resume_token: 'token',
    resume_events: [],
    approvals: [],
    commands: [],
    child_runs: [],
    run_summary_path: null,
    instructions_hash: null,
    instructions_sources: []
  };
}

describe('ControlPlaneValidator', () => {
  it('validates requests and records drift in shadow mode', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'control-plane-shadow-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'autonomy-upgrade'
    };

    const pipeline: PipelineDefinition = {
      id: 'pipeline-default',
      title: 'Default Pipeline',
      stages: [
        { kind: 'command', id: 'build', title: 'Build', command: 'echo build' },
        { kind: 'command', id: 'test', title: 'Test', command: 'echo test' }
      ],
      tags: ['general', 'sandbox']
    };

    const manifest = createManifest('run-shadow', pipeline);
    const task: TaskContext = {
      id: 'autonomy-upgrade',
      title: 'Autonomy Upgrade',
      description: 'Test run',
      metadata: { slug: 'autonomy-upgrade' }
    };

    const request = buildRunRequestV2({
      runId: manifest.run_id,
      task,
      pipeline,
      manifest,
      env,
      requestedBy: { actorId: 'test', channel: 'cli', name: 'Integration Test' },
      now: () => new Date('2025-11-05T00:00:00Z')
    });

    const reporter = new ControlPlaneDriftReporter({ repoRoot, taskId: env.taskId });
    const validator = new ControlPlaneValidator({
      mode: 'shadow',
      driftReporter: reporter,
      now: () => new Date('2025-11-05T00:00:05Z')
    });

    const result = await validator.validate(request);
    expect(result.outcome.status).toBe('passed');
    expect(result.outcome.drift).toBeDefined();
    expect(result.outcome.drift?.totalSamples).toBeGreaterThanOrEqual(1);
  });

  it('throws in enforce mode when payloads drift', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'control-plane-enforce-'));
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot: join(repoRoot, '.runs'),
      outRoot: join(repoRoot, 'out'),
      taskId: 'autonomy-upgrade'
    };

    const pipeline: PipelineDefinition = {
      id: 'pipeline-drift',
      title: 'Pipeline Drift',
      stages: [{ kind: 'command', id: 'build', title: 'Build', command: 'echo build' }],
      tags: ['general']
    };

    const manifest = createManifest('run-enforce', pipeline);
    const task: TaskContext = {
      id: 'autonomy-upgrade',
      title: 'Autonomy Upgrade',
      description: 'Enforce test',
      metadata: { slug: 'autonomy-upgrade' }
    };

    const request = buildRunRequestV2({
      runId: manifest.run_id,
      task,
      pipeline,
      manifest,
      env,
      requestedBy: { actorId: 'test', channel: 'cli' },
      now: () => new Date('2025-11-05T00:10:00Z')
    });

    const invalidRequest = {
      ...request,
      pipeline: {
        ...request.pipeline,
        capabilities: []
      }
    } as unknown as typeof request;

    const reporter = new ControlPlaneDriftReporter({ repoRoot, taskId: env.taskId });
    const validator = new ControlPlaneValidator({
      mode: 'enforce',
      driftReporter: reporter,
      now: () => new Date('2025-11-05T00:10:05Z')
    });

    await expect(validator.validate(invalidRequest)).rejects.toBeInstanceOf(ControlPlaneValidationError);
  });
});
