import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';

const ACTIVE_PROVIDER_LINEAR_WORKFLOW_STATES = new Set([
  'todo',
  'in progress',
  'merging',
  'rework'
]);
const TODO_EQUIVALENT_PROVIDER_LINEAR_WORKFLOW_STATES = new Set(['todo', 'ready']);
const HANDOFF_PROVIDER_LINEAR_WORKFLOW_STATES = new Set(['human review', 'in review']);
const TERMINAL_PROVIDER_LINEAR_WORKFLOW_STATES = new Set([
  'closed',
  'cancelled',
  'canceled',
  'duplicate',
  'done'
]);
const TERMINAL_PROVIDER_LINEAR_WORKFLOW_STATE_TYPES = new Set([
  'completed',
  'cancelled',
  'canceled'
]);

export interface ProviderLinearWorkflowStateClassification {
  normalizedState: string | null;
  normalizedStateType: string | null;
  isTodo: boolean;
  isHandoff: boolean;
  isTerminal: boolean;
  isActive: boolean;
}

export type ProviderLinearWorkerLifecyclePhase =
  | 'active'
  | 'review_handoff'
  | 'inactive';

export interface ProviderLinearWorkerLifecycleClassification {
  workflowState: ProviderLinearWorkflowStateClassification;
  isExecutionEligible: boolean;
  phase: ProviderLinearWorkerLifecyclePhase;
  terminalReason: 'issue_review_handoff' | 'issue_inactive' | null;
}

export function normalizeProviderLinearWorkflowState(
  value: string | null | undefined
): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function classifyProviderLinearWorkflowState(input: {
  state: string | null | undefined;
  state_type: string | null | undefined;
}): ProviderLinearWorkflowStateClassification {
  const normalizedState = normalizeProviderLinearWorkflowState(input.state);
  const normalizedStateType = normalizeProviderLinearWorkflowState(input.state_type);
  const isTodo =
    normalizedState !== null &&
    TODO_EQUIVALENT_PROVIDER_LINEAR_WORKFLOW_STATES.has(normalizedState);
  const isHandoff =
    normalizedState !== null && HANDOFF_PROVIDER_LINEAR_WORKFLOW_STATES.has(normalizedState);
  const isTerminal =
    (normalizedState !== null &&
      TERMINAL_PROVIDER_LINEAR_WORKFLOW_STATES.has(normalizedState)) ||
    (normalizedStateType !== null &&
      TERMINAL_PROVIDER_LINEAR_WORKFLOW_STATE_TYPES.has(normalizedStateType));
  const isActive =
    !isHandoff &&
    !isTerminal &&
    normalizedState !== null &&
    (
      ACTIVE_PROVIDER_LINEAR_WORKFLOW_STATES.has(normalizedState) ||
      TODO_EQUIVALENT_PROVIDER_LINEAR_WORKFLOW_STATES.has(normalizedState)
    );

  return {
    normalizedState,
    normalizedStateType,
    isTodo,
    isHandoff,
    isTerminal,
    isActive
  };
}

export function providerLinearTodoBlockedByNonTerminal(
  blockers: LiveLinearTrackedIssue['blocked_by'] | null | undefined
): boolean {
  return (blockers ?? []).some((blocker) => {
    const normalizedBlockerStateType = normalizeProviderLinearWorkflowState(
      blocker.state_type
    );
    if (normalizedBlockerStateType !== null) {
      return !TERMINAL_PROVIDER_LINEAR_WORKFLOW_STATE_TYPES.has(
        normalizedBlockerStateType
      );
    }
    const normalizedBlockerState = normalizeProviderLinearWorkflowState(blocker.state);
    return (
      normalizedBlockerState === null ||
      !TERMINAL_PROVIDER_LINEAR_WORKFLOW_STATES.has(normalizedBlockerState)
    );
  });
}

function isProviderLinearWorkflowStateExecutionEligible(input: {
  workflowState: ProviderLinearWorkflowStateClassification;
  blockers: LiveLinearTrackedIssue['blocked_by'] | null | undefined;
}): boolean {
  if (!input.workflowState.isActive) {
    return false;
  }
  if (
    input.workflowState.isTodo &&
    providerLinearTodoBlockedByNonTerminal(input.blockers)
  ) {
    return false;
  }
  return true;
}

export function classifyProviderLinearWorkerLifecycle(
  issue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'blocked_by'>
): ProviderLinearWorkerLifecycleClassification {
  const workflowState = classifyProviderLinearWorkflowState(issue);
  const isExecutionEligible = isProviderLinearWorkflowStateExecutionEligible({
    workflowState,
    blockers: issue.blocked_by
  });

  if (isExecutionEligible) {
    return {
      workflowState,
      isExecutionEligible,
      phase: 'active',
      terminalReason: null
    };
  }

  if (workflowState.isHandoff) {
    return {
      workflowState,
      isExecutionEligible,
      phase: 'review_handoff',
      terminalReason: 'issue_review_handoff'
    };
  }

  return {
    workflowState,
    isExecutionEligible,
    phase: 'inactive',
    terminalReason: 'issue_inactive'
  };
}

export function isProviderLinearTrackedIssueEligibleForExecution(
  issue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'blocked_by'>
): boolean {
  return classifyProviderLinearWorkerLifecycle(issue).isExecutionEligible;
}
