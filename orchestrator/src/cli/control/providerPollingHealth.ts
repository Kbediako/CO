import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import { logger } from '../../logger.js';
import type { LinearBudgetStatus } from './linearBudgetState.js';

export type ControlPollingMode = 'poll' | 'refresh';

export interface ControlPollingHealthPayload {
  enabled: boolean;
  interval_ms: number | null;
  checking: boolean;
  queued: boolean;
  last_mode: ControlPollingMode | null;
  last_requested_at: string | null;
  last_completed_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error: string | null;
  next_poll_at: string | null;
  next_poll_in_ms: number | null;
  updated_at: string | null;
  operation_started_at: string | null;
  operation_elapsed_ms: number | null;
  stalled_after_ms: number | null;
  stuck: boolean;
  stuck_since_at: string | null;
  restart_required: boolean;
  reason: string | null;
  linear_budget: LinearBudgetStatus | null;
}

interface MutableProviderPollingHealthState {
  intervalMs: number | null;
  stuckAfterMs: number | null;
  checking: boolean;
  queued: boolean;
  lastMode: ControlPollingMode | null;
  lastRequestedAtMs: number | null;
  lastCompletedAtMs: number | null;
  lastSuccessAtMs: number | null;
  lastErrorAtMs: number | null;
  lastError: string | null;
  nextPollAtMs: number | null;
  updatedAtMs: number | null;
  operationStartedAtMs: number | null;
  stuckAtMs: number | null;
  reason: string | null;
  linearBudget: LinearBudgetStatus | null;
  onUpdate: ((payload: ControlPollingHealthPayload) => Promise<void> | void) | null;
  updateChain: Promise<void>;
}

const providerPollingHealthStates = new WeakMap<
  ProviderIssueHandoffService,
  MutableProviderPollingHealthState
>();

export function initializeProviderPollingHealth(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    intervalMs: number | null;
    stuckAfterMs?: number | null;
    onUpdate?: ((payload: ControlPollingHealthPayload) => Promise<void> | void) | null;
    skipInitialUpdate?: boolean;
  }
): void {
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff, input.intervalMs);
  state.intervalMs = input.intervalMs;
  if (input.stuckAfterMs !== undefined) {
    state.stuckAfterMs = input.stuckAfterMs;
  }
  if (input.onUpdate !== undefined) {
    state.onUpdate = input.onUpdate;
  }
  if (state.nextPollAtMs === null && input.intervalMs !== null) {
    state.nextPollAtMs = Date.now();
  }
  if (input.skipInitialUpdate) {
    return;
  }
  queueProviderPollingHealthUpdate(providerIssueHandoff, state);
}

export function noteProviderPollingRequest(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    mode: ControlPollingMode;
    queued: boolean;
    replaceQueued?: boolean;
    preserveActiveMode?: boolean;
    atMs?: number;
  }
): void {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  const preserveActiveMode =
    input.preserveActiveMode && state.checking && state.operationStartedAtMs !== null;
  state.lastMode = preserveActiveMode ? state.lastMode ?? input.mode : input.mode;
  state.lastRequestedAtMs = atMs;
  state.queued = input.replaceQueued ? input.queued : state.queued || input.queued;
  state.updatedAtMs = atMs;
  queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

export function markProviderPollingStarted(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    mode: ControlPollingMode;
    queued?: boolean;
    atMs?: number;
  }
): void {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  state.lastMode = input.mode;
  state.lastRequestedAtMs = atMs;
  state.checking = true;
  state.queued = input.queued ?? false;
  state.nextPollAtMs = null;
  state.updatedAtMs = atMs;
  state.operationStartedAtMs = atMs;
  state.stuckAtMs = null;
  state.reason = null;
  queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

export function markProviderPollingCompleted(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    error?: unknown;
    atMs?: number;
  } = {}
): void {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  state.checking = false;
  state.lastCompletedAtMs = atMs;
  if (input.error === undefined) {
    state.lastSuccessAtMs = atMs;
    state.lastErrorAtMs = null;
    state.lastError = null;
  } else {
    state.lastErrorAtMs = atMs;
    state.lastError = normalizePollingError(input.error);
  }
  state.nextPollAtMs = state.intervalMs !== null ? atMs + state.intervalMs : null;
  state.updatedAtMs = atMs;
  state.operationStartedAtMs = null;
  state.stuckAtMs = null;
  state.reason = null;
  queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

export function scheduleProviderPolling(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    intervalMs: number;
    reason?: string | null;
    linearBudget?: LinearBudgetStatus | null;
    atMs?: number;
  }
): void {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  state.intervalMs = input.intervalMs;
  state.nextPollAtMs = atMs + input.intervalMs;
  state.updatedAtMs = atMs;
  state.reason = normalizeOptionalString(input.reason) ?? null;
  state.linearBudget = input.linearBudget ?? null;
  queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

export function isProviderPollingStuck(
  providerIssueHandoff: ProviderIssueHandoffService | null | undefined,
  nowMs: number = Date.now()
): boolean {
  return readProviderPollingHealth(providerIssueHandoff, nowMs)?.stuck === true;
}

export function markProviderPollingStuck(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    atMs?: number;
  } = {}
): Promise<void> {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  if (!state.checking || state.operationStartedAtMs === null) {
    return Promise.resolve();
  }
  if (state.stuckAtMs !== null) {
    return state.updateChain;
  }
  state.stuckAtMs =
    state.stuckAfterMs !== null ? state.operationStartedAtMs + state.stuckAfterMs : atMs;
  state.lastErrorAtMs = atMs;
  state.lastError = buildProviderPollingStuckMessage(state);
  state.reason = buildProviderPollingStuckReason(state);
  state.updatedAtMs = atMs;
  return queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

export function readProviderPollingHealth(
  providerIssueHandoff: ProviderIssueHandoffService | null | undefined,
  nowMs: number = Date.now()
): ControlPollingHealthPayload | null {
  if (!providerIssueHandoff) {
    return null;
  }
  const state = providerPollingHealthStates.get(providerIssueHandoff);
  if (!state) {
    return null;
  }
  maybeMarkProviderPollingStuck(providerIssueHandoff, state, nowMs);
  return buildProviderPollingHealthPayload(state, nowMs);
}

function buildProviderPollingHealthPayload(
  state: MutableProviderPollingHealthState,
  nowMs: number
): ControlPollingHealthPayload {
  const operationElapsedMs =
    state.checking && state.operationStartedAtMs !== null
      ? Math.max(0, nowMs - state.operationStartedAtMs)
      : null;
  const stuck = state.stuckAtMs !== null;
  const reason = stuck ? state.reason ?? buildProviderPollingStuckReason(state) : null;
  return {
    enabled: true,
    interval_ms: state.intervalMs,
    checking: state.checking,
    queued: state.queued,
    last_mode: state.lastMode,
    last_requested_at: toIsoTimestamp(state.lastRequestedAtMs),
    last_completed_at: toIsoTimestamp(state.lastCompletedAtMs),
    last_success_at: toIsoTimestamp(state.lastSuccessAtMs),
    last_error_at: toIsoTimestamp(state.lastErrorAtMs),
    last_error: state.lastError,
    next_poll_at: toIsoTimestamp(state.nextPollAtMs),
    next_poll_in_ms:
      state.nextPollAtMs === null ? null : Math.max(0, state.nextPollAtMs - nowMs),
    updated_at: toIsoTimestamp(state.updatedAtMs),
    operation_started_at: toIsoTimestamp(state.operationStartedAtMs),
    operation_elapsed_ms: operationElapsedMs,
    stalled_after_ms: state.stuckAfterMs,
    stuck,
    stuck_since_at: toIsoTimestamp(state.stuckAtMs),
    restart_required: stuck,
    reason,
    linear_budget: state.linearBudget
  };
}

function getOrCreateProviderPollingHealthState(
  providerIssueHandoff: ProviderIssueHandoffService,
  intervalMs: number | null = null
): MutableProviderPollingHealthState {
  const existing = providerPollingHealthStates.get(providerIssueHandoff);
  if (existing) {
    if (intervalMs !== null) {
      existing.intervalMs = intervalMs;
    }
    return existing;
  }
  const nextState: MutableProviderPollingHealthState = {
    intervalMs,
    stuckAfterMs: null,
    checking: false,
    queued: false,
    lastMode: null,
    lastRequestedAtMs: null,
    lastCompletedAtMs: null,
    lastSuccessAtMs: null,
    lastErrorAtMs: null,
    lastError: null,
    nextPollAtMs: intervalMs !== null ? Date.now() : null,
    updatedAtMs: null,
    operationStartedAtMs: null,
    stuckAtMs: null,
    reason: null,
    linearBudget: null,
    onUpdate: null,
    updateChain: Promise.resolve()
  };
  providerPollingHealthStates.set(providerIssueHandoff, nextState);
  return nextState;
}

function maybeMarkProviderPollingStuck(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: MutableProviderPollingHealthState,
  nowMs: number
): void {
  if (
    !state.checking ||
    state.operationStartedAtMs === null ||
    state.stuckAfterMs === null ||
    nowMs - state.operationStartedAtMs < state.stuckAfterMs
  ) {
    return;
  }
  markProviderPollingStuck(providerIssueHandoff, {
    atMs: nowMs
  });
}

function buildProviderPollingStuckReason(state: MutableProviderPollingHealthState): string {
  return state.lastMode === 'poll'
    ? 'provider_poll_lifecycle_stuck'
    : 'provider_refresh_lifecycle_stuck';
}

function buildProviderPollingStuckMessage(state: MutableProviderPollingHealthState): string {
  const thresholdText =
    typeof state.stuckAfterMs === 'number' && Number.isFinite(state.stuckAfterMs)
      ? `${state.stuckAfterMs}ms`
      : 'the configured safe budget';
  return `${
    state.lastMode === 'poll' ? 'Provider poll' : 'Provider refresh'
  } lifecycle exceeded ${thresholdText}; restart required`;
}

function queueProviderPollingHealthUpdate(
  providerIssueHandoff: ProviderIssueHandoffService,
  state: MutableProviderPollingHealthState,
  nowMs: number = Date.now()
): Promise<void> {
  if (!state.onUpdate) {
    return state.updateChain;
  }
  const payload = buildProviderPollingHealthPayload(state, nowMs);
  const nextUpdate = state.updateChain
    .catch(() => undefined)
    .then(async () => {
      await state.onUpdate?.(payload);
    });
  // Most callers intentionally fire-and-forget polling sync. Attach a no-op handler so those
  // paths do not surface unhandled rejections while explicit awaiters still observe failures.
  void nextUpdate.catch(() => undefined);
  state.updateChain = nextUpdate.catch((error: unknown) => {
    logger.warn(
      `Failed to sync provider polling health: ${(error as Error)?.message ?? String(error)}`
    );
  });
  return nextUpdate;
}

function toIsoTimestamp(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }
  return new Date(value).toISOString();
}

function normalizePollingError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return String(error);
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
