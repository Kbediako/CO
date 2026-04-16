/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { isoTimestamp } from './utils/time.js';
import { fetchUiDataset, resolveAttachTarget } from './coStatusAttachCliShell.js';
import {
  appendProviderOperatorAutopilotLifecycleRecord,
  resolveProviderOperatorAutopilotLifecyclePath,
  type ProviderOperatorAutopilotLifecycleRecord,
  type ProviderOperatorAutopilotLifecycleState
} from './control/providerOperatorAutopilotLifecycle.js';
import type {
  ControlProviderOperatorAutopilotPendingActionPayload,
  ControlProviderWorkflowPayload
} from './control/observabilityReadModel.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
type LifecycleCommand = 'acknowledge' | 'clear' | 'dismiss';

export interface RunCoStatusOperatorAutopilotCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

export async function runCoStatusOperatorAutopilotCliShell(
  params: RunCoStatusOperatorAutopilotCliShellParams
): Promise<void> {
  if (params.flags.help !== undefined) {
    params.printHelp();
    return;
  }
  const [surface, actionName, ...unexpected] = params.positionals;
  if (surface !== 'local-rollout' || !isLifecycleCommand(actionName)) {
    throw new Error(
      'co-status operator-autopilot requires: local-rollout <acknowledge|clear|dismiss>.'
    );
  }
  if (unexpected.length > 0) {
    throw new Error(
      `Unknown co-status operator-autopilot argument(s): ${unexpected.join(' ')}`
    );
  }
  const actionIdSelector = readStringFlag(params.flags, 'action-id');
  const issueSelector = readStringFlag(params.flags, 'issue');
  const selector = actionIdSelector ?? issueSelector;
  if (!selector) {
    throw new Error('co-status operator-autopilot local-rollout requires --issue or --action-id.');
  }
  const actor =
    readStringFlag(params.flags, 'actor') ??
    normalizeOptionalString(process.env.USER) ??
    'operator';
  const reason = readStringFlag(params.flags, 'reason');
  if (!reason) {
    throw new Error('co-status operator-autopilot local-rollout requires --reason.');
  }
  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  const state = mapLifecycleCommand(actionName);
  const target = await resolveAttachTarget(params.flags);
  const dataset = await fetchUiDataset(target.baseUrl, target.token);
  const operatorAutopilot = dataset.provider_workflow?.operator_autopilot ?? null;
  const pendingActions = operatorAutopilot?.last_result?.pending_actions ?? [];
  const pendingAction = selectPendingLocalRolloutAction({
    pendingActions,
    selector,
    selectorKind: actionIdSelector ? 'action-id' : 'issue'
  });
  if (!pendingAction.action_instance_id) {
    throw new Error(
      'Matched pending local rollout action is missing action_instance_id; wait for a fresh operator-autopilot evaluation.'
    );
  }
  const lifecyclePath =
    readLifecyclePath(operatorAutopilot) ??
    resolveProviderOperatorAutopilotLifecyclePath(target.runDir);
  const record: ProviderOperatorAutopilotLifecycleRecord = {
    action_instance_id: pendingAction.action_instance_id,
    kind: 'local_rollout',
    issue_id: pendingAction.issue_id,
    issue_identifier: pendingAction.issue_identifier,
    state,
    actor,
    reason,
    recorded_at: isoTimestamp(),
    source: 'co-status'
  };
  const store = await appendProviderOperatorAutopilotLifecycleRecord(
    lifecyclePath,
    record
  );
  const payload = {
    status: 'recorded',
    lifecycle_path: lifecyclePath,
    state,
    action: actionName,
    record,
    record_count: store.records.length,
    pending_action: pendingAction
  };
  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(
    `Recorded ${state} lifecycle for ${pendingAction.issue_identifier ?? pendingAction.issue_id} (${pendingAction.action_instance_id}).`
  );
  console.log(`Lifecycle path: ${lifecyclePath}`);
}

function selectPendingLocalRolloutAction(input: {
  pendingActions: ControlProviderOperatorAutopilotPendingActionPayload[];
  selector: string;
  selectorKind: 'action-id' | 'issue';
}): ControlProviderOperatorAutopilotPendingActionPayload {
  const selector = input.selector.trim();
  const normalizedSelector = selector.toLowerCase();
  const matches = input.pendingActions.filter((pendingAction) => {
    if (input.selectorKind === 'action-id') {
      return pendingAction.action_instance_id === selector;
    }
    return (
      pendingAction.issue_id === selector ||
      pendingAction.issue_identifier?.toLowerCase() === normalizedSelector
    );
  });
  if (matches.length === 0) {
    throw new Error(`No pending local rollout action matched ${selector}.`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple pending local rollout actions matched ${selector}; retry with --action-id.`
    );
  }
  return matches[0]!;
}

function readLifecyclePath(
  operatorAutopilot: ControlProviderWorkflowPayload['operator_autopilot'] | null
): string | null {
  const lifecyclePath = operatorAutopilot?.lifecycle_path;
  return typeof lifecyclePath === 'string' && lifecyclePath.trim().length > 0
    ? lifecyclePath
    : null;
}

function isLifecycleCommand(value: unknown): value is LifecycleCommand {
  return value === 'acknowledge' || value === 'clear' || value === 'dismiss';
}

function mapLifecycleCommand(
  command: LifecycleCommand
): ProviderOperatorAutopilotLifecycleState {
  if (command === 'acknowledge') {
    return 'acknowledged';
  }
  return command === 'clear' ? 'cleared' : 'dismissed';
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  return normalizeOptionalString(flags[key]);
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
