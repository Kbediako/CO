import http from 'node:http';

import type { CliManifest } from '../types.js';
import type { ControlRuntime } from './controlRuntime.js';
import { handleObservabilityApiRequest } from './observabilityApiController.js';
import { handleUiDataRequest } from './uiDataController.js';
import { handleEventsSseRequest } from './eventsSseController.js';
import { handleQuestionQueueRequest } from './questionQueueController.js';
import { handleDelegationRegisterRequest } from './delegationRegisterController.js';
import { handleConfirmationListRequest } from './confirmationListController.js';
import { handleConfirmationCreateRequest } from './confirmationCreateController.js';
import { handleConfirmationApproveRequest } from './confirmationApproveController.js';
import { handleConfirmationIssueConsumeRequest } from './confirmationIssueConsumeController.js';
import { handleConfirmationValidateRequest } from './confirmationValidateController.js';
import { handleControlActionRequest } from './controlActionController.js';
import { handleSecurityViolationRequest } from './securityViolationController.js';
import { type AuthenticatedRouteDispatcherContext } from './authenticatedRouteDispatcher.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';
import type { ControlStateStore } from './controlState.js';
import type { ConfirmationStore } from './confirmations.js';
import type { QuestionRecord } from './questions.js';
import type { DelegationTokenStore } from './delegationTokens.js';

type PresenterContext =
  Parameters<typeof handleUiDataRequest>[0]['presenterContext'] &
  Parameters<typeof handleObservabilityApiRequest>[0]['presenterContext'];
type QuestionQueueContext = Parameters<typeof handleQuestionQueueRequest>[0]['questionQueue'];
type DelegationAuth = { token: string; childRunId: string };

interface AuthenticatedRouteCompositionPersist {
  control(): Promise<void>;
  confirmations(): Promise<void>;
  questions(): Promise<void>;
  delegationTokens(): Promise<void>;
}

interface AuthenticatedRouteCompositionRuntime {
  publish: ControlRuntime['publish'];
  requestRefresh: ControlRuntime['requestRefresh'];
}

interface AuthenticatedRouteCompositionControlStore
  extends Pick<ControlStateStore, 'snapshot' | 'updateAction' | 'isTransportNonceConsumed' | 'consumeTransportNonce' | 'rollbackTransportNonce'> {}

interface AuthenticatedRouteCompositionConfirmationStore
  extends Pick<ConfirmationStore, 'validateNonce' | 'create' | 'listPending' | 'approve' | 'get' | 'issue'> {}

export interface AuthenticatedRouteCompositionContext {
  pathname: string;
  method: string | undefined;
  authKind: 'control' | 'session';
  req: http.IncomingMessage;
  res: http.ServerResponse;
  clients: Set<http.ServerResponse>;
  presenterContext: PresenterContext;
  confirmAutoPause: boolean;
  taskId: string | null;
  manifestPath: string;
  controlStore: AuthenticatedRouteCompositionControlStore;
  confirmationStore: AuthenticatedRouteCompositionConfirmationStore;
  questionQueue: QuestionQueueContext;
  delegationTokens: DelegationTokenStore;
  persist: AuthenticatedRouteCompositionPersist;
  runtime: AuthenticatedRouteCompositionRuntime;
  refreshProviderIssues?(): Promise<void>;
  readRequestBody(): Promise<Record<string, unknown>>;
  readDispatchEvaluation(): Promise<{
    issueIdentifier: string | null;
    evaluation: DispatchPilotEvaluation;
  }>;
  onDispatchEvaluated(input: {
    surface: 'api_v1_dispatch' | 'telegram_dispatch';
    evaluation: DispatchPilotEvaluation;
    issueIdentifier: string | null;
  }): Promise<void>;
  emitControlEvent(input: {
    event: string;
    actor: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
  emitControlActionAuditEvent: Parameters<typeof handleControlActionRequest>[0]['emitControlActionAuditEvent'];
  writeControlError: Parameters<typeof handleControlActionRequest>[0]['writeControlError'];
  expireConfirmations(): Promise<void>;
  expireQuestions(): Promise<void>;
  queueQuestionResolutions(records: QuestionRecord[]): void;
  readDelegationHeaders(): DelegationAuth | null;
  validateDelegation(auth: DelegationAuth): boolean;
  resolveManifestPath(rawPath: string): string;
  readManifest(path: string): Promise<Pick<CliManifest, 'run_id'> | null>;
  resolveChildQuestion(record: QuestionRecord, outcome: QuestionRecord['status'] | 'expired'): Promise<void>;
}

export function createAuthenticatedRouteDispatcherContext(
  context: AuthenticatedRouteCompositionContext
): AuthenticatedRouteDispatcherContext {
  return {
    pathname: context.pathname,
    method: context.method,
    authKind: context.authKind,
    handleEventsSse: () =>
      handleEventsSseRequest({
        req: context.req,
        res: context.res,
        clients: context.clients
      }),
    handleUiData: () =>
      handleUiDataRequest({
        req: context.req,
        res: context.res,
        presenterContext: context.presenterContext
      }),
    handleObservabilityApi: () =>
      handleObservabilityApiRequest({
        req: context.req,
        res: context.res,
        presenterContext: context.presenterContext,
        readRequestBody: context.readRequestBody,
        requestRefresh: async () => {
          await context.refreshProviderIssues?.();
          await context.runtime.requestRefresh();
        },
        readDispatchEvaluation: () => context.readDispatchEvaluation(),
        onDispatchEvaluated: (record) => context.onDispatchEvaluated(record)
      }),
    handleControlAction: (authKind) =>
      handleControlActionRequest({
        authKind,
        taskId: context.taskId,
        manifestPath: context.manifestPath,
        readRequestBody: context.readRequestBody,
        readInitialSnapshot: () => context.controlStore.snapshot(),
        isTransportNonceConsumed: (nonce) => context.controlStore.isTransportNonceConsumed(nonce),
        validateConfirmation: (validationInput) =>
          context.confirmationStore.validateNonce(validationInput),
        persistConfirmations: () => context.persist.confirmations(),
        emitConfirmationResolved: (payload) =>
          context.emitControlEvent({
            event: 'confirmation_resolved',
            actor: 'runner',
            payload
          }),
        readSnapshot: () => context.controlStore.snapshot(),
        updateAction: (updateInput) => context.controlStore.updateAction(updateInput),
        persistControlAction: async (input) => {
          if (!input.transportMutation) {
            await context.persist.control();
            return;
          }
          context.controlStore.consumeTransportNonce({
            nonce: input.transportMutation.nonce,
            action: input.action,
            transport: input.transportMutation.transport,
            requestId: input.requestId ?? null,
            intentId: input.intentId,
            expiresAt: input.transportMutation.nonceExpiresAt
          });
          try {
            await context.persist.control();
          } catch (error) {
            context.controlStore.rollbackTransportNonce(input.transportMutation.nonce);
            throw error;
          }
        },
        publishRuntime: (source) => context.runtime.publish({ source }),
        emitControlActionAuditEvent: context.emitControlActionAuditEvent,
        writeControlError: context.writeControlError,
        writeControlResponse: (response) => {
          context.res.writeHead(response.status, { 'Content-Type': 'application/json' });
          context.res.end(JSON.stringify(response.body));
        }
      }),
    handleConfirmationCreate: () =>
      handleConfirmationCreateRequest({
        req: context.req,
        res: context.res,
        authKind: context.authKind,
        readRequestBody: context.readRequestBody,
        expireConfirmations: context.expireConfirmations,
        createConfirmation: ({ action, tool, params }) =>
          context.confirmationStore.create({ action, tool, params }),
        persistConfirmations: () => context.persist.confirmations(),
        maybeAutoPause: async (requestId) => {
          if (!context.confirmAutoPause) {
            return;
          }
          const latestAction = context.controlStore.snapshot().latest_action?.action ?? null;
          if (latestAction === 'pause') {
            return;
          }
          context.controlStore.updateAction({
            action: 'pause',
            requestedBy: 'runner',
            requestId,
            reason: 'confirmation_required'
          });
          await context.persist.control();
          context.runtime.publish({ source: 'control.action' });
        },
        readRunId: () => context.controlStore.snapshot().run_id,
        emitConfirmationRequired: (payload) =>
          context.emitControlEvent({
            event: 'confirmation_required',
            actor: 'runner',
            payload
          })
      }),
    handleConfirmationList: () =>
      handleConfirmationListRequest({
        req: context.req,
        res: context.res,
        expireConfirmations: context.expireConfirmations,
        listPendingConfirmations: () => context.confirmationStore.listPending()
      }),
    handleConfirmationApprove: () =>
      handleConfirmationApproveRequest({
        req: context.req,
        res: context.res,
        readRequestBody: context.readRequestBody,
        expireConfirmations: context.expireConfirmations,
        approveConfirmation: (requestId, actor) => context.confirmationStore.approve(requestId, actor),
        readConfirmation: (requestId) => context.confirmationStore.get(requestId),
        persistConfirmations: () => context.persist.confirmations(),
        issueConfirmation: (requestId) => context.confirmationStore.issue(requestId),
        validateConfirmation: (input) =>
          context.confirmationStore.validateNonce({
            confirmNonce: input.confirmNonce,
            tool: input.tool,
            params: input.params
          }),
        emitConfirmationResolved: (payload) =>
          context.emitControlEvent({
            event: 'confirmation_resolved',
            actor: 'runner',
            payload
          }),
        updateControlAction: (input) =>
          context.controlStore.updateAction({
            action: input.action,
            requestedBy: input.requestedBy,
            requestId: input.requestId
          }),
        persistControl: () => context.persist.control(),
        publishRuntime: () => context.runtime.publish({ source: 'control.action' })
      }),
    handleConfirmationIssueConsume: () =>
      handleConfirmationIssueConsumeRequest({
        req: context.req,
        res: context.res,
        readRequestBody: context.readRequestBody,
        expireConfirmations: context.expireConfirmations,
        issueConfirmation: (requestId) => context.confirmationStore.issue(requestId),
        persistConfirmations: () => context.persist.confirmations()
      }),
    handleConfirmationValidate: () =>
      handleConfirmationValidateRequest({
        req: context.req,
        res: context.res,
        readRequestBody: context.readRequestBody,
        expireConfirmations: context.expireConfirmations,
        validateConfirmation: ({ confirmNonce, tool, params }) =>
          context.confirmationStore.validateNonce({ confirmNonce, tool, params }),
        persistConfirmations: () => context.persist.confirmations(),
        emitConfirmationResolved: (payload) =>
          context.emitControlEvent({
            event: 'confirmation_resolved',
            actor: 'runner',
            payload
          })
      }),
    handleSecurityViolation: () =>
      handleSecurityViolationRequest({
        req: context.req,
        res: context.res,
        readRequestBody: context.readRequestBody,
        emitSecurityViolation: (payload) =>
          context.emitControlEvent({
            event: 'security_violation',
            actor: 'runner',
            payload
          })
      }),
    handleDelegationRegister: () =>
      handleDelegationRegisterRequest({
        req: context.req,
        res: context.res,
        delegationTokens: context.delegationTokens,
        readRequestBody: context.readRequestBody,
        persistDelegationTokens: () => context.persist.delegationTokens()
      }),
    handleQuestionQueue: () =>
      handleQuestionQueueRequest({
        req: context.req,
        res: context.res,
        questionQueue: context.questionQueue,
        readRequestBody: context.readRequestBody,
        expireQuestions: context.expireQuestions,
        queueQuestionResolutions: context.queueQuestionResolutions,
        readDelegationHeaders: context.readDelegationHeaders,
        validateDelegation: context.validateDelegation,
        resolveManifestPath: context.resolveManifestPath,
        readManifest: context.readManifest,
        getParentRunId: () => context.controlStore.snapshot().run_id,
        persistQuestions: () => context.persist.questions(),
        resolveChildQuestion: context.resolveChildQuestion,
        emitQuestionQueued: (record) =>
          context.emitControlEvent({
            event: 'question_queued',
            actor: 'delegate',
            payload: {
              question_id: record.question_id,
              parent_run_id: record.parent_run_id,
              from_run_id: record.from_run_id,
              prompt: record.prompt,
              urgency: record.urgency,
              queued_at: record.queued_at,
              expires_at: record.expires_at ?? null,
              expires_in_ms: record.expires_in_ms ?? null
            }
          }),
        emitQuestionAnswered: async (record) => {
          await context.emitControlEvent({
            event: 'question_answered',
            actor: 'user',
            payload: {
              question_id: record.question_id,
              parent_run_id: record.parent_run_id,
              answer: record.answer,
              answered_by: record.answered_by,
              answered_at: record.answered_at
            }
          });
          await context.emitControlEvent({
            event: 'question_closed',
            actor: 'runner',
            payload: {
              question_id: record.question_id,
              parent_run_id: record.parent_run_id,
              outcome: record.status,
              closed_at: record.closed_at,
              expires_at: record.expires_at ?? null
            }
          });
        },
        emitQuestionDismissed: (record) =>
          context.emitControlEvent({
            event: 'question_closed',
            actor: 'user',
            payload: {
              question_id: record.question_id,
              parent_run_id: record.parent_run_id,
              outcome: record.status,
              closed_at: record.closed_at,
              expires_at: record.expires_at ?? null
            }
          }),
        publishRuntime: (source) => context.runtime.publish({ source })
      })
  };
}
