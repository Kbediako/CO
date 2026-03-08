import type { ConfirmationValidationResult } from './confirmations.js';
import { resolveControlActionControllerSequencing } from './controlActionControllerSequencing.js';
import {
  normalizeControlActionRequest,
  type ControlActionAuthKind,
  type TransportMutationRequest
} from './controlActionPreflight.js';
import type { ControlActionSuccessResponse } from './controlActionOutcome.js';
import type {
  ControlAction,
  ControlState,
  TransportActionContext,
  TransportIdempotencyEntry
} from './controlState.js';

export interface ControlActionControllerContext {
  authKind: ControlActionAuthKind;
  taskId: string | null;
  manifestPath: string;
  readRequestBody(): Promise<Record<string, unknown>>;
  readInitialSnapshot(): ControlState;
  isTransportNonceConsumed(nonce: string): boolean;
  validateConfirmation(input: {
    confirmNonce: string;
    tool: string;
    params: Record<string, unknown>;
  }): ConfirmationValidationResult;
  persistConfirmations(): Promise<void>;
  emitConfirmationResolved(payload: {
    request_id: string;
    nonce_id: string;
    outcome: 'approved';
  }): Promise<void>;
  readSnapshot(): ControlState;
  updateAction(input: {
    action: ControlAction['action'];
    requestedBy: string;
    requestId?: string | null;
    intentId?: string | null;
    reason?: string | null;
    transportContext?: TransportActionContext;
  }): {
    snapshot: ControlState;
    idempotentReplay: boolean;
    replayEntry?: TransportIdempotencyEntry | null;
  };
  persistControlAction(input: {
    action: ControlAction['action'];
    requestId: string | null;
    intentId: string | null;
    transportMutation: TransportMutationRequest | null;
  }): Promise<void>;
  publishRuntime(source: 'control.action'): void;
  emitControlActionAuditEvent(input: {
    outcome: 'applied' | 'replayed';
    action: ControlAction['action'];
    requestedBy: string;
    reason: string | null;
    requestId: string | null;
    intentId: string | null;
    snapshot: ControlState;
    traceability?: Record<string, unknown> | null;
  }): Promise<void>;
  writeControlError(
    status: number,
    error: string,
    traceability?: Record<string, unknown>
  ): void;
  writeControlResponse(response: ControlActionSuccessResponse): void;
}

export async function handleControlActionRequest(
  context: ControlActionControllerContext
): Promise<void> {
  const body = await context.readRequestBody();
  const snapshot = context.readInitialSnapshot();
  const normalized = normalizeControlActionRequest({
    body,
    authKind: context.authKind,
    snapshot,
    taskId: context.taskId,
    manifestPath: context.manifestPath
  });
  if (!normalized.ok) {
    context.writeControlError(normalized.status, normalized.error, normalized.traceability);
    return;
  }

  const { action, requestedBy, reason } = normalized.value;
  const tool = readStringValue(body, 'tool') ?? 'delegate.cancel';
  const params = readRecordValue(body, 'params') ?? {};
  const sequencing = await resolveControlActionControllerSequencing({
    body,
    tool,
    params,
    snapshot,
    taskId: context.taskId,
    manifestPath: context.manifestPath,
    normalized: normalized.value,
    isTransportNonceConsumed: context.isTransportNonceConsumed,
    validateConfirmation: context.validateConfirmation,
    persistConfirmations: context.persistConfirmations,
    emitConfirmationResolved: context.emitConfirmationResolved,
    readSnapshot: context.readSnapshot,
    updateAction: context.updateAction
  });
  if (sequencing.kind === 'error') {
    context.writeControlError(sequencing.status, sequencing.error, sequencing.traceability);
    return;
  }

  if (sequencing.plan.persistRequired) {
    await context.persistControlAction({
      action,
      requestId: sequencing.requestId,
      intentId: sequencing.intentId,
      transportMutation: sequencing.transportMutation
    });
  }
  if (sequencing.plan.publishRequired) {
    context.publishRuntime('control.action');
  }
  await context.emitControlActionAuditEvent({
    outcome: sequencing.plan.response.outcome,
    action,
    requestedBy,
    reason: reason ?? null,
    requestId: sequencing.plan.response.requestId,
    intentId: sequencing.plan.response.intentId,
    snapshot: sequencing.plan.snapshot,
    traceability: sequencing.plan.response.traceability
  });
  context.writeControlResponse(sequencing.plan.response);
}

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readRecordValue(
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const value = record[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
