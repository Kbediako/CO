import { randomUUID } from 'node:crypto';
import type { FileHandle } from 'node:fs/promises';
import { open, readFile, rm, stat } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

export interface LockRetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
  staleMs?: number;
}

export interface LockRetryParams {
  taskId: string;
  lockPath: string;
  retry: LockRetryOptions;
  ensureDirectory: () => Promise<void>;
  createError: (taskId: string, attempts: number) => Error;
}

export interface AcquiredLock {
  lockPath: string;
  ownerToken: string;
  release(): Promise<void>;
}

const STALE_AWARE_ACQUISITION_LOCK_SUFFIX = '.acquire';

export async function acquireLockWithRetry(params: LockRetryParams): Promise<AcquiredLock> {
  await params.ensureDirectory();
  const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = params.retry;
  const staleMs = params.retry.staleMs ?? 0;
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;
    let acquisitionLock: AcquiredLock | null = null;
    try {
      if (staleMs > 0) {
        acquisitionLock = await acquireStaleAwareAcquisitionLock(params);
      }
      const ownerToken = randomUUID();
      const handle = await open(params.lockPath, 'wx+');
      try {
        await handle.writeFile(ownerToken, 'utf8');
      } catch (error) {
        await handle.close();
        await rm(params.lockPath, { force: true });
        throw error;
      }
      const lock = createAcquiredLock(params.lockPath, ownerToken, handle, staleMs);
      if (acquisitionLock) {
        try {
          await acquisitionLock.release();
          acquisitionLock = null;
        } catch (error) {
          await lock.release();
          throw error;
        }
      }
      return lock;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        await releaseLockIfPresent(acquisitionLock);
        throw error;
      }
      if (staleMs > 0) {
        const cleared = await clearStaleLock(params.lockPath, staleMs);
        await releaseLockIfPresent(acquisitionLock);
        acquisitionLock = null;
        if (cleared) {
          attempt -= 1;
          continue;
        }
      } else {
        await releaseLockIfPresent(acquisitionLock);
        acquisitionLock = null;
      }
      if (attempt >= maxAttempts) {
        throw params.createError(params.taskId, attempt);
      }
      await delay(Math.min(delayMs, maxDelayMs));
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw params.createError(params.taskId, attempt);
}

async function acquireStaleAwareAcquisitionLock(params: LockRetryParams): Promise<AcquiredLock> {
  const lockPath = `${params.lockPath}${STALE_AWARE_ACQUISITION_LOCK_SUFFIX}`;
  const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = params.retry;
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const ownerToken = randomUUID();
      const handle = await open(lockPath, 'wx+');
      try {
        await handle.writeFile(ownerToken, 'utf8');
      } catch (error) {
        await handle.close();
        await rm(lockPath, { force: true });
        throw error;
      }
      return createAcquiredLock(lockPath, ownerToken, handle, params.retry.staleMs ?? 0);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      const staleMs = params.retry.staleMs ?? 0;
      if (staleMs > 0) {
        const cleared = await clearStaleLock(lockPath, staleMs);
        if (cleared) {
          attempt -= 1;
          continue;
        }
      }
      if (attempt >= maxAttempts) {
        throw params.createError(params.taskId, attempt);
      }
      await delay(Math.min(delayMs, maxDelayMs));
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw params.createError(params.taskId, attempt);
}

async function releaseLockIfPresent(lock: AcquiredLock | null): Promise<void> {
  if (!lock) {
    return;
  }
  await lock.release();
}

function createAcquiredLock(
  lockPath: string,
  ownerToken: string,
  handle: FileHandle,
  staleMs: number
): AcquiredLock {
  let released = false;
  const keepalive = createLockKeepalive(handle, staleMs);
  return {
    lockPath,
    ownerToken,
    async release(): Promise<void> {
      if (released) {
        return;
      }
      released = true;
      keepalive.stop();
      await handle.close();
      await releaseLockIfOwned(lockPath, ownerToken);
    }
  };
}

function createLockKeepalive(handle: FileHandle, staleMs: number): { stop(): void } {
  if (staleMs <= 0) {
    return { stop() {} };
  }

  const intervalMs = Math.max(10, Math.floor(staleMs / 2));
  const timer = setInterval(() => {
    void touchLockHandle(handle);
  }, intervalMs);
  timer.unref?.();

  return {
    stop(): void {
      clearInterval(timer);
    }
  };
}

async function touchLockHandle(handle: FileHandle): Promise<void> {
  try {
    const now = new Date();
    await handle.utimes(now, now);
  } catch {
    // Ignore keepalive failures; acquisition/release paths still surface real errors.
  }
}

async function releaseLockIfOwned(lockPath: string, ownerToken: string): Promise<void> {
  try {
    const currentOwner = (await readFile(lockPath, 'utf8')).trim();
    if (currentOwner !== ownerToken) {
      return;
    }
    await rm(lockPath, { force: true });
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function clearStaleLock(lockPath: string, staleMs: number): Promise<boolean> {
  try {
    const stats = await stat(lockPath);
    const ageMs = Date.now() - stats.mtimeMs;
    if (!Number.isFinite(ageMs) || ageMs <= staleMs) {
      return false;
    }
    await rm(lockPath, { force: true });
    return true;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    return false;
  }
}
