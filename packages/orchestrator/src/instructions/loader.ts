import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { loadPromptPacks, type PromptPack } from './promptPacks.js';

export interface InstructionSource {
  path: string;
  content: string;
}

export interface InstructionSet {
  hash: string;
  sources: InstructionSource[];
  combined: string;
  promptPacks: PromptPack[];
}

export async function loadInstructionSet(repoRoot: string): Promise<InstructionSet> {
  const candidates = [
    join(repoRoot, 'AGENTS.md'),
    join(repoRoot, 'docs', 'AGENTS.md'),
    join(repoRoot, '.agent', 'AGENTS.md')
  ];

  const sources: InstructionSource[] = [];
  for (const path of candidates) {
    const content = await readFileSafe(path);
    if (content) {
      sources.push({ path: relative(repoRoot, path), content });
    }
  }

  const combined = sources.map((source) => source.content).join('\n\n').trim();
  const hash = combined
    ? createHash('sha256').update(combined, 'utf8').digest('hex')
    : '';
  const promptPacks = await loadPromptPacks(repoRoot);

  return {
    hash,
    sources,
    combined,
    promptPacks
  };
}

async function readFileSafe(path: string): Promise<string | null> {
  try {
    const raw = await readFile(path, 'utf8');
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err && err.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
