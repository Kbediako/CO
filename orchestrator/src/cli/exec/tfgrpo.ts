import type { EnvironmentPaths } from '../run/environment.js';
import { relativeToRepo } from '../run/runPaths.js';
import type { RunPaths } from '../run/runPaths.js';
import { logger } from '../../logger.js';
import type { CliManifest, TfgrpoManifestSection } from '../types.js';
import type { ExecEvent, RunMetricSummary, ToolMetricSummary } from '../../../../packages/shared/events/types.js';
import type { ExperienceStore, ExperienceRecord } from '../../persistence/ExperienceStore.js';
import {
  summarizeTrajectory,
  optimizeExperience,
  framesFromToolMetrics,
  type TfgrpoPolicyConfig
} from './experience.js';
import type { ToolRunRecord } from '../../../../packages/shared/manifest/types.js';
import type { RunResultSummary } from './types.js';

export interface TfgrpoContext {
  epoch: number | null;
  groupId: string | null;
  groupSize: number | null;
  active: boolean;
}

const COST_PER_TOKEN_USD = 0.000002;
const DEFAULT_EXPERIENCE_WORD_LIMIT = 32;

export function resolveTfgrpoContext(env: NodeJS.ProcessEnv = process.env): TfgrpoContext {
  const epoch = parsePositiveInteger(env.TFGRPO_EPOCH);
  const groupSize = parsePositiveInteger(env.TFGRPO_GROUP_SIZE);
  const groupId = env.TFGRPO_GROUP_ID?.trim() || null;
  return {
    epoch,
    groupId,
    groupSize,
    active: epoch !== null || groupSize !== null || groupId !== null
  };
}

export function resolveExperiencePolicy(env: NodeJS.ProcessEnv = process.env): TfgrpoPolicyConfig {
  const configured = env.TFGRPO_EXPERIENCE_MAX_WORDS;
  const parsed = configured ? Number.parseInt(configured, 10) : NaN;
  const maxSummaryWords = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EXPERIENCE_WORD_LIMIT;
  return {
    maxSummaryWords,
    rewardFloor: 0
  };
}

export function createToolMetricSnapshot(
  toolRecord: ToolRunRecord | null,
  summary: RunResultSummary | null
): ToolMetricSummary | null {
  if (!toolRecord && !summary) {
    return null;
  }
  const stdout = summary?.stdout ?? '';
  const tokens = estimateTokenCount(stdout);
  const latencyMs = summary?.durationMs ?? deriveDurationFromEvents(toolRecord);
  const costUsd = roundCurrency(tokens * COST_PER_TOKEN_USD);
  const attempts = toolRecord?.attemptCount ?? 1;
  const status = toolRecord?.status ?? summary?.status ?? 'failed';
  const sandboxState = summary?.sandboxState ?? toolRecord?.sandboxState ?? 'sandboxed';
  const toolName = toolRecord?.tool ?? 'cli:command';
  return {
    tool: toolName,
    tokens,
    costUsd,
    latencyMs,
    attempts,
    status,
    sandboxState
  };
}

export function createRunMetricSummary(
  metrics: ToolMetricSummary[],
  context: TfgrpoContext
): RunMetricSummary | null {
  const toolCalls = metrics.length;
  if (toolCalls === 0 && !context.active) {
    return null;
  }
  const tokenTotal = metrics.reduce((sum, metric) => sum + metric.tokens, 0);
  const costUsd = roundCurrency(metrics.reduce((sum, metric) => sum + metric.costUsd, 0));
  const latencyMs = metrics.reduce((sum, metric) => sum + metric.latencyMs, 0);
  return {
    toolCalls,
    tokenTotal,
    costUsd,
    latencyMs,
    perTool: metrics,
    tfgrpo: context.active
      ? {
          epoch: context.epoch,
          groupSize: context.groupSize,
          groupId: context.groupId
        }
      : undefined
  };
}

export function mergeTfgrpoManifest(
  existing: TfgrpoManifestSection | null | undefined,
  metrics: RunMetricSummary | null,
  context: TfgrpoContext
): TfgrpoManifestSection | null {
  if (!metrics && !existing && !context.active) {
    return null;
  }
  const manifestMetrics = metrics
    ? {
        tool_calls: metrics.toolCalls,
        token_total: metrics.tokenTotal,
        cost_usd: metrics.costUsd,
        latency_ms: metrics.latencyMs,
        per_tool: metrics.perTool.map((entry) => ({
          tool: entry.tool,
          tokens: entry.tokens,
          cost_usd: entry.costUsd,
          latency_ms: entry.latencyMs,
          attempts: entry.attempts,
          status: entry.status,
          sandbox_state: entry.sandboxState
        }))
      }
    : existing?.tool_metrics;
  return {
    epoch: context.epoch ?? existing?.epoch ?? null,
    group_id: context.groupId ?? existing?.group_id ?? null,
    group_size: context.groupSize ?? existing?.group_size ?? null,
    tool_metrics: manifestMetrics ?? existing?.tool_metrics,
    experiences: existing?.experiences
  };
}

export async function persistExperienceRecords(params: {
  store: ExperienceStore;
  manifest: CliManifest;
  env: EnvironmentPaths;
  paths: RunPaths;
  tfgrpoContext: TfgrpoContext;
  runMetrics: RunMetricSummary | null;
  execEvents: ExecEvent[];
  policy: TfgrpoPolicyConfig;
}): Promise<ExperienceRecord[] | null> {
  const { runMetrics } = params;
  if (!runMetrics || runMetrics.perTool.length === 0) {
    return null;
  }
  const promptPack = params.manifest.prompt_packs?.[0];
  if (!promptPack?.domain || !promptPack.stamp) {
    return null;
  }
  const terminalEvent = findTerminalEvent(params.execEvents);
  if (!terminalEvent) {
    return null;
  }
  try {
    const frames = framesFromToolMetrics(runMetrics.perTool, terminalEvent);
    const reward = deriveExperienceReward(terminalEvent);
    const trajectory = summarizeTrajectory({
      runId: params.manifest.run_id,
      taskId: params.manifest.task_id,
      epoch: params.tfgrpoContext.epoch,
      groupId: params.tfgrpoContext.groupId,
      domain: promptPack.domain,
      stampSignature: promptPack.stamp,
      frames,
      baseSummary: params.manifest.summary ?? undefined,
      reward
    });
    const optimized = optimizeExperience(trajectory, params.policy);
    const manifestPath = relativeToRepo(params.env, params.paths.manifestPath);
    const written = await params.store.recordBatch([optimized], manifestPath);
    if (written.length > 0) {
      const existing = params.manifest.tfgrpo?.experiences ?? {
        ids: [],
        written: 0,
        manifest_path: manifestPath
      };
      const summary = {
        ids: [...existing.ids, ...written.map((record) => record.id)],
        written: existing.written + written.length,
        manifest_path: manifestPath
      };
      params.manifest.tfgrpo = {
        ...(params.manifest.tfgrpo ?? {
          epoch: params.tfgrpoContext.epoch,
          group_id: params.tfgrpoContext.groupId,
          group_size: params.tfgrpoContext.groupSize
        }),
        experiences: summary
      };
    }
    return written;
  } catch (error) {
    logger.warn(`Failed to persist TF-GRPO experience: ${String(error)}`);
    return null;
  }
}

function parsePositiveInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function deriveDurationFromEvents(record: ToolRunRecord | null): number {
  const events = record?.events;
  if (!Array.isArray(events) || events.length === 0) {
    return 0;
  }
  const first = events.find((event) => event.type === 'exec:begin');
  const last = [...events].reverse().find((event) => event.type === 'exec:end');
  if (!first || !last) {
    return 0;
  }
  const startedAt = Date.parse(first.timestamp);
  const completedAt = Date.parse(last.timestamp);
  if (Number.isNaN(startedAt) || Number.isNaN(completedAt) || completedAt < startedAt) {
    return 0;
  }
  return completedAt - startedAt;
}

function estimateTokenCount(output: string): number {
  const trimmed = output.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/u).filter(Boolean).length;
}

function roundCurrency(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function findTerminalEvent(events: ExecEvent[]): ExecEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const candidate = events[index];
    if (candidate?.type === 'exec:end') {
      return candidate;
    }
  }
  return events.length > 0 ? events[events.length - 1]! : null;
}

function deriveExperienceReward(event: ExecEvent): { gtScore: number; relativeRank: number } {
  if (event.type !== 'exec:end') {
    return { gtScore: 0, relativeRank: 0 };
  }
  const succeeded = event.payload.status === 'succeeded' && event.payload.exitCode === 0;
  return {
    gtScore: succeeded ? 1 : 0,
    relativeRank: 0
  };
}
