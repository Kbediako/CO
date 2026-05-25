import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readProviderLinearWorkerChildStreams, PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME } from '../src/cli/providerLinearWorkerRunner.js';
import { runProviderLinearChildStreamShell } from '../src/cli/providerLinearChildStreamShell.js';
let tempRoot: string | null = null;
let externalRoot: string | null = null;
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
  if (externalRoot) {
    await rm(externalRoot, { recursive: true, force: true });
    externalRoot = null;
  }
});
async function createProviderWorkerManifest(pipelineId = 'provider-linear-worker', runsDir = '.runs', runsRootOverride: string | null = null, taskId = TASK_ID) {
  tempRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-stream-'));
  const runsRoot = runsRootOverride ?? tempRoot;
  const runDir = join(runsRoot, runsDir, taskId, 'cli', RUN_ID);
  const manifestPath = join(runDir, 'manifest.json');
  await mkdir(runDir, { recursive: true });
  await writeFile(
    manifestPath,
    JSON.stringify({
      run_id: RUN_ID,
      task_id: taskId,
      pipeline_id: pipelineId,
      ...ISSUE,
      issue_updated_at: '2026-03-26T14:32:20.815Z',
      provider_launch_source: 'control-host',
      provider_control_host_task_id: CONTROL_HOST_TASK_ID,
      provider_control_host_run_id: CONTROL_HOST_RUN_ID,
      workspace_path: tempRoot
    }),
    'utf8'
  );
  return { manifestPath, runDir };
}
function buildProviderWorkerEnv(manifestPath: string, overrides: NodeJS.ProcessEnv = {}, taskId = TASK_ID): NodeJS.ProcessEnv {
  return {
    CODEX_ORCHESTRATOR_MANIFEST_PATH: manifestPath,
    CODEX_ORCHESTRATOR_ROOT: tempRoot ?? undefined,
    CODEX_ORCHESTRATOR_RUN_ID: RUN_ID,
    CODEX_ORCHESTRATOR_TASK_ID: taskId,
    CODEX_ORCHESTRATOR_PIPELINE_ID: 'provider-linear-worker',
    CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
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
function createPreludeExecResult(pipelineId: 'docs-review' | 'docs-relevance-advisory', runId: string, summary: string) {
  const child = createExecResult(pipelineId, runId, summary);
  return {
    ...child,
    stdout: [
      `[Codex-Orchestrator] prepareRun start for pipeline ${pipelineId}`,
      `[Codex-Orchestrator] prepareRun complete for pipeline ${pipelineId}`,
      JSON.stringify(JSON.parse(child.stdout), null, 2)
    ].join('\n')
  };
}
describe('runProviderLinearChildStreamShell', () => {
  it('launches an allowlisted provider child stream and records parent lineage', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    externalRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-stream-package-'));
    await mkdir(join(externalRoot, 'bin'), { recursive: true });
    await writeFile(join(externalRoot, 'bin', 'codex-orchestrator.js'), '#!/usr/bin/env node\n', 'utf8');
    const execRunner = vi.fn(async () => createExecResult('docs-review', 'docs-run-1', 'docs-review passed'));
    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUN_DIR: join(runDir, 'nested'),
          CODEX_ORCHESTRATOR_RUNTIME_MODE: 'appserver',
          CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE: 'appserver',
          CODEX_RUNTIME_MODE: 'appserver',
          CODEX_ORCHESTRATOR_RUNS_DIR: join('/tmp', 'shared-runs'),
          CODEX_ORCHESTRATOR_OUT_DIR: join('/tmp', 'shared-out'),
          CODEX_ORCHESTRATOR_APPSERVER_SESSION_ID: 'appserver-run-child',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: join(runDir, 'provider-linear-worker-linear-audit.jsonl'),
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: 'control-host',
          CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN: 'provider-launch-token',
          CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH: join(
            runDir,
            'provider-workflow.last-known-good.json'
          ),
          CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT: externalRoot,
          CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: join(runDir, 'provider-workflow.last-known-good.json'),
          CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED: '1',
          CODEX_ORCHESTRATOR_PACKAGE_ROOT: externalRoot,
          MCP_RUNNER_TASK_ID: TASK_ID
        })
      },
      { execRunner, now: () => '2026-03-27T01:00:00.000Z' }
    );
    expect(result).toMatchObject({ ok: true, operation: 'child-stream', stream: 'docs-review', pipeline_id: 'docs-review', child_run: { run_id: 'docs-run-1', task_id: 'linear-lin-issue-1-docs-review', status: 'succeeded', manifest_path: join(tempRoot ?? '', '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/manifest.json') } });
    expect(execRunner).toHaveBeenCalledWith(expect.objectContaining({
      command: process.execPath,
      cwd: tempRoot,
      args: expect.arrayContaining([join(process.cwd(), 'bin', 'codex-orchestrator.js'), 'start', 'docs-review', '--task', `${TASK_ID}-docs-review`, '--parent-run', RUN_ID, '--runtime-mode', 'appserver'])
    }));
    const request = execRunner.mock.calls[0]?.[0];
    expect(request?.env.CODEX_ORCHESTRATOR_ROOT).toBe(tempRoot);
    expect(request?.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBe(
      join(tempRoot ?? '', 'codex.orchestrator.json')
    );
    expect(request?.env.CODEX_ORCHESTRATOR_REPO_CONFIG_REQUIRED).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT).toBeUndefined();
    expect(request?.env.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(join(tempRoot ?? '', '.runs'));
    expect(request?.env.CODEX_ORCHESTRATOR_OUT_DIR).toBe(join(tempRoot ?? '', 'out'));
    expect(request?.env.MCP_RUNNER_TASK_ID).toBe(`${TASK_ID}-docs-review`);
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
      'CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_TOKEN'
    ]) expect(request?.env[key]).toBeUndefined();
    expect(await readProviderLinearWorkerChildStreams(runDir)).toEqual([
      expect.objectContaining({
        stream: 'docs-review',
        pipeline_id: 'docs-review',
        task_id: `${TASK_ID}-docs-review`,
        run_id: 'docs-run-1',
        status: 'succeeded',
        launched_at: '2026-03-27T01:00:00.000Z',
        recorded_at: '2026-03-27T01:00:00.000Z'
      })
    ]);
    expect(PROVIDER_LINEAR_WORKER_CHILD_STREAMS_FILENAME).toBe('provider-linear-worker-child-streams.json');
  });

  it('records child-stream launch and record timestamps separately', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const execRunner = vi.fn(async () => createExecResult('docs-review', 'docs-run-1', 'docs-review passed'));
    const now = vi
      .fn<() => string>()
      .mockReturnValueOnce('2026-03-27T01:00:00.000Z')
      .mockReturnValueOnce('2026-03-27T01:05:00.000Z');

    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: buildProviderWorkerEnv(manifestPath)
      },
      { execRunner, now }
    );

    expect(result).toMatchObject({ ok: true, operation: 'child-stream' });
    expect(await readProviderLinearWorkerChildStreams(runDir)).toEqual([
      expect.objectContaining({
        stream: 'docs-review',
        run_id: 'docs-run-1',
        launched_at: '2026-03-27T01:00:00.000Z',
        recorded_at: '2026-03-27T01:05:00.000Z'
      })
    ]);
  });

  it('keeps docs-review task ids rooted at the registered provider issue key when the stream label is overridden', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const execRunner = vi.fn(async () => createExecResult('docs-review', 'docs-run-1', 'docs-review passed'));
    const result = await runProviderLinearChildStreamShell(
      { pipelineId: 'docs-review', streamName: 'source-freshness-recheck', env: buildProviderWorkerEnv(manifestPath) },
      { execRunner, now: () => '2026-03-27T01:00:00.000Z' }
    );

    expect(result).toMatchObject({ ok: true, stream: 'source-freshness-recheck', child_run: { task_id: `${TASK_ID}-docs-review` } });
    const request = execRunner.mock.calls[0]?.[0];
    expect(request?.args).toContain(`${TASK_ID}-docs-review`);
    expect(request?.args).not.toContain(`${TASK_ID}-source-freshness-recheck`);
    expect(request?.env.MCP_RUNNER_TASK_ID).toBe(`${TASK_ID}-docs-review`);
  });

  it('fails closed before docs-review launch when the parent task id drifted away from the registered issue key', async () => {
    const driftedTaskId = `${TASK_ID}-docs-packet`;
    const { manifestPath } = await createProviderWorkerManifest('provider-linear-worker', '.runs', null, driftedTaskId);
    const execRunner = vi.fn();
    const result = await runProviderLinearChildStreamShell(
      { pipelineId: 'docs-review', env: buildProviderWorkerEnv(manifestPath, {}, driftedTaskId) },
      { execRunner: execRunner as never }
    );

    expect(result).toMatchObject({ ok: false, ...ISSUE, pipeline_id: 'docs-review', child_run: null, error: { code: 'provider_worker_child_stream_parent_task_mismatch', status: 412 } });
    expect(execRunner).not.toHaveBeenCalled();
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

  it('backfills missing manifest provenance from the matching control-host env before launching the child stream', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: RUN_ID,
        task_id: TASK_ID,
        pipeline_id: 'provider-linear-worker',
        ...ISSUE,
        issue_updated_at: '2026-03-26T14:32:20.815Z',
        provider_launch_source: null,
        provider_control_host_task_id: null,
        provider_control_host_run_id: null,
        workspace_path: tempRoot
      }),
      'utf8'
    );

    const result = await runProviderLinearChildStreamShell(
      { pipelineId: 'docs-review', env: buildProviderWorkerEnv(manifestPath) },
      { execRunner: vi.fn(async () => createExecResult('docs-review', 'docs-run-backfill', 'docs-review passed')) as never }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-stream',
      child_run: { run_id: 'docs-run-backfill' }
    });

    const persistedManifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    expect(persistedManifest).toMatchObject({
      provider_launch_source: 'control-host',
      provider_control_host_task_id: CONTROL_HOST_TASK_ID,
      provider_control_host_run_id: CONTROL_HOST_RUN_ID
    });
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
    expect(result).toMatchObject({ ok: false, operation: 'child-stream', ...ISSUE, pipeline_id: 'docs-review', child_run: null, error: { code: 'provider_worker_child_stream_stream_invalid', status: 422 } });
    expect(execRunner).not.toHaveBeenCalled();
  });
  it.each([
    ['rejects child output paths that escape the expected child run root', { run_id: 'docs-run-1', artifact_root: '../escape', manifest: '../escape/manifest.json', log_path: '../escape/run.log', summary: 'bad paths' }],
    ['rejects child output when run_id is unsafe before deriving the confinement root', { run_id: '../escape', artifact_root: `.runs/${TASK_ID}-docs-review/escape`, manifest: `.runs/${TASK_ID}-docs-review/escape/manifest.json`, summary: 'bad run id' }]
  ] as const)('%s', async (_label, payload) => {
    const { manifestPath } = await createProviderWorkerManifest();
    const result = await runProviderLinearChildStreamShell({ pipelineId: 'docs-review', env: buildProviderWorkerEnv(manifestPath) }, { execRunner: vi.fn(async () => ({ exitCode: 0, stdout: JSON.stringify({ status: 'succeeded', ...payload }), stderr: '' })) as never });
    expect(result).toMatchObject({ ok: false, operation: 'child-stream', ...ISSUE, pipeline_id: 'docs-review', child_run: null, error: { code: 'provider_worker_child_stream_output_invalid', status: 502 } });
  });
  it('accepts child output rooted under a workspace-local overridden runs dir', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUNS_DIR: join(tempRoot ?? '', 'alt-runs')
        })
      },
      {
        execRunner: vi.fn(async () => ({
          exitCode: 0,
          stdout: JSON.stringify({
            run_id: 'docs-run-1',
            status: 'succeeded',
            artifact_root: `alt-runs/${TASK_ID}-docs-review/cli/docs-run-1`,
            manifest: `alt-runs/${TASK_ID}-docs-review/cli/docs-run-1/manifest.json`,
            summary: 'ok'
          }),
          stderr: ''
        })) as never
      }
    );
    expect(result).toMatchObject({ ok: true, child_run: { manifest_path: join(tempRoot ?? '', 'alt-runs', `${TASK_ID}-docs-review`, 'cli', 'docs-run-1', 'manifest.json') } });
  });
  it('preserves the parent repo-config override when launching a child stream', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const repoConfigOverride = join(tempRoot ?? '', 'custom', 'codex.orchestrator.json');
    const env = buildProviderWorkerEnv(manifestPath, {
      CODEX_ORCHESTRATOR_REPO_CONFIG_PATH: repoConfigOverride,
      CODEX_HOME: join(tempRoot ?? '', 'codex-home'),
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    });
    const execRunner = vi.fn(async (request) => {
      expect(request.env.CODEX_ORCHESTRATOR_REPO_CONFIG_PATH).toBe(repoConfigOverride);
      return createExecResult('docs-review', 'docs-run-1', 'docs-review passed');
    });
    const refreshProofSnapshot = vi.fn(async () => undefined);

    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env
      },
      {
        execRunner,
        refreshProofSnapshot
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-stream',
      stream: 'docs-review',
      child_run: {
        run_id: 'docs-run-1',
        task_id: `${TASK_ID}-docs-review`
      }
    });
    expect(refreshProofSnapshot).toHaveBeenCalledWith(runDir, null, env);
  });
  it('accepts workspace-local child output when the parent manifest lives under an external shared runs root', async () => {
    externalRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-stream-shared-'));
    const { manifestPath } = await createProviderWorkerManifest(
      'provider-linear-worker',
      '.runs',
      externalRoot
    );
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        run_id: 'docs-run-1',
        status: 'succeeded',
        artifact_root: `.runs/${TASK_ID}-docs-review/cli/docs-run-1`,
        manifest: `.runs/${TASK_ID}-docs-review/cli/docs-run-1/manifest.json`,
        summary: 'ok'
      }),
      stderr: ''
    }));
    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUNS_DIR: join(externalRoot, '.runs')
        })
      },
      { execRunner: execRunner as never }
    );
    expect(result).toMatchObject({
      ok: true,
      child_run: {
        manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-docs-review`, 'cli', 'docs-run-1', 'manifest.json')
      }
    });
    expect(execRunner.mock.calls[0]?.[0]?.env.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(join(tempRoot ?? '', '.runs'));
  });
  it('maps configured shared runs layout roots to workspace-local child stream evidence', async () => {
    externalRoot = await mkdtemp(join(tmpdir(), 'provider-linear-child-stream-shared-root-'));
    tempRoot = join(externalRoot, '.workspaces', TASK_ID);
    const runDir = join(tempRoot, '.runs', TASK_ID, 'cli', RUN_ID);
    const manifestPath = join(runDir, 'manifest.json');
    await mkdir(runDir, { recursive: true });
    await writeFile(
      manifestPath,
      JSON.stringify({
        run_id: RUN_ID,
        task_id: TASK_ID,
        pipeline_id: 'provider-linear-worker',
        ...ISSUE,
        issue_updated_at: '2026-03-26T14:32:20.815Z',
        provider_control_host_task_id: CONTROL_HOST_TASK_ID,
        provider_control_host_run_id: CONTROL_HOST_RUN_ID,
        workspace_path: tempRoot
      }),
      'utf8'
    );
    const execRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        run_id: 'docs-run-1',
        status: 'succeeded',
        artifact_root: `runs/${TASK_ID}-docs-review/cli/docs-run-1`,
        manifest: `runs/${TASK_ID}-docs-review/cli/docs-run-1/manifest.json`,
        summary: 'ok'
      }),
      stderr: ''
    }));

    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: buildProviderWorkerEnv(manifestPath, {
          CODEX_ORCHESTRATOR_RUNS_DIR: join(externalRoot, 'runs')
        })
      },
      { execRunner: execRunner as never }
    );

    expect(result).toMatchObject({
      ok: true,
      child_run: {
        manifest_path: join(tempRoot, 'runs', `${TASK_ID}-docs-review`, 'cli', 'docs-run-1', 'manifest.json')
      }
    });
    expect(execRunner.mock.calls[0]?.[0]?.env.CODEX_ORCHESTRATOR_RUNS_DIR).toBe(
      join(tempRoot, 'runs')
    );
  });
  it('parses a valid trailing child-run json object after prelude logs', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const result = await runProviderLinearChildStreamShell(
      { pipelineId: 'docs-review', env: buildProviderWorkerEnv(manifestPath) },
      { execRunner: vi.fn(async () => createPreludeExecResult('docs-review', 'docs-run-1', 'docs-review passed')) as never }
    );
    expect(result).toMatchObject({
      ok: true,
      operation: 'child-stream',
      pipeline_id: 'docs-review',
      child_run: {
        run_id: 'docs-run-1',
        task_id: `${TASK_ID}-docs-review`,
        status: 'succeeded',
        manifest_path: join(tempRoot ?? '', '.runs', `${TASK_ID}-docs-review`, 'cli', 'docs-run-1', 'manifest.json')
      }
    });
  });
  it('fails closed when prelude logs precede a malformed final json payload', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const badStdout = [
      '[Codex-Orchestrator] prepareRun start for pipeline docs-review',
      '{',
      '  "run_id": "docs-run-1",',
      '  "status": "succeeded",',
      `  "artifact_root": ".runs/${TASK_ID}-docs-review/cli/docs-run-1",`,
      `  "manifest": ".runs/${TASK_ID}-docs-review/cli/docs-run-1/manifest.json"`
    ].join('\n');
    const result = await runProviderLinearChildStreamShell(
      { pipelineId: 'docs-review', env: buildProviderWorkerEnv(manifestPath) },
      { execRunner: vi.fn(async () => ({ exitCode: 0, stdout: badStdout, stderr: '' })) as never }
    );
    expect(result).toMatchObject({
      ok: false,
      operation: 'child-stream',
      ...ISSUE,
      pipeline_id: 'docs-review',
      child_run: null,
      error: { code: 'provider_worker_child_stream_output_invalid', status: 502 }
    });
  });
  it('fails closed when footer logs follow an otherwise valid child-run payload', async () => {
    const { manifestPath } = await createProviderWorkerManifest();
    const noisyStdout = [
      '[Codex-Orchestrator] prepareRun start for pipeline docs-review',
      '{',
      '  "run_id": "docs-run-1",',
      '  "status": "succeeded",',
      `  "artifact_root": ".runs/${TASK_ID}-docs-review/cli/docs-run-1",`,
      `  "manifest": ".runs/${TASK_ID}-docs-review/cli/docs-run-1/manifest.json"`,
      '}',
      '[Codex-Orchestrator] child stream completed'
    ].join('\n');
    const result = await runProviderLinearChildStreamShell(
      { pipelineId: 'docs-review', env: buildProviderWorkerEnv(manifestPath) },
      { execRunner: vi.fn(async () => ({ exitCode: 0, stdout: noisyStdout, stderr: '' })) as never }
    );
    expect(result).toMatchObject({
      ok: false,
      operation: 'child-stream',
      ...ISSUE,
      pipeline_id: 'docs-review',
      child_run: null,
      error: { code: 'provider_worker_child_stream_output_invalid', status: 502 }
    });
  });
  it('keeps launch success when proof refresh fails after the child stream record is appended', async () => {
    const { manifestPath, runDir } = await createProviderWorkerManifest();
    const warn = vi.fn();

    const result = await runProviderLinearChildStreamShell(
      {
        pipelineId: 'docs-review',
        env: buildProviderWorkerEnv(manifestPath)
      },
      {
        execRunner: vi.fn(async () => createExecResult('docs-review', 'docs-run-1', 'docs-review passed')) as never,
        refreshProofSnapshot: vi.fn(async () => {
          throw new Error('proof refresh exploded');
        }) as never,
        warn
      }
    );

    expect(result).toMatchObject({
      ok: true,
      operation: 'child-stream',
      stream: 'docs-review',
      child_run: {
        run_id: 'docs-run-1',
        task_id: 'linear-lin-issue-1-docs-review'
      }
    });
    expect(warn).toHaveBeenCalledWith(
      'provider-linear-child-stream warning: failed to refresh proof snapshot after recording child stream docs-review: proof refresh exploded'
    );
    expect(await readProviderLinearWorkerChildStreams(runDir)).toEqual([
      expect.objectContaining({
        stream: 'docs-review',
        run_id: 'docs-run-1'
      })
    ]);
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
