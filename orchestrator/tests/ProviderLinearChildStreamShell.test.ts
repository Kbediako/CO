import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readProviderLinearWorkerChildStreams, PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME } from '../src/cli/providerLinearWorkerRunner.js';
import { runProviderLinearChildStreamShell } from '../src/cli/providerLinearChildStreamShell.js';
let tempRoot: string | null = null;
const RUN_ID = 'run-child';
const TASK_ID = 'linear-lin-issue-1';
const CONTROL_HOST_TASK_ID = 'local-mcp';
const CONTROL_HOST_RUN_ID = 'control-host';
const ISSUE = { issue_id: 'lin-issue-1', issue_identifier: 'CO-13' };
afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = null;
  }
});

async function createProviderWorkerManifest(pipelineId = 'provider-linear-worker') {
  tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-stream-'));
  const runDir = join(tempRoot, '.runs', TASK_ID, 'cli', RUN_ID);
  const manifestPath = join(runDir, 'manifest.json');
  await mkdir(runDir, { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      run_id: RUN_ID,
      task_id: TASK_ID,
      pipeline_id: pipelineId,
      ...ISSUE,
      issue_updated_at: '2026-03-26T14:32:20.815Z',
      provider_control_host_task_id: CONTROL_HOST_TASK_ID,
      provider_control_host_run_id: CONTROL_HOST_RUN_ID,
      workspace_path: tempRoot
    }),
    'utf8'
  );
  return { manifestPath, runDir };
}

function buildProviderWorkerEnv(manifestPath: string, overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
    CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
    CODEX_ORCHESTRATOR_RUN_ID: RUN_ID,
    CODEX_ORCHESTRATOR_TASK_ID: TASK_ID,
    CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
    CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: CONTROL_HOST_TASK_ID,
    CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID: CONTROL_HOST_RUN_ID,
    ...overrides
  };
}

function createExecResult(pipelineId: 'docs-review' | 'docs-relevance-advisory', runId: string, summary: string) {
  const taskId = `${TASK_ID}-${pipelineId}`;
  return {
    exitCode: 0,
    stdout: JSON.stringify({
      run_id: runId,
      status: 'succeeded',
      artifact_root: `.runs/${taskId}/cli/${runId}`,
      manifest: `.runs/${taskId}/cli/${runId}/manifest.json`,
      log_path: `.runs/${taskId}/cli/${runId}/run.log`,
      summary
    }),
    stderr: ''
  };
}

describe('runProviderLinearChildStreamShell', () => {
  it('launches an allowlisted provider child stream and records parent lineage', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const execRunner = vi.fn(async () => createExecResult('docs-review', 'docs-run-1', 'docs-review passed'));
    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUN_DIR: join(runDir, 'nested'),
          CODEX_ORCHESTRATOR_RUNTIME_MODE: 'appserver',
          CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'appserver',
          CODEX_RUNTIME_MODE: 'appserver',
          CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID: 'appserver-run-child',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(runDir, 'provider-linear-worker-linear-audit.jsonl'),
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'provider-launch-token',
          CODEX_ORCHESTRATOR_PACKAGE_ROOT: '/tmp/co-package-root',
          MCP_RUNNER_TASK_ID: TASK_ID
        })
      },
      { execRunner, now: () => '2026-03-27T01:00:00.000Z' }
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
      args: expect.arrayContaining(['/tmp/co-package-root/dist/bin/codex-orchestrator.js', 'start', 'docs-review', '--task', `${TASK_ID}-docs-review`, '--parent-run', RUN_ID, '--runtime-mode', 'appserver'])
    }));
    const request = execRunner.mock.calls[0]?.[0];
    expect(request?.env.CODEX_ORCHESTRATOR_ROOT).toBe(tempRoot);
    expect(request?.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBe('/tmp/co-package-root');
    for (const key of [
      'CODEX_ORCHESTRATOR_MANIFEST_PATH',
      'CODEX_ORCHESTRATOR_TASK_ID',
      'CODEX_ORCHESTRATOR_RUN_ID',
      'CODEX_ORCHESTRATOR_PIPELINE_ID',
      'CODEX_ORCHESTRATOR_RUN_DIR',
      'CODEX_ORCHESTRATOR_RUNTIME_MODE',
      'CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE',
      'CODEX_RUNTIME_MODE',
      'CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID',
      'CODEX_PROVIDER_LINEAR_AUDIT_PATH',
      'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID',
      'CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID',
      'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE',
      'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN',
      'MCP_RUNNER_TASK_ID'
    ]) expect(request?.env[key]).toBeUndefined();
    expect(await readProviderLinearWorkerChildStreams(runDir)).toEqual([
      expect.objectContaining({
        stream: 'docs-review',
        pipeline_id: 'docs-review',
        task_id: `${TASK_ID}-docs-review`,
        run_id: 'docs-run-1',
        status: 'succeeded',
        launched_at: '2026-03-27T01:00:00.000Z'
      })
    ]);
    expect(PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME).toBe('provider-linear-worker-child-streams.json');
  });
  it.each([
    ['rejects unsupported child pipelines before launching anything', 'diagnostics', {}, 'provider_worker_child_stream_pipeline_unsupported', 422],
    ['fails closed when provider control-host provenance is missing', 'docs-review', { CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID: 'unexpected-host' }, 'provider_worker_child_stream_provenance_invalid', 412]
  ] as const)('%s', async (_label, pipelineId, overrides, code, status) => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();
    const result = await runProviderLinearChildStreamShell(
      { pipelineId, env: buildProviderWorkerEnv(manifestPath, overrides) },
      { execRunner: execRunner as never }
    );

    expect(result).toMatchObject({ ok: false, operation: 'child-stream', ...ISSUE, pipeline_id: pipelineId, child_run: null, error: { code, status } });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('rejects punctuation-only explicit stream names instead of collapsing them onto the fallback slug', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn();
    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        streamName: '!!!',
        env: buildProviderWorkerEnv(manifestPath)
      },
      { execRunner: execRunner as never }
    );

    expect(result).toMatchObject({
      ok: false,
      operation: 'child-stream',
      ...ISSUE,
      pipeline_id: 'docs-review',
      child_run: null,
      error: {
        code: 'provider_worker_child_stream_stream_invalid',
        status: 422
      }
    });
    expect(execRunner).not.toHaveBeenCalled();
  });

  it('clears FORCE_CODEX_REVIEW for advisory children and returns child-run details when sidecar writes fail', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn(async () =>
      createExecResult('docs-relevance-advisory', 'advisory-run-1', 'docs relevance advisory finished')
    );
    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-relevance-advisory',
        env: buildProviderWorkerEnv(manifestPath, { FORCE_CODEX_REVIEW: '1' })
      },
      {
        execRunner,
        appendChildStreamRecord: vi.fn(async () => {
          throw new Error('disk full');
        })
      }
    );

    expect(execRunner.mock.calls[0]?.[0]?.env.FORCE_CODEX_REVIEW).toBeUndefined();
    expect(result).toMatchObject({
      ok: false,
      operation: 'child-stream',
      stream: 'docs-relevance-advisory',
      pipeline_id: 'docs-relevance-advisory',
      child_run: {
        run_id: 'advisory-run-1',
        task_id: 'linear-lin-issue-1-docs-relevance-advisory'
      },
      error: {
        code: 'provider_worker_child_stream_record_failed',
        message: 'Failed to record child stream lineage: disk full',
        status: 502
      }
    });
  });
});
