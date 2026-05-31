import { hostname } from 'node:os';

import type { ProviderIntakeSummaryPayload } from './providerIntakeState.js';
import type { LiveLinearTrackedActivity } from './linearDispatchSource.js';
import type {
  ControlCodexTotalsPayload,
  CompatibilityProjectionIssueRecord,
  ControlCompatibilityProjectionSnapshot,
  ControlDispatchPilotPayload,
  ControlIssuePayload,
  ControlPollingHealthPayload,
  ControlRetryPayload,
  ControlRunningPayload,
  ControlSelectedRunPayload,
  ControlStatusFallbackExpiryMetadata,
  ControlTrackedPayload,
  ControlProviderIntakeUnavailablePayload,
  ControlProviderWorkflowPayload
} from './observabilityReadModel.js';
import type { ControlRepoGatesPayload } from './docsFreshnessRepoGate.js';
import {
  readProviderLinearWorkerWorkspacePath,
  resolveProviderWorkerHost
} from './observabilityReadModel.js';
import { isoTimestamp } from '../utils/time.js';

const LOCAL_HOSTNAME = hostname();

export interface OperatorDashboardPresenterContext {
  readCompatibilityProjection(signal?: AbortSignal): Promise<ControlCompatibilityProjectionSnapshot>;
}

export interface OperatorDashboardSessionPayload {
  issue_identifier: string;
  issue_id: string | null;
  id?: string | null;
  bucket?: 'running';
  state?: string;
  reason?: string | null;
  aliases?: string[];
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
  worker_control?: NonNullable<ControlIssuePayload['provider_linear_worker_proof']>['worker_control'] | null;
  resolved_model_provenance?: ControlRunningPayload['resolved_model_provenance'];
  goal_summary?: OperatorDashboardGoalSummary | null;
  last_event: string | null;
  last_message: string | null;
  display_event?: string | null;
  started_at: string | null;
  last_event_at: string | null;
  tokens: ControlRunningPayload['tokens'];
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
}

export interface OperatorDashboardRetryPayload {
  issue_identifier: string;
  issue_id: string | null;
  id?: string | null;
  bucket?: 'retrying';
  state?: string;
  reason?: string | null;
  aliases?: string[];
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
  resolved_model_provenance?: ControlRetryPayload['resolved_model_provenance'];
  attempt: number | null;
  due_at: string | null;
  error: string | null;
  last_event: string | null;
  last_message: string | null;
  started_at: string | null;
  last_event_at: string | null;
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
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
  worker_control?: NonNullable<ControlIssuePayload['provider_linear_worker_proof']>['worker_control'] | null;
  goal_summary?: OperatorDashboardGoalSummary | null;
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
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
  is_selected: boolean;
}

export type OperatorDashboardGoalSummaryState =
  | 'missing'
  | 'unavailable'
  | 'stale'
  | 'mismatched_thread'
  | 'active'
  | 'complete';

export interface OperatorDashboardGoalSummary {
  state: OperatorDashboardGoalSummaryState;
  authority: 'advisory_only';
  issue_id: string | null;
  task_key: string | null;
  checksum: string | null;
  checksum_short: string | null;
  goal_key: string | null;
  capture_mode: string | null;
  status: string | null;
  thread_id: string | null;
  turn_id: string | null;
  objective_preview: string | null;
  reason: string | null;
  updated_at: string | null;
}

export interface OperatorDashboardDegradedPayload {
  reason: 'read_failed' | 'read_timeout';
  source: 'ui_data_controller';
  message: string;
  timeout_ms?: number | null;
  generated_at: string;
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
  repo_gates?: ControlRepoGatesPayload | null;
  provider_intake?: ProviderIntakeSummaryPayload | null;
  provider_intake_unavailable?: ControlProviderIntakeUnavailablePayload;
  dispatch_pilot?: ControlDispatchPilotPayload;
  tracked?: ControlTrackedPayload | null;
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
  dashboard_degraded?: OperatorDashboardDegradedPayload;
}

export interface CompatibilityIssueRecordLookups {
  byId: ReadonlyMap<string, CompatibilityProjectionIssueRecord>;
  byRunId: ReadonlyMap<string, CompatibilityProjectionIssueRecord>;
  byIdentifier: ReadonlyMap<string, CompatibilityProjectionIssueRecord>;
}

export function buildUiDataset(input: {
  projection: ControlCompatibilityProjectionSnapshot;
  generatedAt?: string;
}): OperatorDashboardDataset {
  const generatedAt = input.generatedAt ?? isoTimestamp();
  const selectedIssueIdentifier = input.projection.selected?.issue_identifier ?? null;
  const issueRecords = input.projection.issues;
  const issuePayloads = issueRecords.map((record) => record.payload);
  const issueRecordLookups = buildCompatibilityIssueRecordLookups(issueRecords);

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
      buildRunningSessionPayload(entry, resolveRunningIssueRecord(entry, issueRecordLookups))
    ),
    retrying: input.projection.retrying.map((entry) =>
      buildRetryQueuePayload(entry, resolveRetryIssueRecord(entry, issueRecordLookups))
    ),
    issues: issuePayloads.map((issue) => buildIssuePayload(issue, issue.issue_identifier === selectedIssueIdentifier)),
    ...(input.projection.fallbackExpiry ? { fallback_expiry: input.projection.fallbackExpiry } : {}),
    ...(input.projection.providerWorkflow ? { provider_workflow: input.projection.providerWorkflow } : {}),
    ...(input.projection.repoGates ? { repo_gates: input.projection.repoGates } : {}),
    ...(input.projection.providerIntake ? { provider_intake: input.projection.providerIntake } : {}),
    ...(input.projection.providerIntakeUnavailable
      ? {
          provider_intake: null,
          provider_intake_unavailable: input.projection.providerIntakeUnavailable
        }
      : {}),
    ...(input.projection.dispatchPilot ? { dispatch_pilot: input.projection.dispatchPilot } : {}),
    ...(input.projection.tracked ? { tracked: input.projection.tracked } : {})
  };
}

export function buildDegradedUiDataset(input: {
  reason: OperatorDashboardDegradedPayload['reason'];
  message: string;
  timeoutMs?: number | null;
  generatedAt?: string;
}): OperatorDashboardDataset {
  const generatedAt = input.generatedAt ?? isoTimestamp();
  return {
    generated_at: generatedAt,
    mode: 'operator_dashboard',
    read_only: true,
    host: LOCAL_HOSTNAME,
    counts: {
      running: 0,
      retrying: 0,
      issues: 0,
      max_allowed: null
    },
    totals: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 0
    },
    rate_limits: null,
    polling: null,
    selected_issue_identifier: null,
    selected: null,
    running: [],
    retrying: [],
    issues: [],
    dashboard_degraded: {
      reason: input.reason,
      source: 'ui_data_controller',
      message: input.message,
      timeout_ms: input.timeoutMs ?? null,
      generated_at: generatedAt
    }
  };
}

export function buildCompatibilityIssueRecordLookups(
  issueRecords: CompatibilityProjectionIssueRecord[]
): CompatibilityIssueRecordLookups {
  const records = issueRecords ?? [];
  return {
    byId: new Map(
      records.flatMap((issue) =>
        issue.payload.issue_id === null ? [] : [[issue.payload.issue_id, issue] as const]
      )
    ),
    byRunId: new Map(
      records.flatMap((issue) =>
        issue.payload.run_id === null ? [] : [[issue.payload.run_id, issue] as const]
      )
    ),
    byIdentifier: new Map(
      records.map((issue) => [issue.payload.issue_identifier, issue] as const)
    )
  };
}

export async function readUiDataset(
  context: OperatorDashboardPresenterContext,
  options: { signal?: AbortSignal } = {}
): Promise<OperatorDashboardDataset> {
  const projection = await context.readCompatibilityProjection(options.signal);
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
  const stageStartedAt =
    running?.started_at ??
    issue.retry?.started_at ??
    issue.provider_debug_snapshot?.claim?.launch_started_at ??
    null;
  const workerHost =
    issue.worker_host ??
    resolveProviderWorkerHost({
      providerLinearWorkerProof: proof,
      providerDebugSnapshot: issue.provider_debug_snapshot ?? null,
      stageStartedAt
    });
  const proofWorkspacePath = readProviderLinearWorkerWorkspacePath(
    proof,
    stageStartedAt,
    issue.provider_debug_snapshot ?? null
  );
  const goalSummary = buildProviderGoalSummary(proof, issue.issue_id, issue.task_id);

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
      path: issue.workspace.path ?? proofWorkspacePath ?? null,
      host: LOCAL_HOSTNAME
    },
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    worker_control: proof?.worker_control ?? null,
    ...(goalSummary ? { goal_summary: goalSummary } : {}),
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
    ...(issue.fallback_expiry ? { fallback_expiry: issue.fallback_expiry } : {}),
    is_selected: isSelected
  };
}

function buildRunningSessionPayload(
  entry: ControlRunningPayload,
  issueRecord: CompatibilityProjectionIssueRecord | null
): OperatorDashboardSessionPayload {
  const issue = issueRecord?.payload ?? null;
  const proof = issue?.provider_linear_worker_proof ?? null;
  const stageStartedAt =
    entry.started_at ??
    issue?.running?.started_at ??
    issue?.provider_debug_snapshot?.claim?.launch_started_at ??
    null;
  const workerHost =
    entry.worker_host ??
    issue?.worker_host ??
    resolveProviderWorkerHost({
      providerLinearWorkerProof: proof,
      providerDebugSnapshot: issue?.provider_debug_snapshot ?? null,
      stageStartedAt
    });
  const proofWorkspacePath = readProviderLinearWorkerWorkspacePath(
    proof,
    stageStartedAt,
    issue?.provider_debug_snapshot ?? null
  );
  const issueWorkspacePath = issue?.workspace.path ?? null;
  const resolvedModelProvenance =
    entry.resolved_model_provenance ??
    issue?.running?.resolved_model_provenance ??
    proof?.resolved_model_provenance ??
    null;
  const goalSummary = buildProviderGoalSummary(proof, entry.issue_id, issue?.task_id ?? entry.issue_identifier);
  return {
    issue_identifier: entry.issue_identifier,
    issue_id: entry.issue_id,
    id: issueRecord?.issueIdentifier ?? entry.issue_identifier,
    bucket: 'running',
    state: entry.state,
    reason: entry.status_reason,
    aliases: resolveCompatibilityAliases({
      issueRecord,
      issueIdentifier: entry.issue_identifier,
      issueId: entry.issue_id,
      taskId: issue?.task_id ?? null,
      runId: issue?.run_id ?? null
    }),
    task_id: issue?.task_id ?? null,
    run_id: issue?.run_id ?? null,
    summary: issue?.summary ?? null,
    display_state: entry.display_state,
    status_reason: entry.status_reason,
    pid: proof === null ? (entry.pid ?? null) : (proof.pid ?? null),
    session_id: proof?.latest_session_id ?? entry.session_id,
    thread_id: proof?.thread_id ?? null,
    turn_count: proof?.turn_count ?? entry.turn_count,
    workspace_path: issueWorkspacePath ?? proofWorkspacePath ?? null,
    host: LOCAL_HOSTNAME,
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    ...(resolvedModelProvenance ? { resolved_model_provenance: resolvedModelProvenance } : {}),
    ...(goalSummary ? { goal_summary: goalSummary } : {}),
    worker_control: proof?.worker_control ?? null,
    last_event: entry.last_event,
    last_message: entry.last_message,
    display_event: entry.display_event ?? null,
    started_at: entry.started_at,
    last_event_at: entry.last_event_at,
    tokens: proof?.tokens ?? entry.tokens,
    ...(entry.fallback_expiry ? { fallback_expiry: entry.fallback_expiry } : {})
  };
}

function buildProviderGoalSummary(
  proof: ControlIssuePayload['provider_linear_worker_proof'] | null | undefined,
  issueId: string | null | undefined,
  taskId: string | null | undefined
): OperatorDashboardGoalSummary | null {
  if (!proof) {
    return null;
  }
  const evidence = proof.goal_evidence ?? null;
  const intent = proof.goal_intent ?? null;
  if (!evidence && !intent) {
    return null;
  }
  const captureMode = normalizeDashboardGoalString(evidence?.capture_mode);
  const intentStatus = normalizeDashboardGoalString(intent?.status);
  const intentMissingPrerequisite = intentStatus === 'missing_prerequisite';
  const intentSpecChecksum = normalizeDashboardGoalString(intent?.spec_checksum);
  const intentGoalKey = normalizeDashboardGoalString(intent?.goal_key);
  const evidenceSpecChecksum = normalizeDashboardGoalString(evidence?.spec_checksum);
  const evidenceGoalKey = normalizeDashboardGoalString(evidence?.goal_key);
  const evidenceObjective = normalizeDashboardGoalString(evidence?.objective);
  const evidenceMismatchesIntent =
    intentStatus === 'ready' &&
    (
      (evidenceSpecChecksum !== null && intentSpecChecksum !== null && evidenceSpecChecksum !== intentSpecChecksum) ||
      (evidenceGoalKey !== null && intentGoalKey !== null && evidenceGoalKey !== intentGoalKey)
    );
  const evidenceMatchesIntent =
    intentStatus === 'ready' &&
    (
      (evidenceSpecChecksum !== null && evidenceSpecChecksum === intentSpecChecksum) ||
      (evidenceGoalKey !== null && evidenceGoalKey === intentGoalKey) ||
      (intentGoalKey !== null &&
        intentSpecChecksum !== null &&
        evidenceObjective?.includes(intentGoalKey) === true &&
        evidenceObjective.includes(intentSpecChecksum))
    );
  const evidenceIdentityUnverified =
    captureMode === 'captured' &&
    !evidenceMatchesIntent &&
    !evidenceMismatchesIntent;
  const evidenceIdentityIsBlocked =
    captureMode === 'stale' ||
    captureMode === 'thread_mismatch' ||
    evidenceMismatchesIntent ||
    evidenceIdentityUnverified;
  const status = intentMissingPrerequisite
    ? intentStatus
    : evidenceIdentityIsBlocked
      ? null
      : normalizeDashboardGoalString(evidence?.status) ?? intentStatus;
  const checksum = intentMissingPrerequisite
    ? normalizeDashboardGoalString(intent?.spec_checksum)
    : evidenceIdentityIsBlocked
      ? evidenceSpecChecksum
      : evidenceSpecChecksum ?? intentSpecChecksum;
  const goalKey = intentMissingPrerequisite
    ? normalizeDashboardGoalString(intent?.goal_key)
    : evidenceIdentityIsBlocked
      ? evidenceGoalKey
      : evidenceGoalKey ?? intentGoalKey;
  const taskKey = intentMissingPrerequisite
    ? normalizeDashboardGoalString(intent?.provider_issue_task_key) ?? normalizeDashboardGoalString(taskId)
    : normalizeDashboardGoalString(evidence?.provider_issue_task_key) ??
      normalizeDashboardGoalString(intent?.provider_issue_task_key) ??
      normalizeDashboardGoalString(taskId);
  const objective = intentMissingPrerequisite
    ? normalizeDashboardGoalString(intent?.objective)
    : evidenceIdentityIsBlocked
      ? evidenceObjective
      : evidenceObjective ??
      normalizeDashboardGoalString(intent?.objective);
  return {
    state: intentMissingPrerequisite
      ? 'missing'
      : evidenceMismatchesIntent || evidenceIdentityUnverified
        ? 'stale'
        : resolveProviderGoalSummaryState(captureMode, status, evidence === null),
    authority: 'advisory_only',
    issue_id: proof.issue_id ?? issueId ?? null,
    task_key: taskKey,
    checksum,
    checksum_short: checksum ? checksum.slice(0, 16) : null,
    goal_key: goalKey,
    capture_mode: captureMode,
    status,
    thread_id: normalizeDashboardGoalString(evidence?.thread_id) ?? proof.thread_id ?? null,
    turn_id: normalizeDashboardGoalString(evidence?.turn_id) ?? proof.latest_turn_id ?? null,
    objective_preview: objective ? truncateDashboardGoalText(objective, 160) : null,
    reason: intentMissingPrerequisite
      ? normalizeDashboardGoalString(intent?.reason) ?? normalizeDashboardGoalString(evidence?.reason)
      : evidenceMismatchesIntent
        ? evidenceSpecChecksum !== null && intentSpecChecksum !== null && evidenceSpecChecksum !== intentSpecChecksum
          ? `goal_spec_checksum_mismatch:${evidenceSpecChecksum}->${intentSpecChecksum}`
          : `goal_key_mismatch:${evidenceGoalKey}->${intentGoalKey}`
        : evidenceIdentityUnverified
          ? 'goal_identity_unverified'
          : normalizeDashboardGoalString(evidence?.reason) ??
            normalizeDashboardGoalString(intent?.reason),
    updated_at:
      normalizeDashboardGoalString(evidence?.updated_at) ??
      normalizeDashboardGoalString(evidence?.capture_timestamp) ??
      proof.updated_at ??
      null
  };
}

function resolveProviderGoalSummaryState(
  captureMode: string | null,
  status: string | null,
  evidenceMissing: boolean
): OperatorDashboardGoalSummaryState {
  if (evidenceMissing || captureMode === null || captureMode === 'cleared') {
    return 'missing';
  }
  switch (captureMode) {
    case 'disabled':
    case 'unavailable':
      return 'unavailable';
    case 'stale':
      return 'stale';
    case 'thread_mismatch':
      return 'mismatched_thread';
    case 'captured': {
      const normalizedStatus = status?.toLowerCase() ?? '';
      return ['complete', 'completed', 'done', 'succeeded'].includes(normalizedStatus)
        ? 'complete'
        : 'active';
    }
    default:
      return 'unavailable';
  }
}

function normalizeDashboardGoalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.replace(/\r\n|\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function truncateDashboardGoalText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildRetryQueuePayload(
  entry: ControlRetryPayload,
  issueRecord: CompatibilityProjectionIssueRecord | null
): OperatorDashboardRetryPayload {
  const issue = issueRecord?.payload ?? null;
  const proof = issue?.provider_linear_worker_proof ?? null;
  const workerHost =
    entry.worker_host ??
    issue?.worker_host ??
    resolveProviderWorkerHost({
      providerLinearWorkerProof: proof,
      providerDebugSnapshot: issue?.provider_debug_snapshot ?? null,
      stageStartedAt:
        entry.started_at ??
        issue?.retry?.started_at ??
        issue?.provider_debug_snapshot?.claim?.launch_started_at ??
        null
    });
  const resolvedModelProvenance =
    entry.resolved_model_provenance ??
    issue?.retry?.resolved_model_provenance ??
    proof?.resolved_model_provenance ??
    null;
  return {
    issue_identifier: entry.issue_identifier,
    issue_id: entry.issue_id,
    id: issueRecord?.issueIdentifier ?? entry.issue_identifier,
    bucket: 'retrying',
    state: entry.state,
    reason: entry.status_reason,
    aliases: resolveCompatibilityAliases({
      issueRecord,
      issueIdentifier: entry.issue_identifier,
      issueId: entry.issue_id,
      taskId: entry.task_id ?? issue?.task_id ?? null,
      runId: entry.run_id ?? issue?.run_id ?? null
    }),
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
    ...(resolvedModelProvenance ? { resolved_model_provenance: resolvedModelProvenance } : {}),
    attempt: entry.attempt,
    due_at: entry.due_at,
    error: entry.error,
    last_event: entry.last_event,
    last_message: entry.last_message,
    started_at: entry.started_at,
    last_event_at: entry.last_event_at,
    ...(entry.fallback_expiry ? { fallback_expiry: entry.fallback_expiry } : {})
  };
}

export function resolveRunningIssueRecord(
  entry: ControlRunningPayload,
  issueRecordLookups: CompatibilityIssueRecordLookups
): CompatibilityProjectionIssueRecord | null {
  if (entry.issue_id !== null) {
    const issueById = issueRecordLookups.byId.get(entry.issue_id);
    if (issueById) {
      return issueById;
    }
  }
  return issueRecordLookups.byIdentifier.get(entry.issue_identifier) ?? null;
}

export function resolveRetryIssueRecord(
  entry: ControlRetryPayload,
  issueRecordLookups: CompatibilityIssueRecordLookups
): CompatibilityProjectionIssueRecord | null {
  if (entry.run_id) {
    const issueByRunId = issueRecordLookups.byRunId.get(entry.run_id);
    if (issueByRunId) {
      return issueByRunId;
    }
  }
  if (entry.issue_id !== null) {
    const issueById = issueRecordLookups.byId.get(entry.issue_id);
    if (issueById) {
      return issueById;
    }
  }
  return issueRecordLookups.byIdentifier.get(entry.issue_identifier) ?? null;
}

function resolveCompatibilityAliases(input: {
  issueRecord: CompatibilityProjectionIssueRecord | null;
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
}): string[] {
  const aliases = [
    ...(input.issueRecord?.aliases ?? []),
    input.issueIdentifier,
    input.issueId,
    input.taskId,
    input.runId
  ];
  return Array.from(
    new Set(aliases.filter((alias): alias is string => typeof alias === 'string' && alias.length > 0))
  );
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
