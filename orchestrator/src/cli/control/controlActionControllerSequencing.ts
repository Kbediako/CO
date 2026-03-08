import type { ConfirmationValidationResult } from './confirmations.js';
import {
  resolveCancelConfirmation
} from './controlActionCancelConfirmation.js';
import {
  executeControlAction,
  resolveControlActionReplay
} from './controlActionExecution.js';
import {
  buildExecutionControlActionFinalizationPlan,
  buildReplayControlActionFinalizationPlan,
  type ControlActionFinalizationPlan
} from './controlActionFinalization.js';
import {
  validateTransportMutationPreflight,
  type NormalizedControlActionRequest,
  type TransportMutationRequest
} from './controlActionPreflight.js';
import type {
  ControlAction,
  ControlState,
  TransportActionContext,
  TransportIdempotencyEntry
} from './controlState.js';

export type ControlActionControllerSequencingResult =
  | {
      kind: 'error';
      status: number;
      error: string;
      traceability?: Record<string, unknown>;
    }
  | {
      kind: 'finalize';
      requestId: string | null;
      intentId: string | null;
      transportMutation: TransportMutationRequest | null;
      plan: ControlActionFinalizationPlan;
    };

export async function resolveControlActionControllerSequencing(input: {
  body: Record<string, unknown>;
  tool: string;
  params: Record<string, unknown>;
  snapshot: ControlState;
  taskId: string | null;
  manifestPath: string;
  normalized: NormalizedControlActionRequest;
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
}): Promise<ControlActionControllerSequencingResult> {
  const { normalized } = input;
  let requestId = normalized.requestId;
  let intentId = normalized.intentId;
  let transportMutation = normalized.transportMutation;
  let isTransportMutation = Boolean(transportMutation);

  const transportPreflight = validateTransportMutationPreflight({
    action: normalized.action,
    requestId,
    intentId,
    taskId: input.taskId,
    snapshot: input.snapshot,
    manifestPath: input.manifestPath,
    transportMutation,
    isTransportNonceConsumed: input.isTransportNonceConsumed
  });
  if (!transportPreflight.ok) {
    return {
      kind: 'error',
      status: transportPreflight.status,
      error: transportPreflight.error,
      traceability: transportPreflight.traceability
    };
  }

  if (normalized.action === 'cancel' && !normalized.deferTransportResolutionToConfirmation) {
    const replaySnapshot = input.readSnapshot();
    const replay = resolveControlActionReplay({
      snapshot: replaySnapshot,
      action: normalized.action,
      requestId,
      intentId,
      taskId: input.taskId,
      manifestPath: input.manifestPath,
      transportMutation,
      isTransportMutation
    });
    if (replay.matched) {
      return {
        kind: 'finalize',
        requestId: replay.requestId,
        intentId: replay.intentId,
        transportMutation,
        plan: buildReplayControlActionFinalizationPlan({
          snapshot: replaySnapshot,
          requestId: replay.requestId,
          intentId: replay.intentId,
          traceability: replay.traceability,
          persistRequired: true
        })
      };
    }
  }

  if (normalized.action === 'cancel') {
    if (!normalized.confirmNonce) {
      return { kind: 'error', status: 409, error: 'confirmation_required' };
    }
    const cancelResolution = await resolveCancelConfirmation({
      body: input.body,
      tool: input.tool,
      params: input.params,
      confirmNonce: normalized.confirmNonce,
      currentIntentId: intentId,
      snapshot: input.snapshot,
      taskId: input.taskId,
      manifestPath: input.manifestPath,
      validateNonce: input.validateConfirmation,
      persistConfirmations: input.persistConfirmations,
      emitConfirmationResolved: input.emitConfirmationResolved
    });
    if (!cancelResolution.ok) {
      return {
        kind: 'error',
        status: cancelResolution.status,
        error: cancelResolution.error,
        traceability: cancelResolution.traceability
      };
    }
    requestId = cancelResolution.requestId;
    intentId = cancelResolution.intentId;
    transportMutation = cancelResolution.transportMutation;
    isTransportMutation = Boolean(transportMutation);

    const postConfirmationPreflight = validateTransportMutationPreflight({
      action: normalized.action,
      requestId,
      intentId,
      taskId: input.taskId,
      snapshot: input.snapshot,
      manifestPath: input.manifestPath,
      transportMutation,
      isTransportNonceConsumed: input.isTransportNonceConsumed
    });
    if (!postConfirmationPreflight.ok) {
      return {
        kind: 'error',
        status: postConfirmationPreflight.status,
        error: postConfirmationPreflight.error,
        traceability: postConfirmationPreflight.traceability
      };
    }

    return {
      kind: 'finalize',
      requestId,
      intentId,
      transportMutation,
      plan: buildExecutionControlActionFinalizationPlan({
        action: normalized.action,
        execution: executeControlAction({
          action: normalized.action,
          requestedBy: normalized.requestedBy,
          requestId,
          intentId,
          reason: normalized.reason ?? null,
          taskId: input.taskId,
          manifestPath: input.manifestPath,
          transportMutation,
          isTransportMutation,
          transportIdempotencyWindowMs: postConfirmationPreflight.idempotencyWindowMs,
          readSnapshot: input.readSnapshot,
          updateAction: input.updateAction
        }),
        requestId,
        intentId,
        taskId: input.taskId,
        manifestPath: input.manifestPath,
        transportMutation
      })
    };
  }

  return {
    kind: 'finalize',
    requestId,
    intentId,
    transportMutation,
    plan: buildExecutionControlActionFinalizationPlan({
      action: normalized.action,
      execution: executeControlAction({
        action: normalized.action,
        requestedBy: normalized.requestedBy,
        requestId,
        intentId,
        reason: normalized.reason ?? null,
        taskId: input.taskId,
        manifestPath: input.manifestPath,
        transportMutation,
        isTransportMutation,
        transportIdempotencyWindowMs: transportPreflight.idempotencyWindowMs,
        readSnapshot: input.readSnapshot,
        updateAction: input.updateAction
      }),
      requestId,
      intentId,
      taskId: input.taskId,
      manifestPath: input.manifestPath,
      transportMutation
    })
  };
}
