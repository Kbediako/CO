import type {
  DesignArtifactQuota,
  DesignArtifactRecord,
  DesignArtifactsSummary,
  DesignArtifactsSummaryStageEntry,
  DesignGuardrailRecord,
  DesignHistoryRecord,
  DesignMetricRecord,
  DesignPlanRecord,
  DesignStyleOverlapBreakdown,
  DesignStyleProfileMetadata,
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
  'visual-regression',
  'style-ingestion',
  'design-brief',
  'aesthetic-plan',
  'implementation',
  'guardrail',
  'design-history'
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
  designPlan?: DesignPlanRecord | null;
  designGuardrail?: DesignGuardrailRecord | null;
  designHistory?: DesignHistoryRecord | null;
  designStyleProfile?: DesignStyleProfileMetadata | null;
  designMetrics?: DesignMetricRecord | null;
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

  if (update.designPlan !== undefined) {
    merged = {
      ...merged,
      design_plan: update.designPlan === null ? undefined : sanitizeDesignPlan(update.designPlan)
    };
  }

  if (update.designGuardrail !== undefined) {
    merged = {
      ...merged,
      design_guardrail:
        update.designGuardrail === null ? undefined : sanitizeDesignGuardrail(update.designGuardrail)
    };
  }

  if (update.designHistory !== undefined) {
    merged = {
      ...merged,
      design_history: update.designHistory === null ? undefined : sanitizeDesignHistory(update.designHistory)
    };
  }

  if (update.designStyleProfile !== undefined) {
    merged = {
      ...merged,
      design_style_profile:
        update.designStyleProfile === null ? undefined : sanitizeDesignStyleProfile(update.designStyleProfile, options)
    };
  }

  if (update.designMetrics !== undefined) {
    merged = {
      ...merged,
      design_metrics: update.designMetrics === null ? undefined : sanitizeDesignMetrics(update.designMetrics)
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

function sanitizeDesignPlan(plan: unknown): DesignPlanRecord {
  if (!plan || typeof plan !== 'object') {
    throw new Error('design plan must be an object');
  }
  const record = plan as Record<string, unknown>;
  const mode = record.mode;
  if (mode !== 'fresh' && mode !== 'clone-informed') {
    throw new Error(`design plan mode must be 'fresh' or 'clone-informed' (received '${String(mode)}')`);
  }

  const brief = record.brief;
  if (!brief || typeof brief !== 'object') {
    throw new Error('design plan requires a brief descriptor');
  }
  const briefRecord = brief as Record<string, unknown>;
  const briefPath = sanitizeRelativeArtifactPath(String(briefRecord.path ?? ''));
  const aestheticPlanRaw = record.aesthetic_plan;
  const implementationRaw = record.implementation;

  const sanitized: DesignPlanRecord = {
    mode,
    brief: {
      path: briefPath
    }
  };

  if (typeof briefRecord.hash === 'string' && briefRecord.hash.trim().length > 0) {
    sanitized.brief.hash = briefRecord.hash.trim();
  }
  if (typeof briefRecord.id === 'string' && briefRecord.id.trim().length > 0) {
    sanitized.brief.id = briefRecord.id.trim();
  }

  if (aestheticPlanRaw && typeof aestheticPlanRaw === 'object') {
    const aestheticPlan = aestheticPlanRaw as Record<string, unknown>;
    sanitized.aesthetic_plan = {
      path: sanitizeRelativeArtifactPath(String(aestheticPlan.path ?? ''))
    };
    if (typeof aestheticPlan.snippet_version === 'string' && aestheticPlan.snippet_version.trim().length > 0) {
      sanitized.aesthetic_plan.snippet_version = aestheticPlan.snippet_version.trim();
    }
    if (typeof aestheticPlan.id === 'string' && aestheticPlan.id.trim().length > 0) {
      sanitized.aesthetic_plan.id = aestheticPlan.id.trim();
    }
  }

  if (implementationRaw && typeof implementationRaw === 'object') {
    const implementation = implementationRaw as Record<string, unknown>;
    sanitized.implementation = {
      path: sanitizeRelativeArtifactPath(String(implementation.path ?? ''))
    };
    if (typeof implementation.complexity === 'string' && implementation.complexity.trim().length > 0) {
      sanitized.implementation.complexity = implementation.complexity.trim();
    }
  }

  if (record.reference_style_id !== undefined && record.reference_style_id !== null) {
    const value = typeof record.reference_style_id === 'string' ? record.reference_style_id.trim() : '';
    if (value.length > 0) {
      sanitized.reference_style_id = value;
    } else {
      sanitized.reference_style_id = null;
    }
  }

  if (record.style_profile_id !== undefined && record.style_profile_id !== null) {
    const value = typeof record.style_profile_id === 'string' ? record.style_profile_id.trim() : '';
    if (value.length > 0) {
      sanitized.style_profile_id = value;
    } else {
      sanitized.style_profile_id = null;
    }
  }

  if (typeof record.generated_at === 'string' && isIsoDate(record.generated_at)) {
    sanitized.generated_at = record.generated_at;
  }

  return sanitized;
}

function sanitizeDesignGuardrail(guardrail: unknown): DesignGuardrailRecord {
  if (!guardrail || typeof guardrail !== 'object') {
    throw new Error('design guardrail must be an object');
  }
  const record = guardrail as Record<string, unknown>;
  const status = record.status;
  if (status !== 'pass' && status !== 'fail') {
    throw new Error(`design guardrail status must be 'pass' or 'fail' (received '${String(status)}')`);
  }
  const reportPath = sanitizeRelativeArtifactPath(String(record.report_path ?? ''));

  const sanitized: DesignGuardrailRecord = {
    report_path: reportPath,
    status
  };

  if (typeof record.snippet_version === 'string' && record.snippet_version.trim().length > 0) {
    sanitized.snippet_version = record.snippet_version.trim();
  }
  if (typeof record.strictness === 'string' && ['low', 'medium', 'high'].includes(record.strictness.trim())) {
    sanitized.strictness = record.strictness.trim() as DesignGuardrailRecord['strictness'];
  }
  if (record.slop_threshold !== undefined) {
    const threshold = clampScore(record.slop_threshold, false);
    if (threshold !== null) {
      sanitized.slop_threshold = threshold;
    }
  }
  if (record.mode === 'fresh' || record.mode === 'clone-informed') {
    sanitized.mode = record.mode;
  }

  if (record.scores && typeof record.scores === 'object') {
    sanitized.scores = sanitizeScoreMap(record.scores as Record<string, unknown>);
  }

  if (Array.isArray(record.recommendations)) {
    const recommendations = record.recommendations
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
    if (recommendations.length > 0) {
      sanitized.recommendations = recommendations.slice(0, 20);
    }
  }

  if (Array.isArray(record.notes)) {
    const notes = record.notes
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
    if (notes.length > 0) {
      sanitized.notes = notes.slice(0, 20);
    }
  }

  if (record.style_overlap && typeof record.style_overlap === 'object') {
    sanitized.style_overlap = sanitizeStyleOverlap(record.style_overlap as Record<string, unknown>);
  }

  return sanitized;
}

function sanitizeDesignHistory(history: unknown): DesignHistoryRecord {
  if (!history || typeof history !== 'object') {
    throw new Error('design history must be an object');
  }
  const record = history as Record<string, unknown>;
  const path = sanitizeRelativeArtifactPath(String(record.path ?? ''));
  const sanitized: DesignHistoryRecord = { path };

  if (record.mirror_path !== undefined) {
    const mirrorPathRaw = typeof record.mirror_path === 'string' ? record.mirror_path.trim() : '';
    if (mirrorPathRaw.length > 0) {
      sanitized.mirror_path = sanitizeRelativeArtifactPath(mirrorPathRaw);
    }
  }

  const entries = coerceNonNegativeInteger(record.entries);
  if (entries !== null) {
    sanitized.entries = entries;
  }
  const maxEntries = coerceNonNegativeInteger(record.max_entries);
  if (maxEntries !== null) {
    sanitized.max_entries = maxEntries;
  }
  if (typeof record.updated_at === 'string' && isIsoDate(record.updated_at)) {
    sanitized.updated_at = record.updated_at;
  }
  if (record.mode === 'fresh' || record.mode === 'clone-informed') {
    sanitized.mode = record.mode;
  }

  return sanitized;
}

function sanitizeDesignStyleProfile(
  profile: unknown,
  options: DesignArtifactSanitizeOptions
): DesignStyleProfileMetadata {
  if (!profile || typeof profile !== 'object') {
    throw new Error('design style profile must be an object');
  }
  const record = profile as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  if (!id) {
    throw new Error('design style profile requires an id');
  }
  const relativePath = sanitizeRelativeArtifactPath(String(record.relative_path ?? ''));

  const sanitized: DesignStyleProfileMetadata = {
    id,
    relative_path: relativePath
  };

  if (typeof record.source_url === 'string' && record.source_url.trim().length > 0) {
    sanitized.source_url = record.source_url.trim();
  }
  if (typeof record.ingestion_run === 'string' && record.ingestion_run.trim().length > 0) {
    sanitized.ingestion_run = record.ingestion_run.trim();
  }
  if (
    typeof record.similarity_level === 'string' &&
    ['low', 'medium', 'high'].includes(record.similarity_level.trim())
  ) {
    sanitized.similarity_level = record.similarity_level.trim() as DesignStyleProfileMetadata['similarity_level'];
  }

  if (record.do_not_copy && typeof record.do_not_copy === 'object') {
    const doNotCopy = record.do_not_copy as Record<string, unknown>;
    const doNotCopyValues = {
      logos: sanitizeStringList(doNotCopy.logos, 20),
      wordmarks: sanitizeStringList(doNotCopy.wordmarks, 20),
      unique_shapes: sanitizeStringList(doNotCopy.unique_shapes, 20),
      unique_illustrations: sanitizeStringList(doNotCopy.unique_illustrations, 20),
      other: sanitizeStringList(doNotCopy.other, 20)
    };
    const hasDoNotCopyValues = Object.values(doNotCopyValues).some(
      (entry) => Array.isArray(entry) && entry.length > 0
    );
    if (hasDoNotCopyValues) {
      sanitized.do_not_copy = doNotCopyValues;
    }
  }

  const retentionDays = coerceNonNegativeInteger(record.retention_days);
  if (retentionDays !== null) {
    sanitized.retention_days = retentionDays;
  } else if (options.retentionDays !== undefined) {
    sanitized.retention_days = Math.max(0, options.retentionDays);
  }

  if (record.expiry && typeof record.expiry === 'object') {
    const expiry = sanitizeExpiryRecord(record.expiry);
    if (expiry) {
      sanitized.expiry = expiry;
    }
  } else {
    const retentionForExpiry = sanitized.retention_days ?? options.retentionDays;
    if (retentionForExpiry !== undefined) {
      sanitized.expiry = computeExpiryRecord(retentionForExpiry, options.retentionPolicy, options.now);
    }
  }

  if (Array.isArray(record.approvals)) {
    const approvals = record.approvals
      .map((entry) => sanitizeApprovalRecord(entry))
      .filter((entry): entry is NonNullable<ReturnType<typeof sanitizeApprovalRecord>> => entry !== null);
    if (approvals.length > 0) {
      sanitized.approvals = approvals;
    }
  }

  if (Array.isArray(record.notes)) {
    const notes = sanitizeStringList(record.notes, 20);
    if (notes && notes.length > 0) {
      sanitized.notes = notes;
    }
  }

  return sanitized;
}

function sanitizeDesignMetrics(metrics: unknown): DesignMetricRecord {
  if (!metrics || typeof metrics !== 'object') {
    throw new Error('design metrics must be an object');
  }
  const record = metrics as Record<string, unknown>;
  const sanitized: DesignMetricRecord = {};

  const fields: Array<keyof DesignMetricRecord> = [
    'aesthetic_axes_completeness',
    'originality_score',
    'accessibility_score',
    'brief_alignment_score',
    'slop_risk',
    'diversity_penalty',
    'similarity_to_reference',
    'style_overlap'
  ];
  for (const field of fields) {
    const value = clampScore(record[field]);
    if (value !== null) {
      sanitized[field] = value;
    }
  }

  if (record.style_overlap_gate === 'pass' || record.style_overlap_gate === 'fail') {
    sanitized.style_overlap_gate = record.style_overlap_gate;
  }

  if (typeof record.snippet_version === 'string' && record.snippet_version.trim().length > 0) {
    sanitized.snippet_version = record.snippet_version.trim();
  }

  return sanitized;
}

function sanitizeStyleOverlap(entry: Record<string, unknown>): DesignStyleOverlapBreakdown {
  const palette = clampScore(entry.palette);
  const typography = clampScore(entry.typography);
  const motion = clampScore(entry.motion);
  const spacing = clampScore(entry.spacing);
  const threshold = clampScore(entry.threshold);
  const overall =
    clampScore(entry.overall) ??
    Math.max(
      palette ?? 0,
      typography ?? 0,
      motion ?? 0,
      spacing ?? 0
    );

  const overlap: DesignStyleOverlapBreakdown = {
    overall
  };

  if (palette !== null) overlap.palette = palette;
  if (typography !== null) overlap.typography = typography;
  if (motion !== null) overlap.motion = motion;
  if (spacing !== null) overlap.spacing = spacing;
  if (threshold !== null) overlap.threshold = threshold;

  if (entry.gate === 'pass' || entry.gate === 'fail') {
    overlap.gate = entry.gate;
  }

  if (Array.isArray(entry.comparison_window)) {
    const windowIds = entry.comparison_window
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);
    if (windowIds.length > 0) {
      overlap.comparison_window = windowIds.slice(0, 20);
    }
  }

  if (entry.reference_style_id !== undefined && entry.reference_style_id !== null) {
    const value =
      typeof entry.reference_style_id === 'string' ? entry.reference_style_id.trim() : '';
    overlap.reference_style_id = value.length > 0 ? value : null;
  }

  return overlap;
}

function sanitizeScoreMap(record: Record<string, unknown>): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!key) {
      continue;
    }
    const numeric = clampScore(value);
    if (numeric !== null) {
      scores[key] = numeric;
    }
  }
  return scores;
}

function clampScore(value: unknown, allowAboveOne = false): number | null {
  if (typeof value === 'number' || typeof value === 'string') {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(numeric)) {
      if (allowAboveOne) {
        return numeric;
      }
      if (numeric < 0) return 0;
      if (numeric > 1) return 1;
      return numeric;
    }
  }
  return null;
}

function sanitizeStringList(value: unknown, maxEntries: number): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entries = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  if (entries.length === 0) {
    return undefined;
  }
  return entries.slice(0, maxEntries);
}
