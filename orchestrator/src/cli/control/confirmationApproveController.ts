import http from 'node:http';

import type {
  ConfirmationNonce,
  ConfirmationRequest,
  ConfirmationValidationResult
} from './confirmations.js';

type ConfirmationResolvedPayload = {
  request_id: string;
  nonce_id: string;
  outcome: 'approved';
};

export interface ConfirmationApproveControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  readRequestBody(): Promise<Record<string, unknown>>;
  expireConfirmations(): Promise<void>;
  approveConfirmation(requestId: string, actor: string): void;
  readConfirmation(requestId: string): ConfirmationRequest | undefined;
  persistConfirmations(): Promise<void>;
  issueConfirmation(requestId: string): ConfirmationNonce;
  validateConfirmation(input: {
    confirmNonce: string;
    tool: string;
    params: Record<string, unknown>;
  }): ConfirmationValidationResult;
  emitConfirmationResolved(payload: ConfirmationResolvedPayload): Promise<void>;
  updateControlAction(input: {
    action: 'cancel';
    requestedBy: string;
    requestId: string;
  }): void;
  persistControl(): Promise<void>;
  publishRuntime(): void;
}

export async function handleConfirmationApproveRequest(
  context: ConfirmationApproveControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/confirmations/approve' || method !== 'POST') {
    return false;
  }

  await context.expireConfirmations();
  const body = await context.readRequestBody();
  const requestId = readStringValue(body, 'request_id', 'requestId');
  if (!requestId) {
    writeConfirmationApproveResponse(context.res, 400, { error: 'missing_request_id' });
    return true;
  }

  const actor = readStringValue(body, 'actor') ?? 'ui';
  context.approveConfirmation(requestId, actor);
  const entry = context.readConfirmation(requestId);
  await context.persistConfirmations();

  if (entry && entry.tool.startsWith('ui.') && entry.action === 'cancel') {
    try {
      const nonce = context.issueConfirmation(requestId);
      const validation = context.validateConfirmation({
        confirmNonce: nonce.confirm_nonce,
        tool: entry.tool,
        params: entry.params
      });
      await context.persistConfirmations();
      await context.emitConfirmationResolved({
        request_id: validation.request.request_id,
        nonce_id: validation.nonce_id,
        outcome: 'approved'
      });
      context.updateControlAction({
        action: 'cancel',
        requestedBy: actor,
        requestId
      });
      await context.persistControl();
      context.publishRuntime();
    } catch (error) {
      writeConfirmationApproveResponse(context.res, 409, {
        error: (error as Error)?.message ?? 'confirmation_invalid'
      });
      return true;
    }
  }

  writeConfirmationApproveResponse(context.res, 200, { status: 'approved' });
  return true;
}

function writeConfirmationApproveResponse(
  res: http.ServerResponse,
  status: number,
  body:
    | { error: string }
    | {
        status: 'approved';
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
