import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import {
  buildCompatibilityProjectionSnapshot,
  buildTrackedLinearPayload,
  type ControlCompatibilityProjectionSnapshot,
  type ControlCompatibilityRuntimeSnapshot,
  type ControlSelectedRunRuntimeSnapshot,
} from './observabilityReadModel.js';
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
      const selected = await selectedRunProjection.buildSelectedRunContext();
      const issueIdentifier = selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null;
      const dispatchPilotSummary = liveLinearAdvisoryRuntime.readSnapshotSummary(issueIdentifier);
      const tracked = selected?.tracked ?? buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue);
      return {
        selected,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked
      };
    })();
    return selectedRunSnapshotPromise;
  }

  async function readCompatibilityRuntimeSnapshot(): Promise<ControlCompatibilityRuntimeSnapshot> {
    compatibilityRuntimeSnapshotPromise ??= (async () => {
      const selectedManifest = await compatibilityProjectionSource.readSelectedRunManifestSnapshot();
      const selected = await compatibilityProjectionSource.buildCompatibilitySourceContext(selectedManifest);
      const discoveredCollections = await discoverCompatibilityCollectionContexts(context);
      const issueIdentifier = selected?.issueIdentifier ?? selected?.taskId ?? selected?.runId ?? null;
      const dispatchPilotSummary = liveLinearAdvisoryRuntime.readSnapshotSummary(issueIdentifier);
      const tracked = selected?.tracked ?? buildTrackedLinearPayload(context.linearAdvisoryState.tracked_issue);
      const running = [
        ...(selected?.rawStatus === 'in_progress' ? [selected] : []),
        ...discoveredCollections.running
      ];
      const retrying = [
        ...(selected?.rawStatus === 'failed' && !selected.completedAt ? [selected] : []),
        ...discoveredCollections.retrying
      ];
      return {
        selected,
        running,
        retrying,
        dispatchPilot: dispatchPilotSummary.configured ? dispatchPilotSummary : null,
        tracked
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
