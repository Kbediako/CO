import http from 'node:http';

import type { ConfirmationNonce } from './confirmations.js';

export interface ConfirmationIssueConsumeControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  readRequestBody(): Promise<Record<string, unknown>>;
  expireConfirmations(): Promise<void>;
  issueConfirmation(requestId: string): ConfirmationNonce;
  persistConfirmations(): Promise<void>;
}

export async function handleConfirmationIssueConsumeRequest(
  context: ConfirmationIssueConsumeControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (!isConfirmationIssueConsumeRoute(pathname) || method !== 'POST') {
    return false;
  }

  await context.expireConfirmations();
  const body = await context.readRequestBody();
  const requestId = readStringValue(body, 'request_id', 'requestId');
  if (!requestId) {
    writeConfirmationResponse(context.res, 400, { error: 'missing_request_id' });
    return true;
  }

  let nonce: ConfirmationNonce;
  try {
    nonce = context.issueConfirmation(requestId);
  } catch (error) {
    writeConfirmationResponse(context.res, 409, {
      error: (error as Error)?.message ?? 'confirmation_invalid'
    });
    return true;
  }

  await context.persistConfirmations();
  writeConfirmationResponse(context.res, 200, nonce);
  return true;
}

function isConfirmationIssueConsumeRoute(pathname: string): boolean {
  return pathname === '/confirmations/issue' || pathname === '/confirmations/consume';
}

function writeConfirmationResponse(res: http.ServerResponse, status: number, body: ConfirmationNonce | { error: string }): void {
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
