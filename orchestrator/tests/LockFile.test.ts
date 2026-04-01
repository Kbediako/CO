import { mkdtemp, mkdir, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { acquireLockWithRetry } from '../src/persistence/lockFile.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('acquireLockWithRetry', () => {
  it('does not remove a newer lock after stale recovery hands ownership to another writer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lock-file-'));
    tempDirs.push(root);
    const lockPath = join(root, 'shared.lock');
    const retry = {
      maxAttempts: 2,
      initialDelayMs: 1,
      backoffFactor: 1,
      maxDelayMs: 1,
      staleMs: 1
    };

    const lockA = await acquireLockWithRetry({
      taskId: 'task-a',
      lockPath,
      retry,
      ensureDirectory: async () => {
        await mkdir(root, { recursive: true });
      },
      createError: (taskId, attempts) => new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
    });

    const past = new Date(Date.now() - 60_000);
    await utimes(lockPath, past, past);

    const lockB = await acquireLockWithRetry({
      taskId: 'task-b',
      lockPath,
      retry,
      ensureDirectory: async () => {
        await mkdir(root, { recursive: true });
      },
      createError: (taskId, attempts) => new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
    });

    await lockA.release();
    await expect(readFile(lockPath, 'utf8')).resolves.toBe(lockB.ownerToken);

    await lockB.release();
    await expect(stat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
