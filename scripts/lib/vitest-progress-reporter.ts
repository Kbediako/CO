import { relative, sep } from 'node:path';

import type { File, TaskResultPack } from '@vitest/runner';
import type { Reporter } from 'vitest/reporters';

export const DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS = 30_000;
export const DEFAULT_VITEST_PROGRESS_REPEAT_AFTER_MS = 60_000;
const DEFAULT_VITEST_PROGRESS_POLL_INTERVAL_MS = 1_000;

type IntervalHandle = ReturnType<typeof setInterval>;
type SetIntervalLike = (callback: () => void, delayMs: number) => IntervalHandle;
type ClearIntervalLike = (handle: IntervalHandle) => void;
type CollectedFile = Pick<File, 'id' | 'filepath'>;

interface ActiveFileState {
  startedAtMs: number;
  lastReportedAtMs: number | null;
}

export interface VitestProgressReporterOptions {
  announceAfterMs?: number;
  repeatAfterMs?: number;
  pollIntervalMs?: number;
  cwd?: string;
  now?: () => number;
  setIntervalFn?: SetIntervalLike;
  clearIntervalFn?: ClearIntervalLike;
  writeLine?: (line: string) => void;
}

export class VitestProgressTracker {
  private readonly announceAfterMs: number;
  private readonly repeatAfterMs: number;
  private readonly pollIntervalMs: number;
  private readonly cwd: string;
  private readonly now: () => number;
  private readonly setIntervalFn: SetIntervalLike;
  private readonly clearIntervalFn: ClearIntervalLike;
  private readonly writeLine: (line: string) => void;
  private readonly filePathsById = new Map<string, string>();
  private readonly activeFilesById = new Map<string, ActiveFileState>();
  private pollHandle: IntervalHandle | null = null;

  constructor(options: VitestProgressReporterOptions = {}) {
    this.announceAfterMs = options.announceAfterMs ?? DEFAULT_VITEST_PROGRESS_ANNOUNCE_AFTER_MS;
    this.repeatAfterMs = options.repeatAfterMs ?? DEFAULT_VITEST_PROGRESS_REPEAT_AFTER_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_VITEST_PROGRESS_POLL_INTERVAL_MS;
    this.cwd = options.cwd ?? process.cwd();
    this.now = options.now ?? Date.now;
    this.setIntervalFn = options.setIntervalFn ?? setInterval;
    this.clearIntervalFn = options.clearIntervalFn ?? clearInterval;
    this.writeLine = options.writeLine ?? ((line) => process.stdout.write(`${line}\n`));
  }

  onCollected(files?: CollectedFile[]): void {
    for (const file of files ?? []) {
      this.filePathsById.set(file.id, normalizeFilePath(file.filepath, this.cwd));
    }
  }

  onTaskUpdate(packs: TaskResultPack[]): void {
    for (const [id, result] of packs) {
      if (!this.filePathsById.has(id)) {
        continue;
      }

      if (result?.state === 'run') {
        this.activeFilesById.set(id, this.activeFilesById.get(id) ?? {
          startedAtMs: this.now(),
          lastReportedAtMs: null
        });
        continue;
      }

      if (result?.state) {
        this.activeFilesById.delete(id);
      }
    }

    this.syncPolling();
  }

  onFinished(): void {
    this.resetState({ keepCollectedFiles: true });
  }

  onWatcherStart(): void {
    this.resetState();
  }

  onWatcherRerun(): void {
    this.resetState();
  }

  onTestRemoved(): void {
    this.resetState();
  }

  private syncPolling(): void {
    if (this.activeFilesById.size === 0) {
      this.stopPolling();
      return;
    }

    if (this.pollHandle) {
      return;
    }

    this.pollHandle = this.setIntervalFn(() => this.reportSlowFiles(), this.pollIntervalMs);
  }

  private stopPolling(): void {
    if (!this.pollHandle) {
      return;
    }

    this.clearIntervalFn(this.pollHandle);
    this.pollHandle = null;
  }

  private resetState(options: { keepCollectedFiles?: boolean } = {}): void {
    this.stopPolling();
    this.activeFilesById.clear();

    if (!options.keepCollectedFiles) {
      this.filePathsById.clear();
    }
  }

  private reportSlowFiles(): void {
    const nowMs = this.now();
    const dueFiles = Array.from(this.activeFilesById.entries())
      .filter(([, state]) => {
        const elapsedMs = nowMs - state.startedAtMs;
        if (elapsedMs < this.announceAfterMs) {
          return false;
        }

        return state.lastReportedAtMs === null || nowMs - state.lastReportedAtMs >= this.repeatAfterMs;
      })
      .sort((left, right) => left[1].startedAtMs - right[1].startedAtMs)
      .map(([id]) => id);

    if (dueFiles.length === 0) {
      return;
    }

    const parts = dueFiles.map((id) => {
      const state = this.activeFilesById.get(id);
      const path = this.filePathsById.get(id);
      if (!state || !path) {
        return null;
      }

      state.lastReportedAtMs = nowMs;
      return `${path} (${formatElapsed(nowMs - state.startedAtMs)})`;
    });

    const activePaths = parts.filter((part): part is string => Boolean(part));
    if (activePaths.length === 0) {
      return;
    }

    this.writeLine(`[vitest-progress] still running: ${activePaths.join(', ')}`);
  }
}

class VitestProgressReporter implements Reporter {
  private readonly tracker: VitestProgressTracker;

  constructor(options: VitestProgressReporterOptions = {}) {
    this.tracker = new VitestProgressTracker(options);
  }

  onCollected(files?: File[]): void {
    this.tracker.onCollected(files);
  }

  onTaskUpdate(packs: TaskResultPack[]): void {
    this.tracker.onTaskUpdate(packs);
  }

  onFinished(): void {
    this.tracker.onFinished();
  }

  onWatcherStart(): void {
    this.tracker.onWatcherStart();
  }

  onWatcherRerun(): void {
    this.tracker.onWatcherRerun();
  }

  onTestRemoved(): void {
    this.tracker.onTestRemoved();
  }
}

export function createVitestProgressReporter(
  options: VitestProgressReporterOptions = {}
): Reporter {
  return new VitestProgressReporter(options);
}

function normalizeFilePath(filepath: string, cwd: string): string {
  const relativePath = relative(cwd, filepath);
  if (relativePath && !relativePath.startsWith('..')) {
    return relativePath.split(sep).join('/');
  }

  return filepath.split(sep).join('/');
}

function formatElapsed(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return seconds === 0 ? `${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
