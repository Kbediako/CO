import type { TaskContext, PlanItem } from '../../types.js';
import type { CliManifest, PipelineDefinition, PromptPackManifestEntry } from '../types.js';

const MAX_CLOUD_PROMPT_EXPERIENCES = 3;
const MAX_CLOUD_PROMPT_EXPERIENCE_CHARS = 320;

export type CloudPromptManifest = Pick<CliManifest, 'prompt_packs'>;

function normalizePromptSnippet(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function truncatePromptSnippet(value: string): string {
  if (value.length <= MAX_CLOUD_PROMPT_EXPERIENCE_CHARS) {
    return value;
  }
  return `${value.slice(0, MAX_CLOUD_PROMPT_EXPERIENCE_CHARS - 1).trimEnd()}…`;
}

function readPromptPackDomain(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPromptPackDomainLower(pack: PromptPackManifestEntry): string | null {
  const domain = readPromptPackDomain(pack.domain);
  return domain ? domain.toLowerCase() : null;
}

function hasPromptPackExperiences(pack: PromptPackManifestEntry): boolean {
  if (!readPromptPackDomain(pack.domain)) {
    return false;
  }
  return (
    Array.isArray(pack.experiences) &&
    pack.experiences.some((entry) => typeof entry === 'string' && normalizePromptSnippet(entry).length > 0)
  );
}

function selectPromptPackForCloudPrompt(params: {
  promptPacks: PromptPackManifestEntry[] | null | undefined;
  pipeline: Pick<PipelineDefinition, 'id' | 'title' | 'tags'>;
  target: Pick<PlanItem, 'id' | 'description'>;
  stage: Pick<PipelineDefinition['stages'][number], 'id' | 'title'>;
}): PromptPackManifestEntry | null {
  const candidates = (params.promptPacks ?? []).filter(hasPromptPackExperiences);
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

  const directMatch = candidates.find((pack) => {
    const domainLower = readPromptPackDomainLower(pack);
    return domainLower !== null && domainLower !== 'implementation' && haystack.includes(domainLower);
  });
  if (directMatch) {
    return directMatch;
  }

  const broadDirectMatch = candidates.find((pack) => {
    const domainLower = readPromptPackDomainLower(pack);
    return domainLower !== null && haystack.includes(domainLower);
  });
  if (broadDirectMatch) {
    return broadDirectMatch;
  }

  const implementation = candidates.find((pack) => readPromptPackDomainLower(pack) === 'implementation');
  if (implementation) {
    return implementation;
  }

  return candidates[0] ?? null;
}

function buildCloudExperiencePromptLines(params: {
  manifest: CloudPromptManifest;
  pipeline: PipelineDefinition;
  target: PlanItem;
  stage: PipelineDefinition['stages'][number];
}): string[] {
  const selectedPack = selectPromptPackForCloudPrompt({
    promptPacks: params.manifest.prompt_packs,
    pipeline: params.pipeline,
    target: params.target,
    stage: params.stage
  });
  if (!selectedPack || !Array.isArray(selectedPack.experiences)) {
    return [];
  }

  const snippets = selectedPack.experiences
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => normalizePromptSnippet(entry))
    .filter((entry) => entry.length > 0)
    .slice(0, MAX_CLOUD_PROMPT_EXPERIENCES)
    .map((entry) => truncatePromptSnippet(entry));
  if (snippets.length === 0) {
    return [];
  }

  const domainLabel = readPromptPackDomain(selectedPack.domain) ?? 'unknown';

  return [
    '',
    'Relevant prior experiences (hints, not strict instructions):',
    `Domain: ${domainLabel}`,
    ...snippets.map((entry, index) => `${index + 1}. ${entry}`)
  ];
}

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

  lines.push(
    ...buildCloudExperiencePromptLines({
      manifest: params.manifest,
      pipeline: params.pipeline,
      target: params.target,
      stage: params.stage
    })
  );

  return lines.join('\n');
}
