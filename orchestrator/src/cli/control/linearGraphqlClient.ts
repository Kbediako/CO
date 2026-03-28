import { createHash } from 'node:crypto';

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';
const DEFAULT_LINEAR_REQUEST_TIMEOUT_MS = 30_000;
const LINEAR_GRAPHQL_RELEVANT_RESPONSE_HEADERS = [
  'retry-after',
  'x-ratelimit-requests-limit',
  'x-ratelimit-requests-remaining',
  'x-ratelimit-requests-reset',
  'x-ratelimit-endpoint-requests-limit',
  'x-ratelimit-endpoint-requests-remaining',
  'x-ratelimit-endpoint-requests-reset',
  'x-ratelimit-complexity-limit',
  'x-ratelimit-complexity-remaining',
  'x-ratelimit-complexity-reset',
  'x-ratelimit-endpoint-complexity-limit',
  'x-ratelimit-endpoint-complexity-remaining',
  'x-ratelimit-endpoint-complexity-reset',
  'x-request-id'
] as const;

export interface LinearGraphqlErrorEntry {
  message?: string | null;
  path?: Array<string | number> | null;
  extensions?: Record<string, unknown> | null;
}

export interface LinearGraphqlPayload<TData> {
  data?: TData;
  errors?: LinearGraphqlErrorEntry[];
}

export interface LinearGraphqlFailure {
  kind: 'request_failed' | 'response_invalid' | 'graphql_error';
  status: number | null;
  errors: LinearGraphqlErrorEntry[];
  headers?: Record<string, string>;
}

export type LinearGraphqlExecutionResult<TData> =
  | {
      ok: true;
      payload: LinearGraphqlPayload<TData>;
    }
  | {
      ok: false;
      failure: LinearGraphqlFailure;
    };

export async function executeLinearGraphql<TData>(input: {
  token: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
  query: string;
  variables?: Record<string, unknown>;
}): Promise<LinearGraphqlExecutionResult<TData>> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), input.timeoutMs);
  const response = await input.fetchImpl(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: input.token
    },
    body: JSON.stringify({
      query: input.query,
      variables: input.variables ?? {}
    }),
    signal: abortController.signal
  })
    .catch(() => null)
    .finally(() => clearTimeout(timeout));

  if (!response) {
    return {
      ok: false,
      failure: {
        kind: 'request_failed',
        status: null,
        errors: []
      }
    };
  }

  const headers = readRelevantLinearGraphqlResponseHeaders(response);
  const payload = await readLinearGraphqlPayload<TData>(response);
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];

  if (!response.ok) {
    if (errors.length > 0) {
      return {
        ok: false,
        failure: {
          kind: 'graphql_error',
          status: response.status,
          errors,
          ...(headers ? { headers } : {})
        }
      };
    }
    return {
      ok: false,
      failure: {
        kind: 'request_failed',
        status: response.status,
        errors: [],
        ...(headers ? { headers } : {})
      }
    };
  }

  if (!payload) {
    return {
      ok: false,
      failure: {
        kind: 'response_invalid',
        status: response.status,
        errors: []
      }
    };
  }

  if (errors.length > 0) {
    return {
      ok: false,
      failure: {
        kind: 'graphql_error',
        status: response.status,
        errors,
        ...(headers ? { headers } : {})
      }
    };
  }

  return {
    ok: true,
    payload
  };
}

async function readLinearGraphqlPayload<TData>(
  response: Response
): Promise<LinearGraphqlPayload<TData> | null> {
  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    return null;
  }
  const trimmed = rawBody.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as LinearGraphqlPayload<TData>;
  } catch {
    return null;
  }
}

function readRelevantLinearGraphqlResponseHeaders(response: Response): Record<string, string> | null {
  const extracted: Record<string, string> = {};
  for (const name of LINEAR_GRAPHQL_RELEVANT_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (typeof value === 'string' && value.trim().length > 0) {
      extracted[name] = value.trim();
    }
  }
  return Object.keys(extracted).length > 0 ? extracted : null;
}

export function resolveLinearApiToken(env: NodeJS.ProcessEnv): string | null {
  return (
    normalizeEnvValue(env.CO_LINEAR_API_TOKEN) ??
    normalizeEnvValue(env.CO_LINEAR_API_KEY) ??
    normalizeEnvValue(env.LINEAR_API_KEY)
  );
}

export function resolveLinearApiTokenFingerprint(env: NodeJS.ProcessEnv): string | null {
  const token = resolveLinearApiToken(env);
  return token ? createHash('sha256').update(token).digest('hex') : null;
}

export function resolveLinearRequestTimeoutMs(env: NodeJS.ProcessEnv): number {
  const raw = normalizeEnvValue(env.CO_LINEAR_REQUEST_TIMEOUT_MS);
  if (!raw) {
    return DEFAULT_LINEAR_REQUEST_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_LINEAR_REQUEST_TIMEOUT_MS;
}

function normalizeEnvValue(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
