import { describe, expect, it, vi } from 'vitest';

import type { ControlState, TransportIdempotencyEntry } from '../src/cli/control/controlState.js';
import type { TransportMutationRequest } from '../src/cli/control/controlActionPreflight.js';
import {
  executeControlAction,
  resolveControlActionReplay
} from '../src/cli/control/controlActionExecution.js';

function createSnapshot(input: Partial<ControlState> = {}): ControlState {
  return {
    run_id: 'run-1',
    control_seq: 1,
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

describe('ControlActionExecution', () => {
  it('preserves canonical null intent_id for request-only transport replay after newer actions', () => {
    const snapshot = createSnapshot({
      control_seq: 2,
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
      },
      transport_mutation: {
        consumed_nonces: [],
        idempotency_index: [createReplayEntry({ action: 'cancel' })]
      }
    });

    const replay = resolveControlActionReplay({
      snapshot,
      action: 'cancel',
      requestId: 'req-replay',
      intentId: 'intent-injected',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation({
        actorId: 'actor-override',
        actorSource: 'discord.bot',
        principal: 'discord:channel:override'
      }),
      isTransportMutation: true
    });

    expect(replay).toMatchObject({
      matched: true,
      requestId: 'req-replay',
      intentId: null,
      traceability: {
        action: 'cancel',
        decision: 'replayed',
        request_id: 'req-replay',
        intent_id: null
      }
    });
  });

  it('preserves canonical null request_id for intent-only transport replay after newer actions', () => {
    const snapshot = createSnapshot({
      control_seq: 2,
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
      },
      transport_mutation: {
        consumed_nonces: [],
        idempotency_index: [
          createReplayEntry({
            key_type: 'intent',
            key: 'intent-replay',
            action: 'cancel',
            request_id: null,
            intent_id: 'intent-replay'
          })
        ]
      }
    });

    const replay = resolveControlActionReplay({
      snapshot,
      action: 'cancel',
      requestId: 'req-injected',
      intentId: 'intent-replay',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation(),
      isTransportMutation: true
    });

    expect(replay).toMatchObject({
      matched: true,
      requestId: null,
      intentId: 'intent-replay',
      traceability: {
        action: 'cancel',
        decision: 'replayed',
        request_id: null,
        intent_id: 'intent-replay'
      }
    });
  });

  it('reuses replay entry actor context instead of caller overrides for transport replay traceability', () => {
    const snapshot = createSnapshot({
      control_seq: 2,
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
      },
      transport_mutation: {
        consumed_nonces: [],
        idempotency_index: [createReplayEntry({ action: 'cancel' })]
      }
    });

    const replay = resolveControlActionReplay({
      snapshot,
      action: 'cancel',
      requestId: 'req-replay',
      intentId: null,
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation({
        actorId: 'actor-override',
        actorSource: 'discord.bot',
        principal: 'discord:channel:override'
      }),
      isTransportMutation: true
    });

    expect(replay).toMatchObject({
      matched: true,
      traceability: {
        actor_id: 'actor-recorded',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:recorded'
      }
    });
    expect(replay.matched && replay.traceability?.actor_id).not.toBe('actor-override');
  });

  it('returns a replay result without calling updateAction when a duplicate replay is detected', () => {
    const snapshot = createSnapshot({
      control_seq: 2,
      latest_action: {
        action: 'pause',
        requested_by: 'delegate',
        requested_at: '2026-03-08T00:05:00.000Z',
        request_id: 'req-replay',
        intent_id: 'intent-replay',
        reason: 'manual'
      }
    });
    const updateAction = vi.fn();

    const result = executeControlAction({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-replay',
      intentId: 'intent-other',
      reason: 'manual',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: null,
      isTransportMutation: false,
      transportIdempotencyWindowMs: null,
      readSnapshot: () => snapshot,
      updateAction
    });

    expect(result).toMatchObject({
      kind: 'replay',
      requestId: 'req-replay',
      intentId: 'intent-replay',
      persistRequired: true,
      publishRequired: false
    });
    expect(updateAction).not.toHaveBeenCalled();
  });

  it('assembles transport context for updateAction and returns persist/publish requirements', () => {
    const updateAction = vi.fn(() => ({
      snapshot: createSnapshot({
        control_seq: 2,
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
      replayEntry: null
    }));

    const result = executeControlAction({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-applied',
      intentId: 'intent-applied',
      reason: 'transport',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation(),
      isTransportMutation: true,
      transportIdempotencyWindowMs: 120_000,
      readSnapshot: () => createSnapshot(),
      updateAction
    });

    expect(updateAction).toHaveBeenCalledWith({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-applied',
      intentId: 'intent-applied',
      reason: 'transport',
      transportContext: {
        transport: 'discord',
        actorId: 'actor-current',
        actorSource: 'discord.oauth',
        principal: 'discord:channel:current',
        idempotencyWindowMs: 120_000
      }
    });
    expect(result).toMatchObject({
      kind: 'post-update',
      idempotentReplay: false,
      persistRequired: true,
      publishRequired: true
    });
  });

  it('returns transport idempotent replay metadata without publishing a duplicate transport action', () => {
    const replayEntry = createReplayEntry({
      action: 'pause',
      request_id: 'req-transport-replay',
      intent_id: 'intent-transport-replay'
    });
    const updateAction = vi.fn(() => ({
      snapshot: createSnapshot({
        control_seq: 2,
        latest_action: {
          action: 'pause',
          requested_by: 'delegate',
          requested_at: '2026-03-08T00:06:00.000Z',
          request_id: 'req-transport-replay',
          intent_id: 'intent-transport-replay',
          reason: 'transport',
          transport: 'discord',
          actor_id: 'actor-current',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:current'
        }
      }),
      idempotentReplay: true,
      replayEntry
    }));

    const result = executeControlAction({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-transport-replay',
      intentId: 'intent-transport-replay',
      reason: 'transport',
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation(),
      isTransportMutation: true,
      transportIdempotencyWindowMs: 120_000,
      readSnapshot: () => createSnapshot(),
      updateAction
    });

    expect(updateAction).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      kind: 'post-update',
      idempotentReplay: true,
      replayEntry,
      persistRequired: true,
      publishRequired: false
    });
  });
});
