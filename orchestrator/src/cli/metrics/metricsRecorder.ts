import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { CliManifest } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import {
  guardrailCommandPresent,
  guardrailRecommendation,
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
  const guardrailsPresent = guardrailCommandPresent(manifest);

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
    handle_count: manifest.handles?.length ?? 0
  };

  await mkdir(metricsRoot, { recursive: true });
  await appendFile(metricsPath, `${JSON.stringify(entry)}\n`, 'utf8');

  if (!guardrailsPresent) {
    const recommendation = guardrailRecommendation(manifest);
    if (recommendation) {
      logger.warn(recommendation);
      appendSummary(manifest, recommendation);
    }
  }

  upsertGuardrailSummary(manifest);
  manifest.metrics_recorded = true;
  await saveManifest(paths, manifest);
  await updateMetricsAggregates(env);
}
