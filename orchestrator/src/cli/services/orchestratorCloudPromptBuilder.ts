import type { TaskContext, PlanItem } from '../../types.js';
import type { CliManifest, PipelineDefinition } from '../types.js';
import { buildRunMemoryPromptLines, selectRunMemoryForRole } from '../run/runMemoryController.js';
import {
  readPromptPackIdFromTaskMemoryRefId,
  readSelectedMemoryRefs,
  TASK_MEMORY_SOURCE0_REF_ID
} from './plannerMemory.js';

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

  const selectedMemoryRefs = readSelectedMemoryRefs(params.target);
  const includeSource0 =
    selectedMemoryRefs.length === 0 || selectedMemoryRefs.includes(TASK_MEMORY_SOURCE0_REF_ID);
  const preferredPromptPackIds = selectedMemoryRefs
    .map((refId) => readPromptPackIdFromTaskMemoryRefId(refId))
    .filter((packId): packId is string => packId !== null);
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
      ],
      include_source_0: includeSource0,
      preferred_prompt_pack_ids: preferredPromptPackIds
    })
  );
  if (runMemoryPromptLines.length > 0) {
    lines.push('', ...runMemoryPromptLines);
  }

  return lines.join('\n');
}
