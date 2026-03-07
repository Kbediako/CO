import http from 'node:http';

import type { ConfirmationValidationResult } from './confirmations.js';

type ConfirmationResolvedPayload = Record<string, unknown> & {
  request_id: string;
  nonce_id: string;
  outcome: 'approved';
};

export interface ConfirmationValidateControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  readRequestBody(): Promise<Record<string, unknown>>;
  expireConfirmations(): Promise<void>;
  validateConfirmation(input: {
    confirmNonce: string;
    tool: string;
    params: Record<string, unknown>;
  }): ConfirmationValidationResult;
  persistConfirmations(): Promise<void>;
  emitConfirmationResolved(payload: ConfirmationResolvedPayload): Promise<void>;
}

export async function handleConfirmationValidateRequest(
  context: ConfirmationValidateControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/confirmations/validate' || method !== 'POST') {
    return false;
  }

  await context.expireConfirmations();
  const body = await context.readRequestBody();
  const confirmNonce = readStringValue(body, 'confirm_nonce', 'confirmNonce');
  if (!confirmNonce) {
    writeConfirmationValidateResponse(context.res, 400, { error: 'missing_confirm_nonce' });
    return true;
  }

  const tool = readStringValue(body, 'tool') ?? 'unknown';
  const params = readRecordValue(body, 'params') ?? {};

  let validation: ConfirmationValidationResult;
  try {
    validation = context.validateConfirmation({ confirmNonce, tool, params });
  } catch (error) {
    writeConfirmationValidateResponse(context.res, 409, {
      error: (error as Error)?.message ?? 'confirmation_invalid'
    });
    return true;
  }

  await context.persistConfirmations();
  await context.emitConfirmationResolved({
    request_id: validation.request.request_id,
    nonce_id: validation.nonce_id,
    outcome: 'approved'
  });
  writeConfirmationValidateResponse(context.res, 200, {
    status: 'valid',
    request_id: validation.request.request_id,
    nonce_id: validation.nonce_id
  });
  return true;
}

function writeConfirmationValidateResponse(
  res: http.ServerResponse,
  status: number,
  body:
    | { error: string }
    | {
        status: 'valid';
        request_id: string;
        nonce_id: string;
      }
): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
