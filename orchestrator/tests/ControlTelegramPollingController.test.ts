import { describe, expect, it, vi } from 'vitest';

import { logger } from '../src/logger.js';
import { createDefaultTelegramOversightState } from '../src/cli/control/controlTelegramPushState.js';
import { createControlTelegramPollingController } from '../src/cli/control/controlTelegramPollingController.js';
import type { ControlTelegramUpdateHandler } from '../src/cli/control/controlTelegramUpdateHandler.js';
import type {
  TelegramOversightApiClient,
  TelegramUpdate
} from '../src/cli/control/telegramOversightApiClient.js';

function createTelegramClient(input: {
  updates: TelegramUpdate[];
  onGetUpdates?: () => void | Promise<void>;
}): TelegramOversightApiClient {
  return {
    getMe: async () => ({ id: 1, username: 'co_test_advisory_bot' }),
    getUpdates: async () => {
      await input.onGetUpdates?.();
      return input.updates;
    },
    sendMessage: async () => {}
  };
}

function createUpdateHandler(
  implementation?: (input: { update: TelegramUpdate; botUsername?: string | null }) => Promise<void>
): ControlTelegramUpdateHandler {
  return {
    handleUpdate: implementation ?? (async () => {})
  };
}

describe('ControlTelegramPollingController', () => {
  it('advances next_update_id while keeping updated_at monotonic', async () => {
    const seededUpdatedAt = '2099-01-01T00:00:00.000Z';
    let state = {
      ...createDefaultTelegramOversightState(),
      next_update_id: 52,
      updated_at: seededUpdatedAt
    };
    const persisted: typeof state[] = [];
    let closed = false;
    const controller = createControlTelegramPollingController({
      pollIntervalMs: 0,
      telegramClient: createTelegramClient({
        updates: [
          {
            update_id: 100,
            message: {
              message_id: 1,
              chat: { id: 1234, type: 'private' },
              text: '/help'
            }
          }
        ],
        onGetUpdates: () => {
          closed = true;
        }
      }),
      updateHandler: createUpdateHandler()
    });

    await controller.run({
      isClosed: () => closed,
      readNextUpdateId: () => state.next_update_id,
      persistNextUpdateId: async (nextUpdateId, observedAt) => {
        state = {
          ...state,
          next_update_id: nextUpdateId,
          updated_at: observedAt > state.updated_at ? observedAt : state.updated_at
        };
        persisted.push(state);
      },
      readBotUsername: () => 'co_test_advisory_bot'
    });

    expect(persisted).toHaveLength(1);
    expect(state.next_update_id).toBe(101);
    expect(state.updated_at).toBe(seededUpdatedAt);
  });

  it('continues past per-update handler failures and persists the highest update offset', async () => {
    let state = {
      ...createDefaultTelegramOversightState(),
      next_update_id: 20
    };
    let closed = false;
    const handled: number[] = [];
    const warnings: string[] = [];
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation((message: string) => {
      warnings.push(message);
    });

    try {
      const controller = createControlTelegramPollingController({
        pollIntervalMs: 0,
        telegramClient: createTelegramClient({
          updates: [
            { update_id: 20, message: { message_id: 1, chat: { id: 1 }, text: '/help' } },
            { update_id: 21, message: { message_id: 2, chat: { id: 1 }, text: '/status' } }
          ],
          onGetUpdates: () => {
            closed = true;
          }
        }),
        updateHandler: createUpdateHandler(async ({ update }) => {
          handled.push(update.update_id);
          if (update.update_id === 20) {
            throw new Error('first_update_failed');
          }
        })
      });

      await controller.run({
        isClosed: () => closed,
        readNextUpdateId: () => state.next_update_id,
        persistNextUpdateId: async (nextUpdateId, observedAt) => {
          state = {
            ...state,
            next_update_id: nextUpdateId,
            updated_at: observedAt > state.updated_at ? observedAt : state.updated_at
          };
        },
        readBotUsername: () => 'co_test_advisory_bot'
      });
    } finally {
      warnSpy.mockRestore();
    }

    expect(handled).toEqual([20, 21]);
    expect(state.next_update_id).toBe(22);
    expect(warnings.some((message) => message.includes('failed to handle update 20'))).toBe(true);
  });
});
