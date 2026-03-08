import { describe, expect, it, vi } from 'vitest';

import {
  handleControlActionRequest,
  type ControlActionControllerContext
} from '../src/cli/control/controlActionController.js';
import type { ControlState } from '../src/cli/control/controlState.js';

function createSnapshot(input: Partial<ControlState> = {}): ControlState {
  return {
    run_id: 'run-1',
    control_seq: 0,
    latest_action: null,
    history: [],
    pending_confirmation: null,
    queued_questions: null,
    question_events: [],
    sessions: null,
    transport_idempotency: null,
    provider_traces: null,
    transport_mutation: null,
    ...input
  };
}

function createContext(
  input: Partial<ControlActionControllerContext> = {}
) {
  const state: {
    statusCode: number | null;
    body: unknown;
  } = {
    statusCode: null,
    body: null
  };
  const steps: string[] = [];

  const context: ControlActionControllerContext = {
    authKind: input.authKind ?? 'control',
    taskId: input.taskId ?? 'task-1057',
    manifestPath: input.manifestPath ?? '/repo/.runs/task-1057/cli/run-1/manifest.json',
    readRequestBody:
      input.readRequestBody ??
      (vi.fn(async () => {
        steps.push('read-body');
        return {
          action: 'pause',
          request_id: 'req-pause',
          intent_id: 'intent-pause',
          requested_by: 'ui',
          reason: 'manual'
        };
      }) as ControlActionControllerContext['readRequestBody']),
    readInitialSnapshot:
      input.readInitialSnapshot ??
      (vi.fn(() => {
        steps.push('read-initial-snapshot');
        return createSnapshot();
      }) as ControlActionControllerContext['readInitialSnapshot']),
    isTransportNonceConsumed:
      input.isTransportNonceConsumed ??
      (vi.fn(() => false) as ControlActionControllerContext['isTransportNonceConsumed']),
    validateConfirmation:
      input.validateConfirmation ??
      (vi.fn(() => {
        throw new Error('unexpected validateConfirmation');
      }) as ControlActionControllerContext['validateConfirmation']),
    persistConfirmations:
      input.persistConfirmations ??
      (vi.fn(async () => {
        throw new Error('unexpected persistConfirmations');
      }) as ControlActionControllerContext['persistConfirmations']),
    emitConfirmationResolved:
      input.emitConfirmationResolved ??
      (vi.fn(async () => {
        throw new Error('unexpected emitConfirmationResolved');
      }) as ControlActionControllerContext['emitConfirmationResolved']),
    readSnapshot:
      input.readSnapshot ??
      (vi.fn(() => {
        steps.push('read-live-snapshot');
        return createSnapshot();
      }) as ControlActionControllerContext['readSnapshot']),
    updateAction:
      input.updateAction ??
      (vi.fn((updateInput) => {
        steps.push(`update:${updateInput.action}:${updateInput.requestedBy}`);
        return {
          snapshot: createSnapshot({
            control_seq: 1,
            latest_action: {
              action: updateInput.action,
              requested_by: updateInput.requestedBy,
              requested_at: '2026-03-08T08:00:00.000Z',
              request_id: updateInput.requestId ?? null,
              intent_id: updateInput.intentId ?? null,
              reason: updateInput.reason ?? null,
              transport: null,
              actor_id: null,
              actor_source: null,
              transport_principal: null
            }
          }),
          idempotentReplay: false,
          replayEntry: null
        };
      }) as ControlActionControllerContext['updateAction']),
    persistControlAction:
      input.persistControlAction ??
      (vi.fn(async (persistInput) => {
        steps.push(`persist:${persistInput.action}:${persistInput.requestId}`);
      }) as ControlActionControllerContext['persistControlAction']),
    publishRuntime:
      input.publishRuntime ??
      (vi.fn((source) => {
        steps.push(`publish:${source}`);
      }) as ControlActionControllerContext['publishRuntime']),
    emitControlActionAuditEvent:
      input.emitControlActionAuditEvent ??
      (vi.fn(async (auditInput) => {
        steps.push(`audit:${auditInput.outcome}:${auditInput.action}:${auditInput.requestId}`);
      }) as ControlActionControllerContext['emitControlActionAuditEvent']),
    writeControlError:
      input.writeControlError ??
      (vi.fn((status, error, traceability) => {
        steps.push(`error:${status}:${error}`);
        state.statusCode = status;
        state.body = traceability ? { error, traceability } : { error };
      }) as ControlActionControllerContext['writeControlError']),
    writeControlResponse:
      input.writeControlResponse ??
      (vi.fn((response) => {
        steps.push(`response:${response.outcome}:${response.requestId}`);
        state.statusCode = response.status;
        state.body = response.body;
      }) as ControlActionControllerContext['writeControlResponse'])
  };

  return { context, state, steps };
}

describe('ControlActionController', () => {
  it('maps invalid action normalization errors through the injected error writer', async () => {
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read-body');
        return { action: 'explode' };
      })
    });

    await expect(handleControlActionRequest(context)).resolves.toBeUndefined();

    expect(steps).toEqual(['read-body', 'read-initial-snapshot', 'error:400:invalid_action']);
    expect(state.statusCode).toBe(400);
    expect(state.body).toEqual({ error: 'invalid_action' });
    expect(context.readSnapshot).not.toHaveBeenCalled();
    expect(context.updateAction).not.toHaveBeenCalled();
    expect(context.persistControlAction).not.toHaveBeenCalled();
    expect(context.publishRuntime).not.toHaveBeenCalled();
    expect(context.emitControlActionAuditEvent).not.toHaveBeenCalled();
  });

  it('runs the apply path through read, sequencing, persistence, publish, audit, and response writes', async () => {
    const { context, state, steps } = createContext();

    await expect(handleControlActionRequest(context)).resolves.toBeUndefined();

    expect(steps).toEqual([
      'read-body',
      'read-initial-snapshot',
      'read-live-snapshot',
      'update:pause:ui',
      'persist:pause:req-pause',
      'publish:control.action',
      'audit:applied:pause:req-pause',
      'response:applied:req-pause'
    ]);
    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({
      run_id: 'run-1',
      control_seq: 1,
      latest_action: {
        action: 'pause',
        request_id: 'req-pause',
        intent_id: 'intent-pause'
      }
    });
  });

  it('preserves replay finalization while skipping publish on idempotent replay responses', async () => {
    const replaySnapshot = createSnapshot({
      control_seq: 4,
      latest_action: {
        action: 'pause',
        requested_by: 'ui',
        requested_at: '2026-03-08T08:00:00.000Z',
        request_id: 'req-replay',
        intent_id: 'intent-replay',
        reason: 'manual',
        transport: null,
        actor_id: null,
        actor_source: null,
        transport_principal: null
      }
    });
    const { context, state, steps } = createContext({
      readRequestBody: vi.fn(async () => {
        steps.push('read-body');
        return {
          action: 'pause',
          request_id: 'req-replay',
          intent_id: 'intent-replay',
          requested_by: 'ui',
          reason: 'manual'
        };
      }),
      readInitialSnapshot: vi.fn(() => {
        steps.push('read-initial-snapshot');
        return replaySnapshot;
      }),
      readSnapshot: vi.fn(() => {
        steps.push('read-live-snapshot');
        return replaySnapshot;
      })
    });

    await expect(handleControlActionRequest(context)).resolves.toBeUndefined();

    expect(steps).toEqual([
      'read-body',
      'read-initial-snapshot',
      'read-live-snapshot',
      'persist:pause:req-replay',
      'audit:replayed:pause:req-replay',
      'response:replayed:req-replay'
    ]);
    expect(context.updateAction).not.toHaveBeenCalled();
    expect(context.publishRuntime).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({
      run_id: 'run-1',
      control_seq: 4,
      idempotent_replay: true
    });
  });
});
