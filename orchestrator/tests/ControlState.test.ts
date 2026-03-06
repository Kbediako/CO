import { describe, expect, it } from 'vitest';
import { ControlStateStore } from '../src/cli/control/controlState.js';

describe('ControlStateStore', () => {
  it('preserves feature toggles when actions update latest_action', () => {
    const store = new ControlStateStore({
      runId: 'run-1',
      featureToggles: { rlm: { policy: 'always' } }
    });

    store.updateAction({ action: 'pause', requestedBy: 'ui' });
    expect(
      (store.snapshot().feature_toggles as { rlm?: { policy?: string } } | undefined)?.rlm?.policy
    ).toBe('always');

    store.updateFeatureToggles({ rlm: { policy: 'off' } });
    expect((store.snapshot().latest_action as { action?: string } | undefined)?.action).toBe(
      'pause'
    );
    expect(
      (store.snapshot().feature_toggles as { rlm?: { policy?: string } } | undefined)?.rlm?.policy
    ).toBe('off');
  });

  it('enforces transport idempotency window and hashes consumed nonces', () => {
    let nowMs = Date.now();
    const store = new ControlStateStore({
      runId: 'run-1',
      now: () => new Date(nowMs).toISOString()
    });

    store.consumeTransportNonce({
      nonce: 'transport-nonce-1',
      action: 'pause',
      transport: 'discord',
      requestId: 'req-1',
      intentId: 'intent-1',
      expiresAt: new Date(nowMs + 60_000).toISOString()
    });
    expect(store.isTransportNonceConsumed('transport-nonce-1')).toBe(true);
    const firstSnapshot = store.snapshot();
    const nonceEntry = firstSnapshot.transport_mutation?.consumed_nonces?.[0];
    expect(nonceEntry?.nonce_sha256).toBeTruthy();
    expect(nonceEntry?.nonce_sha256).not.toBe('transport-nonce-1');

    const first = store.updateAction({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-1',
      intentId: 'intent-1',
      transportContext: {
        transport: 'discord',
        actorId: 'actor-1',
        actorSource: 'discord.oauth',
        principal: 'discord:channel:1',
        idempotencyWindowMs: 1_000
      }
    });
    expect(first.idempotentReplay).toBe(false);
    expect(first.snapshot.control_seq).toBe(1);

    const replay = store.updateAction({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-1',
      intentId: 'intent-1',
      transportContext: {
        transport: 'discord',
        actorId: 'actor-1',
        actorSource: 'discord.oauth',
        principal: 'discord:channel:1',
        idempotencyWindowMs: 1_000
      }
    });
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.snapshot.control_seq).toBe(1);

    nowMs += 2_000;
    const afterWindow = store.updateAction({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-1',
      intentId: 'intent-1',
      transportContext: {
        transport: 'discord',
        actorId: 'actor-1',
        actorSource: 'discord.oauth',
        principal: 'discord:channel:1',
        idempotencyWindowMs: 1_000
      }
    });
    expect(afterWindow.idempotentReplay).toBe(false);
    expect(afterWindow.snapshot.control_seq).toBe(2);
  });

  it('enforces nonce cache cap when overflow entries are unexpired', () => {
    const nowMs = Date.now();
    const store = new ControlStateStore({
      runId: 'run-1',
      now: () => new Date(nowMs).toISOString()
    });
    const expiresAt = new Date(nowMs + 60_000).toISOString();

    for (let i = 0; i < 513; i += 1) {
      store.consumeTransportNonce({
        nonce: `transport-nonce-${i}`,
        action: 'pause',
        transport: 'discord',
        requestId: `req-${i}`,
        intentId: `intent-${i}`,
        expiresAt
      });
    }

    expect(store.isTransportNonceConsumed('transport-nonce-0')).toBe(false);
    expect(store.isTransportNonceConsumed('transport-nonce-1')).toBe(true);
    expect(store.snapshot().transport_mutation?.consumed_nonces).toHaveLength(512);
  });

  it('enforces idempotency index cap when overflow entries are unexpired', () => {
    const nowMs = Date.now();
    const store = new ControlStateStore({
      runId: 'run-1',
      now: () => new Date(nowMs).toISOString()
    });
    const transportContext = {
      transport: 'discord' as const,
      actorId: 'actor-1',
      actorSource: 'discord.oauth',
      principal: 'discord:channel:1',
      idempotencyWindowMs: 60_000
    };

    for (let i = 0; i < 513; i += 1) {
      const response = store.updateAction({
        action: 'pause',
        requestedBy: 'delegate',
        requestId: `req-${i}`,
        transportContext
      });
      expect(response.idempotentReplay).toBe(false);
    }

    const replay = store.updateAction({
      action: 'pause',
      requestedBy: 'delegate',
      requestId: 'req-0',
      transportContext
    });

    expect(replay.idempotentReplay).toBe(false);
    expect(store.snapshot().transport_mutation?.idempotency_index).toHaveLength(512);
  });
});
