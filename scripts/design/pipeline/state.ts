import { readFile, writeFile } from 'node:fs/promises';
import type {
  DesignArtifactApprovalRecord,
  DesignArtifactRecord,
  DesignGuardrailRecord,
  DesignHistoryRecord,
  DesignMetricRecord,
  DesignPlanRecord,
  DesignStyleProfileMetadata,
  DesignToolkitArtifactRecord
} from '../../../packages/shared/manifest/types.js';

export interface StageStateArtifactSummary {
  relative_path: string;
  stage?: string;
  status?: 'succeeded' | 'skipped' | 'failed';
  type?: string;
  description?: string;
}

export interface StageState {
  id: string;
  title?: string;
  status: 'succeeded' | 'skipped' | 'failed';
  notes?: string[];
  metrics?: Record<string, unknown>;
  artifacts?: StageStateArtifactSummary[];
}

export interface DesignRunState {
  configSnapshot?: Record<string, unknown> | null;
  retention?: {
    days: number;
    autoPurge: boolean;
    policy?: string;
  };
  privacy?: {
    allowThirdParty: boolean;
    requireApproval: boolean;
    maskSelectors: string[];
    approver?: string | null;
  };
  approvals: DesignArtifactApprovalRecord[];
  artifacts: DesignArtifactRecord[];
  toolkit?: ToolkitState;
  stages: StageState[];
  metrics: Record<string, unknown>;
  designPlan?: DesignPlanRecord | null;
  designGuardrail?: DesignGuardrailRecord | null;
  designHistory?: DesignHistoryRecord | null;
  designStyleProfile?: DesignStyleProfileMetadata | null;
  designMetrics?: DesignMetricRecord | null;
}

export interface ToolkitContextState {
  id: string;
  slug: string;
  title?: string | null;
  url: string;
  referenceUrl: string;
  relativeDir: string;
  breakpoints: string[];
  snapshotHtmlPath?: string;
  snapshotRawHtmlPath?: string;
  snapshotCssPath?: string;
  palettePath?: string;
  sectionsPath?: string;
  palettePreview?: string[];
  fontFamilies?: string[];
  runtimeCanvasColors?: string[];
  resolvedFonts?: string[];
  tokensPath?: string;
  styleguidePath?: string;
  referencePath?: string;
  interactionScriptPath?: string | null;
  interactionWaitMs?: number | null;
}

export interface ToolkitState {
  contexts: ToolkitContextState[];
  artifacts: DesignToolkitArtifactRecord[];
  retention?: {
    days: number;
    autoPurge: boolean;
    policy?: string;
  };
  summary?: Record<string, unknown> | null;
}

export async function loadDesignRunState(path: string): Promise<DesignRunState> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as DesignRunState;
    return sanitizeState(parsed);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError && nodeError.code === 'ENOENT') {
      return createEmptyState();
    }
    throw error;
  }
}

export async function saveDesignRunState(path: string, state: DesignRunState): Promise<void> {
  const payload = JSON.stringify(state, null, 2);
  await writeFile(path, `${payload}\n`, 'utf8');
}

export function upsertStage(state: DesignRunState, stage: StageState): StageState {
  const existingIndex = state.stages.findIndex((entry) => entry.id === stage.id);
  const normalized = sanitizeStage(stage);
  if (existingIndex >= 0) {
    state.stages[existingIndex] = {
      ...state.stages[existingIndex],
      ...normalized,
      notes: mergeNotes(state.stages[existingIndex].notes, normalized.notes),
      metrics: { ...state.stages[existingIndex].metrics, ...normalized.metrics },
      artifacts: mergeStageArtifacts(state.stages[existingIndex].artifacts, normalized.artifacts)
    };
    return state.stages[existingIndex];
  }
  state.stages.push(normalized);
  return normalized;
}

export function appendArtifacts(state: DesignRunState, artifacts: DesignArtifactRecord[]): void {
  for (const artifact of artifacts) {
    const existingIndex = state.artifacts.findIndex(
      (entry) => entry.stage === artifact.stage && entry.relative_path === artifact.relative_path && entry.type === artifact.type
    );
    if (existingIndex >= 0) {
      state.artifacts[existingIndex] = { ...state.artifacts[existingIndex], ...artifact };
    } else {
      state.artifacts.push(artifact);
    }
  }
}

export function appendToolkitArtifacts(state: DesignRunState, artifacts: DesignToolkitArtifactRecord[]): void {
  const toolkit = ensureToolkitState(state);
  for (const artifact of artifacts) {
    const index = toolkit.artifacts.findIndex(
      (entry) =>
        entry.id === artifact.id &&
        entry.stage === artifact.stage &&
        entry.relative_path === artifact.relative_path
    );
    if (index >= 0) {
      toolkit.artifacts[index] = {
        ...toolkit.artifacts[index],
        ...artifact
      };
    } else {
      toolkit.artifacts.push({ ...artifact });
    }
  }
}

export function appendApprovals(state: DesignRunState, approvals: DesignArtifactApprovalRecord[]): void {
  for (const approval of approvals) {
    const exists = state.approvals.some((entry) => entry.id === approval.id);
    if (!exists) {
      state.approvals.push(approval);
    }
  }
}

export function mergeMetrics(state: DesignRunState, metrics: Record<string, unknown>): void {
  state.metrics = {
    ...state.metrics,
    ...metrics
  };
}

export function ensureToolkitState(state: DesignRunState): ToolkitState {
  if (!state.toolkit) {
    state.toolkit = {
      contexts: [],
      artifacts: []
    };
  }
  return state.toolkit;
}

export function upsertToolkitContext(
  state: DesignRunState,
  contextRecord: ToolkitContextState
): ToolkitContextState {
  const toolkit = ensureToolkitState(state);
  const index = toolkit.contexts.findIndex((entry) => entry.id === contextRecord.id);
  if (index >= 0) {
    toolkit.contexts[index] = {
      ...toolkit.contexts[index],
      ...contextRecord
    };
    return toolkit.contexts[index];
  }
  toolkit.contexts.push({ ...contextRecord });
  return toolkit.contexts[toolkit.contexts.length - 1];
}

function sanitizeState(state: DesignRunState | null | undefined): DesignRunState {
  if (!state || typeof state !== 'object') {
    return createEmptyState();
  }
  return {
    configSnapshot: state.configSnapshot ?? null,
    retention: state.retention,
    privacy: state.privacy,
    approvals: Array.isArray(state.approvals) ? [...state.approvals] : [],
    artifacts: Array.isArray(state.artifacts) ? [...state.artifacts] : [],
    toolkit: sanitizeToolkitState(state.toolkit),
    stages: Array.isArray(state.stages) ? state.stages.map(sanitizeStage) : [],
    metrics: state.metrics && typeof state.metrics === 'object' ? { ...state.metrics } : {},
    designPlan: cloneDesignValue(state.designPlan),
    designGuardrail: cloneDesignValue(state.designGuardrail),
    designHistory: cloneDesignValue(state.designHistory),
    designStyleProfile: cloneDesignValue(state.designStyleProfile),
    designMetrics: cloneDesignValue(state.designMetrics)
  };
}

function createEmptyState(): DesignRunState {
  return {
    approvals: [],
    artifacts: [],
    toolkit: {
      contexts: [],
      artifacts: []
    },
    stages: [],
    metrics: {},
    designPlan: null,
    designGuardrail: null,
    designHistory: null,
    designStyleProfile: null,
    designMetrics: null
  };
}

function sanitizeStage(stage: StageState): StageState {
  return {
    id: stage.id,
    title: stage.title,
    status: stage.status,
    notes: stage.notes ? [...stage.notes] : [],
    metrics: stage.metrics ? { ...stage.metrics } : undefined,
    artifacts: mergeStageArtifacts([], stage.artifacts)
  };
}

function mergeNotes(existing: string[] | undefined, next: string[] | undefined): string[] | undefined {
  const combined = [...(existing ?? []), ...(next ?? [])];
  if (combined.length === 0) {
    return undefined;
  }
  return Array.from(new Set(combined));
}

function mergeStageArtifacts(
  existing: StageStateArtifactSummary[] | undefined,
  incoming: StageStateArtifactSummary[] | undefined
): StageStateArtifactSummary[] | undefined {
  if ((!existing || existing.length === 0) && (!incoming || incoming.length === 0)) {
    return undefined;
  }
  const records = [...(existing ?? [])];
  for (const artifact of incoming ?? []) {
    const index = records.findIndex((entry) => entry.relative_path === artifact.relative_path);
    if (index >= 0) {
      records[index] = { ...records[index], ...artifact };
    } else {
      records.push({ ...artifact });
    }
  }
  return records;
}

function cloneDesignValue<T>(value: T | null | undefined): T | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeToolkitState(toolkit: ToolkitState | undefined): ToolkitState {
  if (!toolkit || typeof toolkit !== 'object') {
    return {
      contexts: [],
      artifacts: []
    };
  }
  const contexts = Array.isArray(toolkit.contexts)
    ? toolkit.contexts.map((context) => ({ ...context }))
    : [];
  const artifacts = Array.isArray(toolkit.artifacts)
    ? toolkit.artifacts.map((artifact) => ({ ...artifact }))
    : [];
  const retention = toolkit.retention
    ? {
        days: Number(toolkit.retention.days) || 0,
        autoPurge: Boolean(toolkit.retention.autoPurge),
        policy: toolkit.retention.policy
      }
    : undefined;
  const summary = toolkit.summary && typeof toolkit.summary === 'object' ? { ...toolkit.summary } : undefined;
  return {
    contexts,
    artifacts,
    retention,
    summary: summary ?? null
  };
}
