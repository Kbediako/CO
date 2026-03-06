import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { LiveLinearTrackedIssue } from './linearDispatchSource.js';
import {
  createObservabilitySurface,
  type CompatibilityDispatchResult,
  type CompatibilityIssueResult,
  type CompatibilityRefreshResult
} from './observabilitySurface.js';
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
  readUiDataset(): Promise<Record<string, unknown>>;
  readCompatibilityState(): Promise<Record<string, unknown>>;
  readCompatibilityDispatch(): Promise<CompatibilityDispatchResult>;
  readCompatibilityRefresh(body?: Record<string, unknown>): CompatibilityRefreshResult;
  readCompatibilityIssue(issueIdentifier: string): Promise<CompatibilityIssueResult>;
  resolveIssueIdentifier(): Promise<string | null>;
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

  const ensureSnapshot = (): InternalControlRuntimeSnapshot => {
    cachedSnapshot ??= createControlRuntimeSnapshot(context);
    return cachedSnapshot;
  };

  const refreshSnapshot = async (): Promise<InternalControlRuntimeSnapshot> => {
    const nextSnapshot = createControlRuntimeSnapshot(context);
    await nextSnapshot.prime();
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
      notifier.publish(input);
    },

    subscribe(listener) {
      return notifier.subscribe(listener);
    }
  };
}

function createControlRuntimeSnapshot(
  context: ControlRuntimeContext
): InternalControlRuntimeSnapshot {
  const projection = createSelectedRunProjectionReader(context);
  const observability = createObservabilitySurface({
    controlStore: context.controlStore,
    linearAdvisoryState: context.linearAdvisoryState,
    paths: context.paths,
    projection
  });

  return {
    readUiDataset: () => observability.readUiDataset(),
    readCompatibilityState: () => observability.readCompatibilityState(),
    readCompatibilityDispatch: () => observability.readCompatibilityDispatch(),
    readCompatibilityRefresh: (body = {}) => observability.readCompatibilityRefresh(body),
    readCompatibilityIssue: (issueIdentifier) => observability.readCompatibilityIssue(issueIdentifier),
    async resolveIssueIdentifier(): Promise<string | null> {
      const snapshot = await projection.readSelectedRunManifestSnapshot();
      return snapshot?.issueIdentifier ?? snapshot?.taskId ?? snapshot?.runId ?? null;
    },
    async prime(): Promise<void> {
      const selected = await projection.buildSelectedRunContext();
      await projection.readDispatchEvaluation(selected);
    }
  };
}
