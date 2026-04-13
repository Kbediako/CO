import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  loadPromptPacks,
  loadPromptPackMetadata,
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
      const stamp = computePromptPackStamp(sections, {
        experienceSlots: 4,
        retrievalPolicy: {
          kind: 'competitive_scoring_v1',
          minScore: null,
          scoreWeights: { gtScore: 1, relativeRank: 1 },
          antiDominanceNormalization: {
            enabled: true,
            strength: 0.5,
            sourceGrouping: 'provenance_fallback_v1'
          }
        }
      });

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
      expect(pack.retrievalPolicy.kind).toBe('competitive_scoring_v1');
      expect(pack.retrievalPolicy.minScore).toBeNull();
      expect(pack.retrievalPolicy.scoreWeights.gtScore).toBe(1);
      expect(pack.retrievalPolicy.scoreWeights.relativeRank).toBe(1);
      expect(pack.retrievalPolicy.antiDominanceNormalization.enabled).toBe(true);
      expect(pack.retrievalPolicy.antiDominanceNormalization.strength).toBe(0.5);
      expect(pack.retrievalPolicy.antiDominanceNormalization.sourceGrouping).toBe(
        'provenance_fallback_v1'
      );
      expect(pack.sections.system[0]?.content).toContain('Stamped');
      expect(pack.sources).toHaveLength(5);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('loads planner-facing prompt-pack metadata without reading prompt sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prompt-pack-metadata-'));
    try {
      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'metadata-only');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            id: 'metadata-pack',
            domain: 'diagnostics',
            stamp: 'metadata-stamp',
            experienceSlots: 2,
            system: '.agent/prompts/missing-source.md',
            inject: ['.agent/prompts/missing-source.md']
          },
          null,
          2
        ),
        'utf8'
      );

      await expect(loadPromptPacks(root)).rejects.toThrow(/Failed to read prompt source/i);
      await expect(loadPromptPackMetadata(root)).resolves.toEqual([
        {
          id: 'metadata-pack',
          domain: 'diagnostics',
          experienceSlots: 2
        }
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    {
      field: 'id',
      manifest: { id: ['metadata-pack'], domain: 'diagnostics', system: PROMPT_PATH },
      message: /invalid 'id'.*repoRoot:/i
    },
    {
      field: 'domain',
      manifest: { id: 'metadata-pack', domain: { slug: 'diagnostics' }, system: PROMPT_PATH },
      message: /invalid 'domain'.*repoRoot:/i
    },
    {
      field: 'system',
      manifest: { id: 'metadata-pack', domain: 'diagnostics', system: 42 },
      message: /invalid 'system'.*repoRoot:/i
    }
  ])('rejects malformed manifest $field fields before metadata sorting', async ({ field, manifest, message }) => {
    const root = await mkdtemp(join(tmpdir(), `prompt-pack-invalid-${field}-`));
    try {
      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', `invalid-${field}`);
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            ...manifest,
            stamp: 'metadata-stamp',
            experienceSlots: 1
          },
          null,
          2
        ),
        'utf8'
      );

      await expect(loadPromptPackMetadata(root)).rejects.toThrow(message);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('loads explicit retrieval policy overrides from the manifest', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prompt-pack-policy-'));
    try {
      const content = '# Prompt\nPolicy.';
      await createPrompt(root, content);
      const sections: PromptPackSectionSource[] = [
        { section: 'system', path: PROMPT_PATH, content },
        { section: 'inject', path: PROMPT_PATH, content },
        { section: 'summarize', path: PROMPT_PATH, content },
        { section: 'extract', path: PROMPT_PATH, content },
        { section: 'optimize', path: PROMPT_PATH, content }
      ];
      const stamp = computePromptPackStamp(sections, {
        experienceSlots: 2,
        retrievalPolicy: {
          kind: 'competitive_scoring_v1',
          minScore: 0.25,
          scoreWeights: { gtScore: 2, relativeRank: 0.5 },
          antiDominanceNormalization: {
            enabled: true,
            strength: 0.75,
            sourceGrouping: 'provenance_fallback_v1'
          }
        }
      });

      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'policy');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            id: 'policy-pack',
            domain: 'implementation',
            stamp,
            experienceSlots: 2,
            retrievalPolicy: {
              kind: 'competitive_scoring_v1',
              minScore: 0.25,
              scoreWeights: {
                gtScore: 2,
                relativeRank: 0.5
              },
              antiDominanceNormalization: {
                enabled: true,
                strength: 0.75,
                sourceGrouping: 'provenance_fallback_v1'
              }
            },
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

      const [pack] = await loadPromptPacks(root);
      expect(pack?.retrievalPolicy.kind).toBe('competitive_scoring_v1');
      expect(pack?.retrievalPolicy.minScore).toBe(0.25);
      expect(pack?.retrievalPolicy.scoreWeights.gtScore).toBe(2);
      expect(pack?.retrievalPolicy.scoreWeights.relativeRank).toBe(0.5);
      expect(pack?.retrievalPolicy.antiDominanceNormalization.enabled).toBe(true);
      expect(pack?.retrievalPolicy.antiDominanceNormalization.strength).toBe(0.75);
      expect(pack?.retrievalPolicy.antiDominanceNormalization.sourceGrouping).toBe(
        'provenance_fallback_v1'
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('throws when experienceSlots is invalid', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prompt-pack-invalid-slots-'));
    try {
      await createPrompt(root);
      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'invalid-slots');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            id: 'invalid-slots-pack',
            domain: 'implementation',
            stamp: 'deadbeef',
            experienceSlots: -1,
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

      await expect(loadPromptPacks(root)).rejects.toThrow(/invalid experienceSlots/i);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('throws when anti-dominance enabled is not a boolean', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prompt-pack-invalid-enabled-'));
    try {
      const content = '# Prompt\nInvalid boolean.';
      await createPrompt(root, content);
      const sections: PromptPackSectionSource[] = [
        { section: 'system', path: PROMPT_PATH, content },
        { section: 'inject', path: PROMPT_PATH, content },
        { section: 'summarize', path: PROMPT_PATH, content },
        { section: 'extract', path: PROMPT_PATH, content },
        { section: 'optimize', path: PROMPT_PATH, content }
      ];
      const stamp = computePromptPackStamp(sections, {
        experienceSlots: 1,
        retrievalPolicy: {
          kind: 'competitive_scoring_v1',
          minScore: null,
          scoreWeights: { gtScore: 1, relativeRank: 1 },
          antiDominanceNormalization: {
            enabled: true,
            strength: 0.5,
            sourceGrouping: 'provenance_fallback_v1'
          }
        }
      });

      const manifestDir = join(root, '.agent', 'prompts', 'prompt-packs', 'invalid-enabled');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
        join(manifestDir, 'manifest.json'),
        JSON.stringify(
          {
            id: 'invalid-enabled-pack',
            domain: 'implementation',
            stamp,
            experienceSlots: 1,
            retrievalPolicy: {
              antiDominanceNormalization: {
                enabled: 'false',
                strength: 0.5,
                sourceGrouping: 'provenance_fallback_v1'
              }
            },
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

      await expect(loadPromptPacks(root)).rejects.toThrow(
        /retrievalPolicy\.antiDominanceNormalization\.enabled must be a boolean/i
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
