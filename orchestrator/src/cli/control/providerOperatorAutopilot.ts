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
  issue_id: string;
  issue_identifier: string | null;
  summary: string;
  merge_closeout_reason: string;
  shared_root_status: string | null;
  linear_transition_status: string | null;
}

export interface ProviderOperatorAutopilotResult {
  recorded_at: string;
  status: 'disabled' | 'noop' | 'acted' | 'failed';
  summary: string;
  error: string | null;
  actions: ProviderOperatorAutopilotActionRecord[];
  holds: ProviderOperatorAutopilotHoldRecord[];
  pending_actions: ProviderOperatorAutopilotPendingActionRecord[];
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
      pending_actions: []
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
    return {
      recorded_at: recordedAt,
      status: 'failed',
      summary: reviewHandoffOutcome.summary,
      error: reviewHandoffOutcome.error,
      actions: [],
      holds,
      pending_actions: resolveEffectivePendingActions(pendingActions, input.previous_result)
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
      return {
        recorded_at: recordedAt,
        status: 'failed',
        summary: backlogOutcome.summary,
        error: backlogOutcome.error,
        actions,
        holds,
        pending_actions: resolveEffectivePendingActions(pendingActions, input.previous_result)
      };
    }
    if (backlogOutcome.action) {
      actions.push(backlogOutcome.action);
    }
    if (backlogOutcome.hold) {
      holds.push(backlogOutcome.hold);
    }
  }

  const effectivePendingActions = resolveEffectivePendingActions(
    pendingActions,
    input.previous_result
  );
  const status =
    actions.length > 0 || effectivePendingActions.length > 0 ? 'acted' : 'noop';
  return {
    recorded_at: recordedAt,
    status,
    summary: summarizeOperatorAutopilotResult({
      actions,
      holds,
      pendingActions: effectivePendingActions
    }),
    error: null,
    actions,
    holds,
    pending_actions: effectivePendingActions
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
  const candidate = input.sortedTrackedIssues.find(
    (issue) => normalizeProviderLinearWorkflowState(issue.state) === backlogState
  );
  if (!candidate) {
    return { action: null, hold: null, failed: false, summary: '', error: null };
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
  return {
    action: {
      kind: 'backlog_promotion',
      issue_id: candidate.id,
      issue_identifier: candidate.identifier,
      reason: 'backlog_head_promoted',
      summary:
        transition.action === 'noop'
          ? `Backlog head ${candidate.identifier} was already ${input.config.backlog_promotion.target_state_name}.`
          : `Promoted backlog head ${candidate.identifier} to ${input.config.backlog_promotion.target_state_name}.`,
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
      const reviewPromotion = claim.review_promotion ?? null;
      if (reviewPromotion?.status !== 'action_required') {
        return [];
      }
      return [{
        claim,
        trackedIssue,
        sortOrder: input.orderByIssueId.get(claim.issue_id) ?? Number.MAX_SAFE_INTEGER
      }];
    })
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.claim.issue_identifier.localeCompare(right.claim.issue_identifier);
    });
  const candidate = candidates[0] ?? null;
  if (!candidate) {
    return { action: null, hold: null, failed: false, summary: '', error: null };
  }
  const snapshotReasons =
    candidate.claim.review_promotion?.snapshot?.action_required_reasons ?? [];
  const authorActionReasons = snapshotReasons.filter((reason) =>
    isAuthorActionRequiredReason(reason, input.config.review_handoff_rework.excluded_action_required_reasons)
  );
  if (authorActionReasons.length === 0) {
    return {
      action: null,
      hold: {
        kind: 'review_handoff_rework',
        issue_id: candidate.trackedIssue.id,
        issue_identifier: candidate.trackedIssue.identifier,
        reason: 'review_handoff_non_author_action_required',
        summary: `Review handoff ${candidate.trackedIssue.identifier} remains parked because the current blockers are not author-action-required: ${formatReasonList(snapshotReasons)}.`,
        action_required_reasons: [...snapshotReasons]
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
  return {
    action: {
      kind: 'review_handoff_rework',
      issue_id: candidate.trackedIssue.id,
      issue_identifier: candidate.trackedIssue.identifier,
      reason: 'author_action_required_rework',
      summary:
        transition.action === 'noop'
          ? `Review handoff ${candidate.trackedIssue.identifier} was already ${input.config.review_handoff_rework.target_state_name}.`
          : `Moved review handoff ${candidate.trackedIssue.identifier} to ${input.config.review_handoff_rework.target_state_name} because author action is required: ${authorActionReasons.join(', ')}.`,
      transition: transitionRecord,
      action_required_reasons: [...authorActionReasons]
    },
    hold: null,
    failed: false,
    summary: '',
    error: null
  };
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
    if (pendingByIssueId.has(claim.issue_id)) {
      continue;
    }
    pendingByIssueId.set(claim.issue_id, {
      kind: 'local_rollout',
      issue_id: claim.issue_id,
      issue_identifier: claim.issue_identifier ?? mergeCloseout.issue_identifier ?? null,
      summary: `${input.config.post_merge_rollout.summary} Merge closeout reason=${mergeCloseout.reason}; shared_root=${mergeCloseout.shared_root?.status ?? 'unknown'}; linear_transition=${mergeCloseout.linear_transition?.status ?? 'unknown'}.`,
      merge_closeout_reason: mergeCloseout.reason,
      shared_root_status: mergeCloseout.shared_root?.status ?? null,
      linear_transition_status: mergeCloseout.linear_transition?.status ?? null
    });
  }
  return [...pendingByIssueId.values()].sort((left, right) =>
    (left.issue_identifier ?? left.issue_id).localeCompare(right.issue_identifier ?? right.issue_id)
  );
}

function resolveEffectivePendingActions(
  pendingActions: ProviderOperatorAutopilotPendingActionRecord[],
  previousResult: ProviderOperatorAutopilotResult | null | undefined
): ProviderOperatorAutopilotPendingActionRecord[] {
  if (pendingActions.length > 0) {
    return pendingActions.map(clonePendingActionRecord);
  }
  return (previousResult?.pending_actions ?? []).map(clonePendingActionRecord);
}

function summarizeOperatorAutopilotResult(input: {
  actions: ProviderOperatorAutopilotActionRecord[];
  holds: ProviderOperatorAutopilotHoldRecord[];
  pendingActions: ProviderOperatorAutopilotPendingActionRecord[];
}): string {
  const parts: string[] = [];
  if (input.actions.length > 0) {
    parts.push(input.actions.map((action) => action.summary).join(' '));
  }
  if (input.holds.length > 0) {
    parts.push(input.holds.map((hold) => hold.summary).join(' '));
  }
  if (input.pendingActions.length > 0) {
    parts.push(
      input.pendingActions.length === 1
        ? `Surfaced 1 pending local rollout action (${input.pendingActions[0]!.issue_identifier ?? input.pendingActions[0]!.issue_id}).`
        : `Surfaced ${input.pendingActions.length} pending local rollout actions.`
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
    reason.startsWith('review=') ||
    reason.startsWith('merge_state=') ||
    reason.startsWith('unresolved_threads=') ||
    reason.startsWith('unacknowledged_bot_feedback=') ||
    reason.startsWith('required_checks_failed=') ||
    reason.startsWith('checks_failed=')
  );
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
    pending_actions: result.pending_actions
  };
}

function clonePendingActionRecord(
  record: ProviderOperatorAutopilotPendingActionRecord
): ProviderOperatorAutopilotPendingActionRecord {
  return {
    kind: record.kind,
    issue_id: record.issue_id,
    issue_identifier: record.issue_identifier,
    summary: record.summary,
    merge_closeout_reason: record.merge_closeout_reason,
    shared_root_status: record.shared_root_status,
    linear_transition_status: record.linear_transition_status
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
