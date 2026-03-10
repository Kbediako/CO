import type { ControlRequestContext } from './controlRequestContext.js';
import { buildControlRequestRouteDispatchInput } from './controlRequestPredispatch.js';
import { handleControlRequestRouteDispatch } from './controlRequestRouteDispatch.js';

export async function handleControlRequest(context: ControlRequestContext): Promise<void> {
  const dispatchInput = buildControlRequestRouteDispatchInput(context);
  if (!dispatchInput) {
    return;
  }
  await handleControlRequestRouteDispatch(dispatchInput);
}
