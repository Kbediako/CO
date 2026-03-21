import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { ControlAction, ControlState } from './controlState.js';
import type {
  ControlSelectedRunPayload,
  ControlSelectedRunRuntimeSnapshot,
  SelectedRunContext
} from './observabilityReadModel.js';
import {
  buildProjectionSelectedPayload,
  buildSelectedRunQuestionSummaryPayload
} from './observabilityReadModel.js';

export interface UiSelectedRunSharedFields {
  raw_status: string;
  display_status: string;
  status_reason: string | null;
  question_summary: ReturnType<typeof buildSelectedRunQuestionSummaryPayload>;
  tracked?: SelectedRunContext['tracked'];
}

export interface SelectedRunPresenterContext {
  controlStore: {
    snapshot(): ControlState;
  };
  paths: Pick<RunPaths, 'manifestPath' | 'runDir' | 'logPath'>;
  readSelectedRunSnapshot(): Promise<ControlSelectedRunRuntimeSnapshot>;
}

const BUCKET_ACTIONS = new Set<ControlAction['action']>(['pause', 'resume', 'fail', 'cancel']);

export function buildSelectedRunPublicPayload(selected: SelectedRunContext): ControlSelectedRunPayload {
  return buildProjectionSelectedPayload(selected);
}

export function buildUiSelectedRunSharedFields(selected: SelectedRunContext): UiSelectedRunSharedFields {
  return {
    raw_status: selected.rawStatus,
    display_status: selected.displayStatus,
    status_reason: selected.statusReason,
    question_summary: buildSelectedRunQuestionSummaryPayload(selected.questionSummary),
    ...(selected.tracked ? { tracked: selected.tracked } : {})
  };
}

export function buildUiDataset(input: {
  manifest: CliManifest | null;
  snapshot: ControlSelectedRunRuntimeSnapshot;
  control: ControlState;
  paths: Pick<RunPaths, 'manifestPath' | 'runDir' | 'logPath'>;
  generatedAt?: string;
}): Record<string, unknown> {
  const generatedAt = input.generatedAt ?? isoTimestamp();
  if (!input.manifest) {
    return { generated_at: generatedAt, tasks: [], runs: [], codebase: null, activity: [], selected: null };
  }

  const selected = input.snapshot.selected;
  const selectedSharedFields = selected ? buildUiSelectedRunSharedFields(selected) : null;
  const selectedUsesDistinctManifest =
    Boolean(selected?.manifestPath) && selected?.manifestPath !== input.paths.manifestPath;
  const effectiveStatus = selected?.rawStatus ?? input.manifest.status;
  const effectiveLatestAction = selectedUsesDistinctManifest
    ? normalizeBucketAction(selected?.latestAction)
    : normalizeBucketAction(selected?.latestAction ?? input.control.latest_action?.action);
  const bucketInfo = classifyBucket(effectiveStatus, effectiveLatestAction);
  const approvalsTotal = selectedUsesDistinctManifest
    ? (selected?.approvalsTotal ?? 0)
    : Array.isArray(input.manifest.approvals)
      ? input.manifest.approvals.length
      : 0;
  const repoRoot = resolveRepoRootFromRunDir(input.paths.runDir);
  const effectiveManifestPath = selected?.manifestPath ?? input.paths.manifestPath;
  const effectiveLogPath = selected?.runDir ? resolve(selected.runDir, 'runner.ndjson') : input.paths.logPath;
  const links = {
    manifest: repoRoot ? relative(repoRoot, effectiveManifestPath) : effectiveManifestPath,
    log: repoRoot ? relative(repoRoot, effectiveLogPath) : effectiveLogPath,
    metrics: null,
    state: null
  };

  const stages = selectedUsesDistinctManifest
    ? (selected?.stages ?? [])
    : Array.isArray(input.manifest.commands)
      ? input.manifest.commands.map((command) => ({
          id: command.id,
          title: command.title || command.id,
          status: command.status
        }))
      : [];

  const effectiveRunId = selected?.runId ?? input.manifest.run_id;
  const effectiveTaskId = selected?.taskId ?? input.manifest.task_id;
  const effectiveStartedAt = selectedUsesDistinctManifest
    ? (selected?.startedAt ?? null)
    : (selected?.startedAt ?? input.manifest.started_at);
  const effectiveUpdatedAt = selectedUsesDistinctManifest
    ? (selected?.updatedAt ?? null)
    : (selected?.updatedAt ?? input.manifest.updated_at);
  const effectiveCompletedAt = selectedUsesDistinctManifest
    ? (selected?.completedAt ?? null)
    : (selected?.completedAt ?? input.manifest.completed_at);
  const effectiveSummary = selectedUsesDistinctManifest
    ? (selected?.summary ?? '')
    : (selected?.summary ?? input.manifest.summary ?? '');
  const effectiveTitle =
    selectedUsesDistinctManifest && effectiveTaskId
      ? (selected?.pipelineTitle ?? effectiveTaskId)
      : input.manifest.pipeline_title || effectiveTaskId;

  const runEntry = {
    run_id: effectiveRunId,
    task_id: effectiveTaskId,
    status: effectiveStatus,
    raw_status: effectiveStatus,
    display_status: selected?.displayStatus ?? effectiveStatus,
    status_reason: selected?.statusReason ?? null,
    started_at: effectiveStartedAt,
    updated_at: effectiveUpdatedAt,
    completed_at: effectiveCompletedAt,
    stages,
    links,
    approvals_pending: 0,
    approvals_total: approvalsTotal,
    heartbeat_stale: false,
    latest_event: selected?.latestEvent
      ? {
          at: selected.latestEvent.at,
          event: selected.latestEvent.event,
          message: selected.latestEvent.message
        }
      : null,
    question_summary: selectedSharedFields?.question_summary ?? null,
    ...(selectedSharedFields?.tracked ? { tracked: selectedSharedFields.tracked } : {})
  };

  const taskEntry = {
    task_id: effectiveTaskId,
    title: effectiveTitle,
    bucket: bucketInfo.bucket,
    bucket_reason: bucketInfo.reason,
    status: effectiveStatus,
    raw_status: effectiveStatus,
    display_status: selected?.displayStatus ?? effectiveStatus,
    status_reason: selected?.statusReason ?? null,
    last_update: effectiveUpdatedAt,
    latest_run_id: effectiveRunId,
    approvals_pending: 0,
    approvals_total: approvalsTotal,
    summary: effectiveSummary,
    question_summary: selectedSharedFields?.question_summary ?? null,
    ...(selectedSharedFields?.tracked ? { tracked: selectedSharedFields.tracked } : {})
  };

  return {
    generated_at: generatedAt,
    tasks: [taskEntry],
    runs: [runEntry],
    codebase: null,
    activity: [],
    selected: selected ? buildSelectedRunPublicPayload(selected) : null
  };
}

export async function readUiDataset(context: SelectedRunPresenterContext): Promise<Record<string, unknown>> {
  const manifest = await readJsonFile<CliManifest>(context.paths.manifestPath);
  const snapshot = await context.readSelectedRunSnapshot();
  return buildUiDataset({
    manifest,
    snapshot,
    control: context.controlStore.snapshot(),
    paths: context.paths
  });
}

function classifyBucket(
  status: string,
  latestAction: ControlAction['action'] | null
): { bucket: string; reason: string } {
  if (status === 'queued') {
    return { bucket: 'pending', reason: 'queued' };
  }
  if (status === 'in_progress') {
    if (latestAction === 'pause') {
      return { bucket: 'ongoing', reason: 'paused' };
    }
    return { bucket: 'active', reason: 'running' };
  }
  if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
    return { bucket: 'complete', reason: 'terminal' };
  }
  return { bucket: 'pending', reason: 'unknown' };
}

function normalizeBucketAction(value: string | null | undefined): ControlAction['action'] | null {
  if (!value || !BUCKET_ACTIONS.has(value as ControlAction['action'])) {
    return null;
  }
  return value as ControlAction['action'];
}

function resolveRepoRootFromRunDir(runDir: string): string | null {
  const candidate = resolve(runDir, '..', '..', '..', '..');
  return candidate || null;
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
