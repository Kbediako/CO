import { describe, expect, it } from 'vitest';

import { formatExperienceInjections } from '../src/cli/exec/experience.js';
import type { ExperienceRecord } from '../src/persistence/ExperienceStore.js';

function createExperience(overrides: Partial<ExperienceRecord> = {}): ExperienceRecord {
  return {
    id: overrides.id ?? 'exp-1',
    runId: overrides.runId ?? 'run-1',
    taskId: overrides.taskId ?? 'task-0506',
    epoch: overrides.epoch ?? 1,
    groupId: overrides.groupId ?? 'group-1',
    summary32: overrides.summary32 ?? 'Implementation agent fixed the bug and added tests.',
    reward: overrides.reward ?? { gtScore: 1.2, relativeRank: 0.3 },
    toolStats:
      overrides.toolStats ??
      [
        {
          tool: 'cli:command',
          tokens: 120,
          latencyMs: 850,
          costUsd: 0.0025
        }
      ],
    stampSignature: overrides.stampSignature ?? 'a'.repeat(64),
    domain: overrides.domain ?? 'implementation',
    createdAt: overrides.createdAt ?? '2025-11-11T00:00:00.000Z',
    manifestPath: overrides.manifestPath ?? '.runs/manifest.json'
  };
}

describe('formatExperienceInjections', () => {
  it('limits output to the requested number of slots', () => {
    const experiences = [createExperience({ id: 'exp-1' }), createExperience({ id: 'exp-2' })];
    const snippets = formatExperienceInjections(experiences, 1);
    expect(snippets).toHaveLength(1);
    expect(snippets[0]).toContain('exp-1');
  });

  it('formats stats and reward metadata for each experience', () => {
    const experience = createExperience({
      id: 'exp-42',
      reward: { gtScore: 0.5, relativeRank: 0.25 },
      toolStats: [
        { tool: 'cli:command', tokens: 200, latencyMs: 900, costUsd: 0.004 },
        { tool: 'eval', tokens: 50, latencyMs: 300, costUsd: 0.001 }
      ]
    });
    const [snippet] = formatExperienceInjections([experience], 2);
    expect(snippet).toContain('exp-42');
    expect(snippet).toMatch(/reward 0\.75/);
    expect(snippet).toContain('cli:command');
    expect(snippet).toContain('eval');
  });
});
