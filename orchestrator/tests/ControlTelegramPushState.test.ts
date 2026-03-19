import { describe, expect, it } from 'vitest';

import { computeTelegramProjectionStateTransition } from '../src/cli/control/controlTelegramPushState.js';

describe('ControlTelegramPushState', () => {
  it('keeps a pending projection during cooldown without resetting the original observed time', () => {
    const transition = computeTelegramProjectionStateTransition({
      pushState: {
        last_sent_projection_hash: 'hash-1',
        last_sent_at: '2026-03-12T00:00:10.000Z',
        last_event_seq: 4,
        pending_projection_hash: 'hash-2',
        pending_projection_observed_at: '2026-03-12T00:00:20.000Z'
      },
      projectionHash: 'hash-2',
      eventSeq: 5,
      nowMs: Date.parse('2026-03-12T00:00:25.000Z'),
      pushCooldownMs: 30_000
    });

    expect(transition.kind).toBe('pending');
    expect(transition.statePatch.updated_at).toBe('2026-03-12T00:00:25.000Z');
    expect(transition.statePatch.push.last_event_seq).toBe(5);
    expect(transition.statePatch.push.pending_projection_hash).toBe('hash-2');
    expect(transition.statePatch.push.pending_projection_observed_at).toBe('2026-03-12T00:00:20.000Z');
  });

  it('returns a send transition that clears pending projection state', () => {
    const transition = computeTelegramProjectionStateTransition({
      pushState: {
        last_sent_projection_hash: 'hash-1',
        last_sent_at: '2026-03-12T00:00:10.000Z',
        last_event_seq: 4,
        pending_projection_hash: 'hash-2',
        pending_projection_observed_at: '2026-03-12T00:00:20.000Z'
      },
      projectionHash: 'hash-3',
      eventSeq: 6,
      nowMs: Date.parse('2026-03-12T00:01:00.000Z'),
      pushCooldownMs: 30_000
    });

    expect(transition.kind).toBe('send');
    expect(transition.statePatch.updated_at).toBe('2026-03-12T00:01:00.000Z');
    expect(transition.statePatch.push.last_sent_projection_hash).toBe('hash-3');
    expect(transition.statePatch.push.last_sent_at).toBe('2026-03-12T00:01:00.000Z');
    expect(transition.statePatch.push.last_event_seq).toBe(6);
    expect(transition.statePatch.push.pending_projection_hash).toBeNull();
    expect(transition.statePatch.push.pending_projection_observed_at).toBeNull();
  });
});
