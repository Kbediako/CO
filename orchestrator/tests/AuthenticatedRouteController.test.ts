import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleAuthenticatedRouteRequest } from '../src/cli/control/authenticatedRouteController.js';
import { createAuthenticatedRouteDispatcherContext } from '../src/cli/control/authenticatedRouteComposition.js';
import { handleAuthenticatedRouteDispatcher } from '../src/cli/control/authenticatedRouteDispatcher.js';

vi.mock('../src/cli/control/authenticatedRouteComposition.js', () => ({
  createAuthenticatedRouteDispatcherContext: vi.fn()
}));

vi.mock('../src/cli/control/authenticatedRouteDispatcher.js', () => ({
  handleAuthenticatedRouteDispatcher: vi.fn(async () => false)
}));

function createContext(): Parameters<typeof handleAuthenticatedRouteRequest>[0] {
  return {
    pathname: '/api/v1/state',
    method: 'GET',
    authKind: 'control',
    req: {
      method: 'GET',
      url: '/api/v1/state',
      headers: {}
    } as unknown as http.IncomingMessage,
    res: {
      writeHead: vi.fn(),
      end: vi.fn()
    } as unknown as http.ServerResponse
  } as unknown as Parameters<typeof handleAuthenticatedRouteRequest>[0];
}

describe('AuthenticatedRouteController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the authenticated dispatcher context before dispatching', async () => {
    const context = createContext();
    const dispatcherContext = { pathname: '/api/v1/state', method: 'GET', authKind: 'control' };
    vi.mocked(createAuthenticatedRouteDispatcherContext).mockReturnValue(dispatcherContext as never);
    vi.mocked(handleAuthenticatedRouteDispatcher).mockResolvedValue(true);

    const handled = await handleAuthenticatedRouteRequest(context);

    expect(createAuthenticatedRouteDispatcherContext).toHaveBeenCalledWith(context);
    expect(handleAuthenticatedRouteDispatcher).toHaveBeenCalledWith(dispatcherContext);
    expect(handled).toBe(true);
  });

  it('returns the dispatcher handled flag without owning fallback writes', async () => {
    const context = createContext();
    const dispatcherContext = { pathname: '/protected/not-here', method: 'GET', authKind: 'control' };
    vi.mocked(createAuthenticatedRouteDispatcherContext).mockReturnValue(dispatcherContext as never);
    vi.mocked(handleAuthenticatedRouteDispatcher).mockResolvedValue(false);

    const handled = await handleAuthenticatedRouteRequest(context);

    expect(handled).toBe(false);
    expect(context.res.writeHead).not.toHaveBeenCalled();
    expect(context.res.end).not.toHaveBeenCalled();
  });
});
