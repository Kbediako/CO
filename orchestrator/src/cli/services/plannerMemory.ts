import type { PromptPack } from '../../../../packages/orchestrator/src/instructions/promptPacks.js';
import type { PipelineDefinition } from '../types.js';
import type { PlanItem, TaskContext, TaskMemoryContext, TaskMemoryRef } from '../../types.js';

export const TASK_MEMORY_SOURCE0_REF_ID = 'source_0';
const TASK_MEMORY_PROMPT_PACK_REF_PREFIX = 'prompt_pack:';

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPromptPackRefDomain(ref: TaskMemoryRef): string | null {
  return normalizeNonEmptyString(ref.domain)?.toLowerCase() ?? null;
}

function readSelectedMemoryRefArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function createPromptPackTaskMemoryRefId(packId: string): string {
  return `${TASK_MEMORY_PROMPT_PACK_REF_PREFIX}${packId}`;
}

export function readPromptPackIdFromTaskMemoryRefId(refId: string): string | null {
  if (!refId.startsWith(TASK_MEMORY_PROMPT_PACK_REF_PREFIX)) {
    return null;
  }
  const packId = refId.slice(TASK_MEMORY_PROMPT_PACK_REF_PREFIX.length).trim();
  return packId.length > 0 ? packId : null;
}

export function buildTaskMemoryContext(promptPacks: Array<Pick<PromptPack, 'id' | 'domain' | 'experienceSlots'>>): TaskMemoryContext {
  const refs: TaskMemoryRef[] = [
    {
      id: TASK_MEMORY_SOURCE0_REF_ID,
      kind: 'source_0',
      label: 'Shared source 0 anchor'
    }
  ];

  for (const pack of promptPacks) {
    const packId = normalizeNonEmptyString(pack.id);
    const domain = normalizeNonEmptyString(pack.domain);
    if (!packId || !domain || !Number.isInteger(pack.experienceSlots) || pack.experienceSlots <= 0) {
      continue;
    }
    refs.push({
      id: createPromptPackTaskMemoryRefId(packId),
      kind: 'prompt_pack',
      label: `Prompt pack ${packId}`,
      domain,
      packId,
      experienceSlots: pack.experienceSlots
    });
  }

  return { refs };
}

export function readSelectedMemoryRefs(target: Pick<PlanItem, 'metadata'>): string[] {
  const metadata = target.metadata ?? {};
  return [
    ...readSelectedMemoryRefArray((metadata as Record<string, unknown>).selectedMemoryRefs),
    ...readSelectedMemoryRefArray((metadata as Record<string, unknown>).selected_memory_refs)
  ].filter((value, index, entries) => entries.indexOf(value) === index);
}

function selectPromptPackTaskMemoryRef(params: {
  refs: TaskMemoryRef[];
  pipeline: Pick<PipelineDefinition, 'id' | 'title' | 'tags'>;
  target: Pick<PlanItem, 'id' | 'description'>;
  stage: Pick<PipelineDefinition['stages'][number], 'id' | 'title'>;
}): TaskMemoryRef | null {
  const candidates = params.refs.filter((ref) => ref.kind === 'prompt_pack' && readPromptPackRefDomain(ref) !== null);
  if (candidates.length === 0) {
    return null;
  }

  const haystack = [
    params.pipeline.id,
    params.pipeline.title,
    (params.pipeline.tags ?? []).join(' '),
    params.target.id,
    params.target.description ?? '',
    params.stage.id,
    params.stage.title
  ]
    .join(' ')
    .toLowerCase();

  const directMatch = candidates.find((ref) => {
    const domain = readPromptPackRefDomain(ref);
    return domain !== null && domain !== 'implementation' && haystack.includes(domain);
  });
  if (directMatch) {
    return directMatch;
  }

  const broadDirectMatch = candidates.find((ref) => {
    const domain = readPromptPackRefDomain(ref);
    return domain !== null && haystack.includes(domain);
  });
  if (broadDirectMatch) {
    return broadDirectMatch;
  }

  const implementation = candidates.find((ref) => readPromptPackRefDomain(ref) === 'implementation');
  if (implementation) {
    return implementation;
  }

  return candidates[0] ?? null;
}

export function selectTaskMemoryRefs(params: {
  task: TaskContext;
  pipeline: Pick<PipelineDefinition, 'id' | 'title' | 'tags'>;
  target: Pick<PlanItem, 'id' | 'description'>;
  stage: Pick<PipelineDefinition['stages'][number], 'id' | 'title'>;
}): string[] {
  const refs = params.task.memory?.refs ?? [];
  if (refs.length === 0) {
    return [];
  }

  const selected: string[] = [];
  if (refs.some((ref) => ref.id === TASK_MEMORY_SOURCE0_REF_ID)) {
    selected.push(TASK_MEMORY_SOURCE0_REF_ID);
  }

  const promptPackRef = selectPromptPackTaskMemoryRef({
    refs,
    pipeline: params.pipeline,
    target: params.target,
    stage: params.stage
  });
  if (promptPackRef && !selected.includes(promptPackRef.id)) {
    selected.push(promptPackRef.id);
  }

  return selected;
}
