import type { ControlAction, ControlState, TransportIdempotencyEntry } from './controlState.js';
import { buildCanonicalTraceability, type TransportMutationRequest } from './controlActionPreflight.js';

export interface ControlActionSuccessResponse {
  status: 200;
  body: Record<string, unknown>;
  outcome: 'applied' | 'replayed';
  requestId: string | null;
  intentId: string | null;
  traceability: Record<string, unknown> | null;
}

export function buildReplayedControlActionResponse(input: {
  snapshot: ControlState;
  requestId: string | null;
  intentId: string | null;
  traceability: Record<string, unknown> | null;
}): ControlActionSuccessResponse {
  return {
    status: 200,
    body: buildSuccessPayload({
      snapshot: input.snapshot,
      idempotentReplay: true,
      traceability: input.traceability
    }),
    outcome: 'replayed',
    requestId: input.requestId,
    intentId: input.intentId,
    traceability: input.traceability
  };
}

export function buildPostMutationControlActionResponse(input: {
  action: ControlAction['action'];
  snapshot: ControlState;
  requestId: string | null;
  intentId: string | null;
  taskId: string | null;
  manifestPath: string;
  transportMutation: TransportMutationRequest | null;
  idempotentReplay: boolean;
  replayEntry: TransportIdempotencyEntry | null;
}): ControlActionSuccessResponse {
  const requestId = input.idempotentReplay
    ? input.replayEntry
      ? input.replayEntry.request_id
      : input.snapshot.latest_action?.request_id ?? input.requestId ?? null
    : input.requestId ?? input.snapshot.latest_action?.request_id ?? null;
  const intentId = input.idempotentReplay
    ? input.replayEntry
      ? input.replayEntry.intent_id
      : input.snapshot.latest_action?.intent_id ?? input.intentId ?? null
    : input.intentId ?? input.snapshot.latest_action?.intent_id ?? null;
  const traceability = input.transportMutation
    ? buildCanonicalTraceability({
        action: input.action,
        decision: input.idempotentReplay ? 'replayed' : 'applied',
        requestId,
        intentId,
        taskId: input.taskId,
        runId: input.snapshot.run_id,
        manifestPath: input.manifestPath,
        transport: input.transportMutation.transport,
        actorId: input.replayEntry?.actor_id ?? input.transportMutation.actorId,
        actorSource: input.replayEntry?.actor_source ?? input.transportMutation.actorSource,
        principal: input.replayEntry?.transport_principal ?? input.transportMutation.principal
      })
    : null;

  return {
    status: 200,
    body: buildSuccessPayload({
      snapshot: input.snapshot,
      idempotentReplay: input.idempotentReplay,
      traceability
    }),
    outcome: input.idempotentReplay ? 'replayed' : 'applied',
    requestId,
    intentId,
    traceability
  };
}

function buildSuccessPayload(input: {
  snapshot: ControlState;
  idempotentReplay: boolean;
  traceability: Record<string, unknown> | null;
}): Record<string, unknown> {
  const payload = input.idempotentReplay
    ? { ...input.snapshot, idempotent_replay: true }
    : { ...input.snapshot };
  return input.traceability ? { ...payload, traceability: input.traceability } : payload;
}
