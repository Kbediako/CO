import type { Dirent } from 'node:fs';
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, open, readFile, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

import type { EnvironmentPaths } from '../run/environment.js';
import type { SandboxState, ToolRunStatus } from '../../../../packages/shared/manifest/types.js';
import { acquireLockWithRetry, type LockRetryOptions } from '../../persistence/lockFile.js';
import { EnvUtils } from '../../../../packages/shared/config/index.js';
import { writeJsonAtomic } from '../utils/fs.js';

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

type CompletenessField = (typeof REQUIRED_COMPLETENESS_FIELDS)[number];

interface EpochAggregate {
  runs: number;
  tool_calls: number;
  token_total: number;
  cost_usd: number;
  latency_ms: number;
  group_size_sum: number;
  group_size_count: number;
  tool_stats: Map<string, { runs: number; tokens: number; costUsd: number; latencyMs: number }>;
}

interface MetricsAggregationState {
  totalRuns: number;
  succeededRuns: number;
  baselineEntry: MetricsEntry | null;
  missingCounts: Record<CompletenessField, number>;
  durationSum: number;
  durationCount: number;
  epochs: Map<number, EpochAggregate>;
  validationSummary: { passed: number; failed: number; stalled: number; manual: number };
  reviewerRejections: number;
  reviewerLatencySum: number;
  reviewerLatencyCount: number;
  regressions: number;
  patternPromotions: number;
  patternDeprecations: number;
  throughputCandidates: number;
  alertsTotal: number;
  alertsSnapshotFailed: number;
  alertsStalledSnapshot: number;
}

const METRICS_LOCK_FILENAME = 'metrics.lock';
const METRICS_PENDING_DIRNAME = 'metrics.pending';
const DEFAULT_LOCK_STALE_MS = 5 * 60 * 1000;
const DEFAULT_PENDING_BATCH_MAX_LINES = 500;
const DEFAULT_PENDING_BATCH_MAX_BYTES = 1024 * 1024;
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

async function streamMetricsEntryLines(
  path: string,
  onLine: (line: string) => Promise<void>
): Promise<number> {
  let count = 0;
  let reader: ReturnType<typeof createInterface> | undefined;
  let stream: ReturnType<typeof createReadStream> | undefined;
  try {
    stream = createReadStream(path, { encoding: 'utf8' });
    reader = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of reader) {
      if (line.trim().length === 0) {
        continue;
      }
      count += 1;
      await onLine(line);
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 0;
    }
    throw error;
  } finally {
    reader?.close();
    stream?.destroy();
  }
  return count;
}

function normalizeBatchLimit(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return value;
}

function getPendingBatchLimits(): { maxLines: number; maxBytes: number } {
  const maxLines = EnvUtils.getInt(
    'CODEX_METRICS_PENDING_BATCH_MAX_LINES',
    DEFAULT_PENDING_BATCH_MAX_LINES
  );
  const maxBytes = EnvUtils.getInt(
    'CODEX_METRICS_PENDING_BATCH_MAX_BYTES',
    DEFAULT_PENDING_BATCH_MAX_BYTES
  );
  return {
    maxLines: normalizeBatchLimit(maxLines),
    maxBytes: normalizeBatchLimit(maxBytes)
  };
}

export async function mergePendingMetricsEntries(env: EnvironmentPaths): Promise<number> {
  const pendingDir = getMetricsPendingDir(env);
  const metricsRoot = getMetricsRoot(env);
  const metricsPath = getMetricsPath(env);
  let merged = 0;
  const staleTmpMs = DEFAULT_LOCK_STALE_MS;
  const { maxLines: maxBatchLines, maxBytes: maxBatchBytes } = getPendingBatchLimits();

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

    await mkdir(metricsRoot, { recursive: true });

    let payloadLines: string[] = [];
    let filesToRemove: string[] = [];
    let payloadLineCount = 0;
    let payloadBytes = 0;

    const flushBatch = async () => {
      if (payloadLines.length > 0) {
        const payload = `${payloadLines.join('\n')}\n`;
        await ensureMetricsTrailingNewline(metricsPath);
        await appendFile(metricsPath, payload, 'utf8');
      }
      if (filesToRemove.length > 0) {
        await Promise.all(filesToRemove.map((filePath) => rm(filePath, { force: true })));
      }
      payloadLines = [];
      filesToRemove = [];
      payloadLineCount = 0;
      payloadBytes = 0;
    };

    for (const file of files) {
      const filePath = join(pendingDir, file);
      const fileLineCount = await streamMetricsEntryLines(filePath, async (line) => {
        const lineBytes = Buffer.byteLength(line, 'utf8') + 1;
        const wouldExceedLines = payloadLineCount + 1 > maxBatchLines;
        const wouldExceedBytes = payloadBytes + lineBytes > maxBatchBytes;
        if (payloadLines.length > 0 && (wouldExceedLines || wouldExceedBytes)) {
          await flushBatch();
        }
        payloadLines.push(line);
        payloadLineCount += 1;
        payloadBytes += lineBytes;
        merged += 1;
      });

      if (fileLineCount === 0) {
        await rm(filePath, { force: true });
        continue;
      }

      filesToRemove.push(filePath);
    }

    await flushBatch();
  }

  return merged;
}

export async function ensureMetricsTrailingNewline(path: string): Promise<void> {
  try {
    const handle = await open(path, 'r');
    try {
      const stats = await handle.stat();
      if (stats.size === 0) {
        return;
      }
      const buffer = Buffer.alloc(1);
      await handle.read(buffer, 0, 1, stats.size - 1);
      if (buffer[0] !== 0x0a) {
        await appendFile(path, '\n', 'utf8');
      }
    } finally {
      await handle.close();
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
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
  const state = createAggregationState();
  await streamMetricsEntryLines(metricsPath, async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    try {
      const entry = JSON.parse(trimmed) as MetricsEntry;
      accumulateMetricsEntry(state, entry);
    } catch {
      return;
    }
  });
  if (state.totalRuns === 0 || !state.baselineEntry) {
    return;
  }

  const metricsDir = join(metricsRoot, 'metrics');
  await mkdir(metricsDir, { recursive: true });

  await ensureBaseline(metricsDir, state.baselineEntry);

  await Promise.all([
    writePostRollout(metricsDir, state),
    writeCompleteness(metricsDir, state),
    writeMttrDelta(env, state),
    writeTfgrpoEpochAggregates(metricsDir, state),
    writeLearningState(env, state)
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
  await writeJsonAtomic(baselinePath, baseline);
}

async function writePostRollout(dir: string, state: MetricsAggregationState): Promise<void> {
  const totalRuns = state.totalRuns;
  const succeededRuns = state.succeededRuns;
  const completionRate = totalRuns > 0 ? succeededRuns / totalRuns : 0;
  const payload = {
    total_runs: totalRuns,
    succeeded_runs: succeededRuns,
    completion_rate: completionRate,
    meets_threshold: completionRate >= 0.95,
    updated_at: new Date().toISOString()
  };
  await writeJsonAtomic(join(dir, 'post-rollout.json'), payload);
}

async function writeCompleteness(dir: string, state: MetricsAggregationState): Promise<void> {
  const fieldChecks = REQUIRED_COMPLETENESS_FIELDS.length * state.totalRuns;
  if (fieldChecks === 0) {
    return;
  }

  const totalMissing = Object.values(state.missingCounts).reduce((sum, value) => sum + value, 0);
  const ratio = totalMissing / fieldChecks;
  const payload = {
    checked_fields: REQUIRED_COMPLETENESS_FIELDS,
    missing_counts: state.missingCounts,
    missing_field_ratio: ratio,
    meets_threshold: ratio < 0.05,
    updated_at: new Date().toISOString()
  };

  await writeJsonAtomic(join(dir, 'completeness.json'), payload);
}

async function writeMttrDelta(env: EnvironmentPaths, state: MetricsAggregationState): Promise<void> {
  if (state.durationCount === 0) {
    return;
  }
  const currentMttr = state.durationSum / state.durationCount;

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
  await writeJsonAtomic(join(outDir, 'mttr-delta.json'), payload);
}

async function writeTfgrpoEpochAggregates(
  dir: string,
  state: MetricsAggregationState
): Promise<void> {
  if (state.epochs.size === 0) {
    return;
  }
  const epochs = Array.from(state.epochs.entries())
    .sort(([a], [b]) => a - b)
    .map(([epoch, aggregate]) => ({
      epoch,
      runs: aggregate.runs,
      tool_calls: aggregate.tool_calls,
      token_total: aggregate.token_total,
      cost_usd: roundCurrency(aggregate.cost_usd),
      latency_ms: aggregate.latency_ms,
      group_size_avg:
        aggregate.group_size_count > 0
          ? aggregate.group_size_sum / aggregate.group_size_count
          : null,
      tools: Array.from(aggregate.tool_stats.entries()).map(([tool, toolAggregate]) => ({
        tool,
        runs: toolAggregate.runs,
        tokens: toolAggregate.tokens,
        cost_usd: roundCurrency(toolAggregate.costUsd),
        latency_ms: toolAggregate.latencyMs
      }))
    }));
  const payload = {
    epochs,
    updated_at: new Date().toISOString()
  };
  await writeJsonAtomic(join(dir, 'per-epoch.json'), payload);
}

async function writeLearningState(env: EnvironmentPaths, state: MetricsAggregationState): Promise<void> {
  const reviewerLatencyMs =
    state.reviewerLatencyCount > 0
      ? state.reviewerLatencySum / state.reviewerLatencyCount
      : null;

  const alerts = {
    total: state.alertsTotal,
    snapshot_failed: state.alertsSnapshotFailed,
    stalled_snapshot: state.alertsStalledSnapshot,
    needs_manual_scenario: state.validationSummary.manual
  };

  const payload = {
    updated_at: new Date().toISOString(),
    safety: {
      validation: state.validationSummary,
      reviewer: { rejections: state.reviewerRejections, average_latency_ms: reviewerLatencyMs },
      regression_detection: { detected: state.regressions },
      pattern_hygiene: { promoted: state.patternPromotions, deprecated: state.patternDeprecations }
    },
    throughput: { candidates: state.throughputCandidates },
    alerts
  };

  const outDir = join(env.outRoot, env.taskId);
  await mkdir(outDir, { recursive: true });
  await writeJsonAtomic(join(outDir, 'state.json'), payload);
}

function createAggregationState(): MetricsAggregationState {
  const missingCounts = Object.fromEntries(
    REQUIRED_COMPLETENESS_FIELDS.map((field) => [field, 0])
  ) as Record<CompletenessField, number>;
  return {
    totalRuns: 0,
    succeededRuns: 0,
    baselineEntry: null,
    missingCounts,
    durationSum: 0,
    durationCount: 0,
    epochs: new Map<number, EpochAggregate>(),
    validationSummary: {
      passed: 0,
      failed: 0,
      stalled: 0,
      manual: 0
    },
    reviewerRejections: 0,
    reviewerLatencySum: 0,
    reviewerLatencyCount: 0,
    regressions: 0,
    patternPromotions: 0,
    patternDeprecations: 0,
    throughputCandidates: 0,
    alertsTotal: 0,
    alertsSnapshotFailed: 0,
    alertsStalledSnapshot: 0
  };
}

function accumulateMetricsEntry(state: MetricsAggregationState, entry: MetricsEntry): void {
  state.totalRuns += 1;
  if (!state.baselineEntry) {
    state.baselineEntry = entry;
  }
  if (entry.status === 'succeeded') {
    state.succeededRuns += 1;
  }

  if (!Array.isArray(entry.instance_stats) || entry.instance_stats.length === 0) {
    state.missingCounts.instance_stats += 1;
  }
  if (!Array.isArray(entry.privacy_events) || entry.privacy_events.length === 0) {
    state.missingCounts.privacy_events += 1;
  }
  if (!entry.control_plane_status || entry.control_plane_status === 'unknown') {
    state.missingCounts.control_plane_status += 1;
  }

  if (typeof entry.duration_seconds === 'number' && Number.isFinite(entry.duration_seconds)) {
    state.durationSum += entry.duration_seconds;
    state.durationCount += 1;
  }

  if (typeof entry.tfgrpo_epoch === 'number') {
    const aggregate = getEpochAggregate(state.epochs, entry.tfgrpo_epoch);
    aggregate.runs += 1;
    aggregate.tool_calls += typeof entry.tool_calls === 'number' ? entry.tool_calls : 0;
    aggregate.token_total += typeof entry.token_total === 'number' ? entry.token_total : 0;
    aggregate.cost_usd += typeof entry.cost_usd === 'number' ? entry.cost_usd : 0;
    aggregate.latency_ms += typeof entry.latency_ms === 'number' ? entry.latency_ms : 0;
    if (typeof entry.tfgrpo_group_size === 'number' && Number.isFinite(entry.tfgrpo_group_size)) {
      aggregate.group_size_sum += entry.tfgrpo_group_size;
      aggregate.group_size_count += 1;
    }

    const stats = Array.isArray(entry.tool_stats) ? entry.tool_stats : [];
    for (const stat of stats) {
      if (typeof stat.tool !== 'string' || !stat.tool) {
        continue;
      }
      const current =
        aggregate.tool_stats.get(stat.tool) ?? { runs: 0, tokens: 0, costUsd: 0, latencyMs: 0 };
      current.runs += 1;
      current.tokens += typeof stat.tokens === 'number' ? stat.tokens : 0;
      current.costUsd += typeof stat.cost_usd === 'number' ? stat.cost_usd : 0;
      current.latencyMs += typeof stat.latency_ms === 'number' ? stat.latency_ms : 0;
      aggregate.tool_stats.set(stat.tool, current);
    }
  }

  if (typeof entry.learning_validation_status === 'string') {
    switch (entry.learning_validation_status) {
      case 'validated':
        state.validationSummary.passed += 1;
        break;
      case 'snapshot_failed':
        state.validationSummary.failed += 1;
        break;
      case 'stalled_snapshot':
        state.validationSummary.stalled += 1;
        break;
      case 'needs_manual_scenario':
        state.validationSummary.manual += 1;
        break;
      default:
        break;
    }
  }

  if (typeof entry.learning_review_rejections === 'number') {
    state.reviewerRejections += entry.learning_review_rejections;
  }
  if (
    typeof entry.learning_review_latency_ms === 'number' &&
    Number.isFinite(entry.learning_review_latency_ms)
  ) {
    state.reviewerLatencySum += entry.learning_review_latency_ms;
    state.reviewerLatencyCount += 1;
  }
  if (typeof entry.learning_regressions_detected === 'number') {
    state.regressions += entry.learning_regressions_detected;
  }
  if (typeof entry.learning_pattern_promoted === 'number') {
    state.patternPromotions += entry.learning_pattern_promoted;
  }
  if (typeof entry.learning_pattern_deprecated === 'number') {
    state.patternDeprecations += entry.learning_pattern_deprecated;
  }
  if (typeof entry.learning_throughput_candidates === 'number') {
    state.throughputCandidates += entry.learning_throughput_candidates;
  }
  if (typeof entry.learning_alerts === 'number') {
    state.alertsTotal += entry.learning_alerts;
  }
  if (entry.learning_snapshot_status === 'snapshot_failed') {
    state.alertsSnapshotFailed += 1;
  }
  if (entry.learning_snapshot_status === 'stalled_snapshot') {
    state.alertsStalledSnapshot += 1;
  }
}

function getEpochAggregate(epochs: Map<number, EpochAggregate>, epoch: number): EpochAggregate {
  const existing = epochs.get(epoch);
  if (existing) {
    return existing;
  }
  const created: EpochAggregate = {
    runs: 0,
    tool_calls: 0,
    token_total: 0,
    cost_usd: 0,
    latency_ms: 0,
    group_size_sum: 0,
    group_size_count: 0,
    tool_stats: new Map()
  };
  epochs.set(epoch, created);
  return created;
}

function roundCurrency(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
