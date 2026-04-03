import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import type { ProviderWorkflowConfigStore } from './providerWorkflowConfigStore.js';
import type { LinearBudgetStatus } from './linearBudgetState.js';
import { readProviderPollingHealth } from './providerPollingHealth.js';
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
  buildCompatibilityIssueIndex,
  buildCompatibilityProjectionSnapshot
} from './compatibilityIssuePresenter.js';
import { createLiveLinearAdvisoryRuntime } from './liveLinearAdvisoryRuntime.js';
import {
  createObservabilityUpdateNotifier,
  type ObservabilityUpdate,
  type ObservabilityUpdateListener,
  type ObservabilityUpdateNotifier
} from './observabilityUpdateNotifier.js';
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
    linear_budget: normalizeLinearBudgetSnapshot(polling.linear_budget)
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
    requests: normalizeLinearBudgetBucketSnapshot(value.requests),
    endpoint_requests: normalizeLinearBudgetBucketSnapshot(value.endpoint_requests),
    complexity: normalizeLinearBudgetBucketSnapshot(value.complexity),
    endpoint_complexity: normalizeLinearBudgetBucketSnapshot(value.endpoint_complexity)
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
    return true;
  }
  if (source.issueProvider !== null) {
    return true;
  }
  if (!isControlHostSelectedFallbackSource(source)) {
    return true;
  }
  const claim = findMatchingProviderIntakeClaim(providerIntakeState, source);
  return claim !== null && isProviderIntakeClaimActiveCurrentActivity(claim);
}

function isControlHostSelectedFallbackSource(
  source: Pick<ControlCompatibilitySourceContext, 'issueProvider' | 'taskId'>
): boolean {
  return source.issueProvider === null && source.taskId === 'local-mcp';
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
  if (claim.issue_id && source.issueId && claim.issue_id === source.issueId) {
    score += 16;
  }
  if (claim.issue_identifier === source.issueIdentifier) {
    score += 12;
  }
  if (claim.task_id && source.taskId && claim.task_id === source.taskId) {
    score += 8;
  }
  if (claim.run_id && source.runId && claim.run_id === source.runId) {
    score += 6;
  }
  if (claim.run_manifest_path && source.manifestPath && claim.run_manifest_path === source.manifestPath) {
    score += 10;
  }
  return score;
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
    return true;
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

function hasExplicitCompatibilityIssueIdentity(
  source: Pick<ControlCompatibilitySourceContext, 'issueIdentifier' | 'issueId' | 'taskId' | 'runId'>
): boolean {
  const fallbackIdentity = source.taskId ?? source.runId ?? null;
  if (source.issueIdentifier && source.issueIdentifier !== fallbackIdentity) {
    return true;
  }
  if (source.issueId && source.issueId !== fallbackIdentity) {
    return true;
  }
  return false;
}

function isFreshNullProviderRunningSource(
  source: Pick<ControlCompatibilitySourceContext, 'updatedAt' | 'startedAt'>
): boolean {
  const freshestTimestamp =
    Date.parse(source.updatedAt ?? '') ||
    Date.parse(source.startedAt ?? '') ||
    Number.NEGATIVE_INFINITY;
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
  let latestLegacyRateLimits: Record<string, unknown> | null = null;
  let latestLegacyRateLimitsAt = Number.NEGATIVE_INFINITY;

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
      continue;
    }

    if (proof?.rate_limits && latestAuthoritativeRateLimits === null) {
      const candidateTimestamp =
        Date.parse(proof.updated_at ?? source.updatedAt ?? '') || Number.NEGATIVE_INFINITY;
      if (candidateTimestamp >= latestLegacyRateLimitsAt) {
        latestLegacyRateLimits = proof.rate_limits;
        latestLegacyRateLimitsAt = candidateTimestamp;
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
    rateLimits: latestAuthoritativeRateLimits ?? latestLegacyRateLimits
  };
}

function buildCompatibilityTelemetrySources(snapshot: Pick<
  ControlCompatibilityRuntimeSnapshot,
  'selected' | 'running' | 'retrying'
>): Array<NonNullable<ControlCompatibilityRuntimeSnapshot['selected']>> {
  const issueIndex = buildCompatibilityIssueIndex({
    selected: snapshot.selected,
    running: snapshot.running,
    retrying: snapshot.retrying,
    dispatchPilot: null
  });
  return issueIndex.issues.flatMap((issue) => (issue.runningSource ? [issue.runningSource] : []));
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
