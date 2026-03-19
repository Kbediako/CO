import { describe, expect, it } from 'vitest';

import type { ControlState, TransportIdempotencyEntry } from '../src/cli/control/controlState.js';
import type { TransportMutationRequest } from '../src/cli/control/controlActionPreflight.js';
import {
  buildPostMutationControlActionResponse,
  buildReplayedControlActionResponse
} from '../src/cli/control/controlActionOutcome.js';

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

describe('ControlActionOutcome', () => {
  it('shapes replay responses with idempotent_replay and traceability', () => {
    const replay = buildReplayedControlActionResponse({
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
      }
    });

    expect(replay).toMatchObject({
      status: 200,
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
    });
  });

  it('uses replay entry context for transport replay traceability after newer actions', () => {
    const response = buildPostMutationControlActionResponse({
      action: 'cancel',
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
      requestId: 'req-replay',
      intentId: 'intent-injected',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation(),
      idempotentReplay: true,
      replayEntry: createReplayEntry()
    });

    expect(response).toMatchObject({
      status: 200,
      outcome: 'replayed',
      requestId: 'req-replay',
      intentId: null,
      body: {
        control_seq: 3,
        idempotent_replay: true,
        traceability: {
          action: 'cancel',
          decision: 'replayed',
          request_id: 'req-replay',
          intent_id: null,
          actor_id: 'actor-recorded',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:recorded'
        }
      }
    });
    expect(response.traceability?.intent_id).toBeNull();
    expect(response.traceability?.intent_id).not.toBe('intent-injected');
  });

  it('derives applied transport traceability from the current mutation when not replayed', () => {
    const response = buildPostMutationControlActionResponse({
      action: 'pause',
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
      requestId: 'req-applied',
      intentId: 'intent-applied',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation(),
      idempotentReplay: false,
      replayEntry: null
    });

    expect(response).toMatchObject({
      status: 200,
      outcome: 'applied',
      requestId: 'req-applied',
      intentId: 'intent-applied',
      body: {
        control_seq: 4,
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
    expect(Object.prototype.hasOwnProperty.call(response.body, 'idempotent_replay')).toBe(false);
  });
});
