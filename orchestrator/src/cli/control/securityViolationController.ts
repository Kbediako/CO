import http from 'node:http';

export type SecurityViolationEventPayload = Record<string, unknown> & {
  kind: string;
  summary: string;
  severity: string;
  related_request_id: string | null;
  details_redacted: true;
};

export interface SecurityViolationControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  readRequestBody(): Promise<Record<string, unknown>>;
  emitSecurityViolation(payload: SecurityViolationEventPayload): Promise<void>;
}

export async function handleSecurityViolationRequest(
  context: SecurityViolationControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== '/security/violation' || method !== 'POST') {
    return false;
  }

  const body = await context.readRequestBody();
  await context.emitSecurityViolation({
    kind: readStringValue(body, 'kind') ?? 'unknown',
    summary: readStringValue(body, 'summary') ?? 'security_violation',
    severity: readStringValue(body, 'severity') ?? 'high',
    related_request_id: readStringValue(body, 'related_request_id', 'relatedRequestId') ?? null,
    details_redacted: true
  });

  context.res.writeHead(200, { 'Content-Type': 'application/json' });
  context.res.end(JSON.stringify({ status: 'recorded' }));
  return true;
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
