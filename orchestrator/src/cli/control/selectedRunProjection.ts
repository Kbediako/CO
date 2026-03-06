import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { ControlAction, ControlState } from './controlState.js';
import type { QuestionRecord, QuestionUrgency } from './questions.js';
import {
  evaluateTrackerDispatchPilotAsync,
  type DispatchPilotEvaluation
} from './trackerDispatchPilot.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';

export interface SelectedRunQuestionSummary {
  queuedCount: number;
  latestQuestion: {
    questionId: string;
    prompt: string;
    urgency: QuestionUrgency;
    queuedAt: string;
  } | null;
}

export interface SelectedRunLatestEvent {
  at: string | null;
  event: string | null;
  message: string | null;
  requestedBy: string | null;
  reason: string | null;
}

export interface SelectedRunContext {
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
  rawStatus: string;
  displayStatus: string;
  statusReason: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  lastError: string | null;
  latestAction: ControlAction['action'] | null;
  latestEvent: SelectedRunLatestEvent | null;
  workspacePath: string;
  questionSummary: SelectedRunQuestionSummary;
  dispatchPilotEvaluation: DispatchPilotEvaluation;
  trackedPayload: Record<string, unknown> | null;
}

export interface SelectedRunManifestSnapshot {
  manifestRecord: Record<string, unknown>;
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
}

export interface SelectedRunProjectionContext {
  controlStore: {
    snapshot(): ControlState;
  };
  questionQueue: {
    list(): QuestionRecord[];
  };
  paths: Pick<RunPaths, 'manifestPath' | 'runDir'>;
  linearAdvisoryState: {
    tracked_issue: LiveLinearTrackedIssue | null;
  };
  env?: NodeJS.ProcessEnv;
}

export interface SelectedRunProjectionReader {
  readSelectedRunManifestSnapshot(): Promise<SelectedRunManifestSnapshot | null>;
  buildSelectedRunContext(snapshot?: SelectedRunManifestSnapshot | null): Promise<SelectedRunContext | null>;
  readDispatchEvaluation(selected?: SelectedRunContext | null): Promise<DispatchPilotEvaluation>;
  buildCompatibilityStatePayload(): Promise<Record<string, unknown>>;
}

export function createSelectedRunProjectionReader(
  context: SelectedRunProjectionContext
): SelectedRunProjectionReader {
  let selectedSnapshotPromise: Promise<SelectedRunManifestSnapshot | null> | null = null;
  let selectedContextPromise: Promise<SelectedRunContext | null> | null = null;
  let dispatchEvaluationPromise: Promise<DispatchPilotEvaluation> | null = null;

  const readSelectedRunManifestSnapshot = async (): Promise<SelectedRunManifestSnapshot | null> => {
    selectedSnapshotPromise ??= readSelectedRunManifestSnapshotInternal(context);
    return selectedSnapshotPromise;
  };

  const buildSelectedRunContext = async (
    snapshot: SelectedRunManifestSnapshot | null = null
  ): Promise<SelectedRunContext | null> => {
    if (snapshot) {
      return buildSelectedRunContextFromSnapshot(context, snapshot);
    }
    selectedContextPromise ??= (async () => {
      const selectedSnapshot = await readSelectedRunManifestSnapshot();
      return buildSelectedRunContextFromSnapshot(context, selectedSnapshot);
    })();
    return selectedContextPromise;
  };

  const readDispatchEvaluation = async (
    selected?: SelectedRunContext | null
  ): Promise<DispatchPilotEvaluation> => {
    if (selected !== undefined) {
      if (selected) {
        return selected.dispatchPilotEvaluation;
      }
      dispatchEvaluationPromise ??= evaluateCompatibilityDispatchPilotInternal(context, null);
      return dispatchEvaluationPromise;
    }

    const selectedContext = await buildSelectedRunContext();
    if (selectedContext) {
      return selectedContext.dispatchPilotEvaluation;
    }
    dispatchEvaluationPromise ??= evaluateCompatibilityDispatchPilotInternal(context, null);
    return dispatchEvaluationPromise;
  };

  const buildCompatibilityStatePayload = async (): Promise<Record<string, unknown>> => {
    const selected = await buildSelectedRunContext();
    const dispatchPilotEvaluation = await readDispatchEvaluation(selected);
    const dispatchPilotSummary = dispatchPilotEvaluation.summary.configured ? dispatchPilotEvaluation.summary : null;
    const tracked =
      selected?.trackedPayload ??
      buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue) ??
      buildCompatibilityTrackedPayload(dispatchPilotEvaluation);
    const generatedAt = isoTimestamp();
    if (!selected) {
      return {
        generated_at: generatedAt,
        counts: { running: 0, retrying: 0 },
        running: [],
        retrying: [],
        codex_totals: null,
        rate_limits: null,
        selected: null,
        ...(dispatchPilotSummary ? { dispatch_pilot: dispatchPilotSummary } : {}),
        ...(tracked ? { tracked } : {})
      };
    }

    const running = selected.rawStatus === 'in_progress' ? [buildCompatibilityRunningEntry(selected)] : [];
    return {
      generated_at: generatedAt,
      counts: { running: running.length, retrying: 0 },
      running,
      retrying: [],
      codex_totals: null,
      rate_limits: null,
      selected: buildSelectedRunPublicPayload(selected),
      ...(dispatchPilotSummary ? { dispatch_pilot: dispatchPilotSummary } : {}),
      ...(tracked ? { tracked } : {})
    };
  };

  return {
    readSelectedRunManifestSnapshot,
    buildSelectedRunContext,
    readDispatchEvaluation,
    buildCompatibilityStatePayload
  };
}

export function buildCompatibilityIssuePayload(selected: SelectedRunContext): Record<string, unknown> {
  const running = buildCompatibilityRunningEntry(selected);
  const selectedPayload = buildSelectedRunPublicPayload(selected);
  const latestEvent = selected.latestEvent
    ? {
        at: selected.latestEvent.at,
        event: selected.latestEvent.event,
        message: selected.latestEvent.message
      }
    : null;
  const recentEvents = latestEvent ? [latestEvent] : [];

  return {
    issue_identifier: selected.issueIdentifier,
    issue_id: selected.issueId,
    status: selected.rawStatus,
    raw_status: selected.rawStatus,
    display_status: selected.displayStatus,
    status_reason: selected.statusReason,
    workspace: {
      path: selected.workspacePath
    },
    attempts: {
      restart_count: 0,
      current_retry_attempt: 0
    },
    running,
    retry: null,
    logs: {
      codex_session_logs: []
    },
    summary: selected.summary,
    latest_event: latestEvent,
    question_summary: selectedPayload.question_summary,
    recent_events: recentEvents,
    last_error: selected.lastError,
    tracked: selected.trackedPayload ?? {},
    ...(selected.dispatchPilotEvaluation.summary.configured
      ? { dispatch_pilot: selected.dispatchPilotEvaluation.summary }
      : {})
  };
}

export function buildSelectedRunPublicPayload(selected: SelectedRunContext): Record<string, unknown> {
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    task_id: selected.taskId,
    run_id: selected.runId,
    raw_status: selected.rawStatus,
    display_status: selected.displayStatus,
    status_reason: selected.statusReason,
    started_at: selected.startedAt,
    updated_at: selected.updatedAt,
    completed_at: selected.completedAt,
    summary: selected.summary,
    last_error: selected.lastError,
    latest_action: selected.latestAction,
    latest_event: selected.latestEvent
      ? {
          at: selected.latestEvent.at,
          event: selected.latestEvent.event,
          message: selected.latestEvent.message,
          requested_by: selected.latestEvent.requestedBy,
          reason: selected.latestEvent.reason
        }
      : null,
    workspace: {
      path: selected.workspacePath
    },
    question_summary: buildSelectedRunQuestionSummaryPayload(selected.questionSummary),
    ...(selected.trackedPayload ? { tracked: selected.trackedPayload } : {})
  };
}

export function buildSelectedRunQuestionSummaryPayload(
  summary: SelectedRunQuestionSummary
): Record<string, unknown> {
  return {
    queued_count: summary.queuedCount,
    latest_question: summary.latestQuestion
      ? {
          question_id: summary.latestQuestion.questionId,
          prompt: summary.latestQuestion.prompt,
          urgency: summary.latestQuestion.urgency,
          queued_at: summary.latestQuestion.queuedAt
        }
      : null
  };
}

function buildCompatibilityRunningEntry(selected: SelectedRunContext): Record<string, unknown> {
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    state: selected.rawStatus,
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    session_id: selected.runId,
    turn_count: 0,
    last_event: selected.latestEvent?.event ?? selected.latestAction,
    last_message: selected.latestEvent?.message ?? selected.summary,
    started_at: selected.startedAt,
    last_event_at: selected.latestEvent?.at ?? selected.updatedAt,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    }
  };
}

async function buildSelectedRunContextFromSnapshot(
  context: SelectedRunProjectionContext,
  snapshot: SelectedRunManifestSnapshot | null
): Promise<SelectedRunContext | null> {
  if (!snapshot) {
    return null;
  }
  const { manifestRecord, issueIdentifier, issueId, taskId, runId } = snapshot;
  const control = context.controlStore.snapshot();
  const rawStatus = readStringValue(manifestRecord, 'status') ?? 'unknown';
  const startedAt = readStringValue(manifestRecord, 'started_at', 'startedAt') ?? null;
  const updatedAt = readStringValue(manifestRecord, 'updated_at', 'updatedAt') ?? null;
  const completedAt = readStringValue(manifestRecord, 'completed_at', 'completedAt') ?? null;
  const summary = readStringValue(manifestRecord, 'summary') ?? null;
  const workspacePath = resolveRepoRootFromRunDir(context.paths.runDir) ?? context.paths.runDir;
  const questionSummary = buildSelectedRunQuestionSummary(context.questionQueue.list());
  const latestAction = control.latest_action?.action ?? null;
  const { displayStatus, statusReason } = resolveSelectedRunDisplayStatus({
    rawStatus,
    latestAction,
    questionSummary
  });
  const dispatchPilotEvaluation = await evaluateCompatibilityDispatchPilotInternal(context, {
    issueIdentifier,
    issueId,
    taskId,
    runId,
    rawStatus,
    displayStatus,
    statusReason,
    startedAt,
    updatedAt,
    completedAt,
    summary,
    lastError: null,
    latestAction,
    latestEvent: null,
    workspacePath,
    questionSummary,
    dispatchPilotEvaluation: {
      summary: {
        advisory_only: true,
        configured: false,
        enabled: false,
        kill_switch: false,
        status: 'disabled',
        source_status: 'disabled',
        reason: 'uninitialized',
        source_setup: null
      },
      recommendation: null,
      failure: null
    },
    trackedPayload: null
  });
  const trackedPayload =
    buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue) ??
    buildCompatibilityTrackedPayload(dispatchPilotEvaluation);
  const latestEvent = buildSelectedRunLatestEvent({
    controlAction: control.latest_action ?? null,
    updatedAt,
    summary,
    fallbackEvent: rawStatus
  });
  const lastError =
    rawStatus === 'failed' || latestAction === 'fail'
      ? summary ?? control.latest_action?.reason ?? 'run_failed'
      : null;

  return {
    issueIdentifier,
    issueId,
    taskId,
    runId,
    rawStatus,
    displayStatus,
    statusReason,
    startedAt,
    updatedAt,
    completedAt,
    summary,
    lastError,
    latestAction,
    latestEvent,
    workspacePath,
    questionSummary,
    dispatchPilotEvaluation,
    trackedPayload
  };
}

async function readSelectedRunManifestSnapshotInternal(
  context: SelectedRunProjectionContext
): Promise<SelectedRunManifestSnapshot | null> {
  const manifest = await readJsonFile<CliManifest>(context.paths.manifestPath);
  if (!manifest) {
    return null;
  }
  const manifestRecord = manifest as unknown as Record<string, unknown>;
  const control = context.controlStore.snapshot();
  const taskId =
    readStringValue(manifestRecord, 'task_id', 'taskId') ?? resolveTaskIdFromManifestPath(context.paths.manifestPath);
  const runId = readStringValue(manifestRecord, 'run_id', 'runId') ?? control.run_id ?? null;
  const issueIdentifier = taskId ?? runId;
  if (!issueIdentifier) {
    return null;
  }
  return {
    manifestRecord,
    issueIdentifier,
    issueId: taskId ?? runId ?? null,
    taskId,
    runId
  };
}

function evaluateCompatibilityDispatchPilotInternal(
  context: SelectedRunProjectionContext,
  selected: SelectedRunContext | null
): Promise<DispatchPilotEvaluation> {
  const controlSnapshot = context.controlStore.snapshot();
  return evaluateTrackerDispatchPilotAsync({
    featureToggles: controlSnapshot.feature_toggles,
    defaultIssueIdentifier: selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null,
    env: context.env ?? process.env
  });
}

function buildSelectedRunQuestionSummary(records: QuestionRecord[]): SelectedRunQuestionSummary {
  const queued = records.filter((record) => record.status === 'queued');
  let latestQuestion: QuestionRecord | null = null;
  for (const record of queued) {
    if (!latestQuestion) {
      latestQuestion = record;
      continue;
    }
    if (Date.parse(record.queued_at) >= Date.parse(latestQuestion.queued_at)) {
      latestQuestion = record;
    }
  }
  return {
    queuedCount: queued.length,
    latestQuestion: latestQuestion
      ? {
          questionId: latestQuestion.question_id,
          prompt: latestQuestion.prompt,
          urgency: latestQuestion.urgency,
          queuedAt: latestQuestion.queued_at
        }
      : null
  };
}

function resolveSelectedRunDisplayStatus(input: {
  rawStatus: string;
  latestAction: ControlAction['action'] | null;
  questionSummary: SelectedRunQuestionSummary;
}): { displayStatus: string; statusReason: string | null } {
  if (input.rawStatus === 'in_progress' && input.latestAction === 'pause') {
    return {
      displayStatus: 'paused',
      statusReason: input.questionSummary.queuedCount > 0 ? 'queued_questions' : 'control_pause'
    };
  }
  if (input.rawStatus === 'in_progress' && input.questionSummary.queuedCount > 0) {
    return { displayStatus: 'awaiting_input', statusReason: 'queued_questions' };
  }
  return { displayStatus: input.rawStatus, statusReason: null };
}

function buildSelectedRunLatestEvent(input: {
  controlAction: ControlAction | null;
  updatedAt: string | null;
  summary: string | null;
  fallbackEvent: string;
}): SelectedRunLatestEvent | null {
  if (!input.controlAction && !input.updatedAt && !input.summary) {
    return null;
  }
  return {
    at: input.controlAction?.requested_at ?? input.updatedAt,
    event: input.controlAction?.action ?? input.fallbackEvent,
    message: input.summary,
    requestedBy: input.controlAction?.requested_by ?? null,
    reason: input.controlAction?.reason ?? null
  };
}

function buildCompatibilityTrackedPayload(
  evaluation: DispatchPilotEvaluation | null | undefined
): Record<string, unknown> | null {
  const trackedIssue = evaluation?.recommendation?.tracked_issue;
  if (!trackedIssue) {
    return null;
  }
  return buildTrackedLinearPayload(trackedIssue);
}

function buildTrackedLinearPayload(
  trackedIssue: LiveLinearTrackedIssue | null | undefined
): Record<string, unknown> | null {
  if (!trackedIssue) {
    return null;
  }
  return {
    linear: {
      provider: trackedIssue.provider,
      id: trackedIssue.id,
      identifier: trackedIssue.identifier,
      title: trackedIssue.title,
      url: trackedIssue.url,
      state: trackedIssue.state,
      state_type: trackedIssue.state_type,
      workspace_id: trackedIssue.workspace_id,
      team_id: trackedIssue.team_id,
      team_key: trackedIssue.team_key,
      team_name: trackedIssue.team_name,
      project_id: trackedIssue.project_id,
      project_name: trackedIssue.project_name,
      updated_at: trackedIssue.updated_at,
      recent_activity: trackedIssue.recent_activity
    }
  };
}

function resolveRepoRootFromRunDir(runDir: string): string | null {
  const candidate = resolve(runDir, '..', '..', '..', '..');
  return candidate || null;
}

function resolveTaskIdFromManifestPath(manifestPath: string): string | null {
  const normalizedPath = manifestPath.replace(/\\/g, '/');
  const match = normalizedPath.match(/\.runs\/([^/]+)\/cli\//);
  return match?.[1] ?? null;
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
}
