import { hostname } from 'node:os';

import type { ProviderIntakeSummaryPayload } from './providerIntakeState.js';
import type { LiveLinearTrackedActivity } from './linearDispatchSource.js';
import type {
  ControlCodexTotalsPayload,
  ControlCompatibilityProjectionSnapshot,
  ControlDispatchPilotPayload,
  ControlIssuePayload,
  ControlPollingHealthPayload,
  ControlRetryPayload,
  ControlRunningPayload,
  ControlSelectedRunPayload,
  ControlTrackedPayload,
  ControlProviderWorkflowPayload
} from './observabilityReadModel.js';
import { resolveProviderWorkerHost } from './observabilityReadModel.js';
import { isoTimestamp } from '../utils/time.js';

const LOCAL_HOSTNAME = hostname();

export interface OperatorDashboardPresenterContext {
  readCompatibilityProjection(): Promise<ControlCompatibilityProjectionSnapshot>;
}

export interface OperatorDashboardSessionPayload {
  issue_identifier: string;
  issue_id: string | null;
  task_id: string | null;
  run_id: string | null;
  summary: string | null;
  display_state: string;
  status_reason: string | null;
  pid: string | null;
  session_id: string | null;
  thread_id: string | null;
  turn_count: number | null;
  workspace_path: string | null;
  host: string;
  worker_host?: string | null;
  last_event: string | null;
  last_message: string | null;
  display_event?: string | null;
  started_at: string | null;
  last_event_at: string | null;
  tokens: ControlRunningPayload['tokens'];
}

export interface OperatorDashboardRetryPayload {
  issue_identifier: string;
  issue_id: string | null;
  task_id: string | null;
  run_id: string | null;
  summary: string | null;
  display_state: string;
  status_reason: string | null;
  session_id: string | null;
  thread_id: string | null;
  turn_count: number | null;
  workspace_path: string | null;
  host: string;
  worker_host?: string | null;
  attempt: number | null;
  due_at: string | null;
  error: string | null;
  last_event: string | null;
  last_message: string | null;
  started_at: string | null;
  last_event_at: string | null;
}

export interface OperatorDashboardIssuePayload {
  issue_identifier: string;
  issue_id: string | null;
  task_id: string | null;
  run_id: string | null;
  status: string;
  raw_status: string;
  display_status: string;
  status_reason: string | null;
  title: string | null;
  url: string | null;
  workspace: {
    path: string | null;
    host: string;
  };
  worker_host?: string | null;
  session: {
    session_id: string | null;
    thread_id: string | null;
    turn_count: number | null;
  };
  owner: {
    phase: string | null;
    status: string | null;
  };
  tokens: ControlRunningPayload['tokens'] | null;
  rate_limits: Record<string, unknown> | null;
  summary: string | null;
  last_error: string | null;
  latest_event: ControlIssuePayload['latest_event'];
  recent_agent_activity: ControlIssuePayload['recent_events'];
  linear_activity: LiveLinearTrackedActivity[];
  running: ControlIssuePayload['running'];
  retry: ControlIssuePayload['retry'];
  attempts: ControlIssuePayload['attempts'];
  tracked: ControlIssuePayload['tracked'];
  provider_linear_worker_proof: ControlIssuePayload['provider_linear_worker_proof'] | null;
  provider_debug_snapshot?: ControlIssuePayload['provider_debug_snapshot'] | null;
  is_selected: boolean;
}

export interface OperatorDashboardDataset {
  generated_at: string;
  mode: 'operator_dashboard';
  read_only: true;
  host: string;
  counts: {
    running: number;
    retrying: number;
    issues: number;
    max_allowed?: number | null;
  };
  totals: ControlCodexTotalsPayload;
  rate_limits: Record<string, unknown> | null;
  polling: ControlPollingHealthPayload | null;
  selected_issue_identifier: string | null;
  selected: ControlSelectedRunPayload | null;
  running: OperatorDashboardSessionPayload[];
  retrying: OperatorDashboardRetryPayload[];
  issues: OperatorDashboardIssuePayload[];
  provider_workflow?: ControlProviderWorkflowPayload;
  provider_intake?: ProviderIntakeSummaryPayload;
  dispatch_pilot?: ControlDispatchPilotPayload;
  tracked?: ControlTrackedPayload | null;
}

export function buildUiDataset(input: {
  projection: ControlCompatibilityProjectionSnapshot;
  generatedAt?: string;
}): OperatorDashboardDataset {
  const generatedAt = input.generatedAt ?? isoTimestamp();
  const selectedIssueIdentifier = input.projection.selected?.issue_identifier ?? null;
  const issuePayloads = input.projection.issues.map((record) => record.payload);
  const issuesById = new Map(
    issuePayloads.flatMap((issue) => (issue.issue_id === null ? [] : [[issue.issue_id, issue] as const]))
  );
  const issuesByRunId = new Map(
    issuePayloads.flatMap((issue) => (issue.run_id === null ? [] : [[issue.run_id, issue] as const]))
  );
  const issuesByIdentifier = new Map(issuePayloads.map((issue) => [issue.issue_identifier, issue] as const));

  return {
    generated_at: generatedAt,
    mode: 'operator_dashboard',
    read_only: true,
    host: LOCAL_HOSTNAME,
    counts: {
      running: input.projection.running.length,
      retrying: input.projection.retrying.length,
      issues: issuePayloads.length,
      max_allowed: input.projection.maxConcurrentAgents ?? null
    },
    totals: input.projection.codexTotals,
    rate_limits: input.projection.rateLimits,
    polling: input.projection.polling ?? null,
    selected_issue_identifier: selectedIssueIdentifier,
    selected: input.projection.selected,
    running: input.projection.running.map((entry) =>
      buildRunningSessionPayload(entry, resolveRunningIssuePayload(entry, issuesById, issuesByIdentifier))
    ),
    retrying: input.projection.retrying.map((entry) =>
      buildRetryQueuePayload(entry, resolveRetryIssuePayload(entry, issuesByRunId, issuesById, issuesByIdentifier))
    ),
    issues: issuePayloads.map((issue) => buildIssuePayload(issue, issue.issue_identifier === selectedIssueIdentifier)),
    ...(input.projection.providerWorkflow ? { provider_workflow: input.projection.providerWorkflow } : {}),
    ...(input.projection.providerIntake ? { provider_intake: input.projection.providerIntake } : {}),
    ...(input.projection.dispatchPilot ? { dispatch_pilot: input.projection.dispatchPilot } : {}),
    ...(input.projection.tracked ? { tracked: input.projection.tracked } : {})
  };
}

export async function readUiDataset(
  context: OperatorDashboardPresenterContext
): Promise<OperatorDashboardDataset> {
  const projection = await context.readCompatibilityProjection();
  return buildUiDataset({
    projection
  });
}

function buildIssuePayload(
  issue: ControlIssuePayload,
  isSelected: boolean
): OperatorDashboardIssuePayload {
  const proof = issue.provider_linear_worker_proof ?? null;
  const trackedLinear = issue.tracked && 'linear' in issue.tracked ? issue.tracked.linear : null;
  const running = issue.running ?? null;
  const workerHost =
    issue.worker_host ??
    resolveProviderWorkerHost({
      providerLinearWorkerProof: proof,
      providerDebugSnapshot: issue.provider_debug_snapshot ?? null
    });

  return {
    issue_identifier: issue.issue_identifier,
    issue_id: issue.issue_id,
    task_id: issue.task_id,
    run_id: issue.run_id,
    status: issue.status,
    raw_status: issue.raw_status,
    display_status: issue.display_status,
    status_reason: issue.status_reason,
    title: trackedLinear?.title ?? null,
    url: trackedLinear?.url ?? null,
    workspace: {
      path: issue.workspace.path ?? proof?.workspace_path ?? null,
      host: LOCAL_HOSTNAME
    },
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    session: {
      session_id: proof?.latest_session_id ?? running?.session_id ?? issue.retry?.session_id ?? null,
      thread_id: proof?.thread_id ?? null,
      turn_count: proof?.turn_count ?? running?.turn_count ?? null
    },
    owner: {
      phase: proof?.owner_phase ?? null,
      status: proof?.owner_status ?? null
    },
    tokens: proof?.tokens ?? running?.tokens ?? null,
    rate_limits: proof?.rate_limits ?? null,
    summary: issue.summary,
    last_error: issue.last_error,
    latest_event: issue.latest_event,
    recent_agent_activity: normalizeRecentAgentActivity(issue, proof),
    linear_activity: normalizeLinearActivity(trackedLinear?.recent_activity),
    running: issue.running,
    retry: issue.retry,
    attempts: issue.attempts,
    tracked: issue.tracked,
    provider_linear_worker_proof: proof,
    provider_debug_snapshot: issue.provider_debug_snapshot ?? null,
    is_selected: isSelected
  };
}

function buildRunningSessionPayload(
  entry: ControlRunningPayload,
  issue: ControlIssuePayload | null
): OperatorDashboardSessionPayload {
  const proof = issue?.provider_linear_worker_proof ?? null;
  const workerHost =
    entry.worker_host ??
    issue?.worker_host ??
    resolveProviderWorkerHost({
      providerLinearWorkerProof: proof,
      providerDebugSnapshot: issue?.provider_debug_snapshot ?? null
    });
  return {
    issue_identifier: entry.issue_identifier,
    issue_id: entry.issue_id,
    task_id: issue?.task_id ?? null,
    run_id: issue?.run_id ?? null,
    summary: issue?.summary ?? null,
    display_state: entry.display_state,
    status_reason: entry.status_reason,
    pid: proof === null ? (entry.pid ?? null) : (proof.pid ?? null),
    session_id: proof?.latest_session_id ?? entry.session_id,
    thread_id: proof?.thread_id ?? null,
    turn_count: proof?.turn_count ?? entry.turn_count,
    workspace_path: issue?.workspace.path ?? proof?.workspace_path ?? null,
    host: LOCAL_HOSTNAME,
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    last_event: entry.last_event,
    last_message: entry.last_message,
    display_event: entry.display_event ?? null,
    started_at: entry.started_at,
    last_event_at: entry.last_event_at,
    tokens: proof?.tokens ?? entry.tokens
  };
}

function buildRetryQueuePayload(
  entry: ControlRetryPayload,
  issue: ControlIssuePayload | null
): OperatorDashboardRetryPayload {
  const proof = issue?.provider_linear_worker_proof ?? null;
  const workerHost =
    entry.worker_host ??
    issue?.worker_host ??
    resolveProviderWorkerHost({
      providerLinearWorkerProof: proof,
      providerDebugSnapshot: issue?.provider_debug_snapshot ?? null
    });
  return {
    issue_identifier: entry.issue_identifier,
    issue_id: entry.issue_id,
    task_id: entry.task_id ?? issue?.task_id ?? null,
    run_id: entry.run_id ?? issue?.run_id ?? null,
    summary: issue?.summary ?? null,
    display_state: entry.display_state,
    status_reason: entry.status_reason,
    session_id: entry.session_id,
    thread_id: entry.thread_id ?? null,
    turn_count: entry.turn_count ?? null,
    workspace_path: entry.workspace_path ?? null,
    host: LOCAL_HOSTNAME,
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    attempt: entry.attempt,
    due_at: entry.due_at,
    error: entry.error,
    last_event: entry.last_event,
    last_message: entry.last_message,
    started_at: entry.started_at,
    last_event_at: entry.last_event_at
  };
}

function resolveRunningIssuePayload(
  entry: ControlRunningPayload,
  issuesById: ReadonlyMap<string, ControlIssuePayload>,
  issuesByIdentifier: ReadonlyMap<string, ControlIssuePayload>
): ControlIssuePayload | null {
  if (entry.issue_id !== null) {
    const issueById = issuesById.get(entry.issue_id);
    if (issueById) {
      return issueById;
    }
  }
  return issuesByIdentifier.get(entry.issue_identifier) ?? null;
}

function resolveRetryIssuePayload(
  entry: ControlRetryPayload,
  issuesByRunId: ReadonlyMap<string, ControlIssuePayload>,
  issuesById: ReadonlyMap<string, ControlIssuePayload>,
  issuesByIdentifier: ReadonlyMap<string, ControlIssuePayload>
): ControlIssuePayload | null {
  if (entry.run_id) {
    const issueByRunId = issuesByRunId.get(entry.run_id);
    if (issueByRunId) {
      return issueByRunId;
    }
  }
  if (entry.issue_id !== null) {
    const issueById = issuesById.get(entry.issue_id);
    if (issueById) {
      return issueById;
    }
  }
  return issuesByIdentifier.get(entry.issue_identifier) ?? null;
}

function normalizeRecentAgentActivity(
  issue: ControlIssuePayload,
  proof: ControlIssuePayload['provider_linear_worker_proof'] | null
): ControlIssuePayload['recent_events'] {
  if (issue.recent_events.length > 0) {
    return issue.recent_events;
  }
  const event = issue.latest_event?.event ?? proof?.last_event ?? null;
  const message = issue.latest_event?.message ?? proof?.last_message ?? null;
  if (!event && !message) {
    return [];
  }
  return [
    {
      at: issue.latest_event?.at ?? proof?.last_event_at ?? null,
      event,
      message
    }
  ];
}

function normalizeLinearActivity(
  recentActivity: LiveLinearTrackedActivity[] | null | undefined
): LiveLinearTrackedActivity[] {
  return Array.isArray(recentActivity) ? recentActivity : [];
}
