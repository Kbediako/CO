import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { loadPromptPacks, type PromptPack } from './promptPacks.js';

const INSTRUCTION_STAMP_PATTERN =
  /^(?:\uFEFF)?<!--\s*codex:instruction-stamp\s+([a-f0-9]{64})\s*-->(?:\r?\n)?/i;
const EXPERIENCE_WORD_LIMIT = 32;

export interface InstructionSource {
  path: string;
  content: string;
  stamp: string;
}

export interface InstructionSet {
  hash: string;
  sources: InstructionSource[];
  combined: string;
  promptPacks: PromptPack[];
  experienceMaxWords: number;
}

export async function loadInstructionSet(repoRoot: string): Promise<InstructionSet> {
  const candidates = [
    join(repoRoot, 'AGENTS.md'),
    join(repoRoot, 'docs', 'AGENTS.md'),
    join(repoRoot, '.agent', 'AGENTS.md')
  ];

  const verifier = new InstructionStampVerifier();
  const sources: InstructionSource[] = [];
  for (const path of candidates) {
    const source = await readStampedInstruction(path, repoRoot, verifier);
    if (source) {
      sources.push(source);
    }
  }

  const combined = sources.map((source) => source.content).join('\n\n').trim();
  const hash = combined ? createHash('sha256').update(combined, 'utf8').digest('hex') : '';
  const promptPacks = await loadPromptPacks(repoRoot);
  const experienceMaxWords = resolveExperienceWordLimit();

  return {
    hash,
    sources,
    combined,
    promptPacks,
    experienceMaxWords
  };
}

class InstructionStampVerifier {
  verify(raw: string, relativePath: string): { content: string; stamp: string } {
    const match = INSTRUCTION_STAMP_PATTERN.exec(raw);
    if (!match) {
      logInstructionGuard(`Instruction ${relativePath} is missing a codex:instruction-stamp header.`);
      throw new Error(`Instruction ${relativePath} is not stamped.`);
    }
    const declared = match[1]!.toLowerCase();
    const body = raw.slice(match[0].length);
    const computed = createHash('sha256').update(body, 'utf8').digest('hex');
    if (computed !== declared) {
      logInstructionGuard(
        `Instruction ${relativePath} stamp mismatch. expected ${declared}, computed ${computed}.`
      );
      throw new Error(`Instruction ${relativePath} stamp mismatch.`);
    }
    return { content: body, stamp: declared };
  }
}

async function readStampedInstruction(
  absolutePath: string,
  repoRoot: string,
  verifier: InstructionStampVerifier
): Promise<InstructionSource | null> {
  try {
    const raw = await readFile(absolutePath, 'utf8');
    if (!raw.trim()) {
      return null;
    }
    const relativePath = relative(repoRoot, absolutePath);
    const verified = verifier.verify(raw, relativePath);
    const trimmed = verified.content.trim();
    if (!trimmed) {
      return null;
    }
    return {
      path: relativePath,
      content: trimmed,
      stamp: verified.stamp
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err && err.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function resolveExperienceWordLimit(env: NodeJS.ProcessEnv = process.env): number {
  const configured = env.TFGRPO_EXPERIENCE_MAX_WORDS;
  if (!configured || !configured.trim()) {
    return EXPERIENCE_WORD_LIMIT;
  }
  const parsed = Number.parseInt(configured, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('TFGRPO_EXPERIENCE_MAX_WORDS must be a positive integer.');
  }
  if (parsed > EXPERIENCE_WORD_LIMIT) {
    const message = `TFGRPO_EXPERIENCE_MAX_WORDS ${parsed} exceeds the guardrail of ${EXPERIENCE_WORD_LIMIT}.`;
    logInstructionGuard(message);
    throw new Error(message);
  }
  return parsed;
}

function logInstructionGuard(message: string): void {
  if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
    process.emitWarning(message, { code: 'instruction-guard' });
  }
}
