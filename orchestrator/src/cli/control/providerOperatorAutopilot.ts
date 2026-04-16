import { createHash } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';

import { isoTimestamp } from '../utils/time.js';
import {
  transitionProviderLinearIssueState,
  type ProviderLinearTransitionResult
} from './providerLinearWorkflowFacade.js';
import {
  isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned,
  sortLiveLinearTrackedIssuesForDispatch,
  type LiveLinearTrackedIssue
} from './linearDispatchSource.js';
import {
  classifyProviderLinearWorkflowState,
  normalizeProviderLinearWorkflowState,
  providerLinearTodoBlockedByNonTerminal
} from './providerLinearWorkflowStates.js';
import type { ProviderIntakeClaimRecord } from './providerIntakeState.js';
import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';
import {
  cloneProviderOperatorAutopilotLifecycleRecord,
  type ProviderOperatorAutopilotLifecycleRecord
} from './providerOperatorAutopilotLifecycle.js';

export const PROVIDER_OPERATOR_AUTOPILOT_AUDIT_FILENAME = 'provider-operator-autopilot.jsonl';
export const DEFAULT_PROVIDER_OPERATOR_AUTOPILOT_PENDING_SUMMARY =
  'Merge closeout completed; local rollout follow-up may still be required.';
const DEFAULT_BACKLOG_STATE_NAME = 'Backlog';
const DEFAULT_READY_STATE_NAME = 'Ready';
const DEFAULT_REWORK_STATE_NAME = 'Rework';
const DEFAULT_REWORK_EXCLUDED_ACTION_REQUIRED_REASONS = [
  'draft',
  'label:do-not-merge',
  'review=REVIEW_REQUIRED',
  'required_checks_query_failed'
] as const;
const BACKLOG_PROMOTION_BLOCKING_CLAIM_STATES = new Set([
  'accepted',
  'starting',
  'running',
  'resuming',
  'resumable'
]);
const REVIEW_HANDOFF_REWORK_ELIGIBLE_CLAIM_STATES = new Set(['handoff_failed']);

export interface ProviderOperatorAutopilotConfig {
  enabled: boolean;
  backlog_promotion: {
    enabled: boolean;
    state_name: string;
    target_state_name: string;
  };
  review_handoff_rework: {
    enabled: boolean;
    target_state_name: string;
    excluded_action_required_reasons: string[];
  };
  post_merge_rollout: {
    enabled: boolean;
    summary: string;
  };
}

export interface ProviderOperatorAutopilotLinearTransitionRecord {
  status: 'transitioned' | 'noop' | 'failed';
  attempted_at: string;
  previous_state: string | null;
  target_state: string;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  error: string | null;
}

export interface ProviderOperatorAutopilotActionRecord {
  kind: 'backlog_promotion' | 'review_handoff_rework';
  issue_id: string;
  issue_identifier: string | null;
  reason: string;
  summary: string;
  transition: ProviderOperatorAutopilotLinearTransitionRecord;
  action_required_reasons: string[];
}

export interface ProviderOperatorAutopilotHoldRecord {
  kind: 'backlog_promotion' | 'review_handoff_rework';
  issue_id: string | null;
  issue_identifier: string | null;
  reason: string;
  summary: string;
  action_required_reasons: string[];
}

export interface ProviderOperatorAutopilotPendingActionRecord {
  kind: 'local_rollout';
  action_instance_id: string;
  issue_id: string;
  issue_identifier: string | null;
  summary: string;
  merge_closeout_recorded_at: string;
  merge_closeout_reason: string;
  shared_root_status: string | null;
  linear_transition_status: string | null;
  lifecycle_state: 'pending' | 'acknowledged';
  lifecycle_actor: string | null;
  lifecycle_reason: string | null;
  lifecycle_recorded_at: string | null;
}

export interface ProviderOperatorAutopilotResolvedActionRecord {
  kind: 'local_rollout';
  action_instance_id: string;
  issue_id: string;
  issue_identifier: string | null;
  summary: string;
  merge_closeout_recorded_at: string;
  merge_closeout_reason: string;
  shared_root_status: string | null;
  linear_transition_status: string | null;
  lifecycle_state: 'cleared' | 'dismissed';
  lifecycle_actor: string;
  lifecycle_reason: string;
  lifecycle_recorded_at: string;
}

export interface ProviderOperatorAutopilotResult {
  recorded_at: string;
  status: 'disabled' | 'noop' | 'acted' | 'failed';
  summary: string;
  error: string | null;
  actions: ProviderOperatorAutopilotActionRecord[];
  holds: ProviderOperatorAutopilotHoldRecord[];
  pending_actions: ProviderOperatorAutopilotPendingActionRecord[];
  resolved_actions?: ProviderOperatorAutopilotResolvedActionRecord[];
  lifecycle_records?: ProviderOperatorAutopilotLifecycleRecord[];
}

interface ProviderOperatorAutopilotDependencies {
  now?: () => string;
  transition_issue_state?: typeof transitionProviderLinearIssueState;
}

export function resolveProviderOperatorAutopilotAuditPath(runDir: string): string {
  return join(runDir, PROVIDER_OPERATOR_AUTOPILOT_AUDIT_FILENAME);
}

export function resolveProviderOperatorAutopilotConfig(
  value: unknown
): ProviderOperatorAutopilotConfig {
  const record = asRecord(value);
  const operatorAutopilot = asRecord(
    record?.operator_autopilot ?? record?.operatorAutopilot
  );
  const enabled = readBoolean(operatorAutopilot, 'enabled') ?? false;
  const backlogPromotion = asRecord(
    operatorAutopilot?.backlog_promotion ?? operatorAutopilot?.backlogPromotion
  );
  const reviewHandoffRework = asRecord(
    operatorAutopilot?.review_handoff_rework ?? operatorAutopilot?.reviewHandoffRework
  );
  const postMergeRollout = asRecord(
    operatorAutopilot?.post_merge_rollout ?? operatorAutopilot?.postMergeRollout
  );
  return {
    enabled,
    backlog_promotion: {
      enabled: readBoolean(backlogPromotion, 'enabled') ?? enabled,
      state_name:
        readNonEmptyString(backlogPromotion, 'state_name', 'stateName') ??
        DEFAULT_BACKLOG_STATE_NAME,
      target_state_name:
        readNonEmptyString(backlogPromotion, 'target_state_name', 'targetStateName') ??
        DEFAULT_READY_STATE_NAME
    },
    review_handoff_rework: {
      enabled: readBoolean(reviewHandoffRework, 'enabled') ?? enabled,
      target_state_name:
        readNonEmptyString(reviewHandoffRework, 'target_state_name', 'targetStateName') ??
        DEFAULT_REWORK_STATE_NAME,
      excluded_action_required_reasons:
        readStringArray(
          reviewHandoffRework,
          'excluded_action_required_reasons',
          'excludedActionRequiredReasons'
        ) ?? [...DEFAULT_REWORK_EXCLUDED_ACTION_REQUIRED_REASONS]
    },
    post_merge_rollout: {
      enabled: readBoolean(postMergeRollout, 'enabled') ?? enabled,
      summary:
        readNonEmptyString(postMergeRollout, 'summary') ??
        DEFAULT_PROVIDER_OPERATOR_AUTOPILOT_PENDING_SUMMARY
    }
  };
}

export async function appendProviderOperatorAutopilotAuditResult(
  auditPath: string,
  result: ProviderOperatorAutopilotResult
): Promise<void> {
  await mkdir(dirname(auditPath), { recursive: true });
  await appendFile(auditPath, `${JSON.stringify(result)}\n`, 'utf8');
}

export function areProviderOperatorAutopilotResultsMeaningfullyEqual(
  left: ProviderOperatorAutopilotResult | null | undefined,
  right: ProviderOperatorAutopilotResult | null | undefined
): boolean {
  return JSON.stringify(normalizeComparableResult(left)) === JSON.stringify(normalizeComparableResult(right));
}

export async function runProviderOperatorAutopilot(
  input: {
    tracked_issues: LiveLinearTrackedIssue[];
    claims: ProviderIntakeClaimRecord[];
    config: ProviderOperatorAutopilotConfig;
    source_setup?: DispatchPilotSourceSetup | null;
    env?: NodeJS.ProcessEnv;
    previous_result?: ProviderOperatorAutopilotResult | null;
    lifecycle_records?: ProviderOperatorAutopilotLifecycleRecord[];
  },
  deps: ProviderOperatorAutopilotDependencies = {}
): Promise<ProviderOperatorAutopilotResult> {
  const now = deps.now ?? isoTimestamp;
  const transitionIssueState = deps.transition_issue_state ?? transitionProviderLinearIssueState;
  const recordedAt = now();
  if (!input.config.enabled) {
    return {
      recorded_at: recordedAt,
      status: 'disabled',
      summary: 'Operator autopilot is disabled.',
      error: null,
      actions: [],
      holds: [],
      pending_actions: [],
      resolved_actions: [],
      lifecycle_records: []
    };
  }

  const sortedTrackedIssues = sortLiveLinearTrackedIssuesForDispatch(input.tracked_issues);
  const trackedIssuesById = new Map(sortedTrackedIssues.map((issue) => [issue.id, issue] as const));
  const orderByIssueId = new Map(sortedTrackedIssues.map((issue, index) => [issue.id, index] as const));
  const claimsByIssueId = new Map(
    input.claims.map((claim) => [claim.issue_id, claim] as const)
  );
  const actions: ProviderOperatorAutopilotActionRecord[] = [];
  const holds: ProviderOperatorAutopilotHoldRecord[] = [];
  const pendingActions = collectPendingActions({
    claims: input.claims,
    config: input.config
  });
  const lifecycleRecords = (input.lifecycle_records ?? []).map(
    cloneProviderOperatorAutopilotLifecycleRecord
  );

  const reviewHandoffOutcome = await maybeRunReviewHandoffRework({
    claims: input.claims,
    trackedIssuesById,
    orderByIssueId,
    config: input.config,
    recordedAt,
    sourceSetup: input.source_setup ?? null,
    env: input.env ?? process.env,
    transitionIssueState
  });
  if (reviewHandoffOutcome.failed) {
    const effectiveLocalRolloutActions = resolveEffectiveLocalRolloutActions({
      pendingActions,
      postMergeRolloutEnabled: input.config.post_merge_rollout.enabled,
      lifecycleRecords
    });
    return {
      recorded_at: recordedAt,
      status: 'failed',
      summary: reviewHandoffOutcome.summary,
      error: reviewHandoffOutcome.error,
      actions: [],
      holds,
      pending_actions: effectiveLocalRolloutActions.pending_actions,
      resolved_actions: effectiveLocalRolloutActions.resolved_actions,
      lifecycle_records: effectiveLocalRolloutActions.lifecycle_records
    };
  }
  if (reviewHandoffOutcome.action) {
    actions.push(reviewHandoffOutcome.action);
  }
  if (reviewHandoffOutcome.hold) {
    holds.push(reviewHandoffOutcome.hold);
  }

  if (actions.length === 0) {
    const backlogOutcome = await maybeRunBacklogPromotion({
      sortedTrackedIssues,
      claimsByIssueId,
      config: input.config,
      recordedAt,
      sourceSetup: input.source_setup ?? null,
      env: input.env ?? process.env,
      transitionIssueState
    });
    if (backlogOutcome.failed) {
      const effectiveLocalRolloutActions = resolveEffectiveLocalRolloutActions({
        pendingActions,
        postMergeRolloutEnabled: input.config.post_merge_rollout.enabled,
        lifecycleRecords
      });
      return {
        recorded_at: recordedAt,
        status: 'failed',
        summary: backlogOutcome.summary,
        error: backlogOutcome.error,
        actions,
        holds,
        pending_actions: effectiveLocalRolloutActions.pending_actions,
        resolved_actions: effectiveLocalRolloutActions.resolved_actions,
        lifecycle_records: effectiveLocalRolloutActions.lifecycle_records
      };
    }
    if (backlogOutcome.action) {
      actions.push(backlogOutcome.action);
    }
    if (backlogOutcome.hold) {
      holds.push(backlogOutcome.hold);
    }
  }

  const effectiveLocalRolloutActions = resolveEffectiveLocalRolloutActions({
    pendingActions,
    postMergeRolloutEnabled: input.config.post_merge_rollout.enabled,
    lifecycleRecords
  });
  const hasTransitionedAction = actions.some(
    (action) => action.transition.status === 'transitioned'
  );
  const status =
    hasTransitionedAction ||
    effectiveLocalRolloutActions.pending_actions.length > 0 ||
    effectiveLocalRolloutActions.resolved_actions.length > 0
      ? 'acted'
      : 'noop';
  return {
    recorded_at: recordedAt,
    status,
    summary: summarizeOperatorAutopilotResult({
      actions,
      holds,
      pendingActions: effectiveLocalRolloutActions.pending_actions,
      resolvedActions: effectiveLocalRolloutActions.resolved_actions
    }),
    error: null,
    actions,
    holds,
    pending_actions: effectiveLocalRolloutActions.pending_actions,
    resolved_actions: effectiveLocalRolloutActions.resolved_actions,
    lifecycle_records: effectiveLocalRolloutActions.lifecycle_records
  };
}

async function maybeRunBacklogPromotion(input: {
  sortedTrackedIssues: LiveLinearTrackedIssue[];
  claimsByIssueId: Map<string, ProviderIntakeClaimRecord>;
  config: ProviderOperatorAutopilotConfig;
  recordedAt: string;
  sourceSetup: DispatchPilotSourceSetup | null;
  env: NodeJS.ProcessEnv;
  transitionIssueState: typeof transitionProviderLinearIssueState;
}): Promise<{
  action: ProviderOperatorAutopilotActionRecord | null;
  hold: ProviderOperatorAutopilotHoldRecord | null;
  failed: boolean;
  summary: string;
  error: string | null;
}> {
  if (!input.config.backlog_promotion.enabled) {
    return { action: null, hold: null, failed: false, summary: '', error: null };
  }
  const backlogState = normalizeProviderLinearWorkflowState(input.config.backlog_promotion.state_name);
  const candidateIndex = input.sortedTrackedIssues.findIndex(
    (issue) => normalizeProviderLinearWorkflowState(issue.state) === backlogState
  );
  const candidate = candidateIndex >= 0 ? input.sortedTrackedIssues[candidateIndex] : null;
  if (!candidate) {
    return { action: null, hold: null, failed: false, summary: '', error: null };
  }
  const higherRankedBlockedQueueLane =
    candidateIndex > 0
      ? input.sortedTrackedIssues.slice(0, candidateIndex).find((issue) => {
          const workflowState = classifyProviderLinearWorkflowState(issue);
          return workflowState.isTodo && providerLinearTodoBlockedByNonTerminal(issue.blocked_by);
        }) ?? null
      : null;
  if (higherRankedBlockedQueueLane) {
    return {
      action: null,
      hold: {
        kind: 'backlog_promotion',
        issue_id: candidate.id,
        issue_identifier: candidate.identifier,
        reason: 'backlog_head_blocked_by_higher_ranked_lane',
        summary: `Backlog head ${candidate.identifier} remains parked because higher-ranked queue lane ${higherRankedBlockedQueueLane.identifier} is still blocked by non-terminal work: ${formatBlockedBy(higherRankedBlockedQueueLane.blocked_by)}.`,
        action_required_reasons: []
      },
      failed: false,
      summary: '',
      error: null
    };
  }
  const existingClaim = input.claimsByIssueId.get(candidate.id) ?? null;
  if (existingClaim && isBacklogPromotionBlockedByExistingClaimState(existingClaim.state)) {
    return {
      action: null,
      hold: {
        kind: 'backlog_promotion',
        issue_id: candidate.id,
        issue_identifier: candidate.identifier,
        reason: 'backlog_head_already_claimed',
        summary: `Backlog head ${candidate.identifier} remains parked because an intake claim is already present (${existingClaim.state}).`,
        action_required_reasons: []
      },
      failed: false,
      summary: '',
      error: null
    };
  }
  if (!isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(candidate)) {
    return {
      action: null,
      hold: {
        kind: 'backlog_promotion',
        issue_id: candidate.id,
        issue_identifier: candidate.identifier,
        reason: 'backlog_head_owned_by_other_operator',
        summary: `Backlog head ${candidate.identifier} remains parked because it is assigned to another operator.`,
        action_required_reasons: []
      },
      failed: false,
      summary: '',
      error: null
    };
  }
  if (providerLinearTodoBlockedByNonTerminal(candidate.blocked_by)) {
    return {
      action: null,
      hold: {
        kind: 'backlog_promotion',
        issue_id: candidate.id,
        issue_identifier: candidate.identifier,
        reason: 'backlog_head_blocked_by_non_terminal',
        summary: `Backlog head ${candidate.identifier} remains parked because it is blocked by non-terminal work: ${formatBlockedBy(candidate.blocked_by)}.`,
        action_required_reasons: []
      },
      failed: false,
      summary: '',
      error: null
    };
  }

  const transition = await input.transitionIssueState({
    issueId: candidate.id,
    stateName: input.config.backlog_promotion.target_state_name,
    sourceSetup: input.sourceSetup,
    env: input.env
  });
  const transitionRecord = mapTransitionRecord({
    transition,
    attemptedAt: input.recordedAt,
    previousState: candidate.state,
    previousStateType: candidate.state_type,
    previousUpdatedAt: candidate.updated_at,
    targetStateName: input.config.backlog_promotion.target_state_name
  });
  if (!transition.ok) {
    return {
      action: null,
      hold: null,
      failed: true,
      summary: `Backlog head ${candidate.identifier} could not transition to ${input.config.backlog_promotion.target_state_name}.`,
      error: transitionRecord.error
    };
  }
  if (transition.action === 'noop') {
    return {
      action: {
        kind: 'backlog_promotion',
        issue_id: candidate.id,
        issue_identifier: candidate.identifier,
        reason: 'backlog_head_already_promoted',
        summary: `Backlog head ${candidate.identifier} already reflected ${input.config.backlog_promotion.target_state_name} when autopilot evaluated it.`,
        transition: transitionRecord,
        action_required_reasons: []
      },
      hold: null,
      failed: false,
      summary: '',
      error: null
    };
  }
  return {
    action: {
      kind: 'backlog_promotion',
      issue_id: candidate.id,
      issue_identifier: candidate.identifier,
      reason: 'backlog_head_promoted',
      summary: `Promoted backlog head ${candidate.identifier} to ${input.config.backlog_promotion.target_state_name}.`,
      transition: transitionRecord,
      action_required_reasons: []
    },
    hold: null,
    failed: false,
    summary: '',
    error: null
  };
}

async function maybeRunReviewHandoffRework(input: {
  claims: ProviderIntakeClaimRecord[];
  trackedIssuesById: Map<string, LiveLinearTrackedIssue>;
  orderByIssueId: Map<string, number>;
  config: ProviderOperatorAutopilotConfig;
  recordedAt: string;
  sourceSetup: DispatchPilotSourceSetup | null;
  env: NodeJS.ProcessEnv;
  transitionIssueState: typeof transitionProviderLinearIssueState;
}): Promise<{
  action: ProviderOperatorAutopilotActionRecord | null;
  hold: ProviderOperatorAutopilotHoldRecord | null;
  failed: boolean;
  summary: string;
  error: string | null;
}> {
  if (!input.config.review_handoff_rework.enabled) {
    return { action: null, hold: null, failed: false, summary: '', error: null };
  }
  const candidates = input.claims
    .flatMap((claim) => {
      const trackedIssue = input.trackedIssuesById.get(claim.issue_id) ?? null;
      if (!trackedIssue || !classifyProviderLinearWorkflowState(trackedIssue).isHandoff) {
        return [];
      }
      if (!isReviewHandoffReworkClaimEligible({ claim, trackedIssue })) {
        return [];
      }
      const reviewPromotion = claim.review_promotion ?? null;
      if (reviewPromotion?.status !== 'action_required') {
        return [];
      }
      const actionRequiredReasons = resolveReviewHandoffActionRequiredReasons(reviewPromotion);
      const authorActionReasons = actionRequiredReasons.filter((reason) =>
        isAuthorActionRequiredReason(
          reason,
          input.config.review_handoff_rework.excluded_action_required_reasons
        )
      );
      return [{
        claim,
        trackedIssue,
        sortOrder: input.orderByIssueId.get(claim.issue_id) ?? Number.MAX_SAFE_INTEGER,
        actionRequiredReasons,
        authorActionReasons
      }];
    })
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      const leftKey = left.trackedIssue.identifier ?? left.claim.issue_id;
      const rightKey = right.trackedIssue.identifier ?? right.claim.issue_id;
      return leftKey.localeCompare(rightKey);
    });
  const parkedCandidate = candidates[0] ?? null;
  if (!parkedCandidate) {
    return { action: null, hold: null, failed: false, summary: '', error: null };
  }
  const candidate =
    candidates.find((candidateEntry) => candidateEntry.authorActionReasons.length > 0) ??
    parkedCandidate;
  const actionRequiredReasons = [...candidate.actionRequiredReasons];
  const authorActionReasons = [...candidate.authorActionReasons];
  if (authorActionReasons.length === 0) {
    return {
      action: null,
      hold: {
        kind: 'review_handoff_rework',
        issue_id: candidate.trackedIssue.id,
        issue_identifier: candidate.trackedIssue.identifier,
        reason: 'review_handoff_non_author_action_required',
        summary: `Review handoff ${candidate.trackedIssue.identifier} remains parked because the current blockers are not author-action-required: ${formatReasonList(actionRequiredReasons)}.`,
        action_required_reasons: [...actionRequiredReasons]
      },
      failed: false,
      summary: '',
      error: null
    };
  }

  const transition = await input.transitionIssueState({
    issueId: candidate.trackedIssue.id,
    stateName: input.config.review_handoff_rework.target_state_name,
    sourceSetup: input.sourceSetup,
    env: input.env
  });
  const transitionRecord = mapTransitionRecord({
    transition,
    attemptedAt: input.recordedAt,
    previousState: candidate.trackedIssue.state,
    previousStateType: candidate.trackedIssue.state_type,
    previousUpdatedAt: candidate.trackedIssue.updated_at,
    targetStateName: input.config.review_handoff_rework.target_state_name
  });
  if (!transition.ok) {
    return {
      action: null,
      hold: null,
      failed: true,
      summary: `Review handoff ${candidate.trackedIssue.identifier} could not transition to ${input.config.review_handoff_rework.target_state_name}.`,
      error: transitionRecord.error
    };
  }
  if (transition.action === 'noop') {
    return {
      action: {
        kind: 'review_handoff_rework',
        issue_id: candidate.trackedIssue.id,
        issue_identifier: candidate.trackedIssue.identifier,
        reason: 'author_action_required_rework_already_applied',
        summary: `Review handoff ${candidate.trackedIssue.identifier} already reflected ${input.config.review_handoff_rework.target_state_name} when autopilot evaluated author-action-required blockers: ${authorActionReasons.join(', ')}.`,
        transition: transitionRecord,
        action_required_reasons: [...authorActionReasons]
      },
      hold: null,
      failed: false,
      summary: '',
      error: null
    };
  }
  return {
    action: {
      kind: 'review_handoff_rework',
      issue_id: candidate.trackedIssue.id,
      issue_identifier: candidate.trackedIssue.identifier,
      reason: 'author_action_required_rework',
      summary: `Moved review handoff ${candidate.trackedIssue.identifier} to ${input.config.review_handoff_rework.target_state_name} because author action is required: ${authorActionReasons.join(', ')}.`,
      transition: transitionRecord,
      action_required_reasons: [...authorActionReasons]
    },
    hold: null,
    failed: false,
    summary: '',
    error: null
  };
}

function isReviewHandoffReworkClaimEligible(input: {
  claim: Pick<ProviderIntakeClaimRecord, 'state'>;
  trackedIssue: Pick<LiveLinearTrackedIssue, 'viewer_id' | 'assignee_id'>;
}): boolean {
  return (
    REVIEW_HANDOFF_REWORK_ELIGIBLE_CLAIM_STATES.has(input.claim.state) &&
    isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(input.trackedIssue)
  );
}

function collectPendingActions(input: {
  claims: ProviderIntakeClaimRecord[];
  config: ProviderOperatorAutopilotConfig;
}): ProviderOperatorAutopilotPendingActionRecord[] {
  if (!input.config.post_merge_rollout.enabled) {
    return [];
  }
  const pendingByIssueId = new Map<string, ProviderOperatorAutopilotPendingActionRecord>();
  for (const claim of input.claims) {
    const mergeCloseout = claim.merge_closeout ?? null;
    if (!mergeCloseout || mergeCloseout.status !== 'merged') {
      continue;
    }
    const nextAction = buildLocalRolloutPendingAction({
      claim,
      summary: input.config.post_merge_rollout.summary
    });
    const existingAction = pendingByIssueId.get(claim.issue_id) ?? null;
    if (
      existingAction &&
      compareNullableIsoTimestamp(
        existingAction.merge_closeout_recorded_at,
        nextAction.merge_closeout_recorded_at
      ) >= 0
    ) {
      continue;
    }
    pendingByIssueId.set(claim.issue_id, nextAction);
  }
  return [...pendingByIssueId.values()].sort((left, right) =>
    (left.issue_identifier ?? left.issue_id).localeCompare(right.issue_identifier ?? right.issue_id)
  );
}

function buildLocalRolloutPendingAction(input: {
  claim: ProviderIntakeClaimRecord;
  summary: string;
}): ProviderOperatorAutopilotPendingActionRecord {
  const mergeCloseout = input.claim.merge_closeout;
  if (!mergeCloseout || mergeCloseout.status !== 'merged') {
    throw new Error('Cannot build local rollout pending action without merged closeout truth.');
  }
  const issueIdentifier = input.claim.issue_identifier ?? mergeCloseout.issue_identifier ?? null;
  return {
    kind: 'local_rollout',
    action_instance_id: buildLocalRolloutActionInstanceId({
      claim: input.claim,
      mergeCloseout
    }),
    issue_id: input.claim.issue_id,
    issue_identifier: issueIdentifier,
    summary: `${input.summary} Merge closeout reason=${mergeCloseout.reason}; shared_root=${mergeCloseout.shared_root?.status ?? 'unknown'}; linear_transition=${mergeCloseout.linear_transition?.status ?? 'unknown'}.`,
    merge_closeout_recorded_at: mergeCloseout.recorded_at,
    merge_closeout_reason: mergeCloseout.reason,
    shared_root_status: mergeCloseout.shared_root?.status ?? null,
    linear_transition_status: mergeCloseout.linear_transition?.status ?? null,
    lifecycle_state: 'pending',
    lifecycle_actor: null,
    lifecycle_reason: null,
    lifecycle_recorded_at: null
  };
}

function buildLocalRolloutActionInstanceId(input: {
  claim: ProviderIntakeClaimRecord;
  mergeCloseout: NonNullable<ProviderIntakeClaimRecord['merge_closeout']>;
}): string {
  const identity = {
    kind: 'local_rollout',
    issue_id: input.claim.issue_id,
    pr_url: input.mergeCloseout.pr?.url ?? null,
    pr_number: input.mergeCloseout.pr?.number ?? null,
    snapshot_merged_at: input.mergeCloseout.snapshot?.merged_at ?? null,
    snapshot_head_oid: input.mergeCloseout.snapshot?.head_oid ?? null
  };
  const digest = createHash('sha256')
    .update(JSON.stringify(identity))
    .digest('hex')
    .slice(0, 24);
  return `local_rollout:${digest}`;
}

function groupLifecycleRecordsByActionInstanceId(
  records: ProviderOperatorAutopilotLifecycleRecord[]
): Map<string, ProviderOperatorAutopilotLifecycleRecord[]> {
  const grouped = new Map<string, ProviderOperatorAutopilotLifecycleRecord[]>();
  for (const record of records) {
    const current = grouped.get(record.action_instance_id) ?? [];
    current.push(cloneProviderOperatorAutopilotLifecycleRecord(record));
    grouped.set(record.action_instance_id, current);
  }
  for (const [actionInstanceId, actionRecords] of grouped) {
    grouped.set(
      actionInstanceId,
      actionRecords.sort((left, right) =>
        compareNullableIsoTimestamp(left.recorded_at, right.recorded_at)
      )
    );
  }
  return grouped;
}

function compareNullableIsoTimestamp(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }
  if (!left) {
    return -1;
  }
  if (!right) {
    return 1;
  }
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return left.localeCompare(right);
}

export function resolveEffectiveLocalRolloutActions(input: {
  pendingActions: ProviderOperatorAutopilotPendingActionRecord[];
  postMergeRolloutEnabled: boolean;
  lifecycleRecords: ProviderOperatorAutopilotLifecycleRecord[];
}): {
  pending_actions: ProviderOperatorAutopilotPendingActionRecord[];
  resolved_actions: ProviderOperatorAutopilotResolvedActionRecord[];
  lifecycle_records: ProviderOperatorAutopilotLifecycleRecord[];
} {
  if (!input.postMergeRolloutEnabled) {
    return { pending_actions: [], resolved_actions: [], lifecycle_records: [] };
  }
  const recordsByActionInstanceId = groupLifecycleRecordsByActionInstanceId(
    input.lifecycleRecords
  );
  const pendingActionInstanceIds = new Set(
    input.pendingActions.map((action) => action.action_instance_id)
  );
  const pendingActions: ProviderOperatorAutopilotPendingActionRecord[] = [];
  const resolvedActions: ProviderOperatorAutopilotResolvedActionRecord[] = [];
  for (const action of input.pendingActions) {
    const lifecycleRecords =
      recordsByActionInstanceId.get(action.action_instance_id)?.map(
        cloneProviderOperatorAutopilotLifecycleRecord
      ) ?? [];
    const latestTerminalRecord =
      lifecycleRecords.filter(isTerminalLifecycleRecord).at(-1) ?? null;
    if (latestTerminalRecord) {
      resolvedActions.push({
        ...clonePendingActionRecord(action),
        lifecycle_state: latestTerminalRecord.state,
        lifecycle_actor: latestTerminalRecord.actor,
        lifecycle_reason: latestTerminalRecord.reason,
        lifecycle_recorded_at: latestTerminalRecord.recorded_at
      });
      continue;
    }
    const latestRecord = lifecycleRecords.at(-1) ?? null;
    if (latestRecord?.state === 'acknowledged') {
      pendingActions.push({
        ...clonePendingActionRecord(action),
        lifecycle_state: 'acknowledged',
        lifecycle_actor: latestRecord.actor,
        lifecycle_reason: latestRecord.reason,
        lifecycle_recorded_at: latestRecord.recorded_at
      });
      continue;
    }
    pendingActions.push(clonePendingActionRecord(action));
  }
  const matchedLifecycleRecords = input.lifecycleRecords
    .filter((record) => pendingActionInstanceIds.has(record.action_instance_id))
    .map(cloneProviderOperatorAutopilotLifecycleRecord);
  return {
    pending_actions: pendingActions,
    resolved_actions: resolvedActions,
    lifecycle_records: matchedLifecycleRecords
  };
}

type TerminalProviderOperatorAutopilotLifecycleRecord =
  ProviderOperatorAutopilotLifecycleRecord & {
    state: 'cleared' | 'dismissed';
  };

function isTerminalLifecycleRecord(
  record: ProviderOperatorAutopilotLifecycleRecord
): record is TerminalProviderOperatorAutopilotLifecycleRecord {
  return record.state === 'cleared' || record.state === 'dismissed';
}

function summarizeOperatorAutopilotResult(input: {
  actions: ProviderOperatorAutopilotActionRecord[];
  holds: ProviderOperatorAutopilotHoldRecord[];
  pendingActions: ProviderOperatorAutopilotPendingActionRecord[];
  resolvedActions: ProviderOperatorAutopilotResolvedActionRecord[];
}): string {
  const parts: string[] = [];
  if (input.actions.length > 0) {
    parts.push(input.actions.map((action) => action.summary).join(' '));
  }
  if (input.holds.length > 0) {
    parts.push(input.holds.map((hold) => hold.summary).join(' '));
  }
  if (input.pendingActions.length > 0) {
    const acknowledgedCount = input.pendingActions.filter(
      (pendingAction) => pendingAction.lifecycle_state === 'acknowledged'
    ).length;
    parts.push(
      input.pendingActions.length === 1
        ? `Surfaced 1 ${acknowledgedCount === 1 ? 'acknowledged ' : ''}pending local rollout action (${input.pendingActions[0]!.issue_identifier ?? input.pendingActions[0]!.issue_id}).`
        : `Surfaced ${input.pendingActions.length} pending local rollout actions.`
    );
  }
  if (input.resolvedActions.length > 0) {
    parts.push(
      input.resolvedActions.length === 1
        ? `Suppressed 1 ${input.resolvedActions[0]!.lifecycle_state} local rollout action (${input.resolvedActions[0]!.issue_identifier ?? input.resolvedActions[0]!.issue_id}).`
        : `Suppressed ${input.resolvedActions.length} cleared or dismissed local rollout actions.`
    );
  }
  if (parts.length === 0) {
    return 'Operator autopilot evaluated the current queue and found no bounded action to take.';
  }
  return parts.join(' ');
}

function mapTransitionRecord(input: {
  transition: ProviderLinearTransitionResult;
  attemptedAt: string;
  previousState: string | null;
  previousStateType: string | null;
  previousUpdatedAt: string | null;
  targetStateName: string;
}): ProviderOperatorAutopilotLinearTransitionRecord {
  if (!input.transition.ok) {
    return {
      status: 'failed',
      attempted_at: input.attemptedAt,
      previous_state: input.previousState,
      target_state: input.targetStateName,
      issue_state: input.previousState,
      issue_state_type: input.previousStateType,
      issue_updated_at: input.previousUpdatedAt,
      error: `${input.transition.error.code}: ${input.transition.error.message}`
    };
  }
  return {
    status: input.transition.action === 'noop' ? 'noop' : 'transitioned',
    attempted_at: input.attemptedAt,
    previous_state: input.transition.previous_state?.name ?? input.previousState,
    target_state: input.transition.target_state.name,
    issue_state: input.transition.issue.state?.name ?? input.previousState,
    issue_state_type: input.transition.issue.state?.type ?? input.previousStateType,
    issue_updated_at: input.transition.issue.updated_at ?? input.previousUpdatedAt,
    error: null
  };
}

function isAuthorActionRequiredReason(reason: string, excludedReasons: string[]): boolean {
  if (excludedReasons.includes(reason)) {
    return false;
  }
  return (
    reason === 'pr_closed_unmerged' ||
    reason.startsWith('review=') ||
    reason.startsWith('merge_state=') ||
    reason.startsWith('unresolved_threads=') ||
    reason.startsWith('unacknowledged_bot_feedback=') ||
    reason.startsWith('required_checks_failed=') ||
    reason.startsWith('checks_failed=')
  );
}

function resolveReviewHandoffActionRequiredReasons(
  reviewPromotion: ProviderIntakeClaimRecord['review_promotion']
): string[] {
  const snapshotReasons = reviewPromotion?.snapshot?.action_required_reasons ?? [];
  if (snapshotReasons.length > 0) {
    return [...snapshotReasons];
  }
  const fallbackReason = normalizeOptionalString(reviewPromotion?.reason);
  return fallbackReason ? [fallbackReason] : [];
}

function normalizeComparableResult(
  result: ProviderOperatorAutopilotResult | null | undefined
): Record<string, unknown> | null {
  if (!result) {
    return null;
  }
  return {
    status: result.status,
    summary: result.summary,
    error: result.error,
    actions: result.actions,
    holds: result.holds,
    pending_actions: result.pending_actions,
    resolved_actions: result.resolved_actions ?? [],
    lifecycle_records: result.lifecycle_records ?? []
  };
}

function clonePendingActionRecord(
  record: ProviderOperatorAutopilotPendingActionRecord
): ProviderOperatorAutopilotPendingActionRecord {
  return {
    kind: record.kind,
    action_instance_id: record.action_instance_id,
    issue_id: record.issue_id,
    issue_identifier: record.issue_identifier,
    summary: record.summary,
    merge_closeout_recorded_at: record.merge_closeout_recorded_at,
    merge_closeout_reason: record.merge_closeout_reason,
    shared_root_status: record.shared_root_status,
    linear_transition_status: record.linear_transition_status,
    lifecycle_state: record.lifecycle_state,
    lifecycle_actor: record.lifecycle_actor,
    lifecycle_reason: record.lifecycle_reason,
    lifecycle_recorded_at: record.lifecycle_recorded_at
  };
}

function formatBlockedBy(
  blockedBy: LiveLinearTrackedIssue['blocked_by'] | null | undefined
): string {
  const blockers = (blockedBy ?? []).map((blocker) => {
    const identifier = normalizeOptionalString(blocker.identifier) ?? 'unknown';
    const state = normalizeOptionalString(blocker.state) ?? blocker.state_type ?? 'unknown';
    return `${identifier}:${state}`;
  });
  return blockers.length > 0 ? blockers.join(', ') : 'unknown blockers';
}

function formatReasonList(reasons: string[]): string {
  return reasons.length > 0 ? reasons.join(', ') : 'unclassified action_required';
}

function isBacklogPromotionBlockedByExistingClaimState(state: string | null | undefined): boolean {
  return typeof state === 'string' && BACKLOG_PROMOTION_BLOCKING_CLAIM_STATES.has(state);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readBoolean(
  record: Record<string, unknown> | null,
  ...keys: string[]
): boolean | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return null;
}

function readNonEmptyString(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function readStringArray(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string[] | null {
  for (const key of keys) {
    const value = record?.[key];
    if (!Array.isArray(value)) {
      continue;
    }
    const normalized = value
      .flatMap((item) => (typeof item === 'string' ? [item.trim()] : []))
      .filter((item) => item.length > 0);
    return normalized;
  }
  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
