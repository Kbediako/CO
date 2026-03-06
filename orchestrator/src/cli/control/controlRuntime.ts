import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import {
  buildTrackedLinearPayload,
  type ControlSelectedRunRuntimeSnapshot,
  type ControlStatePayload,
} from './observabilityReadModel.js';
import {
  createObservabilitySurface,
  type CompatibilityDispatchResult,
  type CompatibilityIssueResult,
  type CompatibilityRefreshResult
} from './observabilitySurface.js';
import { createLiveLinearAdvisoryRuntime } from './liveLinearAdvisoryRuntime.js';
import {
  createObservabilityUpdateNotifier,
  type ObservabilityUpdate,
  type ObservabilityUpdateListener,
  type ObservabilityUpdateNotifier
} from './observabilityUpdateNotifier.js';
import type { QuestionRecord } from './questions.js';
import { createSelectedRunProjectionReader } from './selectedRunProjection.js';

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
  readUiDataset(): Promise<Record<string, unknown>>;
  readCompatibilityState(): Promise<ControlStatePayload>;
  readCompatibilityDispatch(): Promise<CompatibilityDispatchResult>;
  readCompatibilityRefresh(body?: Record<string, unknown>): CompatibilityRefreshResult;
  readCompatibilityIssue(issueIdentifier: string): Promise<CompatibilityIssueResult>;
}

export interface ControlRuntime {
  snapshot(): ControlRuntimeSnapshot;
  requestRefresh(body?: Record<string, unknown>): Promise<CompatibilityRefreshResult>;
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

    async requestRefresh(body: Record<string, unknown> = {}): Promise<CompatibilityRefreshResult> {
      const result = ensureSnapshot().readCompatibilityRefresh(body);
      if (result.kind === 'rejected') {
        return result;
      }
      await refreshSnapshot();
      return result;
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
  const projection = createSelectedRunProjectionReader(context);
  const observability = createObservabilitySurface({
    controlStore: context.controlStore,
    paths: context.paths,
    advisoryRuntime: liveLinearAdvisoryRuntime,
    readSelectedRunSnapshot
  });
  let selectedRunSnapshotPromise: Promise<ControlSelectedRunRuntimeSnapshot> | null = null;

  async function readSelectedRunSnapshot(): Promise<ControlSelectedRunRuntimeSnapshot> {
    selectedRunSnapshotPromise ??= (async () => {
      const selected = await projection.buildSelectedRunContext();
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

  return {
    readSelectedRunSnapshot,
    readUiDataset: () => observability.readUiDataset(),
    readCompatibilityState: () => observability.readCompatibilityState(),
    readCompatibilityDispatch: () => observability.readCompatibilityDispatch(),
    readCompatibilityRefresh: (body = {}) => observability.readCompatibilityRefresh(body),
    readCompatibilityIssue: (issueIdentifier) => observability.readCompatibilityIssue(issueIdentifier),
    async prime(): Promise<void> {
      await readSelectedRunSnapshot();
    }
  };
}
