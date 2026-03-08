import { describe, expect, it } from 'vitest';

import type { ControlState, TransportIdempotencyEntry } from '../src/cli/control/controlState.js';
import type { TransportMutationRequest } from '../src/cli/control/controlActionPreflight.js';
import type { ControlActionExecutionResult } from '../src/cli/control/controlActionExecution.js';
import {
  buildExecutionControlActionFinalizationPlan,
  buildReplayControlActionFinalizationPlan
} from '../src/cli/control/controlActionFinalization.js';

function createSnapshot(input: Partial<ControlState> = {}): ControlState {
  return {
    run_id: 'run-1',
    control_seq: 2,
    latest_action: null,
    feature_toggles: null,
    transport_mutation: null,
    ...input
  };
}

function createTransportMutation(
  input: Partial<TransportMutationRequest> = {}
): TransportMutationRequest {
  return {
    transport: 'discord',
    actorId: 'actor-current',
    actorSource: 'discord.oauth',
    principal: 'discord:channel:current',
    nonce: 'nonce-current-1',
    nonceExpiresAt: '2026-03-08T00:10:00.000Z',
    nonceExpiresAtMs: Date.parse('2026-03-08T00:10:00.000Z'),
    ...input
  };
}

function createReplayEntry(
  input: Partial<TransportIdempotencyEntry> = {}
): TransportIdempotencyEntry {
  return {
    key_type: 'request',
    key: 'req-replay',
    action: 'cancel',
    transport: 'discord',
    request_id: 'req-replay',
    intent_id: null,
    actor_id: 'actor-recorded',
    actor_source: 'discord.oauth',
    transport_principal: 'discord:channel:recorded',
    control_seq: 1,
    recorded_at: '2026-03-08T00:00:00.000Z',
    expires_at: '2026-03-08T00:20:00.000Z',
    ...input
  };
}

describe('ControlActionFinalization', () => {
  it('builds replay plans with idempotent replay payloads and no publish', () => {
    const plan = buildReplayControlActionFinalizationPlan({
      snapshot: createSnapshot({
        control_seq: 5,
        latest_action: {
          action: 'cancel',
          requested_by: 'delegate',
          requested_at: '2026-03-08T00:00:00.000Z',
          request_id: 'req-replay',
          intent_id: null,
          reason: 'manual',
          transport: 'discord',
          actor_id: 'actor-recorded',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:recorded'
        }
      }),
      requestId: 'req-replay',
      intentId: null,
      traceability: {
        action: 'cancel',
        decision: 'replayed',
        request_id: 'req-replay',
        intent_id: null
      },
      persistRequired: true
    });

    expect(plan).toMatchObject({
      persistRequired: true,
      publishRequired: false,
      response: {
        outcome: 'replayed',
        requestId: 'req-replay',
        intentId: null,
        body: {
          control_seq: 5,
          idempotent_replay: true,
          traceability: {
            action: 'cancel',
            decision: 'replayed',
            request_id: 'req-replay',
            intent_id: null
          }
        }
      }
    });
  });

  it('preserves canonical null request ids for execution replay plans', () => {
    const execution: ControlActionExecutionResult = {
      kind: 'replay',
      snapshot: createSnapshot({
        control_seq: 3,
        latest_action: {
          action: 'cancel',
          requested_by: 'delegate',
          requested_at: '2026-03-08T00:03:00.000Z',
          request_id: null,
          intent_id: 'intent-replay',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-recorded',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:recorded'
        }
      }),
      requestId: null,
      intentId: 'intent-replay',
      traceability: {
        action: 'cancel',
        decision: 'replayed',
        request_id: null,
        intent_id: 'intent-replay'
      },
      persistRequired: true,
      publishRequired: false
    };

    const plan = buildExecutionControlActionFinalizationPlan({
      action: 'cancel',
      execution,
      requestId: 'req-injected',
      intentId: 'intent-replay',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation()
    });

    expect(plan.response.requestId).toBeNull();
    expect(plan.response.requestId).toBeNull();
    expect(plan.response.intentId).toBe('intent-replay');
    expect(plan.publishRequired).toBe(false);
  });

  it('preserves applied publish and audit planning for post-update outcomes', () => {
    const execution: ControlActionExecutionResult = {
      kind: 'post-update',
      snapshot: createSnapshot({
        control_seq: 4,
        latest_action: {
          action: 'pause',
          requested_by: 'delegate',
          requested_at: '2026-03-08T00:06:00.000Z',
          request_id: 'req-applied',
          intent_id: 'intent-applied',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-current',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:current'
        }
      }),
      idempotentReplay: false,
      replayEntry: null,
      persistRequired: true,
      publishRequired: true
    };

    const plan = buildExecutionControlActionFinalizationPlan({
      action: 'pause',
      execution,
      requestId: 'req-applied',
      intentId: 'intent-applied',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation()
    });

    expect(plan).toMatchObject({
      persistRequired: true,
      publishRequired: true,
      response: {
        outcome: 'applied',
        requestId: 'req-applied',
        intentId: 'intent-applied',
        traceability: {
          action: 'pause',
          decision: 'applied',
          request_id: 'req-applied',
          intent_id: 'intent-applied',
          actor_id: 'actor-current',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:current'
        }
      }
    });
    expect(Object.prototype.hasOwnProperty.call(plan.response.body, 'idempotent_replay')).toBe(
      false
    );
  });

  it('prefers replay entry actor context for post-update idempotent replay plans', () => {
    const execution: ControlActionExecutionResult = {
      kind: 'post-update',
      snapshot: createSnapshot({
        control_seq: 3,
        latest_action: {
          action: 'resume',
          requested_by: 'delegate',
          requested_at: '2026-03-08T00:05:00.000Z',
          request_id: 'req-newer',
          intent_id: 'intent-newer',
          reason: 'transport',
          transport: 'telegram',
          actor_id: 'actor-newer',
          actor_source: 'telegram.bot',
          transport_principal: 'telegram:chat:newer'
        }
      }),
      idempotentReplay: true,
      replayEntry: createReplayEntry(),
      persistRequired: true,
      publishRequired: false
    };

    const plan = buildExecutionControlActionFinalizationPlan({
      action: 'cancel',
      execution,
      requestId: 'req-replay',
      intentId: 'intent-injected',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation({
        actorId: 'actor-override',
        actorSource: 'discord.bot',
        principal: 'discord:channel:override'
      })
    });

    expect(plan).toMatchObject({
      persistRequired: true,
      publishRequired: false,
      response: {
        outcome: 'replayed',
        requestId: 'req-replay',
        intentId: null,
        traceability: {
          actor_id: 'actor-recorded',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:recorded',
          intent_id: null
        }
      }
    });
    expect(plan.response.traceability?.actor_id).not.toBe('actor-override');
  });
});
