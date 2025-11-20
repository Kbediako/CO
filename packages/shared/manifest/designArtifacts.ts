import type {
  DesignArtifactQuota,
  DesignArtifactRecord,
  DesignArtifactsSummary,
  DesignArtifactsSummaryStageEntry,
  DesignToolkitArtifactRecord,
  DesignToolkitSummary,
  ToolRunManifest
} from './types.js';
import type { PersistIOOptions } from './fileIO.js';
import { loadJsonManifest, resolveIO, writeJsonManifest } from './fileIO.js';
import { mergeToolkitArtifacts, sanitizeToolkitSummary } from './toolkitArtifacts.js';
import { coerceNonNegativeInteger, isIsoDate, sanitizeRelativeArtifactPath } from './artifactUtils.js';

const MAX_DESIGN_ARTIFACTS = 200;
const DESIGN_STAGE_SET = new Set<DesignArtifactRecord['stage']>([
  'extract',
  'reference',
  'components',
  'motion',
  'video',
  'visual-regression'
]);

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

export interface PersistDesignManifestOptions extends PersistIOOptions, DesignArtifactSanitizeOptions {}

export async function persistDesignManifest(
  manifestPath: string,
  update: DesignManifestUpdate,
  options: PersistDesignManifestOptions = {}
): Promise<ToolRunManifest> {
  const io = resolveIO(options);
  const manifest = (await loadJsonManifest<ToolRunManifest>(manifestPath, io)) ?? {};

  const merged = mergeDesignManifest(manifest, update, options);
  await writeJsonManifest(manifestPath, merged, io);
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

function sanitizeConfigSnapshot(snapshot: Record<string, unknown> | null): Record<string, unknown> | null {
  if (snapshot === null) {
    return null;
  }
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('design config snapshot must be an object or null');
  }
  return JSON.parse(JSON.stringify(snapshot));
}
