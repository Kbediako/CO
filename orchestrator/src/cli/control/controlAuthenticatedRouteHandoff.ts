import http from 'node:http';
import { basename, dirname } from 'node:path';

import type { ControlRequestContext, ControlPresenterContext } from './controlRequestContext.js';
import type { ControlRuntimeSnapshot } from './controlRuntime.js';
import type { AuthenticatedRouteCompositionContext } from './authenticatedRouteComposition.js';
import { createControlQuestionChildResolutionAdapter } from './controlQuestionChildResolution.js';
import {
  emitControlActionAuditEvent,
  emitDispatchPilotAuditEvents,
  writeControlError
} from './controlServerAuditAndErrorHelpers.js';
import { runProviderIssueHandoffRefresh } from './controlServerPublicLifecycle.js';
import { readJsonBody } from './controlServerRequestBodyHelpers.js';

export interface ControlAuthenticatedRouteHandoffInput {
  pathname: string;
  authKind: 'control' | 'session';
  req: http.IncomingMessage;
  res: http.ServerResponse;
  context: ControlRequestContext;
  runtimeSnapshot: ControlRuntimeSnapshot;
  presenterContext: ControlPresenterContext;
}

export function createControlAuthenticatedRouteContext(
  input: ControlAuthenticatedRouteHandoffInput
): AuthenticatedRouteCompositionContext {
  const questionChildResolutionAdapter = createControlQuestionChildResolutionAdapter(input.context);

  return {
    pathname: input.pathname,
    method: input.req.method,
    authKind: input.authKind,
    req: input.req,
    res: input.res,
    clients: input.context.clients,
    presenterContext: input.presenterContext,
    confirmAutoPause: input.context.config.confirm.autoPause,
    taskId: resolveTaskIdFromManifestPath(input.context.paths.manifestPath),
    manifestPath: input.context.paths.manifestPath,
    controlStore: input.context.controlStore,
    confirmationStore: input.context.confirmationStore,
    questionQueue: input.context.questionQueue,
    delegationTokens: input.context.delegationTokens,
    persist: input.context.persist,
    runtime: input.context.runtime,
    refreshProviderIssues: () =>
      input.context.providerIssueHandoff
        ? runProviderIssueHandoffRefresh(input.context.providerIssueHandoff, {
            queueIfBusy: true
          })
        : Promise.resolve(),
    readRequestBody: () => readJsonBody(input.req),
    readDispatchEvaluation: () => input.runtimeSnapshot.readDispatchEvaluation(),
    onDispatchEvaluated: (record) => emitDispatchPilotAuditEvents(input.context, record),
    emitControlEvent: (eventInput) => input.context.eventTransport.emitControlEvent(eventInput),
    emitControlActionAuditEvent: (auditInput) => emitControlActionAuditEvent(input.context, auditInput),
    writeControlError: (status, error, traceability) =>
      writeControlError(input.res, status, error, traceability),
    expireConfirmations: () =>
      input.context.expiryLifecycle?.expireConfirmations() ?? Promise.resolve(),
    expireQuestions: () =>
      input.context.expiryLifecycle?.expireQuestions(questionChildResolutionAdapter) ?? Promise.resolve(),
    queueQuestionResolutions: (records) =>
      questionChildResolutionAdapter.queueQuestionResolutions(records),
    readDelegationHeaders: () => questionChildResolutionAdapter.readDelegationHeaders(input.req),
    validateDelegation: (delegationAuth) =>
      questionChildResolutionAdapter.validateDelegation(delegationAuth),
    resolveManifestPath: (rawPath) => questionChildResolutionAdapter.resolveManifestPath(rawPath),
    readManifest: (path) => questionChildResolutionAdapter.readManifest(path),
    resolveChildQuestion: (record, outcome) =>
      questionChildResolutionAdapter.resolveChildQuestion(record, outcome)
  };
}

function resolveTaskIdFromManifestPath(manifestPath: string): string | null {
  const runDir = dirname(manifestPath);
  const cliDir = dirname(runDir);
  if (basename(cliDir) !== 'cli') {
    return null;
  }
  const taskDir = dirname(cliDir);
  const taskId = basename(taskDir);
  return taskId || null;
}
