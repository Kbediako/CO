import { describe, expect, it } from 'vitest';

import { createControlTelegramProjectionNotificationController } from '../src/cli/control/controlTelegramProjectionNotificationController.js';
import {
  createDefaultTelegramOversightState,
  type TelegramOversightPushState
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
      pushState: state,
      eventSeq: 7
    });

    expect(result.delivery).toBe('skip');
    expect(result.statePatch.updated_at).toBe(new Date(1_000).toISOString());
    expect(sent).toEqual([]);
    expect(result.statePatch.push.last_event_seq).toBe(7);
    expect(result.statePatch.push.pending_projection_hash).toBeNull();
    expect(result.statePatch.push.pending_projection_observed_at).toBeNull();
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
      pushState: state,
      eventSeq: 8
    });

    expect(result.delivery).toBe('pending');
    expect(result.statePatch.updated_at).toBe(new Date(800).toISOString());
    expect(sent).toEqual([]);
    expect(result.statePatch.push.last_event_seq).toBe(8);
    expect(result.statePatch.push.pending_projection_hash).toBe('next-hash');
    expect(result.statePatch.push.pending_projection_observed_at).toBe(new Date(800).toISOString());
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
      pushState: buildState({
        last_sent_projection_hash: 'old-hash',
        last_sent_at: new Date(0).toISOString()
      }),
      eventSeq: 9
    });

    expect(result.delivery).toBe('send');
    expect(result.statePatch.updated_at).toBe(new Date(5_000).toISOString());
    expect(sent).toEqual([
      { chatId: '1234', text: 'CO status' },
      { chatId: '5678', text: 'CO status' }
    ]);
    expect(result.statePatch.push.last_sent_projection_hash).toBe('fresh-hash');
    expect(result.statePatch.push.last_sent_at).toBe(new Date(5_000).toISOString());
    expect(result.statePatch.push.last_event_seq).toBe(9);
    expect(result.statePatch.push.pending_projection_hash).toBeNull();
    expect(result.statePatch.push.pending_projection_observed_at).toBeNull();
  });

  it('preserves the original pending observed timestamp for repeated pending hashes during cooldown', async () => {
    let now = 800;
    const controller = createControlTelegramProjectionNotificationController({
      allowedChatIds: new Set(['1234']),
      pushCooldownMs: 1_000,
      renderProjectionDeltaMessage: buildProjectionRenderer('next-hash', 'CO status'),
      sendMessage: async () => undefined,
      nowMs: () => now
    });

    const first = await controller.notifyProjectionDelta({
      pushState: buildState({
        last_sent_projection_hash: 'old-hash',
        last_sent_at: new Date(250).toISOString()
      }),
      eventSeq: 8
    });

    now = 900;
    const second = await controller.notifyProjectionDelta({
      pushState: first.statePatch.push,
      eventSeq: 9
    });

    expect(first.delivery).toBe('pending');
    expect(second.delivery).toBe('pending');
    expect(first.statePatch.push.pending_projection_observed_at).toBe(new Date(800).toISOString());
    expect(second.statePatch.updated_at).toBe(new Date(900).toISOString());
    expect(second.statePatch.push.last_event_seq).toBe(9);
    expect(second.statePatch.push.pending_projection_observed_at).toBe(new Date(800).toISOString());
  });
});

function buildState(push: Partial<TelegramOversightPushState>): TelegramOversightPushState {
  return {
    ...createDefaultTelegramOversightState().push,
    ...push
  };
}

function buildProjectionRenderer(projectionHash: string | null, text: string) {
  return async () => ({
    projectionHash,
    text
  });
}
