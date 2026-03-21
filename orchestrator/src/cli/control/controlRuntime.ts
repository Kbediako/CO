import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import {
  buildProviderIntakeSummary,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState
} from './providerIntakeState.js';
import {
  buildTrackedLinearPayload,
  type ControlCompatibilityProjectionSnapshot,
  type ControlCompatibilitySourceContext,
  type ControlCodexTotalsPayload,
  type ControlProviderRetryState,
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
  env?: NodeJS.ProcessEnv;
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
      return {
        selected,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked,
        providerIntake
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
        .map((source) => enrichProjectionSourceWithProviderRetryState(source, context.providerIntakeState))
        .filter((source): source is ControlCompatibilitySourceContext => source !== null);
      const issueIdentifier = selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null;
      const dispatchPilotSummary = liveLinearAdvisoryRuntime.readSnapshotSummary(issueIdentifier);
      const tracked = selected?.tracked ?? buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue);
      const providerIntake = buildProviderIntakeSummary(context.providerIntakeState);
      const running = [
        ...(selected?.rawStatus === 'in_progress' ? [selected] : []),
        ...discoveredSources.filter((source) => source.rawStatus === 'in_progress')
      ].filter((entry, index, collection) =>
        collection.findIndex((candidate) => candidate.runId === entry.runId) === index
      );
      const retryingSource = context.providerIntakeState ? authoritativeRetrying : fallbackRetrying;
      const retrying = retryingSource.filter(
        (entry, index, collection) =>
          collection.findIndex((candidate) => candidate.issueIdentifier === entry.issueIdentifier) === index
      );
      const telemetrySources = buildCompatibilityTelemetrySources({
        selected,
        running,
        retrying
      });
      const { codexTotals, rateLimits } = buildCompatibilityTelemetrySnapshot(telemetrySources);
      return {
        selected,
        running,
        retrying,
        codexTotals,
        rateLimits,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked,
        providerIntake
      };
    })();
    return compatibilityRuntimeSnapshotPromise;
  }

  async function readCompatibilityProjection(): Promise<ControlCompatibilityProjectionSnapshot> {
    compatibilityProjectionPromise ??= readCompatibilityRuntimeSnapshot().then((snapshot) =>
      buildCompatibilityProjectionSnapshot(snapshot)
    );
    return compatibilityProjectionPromise;
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
      const issueIdentifier = snapshot.selected?.issueIdentifier ?? null;
      return {
        issueIdentifier,
        evaluation: await liveLinearAdvisoryRuntime.readDispatchEvaluation(issueIdentifier)
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
  const attempt = claim.retry_attempt ?? null;
  const dueAt = claim.retry_due_at ?? null;
  const error = claim.retry_error ?? null;
  if (attempt === null && dueAt === null && error === null) {
    return null;
  }
  return {
    active: claim.retry_queued === true && attempt !== null,
    attempt,
    due_at: dueAt,
    error
  };
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

function buildCompatibilityTelemetrySnapshot(
  sources: Array<NonNullable<ControlCompatibilityRuntimeSnapshot['selected']>>
): {
  codexTotals: ControlCodexTotalsPayload;
  rateLimits: Record<string, unknown> | null;
} {
  const now = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let secondsRunning = 0;
  let latestRateLimits: Record<string, unknown> | null = null;
  let latestRateLimitsAt = Number.NEGATIVE_INFINITY;

  for (const source of sources) {
    const proof = source.providerLinearWorkerProof ?? null;
    const tokenUsage = proof?.tokens ?? null;
    inputTokens += Math.max(0, tokenUsage?.input_tokens ?? 0);
    outputTokens += Math.max(0, tokenUsage?.output_tokens ?? 0);
    totalTokens += Math.max(0, tokenUsage?.total_tokens ?? 0);
    secondsRunning += computeCompatibilityRuntimeSeconds(source, now);

    const rateLimits = proof?.rate_limits ?? null;
    if (rateLimits) {
      const candidateTimestamp = Date.parse(proof?.updated_at ?? source.updatedAt ?? '') || Number.NEGATIVE_INFINITY;
      if (candidateTimestamp >= latestRateLimitsAt) {
        latestRateLimits = rateLimits;
        latestRateLimitsAt = candidateTimestamp;
      }
    }
  }

  return {
    codexTotals: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      seconds_running: Number(secondsRunning.toFixed(3))
    },
    rateLimits: latestRateLimits
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
  return issueIndex.issues.flatMap((issue) => {
    const preferredSource = issue.runningSource ?? issue.retrySource;
    return preferredSource ? [preferredSource] : [];
  });
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
