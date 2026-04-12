import { createHash } from 'node:crypto';
import type { Dirent } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export type PromptPackSection = 'system' | 'inject' | 'summarize' | 'extract' | 'optimize';
export type PromptPackRetrievalPolicyKind = 'competitive_scoring_v1';
export type PromptPackRetrievalSourceGrouping = 'provenance_fallback_v1';

const PROMPT_SECTIONS: PromptPackSection[] = ['system', 'inject', 'summarize', 'extract', 'optimize'];
const PROMPT_PACK_DIR = ['.agent', 'prompts', 'prompt-packs'];
const DEFAULT_PROMPT_PACK_RETRIEVAL_POLICY_KIND: PromptPackRetrievalPolicyKind = 'competitive_scoring_v1';
const DEFAULT_PROMPT_PACK_SOURCE_GROUPING: PromptPackRetrievalSourceGrouping = 'provenance_fallback_v1';
const DEFAULT_ANTI_DOMINANCE_STRENGTH = 0.5;

export interface PromptPackRetrievalPolicyFile {
  kind?: string;
  minScore?: number | null;
  scoreWeights?: {
    gtScore?: number;
    relativeRank?: number;
  };
  antiDominanceNormalization?: {
    enabled?: boolean;
    strength?: number;
    sourceGrouping?: string;
  };
}

export interface PromptPackRetrievalPolicy {
  kind: PromptPackRetrievalPolicyKind;
  minScore: number | null;
  scoreWeights: {
    gtScore: number;
    relativeRank: number;
  };
  antiDominanceNormalization: {
    enabled: boolean;
    strength: number;
    sourceGrouping: PromptPackRetrievalSourceGrouping;
  };
}

export interface PromptPackManifestFile {
  id: string;
  domain: string;
  stamp: string;
  experienceSlots?: number;
  retrievalPolicy?: PromptPackRetrievalPolicyFile;
  system: string;
  inject?: string[];
  summarize?: string[];
  extract?: string[];
  optimize?: string[];
}

export interface PromptPackSectionSource {
  section: PromptPackSection;
  path: string;
  content: string;
}

export interface PromptPack {
  id: string;
  domain: string;
  stamp: string;
  experienceSlots: number;
  retrievalPolicy: PromptPackRetrievalPolicy;
  sections: Record<PromptPackSection, PromptPackSectionSource[]>;
  sources: PromptPackSectionSource[];
}

export interface PromptPackStampConfig {
  experienceSlots: number;
  retrievalPolicy: PromptPackRetrievalPolicy;
}

export async function loadPromptPacks(repoRoot: string): Promise<PromptPack[]> {
  const manifestPaths = await discoverPromptPackManifests(repoRoot);
  const packs: PromptPack[] = [];
  for (const manifestPath of manifestPaths) {
    packs.push(await loadPromptPack(manifestPath, repoRoot));
  }
  packs.sort((a, b) => {
    if (a.domain === b.domain) {
      return a.id.localeCompare(b.id);
    }
    return a.domain.localeCompare(b.domain);
  });
  return packs;
}

async function discoverPromptPackManifests(repoRoot: string): Promise<string[]> {
  const baseDir = join(repoRoot, ...PROMPT_PACK_DIR);
  let entries: Dirent[];
  try {
    entries = await readdir(baseDir, { withFileTypes: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const manifests: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const manifestPath = join(baseDir, entry.name, 'manifest.json');
    try {
      await stat(manifestPath);
      manifests.push(manifestPath);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }
  return manifests;
}

async function loadPromptPack(manifestPath: string, repoRoot: string): Promise<PromptPack> {
  let parsed: PromptPackManifestFile;
  try {
    const raw = await readFile(manifestPath, 'utf8');
    parsed = JSON.parse(raw) as PromptPackManifestFile;
  } catch (error) {
    throw new Error(`Failed to read prompt pack manifest at ${relative(repoRoot, manifestPath)}: ${String(error)}`);
  }

  validateManifest(parsed, manifestPath, repoRoot);

  const sections: Record<PromptPackSection, PromptPackSectionSource[]> = {
    system: [],
    inject: [],
    summarize: [],
    extract: [],
    optimize: []
  };

  sections.system = [await loadSectionSource(repoRoot, 'system', parsed.system, manifestPath)];
  sections.inject = await loadSectionArray(repoRoot, 'inject', parsed.inject ?? [], manifestPath);
  sections.summarize = await loadSectionArray(repoRoot, 'summarize', parsed.summarize ?? [], manifestPath);
  sections.extract = await loadSectionArray(repoRoot, 'extract', parsed.extract ?? [], manifestPath);
  sections.optimize = await loadSectionArray(repoRoot, 'optimize', parsed.optimize ?? [], manifestPath);

  const allSources = PROMPT_SECTIONS.flatMap((section) => sections[section]);
  if (allSources.length === 0) {
    throw new Error(
      `Prompt pack ${parsed.id} ${parsed.domain} has no sources defined (${relative(repoRoot, manifestPath)})`
    );
  }

  const experienceSlots = Number.isInteger(parsed.experienceSlots) && parsed.experienceSlots! >= 0
    ? parsed.experienceSlots!
    : 0;
  const retrievalPolicy = normalizePromptPackRetrievalPolicy(parsed.retrievalPolicy);
  const computedStamp = computePromptPackStamp(allSources, {
    experienceSlots,
    retrievalPolicy
  });
  if (!parsed.stamp) {
    throw new Error(`Prompt pack ${parsed.id} is missing a stamp (manifest: ${relative(repoRoot, manifestPath)})`);
  }
  if (computedStamp !== parsed.stamp) {
    throw new Error(
      `Prompt pack ${parsed.id} stamp mismatch. expected ${parsed.stamp}, computed ${computedStamp} (${relative(
        repoRoot,
        manifestPath
      )})`
    );
  }

  return {
    id: parsed.id,
    domain: parsed.domain,
    stamp: parsed.stamp,
    experienceSlots,
    retrievalPolicy,
    sections,
    sources: allSources
  };
}

function validateManifest(manifest: PromptPackManifestFile, manifestPath: string, repoRoot: string): void {
  const missing: string[] = [];
  if (!manifest.id) {
    missing.push('id');
  }
  if (!manifest.domain) {
    missing.push('domain');
  }
  if (!manifest.system) {
    missing.push('system');
  }
  if (missing.length > 0) {
    throw new Error(
      `Prompt pack manifest ${relative(repoRoot, manifestPath)} missing required fields: ${missing.join(', ')}`
    );
  }
}

function normalizePromptPackRetrievalPolicy(
  input: PromptPackRetrievalPolicyFile | undefined
): PromptPackRetrievalPolicy {
  const antiDominance = input?.antiDominanceNormalization;
  return {
    kind: normalizeRetrievalPolicyKind(input?.kind),
    minScore:
      input?.minScore === null || input?.minScore === undefined
        ? null
        : normalizeNonNegativeNumber(input.minScore, 'retrievalPolicy.minScore'),
    scoreWeights: {
      gtScore: normalizeNonNegativeNumber(
        input?.scoreWeights?.gtScore,
        'retrievalPolicy.scoreWeights.gtScore',
        1
      ),
      relativeRank: normalizeNonNegativeNumber(
        input?.scoreWeights?.relativeRank,
        'retrievalPolicy.scoreWeights.relativeRank',
        1
      )
    },
    antiDominanceNormalization: {
      enabled: antiDominance?.enabled === undefined ? true : Boolean(antiDominance.enabled),
      strength: normalizeNonNegativeNumber(
        antiDominance?.strength,
        'retrievalPolicy.antiDominanceNormalization.strength',
        DEFAULT_ANTI_DOMINANCE_STRENGTH
      ),
      sourceGrouping: normalizeSourceGrouping(antiDominance?.sourceGrouping)
    }
  };
}

function normalizeRetrievalPolicyKind(value: string | undefined): PromptPackRetrievalPolicyKind {
  if (!value || !value.trim()) {
    return DEFAULT_PROMPT_PACK_RETRIEVAL_POLICY_KIND;
  }
  if (value !== DEFAULT_PROMPT_PACK_RETRIEVAL_POLICY_KIND) {
    throw new Error(
      `Unsupported prompt-pack retrieval policy kind '${value}'. Expected '${DEFAULT_PROMPT_PACK_RETRIEVAL_POLICY_KIND}'.`
    );
  }
  return DEFAULT_PROMPT_PACK_RETRIEVAL_POLICY_KIND;
}

function normalizeSourceGrouping(value: string | undefined): PromptPackRetrievalSourceGrouping {
  if (!value || !value.trim()) {
    return DEFAULT_PROMPT_PACK_SOURCE_GROUPING;
  }
  if (value !== DEFAULT_PROMPT_PACK_SOURCE_GROUPING) {
    throw new Error(
      `Unsupported prompt-pack source grouping '${value}'. Expected '${DEFAULT_PROMPT_PACK_SOURCE_GROUPING}'.`
    );
  }
  return DEFAULT_PROMPT_PACK_SOURCE_GROUPING;
}

function normalizeNonNegativeNumber(
  value: number | undefined,
  field: string,
  defaultValue?: number
): number {
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`${field} is required.`);
    }
    return defaultValue;
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number.`);
  }
  return value;
}

async function loadSectionArray(
  repoRoot: string,
  section: PromptPackSection,
  paths: string[],
  manifestPath: string
): Promise<PromptPackSectionSource[]> {
  const sources: PromptPackSectionSource[] = [];
  for (const relPath of paths) {
    sources.push(await loadSectionSource(repoRoot, section, relPath, manifestPath));
  }
  return sources;
}

async function loadSectionSource(
  repoRoot: string,
  section: PromptPackSection,
  relativePath: string,
  manifestPath: string
): Promise<PromptPackSectionSource> {
  const absolutePath = join(repoRoot, relativePath);
  let raw: string;
  try {
    raw = await readFile(absolutePath, 'utf8');
  } catch (error: unknown) {
    throw new Error(
      `Failed to read prompt source ${relative(repoRoot, absolutePath)} referenced by ${relative(
        repoRoot,
        manifestPath
      )}: ${String(error)}`
    );
  }
  const content = raw.trim();
  if (!content) {
    throw new Error(
      `Prompt source ${relative(repoRoot, absolutePath)} referenced by ${relative(
        repoRoot,
        manifestPath
      )} is empty`
    );
  }
  return {
    section,
    path: relative(repoRoot, absolutePath),
    content
  };
}

export function computePromptPackStamp(
  sources: PromptPackSectionSource[],
  config?: PromptPackStampConfig
): string {
  const hash = createHash('sha256');
  const sorted = [...sources].sort((a, b) => {
    if (a.section === b.section) {
      return a.path.localeCompare(b.path);
    }
    return PROMPT_SECTIONS.indexOf(a.section) - PROMPT_SECTIONS.indexOf(b.section);
  });

  for (const source of sorted) {
    hash.update(`${source.section}:${source.path}\n`, 'utf8');
    hash.update(source.content, 'utf8');
    hash.update('\n', 'utf8');
  }

  if (config) {
    hash.update(
      JSON.stringify({
        experienceSlots: config.experienceSlots,
        retrievalPolicy: {
          kind: config.retrievalPolicy.kind,
          minScore: config.retrievalPolicy.minScore,
          scoreWeights: {
            gtScore: config.retrievalPolicy.scoreWeights.gtScore,
            relativeRank: config.retrievalPolicy.scoreWeights.relativeRank
          },
          antiDominanceNormalization: {
            enabled: config.retrievalPolicy.antiDominanceNormalization.enabled,
            strength: config.retrievalPolicy.antiDominanceNormalization.strength,
            sourceGrouping: config.retrievalPolicy.antiDominanceNormalization.sourceGrouping
          }
        }
      }),
      'utf8'
    );
    hash.update('\n', 'utf8');
  }

  return hash.digest('hex');
}
