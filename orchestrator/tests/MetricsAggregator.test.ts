import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import type { CliManifest } from '../src/cli/types.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import { appendMetricsEntry } from '../src/cli/metrics/metricsRecorder.js';
import {
  mergePendingMetricsEntries,
  updateMetricsAggregates,
  type MetricsEntry
} from '../src/cli/metrics/metricsAggregator.js';

function createEntry(index: number, status: string): MetricsEntry {
  return {
    run_id: `run-${index}`,
    task_id: 'autonomy-upgrade',
    pipeline_id: 'pipeline',
    status,
    started_at: `2025-11-05T0${index}:00:00Z`,
    completed_at: `2025-11-05T0${index}:05:00Z`,
    duration_seconds: 300,
    commands_passed: status === 'succeeded' ? 3 : 2,
    commands_failed: status === 'succeeded' ? 0 : 1,
    guardrails_present: true,
    recorded_at: `2025-11-05T0${index}:05:00Z`,
    artifact_path: `.runs/autonomy-upgrade/run-${index}`,
    child_runs: 0,
    control_plane_status: 'passed',
    scheduler_mode: 'multi-instance',
    instance_stats: [
      {
        instance_id: `inst-${index}`,
        capability: 'general',
        status: status === 'succeeded' ? 'succeeded' : 'failed',
        attempts: 1,
        recovery_events: 0
      }
    ],
    privacy_mode: 'enforce',
    privacy_events: [
      {
        handle_id: `handle-${index}`,
        sequence: 1,
        action: 'allow',
        stage_id: 'build'
      }
    ],
    handle_count: 1,
    tfgrpo_epoch: index,
    tfgrpo_group_id: `group-${index}`,
    tfgrpo_group_size: 2,
    tool_calls: 1,
    token_total: 100 + index,
    cost_usd: 0.001 * index,
    latency_ms: 1000 + index,
    tool_stats: [
      {
        tool: 'cli:command',
        tokens: 100 + index,
        cost_usd: 0.001 * index,
        latency_ms: 1000 + index,
        attempts: 1,
        status: status === 'succeeded' ? 'succeeded' : 'failed',
        sandbox_state: 'sandboxed'
      }
    ],
    learning_validation_status: status === 'succeeded' ? 'validated' : 'snapshot_failed',
    learning_snapshot_status: status === 'succeeded' ? 'captured' : 'snapshot_failed',
    learning_scenario_status: status === 'succeeded' ? 'synthesized' : 'needs_manual_scenario',
    learning_crystalizer_status: 'succeeded',
    learning_alerts: status === 'succeeded' ? 0 : 1,
    learning_group_id: null,
    learning_review_rejections: status === 'succeeded' ? 0 : 1,
    learning_review_latency_ms: status === 'succeeded' ? 1200 : 2000,
    learning_regressions_detected: status === 'succeeded' ? 0 : 1,
    learning_pattern_promoted: 1,
    learning_pattern_deprecated: 0,
    learning_throughput_candidates: 1
  };
}

function createManifest(taskId: string, runId: string): CliManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    task_id: taskId,
    task_slug: taskId,
    run_id: runId,
    parent_run_id: null,
    pipeline_id: 'pipeline',
    pipeline_title: 'Pipeline',
    runner: 'codex-cli',
    approval_policy: null,
    status: 'succeeded',
    status_detail: null,
    started_at: now,
    completed_at: now,
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
    commands: [
      {
        index: 1,
        id: 'spec-guard',
        title: 'Spec Guard',
        command: 'node scripts/spec-guard.mjs --dry-run',
        kind: 'command',
        status: 'succeeded',
        started_at: now,
        completed_at: now,
        exit_code: 0,
        summary: null,
        log_path: null,
        error_file: null,
        sub_run_id: null
      }
    ],
    child_runs: [],
    run_summary_path: null,
    plan_target_id: null,
    instructions_hash: null,
    instructions_sources: []
  };
}

describe('metricsAggregator', () => {
  it('creates aggregate metric artifacts', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'metrics-aggregator-'));
    const runsRoot = join(repoRoot, '.runs');
    const outRoot = join(repoRoot, 'out');
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot,
      outRoot,
      taskId: 'autonomy-upgrade'
    };

    const metricsRoot = join(runsRoot, env.taskId);
    await mkdir(metricsRoot, { recursive: true });
    await writeFile(
      join(metricsRoot, 'metrics.json'),
      `${JSON.stringify(createEntry(1, 'succeeded'))}\n${JSON.stringify(createEntry(2, 'failed'))}\n`,
      { encoding: 'utf8', flag: 'w' }
    );

    await updateMetricsAggregates(env);

    const baseline = JSON.parse(
      await readFile(join(metricsRoot, 'metrics', 'baseline.json'), 'utf8')
    );
    expect(baseline.run_id).toBe('run-1');

    const postRollout = JSON.parse(
      await readFile(join(metricsRoot, 'metrics', 'post-rollout.json'), 'utf8')
    );
    expect(postRollout.total_runs).toBe(2);

    const completeness = JSON.parse(
      await readFile(join(metricsRoot, 'metrics', 'completeness.json'), 'utf8')
    );
    expect(completeness.checked_fields).toContain('instance_stats');

    const mttr = JSON.parse(
      await readFile(join(outRoot, env.taskId, 'metrics', 'mttr-delta.json'), 'utf8')
    );
    expect(mttr.current_mttr_seconds).toBeGreaterThan(0);

    const perEpoch = JSON.parse(
      await readFile(join(metricsRoot, 'metrics', 'per-epoch.json'), 'utf8')
    );
    expect(perEpoch.epochs).toHaveLength(2);
    expect(perEpoch.epochs[0]?.tools[0]?.tool).toBe('cli:command');

    const state = JSON.parse(
      await readFile(join(outRoot, env.taskId, 'state.json'), 'utf8')
    );
    expect(state.safety.validation.passed).toBeGreaterThan(0);
    expect(state.throughput.candidates).toBe(2);
  });

  it('queues metrics entries when the lock is held but skips aggregation', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'metrics-aggregator-lock-'));
    const runsRoot = join(repoRoot, '.runs');
    const outRoot = join(repoRoot, 'out');
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot,
      outRoot,
      taskId: 'autonomy-upgrade'
    };

    const runId = 'run-lock';
    const paths = resolveRunPaths(env, runId);
    const manifest = createManifest(env.taskId, runId);

    const metricsRoot = join(runsRoot, env.taskId);
    await mkdir(metricsRoot, { recursive: true });
    await writeFile(join(metricsRoot, 'metrics.lock'), 'locked', 'utf8');

    await appendMetricsEntry(env, paths, manifest);

    const pendingDir = join(metricsRoot, 'metrics.pending');
    const pendingEntries = await readdir(pendingDir);
    expect(pendingEntries).toHaveLength(1);
    await expect(readFile(join(metricsRoot, 'metrics.json'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT'
    });
    expect(manifest.metrics_recorded).toBe(false);
    await expect(readFile(join(metricsRoot, 'metrics', 'post-rollout.json'), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT'
    });
  });

  it('flushes pending metrics entries on the next lock acquisition', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'metrics-aggregator-flush-'));
    const runsRoot = join(repoRoot, '.runs');
    const outRoot = join(repoRoot, 'out');
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot,
      outRoot,
      taskId: 'autonomy-upgrade'
    };

    const runId = 'run-flush';
    const paths = resolveRunPaths(env, runId);
    const manifest = createManifest(env.taskId, runId);

    const metricsRoot = join(runsRoot, env.taskId);
    await mkdir(metricsRoot, { recursive: true });
    const pendingDir = join(metricsRoot, 'metrics.pending');
    await mkdir(pendingDir, { recursive: true });
    await writeFile(
      join(pendingDir, 'entry-1.jsonl'),
      `${JSON.stringify(createEntry(1, 'succeeded'))}\n`,
      { encoding: 'utf8', flag: 'w' }
    );
    await writeFile(
      join(pendingDir, 'entry-2.jsonl'),
      `${JSON.stringify(createEntry(2, 'failed'))}\n`,
      { encoding: 'utf8', flag: 'w' }
    );

    await appendMetricsEntry(env, paths, manifest);

    const metricsContent = await readFile(join(metricsRoot, 'metrics.json'), 'utf8');
    expect(metricsContent.trim().split('\n')).toHaveLength(3);
    const remaining = await readdir(pendingDir);
    expect(remaining).toHaveLength(0);

    const postRollout = JSON.parse(
      await readFile(join(metricsRoot, 'metrics', 'post-rollout.json'), 'utf8')
    );
    expect(postRollout.total_runs).toBe(3);
  });

  it('drains per-entry pending files when merging', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'metrics-aggregator-pending-'));
    const runsRoot = join(repoRoot, '.runs');
    const outRoot = join(repoRoot, 'out');
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot,
      outRoot,
      taskId: 'autonomy-upgrade'
    };

    const metricsRoot = join(runsRoot, env.taskId);
    await mkdir(metricsRoot, { recursive: true });
    const pendingDir = join(metricsRoot, 'metrics.pending');
    await mkdir(pendingDir, { recursive: true });
    await writeFile(
      join(pendingDir, 'entry-a.jsonl'),
      `${JSON.stringify(createEntry(1, 'succeeded'))}\n`,
      { encoding: 'utf8', flag: 'w' }
    );
    await writeFile(
      join(pendingDir, 'entry-b.jsonl'),
      `${JSON.stringify(createEntry(2, 'failed'))}\n`,
      { encoding: 'utf8', flag: 'w' }
    );

    const merged = await mergePendingMetricsEntries(env);

    expect(merged).toBe(2);
    const metricsContent = await readFile(join(metricsRoot, 'metrics.json'), 'utf8');
    expect(metricsContent.trim().split('\n')).toHaveLength(2);
    const remaining = await readdir(pendingDir);
    expect(remaining).toHaveLength(0);
  });

  it('flushes pending metrics in bounded batches while preserving order', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'metrics-aggregator-batch-'));
    const runsRoot = join(repoRoot, '.runs');
    const outRoot = join(repoRoot, 'out');
    const env: EnvironmentPaths = {
      repoRoot,
      runsRoot,
      outRoot,
      taskId: 'autonomy-upgrade'
    };

    const previousLines = process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES;
    try {
      process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES = '2';

      const metricsRoot = join(runsRoot, env.taskId);
      await mkdir(metricsRoot, { recursive: true });
      const pendingDir = join(metricsRoot, 'metrics.pending');
      await mkdir(pendingDir, { recursive: true });
      await writeFile(
        join(pendingDir, 'entry-1.jsonl'),
        `${JSON.stringify(createEntry(1, 'succeeded'))}\n`,
        { encoding: 'utf8', flag: 'w' }
      );
      await writeFile(
        join(pendingDir, 'entry-2.jsonl'),
        `${JSON.stringify(createEntry(2, 'failed'))}\n`,
        { encoding: 'utf8', flag: 'w' }
      );
      await writeFile(
        join(pendingDir, 'entry-3.jsonl'),
        `${JSON.stringify(createEntry(3, 'succeeded'))}\n`,
        { encoding: 'utf8', flag: 'w' }
      );
      await writeFile(
        join(pendingDir, 'entry-4.jsonl'),
        `${JSON.stringify(createEntry(4, 'failed'))}\n`,
        { encoding: 'utf8', flag: 'w' }
      );

      const merged = await mergePendingMetricsEntries(env);

      expect(merged).toBe(4);
      const metricsContent = await readFile(join(metricsRoot, 'metrics.json'), 'utf8');
      const runIds = metricsContent
        .trim()
        .split('\n')
        .map((line) => (JSON.parse(line) as MetricsEntry).run_id);
      expect(runIds).toEqual(['run-1', 'run-2', 'run-3', 'run-4']);
      const remaining = await readdir(pendingDir);
      expect(remaining).toHaveLength(0);
    } finally {
      if (previousLines === undefined) {
        delete process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES;
      } else {
        process.env.CODEX_METRICS_PENDING_BATCH_MAX_LINES = previousLines;
      }
    }
  });
});
