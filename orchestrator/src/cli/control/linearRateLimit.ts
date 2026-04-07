import type { LinearGraphqlErrorEntry, LinearGraphqlFailure } from './linearGraphqlClient.js';

export interface LinearRateLimitErrorLike {
  code: 'linear_rate_limited';
  message: 'Linear API rate limit exceeded.';
  status: 429;
  retryable: true;
  details: Record<string, unknown>;
}

export type LinearRateLimitDetails = LinearRateLimitErrorLike['details'];

export function mapLinearRateLimitedFailure(
  failureValue: LinearGraphqlFailure
): LinearRateLimitErrorLike | null {
  if (!isLinearRateLimitedFailure(failureValue)) {
    return null;
  }
  return {
    code: 'linear_rate_limited',
    message: 'Linear API rate limit exceeded.',
    status: 429,
    retryable: true,
    details: {
      errors: serializeLinearGraphqlErrors(failureValue.errors),
      ...extractLinearRateLimitDetailsFromHeaders(failureValue.headers)
    }
  };
}

export function extractLinearRateLimitDetailsFromHeaders(
  headers: Record<string, string> | null | undefined
): LinearRateLimitDetails {
  const retryAfterSeconds = parsePositiveIntegerHeader(headers?.['retry-after']);
  const requestsRemaining = parseIntegerHeader(headers?.['x-ratelimit-requests-remaining']);
  const requestsLimit = parsePositiveIntegerHeader(headers?.['x-ratelimit-requests-limit']);
  const requestsResetAt = parseLinearRateLimitResetHeader(headers?.['x-ratelimit-requests-reset']);
  const endpointRequestsRemaining = parseIntegerHeader(headers?.['x-ratelimit-endpoint-requests-remaining']);
  const endpointRequestsLimit = parsePositiveIntegerHeader(headers?.['x-ratelimit-endpoint-requests-limit']);
  const endpointRequestsResetAt = parseLinearRateLimitResetHeader(
    headers?.['x-ratelimit-endpoint-requests-reset']
  );
  const endpointName = normalizeOptionalString(headers?.['x-ratelimit-endpoint-name']);
  const complexityRemaining = parseIntegerHeader(headers?.['x-ratelimit-complexity-remaining']);
  const complexityLimit = parsePositiveIntegerHeader(headers?.['x-ratelimit-complexity-limit']);
  const complexityResetAt = parseLinearRateLimitResetHeader(headers?.['x-ratelimit-complexity-reset']);
  const endpointComplexityRemaining = parseIntegerHeader(headers?.['x-ratelimit-endpoint-complexity-remaining']);
  const endpointComplexityLimit = parsePositiveIntegerHeader(headers?.['x-ratelimit-endpoint-complexity-limit']);
  const endpointComplexityResetAt = parseLinearRateLimitResetHeader(
    headers?.['x-ratelimit-endpoint-complexity-reset']
  );
  const requestComplexity = parsePositiveIntegerHeader(headers?.['x-complexity']);
  const requestId = normalizeOptionalString(headers?.['x-request-id']);
  return {
    ...(retryAfterSeconds !== null ? { retry_after_seconds: retryAfterSeconds } : {}),
    ...(requestsRemaining !== null ? { requests_remaining: requestsRemaining } : {}),
    ...(requestsLimit !== null ? { requests_limit: requestsLimit } : {}),
    ...(requestsResetAt !== null ? { requests_reset_at: requestsResetAt } : {}),
    ...(endpointRequestsRemaining !== null ? { endpoint_requests_remaining: endpointRequestsRemaining } : {}),
    ...(endpointRequestsLimit !== null ? { endpoint_requests_limit: endpointRequestsLimit } : {}),
    ...(endpointRequestsResetAt !== null ? { endpoint_requests_reset_at: endpointRequestsResetAt } : {}),
    ...(endpointName ? { endpoint_name: endpointName } : {}),
    ...(complexityRemaining !== null ? { complexity_remaining: complexityRemaining } : {}),
    ...(complexityLimit !== null ? { complexity_limit: complexityLimit } : {}),
    ...(complexityResetAt !== null ? { complexity_reset_at: complexityResetAt } : {}),
    ...(endpointComplexityRemaining !== null
      ? { endpoint_complexity_remaining: endpointComplexityRemaining }
      : {}),
    ...(endpointComplexityLimit !== null ? { endpoint_complexity_limit: endpointComplexityLimit } : {}),
    ...(endpointComplexityResetAt !== null ? { endpoint_complexity_reset_at: endpointComplexityResetAt } : {}),
    ...(requestComplexity !== null ? { request_complexity: requestComplexity } : {}),
    ...(requestId ? { request_id: requestId } : {})
  };
}

function isLinearRateLimitedFailure(failureValue: LinearGraphqlFailure): boolean {
  return failureValue.errors.some((entry) => {
    const message = normalizeOptionalString(entry.message)?.toLowerCase() ?? '';
    const extensionCode =
      entry.extensions && typeof entry.extensions === 'object'
        ? normalizeOptionalString((entry.extensions as Record<string, unknown>).code as string | null | undefined)?.toLowerCase() ?? ''
        : '';
    return extensionCode === 'ratelimited' || message.includes('rate limit exceeded');
  });
}

function serializeLinearGraphqlErrors(errors: LinearGraphqlErrorEntry[]): Record<string, unknown>[] {
  return errors.map((entry) => {
    const path = Array.isArray(entry.path)
      ? entry.path.filter(
          (segment): segment is string | number =>
            typeof segment === 'string' || (typeof segment === 'number' && Number.isFinite(segment))
        )
      : [];
    const extensions =
      entry.extensions && typeof entry.extensions === 'object'
        ? { ...(entry.extensions as Record<string, unknown>) }
        : null;
    return {
      message: normalizeOptionalString(entry.message) ?? 'unknown_error',
      ...(path.length > 0 ? { path } : {}),
      ...(extensions ? { extensions } : {})
    };
  });
}

function parseIntegerHeader(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function parsePositiveIntegerHeader(value: string | null | undefined): number | null {
  const parsed = parseIntegerHeader(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function parseLinearRateLimitResetHeader(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  const timestamp = new Date(parsed);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
