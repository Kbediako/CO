import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const CSRF_HEADER = 'x-csrf-token';

interface AuthenticatedControlRouteAuth {
  token: string;
  kind: 'control' | 'session';
}

interface AuthenticatedControlRouteGateContext {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  pathname: string;
  controlToken: string;
  isSessionTokenValid: (token: string) => boolean;
}

export function admitAuthenticatedControlRoute(
  context: AuthenticatedControlRouteGateContext
): AuthenticatedControlRouteAuth | null {
  const auth = resolveAuthToken({
    authorizationHeader: context.req.headers.authorization,
    controlToken: context.controlToken,
    isSessionTokenValid: context.isSessionTokenValid
  });
  if (!auth) {
    writeGateError(context.res, 401, 'unauthorized');
    return null;
  }

  if (requiresCsrfProtection(context.req.method) && !isCsrfValid(context.req, auth.token)) {
    writeGateError(context.res, 403, 'csrf_invalid');
    return null;
  }

  if (isRunnerOnlyEndpoint(context.pathname, context.req.method) && auth.kind !== 'control') {
    writeGateError(context.res, 403, 'runner_only');
    return null;
  }

  return auth;
}

interface ResolveAuthTokenInput {
  authorizationHeader: string | string[] | undefined;
  controlToken: string;
  isSessionTokenValid: (token: string) => boolean;
}

function resolveAuthToken(input: ResolveAuthTokenInput): AuthenticatedControlRouteAuth | null {
  const header = typeof input.authorizationHeader === 'string' ? input.authorizationHeader : null;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length);
  if (safeTokenCompare(token, input.controlToken)) {
    return { token, kind: 'control' };
  }
  if (input.isSessionTokenValid(token)) {
    return { token, kind: 'session' };
  }
  return null;
}

function isCsrfValid(req: http.IncomingMessage, token: string): boolean {
  const header = req.headers[CSRF_HEADER] as string | undefined;
  if (!header) {
    return false;
  }
  return safeTokenCompare(header, token);
}

function requiresCsrfProtection(method: string | undefined): boolean {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD';
}

function isRunnerOnlyEndpoint(pathname: string, method: string | undefined): boolean {
  if ((method ?? 'GET').toUpperCase() !== 'POST') {
    return false;
  }
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return (
    normalized === '/confirmations/issue' ||
    normalized === '/confirmations/consume' ||
    normalized === '/confirmations/validate' ||
    normalized === '/delegation/register' ||
    normalized === '/questions/enqueue' ||
    normalized === '/security/violation'
  );
}

function writeGateError(res: http.ServerResponse, status: number, error: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error }));
}

function safeTokenCompare(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}
