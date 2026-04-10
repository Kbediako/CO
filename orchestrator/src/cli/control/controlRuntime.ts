import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import type { ProviderWorkflowConfigStore } from './providerWorkflowConfigStore.js';
import type { LinearBudgetStatus } from './linearBudgetState.js';
import {
  readProviderPollingHealth,
  resolveControlPollingNextRefreshProjection
} from './providerPollingHealth.js';
import {
  buildProviderIntakeSummary,
  isRecordLike,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState
} from './providerIntakeState.js';
import {
  buildTrackedLinearPayload,
  type ControlCompatibilityProjectionSnapshot,
  type ControlCompatibilitySourceContext,
  type ControlCodexTotalsPayload,
  type ControlProviderRetryState,
  type ControlPollingHealthPayload,
  type ControlCompatibilityRuntimeSnapshot,
  type ControlSelectedRunRuntimeSnapshot,
  type SelectedRunContext,
} from './observabilityReadModel.js';
import {
  buildCompatibilityProjectionSnapshot
} from './compatibilityIssuePresenter.js';
import { createLiveLinearAdvisoryRuntime } from './liveLinearAdvisoryRuntime.js';
import {
  createObservabilityUpdateNotifier,
  type ObservabilityUpdate,
  type ObservabilityUpdateListener,
  type ObservabilityUpdateNotifier
} from './observabilityUpdateNotifier.js';
import { resolveProviderPollDispatchLimits } from './providerAgentCapacity.js';
import type { QuestionRecord } from './questions.js';
import {
  createSelectedRunProjectionReader,
  discoverAuthoritativeRetryCollectionContexts,
  discoverCompatibilityCollectionContexts
} from './selectedRunProjection.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';

interface ControlRuntimeContext {
  controlStore: {
    snapshot(): ControlState;
  };
  questionQueue: {
    list(): QuestionRecord[];
  };
  paths: Pick<RunPaths, 'manifestPath' | 'runDir' | 'logPath'>;
  linearAdvisoryState: {
    tracked_issue: LiveLinearTrackedIssue | null;
  };
  providerIntakeState?: ProviderIntakeState;
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore;
  readProviderIssueHandoff?: () => ProviderIssueHandoffService | null;
  env?: NodeJS.ProcessEnv;
}

const NULL_PROVIDER_RUNNING_FRESHNESS_MS = 10 * 60 * 1000;
const SYNTHETIC_LINEAR_TASK_ID_PATTERN =
  /^linear-[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export interface ControlRuntimeSnapshot {
  readSelectedRunSnapshot(): Promise<ControlSelectedRunRuntimeSnapshot>;
  readCompatibilityProjection(): Promise<ControlCompatibilityProjectionSnapshot>;
  readDispatchEvaluation(): Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchPilotEvaluation;
  }>;
}

export interface ControlRuntime {
  snapshot(): ControlRuntimeSnapshot;
  requestRefresh(): Promise<void>;
  publish(input?: ObservabilityUpdate): void;
  subscribe(listener: ObservabilityUpdateListener): () => void;
}

interface InternalControlRuntimeSnapshot extends ControlRuntimeSnapshot {
  prime(): Promise<void>;
}

export function createControlRuntime(
  context: ControlRuntimeContext,
  notifier: ObservabilityUpdateNotifier = createObservabilityUpdateNotifier()
): ControlRuntime {
  let cachedSnapshot: InternalControlRuntimeSnapshot | null = null;
  let liveLinearAdvisoryRuntime = createLiveLinearAdvisoryRuntime({
    controlStore: context.controlStore,
    env: context.env
  });

  const ensureSnapshot = (): InternalControlRuntimeSnapshot => {
    cachedSnapshot ??= createControlRuntimeSnapshot(context, liveLinearAdvisoryRuntime);
    return cachedSnapshot;
  };

  const refreshSnapshot = async (): Promise<InternalControlRuntimeSnapshot> => {
    const nextAdvisoryRuntime = createLiveLinearAdvisoryRuntime({
      controlStore: context.controlStore,
      env: context.env
    });
    const nextSnapshot = createControlRuntimeSnapshot(context, nextAdvisoryRuntime);
    await nextSnapshot.prime();
    liveLinearAdvisoryRuntime = nextAdvisoryRuntime;
    cachedSnapshot = nextSnapshot;
    return nextSnapshot;
  };

  return {
    snapshot(): ControlRuntimeSnapshot {
      return ensureSnapshot();
    },

    async requestRefresh(): Promise<void> {
      await refreshSnapshot();
    },

    publish(input) {
      cachedSnapshot = null;
      liveLinearAdvisoryRuntime = createLiveLinearAdvisoryRuntime({
        controlStore: context.controlStore,
        env: context.env
      });
      notifier.publish(input);
    },

    subscribe(listener) {
      return notifier.subscribe(listener);
    }
  };
}

function createControlRuntimeSnapshot(
  context: ControlRuntimeContext,
  liveLinearAdvisoryRuntime: ReturnType<typeof createLiveLinearAdvisoryRuntime>
): InternalControlRuntimeSnapshot {
  const selectedRunProjection = createSelectedRunProjectionReader(context);
  const compatibilityProjectionSource = createSelectedRunProjectionReader(context);
  let selectedRunSnapshotPromise: Promise<ControlSelectedRunRuntimeSnapshot> | null = null;
  let compatibilityRuntimeSnapshotPromise: Promise<ControlCompatibilityRuntimeSnapshot> | null = null;
  let compatibilityProjectionPromise: Promise<ControlCompatibilityProjectionSnapshot> | null = null;
  let dispatchEvaluationPromise: Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchPilotEvaluation;
  }> | null = null;

  async function readSelectedRunSnapshot(): Promise<ControlSelectedRunRuntimeSnapshot> {
    selectedRunSnapshotPromise ??= (async () => {
      const selected = enrichProjectionSourceWithProviderRetryState(
        await selectedRunProjection.buildSelectedRunContext(),
        context.providerIntakeState
      );
      const issueIdentifier = selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null;
      const dispatchPilotSummary = liveLinearAdvisoryRuntime.readSnapshotSummary(issueIdentifier);
      const tracked = selected?.tracked ?? buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue);
      const providerIntake = buildProviderIntakeSummary(context.providerIntakeState);
      const providerWorkflow = context.providerWorkflowConfigStore
        ? await context.providerWorkflowConfigStore.refresh()
        : null;
      return {
        selected,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked,
        providerIntake,
        providerWorkflow
      };
    })();
    return selectedRunSnapshotPromise;
  }

  async function readCompatibilityRuntimeSnapshot(): Promise<ControlCompatibilityRuntimeSnapshot> {
    compatibilityRuntimeSnapshotPromise ??= (async () => {
      const selectedManifest = await compatibilityProjectionSource.readSelectedRunManifestSnapshot();
      const selected = enrichProjectionSourceWithProviderRetryState(
        await compatibilityProjectionSource.buildCompatibilitySourceContext(selectedManifest),
        context.providerIntakeState
      );
      const discoveredCollections = await discoverCompatibilityCollectionContexts(context);
      const authoritativeRetrying = await discoverAuthoritativeRetryCollectionContexts(context);
      const discoveredSources = discoveredCollections.all
        .map((source) => enrichProjectionSourceWithProviderRetryState(source, context.providerIntakeState))
        .filter((source): source is ControlCompatibilitySourceContext => source !== null);
      const fallbackRetrying = discoveredCollections.retrying
        .concat(isSelectedManifestRetryFallbackCandidate(selectedManifest, selected) ? [selected] : [])
        .map((source) => enrichProjectionSourceWithProviderRetryState(source, context.providerIntakeState))
        .filter((source): source is ControlCompatibilitySourceContext => source !== null);
      const issueIdentifier = selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null;
      const dispatchPilotSummary = liveLinearAdvisoryRuntime.readSnapshotSummary(issueIdentifier);
      const tracked = selected?.tracked ?? buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue);
      const providerIntake = buildProviderIntakeSummary(context.providerIntakeState);
      const polling = readProviderPollingSnapshot(context);
      const providerWorkflow = context.providerWorkflowConfigStore
        ? await context.providerWorkflowConfigStore.refresh()
        : null;
      const running = [
        ...(isAuthoritativeSelectedCurrentRunningSource(selected, context.providerIntakeState)
          ? [selected]
          : []),
        ...discoveredSources.filter((source) =>
          source.rawStatus === 'in_progress' &&
          isAuthoritativeCurrentRunningSource(source, context.providerIntakeState)
        )
      ].filter((entry, index, collection) =>
        collection.findIndex((candidate) => candidate.runId === entry.runId) === index
      );
      const retryingSource =
        (context.providerIntakeState?.claims.length ?? 0) > 0 ? authoritativeRetrying : fallbackRetrying;
      const retrying = retryingSource.filter(
        (entry, index, collection) =>
          collection.findIndex((candidate) => candidate.issueIdentifier === entry.issueIdentifier) === index
      );
      const telemetrySources = buildCompatibilityTelemetrySources({
        selected,
        running,
        retrying
      });
      const { codexTotals, rateLimits } = buildCompatibilityTelemetrySnapshot(telemetrySources, polling);
      return {
        selected,
        running,
        retrying,
        maxConcurrentAgents: resolveProviderPollDispatchLimits(context.controlStore.snapshot().feature_toggles)
          .maxConcurrentAgents,
        codexTotals,
        rateLimits,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked,
        providerIntake,
        providerWorkflow,
        polling
      };
    })();
    return compatibilityRuntimeSnapshotPromise;
  }

  async function readCompatibilityProjection(): Promise<ControlCompatibilityProjectionSnapshot> {
    const runtimeSnapshot = await readCompatibilityRuntimeSnapshot();
    // Cache the stable projection shape once, but re-derive polling-backed rate limits on every
    // read so current Linear budget data is reflected without invalidating the rest of the snapshot.
    compatibilityProjectionPromise ??= Promise.resolve(buildCompatibilityProjectionSnapshot(runtimeSnapshot));
    const polling = readProviderPollingSnapshot(context);
    const telemetrySources = buildCompatibilityTelemetrySources({
      selected: runtimeSnapshot.selected,
      running: runtimeSnapshot.running,
      retrying: runtimeSnapshot.retrying
    });
    const { rateLimits } = buildCompatibilityTelemetrySnapshot(telemetrySources, polling);
    return {
      ...(await compatibilityProjectionPromise),
      rateLimits,
      polling
    };
  }

  async function readDispatchEvaluation(): Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchPilotEvaluation;
  }> {
    if (dispatchEvaluationPromise) {
      return dispatchEvaluationPromise;
    }

    const promise = (async () => {
      const snapshot = await readSelectedRunSnapshot();
      const selectedIssueIdentifier = snapshot.selected?.issueIdentifier ?? null;
      const evaluation = await liveLinearAdvisoryRuntime.readDispatchEvaluation(selectedIssueIdentifier);
      return {
        issueIdentifier:
          evaluation.recommendation?.tracked_issue?.identifier ??
          evaluation.recommendation?.issue_identifier ??
          null,
        evaluation
      };
    })();

    const wrappedPromise = promise.catch((error: unknown) => {
      if (dispatchEvaluationPromise === wrappedPromise) {
        dispatchEvaluationPromise = null;
      }
      throw error;
    });
    dispatchEvaluationPromise = wrappedPromise;

    return dispatchEvaluationPromise;
  }

  return {
    readSelectedRunSnapshot,
    readCompatibilityProjection,
    readDispatchEvaluation,
    async prime(): Promise<void> {
      await readSelectedRunSnapshot();
    }
  };
}

function readProviderPollingSnapshot(
  context: Pick<ControlRuntimeContext, 'providerIntakeState' | 'readProviderIssueHandoff'>
): ControlPollingHealthPayload | null {
  const livePolling = readProviderPollingHealth(context.readProviderIssueHandoff?.() ?? null);
  const persistedPolling = normalizePersistedProviderPollingSnapshot(
    context.providerIntakeState?.polling
  );
  if (persistedPolling && livePolling?.updated_at === null) {
    return persistedPolling;
  }
  return livePolling ?? persistedPolling;
}

function normalizePersistedProviderPollingSnapshot(
  polling: ProviderIntakeState['polling'] | null | undefined
): ControlPollingHealthPayload | null {
  if (!isRecordLike(polling)) {
    return null;
  }
  const linearBudget = normalizeLinearBudgetSnapshot(polling.linear_budget);
  const nextRefresh = resolveControlPollingNextRefreshProjection({
    checking: polling.checking === true,
    nextPollAt: typeof polling.next_poll_at === 'string' ? polling.next_poll_at : null,
    nextPollInMs:
      typeof polling.next_poll_in_ms === 'number' && Number.isFinite(polling.next_poll_in_ms)
        ? polling.next_poll_in_ms
        : null,
    operationStartedAt:
      typeof polling.operation_started_at === 'string' ? polling.operation_started_at : null,
    linearBudget
  });
  return {
    enabled: polling.enabled !== false,
    interval_ms:
      typeof polling.interval_ms === 'number' && Number.isFinite(polling.interval_ms)
        ? polling.interval_ms
        : null,
    checking: polling.checking === true,
    queued: polling.queued === true,
    last_mode: polling.last_mode === 'poll' || polling.last_mode === 'refresh' ? polling.last_mode : null,
    last_requested_at:
      typeof polling.last_requested_at === 'string' ? polling.last_requested_at : null,
    last_completed_at:
      typeof polling.last_completed_at === 'string' ? polling.last_completed_at : null,
    last_success_at: typeof polling.last_success_at === 'string' ? polling.last_success_at : null,
    last_error_at: typeof polling.last_error_at === 'string' ? polling.last_error_at : null,
    last_error: typeof polling.last_error === 'string' ? polling.last_error : null,
    next_poll_at: typeof polling.next_poll_at === 'string' ? polling.next_poll_at : null,
    next_poll_in_ms:
      typeof polling.next_poll_in_ms === 'number' && Number.isFinite(polling.next_poll_in_ms)
        ? polling.next_poll_in_ms
        : null,
    next_refresh_state: nextRefresh.state,
    next_refresh_at: nextRefresh.at,
    next_refresh_in_ms: nextRefresh.in_ms,
    source_updated_at:
      typeof polling.source_updated_at === 'string' ? polling.source_updated_at : null,
    updated_at: typeof polling.updated_at === 'string' ? polling.updated_at : null,
    operation_started_at:
      typeof polling.operation_started_at === 'string' ? polling.operation_started_at : null,
    operation_elapsed_ms:
      typeof polling.operation_elapsed_ms === 'number' && Number.isFinite(polling.operation_elapsed_ms)
        ? polling.operation_elapsed_ms
        : null,
    stalled_after_ms:
      typeof polling.stalled_after_ms === 'number' && Number.isFinite(polling.stalled_after_ms)
        ? polling.stalled_after_ms
        : null,
    stuck: polling.stuck === true,
    stuck_since_at: typeof polling.stuck_since_at === 'string' ? polling.stuck_since_at : null,
    restart_required: polling.restart_required === true,
    reason: typeof polling.reason === 'string' ? polling.reason : null,
    linear_budget: linearBudget
  };
}

function normalizeLinearBudgetSnapshot(value: unknown): LinearBudgetStatus | null {
  if (!isRecordLike(value)) {
    return null;
  }
  if (typeof value.observed_at !== 'string') {
    return null;
  }
  return {
    observed_at: value.observed_at,
    source: typeof value.source === 'string' ? value.source : 'unknown',
    request_id: typeof value.request_id === 'string' ? value.request_id : null,
    retry_after_seconds:
      typeof value.retry_after_seconds === 'number' && Number.isFinite(value.retry_after_seconds)
        ? value.retry_after_seconds
        : null,
    cooldown_until: typeof value.cooldown_until === 'string' ? value.cooldown_until : null,
    cooldown_active: value.cooldown_active === true,
    suppression:
      value.suppression === 'cooldown' ||
      value.suppression === 'exhausted' ||
      value.suppression === 'low' ||
      value.suppression === 'constrained'
        ? value.suppression
        : 'none',
    suppression_reason: typeof value.suppression_reason === 'string' ? value.suppression_reason : null,
    scope_kind: value.scope_kind === 'user' ? 'user' : 'token',
    scope_key:
      typeof value.scope_key === 'string' && value.scope_key.trim().length > 0 ? value.scope_key : 'legacy',
    viewer_id: typeof value.viewer_id === 'string' ? value.viewer_id : null,
    workspace_id: typeof value.workspace_id === 'string' ? value.workspace_id : null,
    token_fingerprints: Array.isArray(value.token_fingerprints)
      ? value.token_fingerprints.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      : [],
    requests: normalizeLinearBudgetBucketSnapshot(value.requests),
    endpoint_requests: normalizeLinearBudgetBucketSnapshot(value.endpoint_requests),
    complexity: normalizeLinearBudgetBucketSnapshot(value.complexity),
    endpoint_complexity: normalizeLinearBudgetBucketSnapshot(value.endpoint_complexity),
    endpoint_name: typeof value.endpoint_name === 'string' ? value.endpoint_name : null,
    selected_endpoint_key: typeof value.selected_endpoint_key === 'string' ? value.selected_endpoint_key : null,
    request_complexity:
      typeof value.request_complexity === 'number' && Number.isFinite(value.request_complexity)
        ? value.request_complexity
        : null,
    // `endpoints: {}` and `reservations: []` are intentionally discarded here:
    // runtime state is rebuilt from live budget data and only metadata such as
    // `reservations_active` is preserved from persisted snapshots.
    endpoints: {},
    reservations: [],
    reservations_active:
      typeof value.reservations_active === 'number' && Number.isFinite(value.reservations_active)
        ? value.reservations_active
        : 0
  };
}

function normalizeLinearBudgetBucketSnapshot(value: unknown): LinearBudgetStatus['requests'] {
  if (!isRecordLike(value)) {
    return null;
  }
  const limit = typeof value.limit === 'number' && Number.isFinite(value.limit) ? value.limit : null;
  const remaining =
    typeof value.remaining === 'number' && Number.isFinite(value.remaining) ? value.remaining : null;
  const resetAt = typeof value.reset_at === 'string' ? value.reset_at : null;
  if (limit === null && remaining === null && resetAt === null) {
    return null;
  }
  return {
    limit,
    remaining,
    reset_at: resetAt
  };
}

function enrichProjectionSourceWithProviderRetryState<
  TSource extends SelectedRunContext | ControlCompatibilitySourceContext
>(source: TSource | null, providerIntakeState: ProviderIntakeState | undefined): TSource | null {
  if (!source || !providerIntakeState) {
    return source;
  }
  const claim = findMatchingProviderIntakeClaim(providerIntakeState, source);
  const retryState = buildProviderRetryState(claim);
  if (!retryState) {
    return source;
  }
  return {
    ...source,
    providerRetryState: retryState
  };
}

function buildProviderRetryState(
  claim: ProviderIntakeClaimRecord | null
): ControlProviderRetryState | null {
  if (!claim) {
    return null;
  }
  const active = claim.retry_queued === true;
  const attempt = claim.retry_attempt ?? null;
  const dueAt = claim.retry_due_at ?? null;
  const error = claim.retry_error ?? null;
  if (!active && attempt === null && dueAt === null && error === null) {
    return null;
  }
  return {
    active,
    attempt,
    due_at: dueAt,
    error
  };
}

function isAuthoritativeSelectedCurrentRunningSource(
  source: ControlCompatibilitySourceContext | null,
  providerIntakeState: ProviderIntakeState | undefined
): source is ControlCompatibilitySourceContext {
  if (!source || source.rawStatus !== 'in_progress') {
    return false;
  }
  if (!providerIntakeState) {
    if (source.taskId !== 'local-mcp') {
      return true;
    }
    return (
      !isControlHostSelectedFallbackSource(source) && isFreshNullProviderRunningSource(source)
    );
  }
  if (source.taskId !== 'local-mcp') {
    return true;
  }
  const claim = findMatchingProviderIntakeClaim(providerIntakeState, source);
  if (claim !== null) {
    return isProviderIntakeClaimActiveCurrentActivity(claim);
  }
  if (source.taskId === 'local-mcp' && !hasExplicitCompatibilityIssueIdentity(source)) {
    return false;
  }
  return isFreshNullProviderRunningSource(source);
}

function isControlHostSelectedFallbackSource(
  source: Pick<
    ControlCompatibilitySourceContext,
    'issueProvider' | 'taskId' | 'issueIdentifier' | 'issueId' | 'runId'
  >
): boolean {
  return (
    source.issueProvider === null &&
    source.taskId === 'local-mcp' &&
    !hasExplicitCompatibilityIssueIdentity(source)
  );
}

function findMatchingProviderIntakeClaim(
  providerIntakeState: ProviderIntakeState,
  source: Pick<
    ControlCompatibilitySourceContext,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'manifestPath'
  >
): ProviderIntakeClaimRecord | null {
  let bestClaim: ProviderIntakeClaimRecord | null = null;
  let bestScore = 0;
  for (const claim of providerIntakeState.claims) {
    const score = scoreProviderClaimMatch(claim, source);
    if (score > bestScore) {
      bestScore = score;
      bestClaim = claim;
      continue;
    }
    if (score === bestScore && score > 0 && bestClaim) {
      if (compareIsoTimestamp(claim.updated_at, bestClaim.updated_at) > 0) {
        bestClaim = claim;
      }
    }
  }
  return bestScore > 0 ? bestClaim : null;
}

function scoreProviderClaimMatch(
  claim: ProviderIntakeClaimRecord,
  source: Pick<
    ControlCompatibilitySourceContext,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId' | 'manifestPath'
  >
): number {
  let score = 0;
  const allowRunBindingMatch = canScoreProviderRunBindingMatch(claim, source);
  const authoritativeIssueId = readAuthoritativeProviderIssueId(source);
  const authoritativeIssueIdentifier = readAuthoritativeProviderIssueIdentifier(source);
  if (claim.issue_id && authoritativeIssueId && claim.issue_id === authoritativeIssueId) {
    score += 16;
  }
  if (claim.issue_identifier && authoritativeIssueIdentifier && claim.issue_identifier === authoritativeIssueIdentifier) {
    score += 12;
  }
  if (isAuthoritativeProviderTaskIdMatch(claim, source)) {
    score += 8;
  }
  if (allowRunBindingMatch && claim.run_id && source.runId && claim.run_id === source.runId) {
    score += 6;
  }
  if (
    allowRunBindingMatch &&
    claim.run_manifest_path &&
    source.manifestPath &&
    claim.run_manifest_path === source.manifestPath
  ) {
    score += 10;
  }
  return score;
}

function canScoreProviderRunBindingMatch(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_id' | 'issue_identifier'>,
  source: Pick<
    ControlCompatibilitySourceContext,
    'issueId' | 'issueIdentifier' | 'taskId' | 'runId'
  >
): boolean {
  if (source.taskId !== 'local-mcp') {
    return true;
  }
  if (!hasExplicitCompatibilityIssueIdentity(source)) {
    return true;
  }
  return hasMatchingProviderIssueIdentity(claim, source);
}

function isAuthoritativeProviderTaskIdMatch(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_id' | 'issue_identifier' | 'task_id'>,
  source: Pick<ControlCompatibilitySourceContext, 'issueId' | 'issueIdentifier' | 'taskId' | 'runId'>
): boolean {
  if (!claim.task_id || !source.taskId || claim.task_id !== source.taskId) {
    return false;
  }
  if (source.taskId !== 'local-mcp') {
    return true;
  }
  const authoritativeIssueId = readAuthoritativeProviderIssueId(source);
  const authoritativeIssueIdentifier = readAuthoritativeProviderIssueIdentifier(source);
  return (
    (claim.issue_id != null && authoritativeIssueId != null && claim.issue_id === authoritativeIssueId) ||
    (claim.issue_identifier != null &&
      authoritativeIssueIdentifier != null &&
      claim.issue_identifier === authoritativeIssueIdentifier)
  );
}

function isSelectedManifestRetryFallbackCandidate(
  selectedManifest: Awaited<ReturnType<ReturnType<typeof createSelectedRunProjectionReader>['readSelectedRunManifestSnapshot']>>,
  selected: ControlCompatibilitySourceContext | null
): selected is ControlCompatibilitySourceContext {
  if (!selectedManifest || !selected || selected.completedAt !== null) {
    return false;
  }
  const manifestRecord = selectedManifest.manifestRecord;
  const provider =
    normalizeManifestString(manifestRecord.issue_provider) ??
    normalizeManifestString(manifestRecord.issueProvider);
  const status = normalizeManifestString(manifestRecord.status);
  return provider === 'linear' && (status === 'failed' || status === 'cancelled');
}

function normalizeManifestString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function compareIsoTimestamp(left: string | null | undefined, right: string | null | undefined): number {
  const leftValue = Date.parse(left ?? '');
  const rightValue = Date.parse(right ?? '');
  if (!Number.isFinite(leftValue) && !Number.isFinite(rightValue)) {
    return 0;
  }
  if (!Number.isFinite(leftValue)) {
    return -1;
  }
  if (!Number.isFinite(rightValue)) {
    return 1;
  }
  return leftValue - rightValue;
}

function isAuthoritativeCurrentRunningSource(
  source: ControlCompatibilitySourceContext,
  providerIntakeState: ProviderIntakeState | undefined
): boolean {
  if (!providerIntakeState) {
    return (
      source.issueProvider !== null ||
      (hasExplicitCompatibilityIssueIdentity(source) && isFreshNullProviderRunningSource(source))
    );
  }
  const claim = findMatchingProviderIntakeClaim(providerIntakeState, source);
  if (source.issueProvider === null) {
    if (claim !== null) {
      return isProviderIntakeClaimActiveCurrentActivity(claim);
    }
    return (
      hasExplicitCompatibilityIssueIdentity(source) &&
      isFreshNullProviderRunningSource(source)
    );
  }
  if (!isProviderIntakeScopedRunningSource(source)) {
    return true;
  }
  return claim !== null && isProviderIntakeClaimActiveCurrentActivity(claim);
}

function isProviderIntakeScopedRunningSource(
  source: Pick<ControlCompatibilitySourceContext, 'issueProvider'>
): boolean {
  return source.issueProvider === 'linear';
}

function hasMatchingProviderIssueIdentity(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_id' | 'issue_identifier'>,
  source: Pick<ControlCompatibilitySourceContext, 'issueId' | 'issueIdentifier' | 'taskId' | 'runId'>
): boolean {
  const authoritativeIssueId = readAuthoritativeProviderIssueId(source);
  const authoritativeIssueIdentifier = readAuthoritativeProviderIssueIdentifier(source);
  return (
    (claim.issue_id != null &&
      authoritativeIssueId != null &&
      claim.issue_id === authoritativeIssueId) ||
    (claim.issue_identifier != null &&
      authoritativeIssueIdentifier != null &&
      claim.issue_identifier === authoritativeIssueIdentifier)
  );
}

function readAuthoritativeProviderIssueId(
  source: Pick<ControlCompatibilitySourceContext, 'issueId' | 'taskId' | 'runId'>
): string | null {
  const issueId = source.issueId ?? null;
  if (!issueId) {
    return null;
  }
  if (source.taskId !== 'local-mcp') {
    return issueId;
  }
  return isFallbackCompatibilityIdentityValue(issueId, source) ? null : issueId;
}

function readAuthoritativeProviderIssueIdentifier(
  source: Pick<ControlCompatibilitySourceContext, 'issueIdentifier' | 'taskId' | 'runId'>
): string | null {
  const issueIdentifier = source.issueIdentifier ?? null;
  if (!issueIdentifier) {
    return null;
  }
  if (source.taskId !== 'local-mcp') {
    return issueIdentifier;
  }
  return isFallbackCompatibilityIdentityValue(issueIdentifier, source) ? null : issueIdentifier;
}

function isFallbackCompatibilityIdentityValue(
  value: string,
  source: Pick<ControlCompatibilitySourceContext, 'taskId' | 'runId'>
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

function hasExplicitCompatibilityIssueIdentity(
  source: Pick<ControlCompatibilitySourceContext, 'issueIdentifier' | 'issueId' | 'taskId' | 'runId'>
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

function isFreshNullProviderRunningSource(
  source: Pick<ControlCompatibilitySourceContext, 'updatedAt' | 'startedAt'>
): boolean {
  const updatedAt = Date.parse(source.updatedAt ?? '');
  const startedAt = Date.parse(source.startedAt ?? '');
  const freshestTimestamp = Math.max(
    Number.isFinite(updatedAt) ? updatedAt : Number.NEGATIVE_INFINITY,
    Number.isFinite(startedAt) ? startedAt : Number.NEGATIVE_INFINITY
  );
  if (!Number.isFinite(freshestTimestamp)) {
    return false;
  }
  return Date.now() - freshestTimestamp <= NULL_PROVIDER_RUNNING_FRESHNESS_MS;
}

function isProviderIntakeClaimActiveCurrentActivity(
  claim: Pick<ProviderIntakeClaimRecord, 'state'>
): boolean {
  return (
    claim.state === 'accepted' ||
    claim.state === 'starting' ||
    claim.state === 'running' ||
    claim.state === 'resuming'
  );
}

function buildCompatibilityTelemetrySnapshot(
  sources: Array<NonNullable<ControlCompatibilityRuntimeSnapshot['selected']>>,
  polling: ControlPollingHealthPayload | null
): {
  codexTotals: ControlCodexTotalsPayload;
  rateLimits: Record<string, unknown> | null;
} {
  const now = Date.now();
  let inputTokens = 0;
  let hasInputTokens = false;
  let outputTokens = 0;
  let hasOutputTokens = false;
  let totalTokens = 0;
  let hasTotalTokens = false;
  let secondsRunning = 0;
  let latestAuthoritativeRateLimits: Record<string, unknown> | null = polling?.linear_budget
    ? { ...polling.linear_budget }
    : null;
  let latestAuthoritativeRateLimitsAt = Number.NEGATIVE_INFINITY;
  if (polling?.linear_budget?.observed_at) {
    latestAuthoritativeRateLimitsAt = Date.parse(polling.linear_budget.observed_at) || Number.NEGATIVE_INFINITY;
  }
  let latestCodexRateLimits: Record<string, unknown> | null = null;
  let latestCodexRateLimitsAt = Number.NEGATIVE_INFINITY;

  for (const source of sources) {
    const proof = source.providerLinearWorkerProof ?? null;
    const tokenUsage = proof?.tokens ?? null;
    if (typeof tokenUsage?.input_tokens === 'number' && Number.isFinite(tokenUsage.input_tokens)) {
      inputTokens += Math.max(0, tokenUsage.input_tokens);
      hasInputTokens = true;
    }
    if (typeof tokenUsage?.output_tokens === 'number' && Number.isFinite(tokenUsage.output_tokens)) {
      outputTokens += Math.max(0, tokenUsage.output_tokens);
      hasOutputTokens = true;
    }
    if (typeof tokenUsage?.total_tokens === 'number' && Number.isFinite(tokenUsage.total_tokens)) {
      totalTokens += Math.max(0, tokenUsage.total_tokens);
      hasTotalTokens = true;
    }
    secondsRunning += computeCompatibilityRuntimeSeconds(source, now);

    const linearBudget = proof?.linear_budget ? { ...proof.linear_budget } : null;
    if (linearBudget) {
      const candidateTimestamp =
        Date.parse(linearBudget.observed_at ?? proof?.updated_at ?? source.updatedAt ?? '') ||
        Number.NEGATIVE_INFINITY;
      if (candidateTimestamp >= latestAuthoritativeRateLimitsAt) {
        latestAuthoritativeRateLimits = linearBudget;
        latestAuthoritativeRateLimitsAt = candidateTimestamp;
      }
    }

    if (proof?.rate_limits) {
      const candidateTimestamp =
        Date.parse(proof.updated_at ?? source.updatedAt ?? '') || Number.NEGATIVE_INFINITY;
      if (candidateTimestamp >= latestCodexRateLimitsAt) {
        latestCodexRateLimits = proof.rate_limits;
        latestCodexRateLimitsAt = candidateTimestamp;
      }
    }
  }

  return {
    codexTotals: {
      input_tokens: hasInputTokens ? inputTokens : null,
      output_tokens: hasOutputTokens ? outputTokens : null,
      total_tokens: hasTotalTokens ? totalTokens : null,
      seconds_running: Number(secondsRunning.toFixed(3))
    },
    rateLimits: combineCompatibilityRateLimits({
      codex: latestCodexRateLimits,
      linearBudget: latestAuthoritativeRateLimits
    })
  };
}

function combineCompatibilityRateLimits(input: {
  codex: Record<string, unknown> | null;
  linearBudget: Record<string, unknown> | null;
}): Record<string, unknown> | null {
  if (input.codex && input.linearBudget) {
    return {
      codex: input.codex,
      linear_budget: input.linearBudget
    };
  }
  return input.codex ?? input.linearBudget ?? null;
}

function buildCompatibilityTelemetrySources(snapshot: Pick<
  ControlCompatibilityRuntimeSnapshot,
  'selected' | 'running' | 'retrying'
>): Array<NonNullable<ControlCompatibilityRuntimeSnapshot['selected']>> {
  return snapshot.running;
}

function computeCompatibilityRuntimeSeconds(
  source: NonNullable<ControlCompatibilityRuntimeSnapshot['selected']>,
  now: number
): number {
  const startedAt = Date.parse(source.startedAt ?? '');
  if (!Number.isFinite(startedAt)) {
    return 0;
  }
  const proofUpdatedAt = Date.parse(source.providerLinearWorkerProof?.updated_at ?? '');
  const completedAt = Date.parse(source.completedAt ?? '');
  const updatedAt = Date.parse(source.updatedAt ?? '');
  const endAt =
    source.rawStatus === 'in_progress'
      ? now
      : completedAt || proofUpdatedAt || updatedAt || now;
  return Math.max(0, (endAt - startedAt) / 1000);
}
