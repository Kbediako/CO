import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { ControlState } from './controlState.js';
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
  const effectiveStatus = selected?.rawStatus ?? input.manifest.status;
  const bucketInfo = classifyBucket(effectiveStatus, input.control);
  const approvalsTotal = Array.isArray(input.manifest.approvals) ? input.manifest.approvals.length : 0;
  const repoRoot = resolveRepoRootFromRunDir(input.paths.runDir);
  const links = {
    manifest: repoRoot ? relative(repoRoot, input.paths.manifestPath) : input.paths.manifestPath,
    log: repoRoot ? relative(repoRoot, input.paths.logPath) : input.paths.logPath,
    metrics: null,
    state: null
  };

  const stages = Array.isArray(input.manifest.commands)
    ? input.manifest.commands.map((command) => ({
        id: command.id,
        title: command.title || command.id,
        status: command.status
      }))
    : [];

  const runEntry = {
    run_id: input.manifest.run_id,
    task_id: input.manifest.task_id,
    status: effectiveStatus,
    raw_status: effectiveStatus,
    display_status: selected?.displayStatus ?? effectiveStatus,
    status_reason: selected?.statusReason ?? null,
    started_at: input.manifest.started_at,
    updated_at: input.manifest.updated_at,
    completed_at: input.manifest.completed_at,
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
    task_id: input.manifest.task_id,
    title: input.manifest.pipeline_title || input.manifest.task_id,
    bucket: bucketInfo.bucket,
    bucket_reason: bucketInfo.reason,
    status: effectiveStatus,
    raw_status: effectiveStatus,
    display_status: selected?.displayStatus ?? effectiveStatus,
    status_reason: selected?.statusReason ?? null,
    last_update: input.manifest.updated_at,
    latest_run_id: input.manifest.run_id,
    approvals_pending: 0,
    approvals_total: approvalsTotal,
    summary: input.manifest.summary ?? '',
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

function classifyBucket(status: string, control: ControlState): { bucket: string; reason: string } {
  if (status === 'queued') {
    return { bucket: 'pending', reason: 'queued' };
  }
  if (status === 'in_progress') {
    const latest = control.latest_action?.action ?? null;
    if (latest === 'pause') {
      return { bucket: 'ongoing', reason: 'paused' };
    }
    return { bucket: 'active', reason: 'running' };
  }
  if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
    return { bucket: 'complete', reason: 'terminal' };
  }
  return { bucket: 'pending', reason: 'unknown' };
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
