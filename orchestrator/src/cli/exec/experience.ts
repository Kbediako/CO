import type { ExecEvent } from '../../../../packages/shared/events/types.js';
import type { ExperienceInput, ExperienceRecord, ExperienceToolStat } from '../../persistence/ExperienceStore.js';
import type { ToolMetricSummary } from '../../../../packages/shared/events/types.js';

export interface TrajectoryFrame {
  event: ExecEvent;
  tool: string;
  tokens: number;
  costUsd: number;
  latencyMs: number;
}

export interface TrajectorySummaryRequest {
  runId: string;
  taskId: string;
  epoch: number | null;
  groupId: string | null;
  domain: string;
  stampSignature: string;
  frames: TrajectoryFrame[];
  baseSummary?: string;
  reward?: {
    gtScore: number;
    relativeRank: number;
  };
}

export interface TfgrpoPolicyConfig {
  maxSummaryWords: number;
  rewardFloor?: number;
}

const DEFAULT_POLICY: TfgrpoPolicyConfig = {
  maxSummaryWords: 32,
  rewardFloor: 0
};

export function summarizeTrajectory(request: TrajectorySummaryRequest): ExperienceInput {
  const reward = request.reward ?? { gtScore: 0, relativeRank: 0 };
  const summary = buildTrajectorySummary(request.frames, request.baseSummary);
  const toolStats = request.frames.map(toToolStat);
  return {
    runId: request.runId,
    taskId: request.taskId,
    epoch: request.epoch,
    groupId: request.groupId,
    summary,
    reward,
    toolStats,
    stampSignature: request.stampSignature,
    domain: request.domain
  };
}

export function optimizeExperience(
  input: ExperienceInput,
  policy: TfgrpoPolicyConfig = DEFAULT_POLICY
): ExperienceInput {
  const limit = Math.max(1, policy.maxSummaryWords);
  return {
    ...input,
    summary: truncateSummary(input.summary, limit),
    reward: {
      gtScore: Math.max(input.reward.gtScore, policy.rewardFloor ?? 0),
      relativeRank: input.reward.relativeRank
    }
  };
}

export function framesFromToolMetrics(
  metrics: ToolMetricSummary[],
  representativeEvent: ExecEvent
): TrajectoryFrame[] {
  return metrics.map((metric) => ({
    event: representativeEvent,
    tool: metric.tool,
    tokens: metric.tokens,
    costUsd: metric.costUsd,
    latencyMs: metric.latencyMs
  }));
}

export function formatExperienceInjections(experiences: ExperienceRecord[], slots: number): string[] {
  if (slots <= 0) {
    return [];
  }
  return experiences.slice(0, slots).map((experience) => {
    const rewardScore = (experience.reward.gtScore + experience.reward.relativeRank).toFixed(2);
    const statText = experience.toolStats
      .map((stat) => `${stat.tool}: ${stat.tokens}t/${stat.costUsd.toFixed(3)}usd/${Math.round(stat.latencyMs)}ms`)
      .join('; ');
    return `[exp ${experience.id} | epoch ${experience.epoch ?? 'n/a'} | reward ${rewardScore}] ${experience.summary32} (stats: ${statText})`;
  });
}

function buildTrajectorySummary(frames: TrajectoryFrame[], fallback?: string): string {
  const terminal = frames[frames.length - 1];
  if (terminal?.event.type === 'exec:end') {
    const stdout = terminal.event.payload.stdout?.trim();
    if (stdout && !isLowSignalOutput(stdout)) {
      return stdout.split('\n').slice(0, 2).join(' ');
    }
  }
  if (fallback && fallback.trim()) {
    return fallback.trim();
  }
  return 'TF-GRPO trajectory summary unavailable.';
}

function toToolStat(frame: TrajectoryFrame): ExperienceToolStat {
  return {
    tool: frame.tool,
    tokens: frame.tokens,
    costUsd: frame.costUsd,
    latencyMs: frame.latencyMs
  };
}

function truncateSummary(value: string, maxWords: number): string {
  const tokens = value.trim().split(/\s+/u).filter(Boolean);
  if (tokens.length <= maxWords) {
    return tokens.join(' ');
  }
  return tokens.slice(0, maxWords).join(' ');
}

function isLowSignalOutput(stdout: string): boolean {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return true;
  }
  const firstLine = trimmed.split('\n')[0] ?? '';
  if (/^\{"type":/u.test(firstLine)) {
    return true;
  }
  const words = firstLine.split(/\s+/u).filter(Boolean);
  return words.length < 3;
}
