import http from 'node:http';

import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream } from '../events/runEventStream.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import type { ProviderIntakeState } from './providerIntakeState.js';
import {
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle,
  type ControlServerOwnedLifecycleState
} from './controlServerReadyInstanceLifecycle.js';
import { prepareControlServerStartupInputs } from './controlServerStartupInputPreparation.js';

const EXPIRY_INTERVAL_MS = 15_000;
const PROVIDER_REFRESH_INTERVAL_MS = 15_000;
const SESSION_TTL_MS = 15 * 60 * 1000;
interface ProviderIssueHandoffOperationState {
  active: Promise<void> | null;
  queuedRefresh: Promise<void> | null;
}

const providerIssueHandoffOperations = new WeakMap<
  ProviderIssueHandoffService,
  ProviderIssueHandoffOperationState
>();

export interface StartControlServerPublicLifecycleOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: Pick<RunEventStream, 'append'>;
  runId: string;
  createProviderIssueHandoff?: ((input: {
    providerIntakeState: ProviderIntakeState;
    persistProviderIntake: () => Promise<void>;
    publishRuntime: (source: string) => void;
    readFeatureToggles: () => ControlState['feature_toggles'];
  }) => ProviderIssueHandoffService) | null;
}

export interface ControlServerPublicLifecycleState {
  server: http.Server;
  requestContextShared: ControlRequestSharedContext;
  lifecycleState: ControlServerOwnedLifecycleState;
  providerRefreshTimer?: NodeJS.Timeout | null;
  triggerProviderRefresh?: (() => Promise<void>) | null;
}

export interface StartedControlServerPublicLifecycle extends ControlServerPublicLifecycleState {
  baseUrl: string;
}

export async function startControlServerPublicLifecycle(
  options: StartControlServerPublicLifecycleOptions
): Promise<StartedControlServerPublicLifecycle> {
  const startupInputs = await prepareControlServerStartupInputs({
    paths: options.paths,
    config: options.config,
    eventStream: options.eventStream,
    runId: options.runId,
    sessionTtlMs: SESSION_TTL_MS,
    createProviderIssueHandoff: options.createProviderIssueHandoff
  });

  const readyInstance = await startControlServerReadyInstanceLifecycle({
    requestContextShared: startupInputs.requestContextShared,
    host: startupInputs.host,
    controlToken: startupInputs.controlToken,
    intervalMs: EXPIRY_INTERVAL_MS
  });

  const providerRefreshCoordinator = startupInputs.requestContextShared.providerIssueHandoff
    ? createProviderRefreshCoordinator(startupInputs.requestContextShared.providerIssueHandoff)
    : null;

  return {
    server: readyInstance.server,
    requestContextShared: startupInputs.requestContextShared,
    lifecycleState: readyInstance.lifecycleState,
    ...(providerRefreshCoordinator
      ? {
          providerRefreshTimer: providerRefreshCoordinator.timer,
          triggerProviderRefresh: providerRefreshCoordinator.trigger
        }
      : {}),
    baseUrl: readyInstance.baseUrl
  };
}

export async function closeControlServerPublicLifecycle(
  state: ControlServerPublicLifecycleState
): Promise<void> {
  if (state.providerRefreshTimer) {
    clearInterval(state.providerRefreshTimer);
  }
  return closeControlServerOwnedRuntime({
    server: state.server,
    requestContextShared: state.requestContextShared,
    lifecycleState: state.lifecycleState
  });
}

export function runProviderIssueHandoffRefresh(
  providerIssueHandoff: ProviderIssueHandoffService,
  options?: { queueIfBusy?: boolean }
): Promise<void> {
  return runProviderIssueHandoffOperation(
    providerIssueHandoff,
    () => providerIssueHandoff.refresh(),
    options
  );
}

export function runProviderIssueHandoffRehydrate(
  providerIssueHandoff: ProviderIssueHandoffService
): Promise<void> {
  return runProviderIssueHandoffOperation(providerIssueHandoff, () => providerIssueHandoff.rehydrate());
}

function createProviderRefreshCoordinator(
  providerIssueHandoff: ProviderIssueHandoffService
): {
  timer: NodeJS.Timeout;
  trigger: () => Promise<void>;
} {
  const trigger = async (): Promise<void> => {
    try {
      await runProviderIssueHandoffRefresh(providerIssueHandoff);
    } catch {
      // Best-effort provider refreshes should not crash the public lifecycle.
    }
  };
  const timer = setInterval(() => {
    void trigger();
  }, PROVIDER_REFRESH_INTERVAL_MS);
  timer.unref?.();
  return { timer, trigger };
}

function runProviderIssueHandoffOperation(
  providerIssueHandoff: ProviderIssueHandoffService,
  operation: () => Promise<void>,
  options?: { queueIfBusy?: boolean }
): Promise<void> {
  const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
  if (state.active) {
    if (!options?.queueIfBusy) {
      return state.active;
    }
    return queueProviderIssueHandoffRefresh(providerIssueHandoff, state, operation);
  }
  return startProviderIssueHandoffOperation(providerIssueHandoff, state, operation);
}

function startProviderIssueHandoffOperation(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: ProviderIssueHandoffOperationState,
  operation: () => Promise<void>
): Promise<void> {
  const operationPromise = operation().finally(() => {
    if (state.active === operationPromise) {
      state.active = null;
      clearProviderIssueHandoffOperationState(providerIssueHandoff, state);
    }
  });
  state.active = operationPromise;
  return operationPromise;
}

function queueProviderIssueHandoffRefresh(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: ProviderIssueHandoffOperationState,
  operation: () => Promise<void>
): Promise<void> {
  if (state.queuedRefresh) {
    return state.queuedRefresh;
  }
  const queuedRefresh = state.active!
    .then(
      () => undefined,
      () => undefined
    )
    .then(() => {
      if (state.queuedRefresh !== queuedRefresh) {
        return;
      }
      state.queuedRefresh = null;
      return runProviderIssueHandoffOperation(providerIssueHandoff, operation);
    })
    .finally(() => {
      if (state.queuedRefresh === queuedRefresh) {
        state.queuedRefresh = null;
      }
      clearProviderIssueHandoffOperationState(providerIssueHandoff, state);
    });
  state.queuedRefresh = queuedRefresh;
  return queuedRefresh;
}

function getProviderIssueHandoffOperationState(
  providerIssueHandoff: ProviderIssueHandoffService
): ProviderIssueHandoffOperationState {
  const existingState = providerIssueHandoffOperations.get(providerIssueHandoff);
  if (existingState) {
    return existingState;
  }
  const nextState: ProviderIssueHandoffOperationState = {
    active: null,
    queuedRefresh: null
  };
  providerIssueHandoffOperations.set(providerIssueHandoff, nextState);
  return nextState;
}

function clearProviderIssueHandoffOperationState(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: ProviderIssueHandoffOperationState
): void {
  if (!state.active && !state.queuedRefresh) {
    providerIssueHandoffOperations.delete(providerIssueHandoff);
  }
}
