import { describe, expect, it } from 'vitest';
import { getAdapterById, getAdapters, requireAdapter } from '../index.js';

const REQUIRED_GOALS = ['build', 'test'] as const;

describe('adapter registry', () => {
  it('includes multiple language adapters', () => {
    const adapters = getAdapters();
    expect(adapters.length).toBeGreaterThanOrEqual(2);
  });

  it('exposes build and test commands for each registered adapter', () => {
    const adapters = getAdapters();
    for (const adapter of adapters) {
      for (const goal of REQUIRED_GOALS) {
        const command = adapter.commands[goal];
        expect(command, `${adapter.id} is missing ${goal} command`).toBeDefined();
        expect(command.command.length).toBeGreaterThan(0);
      }
    }
  });

  it('can resolve adapters by id', () => {
    const adapter = getAdapters()[0];
    expect(requireAdapter(adapter.id)).toBe(adapter);
    expect(getAdapterById('missing-adapter')).toBeUndefined();
  });
});
