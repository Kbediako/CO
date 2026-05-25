import type { ProviderIssueHandoffService } from './providerIssueHandoff.js';
import { logger } from '../../logger.js';
import type { LinearBudgetStatus } from './linearBudgetState.js';
import {
  CONTROL_HOST_SOURCE_FRESHNESS_AUTHORITY_TTL_MS,
  isControlHostSourceFreshnessAuthorityAdmissionValid,
  resolveControlHostAuthoritativeSourceFreshnessOwner,
  type ControlHostSourceFreshnessAuthority,
  type ControlHostOwnershipPollingPayload
} from './controlHostOwnership.js';

export type ControlPollingMode = 'poll' | 'refresh';
export type ControlNextRefreshState = 'cooldown' | 'checking' | 'scheduled' | 'unknown';

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
  next_refresh_state?: ControlNextRefreshState | null;
  next_refresh_at?: string | null;
  next_refresh_in_ms?: number | null;
  source_updated_at?: string | null;
  updated_at: string | null;
  operation_started_at: string | null;
  operation_elapsed_ms: number | null;
  progress_updated_at?: string | null;
  progress_elapsed_ms?: number | null;
  stalled_after_ms: number | null;
  refresh_phase: string | null;
  refresh_request_class?: string | null;
  refresh_provider_keys?: string[] | null;
  refresh_counts: Record<string, number> | null;
  stuck: boolean;
  stuck_since_at: string | null;
  restart_required: boolean;
  reason: string | null;
  linear_budget: LinearBudgetStatus | null;
  control_host_owner?: ControlHostOwnershipPollingPayload | null;
  source_root_freshness_verified_at?: string | null;
  source_root_freshness_observed_at?: string | null;
  source_root_freshness_expires_at?: string | null;
  source_root_freshness_owner_token?: string | null;
  source_root_freshness_run_id?: string | null;
  source_root_freshness_source_root_realpath?: string | null;
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
  lastProgressAtMs: number | null;
  refreshPhase: string | null;
  refreshRequestClass: string | null;
  refreshProviderKeys: string[] | null;
  refreshCounts: Record<string, number> | null;
  stuckAtMs: number | null;
  reason: string | null;
  linearBudget: LinearBudgetStatus | null;
  controlHostOwner: ControlHostOwnershipPollingPayload | null;
  sourceRootFreshnessVerifiedAtMs: number | null;
  sourceRootFreshnessObservedAtMs: number | null;
  sourceRootFreshnessExpiresAtMs: number | null;
  sourceRootFreshnessOwnerToken: string | null;
  sourceRootFreshnessRunId: string | null;
  sourceRootFreshnessSourceRootRealpath: string | null;
  onUpdate: ((payload: ControlPollingHealthPayload) => Promise<void> | void) | null;
  updateChain: Promise<void>;
}

const DEFAULT_PROVIDER_POLLING_INTERVAL_MS = 15_000;

const providerPollingHealthStates = new WeakMap<
  ProviderIssueHandoffService,
  MutableProviderPollingHealthState
>();

export function initializeProviderPollingHealth(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    intervalMs: number | null;
    stuckAfterMs?: number | null;
    controlHostOwner?: ControlHostOwnershipPollingPayload | null;
    sourceRootFreshnessAuthority?: ControlHostSourceFreshnessAuthority | null;
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
  if (input.controlHostOwner !== undefined) {
    replaceControlHostOwnerSnapshot(state, input.controlHostOwner);
  }
  if (input.sourceRootFreshnessAuthority !== undefined) {
    recordPersistedSourceRootFreshnessAuthority(
      state,
      input.controlHostOwner ?? state.controlHostOwner,
      input.sourceRootFreshnessAuthority
    );
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
    controlHostOwner?: ControlHostOwnershipPollingPayload | null;
  }
): void {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  if (input.controlHostOwner !== undefined) {
    replaceControlHostOwnerSnapshot(state, input.controlHostOwner);
  }
  state.lastMode = input.mode;
  state.lastRequestedAtMs = atMs;
  state.checking = true;
  state.queued = input.queued ?? false;
  state.nextPollAtMs = null;
  state.updatedAtMs = atMs;
  state.operationStartedAtMs = atMs;
  state.lastProgressAtMs = atMs;
  state.refreshPhase = `${input.mode}:started`;
  state.refreshRequestClass = null;
  state.refreshProviderKeys = null;
  state.refreshCounts = null;
  state.stuckAtMs = null;
  state.reason = null;
  queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

export function recordProviderPollingProgress(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    phase: string;
    requestClass?: string | null;
    providerKeys?: string[] | null;
    counts?: Record<string, number> | null;
    atMs?: number;
  }
): void {
  const state = providerPollingHealthStates.get(providerIssueHandoff);
  if (!state) {
    return;
  }
  const atMs = input.atMs ?? Date.now();
  const previousRequestClass = state.refreshRequestClass;
  state.refreshPhase = normalizeOptionalString(input.phase) ?? null;
  if (input.requestClass !== undefined) {
    state.refreshRequestClass = normalizeOptionalString(input.requestClass) ?? null;
  }
  if (input.providerKeys !== undefined) {
    state.refreshProviderKeys = normalizePollingProviderKeys(input.providerKeys);
  } else if (
    input.requestClass !== undefined &&
    state.refreshRequestClass !== previousRequestClass
  ) {
    state.refreshProviderKeys = null;
  }
  state.refreshCounts = copyFiniteRefreshCounts(input.counts ?? null);
  state.updatedAtMs = atMs;
  state.lastProgressAtMs = atMs;
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
  const preserveStuckState = isProviderLifecycleStuckError(input.error);
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
  state.nextPollAtMs =
    preserveStuckState || state.intervalMs === null ? null : atMs + state.intervalMs;
  state.updatedAtMs = atMs;
  state.operationStartedAtMs = null;
  if (preserveStuckState) {
    if (state.stuckAtMs === null) {
      const stuckAnchorMs = state.lastProgressAtMs ?? state.lastRequestedAtMs;
      state.stuckAtMs =
        state.stuckAfterMs !== null && stuckAnchorMs !== null
          ? stuckAnchorMs + state.stuckAfterMs
          : atMs;
    }
    state.reason = state.reason ?? buildProviderPollingStuckReason(state);
  } else {
    state.refreshPhase = null;
    state.refreshRequestClass = null;
    state.refreshProviderKeys = null;
    state.refreshCounts = null;
    state.stuckAtMs = null;
    state.reason = null;
    state.lastProgressAtMs = null;
  }
  queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

export function markProviderPollingControlHostOwnerFreshnessVerified(
  providerIssueHandoff: ProviderIssueHandoffService,
  input: {
    controlHostOwner: ControlHostOwnershipPollingPayload | null;
    atMs?: number;
  }
): void {
  const atMs = input.atMs ?? Date.now();
  const state = getOrCreateProviderPollingHealthState(providerIssueHandoff);
  state.controlHostOwner = input.controlHostOwner;
  recordSourceRootFreshnessAuthority(state, input.controlHostOwner, atMs);
  state.updatedAtMs = atMs;
  queueProviderPollingHealthUpdate(providerIssueHandoff, state, atMs);
}

function recordSourceRootFreshnessAuthority(
  state: MutableProviderPollingHealthState,
  controlHostOwner: ControlHostOwnershipPollingPayload | null | undefined,
  fallbackAtMs: number | null = null
): void {
  const owner = resolveControlHostAuthoritativeSourceFreshnessOwner(controlHostOwner ?? null);
  const freshness = owner?.source_root_freshness ?? null;
  const observedAtMs = parseIsoToMs(freshness?.observed_at ?? null);
  const verifiedAtMs = fallbackAtMs ?? observedAtMs;
  if (!owner || !freshness || observedAtMs === null || verifiedAtMs === null) {
    clearSourceRootFreshnessAuthority(state);
    return;
  }
  state.sourceRootFreshnessVerifiedAtMs = verifiedAtMs;
  state.sourceRootFreshnessObservedAtMs = observedAtMs;
  state.sourceRootFreshnessExpiresAtMs =
    verifiedAtMs + CONTROL_HOST_SOURCE_FRESHNESS_AUTHORITY_TTL_MS;
  state.sourceRootFreshnessOwnerToken = owner?.owner_token ?? null;
  state.sourceRootFreshnessRunId = owner?.run_id ?? null;
  state.sourceRootFreshnessSourceRootRealpath = freshness?.source_root_realpath ?? null;
}

function recordPersistedSourceRootFreshnessAuthority(
  state: MutableProviderPollingHealthState,
  controlHostOwner: ControlHostOwnershipPollingPayload | null | undefined,
  authority: ControlHostSourceFreshnessAuthority | null | undefined
): void {
  if (!isControlHostSourceFreshnessAuthorityAdmissionValid(controlHostOwner ?? null, authority)) {
    clearSourceRootFreshnessAuthority(state);
    return;
  }
  const verifiedAtMs = parseIsoToMs(authority?.verified_at ?? null);
  const observedAtMs = parseIsoToMs(authority?.source_root_freshness_observed_at ?? null);
  const expiresAtMs = parseIsoToMs(authority?.expires_at ?? null);
  if (verifiedAtMs === null || observedAtMs === null || expiresAtMs === null) {
    clearSourceRootFreshnessAuthority(state);
    return;
  }
  state.sourceRootFreshnessVerifiedAtMs = verifiedAtMs;
  state.sourceRootFreshnessObservedAtMs = observedAtMs;
  state.sourceRootFreshnessExpiresAtMs = expiresAtMs;
  state.sourceRootFreshnessOwnerToken = authority?.owner_token ?? null;
  state.sourceRootFreshnessRunId = authority?.run_id ?? null;
  state.sourceRootFreshnessSourceRootRealpath = authority?.source_root_realpath ?? null;
}

function replaceControlHostOwnerSnapshot(
  state: MutableProviderPollingHealthState,
  controlHostOwner: ControlHostOwnershipPollingPayload | null
): void {
  state.controlHostOwner = controlHostOwner;
  if (!isSourceRootFreshnessAuthorityBoundToOwnerSnapshot(state, controlHostOwner)) {
    clearSourceRootFreshnessAuthority(state);
  }
}

function isSourceRootFreshnessAuthorityBoundToOwnerSnapshot(
  state: MutableProviderPollingHealthState,
  controlHostOwner: ControlHostOwnershipPollingPayload | null
): boolean {
  if (
    state.sourceRootFreshnessVerifiedAtMs === null &&
    state.sourceRootFreshnessObservedAtMs === null &&
    state.sourceRootFreshnessExpiresAtMs === null &&
    state.sourceRootFreshnessOwnerToken === null &&
    state.sourceRootFreshnessRunId === null &&
    state.sourceRootFreshnessSourceRootRealpath === null
  ) {
    return true;
  }
  const owner = resolveControlHostAuthoritativeSourceFreshnessOwner(controlHostOwner);
  const freshness = owner?.source_root_freshness ?? null;
  const observedAtMs = parseIsoToMs(freshness?.observed_at ?? null);
  return (
    owner !== null &&
    freshness !== null &&
    observedAtMs !== null &&
    state.sourceRootFreshnessObservedAtMs === observedAtMs &&
    state.sourceRootFreshnessOwnerToken === owner.owner_token &&
    state.sourceRootFreshnessRunId === owner.run_id &&
    state.sourceRootFreshnessSourceRootRealpath === (freshness.source_root_realpath ?? null)
  );
}

function clearSourceRootFreshnessAuthority(state: MutableProviderPollingHealthState): void {
  state.sourceRootFreshnessVerifiedAtMs = null;
  state.sourceRootFreshnessObservedAtMs = null;
  state.sourceRootFreshnessExpiresAtMs = null;
  state.sourceRootFreshnessOwnerToken = null;
  state.sourceRootFreshnessRunId = null;
  state.sourceRootFreshnessSourceRootRealpath = null;
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
  const intervalMs = normalizeScheduledPollingIntervalMs(input.intervalMs, state.intervalMs);
  state.intervalMs = intervalMs;
  if (state.stuckAtMs !== null) {
    state.nextPollAtMs = null;
    state.reason = state.reason ?? buildProviderPollingStuckReason(state);
  } else {
    state.nextPollAtMs = atMs + intervalMs;
    state.reason = normalizeOptionalString(input.reason) ?? null;
  }
  state.updatedAtMs = atMs;
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
    state.stuckAfterMs !== null
      ? (state.lastProgressAtMs ?? state.operationStartedAtMs) + state.stuckAfterMs
      : atMs;
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

export async function flushProviderPollingHealthUpdates(
  providerIssueHandoff: ProviderIssueHandoffService | null | undefined
): Promise<void> {
  if (!providerIssueHandoff) {
    return;
  }
  const state = providerPollingHealthStates.get(providerIssueHandoff);
  if (!state) {
    return;
  }
  await state.updateChain;
}

export function resolveControlPollingNextRefreshProjection(input: {
  checking: boolean;
  nextPollAt?: string | null;
  nextPollInMs?: number | null;
  operationStartedAt?: string | null;
  linearBudget?: LinearBudgetStatus | null;
  nowMs?: number;
}): {
  state: ControlNextRefreshState;
  at: string | null;
  in_ms: number | null;
} {
  const nowMs = input.nowMs ?? Date.now();
  const nextPollAtMs =
    parseIsoToMs(input.nextPollAt) ??
    (typeof input.nextPollInMs === 'number' && Number.isFinite(input.nextPollInMs)
      ? nowMs + Math.max(0, input.nextPollInMs)
      : null);
  const projection = resolveControlPollingNextRefreshProjectionFromMs({
    checking: input.checking,
    nextPollAtMs,
    operationStartedAtMs: parseIsoToMs(input.operationStartedAt),
    linearBudget: input.linearBudget ?? null,
    nowMs
  });
  return {
    state: projection.state,
    at: toIsoTimestamp(projection.atMs),
    in_ms: projection.inMs
  };
}

function buildProviderPollingHealthPayload(
  state: MutableProviderPollingHealthState,
  nowMs: number
): ControlPollingHealthPayload {
  const sourceUpdatedAtMs = latestFiniteTimestampMs(
    parseIsoToMs(state.linearBudget?.observed_at),
    state.lastSuccessAtMs
  );
  const operationElapsedMs =
    state.checking && state.operationStartedAtMs !== null
      ? Math.max(0, nowMs - state.operationStartedAtMs)
      : null;
  const progressElapsedMs =
    state.checking && state.lastProgressAtMs !== null
      ? Math.max(0, nowMs - state.lastProgressAtMs)
      : null;
  const stuck = state.stuckAtMs !== null;
  const reason = state.reason ?? (stuck ? buildProviderPollingStuckReason(state) : null);
  const nextRefresh = resolveControlPollingNextRefreshProjectionFromMs({
    checking: state.checking,
    nextPollAtMs: state.nextPollAtMs,
    operationStartedAtMs: state.operationStartedAtMs,
    linearBudget: state.linearBudget,
    nowMs
  });
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
    next_refresh_state: nextRefresh.state,
    next_refresh_at: toIsoTimestamp(nextRefresh.atMs),
    next_refresh_in_ms: nextRefresh.inMs,
    source_updated_at: toIsoTimestamp(sourceUpdatedAtMs),
    updated_at: toIsoTimestamp(state.updatedAtMs),
    operation_started_at: toIsoTimestamp(state.operationStartedAtMs),
    operation_elapsed_ms: operationElapsedMs,
    progress_updated_at: toIsoTimestamp(state.lastProgressAtMs),
    progress_elapsed_ms: progressElapsedMs,
    stalled_after_ms: state.stuckAfterMs,
    refresh_phase: state.refreshPhase,
    refresh_request_class: state.refreshRequestClass,
    refresh_provider_keys: state.refreshProviderKeys ? [...state.refreshProviderKeys] : null,
    refresh_counts: state.refreshCounts ? { ...state.refreshCounts } : null,
    stuck,
    stuck_since_at: toIsoTimestamp(state.stuckAtMs),
    restart_required: stuck,
    reason,
    linear_budget: state.linearBudget,
    control_host_owner: state.controlHostOwner,
    source_root_freshness_verified_at: toIsoTimestamp(
      state.sourceRootFreshnessVerifiedAtMs
    ),
    source_root_freshness_observed_at: toIsoTimestamp(
      state.sourceRootFreshnessObservedAtMs
    ),
    source_root_freshness_expires_at: toIsoTimestamp(
      state.sourceRootFreshnessExpiresAtMs
    ),
    source_root_freshness_owner_token: state.sourceRootFreshnessOwnerToken,
    source_root_freshness_run_id: state.sourceRootFreshnessRunId,
    source_root_freshness_source_root_realpath: state.sourceRootFreshnessSourceRootRealpath
  };
}

function resolveControlPollingNextRefreshProjectionFromMs(input: {
  checking: boolean;
  nextPollAtMs: number | null;
  operationStartedAtMs: number | null;
  linearBudget: LinearBudgetStatus | null;
  nowMs: number;
}): {
  state: ControlNextRefreshState;
  atMs: number | null;
  inMs: number | null;
} {
  const cooldownUntilMs = resolveActiveLinearBudgetCooldownUntilMs(input.linearBudget, input.nowMs);
  if (cooldownUntilMs !== null) {
    return {
      state: 'cooldown',
      atMs: cooldownUntilMs,
      inMs: Math.max(0, cooldownUntilMs - input.nowMs)
    };
  }
  if (input.checking && input.operationStartedAtMs !== null) {
    return {
      state: 'checking',
      atMs: null,
      inMs: null
    };
  }
  if (input.nextPollAtMs !== null && Number.isFinite(input.nextPollAtMs)) {
    return {
      state: 'scheduled',
      atMs: input.nextPollAtMs,
      inMs: Math.max(0, input.nextPollAtMs - input.nowMs)
    };
  }
  return {
    state: 'unknown',
    atMs: null,
    inMs: null
  };
}

function resolveActiveLinearBudgetCooldownUntilMs(
  budget: LinearBudgetStatus | null,
  nowMs: number
): number | null {
  const cooldownUntilMs = resolveLinearBudgetCooldownUntilMs(budget);
  return cooldownUntilMs !== null && cooldownUntilMs > nowMs ? cooldownUntilMs : null;
}

function resolveLinearBudgetCooldownUntilMs(
  budget: LinearBudgetStatus | null
): number | null {
  if (!budget) {
    return null;
  }
  const cooldownUntilMs = parseIsoToMs(budget.cooldown_until);
  if (cooldownUntilMs !== null) {
    return cooldownUntilMs;
  }
  if (
    typeof budget.retry_after_seconds === 'number' &&
    Number.isFinite(budget.retry_after_seconds)
  ) {
    const observedAtMs = parseIsoToMs(budget.observed_at);
    if (observedAtMs !== null) {
      return observedAtMs + Math.max(0, Math.ceil(budget.retry_after_seconds * 1000));
    }
  }
  return null;
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
    lastProgressAtMs: null,
    refreshPhase: null,
    refreshRequestClass: null,
    refreshProviderKeys: null,
    refreshCounts: null,
    stuckAtMs: null,
    reason: null,
    linearBudget: null,
    controlHostOwner: null,
    sourceRootFreshnessVerifiedAtMs: null,
    sourceRootFreshnessObservedAtMs: null,
    sourceRootFreshnessExpiresAtMs: null,
    sourceRootFreshnessOwnerToken: null,
    sourceRootFreshnessRunId: null,
    sourceRootFreshnessSourceRootRealpath: null,
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
    nowMs - (state.lastProgressAtMs ?? state.operationStartedAtMs) < state.stuckAfterMs
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

function parseIsoToMs(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function latestFiniteTimestampMs(...values: Array<number | null | undefined>): number | null {
  const finiteValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (finiteValues.length === 0) {
    return null;
  }
  return Math.max(...finiteValues);
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

function isProviderLifecycleStuckError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (
      error.name === 'ProviderRefreshLifecycleStuckError' ||
      error.name === 'ProviderPollLifecycleStuckError' ||
      error.message === 'provider_refresh_lifecycle_stuck' ||
      error.message === 'provider_poll_lifecycle_stuck'
    )
  );
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function copyFiniteRefreshCounts(value: Record<string, number> | null): Record<string, number> | null {
  if (!value) {
    return null;
  }
  const entries = Object.entries(value)
    .map(([key, count]) => [key.trim(), count] as const)
    .filter(([key, count]) => key.length > 0 && Number.isFinite(count));
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function normalizePollingProviderKeys(value: string[] | null): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = new Set<string>();
  for (const entry of value) {
    const key = normalizeOptionalString(entry);
    if (!key) {
      continue;
    }
    normalized.add(key);
    if (normalized.size >= 8) {
      break;
    }
  }
  return normalized.size > 0 ? [...normalized] : null;
}

function normalizeScheduledPollingIntervalMs(
  value: number,
  fallback: number | null
): number {
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }
  return DEFAULT_PROVIDER_POLLING_INTERVAL_MS;
}
