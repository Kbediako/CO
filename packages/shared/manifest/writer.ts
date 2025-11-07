import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type {
  DesignArtifactQuota,
  DesignArtifactRecord,
  DesignArtifactsSummary,
  DesignArtifactsSummaryStageEntry,
  DesignToolkitArtifactRecord,
  DesignToolkitSummary,
  ToolRunEvent,
  ToolRunManifest,
  ToolRunRecord
} from './types.js';

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

const MAX_DESIGN_ARTIFACTS = 200;
const DESIGN_STAGE_SET = new Set<DesignArtifactRecord['stage']>([
  'extract',
  'reference',
  'components',
  'motion',
  'video',
  'visual-regression'
]);

const TOOLKIT_STAGE_SET = new Set<DesignToolkitArtifactRecord['stage']>([
  'extract',
  'tokens',
  'styleguide',
  'reference',
  'self-correct',
  'publish'
]);

const MAX_TOOLKIT_ARTIFACTS = 200;

interface DesignArtifactSanitizeOptions {
  retentionDays?: number;
  retentionPolicy?: string;
  now?: Date;
}

export interface DesignManifestUpdate {
  artifacts?: DesignArtifactRecord[];
  summary?: DesignArtifactsSummary | null;
  configSnapshot?: Record<string, unknown> | null;
  toolkitArtifacts?: DesignToolkitArtifactRecord[];
  toolkitSummary?: DesignToolkitSummary | null;
}

export interface PersistDesignManifestOptions extends PersistToolRunOptions, DesignArtifactSanitizeOptions {}

export async function persistDesignManifest(
  manifestPath: string,
  update: DesignManifestUpdate,
  options: PersistDesignManifestOptions = {}
): Promise<ToolRunManifest> {
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

  const merged = mergeDesignManifest(manifest, update, options);
  const serialized = JSON.stringify(merged, null, 2);
  await write(manifestPath, `${serialized}\n`);
  return merged;
}

function mergeDesignManifest(
  manifest: ToolRunManifest,
  update: DesignManifestUpdate,
  options: DesignArtifactSanitizeOptions
): ToolRunManifest {
  let merged = { ...manifest };

  if (update.configSnapshot !== undefined) {
    merged = {
      ...merged,
      design_config_snapshot: sanitizeConfigSnapshot(update.configSnapshot)
    };
  }

  if (update.artifacts && update.artifacts.length > 0) {
    merged = {
      ...merged,
      design_artifacts: mergeDesignArtifacts(
        Array.isArray(manifest.design_artifacts) ? manifest.design_artifacts : [],
        update.artifacts,
        options
      )
    };
  }

  if (update.summary !== undefined) {
    merged = {
      ...merged,
      design_artifacts_summary:
        update.summary === null ? undefined : sanitizeDesignArtifactsSummary(update.summary)
    };
  }

  if (update.toolkitArtifacts && update.toolkitArtifacts.length > 0) {
    merged = {
      ...merged,
      design_toolkit_artifacts: mergeToolkitArtifacts(
        Array.isArray(manifest.design_toolkit_artifacts) ? manifest.design_toolkit_artifacts : [],
        update.toolkitArtifacts
      )
    };
  }

  if (update.toolkitSummary !== undefined) {
    merged = {
      ...merged,
      design_toolkit_summary:
        update.toolkitSummary === null ? undefined : sanitizeToolkitSummary(update.toolkitSummary)
    };
  }

  return merged;
}

function mergeDesignArtifacts(
  existing: DesignArtifactRecord[],
  incoming: DesignArtifactRecord[],
  options: DesignArtifactSanitizeOptions
): DesignArtifactRecord[] {
  const sanitizedExisting = existing
    .map((entry) => {
      try {
        return sanitizeDesignArtifactRecord(entry, options, false);
      } catch {
        return null;
      }
    })
    .filter((entry): entry is DesignArtifactRecord => entry !== null);

  const merged = [...sanitizedExisting];
  for (const record of incoming) {
    const sanitized = sanitizeDesignArtifactRecord(record, options, true);
    const index = merged.findIndex(
      (entry) =>
        entry.stage === sanitized.stage &&
        entry.relative_path === sanitized.relative_path &&
        (sanitized.type ? entry.type === sanitized.type : true)
    );
    if (index >= 0) {
      merged[index] = { ...merged[index], ...sanitized };
    } else {
      merged.push(sanitized);
    }
  }

  if (merged.length > MAX_DESIGN_ARTIFACTS) {
    return merged.slice(-MAX_DESIGN_ARTIFACTS);
  }
  return merged;
}

function mergeToolkitArtifacts(
  existing: DesignToolkitArtifactRecord[],
  incoming: DesignToolkitArtifactRecord[]
): DesignToolkitArtifactRecord[] {
  const sanitizedExisting = existing
    .map((entry) => {
      try {
        return sanitizeToolkitArtifactRecord(entry);
      } catch {
        return null;
      }
    })
    .filter((entry): entry is DesignToolkitArtifactRecord => entry !== null);

  const merged = [...sanitizedExisting];
  for (const record of incoming) {
    const sanitized = sanitizeToolkitArtifactRecord(record);
    const index = merged.findIndex(
      (entry) =>
        entry.id === sanitized.id &&
        entry.stage === sanitized.stage &&
        entry.relative_path === sanitized.relative_path
    );
    if (index >= 0) {
      merged[index] = { ...merged[index], ...sanitized };
    } else {
      merged.push(sanitized);
    }
  }

  if (merged.length > MAX_TOOLKIT_ARTIFACTS) {
    return merged.slice(-MAX_TOOLKIT_ARTIFACTS);
  }
  return merged;
}

function sanitizeDesignArtifactRecord(
  record: unknown,
  options: DesignArtifactSanitizeOptions,
  applyDefaults: boolean
): DesignArtifactRecord {
  if (!record || typeof record !== 'object') {
    throw new Error('design artifact record must be an object');
  }
  const input = record as Record<string, unknown>;
  const stage = input.stage;
  if (typeof stage !== 'string' || !DESIGN_STAGE_SET.has(stage as DesignArtifactRecord['stage'])) {
    throw new Error(`invalid design artifact stage '${String(stage)}'`);
  }
  const status = input.status;
  if (status !== 'succeeded' && status !== 'skipped' && status !== 'failed') {
    throw new Error(`invalid design artifact status '${String(status)}'`);
  }
  const relativePathRaw = input.relative_path;
  if (typeof relativePathRaw !== 'string') {
    throw new Error('design artifact must include a relative_path string');
  }
  const sanitized: DesignArtifactRecord = {
    stage: stage as DesignArtifactRecord['stage'],
    status: status as DesignArtifactRecord['status'],
    relative_path: sanitizeRelativeArtifactPath(relativePathRaw)
  };

  if (typeof input.type === 'string' && input.type.trim().length > 0) {
    sanitized.type = input.type.trim();
  }
  if (typeof input.description === 'string' && input.description.trim().length > 0) {
    sanitized.description = input.description.trim();
  }
  if (Array.isArray(input.privacy_notes)) {
    const notes = input.privacy_notes
      .map((note) => (typeof note === 'string' ? note.trim() : ''))
      .filter((note) => note.length > 0);
    if (notes.length > 0) {
      sanitized.privacy_notes = notes.slice(0, 20);
    }
  }
  if (typeof input.config_hash === 'string' && input.config_hash.trim().length > 0) {
    sanitized.config_hash = input.config_hash.trim();
  }
  if (input.metadata && typeof input.metadata === 'object') {
    sanitized.metadata = JSON.parse(JSON.stringify(input.metadata));
  }

  if (Array.isArray(input.approvals)) {
    const approvals = input.approvals
      .map((entry) => sanitizeApprovalRecord(entry))
      .filter((entry): entry is NonNullable<ReturnType<typeof sanitizeApprovalRecord>> => entry !== null);
    if (approvals.length > 0) {
      sanitized.approvals = approvals;
    }
  }

  if (input.quota && typeof input.quota === 'object') {
    const quota = sanitizeQuotaRecord(input.quota);
    if (quota) {
      sanitized.quota = quota;
    }
  }

  if (input.expiry && typeof input.expiry === 'object') {
    const expiry = sanitizeExpiryRecord(input.expiry);
    if (expiry) {
      sanitized.expiry = expiry;
    }
  } else if (applyDefaults && options.retentionDays !== undefined) {
    sanitized.expiry = computeExpiryRecord(options.retentionDays, options.retentionPolicy, options.now);
  }

  return sanitized;
}

function sanitizeToolkitArtifactRecord(record: unknown): DesignToolkitArtifactRecord {
  if (!record || typeof record !== 'object') {
    throw new Error('design toolkit artifact record must be an object');
  }
  const input = record as Record<string, unknown>;
  const id = coerceToolkitString(input.id);
  if (!id) {
    throw new Error('design toolkit artifact record must include an id');
  }
  const stage = input.stage;
  if (typeof stage !== 'string' || !TOOLKIT_STAGE_SET.has(stage as DesignToolkitArtifactRecord['stage'])) {
    throw new Error(`invalid design toolkit artifact stage '${String(stage)}'`);
  }
  const status = input.status;
  if (status !== 'succeeded' && status !== 'failed' && status !== 'skipped') {
    throw new Error(`invalid design toolkit artifact status '${String(status)}'`);
  }
  const path = coerceToolkitString(input.relative_path);
  if (!path) {
    throw new Error('design toolkit artifact must include a relative_path string');
  }

  const artifact: DesignToolkitArtifactRecord = {
    id,
    stage: stage as DesignToolkitArtifactRecord['stage'],
    status: status as DesignToolkitArtifactRecord['status'],
    relative_path: sanitizeRelativeArtifactPath(path)
  };

  const description = coerceToolkitString(input.description);
  if (description) {
    artifact.description = description;
  }

  if (Array.isArray(input.approvals)) {
    const approvals = input.approvals
      .map((entry) => sanitizeApprovalRecord(entry))
      .filter((entry): entry is NonNullable<ReturnType<typeof sanitizeApprovalRecord>> => Boolean(entry));
    if (approvals.length > 0) {
      artifact.approvals = approvals;
    }
  }

  if (input.retention && typeof input.retention === 'object') {
    const retention = input.retention as Record<string, unknown>;
    const days = coerceNumber(retention.days, null, {
      min: 1
    });
    const expiry = coerceToolkitString(retention.expiry);
    if (days !== null && expiry) {
      artifact.retention = {
        days,
        autoPurge: coerceBoolean(retention.auto_purge ?? retention.autoPurge, false),
        expiry,
        policy: coerceToolkitString(retention.policy) ?? undefined
      };
    }
  }

  if (input.metrics && typeof input.metrics === 'object') {
    artifact.metrics = sanitizeToolkitMetrics(input.metrics as Record<string, unknown>);
  }

  if (Array.isArray(input.privacy_notes)) {
    const notes = input.privacy_notes
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);
    if (notes.length > 0) {
      artifact.privacy_notes = notes.slice(0, 10);
    }
  }

  return artifact;
}

function sanitizeToolkitSummary(summary: DesignToolkitSummary): DesignToolkitSummary {
  const stages = (summary.stages ?? []).map((entry) => {
    const artifacts = Number(entry.artifacts ?? 0);
    return {
      stage: entry.stage,
      artifacts: Number.isFinite(artifacts) && artifacts >= 0 ? artifacts : 0,
      metrics: sanitizeToolkitMetrics(entry.metrics as Record<string, unknown>),
      notes: Array.isArray(entry.notes)
        ? entry.notes.map((note) => (typeof note === 'string' ? note.trim() : '')).filter((note) => note.length > 0)
        : undefined
    };
  });

  const approvals = Array.isArray(summary.approvals)
    ? summary.approvals
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    : undefined;

  return {
    generated_at: coerceToolkitString(summary.generated_at) ?? new Date().toISOString(),
    stages,
    totals: sanitizeToolkitNumericMetrics(summary.totals as Record<string, unknown>),
    approvals
  };
}

function coerceToolkitString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function coerceNumber(value: unknown, fallback: number | null, options: { min?: number } = {}): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const numeric = options.min !== undefined ? Math.max(options.min, value) : value;
    return numeric;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return options.min !== undefined ? Math.max(options.min, parsed) : parsed;
    }
  }
  return fallback ?? null;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function sanitizeToolkitMetrics(record: Record<string, unknown> | undefined):
  | Record<string, number | string>
  | undefined {
  if (!record || typeof record !== 'object') {
    return undefined;
  }
  const sanitized: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!key) {
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        sanitized[key] = trimmed;
      }
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeToolkitNumericMetrics(record: Record<string, unknown> | undefined):
  | Record<string, number>
  | undefined {
  if (!record || typeof record !== 'object') {
    return undefined;
  }
  const sanitized: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!key) {
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
    }
  }
  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeApprovalRecord(entry: unknown) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const actor = typeof record.actor === 'string' ? record.actor.trim() : '';
  const reason = typeof record.reason === 'string' ? record.reason.trim() : '';
  const timestamp = typeof record.timestamp === 'string' ? record.timestamp.trim() : '';
  if (!id || !actor || !timestamp) {
    return null;
  }
  if (!isIsoDate(timestamp)) {
    throw new Error(`approval timestamp '${timestamp}' is not a valid ISO date`);
  }
  return {
    id,
    actor,
    reason,
    timestamp
  };
}

function sanitizeQuotaRecord(entry: unknown) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const type = record.type === 'storage' || record.type === 'runtime' ? record.type : null;
  const unit = record.unit === 'MB' || record.unit === 'seconds' ? record.unit : null;
  const limit = typeof record.limit === 'number' ? record.limit : Number(record.limit ?? NaN);
  if (!type || !unit || !Number.isFinite(limit)) {
    return null;
  }
  const sanitized: DesignArtifactQuota = {
    type,
    unit,
    limit: limit < 0 ? 0 : limit
  };
  const consumedValue = typeof record.consumed === 'number' ? record.consumed : Number(record.consumed ?? NaN);
  if (Number.isFinite(consumedValue)) {
    sanitized.consumed = consumedValue < 0 ? 0 : consumedValue;
  }
  return sanitized;
}

function sanitizeExpiryRecord(entry: unknown) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const date = typeof record.date === 'string' ? record.date.trim() : '';
  const policy = typeof record.policy === 'string' ? record.policy.trim() : '';
  if (!date || !policy) {
    return null;
  }
  if (!isIsoDate(date)) {
    throw new Error(`expiry date '${date}' must be ISO-8601 formatted`);
  }
  return { date, policy };
}

function computeExpiryRecord(
  retentionDays: number,
  policy: string | undefined,
  now: Date | undefined
) {
  const base = now ?? new Date();
  const ms = base.getTime() + Math.max(0, retentionDays) * 24 * 60 * 60 * 1000;
  return {
    date: new Date(ms).toISOString(),
    policy: policy ?? 'design.config.retention'
  };
}

function sanitizeDesignArtifactsSummary(summary: DesignArtifactsSummary): DesignArtifactsSummary {
  if (!summary || typeof summary !== 'object') {
    throw new Error('design artifacts summary must be an object');
  }
  const total = typeof summary.total_artifacts === 'number' ? summary.total_artifacts : Number(summary.total_artifacts ?? NaN);
  if (!Number.isFinite(total) || total < 0) {
    throw new Error('design artifacts summary requires a non-negative total_artifacts');
  }
  const generatedAt = typeof summary.generated_at === 'string' ? summary.generated_at : '';
  if (!isIsoDate(generatedAt)) {
    throw new Error('design artifacts summary generated_at must be ISO-8601 formatted');
  }

  const stages = Array.isArray(summary.stages)
    ? summary.stages
        .map((stage) => sanitizeSummaryStage(stage))
        .filter((entry): entry is NonNullable<ReturnType<typeof sanitizeSummaryStage>> => entry !== null)
    : [];

  const sanitized: DesignArtifactsSummary = {
    total_artifacts: Math.floor(total),
    generated_at: generatedAt,
    stages
  };

  if (typeof summary.storage_bytes === 'number') {
    sanitized.storage_bytes = summary.storage_bytes < 0 ? 0 : Math.floor(summary.storage_bytes);
  }
  if (Array.isArray(summary.errors)) {
    const errors = summary.errors
      .map((err) => (typeof err === 'string' ? err.trim() : ''))
      .filter((err) => err.length > 0);
    if (errors.length > 0) {
      sanitized.errors = errors;
    }
  }
  return sanitized;
}

function sanitizeSummaryStage(entry: unknown) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const stage = record.stage;
  if (typeof stage !== 'string' || !DESIGN_STAGE_SET.has(stage as DesignArtifactRecord['stage'])) {
    return null;
  }
  const succeededValue = coerceNonNegativeInteger(record.succeeded) ?? 0;
  const failedValue = coerceNonNegativeInteger(record.failed) ?? 0;
  const skippedValue = coerceNonNegativeInteger(record.skipped) ?? 0;
  const artifactsValue = coerceNonNegativeInteger(record.artifacts);

  const sanitized: DesignArtifactsSummaryStageEntry = {
    stage: stage as DesignArtifactRecord['stage'],
    succeeded: succeededValue,
    failed: failedValue,
    skipped: skippedValue
  };
  if (artifactsValue !== null) {
    sanitized.artifacts = artifactsValue;
  }
  if (Array.isArray(record.notes)) {
    const notes = record.notes
      .map((note) => (typeof note === 'string' ? note.trim() : ''))
      .filter((note) => note.length > 0);
    if (notes.length > 0) {
      sanitized.notes = notes;
    }
  }
  return sanitized;
}

function coerceNonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'number' || typeof value === 'string') {
    const converted = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(converted) && converted >= 0) {
      return Math.floor(converted);
    }
  }
  return null;
}

function sanitizeConfigSnapshot(snapshot: Record<string, unknown> | null): Record<string, unknown> | null {
  if (snapshot === null) {
    return null;
  }
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('design config snapshot must be an object or null');
  }
  return JSON.parse(JSON.stringify(snapshot));
}

function sanitizeRelativeArtifactPath(value: string): string {
  const normalized = value.replace(/\\+/g, '/').split('/');
  const segments: string[] = [];
  for (const segmentRaw of normalized) {
    const segment = segmentRaw.trim();
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..' || segment.includes('..')) {
      throw new Error(`relative_path contains invalid segment '${segment}'`);
    }
    segments.push(segment);
  }
  if (segments.length === 0) {
    throw new Error('relative_path must include at least one segment');
  }
  return segments.join('/');
}

function isIsoDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}
