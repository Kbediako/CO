import type { PlannerAgent, PlanItem, PlanResult, TaskContext } from '../../types.js';
import type { PipelineDefinition, PipelineStage } from '../types.js';
import { PLANNER_EXECUTION_MODE_PARSER, resolveRequiresCloudPolicy } from '../../utils/executionMode.js';

export interface CommandPlannerOptions {
  targetStageId?: string | null;
}

export class CommandPlanner implements PlannerAgent {
  private cachedPlan: PlanResult | null = null;

  constructor(
    private readonly pipeline: PipelineDefinition,
    private readonly options: CommandPlannerOptions = {}
  ) {}

  async plan(task: TaskContext): Promise<PlanResult> {
    void task;
    if (!this.cachedPlan) {
      const items = this.pipeline.stages.map((stage, index) => this.buildPlanItem(stage, index));
      const targetId = this.resolveTargetId(items);
      const normalizedItems = items.map((item) => ({
        ...item,
        selected: item.id === targetId
      }));
      this.cachedPlan = {
        items: normalizedItems,
        notes: this.pipeline.description,
        targetId: targetId ?? null
      };
    }
    return clonePlanResult(this.cachedPlan);
  }

  private buildPlanItem(stage: PipelineStage, index: number): PlanItem {
    const stagePlanHints = extractStagePlanHints(stage);
    const requiresCloud = resolveStageRequiresCloud(stage, stagePlanHints);
    const runnable = resolveStageRunnable(stagePlanHints);
    const metadata: Record<string, unknown> = {
      pipelineId: this.pipeline.id,
      stageId: stage.id,
      stageKind: stage.kind,
      index
    };
    if (stagePlanHints.aliases.length > 0) {
      metadata.aliases = stagePlanHints.aliases;
    }
    if (stagePlanHints.defaultTarget) {
      metadata.defaultTarget = true;
    }
    if (stagePlanHints.executionMode) {
      metadata.executionMode = stagePlanHints.executionMode;
    }
    if (stagePlanHints.cloudEnvId) {
      metadata.cloudEnvId = stagePlanHints.cloudEnvId;
    }
    metadata.requiresCloud = requiresCloud;

    return {
      id: `${this.pipeline.id}:${stage.id}`,
      description: stage.title,
      requires_cloud: requiresCloud,
      requiresCloud,
      runnable,
      metadata
    };
  }

  private resolveTargetId(items: PlanItem[]): string | null {
    const explicit = this.normalizeTargetId(this.options.targetStageId ?? null, items);
    if (explicit) {
      return explicit;
    }
    const flagged = items.find((item) => item.metadata?.defaultTarget === true);
    if (flagged) {
      return flagged.id;
    }
    const runnableItems = items.filter((item) => item.runnable !== false);
    if (runnableItems.length > 0) {
      return runnableItems[0]!.id;
    }
    return items[0]?.id ?? null;
  }

  private normalizeTargetId(candidate: string | null, items: PlanItem[]): string | null {
    if (!candidate) {
      return null;
    }
    const exact = items.find((item) => item.id === candidate);
    if (exact) {
      return exact.id;
    }
    const normalized = candidate.includes(':') ? candidate.split(':').pop() ?? candidate : candidate;
    const lowerNormalized = normalized.toLowerCase();
    for (const item of items) {
      const stageId = (item.metadata?.stageId as string | undefined)?.toLowerCase();
      if (stageId && stageId === lowerNormalized) {
        return item.id;
      }
      const aliases = Array.isArray(item.metadata?.aliases)
        ? (item.metadata?.aliases as string[])
        : [];
      if (aliases.some((alias) => alias.toLowerCase() === lowerNormalized)) {
        return item.id;
      }
    }
    return null;
  }
}

interface StagePlanHints {
  runnable?: boolean;
  defaultTarget?: boolean;
  aliases: string[];
  requiresCloud?: boolean;
  executionMode?: string | null;
  cloudEnvId?: string | null;
}

function extractStagePlanHints(stage: PipelineStage): StagePlanHints {
  const stageRecord = stage as unknown as Record<string, unknown>;
  const planConfig = (stageRecord.plan as (Partial<StagePlanHints> & Record<string, unknown>) | undefined) ?? {};
  const aliases = Array.isArray(planConfig.aliases)
    ? planConfig.aliases.map((alias) => String(alias))
    : [];
  const defaultTarget = Boolean(planConfig.defaultTarget ?? planConfig.default ?? planConfig.primary);
  const requiresCloud = typeof planConfig.requiresCloud === 'boolean'
    ? planConfig.requiresCloud
    : typeof planConfig.requires_cloud === 'boolean'
      ? planConfig.requires_cloud
      : undefined;
  const rawExecutionMode = typeof planConfig.executionMode === 'string'
    ? planConfig.executionMode
    : typeof stageRecord.executionMode === 'string'
      ? (stageRecord.executionMode as string)
      : typeof stageRecord.execution_mode === 'string'
        ? (stageRecord.execution_mode as string)
        : typeof stageRecord.mode === 'string'
          ? (stageRecord.mode as string)
          : undefined;
  const executionMode = typeof rawExecutionMode === 'string'
    ? rawExecutionMode.trim().toLowerCase() || null
    : null;
  const rawCloudEnvId = typeof planConfig.cloudEnvId === 'string'
    ? planConfig.cloudEnvId
    : typeof planConfig.cloud_env_id === 'string'
      ? planConfig.cloud_env_id
      : typeof stageRecord.cloudEnvId === 'string'
        ? (stageRecord.cloudEnvId as string)
        : typeof stageRecord.cloud_env_id === 'string'
          ? (stageRecord.cloud_env_id as string)
          : undefined;
  const cloudEnvId = typeof rawCloudEnvId === 'string'
    ? rawCloudEnvId.trim() || null
    : null;

  return {
    runnable: planConfig.runnable,
    defaultTarget,
    aliases,
    requiresCloud,
    executionMode,
    cloudEnvId
  };
}

function resolveStageRequiresCloud(stage: PipelineStage, hints: StagePlanHints): boolean {
  const stageRecord = stage as unknown as Record<string, unknown>;
  const requiresCloud = resolveRequiresCloudPolicy({
    boolFlags: [
      hints.requiresCloud,
      typeof stageRecord.requires_cloud === 'boolean'
        ? (stageRecord.requires_cloud as boolean)
        : undefined,
      typeof stageRecord.requiresCloud === 'boolean'
        ? (stageRecord.requiresCloud as boolean)
        : undefined
    ],
    metadata: {
      executionMode: hints.executionMode ?? null,
      mode: null
    },
    metadataOrder: ['executionMode'],
    parseMode: PLANNER_EXECUTION_MODE_PARSER
  });
  return requiresCloud ?? false;
}

function resolveStageRunnable(hints: StagePlanHints): boolean {
  if (typeof hints.runnable === 'boolean') {
    return hints.runnable;
  }
  return true;
}

function clonePlanResult(plan: PlanResult): PlanResult {
  return {
    items: plan.items.map((item) => ({
      ...item,
      metadata: item.metadata ? { ...item.metadata } : undefined
    })),
    notes: plan.notes,
    targetId: plan.targetId ?? null
  };
}
