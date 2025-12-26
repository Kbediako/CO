import type { Dirent } from 'node:fs';
import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { EnvironmentPaths } from '../run/environment.js';
import type { SandboxState, ToolRunStatus } from '../../../../packages/shared/manifest/types.js';
import { acquireLockWithRetry, type LockRetryOptions } from '../../persistence/lockFile.js';

export interface MetricsEntry {
  run_id: string;
  task_id: string;
  pipeline_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  commands_passed: number;
  commands_failed: number;
  guardrails_present: boolean;
  recorded_at: string;
  artifact_path: string;
  child_runs: number;
  control_plane_status: string;
  scheduler_mode: string | null;
  instance_stats: Array<{ instance_id: string; capability: string; status: string; attempts: number; recovery_events: number }>;
  privacy_mode: string | null;
  privacy_log_path?: string | null;
  privacy_event_count?: number;
  privacy_events_truncated?: boolean;
  privacy_events: Array<Record<string, unknown>>;
  handle_count: number;
  tfgrpo_epoch: number | null;
  tfgrpo_group_id: string | null;
  tfgrpo_group_size: number | null;
  tool_calls: number;
  token_total: number;
  cost_usd: number;
  latency_ms: number;
  tool_stats: ToolMetricEntry[];
  learning_validation_status?: string | null;
  learning_snapshot_status?: string | null;
  learning_scenario_status?: string | null;
  learning_crystalizer_status?: string | null;
  learning_alerts?: number;
  learning_group_id?: string | null;
  learning_review_rejections?: number;
  learning_review_latency_ms?: number | null;
  learning_regressions_detected?: number;
  learning_pattern_promoted?: number;
  learning_pattern_deprecated?: number;
  learning_throughput_candidates?: number;
}

export interface ToolMetricEntry {
  tool: string;
  tokens: number;
  cost_usd: number;
  latency_ms: number;
  attempts?: number;
  status?: ToolRunStatus;
  sandbox_state?: SandboxState;
}

const REQUIRED_COMPLETENESS_FIELDS: Array<keyof MetricsEntry> = [
  'instance_stats',
  'privacy_events',
  'control_plane_status'
];

const METRICS_LOCK_FILENAME = 'metrics.lock';
const METRICS_PENDING_DIRNAME = 'metrics.pending';
const DEFAULT_LOCK_STALE_MS = 5 * 60 * 1000;
const DEFAULT_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 4,
  initialDelayMs: 50,
  backoffFactor: 2,
  maxDelayMs: 200
};

function getMetricsRoot(env: EnvironmentPaths): string {
  return join(env.runsRoot, env.taskId);
}

function getMetricsPath(env: EnvironmentPaths): string {
  return join(getMetricsRoot(env), 'metrics.json');
}

function getMetricsPendingDir(env: EnvironmentPaths): string {
  return join(getMetricsRoot(env), METRICS_PENDING_DIRNAME);
}

function getMetricsLockPath(env: EnvironmentPaths): string {
  return join(getMetricsRoot(env), METRICS_LOCK_FILENAME);
}

async function cleanupStaleMetricsLock(lockPath: string, staleMs: number): Promise<boolean> {
  if (staleMs <= 0) {
    return false;
  }
  try {
    const stats = await stat(lockPath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (!Number.isFinite(ageMs) || ageMs <= staleMs) {
      return false;
    }
    await rm(lockPath, { force: true });
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

class MetricsLockError extends Error {
  constructor(message: string, public readonly taskId: string) {
    super(message);
    this.name = 'MetricsLockError';
  }
}

export interface MetricsLockOptions {
  retry?: Partial<LockRetryOptions>;
  staleMs?: number;
}

async function drainMetricsEntryFile(env: EnvironmentPaths, path: string): Promise<number> {
  let raw = '';
  try {
    raw = await readFile(path, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  const lines = raw.trim().split('\n').filter(Boolean);
  if (lines.length === 0) {
    await rm(path, { force: true });
    return 0;
  }

  await mkdir(getMetricsRoot(env), { recursive: true });
  const payload = `${lines.join('\n')}\n`;
  await appendFile(getMetricsPath(env), payload, 'utf8');
  await rm(path, { force: true });
  return lines.length;
}

export async function mergePendingMetricsEntries(env: EnvironmentPaths): Promise<number> {
  const pendingDir = getMetricsPendingDir(env);
  let merged = 0;
  const staleTmpMs = DEFAULT_LOCK_STALE_MS;

  for (let pass = 0; pass < 2; pass += 1) {
    let entries: Dirent[] = [];
    try {
      entries = await readdir(pendingDir, { withFileTypes: true });
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return merged;
      }
      throw error;
    }

    const now = Date.now();
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.tmp')) {
        continue;
      }
      const tmpPath = join(pendingDir, entry.name);
      try {
        const stats = await stat(tmpPath);
        if (now - stats.mtimeMs > staleTmpMs) {
          await rm(tmpPath, { force: true });
        }
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
      .map((entry) => entry.name)
      .sort();

    if (files.length === 0) {
      break;
    }

    for (const file of files) {
      merged += await drainMetricsEntryFile(env, join(pendingDir, file));
    }
  }

  return merged;
}

export async function withMetricsLock<T>(
  env: EnvironmentPaths,
  action: () => Promise<T>,
  options: MetricsLockOptions = {}
): Promise<{ acquired: boolean; result?: T }> {
  const overrides = options.retry ?? {};
  const sanitizedOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined)
  ) as Partial<LockRetryOptions>;
  const lockRetry = { ...DEFAULT_LOCK_RETRY, ...sanitizedOverrides };
  const lockPath = getMetricsLockPath(env);
  const staleMs = options.staleMs ?? DEFAULT_LOCK_STALE_MS;

  await cleanupStaleMetricsLock(lockPath, staleMs);

  try {
    await acquireLockWithRetry({
      taskId: env.taskId,
      lockPath,
      retry: lockRetry,
      ensureDirectory: async () => {
        await mkdir(dirname(lockPath), { recursive: true });
      },
      createError: (taskId, attempts) =>
        new MetricsLockError(
          `Failed to acquire metrics lock for ${taskId} after ${attempts} attempts`,
          taskId
        )
    });
  } catch (error: unknown) {
    if (error instanceof MetricsLockError) {
      return { acquired: false };
    }
    throw error;
  }

  try {
    const result = await action();
    return { acquired: true, result };
  } finally {
    await rm(lockPath, { force: true });
  }
}

export async function updateMetricsAggregates(env: EnvironmentPaths): Promise<void> {
  const metricsRoot = getMetricsRoot(env);
  const metricsPath = getMetricsPath(env);
  const entries = await loadMetricsEntries(metricsPath);
  if (entries.length === 0) {
    return;
  }

  const metricsDir = join(metricsRoot, 'metrics');
  await mkdir(metricsDir, { recursive: true });

  await Promise.all([
    ensureBaseline(metricsDir, entries[0]!),
    writePostRollout(metricsDir, entries),
    writeCompleteness(metricsDir, entries),
    writeMttrDelta(env, entries),
    writeTfgrpoEpochAggregates(metricsDir, entries),
    writeLearningState(env, entries)
  ]);
}

async function ensureBaseline(dir: string, entry: MetricsEntry): Promise<void> {
  const baselinePath = join(dir, 'baseline.json');
  try {
    await stat(baselinePath);
    return;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const baseline = {
    run_id: entry.run_id,
    recorded_at: entry.recorded_at,
    status: entry.status,
    duration_seconds: entry.duration_seconds,
    completion_rate: entry.status === 'succeeded' ? 1 : 0
  };
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
}

async function writePostRollout(dir: string, entries: MetricsEntry[]): Promise<void> {
  const totalRuns = entries.length;
  const succeededRuns = entries.filter((entry) => entry.status === 'succeeded').length;
  const completionRate = totalRuns > 0 ? succeededRuns / totalRuns : 0;
  const payload = {
    total_runs: totalRuns,
    succeeded_runs: succeededRuns,
    completion_rate: completionRate,
    meets_threshold: completionRate >= 0.95,
    updated_at: new Date().toISOString()
  };
  await writeFile(join(dir, 'post-rollout.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeCompleteness(dir: string, entries: MetricsEntry[]): Promise<void> {
  const fieldChecks = REQUIRED_COMPLETENESS_FIELDS.length * entries.length;
  if (fieldChecks === 0) {
    return;
  }

  const missingCounts: Record<string, number> = Object.fromEntries(
    REQUIRED_COMPLETENESS_FIELDS.map((field) => [field, 0])
  );

  for (const entry of entries) {
    if (!Array.isArray(entry.instance_stats) || entry.instance_stats.length === 0) {
      missingCounts.instance_stats += 1;
    }
    if (!Array.isArray(entry.privacy_events) || entry.privacy_events.length === 0) {
      missingCounts.privacy_events += 1;
    }
    if (!entry.control_plane_status || entry.control_plane_status === 'unknown') {
      missingCounts.control_plane_status += 1;
    }
  }

  const totalMissing = Object.values(missingCounts).reduce((sum, value) => sum + value, 0);
  const ratio = totalMissing / fieldChecks;
  const payload = {
    checked_fields: REQUIRED_COMPLETENESS_FIELDS,
    missing_counts: missingCounts,
    missing_field_ratio: ratio,
    meets_threshold: ratio < 0.05,
    updated_at: new Date().toISOString()
  };

  await writeFile(join(dir, 'completeness.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeMttrDelta(env: EnvironmentPaths, entries: MetricsEntry[]): Promise<void> {
  const durations = entries
    .map((entry) => entry.duration_seconds)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (durations.length === 0) {
    return;
  }
  const currentMttr = average(durations);

  const metricsDir = join(env.runsRoot, env.taskId, 'metrics');
  const baselinePath = join(metricsDir, 'baseline.json');
  let baselineMttr = currentMttr;
  try {
    const raw = await readFile(baselinePath, 'utf8');
    const parsed = JSON.parse(raw) as { duration_seconds: number | null };
    if (typeof parsed.duration_seconds === 'number') {
      baselineMttr = parsed.duration_seconds;
    }
  } catch (error: unknown) {
    // baseline already ensured by ensureBaseline
  }

  const reductionPercent = baselineMttr > 0 ? (baselineMttr - currentMttr) / baselineMttr : 0;
  const payload = {
    baseline_mttr_seconds: baselineMttr,
    current_mttr_seconds: currentMttr,
    reduction_percent: reductionPercent,
    meets_threshold: baselineMttr <= 0 ? true : currentMttr <= baselineMttr * 0.6,
    updated_at: new Date().toISOString()
  };

  const outDir = join(env.outRoot, env.taskId, 'metrics');
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'mttr-delta.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeTfgrpoEpochAggregates(dir: string, entries: MetricsEntry[]): Promise<void> {
  const grouped = new Map<number, MetricsEntry[]>();
  for (const entry of entries) {
    if (typeof entry.tfgrpo_epoch !== 'number') {
      continue;
    }
    const bucket = grouped.get(entry.tfgrpo_epoch) ?? [];
    bucket.push(entry);
    grouped.set(entry.tfgrpo_epoch, bucket);
  }
  if (grouped.size === 0) {
    return;
  }
  const epochs = Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([epoch, group]) => summarizeEpoch(epoch, group));
  const payload = {
    epochs,
    updated_at: new Date().toISOString()
  };
  await writeFile(join(dir, 'per-epoch.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeLearningState(env: EnvironmentPaths, entries: MetricsEntry[]): Promise<void> {
  const validationStatuses = entries
    .map((entry) => entry.learning_validation_status)
    .filter((value): value is string => typeof value === 'string');
  const validationSummary = {
    passed: validationStatuses.filter((status) => status === 'validated').length,
    failed: validationStatuses.filter((status) => status === 'snapshot_failed').length,
    stalled: validationStatuses.filter((status) => status === 'stalled_snapshot').length,
    manual: validationStatuses.filter((status) => status === 'needs_manual_scenario').length
  };

  const reviewerRejections = entries.reduce(
    (sum, entry) => sum + (entry.learning_review_rejections ?? 0),
    0
  );
  const reviewerLatencies = entries
    .map((entry) => entry.learning_review_latency_ms)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const reviewerLatencyMs =
    reviewerLatencies.length > 0
      ? reviewerLatencies.reduce((sum, value) => sum + value, 0) / reviewerLatencies.length
      : null;

  const regressions = entries.reduce(
    (sum, entry) => sum + (entry.learning_regressions_detected ?? 0),
    0
  );
  const patternPromotions = entries.reduce(
    (sum, entry) => sum + (entry.learning_pattern_promoted ?? 0),
    0
  );
  const patternDeprecations = entries.reduce(
    (sum, entry) => sum + (entry.learning_pattern_deprecated ?? 0),
    0
  );
  const throughputCandidates = entries.reduce(
    (sum, entry) => sum + (entry.learning_throughput_candidates ?? 0),
    0
  );

  const alerts = {
    total: entries.reduce((sum, entry) => sum + (entry.learning_alerts ?? 0), 0),
    snapshot_failed: entries.filter((entry) => entry.learning_snapshot_status === 'snapshot_failed').length,
    stalled_snapshot: entries.filter((entry) => entry.learning_snapshot_status === 'stalled_snapshot').length,
    needs_manual_scenario: validationSummary.manual
  };

  const payload = {
    updated_at: new Date().toISOString(),
    safety: {
      validation: validationSummary,
      reviewer: { rejections: reviewerRejections, average_latency_ms: reviewerLatencyMs },
      regression_detection: { detected: regressions },
      pattern_hygiene: { promoted: patternPromotions, deprecated: patternDeprecations }
    },
    throughput: { candidates: throughputCandidates },
    alerts
  };

  const outDir = join(env.outRoot, env.taskId);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'state.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function summarizeEpoch(epoch: number, entries: MetricsEntry[]): {
  epoch: number;
  runs: number;
  tool_calls: number;
  token_total: number;
  cost_usd: number;
  latency_ms: number;
  group_size_avg: number | null;
  tools: Array<{ tool: string; runs: number; tokens: number; cost_usd: number; latency_ms: number }>;
} {
  const runs = entries.length;
  const toolCalls = entries.reduce((sum, entry) => sum + (entry.tool_calls ?? 0), 0);
  const tokenTotal = entries.reduce((sum, entry) => sum + (entry.token_total ?? 0), 0);
  const costUsd = roundCurrency(entries.reduce((sum, entry) => sum + (entry.cost_usd ?? 0), 0));
  const latencyMs = entries.reduce((sum, entry) => sum + (entry.latency_ms ?? 0), 0);
  const groupSizes = entries
    .map((entry) => entry.tfgrpo_group_size)
    .filter((value): value is number => typeof value === 'number');
  const groupSizeAvg =
    groupSizes.length > 0 ? groupSizes.reduce((sum, value) => sum + value, 0) / groupSizes.length : null;
  return {
    epoch,
    runs,
    tool_calls: toolCalls,
    token_total: tokenTotal,
    cost_usd: costUsd,
    latency_ms: latencyMs,
    group_size_avg: groupSizeAvg,
    tools: aggregateToolStats(entries)
  };
}

function aggregateToolStats(
  entries: MetricsEntry[]
): Array<{ tool: string; runs: number; tokens: number; cost_usd: number; latency_ms: number }> {
  const aggregates = new Map<string, { runs: number; tokens: number; costUsd: number; latencyMs: number }>();
  for (const entry of entries) {
    const stats = entry.tool_stats ?? [];
    for (const stat of stats) {
      if (typeof stat.tool !== 'string' || !stat.tool) {
        continue;
      }
      const current = aggregates.get(stat.tool) ?? { runs: 0, tokens: 0, costUsd: 0, latencyMs: 0 };
      current.runs += 1;
      current.tokens += typeof stat.tokens === 'number' ? stat.tokens : 0;
      current.costUsd += typeof stat.cost_usd === 'number' ? stat.cost_usd : 0;
      current.latencyMs += typeof stat.latency_ms === 'number' ? stat.latency_ms : 0;
      aggregates.set(stat.tool, current);
    }
  }
  return Array.from(aggregates.entries()).map(([tool, aggregate]) => ({
    tool,
    runs: aggregate.runs,
    tokens: aggregate.tokens,
    cost_usd: roundCurrency(aggregate.costUsd),
    latency_ms: aggregate.latencyMs
  }));
}

async function loadMetricsEntries(path: string): Promise<MetricsEntry[]> {
  try {
    const raw = await readFile(path, 'utf8');
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as MetricsEntry);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function roundCurrency(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
