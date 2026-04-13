import {
  buildRunSource0PromptLines,
  readRunSource0Descriptor,
  type RunSource0Descriptor
} from './source0.js';

const DEFAULT_MAX_PROMPT_PACK_EXPERIENCE_CHARS = 320;

export type RunMemoryRole = 'planner' | 'reviewer' | 'executor' | 'delegate';
export type RunMemoryPromptPackSelectionReason =
  | 'explicit'
  | 'hint'
  | 'fallback'
  | 'first_available';

export interface RunMemoryRoleProfile {
  role: RunMemoryRole;
  include_source_0: boolean;
  include_prompt_pack_experiences: boolean;
  max_prompt_pack_experiences: number;
  max_prompt_pack_experience_chars: number;
  fallback_domains: string[];
}

export interface RunMemorySource0Ref {
  kind: 'source_0';
  descriptor: RunSource0Descriptor;
}

export interface RunMemoryPromptPackRefPack {
  id: string;
  domain: string;
  stamp: string;
  sources: string[];
}

export interface RunMemoryPromptPackExperienceRef {
  kind: 'prompt_pack_experience';
  pack: RunMemoryPromptPackRefPack;
  experience_index: number;
  experience: string;
  selection_reason: RunMemoryPromptPackSelectionReason;
}

export type RunMemoryRef = RunMemorySource0Ref | RunMemoryPromptPackExperienceRef;

export interface RunMemorySelection {
  role: RunMemoryRole;
  profile: RunMemoryRoleProfile;
  refs: RunMemoryRef[];
}

const RUN_MEMORY_ROLE_PROFILES: Record<RunMemoryRole, RunMemoryRoleProfile> = {
  planner: {
    role: 'planner',
    include_source_0: true,
    include_prompt_pack_experiences: true,
    max_prompt_pack_experiences: 3,
    max_prompt_pack_experience_chars: DEFAULT_MAX_PROMPT_PACK_EXPERIENCE_CHARS,
    fallback_domains: ['planning', 'planner', 'implementation']
  },
  reviewer: {
    role: 'reviewer',
    include_source_0: true,
    include_prompt_pack_experiences: false,
    max_prompt_pack_experiences: 0,
    max_prompt_pack_experience_chars: DEFAULT_MAX_PROMPT_PACK_EXPERIENCE_CHARS,
    fallback_domains: []
  },
  executor: {
    role: 'executor',
    include_source_0: true,
    include_prompt_pack_experiences: true,
    max_prompt_pack_experiences: 3,
    max_prompt_pack_experience_chars: DEFAULT_MAX_PROMPT_PACK_EXPERIENCE_CHARS,
    fallback_domains: ['implementation']
  },
  delegate: {
    role: 'delegate',
    include_source_0: true,
    include_prompt_pack_experiences: false,
    max_prompt_pack_experiences: 0,
    max_prompt_pack_experience_chars: DEFAULT_MAX_PROMPT_PACK_EXPERIENCE_CHARS,
    fallback_domains: []
  }
};

interface PromptPackCandidate {
  packRef: RunMemoryPromptPackRefPack;
  experiences: Array<{ index: number; value: string }>;
  domain_lower: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPromptPackDomain(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePromptSnippet(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function truncatePromptSnippet(value: string, maxChars: number): string {
  if (!Number.isFinite(maxChars) || maxChars <= 0 || value.length <= maxChars) {
    return value;
  }
  const safeMaxChars = Math.max(1, Math.trunc(maxChars));
  if (safeMaxChars <= 3) {
    return value.slice(0, safeMaxChars);
  }
  return `${value.slice(0, safeMaxChars - 3).trimEnd()}...`;
}

function readPromptPackSources(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readPromptPackCandidates(manifest: unknown): PromptPackCandidate[] {
  if (!isRecord(manifest) || !Array.isArray(manifest.prompt_packs)) {
    return [];
  }

  return manifest.prompt_packs.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const domain = readPromptPackDomain(entry.domain);
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    const stamp = typeof entry.stamp === 'string' ? entry.stamp.trim() : '';
    const experiences = Array.isArray(entry.experiences)
      ? entry.experiences
          .map((item, index) => ({
            index,
            value: typeof item === 'string' ? normalizePromptSnippet(item) : ''
          }))
          .filter((item) => item.value.length > 0)
      : [];
    if (!domain || !id || !stamp || experiences.length === 0) {
      return [];
    }
    return [
      {
        packRef: {
          id,
          domain,
          stamp,
          sources: readPromptPackSources(entry.sources)
        },
        experiences,
        domain_lower: domain.toLowerCase()
      }
    ];
  });
}

function buildHintHaystack(hints: string[] | null | undefined): string {
  return (hints ?? [])
    .map((hint) => normalizePromptSnippet(hint))
    .filter((hint) => hint.length > 0)
    .join(' ')
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function hasHintDomain(haystack: string, domain: string): boolean {
  return new RegExp(`(^|\\W)${escapeRegExp(domain)}($|\\W)`, 'u').test(haystack);
}

function selectPromptPackCandidate(params: {
  candidates: PromptPackCandidate[];
  hints: string[];
  profile: RunMemoryRoleProfile;
  preferred_prompt_pack_ids?: string[];
}): { candidate: PromptPackCandidate; reason: RunMemoryPromptPackSelectionReason } | null {
  if (!params.profile.include_prompt_pack_experiences || params.candidates.length === 0) {
    return null;
  }

  for (const packId of params.preferred_prompt_pack_ids ?? []) {
    const normalizedPackId = packId.trim();
    if (normalizedPackId.length === 0) {
      continue;
    }
    const explicitMatch = params.candidates.find(
      (candidate) => candidate.packRef.id === normalizedPackId
    );
    if (explicitMatch) {
      return { candidate: explicitMatch, reason: 'explicit' };
    }
  }

  const haystack = buildHintHaystack(params.hints);
  if (haystack.length > 0) {
    const directMatch = params.candidates.find(
      (candidate) =>
        candidate.domain_lower !== 'implementation' &&
        hasHintDomain(haystack, candidate.domain_lower)
    );
    if (directMatch) {
      return { candidate: directMatch, reason: 'hint' };
    }

    const broadMatch = params.candidates.find((candidate) =>
      hasHintDomain(haystack, candidate.domain_lower)
    );
    if (broadMatch) {
      return { candidate: broadMatch, reason: 'hint' };
    }
  }

  for (const domain of params.profile.fallback_domains) {
    const fallback = params.candidates.find((candidate) => candidate.domain_lower === domain);
    if (fallback) {
      return { candidate: fallback, reason: 'fallback' };
    }
  }

  return params.candidates[0] ? { candidate: params.candidates[0], reason: 'first_available' } : null;
}

export function getRunMemoryRoleProfile(role: RunMemoryRole): RunMemoryRoleProfile {
  const profile = RUN_MEMORY_ROLE_PROFILES[role];
  return {
    ...profile,
    fallback_domains: [...profile.fallback_domains]
  };
}

export function selectRunMemoryForRole(params: {
  role: RunMemoryRole;
  manifest: unknown;
  hints?: string[];
  include_source_0?: boolean;
  preferred_prompt_pack_ids?: string[];
}): RunMemorySelection {
  const profile = getRunMemoryRoleProfile(params.role);
  const refs: RunMemoryRef[] = [];

  if (profile.include_source_0 && params.include_source_0 !== false) {
    const descriptor = readRunSource0Descriptor(params.manifest);
    if (descriptor) {
      refs.push({ kind: 'source_0', descriptor });
    }
  }

  const selectedPromptPack = selectPromptPackCandidate({
    candidates: readPromptPackCandidates(params.manifest),
    hints: params.hints ?? [],
    profile,
    preferred_prompt_pack_ids: params.preferred_prompt_pack_ids
  });
  if (selectedPromptPack) {
    const experienceLimit = Math.max(0, profile.max_prompt_pack_experiences);
    refs.push(
      ...selectedPromptPack.candidate.experiences
        .slice(0, experienceLimit)
        .map((experience) => ({
          kind: 'prompt_pack_experience' as const,
          pack: selectedPromptPack.candidate.packRef,
          experience_index: experience.index,
          experience: truncatePromptSnippet(
            experience.value,
            profile.max_prompt_pack_experience_chars
          ),
          selection_reason: selectedPromptPack.reason
        }))
    );
  }

  return {
    role: params.role,
    profile,
    refs
  };
}

export function buildRunMemoryPromptLines(selection: RunMemorySelection): string[] {
  const lines: string[] = [];
  const source0Ref = selection.refs.find(
    (ref): ref is RunMemorySource0Ref => ref.kind === 'source_0'
  );
  if (source0Ref) {
    lines.push(...buildRunSource0PromptLines(source0Ref.descriptor));
  }

  const promptPackRefs = selection.refs.filter(
    (ref): ref is RunMemoryPromptPackExperienceRef => ref.kind === 'prompt_pack_experience'
  );
  if (promptPackRefs.length === 0) {
    return lines;
  }

  const [firstRef] = promptPackRefs;
  if (lines.length > 0) {
    lines.push('');
  }
  lines.push(
    'Relevant prior experiences (hints, not strict instructions):',
    `- Retrieval profile: ${selection.role}`,
    `- Domain: ${firstRef.pack.domain}`,
    `- Pack id: ${firstRef.pack.id}`,
    `- Pack stamp: ${firstRef.pack.stamp}`,
    `- Selection reason: ${firstRef.selection_reason}`
  );
  if (firstRef.pack.sources.length > 0) {
    lines.push(`- Pack sources: ${firstRef.pack.sources.join(', ')}`);
  }
  lines.push(...promptPackRefs.map((ref, index) => `${index + 1}. ${ref.experience}`));
  return lines;
}

export const __test__ = {
  readPromptPackCandidates,
  selectPromptPackCandidate
};
