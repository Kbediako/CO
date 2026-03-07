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

function buildProjectionSelectedPayload(selected: SharedSelectedProjectionFields): ControlSelectedRunPayload {
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

export function buildCompatibilityRunningEntry(selected: ControlCompatibilitySourceContext): ControlRunningPayload {
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    state: selected.rawStatus,
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    session_id: selected.runId,
    turn_count: 0,
    last_event: selected.latestEvent?.event ?? selected.latestAction ?? selected.rawStatus,
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

export function buildCompatibilityRetryEntry(selected: ControlCompatibilitySourceContext): ControlRetryPayload {
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    state: selected.rawStatus,
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    session_id: selected.runId,
    attempt: 0,
    last_event: selected.latestEvent?.event ?? selected.latestAction ?? selected.rawStatus,
    last_message: selected.latestEvent?.message ?? selected.summary,
    started_at: selected.startedAt,
    last_event_at: selected.latestEvent?.at ?? selected.updatedAt
  };
}

export function buildCompatibilityProjectionSnapshot(
  snapshot: ControlCompatibilityRuntimeSnapshot
): ControlCompatibilityProjectionSnapshot {
  const issuesByIdentifier = new Map<
    string,
    {
      issueIdentifier: string;
      selectedSource: ControlCompatibilitySourceContext | null;
      runningSource: ControlCompatibilitySourceContext | null;
      retrySource: ControlCompatibilitySourceContext | null;
      aliases: Set<string>;
      dispatchPilotSummary: ControlDispatchPilotPayload | null;
    }
  >();
  const issueOrder: string[] = [];
  const runningOrder: string[] = [];
  const retryOrder: string[] = [];

  const registerIssue = (
    source: ControlCompatibilitySourceContext | null,
    input: {
      kind?: 'selected' | 'running' | 'retry';
      dispatchPilotSummary?: ControlDispatchPilotPayload | null;
    } = {}
  ): void => {
    if (!source) {
      return;
    }

    const existing =
      issuesByIdentifier.get(source.issueIdentifier) ??
      {
        issueIdentifier: source.issueIdentifier,
        selectedSource: null,
        runningSource: null,
        retrySource: null,
        aliases: new Set<string>(),
        dispatchPilotSummary: null
      };
    if (!issuesByIdentifier.has(source.issueIdentifier)) {
      issueOrder.push(source.issueIdentifier);
    }

    if (input.kind === 'selected') {
      existing.selectedSource ??= source;
    }
    if (input.kind === 'running') {
      const shouldAppend = !existing.runningSource;
      existing.runningSource = pickPreferredCompatibilitySource(existing.runningSource, source);
      if (shouldAppend) {
        runningOrder.push(source.issueIdentifier);
      }
    }
    if (input.kind === 'retry') {
      const shouldAppend = !existing.retrySource;
      existing.retrySource = pickPreferredCompatibilitySource(existing.retrySource, source);
      if (shouldAppend) {
        retryOrder.push(source.issueIdentifier);
      }
    }
    existing.dispatchPilotSummary ??= input.dispatchPilotSummary ?? null;
    for (const alias of buildCompatibilityIssueAliases(source)) {
      existing.aliases.add(alias);
    }
    issuesByIdentifier.set(source.issueIdentifier, existing);
  };

  registerIssue(snapshot.selected, {
    kind: 'selected',
    dispatchPilotSummary: snapshot.dispatchPilot
  });
  snapshot.running.forEach((entry) => {
    registerIssue(entry, {
      kind: 'running'
    });
  });
  snapshot.retrying.forEach((entry) => {
    registerIssue(entry, {
      kind: 'retry'
    });
  });

  const running = runningOrder.flatMap((issueIdentifier) => {
    const source = issuesByIdentifier.get(issueIdentifier)?.runningSource;
    return source ? [buildCompatibilityRunningEntry(source)] : [];
  });
  const retrying = retryOrder.flatMap((issueIdentifier) => {
    const source = issuesByIdentifier.get(issueIdentifier)?.retrySource;
    return source ? [buildCompatibilityRetryEntry(source)] : [];
  });
  const runningByIssue = new Map(running.map((entry) => [entry.issue_identifier, entry] as const));
  const retryingByIssue = new Map(retrying.map((entry) => [entry.issue_identifier, entry] as const));
  const selectedPayload = snapshot.selected ? buildProjectionSelectedPayload(snapshot.selected) : null;
  const issues = issueOrder
    .map((issueIdentifier) => {
      const issue = issuesByIdentifier.get(issueIdentifier);
      if (!issue) {
        return null;
      }
      const preferredSource = issue.runningSource ?? issue.retrySource ?? issue.selectedSource;
      if (!preferredSource) {
        return null;
      }
      return {
        issueIdentifier: preferredSource.issueIdentifier,
        aliases: Array.from(issue.aliases),
        payload: buildCompatibilityIssuePayload({
          source: preferredSource,
          running: runningByIssue.get(issue.issueIdentifier) ?? null,
          retry: retryingByIssue.get(issue.issueIdentifier) ?? null,
          dispatchPilotSummary: issue.dispatchPilotSummary
        })
      };
    })
    .filter((issue): issue is CompatibilityProjectionIssueRecord => issue !== null);

  return {
    running,
    retrying,
    issues,
    selected: selectedPayload,
    dispatchPilot: snapshot.dispatchPilot,
    tracked: snapshot.tracked
  };
}

export function findCompatibilityProjectionIssueRecord(
  projection: ControlCompatibilityProjectionSnapshot,
  issueIdentifier: string
): CompatibilityProjectionIssueRecord | null {
  for (const issue of projection.issues) {
    if (issue.issueIdentifier === issueIdentifier) {
      return issue;
    }
  }
  for (const issue of projection.issues) {
    if (issue.aliases.includes(issueIdentifier)) {
      return issue;
    }
  }
  return null;
}

export function buildCompatibilityIssuePayload(input: {
  source: ControlCompatibilitySourceContext;
  running: ControlRunningPayload | null;
  retry: ControlRetryPayload | null;
  dispatchPilotSummary: ControlDispatchPilotPayload | null;
}): ControlIssuePayload {
  const selectedPayload = buildProjectionSelectedPayload(input.source);
  const latestEvent = buildSelectedRunLatestEventPayload(input.source.latestEvent);
  const recentEvents = latestEvent ? [latestEvent] : [];

  return {
    issue_identifier: input.source.issueIdentifier,
    issue_id: input.source.issueId,
    status: input.source.rawStatus,
    raw_status: input.source.rawStatus,
    display_status: input.source.displayStatus,
    status_reason: input.source.statusReason,
    workspace: {
      path: input.source.workspacePath
    },
    attempts: {
      restart_count: 0,
      current_retry_attempt: 0
    },
    running: input.running,
    retry: input.retry,
    logs: {
      codex_session_logs: []
    },
    summary: input.source.summary,
    latest_event: latestEvent,
    question_summary: selectedPayload.question_summary,
    recent_events: recentEvents,
    last_error: input.source.lastError,
    tracked: input.source.tracked ?? {},
    ...(input.dispatchPilotSummary ? { dispatch_pilot: input.dispatchPilotSummary } : {})
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

function buildCompatibilityIssueAliases(selected: ControlCompatibilitySourceContext): string[] {
  const aliases = new Set<string>();
  const candidates =
    selected.lookupAliases.length > 0
      ? selected.lookupAliases
      : [selected.issueIdentifier, selected.issueId, selected.taskId, selected.runId];
  for (const candidate of candidates) {
    if (candidate) {
      aliases.add(candidate);
    }
  }
  return Array.from(aliases);
}

function pickPreferredCompatibilitySource(
  current: ControlCompatibilitySourceContext | null,
  candidate: ControlCompatibilitySourceContext
): ControlCompatibilitySourceContext {
  if (!current) {
    return candidate;
  }
  return compareCompatibilitySourcePriority(candidate, current) > 0 ? candidate : current;
}

function compareCompatibilitySourcePriority(
  left: ControlCompatibilitySourceContext,
  right: ControlCompatibilitySourceContext
): number {
  const timestampComparison =
    compareIsoTimestamp(left.latestEvent?.at, right.latestEvent?.at) ||
    compareIsoTimestamp(left.updatedAt, right.updatedAt) ||
    compareIsoTimestamp(left.startedAt, right.startedAt) ||
    compareIsoTimestamp(left.completedAt, right.completedAt);
  if (timestampComparison !== 0) {
    return timestampComparison;
  }
  return (
    compareLexical(left.runId, right.runId) ||
    compareLexical(left.taskId, right.taskId) ||
    compareLexical(left.issueIdentifier, right.issueIdentifier)
  );
}

function compareIsoTimestamp(left: string | null | undefined, right: string | null | undefined): number {
  const leftValue = parseTimestamp(left);
  const rightValue = parseTimestamp(right);
  if (leftValue === rightValue) {
    return 0;
  }
  return leftValue > rightValue ? 1 : -1;
}

function parseTimestamp(value: string | null | undefined): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function compareLexical(left: string | null | undefined, right: string | null | undefined): number {
  const normalizedLeft = left ?? '';
  const normalizedRight = right ?? '';
  if (normalizedLeft === normalizedRight) {
    return 0;
  }
  return normalizedLeft.localeCompare(normalizedRight);
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
