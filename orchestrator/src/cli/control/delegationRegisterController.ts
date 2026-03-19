import http from 'node:http';

import type { DelegationTokenRecord, DelegationTokenStore } from './delegationTokens.js';

export interface DelegationRegisterControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  delegationTokens: Pick<DelegationTokenStore, 'register'>;
  readRequestBody(): Promise<Record<string, unknown>>;
  persistDelegationTokens(): Promise<void>;
}

export async function handleDelegationRegisterRequest(
  context: DelegationRegisterControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/delegation/register' || method !== 'POST') {
    return false;
  }

  const body = await context.readRequestBody();
  const token = readStringValue(body, 'token');
  const parentRunId = readStringValue(body, 'parent_run_id', 'parentRunId');
  const childRunId = readStringValue(body, 'child_run_id', 'childRunId');
  if (!token || !parentRunId || !childRunId) {
    writeDelegationRegisterResponse(context.res, 400, { error: 'missing_delegation_fields' });
    return true;
  }

  const record = context.delegationTokens.register(token, parentRunId, childRunId);
  await context.persistDelegationTokens();
  writeDelegationRegisterResponse(context.res, 200, {
    status: 'registered',
    token_id: record.token_id
  });
  return true;
}

function writeDelegationRegisterResponse(
  res: http.ServerResponse,
  status: number,
  body: { error: string } | { status: 'registered'; token_id: DelegationTokenRecord['token_id'] }
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
