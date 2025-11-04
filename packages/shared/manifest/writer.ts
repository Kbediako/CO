import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ToolRunManifest, ToolRunRecord } from './types.js';

export interface PersistToolRunOptions {
  read?: (path: string, encoding: 'utf-8') => Promise<string>;
  write?: (path: string, data: string) => Promise<void>;
  ensureDir?: (path: string) => Promise<void>;
}

export function sanitizeToolRunRecord(record: ToolRunRecord): ToolRunRecord {
  const { metadata, ...rest } = record;
  const sanitized: ToolRunRecord = {
    ...rest,
    metadata: metadata ? { ...metadata } : undefined
  };
  if (!sanitized.id) {
    throw new Error('Tool run record must include an id.');
  }
  if (!sanitized.tool) {
    throw new Error(`Tool run ${sanitized.id} must include a tool identifier.`);
  }
  if (sanitized.retryCount < 0) {
    sanitized.retryCount = 0;
  }
  if (sanitized.attemptCount < 1) {
    sanitized.attemptCount = 1;
  }
  return sanitized;
}

export function mergeToolRunRecord(manifest: ToolRunManifest, record: ToolRunRecord): ToolRunManifest {
  const sanitized = sanitizeToolRunRecord(record);
  const existingRuns = Array.isArray(manifest.toolRuns) ? [...manifest.toolRuns] : [];
  const index = existingRuns.findIndex((entry) => entry.id === sanitized.id);

  if (index >= 0) {
    existingRuns[index] = { ...existingRuns[index], ...sanitized };
  } else {
    existingRuns.push(sanitized);
  }

  return { ...manifest, toolRuns: existingRuns };
}

export async function persistToolRunRecord(
  manifestPath: string,
  record: ToolRunRecord,
  options: PersistToolRunOptions = {}
): Promise<ToolRunRecord> {
  const read = options.read ?? ((path, encoding) => readFile(path, { encoding }));
  const write = options.write ?? ((path, data) => writeFile(path, data, { encoding: 'utf-8' }));
  const ensureDir =
    options.ensureDir ??
    (async (path: string) => {
      await mkdir(path, { recursive: true });
    });

  let manifest: ToolRunManifest = {};
  try {
    const raw = await read(manifestPath, 'utf-8');
    manifest = JSON.parse(raw) as ToolRunManifest;
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (!err || err.code !== 'ENOENT') {
      throw error;
    }
    await ensureDir(dirname(manifestPath));
  }

  const merged = mergeToolRunRecord(manifest, record);
  const serialized = JSON.stringify(merged, null, 2);
  await write(manifestPath, `${serialized}\n`);
  return merged.toolRuns!.find((entry) => entry.id === record.id)!;
}
