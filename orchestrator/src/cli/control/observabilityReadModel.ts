import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { ControlPollingHealthPayload } from './providerPollingHealth.js';
import type {
  ProviderIntakeRetrySummaryPayload,
  ProviderIntakeSummaryPayload,
  ProviderIntakeSummarySelectionStrategy,
  ProviderIntakeSummaryScope,
  ProviderIntakeSummaryState
} from './providerIntakeState.js';
import type { QuestionUrgency } from './questions.js';
import type {
  ProviderLinearWorkerProof,
  ProviderLinearWorkerResolvedModelProvenance
} from '../providerLinearWorkerRunner.js';
import type {
  ControlProviderDebugSnapshot,
  ProviderIntakeClaimFreshness,
  ProviderLinearWorkerProgressCandidate
} from './providerIssueObservability.js';
import { isProviderLinearWorkerProofFreshForStage } from './providerLinearWorkerTruth.js';
import type { ProviderWorkerHostConfig } from './providerWorkerHosts.js';
import { normalizeProviderWorkerHostName } from './providerWorkerHosts.js';

export type { ControlPollingHealthPayload } from './providerPollingHealth.js';

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
  source?: string | null;
  messageRecordedAt?: string | null;
  sourceUpdatedAt?: string | null;
  candidates?: ProviderLinearWorkerProgressCandidate[];
  requestedBy: string | null;
  reason: string | null;
}

export interface ControlTrackedLinearPayload {
  provider: string;
  id: string;
  identifier: string;
  title: string;
  url: string | null;
  state: string | null;
  state_type: string | null;
  workspace_id: string | null;
  team_id: string | null;
  team_key: string | null;
  team_name: string | null;
  project_id: string | null;
  project_name: string | null;
  updated_at: string | null;
  recent_activity: LiveLinearTrackedIssue['recent_activity'];
}

export interface ControlTrackedPayload {
  linear: ControlTrackedLinearPayload | null;
}

export interface SelectedRunStageSummary {
  id: string;
  title: string;
  status: string | null;
}

export interface ControlDispatchPilotPayload {
  status?: string | null;
  source_status?: string | null;
  reason?: string | null;
}

export interface ControlProviderTerminalCleanupLastResultPayload {
  attempted_at: string;
  status: 'disabled' | 'noop' | 'succeeded' | 'failed';
  summary: string;
  error: string | null;
  issue_id: string;
  issue_identifier: string | null;
  workspace_path: string;
  branch: string | null;
  attached_pr_urls: string[];
  matching_open_pr_urls: string[];
  closed_pr_urls: string[];
}

export interface ControlProviderTerminalCleanupPayload {
  enabled: boolean;
  close_attached_pr: {
    enabled: boolean;
    comment_template: string;
  };
  last_result: ControlProviderTerminalCleanupLastResultPayload | null;
}

export type ControlProviderWorkerHostPayload = ProviderWorkerHostConfig;

export interface ControlProviderOperatorAutopilotLinearTransitionPayload {
  status: 'transitioned' | 'noop' | 'failed';
  attempted_at: string;
  previous_state: string | null;
  target_state: string;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  force_path_used?: boolean;
  error: string | null;
}

export interface ControlProviderOperatorAutopilotActionPayload {
  kind: 'backlog_promotion' | 'review_handoff_rework';
  issue_id: string;
  issue_identifier: string | null;
  reason: string;
  summary: string;
  transition: ControlProviderOperatorAutopilotLinearTransitionPayload;
  action_required_reasons: string[];
}

export interface ControlProviderOperatorAutopilotHoldPayload {
  kind: 'backlog_promotion' | 'review_handoff_rework';
  issue_id: string | null;
  issue_identifier: string | null;
  issue_state?: string | null;
  issue_state_type?: string | null;
  issue_updated_at?: string | null;
  promotion_attempted_at?: string | null;
  promotion_issue_updated_at?: string | null;
  force_path_used?: boolean;
  reason: string;
  summary: string;
  action_required_reasons: string[];
}

export interface ControlProviderOperatorAutopilotPendingActionPayload {
  kind: 'local_rollout';
  action_instance_id: string;
  issue_id: string;
  issue_identifier: string | null;
  summary: string;
  merge_closeout_recorded_at: string;
  merge_closeout_reason: string;
  shared_root_status: string | null;
  linear_transition_status: string | null;
  executable_action_ids?: string[];
  lifecycle_state: 'pending' | 'acknowledged';
  lifecycle_actor: string | null;
  lifecycle_reason: string | null;
  lifecycle_recorded_at: string | null;
}

export interface ControlProviderOperatorAutopilotResolvedActionPayload {
  kind: 'local_rollout';
  action_instance_id: string;
  issue_id: string;
  issue_identifier: string | null;
  summary: string;
  merge_closeout_recorded_at: string;
  merge_closeout_reason: string;
  shared_root_status: string | null;
  linear_transition_status: string | null;
  executable_action_ids?: string[];
  lifecycle_state: 'cleared' | 'dismissed';
  lifecycle_actor: string;
  lifecycle_reason: string;
  lifecycle_recorded_at: string;
}

export interface ControlProviderOperatorAutopilotBacklogPromotionSnapshotPayload {
  issue_id: string;
  issue_identifier: string | null;
  target_state: string;
  attempted_at: string;
  issue_updated_at: string | null;
  force_path_used: boolean;
  untracked_cycles?: number;
}

export interface ControlProviderOperatorAutopilotBacklogPromotionSnapshotRetentionPayload {
  issue_id: string;
  issue_identifier: string | null;
  target_state: string;
  attempted_at: string;
  issue_updated_at: string | null;
  evaluated_at: string;
  decision: 'retained' | 'pruned';
  reason:
    | 'temporarily_untracked'
    | 'stale_untracked_cycle_limit'
    | 'terminal_state'
    | 'tracked_archived_or_trashed'
    | 'tracked_non_backlog_non_target_state'
    | 'tracked_state_reset_untracked_cycles';
  age_ms: number | null;
  untracked_cycles: number;
  max_untracked_cycles: number;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_archived_at: string | null;
  issue_trashed: boolean | null;
  issue_observed_updated_at: string | null;
  terminal_state_evidence: boolean;
  force_path_used: boolean;
}

export interface ControlProviderOperatorAutopilotLifecycleRecordPayload {
  action_instance_id: string;
  kind: 'local_rollout';
  issue_id: string;
  issue_identifier: string | null;
  state: 'acknowledged' | 'cleared' | 'dismissed';
  actor: string;
  reason: string;
  recorded_at: string;
  source: 'co-status' | 'operator-autopilot';
}

export interface ControlProviderOperatorAutopilotLocalRolloutExecutionAttemptPayload {
  record_kind?: 'started' | 'terminal';
  action_instance_id: string;
  action_id: string;
  issue_id: string;
  issue_identifier: string | null;
  preflight: {
    status: 'passed' | 'skipped' | 'failed';
    reason: string | null;
    checked_at: string;
    summary: string;
  };
  started_at: string | null;
  ended_at: string;
  terminal_state: 'succeeded' | 'skipped' | 'failed';
  reason: string | null;
  summary: string;
  command: {
    runner: 'codex_orchestrator' | 'npm_script' | null;
    command: string | null;
    args: string[];
    cwd: string | null;
    timeout_ms: number | null;
  };
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
}

export interface ControlProviderOperatorAutopilotTerminalBlockerAdvisoryPayload {
  kind: 'terminal_blocker_cleanup';
  issue_id: string;
  issue_identifier: string | null;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  blockers: Array<{
    id: string | null;
    identifier: string | null;
    state: string | null;
    state_type: string | null;
  }>;
  canonical_owner_hints: string[];
  duplicate_hints: string[];
  recommended_action: 'duplicate_cleanup' | 'ready_to_unblock';
  summary: string;
}

export interface ControlProviderOperatorAutopilotStatusDatasetBoundsPayload {
  limit: number;
  truncated: boolean;
  omitted_counts: {
    actions: number;
    holds: number;
    pending_actions: number;
    terminal_blocker_advisories: number;
    resolved_actions: number;
    lifecycle_records: number;
    local_rollout_execution_attempts: number;
    backlog_promotion_snapshots: number;
    backlog_promotion_snapshot_retention_records: number;
  };
}

export interface ControlProviderOperatorAutopilotLastResultPayload {
  recorded_at: string;
  status: 'disabled' | 'noop' | 'acted' | 'failed';
  summary: string;
  error: string | null;
  actions: ControlProviderOperatorAutopilotActionPayload[];
  holds: ControlProviderOperatorAutopilotHoldPayload[];
  pending_actions: ControlProviderOperatorAutopilotPendingActionPayload[];
  terminal_blocker_advisories?: ControlProviderOperatorAutopilotTerminalBlockerAdvisoryPayload[];
  resolved_actions?: ControlProviderOperatorAutopilotResolvedActionPayload[];
  lifecycle_records?: ControlProviderOperatorAutopilotLifecycleRecordPayload[];
  local_rollout_execution_attempts?: ControlProviderOperatorAutopilotLocalRolloutExecutionAttemptPayload[];
  backlog_promotion_snapshots?: ControlProviderOperatorAutopilotBacklogPromotionSnapshotPayload[];
  backlog_promotion_snapshot_retention_records?: ControlProviderOperatorAutopilotBacklogPromotionSnapshotRetentionPayload[];
  status_dataset_bounds?: ControlProviderOperatorAutopilotStatusDatasetBoundsPayload;
}

export interface ControlProviderOperatorAutopilotPayload {
  enabled: boolean;
  backlog_promotion: {
    enabled: boolean;
    state_name: string;
    target_state_name: string;
    snapshot_retention?: {
      max_untracked_cycles: number;
      terminal_state_types: string[];
    };
  };
  review_handoff_rework: {
    enabled: boolean;
    target_state_name: string;
    excluded_action_required_reasons: string[];
  };
  post_merge_rollout: {
    enabled: boolean;
    summary: string;
    execution?: unknown;
  };
  audit_path: string;
  lifecycle_path?: string;
  execution_path?: string;
  last_result: ControlProviderOperatorAutopilotLastResultPayload | null;
}

export interface ControlProviderWorkflowPayload {
  status: 'ready' | 'reload_failed';
  pipeline_id: string;
  source_path: string;
  snapshot_path: string | null;
  last_reload_attempt_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  terminal_cleanup?: ControlProviderTerminalCleanupPayload | null;
  worker_hosts?: ControlProviderWorkerHostPayload[] | null;
  operator_autopilot?: ControlProviderOperatorAutopilotPayload | null;
}

type ResolvedWorkerHost =
  | { kind: 'missing' }
  | { kind: 'cleared' }
  | { kind: 'host'; value: string };

interface SharedSelectedProjectionFields {
  issueProvider: string | null;
  issueIdentifier: string;
  issueId: string | null;
  hasAuthoritativeIssueIdentity?: boolean;
  taskId: string | null;
  runId: string | null;
  lookupAliases: string[];
  rawStatus: string;
  displayStatus: string;
  statusReason: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  lastError: string | null;
  latestAction: string | null;
  latestEvent: SelectedRunLatestEvent | null;
  workspacePath: string | null;
  pipelineId?: string | null;
  pipelineTitle: string | null;
  stages: SelectedRunStageSummary[];
  approvalsTotal: number;
  manifestPath?: string | null;
  runDir?: string | null;
  questionSummary: SelectedRunQuestionSummary;
  tracked: ControlTrackedPayload | null;
  compatibilityState?: string | null;
  providerLinearWorkerProof?: ProviderLinearWorkerProof | null;
  providerDebugSnapshot?: ControlProviderDebugSnapshot | null;
  providerRetryState?: ControlProviderRetryState | null;
}

export interface SelectedRunContext extends SharedSelectedProjectionFields {}

export interface ControlQuestionSummaryPayload {
  queued_count: number;
  latest_question: {
    question_id: string;
    prompt: string;
    urgency: string;
    queued_at: string;
  } | null;
}

export interface ControlLatestEventPayload {
  event: string | null;
  message: string | null;
  at: string | null;
  source?: string | null;
  message_recorded_at?: string | null;
  source_updated_at?: string | null;
  candidates?: ProviderLinearWorkerProgressCandidate[];
  requested_by?: string | null;
  reason?: string | null;
}

export type ControlStatusFallbackDecision =
  | 'remove fallback'
  | 'expire fallback'
  | 'justify retaining fallback';

export interface ControlStatusFallbackExpiryMetadata {
  surface: string;
  fallback: string;
  decision: ControlStatusFallbackDecision;
  owner: string;
  trigger: string;
  introduced_date: string;
  review_date: string | null;
  maximum_lifetime: string | null;
  removal_condition: string;
  validation: string;
}

export interface ControlSelectedRunPayload {
  issue_id: string | null;
  issue_identifier: string;
  task_id: string | null;
  run_id: string | null;
  raw_status: string;
  display_status: string;
  status_reason: string | null;
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  summary: string | null;
  last_error: string | null;
  latest_action: string | null;
  latest_event: ControlLatestEventPayload | null;
  workspace: {
    path: string | null;
  };
  worker_host?: string | null;
  resolved_model_provenance?: ProviderLinearWorkerResolvedModelProvenance | null;
  question_summary: ControlQuestionSummaryPayload;
  tracked: ControlTrackedPayload;
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
  provider_linear_worker_proof?: ProviderLinearWorkerProof;
  provider_debug_snapshot?: ControlProviderDebugSnapshot | null;
}

export interface ControlTokenUsagePayload {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  reasoning_output_tokens?: number | null;
}

export interface ControlCodexTotalsPayload extends ControlTokenUsagePayload {
  seconds_running: number;
}

export interface ControlProviderRetryState {
  active: boolean;
  attempt: number | null;
  due_at: string | null;
  error: string | null;
}

export interface ControlRunningPayload {
  issue_id: string | null;
  issue_identifier: string;
  state: string;
  display_state: string;
  status_reason: string | null;
  pid: string | null;
  worker_host?: string | null;
  resolved_model_provenance?: ProviderLinearWorkerResolvedModelProvenance | null;
  session_id: string | null;
  turn_count: number | null;
  last_event: string | null;
  last_message: string | null;
  display_event?: string | null;
  event_source?: string | null;
  message_recorded_at?: string | null;
  source_updated_at?: string | null;
  event_candidates?: ProviderLinearWorkerProgressCandidate[];
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
  started_at: string | null;
  last_event_at: string | null;
  tokens: ControlTokenUsagePayload;
}

export interface ControlRetryPayload {
  issue_id: string | null;
  issue_identifier: string;
  task_id?: string | null;
  run_id?: string | null;
  state: string;
  display_state: string;
  status_reason: string | null;
  session_id: string | null;
  worker_host?: string | null;
  resolved_model_provenance?: ProviderLinearWorkerResolvedModelProvenance | null;
  thread_id?: string | null;
  turn_count?: number | null;
  workspace_path: string | null;
  attempt: number | null;
  due_at: string | null;
  error: string | null;
  last_event: string | null;
  last_message: string | null;
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
  started_at: string | null;
  last_event_at: string | null;
}

export interface ControlProviderIntakeSelectedClaimPayload {
  issue_identifier: string;
  task_id: string;
  state: ProviderIntakeSummaryState;
  reason: string | null;
  run_id: string | null;
  freshness: ProviderIntakeClaimFreshness | null;
  retry: ProviderIntakeRetrySummaryPayload | null;
  worker_host?: string | null;
}

export interface ControlProviderIntakePayload {
  summary_scope: ProviderIntakeSummaryScope;
  selection_strategy: ProviderIntakeSummarySelectionStrategy | null;
  claim_count: number;
  active_claim_count: number;
  running_claim_count: number;
  active_issue_identifiers: string[];
  running_issue_identifiers: string[];
  selected_claim: ControlProviderIntakeSelectedClaimPayload;
  rehydrated_at: string | null;
  is_rehydrated: boolean;
  updated_at: string;
}

export type ControlProviderIntakeUnavailableReason =
  | 'raw_provider_intake_unavailable'
  | 'raw_provider_intake_read_failed';

export interface ControlProviderIntakeUnavailablePayload {
  reason: ControlProviderIntakeUnavailableReason;
  updated_at: string | null;
}

export interface ControlStatePayload {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  running_ids: string[];
  retrying_ids: string[];
  running: ControlRunningPayload[];
  retrying: ControlRetryPayload[];
  codex_totals: ControlCodexTotalsPayload;
  rate_limits: Record<string, unknown> | null;
  selected: ControlSelectedRunPayload | null;
  dispatch_pilot?: ControlDispatchPilotPayload;
  tracked?: ControlTrackedPayload;
  provider_intake?: ControlProviderIntakePayload | null;
  provider_intake_unavailable?: ControlProviderIntakeUnavailablePayload;
  provider_workflow?: ControlProviderWorkflowPayload;
  polling?: ControlPollingHealthPayload | null;
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
}

export interface ControlSelectedRunRuntimeSnapshot {
  selected: SelectedRunContext | null;
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
  providerIntake?: ProviderIntakeSummaryPayload | null;
  providerIntakeUnavailable?: ControlProviderIntakeUnavailablePayload | null;
  providerWorkflow?: ControlProviderWorkflowPayload | null;
  polling?: ControlPollingHealthPayload | null;
}

export interface ControlCompatibilitySourceContext extends SharedSelectedProjectionFields {}

export interface ControlCompatibilityRuntimeSnapshot {
  selected: ControlCompatibilitySourceContext | null;
  running: ControlCompatibilitySourceContext[];
  retrying: ControlCompatibilitySourceContext[];
  maxConcurrentAgents?: number | null;
  codexTotals: ControlCodexTotalsPayload;
  rateLimits: Record<string, unknown> | null;
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
  providerIntake?: ProviderIntakeSummaryPayload | null;
  providerIntakeUnavailable?: ControlProviderIntakeUnavailablePayload | null;
  providerWorkflow?: ControlProviderWorkflowPayload | null;
  polling?: ControlPollingHealthPayload | null;
}

export interface CompatibilityProjectionIssueRecord {
  issueIdentifier: string;
  aliases: string[];
  payload: ControlIssuePayload;
}

export interface ControlCompatibilityProjectionSnapshot {
  running: ControlRunningPayload[];
  retrying: ControlRetryPayload[];
  maxConcurrentAgents?: number | null;
  codexTotals: ControlCodexTotalsPayload;
  rateLimits: Record<string, unknown> | null;
  issues: CompatibilityProjectionIssueRecord[];
  selected: ControlSelectedRunPayload | null;
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
  providerIntake?: ProviderIntakeSummaryPayload | null;
  providerIntakeUnavailable?: ControlProviderIntakeUnavailablePayload | null;
  providerWorkflow?: ControlProviderWorkflowPayload | null;
  polling?: ControlPollingHealthPayload | null;
  fallbackExpiry?: ControlStatusFallbackExpiryMetadata[];
}

export interface ControlIssuePayload {
  issue_identifier: string;
  issue_id: string | null;
  task_id: string | null;
  run_id: string | null;
  status: string;
  raw_status: string;
  display_status: string;
  status_reason: string | null;
  workspace: {
    path: string | null;
  };
  worker_host?: string | null;
  attempts: {
    restart_count: number | null;
    current_retry_attempt: number | null;
  };
  running: ControlRunningPayload | null;
  retry: ControlRetryPayload | null;
  logs: {
    codex_session_logs: unknown[];
  };
  summary: string | null;
  latest_event: Pick<ControlLatestEventPayload, 'at' | 'event' | 'message'> | null;
  question_summary: ControlQuestionSummaryPayload;
  recent_events: Array<Pick<ControlLatestEventPayload, 'at' | 'event' | 'message'>>;
  last_error: string | null;
  tracked: ControlTrackedPayload;
  provider_linear_worker_proof?: ProviderLinearWorkerProof | null;
  provider_debug_snapshot?: ControlProviderDebugSnapshot | null;
  dispatch_pilot?: ControlDispatchPilotPayload;
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
}

export function buildTrackedPayloadEnvelope(
  tracked: ControlTrackedPayload | null | undefined
): ControlTrackedPayload {
  return tracked ?? { linear: null };
}

export function buildTrackedLinearPayload(
  trackedIssue: LiveLinearTrackedIssue | null | undefined
): ControlTrackedPayload | null {
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

export function buildSelectedRunQuestionSummaryPayload(
  summary: SelectedRunQuestionSummary
): ControlQuestionSummaryPayload {
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

export function buildSelectedRunLatestEventPayload(
  latestEvent: SelectedRunLatestEvent | null,
  options: {
    includeRequestMetadata?: boolean;
  } = {}
): ControlLatestEventPayload | null {
  if (!latestEvent) {
    return null;
  }
  return {
    at: latestEvent.at,
    event: latestEvent.event,
    message: latestEvent.message,
    source: latestEvent.source ?? null,
    message_recorded_at: latestEvent.messageRecordedAt ?? null,
    source_updated_at: latestEvent.sourceUpdatedAt ?? null,
    candidates: latestEvent.candidates ?? [],
    ...(options.includeRequestMetadata
      ? {
          requested_by: latestEvent.requestedBy,
          reason: latestEvent.reason
        }
      : {})
  };
}

export function readProviderLinearWorkerHost(
  proof: ProviderLinearWorkerProof | null | undefined,
  stageStartedAt: string | null | undefined
): ResolvedWorkerHost {
  if (
    !proof
    || !isProviderLinearWorkerProofFreshForStage(
      proof as ProviderLinearWorkerProof & Record<string, unknown>,
      stageStartedAt ?? null
    )
  ) {
    return { kind: 'missing' };
  }
  return readResolvedWorkerHost(
    proof as ProviderLinearWorkerProof & Record<string, unknown>
  );
}

export function readProviderLinearWorkerWorkspacePath(
  proof: ProviderLinearWorkerProof | null | undefined,
  stageStartedAt: string | null | undefined,
  providerDebugSnapshot?: ControlProviderDebugSnapshot | null | undefined
): string | null {
  const claimLaunchStartedAt = providerDebugSnapshot?.claim?.launch_started_at ?? null;
  const proofStageStartedAt =
    claimLaunchStartedAt
    ?? stageStartedAt
    ?? null;
  if (
    !proof ||
    !isProviderLinearWorkerProofFreshForStage(
      proof as ProviderLinearWorkerProof & Record<string, unknown>,
      proofStageStartedAt
    )
  ) {
    return null;
  }
  return typeof proof.workspace_path === 'string' && proof.workspace_path.trim().length > 0
    ? proof.workspace_path
    : null;
}

export function resolveProviderWorkerHost(input: {
  providerLinearWorkerProof?: ProviderLinearWorkerProof | null | undefined;
  providerDebugSnapshot?: ControlProviderDebugSnapshot | null | undefined;
  providerIntake?: ProviderIntakeSummaryPayload | null | undefined;
  issueIdentifier?: string | null | undefined;
  issueId?: string | null | undefined;
  stageStartedAt?: string | null | undefined;
}): string | null {
  const claimLaunchStartedAt = input.providerDebugSnapshot?.claim?.launch_started_at ?? null;
  const stageStartedAt =
    claimLaunchStartedAt
    ?? input.stageStartedAt
    ?? null;
  const claimHost = readResolvedWorkerHost(
    input.providerDebugSnapshot?.claim as Record<string, unknown> | null | undefined
  );
  if (claimHost.kind === 'host') {
    return claimHost.value;
  }
  if (claimHost.kind === 'cleared') {
    return null;
  }
  const proofHost = readProviderLinearWorkerHost(
    input.providerLinearWorkerProof,
    stageStartedAt
  );
  if (proofHost.kind === 'host') {
    return proofHost.value;
  }
  if (proofHost.kind === 'cleared') {
    return null;
  }
  const selectedClaim = input.providerIntake?.selected_claim ?? null;
  if (!selectedClaim) {
    return null;
  }
  const issueIdentifier = input.issueIdentifier ?? null;
  const issueId = input.issueId ?? null;
  if (
    issueIdentifier !== null
    && selectedClaim.issue_identifier !== issueIdentifier
    && issueId !== null
    && selectedClaim.issue_id !== issueId
  ) {
    return null;
  }
  if (
    issueIdentifier !== null
    && selectedClaim.issue_identifier !== issueIdentifier
    && issueId === null
  ) {
    return null;
  }
  if (
    issueId !== null
    && selectedClaim.issue_id !== issueId
    && issueIdentifier === null
  ) {
    return null;
  }
  return normalizeProviderWorkerHostName(selectedClaim.worker_host);
}

function readResolvedWorkerHost(
  source: Record<string, unknown> | null | undefined
): ResolvedWorkerHost {
  if (
    !source
    || !Object.prototype.hasOwnProperty.call(source, 'worker_host')
    || source.worker_host === undefined
  ) {
    return { kind: 'missing' };
  }
  const workerHost = normalizeProviderWorkerHostName(source.worker_host);
  return workerHost === null
    ? { kind: 'cleared' }
    : { kind: 'host', value: workerHost };
}

export function buildProjectionSelectedPayload(
  selected: SelectedRunContext | ControlCompatibilitySourceContext,
  providerIntake: ProviderIntakeSummaryPayload | null = null
): ControlSelectedRunPayload {
  const workerHost = resolveProviderWorkerHost({
    providerLinearWorkerProof: selected.providerLinearWorkerProof,
    providerDebugSnapshot: selected.providerDebugSnapshot,
    providerIntake,
    issueIdentifier: selected.issueIdentifier,
    issueId: selected.issueId,
    stageStartedAt: selected.startedAt
  });
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
    latest_event: buildSelectedRunLatestEventPayload(selected.latestEvent, {
      includeRequestMetadata: true
    }),
    workspace: {
      path: selected.workspacePath
    },
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    ...(selected.providerLinearWorkerProof?.resolved_model_provenance
      ? {
          resolved_model_provenance:
            selected.providerLinearWorkerProof.resolved_model_provenance
        }
      : {}),
    question_summary: buildSelectedRunQuestionSummaryPayload(selected.questionSummary),
    tracked: buildTrackedPayloadEnvelope(selected.tracked),
    ...(selected.providerLinearWorkerProof
      ? {
          provider_linear_worker_proof: selected.providerLinearWorkerProof
        }
      : {}),
    ...(selected.providerDebugSnapshot
      ? {
          provider_debug_snapshot: selected.providerDebugSnapshot
        }
      : {})
  };
}

export function serializeProviderIntakeSummary(
  providerIntake: ProviderIntakeSummaryPayload
): ControlProviderIntakePayload {
  return {
    summary_scope: providerIntake.summary_scope,
    selection_strategy: providerIntake.selection_strategy,
    claim_count: providerIntake.claim_count,
    active_claim_count: providerIntake.active_claim_count,
    running_claim_count: providerIntake.running_claim_count,
    active_issue_identifiers: [...providerIntake.active_issue_identifiers],
    running_issue_identifiers: [...providerIntake.running_issue_identifiers],
    selected_claim: {
      issue_identifier: providerIntake.selected_claim.issue_identifier,
      task_id: providerIntake.selected_claim.task_id,
      state: providerIntake.selected_claim.state,
      reason: providerIntake.selected_claim.reason,
      run_id: providerIntake.selected_claim.run_id,
      freshness: providerIntake.selected_claim.freshness,
      retry: providerIntake.selected_claim.retry,
      worker_host: providerIntake.selected_claim.worker_host ?? null
    },
    rehydrated_at: providerIntake.rehydrated_at,
    is_rehydrated: providerIntake.is_rehydrated,
    updated_at: providerIntake.updated_at
  };
}

export function buildSelectedRunRuntimeFingerprintInput(
  snapshot: ControlSelectedRunRuntimeSnapshot
): Record<string, unknown> | null {
  const selected = snapshot.selected ?? null;
  const dispatchPilot = snapshot.dispatchPilot ?? null;
  const trackedLinear = selected?.tracked?.linear ?? snapshot.tracked?.linear ?? null;
  const providerIntake = snapshot.providerIntake ?? null;
  const providerIntakeUnavailable = snapshot.providerIntakeUnavailable ?? null;
  const providerWorkflow = snapshot.providerWorkflow ?? null;
  const questionSummary = selected?.questionSummary ?? null;
  if (
    !selected &&
    !trackedLinear &&
    !dispatchPilot &&
    !questionSummary &&
    !providerIntake &&
    !providerIntakeUnavailable &&
    !providerWorkflow
  ) {
    return null;
  }
  return {
    selected: selected
      ? {
          issue_identifier: selected.issueIdentifier,
          run_id: selected.runId,
          raw_status: selected.rawStatus,
          display_status: selected.displayStatus,
          status_reason: selected.statusReason,
          summary: selected.summary,
          latest_event: selected.latestEvent
            ? {
                event: selected.latestEvent.event,
                message: selected.latestEvent.message,
                at: selected.latestEvent.at
              }
            : null,
          provider_linear_worker_proof: selected.providerLinearWorkerProof ?? null,
          provider_debug_snapshot: selected.providerDebugSnapshot ?? null,
          provider_retry_state: selected.providerRetryState ?? null,
          question_summary: questionSummary
            ? {
                queued_count: questionSummary.queuedCount,
                latest_question_id: questionSummary.latestQuestion?.questionId ?? null,
                latest_question_prompt: questionSummary.latestQuestion?.prompt ?? null,
                latest_question_urgency: questionSummary.latestQuestion?.urgency ?? null
              }
            : null
        }
      : null,
    dispatch_pilot: dispatchPilot
      ? {
          status: dispatchPilot.status ?? null,
          source_status: dispatchPilot.source_status ?? null,
          reason: dispatchPilot.reason ?? null
        }
      : null,
    tracked_linear: trackedLinear
      ? {
          identifier: trackedLinear.identifier,
          title: trackedLinear.title,
          state: trackedLinear.state,
          url: trackedLinear.url,
          team_key: trackedLinear.team_key
        }
      : null,
    provider_intake: providerIntake ? serializeProviderIntakeSummary(providerIntake) : null,
    provider_intake_unavailable: providerIntakeUnavailable,
    provider_workflow: providerWorkflow
      ? {
          status: providerWorkflow.status,
          pipeline_id: providerWorkflow.pipeline_id,
          source_path: providerWorkflow.source_path,
          snapshot_path: providerWorkflow.snapshot_path,
          last_reload_attempt_at: providerWorkflow.last_reload_attempt_at,
          last_success_at: providerWorkflow.last_success_at,
          last_error_at: providerWorkflow.last_error_at,
          last_error: providerWorkflow.last_error,
          terminal_cleanup: providerWorkflow.terminal_cleanup
            ? {
                enabled: providerWorkflow.terminal_cleanup.enabled,
                close_attached_pr: {
                  enabled: providerWorkflow.terminal_cleanup.close_attached_pr.enabled,
                  comment_template: providerWorkflow.terminal_cleanup.close_attached_pr.comment_template
                },
                last_result: providerWorkflow.terminal_cleanup.last_result
                  ? {
                      attempted_at: providerWorkflow.terminal_cleanup.last_result.attempted_at,
                      status: providerWorkflow.terminal_cleanup.last_result.status,
                      summary: providerWorkflow.terminal_cleanup.last_result.summary,
                      error: providerWorkflow.terminal_cleanup.last_result.error,
                      issue_id: providerWorkflow.terminal_cleanup.last_result.issue_id,
                      issue_identifier: providerWorkflow.terminal_cleanup.last_result.issue_identifier,
                      workspace_path: providerWorkflow.terminal_cleanup.last_result.workspace_path,
                      branch: providerWorkflow.terminal_cleanup.last_result.branch,
                      attached_pr_urls: [
                        ...providerWorkflow.terminal_cleanup.last_result.attached_pr_urls
                      ],
                      matching_open_pr_urls: [
                        ...providerWorkflow.terminal_cleanup.last_result.matching_open_pr_urls
                      ],
                      closed_pr_urls: [
                        ...providerWorkflow.terminal_cleanup.last_result.closed_pr_urls
                      ]
                    }
                  : null
              }
            : null,
          worker_hosts: Array.isArray(providerWorkflow.worker_hosts)
            ? providerWorkflow.worker_hosts.map((host) => ({
                ...host,
                ssh_options: [...host.ssh_options]
              }))
            : [],
          operator_autopilot: providerWorkflow.operator_autopilot
            ? {
                enabled: providerWorkflow.operator_autopilot.enabled,
                backlog_promotion: {
                  enabled: providerWorkflow.operator_autopilot.backlog_promotion.enabled,
                  state_name: providerWorkflow.operator_autopilot.backlog_promotion.state_name,
                  target_state_name:
                    providerWorkflow.operator_autopilot.backlog_promotion.target_state_name,
                  snapshot_retention: {
                    max_untracked_cycles:
                      providerWorkflow.operator_autopilot.backlog_promotion
                        .snapshot_retention?.max_untracked_cycles ?? 3,
                    terminal_state_types: [
                      ...(
                        providerWorkflow.operator_autopilot.backlog_promotion
                          .snapshot_retention?.terminal_state_types ?? [
                          'completed',
                          'canceled'
                        ]
                      )
                    ]
                  }
                },
                review_handoff_rework: {
                  enabled: providerWorkflow.operator_autopilot.review_handoff_rework.enabled,
                  target_state_name:
                    providerWorkflow.operator_autopilot.review_handoff_rework.target_state_name,
                  excluded_action_required_reasons: [
                    ...providerWorkflow.operator_autopilot.review_handoff_rework.excluded_action_required_reasons
                  ]
                },
                post_merge_rollout: {
                  enabled: providerWorkflow.operator_autopilot.post_merge_rollout.enabled,
                  summary: providerWorkflow.operator_autopilot.post_merge_rollout.summary,
                  execution: providerWorkflow.operator_autopilot.post_merge_rollout.execution
                },
                audit_path: providerWorkflow.operator_autopilot.audit_path,
                lifecycle_path: providerWorkflow.operator_autopilot.lifecycle_path,
                execution_path: providerWorkflow.operator_autopilot.execution_path,
                last_result: providerWorkflow.operator_autopilot.last_result
                  ? {
                      recorded_at: providerWorkflow.operator_autopilot.last_result.recorded_at,
                      status: providerWorkflow.operator_autopilot.last_result.status,
                      summary: providerWorkflow.operator_autopilot.last_result.summary,
                      error: providerWorkflow.operator_autopilot.last_result.error,
                      actions: providerWorkflow.operator_autopilot.last_result.actions.map((action) => ({
                        kind: action.kind,
                        issue_id: action.issue_id,
                        issue_identifier: action.issue_identifier,
                        reason: action.reason,
                        summary: action.summary,
                        transition: {
                          status: action.transition.status,
                          attempted_at: action.transition.attempted_at,
                          previous_state: action.transition.previous_state,
                          target_state: action.transition.target_state,
                          issue_state: action.transition.issue_state,
                          issue_state_type: action.transition.issue_state_type,
                          issue_updated_at: action.transition.issue_updated_at,
                          force_path_used: action.transition.force_path_used ?? false,
                          error: action.transition.error
                        },
                        action_required_reasons: [...action.action_required_reasons]
                      })),
                      holds: providerWorkflow.operator_autopilot.last_result.holds.map((hold) => ({
                        kind: hold.kind,
                        issue_id: hold.issue_id,
                        issue_identifier: hold.issue_identifier,
                        issue_state: hold.issue_state ?? null,
                        issue_state_type: hold.issue_state_type ?? null,
                        issue_updated_at: hold.issue_updated_at ?? null,
                        promotion_attempted_at: hold.promotion_attempted_at ?? null,
                        promotion_issue_updated_at: hold.promotion_issue_updated_at ?? null,
                        force_path_used: hold.force_path_used ?? false,
                        reason: hold.reason,
                        summary: hold.summary,
                        action_required_reasons: [...hold.action_required_reasons]
                      })),
                      pending_actions:
                        providerWorkflow.operator_autopilot.last_result.pending_actions.map(
                          (pendingAction) => ({
                            kind: pendingAction.kind,
                            action_instance_id: pendingAction.action_instance_id,
                            issue_id: pendingAction.issue_id,
                            issue_identifier: pendingAction.issue_identifier,
                            summary: pendingAction.summary,
                            merge_closeout_recorded_at:
                              pendingAction.merge_closeout_recorded_at,
                            merge_closeout_reason: pendingAction.merge_closeout_reason,
                            shared_root_status: pendingAction.shared_root_status,
                            linear_transition_status: pendingAction.linear_transition_status,
                            executable_action_ids: [
                              ...(pendingAction.executable_action_ids ?? [])
                            ],
                            lifecycle_state: pendingAction.lifecycle_state,
                            lifecycle_actor: pendingAction.lifecycle_actor,
                            lifecycle_reason: pendingAction.lifecycle_reason,
                            lifecycle_recorded_at: pendingAction.lifecycle_recorded_at
                          })
                        ),
                      terminal_blocker_advisories:
                        (
                          providerWorkflow.operator_autopilot.last_result
                            .terminal_blocker_advisories ?? []
                        ).map((advisory) => ({
                          kind: advisory.kind,
                          issue_id: advisory.issue_id,
                          issue_identifier: advisory.issue_identifier,
                          issue_state: advisory.issue_state,
                          issue_state_type: advisory.issue_state_type,
                          issue_updated_at: advisory.issue_updated_at,
                          blockers: advisory.blockers.map((blocker) => ({
                            id: blocker.id,
                            identifier: blocker.identifier,
                            state: blocker.state,
                            state_type: blocker.state_type
                          })),
                          canonical_owner_hints: [...advisory.canonical_owner_hints],
                          duplicate_hints: [...advisory.duplicate_hints],
                          recommended_action: advisory.recommended_action,
                          summary: advisory.summary
                        })),
                      resolved_actions:
                        (providerWorkflow.operator_autopilot.last_result.resolved_actions ?? []).map(
                          (resolvedAction) => ({
                            kind: resolvedAction.kind,
                            action_instance_id: resolvedAction.action_instance_id,
                            issue_id: resolvedAction.issue_id,
                            issue_identifier: resolvedAction.issue_identifier,
                            summary: resolvedAction.summary,
                            merge_closeout_recorded_at:
                              resolvedAction.merge_closeout_recorded_at,
                            merge_closeout_reason: resolvedAction.merge_closeout_reason,
                            shared_root_status: resolvedAction.shared_root_status,
                            linear_transition_status: resolvedAction.linear_transition_status,
                            executable_action_ids: [
                              ...(resolvedAction.executable_action_ids ?? [])
                            ],
                            lifecycle_state: resolvedAction.lifecycle_state,
                            lifecycle_actor: resolvedAction.lifecycle_actor,
                            lifecycle_reason: resolvedAction.lifecycle_reason,
                            lifecycle_recorded_at: resolvedAction.lifecycle_recorded_at
                          })
                        ),
                      lifecycle_records:
                        (providerWorkflow.operator_autopilot.last_result.lifecycle_records ?? []).map(
                          (record) => ({
                            action_instance_id: record.action_instance_id,
                            kind: record.kind,
                            issue_id: record.issue_id,
                            issue_identifier: record.issue_identifier,
                            state: record.state,
                            actor: record.actor,
                            reason: record.reason,
                            recorded_at: record.recorded_at,
                            source: record.source
                          })
                        ),
                      local_rollout_execution_attempts:
                        (
                          providerWorkflow.operator_autopilot.last_result
                            .local_rollout_execution_attempts ?? []
                        ).map((attempt) => ({
                          action_instance_id: attempt.action_instance_id,
                          record_kind: attempt.record_kind,
                          action_id: attempt.action_id,
                          issue_id: attempt.issue_id,
                          issue_identifier: attempt.issue_identifier,
                          preflight: {
                            status: attempt.preflight.status,
                            reason: attempt.preflight.reason,
                            checked_at: attempt.preflight.checked_at,
                            summary: attempt.preflight.summary
                          },
                          started_at: attempt.started_at,
                          ended_at: attempt.ended_at,
                          terminal_state: attempt.terminal_state,
                          reason: attempt.reason,
                          summary: attempt.summary,
                          command: {
                            runner: attempt.command.runner,
                            command: attempt.command.command,
                            args: [...attempt.command.args],
                            cwd: attempt.command.cwd,
                            timeout_ms: attempt.command.timeout_ms
                          },
                          exit_code: attempt.exit_code,
                          stdout: attempt.stdout,
                          stderr: attempt.stderr
                        })),
                      backlog_promotion_snapshots:
                        (
                          providerWorkflow.operator_autopilot.last_result
                            .backlog_promotion_snapshots ?? []
                        ).map((snapshot) => ({
                          issue_id: snapshot.issue_id,
                          issue_identifier: snapshot.issue_identifier,
                          target_state: snapshot.target_state,
                          attempted_at: snapshot.attempted_at,
                          issue_updated_at: snapshot.issue_updated_at,
                          force_path_used: snapshot.force_path_used,
                          untracked_cycles: snapshot.untracked_cycles ?? 0
                        })),
                      backlog_promotion_snapshot_retention_records:
                        (
                          providerWorkflow.operator_autopilot.last_result
                            .backlog_promotion_snapshot_retention_records ?? []
                        ).map((record) => ({
                          issue_id: record.issue_id,
                          issue_identifier: record.issue_identifier,
                          target_state: record.target_state,
                          attempted_at: record.attempted_at,
                          issue_updated_at: record.issue_updated_at,
                          evaluated_at: record.evaluated_at,
                          decision: record.decision,
                          reason: record.reason,
                          age_ms: record.age_ms,
                          untracked_cycles: record.untracked_cycles,
                          max_untracked_cycles: record.max_untracked_cycles,
                          issue_state: record.issue_state,
                          issue_state_type: record.issue_state_type,
                          issue_archived_at: record.issue_archived_at,
                          issue_trashed: record.issue_trashed,
                          issue_observed_updated_at: record.issue_observed_updated_at,
                          terminal_state_evidence: record.terminal_state_evidence,
                          force_path_used: record.force_path_used
                        })),
                      ...(providerWorkflow.operator_autopilot.last_result.status_dataset_bounds
                        ? {
                            status_dataset_bounds: cloneOperatorAutopilotStatusDatasetBounds(
                              providerWorkflow.operator_autopilot.last_result
                                .status_dataset_bounds
                            )
                          }
                        : {})
                    }
                  : null
              }
            : null
        }
      : null
  };
}

function cloneOperatorAutopilotStatusDatasetBounds(
  bounds: ControlProviderOperatorAutopilotStatusDatasetBoundsPayload
): ControlProviderOperatorAutopilotStatusDatasetBoundsPayload {
  return {
    limit: bounds.limit,
    truncated: bounds.truncated,
    omitted_counts: {
      actions: bounds.omitted_counts.actions,
      holds: bounds.omitted_counts.holds,
      pending_actions: bounds.omitted_counts.pending_actions,
      terminal_blocker_advisories: bounds.omitted_counts.terminal_blocker_advisories,
      resolved_actions: bounds.omitted_counts.resolved_actions,
      lifecycle_records: bounds.omitted_counts.lifecycle_records,
      local_rollout_execution_attempts:
        bounds.omitted_counts.local_rollout_execution_attempts,
      backlog_promotion_snapshots: bounds.omitted_counts.backlog_promotion_snapshots,
      backlog_promotion_snapshot_retention_records:
        bounds.omitted_counts.backlog_promotion_snapshot_retention_records
    }
  };
}
