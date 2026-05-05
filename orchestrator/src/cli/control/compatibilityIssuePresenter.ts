import type {
  CompatibilityProjectionIssueRecord,
  ControlCompatibilityProjectionSnapshot,
  ControlCompatibilityRuntimeSnapshot,
  ControlCompatibilitySourceContext,
  ControlDispatchPilotPayload,
  ControlIssuePayload,
  ControlPollingHealthPayload,
  ControlStatusFallbackExpiryMetadata,
  ControlRetryPayload,
  ControlRunningPayload
} from './observabilityReadModel.js';
import {
  buildProjectionSelectedPayload,
  readProviderLinearWorkerWorkspacePath,
  resolveProviderWorkerHost,
  buildTrackedPayloadEnvelope,
  buildSelectedRunLatestEventPayload
} from './observabilityReadModel.js';
import type { LinearBudgetStatus } from './linearBudgetState.js';
import {
  classifyProviderLinearWorkflowState,
  normalizeProviderLinearWorkflowState
} from './providerLinearWorkflowStates.js';

const PROVIDER_LINEAR_WORKER_PIPELINE_TITLE = 'Provider Linear Worker';
const PROVIDER_LINEAR_WORKER_PIPELINE_ID = 'provider-linear-worker';
const SYNTHETIC_LINEAR_TASK_ID_PATTERN =
  /^linear-[a-z0-9]+(?:-[a-z0-9]+)*$/i;
type ControlHostStatusFallbackDecisionKey =
  | 'legacyProofFields'
  | 'selectedRunProjection'
  | 'compatibilityIssueProjection'
  | 'syntheticIdentityProjection'
  | 'sourceAuthorityLabels';

const CONTROL_HOST_STATUS_FALLBACK_DECISIONS: Record<
  ControlHostStatusFallbackDecisionKey,
  ControlStatusFallbackExpiryMetadata
> = {
  legacyProofFields: {
    surface: 'control-host status surfaces',
    fallback: 'legacy proof fields projected into status output',
    decision: 'justify retaining fallback',
    owner: 'CO-398',
    trigger:
      'Retained manifests/proofs or cached provider-intake records are available while live state is missing or incomplete.',
    introduced_date: 'oldest known 2026-04-23; current review 2026-04-27',
    review_date: '2026-05-10',
    maximum_lifetime: 'Non-expiring only for audit-visible proof fields with source labels',
    removal_condition:
      'Remove or narrow once current-state authority preserves equivalent audit evidence without proof-as-status ambiguity.',
    validation: 'Focused compatibility/presenter/status tests plus CLI/API/UI projection checks.'
  },
  selectedRunProjection: {
    surface: 'control-host status surfaces',
    fallback: 'selected-run projection fallback',
    decision: 'expire fallback',
    owner: 'CO-398',
    trigger:
      'co-status or control-host output lacks a live selected claim/run and falls back to retained projection data.',
    introduced_date: 'oldest known 2026-04-23; current review 2026-04-27',
    review_date: '2026-05-10',
    maximum_lifetime: '2026-05-26',
    removal_condition:
      'Live selected claim/run state or explicit degraded-read status replaces retained selected-run fallback.',
    validation: 'selectedRunProjection tests and co-status --format json fixture coverage.'
  },
  compatibilityIssueProjection: {
    surface: 'control-host status surfaces',
    fallback: 'compatibility issue projection fallback',
    decision: 'expire fallback',
    owner: 'CO-398',
    trigger: 'Legacy provider proof/status payload shape is present and compatibility projection fills missing fields.',
    introduced_date: 'oldest known 2026-04-23; current review 2026-04-27',
    review_date: '2026-05-10',
    maximum_lifetime: '2026-05-26',
    removal_condition:
      'Consumers read the canonical issue/status shape directly or the compatibility bridge emits explicit expired/degraded metadata.',
    validation: 'compatibilityIssuePresenter and provider observability tests.'
  },
  syntheticIdentityProjection: {
    surface: 'control-host status surfaces',
    fallback: 'synthetic identity/status fallback that hides CLI/API/UI disagreement',
    decision: 'remove fallback',
    owner: 'CO-398',
    trigger:
      'CLI, API, UI, Linear, provider-intake, or retained proof disagree and projection fabricates one coherent status.',
    introduced_date: 'current review 2026-04-27',
    review_date: null,
    maximum_lifetime: null,
    removal_condition:
      'Disagreement is surfaced with source labels, degraded reason, and current-state authority evidence.',
    validation: 'Control runtime tests plus CLI/API/UI status projection regression coverage.'
  },
  sourceAuthorityLabels: {
    surface: 'control-host status surfaces',
    fallback: 'CLI/API/UI /ui/data.json source labels and authority/proof split',
    decision: 'justify retaining fallback',
    owner: 'CO-398',
    trigger: 'Any status projection includes both live authority and retained proof/audit evidence.',
    introduced_date: 'current review 2026-04-27',
    review_date: '2026-05-26',
    maximum_lifetime: 'Non-expiring durable audit contract',
    removal_condition:
      'Remove only with a replacement schema preserving live authority, retained proof, source label, and degraded reason.',
    validation: 'Control runtime, provider observability, and status presenter tests.'
  }
};

const CONTROL_HOST_STATUS_FALLBACK_DECISION_KEYS: ControlHostStatusFallbackDecisionKey[] = [
  'legacyProofFields',
  'selectedRunProjection',
  'compatibilityIssueProjection',
  'syntheticIdentityProjection',
  'sourceAuthorityLabels'
];

export interface CompatibilityIssueSourceRecord {
  issueProvider: string | null;
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
  lookupAliases: string[];
  updatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  pipelineId?: string | null;
  pipelineTitle?: string | null;
  providerLinearWorkerProof?: ControlCompatibilitySourceContext['providerLinearWorkerProof'];
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
  const pollingBudgetOwner = resolveCompatibilityPollingBudgetOwner(snapshot);
  const running = index.runningOrder.flatMap((issueIdentifier) => {
    const source = issuesByIdentifier.get(issueIdentifier)?.runningSource;
    return source
      ? [
          buildCompatibilityRunningEntry(
            source,
            resolveCompatibilityRunningPolling(source, snapshot.polling ?? null, pollingBudgetOwner)
          )
        ]
      : [];
  });
  const retrying = index.retryOrder.flatMap((issueIdentifier) => {
    const source = issuesByIdentifier.get(issueIdentifier)?.retrySource;
    return source ? [buildCompatibilityRetryEntry(source)] : [];
  });
  const runningByIssue = new Map(running.map((entry) => [entry.issue_identifier, entry] as const));
  const retryingByIssue = new Map(retrying.map((entry) => [entry.issue_identifier, entry] as const));
  const selectedIssue =
    snapshot.selected ? issuesByIdentifier.get(snapshot.selected.issueIdentifier) ?? null : null;
  const selectedActiveSource = selectedIssue?.runningSource ?? selectedIssue?.retrySource ?? null;
  const selectedSnapshotSuppressed =
    snapshot.selected !== null && shouldSuppressInactiveSelectedPayload(snapshot.selected);
  const selectedSource = selectedSnapshotSuppressed
    ? selectedActiveSource ?? selectedIssue?.selectedSource ?? snapshot.selected
    : snapshot.selected ?? selectedActiveSource ?? selectedIssue?.selectedSource ?? null;
  const selectedSourceIsPreferredActiveSource =
    selectedSource !== null && selectedSource === selectedActiveSource;
  const selectedPayload =
    selectedSource &&
    (selectedSourceIsPreferredActiveSource || !shouldSuppressInactiveSelectedPayload(selectedSource))
      ? withControlHostFallbackExpiry(
          buildProjectionSelectedPayload(selectedSource, snapshot.providerIntake ?? null),
          buildSelectedRunFallbackExpiry(selectedSource)
        )
      : null;
  const issues = index.issues
    .map((issue) => {
      if (shouldPruneTerminalSelectedCompatibilityIssue(issue)) {
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
          dispatchPilotSummary: issue.dispatchPilotSummary,
          providerIntake: snapshot.providerIntake ?? null
        })
      };
    })
    .filter((issue): issue is CompatibilityProjectionIssueRecord => issue !== null);

  return {
    running,
    retrying,
    maxConcurrentAgents: snapshot.maxConcurrentAgents ?? null,
    codexTotals: snapshot.codexTotals,
    rateLimits: snapshot.rateLimits,
    issues,
    selected: selectedPayload,
    dispatchPilot: snapshot.dispatchPilot,
    tracked: snapshot.tracked,
    providerIntake: snapshot.providerIntake,
    providerIntakeUnavailable: snapshot.providerIntakeUnavailable,
    providerWorkflow: snapshot.providerWorkflow,
    polling: snapshot.polling,
    fallbackExpiry: buildControlHostStatusFallbackDecisionSet(
      CONTROL_HOST_STATUS_FALLBACK_DECISION_KEYS
    )
  };
}

function buildControlHostStatusFallbackDecisionSet(
  keys: ControlHostStatusFallbackDecisionKey[]
): ControlStatusFallbackExpiryMetadata[] {
  return keys.map((key) => ({ ...CONTROL_HOST_STATUS_FALLBACK_DECISIONS[key] }));
}

function withControlHostFallbackExpiry<TPayload extends {
  fallback_expiry?: ControlStatusFallbackExpiryMetadata[];
}>(
  payload: TPayload,
  fallbackExpiry: ControlStatusFallbackExpiryMetadata[]
): TPayload {
  return fallbackExpiry.length > 0
    ? {
        ...payload,
        fallback_expiry: fallbackExpiry
      }
    : payload;
}

function buildSelectedRunFallbackExpiry(
  source: ControlCompatibilitySourceContext
): ControlStatusFallbackExpiryMetadata[] {
  const keys: ControlHostStatusFallbackDecisionKey[] = [
    'selectedRunProjection',
    'sourceAuthorityLabels'
  ];
  if (source.providerLinearWorkerProof) {
    keys.unshift('legacyProofFields');
  }
  if (isSyntheticLinearFallbackOnlyIssueSource(source)) {
    keys.push('syntheticIdentityProjection');
  }
  return buildControlHostStatusFallbackDecisionSet(keys);
}

function buildRunningFallbackExpiry(
  source: ControlCompatibilitySourceContext,
  runningEventSource: 'proof' | 'latest' | 'fallback'
): ControlStatusFallbackExpiryMetadata[] {
  const keys: ControlHostStatusFallbackDecisionKey[] = [
    'selectedRunProjection',
    'sourceAuthorityLabels'
  ];
  if (source.providerLinearWorkerProof || runningEventSource === 'proof') {
    keys.unshift('legacyProofFields');
  }
  if (isSyntheticLinearFallbackOnlyIssueSource(source)) {
    keys.push('syntheticIdentityProjection');
  }
  return buildControlHostStatusFallbackDecisionSet(keys);
}

function buildRetryFallbackExpiry(
  source: ControlCompatibilitySourceContext
): ControlStatusFallbackExpiryMetadata[] {
  const keys: ControlHostStatusFallbackDecisionKey[] = [
    'compatibilityIssueProjection',
    'sourceAuthorityLabels'
  ];
  if (source.providerLinearWorkerProof) {
    keys.unshift('legacyProofFields');
  }
  if (isSyntheticLinearFallbackOnlyIssueSource(source)) {
    keys.push('syntheticIdentityProjection');
  }
  return buildControlHostStatusFallbackDecisionSet(keys);
}

function buildCompatibilityIssueFallbackExpiry(
  source: ControlCompatibilitySourceContext
): ControlStatusFallbackExpiryMetadata[] {
  const keys: ControlHostStatusFallbackDecisionKey[] = [
    'compatibilityIssueProjection',
    'sourceAuthorityLabels'
  ];
  if (source.providerLinearWorkerProof) {
    keys.unshift('legacyProofFields');
  }
  if (isSyntheticLinearFallbackOnlyIssueSource(source)) {
    keys.push('syntheticIdentityProjection');
  }
  return buildControlHostStatusFallbackDecisionSet(keys);
}

function shouldPruneTerminalSelectedCompatibilityIssue(
  issue: CompatibilityIssueIndexEntry<ControlCompatibilitySourceContext, ControlDispatchPilotPayload>
): boolean {
  if (issue.runningSource || issue.retrySource || !issue.selectedSource) {
    return false;
  }
  return (
    isTerminalReleasedCompletedProviderSource(issue.selectedSource) ||
    isStaleInProgressTerminalReleasedProviderSource(issue.selectedSource) ||
    isTerminalHandoffFailedProviderSource(issue.selectedSource)
  );
}

function isTerminalReleasedCompletedProviderSource(
  source: ControlCompatibilitySourceContext
): boolean {
  const debugSnapshot = source.providerDebugSnapshot ?? null;
  if (!isTerminalReleasedInactiveProviderSource(source)) {
    return false;
  }
  if (!isCompletedCompatibilityRunStatus(source.rawStatus)) {
    return false;
  }
  return hasCompletedMergeCloseout(debugSnapshot);
}

function shouldSuppressInactiveSelectedPayload(source: ControlCompatibilitySourceContext): boolean {
  return (
    isStaleInProgressTerminalReleasedProviderSource(source) ||
    isTerminalHandoffFailedProviderSource(source)
  );
}

function isTerminalHandoffFailedProviderSource(
  source: ControlCompatibilitySourceContext
): boolean {
  const claim = source.providerDebugSnapshot?.claim ?? null;
  if (normalizeProviderLinearWorkflowState(claim?.state) !== 'handoff_failed') {
    return false;
  }
  return (
    normalizeProviderLinearWorkflowState(claim?.reason) ===
      'provider_issue_merge_closeout_action_required' ||
    isTerminalProviderIssueState(source)
  );
}

function isStaleInProgressTerminalReleasedProviderSource(
  source: ControlCompatibilitySourceContext
): boolean {
  const debugSnapshot = source.providerDebugSnapshot ?? null;
  return (
    normalizeProviderLinearWorkflowState(source.rawStatus) === 'in_progress' &&
    isTerminalReleasedInactiveProviderSource(source) &&
    hasCompletedMergeCloseout(debugSnapshot)
  );
}

function isTerminalReleasedInactiveProviderSource(
  source: ControlCompatibilitySourceContext
): boolean {
  const claim = source.providerDebugSnapshot?.claim ?? null;
  if (normalizeProviderLinearWorkflowState(claim?.state) !== 'released') {
    return false;
  }
  if (normalizeProviderLinearWorkflowState(claim?.reason) !== 'provider_issue_released:not_active') {
    return false;
  }
  return isTerminalProviderIssueState(source);
}

function isCompletedCompatibilityRunStatus(status: string | null | undefined): boolean {
  const normalized = normalizeProviderLinearWorkflowState(status);
  return (
    normalized === 'succeeded' ||
    normalized === 'success' ||
    normalized === 'completed' ||
    normalized === 'done'
  );
}

function isTerminalProviderIssueState(source: ControlCompatibilitySourceContext): boolean {
  const trackedLinear = source.tracked?.linear ?? null;
  const debugSnapshot = source.providerDebugSnapshot ?? null;
  const claimEvidence = {
    state: debugSnapshot?.claim?.issue_state ?? null,
    state_type: debugSnapshot?.claim?.issue_state_type ?? null,
    updated_at:
      debugSnapshot?.claim?.issue_updated_at ??
      debugSnapshot?.claim?.updated_at ??
      null
  };
  const claimState = classifyProviderLinearWorkflowState(claimEvidence);
  if (claimState.isTerminal) {
    return !hasNewerActiveProviderIssueState(source, claimEvidence.updated_at);
  }

  return [
    {
      state: trackedLinear?.state ?? null,
      state_type: trackedLinear?.state_type ?? null,
      updated_at: trackedLinear?.updated_at ?? null
    },
    {
      state: debugSnapshot?.live_linear_state.state ?? null,
      state_type: debugSnapshot?.live_linear_state.state_type ?? null,
      updated_at: debugSnapshot?.live_linear_state.updated_at ?? null
    },
    {
      state: source.compatibilityState ?? null,
      state_type: null,
      updated_at: source.updatedAt ?? null
    }
  ].some((evidence) => {
    const workflowState = classifyProviderLinearWorkflowState(evidence);
    return (
      workflowState.isTerminal && !hasNewerActiveProviderIssueState(source, evidence.updated_at)
    );
  });
}

function hasNewerActiveProviderIssueState(
  source: ControlCompatibilitySourceContext,
  claimUpdatedAt: string | null
): boolean {
  const trackedLinear = source.tracked?.linear ?? null;
  const debugSnapshot = source.providerDebugSnapshot ?? null;
  return [
    {
      state: debugSnapshot?.claim?.issue_state ?? null,
      state_type: debugSnapshot?.claim?.issue_state_type ?? null,
      updated_at:
        debugSnapshot?.claim?.issue_updated_at ??
        debugSnapshot?.claim?.updated_at ??
        null
    },
    {
      state: trackedLinear?.state ?? null,
      state_type: trackedLinear?.state_type ?? null,
      updated_at: trackedLinear?.updated_at ?? null
    },
    {
      state: debugSnapshot?.live_linear_state.state ?? null,
      state_type: debugSnapshot?.live_linear_state.state_type ?? null,
      updated_at: debugSnapshot?.live_linear_state.updated_at ?? null
    }
  ].some((evidence) => {
    const workflowState = classifyProviderLinearWorkflowState(evidence);
    return workflowState.isActive && compareIsoTimestamp(evidence.updated_at, claimUpdatedAt) > 0;
  });
}

function hasCompletedMergeCloseout(
  debugSnapshot: ControlCompatibilitySourceContext['providerDebugSnapshot'] | null
): boolean {
  const progress = debugSnapshot?.progress ?? null;
  if (progress?.kind === 'merge_closeout' && progress.status === 'completed') {
    return true;
  }
  const pullRequest = debugSnapshot?.pull_request ?? null;
  const mergeCloseoutStatus = normalizeProviderLinearWorkflowState(
    pullRequest?.merge_closeout_status
  );
  if (mergeCloseoutStatus !== 'merged') {
    return false;
  }
  return Boolean(pullRequest?.merged_at);
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

  if (!isSyntheticLinearFallbackOnlyIssueSource(snapshot.selected)) {
    registerIssue(snapshot.selected, {
      kind: 'selected',
      dispatchPilotSummary: snapshot.dispatchPilot
    });
  }
  snapshot.running.forEach((entry) => {
    if (!isSyntheticLinearFallbackOnlyIssueSource(entry)) {
      registerIssue(entry, { kind: 'running' });
    }
  });
  snapshot.retrying.forEach((entry) => {
    if (!isSyntheticLinearFallbackOnlyIssueSource(entry)) {
      registerIssue(entry, { kind: 'retry' });
    }
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

interface CompatibilityPollingBudgetOwner {
  issueId: string | null;
  issueIdentifier: string | null;
}

function resolveCompatibilityPollingBudgetOwner(
  snapshot: Pick<ControlCompatibilityRuntimeSnapshot, 'selected' | 'tracked'>
): CompatibilityPollingBudgetOwner | null {
  const trackedLinear = snapshot.tracked?.linear ?? snapshot.selected?.tracked?.linear ?? null;
  if (!trackedLinear) {
    return null;
  }
  const issueId = trackedLinear.id ?? null;
  const issueIdentifier = trackedLinear.identifier ?? null;
  if (!issueId && !issueIdentifier) {
    return null;
  }
  return {
    issueId,
    issueIdentifier
  };
}

function resolveCompatibilityRunningPolling(
  source: Pick<ControlCompatibilitySourceContext, 'issueId' | 'issueIdentifier'>,
  polling: ControlPollingHealthPayload | null,
  owner: CompatibilityPollingBudgetOwner | null
): ControlPollingHealthPayload | null {
  if (!polling || !owner) {
    return null;
  }
  if (owner.issueId && source.issueId) {
    return owner.issueId === source.issueId ? polling : null;
  }
  if (owner.issueIdentifier && owner.issueIdentifier === source.issueIdentifier) {
    return polling;
  }
  return null;
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
  selected: ControlCompatibilitySourceContext,
  polling: ControlPollingHealthPayload | null = null
): ControlRunningPayload {
  const proof = selected.providerLinearWorkerProof ?? null;
  const workerHost = resolveProviderWorkerHost({
    providerLinearWorkerProof: proof,
    providerDebugSnapshot: selected.providerDebugSnapshot,
    stageStartedAt: selected.startedAt
  });
  const proofCurrentTurnActivity = proof?.current_turn_activity ?? null;
  const proofCanonicalEvent = normalizeCompatibilityMessage(proofCurrentTurnActivity?.event);
  const proofCanonicalMessage = normalizeCompatibilityMessage(
    proofCurrentTurnActivity?.message_or_payload
  );
  const proofCanonicalRecordedAt = normalizeCompatibilityMessage(
    proofCurrentTurnActivity?.recorded_at
  );
  const proofCanonicalSessionId = normalizeCompatibilityMessage(proofCurrentTurnActivity?.session_id);
  const useLegacyProofFallback = proofCurrentTurnActivity === null;
  const hasCanonicalProofTelemetry = Boolean(proofCanonicalEvent || proofCanonicalMessage);
  const proofEvent = useLegacyProofFallback
    ? normalizeCompatibilityMessage(proof?.last_event)
    : proofCanonicalEvent;
  const proofMessage = useLegacyProofFallback
    ? normalizeCompatibilityMessage(proof?.last_message)
    : proofCanonicalMessage;
  const proofEventAt = useLegacyProofFallback
    ? normalizeCompatibilityMessage(proof?.last_event_at)
    : proofCanonicalRecordedAt;
  const runningEvent = selectRunningEvent({
    latestEvent: selected.latestEvent?.event ?? null,
    latestEventAt: selected.latestEvent?.at ?? null,
    latestMessage: selected.latestEvent?.message ?? null,
    latestAction: selected.latestAction ?? null,
    rawStatus: selected.rawStatus,
    proofEvent,
    proofMessage,
    proofEventAt
  });
  const preferProofTelemetry = runningEvent.source === 'proof';
  const latestEventKey = normalizeCompatibilityEventKey(selected.latestEvent?.event ?? null);
  const preserveLatestControlActionContext =
    runningEvent.source === 'latest' && isExplicitControlActionEventKey(latestEventKey);
  const runningMessage = preferProofTelemetry
    ? proofMessage ?? selected.latestEvent?.message ?? selected.summary
    : preserveLatestControlActionContext
      ? selected.latestEvent?.message ?? selected.summary
      : selected.latestEvent?.message ?? proofMessage ?? selected.summary;
  const runningMessageSource =
    preferProofTelemetry
      ? proofMessage
        ? 'proof'
        : selected.latestEvent?.message
          ? 'latest'
          : 'fallback'
      : preserveLatestControlActionContext
        ? selected.latestEvent?.message
          ? 'latest'
          : 'fallback'
        : selected.latestEvent?.message
          ? 'latest'
          : proofMessage
            ? 'proof'
            : 'fallback';
  const runningEventAt = preferProofTelemetry
    ? proofEventAt ?? selected.latestEvent?.at ?? selected.updatedAt
    : preserveLatestControlActionContext
      ? selected.latestEvent?.at ?? selected.updatedAt
      : selected.latestEvent?.at ?? proofEventAt ?? selected.updatedAt;
  const displayEvent = resolveCompatibilityRunningDisplayEvent({
    selected,
    runningEvent: runningEvent.event,
    runningMessage,
    polling
  });
  const proofEventSource =
    normalizeCompatibilityMessage(proofCurrentTurnActivity?.source) === 'session_log_hydration'
      ? 'canonical_session_log_hydration'
      : hasCanonicalProofTelemetry
        ? 'canonical_stdout_jsonl'
        : 'legacy_proof_fields';
  const eventSource =
    runningEvent.source === 'latest'
      ? selected.latestEvent?.source ?? 'latest_event'
      : runningEvent.source === 'proof'
        ? proofEventSource
        : 'fallback';
  const messageRecordedAt =
    runningMessageSource === 'latest'
      ? selected.latestEvent?.messageRecordedAt ?? null
      : runningMessageSource === 'proof'
        ? useLegacyProofFallback
          ? null
          : proofMessage
            ? proofCanonicalRecordedAt ?? null
            : null
        : null;
  const sourceUpdatedAt =
    runningEvent.source === 'latest'
      ? selected.latestEvent?.sourceUpdatedAt ?? selected.latestEvent?.at ?? selected.updatedAt
      : runningEvent.source === 'proof'
        ? useLegacyProofFallback
          ? normalizeCompatibilityMessage(proof?.updated_at) ?? proofEventAt ?? null
          : proofCanonicalRecordedAt ?? normalizeCompatibilityMessage(proof?.updated_at) ?? null
        : selected.updatedAt;
  const eventCandidates =
    runningEvent.source === 'latest'
      ? selected.latestEvent?.candidates ?? []
      : runningEvent.source === 'proof'
        ? [
            {
              source: eventSource,
              event: proofEvent,
              summary: proofMessage,
              message_recorded_at: proofMessage ? messageRecordedAt : null,
              source_updated_at: sourceUpdatedAt,
              derived: false,
              accepted: true,
              rejection_reason: null
            }
          ]
        : [];
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    state: resolveCompatibilityRunningState(selected),
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    pid: selected.providerLinearWorkerProof?.pid ?? null,
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    ...(proof?.resolved_model_provenance
      ? { resolved_model_provenance: proof.resolved_model_provenance }
      : {}),
    session_id: useLegacyProofFallback
      ? normalizeCompatibilityMessage(proof?.latest_session_id)
      : proofCanonicalSessionId,
    turn_count: proof?.turn_count ?? null,
    last_event: runningEvent.event,
    last_message: runningMessage,
    display_event: displayEvent,
    event_source: eventSource,
    message_recorded_at: messageRecordedAt,
    source_updated_at: sourceUpdatedAt,
    event_candidates: eventCandidates,
    fallback_expiry: buildRunningFallbackExpiry(selected, runningEvent.source),
    started_at: selected.startedAt,
    last_event_at: runningEventAt,
    tokens: proof?.tokens ?? buildEmptyTokenUsage()
  };
}

export function buildCompatibilityRetryEntry(selected: ControlCompatibilitySourceContext): ControlRetryPayload {
  const retryState = selected.providerRetryState ?? null;
  const proof = selected.providerLinearWorkerProof ?? null;
  const workerHost = resolveProviderWorkerHost({
    providerLinearWorkerProof: proof,
    providerDebugSnapshot: selected.providerDebugSnapshot,
    stageStartedAt: selected.startedAt
  });
  return {
    issue_id: selected.issueId,
    issue_identifier: selected.issueIdentifier,
    task_id: selected.taskId,
    run_id: selected.runId,
    state: selected.rawStatus,
    display_state: selected.displayStatus,
    status_reason: selected.statusReason,
    session_id: proof?.latest_session_id ?? null,
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    ...(proof?.resolved_model_provenance
      ? { resolved_model_provenance: proof.resolved_model_provenance }
      : {}),
    thread_id: proof?.thread_id ?? null,
    turn_count: proof?.turn_count ?? null,
    workspace_path: selected.workspacePath,
    attempt: retryState?.attempt ?? null,
    due_at: retryState?.due_at ?? null,
    error: retryState?.error ?? selected.lastError,
    last_event: selected.latestEvent?.event ?? selected.latestAction ?? selected.rawStatus,
    last_message: selected.latestEvent?.message ?? selected.summary,
    fallback_expiry: buildRetryFallbackExpiry(selected),
    started_at: selected.startedAt,
    last_event_at: selected.latestEvent?.at ?? selected.updatedAt
  };
}

export function buildCompatibilityIssuePayload(input: {
  source: ControlCompatibilitySourceContext;
  running: ControlRunningPayload | null;
  retry: ControlRetryPayload | null;
  dispatchPilotSummary: ControlDispatchPilotPayload | null;
  providerIntake?: ControlCompatibilityRuntimeSnapshot['providerIntake'];
}): ControlIssuePayload {
  const retryPayload =
    input.retry ??
    (input.source.providerRetryState ? buildCompatibilityRetryEntry(input.source) : null);
  const selectedPayload = buildProjectionSelectedPayload(
    input.source,
    input.providerIntake ?? null
  );
  const latestEvent = buildSelectedRunLatestEventPayload(input.source.latestEvent);
  const recentEvents = latestEvent ? [latestEvent] : [];
  const workerHost = resolveProviderWorkerHost({
    providerLinearWorkerProof: input.source.providerLinearWorkerProof,
    providerDebugSnapshot: input.source.providerDebugSnapshot,
    providerIntake: input.providerIntake ?? null,
    issueIdentifier: input.source.issueIdentifier,
    issueId: input.source.issueId,
    stageStartedAt: input.source.startedAt
  });
  const proofWorkspacePath = readProviderLinearWorkerWorkspacePath(
    input.source.providerLinearWorkerProof,
    input.source.startedAt,
    input.source.providerDebugSnapshot
  );

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
      path: input.source.workspacePath ?? proofWorkspacePath ?? null
    },
    ...(workerHost !== null ? { worker_host: workerHost } : {}),
    attempts: buildCompatibilityIssueAttempts(input.source, retryPayload),
    running: input.running,
    retry: retryPayload,
    logs: {
      codex_session_logs: []
    },
    summary: input.source.summary,
    latest_event: latestEvent,
    question_summary: selectedPayload.question_summary,
    recent_events: recentEvents,
    last_error: input.source.lastError,
    tracked: buildTrackedPayloadEnvelope(input.source.tracked),
    fallback_expiry: buildCompatibilityIssueFallbackExpiry(input.source),
    ...(input.source.providerLinearWorkerProof
      ? { provider_linear_worker_proof: input.source.providerLinearWorkerProof }
      : {}),
    ...(input.source.providerDebugSnapshot
      ? { provider_debug_snapshot: input.source.providerDebugSnapshot }
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

function resolveCompatibilityRunningDisplayEvent(input: {
  selected: ControlCompatibilitySourceContext;
  runningEvent: string | null;
  runningMessage: string | null;
  polling: ControlPollingHealthPayload | null;
}): string | null {
  const proof = input.selected.providerLinearWorkerProof ?? null;
  const codexBudgetEvent = resolveCodexBudgetExhaustionEvent(proof?.rate_limits ?? null);
  if (codexBudgetEvent) {
    return codexBudgetEvent;
  }

  const nextRefreshInMs = resolveCompatibilityNextRefreshCountdownMs(input.polling);
  const hasProjectedNextRefreshState =
    input.polling?.next_refresh_state !== undefined &&
    input.polling?.next_refresh_state !== null;
  const pollingLinearBudgetEvent = resolveCompatibilityPollingLinearBudgetExhaustionEvent(
    input.selected,
    input.polling,
    nextRefreshInMs
  );
  if (pollingLinearBudgetEvent) {
    return pollingLinearBudgetEvent;
  }

  const authoritativeLinearBudget = resolveAuthoritativeLinearBudget({
    selected: input.selected,
    polling: input.polling
  });
  const authoritativeLinearBudgetForEvent =
    authoritativeLinearBudget === input.polling?.linear_budget &&
    !shouldUseCompatibilityPollingCooldownState(input.polling)
      ? null
      : authoritativeLinearBudget;
  const authoritativeNextRefreshInMs =
    authoritativeLinearBudgetForEvent === input.polling?.linear_budget ? nextRefreshInMs : null;
  const linearBudgetEvent = resolveLinearBudgetExhaustionEvent(
    authoritativeLinearBudgetForEvent,
    {
      nextRefreshInMs: authoritativeNextRefreshInMs,
      preferProjectedCountdown:
        authoritativeLinearBudgetForEvent === input.polling?.linear_budget &&
        hasProjectedNextRefreshState
    }
  );
  if (linearBudgetEvent) {
    return linearBudgetEvent;
  }

  const displayState = input.selected.displayStatus;
  const progressSummary =
    normalizeCompatibilityMessage(input.selected.providerDebugSnapshot?.progress?.summary) ??
    normalizeCompatibilityMessage(proof?.progress?.summary) ??
    null;
  const candidates = [
    normalizeCompatibilityMessage(input.runningMessage),
    progressSummary,
    normalizeCompatibilityMessage(input.selected.latestEvent?.message),
    normalizeCompatibilityMessage(input.selected.summary)
  ];
  for (const candidate of candidates) {
    if (isHighSignalCompatibilityText(candidate, displayState)) {
      return candidate;
    }
  }

  const humanizedEvent = humanizeCompatibilityRunningEvent(input.runningEvent);
  if (isHighSignalCompatibilityText(humanizedEvent, displayState)) {
    return humanizedEvent;
  }
  const humanizedStatusReason = humanizeCompatibilityRunningEvent(input.selected.statusReason);
  if (isHighSignalCompatibilityText(humanizedStatusReason, displayState)) {
    return humanizedStatusReason;
  }
  return null;
}

function resolveCompatibilityNextRefreshCountdownMs(
  polling: ControlPollingHealthPayload | null
): number | null {
  if (
    typeof polling?.next_refresh_in_ms === 'number' &&
    Number.isFinite(polling.next_refresh_in_ms) &&
    polling.next_refresh_in_ms >= 0
  ) {
    return polling.next_refresh_in_ms;
  }
  const hasProjectedState =
    polling?.next_refresh_state !== undefined && polling?.next_refresh_state !== null;
  if (hasProjectedState) {
    return null;
  }
  return typeof polling?.next_poll_in_ms === 'number' &&
    Number.isFinite(polling.next_poll_in_ms) &&
    polling.next_poll_in_ms >= 0
    ? polling.next_poll_in_ms
    : null;
}

function resolveCompatibilityPollingLinearBudgetExhaustionEvent(
  selected: ControlCompatibilitySourceContext,
  polling: ControlPollingHealthPayload | null,
  nextRefreshInMs: number | null
): string | null {
  const pollingBudget = polling?.linear_budget ?? null;
  if (
    !shouldUseCompatibilityPollingCooldownState(polling) ||
    !isCompatibilityLinearBudgetSharedExhausted(pollingBudget)
  ) {
    return null;
  }
  const proofBudget = selected.providerLinearWorkerProof?.linear_budget ?? null;
  if (isCompatibilityLinearBudgetSharedExhausted(proofBudget)) {
    return null;
  }
  return resolveLinearBudgetExhaustionEvent(pollingBudget, {
    nextRefreshInMs,
    preferProjectedCountdown:
      polling?.next_refresh_state !== undefined && polling?.next_refresh_state !== null
  });
}

function shouldUseCompatibilityPollingCooldownState(
  polling: ControlPollingHealthPayload | null
): boolean {
  return (
    polling?.next_refresh_state === undefined ||
    polling?.next_refresh_state === null ||
    polling.next_refresh_state === 'cooldown'
  );
}

function resolveAuthoritativeLinearBudget(input: {
  selected: ControlCompatibilitySourceContext;
  polling: ControlPollingHealthPayload | null;
}): LinearBudgetStatus | null {
  const proof = input.selected.providerLinearWorkerProof ?? null;
  const proofBudget = proof?.linear_budget ?? null;
  const pollingBudget = input.polling?.linear_budget ?? null;
  if (!proofBudget) {
    return pollingBudget;
  }
  if (!pollingBudget) {
    return proofBudget;
  }
  const proofTimestamp =
    Date.parse(proofBudget.observed_at ?? proof?.updated_at ?? input.selected.updatedAt ?? '') ||
    Number.NEGATIVE_INFINITY;
  const pollingTimestamp =
    Date.parse(pollingBudget.observed_at ?? input.polling?.updated_at ?? '') ||
    Number.NEGATIVE_INFINITY;
  return pollingTimestamp >= proofTimestamp ? pollingBudget : proofBudget;
}

function resolveCodexBudgetExhaustionEvent(
  rateLimits: Record<string, unknown> | null | undefined
): string | null {
  const codex = asCompatibilityRecord(rateLimits?.codex) ?? asCompatibilityRecord(rateLimits);
  if (!codex) {
    return null;
  }
  const buckets: Array<[string, Record<string, unknown> | null]> = [
    [resolveCodexRateLimitBucketLabel(asCompatibilityRecord(codex.primary)) ?? 'primary', asCompatibilityRecord(codex.primary)],
    [resolveCodexRateLimitBucketLabel(asCompatibilityRecord(codex.secondary)) ?? 'secondary', asCompatibilityRecord(codex.secondary)],
    ['requests', asCompatibilityRecord(codex.requests)],
    ['requests', asCompatibilityRecord(codex.endpoint_requests)]
  ];
  for (const [label, bucket] of buckets) {
    if (bucket && isCompatibilityBucketExhausted(bucket)) {
      return `codex ${label} bucket exhausted; worker paused until reset`;
    }
  }
  return null;
}

function resolveLinearBudgetExhaustionEvent(
  budget:
    | {
        retry_after_seconds?: number | null;
        requests?: { remaining?: number | null } | null;
        endpoint_requests?: { remaining?: number | null } | null;
        complexity?: { remaining?: number | null } | null;
        endpoint_complexity?: { remaining?: number | null } | null;
      }
    | null
    | undefined,
  options: {
    nextRefreshInMs?: number | null;
    preferProjectedCountdown?: boolean;
  } = {}
): string | null {
  if (isCompatibilityLinearBudgetBucketFamilyExhausted(budget, 'requests')) {
    const nextRefresh = formatCompatibilityCountdownMs(
      resolveCompatibilityLinearBudgetCountdownMs(
        budget,
        options.nextRefreshInMs ?? null,
        options.preferProjectedCountdown === true
      )
    );
    return nextRefresh
      ? `linear requests exhausted; next tracked-issue refresh at ${nextRefresh}`
      : 'linear requests exhausted; polling deferred until reset';
  }
  if (isCompatibilityLinearBudgetBucketFamilyExhausted(budget, 'complexity')) {
    const nextRefresh = formatCompatibilityCountdownMs(
      resolveCompatibilityLinearBudgetCountdownMs(
        budget,
        options.nextRefreshInMs ?? null,
        options.preferProjectedCountdown === true
      )
    );
    return nextRefresh
      ? `linear complexity budget exhausted; next tracked-issue refresh at ${nextRefresh}`
      : 'linear complexity budget exhausted; polling deferred until reset';
  }
  return null;
}

function isCompatibilityLinearBudgetBucketFamilyExhausted(
  budget:
    | {
        requests?: { remaining?: number | null } | null;
        endpoint_requests?: { remaining?: number | null } | null;
        complexity?: { remaining?: number | null } | null;
        endpoint_complexity?: { remaining?: number | null } | null;
      }
    | null
    | undefined,
  family: 'requests' | 'complexity'
): boolean {
  const primaryBucket = family === 'requests' ? budget?.requests : budget?.complexity;
  const endpointBucket = family === 'requests' ? budget?.endpoint_requests : budget?.endpoint_complexity;
  return (
    isCompatibilityLinearBudgetBucketExhausted(primaryBucket) ||
    isCompatibilityLinearBudgetBucketExhausted(endpointBucket)
  );
}

function isCompatibilityLinearBudgetSharedExhausted(
  budget:
    | {
        requests?: { remaining?: number | null } | null;
        complexity?: { remaining?: number | null } | null;
      }
    | null
    | undefined
): boolean {
  return (
    isCompatibilityLinearBudgetBucketExhausted(budget?.requests) ||
    isCompatibilityLinearBudgetBucketExhausted(budget?.complexity)
  );
}

function isCompatibilityLinearBudgetBucketExhausted(
  bucket: { remaining?: number | null } | null | undefined
): boolean {
  const remaining = normalizeCompatibilityRemaining(bucket?.remaining);
  return remaining !== null && remaining <= 0;
}

function resolveCompatibilityLinearBudgetCountdownMs(
  budget:
    | {
        retry_after_seconds?: number | null;
      }
    | null
    | undefined,
  projectedMs: number | null,
  preferProjectedCountdown: boolean
): number | null {
  const normalizedProjectedMs =
    typeof projectedMs === 'number' && Number.isFinite(projectedMs) && projectedMs >= 0
      ? projectedMs
      : null;
  const retryAfterSeconds = normalizeCompatibilityRemaining(budget?.retry_after_seconds);
  if (preferProjectedCountdown && normalizedProjectedMs !== null) {
    return normalizedProjectedMs;
  }
  if (retryAfterSeconds !== null) {
    return Math.max(0, Math.ceil(retryAfterSeconds * 1000));
  }
  return normalizedProjectedMs;
}

function normalizeCompatibilityRemaining(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isCompatibilityBucketExhausted(bucket: Record<string, unknown>): boolean {
  const remaining = readCompatibilityRecordNumber(bucket, ['remaining']);
  if (remaining !== null) {
    return remaining <= 0;
  }
  const usedPercent = readCompatibilityRecordNumber(bucket, ['usedPercent', 'used_percent']);
  if (usedPercent !== null) {
    return usedPercent >= 100;
  }
  return false;
}

function resolveCodexRateLimitBucketLabel(bucket: Record<string, unknown> | null): string | null {
  if (!bucket) {
    return null;
  }
  const windowDurationMins = readCompatibilityRecordNumber(bucket, [
    'windowDurationMins',
    'window_duration_mins',
    'window_minutes'
  ]);
  const normalizedWindowMinutes =
    windowDurationMins !== null && Number.isFinite(windowDurationMins)
      ? Math.max(0, Math.trunc(windowDurationMins))
      : null;
  if (normalizedWindowMinutes === 300) {
    return '5-hour';
  }
  if (normalizedWindowMinutes === 10_080) {
    return 'weekly';
  }
  return null;
}

function formatCompatibilityCountdownMs(valueMs: number | null | undefined): string | null {
  if (typeof valueMs !== 'number' || !Number.isFinite(valueMs) || valueMs < 0) {
    return null;
  }
  return formatCompatibilityDurationSeconds(Math.ceil(valueMs / 1000));
}

function formatCompatibilityDurationSeconds(valueSeconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(valueSeconds));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days}d` : `${days}d ${remainingHours}h`;
}

function humanizeCompatibilityRunningEvent(value: string | null | undefined): string | null {
  const normalized = normalizeCompatibilityEventKey(value);
  if (!normalized) {
    return null;
  }
  switch (normalized) {
    case 'task_started':
      return 'session started';
    case 'task_complete':
    case 'turn_completed':
      return 'turn completed';
    case 'turn_started':
      return 'turn started';
    case 'turn_failed':
      return 'turn failed';
    case 'turn_cancelled':
      return 'turn cancelled';
    case 'thread_tokenusage_updated':
      return 'token usage updated';
    case 'account_ratelimits_updated':
      return 'rate limits updated';
    case 'queued_questions':
      return 'queued questions';
    case 'review_handoff':
      return 'review handoff ready';
    default:
      return normalized.replace(/_/g, ' ');
  }
}

function isHighSignalCompatibilityText(
  value: string | null,
  displayState: string | null | undefined
): value is string {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  const normalizedDisplayState = normalizeCompatibilityMessage(displayState)?.toLowerCase() ?? '';
  if (normalized.length === 0 || normalized === normalizedDisplayState || normalized === 'n/a') {
    return false;
  }
  return !GENERIC_COMPATIBILITY_RUNNING_TEXT.has(normalized);
}

const GENERIC_COMPATIBILITY_RUNNING_TEXT = new Set([
  'retry queued',
  'turn running',
  'worker turn active',
  'provider worker turn is active.',
  'provider worker turn is active',
  'turn active',
  'provider run active',
  'issue is active but worker progress has not been observed yet.'
]);

function asCompatibilityRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readCompatibilityRecordNumber(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function selectRunningEvent(input: {
  latestEvent: string | null;
  latestEventAt: string | null;
  latestMessage: string | null;
  latestAction: string | null;
  rawStatus: string;
  proofEvent: string | null;
  proofMessage: string | null;
  proofEventAt: string | null;
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
  const proofTelemetryIsNewerThanLatest =
    compareCompatibilityTimestamps(input.proofEventAt, input.latestEventAt) > 0;
  const proofMayOverrideLatestControlAction =
    !isExplicitControlActionEventKey(latestEventKey) || proofTelemetryIsNewerThanLatest;
  const preferProofTelemetry =
    Boolean(input.proofEvent || input.proofMessage) &&
    proofMayOverrideLatestControlAction &&
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

function isExplicitControlActionEventKey(value: string | null): boolean {
  return value === 'pause' || value === 'resume';
}

function compareCompatibilityTimestamps(left: string | null, right: string | null): number {
  const leftTime = parseCompatibilityTimestamp(left);
  const rightTime = parseCompatibilityTimestamp(right);
  if (leftTime === null || rightTime === null) {
    return 0;
  }
  return leftTime - rightTime;
}

function parseCompatibilityTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  if (
    source.rawStatus === 'succeeded' &&
    (source.displayStatus === 'pending_shared_root_reconciliation' || source.displayStatus === 'failed')
  ) {
    return source.displayStatus;
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

function hasExplicitCompatibilityIssueIdentity(
  source: Pick<
    CompatibilityIssueSourceRecord,
    'issueProvider' | 'issueIdentifier' | 'issueId' | 'taskId' | 'runId'
  >
): boolean {
  if (
    source.issueIdentifier &&
    !isFallbackCompatibilityIdentityValue(source.issueIdentifier, source)
  ) {
    return true;
  }
  if (source.issueId && !isFallbackCompatibilityIdentityValue(source.issueId, source)) {
    return true;
  }
  return false;
}

function isFallbackCompatibilityIdentityValue(
  value: string,
  source: Pick<CompatibilityIssueSourceRecord, 'taskId' | 'runId'>
): boolean {
  return (
    isFallbackCompatibilityIdentityAlias(value, source.taskId) ||
    isFallbackCompatibilityIdentityAlias(value, source.runId)
  );
}

function isFallbackCompatibilityIdentityAlias(
  value: string,
  candidate: string | null
): boolean {
  if (!candidate) {
    return false;
  }
  if (value === candidate) {
    return true;
  }
  return SYNTHETIC_LINEAR_TASK_ID_PATTERN.test(value) && candidate.startsWith(`${value}-`);
}

function isSyntheticLinearFallbackOnlyIssueSource(
  source: Pick<
    CompatibilityIssueSourceRecord,
    | 'issueProvider'
    | 'issueIdentifier'
    | 'issueId'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
  > | null
): boolean {
  return (
    source !== null &&
    hasSyntheticLinearFallbackProvenance(source) &&
    source.taskId !== null &&
    SYNTHETIC_LINEAR_TASK_ID_PATTERN.test(source.taskId) &&
    !hasExplicitCompatibilityIssueIdentity(source)
  );
}

function hasSyntheticLinearFallbackProvenance(
  source: Pick<
    CompatibilityIssueSourceRecord,
    'issueProvider' | 'pipelineId' | 'pipelineTitle' | 'providerLinearWorkerProof'
  >
): boolean {
  if (source.issueProvider !== null && source.issueProvider !== 'linear') {
    return false;
  }
  return (
    source.pipelineId === PROVIDER_LINEAR_WORKER_PIPELINE_ID ||
    source.pipelineTitle === PROVIDER_LINEAR_WORKER_PIPELINE_TITLE ||
    source.providerLinearWorkerProof != null ||
    (source.issueProvider === 'linear' &&
      (source.pipelineId === 'docs-review' ||
        source.pipelineId === 'implementation-gate' ||
        source.pipelineId === 'docs-relevance-advisory' ||
        source.pipelineId === 'provider-linear-child-lane'))
  );
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
    compareIsoTimestamp(
      resolveCompatibilitySourcePriorityTimestamp(left),
      resolveCompatibilitySourcePriorityTimestamp(right)
    ) ||
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

function resolveCompatibilitySourcePriorityTimestamp(source: CompatibilityIssueSourceRecord): string | null {
  const sourceRecord = source as CompatibilityIssueSourceRecord & {
    providerDebugSnapshot?: {
      last_semantic_progress_at?: string | null;
      progress?: {
        last_semantic_progress_at?: string | null;
      } | null;
    } | null;
  };
  return (
    sourceRecord.providerDebugSnapshot?.progress?.last_semantic_progress_at ??
    sourceRecord.providerDebugSnapshot?.last_semantic_progress_at ??
    source.latestEvent?.at ??
    null
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
