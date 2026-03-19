import { randomBytes } from 'node:crypto';

import type { TelegramUser } from './telegramOversightApiClient.js';
import type { TelegramOversightControlActionApiClient } from './telegramOversightControlActionApiClient.js';

export interface ControlTelegramCommandController {
  dispatchMutatingCommand(input: {
    command: string;
    updateId: number;
    chatId: string;
    user: TelegramUser | null;
  }): Promise<string | null>;
}

export function createControlTelegramCommandController(input: {
  mutationsEnabled: boolean;
  controlActionClient: TelegramOversightControlActionApiClient;
}): ControlTelegramCommandController {
  return {
    async dispatchMutatingCommand({
      command,
      updateId,
      chatId,
      user
    }: {
      command: string;
      updateId: number;
      chatId: string;
      user: TelegramUser | null;
    }): Promise<string | null> {
      switch (command) {
        case '/pause':
        case '/resume':
          return applyControlCommand(command.slice(1) as 'pause' | 'resume', {
            updateId,
            chatId,
            user,
            mutationsEnabled: input.mutationsEnabled,
            controlActionClient: input.controlActionClient
          });
        default:
          return null;
      }
    }
  };
}

async function applyControlCommand(
  action: 'pause' | 'resume',
  input: {
    updateId: number;
    chatId: string;
    user: TelegramUser | null;
    mutationsEnabled: boolean;
    controlActionClient: TelegramOversightControlActionApiClient;
  }
): Promise<string> {
  if (!input.mutationsEnabled) {
    return `${capitalize(action)} is disabled for this Telegram bridge.`;
  }

  const nonce = `telegram:${input.chatId}:${input.updateId}:${action}:${randomBytes(4).toString('hex')}`;
  const nonceExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
  const actorId = input.user?.id ? `telegram.user.${input.user.id}` : `telegram.chat.${input.chatId}`;
  const body = {
    action,
    requested_by: 'telegram',
    request_id: `telegram-${action}-${input.updateId}`,
    intent_id: `telegram-${action}-${input.updateId}`,
    reason: `telegram_command_${action}`,
    transport: 'telegram',
    actor_id: actorId,
    actor_source: 'telegram.bot.polling',
    transport_principal: `telegram:chat:${input.chatId}`,
    transport_nonce: nonce,
    transport_nonce_expires_at: nonceExpiresAt
  };

  const payload = await input.controlActionClient.postAction(body);
  if (payload.error) {
    return `${capitalize(action)} failed: ${payload.error}`;
  }
  return `${capitalize(action)} requested. Control decision: ${
    payload.traceability?.decision ?? 'applied'
  }${typeof payload.control_seq === 'number' ? ` (seq ${payload.control_seq})` : ''}.`;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;
}
