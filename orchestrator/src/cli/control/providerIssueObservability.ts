import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type {
  ProviderLinearAuditEntry,
  ProviderLinearAuditSummary
} from './providerLinearWorkflowAudit.js';
import {
  classifyProviderLinearWorkflowState,
  normalizeProviderLinearWorkflowState
} from './providerLinearWorkflowStates.js';

const PROVIDER_SEMANTIC_STALL_THRESHOLD_MS = 15 * 60 * 1000;

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
  last_semantic_progress_at: string | null;
  stall_classification: ProviderLinearWorkerStallClassification;
  stall_reason: string | null;
  recovery_recommendation: ProviderLinearWorkerRecoveryRecommendation;
}

interface ProviderIssueClaimLike {
  state?: string | null;
  reason?: string | null;
  updated_at?: string | null;
  run_id?: string | null;
  launch_source?: string | null;
  launch_started_at?: string | null;
  merge_closeout?: ProviderIssueMergeCloseoutLike | null;
}

interface ProviderIssueMergeCloseoutLike {
  recorded_at?: string | null;
  status?: string | null;
  reason?: string | null;
  summary?: string | null;
  attached_pr_urls?: string[] | null;
  pr?: {
    url?: string | null;
    owner?: string | null;
    repo?: string | null;
    number?: number | null;
  } | null;
  snapshot?: {
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
  } | null;
}

interface ProviderIssueChildStreamLike {
  stream?: string | null;
  task_id?: string | null;
  run_id?: string | null;
  status?: string | null;
  launched_at?: string | null;
  summary?: string | null;
}

interface ProviderIssueChildLaneLike {
  stream?: string | null;
  task_id?: string | null;
  run_id?: string | null;
  status?: string | null;
  launched_at?: string | null;
  summary?: string | null;
  decision?: string | null;
  in_flight_action?: string | null;
  decision_at?: string | null;
  decision_reason?: string | null;
}

interface ProviderIssueProofLike {
  attempt_started_at?: string | null;
  pid?: string | null;
  thread_id?: string | null;
  latest_session_id?: string | null;
  turn_count?: number | null;
  last_event?: string | null;
  last_message?: string | null;
  last_event_at?: string | null;
  owner_phase?: string | null;
  owner_status?: string | null;
  updated_at?: string | null;
  linear_audit?: ProviderLinearAuditSummary | null;
  child_streams?: ProviderIssueChildStreamLike[] | null;
  child_lanes?: ProviderIssueChildLaneLike[] | null;
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
    launch_source: string | null;
    launch_started_at: string | null;
    freshness: ProviderIntakeClaimFreshness | null;
    is_rehydrated: boolean;
    rehydrated_at: string | null;
  } | null;
  worker: {
    owner_phase: string | null;
    owner_status: string | null;
    pid: string | null;
    thread_id: string | null;
    latest_session_id: string | null;
    turn_count: number | null;
    last_event: string | null;
    last_event_at: string | null;
    updated_at: string | null;
  } | null;
  pull_request: {
    attached_pr_urls: string[];
    url: string | null;
    owner: string | null;
    repo: string | null;
    number: number | null;
    merge_closeout_status: string | null;
    reason: string | null;
    summary: string | null;
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
  const progress = deriveProviderLinearWorkerProgressSnapshot({
    tracked_issue: trackedIssue,
    claim,
    proof
  });
  const pullRequest = buildProviderDebugPullRequestSnapshot(claim?.merge_closeout ?? null);
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
          launch_source: normalizeOptionalString(claim.launch_source),
          launch_started_at: normalizeOptionalString(claim.launch_started_at),
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
          thread_id: normalizeOptionalString(proof.thread_id),
          latest_session_id: normalizeOptionalString(proof.latest_session_id),
          turn_count: normalizeOptionalInteger(proof.turn_count),
          last_event: normalizeOptionalString(proof.last_event),
          last_event_at: normalizeOptionalString(proof.last_event_at),
          updated_at: normalizeOptionalString(proof.updated_at)
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

export function deriveProviderLinearWorkerProgressSnapshot(input: {
  tracked_issue?:
    | Pick<LiveLinearTrackedIssue, 'state' | 'state_type'>
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
  const mergeCloseout = claim?.merge_closeout ?? null;
  const activeChildLane = selectActiveChildLane(proof?.child_lanes ?? null);
  const activeChildStream = selectActiveChildStream(proof?.child_streams ?? null);
  const trackedWorkflowState = trackedIssue ? classifyProviderLinearWorkflowState(trackedIssue) : null;
  const ownerPhase = normalizeOptionalString(proof?.owner_phase);
  const ownerStatus = normalizeOptionalString(proof?.owner_status);
  const lastSemanticProgressAt = latestIsoTimestamp(
    normalizeOptionalString(proof?.last_event_at),
    latestAudit?.recorded_at ?? null,
    normalizeOptionalString(proof?.attempt_started_at)
  );

  if (mergeCloseout) {
    return deriveMergeCloseoutProgressSnapshot(mergeCloseout);
  }

  if (ownerPhase === 'ended' && ownerStatus === 'succeeded') {
    return {
      phase: trackedWorkflowState?.isHandoff ? 'review_handoff' : 'completed',
      kind: trackedWorkflowState?.isHandoff ? 'workflow' : 'worker',
      status: 'completed',
      summary:
        normalizeOptionalString(proof?.last_message) ??
        'Provider worker completed successfully.',
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'completed',
      stall_reason: null,
      recovery_recommendation: 'no_action'
    };
  }

  if (
    ownerStatus === 'failed' ||
    ownerPhase === 'turn_failed' ||
    ownerPhase === 'ended'
  ) {
    return {
      phase: ownerPhase === 'turn_failed' ? 'turn_failed' : 'failed',
      kind: 'worker',
      status: 'failed',
      summary:
        normalizeOptionalString(proof?.last_message) ??
        'Provider worker failed.',
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'failed',
      stall_reason: normalizeOptionalString(proof?.last_event) ?? normalizeOptionalString(ownerPhase),
      recovery_recommendation: 'inspect_worker_logs'
    };
  }

  if (activeChildLane) {
    const childLaneSummary =
      normalizeOptionalString(activeChildLane.summary) ??
      `Waiting on child lane ${activeChildLane.stream ?? activeChildLane.task_id ?? activeChildLane.run_id ?? 'unknown'}.`;
    return {
      phase: 'child_lane',
      kind: 'child_lane',
      status: 'waiting',
      summary: childLaneSummary,
      last_semantic_progress_at: latestIsoTimestamp(
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

  if (trackedWorkflowState?.isTerminal) {
    return {
      phase: 'completed',
      kind: 'workflow',
      status: 'completed',
      summary: 'Issue is complete.',
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'completed',
      stall_reason: null,
      recovery_recommendation: 'no_action'
    };
  }

  if (ownerPhase || proof) {
    const phase = normalizeProofProgressPhase(ownerPhase);
    const summary = normalizeOptionalString(proof?.last_message) ?? defaultProgressSummaryForPhase(phase);
    if (isSemanticallyStalled(lastSemanticProgressAt, now())) {
      return {
        phase,
        kind: 'worker',
        status: 'stalled',
        summary,
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

function deriveMergeCloseoutProgressSnapshot(
  mergeCloseout: ProviderIssueMergeCloseoutLike
): ProviderLinearWorkerProgressSnapshot {
  const mergeStatus = normalizeOptionalString(mergeCloseout.status);
  const snapshot = mergeCloseout.snapshot ?? null;
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
    normalizeOptionalString(mergeCloseout.recorded_at),
    normalizeOptionalString(snapshot?.updated_at),
    normalizeOptionalString(snapshot?.merged_at)
  );
  const summary =
    normalizeOptionalString(mergeCloseout.summary) ??
    'Merge closeout status updated.';

  if (mergeStatus === 'merged' || normalizeOptionalString(snapshot?.merged_at)) {
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

  if ((checksFailed ?? 0) > 0 || (unresolvedThreadCount ?? 0) > 0 || actionRequiredReasons.length > 0) {
    return {
      phase: 'waiting_on_review',
      kind: 'merge_closeout',
      status: 'waiting',
      summary,
      last_semantic_progress_at: lastSemanticProgressAt,
      stall_classification: 'waiting_on_review',
      stall_reason:
        actionRequiredReasons[0] ??
        (unresolvedThreadCount && unresolvedThreadCount > 0 ? 'unresolved_review_threads' : 'review_action_required'),
      recovery_recommendation: 'address_review_feedback'
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

function buildProviderDebugPullRequestSnapshot(
  mergeCloseout: ProviderIssueMergeCloseoutLike | null
): ControlProviderDebugSnapshot['pull_request'] {
  if (!mergeCloseout) {
    return null;
  }
  const snapshot = mergeCloseout.snapshot ?? null;
  return {
    attached_pr_urls: normalizeStringArray(mergeCloseout.attached_pr_urls),
    url: normalizeOptionalString(mergeCloseout.pr?.url),
    owner: normalizeOptionalString(mergeCloseout.pr?.owner),
    repo: normalizeOptionalString(mergeCloseout.pr?.repo),
    number: normalizeOptionalInteger(mergeCloseout.pr?.number),
    merge_closeout_status: normalizeOptionalString(mergeCloseout.status),
    reason: normalizeOptionalString(mergeCloseout.reason),
    summary: normalizeOptionalString(mergeCloseout.summary),
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
    merged_at: normalizeOptionalString(snapshot?.merged_at)
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
    case 'completed':
      return 'Provider worker completed successfully.';
    default:
      return 'Provider worker progress updated.';
  }
}

function selectActiveChildStream(
  childStreams: ProviderIssueChildStreamLike[] | null | undefined
): ProviderIssueChildStreamLike | null {
  const active = (childStreams ?? []).filter((stream) => isActiveChildStreamStatus(stream.status));
  if (active.length === 0) {
    return null;
  }
  return active.sort((left, right) => compareIsoTimestamp(right.launched_at ?? null, left.launched_at ?? null))[0] ?? null;
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
  return active.sort((left, right) => compareIsoTimestamp(right.launched_at ?? null, left.launched_at ?? null))[0] ?? null;
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

function latestIsoTimestamp(...values: Array<string | null | undefined>): string | null {
  const normalized = values
    .map((value) => normalizeOptionalString(value))
    .filter((value): value is string => value !== null)
    .sort(compareIsoTimestamp);
  return normalized[normalized.length - 1] ?? null;
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
