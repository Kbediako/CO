import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type {
  SelectedRunContext,
  SelectedRunProjectionReader,
  SelectedRunQuestionSummary
} from './selectedRunProjection.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';

const READ_ONLY_COMPAT_ACTION = 'refresh';
const COMPATIBILITY_MUTATING_ACTIONS = new Set(['pause', 'resume', 'cancel', 'fail', 'rerun']);

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const JSON_NO_STORE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

export interface ObservabilitySurfaceContext {
  controlStore: {
    snapshot(): ControlState;
  };
  linearAdvisoryState: {
    tracked_issue: LiveLinearTrackedIssue | null;
  };
  paths: Pick<RunPaths, 'manifestPath' | 'runDir' | 'logPath'>;
  projection: SelectedRunProjectionReader;
}

export interface ObservabilitySurfaceResponse {
  status: number;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

interface CompatibilityActionEnvelopeRejection {
  status: number;
  reason: string;
  requestAction: string | null;
  requestTool: string | null;
}

export function createObservabilitySurface(
  context: ObservabilitySurfaceContext
): {
  readUiDataset(): Promise<ObservabilitySurfaceResponse>;
  readCompatibilityState(method: string): Promise<ObservabilitySurfaceResponse>;
  readCompatibilityRefresh(
    method: string,
    body?: Record<string, unknown>
  ): ObservabilitySurfaceResponse;
  readCompatibilityIssue(
    method: string,
    issueIdentifier: string
  ): Promise<ObservabilitySurfaceResponse>;
  buildCompatibilityNotFound(): ObservabilitySurfaceResponse;
} {
  return {
    async readUiDataset(): Promise<ObservabilitySurfaceResponse> {
      return {
        status: 200,
        headers: JSON_NO_STORE_HEADERS,
        body: await buildUiDataset(context)
      };
    },

    async readCompatibilityState(method: string): Promise<ObservabilitySurfaceResponse> {
      if (method !== 'GET') {
        return buildCompatibilityErrorResponse({
          status: 405,
          code: 'method_not_allowed',
          message: 'Method not allowed',
          details: {
            surface: 'api_v1',
            allowed_method: 'GET'
          },
          traceability: buildCompatibilityTraceability(context, {
            decision: 'rejected',
            reason: 'method_not_allowed'
          })
        });
      }

      return {
        status: 200,
        headers: JSON_NO_STORE_HEADERS,
        body: await buildCompatibilityStatePayload(context)
      };
    },

    readCompatibilityRefresh(method: string, body: Record<string, unknown> = {}): ObservabilitySurfaceResponse {
      if (method !== 'POST') {
        return buildCompatibilityErrorResponse({
          status: 405,
          code: 'method_not_allowed',
          message: 'Method not allowed',
          details: {
            surface: 'api_v1',
            allowed_method: 'POST'
          },
          traceability: buildCompatibilityTraceability(context, {
            decision: 'rejected',
            reason: 'method_not_allowed'
          })
        });
      }

      const rejection = resolveCompatibilityActionEnvelopeRejection(body);
      if (rejection) {
        return buildCompatibilityErrorResponse({
          status: rejection.status,
          code: 'read_only_action_rejected',
          message: 'Compatibility surface is read-only; only refresh acknowledgements are supported.',
          details: {
            surface: 'api_v1',
            mode: 'read_only',
            reason: rejection.reason,
            allowed_actions: [READ_ONLY_COMPAT_ACTION],
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

      const requestedAction = readStringValue(body, 'action');
      return {
        status: 202,
        headers: JSON_HEADERS,
        body: {
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
    },

    async readCompatibilityIssue(
      method: string,
      issueIdentifier: string
    ): Promise<ObservabilitySurfaceResponse> {
      if (method !== 'GET') {
        return buildCompatibilityErrorResponse({
          status: 405,
          code: 'method_not_allowed',
          message: 'Method not allowed',
          details: {
            surface: 'api_v1',
            allowed_method: 'GET',
            issue_identifier: issueIdentifier
          },
          traceability: buildCompatibilityTraceability(context, {
            decision: 'rejected',
            reason: 'method_not_allowed',
            issueIdentifier
          })
        });
      }

      const selectedSnapshot = await context.projection.readSelectedRunManifestSnapshot();
      const matchesIssue =
        selectedSnapshot &&
        (selectedSnapshot.issueIdentifier === issueIdentifier ||
          selectedSnapshot.taskId === issueIdentifier ||
          selectedSnapshot.runId === issueIdentifier);
      if (!selectedSnapshot || !matchesIssue) {
        return buildCompatibilityIssueNotFoundResponse(context, issueIdentifier);
      }

      const selected = await context.projection.buildSelectedRunContext(selectedSnapshot);
      if (!selected) {
        return buildCompatibilityIssueNotFoundResponse(context, issueIdentifier);
      }

      return {
        status: 200,
        headers: JSON_NO_STORE_HEADERS,
        body: buildCompatibilityIssuePayload(selected)
      };
    },

    buildCompatibilityNotFound(): ObservabilitySurfaceResponse {
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
  };
}

export function buildCompatibilityTraceability(
  context: Pick<ObservabilitySurfaceContext, 'controlStore' | 'paths'>,
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

function buildCompatibilityIssueNotFoundResponse(
  context: ObservabilitySurfaceContext,
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

async function buildCompatibilityStatePayload(
  context: ObservabilitySurfaceContext
): Promise<Record<string, unknown>> {
  const selected = await context.projection.buildSelectedRunContext();
  const dispatchPilotEvaluation = await context.projection.readDispatchEvaluation(selected);
  const dispatchPilotSummary = dispatchPilotEvaluation.summary.configured
    ? dispatchPilotEvaluation.summary
    : null;
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
}

function buildCompatibilityIssuePayload(selected: SelectedRunContext): Record<string, unknown> {
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

function buildSelectedRunPublicPayload(selected: SelectedRunContext): Record<string, unknown> {
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

function buildSelectedRunQuestionSummaryPayload(
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

async function buildUiDataset(context: ObservabilitySurfaceContext): Promise<Record<string, unknown>> {
  const manifest = await readJsonFile<CliManifest>(context.paths.manifestPath);
  const generatedAt = isoTimestamp();
  if (!manifest) {
    return { generated_at: generatedAt, tasks: [], runs: [], codebase: null, activity: [], selected: null };
  }

  const selected = await context.projection.buildSelectedRunContext();
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
    question_summary: selected ? buildSelectedRunQuestionSummaryPayload(selected.questionSummary) : null,
    ...(selected?.trackedPayload ? { tracked: selected.trackedPayload } : {})
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
    question_summary: selected ? buildSelectedRunQuestionSummaryPayload(selected.questionSummary) : null,
    ...(selected?.trackedPayload ? { tracked: selected.trackedPayload } : {})
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
  body: Record<string, unknown>
): CompatibilityActionEnvelopeRejection | null {
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
      status: 400,
      reason: 'malformed_action_request',
      requestAction: null,
      requestTool: normalizedTool
    };
  }
  if (normalizedAction && COMPATIBILITY_MUTATING_ACTIONS.has(normalizedAction)) {
    return {
      status: 403,
      reason: 'forbidden_mutating_action',
      requestAction: normalizedAction,
      requestTool: normalizedTool
    };
  }
  if (normalizedAction && normalizedAction !== READ_ONLY_COMPAT_ACTION) {
    return {
      status: 400,
      reason: 'unsupported_action',
      requestAction: normalizedAction,
      requestTool: normalizedTool
    };
  }
  if (hasTool) {
    return {
      status: 403,
      reason: 'unsupported_tool',
      requestAction: normalizedAction,
      requestTool: normalizedTool
    };
  }
  return null;
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
