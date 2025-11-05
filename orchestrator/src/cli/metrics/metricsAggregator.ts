import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { EnvironmentPaths } from '../run/environment.js';

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
  privacy_events: Array<Record<string, unknown>>;
  handle_count: number;
}

const REQUIRED_COMPLETENESS_FIELDS: Array<keyof MetricsEntry> = [
  'instance_stats',
  'privacy_events',
  'control_plane_status'
];

export async function updateMetricsAggregates(env: EnvironmentPaths): Promise<void> {
  const metricsRoot = join(env.runsRoot, env.taskId);
  const metricsPath = join(metricsRoot, 'metrics.json');
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
    writeMttrDelta(env, entries)
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
