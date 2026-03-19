import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { admitAuthenticatedControlRoute } from '../src/cli/control/authenticatedControlRouteGate.js';
import { handleAuthenticatedRouteRequest } from '../src/cli/control/authenticatedRouteController.js';
import { createControlAuthenticatedRouteContext } from '../src/cli/control/controlAuthenticatedRouteHandoff.js';
import { handleControlAuthenticatedRouteBranch } from '../src/cli/control/controlServerAuthenticatedRouteBranch.js';

vi.mock('../src/cli/control/authenticatedControlRouteGate.js', () => ({
  admitAuthenticatedControlRoute: vi.fn()
}));

vi.mock('../src/cli/control/authenticatedRouteController.js', () => ({
  handleAuthenticatedRouteRequest: vi.fn()
}));

vi.mock('../src/cli/control/controlAuthenticatedRouteHandoff.js', () => ({
  createControlAuthenticatedRouteContext: vi.fn()
}));

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

describe('handleControlAuthenticatedRouteBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops when authenticated admission rejects the request', async () => {
    vi.mocked(admitAuthenticatedControlRoute).mockImplementation(({ res }) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return null;
    });
    const { res, state } = createResponseRecorder();

    await handleControlAuthenticatedRouteBranch({
      pathname: '/api/v1/state',
      req: { method: 'GET', headers: {} } as http.IncomingMessage,
      res,
      context: {
        token: 'control-token',
        sessionTokens: { validate: vi.fn(() => false) }
      } as never,
      runtimeSnapshot: {} as never,
      presenterContext: {} as never
    });

    expect(createControlAuthenticatedRouteContext).not.toHaveBeenCalled();
    expect(handleAuthenticatedRouteRequest).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(401);
    expect(state.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(state.body).toEqual({ error: 'unauthorized' });
  });

  it('forwards auth kind and request context through the existing handoff and dispatcher', async () => {
    vi.mocked(admitAuthenticatedControlRoute).mockReturnValue({
      kind: 'session',
      token: 'session-token'
    });
    vi.mocked(createControlAuthenticatedRouteContext).mockReturnValue({
      path: 'handoff'
    } as never);
    vi.mocked(handleAuthenticatedRouteRequest).mockResolvedValue(true);

    const req = { method: 'GET', headers: {} } as http.IncomingMessage;
    const { res, state } = createResponseRecorder();
    const context = {
      token: 'control-token',
      sessionTokens: { validate: vi.fn(() => true) }
    } as never;
    const runtimeSnapshot = { key: 'runtime' } as never;
    const presenterContext = { key: 'presenter' } as never;

    await handleControlAuthenticatedRouteBranch({
      pathname: '/api/v1/state',
      req,
      res,
      context,
      runtimeSnapshot,
      presenterContext
    });

    expect(createControlAuthenticatedRouteContext).toHaveBeenCalledWith({
      pathname: '/api/v1/state',
      authKind: 'session',
      req,
      res,
      context,
      runtimeSnapshot,
      presenterContext
    });
    expect(handleAuthenticatedRouteRequest).toHaveBeenCalledWith({
      path: 'handoff'
    });
    expect(state.statusCode).toBeNull();
    expect(state.body).toBeNull();
  });

  it('preserves the protected not_found fallback when the authenticated dispatcher returns false', async () => {
    vi.mocked(admitAuthenticatedControlRoute).mockReturnValue({
      kind: 'control',
      token: 'control-token'
    });
    vi.mocked(createControlAuthenticatedRouteContext).mockReturnValue({
      path: 'handoff'
    } as never);
    vi.mocked(handleAuthenticatedRouteRequest).mockResolvedValue(false);

    const { res, state } = createResponseRecorder();

    await handleControlAuthenticatedRouteBranch({
      pathname: '/protected/not-here',
      req: { method: 'GET', headers: {} } as http.IncomingMessage,
      res,
      context: {
        token: 'control-token',
        sessionTokens: { validate: vi.fn(() => false) }
      } as never,
      runtimeSnapshot: {} as never,
      presenterContext: {} as never
    });

    expect(state.statusCode).toBe(404);
    expect(state.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(state.body).toEqual({ error: 'not_found' });
  });
});
