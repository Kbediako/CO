import http from 'node:http';

import type { ConfirmationAction, ConfirmationCreateResult } from './confirmations.js';

type ConfirmationRequiredPayload = {
  request_id: string;
  confirm_scope: {
    run_id: string;
    action: ConfirmationAction;
    action_params_digest: string;
  };
  action_params_digest: string;
  digest_alg: 'sha256';
  confirm_expires_in_ms: number;
};

export interface ConfirmationCreateControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  authKind: 'control' | 'session';
  readRequestBody(): Promise<Record<string, unknown>>;
  expireConfirmations(): Promise<void>;
  createConfirmation(input: {
    action: ConfirmationAction;
    tool: string;
    params: Record<string, unknown>;
  }): ConfirmationCreateResult;
  persistConfirmations(): Promise<void>;
  maybeAutoPause(requestId: string): Promise<void>;
  readRunId(): string;
  emitConfirmationRequired(payload: ConfirmationRequiredPayload): Promise<void>;
}

export async function handleConfirmationCreateRequest(
  context: ConfirmationCreateControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/confirmations/create' || method !== 'POST') {
    return false;
  }

  await context.expireConfirmations();
  const body = await context.readRequestBody();
  const rawAction = readStringValue(body, 'action');
  const action = rawAction === 'cancel' || rawAction === 'merge' ? rawAction : 'other';
  let tool = readStringValue(body, 'tool') ?? 'unknown';
  let params = readRecordValue(body, 'params') ?? {};
  if (context.authKind === 'session') {
    if (rawAction !== 'cancel' || tool !== 'ui.cancel') {
      writeConfirmationCreateResponse(context.res, 403, { error: 'ui_confirmation_disallowed' });
      return true;
    }
    tool = 'ui.cancel';
    params = {};
  }

  const { confirmation, wasCreated } = context.createConfirmation({
    action,
    tool,
    params
  });
  await context.persistConfirmations();

  if (wasCreated) {
    await context.maybeAutoPause(confirmation.request_id);
  }

  const payload = buildConfirmationRequiredPayload(context.readRunId(), confirmation);
  if (wasCreated) {
    await context.emitConfirmationRequired(payload);
  }

  writeConfirmationCreateResponse(context.res, 200, payload);
  return true;
}

function buildConfirmationRequiredPayload(
  runId: string,
  result: ConfirmationCreateResult['confirmation']
): ConfirmationRequiredPayload {
  return {
    request_id: result.request_id,
    confirm_scope: {
      run_id: runId,
      action: result.action,
      action_params_digest: result.action_params_digest
    },
    action_params_digest: result.action_params_digest,
    digest_alg: result.digest_alg,
    confirm_expires_in_ms: Date.parse(result.expires_at) - Date.parse(result.requested_at)
  };
}

function writeConfirmationCreateResponse(
  res: http.ServerResponse,
  status: number,
  body:
    | { error: string }
    | ConfirmationRequiredPayload
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
