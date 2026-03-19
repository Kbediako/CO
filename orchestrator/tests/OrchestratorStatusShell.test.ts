import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../src/logger.js';
import {
  buildOrchestratorStatusPayload,
  renderOrchestratorStatus,
  runOrchestratorStatusShell
} from '../src/cli/services/orchestratorStatusShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('orchestrator status shell', () => {
  it('writes the JSON status payload and returns the manifest', async () => {
    const manifest = {
      run_id: 'run-1',
      status: 'succeeded',
      status_detail: null,
      started_at: '2026-03-14T16:00:00.000Z',
      completed_at: '2026-03-14T16:01:00.000Z',
      artifact_root: '.runs/task-1/cli/run-1',
      log_path: '.runs/task-1/cli/run-1/runner.ndjson',
      heartbeat_at: '2026-03-14T16:01:00.000Z',
      commands: [],
      child_runs: [],
      runtime_mode_requested: 'appserver',
      runtime_mode: 'appserver',
      runtime_provider: 'AppServerRuntimeProvider',
      runtime_fallback: null,
      cloud_execution: null,
      cloud_fallback: null
    } as never;
    const paths = {
      manifestPath: '/tmp/repo/.runs/task-1/cli/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/cli/run-1/runner.ndjson',
      heartbeatPath: '/tmp/repo/.runs/task-1/cli/run-1/heartbeat.txt'
    } as never;
    const activity = {
      manifest_heartbeat_at: manifest.heartbeat_at,
      heartbeat_file_at: null,
      runner_log_mtime_at: null,
      observed_at: manifest.heartbeat_at,
      observed_source: 'manifest',
      stale: false,
      stale_threshold_seconds: 30,
      age_seconds: 0
    } as const;
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await runOrchestratorStatusShell({
      baseEnv: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      } as never,
      options: {
        runId: 'run-1',
        format: 'json'
      },
      loadManifestImpl: vi.fn(async () => ({ manifest, paths })),
      resolveRuntimeActivitySnapshotImpl: vi.fn(async () => activity)
    });

    expect(result).toBe(manifest);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(writeSpy.mock.calls[0]?.[0]))).toEqual(
      buildOrchestratorStatusPayload(
        {
          repoRoot: '/tmp/repo',
          taskId: 'task-1',
          runsRoot: '/tmp/repo/.runs',
          outRoot: '/tmp/repo/out'
        } as never,
        manifest,
        paths,
        activity
      )
    );
  });

  it('renders the human-readable status view without writing JSON', async () => {
    const manifest = {
      run_id: 'run-2',
      status: 'failed',
      status_detail: 'resume-pre-start-failed',
      started_at: '2026-03-14T16:10:00.000Z',
      completed_at: null,
      artifact_root: '.runs/task-2/cli/run-2',
      log_path: '.runs/task-2/cli/run-2/runner.ndjson',
      heartbeat_at: '2026-03-14T16:10:05.000Z',
      commands: [{ status: 'failed', title: 'build', summary: 'exit 1' }],
      child_runs: [],
      runtime_mode_requested: 'cli',
      runtime_mode: 'appserver',
      runtime_provider: 'AppServerRuntimeProvider',
      runtime_fallback: {
        occurred: true,
        code: 'fallback-code',
        reason: 'appserver unavailable',
        from_mode: 'appserver',
        to_mode: 'cli',
        checked_at: '2026-03-14T16:10:06.000Z'
      },
      cloud_execution: {
        task_id: 'cloud-123',
        status: 'running',
        status_url: 'https://example.invalid/status'
      },
      cloud_fallback: null
    } as never;
    const paths = {
      manifestPath: '/tmp/repo/.runs/task-2/cli/run-2/manifest.json',
      logPath: '/tmp/repo/.runs/task-2/cli/run-2/runner.ndjson',
      heartbeatPath: '/tmp/repo/.runs/task-2/cli/run-2/heartbeat.txt'
    } as never;
    const activity = {
      manifest_heartbeat_at: manifest.heartbeat_at,
      heartbeat_file_at: null,
      runner_log_mtime_at: null,
      observed_at: '2026-03-14T16:10:05.000Z',
      observed_source: 'manifest',
      stale: true,
      stale_threshold_seconds: 30,
      age_seconds: 42
    } as const;
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const result = await runOrchestratorStatusShell({
      baseEnv: {
        repoRoot: '/tmp/repo',
        taskId: 'task-2',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      } as never,
      options: {
        runId: 'run-2'
      },
      loadManifestImpl: vi.fn(async () => ({ manifest, paths })),
      resolveRuntimeActivitySnapshotImpl: vi.fn(async () => activity)
    });

    expect(result).toBe(manifest);
    expect(writeSpy).not.toHaveBeenCalled();
    expect(infoSpy.mock.calls.map(([message]) => message)).toEqual([
      'Run: run-2',
      'Status: failed (resume-pre-start-failed)',
      'Started: 2026-03-14T16:10:00.000Z',
      'Completed: in-progress',
      'Manifest: .runs/task-2/cli/run-2/manifest.json',
      'Runtime: appserver (requested cli) via AppServerRuntimeProvider',
      'Runtime fallback: fallback-code — appserver unavailable',
      'Activity: 2026-03-14T16:10:05.000Z via manifest age=42s [stale]',
      'Cloud: cloud-123 [running] https://example.invalid/status',
      'Commands:',
      '  [failed] build — exit 1'
    ]);
  });

  it('renders only the stable base lines when optional status details are absent', () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);

    renderOrchestratorStatus(
      {
        run_id: 'run-3',
        status: 'succeeded',
        status_detail: null,
        started_at: '2026-03-14T16:20:00.000Z',
        completed_at: '2026-03-14T16:21:00.000Z',
        artifact_root: '.runs/task-3/cli/run-3',
        commands: [],
        runtime_mode_requested: null,
        runtime_mode: null,
        runtime_provider: null,
        runtime_fallback: null,
        cloud_execution: null
      } as never,
      {
        manifest_heartbeat_at: null,
        heartbeat_file_at: null,
        runner_log_mtime_at: null,
        observed_at: null,
        observed_source: null,
        stale: null,
        stale_threshold_seconds: null,
        age_seconds: null
      }
    );

    expect(infoSpy.mock.calls.map(([message]) => message)).toEqual([
      'Run: run-3',
      'Status: succeeded',
      'Started: 2026-03-14T16:20:00.000Z',
      'Completed: 2026-03-14T16:21:00.000Z',
      'Manifest: .runs/task-3/cli/run-3/manifest.json',
      'Commands:'
    ]);
  });
});
