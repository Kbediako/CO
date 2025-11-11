import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadPromptPacks,
  computePromptPackStamp,
  type PromptPackSectionSource
} from '../../src/instructions/promptPacks.js';

const PROMPT_PATH = '.agent/prompts/prompt-pack.md';

async function createPrompt(root: string, content = '# Prompt\nReady.'): Promise<void> {
  const promptDir = join(root, '.agent', 'prompts');
  await mkdir(promptDir, { recursive: true });
  await writeFile(join(root, PROMPT_PATH), content, 'utf8');
}

describe('loadPromptPacks', () => {
  it('returns empty array when no prompt packs are defined', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prompt-pack-empty-'));
    try {
      const packs = await loadPromptPacks(root);
      expect(packs).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('throws when stamp does not match', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prompt-pack-stamp-'));
    try {
      await createPrompt(root);
      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'invalid');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            id: 'invalid-pack',
            domain: 'diagnostics',
            stamp: 'deadbeef',
            experienceSlots: 1,
            system: PROMPT_PATH,
            inject: [PROMPT_PATH],
            summarize: [PROMPT_PATH],
            extract: [],
            optimize: []
          },
          null,
          2
        ),
        'utf8'
      );

      await expect(loadPromptPacks(root)).rejects.toThrow(/stamp mismatch/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('loads prompt packs with stamped sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prompt-pack-load-'));
    try {
      const content = '# Prompt\nStamped!';
      await createPrompt(root, content);
      const sections: PromptPackSectionSource[] = [
        { section: 'system', path: PROMPT_PATH, content },
        { section: 'inject', path: PROMPT_PATH, content },
        { section: 'summarize', path: PROMPT_PATH, content },
        { section: 'extract', path: PROMPT_PATH, content },
        { section: 'optimize', path: PROMPT_PATH, content }
      ];
      const stamp = computePromptPackStamp(sections);

      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'valid');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            id: 'valid-pack',
            domain: 'implementation',
            stamp,
            experienceSlots: 4,
            system: PROMPT_PATH,
            inject: [PROMPT_PATH],
            summarize: [PROMPT_PATH],
            extract: [PROMPT_PATH],
            optimize: [PROMPT_PATH]
          },
          null,
          2
        ),
        'utf8'
      );

      const packs = await loadPromptPacks(root);
      expect(packs).toHaveLength(1);
      const pack = packs[0]!;
      expect(pack.id).toBe('valid-pack');
      expect(pack.experienceSlots).toBe(4);
      expect(pack.sections.system[0]?.content).toContain('Stamped');
      expect(pack.sources).toHaveLength(5);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
