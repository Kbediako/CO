import { mkdtemp, mkdir, open, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { acquireLockWithRetry, __test__ as lockFileTest } from '../src/persistence/lockFile.js';

const tempDirs: string[] = [];

function serializeTestLockOwner(overrides: Record<string, unknown> = {}): string {
  return `${JSON.stringify({
    schema_version: 1,
    kind: 'codex-lock-owner',
    token: 'test-owner-token',
    task_id: 'test-owner-task',
    pid: process.pid,
    host: hostname(),
    acquired_at: new Date().toISOString(),
    stale_ms: 1,
    ...overrides
  })}\n`;
}

async function readLockOwner(lockPath: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(lockPath, 'utf8')) as Record<string, unknown>;
}

async function readLockOwnerToken(lockPath: string): Promise<string> {
  const owner = await readLockOwner(lockPath);
  return String(owner.token);
}

afterEach(async () => {
  lockFileTest.setBeforeClearStaleLockOwnerTokenCheck(null);
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

    const lockBOwner = await readLockOwner(lockPath);
    expect(lockBOwner).toMatchObject({
      kind: 'codex-lock-owner',
      schema_version: 1,
      token: lockB.ownerToken,
      task_id: 'task-b',
      pid: process.pid,
      host: hostname(),
      stale_ms: retry.staleMs
    });
    expect(typeof lockBOwner.acquired_at).toBe('string');

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
    await expect(readLockOwnerToken(lockPath)).resolves.toBe(first.lock.ownerToken);

    await first.lock.release();
    const next = await secondSettledPromise;
    await expect(readLockOwnerToken(lockPath)).resolves.toBe(next.lock.ownerToken);

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

    await expect(readLockOwnerToken(lockPath)).resolves.toBe(lock.ownerToken);
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
    const initialLockMtimeMs = (await stat(lockPath)).mtimeMs;

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
    const refreshedLockMtimeMs = (await stat(lockPath)).mtimeMs;
    expect(refreshedLockMtimeMs).toBeGreaterThan(initialLockMtimeMs);
    await expect(readLockOwnerToken(lockPath)).resolves.toBe(lockA.ownerToken);

    await lockA.release();
    const lockB = await acquireB;
    await expect(readLockOwnerToken(lockPath)).resolves.toBe(lockB.ownerToken);

    await lockB.release();
    await expect(stat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails closed with owner diagnostics when stale metadata still points at a live writer', async () => {
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
    await writeFile(
      lockPath,
      `${JSON.stringify({
        schema_version: 1,
        kind: 'codex-lock-owner',
        token: 'live-owner-token',
        task_id: 'live-owner-task',
        pid: process.pid,
        host: hostname(),
        acquired_at: new Date().toISOString(),
        stale_ms: retry.staleMs
      })}\n`,
      'utf8'
    );
    const past = new Date(Date.now() - 60_000);
    await utimes(lockPath, past, past);

    await expect(
      acquireLockWithRetry({
        taskId: 'waiting-proof-writer',
        lockPath,
        retry,
        ensureDirectory: async () => {
          await mkdir(root, { recursive: true });
        },
        createError: (taskId, attempts) =>
          new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
      })
    ).rejects.toThrow(/owner_status=same_host_process_(alive|identity_unverified)/);

    const owner = await readLockOwner(lockPath);
    expect(owner).toMatchObject({
      token: 'live-owner-token',
      task_id: 'live-owner-task',
      pid: process.pid,
      host: hostname()
    });
  });

  it('recovers stale metadata when the same-host pid was reused after acquisition', async () => {
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
    await writeFile(
      lockPath,
      `${JSON.stringify({
        schema_version: 1,
        kind: 'codex-lock-owner',
        token: 'reused-owner-token',
        task_id: 'dead-owner-task',
        pid: process.pid,
        host: hostname(),
        acquired_at: '2020-01-01T00:00:00.000Z',
        stale_ms: retry.staleMs
      })}\n`,
      'utf8'
    );
    const past = new Date('2020-01-01T00:00:01.000Z');
    await utimes(lockPath, past, past);

    const lock = await acquireLockWithRetry({
      taskId: 'replacement-proof-writer',
      lockPath,
      retry,
      ensureDirectory: async () => {
        await mkdir(root, { recursive: true });
      },
      createError: (taskId, attempts) =>
        new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
    });

    const owner = await readLockOwner(lockPath);
    expect(owner).toMatchObject({
      token: lock.ownerToken,
      task_id: 'replacement-proof-writer',
      pid: process.pid,
      host: hostname()
    });

    await lock.release();
    await expect(stat(lockPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails closed when stale metadata has a pid and acquisition time but no host', async () => {
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
    await writeFile(
      lockPath,
      serializeTestLockOwner({
        token: 'missing-host-owner-token',
        task_id: 'missing-host-owner-task',
        host: undefined,
        acquired_at: '2020-01-01T00:00:00.000Z',
        stale_ms: retry.staleMs
      }),
      'utf8'
    );
    const past = new Date(Date.now() - 60_000);
    await utimes(lockPath, past, past);

    await expect(
      acquireLockWithRetry({
        taskId: 'waiting-proof-writer',
        lockPath,
        retry,
        ensureDirectory: async () => {
          await mkdir(root, { recursive: true });
        },
        createError: (taskId, attempts) =>
          new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
      })
    ).rejects.toThrow(/owner_status=metadata_without_host.*recoverable=false/);

    const owner = await readLockOwner(lockPath);
    expect(owner).toMatchObject({
      token: 'missing-host-owner-token',
      task_id: 'missing-host-owner-task',
      pid: process.pid
    });
    expect(owner.host).toBeUndefined();
  });

  it('does not unlink a same-inode owner token replacement during stale cleanup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lock-file-'));
    tempDirs.push(root);
    const lockPath = join(root, 'shared.lock');
    const retry = {
      maxAttempts: 1,
      initialDelayMs: 1,
      backoffFactor: 1,
      maxDelayMs: 1,
      staleMs: 1
    };
    await writeFile(
      lockPath,
      serializeTestLockOwner({
        token: 'stale-owner-token',
        task_id: 'stale-owner-task',
        acquired_at: '2020-01-01T00:00:00.000Z',
        stale_ms: retry.staleMs
      }),
      'utf8'
    );
    const past = new Date('2020-01-01T00:00:01.000Z');
    await utimes(lockPath, past, past);

    let hookCalled = false;
    lockFileTest.setBeforeClearStaleLockOwnerTokenCheck(async (hookLockPath, diagnostics) => {
      expect(hookLockPath).toBe(lockPath);
      expect(diagnostics.owner?.token).toBe('stale-owner-token');
      const before = await stat(lockPath);
      await writeFile(
        lockPath,
        serializeTestLockOwner({
          token: 'replacement-owner-token',
          task_id: 'replacement-owner-task',
          stale_ms: retry.staleMs
        }),
        'utf8'
      );
      const after = await stat(lockPath);
      expect(after.dev).toBe(before.dev);
      expect(after.ino).toBe(before.ino);
      hookCalled = true;
    });

    await expect(
      acquireLockWithRetry({
        taskId: 'racing-proof-writer',
        lockPath,
        retry,
        ensureDirectory: async () => {
          await mkdir(root, { recursive: true });
        },
        createError: (taskId, attempts) =>
          new Error(`Failed to acquire ${taskId} after ${attempts} attempts`)
      })
    ).rejects.toThrow('Failed to acquire racing-proof-writer after 1 attempts');

    expect(hookCalled).toBe(true);
    const owner = await readLockOwner(lockPath);
    expect(owner).toMatchObject({
      token: 'replacement-owner-token',
      task_id: 'replacement-owner-task',
      pid: process.pid,
      host: hostname()
    });
  });
});
