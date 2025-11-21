import process from 'node:process';

import { CommandPlanner } from '../adapters/index.js';
import { PipelineResolver } from './pipelineResolver.js';
import { sanitizeTaskId } from '../run/environment.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { loadTaskMetadata } from '../tasks/taskMetadata.js';
import type { TaskContext, PlanResult } from '../../types.js';
import type { PipelineDefinition } from '../types.js';
import { resolvePipeline } from '../pipelines/index.js';
import type { UserConfig } from '../config/userConfig.js';
import { findPipeline } from '../config/userConfig.js';
import type { CliManifest } from '../types.js';

export interface RunPreparationResult {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  pipelineSource: string | null;
  planner: CommandPlanner;
  plannerTargetId: string | null;
  taskContext: TaskContext;
  metadata: { id: string; slug: string; title: string };
  resolver: PipelineResolver;
  planPreview: PlanResult;
}

export interface PrepareRunOptions {
  baseEnv: EnvironmentPaths;
  taskIdOverride?: string;
  pipelineId?: string;
  targetStageId?: string | null;
  planTargetFallback?: string | null;
  resolver?: PipelineResolver;
  pipeline?: PipelineDefinition;
  pipelineSource?: string | null;
  planner?: CommandPlanner;
}

export function overrideTaskEnvironment(baseEnv: EnvironmentPaths, taskId?: string): EnvironmentPaths {
  if (!taskId) {
    return { ...baseEnv };
  }
  const sanitized = sanitizeTaskId(taskId);
  return { ...baseEnv, taskId: sanitized };
}

export function resolveTargetStageId(
  explicit: string | null | undefined,
  fallback: string | null,
  envTarget: string | undefined = process.env.CODEX_ORCHESTRATOR_TARGET_STAGE
): string | null {
  const normalizedExplicit = explicit?.trim();
  if (normalizedExplicit) {
    return normalizedExplicit;
  }
  const normalizedFallback = fallback?.trim();
  if (normalizedFallback) {
    return normalizedFallback;
  }
  if (typeof envTarget === 'string' && envTarget.trim().length > 0) {
    return envTarget.trim();
  }
  return null;
}

export async function prepareRun(options: PrepareRunOptions): Promise<RunPreparationResult> {
  const env = overrideTaskEnvironment(options.baseEnv, options.taskIdOverride);
  const resolver = options.resolver ?? new PipelineResolver();
  const resolvedPipeline = options.pipeline
    ? { pipeline: options.pipeline, source: options.pipelineSource ?? null }
    : await resolver.resolve(env, { pipelineId: options.pipelineId });

  const metadata = await loadTaskMetadata(env);
  const taskContext = createTaskContext(metadata);
  const targetId = resolveTargetStageId(options.targetStageId, options.planTargetFallback ?? null);
  const planner = options.planner ?? new CommandPlanner(resolvedPipeline.pipeline, { targetStageId: targetId });
  const planPreview = await planner.plan(taskContext);

  return {
    env,
    pipeline: resolvedPipeline.pipeline,
    pipelineSource: resolvedPipeline.source ?? null,
    planner,
    plannerTargetId: planPreview?.targetId ?? targetId,
    taskContext,
    metadata,
    resolver,
    planPreview
  };
}

export function resolvePipelineForResume(
  env: EnvironmentPaths,
  manifest: CliManifest,
  config: UserConfig | null
): PipelineDefinition {
  const existing = findPipeline(config ?? null, manifest.pipeline_id);
  if (existing) {
    return existing;
  }
  const { pipeline } = resolvePipeline(env, { pipelineId: manifest.pipeline_id, config });
  return pipeline;
}

export function createTaskContext(metadata: { id: string; slug: string; title: string }): TaskContext {
  return {
    id: metadata.id,
    title: metadata.title,
    description: undefined,
    metadata: {
      slug: metadata.slug
    }
  };
}
