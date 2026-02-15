import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import process from 'node:process';

import {
  collectManifests,
  findSubagentManifests,
  parseRunIdTimestamp,
  resolveEnvironmentPaths
} from '../../../scripts/lib/run-manifests.js';

import type { CliManifest } from './types.js';

export interface DoctorUsageOptions {
  windowDays?: number;
  taskFilter?: string | null;
}

export interface DoctorUsageResult {
  window_days: number;
  cutoff_iso: string;
  runs: {
    total: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    other: number;
  };
  cloud: {
    runs: number;
    by_status: Record<string, number>;
  };
  rlm: {
    runs: number;
  };
  collab: {
    runs_with_tool_calls: number;
    total_tool_calls: number;
    capture_disabled: boolean;
  };
  delegation: {
    active_top_level_tasks: number;
    active_with_subagents: number;
    total_subagent_manifests: number;
    errors: string[];
  };
  pipelines: {
    total: number;
    top: { id: string; runs: number }[];
  };
}

export async function runDoctorUsage(options: DoctorUsageOptions = {}): Promise<DoctorUsageResult> {
  const windowDays = clampInt(options.windowDays ?? 30, 1, 3650);
  const cutoffMs = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();

  const env = resolveEnvironmentPaths();
  const manifestPaths = await collectManifests(env.runsRoot, options.taskFilter ?? undefined);

  const seenRunIds = new Set<string>();
  const pipelines = new Map<string, number>();
  const cloudByStatus: Record<string, number> = {};

  const statusCounts = { total: 0, succeeded: 0, failed: 0, cancelled: 0, other: 0 };
  let cloudRuns = 0;
  let rlmRuns = 0;
  let collabRunsWithToolCalls = 0;
  let collabTotalToolCalls = 0;
  const collabCaptureDisabled = String(process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS ?? '').trim() === '0';

  const activeIndexTasks = new Set<string>();
  const taskKeys = readTaskIndexKeys(env.repoRoot);

  for (const manifestPath of manifestPaths) {
    const runIdFromPath = extractRunIdFromManifestPath(manifestPath);
    if (!runIdFromPath) {
      continue;
    }
    if (seenRunIds.has(runIdFromPath)) {
      continue;
    }

    const timestamp = parseRunIdTimestamp(runIdFromPath);
    if (timestamp && timestamp.getTime() < cutoffMs) {
      continue;
    }

    let manifest: CliManifest;
    try {
      const raw = await readFile(manifestPath, 'utf8');
      manifest = JSON.parse(raw) as CliManifest;
    } catch {
      continue;
    }
    const runId = typeof manifest.run_id === 'string' && manifest.run_id ? manifest.run_id : runIdFromPath;
    if (seenRunIds.has(runId)) {
      continue;
    }
    seenRunIds.add(runId);

    const startedAtMs = Date.parse(manifest.started_at ?? '') || timestamp?.getTime() || 0;
    if (!startedAtMs || startedAtMs < cutoffMs) {
      continue;
    }

    statusCounts.total += 1;
    if (manifest.status === 'succeeded') {
      statusCounts.succeeded += 1;
    } else if (manifest.status === 'failed') {
      statusCounts.failed += 1;
    } else if (manifest.status === 'cancelled') {
      statusCounts.cancelled += 1;
    } else {
      statusCounts.other += 1;
    }

    const pipelineId = typeof manifest.pipeline_id === 'string' && manifest.pipeline_id ? manifest.pipeline_id : 'unknown';
    pipelines.set(pipelineId, (pipelines.get(pipelineId) ?? 0) + 1);
    if (pipelineId === 'rlm') {
      rlmRuns += 1;
    }

    if (manifest.cloud_execution) {
      cloudRuns += 1;
      const status = (manifest.cloud_execution.status ?? 'unknown').trim() || 'unknown';
      cloudByStatus[status] = (cloudByStatus[status] ?? 0) + 1;
    }

    if (Array.isArray(manifest.collab_tool_calls) && manifest.collab_tool_calls.length > 0) {
      collabRunsWithToolCalls += 1;
      collabTotalToolCalls += manifest.collab_tool_calls.length;
    }

    if (taskKeys.has(manifest.task_id)) {
      activeIndexTasks.add(manifest.task_id);
    }
  }

  const pipelineTop = [...pipelines.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, runs]) => ({ id, runs }));

  const delegationErrors: string[] = [];
  let activeWithSubagents = 0;
  let totalSubagentManifests = 0;
  const activeTasks = [...activeIndexTasks];
  const subagentResults = await Promise.all(
    activeTasks.map(async (taskId) => {
      const result = await findSubagentManifests(env.runsRoot, taskId);
      if (result.error) {
        delegationErrors.push(result.error);
      }
      return { taskId, found: result.found };
    })
  );
  for (const item of subagentResults) {
    totalSubagentManifests += item.found.length;
    if (item.found.length > 0) {
      activeWithSubagents += 1;
    }
  }

  return {
    window_days: windowDays,
    cutoff_iso: cutoffIso,
    runs: statusCounts,
    cloud: {
      runs: cloudRuns,
      by_status: cloudByStatus
    },
    rlm: {
      runs: rlmRuns
    },
    collab: {
      runs_with_tool_calls: collabRunsWithToolCalls,
      total_tool_calls: collabTotalToolCalls,
      capture_disabled: collabCaptureDisabled
    },
    delegation: {
      active_top_level_tasks: activeTasks.length,
      active_with_subagents: activeWithSubagents,
      total_subagent_manifests: totalSubagentManifests,
      errors: delegationErrors
    },
    pipelines: {
      total: pipelines.size,
      top: pipelineTop
    }
  };
}

export function formatDoctorUsageSummary(result: DoctorUsageResult): string[] {
  const lines: string[] = [];
  lines.push(`Usage (last ${result.window_days}d, cutoff ${result.cutoff_iso})`);
  lines.push(
    `  - runs: ${result.runs.total} (ok=${result.runs.succeeded}, failed=${result.runs.failed}, other=${result.runs.other})`
  );
  lines.push(
    `  - cloud: ${result.cloud.runs} (${formatPercent(result.cloud.runs, result.runs.total)})${formatCloudStatuses(result.cloud.by_status)}`
  );
  lines.push(
    `  - rlm: ${result.rlm.runs} (${formatPercent(result.rlm.runs, result.runs.total)})`
  );
  const collabSuffix = result.collab.capture_disabled ? ' (capture disabled)' : '';
  lines.push(
    `  - collab: ${result.collab.runs_with_tool_calls} (${formatPercent(result.collab.runs_with_tool_calls, result.runs.total)})${collabSuffix}`
  );
  if (result.delegation.active_top_level_tasks > 0) {
    lines.push(
      `  - delegation: ${result.delegation.active_with_subagents}/${result.delegation.active_top_level_tasks} top-level tasks have subagent manifests`
    );
  } else {
    lines.push('  - delegation: no top-level tasks detected in tasks/index.json for this window');
  }

  if (result.pipelines.top.length > 0) {
    lines.push('Top pipelines:');
    for (const entry of result.pipelines.top) {
      lines.push(`  - ${entry.id}: ${entry.runs}`);
    }
  }

  if (result.delegation.errors.length > 0) {
    lines.push('Delegation scan warnings:');
    for (const warning of result.delegation.errors.slice(0, 3)) {
      lines.push(`  - ${warning}`);
    }
  }
  return lines;
}

function extractRunIdFromManifestPath(manifestPath: string): string | null {
  if (!manifestPath) {
    return null;
  }
  // .../<run-id>/manifest.json
  const dir = manifestPath.endsWith('manifest.json') ? basename(dirname(manifestPath)) : null;
  return dir && dir !== '..' ? dir : null;
}

function clampInt(value: number, min: number, max: number): number {
  const rounded = Math.floor(value);
  if (!Number.isFinite(rounded)) {
    return min;
  }
  return Math.max(min, Math.min(max, rounded));
}

function formatPercent(numerator: number, denominator: number): string {
  if (!denominator) {
    return '0%';
  }
  const pct = (numerator / denominator) * 100;
  return `${Math.round(pct * 10) / 10}%`;
}

function formatCloudStatuses(byStatus: Record<string, number>): string {
  const entries = Object.entries(byStatus);
  if (entries.length === 0) {
    return '';
  }
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries
    .slice(0, 3)
    .map(([status, count]) => `${status}=${count}`)
    .join(', ');
  return ` [${top}]`;
}

function normalizeTaskKey(item: unknown): string | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const record = item as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const slug = typeof record.slug === 'string' ? record.slug.trim() : '';
  if (slug && id && slug.startsWith(`${id}-`)) {
    return slug;
  }
  if (id && slug) {
    return `${id}-${slug}`;
  }
  if (slug) {
    return slug;
  }
  if (id) {
    return id;
  }
  return null;
}

function readTaskIndexKeys(repoRoot: string): Set<string> {
  const indexPath = join(repoRoot, 'tasks', 'index.json');
  try {
    const raw = readFileSync(indexPath, 'utf8');
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? (parsed.items as unknown[]) : [];
    const keys = items
      .map((item) => normalizeTaskKey(item))
      .filter((key): key is string => typeof key === 'string' && key.length > 0);
    return new Set(keys);
  } catch {
    return new Set();
  }
}
