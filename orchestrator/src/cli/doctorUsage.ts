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
import { normalizeTaskKey as normalizeTaskKeyAny } from '../../../scripts/lib/docs-helpers.js';

import type { CliManifest } from './types.js';

const normalizeTaskKey = normalizeTaskKeyAny as (item: unknown) => string | null;

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
    unique_tasks: number;
    by_status: Record<string, number>;
    by_diff_status: Record<string, number>;
    by_apply_status: Record<string, number>;
    top_environment_ids: { id: string; runs: number }[];
  };
  rlm: {
    runs: number;
    unique_tasks: number;
  };
  collab: {
    runs_with_tool_calls: number;
    total_tool_calls: number;
    unique_tasks: number;
    by_status: Record<string, number>;
    by_event_type: Record<string, number>;
    top_tools: { tool: string; calls: number }[];
    capture_disabled: boolean;
    runs_with_unclosed_spawn_agents: number;
    unclosed_spawn_agents: number;
    runs_with_spawn_thread_limit_failures: number;
    spawn_thread_limit_failures: number;
    runs_with_potentially_truncated_tool_calls: number;
    runs_with_unknown_capture_limit: number;
  };
  delegation: {
    active_top_level_tasks: number;
    active_with_subagents: number;
    total_subagent_manifests: number;
    tasks_with_child_runs: number;
    total_child_runs: number;
    errors: string[];
  };
  pipelines: {
    total: number;
    top: { id: string; runs: number }[];
  };
  adoption: {
    exec_runs: number;
    exec_share_pct: number;
    gate_runs: number;
    gate_share_pct: number;
    recommendations: string[];
  };
  kpis: {
    advanced_runs: number;
    advanced_share_pct: number;
    cloud_share_pct: number;
    rlm_share_pct: number;
    collab_share_pct: number;
    delegation_task_coverage_pct: number;
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
  const cloudByDiffStatus: Record<string, number> = {};
  const cloudByApplyStatus: Record<string, number> = {};
  const cloudEnvIds = new Map<string, number>();
  const cloudTasks = new Set<string>();

  const statusCounts = { total: 0, succeeded: 0, failed: 0, cancelled: 0, other: 0 };
  let cloudRuns = 0;
  let rlmRuns = 0;
  const rlmTasks = new Set<string>();
  let advancedRuns = 0;
  let collabRunsWithToolCalls = 0;
  let collabTotalToolCalls = 0;
  const collabTasks = new Set<string>();
  const collabByStatus: Record<string, number> = {};
  const collabByEventType: Record<string, number> = {};
  const collabTools = new Map<string, number>();
  const collabCaptureDisabled = String(process.env.CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS ?? '').trim() === '0';
  let collabRunsWithUnclosedSpawnAgents = 0;
  let collabUnclosedSpawnAgents = 0;
  let collabRunsWithSpawnThreadLimitFailures = 0;
  let collabSpawnThreadLimitFailures = 0;
  let collabRunsWithPotentiallyTruncatedToolCalls = 0;
  let collabRunsWithUnknownCaptureLimit = 0;

  const activeIndexTasks = new Set<string>();
  const taskKeys = readTaskIndexKeys(env.repoRoot);
  const tasksWithChildRuns = new Set<string>();
  let totalChildRuns = 0;

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
    let advancedUsed = false;
    if (pipelineId === 'rlm') {
      rlmRuns += 1;
      advancedUsed = true;
      if (typeof manifest.task_id === 'string' && manifest.task_id) {
        rlmTasks.add(manifest.task_id);
      }
    }

    if (manifest.cloud_execution) {
      cloudRuns += 1;
      advancedUsed = true;
      const cloudStatusRaw = manifest.cloud_execution.status;
      const status = typeof cloudStatusRaw === 'string' ? cloudStatusRaw.trim() || 'unknown' : 'unknown';
      cloudByStatus[status] = (cloudByStatus[status] ?? 0) + 1;

      const cloudDiffRaw = manifest.cloud_execution.diff_status;
      const diffStatus = typeof cloudDiffRaw === 'string' ? cloudDiffRaw.trim() || 'unknown' : 'unknown';
      cloudByDiffStatus[diffStatus] = (cloudByDiffStatus[diffStatus] ?? 0) + 1;

      const cloudApplyRaw = manifest.cloud_execution.apply_status;
      const applyStatus = typeof cloudApplyRaw === 'string' ? cloudApplyRaw.trim() || 'unknown' : 'unknown';
      cloudByApplyStatus[applyStatus] = (cloudByApplyStatus[applyStatus] ?? 0) + 1;

      const cloudEnvIdRaw = manifest.cloud_execution.environment_id;
      const envId = typeof cloudEnvIdRaw === 'string' ? cloudEnvIdRaw.trim() : '';
      if (envId) {
        cloudEnvIds.set(envId, (cloudEnvIds.get(envId) ?? 0) + 1);
      }
      if (typeof manifest.task_id === 'string' && manifest.task_id) {
        cloudTasks.add(manifest.task_id);
      }
    }

    if (manifest.cloud_fallback) {
      advancedUsed = true;
    }

    if (Array.isArray(manifest.collab_tool_calls) && manifest.collab_tool_calls.length > 0) {
      collabRunsWithToolCalls += 1;
      collabTotalToolCalls += manifest.collab_tool_calls.length;
      advancedUsed = true;
      const collabCaptureLimit = resolveManifestCollabCaptureLimit(manifest);
      const collabCaptureLimitKnown = collabCaptureLimit !== null;
      if (!collabCaptureLimitKnown) {
        collabRunsWithUnknownCaptureLimit += 1;
      }
      const collabEventsPossiblyTruncated =
        collabCaptureLimitKnown
        && collabCaptureLimit > 0
        && manifest.collab_tool_calls.length >= collabCaptureLimit;
      if (collabEventsPossiblyTruncated) {
        collabRunsWithPotentiallyTruncatedToolCalls += 1;
      }
      const spawnedAgents = new Set<string>();
      const closedAgents = new Set<string>();
      const failedSpawnIds = new Set<string>();
      let failedSpawnCalls = 0;
      if (typeof manifest.task_id === 'string' && manifest.task_id) {
        collabTasks.add(manifest.task_id);
      }
      for (const [entryIndex, entry] of manifest.collab_tool_calls.entries()) {
        const tool = typeof entry?.tool === 'string' && entry.tool ? entry.tool : 'unknown';
        const status = typeof entry?.status === 'string' && entry.status ? entry.status : 'unknown';
        const eventType = typeof entry?.event_type === 'string' && entry.event_type ? entry.event_type : 'unknown';
        const receiverThreadIds = Array.isArray(entry?.receiver_thread_ids)
          ? entry.receiver_thread_ids
              .map((id) => (typeof id === 'string' ? id.trim() : ''))
              .filter((id) => id.length > 0)
          : [];
        const completedEventWithoutStatus = eventType === 'item.completed' && status !== 'failed';
        const isCompleted = status === 'completed' || completedEventWithoutStatus;
        const isFailed = status === 'failed';
        const isTerminalEvent = isCompleted || isFailed;

        collabByStatus[status] = (collabByStatus[status] ?? 0) + 1;
        collabByEventType[eventType] = (collabByEventType[eventType] ?? 0) + 1;
        collabTools.set(tool, (collabTools.get(tool) ?? 0) + 1);

        if (!isTerminalEvent) {
          continue;
        }

        if (tool === 'spawn_agent') {
          if (isFailed) {
            const rawFailedSpawnId = typeof entry?.item_id === 'string' ? entry.item_id.trim() : '';
            const failedSpawnId =
              rawFailedSpawnId.length > 0 && rawFailedSpawnId !== 'unknown'
                ? `${entry?.stage_id ?? 'unknown-stage'}:${entry?.command_index ?? 'unknown-command'}:${rawFailedSpawnId}`
                : `spawn-failed@${entryIndex}`;
            if (!failedSpawnIds.has(failedSpawnId)) {
              failedSpawnIds.add(failedSpawnId);
              failedSpawnCalls += 1;
            }
            continue;
          }
          if (!isCompleted) {
            continue;
          }
          if (receiverThreadIds.length > 0) {
            for (const id of receiverThreadIds) {
              spawnedAgents.add(id);
            }
          } else {
            const fallbackId = `spawn@${entry?.item_id ?? entryIndex}`;
            spawnedAgents.add(fallbackId);
          }
          continue;
        }

        if (tool === 'close_agent' && isCompleted) {
          for (const id of receiverThreadIds) {
            closedAgents.add(id);
          }
        }
      }

      if (collabCaptureLimitKnown && !collabEventsPossiblyTruncated) {
        const unclosedSpawnAgents = [...spawnedAgents].filter((id) => !closedAgents.has(id));
        if (unclosedSpawnAgents.length > 0) {
          collabRunsWithUnclosedSpawnAgents += 1;
          collabUnclosedSpawnAgents += unclosedSpawnAgents.length;
        }
        if (failedSpawnCalls > 0) {
          collabRunsWithSpawnThreadLimitFailures += 1;
          collabSpawnThreadLimitFailures += failedSpawnCalls;
        }
      }
    }

    if (typeof manifest.task_id === 'string' && manifest.task_id && taskKeys.has(manifest.task_id)) {
      activeIndexTasks.add(manifest.task_id);
    }

    if (Array.isArray(manifest.child_runs) && manifest.child_runs.length > 0) {
      totalChildRuns += manifest.child_runs.length;
      advancedUsed = true;
      if (typeof manifest.task_id === 'string' && manifest.task_id) {
        tasksWithChildRuns.add(manifest.task_id);
      }
    }
    if (advancedUsed) {
      advancedRuns += 1;
    }
  }

  const pipelineTop = [...pipelines.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, runs]) => ({ id, runs }));

  const execRuns = pipelines.get('exec') ?? 0;
  const gateRuns = (pipelines.get('docs-review') ?? 0) + (pipelines.get('implementation-gate') ?? 0);
  const execSharePct = statusCounts.total > 0 ? Math.round((execRuns / statusCounts.total) * 1000) / 10 : 0;
  const gateSharePct = statusCounts.total > 0 ? Math.round((gateRuns / statusCounts.total) * 1000) / 10 : 0;
  const adoptionRecommendations = buildAdoptionRecommendations({
    totalRuns: statusCounts.total,
    execRuns,
    gateRuns,
    rlmRuns,
    cloudRuns,
    collabRunsWithToolCalls
  });

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
  const delegationTaskCoveragePct =
    activeTasks.length > 0 ? Math.round((activeWithSubagents / activeTasks.length) * 1000) / 10 : 0;
  const advancedSharePct =
    statusCounts.total > 0 ? Math.round((advancedRuns / statusCounts.total) * 1000) / 10 : 0;
  const cloudSharePct =
    statusCounts.total > 0 ? Math.round((cloudRuns / statusCounts.total) * 1000) / 10 : 0;
  const rlmSharePct =
    statusCounts.total > 0 ? Math.round((rlmRuns / statusCounts.total) * 1000) / 10 : 0;
  const collabSharePct =
    statusCounts.total > 0 ? Math.round((collabRunsWithToolCalls / statusCounts.total) * 1000) / 10 : 0;

  const cloudTopEnvIds = [...cloudEnvIds.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, runs]) => ({ id, runs }));
  const collabTopTools = [...collabTools.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool, calls]) => ({ tool, calls }));

  return {
    window_days: windowDays,
    cutoff_iso: cutoffIso,
    runs: statusCounts,
    cloud: {
      runs: cloudRuns,
      unique_tasks: cloudTasks.size,
      by_status: cloudByStatus,
      by_diff_status: cloudByDiffStatus,
      by_apply_status: cloudByApplyStatus,
      top_environment_ids: cloudTopEnvIds
    },
    rlm: {
      runs: rlmRuns,
      unique_tasks: rlmTasks.size
    },
    collab: {
      runs_with_tool_calls: collabRunsWithToolCalls,
      total_tool_calls: collabTotalToolCalls,
      unique_tasks: collabTasks.size,
      by_status: collabByStatus,
      by_event_type: collabByEventType,
      top_tools: collabTopTools,
      capture_disabled: collabCaptureDisabled,
      runs_with_unclosed_spawn_agents: collabRunsWithUnclosedSpawnAgents,
      unclosed_spawn_agents: collabUnclosedSpawnAgents,
      runs_with_spawn_thread_limit_failures: collabRunsWithSpawnThreadLimitFailures,
      spawn_thread_limit_failures: collabSpawnThreadLimitFailures,
      runs_with_potentially_truncated_tool_calls: collabRunsWithPotentiallyTruncatedToolCalls,
      runs_with_unknown_capture_limit: collabRunsWithUnknownCaptureLimit
    },
    delegation: {
      active_top_level_tasks: activeTasks.length,
      active_with_subagents: activeWithSubagents,
      total_subagent_manifests: totalSubagentManifests,
      tasks_with_child_runs: tasksWithChildRuns.size,
      total_child_runs: totalChildRuns,
      errors: delegationErrors
    },
    pipelines: {
      total: pipelines.size,
      top: pipelineTop
    },
    adoption: {
      exec_runs: execRuns,
      exec_share_pct: execSharePct,
      gate_runs: gateRuns,
      gate_share_pct: gateSharePct,
      recommendations: adoptionRecommendations
    },
    kpis: {
      advanced_runs: advancedRuns,
      advanced_share_pct: advancedSharePct,
      cloud_share_pct: cloudSharePct,
      rlm_share_pct: rlmSharePct,
      collab_share_pct: collabSharePct,
      delegation_task_coverage_pct: delegationTaskCoveragePct
    }
  };
}

export function formatDoctorUsageSummary(result: DoctorUsageResult): string[] {
  const lines: string[] = [];
  lines.push(`Usage (last ${result.window_days}d, cutoff ${result.cutoff_iso})`);
  lines.push(
    `  - runs: ${result.runs.total} (ok=${result.runs.succeeded}, failed=${result.runs.failed}, cancelled=${result.runs.cancelled}, other=${result.runs.other})`
  );

  const cloudSuffix =
    result.cloud.unique_tasks > 0
      ? ` over ${result.cloud.unique_tasks} task${result.cloud.unique_tasks === 1 ? '' : 's'}`
      : '';
  const cloudDiff = formatTopCounts(result.cloud.by_diff_status, 2, 'diff');
  const cloudApply = formatTopCounts(result.cloud.by_apply_status, 2, 'apply');
  const cloudEnv = formatTopList(result.cloud.top_environment_ids.map((entry) => ({ key: entry.id, value: entry.runs })), 2, 'env');
  lines.push(
    `  - cloud: ${result.cloud.runs}${cloudSuffix} (${formatPercent(result.cloud.runs, result.runs.total)})${formatCloudStatuses(result.cloud.by_status)}${cloudDiff}${cloudApply}${cloudEnv}`
  );

  const rlmSuffix =
    result.rlm.unique_tasks > 0
      ? ` over ${result.rlm.unique_tasks} task${result.rlm.unique_tasks === 1 ? '' : 's'}`
      : '';
  lines.push(
    `  - rlm: ${result.rlm.runs}${rlmSuffix} (${formatPercent(result.rlm.runs, result.runs.total)})`
  );

  const collabSuffix = result.collab.capture_disabled ? ' (capture disabled)' : '';
  const collabTaskSuffix =
    result.collab.unique_tasks > 0
      ? ` over ${result.collab.unique_tasks} task${result.collab.unique_tasks === 1 ? '' : 's'}`
      : '';
  const collabAvg =
    result.collab.runs_with_tool_calls > 0
      ? ` (avg ${Math.round((result.collab.total_tool_calls / result.collab.runs_with_tool_calls) * 10) / 10}/run)`
      : '';
  const collabOk = result.collab.by_status.completed ?? 0;
  const collabFailed = result.collab.by_status.failed ?? 0;
  const collabLeakSignal =
    `, leaks=${result.collab.unclosed_spawn_agents} over ${result.collab.runs_with_unclosed_spawn_agents} run(s)`;
  const collabThreadLimitSignal =
    `, likely_thread_limit_spawns=${result.collab.spawn_thread_limit_failures} over ${result.collab.runs_with_spawn_thread_limit_failures} run(s)`;
  const collabLifecycleUnknownRuns =
    result.collab.runs_with_potentially_truncated_tool_calls + result.collab.runs_with_unknown_capture_limit;
  const collabLifecycleUnknownSignal =
    collabLifecycleUnknownRuns > 0
      ? `, lifecycle_unknown_runs=${collabLifecycleUnknownRuns}`
      : '';
  const collabToolList = formatTopList(result.collab.top_tools.map((entry) => ({ key: entry.tool, value: entry.calls })), 3, 'tools');
  lines.push(
    `  - collab: ${result.collab.runs_with_tool_calls} (${formatPercent(result.collab.runs_with_tool_calls, result.runs.total)})${collabSuffix}`
      + `${collabTaskSuffix}, events=${result.collab.total_tool_calls}${collabAvg} (ok=${collabOk}, failed=${collabFailed}${collabLeakSignal}${collabThreadLimitSignal}${collabLifecycleUnknownSignal})${collabToolList}`
  );
  if (result.delegation.active_top_level_tasks > 0) {
    lines.push(
      `  - delegation: ${result.delegation.active_with_subagents}/${result.delegation.active_top_level_tasks} top-level tasks have subagent manifests (${result.delegation.total_subagent_manifests} total); child_runs=${result.delegation.total_child_runs} over ${result.delegation.tasks_with_child_runs} tasks`
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

  lines.push(
    `Pipeline adoption: exec=${result.adoption.exec_runs} (${result.adoption.exec_share_pct}%), ` +
      `docs-review+implementation-gate=${result.adoption.gate_runs} (${result.adoption.gate_share_pct}%)`
  );
  lines.push(
    `KPIs: advanced=${result.kpis.advanced_runs} (${result.kpis.advanced_share_pct}%), ` +
      `cloud=${result.kpis.cloud_share_pct}%, rlm=${result.kpis.rlm_share_pct}%, ` +
      `collab=${result.kpis.collab_share_pct}%, delegation-task-coverage=${result.kpis.delegation_task_coverage_pct}%`
  );
  if (result.adoption.recommendations.length > 0) {
    lines.push('Adoption hints:');
    for (const recommendation of result.adoption.recommendations) {
      lines.push(`  - ${recommendation}`);
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

function buildAdoptionRecommendations(params: {
  totalRuns: number;
  execRuns: number;
  gateRuns: number;
  rlmRuns: number;
  cloudRuns: number;
  collabRunsWithToolCalls: number;
}): string[] {
  if (params.totalRuns <= 0) {
    return [];
  }
  const hints: string[] = [];
  const execShare = params.execRuns / params.totalRuns;
  if (execShare >= 0.6) {
    hints.push(
      'Most runs are plain exec; prefer `codex-orchestrator start docs-review` or `start implementation-gate` for manifest-backed guardrails.'
    );
  }
  if (params.gateRuns === 0) {
    hints.push(
      'No gate pipelines detected; use docs-review before implementation and implementation-gate before handoff.'
    );
  }
  if (params.rlmRuns === 0) {
    hints.push(
      'No RLM runs detected; try `codex-orchestrator rlm --multi-agent auto "<goal>"` (legacy: `--collab auto`) for long-horizon or ambiguous tasks.'
    );
  }
  if (params.cloudRuns === 0) {
    hints.push(
      'No cloud runs detected; configure CODEX_CLOUD_ENV_ID and run `codex-orchestrator start <pipeline> --cloud --target <stage-id>` for long-running stages.'
    );
  }
  if (params.rlmRuns > 0 && params.collabRunsWithToolCalls === 0) {
    hints.push(
      'RLM is used without collab activity; ensure multi-agent is enabled (`codex features enable multi_agent`, legacy alias: `collab`).'
    );
  }
  return hints.slice(0, 3);
}

function extractRunIdFromManifestPath(manifestPath: string): string | null {
  if (!manifestPath) {
    return null;
  }
  // .../<run-id>/manifest.json
  const dir = manifestPath.endsWith('manifest.json') ? basename(dirname(manifestPath)) : null;
  return dir && dir !== '..' ? dir : null;
}

function resolveManifestCollabCaptureLimit(manifest: CliManifest): number | null {
  const value = manifest.collab_tool_calls_max_events;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.trunc(value);
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

function formatTopCounts(byKey: Record<string, number>, limit: number, label: string): string {
  const entries = Object.entries(byKey);
  if (entries.length === 0) {
    return '';
  }
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries
    .slice(0, limit)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  return ` ${label}[${top}]`;
}

function formatTopList(entries: { key: string; value: number }[], limit: number, label: string): string {
  const filtered = entries.filter((entry) => entry.key && Number.isFinite(entry.value) && entry.value > 0);
  if (filtered.length === 0) {
    return '';
  }
  const top = filtered
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
    .slice(0, limit)
    .map((entry) => `${entry.key}=${entry.value}`)
    .join(', ');
  return ` ${label}[${top}]`;
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
