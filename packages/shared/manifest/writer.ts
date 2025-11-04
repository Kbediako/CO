import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ToolRunEvent, ToolRunManifest, ToolRunRecord } from './types.js';

export interface PersistToolRunOptions {
  read?: (path: string, encoding: 'utf-8') => Promise<string>;
  write?: (path: string, data: string) => Promise<void>;
  ensureDir?: (path: string) => Promise<void>;
}

export function sanitizeToolRunRecord(record: ToolRunRecord): ToolRunRecord {
  const { metadata, ...rest } = record;
  const sanitized: ToolRunRecord = {
    ...rest,
    metadata: metadata ? { ...metadata } : undefined,
    events: record.events ? record.events.map(sanitizeToolRunEvent) : undefined
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

export function sanitizeToolRunEvent(event: ToolRunEvent): ToolRunEvent {
  if (!event.timestamp) {
    throw new Error('Tool run events must include a timestamp.');
  }
  if (!event.correlationId) {
    throw new Error('Tool run events must include a correlationId.');
  }
  if (event.attempt < 1) {
    throw new Error('Tool run events must reference an attempt greater than or equal to 1.');
  }

  switch (event.type) {
    case 'exec:begin':
      return { ...event };
    case 'exec:chunk':
      if (event.sequence < 1) {
        throw new Error('exec:chunk events must have a positive sequence value.');
      }
      if (event.bytes < 0) {
        throw new Error('exec:chunk events must report a non-negative byte count.');
      }
      return { ...event };
    case 'exec:end':
      return { ...event };
    case 'exec:retry':
      if (event.delayMs < 0) {
        throw new Error('exec:retry events must report a non-negative delay.');
      }
      return { ...event };
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
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
