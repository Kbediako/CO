import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { admitAuthenticatedControlRoute } from '../src/cli/control/authenticatedControlRouteGate.js';

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
  input: Partial<Pick<http.IncomingMessage, 'method' | 'headers'>> = {}
): http.IncomingMessage {
  return {
    method: input.method ?? 'GET',
    headers: input.headers ?? {}
  } as http.IncomingMessage;
}

function createContext(
  input: Partial<Omit<Parameters<typeof admitAuthenticatedControlRoute>[0], 'res' | 'req'>> & {
    req?: http.IncomingMessage;
  } = {}
) {
  const { res, state } = createResponseRecorder();
  const context: Parameters<typeof admitAuthenticatedControlRoute>[0] = {
    req: input.req ?? createRequest(),
    res,
    pathname: input.pathname ?? '/api/v1/state',
    controlToken: input.controlToken ?? 'control-token',
    isSessionTokenValid: input.isSessionTokenValid ?? ((token) => token === 'session-token')
  };

  return { context, state };
}

describe('AuthenticatedControlRouteGate', () => {
  it('rejects missing bearer tokens with unauthorized', () => {
    const { context, state } = createContext({
      req: createRequest({
        method: 'GET',
        headers: {}
      })
    });

    expect(admitAuthenticatedControlRoute(context)).toBeNull();
    expect(state.statusCode).toBe(401);
    expect(state.body).toEqual({ error: 'unauthorized' });
  });

  it('rejects protected mutations with missing csrf headers', () => {
    const { context, state } = createContext({
      req: createRequest({
        method: 'POST',
        headers: {
          authorization: 'Bearer control-token'
        }
      })
    });

    expect(admitAuthenticatedControlRoute(context)).toBeNull();
    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'csrf_invalid' });
  });

  it('rejects session tokens on runner-only endpoints', () => {
    const { context, state } = createContext({
      pathname: '/questions/enqueue',
      req: createRequest({
        method: 'POST',
        headers: {
          authorization: 'Bearer session-token',
          'x-csrf-token': 'session-token'
        }
      })
    });

    expect(admitAuthenticatedControlRoute(context)).toBeNull();
    expect(state.statusCode).toBe(403);
    expect(state.body).toEqual({ error: 'runner_only' });
  });

  it('admits control tokens on runner-only endpoints', () => {
    const { context, state } = createContext({
      pathname: '/questions/enqueue',
      req: createRequest({
        method: 'POST',
        headers: {
          authorization: 'Bearer control-token',
          'x-csrf-token': 'control-token'
        }
      })
    });

    expect(admitAuthenticatedControlRoute(context)).toEqual({
      token: 'control-token',
      kind: 'control'
    });
    expect(state.statusCode).toBeNull();
    expect(state.body).toBeNull();
  });

  it('admits session GET requests without csrf enforcement', () => {
    const { context, state } = createContext({
      req: createRequest({
        method: 'GET',
        headers: {
          authorization: 'Bearer session-token'
        }
      })
    });

    expect(admitAuthenticatedControlRoute(context)).toEqual({
      token: 'session-token',
      kind: 'session'
    });
    expect(state.statusCode).toBeNull();
    expect(state.body).toBeNull();
  });
});
