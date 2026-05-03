import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import {
  cloneProviderWorkflowStatusPayload,
  type ProviderWorkflowConfigStore
} from './providerWorkflowConfigStore.js';
import type { LinearBudgetStatus } from './linearBudgetState.js';
import {
  readProviderPollingHealth,
  resolveControlPollingNextRefreshProjection
} from './providerPollingHealth.js';
import {
  normalizeControlHostOwnershipPollingPayload,
  refreshControlHostOwnershipPollingPayload
} from './controlHostOwnership.js';
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
  type ControlProviderIntakeUnavailablePayload,
  type ControlProviderWorkflowPayload,
  type ControlProviderRetryState,
  type ControlPollingHealthPayload,
  type ControlTrackedLinearPayload,
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
import { isProviderLinearWorkerProofFreshForStage } from './providerLinearWorkerTruth.js';
import { buildProviderIssueDebugSnapshot } from './providerIssueObservability.js';
import { classifyProviderLinearWorkflowState } from './providerLinearWorkflowStates.js';
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
    latest_accepted_at?: unknown;
    latest_delivery_id?: unknown;
    latest_result?: unknown;
    seen_deliveries?: Array<{ delivery_id?: unknown; outcome?: unknown }> | null;
    tracked_issue: LiveLinearTrackedIssue | null;
    stale_source?: unknown;
  };
  providerIntakeState?: ProviderIntakeState;
  readPersistedProviderIntakeState?: () => ProviderIntakeState | null;
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore;
  readProviderIssueHandoff?: () => ProviderIssueHandoffService | null;
  env?: NodeJS.ProcessEnv;
}

const NULL_PROVIDER_RUNNING_FRESHNESS_MS = 10 * 60 * 1000;
const PROVIDER_RELEASED_PENDING_REOPEN_PREFIX = 'provider_issue_released_pending_reopen:';
const SYNTHETIC_LINEAR_TASK_ID_PATTERN =
  /^linear-[a-z0-9]+(?:-[a-z0-9]+)*$/i;

interface CompatibilityIdentitySource {
  issueIdentifier?: string | null;
  issueId?: string | null;
  issueProvider: string | null;
  pipelineId?: string | null;
  pipelineTitle: string | null;
  providerLinearWorkerProof?: ControlCompatibilitySourceContext['providerLinearWorkerProof'];
  taskId: string | null;
  runId: string | null;
}

interface ProviderIntakeAuthoritySnapshot {
  state: ProviderIntakeState | null;
  unavailable: ControlProviderIntakeUnavailablePayload | null;
}

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
  let selectedRunSnapshotPromise: Promise<ControlSelectedRunRuntimeSnapshot> | null = null;
  let selectedRunAuthorityFingerprint: string | null = null;
  let compatibilityRuntimeSnapshotPromise: Promise<ControlCompatibilityRuntimeSnapshot> | null = null;
  let compatibilityProjectionPromise: Promise<ControlCompatibilityProjectionSnapshot> | null = null;
  let compatibilityAuthorityFingerprint: string | null = null;
  let dispatchEvaluationPromise: Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchPilotEvaluation;
  }> | null = null;

  async function readSelectedRunSnapshot(): Promise<ControlSelectedRunRuntimeSnapshot> {
    const providerIntakeAuthority = readProviderIntakeAuthorityState(context);
    const authorityContext = buildProviderIntakeAuthorityContext(context, providerIntakeAuthority);
    const authorityFingerprint = buildProviderIntakeAuthorityFingerprint(providerIntakeAuthority);
    if (selectedRunSnapshotPromise && selectedRunAuthorityFingerprint === authorityFingerprint) {
      return selectedRunSnapshotPromise;
    }
    selectedRunSnapshotPromise = null;
    selectedRunAuthorityFingerprint = authorityFingerprint;
    dispatchEvaluationPromise = null;

    selectedRunSnapshotPromise ??= (async () => {
      const preserveAdvisoryFallback = shouldPreserveLinearAdvisoryFallback(
        context,
        providerIntakeAuthority
      );
      const selected = suppressProviderIntakeUnavailableSource(
        enrichProjectionSourceWithProviderRetryState(
          suppressConflictingProjectionTrackedPayload(
            await createSelectedRunProjectionReader(authorityContext).buildSelectedRunContext()
          ),
          authorityContext.providerIntakeState
        ),
        providerIntakeAuthority.unavailable,
        { preserveAdvisoryFields: preserveAdvisoryFallback }
      );
      const issueIdentifier = selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null;
      const dispatchPilotSummary = liveLinearAdvisoryRuntime.readSnapshotSummary(issueIdentifier);
      const tracked = resolveRuntimeTrackedPayload(
        selected,
        context.linearAdvisoryState,
        { allowAdvisoryFallback: preserveAdvisoryFallback }
      );
      const providerIntake = buildProviderIntakeSummary(providerIntakeAuthority.state);
      const providerWorkflow = context.providerWorkflowConfigStore
        ? await refreshProviderWorkflowStatusPayload(context.providerWorkflowConfigStore)
        : null;
      return {
        selected,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked,
        providerIntake,
        providerIntakeUnavailable: providerIntakeAuthority.unavailable,
        providerWorkflow
      };
    })();
    return selectedRunSnapshotPromise;
  }

  async function readCompatibilityRuntimeSnapshot(): Promise<ControlCompatibilityRuntimeSnapshot> {
    const providerIntakeAuthority = readProviderIntakeAuthorityState(context);
    const authorityContext = buildProviderIntakeAuthorityContext(context, providerIntakeAuthority);
    const authorityFingerprint = buildProviderIntakeAuthorityFingerprint(providerIntakeAuthority);
    if (compatibilityRuntimeSnapshotPromise && compatibilityAuthorityFingerprint === authorityFingerprint) {
      return compatibilityRuntimeSnapshotPromise;
    }
    compatibilityRuntimeSnapshotPromise = null;
    compatibilityAuthorityFingerprint = authorityFingerprint;
    compatibilityProjectionPromise = null;

    compatibilityRuntimeSnapshotPromise ??= (async () => {
      const preserveAdvisoryFallback = shouldPreserveLinearAdvisoryFallback(
        context,
        providerIntakeAuthority
      );
      const compatibilityProjectionSource = createSelectedRunProjectionReader(authorityContext);
      const selectedManifest = await compatibilityProjectionSource.readSelectedRunManifestSnapshot();
      const selected = suppressProviderIntakeUnavailableSource(
        enrichProjectionSourceWithProviderRetryState(
          suppressConflictingProjectionTrackedPayload(
            await compatibilityProjectionSource.buildCompatibilitySourceContext(selectedManifest)
          ),
          authorityContext.providerIntakeState
        ),
        providerIntakeAuthority.unavailable,
        { preserveAdvisoryFields: preserveAdvisoryFallback }
      );
      const discoveredCollections = await discoverCompatibilityCollectionContexts(authorityContext);
      const authoritativeRetrying = (await discoverAuthoritativeRetryCollectionContexts(authorityContext))
        .map((source) => suppressConflictingProjectionTrackedPayload(source))
        .map((source) => suppressProviderIntakeUnavailableSource(source, providerIntakeAuthority.unavailable))
        .filter((source): source is ControlCompatibilitySourceContext => source !== null);
      const discoveredSources = discoveredCollections.all
        .map((source) => suppressConflictingProjectionTrackedPayload(source))
        .map((source) => suppressProviderIntakeUnavailableSource(source, providerIntakeAuthority.unavailable))
        .map((source) => enrichProjectionSourceWithProviderRetryState(source, authorityContext.providerIntakeState))
        .filter((source): source is ControlCompatibilitySourceContext => source !== null);
      const fallbackRetrying = discoveredCollections.retrying
        .concat(isSelectedManifestRetryFallbackCandidate(selectedManifest, selected) ? [selected] : [])
        .map((source) => suppressConflictingProjectionTrackedPayload(source))
        .map((source) => suppressProviderIntakeUnavailableSource(source, providerIntakeAuthority.unavailable))
        .map((source) => enrichProjectionSourceWithProviderRetryState(source, authorityContext.providerIntakeState))
        .filter((source): source is ControlCompatibilitySourceContext => source !== null);
      const issueIdentifier = selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null;
      const dispatchPilotSummary = liveLinearAdvisoryRuntime.readSnapshotSummary(issueIdentifier);
      const tracked = resolveRuntimeTrackedPayload(
        selected,
        context.linearAdvisoryState,
        { allowAdvisoryFallback: preserveAdvisoryFallback }
      );
      const providerIntake = buildProviderIntakeSummary(providerIntakeAuthority.state);
      const polling = readProviderPollingSnapshot(authorityContext);
      const providerWorkflow = context.providerWorkflowConfigStore
        ? await refreshProviderWorkflowStatusPayload(context.providerWorkflowConfigStore)
        : null;
      const running = [
        ...(isAuthoritativeSelectedCurrentRunningSource(selected, authorityContext.providerIntakeState)
          ? [selected]
          : []),
        ...discoveredSources.filter((source) =>
          source.rawStatus === 'in_progress' &&
          isAuthoritativeCurrentRunningSource(source, authorityContext.providerIntakeState)
        )
      ].filter((entry, index, collection) =>
        collection.findIndex((candidate) => candidate.runId === entry.runId) === index
      );
      const retryingSource =
        (authorityContext.providerIntakeState?.claims.length ?? 0) > 0 ? authoritativeRetrying : fallbackRetrying;
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
        maxConcurrentAgents: resolveProviderPollDispatchLimits(
          context.controlStore.snapshot().feature_toggles,
          {
            localWorkerOnly: (providerWorkflow?.worker_hosts?.length ?? 0) === 0
          }
        ).maxConcurrentAgents,
        codexTotals,
        rateLimits,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked,
        providerIntake,
        providerIntakeUnavailable: providerIntakeAuthority.unavailable,
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
    const providerIntakeAuthority = readProviderIntakeAuthorityState(context);
    const authorityContext = buildProviderIntakeAuthorityContext(context, providerIntakeAuthority);
    const polling = readProviderPollingSnapshot(authorityContext);
    const telemetrySources = buildCompatibilityTelemetrySources({
      selected: runtimeSnapshot.selected,
      running: runtimeSnapshot.running,
      retrying: runtimeSnapshot.retrying
    });
    const { rateLimits } = buildCompatibilityTelemetrySnapshot(telemetrySources, polling);
    return {
      ...(await compatibilityProjectionPromise),
      rateLimits,
      polling,
      providerIntake: buildProviderIntakeSummary(providerIntakeAuthority.state),
      providerIntakeUnavailable: providerIntakeAuthority.unavailable
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

function buildProviderIntakeAuthorityContext(
  context: ControlRuntimeContext,
  authority: ProviderIntakeAuthoritySnapshot
): ControlRuntimeContext {
  return {
    ...context,
    providerIntakeState: authority.state ?? undefined
  };
}

function buildProviderIntakeAuthorityFingerprint(
  authority: ProviderIntakeAuthoritySnapshot
): string {
  if (authority.unavailable) {
    return JSON.stringify({ unavailable: authority.unavailable });
  }
  if (!authority.state) {
    return 'provider-intake:null';
  }
  const claims = [...(authority.state.claims ?? [])].sort((left, right) =>
    `${left.provider_key}\u0000${left.task_id}\u0000${left.run_id ?? ''}`.localeCompare(
      `${right.provider_key}\u0000${right.task_id}\u0000${right.run_id ?? ''}`
    )
  );
  return JSON.stringify({
    schema_version: authority.state.schema_version,
    rehydrated_at: authority.state.rehydrated_at,
    latest_provider_key: authority.state.latest_provider_key,
    latest_reason: authority.state.latest_reason,
    claims
  });
}

function readProviderIntakeAuthorityState(
  context: Pick<ControlRuntimeContext, 'providerIntakeState' | 'readPersistedProviderIntakeState'>
): ProviderIntakeAuthoritySnapshot {
  if (context.readPersistedProviderIntakeState) {
    try {
      const state = context.readPersistedProviderIntakeState();
      if (state?.authority?.status === 'unavailable') {
        return {
          state: buildUnavailableProviderIntakeState(state),
          unavailable: {
            reason: state.authority.reason,
            updated_at: state.authority.updated_at
          }
        };
      }
      return state
        ? { state, unavailable: null }
        : {
            state: null,
            unavailable: {
              reason: 'raw_provider_intake_unavailable',
              updated_at: null
            }
          };
    } catch {
      return {
        state: null,
        unavailable: {
          reason: 'raw_provider_intake_read_failed',
          updated_at: null
        }
      };
    }
  }
  return {
    state: context.providerIntakeState ?? null,
    unavailable: null
  };
}

function buildUnavailableProviderIntakeState(state: ProviderIntakeState): ProviderIntakeState {
  return {
    ...state,
    latest_provider_key: null,
    latest_reason: null,
    claims: []
  };
}

function shouldPreserveLinearAdvisoryFallback(
  context: Pick<ControlRuntimeContext, 'linearAdvisoryState'>,
  authority: ProviderIntakeAuthoritySnapshot
): boolean {
  if (!authority.unavailable) {
    return true;
  }
  if (context.linearAdvisoryState.stale_source) {
    return false;
  }
  return hasAcceptedLinearAdvisoryFallback(context.linearAdvisoryState);
}

function hasAcceptedLinearAdvisoryFallback(
  advisoryState: Pick<
    ControlRuntimeContext['linearAdvisoryState'],
    'latest_accepted_at' | 'latest_delivery_id' | 'latest_result' | 'seen_deliveries' | 'tracked_issue'
  >
): boolean {
  if (!advisoryState.tracked_issue) {
    return false;
  }
  if (advisoryState.latest_result === 'accepted') {
    return true;
  }
  if (advisoryState.latest_result !== 'duplicate') {
    return false;
  }
  const latestDeliveryId =
    typeof advisoryState.latest_delivery_id === 'string' ? advisoryState.latest_delivery_id : null;
  if (latestDeliveryId) {
    return (advisoryState.seen_deliveries ?? []).some(
      (entry) => entry.delivery_id === latestDeliveryId && entry.outcome === 'accepted'
    );
  }
  return (
    typeof advisoryState.latest_accepted_at === 'string' &&
    advisoryState.latest_accepted_at.trim().length > 0
  );
}

async function refreshProviderWorkflowStatusPayload(
  store: ProviderWorkflowConfigStore
): Promise<ControlProviderWorkflowPayload> {
  if (store.refreshStatus) {
    return await store.refreshStatus();
  }
  return cloneProviderWorkflowStatusPayload(await store.refresh());
}

function readProviderPollingSnapshot(
  context: Pick<ControlRuntimeContext, 'providerIntakeState' | 'readProviderIssueHandoff'>
): ControlPollingHealthPayload | null {
  const livePolling = readProviderPollingHealth(context.readProviderIssueHandoff?.() ?? null);
  const persistedPolling = normalizePersistedProviderPollingSnapshot(
    context.providerIntakeState?.polling
  );
  if (persistedPolling && livePolling?.updated_at === null) {
    return refreshProviderPollingSnapshotOwnership({
      ...persistedPolling,
      control_host_owner: livePolling.control_host_owner ?? persistedPolling.control_host_owner
    });
  }
  return refreshProviderPollingSnapshotOwnership(livePolling ?? persistedPolling);
}

function refreshProviderPollingSnapshotOwnership(
  polling: ControlPollingHealthPayload | null
): ControlPollingHealthPayload | null {
  if (!polling) {
    return null;
  }
  return {
    ...polling,
    control_host_owner: refreshControlHostOwnershipPollingPayload(polling.control_host_owner ?? null)
  };
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
    refresh_phase: normalizeOptionalPollingString(polling.refresh_phase),
    refresh_request_class: normalizeOptionalPollingString(polling.refresh_request_class),
    refresh_provider_keys: normalizePollingStringArray(polling.refresh_provider_keys),
    refresh_counts: normalizePollingRefreshCounts(polling.refresh_counts),
    stuck: polling.stuck === true,
    stuck_since_at: typeof polling.stuck_since_at === 'string' ? polling.stuck_since_at : null,
    restart_required: polling.restart_required === true,
    reason: typeof polling.reason === 'string' ? polling.reason : null,
    linear_budget: linearBudget,
    control_host_owner: refreshControlHostOwnershipPollingPayload(
      normalizeControlHostOwnershipPollingPayload(polling.control_host_owner)
    )
  };
}

function normalizePollingRefreshCounts(value: unknown): Record<string, number> | null {
  if (!isRecordLike(value)) {
    return null;
  }
  const normalized: Record<string, number> = {};
  for (const [rawKey, count] of Object.entries(value)) {
    const key = rawKey.trim();
    if (key.length === 0 || typeof count !== 'number' || !Number.isFinite(count)) {
      continue;
    }
    normalized[key] = count;
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizePollingStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = value
    .map((entry) => normalizeOptionalPollingString(entry))
    .filter((entry): entry is string => entry !== null);
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalPollingString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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

function suppressProviderIntakeUnavailableSource<
  TSource extends SelectedRunContext | ControlCompatibilitySourceContext
>(
  source: TSource | null,
  unavailable: ControlProviderIntakeUnavailablePayload | null,
  options: { preserveAdvisoryFields?: boolean } = {}
): TSource | null {
  if (!source || !unavailable) {
    return source;
  }
  return isProviderBoundCompatibilitySource(source)
    ? null
    : options.preserveAdvisoryFields === true
      ? source
      : clearAdvisoryDerivedProjectionFields(source);
}

function isProviderBoundCompatibilitySource(
  source: Pick<
    ControlCompatibilitySourceContext,
    'issueProvider' | 'pipelineId' | 'pipelineTitle' | 'providerLinearWorkerProof' | 'taskId'
  >
): boolean {
  return (
    source.issueProvider === 'linear' ||
    (source.issueProvider === null &&
      source.taskId !== null &&
      SYNTHETIC_LINEAR_TASK_ID_PATTERN.test(source.taskId)) ||
    source.pipelineId === 'provider-linear-worker' ||
    source.pipelineTitle === 'Provider Linear Worker' ||
    source.providerLinearWorkerProof != null
  );
}

function clearAdvisoryDerivedProjectionFields<
  TSource extends SelectedRunContext | ControlCompatibilitySourceContext
>(source: TSource): TSource {
  const providerDebugSnapshot = clearProviderDebugLiveLinearState(source.providerDebugSnapshot ?? null);
  const shouldResetDisplayStatus =
    source.compatibilityState !== null &&
    source.compatibilityState !== undefined &&
    source.displayStatus === source.compatibilityState;
  return {
    ...source,
    displayStatus: shouldResetDisplayStatus ? source.rawStatus : source.displayStatus,
    statusReason: shouldResetDisplayStatus ? null : source.statusReason,
    latestEvent: resetAdvisoryDerivedLatestEvent(source, providerDebugSnapshot),
    tracked: null,
    compatibilityState: null,
    providerDebugSnapshot
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
  const providerProof =
    source.providerLinearWorkerProof &&
    isProviderLinearWorkerProofFreshForStage(
      source.providerLinearWorkerProof as unknown as Record<string, unknown>,
      source.startedAt
    ) &&
    !hasStaleLocalProviderInProgressProof(source.providerLinearWorkerProof, source.startedAt)
      ? source.providerLinearWorkerProof
      : null;
  const providerDebugSnapshot =
    claim !== null
      ? buildProviderIssueDebugSnapshot({
          issue_id: source.issueId,
          issue_identifier: source.issueIdentifier,
          tracked_issue: source.tracked?.linear ?? null,
          claim,
          proof: providerProof,
          rehydrated_at: providerIntakeState.rehydrated_at ?? null
        }) ?? source.providerDebugSnapshot ?? null
      : source.providerDebugSnapshot ?? null;
  if (!retryState && providerDebugSnapshot === source.providerDebugSnapshot) {
    return source;
  }
  return {
    ...source,
    ...(providerDebugSnapshot ? { providerDebugSnapshot } : {}),
    ...(retryState ? { providerRetryState: retryState } : {})
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
  const claim = findMatchingProviderIntakeClaim(providerIntakeState, source);
  if (claim !== null) {
    if (isProviderIntakeClaimActiveForSourceCurrentActivity(claim, source)) {
      return true;
    }
    const claimBoundToSource = isProviderIntakeClaimBoundToCompatibilitySource(claim, source);
    const claimMatchesSelectedTask = isAuthoritativeProviderTaskIdMatch(claim, source);
    if (
      (claimBoundToSource || claimMatchesSelectedTask) &&
      claim.state === 'released' &&
      isProviderIssueReleasedLiveWorkerRehydrateReason(claim.reason) &&
      !isProviderStartedWorkerSourceIssueState(claim, source)
    ) {
      return false;
    }
    if (
      (claimBoundToSource || claimMatchesSelectedTask) &&
      hasStaleLocalProviderInProgressProof(source.providerLinearWorkerProof, source.startedAt)
    ) {
      return false;
    }
    if (claimBoundToSource) {
      return false;
    }
  }
  if (source.taskId !== 'local-mcp') {
    return true;
  }
  if (source.taskId === 'local-mcp' && !hasExplicitCompatibilityIssueIdentity(source)) {
    return false;
  }
  return isFreshNullProviderRunningSource(source);
}

function isControlHostSelectedFallbackSource(
  source: Pick<
    ControlCompatibilitySourceContext,
    | 'issueProvider'
    | 'issueIdentifier'
    | 'issueId'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
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
    | 'issueId'
    | 'issueIdentifier'
    | 'issueProvider'
    | 'manifestPath'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
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

function isProviderIntakeClaimBoundToCompatibilitySource(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'issue_id' | 'issue_identifier' | 'run_manifest_path' | 'run_id' | 'task_id'
  >,
  source: Pick<
    ControlCompatibilitySourceContext,
    | 'issueId'
    | 'issueIdentifier'
    | 'issueProvider'
    | 'manifestPath'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
  >
): boolean {
  const manifestBinding =
    claim.run_manifest_path && source.manifestPath
      ? claim.run_manifest_path === source.manifestPath
      : null;
  if (manifestBinding !== null) {
    return manifestBinding;
  }

  const runBinding =
    claim.run_id && source.runId
      ? claim.run_id === source.runId && claim.task_id === source.taskId
      : null;
  if (runBinding !== null) {
    return runBinding;
  }
  return isAuthoritativeProviderTaskIdMatch(claim, source);
}

function scoreProviderClaimMatch(
  claim: ProviderIntakeClaimRecord,
  source: Pick<
    ControlCompatibilitySourceContext,
    | 'issueId'
    | 'issueIdentifier'
    | 'issueProvider'
    | 'manifestPath'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
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
    | 'issueId'
    | 'issueIdentifier'
    | 'issueProvider'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
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
  source: Pick<
    ControlCompatibilitySourceContext,
    | 'issueId'
    | 'issueIdentifier'
    | 'issueProvider'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
  >
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
      return isProviderIntakeClaimActiveForSourceCurrentActivity(claim, source);
    }
    return (
      hasExplicitCompatibilityIssueIdentity(source) &&
      isFreshNullProviderRunningSource(source)
    );
  }
  if (!isProviderIntakeScopedRunningSource(source)) {
    return true;
  }
  return claim !== null && isProviderIntakeClaimActiveForSourceCurrentActivity(claim, source);
}

function isProviderIntakeScopedRunningSource(
  source: Pick<ControlCompatibilitySourceContext, 'issueProvider'>
): boolean {
  return source.issueProvider === 'linear';
}

function hasMatchingProviderIssueIdentity(
  claim: Pick<ProviderIntakeClaimRecord, 'issue_id' | 'issue_identifier'>,
  source: Pick<
    ControlCompatibilitySourceContext,
    | 'issueId'
    | 'issueIdentifier'
    | 'issueProvider'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
  >
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
  source: Pick<
    ControlCompatibilitySourceContext,
    | 'issueId'
    | 'issueProvider'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
  >
): string | null {
  const issueId = source.issueId ?? null;
  if (!issueId) {
    return null;
  }
  return isFallbackCompatibilityIdentityValue(issueId, source) ? null : issueId;
}

function readAuthoritativeProviderIssueIdentifier(
  source: Pick<
    ControlCompatibilitySourceContext,
    | 'issueIdentifier'
    | 'issueProvider'
    | 'pipelineId'
    | 'pipelineTitle'
    | 'providerLinearWorkerProof'
    | 'taskId'
    | 'runId'
  >
): string | null {
  const issueIdentifier = source.issueIdentifier ?? null;
  if (!issueIdentifier) {
    return null;
  }
  return isFallbackCompatibilityIdentityValue(issueIdentifier, source) ? null : issueIdentifier;
}

function isFallbackCompatibilityIdentityValue(
  value: string,
  source: CompatibilityIdentitySource
): boolean {
  return (
    isFallbackCompatibilityIdentityAlias(value, source.taskId, source) ||
    isFallbackCompatibilityIdentityAlias(value, source.runId, source)
  );
}

function isFallbackCompatibilityIdentityAlias(
  value: string,
  candidate: string | null,
  source: CompatibilityIdentitySource
): boolean {
  if (!candidate) {
    return false;
  }
  if (value === candidate) {
    return true;
  }
  return (
    hasSyntheticLinearFallbackProvenance(source) &&
    SYNTHETIC_LINEAR_TASK_ID_PATTERN.test(value) &&
    candidate.startsWith(`${value}-`)
  );
}

function resolveRuntimeTrackedPayload(
  selected: SelectedRunContext | ControlCompatibilitySourceContext | null,
  advisoryState: { tracked_issue: LiveLinearTrackedIssue | null; stale_source?: unknown },
  options: { allowAdvisoryFallback?: boolean } = {}
) {
  if (selected?.tracked) {
    if (linearTrackedIssueConflictsWithAuthoritativeIdentity(selected, selected.tracked.linear)) {
      return null;
    }
    return selected.tracked;
  }
  if (options.allowAdvisoryFallback === false) {
    return null;
  }
  if (advisoryState.stale_source) {
    return null;
  }
  const advisoryTrackedIssue = advisoryState.tracked_issue;
  if (!advisoryTrackedIssue) {
    return null;
  }
  if (linearTrackedIssueConflictsWithAuthoritativeIdentity(selected, advisoryTrackedIssue)) {
    return null;
  }
  return buildTrackedLinearPayload(advisoryTrackedIssue);
}

function suppressConflictingProjectionTrackedPayload<
  TSource extends SelectedRunContext | ControlCompatibilitySourceContext
>(source: TSource | null): TSource | null {
  if (!source?.tracked) {
    return source;
  }
  if (!linearTrackedIssueConflictsWithAuthoritativeIdentity(source, source.tracked.linear)) {
    return source;
  }
  const shouldResetDisplayStatus =
    source.compatibilityState !== null &&
    source.compatibilityState !== undefined &&
    source.displayStatus === source.compatibilityState;
  const providerDebugSnapshot = clearProviderDebugLiveLinearState(source.providerDebugSnapshot ?? null);
  return {
    ...source,
    displayStatus: shouldResetDisplayStatus ? source.rawStatus : source.displayStatus,
    statusReason: shouldResetDisplayStatus ? null : source.statusReason,
    latestEvent: resetAdvisoryDerivedLatestEvent(source, providerDebugSnapshot),
    tracked: { linear: null },
    compatibilityState: null,
    providerDebugSnapshot
  };
}

function clearProviderDebugLiveLinearState(
  snapshot: ControlCompatibilitySourceContext['providerDebugSnapshot'] | null
): ControlCompatibilitySourceContext['providerDebugSnapshot'] | null {
  if (!snapshot) {
    return snapshot;
  }
  const shouldClearAdvisoryDerivedProgress = snapshot.progress?.kind === 'workflow';
  return {
    ...snapshot,
    live_linear_state: {
      state: null,
      state_type: null,
      updated_at: null
    },
    ...(shouldClearAdvisoryDerivedProgress
      ? {
          progress: null,
          last_semantic_progress_at: snapshot.last_audit_operation?.recorded_at ?? null,
          stall_classification: null,
          stall_reason: null,
          recovery_recommendation: null
        }
      : {})
  };
}

function resetAdvisoryDerivedLatestEvent<
  TSource extends SelectedRunContext | ControlCompatibilitySourceContext
>(
  source: TSource,
  providerDebugSnapshot: ControlCompatibilitySourceContext['providerDebugSnapshot'] | null
): TSource['latestEvent'] {
  if (
    source.latestEvent?.source !== 'provider_debug_progress' ||
    providerDebugSnapshot?.progress !== null
  ) {
    return source.latestEvent;
  }
  return {
    at: source.updatedAt,
    event: source.rawStatus,
    message: source.summary,
    source: 'run_summary',
    messageRecordedAt: null,
    sourceUpdatedAt: source.updatedAt,
    candidates: [],
    requestedBy: null,
    reason: null
  };
}

function linearTrackedIssueConflictsWithAuthoritativeIdentity(
  selected: SelectedRunContext | ControlCompatibilitySourceContext | null,
  linear: Pick<ControlTrackedLinearPayload, 'id' | 'identifier'> | null
): boolean {
  if (!selected || !linear || !hasExplicitCompatibilityIssueIdentity(selected)) {
    return false;
  }
  const authoritativeIssueId = readAuthoritativeProviderIssueId(selected);
  const authoritativeIssueIdentifier = readAuthoritativeProviderIssueIdentifier(selected);
  if (authoritativeIssueId !== null && linear.id === authoritativeIssueId) {
    return false;
  }
  if (authoritativeIssueIdentifier !== null && linear.identifier === authoritativeIssueIdentifier) {
    return false;
  }
  return authoritativeIssueId !== null || authoritativeIssueIdentifier !== null;
}

function hasExplicitCompatibilityIssueIdentity(
  source: CompatibilityIdentitySource
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

function hasSyntheticLinearFallbackProvenance(
  source: CompatibilityIdentitySource
): boolean {
  if (source.issueProvider !== null && source.issueProvider !== 'linear') {
    return false;
  }
  return (
    source.pipelineId === 'provider-linear-worker' ||
    source.pipelineTitle === 'Provider Linear Worker' ||
    source.providerLinearWorkerProof != null ||
    (source.issueProvider === 'linear' &&
      (source.pipelineId === 'docs-review' ||
        source.pipelineId === 'implementation-gate' ||
        source.pipelineId === 'docs-relevance-advisory' ||
        source.pipelineId === 'provider-linear-child-lane'))
  );
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
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason' | 'issue_state' | 'issue_state_type'>
): boolean {
  if (
    claim.state === 'accepted' ||
    claim.state === 'starting' ||
    claim.state === 'running' ||
    claim.state === 'resuming'
  ) {
    return true;
  }
  if (
    claim.state === 'released' &&
    isProviderIssueReleasedPendingReopen(claim.reason) &&
    isProviderStartedWorkerIssueState({
      state: claim.issue_state,
      state_type: claim.issue_state_type
    })
  ) {
    return true;
  }
  return false;
}

function isProviderIntakeClaimActiveForSourceCurrentActivity(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_updated_at'
  >,
  source: Pick<
    ControlCompatibilitySourceContext,
    'rawStatus' | 'tracked' | 'providerLinearWorkerProof' | 'startedAt'
  >
): boolean {
  if (isStaleTerminalReleasedProviderSource(claim, source)) {
    return false;
  }
  if (isAcceptedPendingRevalidationSourceWithInactiveLocalProof(claim, source)) {
    return false;
  }
  if (
    source.rawStatus === 'in_progress' &&
    claim.state === 'released' &&
    isProviderIssueReleasedLiveWorkerRehydrateReason(claim.reason) &&
    isProviderStartedWorkerSourceIssueState(claim, source) &&
    !hasStaleLocalProviderInProgressProof(source.providerLinearWorkerProof, source.startedAt)
  ) {
    return true;
  }
  return isProviderIntakeClaimActiveCurrentActivity(claim);
}

function isAcceptedPendingRevalidationSourceWithInactiveLocalProof(
  claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason'>,
  source: Pick<ControlCompatibilitySourceContext, 'rawStatus' | 'providerLinearWorkerProof' | 'startedAt'>
): boolean {
  return (
    source.rawStatus === 'in_progress' &&
    claim.state === 'accepted' &&
    claim.reason === 'provider_issue_rehydration_pending_revalidation' &&
    source.providerLinearWorkerProof !== null &&
    (!isProviderLinearWorkerProofFreshForStage(
      source.providerLinearWorkerProof as unknown as Record<string, unknown>,
      source.startedAt
    ) || hasStaleLocalProviderInProgressProof(source.providerLinearWorkerProof, source.startedAt))
  );
}

function isProviderStartedWorkerSourceIssueState(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'reason' | 'issue_state' | 'issue_state_type' | 'issue_updated_at'
  >,
  source: Pick<ControlCompatibilitySourceContext, 'tracked'>
): boolean {
  const trackedIssue = source.tracked?.linear ?? null;
  if (trackedIssue) {
    const trackedUpdatedAt = Date.parse(trackedIssue.updated_at ?? '');
    const claimIssueUpdatedAt = Date.parse(claim.issue_updated_at ?? '');
    const trackedIssueIsCurrent =
      Number.isFinite(trackedUpdatedAt) &&
      (!Number.isFinite(claimIssueUpdatedAt) || trackedUpdatedAt >= claimIssueUpdatedAt);
    if (trackedIssueIsCurrent) {
      return isProviderStartedWorkerIssueState({
        state: trackedIssue.state,
        state_type: trackedIssue.state_type
      });
    }
  }
  return (
    isProviderIssueReleasedPendingReopen(claim.reason) &&
    isProviderStartedWorkerIssueState({
      state: claim.issue_state,
      state_type: claim.issue_state_type
    })
  );
}

function isStaleTerminalReleasedProviderSource(
  claim: Pick<
    ProviderIntakeClaimRecord,
    'state' | 'reason' | 'issue_state' | 'issue_state_type' | 'issue_updated_at'
  >,
  source: Pick<ControlCompatibilitySourceContext, 'tracked' | 'providerLinearWorkerProof' | 'startedAt'>
): boolean {
  if (
    claim.state !== 'released' ||
    !isProviderIssueReleasedLiveWorkerRehydrateReason(claim.reason) ||
    !isProviderStartedWorkerIssueState({
      state: claim.issue_state,
      state_type: claim.issue_state_type
    })
  ) {
    return false;
  }
  if (!hasFreshTerminalSelectedTrackedIssue(source.tracked, claim)) {
    return false;
  }
  return hasStaleLocalProviderInProgressProof(
    source.providerLinearWorkerProof,
    source.startedAt
  );
}

function hasFreshTerminalSelectedTrackedIssue(
  tracked: ControlCompatibilitySourceContext['tracked'],
  claim: Pick<ProviderIntakeClaimRecord, 'issue_updated_at'>
): boolean {
  const linear = tracked?.linear ?? null;
  if (!linear) {
    return false;
  }
  if (!classifyProviderLinearWorkflowState({
    state: linear.state,
    state_type: linear.state_type
  }).isTerminal) {
    return false;
  }
  const trackedUpdatedAt = Date.parse(linear.updated_at ?? '');
  const claimIssueUpdatedAt = Date.parse(claim.issue_updated_at ?? '');
  if (!Number.isFinite(trackedUpdatedAt) || !Number.isFinite(claimIssueUpdatedAt)) {
    return false;
  }
  return trackedUpdatedAt >= claimIssueUpdatedAt;
}

function hasStaleLocalProviderInProgressProof(
  proof: ControlCompatibilitySourceContext['providerLinearWorkerProof'],
  startedAt: ControlCompatibilitySourceContext['startedAt']
): boolean {
  if (!proof) {
    return false;
  }
  if (!isProviderLinearWorkerProofFreshForStage(proof as unknown as Record<string, unknown>, startedAt)) {
    return false;
  }
  if (
    (proof.owner_status && proof.owner_status !== 'in_progress') ||
    proof.owner_phase === 'ended'
  ) {
    return false;
  }
  if (normalizeManifestString(proof.worker_host) !== null) {
    return false;
  }
  const pid = readProviderProofPid(proof.pid);
  return pid !== null && pid > 0 && !isLocalProcessAlive(pid);
}

function readProviderProofPid(pid: string | number | null | undefined): number | null {
  if (typeof pid === 'number') {
    return Number.isInteger(pid) ? pid : null;
  }
  if (typeof pid !== 'string') {
    return null;
  }
  const trimmed = pid.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isLocalProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code !== 'ESRCH';
  }
}

function isProviderIssueReleasedPendingReopen(reason: string | null | undefined): boolean {
  return typeof reason === 'string' && reason.startsWith(PROVIDER_RELEASED_PENDING_REOPEN_PREFIX);
}

function isProviderIssueReleasedLiveWorkerRehydrateReason(
  reason: string | null | undefined
): boolean {
  return (
    isProviderIssueReleasedPendingReopen(reason) ||
    reason === 'provider_issue_released:not_active'
  );
}

function isProviderStartedWorkerIssueState(input: {
  state: string | null | undefined;
  state_type: string | null | undefined;
}): boolean {
  const workflowState = classifyProviderLinearWorkflowState(input);
  return workflowState.isActive && !workflowState.isTodo;
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
  let reasoningOutputTokens = 0;
  let hasReasoningOutputTokens = false;
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
    if (
      typeof tokenUsage?.reasoning_output_tokens === 'number' &&
      Number.isFinite(tokenUsage.reasoning_output_tokens)
    ) {
      reasoningOutputTokens += Math.max(0, tokenUsage.reasoning_output_tokens);
      hasReasoningOutputTokens = true;
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
        resolveProviderLinearWorkerRateLimitsRecordedAt(proof, source);
      if (candidateTimestamp >= latestCodexRateLimitsAt) {
        latestCodexRateLimits = proof.rate_limits;
        latestCodexRateLimitsAt = candidateTimestamp;
      }
    }
  }

  const codexTotals: ControlCodexTotalsPayload = {
    input_tokens: hasInputTokens ? inputTokens : null,
    output_tokens: hasOutputTokens ? outputTokens : null,
    total_tokens: hasTotalTokens ? totalTokens : null,
    seconds_running: Number(secondsRunning.toFixed(3))
  };
  if (hasReasoningOutputTokens) {
    codexTotals.reasoning_output_tokens = reasoningOutputTokens;
  }

  return {
    codexTotals,
    rateLimits: combineCompatibilityRateLimits({
      codex: latestCodexRateLimits,
      linearBudget: latestAuthoritativeRateLimits
    })
  };
}

function resolveProviderLinearWorkerRateLimitsRecordedAt(
  proof: NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>,
  source: NonNullable<ControlCompatibilityRuntimeSnapshot['selected']>
): number {
  let semanticLatest = Number.NEGATIVE_INFINITY;
  for (const candidate of [
    proof.last_event_at,
    proof.current_turn_activity?.recorded_at
  ]) {
    const parsed = Date.parse(candidate ?? '');
    if (Number.isFinite(parsed)) {
      semanticLatest = Math.max(semanticLatest, parsed);
    }
  }
  if (Number.isFinite(semanticLatest)) {
    return semanticLatest;
  }

  let fallbackLatest = Number.NEGATIVE_INFINITY;
  for (const candidate of [
    source.updatedAt,
    proof.updated_at
  ]) {
    const parsed = Date.parse(candidate ?? '');
    if (Number.isFinite(parsed)) {
      fallbackLatest = Math.max(fallbackLatest, parsed);
    }
  }
  return fallbackLatest;
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
