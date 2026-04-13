import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dirReuseRaceState = vi.hoisted(() => ({
  mutateSourceAfterIndexCopy: null as null | ((sourcePath: string) => Promise<void>)
}));

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    ...actual,
    copyFile: async (
      src: Parameters<typeof actual.copyFile>[0],
      dest: Parameters<typeof actual.copyFile>[1],
      mode?: Parameters<typeof actual.copyFile>[2]
    ) => {
      await actual.copyFile(src, dest, mode);
      const hook = dirReuseRaceState.mutateSourceAfterIndexCopy;
      if (hook && typeof src === 'string' && src.endsWith('/index.json')) {
        dirReuseRaceState.mutateSourceAfterIndexCopy = null;
        await hook(src.replace(/index\.json$/u, 'source.txt'));
      }
    }
  };
});

const { buildContextObject } = await import('../src/cli/rlm/context.js');

let tempDir: string | null = null;

afterEach(async () => {
  dirReuseRaceState.mutateSourceAfterIndexCopy = null;
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe('buildContextObject directory reuse', () => {
  it('revalidates the copied artefacts before returning reused dir contexts', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rlm-context-race-'));
    const contextObject = await buildContextObject({
      source: { type: 'text', value: 'alpha beta gamma' },
      targetDir: join(tempDir, 'parent-context'),
      chunking: { targetBytes: 8, overlapBytes: 0, strategy: 'byte' }
    });

    dirReuseRaceState.mutateSourceAfterIndexCopy = async (sourcePath: string) => {
      await writeFile(sourcePath, 'tampered source bytes', 'utf8');
    };

    await expect(
      buildContextObject({
        source: { type: 'dir', value: contextObject.dir },
        targetDir: join(tempDir, 'child-context'),
        chunking: { targetBytes: 8, overlapBytes: 0, strategy: 'byte' }
      })
    ).rejects.toThrow('context index source length mismatch');
  });
});
