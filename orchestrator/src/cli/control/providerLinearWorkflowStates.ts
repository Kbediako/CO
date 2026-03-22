import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';

const ACTIVE_PROVIDER_LINEAR_WORKFLOW_STATES = new Set([
  'todo',
  'in progress',
  'merging',
  'rework'
]);
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
  const isTodo = normalizedState === 'todo';
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
    (
      (normalizedState !== null &&
        ACTIVE_PROVIDER_LINEAR_WORKFLOW_STATES.has(normalizedState)) ||
      normalizedStateType === 'started'
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

export function isProviderLinearTrackedIssueEligibleForExecution(
  issue: Pick<LiveLinearTrackedIssue, 'state' | 'state_type' | 'blocked_by'>
): boolean {
  const workflowState = classifyProviderLinearWorkflowState(issue);
  if (!workflowState.isActive) {
    return false;
  }
  if (
    workflowState.isTodo &&
    providerLinearTodoBlockedByNonTerminal(issue.blocked_by)
  ) {
    return false;
  }
  return true;
}
