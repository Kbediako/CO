import type { PlanResult } from '../../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import { prepareRun, type RunPreparationResult } from './runPreparation.js';
import type { PipelineDefinition, PlanOptions, PlanPreviewResult } from '../types.js';

export interface RunOrchestratorPlanShellParams {
  baseEnv: EnvironmentPaths;
  options: PlanOptions;
  prepareRunImpl?: typeof prepareRun;
}

type PreviewPreparation = Pick<RunPreparationResult, 'pipeline' | 'pipelineSource'>;

export function buildOrchestratorPlanPreview(
  preparation: PreviewPreparation,
  plan: PlanResult
): PlanPreviewResult {
  const stages = preparation.pipeline.stages.map((stage: PipelineDefinition['stages'][number], index: number) => {
    if (stage.kind === 'command') {
      return {
        index: index + 1,
        id: stage.id,
        title: stage.title,
        kind: stage.kind,
        command: stage.command,
        cwd: stage.cwd ?? null,
        env: stage.env ?? null,
        allowFailure: Boolean(stage.allowFailure),
        summaryHint: stage.summaryHint ?? null
      } as const;
    }
    return {
      index: index + 1,
      id: stage.id,
      title: stage.title,
      kind: stage.kind,
      pipeline: stage.pipeline,
      optional: Boolean(stage.optional)
    } as const;
  });

  const pipelineSource: PlanPreviewResult['pipeline']['source'] =
    preparation.pipelineSource === 'user'
      ? 'user'
      : preparation.pipelineSource === 'default'
        ? 'default'
        : null;

  return {
    pipeline: {
      id: preparation.pipeline.id,
      title: preparation.pipeline.title,
      description: preparation.pipeline.description ?? null,
      source: pipelineSource
    },
    stages,
    plan,
    targetId: plan.targetId ?? null
  };
}

export async function runOrchestratorPlanShell(
  params: RunOrchestratorPlanShellParams
): Promise<PlanPreviewResult> {
  const prepareRunImpl = params.prepareRunImpl ?? prepareRun;
  const preparation = await prepareRunImpl({
    baseEnv: params.baseEnv,
    taskIdOverride: params.options.taskId,
    pipelineId: params.options.pipelineId,
    targetStageId: params.options.targetStageId,
    planTargetFallback: null
  });
  const plan = preparation.planPreview ?? (await preparation.planner.plan(preparation.taskContext));
  return buildOrchestratorPlanPreview(preparation, plan);
}
