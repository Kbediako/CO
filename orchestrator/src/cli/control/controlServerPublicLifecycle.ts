import http from 'node:http';

import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream } from '../events/runEventStream.js';
import type { RunPaths } from '../run/runPaths.js';
import { isoTimestamp } from '../utils/time.js';
import type { ControlState } from './controlState.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import {
  readSharedLinearBudgetStatus,
  resolveLinearPollingInterval
} from './linearBudgetState.js';
import {
  resolveLiveLinearTrackedIssues,
  type LiveLinearTrackedIssue,
} from './linearDispatchSource.js';
import { resolveLinearWebhookSourceSetup } from './linearWebhookController.js';
import type {
  ProviderIssueHandoffPollInput,
  ProviderIssueHandoffRecoveryResult,
  ProviderIssueHandoffService,
  ProviderIssueRecoveryAction,
  ProviderTrackedIssueRefetchInput,
  ProviderTrackedIssuePollResolution
} from './providerIssueHandoff.js';
import type { ProviderIntakeState } from './providerIntakeState.js';
import type { ProviderWorkflowConfigStore } from './providerWorkflowConfigStore.js';
import {
  initializeProviderPollingHealth,
  isProviderPollingStuck,
  flushProviderPollingHealthUpdates,
  markProviderPollingStuck,
  markProviderPollingCompleted,
  markProviderPollingStarted,
  noteProviderPollingRequest,
  readProviderPollingHealth,
  scheduleProviderPolling,
  type ControlPollingMode
} from './providerPollingHealth.js';
import {
  beginClosingControlServerHttpServer,
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle,
  type ControlServerOwnedLifecycleState
} from './controlServerReadyInstanceLifecycle.js';
import { prepareControlServerStartupInputs } from './controlServerStartupInputPreparation.js';
import {
  acquireControlHostOwnership,
  type ControlHostOwnershipHandle
} from './controlHostOwnership.js';

const EXPIRY_INTERVAL_MS = 15_000;
const PROVIDER_REFRESH_INTERVAL_MS = 15_000;
const PROVIDER_REFRESH_STUCK_AFTER_MS = 45_000;
// Prior operation waits stay short; actual recovery allows launch overhead plus remote manifest polling.
const PROVIDER_WORKER_RECOVER_ACTIVE_WAIT_MS = 22_000;
const PROVIDER_WORKER_RECOVER_ACTIVE_TOTAL_WAIT_MS = 24_000;
const PROVIDER_WORKER_RECOVER_OPERATION_WAIT_MS = PROVIDER_REFRESH_STUCK_AFTER_MS;
const PROVIDER_WORKER_RECOVER_OPERATION_TOTAL_WAIT_MS = 90_000;
const PROVIDER_CLOSE_STUCK_DRAIN_GRACE_MS = 1_000;
const PROVIDER_FULL_RECOVERY_SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 15 * 60 * 1000;
interface ProviderIssueHandoffOperationState {
  active: Promise<void> | null;
  queuedRefresh: Promise<void> | null;
  stuckSignal: Promise<ProviderIssueHandoffRefreshRequestOutcome>;
  resolveStuckSignal: ((outcome: ProviderIssueHandoffRefreshRequestOutcome) => void) | null;
}

interface ProviderIssueHandoffOperationHealthContext {
  mode: ControlPollingMode;
  completeOnSuccess?: boolean;
}

interface ProviderWorkerRecoverRestartRequiredContext {
  reason: string;
  lastError: string;
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
  controlHostOwnership?: {
    repoRoot?: string | null;
    taskId?: string | null;
    pipelineId?: string | null;
    cwd?: string | null;
    argv?: string[];
    commandPath?: string | null;
    packageRoot?: string | null;
  } | false;
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
  controlHostOwnership?: ControlHostOwnershipHandle | null;
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
  let controlHostOwnership: ControlHostOwnershipHandle | null = null;
  try {
    controlHostOwnership =
      !options.controlHostOwnership
        ? null
        : await acquireControlHostOwnership({
            paths: options.paths,
            runId: options.runId,
            repoRoot: options.controlHostOwnership?.repoRoot,
            taskId: options.controlHostOwnership?.taskId,
            pipelineId: options.controlHostOwnership?.pipelineId,
            cwd: options.controlHostOwnership?.cwd,
            argv: options.controlHostOwnership?.argv,
            commandPath: options.controlHostOwnership?.commandPath,
            packageRoot: options.controlHostOwnership?.packageRoot
          });

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
      const persistedPollingSnapshot =
        startupInputs.requestContextShared.providerIntakeState?.polling ?? null;
      initializeProviderPollingHealth(startupInputs.requestContextShared.providerIssueHandoff, {
        intervalMs: PROVIDER_REFRESH_INTERVAL_MS,
        stuckAfterMs: PROVIDER_REFRESH_STUCK_AFTER_MS,
        controlHostOwner: controlHostOwnership?.polling ?? null,
        skipInitialUpdate: persistedPollingSnapshot !== null,
        onUpdate:
          startupInputs.requestContextShared.providerIntakeState && persistProviderIntakePolling
            ? async (polling) => {
                const pollingUpdatedAt =
                  typeof polling.updated_at === 'string' && polling.updated_at.trim().length > 0
                    ? polling.updated_at
                    : isoTimestamp();
                const stateUpdatedAt = pickLatestTimestamp(
                  startupInputs.requestContextShared.providerIntakeState!.updated_at,
                  pollingUpdatedAt
                );
                const nextPolling = {
                  ...polling,
                  updated_at: pollingUpdatedAt
                };
                startupInputs.requestContextShared.providerIntakeState!.polling = nextPolling;
                startupInputs.requestContextShared.providerIntakeState!.updated_at = stateUpdatedAt;
                await persistProviderIntakePolling(nextPolling, stateUpdatedAt);
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
      ...(controlHostOwnership ? { controlHostOwnership } : {}),
      ...(providerRefreshCoordinator
        ? {
            providerRefreshTimer: providerRefreshCoordinator.timer,
            providerRefreshStartupTrigger,
            triggerProviderRefresh: providerRefreshCoordinator.trigger
          }
        : {}),
      baseUrl: readyInstance.baseUrl
    };
  } catch (error) {
    await controlHostOwnership?.release().catch(() => undefined);
    throw error;
  }
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
  const serverClosePromise = beginClosingControlServerHttpServer(state.server);
  void serverClosePromise.catch(() => undefined);
  const providerIssueHandoff = state.requestContextShared.providerIssueHandoff ?? null;
  let closeError: unknown = null;
  const captureCloseError = (error: unknown): void => {
    if (closeError === null) {
      closeError = error;
    }
  };

  if (providerIssueHandoff) {
    try {
      await waitForProviderIssueHandoffQueueToDrain(
        providerIssueHandoff,
        () => resolveProviderIssueHandoffWatchdogDelayMs(providerIssueHandoff),
        { settleStuckPending: true }
      );
      await flushProviderPollingHealthUpdates(providerIssueHandoff);
    } catch (error) {
      captureCloseError(error);
    }
  }
  try {
    await closeControlServerOwnedRuntime({
      server: state.server,
      requestContextShared: state.requestContextShared,
      lifecycleState: state.lifecycleState,
      serverClosePromise
    });
  } catch (error) {
    captureCloseError(error);
  }

  try {
    await serverClosePromise;
  } catch (error) {
    captureCloseError(error);
  }

  try {
    await state.controlHostOwnership?.release();
  } catch (error) {
    captureCloseError(error);
  }

  if (closeError !== null) {
    throw closeError;
  }
}

export function runProviderIssueHandoffRefresh(
  providerIssueHandoff: ProviderIssueHandoffService,
  options?: {
    queueIfBusy?: boolean;
    acknowledgeAccepted?: boolean;
    allowIdleRestartRequiredRetry?: boolean;
  }
): Promise<ProviderIssueHandoffRefreshRequestOutcome> {
  const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
  const acknowledgeAccepted = options?.acknowledgeAccepted === true;
  const allowIdleRestartRequiredRetry = options?.allowIdleRestartRequiredRetry === true;
  if (state.active) {
    const continueWhileBusy = (): Promise<ProviderIssueHandoffRefreshRequestOutcome> => {
      if (!options?.queueIfBusy) {
        return mapProviderIssueHandoffRefreshOutcome(
          providerIssueHandoff,
          waitForProviderIssueHandoffPending(providerIssueHandoff, state.active!),
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
        const queuedOutcome: ProviderIssueHandoffRefreshRequestOutcome = {
          queued: true,
          coalesced: true
        };
        return acknowledgeAccepted
          ? acknowledgeProviderIssueHandoffAccepted(state.queuedRefresh, queuedOutcome)
          : mapProviderIssueHandoffRefreshOutcome(providerIssueHandoff, state.queuedRefresh, queuedOutcome);
      }
      const queuedRefresh = queueProviderIssueHandoffRefresh(
        providerIssueHandoff,
        state,
        () => providerIssueHandoff.refresh(),
        {
          mode: 'refresh'
        }
      );
      const queuedOutcome: ProviderIssueHandoffRefreshRequestOutcome = {
        queued: true,
        coalesced: false
      };
      return acknowledgeAccepted
        ? acknowledgeProviderIssueHandoffAccepted(queuedRefresh, queuedOutcome)
        : mapProviderIssueHandoffRefreshOutcome(providerIssueHandoff, queuedRefresh, queuedOutcome);
    };
    if (isProviderPollingStuck(providerIssueHandoff)) {
      return (async () => {
        const stuckOutcome = await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
        if (!stuckOutcome) {
          return continueWhileBusy();
        }
        if (allowIdleRestartRequiredRetry) {
          detachProviderIssueHandoffPending(state.active);
          detachProviderIssueHandoffPending(state.queuedRefresh);
          state.active = null;
          state.queuedRefresh = null;
          providerIssueHandoff.resetStuckRefreshLifecycle?.();
          const activeRefresh = waitForProviderIssueHandoffPending(
            providerIssueHandoff,
            startProviderIssueHandoffOperation(
              providerIssueHandoff,
              state,
              () => providerIssueHandoff.refresh(),
              {
                mode: 'refresh'
              }
            )
          );
          const activeOutcome: ProviderIssueHandoffRefreshRequestOutcome = {
            queued: true,
            coalesced: false
          };
          return acknowledgeAccepted
            ? acknowledgeProviderIssueHandoffAccepted(activeRefresh, activeOutcome)
            : mapProviderIssueHandoffRefreshOutcome(providerIssueHandoff, activeRefresh, activeOutcome);
        }
        noteProviderPollingRequest(providerIssueHandoff, {
          mode: 'refresh',
          queued: state.queuedRefresh !== null,
          replaceQueued: true,
          preserveActiveMode: true
        });
        return stuckOutcome;
      })();
    }
    return continueWhileBusy();
  }
  const idleStuckError = buildProviderIssueHandoffRestartRequiredError(providerIssueHandoff);
  if (idleStuckError && !allowIdleRestartRequiredRetry) {
    clearProviderIssueHandoffOperationState(providerIssueHandoff, state);
    return mapProviderIssueHandoffRefreshOutcome(
      providerIssueHandoff,
      Promise.reject(idleStuckError),
      {
        queued: true,
        coalesced: true
      }
    );
  }
  const activeRefresh = waitForProviderIssueHandoffPending(
    providerIssueHandoff,
    startProviderIssueHandoffOperation(providerIssueHandoff, state, () => providerIssueHandoff.refresh(), {
      mode: 'refresh'
    })
  );
  const activeOutcome: ProviderIssueHandoffRefreshRequestOutcome = {
    queued: true,
    coalesced: false
  };
  return acknowledgeAccepted
    ? acknowledgeProviderIssueHandoffAccepted(activeRefresh, activeOutcome)
    : mapProviderIssueHandoffRefreshOutcome(providerIssueHandoff, activeRefresh, activeOutcome);
}

export async function runProviderIssueHandoffRecover(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    provider: 'linear';
    issueId: string;
    action: ProviderIssueRecoveryAction;
  }
): Promise<ProviderIssueHandoffRecoveryResult> {
  const activeWaitStartedAtMs = Date.now();
  let restartRequiredForRecoverySkip =
    readProviderWorkerRecoverRestartRequiredContext(providerIssueHandoff);
  const captureRestartRequiredForRecoverySkip = (fallbackReason: string | null = null): void => {
    const currentContext = readProviderWorkerRecoverRestartRequiredContext(providerIssueHandoff);
    if (currentContext) {
      restartRequiredForRecoverySkip = currentContext;
      return;
    }
    if (!restartRequiredForRecoverySkip && fallbackReason) {
      restartRequiredForRecoverySkip = {
        reason: fallbackReason,
        lastError: fallbackReason
      };
    }
  };
  const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
  let stuckLifecycleResetForRecovery = false;
  const resetStuckRefreshLifecycleForRecovery = (): void => {
    stuckLifecycleResetForRecovery = true;
    providerIssueHandoff.resetStuckRefreshLifecycle?.();
  };
  const abandonPriorOperationForRecovery = (): void => {
    detachProviderIssueHandoffPending(state.active);
    detachProviderIssueHandoffPending(state.queuedRefresh);
    state.active = null;
    state.queuedRefresh = null;
  };
  while (state.active || state.queuedRefresh) {
    const stuckOutcome = await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
    if (stuckOutcome) {
      captureRestartRequiredForRecoverySkip(stuckOutcome.reason ?? null);
      abandonPriorOperationForRecovery();
      resetStuckRefreshLifecycleForRecovery();
      break;
    }
    try {
      await waitForProviderIssueHandoffPendingWithWatchdog(
        providerIssueHandoff,
        state.queuedRefresh ?? state.active!,
        () => resolveProviderWorkerRecoverWatchdogDelayMs(
          providerIssueHandoff,
          activeWaitStartedAtMs,
          PROVIDER_WORKER_RECOVER_ACTIVE_WAIT_MS,
          PROVIDER_WORKER_RECOVER_ACTIVE_TOTAL_WAIT_MS
        ),
        { forceStuckOnWatchdog: true }
      );
      if (hasProviderWorkerRecoverDeadlineExpired(
        activeWaitStartedAtMs,
        PROVIDER_WORKER_RECOVER_ACTIVE_TOTAL_WAIT_MS
      )) {
        captureRestartRequiredForRecoverySkip();
        abandonPriorOperationForRecovery();
        clearProviderIssueHandoffOperationState(providerIssueHandoff, state);
        resetStuckRefreshLifecycleForRecovery();
        break;
      }
    } catch (error) {
      const stuckOutcome = await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
      const stuckReason = resolveProviderIssueHandoffStuckErrorReason(error);
      if (!stuckOutcome && !stuckReason) {
        throw error;
      }
      captureRestartRequiredForRecoverySkip(stuckOutcome?.reason ?? stuckReason);
      abandonPriorOperationForRecovery();
      resetStuckRefreshLifecycleForRecovery();
      break;
    }
  }
  if (restartRequiredForRecoverySkip && !stuckLifecycleResetForRecovery) {
    resetStuckRefreshLifecycleForRecovery();
  }

  const recoveryAttemptsStartedAtMs = Date.now();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const recoveryState = getProviderIssueHandoffOperationState(providerIssueHandoff);
    let recoveryResult: ProviderIssueHandoffRecoveryResult | null = null;
    const recoveryOperation = startProviderIssueHandoffOperation(
      providerIssueHandoff,
      recoveryState,
      async () => {
        recoveryResult = await providerIssueHandoff.recoverIssue(input);
      },
      { mode: 'refresh', completeOnSuccess: false }
    );
    const abandonRecoveryOperation = (): void => {
      detachProviderIssueHandoffPending(recoveryOperation);
      if (recoveryState.active === recoveryOperation) {
        recoveryState.active = null;
      }
      clearProviderIssueHandoffOperationState(providerIssueHandoff, recoveryState);
      providerIssueHandoff.resetStuckRefreshLifecycle?.();
    };
    try {
      await waitForProviderIssueHandoffPendingWithWatchdog(
        providerIssueHandoff,
        recoveryOperation,
        () => resolveProviderWorkerRecoverWatchdogDelayMs(
          providerIssueHandoff,
          recoveryAttemptsStartedAtMs,
          PROVIDER_WORKER_RECOVER_OPERATION_WAIT_MS,
          PROVIDER_WORKER_RECOVER_OPERATION_TOTAL_WAIT_MS
        ),
        { forceStuckOnWatchdog: true }
      );
    } catch (error) {
      const stuckOutcome = await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
      const stuckReason = resolveProviderIssueHandoffStuckErrorReason(error);
      if (!stuckOutcome && !stuckReason) {
        throw error;
      }
      captureRestartRequiredForRecoverySkip(stuckOutcome?.reason ?? stuckReason);
      abandonRecoveryOperation();
      if (attempt === 0) {
        continue;
      }
      const finalReason = stuckOutcome?.reason ?? stuckReason ?? 'provider_refresh_lifecycle_stuck';
      markProviderWorkerRecoverLifecycleFailure(providerIssueHandoff, finalReason);
      throw new Error(finalReason);
    }
    const completedRecoveryResult = recoveryResult as ProviderIssueHandoffRecoveryResult | null;
    if (completedRecoveryResult) {
      if (completedRecoveryResult.kind === 'skipped') {
        markProviderWorkerRecoverSkipped(
          providerIssueHandoff,
          completedRecoveryResult.reason,
          restartRequiredForRecoverySkip
        );
      } else {
        markProviderPollingCompleted(providerIssueHandoff);
      }
      return completedRecoveryResult;
    }
    const stuckOutcome = await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
    if (!stuckOutcome && hasProviderWorkerRecoverDeadlineExpired(
      recoveryAttemptsStartedAtMs,
      PROVIDER_WORKER_RECOVER_OPERATION_TOTAL_WAIT_MS
    )) {
      captureRestartRequiredForRecoverySkip();
      abandonRecoveryOperation();
      if (attempt === 0) {
        continue;
      }
      markProviderWorkerRecoverLifecycleFailure(
        providerIssueHandoff,
        'provider_refresh_lifecycle_stuck'
      );
      throw new Error('provider_worker_recover_timeout');
    }
    if (!stuckOutcome) {
      throw new Error('provider_issue_recover_result_missing');
    }
    captureRestartRequiredForRecoverySkip(stuckOutcome.reason ?? null);
    abandonRecoveryOperation();
    if (attempt === 0) {
      continue;
    }
    markProviderWorkerRecoverLifecycleFailure(
      providerIssueHandoff,
      stuckOutcome.reason ?? 'provider_refresh_lifecycle_stuck'
    );
    throw new Error(stuckOutcome.reason ?? 'provider_worker_recover_timeout');
  }
  throw new Error('provider_worker_recover_timeout');
}

function markProviderWorkerRecoverLifecycleFailure(
  providerIssueHandoff: ProviderIssueHandoffService,
  reason: string
): void {
  const error = new Error(reason);
  error.name =
    reason === 'provider_poll_lifecycle_stuck'
      ? 'ProviderPollLifecycleStuckError'
      : 'ProviderRefreshLifecycleStuckError';
  markProviderPollingCompleted(providerIssueHandoff, { error });
}

function markProviderWorkerRecoverSkipped(
  providerIssueHandoff: ProviderIssueHandoffService,
  skipReason: string,
  restartRequiredBeforeRecovery: ProviderWorkerRecoverRestartRequiredContext | null
): void {
  if (!restartRequiredBeforeRecovery) {
    markProviderPollingCompleted(providerIssueHandoff, { error: new Error(skipReason) });
    return;
  }
  const error = new Error(restartRequiredBeforeRecovery.lastError);
  error.name =
    restartRequiredBeforeRecovery.reason === 'provider_poll_lifecycle_stuck'
      ? 'ProviderPollLifecycleStuckError'
      : 'ProviderRefreshLifecycleStuckError';
  markProviderPollingCompleted(providerIssueHandoff, { error });
}

function readProviderWorkerRecoverRestartRequiredContext(
  providerIssueHandoff: ProviderIssueHandoffService
): ProviderWorkerRecoverRestartRequiredContext | null {
  const health = readProviderPollingHealth(providerIssueHandoff);
  if (health?.restart_required !== true) {
    return null;
  }
  return {
    reason: health.reason ?? 'provider_refresh_lifecycle_stuck',
    lastError: health.last_error ?? health.reason ?? 'provider_refresh_lifecycle_stuck'
  };
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
  let lastSuccessfulFullRecoverySweepAtMs: number | null = null;

  const clearScheduledTrigger = (): void => {
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    timer = null;
  };

  const scheduleNextTriggerAsync = async (): Promise<void> => {
    if (stopped || timer) {
      return;
    }
    const schedule = await resolveProviderRefreshSchedule().catch(() => ({
      interval_ms: PROVIDER_REFRESH_INTERVAL_MS,
      reason: null,
      linear_budget: null
    }));
    if (stopped || timer) {
      return;
    }
    scheduleProviderPolling(providerIssueHandoff, {
      intervalMs: schedule.interval_ms,
      reason: schedule.reason,
      linearBudget: schedule.linear_budget
    });
    timer = setTimeout(() => {
      timer = null;
      void trigger();
    }, schedule.interval_ms);
    timer.unref?.();
  };

  const resolveProviderRefreshSchedule = async (): Promise<{
    interval_ms: number;
    reason: string | null;
    linear_budget: Awaited<ReturnType<typeof readSharedLinearBudgetStatus>>;
  }> =>
    resolveLinearPollingInterval({
      budget: await readSharedLinearBudgetStatus(process.env, {
        operation: 'dispatch_source_tracked_issues'
      }).catch(() => null),
      default_interval_ms: PROVIDER_REFRESH_INTERVAL_MS,
      operation: 'dispatch_source_tracked_issues'
    });

  const resolveWatchdogDelayMs = (): number =>
    resolveProviderIssueHandoffWatchdogDelayMs(providerIssueHandoff);

  const shouldRunFullRecoverySweep = (nowMs: number): boolean =>
    lastSuccessfulFullRecoverySweepAtMs === null ||
    nowMs - lastSuccessfulFullRecoverySweepAtMs >= PROVIDER_FULL_RECOVERY_SWEEP_INTERVAL_MS;

  const trigger = async (): Promise<void> => {
    if (stopped) {
      return;
    }
    const preflightSchedule = await resolveProviderRefreshSchedule().catch(() => null);
    if (stopped) {
      clearScheduledTrigger();
      return;
    }
    if (preflightSchedule?.linear_budget?.cooldown_active) {
      clearScheduledTrigger();
      await scheduleNextTriggerAsync();
      return;
    }
    if (isProviderPollingStuck(providerIssueHandoff)) {
      await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
      await scheduleNextTriggerAsync();
      return;
    }
    clearScheduledTrigger();
    const generation = ++rescheduleGeneration;
    try {
      const operation = runProviderIssueHandoffOperation(
        providerIssueHandoff,
        async () => {
          if (!providerIssueHandoff.poll || !context.readFeatureToggles) {
            await providerIssueHandoff.refresh();
            return;
          }

          const refetchTrackedIssues = async (
            input?: ProviderTrackedIssueRefetchInput
          ): Promise<ProviderTrackedIssuePollResolution> =>
            await resolveProviderPollTrackedIssues(context, input);

          if (shouldRunFullRecoverySweep(Date.now())) {
            const pollResolution = await refetchTrackedIssues({
              mode: 'recovery_sweep'
            });
            if (pollResolution.kind === 'ready') {
              await providerIssueHandoff.poll({
                trackedIssues: pollResolution.trackedIssues,
                refetchTrackedIssues,
                allowPollFailClosed: true
              });
              lastSuccessfulFullRecoverySweepAtMs = Date.now();
              return;
            }
            if (pollResolution.reason === 'dispatch_source_provider_rate_limited') {
              return;
            }
            noteProviderPollingRequest(providerIssueHandoff, {
              mode: 'refresh',
              queued: getProviderIssueHandoffOperationState(providerIssueHandoff).queuedRefresh !== null,
              replaceQueued: true
            });
            await providerIssueHandoff.refresh();
            return;
          }

          await providerIssueHandoff.poll({
            trackedIssues: [],
            refetchTrackedIssues,
            deferFreshDiscovery: true
          });
          return;
        },
        undefined,
        {
          mode: providerIssueHandoff.poll && context.readFeatureToggles ? 'poll' : 'refresh'
        }
      );
      await waitForProviderIssueHandoffPendingWithWatchdog(
        providerIssueHandoff,
        operation,
        resolveWatchdogDelayMs
      );
    } catch {
      // Best-effort provider refreshes should not crash the public lifecycle.
    }
    await waitForProviderIssueHandoffQueueToDrain(providerIssueHandoff, resolveWatchdogDelayMs);
    if (stopped || generation !== rescheduleGeneration) {
      return;
    }
    await scheduleNextTriggerAsync();
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

function resolveProviderIssueHandoffWatchdogDelayMs(
  providerIssueHandoff: ProviderIssueHandoffService
): number {
  const health = readProviderPollingHealth(providerIssueHandoff);
  if (!health?.checking || health.operation_elapsed_ms === null) {
    return PROVIDER_REFRESH_STUCK_AFTER_MS;
  }
  return Math.max(0, PROVIDER_REFRESH_STUCK_AFTER_MS - health.operation_elapsed_ms);
}

function resolveProviderWorkerRecoverWatchdogDelayMs(
  providerIssueHandoff: ProviderIssueHandoffService,
  recoveryStartedAtMs: number,
  maxWaitMs: number,
  totalWaitMs: number
): number {
  return Math.min(
    maxWaitMs,
    resolveProviderIssueHandoffWatchdogDelayMs(providerIssueHandoff),
    Math.max(0, totalWaitMs - (Date.now() - recoveryStartedAtMs))
  );
}

function hasProviderWorkerRecoverDeadlineExpired(
  recoveryStartedAtMs: number,
  totalWaitMs: number
): boolean {
  return Date.now() - recoveryStartedAtMs >= totalWaitMs;
}

async function resolveProviderPollTrackedIssues(
  context: ProviderPollTrackedIssueContext,
  input?: ProviderTrackedIssueRefetchInput
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
    env: process.env,
    queryMode: input?.mode,
    eligibleIssueTargetCount: input?.eligibleTargetCount,
    eligibleStateSlotCounts: input?.eligibleStateSlotCounts,
    excludedIssueIds: input?.excludedIssueIds
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

function pickLatestTimestamp(currentIso: string | null | undefined, candidateIso: string): string {
  const currentMs = Date.parse(currentIso ?? '');
  const candidateMs = Date.parse(candidateIso);
  if (!Number.isFinite(currentMs)) {
    return candidateIso;
  }
  if (!Number.isFinite(candidateMs)) {
    return currentIso ?? candidateIso;
  }
  return candidateMs >= currentMs ? candidateIso : currentIso ?? candidateIso;
}

function runProviderIssueHandoffOperation(
  providerIssueHandoff: ProviderIssueHandoffService,
  operation: () => Promise<void>,
  options?: { queueIfBusy?: boolean },
  healthContext?: ProviderIssueHandoffOperationHealthContext
): Promise<void> {
  const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
  if (state.active) {
    const continueWhileBusy = (): Promise<void> => {
      if (!options?.queueIfBusy) {
        return waitForProviderIssueHandoffPending(providerIssueHandoff, state.active!);
      }
      if (healthContext) {
        noteProviderPollingRequest(providerIssueHandoff, {
          mode: healthContext.mode,
          queued: true,
          preserveActiveMode: true
        });
      }
      return queueProviderIssueHandoffRefresh(providerIssueHandoff, state, operation, healthContext);
    };
    if (isProviderPollingStuck(providerIssueHandoff)) {
      return (async () => {
        const stuckOutcome = await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
        if (!stuckOutcome) {
          return continueWhileBusy();
        }
        if (healthContext) {
          noteProviderPollingRequest(providerIssueHandoff, {
            mode: healthContext.mode,
            queued: state.queuedRefresh !== null,
            replaceQueued: true,
            preserveActiveMode: true
          });
        }
        throw new Error(stuckOutcome?.reason ?? 'provider_refresh_lifecycle_stuck');
      })();
    }
    return continueWhileBusy();
  }
  const idleStuckError = buildProviderIssueHandoffRestartRequiredError(providerIssueHandoff);
  if (idleStuckError) {
    clearProviderIssueHandoffOperationState(providerIssueHandoff, state);
    return Promise.reject(idleStuckError);
  }
  return waitForProviderIssueHandoffPending(
    providerIssueHandoff,
    startProviderIssueHandoffOperation(providerIssueHandoff, state, operation, healthContext)
  );
}

function buildProviderIssueHandoffRestartRequiredError(
  providerIssueHandoff: ProviderIssueHandoffService
): Error | null {
  if (!isProviderPollingStuck(providerIssueHandoff)) {
    return null;
  }
  return new Error(
    readProviderPollingHealth(providerIssueHandoff)?.reason ?? 'provider_refresh_lifecycle_stuck'
  );
}

function startProviderIssueHandoffOperation(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: ProviderIssueHandoffOperationState,
  operation: () => Promise<void>,
  healthContext?: ProviderIssueHandoffOperationHealthContext
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
        if (
          healthContext &&
          healthContext.completeOnSuccess !== false &&
          state.active === operationPromise
        ) {
          markProviderPollingCompleted(providerIssueHandoff);
        }
        return value;
      },
      (error: unknown) => {
        if (healthContext && state.active === operationPromise) {
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
  healthContext?: ProviderIssueHandoffOperationHealthContext
): Promise<void> {
  if (state.queuedRefresh) {
    return state.queuedRefresh;
  }
  const queuedRefresh = waitForProviderIssueHandoffPending(providerIssueHandoff, state.active!)
    .catch(async (error: unknown) => {
      const stuckReason = resolveProviderIssueHandoffStuckErrorReason(error);
      if (stuckReason) {
        throw new Error(stuckReason);
      }
      if (await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
        throw new Error(
          readProviderPollingHealth(providerIssueHandoff)?.reason ??
            'provider_refresh_lifecycle_stuck'
        );
      }
    })
    .then(async () => {
      if (await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
        throw new Error(
          readProviderPollingHealth(providerIssueHandoff)?.reason ??
            'provider_refresh_lifecycle_stuck'
        );
      }
      if (state.queuedRefresh !== queuedRefresh) {
        return;
      }
      state.queuedRefresh = null;
      if (state.active) {
        return queueProviderIssueHandoffRefresh(providerIssueHandoff, state, operation, healthContext);
      }
      return waitForProviderIssueHandoffPending(
        providerIssueHandoff,
        startProviderIssueHandoffOperation(providerIssueHandoff, state, operation, healthContext)
      );
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

function detachProviderIssueHandoffPending(pending: Promise<void> | null): void {
  if (!pending) {
    return;
  }
  void pending.catch(() => undefined);
}

async function waitForProviderIssueHandoffQueueToDrain(
  providerIssueHandoff: ProviderIssueHandoffService,
  resolveWatchdogDelayMs: () => number,
  options: { settleStuckPending?: boolean; stuckPendingGraceMs?: number } = {}
): Promise<void> {
  for (;;) {
    const state = getProviderIssueHandoffOperationState(providerIssueHandoff);
    const pending = state.active ?? state.queuedRefresh;
    if (!pending) {
      return;
    }
    if (await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
      if (options.settleStuckPending) {
        await settleProviderIssueHandoffStuckPending(providerIssueHandoff, state, pending, options);
        continue;
      }
      return;
    }
    try {
      await waitForProviderIssueHandoffPendingWithWatchdog(
        providerIssueHandoff,
        pending,
        resolveWatchdogDelayMs
      );
    } catch {
      if (await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff)) {
        if (options.settleStuckPending) {
          await settleProviderIssueHandoffStuckPending(providerIssueHandoff, state, pending, options);
          continue;
        }
        return;
      }
    }
  }
}

async function settleProviderIssueHandoffStuckPending(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: ProviderIssueHandoffOperationState,
  pending: Promise<void>,
  options: { stuckPendingGraceMs?: number }
): Promise<void> {
  let timeout: NodeJS.Timeout | null = null;
  const graceMs = Math.max(
    0,
    options.stuckPendingGraceMs ?? PROVIDER_CLOSE_STUCK_DRAIN_GRACE_MS
  );
  const outcome = await Promise.race([
    pending.then(
      () => 'settled' as const,
      () => 'settled' as const
    ),
    new Promise<'timed_out'>((resolve) => {
      timeout = setTimeout(() => resolve('timed_out'), graceMs);
      timeout.unref?.();
    })
  ]);
  if (timeout) {
    clearTimeout(timeout);
  }
  if (outcome === 'settled') {
    return;
  }
  detachProviderIssueHandoffPending(pending);
  providerIssueHandoff.resetStuckRefreshLifecycle?.();
  if (state.active === pending) {
    state.active = null;
  }
  if (state.queuedRefresh === pending) {
    state.queuedRefresh = null;
  }
  clearProviderIssueHandoffOperationState(providerIssueHandoff, state);
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
  if (
    providerIssueHandoffOperations.get(providerIssueHandoff) === state &&
    !state.active &&
    !state.queuedRefresh
  ) {
    providerIssueHandoffOperations.delete(providerIssueHandoff);
  }
}

async function resolveProviderIssueHandoffStuckOutcome(
  providerIssueHandoff: ProviderIssueHandoffService,
  options: { force?: boolean } = {}
): Promise<ProviderIssueHandoffRefreshRequestOutcome | null> {
  const health = readProviderPollingHealth(providerIssueHandoff);
  if (options.force) {
    if (!health?.checking) {
      return null;
    }
  } else if (health?.stuck !== true) {
    return null;
  }
  await markProviderPollingStuck(providerIssueHandoff);
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
    async (error: unknown) => {
      const stuckOutcome = await resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff);
      if (stuckOutcome) {
        return stuckOutcome;
      }
      const stuckReason = resolveProviderIssueHandoffStuckErrorReason(error);
      if (stuckReason) {
        return {
          queued: true,
          coalesced: true,
          stuck: true,
          restart_required: true,
          reason: stuckReason
        };
      }
      throw error;
    }
  );
}

function resolveProviderIssueHandoffStuckErrorReason(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null;
  }
  if (
    error.name === 'ProviderRefreshLifecycleStuckError' ||
    error.message === 'provider_refresh_lifecycle_stuck'
  ) {
    return 'provider_refresh_lifecycle_stuck';
  }
  if (
    error.name === 'ProviderPollLifecycleStuckError' ||
    error.message === 'provider_poll_lifecycle_stuck'
  ) {
    return 'provider_poll_lifecycle_stuck';
  }
  return null;
}

function acknowledgeProviderIssueHandoffAccepted(
  pending: Promise<void>,
  successOutcome: ProviderIssueHandoffRefreshRequestOutcome
): Promise<ProviderIssueHandoffRefreshRequestOutcome> {
  // Public refresh routes return as soon as the lifecycle accepts the work, so
  // keep the detached refresh promise from surfacing later failures as
  // unhandled rejections.
  void pending.catch(() => undefined);
  return Promise.resolve(successOutcome);
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

async function waitForProviderIssueHandoffPendingWithWatchdog(
  providerIssueHandoff: ProviderIssueHandoffService,
  pending: Promise<void>,
  resolveWatchdogDelayMs: () => number,
  options: { forceStuckOnWatchdog?: boolean } = {}
): Promise<void> {
  let stuckWatchdog: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      waitForProviderIssueHandoffPending(providerIssueHandoff, pending),
      new Promise<void>((resolve) => {
        const watchdogDelayMs = resolveWatchdogDelayMs();
        stuckWatchdog = setTimeout(() => {
          void resolveProviderIssueHandoffStuckOutcome(providerIssueHandoff, {
            force: options.forceStuckOnWatchdog === true
          }).finally(resolve);
        }, watchdogDelayMs);
        stuckWatchdog.unref?.();
      })
    ]);
  } finally {
    if (stuckWatchdog) {
      clearTimeout(stuckWatchdog);
    }
  }
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
