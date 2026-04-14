import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CliManifest } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import {
  ensureGuardrailStatus,
  appendSummary,
  upsertGuardrailSummary
} from '../run/manifest.js';
import {
  buildRunMemoryObservabilityMetrics,
  refreshRunMemoryObservability
} from '../run/source0.js';
import { isoTimestamp } from '../utils/time.js';
import { persistManifest, type ManifestPersister } from '../run/manifestPersister.js';
import type { RunPaths } from '../run/runPaths.js';
import { logger } from '../../logger.js';
import {
  ensureMetricsTrailingNewline,
  mergePendingMetricsEntries,
  updateMetricsAggregates,
  withMetricsLock
} from './metricsAggregator.js';
import { EnvUtils } from '../../../../packages/shared/config/index.js';

const TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled']);
const METRICS_PENDING_DIRNAME = 'metrics.pending';
const PROVIDER_LINEAR_WORKER_PIPELINE_ID = 'provider-linear-worker';

export async function appendMetricsEntry(
  env: EnvironmentPaths,
  paths: RunPaths,
  manifest: CliManifest,
  persister?: ManifestPersister
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
  const privacyDecisions = manifest.privacy?.decisions ?? [];
  const privacyEventCount = privacyDecisions.length;
  const maxPrivacyEvents = EnvUtils.getInt('CODEX_METRICS_PRIVACY_EVENTS_MAX', -1);
  const shouldTruncatePrivacy =
    maxPrivacyEvents >= 0 && privacyEventCount > maxPrivacyEvents;
  const privacyEvents = shouldTruncatePrivacy
    ? privacyDecisions.slice(0, maxPrivacyEvents)
    : privacyDecisions;
  refreshRunMemoryObservability(manifest);
  const memoryMetrics = buildRunMemoryObservabilityMetrics(manifest.memory?.observability);

  const metricsRoot = join(env.runsRoot, env.taskId);
  const metricsPath = join(metricsRoot, 'metrics.json');
  const pendingDir = join(metricsRoot, METRICS_PENDING_DIRNAME);

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
    privacy_log_path: manifest.privacy?.log_path ?? null,
    privacy_event_count: privacyEventCount,
    privacy_events_truncated: shouldTruncatePrivacy ? true : undefined,
    privacy_events: privacyEvents,
    memory: memoryMetrics,
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
  const appendEntry = async () => {
    await ensureMetricsTrailingNewline(metricsPath);
    await appendFile(metricsPath, `${JSON.stringify(entry)}\n`, 'utf8');
  };
  const appendPendingEntry = async () => {
    const safeRunId = entry.run_id.replace(/[^a-zA-Z0-9._-]+/g, '_');
    await mkdir(pendingDir, { recursive: true });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const pendingName = `${safeRunId}-${Date.now()}-${randomUUID()}.jsonl`;
      const pendingPath = join(pendingDir, pendingName);
      const tmpPath = `${pendingPath}.tmp`;
      try {
        await writeFile(tmpPath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'wx' });
        await rename(tmpPath, pendingPath);
        return pendingPath;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }
    }
    throw new Error(`Failed to create pending metrics entry for ${entry.run_id}`);
  };
  const finalizeManifest = async (metricsRecorded: boolean) => {
    preserveProviderLinearWorkerPrimarySummary(manifest, guardrailStatus);

    if (!guardrailsPresent && guardrailStatus.recommendation) {
      logger.warn(guardrailStatus.recommendation);
      appendSummary(manifest, guardrailStatus.recommendation);
    }

    upsertGuardrailSummary(manifest);
    manifest.metrics_recorded = metricsRecorded;
    await persistManifest(paths, manifest, persister, { force: true });
  };

  const { acquired } = await withMetricsLock(env, async () => {
    await mergePendingMetricsEntries(env);
    await appendEntry();
    await finalizeManifest(true);
    await mergePendingMetricsEntries(env);
    await updateMetricsAggregates(env);
  });
  if (!acquired) {
    const pendingPath = await appendPendingEntry();
    await finalizeManifest(false);
    logger.warn(
      `Metrics aggregation skipped for ${env.taskId}: queued metrics entry in ${pendingPath}.`
    );
  }
}

function preserveProviderLinearWorkerPrimarySummary(
  manifest: CliManifest,
  guardrailStatus: NonNullable<CliManifest['guardrail_status']>
): void {
  const primarySummary = resolveProviderLinearWorkerPrimarySummary(manifest, guardrailStatus);
  if (!primarySummary) {
    return;
  }

  const currentLines = splitSummaryLines(manifest.summary);
  const secondaryLines = currentLines.filter((line) => line !== primarySummary);
  manifest.summary = [primarySummary, ...secondaryLines].join('\n');
}

function resolveProviderLinearWorkerPrimarySummary(
  manifest: CliManifest,
  guardrailStatus: NonNullable<CliManifest['guardrail_status']>
): string | null {
  if (manifest.status !== 'succeeded' || manifest.pipeline_id !== PROVIDER_LINEAR_WORKER_PIPELINE_ID) {
    return null;
  }
  const providerWorkerCommand = manifest.commands.find((command) => {
    const id = command.id?.trim().toLowerCase() ?? '';
    const title = command.title?.trim().toLowerCase() ?? '';
    const commandLine = command.command?.trim().toLowerCase() ?? '';
    return (
      id === PROVIDER_LINEAR_WORKER_PIPELINE_ID ||
      title.includes('provider linear worker') ||
      commandLine.includes('providerlinearworkerrunner')
    );
  });
  if (providerWorkerCommand?.status !== 'succeeded') {
    return null;
  }
  const summary = providerWorkerCommand.summary?.trim();
  if (!summary || isGuardrailCloseoutSummaryLine(summary, guardrailStatus)) {
    return null;
  }
  return summary;
}

function splitSummaryLines(summary: string | null | undefined): string[] {
  return (summary ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isGuardrailCloseoutSummaryLine(
  line: string,
  guardrailStatus: NonNullable<CliManifest['guardrail_status']>
): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return true;
  }
  if (trimmed.toLowerCase().startsWith('guardrails:')) {
    return true;
  }
  const recommendation = guardrailStatus.recommendation?.trim();
  if (recommendation && trimmed === recommendation) {
    return true;
  }
  return trimmed.startsWith('Guardrail command missing;');
}
