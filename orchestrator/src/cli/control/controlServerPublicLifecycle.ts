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
const providerIssueHandoffOperations = new WeakMap<ProviderIssueHandoffService, Promise<void>>();

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
  providerIssueHandoff: ProviderIssueHandoffService
): Promise<void> {
  return runProviderIssueHandoffOperation(providerIssueHandoff, () => providerIssueHandoff.refresh());
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
  operation: () => Promise<void>
): Promise<void> {
  const existingOperation = providerIssueHandoffOperations.get(providerIssueHandoff);
  if (existingOperation) {
    return existingOperation;
  }
  const operationPromise = operation().finally(() => {
    if (providerIssueHandoffOperations.get(providerIssueHandoff) === operationPromise) {
      providerIssueHandoffOperations.delete(providerIssueHandoff);
    }
  });
  providerIssueHandoffOperations.set(providerIssueHandoff, operationPromise);
  return operationPromise;
}
