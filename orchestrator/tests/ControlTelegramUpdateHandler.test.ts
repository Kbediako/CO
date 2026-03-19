import { describe, expect, it, vi } from 'vitest';

import type { ControlTelegramCommandController } from '../src/cli/control/controlTelegramCommandController.js';
import type { ControlTelegramReadController } from '../src/cli/control/controlTelegramReadController.js';
import { createControlTelegramUpdateHandler } from '../src/cli/control/controlTelegramUpdateHandler.js';
import type { TelegramUpdate } from '../src/cli/control/telegramOversightApiClient.js';

function buildReadController(
  dispatchReadCommand: ControlTelegramReadController['dispatchReadCommand']
): ControlTelegramReadController {
  return {
    dispatchReadCommand,
    renderProjectionDeltaMessage: async () => ({
      projectionHash: null,
      text: 'unused'
    })
  };
}

function buildCommandController(
  dispatchMutatingCommand: ControlTelegramCommandController['dispatchMutatingCommand']
): ControlTelegramCommandController {
  return {
    dispatchMutatingCommand
  };
}

function buildUpdate(input: {
  updateId?: number;
  chatId?: number;
  text?: string;
  userId?: number | null;
  includeFrom?: boolean;
  includeChat?: boolean;
} = {}): TelegramUpdate {
  return {
    update_id: input.updateId ?? 1,
    ...(input.includeChat === false
      ? {
          message: {
            message_id: 1,
            text: input.text ?? '/status'
          }
        }
      : {
          message: {
            message_id: 1,
            text: input.text ?? '/status',
            chat: { id: input.chatId ?? 1234, type: 'private' },
            ...(input.includeFrom === false
              ? {}
              : {
                  from: {
                    id: input.userId ?? 77,
                    is_bot: false,
                    first_name: 'Operator'
                  }
                })
          }
        })
  } as TelegramUpdate;
}

describe('ControlTelegramUpdateHandler', () => {
  it('ignores updates without a chat payload', async () => {
    const sendMessage = vi.fn();
    const dispatchReadCommand = vi.fn();
    const dispatchMutatingCommand = vi.fn();
    const handler = createControlTelegramUpdateHandler({
      allowedChatIds: new Set(['1234']),
      readController: buildReadController(dispatchReadCommand),
      commandController: buildCommandController(dispatchMutatingCommand),
      sendMessage
    });

    await handler.handleUpdate({
      update: buildUpdate({ includeChat: false })
    });

    expect(dispatchReadCommand).not.toHaveBeenCalled();
    expect(dispatchMutatingCommand).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('ignores unauthorized chats without routing or replies', async () => {
    const sendMessage = vi.fn();
    const dispatchReadCommand = vi.fn();
    const dispatchMutatingCommand = vi.fn();
    const handler = createControlTelegramUpdateHandler({
      allowedChatIds: new Set(['1234']),
      readController: buildReadController(dispatchReadCommand),
      commandController: buildCommandController(dispatchMutatingCommand),
      sendMessage
    });

    await handler.handleUpdate({
      update: buildUpdate({ chatId: 9999 })
    });

    expect(dispatchReadCommand).not.toHaveBeenCalled();
    expect(dispatchMutatingCommand).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('replies with help guidance for plain text messages', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const handler = createControlTelegramUpdateHandler({
      allowedChatIds: new Set(['1234']),
      readController: buildReadController(async () => null),
      commandController: buildCommandController(async () => null),
      sendMessage
    });

    await handler.handleUpdate({
      update: buildUpdate({ text: 'hello there' })
    });

    expect(sendMessage).toHaveBeenCalledWith('1234', 'Use /help for available commands.');
  });

  it('normalizes bot-targeted read commands before dispatching them', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const dispatchReadCommand = vi.fn().mockResolvedValue('CO status');
    const dispatchMutatingCommand = vi.fn();
    const handler = createControlTelegramUpdateHandler({
      allowedChatIds: new Set(['1234']),
      readController: buildReadController(dispatchReadCommand),
      commandController: buildCommandController(dispatchMutatingCommand),
      sendMessage
    });

    await handler.handleUpdate({
      update: buildUpdate({ text: '/status@co_test_advisory_bot' }),
      botUsername: 'co_test_advisory_bot'
    });

    expect(dispatchReadCommand).toHaveBeenCalledWith('/status');
    expect(dispatchMutatingCommand).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith('1234', 'CO status');
  });

  it('falls through to the mutating controller when the read controller misses', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const dispatchReadCommand = vi.fn().mockResolvedValue(null);
    const dispatchMutatingCommand = vi.fn().mockResolvedValue('Pause requested. Control decision: applied.');
    const handler = createControlTelegramUpdateHandler({
      allowedChatIds: new Set(['1234']),
      readController: buildReadController(dispatchReadCommand),
      commandController: buildCommandController(dispatchMutatingCommand),
      sendMessage
    });

    await handler.handleUpdate({
      update: buildUpdate({ updateId: 22, text: '/pause', userId: 77 })
    });

    expect(dispatchMutatingCommand).toHaveBeenCalledWith({
      command: '/pause',
      updateId: 22,
      chatId: '1234',
      user: expect.objectContaining({ id: 77 })
    });
    expect(sendMessage).toHaveBeenCalledWith('1234', 'Pause requested. Control decision: applied.');
  });

  it('returns the unknown-command fallback when both controllers miss', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const dispatchReadCommand = vi.fn().mockResolvedValue(null);
    const dispatchMutatingCommand = vi.fn().mockResolvedValue(null);
    const handler = createControlTelegramUpdateHandler({
      allowedChatIds: new Set(['1234']),
      readController: buildReadController(dispatchReadCommand),
      commandController: buildCommandController(dispatchMutatingCommand),
      sendMessage
    });

    await handler.handleUpdate({
      update: buildUpdate({ text: '/wat' })
    });

    expect(sendMessage).toHaveBeenCalledWith('1234', 'Unknown command. Use /help for commands.');
  });
});
