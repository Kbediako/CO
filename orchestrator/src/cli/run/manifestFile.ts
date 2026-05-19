import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { acquireLockWithRetry } from '../../persistence/lockFile.js';
import { writeJsonAtomic } from '../utils/fs.js';

export type RunManifestMissingMode = 'create' | 'skip' | 'error';

export interface RunManifestSnapshotPreserveContext {
  field: string;
  currentValue: unknown;
  snapshotValue: unknown;
  current: Record<string, unknown>;
  snapshot: Record<string, unknown>;
}

export type RunManifestSnapshotPreserveRule =
  | string
  | {
      field: string;
      preserveCurrent?: (context: RunManifestSnapshotPreserveContext) => boolean;
    };

export interface RunManifestFileWriteOptions {
  taskId?: string | null;
  missing?: RunManifestMissingMode;
  preserveCurrentFields?: readonly RunManifestSnapshotPreserveRule[];
  preserveCurrentFieldsWhenSnapshotNull?: readonly RunManifestSnapshotPreserveRule[];
}

export interface RunManifestFileWriteResult {
  changed: boolean;
  skipped: boolean;
  manifest: Record<string, unknown> | null;
}

const MANIFEST_LOCK_RETRY = {
  maxAttempts: 10,
  initialDelayMs: 10,
  backoffFactor: 2,
  maxDelayMs: 250,
  staleMs: 30_000
} as const;

export async function patchRunManifestFile(
  manifestPath: string,
  patch: (manifest: Record<string, unknown>) => boolean | void,
  options: RunManifestFileWriteOptions = {}
): Promise<RunManifestFileWriteResult> {
  return withRunManifestLock(manifestPath, options, async () => {
    const manifest = await readRunManifestObject(manifestPath, options.missing ?? 'error');
    if (manifest === null) {
      return { changed: false, skipped: true, manifest: null };
    }

    const before = JSON.stringify(manifest);
    const patchChanged = patch(manifest);
    const changed = typeof patchChanged === 'boolean'
      ? patchChanged
      : before !== JSON.stringify(manifest);
    if (changed) {
      await writeJsonAtomic(manifestPath, manifest);
    }
    return { changed, skipped: false, manifest };
  });
}

export async function writeRunManifestSnapshot(
  manifestPath: string,
  snapshot: Record<string, unknown>,
  options: RunManifestFileWriteOptions = {}
): Promise<RunManifestFileWriteResult> {
  return withRunManifestLock(manifestPath, options, async () => {
    const current = await readRunManifestObject(manifestPath, options.missing ?? 'create');
    if (current === null) {
      return { changed: false, skipped: true, manifest: null };
    }

    const next = mergeRunManifestSnapshot(current, snapshot, options);
    const changed = JSON.stringify(current) !== JSON.stringify(next);
    if (changed) {
      await writeJsonAtomic(manifestPath, next);
    }
    return { changed, skipped: false, manifest: next };
  });
}

function mergeRunManifestSnapshot(
  current: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  options: Pick<RunManifestFileWriteOptions, 'preserveCurrentFields' | 'preserveCurrentFieldsWhenSnapshotNull'>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current, ...snapshot };
  applyRunManifestSnapshotPreserveRules(next, current, snapshot, options.preserveCurrentFields ?? [], {
    requireSnapshotNull: false
  });
  applyRunManifestSnapshotPreserveRules(
    next,
    current,
    snapshot,
    options.preserveCurrentFieldsWhenSnapshotNull ?? [],
    { requireSnapshotNull: true }
  );
  return next;
}

function applyRunManifestSnapshotPreserveRules(
  next: Record<string, unknown>,
  current: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  rules: readonly RunManifestSnapshotPreserveRule[],
  options: { requireSnapshotNull: boolean }
): void {
  for (const rule of rules) {
    const field = typeof rule === 'string' ? rule : rule.field;
    const currentValue = current[field];
    const snapshotValue = snapshot[field];
    if (
      Object.prototype.hasOwnProperty.call(current, field) &&
      Object.prototype.hasOwnProperty.call(snapshot, field) &&
      (!options.requireSnapshotNull || snapshotValue === null) &&
      currentValue !== null &&
      currentValue !== undefined &&
      (typeof rule === 'string' ||
        !rule.preserveCurrent ||
        rule.preserveCurrent({ field, currentValue, snapshotValue, current, snapshot }))
    ) {
      next[field] = currentValue;
    }
  }
}

async function withRunManifestLock<T>(
  manifestPath: string,
  options: Pick<RunManifestFileWriteOptions, 'taskId'>,
  operation: () => Promise<T>
): Promise<T> {
  const lockPath = `${manifestPath}.lock`;
  const taskId = options.taskId ?? 'run-manifest';
  const lock = await acquireLockWithRetry({
    taskId,
    lockPath,
    retry: MANIFEST_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(lockPath), { recursive: true });
    },
    createError: (lockTaskId, attempts) =>
      new Error(`Failed to acquire run manifest lock for ${manifestPath} after ${attempts} attempts (${lockTaskId}).`)
  });
  try {
    return await operation();
  } finally {
    await lock.release();
  }
}

async function readRunManifestObject(
  manifestPath: string,
  missing: RunManifestMissingMode
): Promise<Record<string, unknown> | null> {
  let raw: string;
  try {
    raw = await readFile(manifestPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (missing === 'skip') {
        return null;
      }
      if (missing === 'create') {
        return {};
      }
    }
    throw error;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`Run manifest at ${manifestPath} is not a JSON object.`);
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
