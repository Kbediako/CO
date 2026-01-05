import { open, rm, stat } from 'node:fs/promises';
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

export async function acquireLockWithRetry(params: LockRetryParams): Promise<void> {
  await params.ensureDirectory();
  const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = params.retry;
  const staleMs = params.retry.staleMs ?? 0;
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const handle = await open(params.lockPath, 'wx');
      await handle.close();
      return;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      if (staleMs > 0) {
        const cleared = await clearStaleLock(params.lockPath, staleMs);
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
