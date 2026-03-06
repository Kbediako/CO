import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { QuestionUrgency } from './questions.js';

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
  linear: ControlTrackedLinearPayload;
}

export interface ControlDispatchPilotPayload {
  status?: string | null;
  source_status?: string | null;
  reason?: string | null;
}

export interface SelectedRunContext {
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
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
  workspacePath: string;
  questionSummary: SelectedRunQuestionSummary;
  tracked: ControlTrackedPayload | null;
}

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
    path: string;
  };
  question_summary: ControlQuestionSummaryPayload;
  tracked?: ControlTrackedPayload;
}

export interface ControlRunningPayload {
  issue_id: string | null;
  issue_identifier: string;
  state: string;
  display_state: string;
  status_reason: string | null;
  session_id: string | null;
  turn_count: number;
  last_event: string | null;
  last_message: string | null;
  started_at: string | null;
  last_event_at: string | null;
  tokens: {
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
  };
}

export interface ControlStatePayload {
  generated_at: string;
  counts: {
    running: number;
    retrying: number;
  };
  running: ControlRunningPayload[];
  retrying: unknown[];
  codex_totals: null;
  rate_limits: null;
  selected: ControlSelectedRunPayload | null;
  dispatch_pilot?: ControlDispatchPilotPayload;
  tracked?: ControlTrackedPayload;
}

export interface ControlSelectedRunReadModel {
  selected: ControlSelectedRunPayload | null;
  dispatch_pilot?: ControlDispatchPilotPayload;
  tracked?: ControlTrackedPayload;
}

export interface ControlIssuePayload {
  issue_identifier: string;
  issue_id: string | null;
  status: string;
  raw_status: string;
  display_status: string;
  status_reason: string | null;
  workspace: {
    path: string;
  };
  attempts: {
    restart_count: number;
    current_retry_attempt: number;
  };
  running: ControlRunningPayload;
  retry: null;
  logs: {
    codex_session_logs: unknown[];
  };
  summary: string | null;
  latest_event: Pick<ControlLatestEventPayload, 'at' | 'event' | 'message'> | null;
  question_summary: ControlQuestionSummaryPayload;
  recent_events: Array<Pick<ControlLatestEventPayload, 'at' | 'event' | 'message'>>;
  last_error: string | null;
  tracked: ControlTrackedPayload | Record<string, never>;
  dispatch_pilot?: ControlDispatchPilotPayload;
}

export interface UiSelectedRunSharedFields {
  raw_status: string;
  display_status: string;
  status_reason: string | null;
  question_summary: ControlQuestionSummaryPayload;
  tracked?: ControlTrackedPayload;
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
    ...(options.includeRequestMetadata
      ? {
          requested_by: latestEvent.requestedBy,
          reason: latestEvent.reason
        }
      : {})
  };
}

export function buildSelectedRunPublicPayload(selected: SelectedRunContext): ControlSelectedRunPayload {
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
    question_summary: buildSelectedRunQuestionSummaryPayload(selected.questionSummary),
    ...(selected.tracked ? { tracked: selected.tracked } : {})
  };
}

export function buildCompatibilityRunningEntry(selected: SelectedRunContext): ControlRunningPayload {
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    state: selected.rawStatus,
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    session_id: selected.runId,
    turn_count: 0,
    last_event: selected.latestEvent?.event ?? selected.latestAction,
    last_message: selected.latestEvent?.message ?? selected.summary,
    started_at: selected.startedAt,
    last_event_at: selected.latestEvent?.at ?? selected.updatedAt,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    }
  };
}

export function buildUiSelectedRunSharedFields(selected: SelectedRunContext): UiSelectedRunSharedFields {
  return {
    raw_status: selected.rawStatus,
    display_status: selected.displayStatus,
    status_reason: selected.statusReason,
    question_summary: buildSelectedRunQuestionSummaryPayload(selected.questionSummary),
    ...(selected.tracked ? { tracked: selected.tracked } : {})
  };
}

export function buildSelectedRunReadModel(input: {
  selected: SelectedRunContext | null;
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
}): ControlSelectedRunReadModel {
  return {
    selected: input.selected ? buildSelectedRunPublicPayload(input.selected) : null,
    ...(input.dispatchPilot ? { dispatch_pilot: input.dispatchPilot } : {}),
    ...(input.tracked ? { tracked: input.tracked } : {})
  };
}

export function buildSelectedRunReadModelFingerprintInput(
  payload: ControlSelectedRunReadModel
): Record<string, unknown> | null {
  const selected = payload.selected ?? null;
  const dispatchPilot = payload.dispatch_pilot ?? null;
  const trackedLinear = selected?.tracked?.linear ?? payload.tracked?.linear ?? null;
  const questionSummary = selected?.question_summary ?? null;
  if (!selected && !trackedLinear && !dispatchPilot && !questionSummary) {
    return null;
  }
  return {
    selected: selected
      ? {
          issue_identifier: selected.issue_identifier,
          run_id: selected.run_id,
          raw_status: selected.raw_status,
          display_status: selected.display_status,
          status_reason: selected.status_reason,
          summary: selected.summary,
          latest_event: selected.latest_event
            ? {
                event: selected.latest_event.event,
                message: selected.latest_event.message,
                at: selected.latest_event.at
              }
            : null,
          question_summary: questionSummary
            ? {
                queued_count: questionSummary.queued_count,
                latest_question_id: questionSummary.latest_question?.question_id ?? null,
                latest_question_prompt: questionSummary.latest_question?.prompt ?? null,
                latest_question_urgency: questionSummary.latest_question?.urgency ?? null
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
      : null
  };
}
