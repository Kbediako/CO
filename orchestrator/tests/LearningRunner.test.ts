import { describe, expect, it } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { CliManifest } from '../src/cli/types.js';
import { synthesizeScenario } from '../src/learning/runner.js';

function createManifest(taskId: string, runId: string): CliManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    task_id: taskId,
    task_slug: taskId,
    run_id: runId,
    parent_run_id: null,
    pipeline_id: 'learning',
    pipeline_title: 'learning',
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
    artifact_root: `.runs/${taskId}/cli/${runId}`,
    compat_path: `.runs/${taskId}/cli/${runId}/compat`,
    log_path: `.runs/${taskId}/cli/${runId}/log.ndjson`,
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

describe('LearningRunner scenario synthesis', () => {
  it('prefers execution history and writes scenario file', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'learning-runner-'));
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-1');

    const result = await synthesizeScenario({
      manifest,
      taskId: manifest.task_id,
      runId: manifest.run_id,
      runsRoot: repoRoot,
      prompt: 'Fix the bug',
      diff: '--- a/file.ts\n+++ b/file.ts',
      executionHistory: [{ command: 'npm test -- file.spec.ts', exitCode: 0 }]
    });

    expect(result.scenarioPath).toBeTruthy();
    expect(manifest.learning?.scenario?.status).toBe('synthesized');
    expect(manifest.learning?.scenario?.source).toBe('execution_history');
  });

  it('flags needs_manual_scenario after repeated failures', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'learning-runner-manual-'));
    const manifest = createManifest('0607-continuous-learning-pipeline', 'run-2');

    await synthesizeScenario({
      manifest,
      taskId: manifest.task_id,
      runId: manifest.run_id,
      runsRoot: repoRoot,
      prompt: null,
      diff: null,
      executionHistory: [],
      maxAttempts: 2
    });

    await synthesizeScenario({
      manifest,
      taskId: manifest.task_id,
      runId: manifest.run_id,
      runsRoot: repoRoot,
      prompt: null,
      diff: null,
      executionHistory: [],
      maxAttempts: 2
    });

    expect(manifest.learning?.scenario?.status).toBe('needs_manual_scenario');
    expect(manifest.learning?.alerts?.some((alert) => alert.type === 'needs_manual_scenario')).toBe(true);
    expect(manifest.learning?.validation?.status).toBe('needs_manual_scenario');
    expect(manifest.learning?.scenario?.partial_path).toBeTruthy();
  });
});
