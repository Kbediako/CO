import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { EnvironmentPaths } from '../src/cli/run/environment.js';
import { updateMetricsAggregates, type MetricsEntry } from '../src/cli/metrics/metricsAggregator.js';

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
});
