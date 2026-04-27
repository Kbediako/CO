import { mkdtemp, mkdir, open, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { acquireLockWithRetry } from '../src/persistence/lockFile.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('acquireLockWithRetry', () => {
  it('recovers an orphaned stale lock so a new writer can acquire it', async () => {
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

    const orphan = await open(lockPath, 'wx');
    await orphan.writeFile('orphan-owner', 'utf8');
    await orphan.close();
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

    await expect(readFile(lockPath, 'utf8')).resolves.toBe(lockB.ownerToken);

    await lockB.release();
    await expect(stat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('serializes stale reclaimers so a recovered live lock is not removed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lock-file-'));
    tempDirs.push(root);
    const lockPath = join(root, 'shared.lock');
    const staleMs = 200;
    const retry = {
      maxAttempts: 200,
      initialDelayMs: 10,
      backoffFactor: 1,
      maxDelayMs: 10,
      staleMs
    };

    const orphan = await open(lockPath, 'wx');
    await orphan.writeFile('orphan-owner', 'utf8');
    await orphan.close();
    const past = new Date(Date.now() - 60_000);
    await utimes(lockPath, past, past);

    const acquireA = acquireLockWithRetry({
      taskId: 'task-a',
      lockPath,
      retry,
      ensureDirectory: async () => {
        await mkdir(root, { recursive: true });
      },
      createError: (taskId, attempts) => new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
    }).then((lock) => ({ name: 'task-a', lock }));
    let secondSettled = false;
    const acquireB = acquireLockWithRetry({
      taskId: 'task-b',
      lockPath,
      retry,
      ensureDirectory: async () => {
        await mkdir(root, { recursive: true });
      },
      createError: (taskId, attempts) => new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
    }).then((lock) => {
      return { name: 'task-b', lock };
    });

    const first = await Promise.race([acquireA, acquireB]);
    const second = first.name === 'task-a' ? acquireB : acquireA;
    const secondSettledPromise = second.then((value) => {
      secondSettled = true;
      return value;
    });
    await delay(staleMs * 2 + 100);
    expect(secondSettled).toBe(false);
    await expect(readFile(lockPath, 'utf8')).resolves.toBe(first.lock.ownerToken);

    await first.lock.release();
    const next = await secondSettledPromise;
    await expect(readFile(lockPath, 'utf8')).resolves.toBe(next.lock.ownerToken);

    await next.lock.release();
    await expect(stat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(stat(`${lockPath}.acquire`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('recovers an orphaned stale acquisition guard before taking the main lock', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lock-file-'));
    tempDirs.push(root);
    const lockPath = join(root, 'shared.lock');
    const acquisitionGuardPath = `${lockPath}.acquire`;
    const retry = {
      maxAttempts: 4,
      initialDelayMs: 1,
      backoffFactor: 1,
      maxDelayMs: 1,
      staleMs: 1
    };

    const orphan = await open(acquisitionGuardPath, 'wx');
    await orphan.writeFile('orphan-guard-owner', 'utf8');
    await orphan.close();
    const past = new Date(Date.now() - 60_000);
    await utimes(acquisitionGuardPath, past, past);

    const lock = await acquireLockWithRetry({
      taskId: 'task-after-orphan-guard',
      lockPath,
      retry,
      ensureDirectory: async () => {
        await mkdir(root, { recursive: true });
      },
      createError: (taskId, attempts) => new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
    });

    await expect(readFile(lockPath, 'utf8')).resolves.toBe(lock.ownerToken);
    await expect(stat(acquisitionGuardPath)).rejects.toMatchObject({ code: 'ENOENT' });

    await lock.release();
    await expect(stat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('uses the caller error when acquisition guard retry is exhausted', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lock-file-'));
    tempDirs.push(root);
    const lockPath = join(root, 'shared.lock');
    const acquisitionGuardPath = `${lockPath}.acquire`;
    const retry = {
      maxAttempts: 2,
      initialDelayMs: 1,
      backoffFactor: 1,
      maxDelayMs: 1,
      staleMs: 60_000
    };

    const guard = await open(acquisitionGuardPath, 'wx');
    await guard.writeFile('live-guard-owner', 'utf8');
    try {
      await expect(
        acquireLockWithRetry({
          taskId: 'proof-lock',
          lockPath,
          retry,
          ensureDirectory: async () => {
            await mkdir(root, { recursive: true });
          },
          createError: (taskId, attempts) =>
            new Error(`custom ${taskId} lock failure after ${attempts} attempts`)
        })
      ).rejects.toThrow('custom proof-lock lock failure after 2 attempts');
    } finally {
      await guard.close();
    }
  });

  it('keeps a live lock fresh so waiting writers do not stale-take it over', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lock-file-'));
    tempDirs.push(root);
    const lockPath = join(root, 'shared.lock');
    const staleMs = 500;
    const retry = {
      maxAttempts: 120,
      initialDelayMs: 25,
      backoffFactor: 1,
      maxDelayMs: 25,
      staleMs
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

    const acquireB = acquireLockWithRetry({
      taskId: 'task-b',
      lockPath,
      retry,
      ensureDirectory: async () => {
        await mkdir(root, { recursive: true });
      },
      createError: (taskId, attempts) => new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
    });

    // Keep the hold longer than staleMs so the test still proves keepalive
    // freshness, while leaving margin for full-suite scheduler jitter.
    await delay(staleMs * 2 + 100);
    await expect(readFile(lockPath, 'utf8')).resolves.toBe(lockA.ownerToken);

    await lockA.release();
    const lockB = await acquireB;
    await expect(readFile(lockPath, 'utf8')).resolves.toBe(lockB.ownerToken);

    await lockB.release();
    await expect(stat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
