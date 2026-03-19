import { describe, expect, it } from 'vitest';

import type { ControlState } from '../src/cli/control/controlState.js';
import {
  normalizeControlActionRequest,
  resolveTransportMutationRequestFromConfirmationScope,
  validateTransportMutationPreflight,
  type TransportMutationRequest
} from '../src/cli/control/controlActionPreflight.js';

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

describe('ControlActionPreflight', () => {
  it('rejects invalid actions during normalization', () => {
    const result = normalizeControlActionRequest({
      body: { action: 'ship-it' },
      authKind: 'control',
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json'
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: 'invalid_action'
    });
  });

  it('rejects disallowed session fail actions during normalization', () => {
    const result = normalizeControlActionRequest({
      body: { action: 'fail' },
      authKind: 'session',
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json'
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'ui_action_disallowed'
    });
  });

  it('rejects session coordinator metadata during normalization', () => {
    const result = normalizeControlActionRequest({
      body: { action: 'pause', intent_id: 'intent-ui' },
      authKind: 'session',
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json'
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'ui_control_metadata_disallowed'
    });
  });

  it('normalizes snake and camel aliases and defers cancel transport resolution from confirmNonce', () => {
    const result = normalizeControlActionRequest({
      body: {
        action: 'cancel',
        requestId: 'req-camel',
        intentId: 'intent-camel',
        requestedBy: 'delegate',
        confirmNonce: 'confirm-camel',
        reason: 'manual'
      },
      authKind: 'control',
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json'
    });

    expect(result).toEqual({
      ok: true,
      value: {
        action: 'cancel',
        requestId: 'req-camel',
        intentId: 'intent-camel',
        requestedBy: 'delegate',
        reason: 'manual',
        confirmNonce: 'confirm-camel',
        deferTransportResolutionToConfirmation: true,
        transportMutation: null
      }
    });
  });

  it('rejects transport metadata without a transport discriminator', () => {
    const result = normalizeControlActionRequest({
      body: {
        action: 'pause',
        request_id: 'req-metadata-only',
        actorId: 'actor-1',
        actorSource: 'discord.oauth',
        principal: 'discord:channel:1',
        nonce: 'nonce-metadata-only',
        nonceExpiresAt: '2026-03-08T00:10:00.000Z'
      },
      authKind: 'control',
      snapshot: createSnapshot(),
      taskId: 'task-0940',
      manifestPath: '/tmp/manifest.json'
    });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: 'transport_invalid',
      traceability: {
        action: 'pause',
        decision: 'rejected',
        request_id: 'req-metadata-only',
        transport: null
      }
    });
  });

  it('validates transport preflight and rejects missing idempotency keys with traceability', () => {
    const result = validateTransportMutationPreflight({
      action: 'pause',
      requestId: null,
      intentId: null,
      taskId: 'task-0940',
      snapshot: createSnapshot({
        feature_toggles: {
          transport_mutating_controls: {
            enabled: true,
            idempotency_window_ms: 120_000,
            nonce_max_ttl_ms: 120_000
          }
        }
      }),
      manifestPath: '/tmp/manifest.json',
      transportMutation: createTransportMutation({
        nonceExpiresAt: '2099-03-08T00:10:00.000Z',
        nonceExpiresAtMs: Date.parse('2099-03-08T00:10:00.000Z')
      }),
      isTransportNonceConsumed: () => false
    });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      error: 'transport_idempotency_key_missing',
      traceability: {
        action: 'pause',
        decision: 'rejected',
        transport: 'discord'
      }
    });
  });

  it('detects confirmation scope mismatches from validated params', () => {
    const result = resolveTransportMutationRequestFromConfirmationScope({
      action: 'cancel',
      body: {
        transport: 'telegram',
        actor_id: 'actor-top-level',
        actor_source: 'telegram.bot',
        transport_principal: 'telegram:chat:untrusted'
      },
      params: {
        transport: 'discord',
        actor_id: 'actor-confirmed',
        actor_source: 'discord.oauth',
        transport_principal: 'discord:channel:confirmed'
      }
    });

    expect(result).toEqual({
      request: null,
      status: 409,
      error: 'confirmation_scope_mismatch',
      partial: {
        transport: 'discord',
        actorId: 'actor-confirmed',
        actorSource: 'discord.oauth',
        principal: 'discord:channel:confirmed'
      }
    });
  });

});
