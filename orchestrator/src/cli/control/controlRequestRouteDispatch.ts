import http from 'node:http';

import type { ControlPresenterContext, ControlRequestContext } from './controlRequestContext.js';
import type { ControlRuntimeSnapshot } from './controlRuntime.js';
import { handleControlUiSessionAdmission } from './uiSessionController.js';
import { handleLinearWebhookRequest } from './linearWebhookController.js';
import { handleControlAuthenticatedRouteBranch } from './controlServerAuthenticatedRouteBranch.js';
import { emitLinearWebhookAuditEvent } from './controlServerAuditAndErrorHelpers.js';
import { handlePublicControlRoute } from './controlServerPublicRouteHelpers.js';
import { readRawBody } from './controlServerRequestBodyHelpers.js';

export interface ControlRequestRouteDispatchInput {
  pathname: string;
  search: string;
  req: http.IncomingMessage;
  res: http.ServerResponse;
  context: ControlRequestContext;
  runtimeSnapshot: ControlRuntimeSnapshot;
  presenterContext: ControlPresenterContext;
}

export async function handleControlRequestRouteDispatch(
  input: ControlRequestRouteDispatchInput
): Promise<void> {
  if (
    await handlePublicControlRoute({
      pathname: input.pathname,
      search: input.search,
      res: input.res
    })
  ) {
    return;
  }

  if (
    handleControlUiSessionAdmission({
      req: input.req,
      res: input.res,
      allowedBindHosts: input.context.config.ui.allowedBindHosts,
      issueSession: () => input.context.sessionTokens.issue()
    })
  ) {
    return;
  }

  if (
    await handleLinearWebhookRequest({
      req: input.req,
      res: input.res,
      linearAdvisoryState: input.context.linearAdvisoryState,
      readRawBody,
      persistLinearAdvisory: input.context.persist.linearAdvisory,
      emitAuditEvent: (auditInput) => emitLinearWebhookAuditEvent(input.context, auditInput),
      readFeatureToggles: () => input.context.controlStore.snapshot().feature_toggles,
      publishRuntime: () => input.context.runtime.publish({ source: 'linear.webhook' })
    })
  ) {
    return;
  }

  await handleControlAuthenticatedRouteBranch({
    pathname: input.pathname,
    req: input.req,
    res: input.res,
    context: input.context,
    runtimeSnapshot: input.runtimeSnapshot,
    presenterContext: input.presenterContext
  });
}
