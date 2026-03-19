import type { ControlRequestContext } from './controlRequestContext.js';
import { buildControlPresenterRuntimeContext } from './controlRequestContext.js';
import type { ControlRequestRouteDispatchInput } from './controlRequestRouteDispatch.js';

export function buildControlRequestRouteDispatchInput(
  context: ControlRequestContext
): ControlRequestRouteDispatchInput | null {
  if (!context.req || !context.res) {
    return null;
  }

  const url = new URL(context.req.url ?? '/', 'http://localhost');
  const { runtimeSnapshot, presenterContext } = buildControlPresenterRuntimeContext(context);
  return {
    pathname: url.pathname,
    search: url.search ? url.search : '',
    req: context.req,
    res: context.res,
    context,
    runtimeSnapshot,
    presenterContext
  };
}
