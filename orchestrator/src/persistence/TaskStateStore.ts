import { mkdir, readFile, rename, writeFile, rm, open } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { RunSummary } from '../types.js';

export interface TaskStateStoreOptions {
  outDir?: string;
  runsDir?: string;
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

  constructor(options: TaskStateStoreOptions = {}) {
    this.outDir = options.outDir ?? join(process.cwd(), 'out');
    this.runsDir = options.runsDir ?? join(process.cwd(), '.runs');
  }

  async recordRun(summary: RunSummary): Promise<void> {
    const lockPath = this.buildLockPath(summary.taskId);
    await this.acquireLock(summary.taskId, lockPath);
    try {
      await this.ensureDirectory(this.outDir);
      const taskOutDir = join(this.outDir, summary.taskId);
      await this.ensureDirectory(taskOutDir);

      const snapshotPath = join(taskOutDir, 'state.json');
      const snapshot = await this.loadSnapshot(snapshotPath, summary.taskId);
      const updated = this.mergeSnapshot(snapshot, summary);
      await this.writeAtomic(snapshotPath, JSON.stringify(updated, null, 2));
    } finally {
      await this.releaseLock(lockPath);
    }
  }

  private buildLockPath(taskId: string): string {
    return join(this.runsDir, `${taskId}.lock`);
  }

  private async acquireLock(taskId: string, lockPath: string): Promise<void> {
    await this.ensureDirectory(dirname(lockPath));
    try {
      const handle = await open(lockPath, 'wx');
      await handle.close();
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new TaskStateStoreLockError(`Lock file already exists for task ${taskId}`, taskId);
      }
      throw error;
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
    const runs = snapshot.runs.filter((run) => run.runId !== summary.runId);
    runs.push(summary);
    runs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return {
      taskId: snapshot.taskId,
      lastRunAt: summary.timestamp,
      runs
    };
  }

  private async writeAtomic(destination: string, contents: string): Promise<void> {
    const tempPath = `${destination}.tmp-${Date.now()}`;
    await writeFile(tempPath, contents, 'utf-8');
    await rename(tempPath, destination);
  }
}
