import { describe, expect, it } from 'vitest';

import { runEntrypointInProcess } from './inProcessEntrypoint.js';

describe('runEntrypointInProcess', () => {
  it('fails fast when another in-process entrypoint run is already active', async () => {
    let releaseFirstRun: (() => void) | null = null;
    const firstRunGate = new Promise<void>((resolve) => {
      releaseFirstRun = resolve;
    });

    const firstRun = runEntrypointInProcess({
      args: [],
      env: { ...process.env },
      runner: async () => {
        await firstRunGate;
        return 0;
      }
    });

    await expect(
      runEntrypointInProcess({
        args: [],
        env: { ...process.env },
        runner: async () => 0
      })
    ).rejects.toThrow('runEntrypointInProcess cannot run concurrently in the same worker.');

    releaseFirstRun?.();
    await expect(firstRun).resolves.toMatchObject({ exitCode: 0 });
  });
});
