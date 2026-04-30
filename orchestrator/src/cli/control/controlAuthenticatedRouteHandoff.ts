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
import {
  type ProviderIssueHandoffRefreshRequestOutcome,
  runProviderIssueHandoffRecover,
  runProviderIssueHandoffRefresh
} from './controlServerPublicLifecycle.js';
import { readJsonBody } from './controlServerRequestBodyHelpers.js';
import type { ProviderIssueRecoveryAction } from './providerIssueHandoff.js';
import {
  buildProviderIssueKey,
  readProviderIntakeClaim,
  type ProviderIntakeClaimRecord
} from './providerIntakeState.js';

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
  const providerIssueHandoff = input.context.providerIssueHandoff;

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
    refreshProviderIssues: (): Promise<ProviderIssueHandoffRefreshRequestOutcome | null> =>
      providerIssueHandoff
        ? runProviderIssueHandoffRefresh(providerIssueHandoff, {
            queueIfBusy: true,
            acknowledgeAccepted: true,
            allowIdleRestartRequiredRetry: true
          })
        : Promise.resolve(null),
    ...(
      providerIssueHandoff
        ? {
            requestProviderWorkerRecover: (recoverInput: {
              provider: 'linear';
              issueId: string;
              action: ProviderIssueRecoveryAction;
            }) =>
              runProviderIssueHandoffRecover(providerIssueHandoff, recoverInput),
            readProviderWorkerRecoverAccepted: (recoverInput: {
              provider: 'linear';
              issueId: string;
              action: ProviderIssueRecoveryAction;
              requestedAt: string;
            }) =>
              readProviderWorkerRecoverAcceptedClaim(
                input.context.readPersistedProviderIntakeState?.() ?? null,
                recoverInput
              )
          }
        : {}
    ),
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

function readProviderWorkerRecoverAcceptedClaim(
  state: Parameters<typeof readProviderIntakeClaim>[0] | null | undefined,
  input: {
    provider: 'linear';
    issueId: string;
    action: ProviderIssueRecoveryAction;
    requestedAt: string;
  }
) {
  if (!state) {
    return null;
  }
  const normalizedProvider = input.provider.trim().toLowerCase();
  const normalizedIssueId = input.issueId.trim().toLowerCase();
  const providerKey = buildProviderIssueKey(input.provider, input.issueId);
  const normalizedProviderKey = buildProviderIssueKey(input.provider, normalizedIssueId);
  const claim =
    readProviderIntakeClaim(state, providerKey) ??
    readProviderIntakeClaim(state, normalizedProviderKey) ??
    state.claims.find((candidate) =>
      candidate.provider.trim().toLowerCase() === normalizedProvider &&
      (
        normalizeOptionalString(candidate.issue_id)?.toLowerCase() === normalizedIssueId ||
        normalizeOptionalString(candidate.issue_identifier)?.toLowerCase() === normalizedIssueId
      )
    ) ??
    null;
  if (!claim || !isFreshControlHostProviderWorkerRecoverClaim(claim, input)) {
    return null;
  }
  return {
    issue_id: claim.issue_id,
    issue_identifier: normalizeOptionalString(claim.issue_identifier),
    state: claim.state,
    reason: normalizeOptionalString(claim.reason),
    launch_source: claim.launch_source ?? null,
    launch_token_present: normalizeOptionalString(claim.launch_token) !== null,
    updated_at: normalizeOptionalString(claim.updated_at)
  };
}

function isFreshControlHostProviderWorkerRecoverClaim(
  claim: ProviderIntakeClaimRecord,
  input: {
    action: ProviderIssueRecoveryAction;
    requestedAt: string;
  }
): boolean {
  if (
    claim.state !== 'starting' &&
    claim.state !== 'resuming' &&
    claim.state !== 'running'
  ) {
    return false;
  }
  if (
    claim.last_event !== 'control_host_provider_worker_recover' ||
    claim.last_action !== input.action ||
    claim.launch_source !== 'control-host' ||
    normalizeOptionalString(claim.launch_token) === null
  ) {
    return false;
  }
  return compareOptionalIsoTimestamp(claim.updated_at, input.requestedAt) >= 0;
}

function compareOptionalIsoTimestamp(left: string | null | undefined, right: string): number {
  const leftMs = Date.parse(left ?? '');
  const rightMs = Date.parse(right);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) {
    return -1;
  }
  return leftMs === rightMs ? 0 : leftMs > rightMs ? 1 : -1;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
