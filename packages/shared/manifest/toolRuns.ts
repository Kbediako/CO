import type { ToolRunEvent, ToolRunManifest, ToolRunRecord } from './types.js';
import type { PersistIOOptions } from './fileIO.js';
import { loadJsonManifest, resolveIO, writeJsonManifest } from './fileIO.js';

export type PersistToolRunOptions = PersistIOOptions;

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
    case 'exec:chunk': {
      const sequence = event.sequence ?? null;
      if (sequence === null || sequence < 1) {
        throw new Error('exec:chunk events must have a positive sequence value.');
      }
      const bytes = event.bytes ?? null;
      if (bytes !== null && bytes < 0) {
        throw new Error('exec:chunk events must report a non-negative byte count.');
      }
      return { ...event, sequence, bytes };
    }
    case 'exec:end':
      return { ...event };
    case 'exec:retry': {
      const delayMs = event.delayMs ?? null;
      if (delayMs !== null && delayMs < 0) {
        throw new Error('exec:retry events must report a non-negative delay.');
      }
      return { ...event, delayMs };
    }
    default:
      return { ...event };
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
  const io = resolveIO(options);
  const manifest = (await loadJsonManifest<ToolRunManifest>(manifestPath, io)) ?? {};

  const merged = mergeToolRunRecord(manifest, record);
  await writeJsonManifest(manifestPath, merged, io);
  return merged.toolRuns!.find((entry) => entry.id === record.id)!;
}
