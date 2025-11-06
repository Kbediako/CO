import { mkdir, readFile, rename, writeFile, rm, open } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { RunSummary } from '../types.js';
import { sanitizeTaskId } from './sanitizeTaskId.js';

interface LockRetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

export interface TaskStateStoreOptions {
  outDir?: string;
  runsDir?: string;
  lockRetry?: Partial<LockRetryOptions>;
}

export interface StoredRunSummary extends RunSummary {}

export interface TaskStateSnapshot {
  taskId: string;
  lastRunAt: string;
  runs: StoredRunSummary[];
}

export class TaskStateStoreLockError extends Error {
  constructor(message: string, public readonly taskId: string) {
    super(message);
    this.name = 'TaskStateStoreLockError';
  }
}

/**
 * Persists orchestrator run history per task under `/out/<taskId>/state.json`.
 * Uses advisory lock files (`.runs/<taskId>.lock`) to guard concurrent writers
 * and performs atomic writes via temporary files + rename.
 */
export class TaskStateStore {
  private readonly outDir: string;
  private readonly runsDir: string;
  private readonly lockRetry: LockRetryOptions;

  constructor(options: TaskStateStoreOptions = {}) {
    this.outDir = options.outDir ?? join(process.cwd(), 'out');
    this.runsDir = options.runsDir ?? join(process.cwd(), '.runs');
    const defaults = {
      maxAttempts: 5,
      initialDelayMs: 100,
      backoffFactor: 2,
      maxDelayMs: 1000
    };
    this.lockRetry = { ...defaults, ...(options.lockRetry ?? {}) };
  }

  async recordRun(summary: RunSummary): Promise<void> {
    const safeTaskId = sanitizeTaskId(summary.taskId);
    const lockPath = this.buildLockPath(safeTaskId);
    await this.acquireLock(safeTaskId, lockPath);
    try {
      await this.ensureDirectory(this.outDir);
      const taskOutDir = join(this.outDir, safeTaskId);
      await this.ensureDirectory(taskOutDir);

      const snapshotPath = join(taskOutDir, 'state.json');
      const snapshot = await this.loadSnapshot(snapshotPath, safeTaskId);
      const updated = this.mergeSnapshot(snapshot, { ...summary, taskId: safeTaskId });
      await this.writeAtomic(snapshotPath, JSON.stringify(updated, null, 2));
    } finally {
      await this.releaseLock(lockPath);
    }
  }

  private buildLockPath(taskId: string): string {
    const safeTaskId = sanitizeTaskId(taskId);
    return join(this.runsDir, `${safeTaskId}.lock`);
  }

  private async acquireLock(taskId: string, lockPath: string): Promise<void> {
    await this.ensureDirectory(dirname(lockPath));
    const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = this.lockRetry;
    let attempt = 0;
    let delayMs = initialDelayMs;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const handle = await open(lockPath, 'wx');
        await handle.close();
        return;
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        if (attempt >= maxAttempts) {
          throw new TaskStateStoreLockError(
            `Failed to acquire task state lock for ${taskId} after ${attempt} attempts`,
            taskId
          );
        }
        await delay(Math.min(delayMs, maxDelayMs));
        delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
      }
    }
  }

  private async releaseLock(lockPath: string): Promise<void> {
    await rm(lockPath, { force: true });
  }

  private async ensureDirectory(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  private async loadSnapshot(path: string, taskId: string): Promise<TaskStateSnapshot> {
    try {
      const data = await readFile(path, 'utf-8');
      const parsed = JSON.parse(data) as TaskStateSnapshot;
      if (!parsed || parsed.taskId !== taskId) {
        throw new Error(`Invalid snapshot contents for task ${taskId}`);
      }
      return parsed;
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { taskId, lastRunAt: '', runs: [] };
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Corrupted snapshot at ${path}: ${error.message}`);
      }
      throw error;
    }
  }

  private mergeSnapshot(snapshot: TaskStateSnapshot, summary: RunSummary): TaskStateSnapshot {
    const runs = snapshot.runs;
    const existingIndex = runs.findIndex((run) => run.runId === summary.runId);
    if (existingIndex !== -1) {
      const updatedRuns = runs.slice();
      updatedRuns[existingIndex] = summary;
      updatedRuns.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const lastRunAt = updatedRuns.length > 0 ? updatedRuns[updatedRuns.length - 1]!.timestamp : snapshot.lastRunAt;
      return {
        taskId: snapshot.taskId,
        lastRunAt,
        runs: updatedRuns
      };
    }

    if (runs.length === 0) {
      runs.push(summary);
      return {
        taskId: snapshot.taskId,
        lastRunAt: summary.timestamp,
        runs
      };
    }

    const lastTimestamp = runs[runs.length - 1]!.timestamp;
    if (lastTimestamp.localeCompare(summary.timestamp) <= 0) {
      runs.push(summary);
      return {
        taskId: snapshot.taskId,
        lastRunAt: summary.timestamp,
        runs
      };
    }

    const insertIndex = this.findInsertIndex(runs, summary.timestamp);
    runs.splice(insertIndex, 0, summary);
    const lastRunAt = runs[runs.length - 1]!.timestamp;
    return {
      taskId: snapshot.taskId,
      lastRunAt,
      runs
    };
  }

  private findInsertIndex(runs: StoredRunSummary[], timestamp: string): number {
    let low = 0;
    let high = runs.length - 1;
    let result = runs.length;

    while (low <= high) {
      const mid = (low + high) >> 1;
      const candidate = runs[mid];
      if (!candidate) {
        break;
      }
      if (candidate.timestamp.localeCompare(timestamp) > 0) {
        result = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return result;
  }

  private async writeAtomic(destination: string, contents: string): Promise<void> {
    const tempPath = `${destination}.tmp-${Date.now()}`;
    await writeFile(tempPath, contents, 'utf-8');
    await rename(tempPath, destination);
  }
}
