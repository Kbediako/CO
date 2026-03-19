import type { ConfirmationValidationResult } from './confirmations.js';
import type { ControlState } from './controlState.js';
import {
  buildCanonicalTraceability,
  resolveTransportMutationRequestFromConfirmationScope,
  type TransportMutationRequest
} from './controlActionPreflight.js';

type CancelConfirmationResolutionResult =
  | {
      ok: true;
      requestId: string;
      intentId: string | null;
      transportMutation: TransportMutationRequest | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
      traceability?: Record<string, unknown>;
    };

export async function resolveCancelConfirmation(input: {
  body: Record<string, unknown>;
  tool: string;
  params: Record<string, unknown>;
  confirmNonce: string;
  currentIntentId: string | null;
  snapshot: ControlState;
  taskId: string | null;
  manifestPath: string;
  validateNonce(input: {
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
}): Promise<CancelConfirmationResolutionResult> {
  let validation: ConfirmationValidationResult;
  try {
    validation = input.validateNonce({
      confirmNonce: input.confirmNonce,
      tool: input.tool,
      params: input.params
    });
  } catch (error) {
    return {
      ok: false,
      status: 409,
      error: (error as Error)?.message ?? 'confirmation_invalid'
    };
  }

  const confirmedRequestValue = validation.request.params.request_id ?? validation.request.params.requestId;
  const confirmedRequestId =
    typeof confirmedRequestValue === 'string' && confirmedRequestValue.trim().length > 0
      ? confirmedRequestValue.trim()
      : undefined;
  const confirmedIntentValue = validation.request.params.intent_id ?? validation.request.params.intentId;
  const confirmedIntentId =
    typeof confirmedIntentValue === 'string' && confirmedIntentValue.trim().length > 0
      ? confirmedIntentValue.trim()
      : undefined;
  const requestId = confirmedRequestId ?? validation.request.request_id;
  const intentId = confirmedIntentId ?? input.currentIntentId;

  await input.persistConfirmations();
  await input.emitConfirmationResolved({
    request_id: validation.request.request_id,
    nonce_id: validation.nonce_id,
    outcome: 'approved'
  });

  const transportMutationResult = resolveTransportMutationRequestFromConfirmationScope({
    body: input.body,
    params: validation.request.params,
    action: 'cancel'
  });
  if (transportMutationResult.error) {
    return {
      ok: false,
      status: transportMutationResult.status ?? 400,
      error: transportMutationResult.error,
      traceability: buildCanonicalTraceability({
        action: 'cancel',
        decision: 'rejected',
        requestId,
        intentId,
        taskId: input.taskId,
        runId: input.snapshot.run_id,
        manifestPath: input.manifestPath,
        transport: transportMutationResult.partial?.transport ?? null,
        actorId: transportMutationResult.partial?.actorId ?? null,
        actorSource: transportMutationResult.partial?.actorSource ?? null,
        principal: transportMutationResult.partial?.principal ?? null
      })
    };
  }

  return {
    ok: true,
    requestId,
    intentId,
    transportMutation: transportMutationResult.request
  };
}
