import type {
  ControlAction,
  ControlState,
  ControlTransport,
  TransportActionContext,
  TransportIdempotencyEntry
} from './controlState.js';
import { buildCanonicalTraceability, type TransportMutationRequest } from './controlActionPreflight.js';

export type ControlActionReplayResult =
  | {
      matched: false;
    }
  | {
      matched: true;
      requestId: string | null;
      intentId: string | null;
      traceability: Record<string, unknown> | null;
    };

export type ControlActionExecutionResult =
  | {
      kind: 'replay';
      snapshot: ControlState;
      requestId: string | null;
      intentId: string | null;
      traceability: Record<string, unknown> | null;
      persistRequired: boolean;
      publishRequired: false;
    }
  | {
      kind: 'post-update';
      snapshot: ControlState;
      idempotentReplay: boolean;
      replayEntry: TransportIdempotencyEntry | null;
      persistRequired: boolean;
      publishRequired: boolean;
    };

export function executeControlAction(input: {
  action: ControlAction['action'];
  requestedBy: string;
  requestId: string | null;
  intentId: string | null;
  reason: string | null | undefined;
  taskId: string | null;
  manifestPath: string;
  transportMutation: TransportMutationRequest | null;
  isTransportMutation: boolean;
  transportIdempotencyWindowMs: number | null;
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
}): ControlActionExecutionResult {
  // Nonce checks can prune expired transport replay entries; read a fresh snapshot before replay lookup.
  const replaySnapshot = input.readSnapshot();
  const replay = resolveControlActionReplay({
    snapshot: replaySnapshot,
    action: input.action,
    requestId: input.requestId,
    intentId: input.intentId,
    taskId: input.taskId,
    manifestPath: input.manifestPath,
    transportMutation: input.transportMutation,
    isTransportMutation: input.isTransportMutation
  });
  if (replay.matched) {
    return {
      kind: 'replay',
      snapshot: replaySnapshot,
      requestId: replay.requestId,
      intentId: replay.intentId,
      traceability: replay.traceability,
      persistRequired: true,
      publishRequired: false
    };
  }

  const transportContext = buildTransportContext(
    input.transportMutation,
    input.transportIdempotencyWindowMs
  );
  const update = input.updateAction({
    action: input.action,
    requestedBy: input.requestedBy,
    requestId: input.requestId,
    intentId: input.intentId,
    reason: input.reason ?? null,
    ...(transportContext ? { transportContext } : {})
  });

  return {
    kind: 'post-update',
    snapshot: update.snapshot,
    idempotentReplay: update.idempotentReplay,
    replayEntry: update.replayEntry ?? null,
    persistRequired: Boolean(input.transportMutation) || !update.idempotentReplay,
    publishRequired: !update.idempotentReplay
  };
}

export function resolveControlActionReplay(input: {
  snapshot: ControlState;
  action: ControlAction['action'];
  requestId: string | null;
  intentId: string | null;
  taskId: string | null;
  manifestPath: string;
  transportMutation: TransportMutationRequest | null;
  isTransportMutation: boolean;
}): ControlActionReplayResult {
  const transportReplayEntry =
    input.transportMutation && input.action === 'cancel'
      ? findTransportIdempotencyReplayEntry({
          snapshot: input.snapshot,
          action: input.action,
          transport: input.transportMutation.transport,
          requestId: input.requestId,
          intentId: input.intentId
        })
      : null;
  const genericReplayAllowed =
    !input.isTransportMutation &&
    isIdempotentReplay(input.snapshot, input.action, input.requestId, input.intentId) &&
    (input.action !== 'cancel' || !input.snapshot.latest_action?.transport);
  if (!transportReplayEntry && !genericReplayAllowed) {
    return { matched: false };
  }

  const replayRequestId = transportReplayEntry
    ? transportReplayEntry.request_id
    : withUndefinedFallback(input.snapshot.latest_action?.request_id, input.requestId);
  const replayIntentId = transportReplayEntry
    ? transportReplayEntry.intent_id
    : withUndefinedFallback(input.snapshot.latest_action?.intent_id, input.intentId);
  const traceability =
    input.action === 'cancel'
      ? buildCanonicalTraceability({
          action: input.action,
          decision: 'replayed',
          requestId: replayRequestId,
          intentId: replayIntentId,
          taskId: input.taskId,
          runId: input.snapshot.run_id,
          manifestPath: input.manifestPath,
          transport:
            transportReplayEntry?.transport ??
            input.snapshot.latest_action?.transport ??
            input.transportMutation?.transport ??
            null,
          actorId:
            transportReplayEntry?.actor_id ??
            input.snapshot.latest_action?.actor_id ??
            input.transportMutation?.actorId ??
            null,
          actorSource:
            transportReplayEntry?.actor_source ??
            input.snapshot.latest_action?.actor_source ??
            input.transportMutation?.actorSource ??
            null,
          principal:
            transportReplayEntry?.transport_principal ??
            input.snapshot.latest_action?.transport_principal ??
            input.transportMutation?.principal ??
            null
        })
      : null;

  return {
    matched: true,
    requestId: replayRequestId,
    intentId: replayIntentId,
    traceability
  };
}

function buildTransportContext(
  transportMutation: TransportMutationRequest | null,
  transportIdempotencyWindowMs: number | null
): TransportActionContext | null {
  if (!transportMutation || transportIdempotencyWindowMs === null) {
    return null;
  }
  return {
    transport: transportMutation.transport,
    actorId: transportMutation.actorId,
    actorSource: transportMutation.actorSource,
    principal: transportMutation.principal,
    idempotencyWindowMs: transportIdempotencyWindowMs
  };
}

function isIdempotentReplay(
  snapshot: ControlState,
  action: ControlAction['action'],
  requestId: string | null,
  intentId: string | null
): boolean {
  const latest = snapshot.latest_action;
  if (!latest || latest.action !== action) {
    return false;
  }
  if (requestId && latest.request_id === requestId) {
    return true;
  }
  if (intentId && latest.intent_id === intentId) {
    return true;
  }
  return false;
}

function findTransportIdempotencyReplayEntry(input: {
  snapshot: ControlState;
  action: ControlAction['action'];
  transport: ControlTransport;
  requestId: string | null;
  intentId: string | null;
}): TransportIdempotencyEntry | null {
  const index = input.snapshot.transport_mutation?.idempotency_index ?? [];
  for (const entry of index) {
    if (entry.action !== input.action || entry.transport !== input.transport) {
      continue;
    }
    if (entry.key_type === 'request' && input.requestId && entry.key === input.requestId) {
      return entry;
    }
    if (entry.key_type === 'intent' && input.intentId && entry.key === input.intentId) {
      return entry;
    }
  }
  return null;
}

function withUndefinedFallback<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value;
}
