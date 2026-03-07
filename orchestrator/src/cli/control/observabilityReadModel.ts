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

interface SharedSelectedProjectionFields {
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
  workspacePath: string;
  questionSummary: SelectedRunQuestionSummary;
  tracked: ControlTrackedPayload | null;
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

export interface ControlRetryPayload {
  issue_id: string | null;
  issue_identifier: string;
  state: string;
  display_state: string;
  status_reason: string | null;
  session_id: string | null;
  attempt: number | null;
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
  codex_totals: null;
  rate_limits: null;
  selected: ControlSelectedRunPayload | null;
  dispatch_pilot?: ControlDispatchPilotPayload;
  tracked?: ControlTrackedPayload;
}

export interface ControlSelectedRunRuntimeSnapshot {
  selected: SelectedRunContext | null;
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
}

export interface ControlCompatibilitySourceContext extends SharedSelectedProjectionFields {}

export interface ControlCompatibilityRuntimeSnapshot {
  selected: ControlCompatibilitySourceContext | null;
  running: ControlCompatibilitySourceContext[];
  retrying: ControlCompatibilitySourceContext[];
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
}

export interface CompatibilityProjectionIssueRecord {
  issueIdentifier: string;
  aliases: string[];
  payload: ControlIssuePayload;
}

export interface ControlCompatibilityProjectionSnapshot {
  running: ControlRunningPayload[];
  retrying: ControlRetryPayload[];
  issues: CompatibilityProjectionIssueRecord[];
  selected: ControlSelectedRunPayload | null;
  dispatchPilot: ControlDispatchPilotPayload | null;
  tracked: ControlTrackedPayload | null;
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
  return buildProjectionSelectedPayload(selected);
}

export function buildProjectionSelectedPayload(
  selected: SelectedRunContext | ControlCompatibilitySourceContext
): ControlSelectedRunPayload {
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

export function buildUiSelectedRunSharedFields(selected: SelectedRunContext): UiSelectedRunSharedFields {
  return {
    raw_status: selected.rawStatus,
    display_status: selected.displayStatus,
    status_reason: selected.statusReason,
    question_summary: buildSelectedRunQuestionSummaryPayload(selected.questionSummary),
    ...(selected.tracked ? { tracked: selected.tracked } : {})
  };
}

export function buildSelectedRunRuntimeFingerprintInput(
  snapshot: ControlSelectedRunRuntimeSnapshot
): Record<string, unknown> | null {
  const selected = snapshot.selected ?? null;
  const dispatchPilot = snapshot.dispatchPilot ?? null;
  const trackedLinear = selected?.tracked?.linear ?? snapshot.tracked?.linear ?? null;
  const questionSummary = selected?.questionSummary ?? null;
  if (!selected && !trackedLinear && !dispatchPilot && !questionSummary) {
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
      : null
  };
}
