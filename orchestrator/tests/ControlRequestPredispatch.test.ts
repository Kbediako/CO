import http from 'node:http';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildControlPresenterRuntimeContext } from '../src/cli/control/controlRequestContext.js';
import { buildControlRequestRouteDispatchInput } from '../src/cli/control/controlRequestPredispatch.js';

vi.mock('../src/cli/control/controlRequestContext.js', async () => {
  const actual = await vi.importActual('../src/cli/control/controlRequestContext.js');
  return {
    ...actual,
    buildControlPresenterRuntimeContext: vi.fn()
  };
});

function createContext(overrides?: {
  req?: http.IncomingMessage | null;
  res?: http.ServerResponse | null;
}) {
  return {
    req:
      overrides && 'req' in overrides
        ? overrides.req
        : ({
            method: 'GET',
            url: '/api/v1/state?view=compact',
            headers: {}
          } as unknown as http.IncomingMessage),
    res:
      overrides && 'res' in overrides
        ? overrides.res
        : ({
            writeHead: vi.fn(),
            end: vi.fn()
          } as unknown as http.ServerResponse),
    controlStore: { kind: 'control-store' },
    paths: { kind: 'paths' },
    runtime: { kind: 'runtime' }
  } as never;
}

describe('buildControlRequestRouteDispatchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildControlPresenterRuntimeContext).mockReturnValue({
      runtimeSnapshot: { kind: 'runtime-snapshot' } as never,
      presenterContext: { kind: 'presenter-context' } as never
    });
  });

  it('returns null when the request shell is incomplete', () => {
    expect(buildControlRequestRouteDispatchInput(createContext({ req: null }))).toBeNull();
    expect(buildControlRequestRouteDispatchInput(createContext({ res: null }))).toBeNull();
    expect(buildControlPresenterRuntimeContext).not.toHaveBeenCalled();
  });

  it('builds the route-dispatch input from a live request context', () => {
    const context = createContext();

    const result = buildControlRequestRouteDispatchInput(context);

    expect(buildControlPresenterRuntimeContext).toHaveBeenCalledWith(context);
    expect(result).toEqual({
      pathname: '/api/v1/state',
      search: '?view=compact',
      req: context.req,
      res: context.res,
      context,
      runtimeSnapshot: { kind: 'runtime-snapshot' },
      presenterContext: { kind: 'presenter-context' }
    });
  });
});
