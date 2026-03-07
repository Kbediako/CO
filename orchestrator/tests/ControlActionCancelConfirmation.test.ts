import { describe, expect, it, vi } from 'vitest';

import type { ControlState } from '../src/cli/control/controlState.js';
import type { ConfirmationValidationResult } from '../src/cli/control/confirmations.js';
import { resolveCancelConfirmation } from '../src/cli/control/controlActionCancelConfirmation.js';

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

function createValidationResult(input: {
  requestId?: string;
  params?: Record<string, unknown>;
  approvedBy?: string | null;
} = {}): ConfirmationValidationResult {
  return {
    request: {
      request_id: input.requestId ?? 'req-confirmation',
      action: 'cancel',
      tool: 'delegate.cancel',
      params: input.params ?? {},
      action_params_digest: 'digest',
      digest_alg: 'sha256',
      requested_at: '2026-03-08T00:00:00.000Z',
      expires_at: '2026-03-08T00:10:00.000Z',
      approved_by: input.approvedBy ?? 'ui',
      approved_at: '2026-03-08T00:01:00.000Z'
    },
    nonce_id: 'nonce-confirmation-1'
  };
}

describe('ControlActionCancelConfirmation', () => {
  it('returns canonical ids and confirmed transport scope when top-level transport fields are omitted', async () => {
    const persistConfirmations = vi.fn(async () => undefined);
    const emitConfirmationResolved = vi.fn(async () => undefined);

    const result = await resolveCancelConfirmation({
      body: {
        action: 'cancel',
        request_id: 'req-top-level',
        transport_nonce: 'nonce-top-level-1',
        transport_nonce_expires_at: '2026-03-08T00:15:00.000Z'
      },
      tool: 'delegate.cancel',
      params: { manifest_path: '/tmp/manifest.json' },
      confirmNonce: 'confirm-1',
      currentIntentId: 'intent-top-level',
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      validateNonce: () =>
        createValidationResult({
          params: {
            request_id: 'req-confirmed',
            intent_id: 'intent-confirmed',
            transport: 'discord',
            actor_id: 'actor-confirmed',
            actor_source: 'discord.oauth',
            transport_principal: 'discord:channel:confirmed'
          }
        }),
      persistConfirmations,
      emitConfirmationResolved
    });

    expect(result).toMatchObject({
      ok: true,
      requestId: 'req-confirmed',
      intentId: 'intent-confirmed',
      transportMutation: {
        transport: 'discord',
        actorId: 'actor-confirmed',
        actorSource: 'discord.oauth',
        principal: 'discord:channel:confirmed',
        nonce: 'nonce-top-level-1'
      }
    });
    expect(persistConfirmations).toHaveBeenCalledOnce();
    expect(emitConfirmationResolved).toHaveBeenCalledWith({
      request_id: 'req-confirmation',
      nonce_id: 'nonce-confirmation-1',
      outcome: 'approved'
    });
    expect(persistConfirmations.mock.invocationCallOrder[0]).toBeLessThan(
      emitConfirmationResolved.mock.invocationCallOrder[0]
    );
  });

  it('returns confirmed-scope mismatch traceability after persistence and emission', async () => {
    const persistConfirmations = vi.fn(async () => undefined);
    const emitConfirmationResolved = vi.fn(async () => undefined);

    const result = await resolveCancelConfirmation({
      body: {
        action: 'cancel',
        request_id: 'req-top-level',
        transport: 'telegram',
        actor_id: 'actor-untrusted',
        actor_source: 'telegram.bot',
        transport_principal: 'telegram:chat:untrusted',
        transport_nonce: 'nonce-top-level-2',
        transport_nonce_expires_at: '2026-03-08T00:15:00.000Z'
      },
      tool: 'delegate.cancel',
      params: { manifest_path: '/tmp/manifest.json' },
      confirmNonce: 'confirm-2',
      currentIntentId: null,
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      validateNonce: () =>
        createValidationResult({
          params: {
            request_id: 'req-confirmed',
            transport: 'discord',
            actor_id: 'actor-confirmed',
            actor_source: 'discord.oauth',
            transport_principal: 'discord:channel:confirmed'
          }
        }),
      persistConfirmations,
      emitConfirmationResolved
    });

    expect(result).toMatchObject({
      ok: false,
      status: 409,
      error: 'confirmation_scope_mismatch',
      traceability: {
        action: 'cancel',
        decision: 'rejected',
        request_id: 'req-confirmed',
        intent_id: null,
        transport: 'discord',
        actor_id: 'actor-confirmed',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:confirmed'
      }
    });
    expect(persistConfirmations).toHaveBeenCalledOnce();
    expect(emitConfirmationResolved).toHaveBeenCalledOnce();
    expect(persistConfirmations.mock.invocationCallOrder[0]).toBeLessThan(
      emitConfirmationResolved.mock.invocationCallOrder[0]
    );
  });

  it('maps validation failures to 409 rejects without side effects', async () => {
    const persistConfirmations = vi.fn(async () => undefined);
    const emitConfirmationResolved = vi.fn(async () => undefined);

    const result = await resolveCancelConfirmation({
      body: {
        action: 'cancel',
        request_id: 'req-top-level'
      },
      tool: 'delegate.cancel',
      params: { manifest_path: '/tmp/manifest.json' },
      confirmNonce: 'confirm-3',
      currentIntentId: null,
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json',
      validateNonce: () => {
        throw new Error('nonce_already_consumed');
      },
      persistConfirmations,
      emitConfirmationResolved
    });

    expect(result).toEqual({
      ok: false,
      status: 409,
      error: 'nonce_already_consumed'
    });
    expect(persistConfirmations).not.toHaveBeenCalled();
    expect(emitConfirmationResolved).not.toHaveBeenCalled();
  });
});
