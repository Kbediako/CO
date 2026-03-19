import { logger } from '../../logger.js';
import type { ControlTelegramCommandController } from './controlTelegramCommandController.js';
import type { ControlTelegramReadController } from './controlTelegramReadController.js';
import type {
  TelegramUpdate,
  TelegramUser
} from './telegramOversightApiClient.js';

export interface ControlTelegramUpdateHandler {
  handleUpdate(input: {
    update: TelegramUpdate;
    botUsername?: string | null;
  }): Promise<void>;
}

export function createControlTelegramUpdateHandler(input: {
  allowedChatIds: ReadonlySet<string>;
  readController: ControlTelegramReadController;
  commandController: ControlTelegramCommandController;
  sendMessage: (chatId: string, text: string) => Promise<void>;
}): ControlTelegramUpdateHandler {
  return {
    async handleUpdate({
      update,
      botUsername
    }: {
      update: TelegramUpdate;
      botUsername?: string | null;
    }): Promise<void> {
      const message = update.message;
      if (!message?.chat) {
        return;
      }

      const chatId = String(message.chat.id);
      if (!input.allowedChatIds.has(chatId)) {
        logger.warn(`[telegram-oversight] ignoring unauthorized chat ${chatId}`);
        return;
      }

      const rawText = typeof message.text === 'string' ? message.text.trim() : '';
      if (!rawText.startsWith('/')) {
        await input.sendMessage(chatId, 'Use /help for available commands.');
        return;
      }

      const command = normalizeTelegramCommand(rawText, botUsername ?? null);
      const response = await dispatchCommand({
        command,
        updateId: update.update_id,
        chatId,
        user: message.from ?? null,
        readController: input.readController,
        commandController: input.commandController
      });
      await input.sendMessage(chatId, response);
    }
  };
}

async function dispatchCommand(input: {
  command: string;
  updateId: number;
  chatId: string;
  user: TelegramUser | null;
  readController: ControlTelegramReadController;
  commandController: ControlTelegramCommandController;
}): Promise<string> {
  const readResponse = await input.readController.dispatchReadCommand(input.command);
  if (readResponse !== null) {
    return readResponse;
  }

  const mutatingResponse = await input.commandController.dispatchMutatingCommand({
    command: input.command,
    updateId: input.updateId,
    chatId: input.chatId,
    user: input.user
  });
  if (mutatingResponse !== null) {
    return mutatingResponse;
  }

  return 'Unknown command. Use /help for commands.';
}

function normalizeTelegramCommand(input: string, botUsername?: string | null): string {
  const token = input.trim().split(/\s+/, 1)[0] ?? '';
  const normalized = token.toLowerCase();
  if (!normalized.startsWith('/')) {
    return normalized;
  }
  const atIndex = normalized.indexOf('@');
  if (atIndex === -1) {
    return normalized;
  }
  const suffix = normalized.slice(atIndex + 1);
  if (!botUsername || suffix === botUsername.toLowerCase()) {
    return normalized.slice(0, atIndex);
  }
  return normalized;
}
