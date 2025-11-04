import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { loadInstructionSet } from '../src/instructions/loader.js';

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
});
