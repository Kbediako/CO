import { mkdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, relative as relativePath } from 'node:path';
import {
  persistDesignManifest,
  type DesignManifestUpdate,
  type PersistDesignManifestOptions
} from '../manifest/writer.js';
import type {
  DesignArtifactApprovalRecord,
  DesignArtifactRecord,
  DesignArtifactsSummary,
  DesignGuardrailRecord,
  DesignHistoryRecord,
  DesignMetricRecord,
  DesignPlanRecord,
  DesignStyleProfileMetadata,
  DesignToolkitArtifactRecord,
  DesignToolkitSummary,
  ToolRunManifest
} from '../manifest/types.js';

export interface DesignWriterContext {
  taskId: string;
  runId: string;
  manifestPath: string;
  repoRoot?: string;
}

export interface DesignStageSummary {
  id: string;
  title?: string;
  status: 'succeeded' | 'skipped' | 'failed';
  notes?: string[];
  metrics?: Record<string, unknown>;
  artifacts?: Array<{
    relative_path: string;
    stage?: string;
    status?: 'succeeded' | 'skipped' | 'failed';
    type?: string;
    description?: string;
  }>;
}

export interface DesignRetentionMetadata {
  days: number;
  autoPurge: boolean;
  policy?: string;
}

export interface DesignPrivacyMetadata {
  allowThirdParty: boolean;
  requireApproval: boolean;
  maskSelectors: string[];
  approver?: string | null;
}

export interface DesignArtifactWriterOptions {
  context: DesignWriterContext;
  stages: DesignStageSummary[];
  artifacts?: DesignArtifactRecord[];
  summary?: DesignArtifactsSummary;
  toolkitArtifacts?: DesignToolkitArtifactRecord[];
  toolkitSummary?: DesignToolkitSummary;
  configSnapshot?: Record<string, unknown> | null;
  retention: DesignRetentionMetadata;
  privacy: DesignPrivacyMetadata;
  approvals?: DesignArtifactApprovalRecord[];
  designPlan?: DesignPlanRecord | null;
  designGuardrail?: DesignGuardrailRecord | null;
  designHistory?: DesignHistoryRecord | null;
  designStyleProfile?: DesignStyleProfileMetadata | null;
  designMetrics?: DesignMetricRecord | null;
  metrics?: Record<string, unknown>;
  manifestOptions?: Partial<PersistDesignManifestOptions>;
  outDir?: string;
  now?: Date;
}

export interface DesignWriterResult {
  manifest: string;
  summaryPath: string;
  summary: Record<string, unknown>;
}

export async function writeDesignSummary(options: DesignArtifactWriterOptions): Promise<DesignWriterResult> {
  const now = options.now ?? new Date();
  const context = options.context;
  const artifacts = options.artifacts ?? [];
  const summary = options.summary ?? deriveSummary(artifacts, now);
  const toolkitArtifacts = options.toolkitArtifacts ?? [];
  const approvals = options.approvals ?? [];
  const toolkitSummary =
    options.toolkitSummary ?? (toolkitArtifacts.length > 0 ? deriveToolkitSummary(toolkitArtifacts, approvals, now) : undefined);
  const manifestUpdate: DesignManifestUpdate = {
    artifacts,
    summary,
    configSnapshot: options.configSnapshot ?? null,
    ...(toolkitArtifacts.length > 0 ? { toolkitArtifacts } : {}),
    ...(toolkitSummary ? { toolkitSummary } : {}),
    ...(options.designPlan !== undefined ? { designPlan: options.designPlan } : {}),
    ...(options.designGuardrail !== undefined ? { designGuardrail: options.designGuardrail } : {}),
    ...(options.designHistory !== undefined ? { designHistory: options.designHistory } : {}),
    ...(options.designStyleProfile !== undefined ? { designStyleProfile: options.designStyleProfile } : {}),
    ...(options.designMetrics !== undefined ? { designMetrics: options.designMetrics } : {})
  };

  const manifestOptions: PersistDesignManifestOptions = {
    retentionDays: options.retention.days,
    retentionPolicy: options.retention.policy,
    now,
    ...options.manifestOptions
  };

  const manifest = await persistDesignManifest(context.manifestPath, manifestUpdate, manifestOptions);

  const payload = buildSummaryPayload(options, summary, toolkitSummary, manifest, now);
  const summaryPath = await writeSummaryFile(options, payload);

  return {
    manifest: context.manifestPath,
    summaryPath,
    summary: payload
  };
}

function buildSummaryPayload(
  options: DesignArtifactWriterOptions,
  summary: DesignArtifactsSummary,
  toolkitSummary: DesignToolkitSummary | undefined,
  manifest: ToolRunManifest,
  now: Date
): Record<string, unknown> {
  const context = options.context;
  const repoRoot = options.context.repoRoot ?? process.cwd();
  const manifestRelative = relativePath(repoRoot, context.manifestPath);

  const approvals = (options.approvals ?? [])
    .map((approval) => ({
      id: approval.id,
      actor: approval.actor,
      reason: approval.reason,
      timestamp: approval.timestamp
    }))
    .filter((approval) => approval.id && approval.actor && approval.timestamp);

  const stages = options.stages.map((stage) => {
    const artifacts = (stage.artifacts ?? []).map((artifact) => ({
      relative_path: artifact.relative_path,
      stage: artifact.stage ?? stage.id,
      status: artifact.status ?? stage.status,
      type: artifact.type,
      description: artifact.description
    }));
    return {
      id: stage.id,
      title: stage.title ?? null,
      status: stage.status,
      notes: stage.notes ?? [],
      metrics: stage.metrics ?? {},
      artifacts
    };
  });

  const summaryArtifacts = (options.artifacts ?? []).map((artifact) => ({
    stage: artifact.stage,
    status: artifact.status,
    relative_path: artifact.relative_path,
    type: artifact.type,
    description: artifact.description
  }));

  const toolkitArtifacts = (options.toolkitArtifacts ?? []).map((artifact) => ({
    id: artifact.id,
    stage: artifact.stage,
    status: artifact.status,
    relative_path: artifact.relative_path,
    description: artifact.description ?? null,
    metrics: artifact.metrics ?? {},
    retention: artifact.retention ?? null
  }));

  const designMetrics = (manifest.design_metrics as DesignMetricRecord | null) ?? options.designMetrics ?? null;
  const combinedMetrics = {
    ...(options.metrics ?? {}),
    ...(designMetrics ?? {})
  };

  return {
    task_id: context.taskId,
    run_id: context.runId,
    manifest: manifestRelative,
    generated_at: now.toISOString(),
    retention: {
      days: options.retention.days,
      auto_purge: options.retention.autoPurge,
      policy: options.retention.policy ?? 'design.config.retention'
    },
    privacy: {
      allow_third_party: options.privacy.allowThirdParty,
      require_approval: options.privacy.requireApproval,
      mask_selectors: options.privacy.maskSelectors,
      approver: options.privacy.approver ?? null
    },
    approvals,
    stages,
    artifacts: summaryArtifacts,
    summary,
    design_toolkit_artifacts: toolkitArtifacts,
    design_toolkit_summary: toolkitSummary ?? null,
    design_plan: (manifest.design_plan as DesignPlanRecord | null) ?? options.designPlan ?? null,
    design_guardrail:
      (manifest.design_guardrail as DesignGuardrailRecord | null) ?? options.designGuardrail ?? null,
    design_history: (manifest.design_history as DesignHistoryRecord | null) ?? options.designHistory ?? null,
    design_style_profile:
      (manifest.design_style_profile as DesignStyleProfileMetadata | null) ?? options.designStyleProfile ?? null,
    design_metrics: designMetrics,
    metrics: combinedMetrics,
    config_snapshot: options.configSnapshot ?? null
  };
}

async function writeSummaryFile(
  options: DesignArtifactWriterOptions,
  payload: Record<string, unknown>
): Promise<string> {
  const outRoot = options.outDir ?? join(process.cwd(), 'out');
  const safeTaskId = sanitizeTaskId(options.context.taskId);
  const safeRunId = sanitizeRunId(options.context.runId);
  const summaryPath = join(outRoot, safeTaskId, 'design', 'runs', `${safeRunId}.json`);
  await writeJsonAtomic(summaryPath, payload);
  return summaryPath;
}

function deriveSummary(artifacts: DesignArtifactRecord[], now: Date): DesignArtifactsSummary {
  const stageMap = new Map<DesignArtifactRecord['stage'], { succeeded: number; failed: number; skipped: number; artifacts: number }>();
  for (const artifact of artifacts) {
    const entry = stageMap.get(artifact.stage) ?? {
      succeeded: 0,
      failed: 0,
      skipped: 0,
      artifacts: 0
    };
    entry.artifacts += 1;
    if (artifact.status === 'succeeded') {
      entry.succeeded += 1;
    } else if (artifact.status === 'failed') {
      entry.failed += 1;
    } else {
      entry.skipped += 1;
    }
    stageMap.set(artifact.stage, entry);
  }

  const stages = Array.from(stageMap.entries()).map(([stage, stats]) => ({
    stage,
    succeeded: stats.succeeded,
    failed: stats.failed,
    skipped: stats.skipped,
    artifacts: stats.artifacts
  }));

  return {
    total_artifacts: artifacts.length,
    generated_at: now.toISOString(),
    stages
  };
}

function deriveToolkitSummary(
  artifacts: DesignToolkitArtifactRecord[],
  approvals: DesignArtifactApprovalRecord[],
  now: Date
): DesignToolkitSummary {
  const stageMap = new Map<DesignToolkitArtifactRecord['stage'], { count: number; metrics: Record<string, number | string> }>();
  const totals: Record<string, number> = {};

  for (const artifact of artifacts) {
    const entry = stageMap.get(artifact.stage) ?? { count: 0, metrics: {} };
    entry.count += 1;
    if (artifact.metrics) {
      accumulateToolkitMetrics(entry.metrics, artifact.metrics);
      accumulateNumericTotals(totals, artifact.metrics);
    }
    stageMap.set(artifact.stage, entry);
  }

  const stages = Array.from(stageMap.entries()).map(([stage, data]) => ({
    stage,
    artifacts: data.count,
    metrics: data.metrics
  }));

  const approvalIds = approvals.map((approval) => approval.id).filter(Boolean);

  return {
    generated_at: now.toISOString(),
    stages,
    totals: Object.keys(totals).length > 0 ? totals : undefined,
    approvals: approvalIds.length > 0 ? approvalIds : undefined
  };
}

function accumulateToolkitMetrics(
  target: Record<string, number | string>,
  incoming: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const current = target[key];
      if (typeof current === 'number') {
        target[key] = current + value;
      } else {
        target[key] = value;
      }
    } else if (typeof value === 'string') {
      target[key] = value;
    }
  }
}

function accumulateNumericTotals(target: Record<string, number>, incoming: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      target[key] = (target[key] ?? 0) + value;
    }
  }
}

function sanitizeTaskId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
}

function sanitizeRunId(value: string): string {
  return value.replace(/[:]/g, '-');
}

async function writeJsonAtomic(targetPath: string, payload: unknown): Promise<void> {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await rename(tmpPath, targetPath);
}
