import { describe, expect, it, vi } from 'vitest';

import type { ConfirmationValidationResult } from '../src/cli/control/confirmations.js';
import {
  resolveControlActionControllerSequencing
} from '../src/cli/control/controlActionControllerSequencing.js';
import type {
  NormalizedControlActionRequest,
  TransportMutationRequest
} from '../src/cli/control/controlActionPreflight.js';
import type {
  ControlState,
  TransportIdempotencyEntry
} from '../src/cli/control/controlState.js';

function createSnapshot(input: Partial<ControlState> = {}): ControlState {
  return {
    run_id: 'run-1',
    control_seq: 1,
    latest_action: null,
    feature_toggles: {
      transport_mutating_controls: {
        enabled: true,
        idempotency_window_ms: 60_000,
        nonce_max_ttl_ms: 60_000
      }
    },
    transport_mutation: null,
    ...input
  };
}

function createTransportMutation(
  input: Partial<TransportMutationRequest> = {}
): TransportMutationRequest {
  const futureExpiry = new Date(Date.now() + 30_000).toISOString();
  return {
    transport: 'discord',
    actorId: 'actor-current',
    actorSource: 'discord.oauth',
    principal: 'discord:channel:current',
    nonce: 'nonce-current-1',
    nonceExpiresAt: futureExpiry,
    nonceExpiresAtMs: Date.parse(futureExpiry),
    ...input
  };
}

function createReplayEntry(
  input: Partial<TransportIdempotencyEntry> = {}
): TransportIdempotencyEntry {
  return {
    key_type: 'request',
    key: 'req-cancel',
    action: 'cancel',
    transport: 'discord',
    request_id: 'req-cancel',
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

function createNormalized(
  input: Partial<NormalizedControlActionRequest>
): NormalizedControlActionRequest {
  return {
    action: 'pause',
    requestId: 'req-1',
    intentId: 'intent-1',
    requestedBy: 'ui',
    reason: 'manual',
    confirmNonce: undefined,
    deferTransportResolutionToConfirmation: false,
    transportMutation: null,
    ...input
  };
}

function createValidationResult(params: Record<string, unknown>): ConfirmationValidationResult {
  const expiresAt = new Date(Date.now() + 30_000).toISOString();
  return {
    request: {
      request_id: 'req-confirmation',
      action: 'cancel',
      tool: 'delegate.cancel',
      params,
      action_params_digest: 'digest',
      digest_alg: 'sha256',
      requested_at: '2026-03-08T00:00:00.000Z',
      expires_at: expiresAt,
      approved_by: 'runner',
      approved_at: '2026-03-08T00:01:00.000Z'
    },
    nonce_id: 'nonce-confirmed'
  };
}

describe('ControlActionControllerSequencing', () => {
  it('returns a finalization plan for non-cancel actions without confirmation branching', async () => {
    const updateAction = vi.fn().mockReturnValue({
      snapshot: createSnapshot({
        control_seq: 2,
        latest_action: {
          action: 'pause',
          requested_by: 'ui',
          requested_at: '2026-03-08T00:02:00.000Z',
          request_id: 'req-pause',
          intent_id: 'intent-pause',
          reason: 'manual',
          transport: null,
          actor_id: null,
          actor_source: null,
          transport_principal: null
        }
      }),
      idempotentReplay: false,
      replayEntry: null
    });
    const result = await resolveControlActionControllerSequencing({
      body: { action: 'pause' },
      tool: 'delegate.cancel',
      params: {},
      snapshot: createSnapshot(),
      taskId: 'task-1056',
      manifestPath: '/tmp/manifest.json',
      normalized: createNormalized({
        action: 'pause',
        requestId: 'req-pause',
        intentId: 'intent-pause'
      }),
      isTransportNonceConsumed: () => false,
      validateConfirmation: vi.fn(),
      persistConfirmations: vi.fn(),
      emitConfirmationResolved: vi.fn(),
      readSnapshot: () => createSnapshot(),
      updateAction
    });

    expect(result.kind).toBe('finalize');
    if (result.kind !== 'finalize') {
      return;
    }
    expect(result.requestId).toBe('req-pause');
    expect(result.intentId).toBe('intent-pause');
    expect(result.plan.response.outcome).toBe('applied');
    expect(result.plan.publishRequired).toBe(true);
    expect(updateAction).toHaveBeenCalledTimes(1);
  });

  it('short-circuits cancel replay before confirmation resolution', async () => {
    const validateConfirmation = vi.fn();
    const replaySnapshot = createSnapshot({
      latest_action: {
        action: 'resume',
        requested_by: 'delegate',
        requested_at: '2026-03-08T00:01:00.000Z',
        request_id: 'req-newer',
        intent_id: 'intent-newer',
        reason: 'manual',
        transport: 'discord',
        actor_id: 'actor-newer',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:newer'
      },
      transport_mutation: {
        consumed_nonces: [],
        idempotency_index: [createReplayEntry()]
      }
    });
    const result = await resolveControlActionControllerSequencing({
      body: { action: 'cancel' },
      tool: 'delegate.cancel',
      params: {},
      snapshot: replaySnapshot,
      taskId: 'task-1056',
      manifestPath: '/tmp/manifest.json',
      normalized: createNormalized({
        action: 'cancel',
        requestId: 'req-cancel',
        intentId: null,
        transportMutation: createTransportMutation()
      }),
      isTransportNonceConsumed: () => false,
      validateConfirmation,
      persistConfirmations: vi.fn(),
      emitConfirmationResolved: vi.fn(),
      readSnapshot: () => replaySnapshot,
      updateAction: vi.fn()
    });

    expect(result.kind).toBe('finalize');
    if (result.kind !== 'finalize') {
      return;
    }
    expect(result.plan.response.outcome).toBe('replayed');
    expect(result.plan.publishRequired).toBe(false);
    expect(validateConfirmation).not.toHaveBeenCalled();
  });

  it('requires confirmation for cancel when replay does not match', async () => {
    const result = await resolveControlActionControllerSequencing({
      body: { action: 'cancel' },
      tool: 'delegate.cancel',
      params: {},
      snapshot: createSnapshot(),
      taskId: 'task-1056',
      manifestPath: '/tmp/manifest.json',
      normalized: createNormalized({
        action: 'cancel',
        requestId: 'req-cancel',
        intentId: null,
        confirmNonce: undefined,
        transportMutation: null
      }),
      isTransportNonceConsumed: () => false,
      validateConfirmation: vi.fn(),
      persistConfirmations: vi.fn(),
      emitConfirmationResolved: vi.fn(),
      readSnapshot: () => createSnapshot(),
      updateAction: vi.fn()
    });

    expect(result).toMatchObject({
      kind: 'error',
      status: 409,
      error: 'confirmation_required'
    });
  });

  it('rebinds confirmed cancel scope and returns a finalization plan', async () => {
    const persistConfirmations = vi.fn().mockResolvedValue(undefined);
    const emitConfirmationResolved = vi.fn().mockResolvedValue(undefined);
    const updateAction = vi.fn().mockReturnValue({
      snapshot: createSnapshot({
        control_seq: 2,
        latest_action: {
          action: 'cancel',
          requested_by: 'ui',
          requested_at: '2026-03-08T00:03:00.000Z',
          request_id: 'req-confirmed',
          intent_id: null,
          reason: 'manual',
          transport: 'discord',
          actor_id: 'actor-confirmed',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:confirmed'
        }
      }),
      idempotentReplay: false,
      replayEntry: null
    });
    const result = await resolveControlActionControllerSequencing({
      body: {
        action: 'cancel',
        confirm_nonce: 'confirm-1',
        transport_nonce: 'nonce-confirmed',
        transport_nonce_expires_at: new Date(Date.now() + 30_000).toISOString()
      },
      tool: 'delegate.cancel',
      params: {},
      snapshot: createSnapshot(),
      taskId: 'task-1056',
      manifestPath: '/tmp/manifest.json',
      normalized: createNormalized({
        action: 'cancel',
        requestId: 'req-body',
        intentId: null,
        confirmNonce: 'confirm-1',
        deferTransportResolutionToConfirmation: true,
        transportMutation: null
      }),
      isTransportNonceConsumed: () => false,
      validateConfirmation: () =>
        createValidationResult({
          request_id: 'req-confirmed',
          transport: 'discord',
          actor_id: 'actor-confirmed',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:confirmed',
          transport_nonce: 'nonce-confirmed',
          transport_nonce_expires_at: new Date(Date.now() + 30_000).toISOString()
        }),
      persistConfirmations,
      emitConfirmationResolved,
      readSnapshot: () => createSnapshot(),
      updateAction
    });

    expect(result.kind).toBe('finalize');
    if (result.kind !== 'finalize') {
      return;
    }
    expect(result.requestId).toBe('req-confirmed');
    expect(result.transportMutation).toMatchObject({
      transport: 'discord',
      actorId: 'actor-confirmed',
      actorSource: 'discord.oauth',
      principal: 'discord:channel:confirmed',
      nonce: 'nonce-confirmed'
    });
    expect(result.plan.response.outcome).toBe('applied');
    expect(persistConfirmations).toHaveBeenCalledTimes(1);
    expect(emitConfirmationResolved).toHaveBeenCalledTimes(1);
  });

  it('revalidates confirmed transport scope before execution', async () => {
    const result = await resolveControlActionControllerSequencing({
      body: {
        action: 'cancel',
        confirm_nonce: 'confirm-1',
        transport_nonce: 'nonce-confirmed',
        transport_nonce_expires_at: new Date(Date.now() + 30_000).toISOString()
      },
      tool: 'delegate.cancel',
      params: {},
      snapshot: createSnapshot(),
      taskId: 'task-1056',
      manifestPath: '/tmp/manifest.json',
      normalized: createNormalized({
        action: 'cancel',
        requestId: 'req-body',
        intentId: null,
        confirmNonce: 'confirm-1',
        deferTransportResolutionToConfirmation: true,
        transportMutation: null
      }),
      isTransportNonceConsumed: (nonce) => nonce === 'nonce-confirmed',
      validateConfirmation: () =>
        createValidationResult({
          request_id: 'req-confirmed',
          transport: 'discord',
          actor_id: 'actor-confirmed',
          actor_source: 'discord.oauth',
          transport_principal: 'discord:channel:confirmed',
          transport_nonce: 'nonce-confirmed',
          transport_nonce_expires_at: new Date(Date.now() + 30_000).toISOString()
        }),
      persistConfirmations: vi.fn().mockResolvedValue(undefined),
      emitConfirmationResolved: vi.fn().mockResolvedValue(undefined),
      readSnapshot: () => createSnapshot(),
      updateAction: vi.fn()
    });

    expect(result).toMatchObject({
      kind: 'error',
      status: 409,
      error: 'transport_nonce_replayed'
    });
  });
});
