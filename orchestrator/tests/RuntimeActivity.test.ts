import { mkdtemp, mkdir, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveRuntimeActivitySnapshot } from '../src/cli/run/runtimeActivity.js';
import type { RunPaths } from '../src/cli/run/runPaths.js';
import type { CliManifest } from '../src/cli/types.js';

function createManifest(options: { status?: CliManifest['status']; heartbeatAt: string }): CliManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    task_id: 'runtime-activity-task',
    task_slug: 'runtime-activity-task',
    run_id: 'runtime-activity-run',
    parent_run_id: null,
    pipeline_id: 'exec',
    pipeline_title: 'Exec',
    runner: 'codex-cli',
    approval_policy: null,
    status: options.status ?? 'in_progress',
    status_detail: null,
    started_at: now,
    completed_at: null,
    updated_at: now,
    heartbeat_at: options.heartbeatAt,
    heartbeat_interval_seconds: 5,
    heartbeat_stale_after_seconds: 30,
    artifact_root: '.runs/runtime-activity-task/cli/runtime-activity-run',
    compat_path: '.runs/runtime-activity-task/mcp/runtime-activity-run',
    log_path: '.runs/runtime-activity-task/cli/runtime-activity-run/runner.ndjson',
    summary: null,
    metrics_recorded: false,
    resume_token: 'token',
    resume_events: [],
    approvals: [],
    commands: [],
    child_runs: [],
    run_summary_path: null,
    plan_target_id: null,
    instructions_hash: null,
    instructions_sources: []
  };
}

function createRunPaths(root: string): RunPaths {
  const runDir = join(root, '.runs', 'runtime-activity-task', 'cli', 'runtime-activity-run');
  return {
    runDir,
    manifestPath: join(runDir, 'manifest.json'),
    heartbeatPath: join(runDir, '.heartbeat'),
    resumeTokenPath: join(runDir, '.resume-token'),
    logPath: join(runDir, 'runner.ndjson'),
    eventsPath: join(runDir, 'events.jsonl'),
    controlPath: join(runDir, 'control.json'),
    controlAuthPath: join(runDir, 'control_auth.json'),
    controlEndpointPath: join(runDir, 'control_endpoint.json'),
    confirmationsPath: join(runDir, 'confirmations.json'),
    questionsPath: join(runDir, 'questions.json'),
    delegationTokensPath: join(runDir, 'delegation_tokens.json'),
    commandsDir: join(runDir, 'commands'),
    errorsDir: join(runDir, 'errors'),
    compatDir: join(root, '.runs', 'runtime-activity-task', 'mcp', 'runtime-activity-run'),
    compatManifestPath: join(root, '.runs', 'runtime-activity-task', 'mcp', 'runtime-activity-run', 'manifest.json'),
    localCompatDir: join(root, '.runs', 'local-mcp', 'runtime-activity-run')
  };
}

describe('resolveRuntimeActivitySnapshot', () => {
  it('prefers runner log activity over stale manifest heartbeat', async () => {
    const root = await mkdtemp(join(tmpdir(), 'runtime-activity-'));
    const paths = createRunPaths(root);
    await mkdir(paths.runDir, { recursive: true });
    await writeFile(paths.logPath, '{"type":"command:start"}\n', 'utf8');

    const oldIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await writeFile(paths.heartbeatPath, `${oldIso}\n`, 'utf8');
    const manifest = createManifest({ heartbeatAt: oldIso });
    const snapshot = await resolveRuntimeActivitySnapshot(manifest, paths);

    expect(snapshot.observed_source).toBe('runner_log');
    expect(snapshot.stale).toBe(false);
    expect(snapshot.observed_at).toBeTruthy();
  });

  it('marks in-progress runs as stale when observed activity exceeds threshold', async () => {
    const root = await mkdtemp(join(tmpdir(), 'runtime-activity-'));
    const paths = createRunPaths(root);
    await mkdir(paths.runDir, { recursive: true });
    await writeFile(paths.logPath, '{"type":"command:start"}\n', 'utf8');

    const nowMs = Date.now();
    const oldDate = new Date(nowMs - 2 * 60 * 1000);
    const oldIso = oldDate.toISOString();
    await writeFile(paths.heartbeatPath, `${oldIso}\n`, 'utf8');
    await utimes(paths.logPath, oldDate, oldDate);

    const manifest = createManifest({ heartbeatAt: oldIso });
    const snapshot = await resolveRuntimeActivitySnapshot(manifest, paths, { nowMs });

    expect(snapshot.stale).toBe(true);
    expect(snapshot.age_seconds).toBeGreaterThan(30);
    expect(snapshot.stale_threshold_seconds).toBe(30);
  });
});
