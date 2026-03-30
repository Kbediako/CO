import http from 'node:http';

import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream } from '../events/runEventStream.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlState } from './controlState.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import {
  resolveLiveLinearTrackedIssues,
  type LiveLinearTrackedIssue,
} from './linearDispatchSource.js';
import { resolveLinearWebhookSourceSetup } from './linearWebhookController.js';
import type {
  ProviderIssueHandoffPollInput,
  ProviderIssueHandoffService,
  ProviderTrackedIssuePollResolution
} from './providerIssueHandoff.js';
import type { ProviderIntakeState } from './providerIntakeState.js';
import type { ProviderWorkflowConfigStore } from './providerWorkflowConfigStore.js';
import {
  initializeProviderPollingHealth,
  isProviderPollingStuck,
  markProviderPollingStuck,
  markProviderPollingCompleted,
  markProviderPollingStarted,
  noteProviderPollingRequest,
  readProviderPollingHealth,
  type ControlPollingMode
} from './providerPollingHealth.js';
import {
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle,
  type ControlServerOwnedLifecycleState
} from './controlServerReadyInstanceLifecycle.js';
import { prepareControlServerStartupInputs } from './controlServerStartupInputPreparation.js';

const EXPIRY_INTERVAL_MS = 15_000;
const PROVIDER_REFRESH_INTERVAL_MS = 15_000;
const PROVIDER_REFRESH_STUCK_AFTER_MS = 45_000;
const SESSION_TTL_MS = 15 * 60 * 1000;
interface ProviderIssueHandoffOperationState {
  active: Promise<void> | null;
  queuedRefresh: Promise<void> | null;
  stuckSignal: Promise<ProviderIssueHandoffRefreshRequestOutcome>;
  resolveStuckSignal: ((outcome: ProviderIssueHandoffRefreshRequestOutcome) => void) | null;
}

interface ProviderPollTrackedIssueContext {
  readFeatureToggles: (() => ControlState['feature_toggles']) | null;
}

interface ProviderRefreshTimerHandle {
  cancel(): void;
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
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore;
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
  providerRefreshTimer?: ProviderRefreshTimerHandle | null;
  providerRefreshStartupTrigger?: NodeJS.Timeout | null;
  triggerProviderRefresh?: (() => Promise<void>) | null;
}

export interface StartedControlServerPublicLifecycle extends ControlServerPublicLifecycleState {
  baseUrl: string;
}

export interface ProviderIssueHandoffRefreshRequestOutcome {
  queued: true;
  coalesced: boolean;
  stuck?: boolean;
  restart_required?: boolean;
  reason?: string | null;
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
    providerWorkflowConfigStore: options.providerWorkflowConfigStore,
    createProviderIssueHandoff: options.createProviderIssueHandoff
  });

  const readyInstance = await startControlServerReadyInstanceLifecycle({
    requestContextShared: startupInputs.requestContextShared,
    host: startupInputs.host,
    controlToken: startupInputs.controlToken,
    intervalMs: EXPIRY_INTERVAL_MS
  });

  const providerRefreshCoordinator = startupInputs.requestContextShared.providerIssueHandoff
    ? createProviderRefreshCoordinator(
        startupInputs.requestContextShared.providerIssueHandoff,
        {
          readFeatureToggles:
            startupInputs.requestContextShared.controlStore
              ? () => startupInputs.requestContextShared.controlStore.snapshot().feature_toggles
              : null
        }
      )
    : null;
  if (startupInputs.requestContextShared.providerIssueHandoff) {
    const persistProviderIntakePolling =
      startupInputs.requestContextShared.persist?.providerIntakePolling ?? null;
    initializeProviderPollingHealth(startupInputs.requestContextShared.providerIssueHandoff, {
      intervalMs: PROVIDER_REFRESH_INTERVAL_MS,
      stuckAfterMs: PROVIDER_REFRESH_STUCK_AFTER_MS,
      onUpdate:
        startupInputs.requestContextShared.providerIntakeState && persistProviderIntakePolling
          ? async (polling) => {
              startupInputs.requestContextShared.providerIntakeState!.polling = { ...polling };
              await persistProviderIntakePolling({
                ...polling
              });
            }
          : null
    });
  }
  const providerRefreshStartupTrigger = providerRefreshCoordinator
    ? scheduleStartupProviderRefresh(providerRefreshCoordinator.trigger)
    : null;

  return {
    server: readyInstance.server,
    requestContextShared: startupInputs.requestContextShared,
    lifecycleState: readyInstance.lifecycleState,
    ...(providerRefreshCoordinator
      ? {
          providerRefreshTimer: providerRefreshCoordinator.timer,
          providerRefreshStartupTrigger,
          triggerProviderRefresh: providerRefreshCoordinator.trigger
        }
      : {}),
    baseUrl: readyInstance.baseUrl
  };
}

export async function closeControlServerPublicLifecycle(
  state: ControlServerPublicLifecycleState
): Promise<void> {
  if (state.providerRefreshStartupTrigger) {
    clearTimeout(state.providerRefreshStartupTrigger);
  }
  if (state.providerRefreshTimer) {
    state.providerRefreshTimer.cancel();
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
): Promise<ProviderIssueHandoffRefreshRequestOutcome> {
  const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
  if (state.active) {
    const stuckOutcome = resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
    if (stuckOutcome) {
      noteProviderPollingRequest(providerIssueHandoff, {
        mode: 'refresh',
        queued: state.queuedRefresh !== null,
        replaceQueued: true,
        preserveActiveMode: true
      });
      return Promise.resolve(stuckOutcome);
    }
    if (!options?.queueIfBusy) {
      return mapProviderIssueHandoffRefreshOutcome(
        providerIssueHandoff,
        waitForProviderIssueHandoffPending(providerIssueHandoff, state.active),
        {
          queued: true,
          coalesced: true
        }
      );
    }
    noteProviderPollingRequest(providerIssueHandoff, {
      mode: 'refresh',
      queued: true,
      preserveActiveMode: true
    });
    if (state.queuedRefresh) {
      return mapProviderIssueHandoffRefreshOutcome(providerIssueHandoff, state.queuedRefresh, {
        queued: true,
        coalesced: true
      });
    }
    return mapProviderIssueHandoffRefreshOutcome(
      providerIssueHandoff,
      queueProviderIssueHandoffRefresh(providerIssueHandoff, state, () => providerIssueHandoff.refresh(), {
        mode: 'refresh'
      }),
      {
        queued: true,
        coalesced: false
      }
    );
  }
  return mapProviderIssueHandoffRefreshOutcome(
    providerIssueHandoff,
    waitForProviderIssueHandoffPending(
      providerIssueHandoff,
      startProviderIssueHandoffOperation(providerIssueHandoff, state, () => providerIssueHandoff.refresh(), {
        mode: 'refresh'
      })
    ),
    {
      queued: true,
      coalesced: false
    }
  );
}

export function runProviderIssueHandoffRehydrate(
  providerIssueHandoff: ProviderIssueHandoffService
): Promise<void> {
  return runProviderIssueHandoffOperation(providerIssueHandoff, () => providerIssueHandoff.rehydrate());
}

export function runProviderIssueHandoffPoll(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: ProviderIssueHandoffPollInput,
  options?: { queueIfBusy?: boolean }
): Promise<void> {
  return runProviderIssueHandoffOperation(
    providerIssueHandoff,
    () =>
      providerIssueHandoff.poll
        ? providerIssueHandoff.poll(input)
        : providerIssueHandoff.refresh(),
    options,
    {
      mode: providerIssueHandoff.poll ? 'poll' : 'refresh'
    }
  );
}

function createProviderRefreshCoordinator(
  providerIssueHandoff: ProviderIssueHandoffService,
  context: ProviderPollTrackedIssueContext
): {
  timer: ProviderRefreshTimerHandle;
  trigger: () => Promise<void>;
} {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let rescheduleGeneration = 0;

  const clearScheduledTrigger = (): void => {
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    timer = null;
  };

  const scheduleNextTrigger = (): void => {
    if (stopped || timer) {
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      void trigger();
    }, PROVIDER_REFRESH_INTERVAL_MS);
    timer.unref?.();
  };

  const resolveWatchdogDelayMs = (): number => {
    const health = readProviderPollingHealth(providerIssueHandoff);
    if (!health?.checking || health.operation_elapsed_ms === null) {
      return PROVIDER_REFRESH_STUCK_AFTER_MS;
    }
    return Math.max(0, PROVIDER_REFRESH_STUCK_AFTER_MS - health.operation_elapsed_ms);
  };

  const trigger = async (): Promise<void> => {
    if (stopped) {
      return;
    }
    if (isProviderPollingStuck(providerIssueHandoff)) {
      scheduleNextTrigger();
      return;
    }
    clearScheduledTrigger();
    const generation = ++rescheduleGeneration;
    let stuckWatchdog: NodeJS.Timeout | null = null;
    try {
      const operation = runProviderIssueHandoffOperation(
        providerIssueHandoff,
        async () => {
          if (!providerIssueHandoff.poll || !context.readFeatureToggles) {
            await providerIssueHandoff.refresh();
            return;
          }

          const refetchTrackedIssues = async (): Promise<ProviderTrackedIssuePollResolution> =>
            await resolveProviderPollTrackedIssues(context);
          const pollResolution = await refetchTrackedIssues();
          if (pollResolution.kind === 'ready') {
            await providerIssueHandoff.poll({
              trackedIssues: pollResolution.trackedIssues,
              refetchTrackedIssues
            });
            return;
          }
          noteProviderPollingRequest(providerIssueHandoff, {
            mode: 'refresh',
            queued: getProviderIssueHandoffOperationState(providerIssueHandoff).queuedRefresh !== null,
            replaceQueued: true
          });
          await providerIssueHandoff.refresh();
        },
        undefined,
        {
          mode: providerIssueHandoff.poll && context.readFeatureToggles ? 'poll' : 'refresh'
        }
      );
      await Promise.race([
        operation,
        new Promise<void>((resolve) => {
          const watchdogDelayMs = resolveWatchdogDelayMs();
          stuckWatchdog = setTimeout(() => {
            markProviderPollingStuck(providerIssueHandoff);
            resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
            resolve();
          }, watchdogDelayMs);
          stuckWatchdog.unref?.();
        })
      ]);
    } catch {
      // Best-effort provider refreshes should not crash the public lifecycle.
    } finally {
      if (stuckWatchdog) {
        clearTimeout(stuckWatchdog);
      }
    }
    await waitForProviderIssueHandoffQueueToDrain(providerIssueHandoff);
    if (stopped || generation !== rescheduleGeneration) {
      return;
    }
    scheduleNextTrigger();
  };
  return {
    timer: {
      cancel: () => {
        stopped = true;
        rescheduleGeneration += 1;
        clearScheduledTrigger();
      }
    },
    trigger
  };
}

function scheduleStartupProviderRefresh(trigger: () => Promise<void>): NodeJS.Timeout {
  const startupTrigger = setTimeout(() => {
    void trigger();
  }, 0);
  startupTrigger.unref?.();
  return startupTrigger;
}

async function resolveProviderPollTrackedIssues(
  context: ProviderPollTrackedIssueContext
): Promise<ProviderTrackedIssuePollResolution> {
  if (!context.readFeatureToggles) {
    return {
      kind: 'skip',
      reason: 'dispatch_source_unavailable'
    };
  }

  const sourceSetup = resolveLinearWebhookSourceSetup(context.readFeatureToggles(), process.env);
  if ('error' in sourceSetup) {
    return {
      kind: 'skip',
      reason: sourceSetup.error
    };
  }

  const resolution = await resolveLiveLinearTrackedIssues({
    sourceSetup: sourceSetup.sourceSetup,
    env: process.env
  });
  if (resolution.kind !== 'ready') {
    return {
      kind: 'skip',
      reason: resolution.reason
    };
  }

  return {
    kind: 'ready',
    trackedIssues: dedupeProviderPollTrackedIssues(resolution.tracked_issues)
  };
}

function dedupeProviderPollTrackedIssues(
  trackedIssues: LiveLinearTrackedIssue[]
): LiveLinearTrackedIssue[] {
  const seenIssueIds = new Set<string>();
  const deduped: LiveLinearTrackedIssue[] = [];
  for (const trackedIssue of trackedIssues) {
    if (seenIssueIds.has(trackedIssue.id)) {
      continue;
    }
    seenIssueIds.add(trackedIssue.id);
    deduped.push(trackedIssue);
  }
  return deduped;
}

function runProviderIssueHandoffOperation(
  providerIssueHandoff: ProviderIssueHandoffService,
  operation: () => Promise<void>,
  options?: { queueIfBusy?: boolean },
  healthContext?: { mode: ControlPollingMode }
): Promise<void> {
  const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
  if (state.active) {
    const stuckOutcome = resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
    if (stuckOutcome) {
      if (healthContext) {
        noteProviderPollingRequest(providerIssueHandoff, {
          mode: healthContext.mode,
          queued: state.queuedRefresh !== null,
          replaceQueued: true,
          preserveActiveMode: true
        });
      }
      return Promise.reject(
        new Error(stuckOutcome.reason ?? 'provider_refresh_lifecycle_stuck')
      );
    }
    if (!options?.queueIfBusy) {
      return waitForProviderIssueHandoffPending(providerIssueHandoff, state.active);
    }
    if (healthContext) {
      noteProviderPollingRequest(providerIssueHandoff, {
        mode: healthContext.mode,
        queued: true,
        preserveActiveMode: true
      });
    }
    return queueProviderIssueHandoffRefresh(providerIssueHandoff, state, operation, healthContext);
  }
  return waitForProviderIssueHandoffPending(
    providerIssueHandoff,
    startProviderIssueHandoffOperation(providerIssueHandoff, state, operation, healthContext)
  );
}

function startProviderIssueHandoffOperation(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: ProviderIssueHandoffOperationState,
  operation: () => Promise<void>,
  healthContext?: { mode: ControlPollingMode }
): Promise<void> {
  resetProviderIssueHandoffStuckSignal(state);
  if (healthContext) {
    markProviderPollingStarted(providerIssueHandoff, {
      mode: healthContext.mode
    });
  }
  let operationResult: Promise<void>;
  try {
    operationResult = operation();
  } catch (error) {
    operationResult = Promise.reject(error);
  }
  const operationPromise = operationResult
    .then(
      (value) => {
        if (healthContext) {
          markProviderPollingCompleted(providerIssueHandoff);
        }
        return value;
      },
      (error: unknown) => {
        if (healthContext) {
          markProviderPollingCompleted(providerIssueHandoff, {
            error
          });
        }
        throw error;
      }
    )
    .finally(() => {
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
  operation: () => Promise<void>,
  healthContext?: { mode: ControlPollingMode }
): Promise<void> {
  if (state.queuedRefresh) {
    return state.queuedRefresh;
  }
  const queuedRefresh = waitForProviderIssueHandoffPending(providerIssueHandoff, state.active!)
    .catch(() => {
      if (resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
        throw new Error(readProviderPollingHealth(providerIssueHandoff)?.reason ?? 'provider_refresh_lifecycle_stuck');
      }
    })
    .then(() => {
      if (resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
        throw new Error(readProviderPollingHealth(providerIssueHandoff)?.reason ?? 'provider_refresh_lifecycle_stuck');
      }
      if (state.queuedRefresh !== queuedRefresh) {
        return;
      }
      state.queuedRefresh = null;
      if (state.active) {
        return queueProviderIssueHandoffRefresh(providerIssueHandoff, state, operation, healthContext);
      }
      return startProviderIssueHandoffOperation(providerIssueHandoff, state, operation, healthContext);
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

async function waitForProviderIssueHandoffQueueToDrain(
  providerIssueHandoff: ProviderIssueHandoffService
): Promise<void> {
  for (;;) {
    const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
    const pending = state.queuedRefresh ?? state.active;
    if (!pending) {
      return;
    }
    if (resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
      return;
    }
    try {
      await waitForProviderIssueHandoffPending(providerIssueHandoff, pending);
    } catch {
      if (resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
        return;
      }
    }
  }
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
    queuedRefresh: null,
    ...createProviderIssueHandoffStuckSignal()
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

function resolveProviderIssueHandoffStuckOutcome(
  providerIssueHandoff: ProviderIssueHandoffService
): ProviderIssueHandoffRefreshRequestOutcome | null {
  if (!isProviderPollingStuck(providerIssueHandoff)) {
    return null;
  }
  markProviderPollingStuck(providerIssueHandoff);
  const outcome: ProviderIssueHandoffRefreshRequestOutcome = {
    queued: true,
    coalesced: true,
    stuck: true,
    restart_required: true,
    reason: readProviderPollingHealth(providerIssueHandoff)?.reason ?? 'provider_refresh_lifecycle_stuck'
  };
  signalProviderIssueHandoffStuck(providerIssueHandoff, outcome);
  return outcome;
}

function mapProviderIssueHandoffRefreshOutcome(
  providerIssueHandoff: ProviderIssueHandoffService,
  pending: Promise<void>,
  successOutcome: ProviderIssueHandoffRefreshRequestOutcome
): Promise<ProviderIssueHandoffRefreshRequestOutcome> {
  return pending.then(
    () => successOutcome,
    (error: unknown) => {
      const stuckOutcome = resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
      if (stuckOutcome) {
        return stuckOutcome;
      }
      throw error;
    }
  );
}

function waitForProviderIssueHandoffPending(
  providerIssueHandoff: ProviderIssueHandoffService,
  pending: Promise<void>
): Promise<void> {
  const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
  return Promise.race([
    pending,
    state.stuckSignal.then((outcome) => {
      throw new Error(outcome.reason ?? 'provider_refresh_lifecycle_stuck');
    })
  ]);
}

function createProviderIssueHandoffStuckSignal(): Pick<
  ProviderIssueHandoffOperationState,
  'stuckSignal' | 'resolveStuckSignal'
> {
  let resolveStuckSignal:
    | ((outcome: ProviderIssueHandoffRefreshRequestOutcome) => void)
    | null = null;
  const stuckSignal = new Promise<ProviderIssueHandoffRefreshRequestOutcome>((resolve) => {
    resolveStuckSignal = resolve;
  });
  return {
    stuckSignal,
    resolveStuckSignal
  };
}

function resetProviderIssueHandoffStuckSignal(state: ProviderIssueHandoffOperationState): void {
  const nextSignal = createProviderIssueHandoffStuckSignal();
  state.stuckSignal = nextSignal.stuckSignal;
  state.resolveStuckSignal = nextSignal.resolveStuckSignal;
}

function signalProviderIssueHandoffStuck(
  providerIssueHandoff: ProviderIssueHandoffService,
  outcome: ProviderIssueHandoffRefreshRequestOutcome
): void {
  const state = providerIssueHandoffOperations.get(providerIssueHandoff);
  if (!state?.resolveStuckSignal) {
    return;
  }
  state.resolveStuckSignal(outcome);
  state.resolveStuckSignal = null;
}
