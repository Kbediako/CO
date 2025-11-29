import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { CliManifest } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import {
  ensureGuardrailStatus,
  appendSummary,
  upsertGuardrailSummary
} from '../run/manifest.js';
import { isoTimestamp } from '../utils/time.js';
import { saveManifest } from '../run/manifest.js';
import type { RunPaths } from '../run/runPaths.js';
import { logger } from '../../logger.js';
import { updateMetricsAggregates } from './metricsAggregator.js';

const TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled']);

export async function appendMetricsEntry(
  env: EnvironmentPaths,
  paths: RunPaths,
  manifest: CliManifest
): Promise<void> {
  if (manifest.metrics_recorded) {
    return;
  }
  if (!TERMINAL_STATES.has(manifest.status)) {
    return;
  }

  const startedAt = manifest.started_at ? Date.parse(manifest.started_at) : NaN;
  const completedAt = manifest.completed_at ? Date.parse(manifest.completed_at) : NaN;
  const durationSeconds = Number.isNaN(startedAt) || Number.isNaN(completedAt)
    ? null
    : Math.max(0, (completedAt - startedAt) / 1000);

  const commandsPassed = manifest.commands.filter((cmd) => cmd.status === 'succeeded').length;
  const commandsFailed = manifest.commands.filter((cmd) => cmd.status === 'failed').length;
  const guardrailStatus = ensureGuardrailStatus(manifest);
  const guardrailsPresent = guardrailStatus.present;
  const learning = manifest.learning ?? null;

  const metricsRoot = join(env.runsRoot, env.taskId);
  const metricsPath = join(metricsRoot, 'metrics.json');

  const entry = {
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    pipeline_id: manifest.pipeline_id,
    status: manifest.status,
    started_at: manifest.started_at,
    completed_at: manifest.completed_at,
    duration_seconds: durationSeconds,
    commands_passed: commandsPassed,
    commands_failed: commandsFailed,
    guardrails_present: guardrailsPresent,
    recorded_at: isoTimestamp(),
    artifact_path: manifest.artifact_root,
    child_runs: manifest.child_runs.length,
    control_plane_status: manifest.control_plane?.validation.status ?? 'unknown',
    scheduler_mode: manifest.scheduler?.mode ?? null,
    instance_stats: (manifest.scheduler?.assignments ?? []).map((assignment) => ({
      instance_id: assignment.instance_id,
      capability: assignment.capability,
      status: assignment.status,
      attempts: assignment.attempts.length,
      recovery_events: assignment.attempts.reduce(
        (sum, attempt) => sum + attempt.recovery_checkpoints.length,
        0
      )
    })),
    privacy_mode: manifest.privacy?.mode ?? null,
    privacy_events: manifest.privacy?.decisions ?? [],
    handle_count: manifest.handles?.length ?? 0,
    tfgrpo_epoch: manifest.tfgrpo?.epoch ?? null,
    tfgrpo_group_id: manifest.tfgrpo?.group_id ?? null,
    tfgrpo_group_size: manifest.tfgrpo?.group_size ?? null,
    tool_calls: manifest.tfgrpo?.tool_metrics?.tool_calls ?? 0,
    token_total: manifest.tfgrpo?.tool_metrics?.token_total ?? 0,
    cost_usd: manifest.tfgrpo?.tool_metrics?.cost_usd ?? 0,
    latency_ms: manifest.tfgrpo?.tool_metrics?.latency_ms ?? 0,
    tool_stats: manifest.tfgrpo?.tool_metrics?.per_tool ?? [],
    learning_validation_status: learning?.validation?.status ?? null,
    learning_snapshot_status: learning?.snapshot?.status ?? null,
    learning_scenario_status: learning?.scenario?.status ?? null,
    learning_crystalizer_status: learning?.crystalizer?.status ?? null,
    learning_alerts: learning?.alerts?.length ?? 0,
    learning_group_id: learning?.validation?.grouping?.id ?? null,
    learning_review_rejections: learning?.review?.rejections ?? 0,
    learning_review_latency_ms: learning?.review?.latency_ms ?? null,
    learning_regressions_detected: learning?.regressions?.detected ?? 0,
    learning_pattern_promoted: learning?.pattern_hygiene?.promoted ?? 0,
    learning_pattern_deprecated: learning?.pattern_hygiene?.deprecated ?? 0,
    learning_throughput_candidates:
      learning?.throughput?.candidates ??
      (learning?.crystalizer?.candidate_path ? 1 : 0)
  };

  await mkdir(metricsRoot, { recursive: true });
  await appendFile(metricsPath, `${JSON.stringify(entry)}\n`, 'utf8');

  if (!guardrailsPresent && guardrailStatus.recommendation) {
    logger.warn(guardrailStatus.recommendation);
    appendSummary(manifest, guardrailStatus.recommendation);
  }

  upsertGuardrailSummary(manifest);
  manifest.metrics_recorded = true;
  await saveManifest(paths, manifest);
  await updateMetricsAggregates(env);
}
