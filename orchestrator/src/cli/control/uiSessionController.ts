import http from 'node:http';

const UI_SESSION_PATH = '/auth/session';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const JSON_NO_STORE_HEADERS = { ...JSON_HEADERS, 'Cache-Control': 'no-store' };

export interface UiSessionControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url' | 'headers' | 'socket'>;
  res: http.ServerResponse;
  allowedHosts: ReadonlySet<string>;
  issueSession: () => { token: string; expiresAt: string };
  isLoopbackAddress: (address: string | undefined | null) => boolean;
}

export function handleUiSessionRequest(context: UiSessionControllerContext): boolean {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== UI_SESSION_PATH || (method !== 'GET' && method !== 'POST')) {
    return false;
  }

  if (!context.isLoopbackAddress(context.req.socket.remoteAddress)) {
    writeJsonResponse(context.res, 403, { error: 'loopback_only' });
    return true;
  }

  const hostHeader = parseHostHeader(context.req.headers.host);
  if (!hostHeader || !context.allowedHosts.has(hostHeader)) {
    writeJsonResponse(context.res, 403, { error: 'host_not_allowed' });
    return true;
  }

  const originHost = parseOriginHost(context.req.headers.origin);
  if (originHost) {
    if (!context.allowedHosts.has(originHost)) {
      writeJsonResponse(context.res, 403, { error: 'origin_not_allowed' });
      return true;
    }
  } else if (method !== 'GET') {
    writeJsonResponse(context.res, 403, { error: 'origin_required' });
    return true;
  }

  const session = context.issueSession();
  writeJsonResponse(
    context.res,
    200,
    {
      token: session.token,
      expires_at: session.expiresAt
    },
    JSON_NO_STORE_HEADERS
  );
  return true;
}

function writeJsonResponse(
  res: http.ServerResponse,
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = JSON_HEADERS
): void {
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(body));
}

function parseHostHeader(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    if (end === -1) {
      return null;
    }
    return trimmed.slice(1, end).toLowerCase();
  }
  const parts = trimmed.split(':');
  if (parts.length > 2) {
    return trimmed.toLowerCase();
  }
  const host = parts[0]?.trim();
  return host ? host.toLowerCase() : null;
}

function parseOriginHost(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}
