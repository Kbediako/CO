import { describe, expect, it, vi } from 'vitest';

import {
  createControlTelegramCommandController
} from '../src/cli/control/controlTelegramCommandController.js';
import type { TelegramUser } from '../src/cli/control/telegramOversightApiClient.js';
import type { TelegramOversightControlActionApiClient } from '../src/cli/control/telegramOversightControlActionApiClient.js';

function buildUser(userId = 77): TelegramUser {
  return {
    id: userId,
    is_bot: false,
    first_name: 'Operator'
  };
}

describe('ControlTelegramCommandController', () => {
  it('returns null for non-mutating commands so the bridge keeps read routing and fallback ownership', async () => {
    const controller = createControlTelegramCommandController({
      mutationsEnabled: true,
      controlActionClient: {
        postAction: vi.fn()
      } satisfies TelegramOversightControlActionApiClient
    });

    await expect(
      controller.dispatchMutatingCommand({
        command: '/status',
        updateId: 1,
        chatId: '1234',
        user: buildUser()
      })
    ).resolves.toBeNull();
    await expect(
      controller.dispatchMutatingCommand({
        command: '/wat',
        updateId: 2,
        chatId: '1234',
        user: buildUser()
      })
    ).resolves.toBeNull();
  });

  it('returns the disabled message for mutating commands when mutations are off', async () => {
    const postAction = vi.fn();
    const controller = createControlTelegramCommandController({
      mutationsEnabled: false,
      controlActionClient: { postAction } satisfies TelegramOversightControlActionApiClient
    });

    await expect(
      controller.dispatchMutatingCommand({
        command: '/pause',
        updateId: 1,
        chatId: '1234',
        user: buildUser()
      })
    ).resolves.toBe('Pause is disabled for this Telegram bridge.');
    expect(postAction).not.toHaveBeenCalled();
  });

  it('preserves transport-mutating control fields for pause requests', async () => {
    const postAction = vi.fn().mockResolvedValue({
      control_seq: 42,
      traceability: { decision: 'applied' }
    });
    const controller = createControlTelegramCommandController({
      mutationsEnabled: true,
      controlActionClient: { postAction } satisfies TelegramOversightControlActionApiClient
    });

    await expect(
      controller.dispatchMutatingCommand({
        command: '/pause',
        updateId: 200,
        chatId: '1234',
        user: buildUser(77)
      })
    ).resolves.toBe('Pause requested. Control decision: applied (seq 42).');

    expect(postAction).toHaveBeenCalledTimes(1);
    expect(postAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'pause',
        requested_by: 'telegram',
        request_id: 'telegram-pause-200',
        intent_id: 'telegram-pause-200',
        reason: 'telegram_command_pause',
        transport: 'telegram',
        actor_id: 'telegram.user.77',
        actor_source: 'telegram.bot.polling',
        transport_principal: 'telegram:chat:1234',
      })
    );
    expect(postAction.mock.calls[0]?.[0]?.transport_nonce).toMatch(/^telegram:1234:200:pause:/);
    expect(postAction.mock.calls[0]?.[0]?.transport_nonce_expires_at).toEqual(expect.any(String));
  });

  it('falls back to chat actor identity and surfaces payload errors for mutating commands', async () => {
    const postAction = vi.fn().mockResolvedValue({
      error: 'csrf_invalid: bad token'
    });
    const controller = createControlTelegramCommandController({
      mutationsEnabled: true,
      controlActionClient: { postAction } satisfies TelegramOversightControlActionApiClient
    });

    await expect(
      controller.dispatchMutatingCommand({
        command: '/resume',
        updateId: 201,
        chatId: '1234',
        user: null
      })
    ).resolves.toBe('Resume failed: csrf_invalid: bad token');

    expect(postAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'resume',
        actor_id: 'telegram.chat.1234',
        transport_principal: 'telegram:chat:1234'
      })
    );
  });
});
