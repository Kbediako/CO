import http from 'node:http';

import type { ConfirmationRequest } from './confirmations.js';

export interface ConfirmationListControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  expireConfirmations(): Promise<void>;
  listPendingConfirmations(): ConfirmationRequest[];
}

export async function handleConfirmationListRequest(
  context: ConfirmationListControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/confirmations' || method !== 'GET') {
    return false;
  }

  await context.expireConfirmations();
  const pending = sanitizeConfirmations(context.listPendingConfirmations());
  writeConfirmationListResponse(context.res, 200, { pending });
  return true;
}

function writeConfirmationListResponse(
  res: http.ServerResponse,
  status: number,
  body: { pending: Array<Omit<ConfirmationRequest, 'params'>> }
): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sanitizeConfirmations(
  entries: ConfirmationRequest[]
): Array<Omit<ConfirmationRequest, 'params'>> {
  return entries.map((entry) => {
    const sanitized = { ...entry } as Partial<ConfirmationRequest>;
    delete sanitized.params;
    return sanitized as Omit<ConfirmationRequest, 'params'>;
  });
}
