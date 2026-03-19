import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createDefaultTelegramOversightState } from '../src/cli/control/controlTelegramPushState.js';
import {
  advanceTelegramOversightBridgeStateNextUpdateId,
  applyTelegramOversightBridgeStatePatch,
  createTelegramOversightBridgeStateStore
} from '../src/cli/control/telegramOversightBridgeStateStore.js';

async function createRunDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), `telegram-oversight-state-store-${randomUUID()}-`));
}

describe('TelegramOversightBridgeStateStore', () => {
  it('returns the default state when persisted telegram oversight state is missing', async () => {
    const runDir = await createRunDir();
    const state = await createTelegramOversightBridgeStateStore(runDir).loadState();

    expect(state.next_update_id).toBe(0);
    expect(state.push.last_sent_projection_hash).toBeNull();
    expect(state.push.pending_projection_hash).toBeNull();
  });

  it('keeps top-level updated_at monotonic when applying an older state patch', async () => {
    const currentState = {
      ...createDefaultTelegramOversightState(),
      next_update_id: 41,
      updated_at: '2026-03-06T04:00:30.000Z',
      push: {
        ...createDefaultTelegramOversightState().push,
        last_event_seq: 2
      }
    };

    const nextState = applyTelegramOversightBridgeStatePatch(currentState, {
      updated_at: '2026-03-06T04:00:10.000Z',
      push: {
        ...currentState.push,
        last_event_seq: 3
      }
    });

    expect(nextState.next_update_id).toBe(41);
    expect(nextState.updated_at).toBe('2026-03-06T04:00:30.000Z');
    expect(nextState.push.last_event_seq).toBe(3);
  });

  it('keeps top-level updated_at monotonic when advancing next_update_id with an older observed time', async () => {
    const currentState = {
      ...createDefaultTelegramOversightState(),
      next_update_id: 41,
      updated_at: '2099-01-01T00:00:00.000Z'
    };

    const nextState = advanceTelegramOversightBridgeStateNextUpdateId(
      currentState,
      88,
      '2026-03-06T04:00:30.000Z'
    );

    expect(nextState.next_update_id).toBe(88);
    expect(nextState.updated_at).toBe('2099-01-01T00:00:00.000Z');
  });
});
