import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { ControlPollingHealthPayload } from './providerPollingHealth.js';
import type { ProviderIntakeSummaryPayload } from './providerIntakeState.js';
import type { QuestionUrgency } from './questions.js';
import type { ProviderLinearWorkerProof } from '../providerLinearWorkerRunner.js';
import type {
  ControlProviderDebugSnapshot,
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
  reason: string;
  summary: string;
  action_required_reasons: string[];
}

export interface ControlProviderOperatorAutopilotPendingActionPayload {
  kind: 'local_rollout';
  issue_id: string;
  issue_identifier: string | null;
  summary: string;
  merge_closeout_reason: string;
  shared_root_status: string | null;
  linear_transition_status: string | null;
}

export interface ControlProviderOperatorAutopilotLastResultPayload {
  recorded_at: string;
  status: 'disabled' | 'noop' | 'acted' | 'failed';
  summary: string;
  error: string | null;
  actions: ControlProviderOperatorAutopilotActionPayload[];
  holds: ControlProviderOperatorAutopilotHoldPayload[];
  pending_actions: ControlProviderOperatorAutopilotPendingActionPayload[];
}

export interface ControlProviderOperatorAutopilotPayload {
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
  audit_path: string;
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
  question_summary: ControlQuestionSummaryPayload;
  tracked: ControlTrackedPayload;
  provider_linear_worker_proof?: ProviderLinearWorkerProof;
  provider_debug_snapshot?: ControlProviderDebugSnapshot | null;
}

export interface ControlTokenUsagePayload {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
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
  session_id: string | null;
  turn_count: number | null;
  last_event: string | null;
  last_message: string | null;
  display_event?: string | null;
  event_source?: string | null;
  message_recorded_at?: string | null;
  source_updated_at?: string | null;
  event_candidates?: ProviderLinearWorkerProgressCandidate[];
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
  thread_id?: string | null;
  turn_count?: number | null;
  workspace_path: string | null;
  attempt: number | null;
  due_at: string | null;
  error: string | null;
  last_event: string | null;
  last_message: string | null;
  started_at: string | null;
  last_event_at: string | null;
}

export interface ControlStatePayload {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  running: ControlRunningPayload[];
  retrying: ControlRetryPayload[];
  codex_totals: ControlCodexTotalsPayload;
  rate_limits: Record<string, unknown> | null;
  selected: ControlSelectedRunPayload | null;
  dispatch_pilot?: ControlDispatchPilotPayload;
  tracked?: ControlTrackedPayload;
  provider_intake?: ProviderIntakeSummaryPayload;
  provider_workflow?: ControlProviderWorkflowPayload;
  polling?: ControlPollingHealthPayload | null;
}

export interface ControlSelectedRunRuntimeSnapshot {
  selected: SelectedRunContext | null;
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
  providerIntake?: ProviderIntakeSummaryPayload | null;
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
  providerWorkflow?: ControlProviderWorkflowPayload | null;
  polling?: ControlPollingHealthPayload | null;
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

export function resolveProviderWorkerHost(input: {
  providerLinearWorkerProof?: ProviderLinearWorkerProof | null | undefined;
  providerDebugSnapshot?: ControlProviderDebugSnapshot | null | undefined;
  providerIntake?: ProviderIntakeSummaryPayload | null | undefined;
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
  return normalizeProviderWorkerHostName(input.providerIntake?.worker_host);
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

export function buildSelectedRunRuntimeFingerprintInput(
  snapshot: ControlSelectedRunRuntimeSnapshot
): Record<string, unknown> | null {
  const selected = snapshot.selected ?? null;
  const dispatchPilot = snapshot.dispatchPilot ?? null;
  const trackedLinear = selected?.tracked?.linear ?? snapshot.tracked?.linear ?? null;
  const providerIntake = snapshot.providerIntake ?? null;
  const providerWorkflow = snapshot.providerWorkflow ?? null;
  const questionSummary = selected?.questionSummary ?? null;
  if (!selected && !trackedLinear && !dispatchPilot && !questionSummary && !providerIntake && !providerWorkflow) {
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
    provider_intake: providerIntake
      ? {
          issue_identifier: providerIntake.issue_identifier,
          task_id: providerIntake.task_id,
          state: providerIntake.state,
          reason: providerIntake.reason,
          run_id: providerIntake.run_id,
          freshness: providerIntake.freshness,
          rehydrated_at: providerIntake.rehydrated_at
        }
      : null,
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
                    providerWorkflow.operator_autopilot.backlog_promotion.target_state_name
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
                  summary: providerWorkflow.operator_autopilot.post_merge_rollout.summary
                },
                audit_path: providerWorkflow.operator_autopilot.audit_path,
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
                          error: action.transition.error
                        },
                        action_required_reasons: [...action.action_required_reasons]
                      })),
                      holds: providerWorkflow.operator_autopilot.last_result.holds.map((hold) => ({
                        kind: hold.kind,
                        issue_id: hold.issue_id,
                        issue_identifier: hold.issue_identifier,
                        reason: hold.reason,
                        summary: hold.summary,
                        action_required_reasons: [...hold.action_required_reasons]
                      })),
                      pending_actions:
                        providerWorkflow.operator_autopilot.last_result.pending_actions.map(
                          (pendingAction) => ({
                            kind: pendingAction.kind,
                            issue_id: pendingAction.issue_id,
                            issue_identifier: pendingAction.issue_identifier,
                            summary: pendingAction.summary,
                            merge_closeout_reason: pendingAction.merge_closeout_reason,
                            shared_root_status: pendingAction.shared_root_status,
                            linear_transition_status: pendingAction.linear_transition_status
                          })
                        )
                    }
                  : null
              }
            : null
        }
      : null
  };
}
