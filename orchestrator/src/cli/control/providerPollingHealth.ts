import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';

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
}

interface MutableProviderPollingHealthState {
  intervalMs: number | null;
  checking: boolean;
  queued: boolean;
  lastMode: ControlPollingMode | null;
  lastRequestedAtMs: number | null;
  lastCompletedAtMs: number | null;
  lastSuccessAtMs: number | null;
  lastErrorAtMs: number | null;
  lastError: string | null;
  nextPollAtMs: number | null;
}

const providerPollingHealthStates = new WeakMap<
  ProviderIssueHandoffService,
  MutableProviderPollingHealthState
>();

export function initializeProviderPollingHealth(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    intervalMs: number | null;
  }
): void {
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff, input.intervalMs);
  state.intervalMs = input.intervalMs;
  if (state.nextPollAtMs === null && input.intervalMs !== null) {
    state.nextPollAtMs = Date.now();
  }
}

export function noteProviderPollingRequest(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    mode: ControlPollingMode;
    queued: boolean;
    atMs?: number;
  }
): void {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  state.lastMode = input.mode;
  state.lastRequestedAtMs = atMs;
  state.queued = state.queued || input.queued;
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
      state.nextPollAtMs === null ? null : Math.max(0, state.nextPollAtMs - nowMs)
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
    checking: false,
    queued: false,
    lastMode: null,
    lastRequestedAtMs: null,
    lastCompletedAtMs: null,
    lastSuccessAtMs: null,
    lastErrorAtMs: null,
    lastError: null,
    nextPollAtMs: intervalMs !== null ? Date.now() : null
  };
  providerPollingHealthStates.set(providerIssueHandoff, nextState);
  return nextState;
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
