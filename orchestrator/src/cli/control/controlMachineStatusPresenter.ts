import { hostname } from 'node:os';

import type {
  OperatorDashboardIssuePayload,
  OperatorDashboardRetryPayload,
  OperatorDashboardSessionPayload
} from './operatorDashboardPresenter.js';
import type {
  ControlPollingHealthPayload,
  ControlProviderIntakeUnavailablePayload,
  ControlProviderWorkflowPayload
} from './observabilityReadModel.js';
import type {
  ProviderIntakeClaimRecord,
  ProviderIntakeSummaryPayload
} from './providerIntakeState.js';
import { isoTimestamp } from '../utils/time.js';

const LOCAL_HOSTNAME = hostname();

export interface ControlMachineStatusSnapshot {
  providerIntake?: ProviderIntakeSummaryPayload | null;
  runningClaims?: ProviderIntakeClaimRecord[];
  providerIntakeUnavailable?: ControlProviderIntakeUnavailablePayload | null;
  providerWorkflow?: ControlProviderWorkflowPayload | null;
  polling?: ControlPollingHealthPayload | null;
  maxConcurrentAgents?: number | null;
}

export interface ControlMachineStatusDataset {
  generated_at: string;
  mode: 'control_machine_status';
  read_only: true;
  host: string;
  counts: {
    running: number;
    retrying: number;
    issues: number;
    max_allowed?: number | null;
  };
  polling: ControlPollingHealthPayload | null;
  running: OperatorDashboardSessionPayload[];
  retrying: OperatorDashboardRetryPayload[];
  issues: OperatorDashboardIssuePayload[];
  provider_intake?: ProviderIntakeSummaryPayload | null;
  provider_intake_unavailable?: ControlProviderIntakeUnavailablePayload;
  provider_workflow?: ControlProviderWorkflowPayload;
}

export interface ControlMachineStatusPresenterContext {
  readMachineStatus(): Promise<ControlMachineStatusSnapshot>;
}

export async function readMachineStatusDataset(
  context: ControlMachineStatusPresenterContext
): Promise<ControlMachineStatusDataset> {
  return buildMachineStatusDataset(await context.readMachineStatus());
}

export function buildMachineStatusDataset(
  input: ControlMachineStatusSnapshot & { generatedAt?: string }
): ControlMachineStatusDataset {
  const providerIntake = input.providerIntake ?? null;
  const running = (input.runningClaims ?? [])
    .slice()
    .sort(compareProviderIntakeClaimsForStatus)
    .map(buildRunningSessionFromProviderIntakeClaim);
  return {
    generated_at: input.generatedAt ?? isoTimestamp(),
    mode: 'control_machine_status',
    read_only: true,
    host: LOCAL_HOSTNAME,
    counts: {
      running: providerIntake?.running_claim_count ?? running.length,
      retrying: providerIntake?.selected_claim.retry?.active === true ? 1 : 0,
      issues: providerIntake?.active_claim_count ?? running.length,
      max_allowed: input.maxConcurrentAgents ?? null
    },
    polling: input.polling ?? null,
    running,
    retrying: [],
    issues: [],
    ...(providerIntake !== null ? { provider_intake: providerIntake } : {}),
    ...(input.providerIntakeUnavailable
      ? { provider_intake_unavailable: input.providerIntakeUnavailable }
      : {}),
    ...(input.providerWorkflow ? { provider_workflow: input.providerWorkflow } : {})
  };
}

function compareProviderIntakeClaimsForStatus(
  left: ProviderIntakeClaimRecord,
  right: ProviderIntakeClaimRecord
): number {
  return (
    left.issue_identifier.localeCompare(right.issue_identifier) ||
    left.task_id.localeCompare(right.task_id) ||
    (left.run_id ?? '').localeCompare(right.run_id ?? '') ||
    compareIsoTimestamps(left.updated_at, right.updated_at)
  );
}

function compareIsoTimestamps(left: string, right: string): number {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  const normalizedLeft = Number.isFinite(leftMs) ? leftMs : 0;
  const normalizedRight = Number.isFinite(rightMs) ? rightMs : 0;
  return normalizedLeft - normalizedRight;
}

function buildRunningSessionFromProviderIntakeClaim(
  claim: ProviderIntakeClaimRecord
): OperatorDashboardSessionPayload {
  return {
    issue_identifier: claim.issue_identifier,
    issue_id: claim.issue_id,
    id: claim.issue_identifier,
    bucket: 'running',
    state: claim.state,
    reason: claim.reason,
    task_id: claim.task_id,
    run_id: claim.run_id,
    summary: claim.issue_title,
    display_state: claim.issue_state ?? claim.state,
    status_reason: claim.reason,
    pid: null,
    session_id: claim.run_id,
    thread_id: null,
    turn_count: null,
    workspace_path: null,
    host: LOCAL_HOSTNAME,
    worker_host: claim.worker_host ?? null,
    last_event: claim.last_event,
    last_message: null,
    started_at: claim.launch_started_at ?? claim.accepted_at,
    last_event_at: claim.updated_at,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    }
  };
}
