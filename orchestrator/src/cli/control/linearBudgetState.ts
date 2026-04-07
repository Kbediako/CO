import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';

import { acquireLockWithRetry, type LockRetryOptions } from '../../persistence/lockFile.js';
import { writeJsonAtomic } from '../utils/fs.js';
import { resolveCodexOrchestratorHome } from '../utils/codexPaths.js';
import { resolveLinearApiTokenFingerprint } from './linearGraphqlClient.js';
import type { LinearRateLimitDetails, LinearRateLimitErrorLike } from './linearRateLimit.js';
import { extractLinearRateLimitDetailsFromHeaders } from './linearRateLimit.js';

const LINEAR_BUDGET_STATE_SCHEMA_VERSION = 2;
const LINEAR_BUDGET_ALIAS_SCHEMA_VERSION = 1;
const LINEAR_BUDGET_STATE_DIRNAME = 'linear-budget';
const LINEAR_BUDGET_SCOPE_DIRNAME = 'scopes';
const LINEAR_BUDGET_ALIAS_DIRNAME = 'aliases';
const LINEAR_BUDGET_DEFAULT_CONSTRAINED_POLL_INTERVAL_MS = 30_000;
const LINEAR_BUDGET_DEFAULT_LOW_POLL_INTERVAL_MS = 60_000;
const LINEAR_BUDGET_DEFAULT_ENDPOINT_CONSTRAINED_POLL_INTERVAL_MS = 45_000;
const LINEAR_BUDGET_DEFAULT_ENDPOINT_LOW_POLL_INTERVAL_MS = 90_000;
const LINEAR_BUDGET_UNKNOWN_RESET_EXHAUSTED_GRACE_MS = LINEAR_BUDGET_DEFAULT_LOW_POLL_INTERVAL_MS;
const LINEAR_BUDGET_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 25,
  initialDelayMs: 10,
  backoffFactor: 1.5,
  maxDelayMs: 250,
  staleMs: 30_000
};
const LINEAR_BUDGET_RESERVATION_DEFAULT_TTL_GRACE_MS = 5_000;
const LINEAR_BUDGET_POLL_JITTER_RATIO = 0.1;
const LINEAR_BUDGET_POLL_JITTER_MAX_MS = 10_000;

type LinearBudgetSuppression = 'none' | 'constrained' | 'low' | 'exhausted' | 'cooldown';
type LinearBudgetEffectiveBucketKey =
  | 'requests'
  | 'endpoint_requests'
  | 'complexity'
  | 'endpoint_complexity';
type LinearBudgetScopeKind = 'user' | 'token';

export interface LinearBudgetBucketPayload {
  limit: number | null;
  remaining: number | null;
  reset_at: string | null;
}

export interface LinearBudgetEndpointStatus {
  key: string;
  endpoint_name: string | null;
  aliases: string[];
  observed_at: string;
  requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  request_complexity: number | null;
}

export interface LinearBudgetReservationStatus {
  id: string;
  operation: string;
  endpoint_key: string | null;
  requests: number;
  complexity: number | null;
  created_at: string;
  expires_at: string;
}

export interface LinearBudgetStatus {
  observed_at: string;
  source: string;
  request_id: string | null;
  retry_after_seconds: number | null;
  cooldown_until: string | null;
  cooldown_active: boolean;
  suppression: LinearBudgetSuppression;
  suppression_reason: string | null;
  scope_kind: LinearBudgetScopeKind;
  scope_key: string;
  viewer_id: string | null;
  workspace_id: string | null;
  token_fingerprints: string[];
  requests: LinearBudgetBucketPayload | null;
  endpoint_requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  endpoint_complexity: LinearBudgetBucketPayload | null;
  endpoint_name: string | null;
  selected_endpoint_key: string | null;
  request_complexity: number | null;
  endpoints: Record<string, LinearBudgetEndpointStatus>;
  reservations: LinearBudgetReservationStatus[];
  reservations_active: number;
}

interface PersistedLinearBudgetEndpointStatus {
  endpoint_name: string | null;
  aliases: string[];
  observed_at: string;
  requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  request_complexity: number | null;
}

interface PersistedLinearBudgetReservationStatus {
  id: string;
  operation: string;
  endpoint_key: string | null;
  requests: number;
  complexity: number | null;
  created_at: string;
  expires_at: string;
}

interface PersistedLinearBudgetStatus {
  schema_version: 2;
  scope_kind: LinearBudgetScopeKind;
  scope_key: string;
  viewer_id: string | null;
  workspace_id: string | null;
  token_fingerprints: string[];
  observed_at: string;
  source: string;
  request_id: string | null;
  retry_after_seconds: number | null;
  cooldown_until: string | null;
  requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  request_complexity: number | null;
  selected_endpoint_key: string | null;
  endpoints: Record<string, PersistedLinearBudgetEndpointStatus>;
  reservations: PersistedLinearBudgetReservationStatus[];
}

interface PersistedLinearBudgetAlias {
  schema_version: 1;
  token_fingerprint: string;
  scope_kind: LinearBudgetScopeKind;
  scope_key: string;
  viewer_id: string | null;
  workspace_id: string | null;
  updated_at: string;
}

interface LinearBudgetStatePaths {
  directory: string;
  scopesDir: string;
  aliasesDir: string;
  legacyStatePath: string;
  aliasPath: string;
  lockPath: string;
  tokenFingerprint: string;
}

interface LinearBudgetScopeIdentity {
  kind: LinearBudgetScopeKind;
  key: string;
  viewer_id: string | null;
  workspace_id: string | null;
  token_fingerprint: string;
}

interface LinearBudgetEndpointObservation {
  key: string;
  endpoint_name: string | null;
  aliases: string[];
  observed_at: string;
  requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  request_complexity: number | null;
  assume_unknown_resets_exhausted: boolean;
}

interface LinearBudgetObservation {
  observed_at: string;
  source: string;
  request_id: string | null;
  retry_after_seconds: number | null;
  requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  request_complexity: number | null;
  endpoint: LinearBudgetEndpointObservation | null;
  assume_unknown_resets_exhausted: boolean;
}

interface LinearBudgetOperationView {
  requests: LinearBudgetBucketPayload | null;
  endpoint_requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  endpoint_complexity: LinearBudgetBucketPayload | null;
  endpoint_key: string | null;
  endpoint_name: string | null;
  request_complexity: number | null;
  reservations_active: number;
  reservation_count: number;
}

interface LinearBudgetSelectionOptions {
  operation?: string | null;
}

export interface LinearBudgetReservationHandle {
  id: string;
  endpoint_key: string | null;
  endpoint_name: string | null;
  requests: number;
  complexity: number | null;
  release(): Promise<void>;
}

type LinearBudgetPreflightResolution =
  | { ok: true }
  | {
      ok: false;
      error: {
        code: 'linear_rate_limited';
        message: string;
        status: 429;
        retryable: true;
        details: Record<string, unknown>;
      };
    };

type LinearBudgetPreflightError = Exclude<LinearBudgetPreflightResolution, { ok: true }>['error'];

export async function readSharedLinearBudgetStatus(
  env: NodeJS.ProcessEnv = process.env,
  options: LinearBudgetSelectionOptions = {}
): Promise<LinearBudgetStatus | null> {
  const paths = resolveLinearBudgetStatePaths(env);
  if (!paths) {
    return null;
  }
  const persisted = await readNewestPersistedLinearBudgetStatus(paths, null);
  return persisted ? hydrateLinearBudgetStatus(persisted, options) : null;
}

export async function recordLinearBudgetHeadersObservation(input: {
  env?: NodeJS.ProcessEnv;
  headers?: Record<string, string> | null;
  source: string;
  observedAt?: string;
  scope?: {
    viewerId?: string | null;
    workspaceId?: string | null;
  };
}): Promise<LinearBudgetStatus | null> {
  const details = extractLinearRateLimitDetailsFromHeaders(input.headers);
  if (!hasRecordableLinearBudgetDetails(details)) {
    return await readSharedLinearBudgetStatus(input.env ?? process.env);
  }
  return await recordLinearBudgetObservation({
    env: input.env,
    source: input.source,
    details,
    observedAt: input.observedAt,
    scope: input.scope,
    assumeUnknownResetsExhausted: false
  });
}

export async function recordLinearBudgetRateLimitObservation(input: {
  env?: NodeJS.ProcessEnv;
  rateLimit: LinearRateLimitErrorLike;
  source: string;
  observedAt?: string;
  scope?: {
    viewerId?: string | null;
    workspaceId?: string | null;
  };
}): Promise<LinearBudgetStatus | null> {
  if (!hasRecordableLinearBudgetDetails(input.rateLimit.details)) {
    return await readSharedLinearBudgetStatus(input.env ?? process.env);
  }
  return await recordLinearBudgetObservation({
    env: input.env,
    source: input.source,
    details: input.rateLimit.details,
    observedAt: input.observedAt,
    scope: input.scope,
    assumeUnknownResetsExhausted: true
  });
}

export function resolveLinearBudgetPreflight(input: {
  budget: LinearBudgetStatus | null;
  operation: string;
  minimum_requests_remaining?: number | null;
  minimum_complexity_remaining?: number | null;
}): LinearBudgetPreflightResolution {
  const budget = input.budget;
  if (!budget) {
    return { ok: true };
  }

  const minimumRequestsRemaining = normalizePositiveInteger(input.minimum_requests_remaining) ?? 1;
  const inferredComplexityFloor =
    normalizePositiveInteger(input.minimum_complexity_remaining) ?? inferOperationComplexityFloor(budget.request_complexity, minimumRequestsRemaining);
  const details = buildSharedLinearRateLimitDetails(budget, {
    shared_budget_fail_fast: true,
    operation: input.operation
  });

  if (budget.cooldown_active) {
    return {
      ok: false,
      error: {
        code: 'linear_rate_limited',
        message: 'Linear shared budget cooldown is active.',
        status: 429,
        retryable: true,
        details
      }
    };
  }

  const requestShortfall = resolveBucketShortfall(
    [
      ['requests', budget.requests],
      ['endpoint_requests', budget.endpoint_requests]
    ],
    minimumRequestsRemaining
  );
  if (requestShortfall) {
    return {
      ok: false,
      error: {
        code: 'linear_rate_limited',
        message: `Linear shared budget is insufficient for ${input.operation}.`,
        status: 429,
        retryable: true,
        details: {
          ...details,
          required_requests_remaining: minimumRequestsRemaining,
          shortfall_bucket: requestShortfall.bucket,
          shortfall_remaining: requestShortfall.remaining
        }
      }
    };
  }

  if (inferredComplexityFloor !== null) {
    const complexityShortfall = resolveBucketShortfall(
      [
        ['complexity', budget.complexity],
        ['endpoint_complexity', budget.endpoint_complexity]
      ],
      inferredComplexityFloor
    );
    if (complexityShortfall) {
      return {
        ok: false,
        error: {
          code: 'linear_rate_limited',
          message: `Linear shared complexity budget is insufficient for ${input.operation}.`,
          status: 429,
          retryable: true,
          details: {
            ...details,
            required_complexity_remaining: inferredComplexityFloor,
            shortfall_bucket: complexityShortfall.bucket,
            shortfall_remaining: complexityShortfall.remaining
          }
        }
      };
    }
  }

  const exhaustedBucket = findExhaustedLinearBudgetBucket(budget);
  if (exhaustedBucket) {
    return {
      ok: false,
      error: {
        code: 'linear_rate_limited',
        message: 'Linear shared budget is exhausted.',
        status: 429,
        retryable: true,
        details: {
          ...details,
          exhausted_bucket: exhaustedBucket
        }
      }
    };
  }

  return { ok: true };
}

export async function reserveLinearBudgetReservation(input: {
  env?: NodeJS.ProcessEnv;
  operation: string;
  request_units?: number | null;
  minimum_requests_remaining?: number | null;
  minimum_complexity_remaining?: number | null;
  ttl_ms?: number | null;
}):
  Promise<
    | {
        ok: true;
        budget: LinearBudgetStatus | null;
        reservation: LinearBudgetReservationHandle | null;
      }
    | {
        ok: false;
        error: LinearBudgetPreflightError;
      }
  > {
  const env = input.env ?? process.env;
  const paths = resolveLinearBudgetStatePaths(env);
  if (!paths) {
    return {
      ok: true,
      budget: null,
      reservation: null
    };
  }

  const requestUnits = normalizePositiveInteger(input.request_units) ?? 1;
  const reservationTtlMs = normalizePositiveInteger(input.ttl_ms) ?? 30_000 + LINEAR_BUDGET_RESERVATION_DEFAULT_TTL_GRACE_MS;

  return await withLinearBudgetStateLock(paths, async () => {
    const persisted = await readNewestPersistedLinearBudgetStatus(paths, null);
    if (!persisted) {
      return {
        ok: true as const,
        budget: null,
        reservation: null
      };
    }

    const cleanedPersisted = pruneExpiredReservations(persisted);
    const selectedBudget = hydrateLinearBudgetStatus(cleanedPersisted, {
      operation: input.operation
    });
    const inferredComplexityFloor =
      normalizePositiveInteger(input.minimum_complexity_remaining) ??
      inferOperationComplexityFloor(selectedBudget.request_complexity, requestUnits);
    const preflight = resolveLinearBudgetPreflight({
      budget: selectedBudget,
      operation: input.operation,
      minimum_requests_remaining: normalizePositiveInteger(input.minimum_requests_remaining) ?? requestUnits,
      minimum_complexity_remaining: inferredComplexityFloor
    });
    if (!preflight.ok) {
      return {
        ok: false as const,
        error: preflight.error
      };
    }

    const shouldReserve =
      selectedBudget.requests !== null ||
      selectedBudget.complexity !== null ||
      selectedBudget.endpoint_requests !== null ||
      selectedBudget.endpoint_complexity !== null;
    if (!shouldReserve) {
      if (cleanedPersisted !== persisted) {
        await writePersistedLinearBudgetStatus(paths, cleanedPersisted);
      }
      return {
        ok: true as const,
        budget: selectedBudget,
        reservation: null
      };
    }

    const expiresAt = new Date(Date.now() + reservationTtlMs).toISOString();
    const reservationRecord: PersistedLinearBudgetReservationStatus = {
      id: randomUUID(),
      operation: input.operation,
      endpoint_key: selectedBudget.selected_endpoint_key,
      requests: requestUnits,
      complexity: inferredComplexityFloor,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };
    const nextPersisted: PersistedLinearBudgetStatus = {
      ...cleanedPersisted,
      reservations: [...cleanedPersisted.reservations, reservationRecord]
    };
    await writePersistedLinearBudgetStatus(paths, nextPersisted);
    const hydrated = hydrateLinearBudgetStatus(nextPersisted, {
      operation: input.operation
    });
    return {
      ok: true as const,
      budget: hydrated,
      reservation: {
        id: reservationRecord.id,
        endpoint_key: reservationRecord.endpoint_key,
        endpoint_name: hydrated.endpoint_name,
        requests: reservationRecord.requests,
        complexity: reservationRecord.complexity,
        release: async () => {
          await releaseLinearBudgetReservation({
            env,
            reservationId: reservationRecord.id
          });
        }
      }
    };
  });
}

export async function releaseLinearBudgetReservation(input: {
  env?: NodeJS.ProcessEnv;
  reservationId: string;
}): Promise<void> {
  const reservationId = normalizeOptionalString(input.reservationId);
  if (!reservationId) {
    return;
  }
  const env = input.env ?? process.env;
  const paths = resolveLinearBudgetStatePaths(env);
  if (!paths) {
    return;
  }
  await withLinearBudgetStateLock(paths, async () => {
    const persisted = await readNewestPersistedLinearBudgetStatus(paths, null);
    if (!persisted) {
      return;
    }
    const nextReservations = persisted.reservations.filter((entry) => entry.id !== reservationId);
    if (nextReservations.length === persisted.reservations.length) {
      return;
    }
    await writePersistedLinearBudgetStatus(paths, {
      ...persisted,
      reservations: nextReservations
    });
  });
}

export function resolveLinearPollingInterval(input: {
  budget: LinearBudgetStatus | null;
  default_interval_ms: number;
  nowMs?: number;
  operation?: string | null;
}): {
  interval_ms: number;
  reason: string | null;
  linear_budget: LinearBudgetStatus | null;
} {
  const budget = input.budget;
  if (!budget) {
    return {
      interval_ms: input.default_interval_ms,
      reason: null,
      linear_budget: null
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (budget.cooldown_active) {
    const cooldownUntilMs = parseIsoToMs(budget.cooldown_until);
    const cooldownWaitMs =
      cooldownUntilMs === null ? input.default_interval_ms : Math.max(0, cooldownUntilMs - nowMs);
    return {
      interval_ms: Math.max(input.default_interval_ms, cooldownWaitMs),
      reason: budget.suppression_reason ?? 'linear_budget_shared_cooldown',
      linear_budget: budget
    };
  }

  const pressure = resolveMaterializedBudgetPressure(budget);
  if (pressure.suppression === 'none') {
    return {
      interval_ms: input.default_interval_ms,
      reason: null,
      linear_budget: budget
    };
  }

  let baseIntervalMs = input.default_interval_ms;
  if (pressure.suppression === 'constrained') {
    baseIntervalMs = Math.max(
      input.default_interval_ms,
      pressure.endpoint_specific
        ? LINEAR_BUDGET_DEFAULT_ENDPOINT_CONSTRAINED_POLL_INTERVAL_MS
        : LINEAR_BUDGET_DEFAULT_CONSTRAINED_POLL_INTERVAL_MS
    );
  } else {
    baseIntervalMs = Math.max(
      input.default_interval_ms,
      pressure.endpoint_specific
        ? LINEAR_BUDGET_DEFAULT_ENDPOINT_LOW_POLL_INTERVAL_MS
        : LINEAR_BUDGET_DEFAULT_LOW_POLL_INTERVAL_MS
    );
  }

  const intervalMs = applyDeterministicPositiveJitter(
    baseIntervalMs,
    `${pressure.reason ?? 'linear_budget'}|${budget.selected_endpoint_key ?? 'global'}|${budget.observed_at}`,
    nowMs
  );
  return {
    interval_ms: intervalMs,
    reason: pressure.reason,
    linear_budget: {
      ...budget,
      suppression: pressure.suppression,
      suppression_reason: pressure.reason
    }
  };
}

export function buildSharedLinearRateLimitDetails(
  budget: LinearBudgetStatus,
  extraDetails: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    ...(budget.retry_after_seconds !== null ? { retry_after_seconds: budget.retry_after_seconds } : {}),
    ...(budget.request_id ? { request_id: budget.request_id } : {}),
    ...(budget.cooldown_until ? { shared_budget_cooldown_until: budget.cooldown_until } : {}),
    shared_budget_observed_at: budget.observed_at,
    shared_budget_source: budget.source,
    shared_budget_cooldown_active: budget.cooldown_active,
    shared_budget_suppression: budget.suppression,
    shared_budget_scope_kind: budget.scope_kind,
    shared_budget_scope_key: budget.scope_key,
    ...(budget.viewer_id ? { shared_budget_viewer_id: budget.viewer_id } : {}),
    ...(budget.workspace_id ? { shared_budget_workspace_id: budget.workspace_id } : {}),
    ...(budget.suppression_reason ? { shared_budget_suppression_reason: budget.suppression_reason } : {}),
    ...(budget.endpoint_name ? { endpoint_name: budget.endpoint_name } : {}),
    ...(budget.selected_endpoint_key ? { selected_endpoint_key: budget.selected_endpoint_key } : {}),
    ...(budget.request_complexity !== null ? { request_complexity: budget.request_complexity } : {}),
    ...(budget.reservations_active > 0 ? { shared_budget_reservations_active: budget.reservations_active } : {}),
    ...serializeLinearBudgetBucketDetails('requests', budget.requests),
    ...serializeLinearBudgetBucketDetails('endpoint_requests', budget.endpoint_requests),
    ...serializeLinearBudgetBucketDetails('complexity', budget.complexity),
    ...serializeLinearBudgetBucketDetails('endpoint_complexity', budget.endpoint_complexity),
    ...extraDetails
  };
}

async function recordLinearBudgetObservation(input: {
  env?: NodeJS.ProcessEnv;
  source: string;
  details: LinearRateLimitDetails;
  observedAt?: string;
  scope?: {
    viewerId?: string | null;
    workspaceId?: string | null;
  };
  assumeUnknownResetsExhausted: boolean;
}): Promise<LinearBudgetStatus | null> {
  const env = input.env ?? process.env;
  const paths = resolveLinearBudgetStatePaths(env);
  if (!paths) {
    return null;
  }
  const observedAt = normalizeOptionalString(input.observedAt) ?? new Date().toISOString();
  const observation = buildLinearBudgetObservation({
    details: input.details,
    source: input.source,
    observedAt,
    assumeUnknownResetsExhausted: input.assumeUnknownResetsExhausted
  });

  return await withLinearBudgetStateLock(paths, async () => {
    const existing = await readNewestPersistedLinearBudgetStatus(paths, normalizeScopeHint(input.scope));
    const scope = await resolveWriteScope(paths, input.scope, existing);
    const merged = mergePersistedLinearBudgetStatus(existing, observation, scope);
    await writePersistedLinearBudgetStatus(paths, merged);
    if (scope.kind === 'user') {
      await writePersistedLinearBudgetAlias(paths, scope);
    }
    return hydrateLinearBudgetStatus(merged);
  });
}

function buildLinearBudgetObservation(input: {
  details: LinearRateLimitDetails;
  source: string;
  observedAt: string;
  assumeUnknownResetsExhausted: boolean;
}): LinearBudgetObservation {
  const requests = parseLinearBudgetBucket(input.details, 'requests');
  const complexity = parseLinearBudgetBucket(input.details, 'complexity');
  const requestComplexity = parseNumberLike(input.details.request_complexity);
  const endpointObservation = buildLinearBudgetEndpointObservation({
    details: input.details,
    source: input.source,
    observedAt: input.observedAt,
    assumeUnknownResetsExhausted: input.assumeUnknownResetsExhausted
  });

  return {
    observed_at: input.observedAt,
    source: input.source,
    request_id: normalizeOptionalString(input.details.request_id),
    retry_after_seconds: parseNumberLike(input.details.retry_after_seconds),
    requests,
    complexity,
    request_complexity: requestComplexity,
    endpoint: endpointObservation,
    assume_unknown_resets_exhausted: input.assumeUnknownResetsExhausted
  };
}

function buildLinearBudgetEndpointObservation(input: {
  details: LinearRateLimitDetails;
  source: string;
  observedAt: string;
  assumeUnknownResetsExhausted: boolean;
}): LinearBudgetEndpointObservation | null {
  const endpointName = normalizeOptionalString(input.details.endpoint_name);
  const requests = parseLinearBudgetBucket(input.details, 'endpoint_requests');
  const complexity = parseLinearBudgetBucket(input.details, 'endpoint_complexity');
  const requestComplexity = parseNumberLike(input.details.request_complexity);
  if (!endpointName && !requests && !complexity && requestComplexity === null) {
    return null;
  }
  return {
    key: buildEndpointKey(endpointName, input.source),
    endpoint_name: endpointName,
    aliases: [input.source],
    observed_at: input.observedAt,
    requests,
    complexity,
    request_complexity: requestComplexity,
    assume_unknown_resets_exhausted: input.assumeUnknownResetsExhausted
  };
}

function mergePersistedLinearBudgetStatus(
  existing: PersistedLinearBudgetStatus | null,
  observation: LinearBudgetObservation,
  scope: LinearBudgetScopeIdentity
): PersistedLinearBudgetStatus {
  const existingObservedAtMs = existing ? parseIsoToMs(existing.observed_at) : null;
  const observationObservedAtMs = parseIsoToMs(observation.observed_at);
  if (
    existing &&
    existingObservedAtMs !== null &&
    observationObservedAtMs !== null &&
    observationObservedAtMs < existingObservedAtMs
  ) {
    return adoptPersistedScope(existing, scope);
  }

  const base = existing ? adoptPersistedScope(pruneExpiredReservations(existing), scope) : createEmptyPersistedLinearBudgetStatus(scope);
  const endpoints = clonePersistedEndpoints(base.endpoints);
  let selectedEndpointKey = base.selected_endpoint_key;

  if (observation.endpoint) {
    const upsertedEndpoint = upsertPersistedEndpointObservation(endpoints, observation.endpoint);
    selectedEndpointKey = upsertedEndpoint.selectedEndpointKey;
  }

  const merged: PersistedLinearBudgetStatus = {
    ...base,
    observed_at: observation.observed_at,
    source: observation.source,
    request_id: observation.request_id,
    retry_after_seconds: observation.retry_after_seconds,
    requests: mergeLinearBudgetBucket(base.requests, observation.requests),
    complexity: mergeLinearBudgetBucket(base.complexity, observation.complexity),
    request_complexity: observation.request_complexity ?? base.request_complexity,
    selected_endpoint_key: selectedEndpointKey,
    endpoints,
    reservations: base.reservations
  };
  merged.cooldown_until = resolveCooldownUntil({
    persisted: merged,
    observation
  });
  return merged;
}

function createEmptyPersistedLinearBudgetStatus(scope: LinearBudgetScopeIdentity): PersistedLinearBudgetStatus {
  return {
    schema_version: LINEAR_BUDGET_STATE_SCHEMA_VERSION,
    scope_kind: scope.kind,
    scope_key: scope.key,
    viewer_id: scope.viewer_id,
    workspace_id: scope.workspace_id,
    token_fingerprints: [scope.token_fingerprint],
    observed_at: new Date().toISOString(),
    source: 'unknown',
    request_id: null,
    retry_after_seconds: null,
    cooldown_until: null,
    requests: null,
    complexity: null,
    request_complexity: null,
    selected_endpoint_key: null,
    endpoints: {},
    reservations: []
  };
}

function adoptPersistedScope(
  persisted: PersistedLinearBudgetStatus,
  scope: LinearBudgetScopeIdentity
): PersistedLinearBudgetStatus {
  return {
    ...persisted,
    scope_kind: scope.kind,
    scope_key: scope.key,
    viewer_id: scope.viewer_id ?? persisted.viewer_id,
    workspace_id: scope.workspace_id ?? persisted.workspace_id,
    token_fingerprints: uniqueStrings([...persisted.token_fingerprints, scope.token_fingerprint])
  };
}

function clonePersistedEndpoints(
  value: Record<string, PersistedLinearBudgetEndpointStatus>
): Record<string, PersistedLinearBudgetEndpointStatus> {
  return Object.fromEntries(
    Object.entries(value).map(([key, endpoint]) => [
      key,
      {
        endpoint_name: endpoint.endpoint_name,
        aliases: [...endpoint.aliases],
        observed_at: endpoint.observed_at,
        requests: cloneBucket(endpoint.requests),
        complexity: cloneBucket(endpoint.complexity),
        request_complexity: endpoint.request_complexity
      }
    ])
  );
}

function upsertPersistedEndpointObservation(
  endpoints: Record<string, PersistedLinearBudgetEndpointStatus>,
  observation: LinearBudgetEndpointObservation
): {
  selectedEndpointKey: string;
} {
  const targetKey = resolvePersistedEndpointTargetKey(endpoints, observation);
  const existing = endpoints[targetKey] ?? null;
  const merged: PersistedLinearBudgetEndpointStatus = {
    endpoint_name: observation.endpoint_name ?? existing?.endpoint_name ?? null,
    aliases: uniqueStrings([...(existing?.aliases ?? []), ...observation.aliases]),
    observed_at: maxIsoTimestamp(existing?.observed_at ?? null, observation.observed_at) ?? observation.observed_at,
    requests: mergeLinearBudgetBucket(existing?.requests ?? null, observation.requests),
    complexity: mergeLinearBudgetBucket(existing?.complexity ?? null, observation.complexity),
    request_complexity: observation.request_complexity ?? existing?.request_complexity ?? null
  };

  for (const [key, endpoint] of Object.entries(endpoints)) {
    if (key === targetKey) {
      continue;
    }
    if (
      (observation.endpoint_name && endpoint.endpoint_name === observation.endpoint_name) ||
      endpoint.aliases.some((alias) => observation.aliases.includes(alias))
    ) {
      merged.aliases = uniqueStrings([...merged.aliases, ...endpoint.aliases]);
      merged.requests = mergeLinearBudgetBucket(merged.requests, endpoint.requests);
      merged.complexity = mergeLinearBudgetBucket(merged.complexity, endpoint.complexity);
      merged.request_complexity = merged.request_complexity ?? endpoint.request_complexity ?? null;
      merged.observed_at = maxIsoTimestamp(merged.observed_at, endpoint.observed_at) ?? merged.observed_at;
      delete endpoints[key];
    }
  }

  endpoints[targetKey] = merged;
  return {
    selectedEndpointKey: targetKey
  };
}

function resolvePersistedEndpointTargetKey(
  endpoints: Record<string, PersistedLinearBudgetEndpointStatus>,
  observation: LinearBudgetEndpointObservation
): string {
  if (endpoints[observation.key]) {
    return observation.key;
  }
  if (observation.endpoint_name) {
    for (const [key, endpoint] of Object.entries(endpoints)) {
      if (endpoint.endpoint_name === observation.endpoint_name) {
        return key;
      }
    }
  }
  for (const [key, endpoint] of Object.entries(endpoints)) {
    if (endpoint.aliases.some((alias) => observation.aliases.includes(alias))) {
      return observation.endpoint_name ? buildEndpointKey(observation.endpoint_name, observation.aliases[0] ?? key) : key;
    }
  }
  return observation.key;
}

function hydrateLinearBudgetStatus(
  persisted: PersistedLinearBudgetStatus,
  options: LinearBudgetSelectionOptions = {}
): LinearBudgetStatus {
  const cleanedReservations = pruneExpiredReservations(persisted).reservations;
  const normalizedEndpoints = Object.fromEntries(
    Object.entries(persisted.endpoints).map(([key, endpoint]) => [
      key,
      {
        key,
        endpoint_name: endpoint.endpoint_name,
        aliases: [...endpoint.aliases],
        observed_at: endpoint.observed_at,
        requests: normalizeExpiredLinearBudgetBucket(endpoint.requests, endpoint.observed_at),
        complexity: normalizeExpiredLinearBudgetBucket(endpoint.complexity, endpoint.observed_at),
        request_complexity: endpoint.request_complexity
      } satisfies LinearBudgetEndpointStatus
    ])
  );
  const base: LinearBudgetStatus = {
    observed_at: persisted.observed_at,
    source: persisted.source,
    request_id: persisted.request_id,
    retry_after_seconds: persisted.retry_after_seconds,
    cooldown_until: persisted.cooldown_until,
    cooldown_active: isFutureIsoTimestamp(persisted.cooldown_until),
    suppression: 'none',
    suppression_reason: null,
    scope_kind: persisted.scope_kind,
    scope_key: persisted.scope_key,
    viewer_id: persisted.viewer_id,
    workspace_id: persisted.workspace_id,
    token_fingerprints: [...persisted.token_fingerprints],
    requests: normalizeExpiredLinearBudgetBucket(persisted.requests, persisted.observed_at),
    endpoint_requests: null,
    complexity: normalizeExpiredLinearBudgetBucket(persisted.complexity, persisted.observed_at),
    endpoint_complexity: null,
    endpoint_name: null,
    selected_endpoint_key: persisted.selected_endpoint_key,
    request_complexity: persisted.request_complexity,
    endpoints: normalizedEndpoints,
    reservations: cleanedReservations.map((entry) => ({ ...entry })),
    reservations_active: cleanedReservations.length
  };
  const materialized = materializeBudgetForOperation(base, options.operation ?? null);
  if (materialized.cooldown_active) {
    return {
      ...materialized,
      suppression: 'cooldown',
      suppression_reason: 'linear_budget_shared_cooldown'
    };
  }
  const pressure = resolveMaterializedBudgetPressure(materialized);
  return {
    ...materialized,
    suppression: pressure.suppression,
    suppression_reason: pressure.reason
  };
}

function materializeBudgetForOperation(
  budget: LinearBudgetStatus,
  operation: string | null | undefined
): LinearBudgetStatus {
  const view = resolveLinearBudgetOperationView(budget, operation ?? null);
  return {
    ...budget,
    requests: view.requests,
    endpoint_requests: view.endpoint_requests,
    complexity: view.complexity,
    endpoint_complexity: view.endpoint_complexity,
    endpoint_name: view.endpoint_name,
    selected_endpoint_key: view.endpoint_key,
    request_complexity: view.request_complexity,
    reservations_active: view.reservations_active
  };
}

function resolveLinearBudgetOperationView(
  budget: LinearBudgetStatus,
  operation: string | null
): LinearBudgetOperationView {
  const normalizedOperation = normalizeOptionalString(operation);
  const matchedEndpointKeys = normalizedOperation
    ? resolveMatchingEndpointKeys(budget.endpoints, normalizedOperation)
    : null;
  const selectedEndpointKey = resolveSelectedEndpointKey(budget, normalizedOperation, matchedEndpointKeys);
  const selectedEndpoint = selectedEndpointKey ? budget.endpoints[selectedEndpointKey] ?? null : null;
  const reservations = budget.reservations.filter((entry) => isFutureIsoTimestamp(entry.expires_at));
  const globalRequestsReserved = reservations.reduce((sum, entry) => sum + entry.requests, 0);
  const globalComplexityReserved = reservations.reduce(
    (sum, entry) => sum + (entry.complexity ?? 0),
    0
  );
  const endpointReservations = selectedEndpointKey
    ? reservations.filter((entry) => entry.endpoint_key === selectedEndpointKey)
    : [];
  const endpointRequestsReserved = endpointReservations.reduce((sum, entry) => sum + entry.requests, 0);
  const endpointComplexityReserved = endpointReservations.reduce(
    (sum, entry) => sum + (entry.complexity ?? 0),
    0
  );

  return {
    requests: subtractReservationFromBucket(budget.requests, globalRequestsReserved),
    endpoint_requests: subtractReservationFromBucket(selectedEndpoint?.requests ?? null, endpointRequestsReserved),
    complexity: subtractReservationFromBucket(budget.complexity, globalComplexityReserved),
    endpoint_complexity: subtractReservationFromBucket(
      selectedEndpoint?.complexity ?? null,
      endpointComplexityReserved
    ),
    endpoint_key: selectedEndpointKey,
    endpoint_name: selectedEndpoint?.endpoint_name ?? null,
    request_complexity: resolveOperationRequestComplexity(
      budget,
      normalizedOperation,
      selectedEndpoint,
      matchedEndpointKeys
    ),
    reservations_active: reservations.length,
    reservation_count: selectedEndpoint ? endpointReservations.length : reservations.length
  };
}

function resolveSelectedEndpointKey(
  budget: LinearBudgetStatus,
  operation: string | null,
  matchedEndpointKeys: string[] | null = null
): string | null {
  if (operation) {
    return selectMostConstrainedEndpointKey(budget.endpoints, matchedEndpointKeys ?? []);
  }
  if (budget.selected_endpoint_key && budget.endpoints[budget.selected_endpoint_key]) {
    return budget.selected_endpoint_key;
  }
  return selectMostConstrainedEndpointKey(budget.endpoints);
}

function selectMostConstrainedEndpointKey(
  endpoints: Record<string, LinearBudgetEndpointStatus>,
  candidateKeys: string[] = Object.keys(endpoints)
): string | null {
  let selected: {
    key: string | null;
    rank: number;
  } = { key: null, rank: -1 };
  for (const key of candidateKeys) {
    const endpoint = endpoints[key];
    if (!endpoint) {
      continue;
    }
    const pressure = resolveEndpointPressure(endpoint);
    if (pressure.rank > selected.rank) {
      selected = {
        key,
        rank: pressure.rank
      };
    }
  }
  return selected.key;
}

function resolveMatchingEndpointKeys(
  endpoints: Record<string, LinearBudgetEndpointStatus>,
  operation: string
): string[] {
  const matches = new Set<string>();
  const sourceKey = buildEndpointKey(null, operation);
  if (endpoints[sourceKey]) {
    matches.add(sourceKey);
  }
  const operationPrefix = `${operation}:`;
  for (const [key, endpoint] of Object.entries(endpoints)) {
    if (endpoint.aliases.some((alias) => alias === operation || alias.startsWith(operationPrefix))) {
      matches.add(key);
    }
  }
  return [...matches];
}

function resolveOperationRequestComplexity(
  budget: LinearBudgetStatus,
  operation: string | null,
  selectedEndpoint: LinearBudgetEndpointStatus | null,
  matchedEndpointKeys: string[] | null
): number | null {
  if (!operation) {
    return selectedEndpoint?.request_complexity ?? budget.request_complexity;
  }
  const matchedComplexities = (matchedEndpointKeys ?? [])
    .map((key) => budget.endpoints[key]?.request_complexity ?? null)
    .filter((value): value is number => value !== null);
  if (matchedComplexities.length === 0) {
    return null;
  }
  return Math.max(...matchedComplexities);
}

function resolveMaterializedBudgetPressure(
  budget: LinearBudgetStatus
): {
  suppression: Exclude<LinearBudgetSuppression, 'cooldown'>;
  reason: string | null;
  rank: number;
  endpoint_specific: boolean;
} {
  let selected = resolveBucketPressure('requests', budget.requests, false);
  for (const next of [
    resolveBucketPressure('complexity', budget.complexity, false),
    resolveBucketPressure('endpoint_requests', budget.endpoint_requests, true),
    resolveBucketPressure('endpoint_complexity', budget.endpoint_complexity, true)
  ]) {
    if (next.rank > selected.rank) {
      selected = next;
    }
  }
  return selected;
}

function resolveEndpointPressure(endpoint: LinearBudgetEndpointStatus): {
  rank: number;
} {
  return [
    resolveBucketPressure('endpoint_requests', endpoint.requests, true),
    resolveBucketPressure('endpoint_complexity', endpoint.complexity, true)
  ].reduce((selected, next) => (next.rank > selected.rank ? next : selected), {
    rank: 0,
    suppression: 'none' as const,
    reason: null,
    endpoint_specific: true
  });
}

function resolveBucketPressure(
  bucketKey: LinearBudgetEffectiveBucketKey,
  bucket: LinearBudgetBucketPayload | null,
  endpointSpecific: boolean
): {
  rank: number;
  suppression: Exclude<LinearBudgetSuppression, 'cooldown'>;
  reason: string | null;
  endpoint_specific: boolean;
} {
  if (!bucket || bucket.remaining === null) {
    return { rank: 0, suppression: 'none', reason: null, endpoint_specific: endpointSpecific };
  }

  if (bucket.remaining <= 0) {
    return {
      rank: endpointSpecific ? 4 : 3,
      suppression: 'exhausted',
      reason:
        bucketKey === 'endpoint_requests' || bucketKey === 'endpoint_complexity'
          ? `linear_budget_${bucketKey}_exhausted`
          : `linear_budget_${bucketKey}_exhausted`,
      endpoint_specific: endpointSpecific
    };
  }

  const limit = bucket.limit;
  if (limit === null || limit <= 0) {
    return { rank: 0, suppression: 'none', reason: null, endpoint_specific: endpointSpecific };
  }

  const lowThreshold = Math.max(1, Math.min(10, Math.floor(limit * 0.02)));
  const constrainedThreshold = Math.max(lowThreshold + 1, Math.min(50, Math.floor(limit * 0.1)));

  if (bucket.remaining <= lowThreshold) {
    return {
      rank: endpointSpecific ? 3 : 2,
      suppression: 'low',
      reason: `linear_budget_${bucketKey}_low`,
      endpoint_specific: endpointSpecific
    };
  }

  if (bucket.remaining <= constrainedThreshold) {
    return {
      rank: endpointSpecific ? 2 : 1,
      suppression: 'constrained',
      reason: `linear_budget_${bucketKey}_constrained`,
      endpoint_specific: endpointSpecific
    };
  }

  return { rank: 0, suppression: 'none', reason: null, endpoint_specific: endpointSpecific };
}

function inferOperationComplexityFloor(
  requestComplexity: number | null,
  minimumRequestsRemaining: number
): number | null {
  if (requestComplexity === null) {
    return null;
  }
  return Math.max(1, requestComplexity * Math.max(1, minimumRequestsRemaining));
}

function resolveBucketShortfall(
  entries: Array<[LinearBudgetEffectiveBucketKey, LinearBudgetBucketPayload | null]>,
  requiredRemaining: number
): { bucket: LinearBudgetEffectiveBucketKey; remaining: number } | null {
  for (const [bucketKey, bucket] of entries) {
    if (bucket && bucket.remaining !== null && bucket.remaining < requiredRemaining) {
      return {
        bucket: bucketKey,
        remaining: bucket.remaining
      };
    }
  }
  return null;
}

function findExhaustedLinearBudgetBucket(budget: LinearBudgetStatus): LinearBudgetEffectiveBucketKey | null {
  for (const [bucketKey, bucket] of [
    ['requests', budget.requests],
    ['endpoint_requests', budget.endpoint_requests],
    ['complexity', budget.complexity],
    ['endpoint_complexity', budget.endpoint_complexity]
  ] as const) {
    if (bucket && bucket.remaining !== null && bucket.remaining <= 0) {
      return bucketKey;
    }
  }
  return null;
}

function parseLinearBudgetBucket(
  details: LinearRateLimitDetails,
  bucketKey: 'requests' | 'complexity' | 'endpoint_requests' | 'endpoint_complexity'
): LinearBudgetBucketPayload | null {
  const limit = parseNumberLike(details[`${bucketKey}_limit`]);
  const remaining = parseNumberLike(details[`${bucketKey}_remaining`]);
  const resetAt = normalizeOptionalString(details[`${bucketKey}_reset_at`]);
  if (limit === null && remaining === null && resetAt === null) {
    return null;
  }
  return {
    limit,
    remaining,
    reset_at: resetAt
  };
}

function resolveCooldownUntil(input: {
  persisted: PersistedLinearBudgetStatus;
  observation: LinearBudgetObservation;
}): string | null {
  const observedAtMs = parseIsoToMs(input.observation.observed_at);
  if (observedAtMs === null) {
    return null;
  }

  const candidateMs: number[] = [];
  if (input.observation.retry_after_seconds !== null && input.observation.retry_after_seconds >= 0) {
    candidateMs.push(observedAtMs + input.observation.retry_after_seconds * 1000);
  }

  for (const bucket of [input.persisted.requests, input.persisted.complexity]) {
    maybeCollectResetCandidate(candidateMs, bucket, false);
  }
  for (const endpoint of Object.values(input.persisted.endpoints)) {
    maybeCollectResetCandidate(candidateMs, endpoint.requests, false);
    maybeCollectResetCandidate(candidateMs, endpoint.complexity, false);
  }

  if (input.observation.assume_unknown_resets_exhausted) {
    maybeCollectResetCandidate(candidateMs, input.observation.requests, true);
    maybeCollectResetCandidate(candidateMs, input.observation.complexity, true);
    if (input.observation.endpoint) {
      maybeCollectResetCandidate(candidateMs, input.observation.endpoint.requests, true);
      maybeCollectResetCandidate(candidateMs, input.observation.endpoint.complexity, true);
    }
  }

  if (candidateMs.length === 0) {
    return null;
  }
  const latestMs = Math.max(...candidateMs);
  return Number.isFinite(latestMs) ? new Date(latestMs).toISOString() : null;
}

function maybeCollectResetCandidate(
  candidates: number[],
  bucket: LinearBudgetBucketPayload | null,
  assumeUnknownRemainingExhausted: boolean
): void {
  if (!bucket?.reset_at) {
    return;
  }
  const resetAtMs = parseIsoToMs(bucket.reset_at);
  if (resetAtMs === null) {
    return;
  }
  const exhausted =
    bucket.remaining !== null ? bucket.remaining <= 0 : assumeUnknownRemainingExhausted;
  if (exhausted) {
    candidates.push(resetAtMs);
  }
}

function serializeLinearBudgetBucketDetails(
  bucketKey: LinearBudgetEffectiveBucketKey,
  bucket: LinearBudgetBucketPayload | null
): Record<string, unknown> {
  if (!bucket) {
    return {};
  }
  return {
    ...(bucket.limit !== null ? { [`${bucketKey}_limit`]: bucket.limit } : {}),
    ...(bucket.remaining !== null ? { [`${bucketKey}_remaining`]: bucket.remaining } : {}),
    ...(bucket.reset_at ? { [`${bucketKey}_reset_at`]: bucket.reset_at } : {})
  };
}

function resolveLinearBudgetStatePaths(env: NodeJS.ProcessEnv): LinearBudgetStatePaths | null {
  const tokenFingerprint = resolveLinearApiTokenFingerprint(env);
  if (!tokenFingerprint) {
    return null;
  }
  const isVitestRuntime =
    normalizeOptionalString(env.VITEST) === 'true' ||
    normalizeOptionalString(process.env.VITEST) === 'true' ||
    normalizeOptionalString(env.NODE_ENV) === 'test' ||
    normalizeOptionalString(process.env.NODE_ENV) === 'test';
  if (isVitestRuntime && !normalizeOptionalString(env.CODEX_HOME)) {
    return null;
  }
  const directory = join(resolveCodexOrchestratorHome(env), LINEAR_BUDGET_STATE_DIRNAME);
  return {
    directory,
    scopesDir: join(directory, LINEAR_BUDGET_SCOPE_DIRNAME),
    aliasesDir: join(directory, LINEAR_BUDGET_ALIAS_DIRNAME),
    legacyStatePath: join(directory, `${tokenFingerprint}.json`),
    aliasPath: join(directory, LINEAR_BUDGET_ALIAS_DIRNAME, `${tokenFingerprint}.json`),
    lockPath: join(directory, `${tokenFingerprint}.lock`),
    tokenFingerprint
  };
}

async function withLinearBudgetStateLock<T>(
  paths: LinearBudgetStatePaths,
  callback: () => Promise<T>
): Promise<T> {
  const lock = await acquireLockWithRetry({
    taskId: `linear-budget-${paths.tokenFingerprint.slice(0, 12)}`,
    lockPath: paths.lockPath,
    retry: LINEAR_BUDGET_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(paths.lockPath), { recursive: true });
    },
    createError: (taskId, attempts) =>
      new Error(`Failed to acquire Linear budget state lock for ${taskId} after ${attempts} attempts.`)
  });
  try {
    return await callback();
  } finally {
    await lock.release();
  }
}

async function readNewestPersistedLinearBudgetStatus(
  paths: LinearBudgetStatePaths,
  scopeHint: {
    viewer_id: string | null;
    workspace_id: string | null;
  } | null
): Promise<PersistedLinearBudgetStatus | null> {
  const alias = await readPersistedLinearBudgetAlias(paths.aliasPath, paths.tokenFingerprint);
  const candidatePaths = new Set<string>([paths.legacyStatePath]);
  if (alias) {
    candidatePaths.add(resolveScopeStatePath(paths, alias.scope_key));
  }
  if (scopeHint?.viewer_id) {
    candidatePaths.add(
      resolveScopeStatePath(paths, resolveUserScopeKey(scopeHint.viewer_id, scopeHint.workspace_id))
    );
  }

  let selected: PersistedLinearBudgetStatus | null = null;
  for (const candidatePath of candidatePaths) {
    const persisted = await readPersistedLinearBudgetStatus(candidatePath, paths.tokenFingerprint);
    if (!persisted) {
      continue;
    }
    if (!selected) {
      selected = persisted;
      continue;
    }
    const selectedObservedAtMs = parseIsoToMs(selected.observed_at) ?? Number.NEGATIVE_INFINITY;
    const persistedObservedAtMs = parseIsoToMs(persisted.observed_at) ?? Number.NEGATIVE_INFINITY;
    if (persistedObservedAtMs >= selectedObservedAtMs) {
      selected = persisted;
    }
  }
  return selected;
}

async function readPersistedLinearBudgetStatus(
  statePath: string,
  tokenFingerprint: string
): Promise<PersistedLinearBudgetStatus | null> {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8')) as unknown;
    return parsePersistedLinearBudgetStatus(parsed, tokenFingerprint);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

function parsePersistedLinearBudgetStatus(
  value: unknown,
  tokenFingerprint: string
): PersistedLinearBudgetStatus | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schema_version === LINEAR_BUDGET_STATE_SCHEMA_VERSION) {
    return parseSchemaV2LinearBudgetStatus(record, tokenFingerprint);
  }
  if (record.schema_version === 1) {
    return parseLegacySchemaV1LinearBudgetStatus(record, tokenFingerprint);
  }
  return null;
}

function parseSchemaV2LinearBudgetStatus(
  record: Record<string, unknown>,
  tokenFingerprint: string
): PersistedLinearBudgetStatus | null {
  const scopeKind = normalizeOptionalString(record.scope_kind);
  const scopeKey = normalizeOptionalString(record.scope_key);
  const observedAt = normalizeOptionalString(record.observed_at);
  const source = normalizeOptionalString(record.source);
  if ((scopeKind !== 'user' && scopeKind !== 'token') || !scopeKey || !observedAt || !source) {
    return null;
  }

  const tokenFingerprints = Array.isArray(record.token_fingerprints)
    ? record.token_fingerprints
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => entry !== null)
    : [];
  if (tokenFingerprints.length === 0) {
    tokenFingerprints.push(tokenFingerprint);
  }

  const endpoints =
    record.endpoints && typeof record.endpoints === 'object'
      ? Object.fromEntries(
          Object.entries(record.endpoints as Record<string, unknown>)
            .map(([key, value]) => [key, parsePersistedLinearBudgetEndpointStatus(value)])
            .filter((entry): entry is [string, PersistedLinearBudgetEndpointStatus] => entry[1] !== null)
        )
      : {};
  const reservations = Array.isArray(record.reservations)
    ? record.reservations
        .map((entry) => parsePersistedLinearBudgetReservation(entry))
        .filter((entry): entry is PersistedLinearBudgetReservationStatus => entry !== null)
    : [];

  return {
    schema_version: 2,
    scope_kind: scopeKind,
    scope_key: scopeKey,
    viewer_id: normalizeOptionalString(record.viewer_id),
    workspace_id: normalizeOptionalString(record.workspace_id),
    token_fingerprints: uniqueStrings(tokenFingerprints),
    observed_at: observedAt,
    source,
    request_id: normalizeOptionalString(record.request_id),
    retry_after_seconds: parseNumberLike(record.retry_after_seconds),
    cooldown_until: normalizeOptionalString(record.cooldown_until),
    requests: parsePersistedLinearBudgetBucket(record.requests),
    complexity: parsePersistedLinearBudgetBucket(record.complexity),
    request_complexity: parseNumberLike(record.request_complexity),
    selected_endpoint_key: normalizeOptionalString(record.selected_endpoint_key),
    endpoints,
    reservations
  };
}

function parseLegacySchemaV1LinearBudgetStatus(
  record: Record<string, unknown>,
  tokenFingerprint: string
): PersistedLinearBudgetStatus | null {
  if (normalizeOptionalString(record.token_fingerprint) !== tokenFingerprint) {
    return null;
  }
  const observedAt = normalizeOptionalString(record.observed_at);
  const source = normalizeOptionalString(record.source);
  if (!observedAt || !source) {
    return null;
  }

  const legacyEndpointRequests = parsePersistedLinearBudgetBucket(record.endpoint_requests);
  const legacyEndpointComplexity = parsePersistedLinearBudgetBucket(record.endpoint_complexity);
  const selectedEndpointKey =
    legacyEndpointRequests || legacyEndpointComplexity ? buildEndpointKey(null, source) : null;

  return {
    schema_version: 2,
    scope_kind: 'token',
    scope_key: tokenFingerprint,
    viewer_id: null,
    workspace_id: null,
    token_fingerprints: [tokenFingerprint],
    observed_at: observedAt,
    source,
    request_id: normalizeOptionalString(record.request_id),
    retry_after_seconds: parseNumberLike(record.retry_after_seconds),
    cooldown_until: normalizeOptionalString(record.cooldown_until),
    requests: parsePersistedLinearBudgetBucket(record.requests),
    complexity: parsePersistedLinearBudgetBucket(record.complexity),
    request_complexity: null,
    selected_endpoint_key: selectedEndpointKey,
    endpoints:
      selectedEndpointKey === null
        ? {}
        : {
            [selectedEndpointKey]: {
              endpoint_name: null,
              aliases: [source],
              observed_at: observedAt,
              requests: legacyEndpointRequests,
              complexity: legacyEndpointComplexity,
              request_complexity: null
            }
          },
    reservations: []
  };
}

function parsePersistedLinearBudgetEndpointStatus(
  value: unknown
): PersistedLinearBudgetEndpointStatus | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const observedAt = normalizeOptionalString(record.observed_at);
  if (!observedAt) {
    return null;
  }
  const aliases = Array.isArray(record.aliases)
    ? record.aliases
        .map((entry) => normalizeOptionalString(entry))
        .filter((entry): entry is string => entry !== null)
    : [];
  return {
    endpoint_name: normalizeOptionalString(record.endpoint_name),
    aliases: uniqueStrings(aliases),
    observed_at: observedAt,
    requests: parsePersistedLinearBudgetBucket(record.requests),
    complexity: parsePersistedLinearBudgetBucket(record.complexity),
    request_complexity: parseNumberLike(record.request_complexity)
  };
}

function parsePersistedLinearBudgetReservation(
  value: unknown
): PersistedLinearBudgetReservationStatus | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = normalizeRequiredString(record.id);
  const operation = normalizeRequiredString(record.operation);
  const createdAt = normalizeOptionalString(record.created_at);
  const expiresAt = normalizeOptionalString(record.expires_at);
  const requests = normalizePositiveInteger(record.requests);
  const complexity = normalizePositiveInteger(record.complexity);
  if (!id || !operation || !createdAt || !expiresAt || requests === null) {
    return null;
  }
  return {
    id,
    operation,
    endpoint_key: normalizeOptionalString(record.endpoint_key),
    requests,
    complexity,
    created_at: createdAt,
    expires_at: expiresAt
  };
}

function parsePersistedLinearBudgetBucket(value: unknown): LinearBudgetBucketPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const limit = parseNumberLike(record.limit);
  const remaining = parseNumberLike(record.remaining);
  const resetAt = normalizeOptionalString(record.reset_at);
  if (limit === null && remaining === null && resetAt === null) {
    return null;
  }
  return {
    limit,
    remaining,
    reset_at: resetAt
  };
}

async function writePersistedLinearBudgetStatus(
  paths: LinearBudgetStatePaths,
  persisted: PersistedLinearBudgetStatus
): Promise<void> {
  const statePath = resolvePersistedStatePath(paths, persisted);
  await mkdir(dirname(statePath), { recursive: true });
  await writeJsonAtomic(statePath, persisted);
}

async function writePersistedLinearBudgetAlias(
  paths: LinearBudgetStatePaths,
  scope: LinearBudgetScopeIdentity
): Promise<void> {
  const aliasRecord: PersistedLinearBudgetAlias = {
    schema_version: LINEAR_BUDGET_ALIAS_SCHEMA_VERSION,
    token_fingerprint: paths.tokenFingerprint,
    scope_kind: scope.kind,
    scope_key: scope.key,
    viewer_id: scope.viewer_id,
    workspace_id: scope.workspace_id,
    updated_at: new Date().toISOString()
  };
  await mkdir(dirname(paths.aliasPath), { recursive: true });
  await writeJsonAtomic(paths.aliasPath, aliasRecord);
}

async function readPersistedLinearBudgetAlias(
  aliasPath: string,
  tokenFingerprint: string
): Promise<PersistedLinearBudgetAlias | null> {
  try {
    const parsed = JSON.parse(await readFile(aliasPath, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (record.schema_version !== LINEAR_BUDGET_ALIAS_SCHEMA_VERSION) {
      return null;
    }
    if (normalizeOptionalString(record.token_fingerprint) !== tokenFingerprint) {
      return null;
    }
    const scopeKind = normalizeOptionalString(record.scope_kind);
    const scopeKey = normalizeOptionalString(record.scope_key);
    const updatedAt = normalizeOptionalString(record.updated_at);
    if ((scopeKind !== 'user' && scopeKind !== 'token') || !scopeKey || !updatedAt) {
      return null;
    }
    return {
      schema_version: 1,
      token_fingerprint: tokenFingerprint,
      scope_kind: scopeKind,
      scope_key: scopeKey,
      viewer_id: normalizeOptionalString(record.viewer_id),
      workspace_id: normalizeOptionalString(record.workspace_id),
      updated_at: updatedAt
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

async function resolveWriteScope(
  paths: LinearBudgetStatePaths,
  scopeHint:
    | {
        viewerId?: string | null;
        workspaceId?: string | null;
      }
    | undefined,
  existing: PersistedLinearBudgetStatus | null
): Promise<LinearBudgetScopeIdentity> {
  const normalizedHint = normalizeScopeHint(scopeHint);
  if (normalizedHint?.viewer_id) {
    return {
      kind: 'user',
      key: resolveUserScopeKey(normalizedHint.viewer_id, normalizedHint.workspace_id),
      viewer_id: normalizedHint.viewer_id,
      workspace_id: normalizedHint.workspace_id,
      token_fingerprint: paths.tokenFingerprint
    };
  }
  if (existing?.scope_kind === 'user' && existing.viewer_id) {
    return {
      kind: 'user',
      key: existing.scope_key,
      viewer_id: existing.viewer_id,
      workspace_id: existing.workspace_id,
      token_fingerprint: paths.tokenFingerprint
    };
  }
  const alias = await readPersistedLinearBudgetAlias(paths.aliasPath, paths.tokenFingerprint);
  if (alias?.scope_kind === 'user' && alias.viewer_id) {
    return {
      kind: 'user',
      key: alias.scope_key,
      viewer_id: alias.viewer_id,
      workspace_id: alias.workspace_id,
      token_fingerprint: paths.tokenFingerprint
    };
  }
  return {
    kind: 'token',
    key: paths.tokenFingerprint,
    viewer_id: null,
    workspace_id: normalizedHint?.workspace_id ?? existing?.workspace_id ?? alias?.workspace_id ?? null,
    token_fingerprint: paths.tokenFingerprint
  };
}

function normalizeScopeHint(
  value:
    | {
        viewerId?: string | null;
        workspaceId?: string | null;
      }
    | undefined
): {
  viewer_id: string | null;
  workspace_id: string | null;
} | null {
  if (!value) {
    return null;
  }
  const viewerId = normalizeOptionalString(value.viewerId);
  const workspaceId = normalizeOptionalString(value.workspaceId);
  if (!viewerId && !workspaceId) {
    return null;
  }
  return {
    viewer_id: viewerId,
    workspace_id: workspaceId
  };
}

function resolvePersistedStatePath(
  paths: LinearBudgetStatePaths,
  persisted: PersistedLinearBudgetStatus
): string {
  return persisted.scope_kind === 'user'
    ? resolveScopeStatePath(paths, persisted.scope_key)
    : paths.legacyStatePath;
}

function resolveScopeStatePath(paths: LinearBudgetStatePaths, scopeKey: string): string {
  return join(paths.scopesDir, `${scopeKey}.json`);
}

function resolveUserScopeKey(viewerId: string, workspaceId: string | null): string {
  return createHash('sha256')
    .update(`linear-user:${workspaceId ?? 'unknown-workspace'}:${viewerId}`)
    .digest('hex');
}

function buildEndpointKey(endpointName: string | null, source: string): string {
  if (endpointName) {
    return `endpoint:${normalizeKeyFragment(endpointName)}`;
  }
  return `source:${normalizeKeyFragment(source)}`;
}

function normalizeKeyFragment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '') || 'unknown';
}

function cloneBucket(bucket: LinearBudgetBucketPayload | null): LinearBudgetBucketPayload | null {
  return bucket
    ? {
        limit: bucket.limit,
        remaining: bucket.remaining,
        reset_at: bucket.reset_at
      }
    : null;
}

function mergeLinearBudgetBucket(
  existing: LinearBudgetBucketPayload | null,
  observation: LinearBudgetBucketPayload | null
): LinearBudgetBucketPayload | null {
  if (!existing) {
    return cloneBucket(observation);
  }
  if (!observation) {
    return cloneBucket(existing);
  }
  return {
    limit: observation.limit ?? existing.limit,
    remaining: observation.remaining ?? existing.remaining,
    reset_at: observation.reset_at ?? existing.reset_at
  };
}

function subtractReservationFromBucket(
  bucket: LinearBudgetBucketPayload | null,
  reservedAmount: number
): LinearBudgetBucketPayload | null {
  if (!bucket || bucket.remaining === null || reservedAmount <= 0) {
    return bucket;
  }
  return {
    limit: bucket.limit,
    remaining: bucket.remaining - reservedAmount,
    reset_at: bucket.reset_at
  };
}

function normalizeExpiredLinearBudgetBucket(
  bucket: LinearBudgetBucketPayload | null,
  observedAt: string
): LinearBudgetBucketPayload | null {
  if (!bucket) {
    return null;
  }
  const resetAtMs = parseIsoToMs(bucket.reset_at);
  if (resetAtMs === null) {
    const observedAtMs = parseIsoToMs(observedAt);
    if (
      observedAtMs !== null &&
      bucket.remaining !== null &&
      bucket.remaining <= 0 &&
      observedAtMs + LINEAR_BUDGET_UNKNOWN_RESET_EXHAUSTED_GRACE_MS <= Date.now()
    ) {
      if (bucket.limit === null) {
        return null;
      }
      return {
        limit: bucket.limit,
        remaining: null,
        reset_at: null
      };
    }
    return bucket;
  }
  if (resetAtMs > Date.now()) {
    return bucket;
  }
  if (bucket.limit === null) {
    return null;
  }
  return {
    limit: bucket.limit,
    remaining: null,
    reset_at: null
  };
}

function pruneExpiredReservations(
  persisted: PersistedLinearBudgetStatus
): PersistedLinearBudgetStatus {
  const reservations = persisted.reservations.filter((entry) => isFutureIsoTimestamp(entry.expires_at));
  return reservations.length === persisted.reservations.length
    ? persisted
    : {
        ...persisted,
        reservations
      };
}

function applyDeterministicPositiveJitter(
  baseIntervalMs: number,
  seed: string,
  nowMs: number
): number {
  if (baseIntervalMs <= 0) {
    return baseIntervalMs;
  }
  const maxJitterMs = Math.min(
    LINEAR_BUDGET_POLL_JITTER_MAX_MS,
    Math.max(1_000, Math.floor(baseIntervalMs * LINEAR_BUDGET_POLL_JITTER_RATIO))
  );
  const timeBucket = Math.floor(nowMs / Math.max(baseIntervalMs, 1));
  const hash = stableHash(`${seed}|${timeBucket}`);
  return baseIntervalMs + (hash % (maxJitterMs + 1));
}

function stableHash(value: string): number {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function maxIsoTimestamp(left: string | null, right: string | null): string | null {
  const leftMs = parseIsoToMs(left);
  const rightMs = parseIsoToMs(right);
  if (leftMs === null) {
    return right;
  }
  if (rightMs === null) {
    return left;
  }
  return rightMs >= leftMs ? right : left;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function normalizePositiveInteger(value: unknown): number | null {
  const parsed = parseNumberLike(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseIsoToMs(value: string | null | undefined): number | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function isFutureIsoTimestamp(value: string | null | undefined): boolean {
  const parsed = parseIsoToMs(value);
  return parsed !== null && parsed > Date.now();
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeRequiredString(value: unknown): string | null {
  return normalizeOptionalString(value);
}

function hasRecordableLinearBudgetDetails(details: LinearRateLimitDetails): boolean {
  return Object.keys(details).some((key) => key !== 'request_id' && key !== 'errors');
}
