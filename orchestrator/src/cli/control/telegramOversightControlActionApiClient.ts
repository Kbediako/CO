type FetchLike = typeof fetch;

export interface TelegramOversightControlActionResponse {
  error?: string;
  control_seq?: number;
  traceability?: {
    decision?: string;
  } | null;
}

export interface TelegramOversightControlActionApiClient {
  postAction(
    body: Record<string, unknown>
  ): Promise<TelegramOversightControlActionResponse>;
}

export function createTelegramOversightControlActionApiClient(input: {
  baseUrl: string;
  controlToken: string;
  fetchImpl: FetchLike;
}): TelegramOversightControlActionApiClient {
  return {
    postAction: async (body) =>
      readControlActionResponse(
        await input.fetchImpl(new URL('/control/action', input.baseUrl), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${input.controlToken}`,
            'x-csrf-token': input.controlToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
      )
  };
}

async function readControlActionResponse(
  response: Response
): Promise<TelegramOversightControlActionResponse> {
  const payload = (await response.json()) as TelegramOversightControlActionResponse & {
    error?: string | { code?: string; message?: string };
  };
  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload));
  }
  return payload;
}

function resolveErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'request_failed';
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'string' && record.error.trim().length > 0) {
    return record.error.trim();
  }
  const error = record.error;
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const errorRecord = error as Record<string, unknown>;
    const code = typeof errorRecord.code === 'string' ? errorRecord.code : null;
    const message = typeof errorRecord.message === 'string' ? errorRecord.message : null;
    if (code && message) {
      return `${code}: ${message}`;
    }
    if (code) {
      return code;
    }
    if (message) {
      return message;
    }
  }
  return 'request_failed';
}
