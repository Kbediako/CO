import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { ControlState } from './controlState.js';
import type {
  ControlDispatchPilotPayload,
  ControlIssuePayload,
  ControlSelectedRunRuntimeSnapshot,
  ControlStatePayload,
  SelectedRunContext
} from './observabilityReadModel.js';
import {
  buildCompatibilityRunningEntry,
  buildSelectedRunLatestEventPayload,
  buildSelectedRunPublicPayload,
  buildUiSelectedRunSharedFields
} from './observabilityReadModel.js';
import type {
  DispatchPilotEvaluation,
  DispatchPilotFailure
} from './trackerDispatchPilot.js';

const READ_ONLY_COMPAT_ACTION = 'refresh';
const COMPATIBILITY_MUTATING_ACTIONS = new Set(['pause', 'resume', 'cancel', 'fail', 'rerun']);
const JSON_HEADERS = { 'Content-Type': 'application/json' };

type ObservabilityPayload = Record<string, unknown>;

export interface ObservabilitySurfaceResponse {
  status: number;
  body: object;
  headers: Record<string, string>;
}

interface ObservabilityTraceabilityContext {
  controlStore: {
    snapshot(): ControlState;
  };
  paths: Pick<RunPaths, 'manifestPath' | 'runDir' | 'logPath'>;
}

export interface ObservabilityPresenterContext extends ObservabilityTraceabilityContext {
  readSelectedRunSnapshot(): Promise<ControlSelectedRunRuntimeSnapshot>;
}

export interface DispatchExtensionContext {
  readDispatchEvaluation(): Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchPilotEvaluation;
  }>;
}

export interface ObservabilityRefreshContext extends ObservabilityTraceabilityContext {
  requestRefresh(): Promise<void>;
}

export type CompatibilityRefreshRejectionReason =
  | 'malformed_action_request'
  | 'forbidden_mutating_action'
  | 'unsupported_action'
  | 'unsupported_tool';

export type CompatibilityIssueResult =
  | { kind: 'ok'; payload: ControlIssuePayload }
  | { kind: 'issue_not_found' };

export type CompatibilityRefreshResult =
  | { kind: 'accepted'; payload: ObservabilityPayload }
  | {
      kind: 'rejected';
      reason: CompatibilityRefreshRejectionReason;
      requestAction: string | null;
      requestTool: string | null;
    };

export type DispatchExtensionResult =
  | {
      kind: 'ok';
      issueIdentifier: string | null;
      evaluation: DispatchPilotEvaluation;
      payload: ObservabilityPayload;
    }
  | {
      kind: 'fail_closed';
      issueIdentifier: string | null;
      evaluation: DispatchPilotEvaluation;
      failure: DispatchPilotFailure;
      details: Record<string, unknown>;
    };

interface CompatibilityActionEnvelopeRejection {
  reason: CompatibilityRefreshRejectionReason;
  requestAction: string | null;
  requestTool: string | null;
}

export function buildCompatibilityErrorResponse(input: {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceability?: Record<string, unknown>;
}): ObservabilitySurfaceResponse {
  return {
    status: input.status,
    headers: JSON_HEADERS,
    body: {
      error: {
        code: input.code,
        message: input.message,
        ...(input.details ? { details: input.details } : {})
      },
      ...(input.traceability ? { traceability: input.traceability } : {})
    }
  };
}

export function buildCompatibilityMethodNotAllowedResponse(
  context: ObservabilityTraceabilityContext,
  allowedMethod: 'GET' | 'POST',
  issueIdentifier?: string
): ObservabilitySurfaceResponse {
  return buildCompatibilityErrorResponse({
    status: 405,
    code: 'method_not_allowed',
    message: 'Method not allowed',
    details: {
      surface: 'api_v1',
      allowed_method: allowedMethod,
      ...(issueIdentifier ? { issue_identifier: issueIdentifier } : {})
    },
    traceability: buildCompatibilityTraceability(context, {
      decision: 'rejected',
      reason: 'method_not_allowed',
      ...(issueIdentifier ? { issueIdentifier } : {})
    })
  });
}

export function buildCompatibilityIssueNotFoundResponse(
  context: ObservabilityTraceabilityContext,
  issueIdentifier: string
): ObservabilitySurfaceResponse {
  return buildCompatibilityErrorResponse({
    status: 404,
    code: 'issue_not_found',
    message: 'Issue not found',
    details: {
      surface: 'api_v1',
      issue_identifier: issueIdentifier
    },
    traceability: buildCompatibilityTraceability(context, {
      decision: 'rejected',
      reason: 'issue_not_found',
      issueIdentifier
    })
  });
}

export function buildCompatibilityNotFoundResponse(
  context: ObservabilityTraceabilityContext
): ObservabilitySurfaceResponse {
  return buildCompatibilityErrorResponse({
    status: 404,
    code: 'not_found',
    message: 'Route not found',
    details: {
      surface: 'api_v1'
    },
    traceability: buildCompatibilityTraceability(context, {
      decision: 'rejected',
      reason: 'route_not_found'
    })
  });
}

export function buildCompatibilityRefreshRejectedResponse(
  context: ObservabilityTraceabilityContext,
  rejection: {
    reason: CompatibilityRefreshRejectionReason;
    requestAction: string | null;
    requestTool: string | null;
  }
): ObservabilitySurfaceResponse {
  return buildCompatibilityErrorResponse({
    status: resolveCompatibilityRefreshRejectionStatus(rejection.reason),
    code: 'read_only_action_rejected',
    message: 'Compatibility surface is read-only; only refresh acknowledgements are supported.',
    details: {
      surface: 'api_v1',
      mode: 'read_only',
      reason: rejection.reason,
      allowed_actions: ['refresh'],
      allowed_tools: [],
      requested_action: rejection.requestAction,
      requested_tool: rejection.requestTool
    },
    traceability: buildCompatibilityTraceability(context, {
      decision: 'rejected',
      reason: rejection.reason,
      requestAction: rejection.requestAction,
      requestTool: rejection.requestTool
    })
  });
}

// `/api/v1/dispatch` is a CO-specific extension over the Symphony-aligned
// compatibility surface, so keep the dispatch payload seam explicit.
export async function readDispatchExtension(
  context: DispatchExtensionContext
): Promise<DispatchExtensionResult> {
  const { issueIdentifier, evaluation } = await context.readDispatchEvaluation();

  if (evaluation.failure) {
    return {
      kind: 'fail_closed',
      issueIdentifier,
      evaluation,
      failure: evaluation.failure,
      details: {
        surface: 'api_v1',
        mode: 'read_only',
        advisory_only: true,
        reason: evaluation.failure.reason,
        dispatch_pilot: evaluation.summary
      }
    };
  }

  return {
    kind: 'ok',
    issueIdentifier,
    evaluation,
    payload: {
      generated_at: isoTimestamp(),
      mode: 'read_only',
      advisory_only: true,
      dispatch_pilot: evaluation.summary,
      recommendation: evaluation.recommendation
    }
  };
}

export async function readCompatibilityRefresh(
  context: ObservabilityRefreshContext,
  body: unknown = {}
): Promise<CompatibilityRefreshResult> {
  const rejection = resolveCompatibilityActionEnvelopeRejection(body);
  if (rejection) {
    return {
      kind: 'rejected',
      reason: rejection.reason,
      requestAction: rejection.requestAction,
      requestTool: rejection.requestTool
    };
  }

  await context.requestRefresh();

  const requestBody = isRecordLike(body) ? body : {};
  const requestedAction = readStringValue(requestBody, 'action');
  return {
    kind: 'accepted',
    payload: {
      status: 'accepted',
      mode: 'read_only',
      action: READ_ONLY_COMPAT_ACTION,
      requested_at: isoTimestamp(),
      traceability: buildCompatibilityTraceability(context, {
        decision: 'acknowledged',
        reason: 'refresh_projection_acknowledged',
        requestAction: requestedAction ? requestedAction.toLowerCase() : READ_ONLY_COMPAT_ACTION
      })
    }
  };
}

export function buildCompatibilityTraceability(
  context: ObservabilityTraceabilityContext,
  input: {
    decision: 'acknowledged' | 'rejected';
    reason: string;
    issueIdentifier?: string | null;
    requestAction?: string | null;
    requestTool?: string | null;
  }
): Record<string, unknown> {
  const snapshot = context.controlStore.snapshot();
  return {
    task_id: resolveTaskIdFromManifestPath(context.paths.manifestPath),
    run_id: snapshot.run_id,
    manifest_path: context.paths.manifestPath,
    surface: 'api_v1',
    issue_identifier: input.issueIdentifier ?? null,
    requested_action: input.requestAction ?? null,
    requested_tool: input.requestTool ?? null,
    decision: input.decision,
    reason: input.reason,
    timestamp: isoTimestamp()
  };
}

export async function readCompatibilityState(
  context: ObservabilityPresenterContext
): Promise<ControlStatePayload> {
  const snapshot = await context.readSelectedRunSnapshot();
  const selected = snapshot.selected;
  const dispatchPilotSummary = snapshot.dispatchPilot;
  const tracked = snapshot.tracked;
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
}

export async function readCompatibilityIssue(
  context: Pick<ObservabilityPresenterContext, 'readSelectedRunSnapshot'>,
  issueIdentifier: string
): Promise<CompatibilityIssueResult> {
  const snapshot = await context.readSelectedRunSnapshot();
  const selected = snapshot.selected;
  const matchesIssue =
    selected &&
    (selected.issueIdentifier === issueIdentifier ||
      selected.taskId === issueIdentifier ||
      selected.runId === issueIdentifier);
  if (!selected || !matchesIssue) {
    return { kind: 'issue_not_found' };
  }

  return {
    kind: 'ok',
    payload: buildCompatibilityIssuePayload(selected, snapshot.dispatchPilot)
  };
}

function buildCompatibilityIssuePayload(
  selected: SelectedRunContext,
  dispatchPilotSummary: ControlDispatchPilotPayload | null
): ControlIssuePayload {
  const running = buildCompatibilityRunningEntry(selected);
  const selectedPayload = buildSelectedRunPublicPayload(selected);
  const latestEvent = buildSelectedRunLatestEventPayload(selected.latestEvent);
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
    tracked: selected.tracked ?? {},
    ...(dispatchPilotSummary ? { dispatch_pilot: dispatchPilotSummary } : {})
  };
}

export async function readUiDataset(
  context: ObservabilityPresenterContext
): Promise<Record<string, unknown>> {
  const manifest = await readJsonFile<CliManifest>(context.paths.manifestPath);
  const generatedAt = isoTimestamp();
  if (!manifest) {
    return { generated_at: generatedAt, tasks: [], runs: [], codebase: null, activity: [], selected: null };
  }

  const snapshot = await context.readSelectedRunSnapshot();
  const selected = snapshot.selected;
  const selectedSharedFields = selected ? buildUiSelectedRunSharedFields(selected) : null;
  const bucketInfo = classifyBucket(manifest.status, context.controlStore.snapshot());
  const approvalsTotal = Array.isArray(manifest.approvals) ? manifest.approvals.length : 0;
  const repoRoot = resolveRepoRootFromRunDir(context.paths.runDir);
  const links = {
    manifest: repoRoot ? relative(repoRoot, context.paths.manifestPath) : context.paths.manifestPath,
    log: repoRoot ? relative(repoRoot, context.paths.logPath) : context.paths.logPath,
    metrics: null,
    state: null
  };

  const stages = Array.isArray(manifest.commands)
    ? manifest.commands.map((command) => ({
        id: command.id,
        title: command.title || command.id,
        status: command.status
      }))
    : [];

  const runEntry = {
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    status: manifest.status,
    raw_status: selected?.rawStatus ?? manifest.status,
    display_status: selected?.displayStatus ?? manifest.status,
    status_reason: selected?.statusReason ?? null,
    started_at: manifest.started_at,
    updated_at: manifest.updated_at,
    completed_at: manifest.completed_at,
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
    task_id: manifest.task_id,
    title: manifest.pipeline_title || manifest.task_id,
    bucket: bucketInfo.bucket,
    bucket_reason: bucketInfo.reason,
    status: manifest.status,
    raw_status: selected?.rawStatus ?? manifest.status,
    display_status: selected?.displayStatus ?? manifest.status,
    status_reason: selected?.statusReason ?? null,
    last_update: manifest.updated_at,
    latest_run_id: manifest.run_id,
    approvals_pending: 0,
    approvals_total: approvalsTotal,
    summary: manifest.summary ?? '',
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

function resolveCompatibilityActionEnvelopeRejection(
  body: unknown
): CompatibilityActionEnvelopeRejection | null {
  if (!isRecordLike(body)) {
    return {
      reason: 'malformed_action_request',
      requestAction: null,
      requestTool: null
    };
  }

  const hasAction = Object.prototype.hasOwnProperty.call(body, 'action');
  const hasTool = Object.prototype.hasOwnProperty.call(body, 'tool');
  if (!hasAction && !hasTool) {
    return null;
  }

  const actionValue = readStringValue(body, 'action');
  const normalizedAction = actionValue ? actionValue.toLowerCase() : null;
  const toolValue = readStringValue(body, 'tool');
  const normalizedTool = toolValue ? toolValue.toLowerCase() : null;

  if (hasAction && !normalizedAction) {
    return {
      reason: 'malformed_action_request',
      requestAction: null,
      requestTool: normalizedTool
    };
  }
  if (normalizedAction && COMPATIBILITY_MUTATING_ACTIONS.has(normalizedAction)) {
    return {
      reason: 'forbidden_mutating_action',
      requestAction: normalizedAction,
      requestTool: normalizedTool
    };
  }
  if (normalizedAction && normalizedAction !== READ_ONLY_COMPAT_ACTION) {
    return {
      reason: 'unsupported_action',
      requestAction: normalizedAction,
      requestTool: normalizedTool
    };
  }
  if (hasTool) {
    return {
      reason: 'unsupported_tool',
      requestAction: normalizedAction,
      requestTool: normalizedTool
    };
  }
  return null;
}

function resolveCompatibilityRefreshRejectionStatus(
  reason: CompatibilityRefreshRejectionReason
): 400 | 403 {
  switch (reason) {
    case 'forbidden_mutating_action':
    case 'unsupported_tool':
      return 403;
    case 'malformed_action_request':
    case 'unsupported_action':
      return 400;
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function classifyBucket(
  status: CliManifest['status'],
  control: ControlState
): { bucket: string; reason: string } {
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
