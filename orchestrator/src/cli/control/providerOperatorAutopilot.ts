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
  isProviderLinearTrackedIssueMutable,
  normalizeProviderLinearWorkflowState,
  providerLinearTodoBlockedByNonTerminal
} from './providerLinearWorkflowStates.js';
import type { ProviderIntakeClaimRecord } from './providerIntakeState.js';
import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';
import {
  cloneProviderOperatorAutopilotLifecycleRecord,
  type ProviderOperatorAutopilotLifecycleRecord
} from './providerOperatorAutopilotLifecycle.js';
import {
  cloneLocalRolloutExecutionAttempt,
  executeProviderOperatorAutopilotLocalRolloutActions,
  resolveEnabledLocalRolloutExecutionActionIds,
  resolveProviderOperatorAutopilotLocalRolloutExecutionConfig,
  type ProviderOperatorAutopilotLocalRolloutCommandRunner,
  type ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord,
  type ProviderOperatorAutopilotLocalRolloutExecutionConfig
} from './providerOperatorAutopilotLocalRolloutExecution.js';

export const PROVIDER_OPERATOR_AUTOPILOT_AUDIT_FILENAME = 'provider-operator-autopilot.jsonl';
export const DEFAULT_PROVIDER_OPERATOR_AUTOPILOT_PENDING_SUMMARY =
  'Merge closeout completed; local rollout follow-up may still be required.';
const DEFAULT_BACKLOG_STATE_NAME = 'Backlog';
const DEFAULT_READY_STATE_NAME = 'Ready';
const DEFAULT_REWORK_STATE_NAME = 'Rework';
const BLOCKED_STATE_NAME = 'blocked';
const CANONICAL_OWNER_MARKER_PREFIX = 'codex-orchestrator:canonical-owner-key=';
const SUPERSEDED_CANONICAL_OWNER_MARKER_PREFIX =
  'codex-orchestrator:superseded-canonical-owner-key=';
const DEFAULT_BACKLOG_PROMOTION_SNAPSHOT_MAX_UNTRACKED_CYCLES = 3;
const DEFAULT_BACKLOG_PROMOTION_SNAPSHOT_TERMINAL_STATE_TYPES = [
  'completed',
  'canceled'
] as const;
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
    snapshot_retention: {
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
    execution: ProviderOperatorAutopilotLocalRolloutExecutionConfig;
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
  force_path_used?: boolean;
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

export interface ProviderOperatorAutopilotTerminalBlockerAdvisoryBlocker {
  id: string | null;
  identifier: string | null;
  state: string | null;
  state_type: string | null;
}

export interface ProviderOperatorAutopilotTerminalBlockerAdvisoryRecord {
  kind: 'terminal_blocker_cleanup';
  issue_id: string;
  issue_identifier: string | null;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  blockers: ProviderOperatorAutopilotTerminalBlockerAdvisoryBlocker[];
  canonical_owner_hints: string[];
  duplicate_hints: string[];
  recommended_action: 'duplicate_cleanup' | 'ready_to_unblock';
  summary: string;
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
  executable_action_ids?: string[];
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
  executable_action_ids?: string[];
  lifecycle_state: 'cleared' | 'dismissed';
  lifecycle_actor: string;
  lifecycle_reason: string;
  lifecycle_recorded_at: string;
}

export interface ProviderOperatorAutopilotBacklogPromotionSnapshot {
  issue_id: string;
  issue_identifier: string | null;
  target_state: string;
  attempted_at: string;
  issue_updated_at: string | null;
  force_path_used: boolean;
  untracked_cycles?: number;
}

export type ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionDecision =
  | 'retained'
  | 'pruned';

export type ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionReason =
  | 'temporarily_untracked'
  | 'stale_untracked_cycle_limit'
  | 'terminal_state'
  | 'tracked_archived_or_trashed'
  | 'tracked_non_backlog_non_target_state'
  | 'tracked_state_reset_untracked_cycles';

export interface ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionRecord {
  issue_id: string;
  issue_identifier: string | null;
  target_state: string;
  attempted_at: string;
  issue_updated_at: string | null;
  evaluated_at: string;
  decision: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionDecision;
  reason: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionReason;
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

export interface ProviderOperatorAutopilotResult {
  recorded_at: string;
  status: 'disabled' | 'noop' | 'acted' | 'failed';
  summary: string;
  error: string | null;
  actions: ProviderOperatorAutopilotActionRecord[];
  holds: ProviderOperatorAutopilotHoldRecord[];
  pending_actions: ProviderOperatorAutopilotPendingActionRecord[];
  terminal_blocker_advisories: ProviderOperatorAutopilotTerminalBlockerAdvisoryRecord[];
  resolved_actions?: ProviderOperatorAutopilotResolvedActionRecord[];
  lifecycle_records?: ProviderOperatorAutopilotLifecycleRecord[];
  local_rollout_execution_attempts?: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[];
  backlog_promotion_snapshots?: ProviderOperatorAutopilotBacklogPromotionSnapshot[];
  backlog_promotion_snapshot_retention_records?: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionRecord[];
}

interface ProviderOperatorAutopilotDependencies {
  now?: () => string;
  transition_issue_state?: typeof transitionProviderLinearIssueState;
  run_local_rollout_command?: ProviderOperatorAutopilotLocalRolloutCommandRunner;
  append_local_rollout_execution_attempt?: (
    record: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
  ) => Promise<void>;
  append_local_rollout_lifecycle_record?: (
    record: ProviderOperatorAutopilotLifecycleRecord
  ) => Promise<void>;
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
  const snapshotRetention = asRecord(
    backlogPromotion?.snapshot_retention ?? backlogPromotion?.snapshotRetention
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
        DEFAULT_READY_STATE_NAME,
      snapshot_retention: {
        // Keep at least one missing-page cycle before pruning so CO-216 manual
        // demotion suppression cannot be erased by a single temporary omission.
        max_untracked_cycles: Math.max(
          2,
          readPositiveInteger(
            snapshotRetention,
            'max_untracked_cycles',
            'maxUntrackedCycles'
          ) ?? DEFAULT_BACKLOG_PROMOTION_SNAPSHOT_MAX_UNTRACKED_CYCLES
        ),
        terminal_state_types: normalizeStringArray(
          readStringArray(
            snapshotRetention,
            'terminal_state_types',
            'terminalStateTypes'
          ) ?? [...DEFAULT_BACKLOG_PROMOTION_SNAPSHOT_TERMINAL_STATE_TYPES]
        )
      }
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
        DEFAULT_PROVIDER_OPERATOR_AUTOPILOT_PENDING_SUMMARY,
      execution: resolveProviderOperatorAutopilotLocalRolloutExecutionConfig(postMergeRollout)
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
    local_rollout_execution_attempts?: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[];
    repo_root?: string;
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
      terminal_blocker_advisories: [],
      resolved_actions: [],
      lifecycle_records: [],
      local_rollout_execution_attempts: [],
      backlog_promotion_snapshots: [],
      backlog_promotion_snapshot_retention_records: []
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
  const terminalBlockerAdvisories = collectTerminalBlockerAdvisories(sortedTrackedIssues);
  const pendingActions = collectPendingActions({
    claims: input.claims,
    config: input.config
  });
  const lifecycleRecords = (input.lifecycle_records ?? []).map(
    cloneProviderOperatorAutopilotLifecycleRecord
  );
  const resolveBacklogPromotionSnapshotState = () =>
    resolveNextBacklogPromotionSnapshots({
      previousResult: input.previous_result ?? null,
      trackedIssuesById,
      actions,
      holds,
      targetStateName: input.config.backlog_promotion.target_state_name,
      backlogStateName: input.config.backlog_promotion.state_name,
      retentionConfig: input.config.backlog_promotion.snapshot_retention,
      evaluatedAt: recordedAt
    });
  const buildResultWithBacklogPromotionSnapshotState = (
    result: Omit<
      ProviderOperatorAutopilotResult,
      | 'backlog_promotion_snapshots'
      | 'backlog_promotion_snapshot_retention_records'
    >
  ): ProviderOperatorAutopilotResult => {
    const snapshotState = resolveBacklogPromotionSnapshotState();
    return {
      ...result,
      backlog_promotion_snapshots: snapshotState.snapshots,
      backlog_promotion_snapshot_retention_records: snapshotState.retention_records
    };
  };

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
    return buildResultWithBacklogPromotionSnapshotState({
      recorded_at: recordedAt,
      status: 'failed',
      summary: reviewHandoffOutcome.summary,
      error: reviewHandoffOutcome.error,
      actions: [],
      holds,
      pending_actions: effectiveLocalRolloutActions.pending_actions,
      terminal_blocker_advisories: terminalBlockerAdvisories,
      resolved_actions: effectiveLocalRolloutActions.resolved_actions,
      lifecycle_records: effectiveLocalRolloutActions.lifecycle_records,
      local_rollout_execution_attempts: cloneLocalRolloutExecutionAttempts(
        input.local_rollout_execution_attempts
      )
    });
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
      previousResult: input.previous_result ?? null,
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
      return buildResultWithBacklogPromotionSnapshotState({
        recorded_at: recordedAt,
        status: 'failed',
        summary: backlogOutcome.summary,
        error: backlogOutcome.error,
        actions,
        holds,
        pending_actions: effectiveLocalRolloutActions.pending_actions,
        terminal_blocker_advisories: terminalBlockerAdvisories,
        resolved_actions: effectiveLocalRolloutActions.resolved_actions,
        lifecycle_records: effectiveLocalRolloutActions.lifecycle_records,
        local_rollout_execution_attempts: cloneLocalRolloutExecutionAttempts(
          input.local_rollout_execution_attempts
        )
      });
    }
    if (backlogOutcome.action) {
      actions.push(backlogOutcome.action);
    }
    if (backlogOutcome.hold) {
      holds.push(backlogOutcome.hold);
    }
  }

  let effectiveLocalRolloutActions = resolveEffectiveLocalRolloutActions({
    pendingActions,
    postMergeRolloutEnabled: input.config.post_merge_rollout.enabled,
    lifecycleRecords
  });
  let localRolloutExecutionAttempts = cloneLocalRolloutExecutionAttempts(
    input.local_rollout_execution_attempts
  );
  if (
    input.config.post_merge_rollout.execution.enabled &&
    effectiveLocalRolloutActions.pending_actions.length > 0
  ) {
    if (!input.repo_root) {
      return buildResultWithBacklogPromotionSnapshotState({
        recorded_at: recordedAt,
        status: 'failed',
        summary: 'Local rollout execution is enabled but repo_root was not provided.',
        error: 'missing_repo_root',
        actions,
        holds,
        pending_actions: effectiveLocalRolloutActions.pending_actions,
        terminal_blocker_advisories: terminalBlockerAdvisories,
        resolved_actions: effectiveLocalRolloutActions.resolved_actions,
        lifecycle_records: effectiveLocalRolloutActions.lifecycle_records,
        local_rollout_execution_attempts: localRolloutExecutionAttempts
      });
    }
    const executionOutcome = await executeProviderOperatorAutopilotLocalRolloutActions(
      {
        pendingActions: effectiveLocalRolloutActions.pending_actions,
        config: input.config.post_merge_rollout.execution,
        repoRoot: input.repo_root,
        priorAttempts: localRolloutExecutionAttempts
      },
      {
        now,
        runCommand: deps.run_local_rollout_command,
        appendExecutionAttempt: deps.append_local_rollout_execution_attempt,
        appendLifecycleRecord: deps.append_local_rollout_lifecycle_record
      }
    );
    localRolloutExecutionAttempts = executionOutcome.attempts.map(
      cloneLocalRolloutExecutionAttempt
    );
    if (executionOutcome.lifecycle_records.length > 0) {
      lifecycleRecords.push(
        ...executionOutcome.lifecycle_records.map(cloneProviderOperatorAutopilotLifecycleRecord)
      );
      effectiveLocalRolloutActions = resolveEffectiveLocalRolloutActions({
        pendingActions,
        postMergeRolloutEnabled: input.config.post_merge_rollout.enabled,
        lifecycleRecords
      });
    }
  }
  const hasTransitionedAction = actions.some(
    (action) => action.transition.status === 'transitioned'
  );
  const status =
    hasTransitionedAction ||
    effectiveLocalRolloutActions.pending_actions.length > 0 ||
    effectiveLocalRolloutActions.resolved_actions.length > 0 ||
    terminalBlockerAdvisories.length > 0
      ? 'acted'
      : 'noop';
  return buildResultWithBacklogPromotionSnapshotState({
    recorded_at: recordedAt,
    status,
    summary: summarizeOperatorAutopilotResult({
      actions,
      holds,
      pendingActions: effectiveLocalRolloutActions.pending_actions,
      resolvedActions: effectiveLocalRolloutActions.resolved_actions,
      terminalBlockerAdvisories
    }),
    error: null,
    actions,
    holds,
    pending_actions: effectiveLocalRolloutActions.pending_actions,
    terminal_blocker_advisories: terminalBlockerAdvisories,
    resolved_actions: effectiveLocalRolloutActions.resolved_actions,
    lifecycle_records: effectiveLocalRolloutActions.lifecycle_records,
    local_rollout_execution_attempts: localRolloutExecutionAttempts
  });
}

async function maybeRunBacklogPromotion(input: {
  sortedTrackedIssues: LiveLinearTrackedIssue[];
  claimsByIssueId: Map<string, ProviderIntakeClaimRecord>;
  config: ProviderOperatorAutopilotConfig;
  recordedAt: string;
  previousResult: ProviderOperatorAutopilotResult | null;
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
    (issue) =>
      normalizeProviderLinearWorkflowState(issue.state) === backlogState &&
      isProviderLinearTrackedIssueMutable(issue)
  );
  const candidate = candidateIndex >= 0 ? input.sortedTrackedIssues[candidateIndex] : null;
  if (!candidate) {
    return { action: null, hold: null, failed: false, summary: '', error: null };
  }
  const higherRankedBlockedQueueLane =
    candidateIndex > 0
      ? input.sortedTrackedIssues.slice(0, candidateIndex).find((issue) => {
          const workflowState = classifyProviderLinearWorkflowState(issue);
          return (
            isProviderLinearTrackedIssueMutable(issue) &&
            workflowState.isTodo &&
            providerLinearTodoBlockedByNonTerminal(issue.blocked_by)
          );
        }) ?? null
      : null;
  if (higherRankedBlockedQueueLane) {
    return {
      action: null,
      hold: buildAutopilotHoldRecord({
        kind: 'backlog_promotion',
        issue: candidate,
        reason: 'backlog_head_blocked_by_higher_ranked_lane',
        summary: `Backlog head ${candidate.identifier} remains parked because higher-ranked queue lane ${higherRankedBlockedQueueLane.identifier} is still blocked by non-terminal work: ${formatBlockedBy(higherRankedBlockedQueueLane.blocked_by)}.`,
        actionRequiredReasons: []
      }),
      failed: false,
      summary: '',
      error: null
    };
  }
  const existingClaim = input.claimsByIssueId.get(candidate.id) ?? null;
  if (existingClaim && isBacklogPromotionBlockedByExistingClaimState(existingClaim.state)) {
    return {
      action: null,
      hold: buildAutopilotHoldRecord({
        kind: 'backlog_promotion',
        issue: candidate,
        reason: 'backlog_head_already_claimed',
        summary: `Backlog head ${candidate.identifier} remains parked because an intake claim is already present (${existingClaim.state}).`,
        actionRequiredReasons: []
      }),
      failed: false,
      summary: '',
      error: null
    };
  }
  if (!isLiveLinearTrackedIssueOwnedByCurrentViewerOrUnassigned(candidate)) {
    return {
      action: null,
      hold: buildAutopilotHoldRecord({
        kind: 'backlog_promotion',
        issue: candidate,
        reason: 'backlog_head_owned_by_other_operator',
        summary: `Backlog head ${candidate.identifier} remains parked because it is assigned to another operator.`,
        actionRequiredReasons: []
      }),
      failed: false,
      summary: '',
      error: null
    };
  }
  if (providerLinearTodoBlockedByNonTerminal(candidate.blocked_by)) {
    return {
      action: null,
      hold: buildAutopilotHoldRecord({
        kind: 'backlog_promotion',
        issue: candidate,
        reason: 'backlog_head_blocked_by_non_terminal',
        summary: `Backlog head ${candidate.identifier} remains parked because it is blocked by non-terminal work: ${formatBlockedBy(candidate.blocked_by)}.`,
        actionRequiredReasons: []
      }),
      failed: false,
      summary: '',
      error: null
    };
  }
  const previousBacklogPromotion = resolvePreviousBacklogPromotionSnapshot({
    previousResult: input.previousResult,
    issueId: candidate.id,
    targetStateName: input.config.backlog_promotion.target_state_name
  });
  const explicitBacklogDemotion = resolveExplicitBacklogDemotionHold({
    candidate,
    previousBacklogPromotion,
    backlogStateName: input.config.backlog_promotion.state_name,
    targetStateName: input.config.backlog_promotion.target_state_name
  });
  if (explicitBacklogDemotion) {
    return {
      action: null,
      hold: buildAutopilotHoldRecord({
        kind: 'backlog_promotion',
        issue: candidate,
        reason: 'backlog_head_manual_demotion_unacknowledged',
        summary: explicitBacklogDemotion.summary,
        promotionAttemptedAt: explicitBacklogDemotion.promotion_attempted_at,
        promotionIssueUpdatedAt: explicitBacklogDemotion.promotion_issue_updated_at,
        forcePathUsed: explicitBacklogDemotion.force_path_used,
        actionRequiredReasons: []
      }),
      failed: false,
      summary: '',
      error: null
    };
  }

  const transition = await input.transitionIssueState({
    issueId: candidate.id,
    stateName: input.config.backlog_promotion.target_state_name,
    expectedStateName: candidate.state,
    expectedStateType: candidate.state_type,
    expectedUpdatedAt: candidate.updated_at,
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
      hold: buildAutopilotHoldRecord({
        kind: 'review_handoff_rework',
        issue: candidate.trackedIssue,
        reason: 'review_handoff_non_author_action_required',
        summary: `Review handoff ${candidate.trackedIssue.identifier} remains parked because the current blockers are not author-action-required: ${formatReasonList(actionRequiredReasons)}.`,
        actionRequiredReasons: [...actionRequiredReasons]
      }),
      failed: false,
      summary: '',
      error: null
    };
  }

  const transition = await input.transitionIssueState({
    issueId: candidate.trackedIssue.id,
    stateName: input.config.review_handoff_rework.target_state_name,
    expectedStateName: candidate.trackedIssue.state,
    expectedStateType: candidate.trackedIssue.state_type,
    expectedUpdatedAt: candidate.trackedIssue.updated_at,
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
      summary: input.config.post_merge_rollout.summary,
      executableActionIds: resolveEnabledLocalRolloutExecutionActionIds(
        input.config.post_merge_rollout.execution
      )
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
  executableActionIds: string[];
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
    executable_action_ids: [...input.executableActionIds],
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

function collectTerminalBlockerAdvisories(
  trackedIssues: LiveLinearTrackedIssue[]
): ProviderOperatorAutopilotTerminalBlockerAdvisoryRecord[] {
  return trackedIssues
    .flatMap((issue) => {
      if (normalizeProviderLinearWorkflowState(issue.state) !== BLOCKED_STATE_NAME) {
        return [];
      }
      const blockers = issue.blocked_by ?? [];
      if (blockers.length === 0 || !blockers.every(isTerminalBlocker)) {
        return [];
      }
      const canonicalOwnerHints = resolveCanonicalOwnerHints(issue);
      const duplicateHints = resolveDuplicateHints(issue);
      const recommendedAction =
        duplicateHints.length > 0 || canonicalOwnerHints.length > 0
          ? 'duplicate_cleanup'
          : 'ready_to_unblock';
      const advisory: ProviderOperatorAutopilotTerminalBlockerAdvisoryRecord = {
        kind: 'terminal_blocker_cleanup',
        issue_id: issue.id,
        issue_identifier: issue.identifier,
        issue_state: issue.state,
        issue_state_type: issue.state_type,
        issue_updated_at: issue.updated_at,
        blockers: blockers.map((blocker) => ({
          id: blocker.id,
          identifier: blocker.identifier,
          state: blocker.state,
          state_type: blocker.state_type
        })),
        canonical_owner_hints: canonicalOwnerHints,
        duplicate_hints: duplicateHints,
        recommended_action: recommendedAction,
        summary: buildTerminalBlockerAdvisorySummary({
          issue,
          blockers,
          canonicalOwnerHints,
          duplicateHints,
          recommendedAction
        })
      };
      return [advisory];
    })
    .sort((left, right) =>
      (left.issue_identifier ?? left.issue_id).localeCompare(
        right.issue_identifier ?? right.issue_id
      )
    );
}

function isTerminalBlocker(
  blocker: NonNullable<LiveLinearTrackedIssue['blocked_by']>[number]
): boolean {
  return classifyProviderLinearWorkflowState({
    state: blocker.state,
    state_type: blocker.state_type
  }).isTerminal;
}

function resolveCanonicalOwnerHints(issue: Pick<LiveLinearTrackedIssue, 'description'>): string[] {
  const description = normalizeOptionalString(issue.description);
  if (!description) {
    return [];
  }
  const hints = new Set<string>();
  for (const markerPrefix of [
    CANONICAL_OWNER_MARKER_PREFIX,
    SUPERSEDED_CANONICAL_OWNER_MARKER_PREFIX
  ]) {
    let cursor = 0;
    while (cursor < description.length) {
      const markerIndex = description.indexOf(markerPrefix, cursor);
      if (markerIndex < 0) {
        break;
      }
      const markerStart = markerIndex;
      let markerEnd = markerIndex + markerPrefix.length;
      while (
        markerEnd < description.length &&
        !/[\s`'")\]}]/u.test(description[markerEnd]!)
      ) {
        markerEnd += 1;
      }
      hints.add(description.slice(markerStart, markerEnd));
      cursor = markerEnd + 1;
    }
  }
  return [...hints].sort();
}

function resolveDuplicateHints(issue: Pick<LiveLinearTrackedIssue, 'relations'>): string[] {
  const hints = new Set<string>();
  for (const relation of issue.relations ?? []) {
    const normalizedType = normalizeProviderLinearWorkflowState(relation.type);
    const relatedIssueState = classifyProviderLinearWorkflowState({
      state: relation.issue.state,
      state_type: relation.issue.state_type
    });
    if (
      normalizedType !== 'duplicate' &&
      normalizedType !== 'duplicates' &&
      normalizedType !== 'duplicated by' &&
      !relatedIssueState.normalizedState?.includes('duplicate')
    ) {
      continue;
    }
    const identifier = relation.issue.identifier ?? relation.issue.id ?? 'unknown';
    const state = relation.issue.state ?? relation.issue.state_type ?? 'unknown';
    hints.add(`${relation.direction}:${relation.type ?? 'unknown'}:${identifier}:${state}`);
  }
  return [...hints].sort();
}

function buildTerminalBlockerAdvisorySummary(input: {
  issue: Pick<LiveLinearTrackedIssue, 'identifier' | 'id' | 'state'>;
  blockers: NonNullable<LiveLinearTrackedIssue['blocked_by']>;
  canonicalOwnerHints: string[];
  duplicateHints: string[];
  recommendedAction: ProviderOperatorAutopilotTerminalBlockerAdvisoryRecord['recommended_action'];
}): string {
  const issueIdentifier = input.issue.identifier ?? input.issue.id;
  const action =
    input.recommendedAction === 'duplicate_cleanup'
      ? 'duplicate-cleanup candidate'
      : 'ready-to-unblock candidate';
  const hintParts = [
    input.duplicateHints.length > 0
      ? `duplicate hints=${input.duplicateHints.join(', ')}`
      : null,
    input.canonicalOwnerHints.length > 0
      ? `canonical owner hints=${input.canonicalOwnerHints.join(', ')}`
      : null
  ].filter((part): part is string => part !== null);
  const hintSuffix = hintParts.length > 0 ? `; ${hintParts.join('; ')}` : '';
  return `Blocked issue ${issueIdentifier} has only terminal blockers (${formatBlockedBy(input.blockers)}); recommend ${action}${hintSuffix}.`;
}

function summarizeOperatorAutopilotResult(input: {
  actions: ProviderOperatorAutopilotActionRecord[];
  holds: ProviderOperatorAutopilotHoldRecord[];
  pendingActions: ProviderOperatorAutopilotPendingActionRecord[];
  resolvedActions: ProviderOperatorAutopilotResolvedActionRecord[];
  terminalBlockerAdvisories: ProviderOperatorAutopilotTerminalBlockerAdvisoryRecord[];
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
  if (input.terminalBlockerAdvisories.length > 0) {
    const duplicateCleanupCount = input.terminalBlockerAdvisories.filter(
      (advisory) => advisory.recommended_action === 'duplicate_cleanup'
    ).length;
    const readyToUnblockCount =
      input.terminalBlockerAdvisories.length - duplicateCleanupCount;
    const issueList = input.terminalBlockerAdvisories
      .map((advisory) => advisory.issue_identifier ?? advisory.issue_id)
      .join(', ');
    parts.push(
      `Surfaced ${input.terminalBlockerAdvisories.length} Blocked terminal-blocker advisory candidate(s): ${duplicateCleanupCount} duplicate-cleanup, ${readyToUnblockCount} ready-to-unblock (${issueList}).`
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
      force_path_used: false,
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
    force_path_used: input.transition.transition_guard?.force ?? false,
    error: null
  };
}

function buildAutopilotHoldRecord(input: {
  kind: ProviderOperatorAutopilotHoldRecord['kind'];
  issue: Pick<
    LiveLinearTrackedIssue,
    'id' | 'identifier' | 'state' | 'state_type' | 'updated_at'
  > | null;
  reason: string;
  summary: string;
  promotionAttemptedAt?: string | null;
  promotionIssueUpdatedAt?: string | null;
  forcePathUsed?: boolean;
  actionRequiredReasons: string[];
}): ProviderOperatorAutopilotHoldRecord {
  return {
    kind: input.kind,
    issue_id: input.issue?.id ?? null,
    issue_identifier: input.issue?.identifier ?? null,
    issue_state: input.issue?.state ?? null,
    issue_state_type: input.issue?.state_type ?? null,
    issue_updated_at: input.issue?.updated_at ?? null,
    promotion_attempted_at: input.promotionAttemptedAt ?? null,
    promotion_issue_updated_at: input.promotionIssueUpdatedAt ?? null,
    force_path_used: input.forcePathUsed ?? false,
    reason: input.reason,
    summary: input.summary,
    action_required_reasons: [...input.actionRequiredReasons]
  };
}

function resolvePreviousBacklogPromotionSnapshot(input: {
  previousResult: ProviderOperatorAutopilotResult | null;
  issueId: string;
  targetStateName: string;
}): {
  attempted_at: string;
  issue_updated_at: string | null;
  force_path_used: boolean;
} | null {
  const snapshot = collectBacklogPromotionSnapshotsFromResult(
    input.previousResult,
    input.targetStateName
  ).find((candidate) => candidate.issue_id === input.issueId);
  if (!snapshot) {
    return null;
  }
  return {
    attempted_at: snapshot.attempted_at,
    issue_updated_at: snapshot.issue_updated_at,
    force_path_used: snapshot.force_path_used
  };
}

function resolveNextBacklogPromotionSnapshots(input: {
  previousResult: ProviderOperatorAutopilotResult | null;
  trackedIssuesById: Map<string, LiveLinearTrackedIssue>;
  actions: ProviderOperatorAutopilotActionRecord[];
  holds: ProviderOperatorAutopilotHoldRecord[];
  targetStateName: string;
  backlogStateName: string;
  retentionConfig: ProviderOperatorAutopilotConfig['backlog_promotion']['snapshot_retention'];
  evaluatedAt: string;
}): {
  snapshots: ProviderOperatorAutopilotBacklogPromotionSnapshot[];
  retention_records: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionRecord[];
} {
  const normalizedBacklogState = normalizeProviderLinearWorkflowState(input.backlogStateName);
  const normalizedTargetState = normalizeProviderLinearWorkflowState(input.targetStateName);
  const snapshotsByIssueId = new Map<string, ProviderOperatorAutopilotBacklogPromotionSnapshot>();
  const retentionRecords: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionRecord[] = [];
  const prunedPreviousSnapshotIssueIds = new Set<string>();
  // Repeat the minimum defensively for persisted/legacy configs loaded before
  // resolveProviderOperatorAutopilotConfig normalized snapshot_retention.
  const maxUntrackedCycles = Math.max(2, input.retentionConfig.max_untracked_cycles);
  for (const snapshot of collectBacklogPromotionSnapshotsFromResult(
    input.previousResult,
    input.targetStateName
  )) {
    const issue = input.trackedIssuesById.get(snapshot.issue_id) ?? null;
    const currentUntrackedCycles = normalizeNonNegativeInteger(snapshot.untracked_cycles);
    if (!issue) {
      const nextUntrackedCycles = currentUntrackedCycles + 1;
      const shouldPrune = nextUntrackedCycles >= maxUntrackedCycles;
      retentionRecords.push(
        buildBacklogPromotionSnapshotRetentionRecord({
          snapshot,
          evaluatedAt: input.evaluatedAt,
          decision: shouldPrune ? 'pruned' : 'retained',
          reason: shouldPrune
            ? 'stale_untracked_cycle_limit'
            : 'temporarily_untracked',
          ageMs: calculateSnapshotAgeMs(input.evaluatedAt, snapshot.attempted_at),
          untrackedCycles: nextUntrackedCycles,
          maxUntrackedCycles,
          issue: null,
          terminalStateEvidence: false
        })
      );
      if (!shouldPrune) {
        snapshotsByIssueId.set(snapshot.issue_id, {
          ...snapshot,
          untracked_cycles: nextUntrackedCycles
        });
      }
      continue;
    }
    const issueState = normalizeProviderLinearWorkflowState(issue?.state);
    const terminalStateEvidence = isBacklogPromotionSnapshotTerminalIssueState(
      issue,
      input.retentionConfig.terminal_state_types
    );
    if (terminalStateEvidence) {
      retentionRecords.push(
        buildBacklogPromotionSnapshotRetentionRecord({
          snapshot,
          evaluatedAt: input.evaluatedAt,
          decision: 'pruned',
          reason: 'terminal_state',
          ageMs: calculateSnapshotAgeMs(input.evaluatedAt, snapshot.attempted_at),
          untrackedCycles: 0,
          maxUntrackedCycles,
          issue,
          terminalStateEvidence: true
        })
      );
      prunedPreviousSnapshotIssueIds.add(snapshot.issue_id);
      continue;
    }
    if (!isProviderLinearTrackedIssueMutable(issue)) {
      retentionRecords.push(
        buildBacklogPromotionSnapshotRetentionRecord({
          snapshot,
          evaluatedAt: input.evaluatedAt,
          decision: 'pruned',
          reason: 'tracked_archived_or_trashed',
          ageMs: calculateSnapshotAgeMs(input.evaluatedAt, snapshot.attempted_at),
          untrackedCycles: 0,
          maxUntrackedCycles,
          issue,
          terminalStateEvidence: false
        })
      );
      prunedPreviousSnapshotIssueIds.add(snapshot.issue_id);
      continue;
    }
    if (
      (issueState === normalizedBacklogState || issueState === normalizedTargetState)
    ) {
      const nextSnapshot = {
        ...snapshot,
        issue_identifier: issue.identifier ?? snapshot.issue_identifier,
        untracked_cycles: 0
      };
      if (currentUntrackedCycles > 0) {
        retentionRecords.push(
          buildBacklogPromotionSnapshotRetentionRecord({
            snapshot: nextSnapshot,
            evaluatedAt: input.evaluatedAt,
            decision: 'retained',
            reason: 'tracked_state_reset_untracked_cycles',
            ageMs: calculateSnapshotAgeMs(input.evaluatedAt, snapshot.attempted_at),
            untrackedCycles: 0,
            maxUntrackedCycles,
            issue,
            terminalStateEvidence: false
          })
        );
      }
      snapshotsByIssueId.set(snapshot.issue_id, nextSnapshot);
      continue;
    }
    retentionRecords.push(
      buildBacklogPromotionSnapshotRetentionRecord({
        snapshot,
        evaluatedAt: input.evaluatedAt,
        decision: 'pruned',
        reason: 'tracked_non_backlog_non_target_state',
        ageMs: calculateSnapshotAgeMs(input.evaluatedAt, snapshot.attempted_at),
        untrackedCycles: 0,
        maxUntrackedCycles,
        issue,
        terminalStateEvidence: false
      })
    );
    prunedPreviousSnapshotIssueIds.add(snapshot.issue_id);
  }
  for (const action of input.actions) {
    const snapshot = buildBacklogPromotionSnapshotFromAction(action, input.targetStateName);
    if (snapshot) {
      prunedPreviousSnapshotIssueIds.delete(snapshot.issue_id);
      snapshotsByIssueId.set(snapshot.issue_id, snapshot);
    }
  }
  for (const hold of input.holds) {
    const snapshot = buildBacklogPromotionSnapshotFromHold(hold, input.targetStateName);
    if (snapshot && !prunedPreviousSnapshotIssueIds.has(snapshot.issue_id)) {
      snapshotsByIssueId.set(snapshot.issue_id, snapshot);
    }
  }
  return {
    snapshots: sortBacklogPromotionSnapshots([...snapshotsByIssueId.values()]),
    retention_records: sortBacklogPromotionSnapshotRetentionRecords(retentionRecords)
  };
}

function buildBacklogPromotionSnapshotRetentionRecord(input: {
  snapshot: ProviderOperatorAutopilotBacklogPromotionSnapshot;
  evaluatedAt: string;
  decision: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionDecision;
  reason: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionReason;
  ageMs: number | null;
  untrackedCycles: number;
  maxUntrackedCycles: number;
  issue: LiveLinearTrackedIssue | null;
  terminalStateEvidence: boolean;
}): ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionRecord {
  return {
    issue_id: input.snapshot.issue_id,
    issue_identifier: input.issue?.identifier ?? input.snapshot.issue_identifier,
    target_state: input.snapshot.target_state,
    attempted_at: input.snapshot.attempted_at,
    issue_updated_at: input.snapshot.issue_updated_at,
    evaluated_at: input.evaluatedAt,
    decision: input.decision,
    reason: input.reason,
    age_ms: input.ageMs,
    untracked_cycles: input.untrackedCycles,
    max_untracked_cycles: input.maxUntrackedCycles,
    issue_state: input.issue?.state ?? null,
    issue_state_type: input.issue?.state_type ?? null,
    issue_archived_at: input.issue?.archived_at ?? null,
    issue_trashed: input.issue?.trashed ?? null,
    issue_observed_updated_at: input.issue?.updated_at ?? null,
    terminal_state_evidence: input.terminalStateEvidence,
    force_path_used: input.snapshot.force_path_used ?? false
  };
}

function isBacklogPromotionSnapshotTerminalIssueState(
  issue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type'>,
  terminalStateTypes: string[]
): boolean {
  const normalizedTerminalStateTypes = terminalStateTypes
    .map((stateType) => normalizeProviderLinearWorkflowState(stateType))
    .filter((stateType): stateType is string => stateType !== null);
  const normalizedType = normalizeProviderLinearWorkflowState(issue.state_type);
  if (normalizedType !== null && normalizedTerminalStateTypes.includes(normalizedType)) {
    return true;
  }
  const normalizedState = normalizeProviderLinearWorkflowState(issue.state);
  if (normalizedState !== null && normalizedTerminalStateTypes.includes(normalizedState)) {
    return true;
  }
  return classifyProviderLinearWorkflowState(issue).isTerminal;
}

function calculateSnapshotAgeMs(evaluatedAt: string, attemptedAt: string): number | null {
  const evaluatedAtMs = Date.parse(evaluatedAt);
  const attemptedAtMs = Date.parse(attemptedAt);
  if (!Number.isFinite(evaluatedAtMs) || !Number.isFinite(attemptedAtMs)) {
    return null;
  }
  return Math.max(0, evaluatedAtMs - attemptedAtMs);
}

function sortBacklogPromotionSnapshots(
  snapshots: ProviderOperatorAutopilotBacklogPromotionSnapshot[]
): ProviderOperatorAutopilotBacklogPromotionSnapshot[] {
  return [...snapshots].sort((left, right) =>
    (left.issue_identifier ?? left.issue_id).localeCompare(
      right.issue_identifier ?? right.issue_id
    )
  );
}

function sortBacklogPromotionSnapshotRetentionRecords(
  records: ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionRecord[]
): ProviderOperatorAutopilotBacklogPromotionSnapshotRetentionRecord[] {
  return [...records].sort((left, right) =>
    (left.issue_identifier ?? left.issue_id).localeCompare(
      right.issue_identifier ?? right.issue_id
    )
  );
}

function collectBacklogPromotionSnapshotsFromResult(
  result: ProviderOperatorAutopilotResult | null | undefined,
  targetStateName: string
): ProviderOperatorAutopilotBacklogPromotionSnapshot[] {
  if (!result) {
    return [];
  }
  const snapshotsByIssueId = new Map<string, ProviderOperatorAutopilotBacklogPromotionSnapshot>();
  const prunedSnapshotKeys = collectPrunedBacklogPromotionSnapshotKeysFromResult(
    result,
    targetStateName
  );
  const normalizedTarget = normalizeProviderLinearWorkflowState(targetStateName);
  for (const snapshot of result.backlog_promotion_snapshots ?? []) {
    if (
      normalizedTarget !== null &&
      normalizeProviderLinearWorkflowState(snapshot.target_state) === normalizedTarget &&
      normalizeOptionalString(snapshot.issue_id) &&
      normalizeOptionalString(snapshot.attempted_at)
    ) {
      snapshotsByIssueId.set(snapshot.issue_id, {
        issue_id: snapshot.issue_id,
        issue_identifier: snapshot.issue_identifier ?? null,
        target_state: snapshot.target_state,
        attempted_at: snapshot.attempted_at,
        issue_updated_at: snapshot.issue_updated_at ?? null,
        force_path_used: snapshot.force_path_used ?? false,
        untracked_cycles: normalizeNonNegativeInteger(snapshot.untracked_cycles)
      });
    }
  }
  for (const action of result.actions) {
    const snapshot = buildBacklogPromotionSnapshotFromAction(action, targetStateName);
    if (snapshot && !prunedSnapshotKeys.has(buildBacklogPromotionSnapshotKey(snapshot))) {
      snapshotsByIssueId.set(snapshot.issue_id, snapshot);
    }
  }
  for (const hold of result.holds) {
    const snapshot = buildBacklogPromotionSnapshotFromHold(hold, targetStateName);
    if (snapshot && !prunedSnapshotKeys.has(buildBacklogPromotionSnapshotKey(snapshot))) {
      snapshotsByIssueId.set(snapshot.issue_id, snapshot);
    }
  }
  return [...snapshotsByIssueId.values()];
}

function collectPrunedBacklogPromotionSnapshotKeysFromResult(
  result: ProviderOperatorAutopilotResult,
  targetStateName: string
): Set<string> {
  const keys = new Set<string>();
  const normalizedTarget = normalizeProviderLinearWorkflowState(targetStateName);
  for (const record of result.backlog_promotion_snapshot_retention_records ?? []) {
    if (
      record.decision === 'pruned' &&
      normalizedTarget !== null &&
      normalizeProviderLinearWorkflowState(record.target_state) === normalizedTarget &&
      normalizeOptionalString(record.issue_id) &&
      normalizeOptionalString(record.attempted_at)
    ) {
      keys.add(
        buildBacklogPromotionSnapshotKey({
          issue_id: record.issue_id,
          target_state: record.target_state,
          attempted_at: record.attempted_at
        })
      );
    }
  }
  return keys;
}

function buildBacklogPromotionSnapshotKey(input: {
  issue_id: string;
  target_state: string;
  attempted_at: string;
}): string {
  const normalizedTarget =
    normalizeProviderLinearWorkflowState(input.target_state) ?? input.target_state;
  return `${input.issue_id}\u0000${normalizedTarget}\u0000${input.attempted_at}`;
}

function buildBacklogPromotionSnapshotFromAction(
  action: ProviderOperatorAutopilotActionRecord,
  targetStateName: string
): ProviderOperatorAutopilotBacklogPromotionSnapshot | null {
  const normalizedTarget = normalizeProviderLinearWorkflowState(targetStateName);
  if (
    action.kind !== 'backlog_promotion' ||
    action.reason !== 'backlog_head_promoted' ||
    action.transition.status !== 'transitioned' ||
    normalizedTarget === null ||
    normalizeProviderLinearWorkflowState(action.transition.target_state) !== normalizedTarget
  ) {
    return null;
  }
  return {
    issue_id: action.issue_id,
    issue_identifier: action.issue_identifier,
    target_state: action.transition.target_state,
    attempted_at: action.transition.attempted_at,
    issue_updated_at: action.transition.issue_updated_at,
    force_path_used: action.transition.force_path_used ?? false,
    untracked_cycles: 0
  };
}

function buildBacklogPromotionSnapshotFromHold(
  hold: ProviderOperatorAutopilotHoldRecord,
  targetStateName: string
): ProviderOperatorAutopilotBacklogPromotionSnapshot | null {
  if (
    hold.kind !== 'backlog_promotion' ||
    hold.reason !== 'backlog_head_manual_demotion_unacknowledged' ||
    !hold.issue_id ||
    !hold.promotion_attempted_at
  ) {
    return null;
  }
  return {
    issue_id: hold.issue_id,
    issue_identifier: hold.issue_identifier,
    target_state: targetStateName,
    attempted_at: hold.promotion_attempted_at,
    issue_updated_at: hold.promotion_issue_updated_at ?? null,
    force_path_used: hold.force_path_used ?? false,
    untracked_cycles: 0
  };
}

function resolveExplicitBacklogDemotionHold(input: {
  candidate: Pick<LiveLinearTrackedIssue, 'identifier' | 'recent_activity' | 'updated_at'>;
  previousBacklogPromotion: {
    attempted_at: string;
    issue_updated_at: string | null;
    force_path_used: boolean;
  } | null;
  backlogStateName: string;
  targetStateName: string;
}): {
  summary: string;
  promotion_attempted_at: string;
  promotion_issue_updated_at: string | null;
  force_path_used: boolean;
} | null {
  if (!input.previousBacklogPromotion) {
    return null;
  }
  const latestActivity = resolveMostRecentTrackedActivity(input.candidate.recent_activity);
  if (!latestActivity) {
    return null;
  }
  const stateTransition = parseTrackedIssueStateTransitionSummary(latestActivity.summary);
  const normalizedBacklogState = normalizeProviderLinearWorkflowState(input.backlogStateName);
  const normalizedTargetState = normalizeProviderLinearWorkflowState(input.targetStateName);
  if (
    !stateTransition ||
    normalizedBacklogState === null ||
    normalizedTargetState === null ||
    normalizeProviderLinearWorkflowState(stateTransition.fromState) !== normalizedTargetState ||
    normalizeProviderLinearWorkflowState(stateTransition.toState) !== normalizedBacklogState
  ) {
    return null;
  }
  const previousPromotionTimestamp =
    input.previousBacklogPromotion.issue_updated_at ?? input.previousBacklogPromotion.attempted_at;
  const demotionTimestamp = latestActivity.created_at ?? input.candidate.updated_at;
  if (compareNullableIsoTimestamp(demotionTimestamp, previousPromotionTimestamp) <= 0) {
    return null;
  }
  const actorFragment = latestActivity.actor_name ? ` by ${latestActivity.actor_name}` : '';
  const timestampFragment = latestActivity.created_at ? ` at ${latestActivity.created_at}` : '';
  return {
    summary: `Backlog head ${input.candidate.identifier} remains parked because autopilot last promoted it at ${previousPromotionTimestamp} and the latest issue activity is an explicit ${stateTransition.fromState} -> ${stateTransition.toState} demotion${actorFragment}${timestampFragment}; wait for a newer acknowledgement update before re-promoting.`,
    promotion_attempted_at: input.previousBacklogPromotion.attempted_at,
    promotion_issue_updated_at: input.previousBacklogPromotion.issue_updated_at,
    force_path_used: input.previousBacklogPromotion.force_path_used
  };
}

function resolveMostRecentTrackedActivity(
  recentActivity: LiveLinearTrackedIssue['recent_activity']
): LiveLinearTrackedIssue['recent_activity'][number] | null {
  if (recentActivity.length === 0) {
    return null;
  }
  return [...recentActivity].sort((left, right) =>
    compareNullableIsoTimestamp(right.created_at, left.created_at)
  )[0] ?? null;
}

function parseTrackedIssueStateTransitionSummary(
  summary: string | null | undefined
): {
  fromState: string | null;
  toState: string | null;
} | null {
  const normalized = normalizeOptionalString(summary);
  if (!normalized || !normalized.startsWith('State ') || !normalized.includes(' -> ')) {
    return null;
  }
  const transition = normalized.slice('State '.length);
  const separatorIndex = transition.indexOf(' -> ');
  if (separatorIndex < 0) {
    return null;
  }
  const fromState = normalizeOptionalString(transition.slice(0, separatorIndex));
  const toState = normalizeOptionalString(transition.slice(separatorIndex + ' -> '.length));
  if (!fromState && !toState) {
    return null;
  }
  return {
    fromState,
    toState
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
    terminal_blocker_advisories: result.terminal_blocker_advisories ?? [],
    resolved_actions: result.resolved_actions ?? [],
    lifecycle_records: result.lifecycle_records ?? [],
    local_rollout_execution_attempts: result.local_rollout_execution_attempts ?? [],
    backlog_promotion_snapshots: result.backlog_promotion_snapshots ?? [],
    backlog_promotion_snapshot_retention_records:
      result.backlog_promotion_snapshot_retention_records ?? []
  };
}

function cloneLocalRolloutExecutionAttempts(
  attempts: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[] | null | undefined
): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[] {
  return (attempts ?? []).map(cloneLocalRolloutExecutionAttempt);
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
    executable_action_ids: [...(record.executable_action_ids ?? [])],
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

function readPositiveInteger(
  record: Record<string, unknown> | null,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }
  }
  return null;
}

function normalizeNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function normalizeStringArray(values: string[]): string[] {
  const normalized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  // Empty terminal_state_types is treated as unset; disabling terminal-state
  // pruning is not supported because terminal evidence is the safest prune path.
  return normalized.length > 0
    ? normalized
    : [...DEFAULT_BACKLOG_PROMOTION_SNAPSHOT_TERMINAL_STATE_TYPES];
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
