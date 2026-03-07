import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { handleUiSessionRequest } from '../src/cli/control/uiSessionController.js';

function createResponseRecorder() {
  const state: {
    statusCode: number | null;
    headers: Record<string, string> | null;
    body: unknown;
  } = {
    statusCode: null,
    headers: null,
    body: null
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = headers;
      return this;
    },
    end(payload?: string) {
      state.body = payload ? JSON.parse(payload) : null;
      return this;
    }
  } as unknown as http.ServerResponse;

  return { res, state };
}

function createRequest(
  input: Partial<Pick<http.IncomingMessage, 'method' | 'url' | 'headers'>> & {
    remoteAddress?: string | null;
  }
): Pick<http.IncomingMessage, 'method' | 'url' | 'headers' | 'socket'> {
  return {
    method: input.method ?? 'GET',
    url: input.url ?? '/auth/session',
    headers: input.headers ?? {},
    socket: {
      remoteAddress: input.remoteAddress ?? '127.0.0.1'
    } as http.IncomingMessage['socket']
  };
}

describe('UiSessionController', () => {
  it('returns false and leaves the response untouched for non-session routes', () => {
    const { res, state } = createResponseRecorder();
    const handled = handleUiSessionRequest({
      req: createRequest({
        url: '/api/v1/state'
      }),
      res,
      allowedHosts: new Set(['127.0.0.1']),
      issueSession: () => ({ token: 'unused', expiresAt: 'unused' }),
      isLoopbackAddress: () => true
    });

    expect(handled).toBe(false);
    expect(state.statusCode).toBeNull();
    expect(state.headers).toBeNull();
    expect(state.body).toBeNull();
  });

  it('returns false and leaves the response untouched for non-GET/POST session methods', () => {
    const { res, state } = createResponseRecorder();
    const handled = handleUiSessionRequest({
      req: createRequest({
        method: 'PUT'
      }),
      res,
      allowedHosts: new Set(['127.0.0.1']),
      issueSession: () => ({ token: 'unused', expiresAt: 'unused' }),
      isLoopbackAddress: () => true
    });

    expect(handled).toBe(false);
    expect(state.statusCode).toBeNull();
    expect(state.headers).toBeNull();
    expect(state.body).toBeNull();
  });

  it('rejects non-loopback requests with loopback_only', () => {
    const { res, state } = createResponseRecorder();
    const handled = handleUiSessionRequest({
      req: createRequest({
        headers: {
          host: '127.0.0.1:4318',
          origin: 'http://127.0.0.1:4318'
        },
        remoteAddress: '10.0.0.9'
      }),
      res,
      allowedHosts: new Set(['127.0.0.1']),
      issueSession: () => ({ token: 'unused', expiresAt: 'unused' }),
      isLoopbackAddress: (address) => address === '127.0.0.1'
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: 'loopback_only' });
  });

  it('rejects disallowed host headers with host_not_allowed', () => {
    const { res, state } = createResponseRecorder();
    const handled = handleUiSessionRequest({
      req: createRequest({
        headers: {
          host: 'evil.example.com:4318',
          origin: 'http://127.0.0.1:4318'
        }
      }),
      res,
      allowedHosts: new Set(['127.0.0.1']),
      issueSession: () => ({ token: 'unused', expiresAt: 'unused' }),
      isLoopbackAddress: () => true
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: 'host_not_allowed' });
  });

  it('rejects POST without Origin with origin_required', () => {
    const { res, state } = createResponseRecorder();
    const handled = handleUiSessionRequest({
      req: createRequest({
        method: 'POST',
        headers: {
          host: '127.0.0.1:4318'
        }
      }),
      res,
      allowedHosts: new Set(['127.0.0.1']),
      issueSession: () => ({ token: 'unused', expiresAt: 'unused' }),
      isLoopbackAddress: () => true
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: 'origin_required' });
  });

  it('rejects disallowed Origin with origin_not_allowed', () => {
    const { res, state } = createResponseRecorder();
    const handled = handleUiSessionRequest({
      req: createRequest({
        method: 'POST',
        headers: {
          host: '127.0.0.1:4318',
          origin: 'http://evil.example.com'
        }
      }),
      res,
      allowedHosts: new Set(['127.0.0.1']),
      issueSession: () => ({ token: 'unused', expiresAt: 'unused' }),
      isLoopbackAddress: () => true
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(403);
    expect(state.body).toMatchObject({ error: 'origin_not_allowed' });
  });

  it('issues a no-store session token payload on success', () => {
    const { res, state } = createResponseRecorder();
    const issueSession = vi.fn(() => ({
      token: 'session-token',
      expiresAt: '2026-03-07T06:30:00.000Z'
    }));

    const handled = handleUiSessionRequest({
      req: createRequest({
        method: 'POST',
        headers: {
          host: '127.0.0.1:4318',
          origin: 'http://127.0.0.1:4318'
        }
      }),
      res,
      allowedHosts: new Set(['127.0.0.1']),
      issueSession,
      isLoopbackAddress: () => true
    });

    expect(handled).toBe(true);
    expect(issueSession).toHaveBeenCalledTimes(1);
    expect(state.statusCode).toBe(200);
    expect(state.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    expect(state.body).toMatchObject({
      token: 'session-token',
      expires_at: '2026-03-07T06:30:00.000Z'
    });
  });
});
