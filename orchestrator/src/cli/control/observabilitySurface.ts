import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type {
  ControlCompatibilityProjectionSnapshot,
  ControlIssuePayload,
  ControlStatePayload
} from './observabilityReadModel.js';
import { findCompatibilityProjectionIssueRecord } from './compatibilityIssuePresenter.js';
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
  readCompatibilityProjection(): Promise<ControlCompatibilityProjectionSnapshot>;
}

export interface DispatchExtensionContext {
  readDispatchEvaluation(): Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchPilotEvaluation;
  }>;
}

export interface CompatibilityRefreshAcknowledgement {
  queued: boolean;
  coalesced: boolean;
  requested_at: string;
  operations: string[];
}

export interface ObservabilityRefreshContext extends ObservabilityTraceabilityContext {
  requestRefresh(): Promise<CompatibilityRefreshAcknowledgement>;
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

  const refreshAcknowledgement = normalizeRefreshAcknowledgement(await context.requestRefresh());

  const requestBody = isRecordLike(body) ? body : {};
  const requestedAction = readStringValue(requestBody, 'action');
  return {
    kind: 'accepted',
    payload: {
      ...refreshAcknowledgement,
      traceability: buildCompatibilityTraceability(context, {
        decision: 'acknowledged',
        reason: 'refresh_requested',
        requestAction: requestedAction ? requestedAction.toLowerCase() : READ_ONLY_COMPAT_ACTION
      })
    }
  };
}

function normalizeRefreshAcknowledgement(
  value: CompatibilityRefreshAcknowledgement | null | undefined
): CompatibilityRefreshAcknowledgement {
  return {
    queued: value?.queued ?? true,
    coalesced: value?.coalesced ?? false,
    requested_at: value?.requested_at ?? isoTimestamp(),
    operations: value?.operations ?? ['poll', 'reconcile']
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
  const projection = await context.readCompatibilityProjection();
  const generatedAt = isoTimestamp();
  return {
    generated_at: generatedAt,
    counts: { running: projection.running.length, retrying: projection.retrying.length },
    running: projection.running,
    retrying: projection.retrying,
    codex_totals: projection.codexTotals,
    rate_limits: projection.rateLimits,
    selected: projection.selected,
    ...(projection.providerIntake ? { provider_intake: projection.providerIntake } : {}),
    ...(projection.dispatchPilot ? { dispatch_pilot: projection.dispatchPilot } : {}),
    ...(projection.tracked ? { tracked: projection.tracked } : {})
  };
}

export async function readCompatibilityIssue(
  context: Pick<ObservabilityPresenterContext, 'readCompatibilityProjection'>,
  issueIdentifier: string
): Promise<CompatibilityIssueResult> {
  const projection = await context.readCompatibilityProjection();
  const issue = findCompatibilityProjectionIssueRecord(projection, issueIdentifier);
  if (!issue) {
    return { kind: 'issue_not_found' };
  }

  return {
    kind: 'ok',
    payload: issue.payload
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

function resolveTaskIdFromManifestPath(manifestPath: string): string | null {
  const normalizedPath = manifestPath.replace(/\\/g, '/');
  const match = normalizedPath.match(/\.runs\/([^/]+)\/cli\//);
  return match?.[1] ?? null;
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
