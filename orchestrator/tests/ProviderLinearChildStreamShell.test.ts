import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readProviderLinearWorkerChildStreams,
  PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME
} from '../src/cli/providerLinearWorkerRunner.js';
import { runProviderLinearChildStreamShell } from '../src/cli/providerLinearChildStreamShell.js';

let tempRoot: string | null = null;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

async function createProviderWorkerManifest(overrides: {
  pipelineId?: string;
} = {}) {
  tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-stream-'));
  const runDir = join(tempRoot, '.runs', 'linear-lin-issue-1', 'cli', 'run-child');
  await mkdir(runDir, { recursive: true });
  const manifestPath = join(runDir, 'manifest.json');
  await writeFile(
    manifestPath,
    JSON.stringify({
      run_id: 'run-child',
      task_id: 'linear-lin-issue-1',
      pipeline_id: overrides.pipelineId ?? 'provider-linear-worker',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-13',
      issue_updated_at: '2026-03-26T14:32:20.815Z',
      provider_control_host_task_id: 'local-mcp',
      provider_control_host_run_id: 'control-host',
      workspace_path: tempRoot
    }),
    'utf8'
  );
  return { manifestPath, runDir };
}

describe('runProviderLinearChildStreamShell', () => {
  it('launches an allowlisted provider child stream and records parent lineage', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        run_id: 'docs-run-1',
        status: 'succeeded',
        artifact_root: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1',
        manifest: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/manifest.json',
        log_path: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/run.log',
        summary: 'docs-review passed'
      }),
      stderr: ''
    }));

    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1',
          CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
          CODEX_ORCHESTRATOR_RUN_DIR: join(runDir, 'nested'),
          CODEX_ORCHESTRATOR_RUNTIME_MODE: 'appserver',
          CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'appserver',
          CODEX_RUNTIME_MODE: 'appserver',
          CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID: 'appserver-run-child',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(runDir, 'provider-linear-worker-linear-audit.jsonl'),
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host',
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'provider-launch-token',
          MCP_RUNNER_TASK_ID: 'linear-lin-issue-1',
          CODEX_ORCHESTRATOR_PACKAGE_ROOT: '/tmp/co-package-root'
        }
      },
      {
        execRunner,
        now: () => '2026-03-27T01:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-stream',
      stream: 'docs-review',
      pipeline_id: 'docs-review',
      child_run: {
        run_id: 'docs-run-1',
        task_id: 'linear-lin-issue-1-docs-review',
        status: 'succeeded',
        manifest_path: join(tempRoot ?? '', '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/manifest.json')
      }
    });
    expect(execRunner).toHaveBeenCalledWith(expect.objectContaining({
      command: process.execPath,
      cwd: tempRoot,
      args: expect.arrayContaining([
        '/tmp/co-package-root/dist/bin/codex-orchestrator.js',
        'start',
        'docs-review',
        '--task',
        'linear-lin-issue-1-docs-review',
        '--parent-run',
        'run-child',
        '--runtime-mode',
        'appserver'
      ])
    }));
    const request = execRunner.mock.calls[0]?.[0];
    expect(request?.env.CODEX_ORCHESTRATOR_ROOT).toBe(tempRoot);
    expect(request?.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBe('/tmp/co-package-root');
    expect(request?.env.CODEX_ORCHESTRATOR_MANIFEST_PATH).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_TASK_ID).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_RUN_ID).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_PIPELINE_ID).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_RUN_DIR).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_RUNTIME_MODE).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE).toBeUndefined();
    expect(request?.env.CODEX_RUNTIME_MODE).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID).toBeUndefined();
    expect(request?.env.CODEX_PROVIDER_LINEAR_AUDIT_PATH).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN).toBeUndefined();
    expect(request?.env.MCP_RUNNER_TASK_ID).toBeUndefined();

    expect(await readProviderLinearWorkerChildStreams(runDir)).toEqual([
      {
        stream: 'docs-review',
        pipeline_id: 'docs-review',
        task_id: 'linear-lin-issue-1-docs-review',
        run_id: 'docs-run-1',
        status: 'succeeded',
        manifest_path: join(tempRoot ?? '', '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/manifest.json'),
        artifact_root: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1',
        log_path: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/run.log',
        summary: 'docs-review passed',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-13',
        workspace_path: tempRoot,
        source_setup: null,
        launched_at: '2026-03-27T01:00:00.000Z'
      }
    ]);
    expect(PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME).toBe('provider-linear-worker-child-streams.json');
  });

  it('rejects unsupported child pipelines before launching anything', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();

    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'diagnostics',
        env: {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1',
          CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'local-mcp',
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: 'control-host'
        }
      },
      { execRunner: execRunner as never }
    );

    expect(result).toEqual({
      ok: false,
      operation: 'child-stream',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-13',
      source_setup: null,
      stream: null,
      pipeline_id: 'diagnostics',
      child_run: null,
      error: {
        code: 'provider_worker_child_stream_pipeline_unsupported',
        message: 'Unsupported child stream pipeline: diagnostics. Allowed pipelines: docs-review, implementation-gate, docs-relevance-advisory.',
        status: 422
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('fails closed when provider control-host provenance is missing', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();

    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: {
          CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
          CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
          CODEX_ORCHESTRATOR_RUN_ID: 'run-child',
          CODEX_ORCHESTRATOR_TASK_ID: 'linear-lin-issue-1',
          CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
          CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'unexpected-host'
        }
      },
      { execRunner: execRunner as never }
    );

    expect(result).toEqual({
      ok: false,
      operation: 'child-stream',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-13',
      source_setup: null,
      stream: null,
      pipeline_id: 'docs-review',
      child_run: null,
      error: {
        code: 'provider_worker_child_stream_provenance_invalid',
        message: 'linear child-stream requires provider control-host provenance recorded on the parent provider-worker manifest and matching active environment.',
        status: 412
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });
});
