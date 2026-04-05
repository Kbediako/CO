import type {
  CompatibilityProjectionIssueRecord,
  ControlCompatibilityProjectionSnapshot,
  ControlCompatibilityRuntimeSnapshot,
  ControlCompatibilitySourceContext,
  ControlDispatchPilotPayload,
  ControlIssuePayload,
  ControlRetryPayload,
  ControlRunningPayload
} from './observabilityReadModel.js';
import {
  buildProjectionSelectedPayload,
  buildTrackedPayloadEnvelope,
  buildSelectedRunLatestEventPayload
} from './observabilityReadModel.js';

export interface CompatibilityIssueSourceRecord {
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
  lookupAliases: string[];
  updatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latestEvent: {
    at: string | null;
  } | null;
}

export interface CompatibilityIssueIndexEntry<
  TSource extends CompatibilityIssueSourceRecord,
  TDispatchPilotSummary
> {
  issueIdentifier: string;
  selectedSource: TSource | null;
  runningSource: TSource | null;
  retrySource: TSource | null;
  aliases: string[];
  dispatchPilotSummary: TDispatchPilotSummary | null;
}

export interface CompatibilityIssueIndex<
  TSource extends CompatibilityIssueSourceRecord,
  TDispatchPilotSummary
> {
  issues: Array<CompatibilityIssueIndexEntry<TSource, TDispatchPilotSummary>>;
  runningOrder: string[];
  retryOrder: string[];
}

export function buildCompatibilityProjectionSnapshot(
  snapshot: ControlCompatibilityRuntimeSnapshot
): ControlCompatibilityProjectionSnapshot {
  const index = buildCompatibilityIssueIndex({
    selected: snapshot.selected,
    running: snapshot.running,
    retrying: snapshot.retrying,
    dispatchPilot: snapshot.dispatchPilot
  });

  const issuesByIdentifier = new Map(index.issues.map((issue) => [issue.issueIdentifier, issue] as const));
  const running = index.runningOrder.flatMap((issueIdentifier) => {
    const source = issuesByIdentifier.get(issueIdentifier)?.runningSource;
    return source ? [buildCompatibilityRunningEntry(source)] : [];
  });
  const retrying = index.retryOrder.flatMap((issueIdentifier) => {
    const source = issuesByIdentifier.get(issueIdentifier)?.retrySource;
    return source ? [buildCompatibilityRetryEntry(source)] : [];
  });
  const runningByIssue = new Map(running.map((entry) => [entry.issue_identifier, entry] as const));
  const retryingByIssue = new Map(retrying.map((entry) => [entry.issue_identifier, entry] as const));
  const selectedPayload = snapshot.selected ? buildProjectionSelectedPayload(snapshot.selected) : null;
  const issues = index.issues
    .map((issue) => {
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
    codexTotals: snapshot.codexTotals,
    rateLimits: snapshot.rateLimits,
    issues,
    selected: selectedPayload,
    dispatchPilot: snapshot.dispatchPilot,
    tracked: snapshot.tracked,
    providerIntake: snapshot.providerIntake,
    providerWorkflow: snapshot.providerWorkflow,
    polling: snapshot.polling
  };
}

export function findCompatibilityProjectionIssueRecord(
  projection: ControlCompatibilityProjectionSnapshot,
  issueIdentifier: string
): CompatibilityProjectionIssueRecord | null {
  return findCompatibilityIssueLike(projection.issues, issueIdentifier);
}

export function buildCompatibilityIssueIndex<
  TSource extends CompatibilityIssueSourceRecord,
  TDispatchPilotSummary
>(snapshot: {
  selected: TSource | null;
  running: TSource[];
  retrying: TSource[];
  dispatchPilot: TDispatchPilotSummary | null;
}): CompatibilityIssueIndex<TSource, TDispatchPilotSummary> {
  const issuesByIdentifier = new Map<
    string,
    {
      issueIdentifier: string;
      selectedSource: TSource | null;
      runningSource: TSource | null;
      retrySource: TSource | null;
      aliases: Set<string>;
      dispatchPilotSummary: TDispatchPilotSummary | null;
    }
  >();
  const issueOrder: string[] = [];
  const runningOrder: string[] = [];
  const retryOrder: string[] = [];

  const registerIssue = (
    source: TSource | null,
    input: {
      kind?: 'selected' | 'running' | 'retry';
      dispatchPilotSummary?: TDispatchPilotSummary | null;
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
    registerIssue(entry, { kind: 'running' });
  });
  snapshot.retrying.forEach((entry) => {
    registerIssue(entry, { kind: 'retry' });
  });

  return {
    issues: issueOrder.flatMap((issueIdentifier) => {
      const issue = issuesByIdentifier.get(issueIdentifier);
      return issue
        ? [
            {
              issueIdentifier: issue.issueIdentifier,
              selectedSource: issue.selectedSource,
              runningSource: issue.runningSource,
              retrySource: issue.retrySource,
              aliases: Array.from(issue.aliases),
              dispatchPilotSummary: issue.dispatchPilotSummary
            }
          ]
        : [];
    }),
    runningOrder,
    retryOrder
  };
}

export function findCompatibilityIssueLike<TIssue extends { issueIdentifier: string; aliases: string[] }>(
  issues: TIssue[],
  issueIdentifier: string
): TIssue | null {
  for (const issue of issues) {
    if (issue.issueIdentifier === issueIdentifier) {
      return issue;
    }
  }
  for (const issue of issues) {
    if (issue.aliases.includes(issueIdentifier)) {
      return issue;
    }
  }
  return null;
}

export function buildCompatibilityRunningEntry(
  selected: ControlCompatibilitySourceContext
): ControlRunningPayload {
  const proof = selected.providerLinearWorkerProof ?? null;
  const runningEvent = selectRunningEvent({
    latestEvent: selected.latestEvent?.event ?? null,
    latestMessage: selected.latestEvent?.message ?? null,
    latestAction: selected.latestAction ?? null,
    rawStatus: selected.rawStatus,
    proofEvent: proof?.last_event ?? null,
    proofMessage: proof?.last_message ?? null
  });
  const preferProofTelemetry = runningEvent.source === 'proof';
  const runningMessage = preferProofTelemetry
    ? proof?.last_message ?? selected.latestEvent?.message ?? selected.summary
    : selected.latestEvent?.message ?? proof?.last_message ?? selected.summary;
  const runningEventAt = preferProofTelemetry
    ? proof?.last_event_at ?? selected.latestEvent?.at ?? selected.updatedAt
    : selected.latestEvent?.at ?? proof?.last_event_at ?? selected.updatedAt;
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    state: resolveCompatibilityRunningState(selected),
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    pid: selected.providerLinearWorkerProof?.pid ?? null,
    session_id: proof?.latest_session_id ?? null,
    turn_count: proof?.turn_count ?? null,
    last_event: runningEvent.event,
    last_message: runningMessage,
    started_at: selected.startedAt,
    last_event_at: runningEventAt,
    tokens: proof?.tokens ?? buildEmptyTokenUsage()
  };
}

export function buildCompatibilityRetryEntry(selected: ControlCompatibilitySourceContext): ControlRetryPayload {
  const retryState = selected.providerRetryState ?? null;
  const proof = selected.providerLinearWorkerProof ?? null;
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    task_id: selected.taskId,
    run_id: selected.runId,
    state: selected.rawStatus,
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    session_id: proof?.latest_session_id ?? null,
    thread_id: proof?.thread_id ?? null,
    turn_count: proof?.turn_count ?? null,
    workspace_path: selected.workspacePath,
    attempt: retryState?.attempt ?? null,
    due_at: retryState?.due_at ?? null,
    error: retryState?.error ?? selected.lastError,
    last_event: selected.latestEvent?.event ?? selected.latestAction ?? selected.rawStatus,
    last_message: selected.latestEvent?.message ?? selected.summary,
    started_at: selected.startedAt,
    last_event_at: selected.latestEvent?.at ?? selected.updatedAt
  };
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
    task_id: input.source.taskId,
    run_id: input.source.runId,
    status: resolveCompatibilityIssueStatus(input.running, input.retry, input.source),
    raw_status: input.source.rawStatus,
    display_status: input.source.displayStatus,
    status_reason: input.source.statusReason,
    workspace: {
      path: input.source.workspacePath ?? input.source.providerLinearWorkerProof?.workspace_path ?? null
    },
    attempts: buildCompatibilityIssueAttempts(input.source, input.retry),
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
    tracked: buildTrackedPayloadEnvelope(input.source.tracked),
    ...(input.source.providerLinearWorkerProof
      ? { provider_linear_worker_proof: input.source.providerLinearWorkerProof }
      : {}),
    ...(input.dispatchPilotSummary ? { dispatch_pilot: input.dispatchPilotSummary } : {})
  };
}

function buildCompatibilityIssueAttempts(
  source: ControlCompatibilitySourceContext,
  retry: ControlRetryPayload | null
): ControlIssuePayload['attempts'] {
  const attempt = retry?.attempt ?? source.providerRetryState?.attempt ?? null;
  if (attempt === null || attempt === undefined) {
    return {
      restart_count: null,
      current_retry_attempt: null
    };
  }
  return {
    restart_count: Math.max(attempt - 1, 0),
    current_retry_attempt: attempt
  };
}

function buildEmptyTokenUsage(): ControlRunningPayload['tokens'] {
  return {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null
  };
}

function selectRunningEvent(input: {
  latestEvent: string | null;
  latestMessage: string | null;
  latestAction: string | null;
  rawStatus: string;
  proofEvent: string | null;
  proofMessage: string | null;
}): { event: string; source: 'proof' | 'latest' | 'fallback' } {
  const latestEventKey = normalizeCompatibilityEventKey(input.latestEvent);
  const genericFallbacks = new Set(
    [
      input.rawStatus,
      input.latestAction === 'pause' ? null : input.latestAction,
      'in_progress',
      'running',
      'resuming',
      'started',
      'message',
      'notification',
      'item.started',
      'item.completed',
      'item.updated'
    ]
      .map((value) => normalizeCompatibilityEventKey(value))
      .filter((value): value is string => Boolean(value))
  );
  const preferProofTelemetry =
    Boolean(input.proofEvent || input.proofMessage) &&
    (!latestEventKey ||
      genericFallbacks.has(latestEventKey) ||
      (!normalizeCompatibilityMessage(input.latestMessage) && normalizeCompatibilityMessage(input.proofMessage)));
  if (preferProofTelemetry) {
    return {
      event: input.proofEvent ?? input.latestEvent ?? input.latestAction ?? input.rawStatus,
      source: 'proof'
    };
  }
  if (input.latestEvent) {
    return {
      event: input.latestEvent,
      source: 'latest'
    };
  }
  return {
    event: input.latestAction ?? input.rawStatus,
    source: 'fallback'
  };
}

function normalizeCompatibilityEventKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed
    .toLowerCase()
    .replace(/^codex\/event\//u, '')
    .replace(/[./]+/gu, '_')
    .replace(/[^a-z0-9_]+/gu, '_')
    .replace(/_+/gu, '_')
    .replace(/^_|_$/gu, '');
}

function normalizeCompatibilityMessage(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveCompatibilityRunningState(selected: ControlCompatibilitySourceContext): string {
  return selected.compatibilityState ?? selected.rawStatus;
}

function resolveCompatibilityIssueStatus(
  running: ControlRunningPayload | null,
  retry: ControlRetryPayload | null,
  source: ControlCompatibilitySourceContext
): string {
  if (running) {
    return 'running';
  }
  if (retry) {
    return 'retrying';
  }
  return source.rawStatus;
}

function buildCompatibilityIssueAliases<TSource extends CompatibilityIssueSourceRecord>(selected: TSource): string[] {
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

function pickPreferredCompatibilitySource<TSource extends CompatibilityIssueSourceRecord>(
  current: TSource | null,
  candidate: TSource
): TSource {
  if (!current) {
    return candidate;
  }
  return compareCompatibilitySourcePriority(candidate, current) > 0 ? candidate : current;
}

function compareCompatibilitySourcePriority<TSource extends CompatibilityIssueSourceRecord>(
  left: TSource,
  right: TSource
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
