import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import {
  readProviderLinearParallelizationSnapshot,
  type ProviderLinearParallelizationSnapshot,
  ProviderLinearAuditEntry,
  ProviderLinearAuditSummary
} from './providerLinearWorkflowAudit.js';
import {
  classifyProviderLinearWorkflowState,
  normalizeProviderLinearWorkflowState
} from './providerLinearWorkflowStates.js';
import { normalizeProviderWorkerHostName } from './providerWorkerHosts.js';
import { stripNonApplicableGuardrailSummaryLines } from '../run/manifest.js';

const PROVIDER_SEMANTIC_STALL_THRESHOLD_MS = 15 * 60 * 1000;
const PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID = 'provider-linear-child-lane';

export type ProviderIntakeClaimFreshness =
  | 'fresh'
  | 'rehydrated'
  | 'stale';

export type ProviderLinearWorkerProgressPhase =
  | 'bootstrapping'
  | 'turn_running'
  | 'turn_completed'
  | 'turn_failed'
  | 'child_stream'
  | 'child_lane'
  | 'waiting_on_checks'
  | 'waiting_on_review'
  | 'watching_merge'
  | 'attempting_merge'
  | 'pending_shared_root_reconciliation'
  | 'review_handoff'
  | 'inactive'
  | 'completed'
  | 'failed'
  | 'unknown';

export type ProviderLinearWorkerProgressKind =
  | 'worker'
  | 'merge_closeout'
  | 'child_stream'
  | 'child_lane'
  | 'workflow';

export type ProviderLinearWorkerProgressStatus =
  | 'progressing'
  | 'waiting'
  | 'stalled'
  | 'completed'
  | 'failed';

export type ProviderLinearWorkerStallClassification =
  | 'progressing'
  | 'waiting_on_checks'
  | 'waiting_on_review'
  | 'waiting_on_child_stream'
  | 'waiting_on_child_lane'
  | 'stalled'
  | 'completed'
  | 'failed';

export type ProviderLinearWorkerRecoveryRecommendation =
  | 'continue_waiting'
  | 'wait_for_checks'
  | 'address_review_feedback'
  | 'inspect_child_stream'
  | 'inspect_child_lane'
  | 'inspect_worker_logs'
  | 'inspect_merge_closeout'
  | 'no_action';

export interface ProviderLinearWorkerProgressSnapshot {
  phase: ProviderLinearWorkerProgressPhase;
  kind: ProviderLinearWorkerProgressKind;
  status: ProviderLinearWorkerProgressStatus;
  summary: string;
  summary_recorded_at?: string | null;
  message_recorded_at?: string | null;
  source_updated_at?: string | null;
  selected_event?: string | null;
  event_source?: string | null;
  event_candidates?: ProviderLinearWorkerProgressCandidate[];
  last_semantic_progress_at: string | null;
  stall_classification: ProviderLinearWorkerStallClassification;
  stall_reason: string | null;
  recovery_recommendation: ProviderLinearWorkerRecoveryRecommendation;
}

export interface ProviderLinearWorkerProgressCandidate {
  source: string;
  event: string | null;
  summary: string | null;
  message_recorded_at: string | null;
  source_updated_at: string | null;
  derived: boolean;
  accepted: boolean;
  rejection_reason: string | null;
}

interface ProviderChildProgressSummaryCandidate {
  source: string;
  event: string | null;
  summary: string;
  recorded_at: string | null;
}

interface ProviderIssueCurrentTurnActivityLike {
  event?: string | null;
  message_or_payload?: string | null;
  recorded_at?: string | null;
  source?: string | null;
  turn_id?: string | null;
  session_id?: string | null;
}

interface ProviderIssueClaimLike {
  state?: string | null;
  reason?: string | null;
  updated_at?: string | null;
  run_id?: string | null;
  worker_host?: string | null;
  launch_source?: string | null;
  launch_started_at?: string | null;
  issue_state?: string | null;
  issue_state_type?: string | null;
  issue_updated_at?: string | null;
  retry_queued?: boolean | null;
  retry_attempt?: number | null;
  retry_due_at?: string | null;
  retry_error?: string | null;
  review_promotion?: ProviderIssueReviewPromotionLike | null;
  merge_closeout?: ProviderIssueMergeCloseoutLike | null;
}

interface ProviderIssuePullRequestSnapshotLike {
  state?: string | null;
  review_decision?: string | null;
  merge_state_status?: string | null;
  ready_to_merge?: boolean | null;
  gate_reasons?: string[] | null;
  action_required_reasons?: string[] | null;
  unresolved_thread_count?: number | null;
  checks_pending?: number | null;
  checks_failed?: number | null;
  required_checks_pending?: number | null;
  required_checks_failed?: number | null;
  updated_at?: string | null;
  merged_at?: string | null;
  head_oid?: string | null;
}

interface ProviderIssuePullRequestLifecycleLike {
  recorded_at?: string | null;
  issue_updated_at?: string | null;
  status?: string | null;
  reason?: string | null;
  summary?: string | null;
  attached_pr_urls?: string[] | null;
  ignored_historical_pr_urls?: string[] | null;
  ignored_closed_unmerged_pr_urls?: string[] | null;
  conflicting_attached_pr_urls?: string[] | null;
  pr?: {
    url?: string | null;
    owner?: string | null;
    repo?: string | null;
    number?: number | null;
  } | null;
  snapshot?: ProviderIssuePullRequestSnapshotLike | null;
  branch_recovery?: {
    attempted_at?: string | null;
    head_oid?: string | null;
    recovery_reason?: string | null;
    command?: string | null;
    args?: string[] | null;
    exit_code?: number | null;
    ok?: boolean | null;
    stdout?: string | null;
    stderr?: string | null;
    failure_kind?: string | null;
  } | null;
}

interface ProviderIssueReviewPromotionLike extends ProviderIssuePullRequestLifecycleLike {
  linear_transition?: {
    status?: string | null;
    attempted_at?: string | null;
    previous_state?: string | null;
    target_state?: string | null;
    issue_state?: string | null;
    issue_state_type?: string | null;
    issue_updated_at?: string | null;
    error?: string | null;
  } | null;
}

interface ProviderIssueMergeCloseoutLike extends ProviderIssuePullRequestLifecycleLike {
  issue_state?: string | null;
  issue_state_type?: string | null;
  issue_updated_at?: string | null;
  linear_transition?: {
    status?: string | null;
    attempted_at?: string | null;
    previous_state?: string | null;
    target_state?: string | null;
    issue_state?: string | null;
    issue_state_type?: string | null;
    issue_updated_at?: string | null;
    error?: string | null;
  } | null;
  shared_root?: {
    status?: string | null;
    reason?: string | null;
    before_status?: string | null;
    after_status?: string | null;
  } | null;
}

interface ProviderIssueChildStreamLike {
  stream?: string | null;
  task_id?: string | null;
  run_id?: string | null;
  status?: string | null;
  launched_at?: string | null;
  recorded_at?: string | null;
  summary?: string | null;
}

interface ProviderIssueChildLaneLike {
  stream?: string | null;
  pipeline_id?: string | null;
  task_id?: string | null;
  run_id?: string | null;
  status?: string | null;
  launched_at?: string | null;
  summary_recorded_at?: string | null;
  summary?: string | null;
  guardrails_required?: boolean | null;
  guardrails_required_source?: string | null;
  guardrail_command_count?: number | null;
  decision?: string | null;
  in_flight_action?: string | null;
  decision_at?: string | null;
  decision_reason?: string | null;
  decision_lineage?: ProviderIssueDecisionLineageLike | null;
}

interface ProviderIssueDecisionLineageLike {
  schema_version?: number | null;
  parent_task_id?: string | null;
  parent_run_id?: string | null;
  parent_turn_started_at?: string | null;
  parent_turn_id?: string | null;
  parent_turn_count?: number | null;
  decision_id?: string | null;
  decision_recorded_at?: string | null;
  decision?: string | null;
  reason?: string | null;
}

interface ProviderIssueRecoveredChildLaneLike {
  stream?: string | null;
  task_id?: string | null;
  run_id?: string | null;
  recovery_source?: string | null;
  child_decision_lineage?: ProviderIssueDecisionLineageLike | null;
  parallelization_decision_lineage?: ProviderIssueDecisionLineageLike | null;
}

interface ProviderIssueProofLike {
  attempt_started_at?: string | null;
  current_turn_started_at?: string | null;
  issue_id?: string | null;
  pid?: string | null;
  worker_host?: string | null;
  thread_id?: string | null;
  latest_session_id?: string | null;
  turn_count?: number | null;
  last_event?: string | null;
  last_message?: string | null;
  last_event_at?: string | null;
  current_turn_activity?: ProviderIssueCurrentTurnActivityLike | null;
  owner_phase?: string | null;
  owner_status?: string | null;
  updated_at?: string | null;
  linear_audit?: ProviderLinearAuditSummary | null;
  child_streams?: ProviderIssueChildStreamLike[] | null;
  child_lanes?: ProviderIssueChildLaneLike[] | null;
  parallelization?: (ProviderLinearParallelizationSnapshot & {
    child_lane_count?: number | null;
    recovered_child_lanes?: ProviderIssueRecoveredChildLaneLike[] | null;
  }) | null;
  resident_session?: {
    logical_session_id?: string | null;
    logical_turn_count?: number | null;
    restart_count?: number | null;
    continuity_state?: string | null;
    source_run_id?: string | null;
    source_end_reason?: string | null;
  } | null;
  end_reason?: string | null;
}

export interface ControlProviderDebugSnapshot {
  live_linear_state: {
    state: string | null;
    state_type: string | null;
    updated_at: string | null;
  };
  claim: {
    state: string | null;
    reason: string | null;
    updated_at: string | null;
    run_id: string | null;
    issue_state: string | null;
    issue_state_type: string | null;
    issue_updated_at: string | null;
    worker_host?: string | null;
    launch_source: string | null;
    launch_started_at: string | null;
    retry: {
      active: boolean;
      attempt: number | null;
      due_at: string | null;
      error: string | null;
    } | null;
    freshness: ProviderIntakeClaimFreshness | null;
    is_rehydrated: boolean;
    rehydrated_at: string | null;
  } | null;
  worker: {
    owner_phase: string | null;
    owner_status: string | null;
    pid: string | null;
    worker_host?: string | null;
    thread_id: string | null;
    latest_session_id: string | null;
    turn_count: number | null;
    resident_logical_session_id: string | null;
    resident_logical_turn_count: number | null;
    resident_restart_count: number | null;
    resident_continuity_state: string | null;
    resident_source_run_id: string | null;
    resident_source_end_reason: string | null;
    last_event: string | null;
    last_message: string | null;
    last_event_at: string | null;
    current_turn_activity: {
      event: string | null;
      message_or_payload: string | null;
      recorded_at: string | null;
      source: string | null;
      turn_id: string | null;
      session_id: string | null;
    } | null;
    updated_at: string | null;
  } | null;
  parallelization: {
    decision: string | null;
    reason: string | null;
    summary: string | null;
    recorded_at: string | null;
    child_lane_count: number | null;
    decision_lineage: ProviderIssueDecisionLineageLike | null;
    recovered_child_lanes: ProviderIssueRecoveredChildLaneLike[];
  } | null;
  pull_request: {
    review_promotion_status: string | null;
    attached_pr_urls: string[];
    ignored_historical_pr_urls: string[];
    ignored_closed_unmerged_pr_urls: string[];
    conflicting_attached_pr_urls: string[];
    url: string | null;
    owner: string | null;
    repo: string | null;
    number: number | null;
    merge_closeout_status: string | null;
    reason: string | null;
    summary: string | null;
    shared_root_status: string | null;
    shared_root_reason: string | null;
    shared_root_before_status: string | null;
    shared_root_after_status: string | null;
    ready_to_merge: boolean | null;
    review_decision: string | null;
    merge_state_status: string | null;
    unresolved_thread_count: number | null;
    checks_pending: number | null;
    checks_failed: number | null;
    required_checks_pending: number | null;
    required_checks_failed: number | null;
    gate_reasons: string[];
    action_required_reasons: string[];
    updated_at: string | null;
    merged_at: string | null;
    branch_recovery: {
      attempted_at: string | null;
      head_oid: string | null;
      recovery_reason: string | null;
      command: string | null;
      args: string[];
      exit_code: number | null;
      ok: boolean | null;
      stdout: string | null;
      stderr: string | null;
      failure_kind: string | null;
    } | null;
  } | null;
  progress: ProviderLinearWorkerProgressSnapshot | null;
  last_audit_operation: {
    recorded_at: string;
    operation: string;
    ok: boolean;
    action: string | null;
    state: string | null;
    error_code: string | null;
    error_message: string | null;
  } | null;
  last_semantic_progress_at: string | null;
  stall_classification: ProviderLinearWorkerStallClassification | null;
  stall_reason: string | null;
  recovery_recommendation: ProviderLinearWorkerRecoveryRecommendation | null;
}

export function deriveProviderIntakeClaimFreshness(input: {
  claim:
    | Pick<ProviderIssueClaimLike, 'state' | 'reason' | 'updated_at'>
    | null
    | undefined;
  rehydrated_at?: string | null | undefined;
}): ProviderIntakeClaimFreshness | null {
  const claim = input.claim ?? null;
  if (!claim) {
    return null;
  }
  if (normalizeProviderLinearWorkflowState(claim.state) === 'stale') {
    return 'stale';
  }
  const reason = normalizeOptionalString(claim.reason);
  const rehydratedAt = normalizeOptionalString(input.rehydrated_at);
  if (
    (reason && reason.includes('rehydrated')) ||
    (
      rehydratedAt &&
      normalizeOptionalString(claim.updated_at) &&
      compareIsoTimestamp(claim.updated_at ?? null, rehydratedAt) <= 0
    )
  ) {
    return 'rehydrated';
  }
  return 'fresh';
}

export function buildProviderIssueDebugSnapshot(input: {
  tracked_issue?:
    | Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at'>
    | null
    | undefined;
  claim?: ProviderIssueClaimLike | null | undefined;
  proof?: ProviderIssueProofLike | null | undefined;
  rehydrated_at?: string | null | undefined;
}): ControlProviderDebugSnapshot | null {
  const trackedIssue = input.tracked_issue ?? null;
  const claim = input.claim ?? null;
  const proof = input.proof ?? null;
  const latestAudit = selectLatestProviderLinearAuditEntry(proof?.linear_audit);
  const parallelization = resolveProviderParallelizationSnapshot(proof);
  const trackedWorkflowState = trackedIssue ? classifyProviderLinearWorkflowState(trackedIssue) : null;
  const claimWorkflowState = !trackedIssue ? resolveClaimWorkflowStateClassification(claim) : null;
  const reworkResetUpdatedAt = resolveReworkResetUpdatedAt({
    trackedIssue,
    claim,
    trackedWorkflowState,
    claimWorkflowState
  });
  const visibleReviewPromotion = isPullRequestLifecycleSupersededByReworkReset(
    claim?.review_promotion ?? null,
    reworkResetUpdatedAt
  )
    ? null
    : claim?.review_promotion ?? null;
  const visibleMergeCloseout = isPullRequestLifecycleSupersededByReworkReset(
    claim?.merge_closeout ?? null,
    reworkResetUpdatedAt
  )
    ? null
    : claim?.merge_closeout ?? null;
  const progress = deriveProviderLinearWorkerProgressSnapshot({
    tracked_issue: trackedIssue,
    claim,
    proof
  });
  const pullRequest = buildProviderDebugPullRequestSnapshot({
    reviewPromotion: visibleReviewPromotion,
    mergeCloseout: visibleMergeCloseout,
    preferReviewPromotion:
      trackedWorkflowState?.isHandoff === true || claimWorkflowState?.isHandoff === true
  });
  if (!trackedIssue && !claim && !proof && !latestAudit && !pullRequest && !progress) {
    return null;
  }
  const claimFreshness = deriveProviderIntakeClaimFreshness({
    claim,
    rehydrated_at: input.rehydrated_at
  });
  const claimIsRehydrated = claimFreshness === 'rehydrated';
  return {
    live_linear_state: {
      state: normalizeOptionalString(trackedIssue?.state),
      state_type: normalizeOptionalString(trackedIssue?.state_type),
      updated_at: normalizeOptionalString(trackedIssue?.updated_at)
    },
    claim: claim
      ? {
          state: normalizeOptionalString(claim.state),
          reason: normalizeOptionalString(claim.reason),
          updated_at: normalizeOptionalString(claim.updated_at),
          run_id: normalizeOptionalString(claim.run_id),
          issue_state: normalizeOptionalString(claim.issue_state),
          issue_state_type: normalizeOptionalString(claim.issue_state_type),
          issue_updated_at: normalizeOptionalString(claim.issue_updated_at),
          worker_host: normalizeProviderWorkerHostName(claim.worker_host),
          launch_source: normalizeOptionalString(claim.launch_source),
          launch_started_at: normalizeOptionalString(claim.launch_started_at),
          retry: buildProviderClaimRetrySnapshot(claim),
          freshness: claimFreshness,
          is_rehydrated: claimIsRehydrated,
          rehydrated_at: normalizeOptionalString(input.rehydrated_at)
        }
      : null,
    worker: proof
      ? {
          owner_phase: normalizeOptionalString(proof.owner_phase),
          owner_status: normalizeOptionalString(proof.owner_status),
          pid: normalizeOptionalString(proof.pid),
          worker_host: normalizeProviderWorkerHostName(proof.worker_host),
          thread_id: normalizeOptionalString(proof.thread_id),
          latest_session_id: normalizeOptionalString(proof.latest_session_id),
          turn_count: normalizeOptionalInteger(proof.turn_count),
          resident_logical_session_id: normalizeOptionalString(proof.resident_session?.logical_session_id),
          resident_logical_turn_count: normalizeOptionalInteger(proof.resident_session?.logical_turn_count),
          resident_restart_count: normalizeOptionalInteger(proof.resident_session?.restart_count),
          resident_continuity_state: normalizeOptionalString(proof.resident_session?.continuity_state),
          resident_source_run_id: normalizeOptionalString(proof.resident_session?.source_run_id),
          resident_source_end_reason: normalizeOptionalString(proof.resident_session?.source_end_reason),
          last_event: normalizeOptionalString(proof.last_event),
          last_message: normalizeOptionalString(proof.last_message),
          last_event_at: normalizeOptionalString(proof.last_event_at),
          current_turn_activity: proof.current_turn_activity
            ? {
                event: normalizeOptionalString(proof.current_turn_activity.event),
                message_or_payload: normalizeOptionalString(
                  proof.current_turn_activity.message_or_payload
                ),
                recorded_at: normalizeOptionalString(proof.current_turn_activity.recorded_at),
                source: normalizeOptionalString(proof.current_turn_activity.source),
                turn_id: normalizeOptionalString(proof.current_turn_activity.turn_id),
                session_id: normalizeOptionalString(proof.current_turn_activity.session_id)
              }
            : null,
          updated_at: normalizeOptionalString(proof.updated_at)
        }
      : null,
    parallelization: parallelization
      ? {
          decision: parallelization.decision,
          reason: parallelization.reason,
          summary: parallelization.summary,
          recorded_at: parallelization.recorded_at,
          child_lane_count: parallelization.child_lane_count,
          decision_lineage: normalizeProviderIssueDecisionLineage(parallelization.decision_lineage),
          recovered_child_lanes: normalizeProviderIssueRecoveredChildLanes(
            parallelization.recovered_child_lanes
          )
        }
      : null,
    pull_request: pullRequest,
    progress,
    last_audit_operation: latestAudit
      ? {
          recorded_at: latestAudit.recorded_at,
          operation: latestAudit.operation,
          ok: latestAudit.ok,
          action: normalizeOptionalString(latestAudit.action),
          state: normalizeOptionalString(latestAudit.state),
          error_code: normalizeOptionalString(latestAudit.error_code),
          error_message: normalizeOptionalString(latestAudit.error_message)
        }
      : null,
    last_semantic_progress_at: latestIsoTimestamp(
      progress?.last_semantic_progress_at ?? null,
      latestAudit?.recorded_at ?? null
    ),
    stall_classification: progress?.stall_classification ?? null,
    stall_reason: progress?.stall_reason ?? null,
    recovery_recommendation: progress?.recovery_recommendation ?? null
  };
}

function buildProviderClaimRetrySnapshot(
  claim: Pick<
    ProviderIssueClaimLike,
    'retry_queued' | 'retry_attempt' | 'retry_due_at' | 'retry_error'
  > | null
): NonNullable<ControlProviderDebugSnapshot['claim']>['retry'] {
  if (!claim) {
    return null;
  }
  const active = claim.retry_queued === true;
  const attempt = normalizeOptionalInteger(claim.retry_attempt);
  const dueAt = normalizeOptionalString(claim.retry_due_at);
  const error = normalizeOptionalString(claim.retry_error);
  if (!active && attempt === null && dueAt === null && error === null) {
    return null;
  }
  return {
    active,
    attempt,
    due_at: dueAt,
    error
  };
}

function resolveProviderParallelizationSnapshot(
  proof: ProviderIssueProofLike | null
): (ProviderLinearParallelizationSnapshot & {
  child_lane_count: number | null;
  recovered_child_lanes?: ProviderIssueRecoveredChildLaneLike[] | null;
}) | null {
  const currentTurnStartedAt = normalizeOptionalString(proof?.current_turn_started_at);
  const currentTurnChildLanes = Array.isArray(proof?.child_lanes)
    ? !currentTurnStartedAt
      ? proof.child_lanes
      : proof.child_lanes.filter(
          (childLane) => compareIsoTimestamp(childLane.launched_at ?? null, currentTurnStartedAt) >= 0
        )
    : null;
  const hydrated = proof?.parallelization ?? null;
  if (hydrated) {
    if (
      !currentTurnStartedAt ||
      compareIsoTimestamp(normalizeOptionalString(hydrated.recorded_at), currentTurnStartedAt) >= 0
    ) {
      return {
        ...hydrated,
        child_lane_count: resolveProviderParallelizationChildLaneCount(
          currentTurnChildLanes,
          normalizeOptionalInteger(hydrated.child_lane_count)
        )
      };
    }
  }
  const fromAudit = readProviderLinearParallelizationSnapshot(proof?.linear_audit, {
    issueId: normalizeOptionalString(proof?.issue_id),
    recordedAtNotBefore: currentTurnStartedAt
  });
  if (!fromAudit) {
    return null;
  }
  return {
    ...fromAudit,
    child_lane_count: currentTurnChildLanes !== null ? currentTurnChildLanes.length : null
  };
}

function resolveProviderParallelizationChildLaneCount(
  currentTurnChildLanes: ProviderIssueChildLaneLike[] | null,
  hydratedChildLaneCount: number | null
): number | null {
  if (currentTurnChildLanes === null) {
    return hydratedChildLaneCount;
  }
  if (hydratedChildLaneCount === null) {
    return currentTurnChildLanes.length;
  }
  return Math.max(currentTurnChildLanes.length, hydratedChildLaneCount);
}

export function deriveProviderLinearWorkerProgressSnapshot(input: {
  tracked_issue?:
    | Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'updated_at'>
    | null
    | undefined;
  claim?: ProviderIssueClaimLike | null | undefined;
  proof?: ProviderIssueProofLike | null | undefined;
  now?: () => string;
}): ProviderLinearWorkerProgressSnapshot | null {
  const trackedIssue = input.tracked_issue ?? null;
  const claim = input.claim ?? null;
  const proof = input.proof ?? null;
  const now = input.now ?? (() => new Date().toISOString());
  const latestAudit = selectLatestProviderLinearAuditEntry(proof?.linear_audit);
  const activeChildLane = selectActiveChildLane(proof?.child_lanes ?? null);
  const activeChildStream = selectActiveChildStream(proof?.child_streams ?? null);
  const trackedWorkflowState = trackedIssue ? classifyProviderLinearWorkflowState(trackedIssue) : null;
  const claimWorkflowState = !trackedIssue ? resolveClaimWorkflowStateClassification(claim) : null;
  const reworkResetUpdatedAt = resolveReworkResetUpdatedAt({
    trackedIssue,
    claim,
    trackedWorkflowState,
    claimWorkflowState
  });
  const reviewPromotion =
    isPullRequestLifecycleSupersededByReworkReset(claim?.review_promotion ?? null, reworkResetUpdatedAt)
      ? null
      : claim?.review_promotion ?? null;
  const mergeCloseout =
    isPullRequestLifecycleSupersededByReworkReset(claim?.merge_closeout ?? null, reworkResetUpdatedAt)
      ? null
      : claim?.merge_closeout ?? null;
  const ownerPhase = normalizeOptionalString(proof?.owner_phase);
  const ownerStatus = normalizeOptionalString(proof?.owner_status);
  const endReason = normalizeOptionalString(proof?.end_reason);
  const claimState = normalizeProviderLinearWorkflowState(claim?.state);
  const workflowStateName = normalizeProviderLinearWorkflowState(
    normalizeOptionalString(trackedIssue?.state) ?? normalizeOptionalString(claim?.issue_state)
  );
  const currentTurnStartedAt = normalizeOptionalString(proof?.current_turn_started_at);
  const latestChildProgressAt = latestIsoTimestamp(
    selectLatestChildLaneProgressAt(proof?.child_lanes ?? null, currentTurnStartedAt),
    selectLatestChildStreamProgressAt(proof?.child_streams ?? null, currentTurnStartedAt)
  );
  const latestChildSummaryCandidate = selectLatestChildProgressSummaryCandidate(
    proof,
    currentTurnStartedAt
  );
  const mergeCloseoutProgress = mergeCloseout ? deriveMergeCloseoutProgressSnapshot(mergeCloseout) : null;
  const trackedTerminalWorkflowUpdatedAt =
    trackedWorkflowState?.isTerminal ? normalizeOptionalString(trackedIssue?.updated_at) : null;
  const claimTerminalWorkflowIssueUpdatedAt =
    claimWorkflowState?.isTerminal ? normalizeOptionalString(claim?.issue_updated_at) : null;
  const terminalWorkflowIssueFreshnessAt = latestIsoTimestamp(
    trackedTerminalWorkflowUpdatedAt,
    claimTerminalWorkflowIssueUpdatedAt
  );
  const terminalWorkflowUpdatedAt = latestIsoTimestamp(
    terminalWorkflowIssueFreshnessAt,
    claimWorkflowState?.isTerminal ? normalizeOptionalString(claim?.updated_at) : null
  );
  const mergeCloseoutIssueUpdatedAt = normalizeOptionalString(mergeCloseout?.issue_updated_at);
  const terminalWorkflowSupersedesMergeCloseout = Boolean(
    mergeCloseoutProgress &&
    mergeCloseoutProgress.status !== 'failed' &&
    terminalWorkflowIssueFreshnessAt &&
    (
      (
        !mergeCloseoutIssueUpdatedAt &&
        trackedTerminalWorkflowUpdatedAt
      ) ||
      (
        !mergeCloseoutIssueUpdatedAt &&
        claimTerminalWorkflowIssueUpdatedAt &&
        compareIsoTimestamp(
          claimTerminalWorkflowIssueUpdatedAt,
          mergeCloseoutProgress.last_semantic_progress_at
        ) >= 0
      ) ||
      (
        mergeCloseoutIssueUpdatedAt &&
        compareIsoTimestamp(terminalWorkflowIssueFreshnessAt, mergeCloseoutIssueUpdatedAt) >= 0
      )
    )
  );
  const lastSemanticProgressAt = latestIsoTimestamp(
    normalizeOptionalString(proof?.current_turn_activity?.recorded_at),
    normalizeOptionalString(proof?.last_event_at),
    latestAudit?.recorded_at ?? null,
    latestChildProgressAt,
    normalizeOptionalString(proof?.attempt_started_at)
  );
  const workerProgressSuppressedByStaleClaim =
    claimState === 'stale'
    && hasAuthoritativeWorkerProgressSignal({
      proof,
      ownerPhase,
      ownerStatus,
      endReason,
      lastSemanticProgressAt
    });
  const claimTerminalWorkflowSupersedesWorkerProgress = Boolean(
    claimWorkflowState?.isTerminal
    && (
      !lastSemanticProgressAt
      || (
        claimTerminalWorkflowIssueUpdatedAt
        && compareIsoTimestamp(claimTerminalWorkflowIssueUpdatedAt, lastSemanticProgressAt) >= 0
      )
    )
  );
  const terminalWorkflowIsNewerThanWorkerProgress = Boolean(
    (
      (
        trackedWorkflowState?.isTerminal
        && trackedTerminalWorkflowUpdatedAt
        && compareIsoTimestamp(trackedTerminalWorkflowUpdatedAt, lastSemanticProgressAt) >= 0
      )
      || claimTerminalWorkflowSupersedesWorkerProgress
    )
  );

  if (ownerStatus === 'failed' || ownerPhase === 'turn_failed') {
    return {
      phase: ownerPhase === 'turn_failed' ? 'turn_failed' : 'failed',
      kind: 'worker',
      status: 'failed',
      summary:
        selectProofPreferredMessage(proof) ??
        'Provider worker failed.',
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'failed',
      stall_reason: normalizeOptionalString(proof?.last_event) ?? normalizeOptionalString(ownerPhase),
      recovery_recommendation: 'inspect_worker_logs'
    };
  }

  if (
    reviewPromotion &&
    workflowStateName === 'merging' &&
    !mergeCloseout &&
    !workerProgressSuppressedByStaleClaim
  ) {
    return derivePendingMergeCloseoutProgressSnapshot(reviewPromotion);
  }

  if (
    reviewPromotion &&
    (trackedWorkflowState?.isHandoff || claimWorkflowState?.isHandoff) &&
    !workerProgressSuppressedByStaleClaim
  ) {
    return deriveReviewPromotionProgressSnapshot(reviewPromotion);
  }

  if (
    mergeCloseoutProgress
    && !workerProgressSuppressedByStaleClaim
    && !terminalWorkflowSupersedesMergeCloseout
  ) {
    return mergeCloseoutProgress;
  }

  if (ownerPhase === 'ended' && ownerStatus === 'succeeded') {
    if (endReason === 'max_turns_reached_issue_still_active') {
      return {
        phase: 'inactive',
        kind: 'worker',
        status: 'stalled',
        summary:
          selectProofPreferredMessage(proof) ??
          'Provider worker exhausted max turns while the issue remained active.',
        last_semantic_progress_at: lastSemanticProgressAt,
        stall_classification: 'stalled',
        stall_reason: endReason,
        recovery_recommendation: 'inspect_worker_logs'
      };
    }
    return {
      phase: trackedWorkflowState?.isHandoff ? 'review_handoff' : 'completed',
      kind:
        trackedWorkflowState?.isHandoff || terminalWorkflowIsNewerThanWorkerProgress
          ? 'workflow'
          : 'worker',
      status: 'completed',
      summary:
        selectProofPreferredMessage(proof) ??
        (
          terminalWorkflowIsNewerThanWorkerProgress
            ? 'Issue is complete.'
            : 'Provider worker completed successfully.'
        ),
      last_semantic_progress_at: latestIsoTimestamp(
        lastSemanticProgressAt,
        terminalWorkflowIsNewerThanWorkerProgress ? terminalWorkflowUpdatedAt : null
      ),
      stall_classification: 'completed',
      stall_reason: null,
      recovery_recommendation: 'no_action'
    };
  }

  if (activeChildLane) {
    const childLaneSummary =
      normalizeProviderChildLaneProgressSummary(activeChildLane) ??
      `Waiting on child lane ${activeChildLane.stream ?? activeChildLane.task_id ?? activeChildLane.run_id ?? 'unknown'}.`;
    return {
      phase: 'child_lane',
      kind: 'child_lane',
      status: 'waiting',
      summary: childLaneSummary,
      summary_recorded_at: childLaneSummaryRecordedAt(activeChildLane),
      last_semantic_progress_at: latestIsoTimestamp(
        childLaneSummaryRecordedAt(activeChildLane),
        normalizeOptionalString(activeChildLane.decision_at),
        normalizeOptionalString(activeChildLane.launched_at),
        latestAudit?.recorded_at ?? null,
        normalizeOptionalString(proof?.last_event_at),
        normalizeOptionalString(proof?.attempt_started_at)
      ),
      stall_classification: 'waiting_on_child_lane',
      stall_reason: `child_lane:${normalizeOptionalString(activeChildLane.stream) ?? 'pending'}`,
      recovery_recommendation: 'inspect_child_lane'
    };
  }

  if (activeChildStream) {
    const childStreamSummary =
      normalizeOptionalString(activeChildStream.summary) ??
      `Waiting on child stream ${activeChildStream.stream ?? activeChildStream.task_id ?? activeChildStream.run_id ?? 'unknown'}.`;
    return {
      phase: 'child_stream',
      kind: 'child_stream',
      status: 'waiting',
      summary: childStreamSummary,
      last_semantic_progress_at: latestIsoTimestamp(
        normalizeOptionalString(activeChildStream.launched_at),
        latestAudit?.recorded_at ?? null,
        normalizeOptionalString(proof?.last_event_at),
        normalizeOptionalString(proof?.attempt_started_at)
      ),
      stall_classification: 'waiting_on_child_stream',
      stall_reason: `child_stream:${normalizeOptionalString(activeChildStream.stream) ?? 'active'}`,
      recovery_recommendation: 'inspect_child_stream'
    };
  }

  if (trackedWorkflowState?.isHandoff) {
    return {
      phase: 'review_handoff',
      kind: 'workflow',
      status: 'completed',
      summary: 'Issue is in review handoff.',
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'completed',
      stall_reason: null,
      recovery_recommendation: 'no_action'
    };
  }

  if (trackedWorkflowState?.isTerminal || claimTerminalWorkflowSupersedesWorkerProgress) {
    return {
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      summary: 'Issue is complete.',
      last_semantic_progress_at: latestIsoTimestamp(
        lastSemanticProgressAt,
        terminalWorkflowUpdatedAt
      ),
      stall_classification: 'completed',
      stall_reason: null,
      recovery_recommendation: 'no_action'
    };
  }

  if (ownerPhase || proof) {
    const phase = normalizeProofProgressPhase(ownerPhase);
    const authoritativeWorkerProgress = resolveAuthoritativeWorkerProgress({
      proof,
      currentTurnStartedAt,
      latestChildSummaryCandidate,
      lastSemanticProgressAt,
      phase
    });
    const summary =
      authoritativeWorkerProgress.summary ?? defaultProgressSummaryForPhase(phase);
    if (isSemanticallyStalled(lastSemanticProgressAt, now())) {
      return {
        phase,
        kind: 'worker',
        status: 'stalled',
        summary,
        summary_recorded_at: authoritativeWorkerProgress.summary_recorded_at,
        message_recorded_at: authoritativeWorkerProgress.message_recorded_at,
        source_updated_at: authoritativeWorkerProgress.source_updated_at,
        selected_event: authoritativeWorkerProgress.event,
        event_source: authoritativeWorkerProgress.source,
        event_candidates: authoritativeWorkerProgress.candidates,
        last_semantic_progress_at: lastSemanticProgressAt,
        stall_classification: 'stalled',
        stall_reason:
          lastSemanticProgressAt
            ? `no_semantic_progress_since:${lastSemanticProgressAt}`
            : 'no_semantic_progress_recorded',
        recovery_recommendation: 'inspect_worker_logs'
      };
    }
    return {
      phase,
      kind: 'worker',
      status: 'progressing',
      summary,
      summary_recorded_at: authoritativeWorkerProgress.summary_recorded_at,
      message_recorded_at: authoritativeWorkerProgress.message_recorded_at,
      source_updated_at: authoritativeWorkerProgress.source_updated_at,
      selected_event: authoritativeWorkerProgress.event,
      event_source: authoritativeWorkerProgress.source,
      event_candidates: authoritativeWorkerProgress.candidates,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'progressing',
      stall_reason: null,
      recovery_recommendation: 'continue_waiting'
    };
  }

  if (trackedWorkflowState?.isActive) {
    return {
      phase: 'unknown',
      kind: 'workflow',
      status: 'progressing',
      summary: 'Issue is active but worker progress has not been observed yet.',
      last_semantic_progress_at: latestAudit?.recorded_at ?? null,
      stall_classification: 'progressing',
      stall_reason: null,
      recovery_recommendation: 'continue_waiting'
    };
  }

  return null;
}

function resolveReworkResetUpdatedAt(input: {
  trackedIssue:
    | Pick<LiveLinearTrackedIssue, 'updated_at'>
    | null
    | undefined;
  claim: ProviderIssueClaimLike | null;
  trackedWorkflowState: ReturnType<typeof classifyProviderLinearWorkflowState> | null;
  claimWorkflowState: ReturnType<typeof resolveClaimWorkflowStateClassification> | null;
}): string | null {
  const trackedIssueIsRework = input.trackedWorkflowState?.normalizedState === 'rework';
  const canUseClaimReworkTruth = !input.trackedIssue || trackedIssueIsRework;
  const claimWorkflowState = canUseClaimReworkTruth
    ? input.claimWorkflowState ?? resolveClaimWorkflowStateClassification(input.claim)
    : null;
  return latestIsoTimestamp(
    trackedIssueIsRework
      ? normalizeOptionalString(input.trackedIssue?.updated_at)
      : null,
    claimWorkflowState?.normalizedState === 'rework'
      ? normalizeOptionalString(input.claim?.issue_updated_at)
      : null
  );
}

function isPullRequestLifecycleSupersededByReworkReset(
  record: ProviderIssuePullRequestLifecycleLike | null,
  reworkResetUpdatedAt: string | null
): boolean {
  if (!record || !reworkResetUpdatedAt) {
    return false;
  }
  const semanticLifecycleUpdatedAt = latestIsoTimestamp(
    normalizeOptionalString(record.issue_updated_at),
    normalizeOptionalString(
      (record as ProviderIssueReviewPromotionLike).linear_transition?.issue_updated_at
    ),
    normalizeOptionalString((record as ProviderIssueMergeCloseoutLike).issue_updated_at),
  );
  const lifecycleUpdatedAt = semanticLifecycleUpdatedAt ?? normalizeOptionalString(record.recorded_at);
  if (!lifecycleUpdatedAt) {
    return false;
  }
  const reworkResetComparison = compareIsoTimestamp(reworkResetUpdatedAt, lifecycleUpdatedAt);
  if (
    reworkResetComparison === 0 &&
    isPullRequestLifecycleCurrentReworkTransition(record)
  ) {
    return false;
  }
  return reworkResetComparison >= 0;
}

function isPullRequestLifecycleCurrentReworkTransition(
  record: ProviderIssuePullRequestLifecycleLike
): boolean {
  const lifecycle = record as ProviderIssueMergeCloseoutLike | ProviderIssueReviewPromotionLike;
  const transition = lifecycle.linear_transition;
  return [
    normalizeOptionalString((lifecycle as ProviderIssueMergeCloseoutLike).issue_state),
    normalizeOptionalString(transition?.target_state),
    normalizeOptionalString(transition?.issue_state)
  ].some((state) => normalizeProviderLinearWorkflowState(state) === 'rework');
}

function resolveClaimWorkflowStateClassification(
  claim: Pick<ProviderIssueClaimLike, 'issue_state' | 'issue_state_type'> | null | undefined
) {
  const state = normalizeOptionalString(claim?.issue_state);
  const stateType = normalizeOptionalString(claim?.issue_state_type);
  if (!state && !stateType) {
    return null;
  }
  return classifyProviderLinearWorkflowState({
    state,
    state_type: stateType
  });
}

function resolveAuthoritativeWorkerProgress(input: {
  proof: ProviderIssueProofLike | null;
  currentTurnStartedAt?: string | null;
  latestChildSummaryCandidate?: ProviderChildProgressSummaryCandidate | null;
  lastSemanticProgressAt: string | null;
  phase: ProviderLinearWorkerProgressPhase;
}): {
  event: string | null;
  source: string | null;
  summary: string | null;
  summary_recorded_at: string | null;
  message_recorded_at: string | null;
  source_updated_at: string | null;
  candidates: ProviderLinearWorkerProgressCandidate[];
} {
  const childCandidates = collectCurrentTurnChildProgressSummaryCandidates(
    input.proof,
    normalizeOptionalString(input.currentTurnStartedAt)
  );
  if (childCandidates.length === 0 && input.latestChildSummaryCandidate) {
    childCandidates.push({
      source: input.latestChildSummaryCandidate.source,
      event: input.latestChildSummaryCandidate.event,
      summary: input.latestChildSummaryCandidate.summary,
      message_recorded_at: input.latestChildSummaryCandidate.recorded_at,
      source_updated_at: input.latestChildSummaryCandidate.recorded_at,
      derived: true
    });
  }
  const candidates = [
    buildCurrentTurnActivityProgressCandidate(input.proof),
    buildLegacyProofMessageProgressCandidate(input.proof),
    ...childCandidates,
    buildGenericPhaseFallbackProgressCandidate(input.phase, input.lastSemanticProgressAt)
  ].filter((candidate): candidate is RankedProviderLinearWorkerProgressCandidate => Boolean(candidate));
  const winner = selectBestProviderLinearWorkerProgressCandidate(candidates);
  if (!winner) {
    return {
      event: null,
      source: null,
      summary: null,
      summary_recorded_at: null,
      message_recorded_at: null,
      source_updated_at: null,
      candidates: []
    };
  }
  return {
    event: winner.event,
    source: winner.source,
    summary: winner.summary,
    summary_recorded_at: winner.message_recorded_at,
    message_recorded_at: winner.message_recorded_at,
    source_updated_at: winner.source_updated_at,
    candidates: candidates.map((candidate) => ({
      source: candidate.source,
      event: candidate.event,
      summary: candidate.summary,
      message_recorded_at: candidate.message_recorded_at,
      source_updated_at: candidate.source_updated_at,
      derived: candidate.derived,
      accepted: candidate === winner,
      rejection_reason:
        candidate === winner ? null : explainProviderLinearWorkerProgressCandidateRejection(candidate, winner)
    }))
  };
}

interface RankedProviderLinearWorkerProgressCandidate {
  source: string;
  event: string | null;
  summary: string | null;
  message_recorded_at: string | null;
  source_updated_at: string | null;
  derived: boolean;
}

function selectProofPreferredMessage(proof: ProviderIssueProofLike | null): string | null {
  return (
    normalizeOptionalString(proof?.current_turn_activity?.message_or_payload) ??
    normalizeOptionalString(proof?.last_message)
  );
}

function buildCurrentTurnActivityProgressCandidate(
  proof: ProviderIssueProofLike | null
): RankedProviderLinearWorkerProgressCandidate | null {
  const activity = proof?.current_turn_activity ?? null;
  if (!activity) {
    return null;
  }
  const summary = normalizeOptionalString(activity.message_or_payload);
  const event = normalizeOptionalString(activity.event);
  const recordedAt = normalizeOptionalString(activity.recorded_at);
  if (!summary && !event) {
    return null;
  }
  const source =
    normalizeOptionalString(activity.source) === 'session_log_hydration'
      ? 'canonical_session_log_hydration'
      : 'canonical_stdout_jsonl';
  return {
    source,
    event,
    summary,
    message_recorded_at: summary ? recordedAt : null,
    source_updated_at: recordedAt,
    derived: false
  };
}

function buildLegacyProofMessageProgressCandidate(
  proof: ProviderIssueProofLike | null
): RankedProviderLinearWorkerProgressCandidate | null {
  const summary = normalizeOptionalString(proof?.last_message);
  const event = normalizeOptionalString(proof?.last_event);
  if (!summary && !event) {
    return null;
  }
  return {
    source: summary ? 'legacy_proof_last_message' : 'legacy_proof_fields',
    event,
    summary,
    // Legacy proof does not preserve an authoritative last-message timestamp.
    // `last_event_at` can advance on non-message events (for example token_count),
    // so treating it as message freshness can incorrectly outrank canonical activity.
    message_recorded_at: null,
    source_updated_at: latestIsoTimestamp(
      normalizeOptionalString(proof?.last_event_at),
      normalizeOptionalString(proof?.updated_at)
    ),
    derived: false
  };
}

function buildGenericPhaseFallbackProgressCandidate(
  phase: ProviderLinearWorkerProgressPhase,
  lastSemanticProgressAt: string | null
): RankedProviderLinearWorkerProgressCandidate {
  return {
    source: 'generic_phase_fallback',
    event: phase,
    summary: defaultProgressSummaryForPhase(phase),
    message_recorded_at: null,
    source_updated_at: lastSemanticProgressAt,
    derived: true
  };
}

function collectCurrentTurnChildProgressSummaryCandidates(
  proof: ProviderIssueProofLike | null,
  currentTurnStartedAt: string | null
): RankedProviderLinearWorkerProgressCandidate[] {
  return [
    ...selectCurrentTurnChildLanes(proof?.child_lanes ?? null, currentTurnStartedAt)
      .filter(isCurrentProgressChildLaneSummaryEligible)
      .flatMap((childLane) => {
        const summary = normalizeProviderChildLaneProgressSummary(childLane);
        const summaryRecordedAt = childLaneSummaryRecordedAt(childLane);
        return summary
          ? [
              {
                source: 'child_lane_summary',
                event: null,
                summary,
                message_recorded_at: summaryRecordedAt,
                source_updated_at: summaryRecordedAt,
                derived: true
              } satisfies RankedProviderLinearWorkerProgressCandidate
            ]
          : [];
      }),
    ...selectCurrentTurnChildStreams(proof?.child_streams ?? null, currentTurnStartedAt).flatMap((childStream) => {
      const summary = normalizeOptionalString(childStream.summary);
      return summary
        ? [
            {
              source: 'child_stream_summary',
              event: null,
              summary,
              message_recorded_at: latestIsoTimestamp(
                normalizeOptionalString(childStream.recorded_at),
                normalizeOptionalString(childStream.launched_at)
              ),
              source_updated_at: latestIsoTimestamp(
                normalizeOptionalString(childStream.recorded_at),
                normalizeOptionalString(childStream.launched_at)
              ),
              derived: true
            } satisfies RankedProviderLinearWorkerProgressCandidate
          ]
        : [];
    })
  ];
}

function selectBestProviderLinearWorkerProgressCandidate(
  candidates: RankedProviderLinearWorkerProgressCandidate[]
): RankedProviderLinearWorkerProgressCandidate | null {
  return candidates.reduce<RankedProviderLinearWorkerProgressCandidate | null>((current, candidate) => {
    if (!current) {
      return candidate;
    }
    return compareProviderLinearWorkerProgressCandidatePriority(candidate, current) > 0
      ? candidate
      : current;
  }, null);
}

function compareProviderLinearWorkerProgressCandidatePriority(
  left: RankedProviderLinearWorkerProgressCandidate,
  right: RankedProviderLinearWorkerProgressCandidate
): number {
  const signalComparison =
    scoreProviderLinearWorkerProgressCandidate(left) -
    scoreProviderLinearWorkerProgressCandidate(right);
  if (signalComparison !== 0) {
    return signalComparison;
  }
  if (left.message_recorded_at && right.message_recorded_at) {
    const messageFreshnessComparison = compareIsoTimestamp(
      left.message_recorded_at,
      right.message_recorded_at
    );
    if (messageFreshnessComparison !== 0) {
      return messageFreshnessComparison;
    }
  }
  const sourceComparison =
    providerLinearWorkerProgressCandidateSourcePriority(left.source) -
    providerLinearWorkerProgressCandidateSourcePriority(right.source);
  if (sourceComparison !== 0) {
    return sourceComparison;
  }
  return compareIsoTimestamp(left.source_updated_at, right.source_updated_at);
}

function scoreProviderLinearWorkerProgressCandidate(
  candidate: RankedProviderLinearWorkerProgressCandidate
): number {
  if (isHighSignalProviderProgressSummary(candidate.summary)) {
    return 3;
  }
  return candidate.summary || candidate.event ? 1 : 0;
}

function providerLinearWorkerProgressCandidateSourcePriority(source: string): number {
  switch (source) {
    case 'canonical_stdout_jsonl':
      return 60;
    case 'canonical_session_log_hydration':
      return 50;
    case 'legacy_proof_fields':
    case 'legacy_proof_last_message':
      return 40;
    case 'child_lane_summary':
      return 30;
    case 'child_stream_summary':
      return 20;
    case 'generic_phase_fallback':
      return 0;
    default:
      return 0;
  }
}

function explainProviderLinearWorkerProgressCandidateRejection(
  candidate: RankedProviderLinearWorkerProgressCandidate,
  winner: RankedProviderLinearWorkerProgressCandidate
): string {
  if (
    scoreProviderLinearWorkerProgressCandidate(candidate) <
    scoreProviderLinearWorkerProgressCandidate(winner)
  ) {
    return 'lower_signal_than_winner';
  }
  if (candidate.message_recorded_at && winner.message_recorded_at) {
    const messageFreshnessComparison = compareIsoTimestamp(
      candidate.message_recorded_at,
      winner.message_recorded_at
    );
    if (messageFreshnessComparison < 0) {
      return 'older_than_winner';
    }
  }
  if (
    providerLinearWorkerProgressCandidateSourcePriority(candidate.source) <
    providerLinearWorkerProgressCandidateSourcePriority(winner.source)
  ) {
    return 'less_authoritative_than_winner';
  }
  if (compareIsoTimestamp(candidate.source_updated_at, winner.source_updated_at) < 0) {
    return 'older_than_winner';
  }
  return 'ranked_below_winner';
}

export function selectLatestProviderLinearAuditEntry(
  audit: ProviderLinearAuditSummary | null | undefined
): ProviderLinearAuditEntry | null {
  const entries = Object.values(audit?.latest_by_operation ?? {}).filter(
    (entry): entry is ProviderLinearAuditEntry => Boolean(entry)
  );
  if (entries.length === 0) {
    return null;
  }
  return entries.sort((left, right) => compareIsoTimestamp(right.recorded_at, left.recorded_at))[0] ?? null;
}

function hasAuthoritativeWorkerProgressSignal(input: {
  proof: ProviderIssueProofLike | null;
  ownerPhase: string | null;
  ownerStatus: string | null;
  endReason: string | null;
  lastSemanticProgressAt: string | null;
}): boolean {
  if (!input.proof) {
    return false;
  }
  return Boolean(
    input.ownerPhase
    || input.ownerStatus
    || input.endReason
    || input.lastSemanticProgressAt
    || normalizeOptionalString(input.proof.current_turn_activity?.event)
    || normalizeOptionalString(input.proof.current_turn_activity?.message_or_payload)
    || normalizeOptionalString(input.proof.last_event)
    || normalizeOptionalString(input.proof.last_message)
  );
}

function deriveMergeCloseoutProgressSnapshot(
  mergeCloseout: ProviderIssueMergeCloseoutLike
): ProviderLinearWorkerProgressSnapshot {
  const mergeStatus = normalizeOptionalString(mergeCloseout.status);
  const snapshot = mergeCloseout.snapshot ?? null;
  const sharedRoot = mergeCloseout.shared_root ?? null;
  const checksPending =
    normalizeOptionalInteger(snapshot?.required_checks_pending) ??
    normalizeOptionalInteger(snapshot?.checks_pending);
  const checksFailed =
    normalizeOptionalInteger(snapshot?.required_checks_failed) ??
    normalizeOptionalInteger(snapshot?.checks_failed);
  const unresolvedThreadCount = normalizeOptionalInteger(snapshot?.unresolved_thread_count);
  const actionRequiredReasons = normalizeStringArray(snapshot?.action_required_reasons);
  const gateReasons = normalizeStringArray(snapshot?.gate_reasons);
  const snapshotState = normalizeOptionalString(snapshot?.state);
  const snapshotShowsMerged =
    mergeStatus === 'merged' ||
    Boolean(normalizeOptionalString(snapshot?.merged_at)) ||
    snapshotState === 'MERGED';
  const lastSemanticProgressAt = latestIsoTimestamp(
    normalizeOptionalString(mergeCloseout.recorded_at),
    normalizeOptionalString(snapshot?.updated_at),
    normalizeOptionalString(snapshot?.merged_at)
  );
  const summary =
    normalizeOptionalString(mergeCloseout.summary) ??
    'Merge closeout status updated.';
  const reviewBlockerReason = resolveMergeCloseoutReviewBlockerReason({
    unresolvedThreadCount,
    actionRequiredReasons
  });
  const checksFailedReason = resolveMergeCloseoutChecksFailedReason({
    checksFailed,
    actionRequiredReasons
  });

  if (snapshotShowsMerged) {
    if (normalizeOptionalString(sharedRoot?.status) === 'failed') {
      return {
        phase: 'failed',
        kind: 'merge_closeout',
        status: 'failed',
        summary,
        last_semantic_progress_at: lastSemanticProgressAt,
        stall_classification: 'failed',
        stall_reason:
          normalizeOptionalString(sharedRoot?.reason) ?? 'shared_root_reconciliation_failed',
        recovery_recommendation: 'inspect_merge_closeout'
      };
    }
    if (normalizeOptionalString(sharedRoot?.status) === 'skipped') {
      return {
        phase: 'pending_shared_root_reconciliation',
        kind: 'merge_closeout',
        status: 'stalled',
        summary,
        last_semantic_progress_at: lastSemanticProgressAt,
        stall_classification: 'stalled',
        stall_reason:
          normalizeOptionalString(sharedRoot?.reason) ?? 'pending_shared_root_reconciliation',
        recovery_recommendation: 'inspect_merge_closeout'
      };
    }
    return {
      phase: 'completed',
      kind: 'merge_closeout',
      status: 'completed',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'completed',
      stall_reason: null,
      recovery_recommendation: 'no_action'
    };
  }

  if (mergeStatus === 'merge_failed' || mergeStatus === 'transition_failed') {
    return {
      phase: 'failed',
      kind: 'merge_closeout',
      status: 'failed',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'failed',
      stall_reason: normalizeOptionalString(mergeCloseout.reason) ?? mergeStatus,
      recovery_recommendation: 'inspect_merge_closeout'
    };
  }

  if (hasPendingBranchRecovery(mergeCloseout)) {
    return {
      phase: 'watching_merge',
      kind: 'merge_closeout',
      status: 'progressing',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'progressing',
      stall_reason: null,
      recovery_recommendation: 'continue_waiting'
    };
  }

  if (
    reviewBlockerReason
    || (unresolvedThreadCount ?? 0) > 0
  ) {
    return {
      phase: 'waiting_on_review',
      kind: 'merge_closeout',
      status: 'waiting',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'waiting_on_review',
      stall_reason: reviewBlockerReason,
      recovery_recommendation: 'address_review_feedback'
    };
  }

  if (checksFailedReason) {
    return {
      phase: 'waiting_on_checks',
      kind: 'merge_closeout',
      status: 'stalled',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'stalled',
      stall_reason: checksFailedReason,
      recovery_recommendation: 'inspect_merge_closeout'
    };
  }

  if (mergeStatus === 'action_required' || actionRequiredReasons.length > 0) {
    return {
      phase: 'watching_merge',
      kind: 'merge_closeout',
      status: 'stalled',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'stalled',
      stall_reason: actionRequiredReasons[0] ?? normalizeOptionalString(mergeCloseout.reason) ?? 'merge_action_required',
      recovery_recommendation: 'inspect_merge_closeout'
    };
  }

  if ((checksPending ?? 0) > 0) {
    return {
      phase: 'waiting_on_checks',
      kind: 'merge_closeout',
      status: 'waiting',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'waiting_on_checks',
      stall_reason: gateReasons[0] ?? 'checks_pending',
      recovery_recommendation: 'wait_for_checks'
    };
  }

  if (snapshot?.ready_to_merge === true) {
    return {
      phase: 'attempting_merge',
      kind: 'merge_closeout',
      status: 'progressing',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'progressing',
      stall_reason: null,
      recovery_recommendation: 'continue_waiting'
    };
  }

  return {
    phase: mergeStatus === 'action_required' ? 'waiting_on_review' : 'watching_merge',
    kind: 'merge_closeout',
    status: mergeStatus === 'action_required' ? 'waiting' : 'progressing',
    summary,
    last_semantic_progress_at: lastSemanticProgressAt,
    stall_classification:
      mergeStatus === 'action_required' ? 'waiting_on_review' : 'progressing',
    stall_reason: normalizeOptionalString(mergeCloseout.reason),
    recovery_recommendation:
      mergeStatus === 'action_required' ? 'address_review_feedback' : 'continue_waiting'
  };
}

function deriveReviewPromotionProgressSnapshot(
  reviewPromotion: ProviderIssueReviewPromotionLike
): ProviderLinearWorkerProgressSnapshot {
  const promotionStatus = normalizeOptionalString(reviewPromotion.status);
  const snapshot = reviewPromotion.snapshot ?? null;
  const checksPending =
    normalizeOptionalInteger(snapshot?.required_checks_pending) ??
    normalizeOptionalInteger(snapshot?.checks_pending);
  const checksFailed =
    normalizeOptionalInteger(snapshot?.required_checks_failed) ??
    normalizeOptionalInteger(snapshot?.checks_failed);
  const unresolvedThreadCount = normalizeOptionalInteger(snapshot?.unresolved_thread_count);
  const actionRequiredReasons = normalizeStringArray(snapshot?.action_required_reasons);
  const gateReasons = normalizeStringArray(snapshot?.gate_reasons);
  const lastSemanticProgressAt = latestIsoTimestamp(
    normalizeOptionalString(reviewPromotion.recorded_at),
    normalizeOptionalString(snapshot?.updated_at),
    normalizeOptionalString(reviewPromotion.linear_transition?.attempted_at)
  );
  const summary =
    normalizeOptionalString(reviewPromotion.summary) ??
    'Review-handoff promotion status updated.';
  const reviewBlockerReason = resolveMergeCloseoutReviewBlockerReason({
    unresolvedThreadCount,
    actionRequiredReasons
  });
  const checksFailedReason = resolveMergeCloseoutChecksFailedReason({
    checksFailed,
    actionRequiredReasons
  });

  if (promotionStatus === 'promoted') {
    return {
      phase: 'review_handoff',
      kind: 'workflow',
      status: 'completed',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'completed',
      stall_reason: null,
      recovery_recommendation: 'no_action'
    };
  }

  if (promotionStatus === 'transition_failed' || promotionStatus === 'promotion_failed') {
    return {
      phase: 'failed',
      kind: 'workflow',
      status: 'failed',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'failed',
      stall_reason:
        normalizeOptionalString(reviewPromotion.reason) ?? promotionStatus,
      recovery_recommendation: 'inspect_merge_closeout'
    };
  }

  if (hasPendingBranchRecovery(reviewPromotion)) {
    return {
      phase: 'review_handoff',
      kind: 'workflow',
      status: 'progressing',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'progressing',
      stall_reason: null,
      recovery_recommendation: 'continue_waiting'
    };
  }

  if (
    reviewBlockerReason
    || (unresolvedThreadCount ?? 0) > 0
  ) {
    return {
      phase: 'waiting_on_review',
      kind: 'workflow',
      status: 'waiting',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'waiting_on_review',
      stall_reason: reviewBlockerReason,
      recovery_recommendation: 'address_review_feedback'
    };
  }

  if (checksFailedReason) {
    return {
      phase: 'waiting_on_checks',
      kind: 'workflow',
      status: 'stalled',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'stalled',
      stall_reason: checksFailedReason,
      recovery_recommendation: 'inspect_merge_closeout'
    };
  }

  if ((checksPending ?? 0) > 0) {
    return {
      phase: 'waiting_on_checks',
      kind: 'workflow',
      status: 'waiting',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'waiting_on_checks',
      stall_reason: gateReasons[0] ?? 'checks_pending',
      recovery_recommendation: 'wait_for_checks'
    };
  }

  if (promotionStatus === 'action_required' || actionRequiredReasons.length > 0) {
    return {
      phase: 'review_handoff',
      kind: 'workflow',
      status: 'stalled',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'stalled',
      stall_reason:
        actionRequiredReasons[0] ??
        normalizeOptionalString(reviewPromotion.reason) ??
        'review_handoff_promotion_blocked',
      recovery_recommendation: 'inspect_merge_closeout'
    };
  }

  return {
    phase: 'review_handoff',
    kind: 'workflow',
    status: promotionStatus === 'watching' ? 'waiting' : 'progressing',
    summary,
    last_semantic_progress_at: lastSemanticProgressAt,
    stall_classification: promotionStatus === 'watching' ? 'waiting_on_review' : 'progressing',
    stall_reason: normalizeOptionalString(reviewPromotion.reason),
    recovery_recommendation:
      promotionStatus === 'watching' ? 'continue_waiting' : 'continue_waiting'
  };
}

function derivePendingMergeCloseoutProgressSnapshot(
  reviewPromotion: ProviderIssueReviewPromotionLike
): ProviderLinearWorkerProgressSnapshot {
  const snapshot = reviewPromotion.snapshot ?? null;
  const lastSemanticProgressAt = latestIsoTimestamp(
    normalizeOptionalString(reviewPromotion.recorded_at),
    normalizeOptionalString(snapshot?.updated_at),
    normalizeOptionalString(reviewPromotion.linear_transition?.attempted_at)
  );
  const summary = normalizeOptionalString(reviewPromotion.summary);
  return {
    phase: 'watching_merge',
    kind: 'workflow',
    status: 'progressing',
    summary: summary
      ? `${summary} Waiting for merge closeout to start.`
      : 'Review handoff was promoted to Merging; waiting for merge closeout to start.',
    last_semantic_progress_at: lastSemanticProgressAt,
    stall_classification: 'progressing',
    stall_reason: null,
    recovery_recommendation: 'continue_waiting'
  };
}

function hasPendingBranchRecovery(record: ProviderIssuePullRequestLifecycleLike): boolean {
  return (
    normalizeOptionalString(record.reason) === 'branch_refresh_requested'
    && record.branch_recovery?.ok === true
    && Boolean(normalizeOptionalString(record.branch_recovery.recovery_reason))
  );
}

function resolveMergeCloseoutReviewBlockerReason(input: {
  unresolvedThreadCount: number | null;
  actionRequiredReasons: string[];
}): string | null {
  const reviewReason = input.actionRequiredReasons.find((reason) => isMergeCloseoutReviewBlockerReason(reason));
  if (reviewReason) {
    return reviewReason;
  }
  if ((input.unresolvedThreadCount ?? 0) > 0) {
    return 'unresolved_review_threads';
  }
  return null;
}

function resolveMergeCloseoutChecksFailedReason(input: {
  checksFailed: number | null;
  actionRequiredReasons: string[];
}): string | null {
  const failedChecksReason = input.actionRequiredReasons.find((reason) => isMergeCloseoutChecksFailedReason(reason));
  if (failedChecksReason) {
    return failedChecksReason;
  }
  if ((input.checksFailed ?? 0) > 0) {
    return 'checks_failed';
  }
  return null;
}

function isMergeCloseoutReviewBlockerReason(reason: string): boolean {
  return (
    reason === 'changes_requested' ||
    reason === 'review_required' ||
    reason.startsWith('review=') ||
    reason.startsWith('unresolved_threads=') ||
    reason.startsWith('unacknowledged_bot_feedback=')
  );
}

function isMergeCloseoutChecksFailedReason(reason: string): boolean {
  return reason.startsWith('required_checks_failed=') || reason.startsWith('checks_failed=');
}

function buildProviderDebugPullRequestSnapshot(input: {
  reviewPromotion: ProviderIssueReviewPromotionLike | null;
  mergeCloseout: ProviderIssueMergeCloseoutLike | null;
  preferReviewPromotion: boolean;
}): ControlProviderDebugSnapshot['pull_request'] {
  const selectedRecord =
    input.preferReviewPromotion && input.reviewPromotion
      ? input.reviewPromotion
      : input.mergeCloseout ?? input.reviewPromotion;
  if (!selectedRecord) {
    return null;
  }
  const snapshot = selectedRecord.snapshot ?? null;
  return {
    review_promotion_status: normalizeOptionalString(input.reviewPromotion?.status),
    attached_pr_urls: normalizeStringArray(selectedRecord.attached_pr_urls),
    ignored_historical_pr_urls: normalizeStringArray(selectedRecord.ignored_historical_pr_urls),
    ignored_closed_unmerged_pr_urls: normalizeStringArray(selectedRecord.ignored_closed_unmerged_pr_urls),
    conflicting_attached_pr_urls: normalizeStringArray(selectedRecord.conflicting_attached_pr_urls),
    url: normalizeOptionalString(selectedRecord.pr?.url),
    owner: normalizeOptionalString(selectedRecord.pr?.owner),
    repo: normalizeOptionalString(selectedRecord.pr?.repo),
    number: normalizeOptionalInteger(selectedRecord.pr?.number),
    merge_closeout_status: normalizeOptionalString(input.mergeCloseout?.status),
    reason: normalizeOptionalString(selectedRecord.reason),
    summary: normalizeOptionalString(selectedRecord.summary),
    shared_root_status: normalizeOptionalString(input.mergeCloseout?.shared_root?.status),
    shared_root_reason: normalizeOptionalString(input.mergeCloseout?.shared_root?.reason),
    shared_root_before_status: normalizeOptionalString(input.mergeCloseout?.shared_root?.before_status),
    shared_root_after_status: normalizeOptionalString(input.mergeCloseout?.shared_root?.after_status),
    ready_to_merge:
      typeof snapshot?.ready_to_merge === 'boolean' ? snapshot.ready_to_merge : null,
    review_decision: normalizeOptionalString(snapshot?.review_decision),
    merge_state_status: normalizeOptionalString(snapshot?.merge_state_status),
    unresolved_thread_count: normalizeOptionalInteger(snapshot?.unresolved_thread_count),
    checks_pending: normalizeOptionalInteger(snapshot?.checks_pending),
    checks_failed: normalizeOptionalInteger(snapshot?.checks_failed),
    required_checks_pending: normalizeOptionalInteger(snapshot?.required_checks_pending),
    required_checks_failed: normalizeOptionalInteger(snapshot?.required_checks_failed),
    gate_reasons: normalizeStringArray(snapshot?.gate_reasons),
    action_required_reasons: normalizeStringArray(snapshot?.action_required_reasons),
    updated_at: normalizeOptionalString(snapshot?.updated_at),
    merged_at: normalizeOptionalString(snapshot?.merged_at),
    branch_recovery: selectedRecord.branch_recovery
      ? {
          attempted_at: normalizeOptionalString(selectedRecord.branch_recovery.attempted_at),
          head_oid: normalizeOptionalString(selectedRecord.branch_recovery.head_oid),
          recovery_reason: normalizeOptionalString(selectedRecord.branch_recovery.recovery_reason),
          command: normalizeOptionalString(selectedRecord.branch_recovery.command),
          args: normalizeStringArray(selectedRecord.branch_recovery.args),
          exit_code: normalizeOptionalInteger(selectedRecord.branch_recovery.exit_code),
          ok:
            typeof selectedRecord.branch_recovery.ok === 'boolean'
              ? selectedRecord.branch_recovery.ok
              : null,
          stdout: normalizeOptionalString(selectedRecord.branch_recovery.stdout),
          stderr: normalizeOptionalString(selectedRecord.branch_recovery.stderr),
          failure_kind: normalizeOptionalString(selectedRecord.branch_recovery.failure_kind)
        }
      : null
  };
}

function normalizeProofProgressPhase(
  ownerPhase: string | null
): ProviderLinearWorkerProgressPhase {
  switch (ownerPhase) {
    case 'bootstrapping':
      return 'bootstrapping';
    case 'turn_running':
      return 'turn_running';
    case 'turn_completed':
      return 'turn_completed';
    case 'turn_failed':
      return 'turn_failed';
    case 'ended':
      return 'completed';
    default:
      return ownerPhase ? 'unknown' : 'unknown';
  }
}

function defaultProgressSummaryForPhase(phase: ProviderLinearWorkerProgressPhase): string {
  switch (phase) {
    case 'bootstrapping':
      return 'Provider worker is bootstrapping.';
    case 'turn_running':
      return 'Provider worker turn is active.';
    case 'turn_completed':
      return 'Provider worker completed a turn and is evaluating next steps.';
    case 'turn_failed':
      return 'Provider worker turn failed.';
    case 'pending_shared_root_reconciliation':
      return 'Shared-root reconciliation is pending after merge closeout.';
    case 'completed':
      return 'Provider worker completed successfully.';
    default:
      return 'Provider worker progress updated.';
  }
}

function selectLatestChildProgressSummaryCandidate(
  proof: ProviderIssueProofLike | null,
  currentTurnStartedAt: string | null = null
): ProviderChildProgressSummaryCandidate | null {
  const childSummaries = [
    ...selectCurrentTurnChildLanes(proof?.child_lanes ?? null, currentTurnStartedAt)
      .filter(isCurrentProgressChildLaneSummaryEligible)
      .flatMap((childLane) => {
        const summary = normalizeProviderChildLaneProgressSummary(childLane);
        return summary
          ? [
              {
                source: 'child_lane_summary',
                event: null,
                summary,
                recorded_at: childLaneSummaryRecordedAt(childLane)
              } satisfies ProviderChildProgressSummaryCandidate
            ]
          : [];
      }),
    ...selectCurrentTurnChildStreams(proof?.child_streams ?? null, currentTurnStartedAt).flatMap((childStream) => {
      const summary = normalizeOptionalString(childStream.summary);
      return summary
        ? [
            {
              source: 'child_stream_summary',
              event: null,
              summary,
              recorded_at: latestIsoTimestamp(
                normalizeOptionalString(childStream.recorded_at),
                normalizeOptionalString(childStream.launched_at)
              )
            } satisfies ProviderChildProgressSummaryCandidate
          ]
        : [];
    })
  ];
  if (childSummaries.length === 0) {
    return null;
  }
  return childSummaries.sort((left, right) => compareIsoTimestamp(right.recorded_at, left.recorded_at))[0]
    ?? null;
}

function selectLatestChildStreamProgressAt(
  childStreams: ProviderIssueChildStreamLike[] | null | undefined,
  currentTurnStartedAt: string | null = null
): string | null {
  const currentTurnChildStreams = selectCurrentTurnChildStreams(childStreams, currentTurnStartedAt);
  if (currentTurnChildStreams.length === 0) {
    return null;
  }
  return currentTurnChildStreams
    .map((childStream) => latestIsoTimestamp(
      normalizeOptionalString(childStream.recorded_at),
      normalizeOptionalString(childStream.launched_at)
    ))
    .sort((left, right) => compareIsoTimestamp(right, left))[0] ?? null;
}

function selectCurrentTurnChildStreams(
  childStreams: ProviderIssueChildStreamLike[] | null | undefined,
  currentTurnStartedAt: string | null
): ProviderIssueChildStreamLike[] {
  if (!Array.isArray(childStreams)) {
    return [];
  }
  if (!currentTurnStartedAt) {
    return childStreams;
  }
  return childStreams.filter(
    (childStream) => compareIsoTimestamp(childStream.launched_at ?? null, currentTurnStartedAt) >= 0
  );
}

function selectActiveChildStream(
  childStreams: ProviderIssueChildStreamLike[] | null | undefined
): ProviderIssueChildStreamLike | null {
  const active = (childStreams ?? []).filter((stream) => isActiveChildStreamStatus(stream.status));
  if (active.length === 0) {
    return null;
  }
  return [...active].sort(
    (left, right) => compareIsoTimestamp(right.launched_at ?? null, left.launched_at ?? null)
  )[0] ?? null;
}

function selectLatestChildLaneProgressAt(
  childLanes: ProviderIssueChildLaneLike[] | null | undefined,
  currentTurnStartedAt: string | null = null
): string | null {
  const latestLane = selectLatestChildLaneRecord(
    selectCurrentTurnChildLanes(childLanes, currentTurnStartedAt)
  );
  return latestIsoTimestamp(
    childLaneSummaryRecordedAt(latestLane ?? {}),
    normalizeOptionalString(latestLane?.decision_at),
    normalizeOptionalString(latestLane?.launched_at)
  );
}

function isCurrentProgressChildLaneSummaryEligible(childLane: ProviderIssueChildLaneLike): boolean {
  const decision = normalizeOptionalString(childLane.decision);
  return decision !== 'accepted' && decision !== 'rejected' && decision !== 'invalidated';
}

function childLaneSummaryRecordedAt(childLane: ProviderIssueChildLaneLike): string | null {
  return normalizeOptionalString(childLane.summary_recorded_at) ?? normalizeOptionalString(childLane.launched_at);
}

function normalizeProviderChildLaneProgressSummary(childLane: ProviderIssueChildLaneLike): string | null {
  const summary = normalizeOptionalString(childLane.summary);
  if (!summary) {
    return null;
  }
  const pipelineId = normalizeOptionalString(childLane.pipeline_id);
  if (pipelineId !== null && pipelineId !== PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID) {
    return summary;
  }
  const guardrailCommandCount = normalizeOptionalInteger(childLane.guardrail_command_count);
  if (guardrailCommandCount !== null && guardrailCommandCount > 0) {
    return summary;
  }
  const guardrailsRequiredSource = normalizeGuardrailsRequiredSource(
    childLane.guardrails_required_source
  );
  if (
    typeof childLane.guardrails_required !== 'boolean' &&
    guardrailsRequiredSource === null &&
    guardrailCommandCount === null
  ) {
    return summary;
  }
  return stripNonApplicableGuardrailSummaryLines(
    {
      pipeline_id: pipelineId ?? PROVIDER_LINEAR_CHILD_LANE_PIPELINE_ID,
      guardrails_required: childLane.guardrails_required === true,
      guardrails_required_source: guardrailsRequiredSource,
      commands: []
    },
    summary
  );
}

function childLaneProgressRecordedAt(childLane: ProviderIssueChildLaneLike): string | null {
  return latestIsoTimestamp(
    childLaneSummaryRecordedAt(childLane),
    normalizeOptionalString(childLane.decision_at),
    normalizeOptionalString(childLane.launched_at)
  );
}

function selectActiveChildLane(
  childLanes: ProviderIssueChildLaneLike[] | null | undefined
): ProviderIssueChildLaneLike | null {
  const active = (childLanes ?? []).filter(
    (lane) => normalizeOptionalString(lane.decision) === 'pending' || Boolean(normalizeOptionalString(lane.in_flight_action))
  );
  if (active.length === 0) {
    return null;
  }
  return [...active].sort(
    (left, right) => compareIsoTimestamp(childLaneProgressRecordedAt(right), childLaneProgressRecordedAt(left))
  )[0] ?? null;
}

function selectCurrentTurnChildLanes(
  childLanes: ProviderIssueChildLaneLike[] | null | undefined,
  currentTurnStartedAt: string | null
): ProviderIssueChildLaneLike[] {
  if (!Array.isArray(childLanes)) {
    return [];
  }
  if (!currentTurnStartedAt) {
    return childLanes;
  }
  return childLanes.filter(
    (childLane) => compareIsoTimestamp(childLane.launched_at ?? null, currentTurnStartedAt) >= 0
  );
}

function selectLatestChildLaneRecord(
  childLanes: ProviderIssueChildLaneLike[] | null | undefined
): ProviderIssueChildLaneLike | null {
  const lanes = childLanes ?? [];
  if (lanes.length === 0) {
    return null;
  }
  return [...lanes]
    .sort((left, right) =>
      compareIsoTimestamp(
        childLaneProgressRecordedAt(right),
        childLaneProgressRecordedAt(left)
      )
    )[0] ?? null;
}

function isActiveChildStreamStatus(value: string | null | undefined): boolean {
  const normalized = normalizeProviderLinearWorkflowState(value);
  return Boolean(
    normalized &&
      normalized !== 'succeeded' &&
      normalized !== 'failed' &&
      normalized !== 'cancelled' &&
      normalized !== 'canceled' &&
      normalized !== 'completed'
  );
}

function isSemanticallyStalled(lastSemanticProgressAt: string | null, now: string): boolean {
  const lastProgressMs = safeParseTimestamp(lastSemanticProgressAt);
  const nowMs = safeParseTimestamp(now);
  if (!Number.isFinite(lastProgressMs) || !Number.isFinite(nowMs)) {
    return false;
  }
  return nowMs - lastProgressMs >= PROVIDER_SEMANTIC_STALL_THRESHOLD_MS;
}

export function isHighSignalProviderProgressSummary(value: string | null): value is string {
  if (!value) {
    return false;
  }
  return !GENERIC_PROVIDER_PROGRESS_SUMMARIES.has(value.trim().toLowerCase());
}

const GENERIC_PROVIDER_PROGRESS_SUMMARIES = new Set([
  'provider worker is bootstrapping.',
  'provider worker is bootstrapping',
  'provider worker turn is active.',
  'provider worker turn is active',
  'provider worker completed a turn and is evaluating next steps.',
  'provider worker completed a turn and is evaluating next steps',
  'provider worker turn failed.',
  'provider worker turn failed',
  'provider worker progress updated.',
  'provider worker progress updated',
  'turn active.',
  'turn active',
  'turn is still running.',
  'turn is still running'
]);

function latestIsoTimestamp(...values: Array<string | null | undefined>): string | null {
  const normalized = values
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => value !== null)
    .sort(compareIsoTimestamp);
  return normalized[normalized.length - 1] ?? null;
}

function normalizeProviderIssueRecoveredChildLanes(
  value: unknown
): ProviderIssueRecoveredChildLaneLike[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }
    const record = entry as ProviderIssueRecoveredChildLaneLike;
    return [{
      stream: normalizeOptionalString(record.stream),
      task_id: normalizeOptionalString(record.task_id),
      run_id: normalizeOptionalString(record.run_id),
      recovery_source: normalizeOptionalString(record.recovery_source),
      child_decision_lineage: normalizeProviderIssueDecisionLineage(
        record.child_decision_lineage
      ),
      parallelization_decision_lineage: normalizeProviderIssueDecisionLineage(
        record.parallelization_decision_lineage
      )
    }];
  });
}

function normalizeProviderIssueDecisionLineage(
  value: unknown
): ProviderIssueDecisionLineageLike | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as ProviderIssueDecisionLineageLike;
  if (record.schema_version !== 1) {
    return null;
  }
  return {
    schema_version: 1,
    parent_task_id: normalizeOptionalString(record.parent_task_id),
    parent_run_id: normalizeOptionalString(record.parent_run_id),
    parent_turn_started_at: normalizeOptionalString(record.parent_turn_started_at),
    parent_turn_id: normalizeOptionalString(record.parent_turn_id),
    parent_turn_count: normalizeOptionalInteger(record.parent_turn_count),
    decision_id: normalizeOptionalString(record.decision_id),
    decision_recorded_at: normalizeOptionalString(record.decision_recorded_at),
    decision: normalizeOptionalString(record.decision),
    reason: normalizeOptionalString(record.reason)
  };
}

function compareIsoTimestamp(left: string | null | undefined, right: string | null | undefined): number {
  const leftMs = safeParseTimestamp(left);
  const rightMs = safeParseTimestamp(right);
  if (!Number.isFinite(leftMs) && !Number.isFinite(rightMs)) {
    return 0;
  }
  if (!Number.isFinite(leftMs)) {
    return -1;
  }
  if (!Number.isFinite(rightMs)) {
    return 1;
  }
  return leftMs - rightMs;
}

function safeParseTimestamp(value: string | null | undefined): number {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return Number.NaN;
  }
  return Date.parse(normalized);
}

function normalizeOptionalInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
}

function normalizeGuardrailsRequiredSource(value: unknown): string | null {
  return value === 'explicit' || value === 'stage_detection' ? value : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => entry !== null);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
