import { readFile, writeFile } from 'node:fs/promises';
import type {
  DesignArtifactApprovalRecord,
  DesignArtifactRecord
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
  stages: StageState[];
  metrics: Record<string, unknown>;
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
    stages: Array.isArray(state.stages) ? state.stages.map(sanitizeStage) : [],
    metrics: state.metrics && typeof state.metrics === 'object' ? { ...state.metrics } : {}
  };
}

function createEmptyState(): DesignRunState {
  return {
    approvals: [],
    artifacts: [],
    stages: [],
    metrics: {}
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
