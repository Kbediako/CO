import type { ControlAction, ControlState } from './controlState.js';
import type { TransportMutationRequest } from './controlActionPreflight.js';
import type { ControlActionExecutionResult } from './controlActionExecution.js';
import {
  buildPostMutationControlActionResponse,
  buildReplayedControlActionResponse,
  type ControlActionSuccessResponse
} from './controlActionOutcome.js';

export interface ControlActionFinalizationPlan {
  snapshot: ControlState;
  response: ControlActionSuccessResponse;
  persistRequired: boolean;
  publishRequired: boolean;
}

export function buildReplayControlActionFinalizationPlan(input: {
  snapshot: ControlState;
  requestId: string | null;
  intentId: string | null;
  traceability: Record<string, unknown> | null;
  persistRequired: boolean;
}): ControlActionFinalizationPlan {
  const response = buildReplayedControlActionResponse({
    snapshot: input.snapshot,
    requestId: input.requestId,
    intentId: input.intentId,
    traceability: input.traceability
  });
  return {
    snapshot: input.snapshot,
    response,
    persistRequired: input.persistRequired,
    publishRequired: false
  };
}

export function buildExecutionControlActionFinalizationPlan(input: {
  action: ControlAction['action'];
  execution: ControlActionExecutionResult;
  requestId: string | null;
  intentId: string | null;
  taskId: string | null;
  manifestPath: string;
  transportMutation: TransportMutationRequest | null;
}): ControlActionFinalizationPlan {
  if (input.execution.kind === 'replay') {
    return buildReplayControlActionFinalizationPlan({
      snapshot: input.execution.snapshot,
      requestId: input.execution.requestId,
      intentId: input.execution.intentId,
      traceability: input.execution.traceability,
      persistRequired: input.execution.persistRequired
    });
  }

  const response = buildPostMutationControlActionResponse({
    action: input.action,
    snapshot: input.execution.snapshot,
    requestId: input.requestId,
    intentId: input.intentId,
    taskId: input.taskId,
    manifestPath: input.manifestPath,
    transportMutation: input.transportMutation,
    idempotentReplay: input.execution.idempotentReplay,
    replayEntry: input.execution.replayEntry
  });

  return {
    snapshot: input.execution.snapshot,
    response,
    persistRequired: input.execution.persistRequired,
    publishRequired: input.execution.publishRequired
  };
}
