const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';
const DEFAULT_LINEAR_REQUEST_TIMEOUT_MS = 30_000;

export interface LinearGraphqlErrorEntry {
  message?: string | null;
}

export interface LinearGraphqlPayload<TData> {
  data?: TData;
  errors?: LinearGraphqlErrorEntry[];
}

export interface LinearGraphqlFailure {
  kind: 'request_failed' | 'response_invalid' | 'graphql_error';
  status: number | null;
  errors: LinearGraphqlErrorEntry[];
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

  if (!response.ok) {
    return {
      ok: false,
      failure: {
        kind: 'request_failed',
        status: response.status,
        errors: []
      }
    };
  }

  let payload: LinearGraphqlPayload<TData>;
  try {
    payload = (await response.json()) as LinearGraphqlPayload<TData>;
  } catch {
    return {
      ok: false,
      failure: {
        kind: 'response_invalid',
        status: response.status,
        errors: []
      }
    };
  }

  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  if (errors.length > 0) {
    return {
      ok: false,
      failure: {
        kind: 'graphql_error',
        status: response.status,
        errors
      }
    };
  }

  return {
    ok: true,
    payload
  };
}

export function resolveLinearApiToken(env: NodeJS.ProcessEnv): string | null {
  return (
    normalizeEnvValue(env.CO_LINEAR_API_TOKEN) ??
    normalizeEnvValue(env.CO_LINEAR_API_KEY) ??
    normalizeEnvValue(env.LINEAR_API_KEY)
  );
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
