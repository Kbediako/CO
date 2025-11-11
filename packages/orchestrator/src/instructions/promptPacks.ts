import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export type PromptPackSection = 'system' | 'inject' | 'summarize' | 'extract' | 'optimize';

const PROMPT_SECTIONS: PromptPackSection[] = ['system', 'inject', 'summarize', 'extract', 'optimize'];
const PROMPT_PACK_DIR = ['.agent', 'prompts', 'prompt-packs'];

export interface PromptPackManifestFile {
  id: string;
  domain: string;
  stamp: string;
  experienceSlots?: number;
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
  sections: Record<PromptPackSection, PromptPackSectionSource[]>;
  sources: PromptPackSectionSource[];
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
  let entries: Awaited<ReturnType<typeof readdir>>;
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

  const computedStamp = computePromptPackStamp(allSources);
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

  const experienceSlots = Number.isInteger(parsed.experienceSlots) && parsed.experienceSlots! >= 0
    ? parsed.experienceSlots!
    : 0;

  return {
    id: parsed.id,
    domain: parsed.domain,
    stamp: parsed.stamp,
    experienceSlots,
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

export function computePromptPackStamp(sources: PromptPackSectionSource[]): string {
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

  return hash.digest('hex');
}
