import type { DesignToolkitArtifactRecord, DesignToolkitSummary } from './types.js';
import { sanitizeRelativeArtifactPath } from './artifactUtils.js';

const TOOLKIT_STAGE_SET = new Set<DesignToolkitArtifactRecord['stage']>([
  'extract',
  'tokens',
  'styleguide',
  'reference',
  'self-correct',
  'publish'
]);

const MAX_TOOLKIT_ARTIFACTS = 200;

export function mergeToolkitArtifacts(
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

export function sanitizeToolkitArtifactRecord(record: unknown): DesignToolkitArtifactRecord {
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

export function sanitizeToolkitSummary(summary: DesignToolkitSummary): DesignToolkitSummary {
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

export function sanitizeToolkitMetrics(record: Record<string, unknown> | undefined):
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

export function sanitizeToolkitNumericMetrics(record: Record<string, unknown> | undefined):
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
  return {
    id,
    actor,
    reason,
    timestamp
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
