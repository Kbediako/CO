import type { TaskContext, PlanItem } from '../../types.js';
import type { CliManifest, PipelineDefinition } from '../types.js';
import { buildRunMemoryPromptLines, selectRunMemoryForRole } from '../run/runMemoryController.js';

export type CloudPromptManifest = Pick<CliManifest, 'prompt_packs' | 'memory'>;

export function buildCloudPrompt(params: {
  task: TaskContext;
  target: PlanItem;
  pipeline: PipelineDefinition;
  stage: PipelineDefinition['stages'][number];
  manifest: CloudPromptManifest;
}): string {
  const lines = [
    `Task ID: ${params.task.id}`,
    `Task title: ${params.task.title}`,
    params.task.description ? `Task description: ${params.task.description}` : null,
    `Pipeline: ${params.pipeline.id}`,
    `Target stage: ${params.stage.id} (${params.target.description})`,
    '',
    'Apply the required repository changes for this target stage and produce a diff.'
  ].filter((line): line is string => Boolean(line));

  const runMemoryPromptLines = buildRunMemoryPromptLines(
    selectRunMemoryForRole({
      role: 'executor',
      manifest: params.manifest,
      hints: [
        params.pipeline.id,
        params.pipeline.title,
        ...(params.pipeline.tags ?? []),
        params.target.id,
        params.target.description ?? '',
        params.stage.id,
        params.stage.title
      ]
    })
  );
  if (runMemoryPromptLines.length > 0) {
    lines.push('', ...runMemoryPromptLines);
  }

  return lines.join('\n');
}
