import { describe, expect, it } from 'vitest';

import { createControlTelegramProjectionNotificationController } from '../src/cli/control/controlTelegramProjectionNotificationController.js';
import {
  createDefaultTelegramOversightState,
  type TelegramOversightBridgeState
} from '../src/cli/control/controlTelegramPushState.js';

describe('ControlTelegramProjectionNotificationController', () => {
  it('skips unchanged projections without sending', async () => {
    const sent: Array<{ chatId: string; text: string }> = [];
    const controller = createControlTelegramProjectionNotificationController({
      allowedChatIds: new Set(['1234']),
      pushCooldownMs: 30_000,
      renderProjectionDeltaMessage: buildProjectionRenderer('same-hash', 'CO status'),
      sendMessage: async (chatId, text) => {
        sent.push({ chatId, text });
      },
      nowMs: () => 1_000
    });

    const state = buildState({
      last_sent_projection_hash: 'same-hash',
      last_sent_at: new Date(500).toISOString()
    });
    const result = await controller.notifyProjectionDelta({
      state,
      eventSeq: 7
    });

    expect(result.delivery).toBe('skip');
    expect(sent).toEqual([]);
    expect(result.nextState.push.last_event_seq).toBe(7);
    expect(result.nextState.push.pending_projection_hash).toBeNull();
    expect(result.nextState.push.pending_projection_observed_at).toBeNull();
  });

  it('records pending projections during cooldown without sending', async () => {
    const sent: Array<{ chatId: string; text: string }> = [];
    const controller = createControlTelegramProjectionNotificationController({
      allowedChatIds: new Set(['1234']),
      pushCooldownMs: 1_000,
      renderProjectionDeltaMessage: buildProjectionRenderer('next-hash', 'CO status'),
      sendMessage: async (chatId, text) => {
        sent.push({ chatId, text });
      },
      nowMs: () => 800
    });

    const state = buildState({
      last_sent_projection_hash: 'old-hash',
      last_sent_at: new Date(250).toISOString()
    });
    const result = await controller.notifyProjectionDelta({
      state,
      eventSeq: 8
    });

    expect(result.delivery).toBe('pending');
    expect(sent).toEqual([]);
    expect(result.nextState.push.last_event_seq).toBe(8);
    expect(result.nextState.push.pending_projection_hash).toBe('next-hash');
    expect(result.nextState.push.pending_projection_observed_at).toBe(new Date(800).toISOString());
  });

  it('sends projections to every allowed chat when eligible', async () => {
    const sent: Array<{ chatId: string; text: string }> = [];
    const controller = createControlTelegramProjectionNotificationController({
      allowedChatIds: new Set(['1234', '5678']),
      pushCooldownMs: 1_000,
      renderProjectionDeltaMessage: buildProjectionRenderer('fresh-hash', 'CO status'),
      sendMessage: async (chatId, text) => {
        sent.push({ chatId, text });
      },
      nowMs: () => 5_000
    });

    const result = await controller.notifyProjectionDelta({
      state: buildState({
        last_sent_projection_hash: 'old-hash',
        last_sent_at: new Date(0).toISOString()
      }),
      eventSeq: 9
    });

    expect(result.delivery).toBe('send');
    expect(sent).toEqual([
      { chatId: '1234', text: 'CO status' },
      { chatId: '5678', text: 'CO status' }
    ]);
    expect(result.nextState.push.last_sent_projection_hash).toBe('fresh-hash');
    expect(result.nextState.push.last_sent_at).toBe(new Date(5_000).toISOString());
    expect(result.nextState.push.last_event_seq).toBe(9);
    expect(result.nextState.push.pending_projection_hash).toBeNull();
    expect(result.nextState.push.pending_projection_observed_at).toBeNull();
  });
});

function buildState(push: Partial<TelegramOversightBridgeState['push']>): TelegramOversightBridgeState {
  return {
    ...createDefaultTelegramOversightState(),
    push: {
      ...createDefaultTelegramOversightState().push,
      ...push
    }
  };
}

function buildProjectionRenderer(projectionHash: string | null, text: string) {
  return async () => ({
    projectionHash,
    text
  });
}
