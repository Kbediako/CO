import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { loadInstructionSet } from '../src/instructions/loader.js';
import {
  computePromptPackStamp,
  type PromptPackSectionSource
} from '../src/instructions/promptPacks.js';

describe('loadInstructionSet', () => {
  it('merges instruction files in priority order', async () => {
    const root = await mkdtemp(join(tmpdir(), 'instructions-'));
    try {
      await writeFile(join(root, 'AGENTS.md'), '# Root\nBe kind.', 'utf8');
      await mkdir(join(root, 'docs'), { recursive: true });
      await writeFile(join(root, 'docs', 'AGENTS.md'), '# Docs\nFollow docs.', 'utf8');
      await mkdir(join(root, '.agent'), { recursive: true });
      await writeFile(join(root, '.agent', 'AGENTS.md'), '# Agent\nHandle task.', 'utf8');

      const result = await loadInstructionSet(root);
      expect(result.sources.map((source) => source.path)).toEqual([
        'AGENTS.md',
        'docs/AGENTS.md',
        '.agent/AGENTS.md'
      ]);
      expect(result.combined).toContain('Root');
      expect(result.combined).toContain('Docs');
      expect(result.combined).toContain('Agent');
      expect(result.hash).toHaveLength(64);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns empty hash when no instructions exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'instructions-empty-'));
    try {
      const result = await loadInstructionSet(root);
      expect(result.hash).toBe('');
      expect(result.sources).toHaveLength(0);
      expect(result.combined).toBe('');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('loads prompt packs when manifests exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'instructions-prompt-pack-'));
    try {
      const promptRel = '.agent/prompts/sample-pack.md';
      const promptPath = join(root, '.agent', 'prompts');
      await mkdir(promptPath, { recursive: true });
      const promptContent = '# Sample Prompt\nBe precise.';
      await writeFile(join(root, promptRel), promptContent, 'utf8');

      const sources: PromptPackSectionSource[] = [
        { section: 'system', path: promptRel, content: promptContent },
        { section: 'inject', path: promptRel, content: promptContent },
        { section: 'summarize', path: promptRel, content: promptContent },
        { section: 'extract', path: promptRel, content: promptContent },
        { section: 'optimize', path: promptRel, content: promptContent }
      ];
      const stamp = computePromptPackStamp(sources);

      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'sample');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            id: 'sample-pack',
            domain: 'implementation',
            stamp,
            experienceSlots: 2,
            system: promptRel,
            inject: [promptRel],
            summarize: [promptRel],
            extract: [promptRel],
            optimize: [promptRel]
          },
          null,
          2
        ),
        'utf8'
      );

      const result = await loadInstructionSet(root);
      expect(result.promptPacks).toHaveLength(1);
      const pack = result.promptPacks[0]!;
      expect(pack.id).toBe('sample-pack');
      expect(pack.domain).toBe('implementation');
      expect(pack.stamp).toBe(stamp);
      expect(pack.experienceSlots).toBe(2);
      expect(pack.sections.inject).toHaveLength(1);
      expect(pack.sources).toHaveLength(5);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
