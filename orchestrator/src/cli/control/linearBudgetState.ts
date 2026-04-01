import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';

import { acquireLockWithRetry, type LockRetryOptions } from '../../persistence/lockFile.js';
import { writeJsonAtomic } from '../utils/fs.js';
import { resolveCodexOrchestratorHome } from '../utils/codexPaths.js';
import { resolveLinearApiTokenFingerprint } from './linearGraphqlClient.js';
import type { LinearRateLimitDetails, LinearRateLimitErrorLike } from './linearRateLimit.js';
import { extractLinearRateLimitDetailsFromHeaders } from './linearRateLimit.js';

const LINEAR_BUDGET_STATE_SCHEMA_VERSION = 1;
const LINEAR_BUDGET_STATE_DIRNAME = 'linear-budget';
const LINEAR_BUDGET_DEFAULT_CONSTRAINED_POLL_INTERVAL_MS = 30_000;
const LINEAR_BUDGET_DEFAULT_LOW_POLL_INTERVAL_MS = 60_000;
const LINEAR_BUDGET_UNKNOWN_RESET_EXHAUSTED_GRACE_MS = LINEAR_BUDGET_DEFAULT_LOW_POLL_INTERVAL_MS;
const LINEAR_BUDGET_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 25,
  initialDelayMs: 10,
  backoffFactor: 1.5,
  maxDelayMs: 250,
  staleMs: 30_000
};

type LinearBudgetBucketKey = 'requests' | 'endpoint_requests' | 'complexity' | 'endpoint_complexity';
type LinearBudgetSuppression = 'none' | 'constrained' | 'low' | 'exhausted' | 'cooldown';

export interface LinearBudgetBucketPayload {
  limit: number | null;
  remaining: number | null;
  reset_at: string | null;
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
  requests: LinearBudgetBucketPayload | null;
  endpoint_requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  endpoint_complexity: LinearBudgetBucketPayload | null;
}

interface PersistedLinearBudgetStatus extends Omit<LinearBudgetStatus, 'cooldown_active' | 'suppression' | 'suppression_reason'> {
  schema_version: 1;
  token_fingerprint: string;
}

interface LinearBudgetStatePaths {
  statePath: string;
  lockPath: string;
  tokenFingerprint: string;
}

interface LinearBudgetObservation {
  observed_at: string;
  source: string;
  request_id: string | null;
  retry_after_seconds: number | null;
  cooldown_until: string | null;
  requests: LinearBudgetBucketPayload | null;
  endpoint_requests: LinearBudgetBucketPayload | null;
  complexity: LinearBudgetBucketPayload | null;
  endpoint_complexity: LinearBudgetBucketPayload | null;
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

export async function readSharedLinearBudgetStatus(
  env: NodeJS.ProcessEnv = process.env
): Promise<LinearBudgetStatus | null> {
  const paths = resolveLinearBudgetStatePaths(env);
  if (!paths) {
    return null;
  }
  const persisted = await readPersistedLinearBudgetStatus(paths.statePath, paths.tokenFingerprint);
  return persisted ? hydrateLinearBudgetStatus(persisted) : null;
}

export async function recordLinearBudgetHeadersObservation(input: {
  env?: NodeJS.ProcessEnv;
  headers?: Record<string, string> | null;
  source: string;
  observedAt?: string;
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
    assumeUnknownResetsExhausted: false
  });
}

export async function recordLinearBudgetRateLimitObservation(input: {
  env?: NodeJS.ProcessEnv;
  rateLimit: LinearRateLimitErrorLike;
  source: string;
  observedAt?: string;
}): Promise<LinearBudgetStatus | null> {
  return await recordLinearBudgetObservation({
    env: input.env,
    source: input.source,
    details: input.rateLimit.details,
    observedAt: input.observedAt,
    assumeUnknownResetsExhausted: true
  });
}

export function resolveLinearBudgetPreflight(input: {
  budget: LinearBudgetStatus | null;
  operation: string;
  minimum_requests_remaining?: number | null;
}): LinearBudgetPreflightResolution {
  const budget = input.budget;
  if (!budget) {
    return { ok: true };
  }

  const details = buildSharedLinearRateLimitDetails(budget, {
    shared_budget_fail_fast: true,
    operation: input.operation
  });
  const minimumRequestsRemaining =
    Number.isInteger(input.minimum_requests_remaining) && (input.minimum_requests_remaining ?? 0) > 0
      ? (input.minimum_requests_remaining as number)
      : 1;

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

  const requestShortfall = resolveRequestShortfall(budget, minimumRequestsRemaining);
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

export function resolveLinearPollingInterval(input: {
  budget: LinearBudgetStatus | null;
  default_interval_ms: number;
  nowMs?: number;
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

  if (budget.suppression === 'low' || budget.suppression === 'exhausted') {
    return {
      interval_ms: Math.max(input.default_interval_ms, LINEAR_BUDGET_DEFAULT_LOW_POLL_INTERVAL_MS),
      reason: budget.suppression_reason,
      linear_budget: budget
    };
  }

  if (budget.suppression === 'constrained') {
    return {
      interval_ms: Math.max(input.default_interval_ms, LINEAR_BUDGET_DEFAULT_CONSTRAINED_POLL_INTERVAL_MS),
      reason: budget.suppression_reason,
      linear_budget: budget
    };
  }

  return {
    interval_ms: input.default_interval_ms,
    reason: null,
    linear_budget: budget
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
    ...(budget.suppression_reason ? { shared_budget_suppression_reason: budget.suppression_reason } : {}),
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
    const existing = await readPersistedLinearBudgetStatus(paths.statePath, paths.tokenFingerprint);
    const persisted =
      existing && parseIsoToMs(existing.observed_at) !== null && parseIsoToMs(existing.observed_at)! > parseIsoToMs(observedAt)!
        ? existing
        : ({
            schema_version: LINEAR_BUDGET_STATE_SCHEMA_VERSION,
            token_fingerprint: paths.tokenFingerprint,
            ...observation
          } satisfies PersistedLinearBudgetStatus);
    await writeJsonAtomic(paths.statePath, persisted);
    return hydrateLinearBudgetStatus(persisted);
  });
}

function buildLinearBudgetObservation(input: {
  details: LinearRateLimitDetails;
  source: string;
  observedAt: string;
  assumeUnknownResetsExhausted: boolean;
}): LinearBudgetObservation {
  const observation: LinearBudgetObservation = {
    observed_at: input.observedAt,
    source: input.source,
    request_id: normalizeOptionalString(input.details.request_id),
    retry_after_seconds: parseNumberLike(input.details.retry_after_seconds),
    cooldown_until: null,
    requests: parseLinearBudgetBucket(input.details, 'requests'),
    endpoint_requests: parseLinearBudgetBucket(input.details, 'endpoint_requests'),
    complexity: parseLinearBudgetBucket(input.details, 'complexity'),
    endpoint_complexity: parseLinearBudgetBucket(input.details, 'endpoint_complexity')
  };
  observation.cooldown_until = resolveCooldownUntil({
    observation,
    assumeUnknownResetsExhausted: input.assumeUnknownResetsExhausted
  });
  return observation;
}

function hydrateLinearBudgetStatus(persisted: PersistedLinearBudgetStatus): LinearBudgetStatus {
  const normalized = stripPersistedLinearBudgetStatus(persisted);
  const cooldownActive = isFutureIsoTimestamp(normalized.cooldown_until);
  if (cooldownActive) {
    return {
      ...normalized,
      cooldown_active: true,
      suppression: 'cooldown',
      suppression_reason: 'linear_budget_shared_cooldown'
    };
  }

  const pressure = resolveLinearBudgetPressure(normalized);
  return {
    ...normalized,
    cooldown_active: false,
    suppression: pressure.suppression,
    suppression_reason: pressure.reason
  };
}

function stripPersistedLinearBudgetStatus(
  persisted: PersistedLinearBudgetStatus
): Omit<LinearBudgetStatus, 'cooldown_active' | 'suppression' | 'suppression_reason'> {
  return {
    observed_at: persisted.observed_at,
    source: persisted.source,
    request_id: persisted.request_id,
    retry_after_seconds: persisted.retry_after_seconds,
    cooldown_until: persisted.cooldown_until,
    requests: normalizeExpiredLinearBudgetBucket(persisted.requests, persisted.observed_at),
    endpoint_requests: normalizeExpiredLinearBudgetBucket(persisted.endpoint_requests, persisted.observed_at),
    complexity: normalizeExpiredLinearBudgetBucket(persisted.complexity, persisted.observed_at),
    endpoint_complexity: normalizeExpiredLinearBudgetBucket(persisted.endpoint_complexity, persisted.observed_at)
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

function resolveLinearBudgetPressure(input: Omit<LinearBudgetStatus, 'cooldown_active' | 'suppression' | 'suppression_reason'>): {
  suppression: Exclude<LinearBudgetSuppression, 'cooldown'>;
  reason: string | null;
} {
  let selected: {
    rank: number;
    suppression: Exclude<LinearBudgetSuppression, 'cooldown'>;
    reason: string | null;
  } = { rank: 0, suppression: 'none', reason: null };

  for (const [bucketKey, bucket] of [
    ['requests', input.requests],
    ['endpoint_requests', input.endpoint_requests],
    ['complexity', input.complexity],
    ['endpoint_complexity', input.endpoint_complexity]
  ] as const) {
    const pressure = resolveLinearBudgetBucketPressure(bucketKey, bucket);
    if (pressure.rank > selected.rank) {
      selected = pressure;
    }
  }

  return {
    suppression: selected.suppression,
    reason: selected.reason
  };
}

function resolveLinearBudgetBucketPressure(
  bucketKey: LinearBudgetBucketKey,
  bucket: LinearBudgetBucketPayload | null
): {
  rank: number;
  suppression: Exclude<LinearBudgetSuppression, 'cooldown'>;
  reason: string | null;
} {
  if (!bucket || bucket.remaining === null) {
    return { rank: 0, suppression: 'none', reason: null };
  }

  if (bucket.remaining <= 0) {
    return {
      rank: 3,
      suppression: 'exhausted',
      reason: `linear_budget_${bucketKey}_exhausted`
    };
  }

  const limit = bucket.limit;
  if (limit === null || limit <= 0) {
    return { rank: 0, suppression: 'none', reason: null };
  }

  const lowThreshold = Math.max(1, Math.min(10, Math.floor(limit * 0.02)));
  const constrainedThreshold = Math.max(lowThreshold + 1, Math.min(50, Math.floor(limit * 0.1)));

  if (bucket.remaining <= lowThreshold) {
    return {
      rank: 2,
      suppression: 'low',
      reason: `linear_budget_${bucketKey}_low`
    };
  }

  if (bucket.remaining <= constrainedThreshold) {
    return {
      rank: 1,
      suppression: 'constrained',
      reason: `linear_budget_${bucketKey}_constrained`
    };
  }

  return { rank: 0, suppression: 'none', reason: null };
}

function resolveRequestShortfall(
  budget: LinearBudgetStatus,
  minimumRequestsRemaining: number
): { bucket: 'requests' | 'endpoint_requests'; remaining: number } | null {
  for (const [bucketKey, bucket] of [
    ['requests', budget.requests],
    ['endpoint_requests', budget.endpoint_requests]
  ] as const) {
    if (bucket && bucket.remaining !== null && bucket.remaining < minimumRequestsRemaining) {
      return {
        bucket: bucketKey,
        remaining: bucket.remaining
      };
    }
  }
  return null;
}

function findExhaustedLinearBudgetBucket(budget: LinearBudgetStatus): LinearBudgetBucketKey | null {
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
  bucketKey: LinearBudgetBucketKey
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
  observation: LinearBudgetObservation;
  assumeUnknownResetsExhausted: boolean;
}): string | null {
  const observedAtMs = parseIsoToMs(input.observation.observed_at);
  if (observedAtMs === null) {
    return null;
  }

  const candidateMs: number[] = [];
  if (input.observation.retry_after_seconds !== null && input.observation.retry_after_seconds >= 0) {
    candidateMs.push(observedAtMs + input.observation.retry_after_seconds * 1000);
  }

  for (const bucket of [
    input.observation.requests,
    input.observation.endpoint_requests,
    input.observation.complexity,
    input.observation.endpoint_complexity
  ]) {
    if (!bucket?.reset_at) {
      continue;
    }
    const resetAtMs = parseIsoToMs(bucket.reset_at);
    if (resetAtMs === null) {
      continue;
    }
    const exhausted =
      bucket.remaining !== null ? bucket.remaining <= 0 : input.assumeUnknownResetsExhausted;
    if (exhausted) {
      candidateMs.push(resetAtMs);
    }
  }

  if (candidateMs.length === 0) {
    return null;
  }
  const latestMs = Math.max(...candidateMs);
  return Number.isFinite(latestMs) ? new Date(latestMs).toISOString() : null;
}

function serializeLinearBudgetBucketDetails(
  bucketKey: LinearBudgetBucketKey,
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
    statePath: join(directory, `${tokenFingerprint}.json`),
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
  if (record.schema_version !== LINEAR_BUDGET_STATE_SCHEMA_VERSION) {
    return null;
  }
  if (normalizeOptionalString(record.token_fingerprint) !== tokenFingerprint) {
    return null;
  }
  const observedAt = normalizeOptionalString(record.observed_at);
  const source = normalizeOptionalString(record.source);
  if (!observedAt || !source) {
    return null;
  }
  return {
    schema_version: 1,
    token_fingerprint: tokenFingerprint,
    observed_at: observedAt,
    source,
    request_id: normalizeOptionalString(record.request_id),
    retry_after_seconds: parseNumberLike(record.retry_after_seconds),
    cooldown_until: normalizeOptionalString(record.cooldown_until),
    requests: parsePersistedLinearBudgetBucket(record.requests),
    endpoint_requests: parsePersistedLinearBudgetBucket(record.endpoint_requests),
    complexity: parsePersistedLinearBudgetBucket(record.complexity),
    endpoint_complexity: parsePersistedLinearBudgetBucket(record.endpoint_complexity)
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

function parseNumberLike(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
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

function hasRecordableLinearBudgetDetails(details: LinearRateLimitDetails): boolean {
  return Object.keys(details).some((key) => key !== 'request_id');
}
