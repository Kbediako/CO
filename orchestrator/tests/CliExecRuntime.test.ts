import { describe, it, expect } from 'vitest';

import { getCliExecRunner } from '../src/cli/services/execRuntime.js';

describe('CLI exec runtime', () => {
  it('forwards args to spawned commands', async () => {
    const runner = getCliExecRunner();
    const result = await runner.run({
      command: 'echo',
      args: ['foo', 'bar']
    });

    expect(result.stdout.trim()).toBe('foo bar');
  });
});
