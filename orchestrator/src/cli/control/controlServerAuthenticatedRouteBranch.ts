import type http from 'node:http';

import type { ControlRequestContext, ControlPresenterContext } from './controlRequestContext.js';
import type { ControlRuntimeSnapshot } from './controlRuntime.js';
import { admitAuthenticatedControlRoute } from './authenticatedControlRouteGate.js';
import { handleAuthenticatedRouteRequest } from './authenticatedRouteController.js';
import { createControlAuthenticatedRouteContext } from './controlAuthenticatedRouteHandoff.js';

export interface ControlAuthenticatedRouteBranchContext {
  pathname: string;
  req: http.IncomingMessage;
  res: http.ServerResponse;
  context: ControlRequestContext;
  runtimeSnapshot: ControlRuntimeSnapshot;
  presenterContext: ControlPresenterContext;
}

export async function handleControlAuthenticatedRouteBranch(
  input: ControlAuthenticatedRouteBranchContext
): Promise<void> {
  const auth = admitAuthenticatedControlRoute({
    req: input.req,
    res: input.res,
    pathname: input.pathname,
    controlToken: input.context.token,
    isSessionTokenValid: (token) => input.context.sessionTokens.validate(token)
  });
  if (!auth) {
    return;
  }

  const handled = await handleAuthenticatedRouteRequest(
    createControlAuthenticatedRouteContext({
      pathname: input.pathname,
      authKind: auth.kind,
      req: input.req,
      res: input.res,
      context: input.context,
      runtimeSnapshot: input.runtimeSnapshot,
      presenterContext: input.presenterContext
    })
  );

  if (handled) {
    return;
  }

  input.res.writeHead(404, { 'Content-Type': 'application/json' });
  input.res.end(JSON.stringify({ error: 'not_found' }));
}
