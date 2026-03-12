const TELEGRAM_API_ROOT = 'https://api.telegram.org';

type FetchLike = typeof fetch;

interface TelegramApiEnvelope<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface TelegramBotIdentity {
  id: number;
  username?: string;
  first_name?: string;
}

export interface TelegramChat {
  id: number;
  type?: string;
  title?: string;
  username?: string;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramOversightApiClient {
  getMe(): Promise<TelegramBotIdentity>;
  getUpdates(input: {
    offset: number;
    timeoutSeconds: number;
    signal?: AbortSignal;
  }): Promise<TelegramUpdate[]>;
  sendMessage(chatId: string, text: string): Promise<void>;
}

export function createTelegramOversightApiClient(options: {
  botToken: string;
  fetchImpl: FetchLike;
}): TelegramOversightApiClient {
  const telegramUrl = (method: string): string => `${TELEGRAM_API_ROOT}/bot${options.botToken}/${method}`;

  const callTelegram = async <T>(method: string): Promise<T> => {
    const response = await options.fetchImpl(telegramUrl(method));
    const payload = (await response.json()) as TelegramApiEnvelope<T>;
    if (!response.ok || !payload.ok || payload.result === undefined) {
      throw new Error(payload.description ?? `telegram_${method}_failed_${response.status}`);
    }
    return payload.result;
  };

  return {
    getMe(): Promise<TelegramBotIdentity> {
      return callTelegram<TelegramBotIdentity>('getMe');
    },

    async getUpdates(input: {
      offset: number;
      timeoutSeconds: number;
      signal?: AbortSignal;
    }): Promise<TelegramUpdate[]> {
      const query = new URLSearchParams({
        offset: String(input.offset),
        timeout: String(input.timeoutSeconds),
        allowed_updates: JSON.stringify(['message'])
      });
      const response = await options.fetchImpl(telegramUrl(`getUpdates?${query.toString()}`), {
        signal: input.signal
      });
      const payload = (await response.json()) as TelegramApiEnvelope<TelegramUpdate[]>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.description ?? `telegram_get_updates_failed_${response.status}`);
      }
      return Array.isArray(payload.result) ? payload.result : [];
    },

    async sendMessage(chatId: string, text: string): Promise<void> {
      const response = await options.fetchImpl(telegramUrl('sendMessage'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          text
        })
      });
      const payload = (await response.json()) as TelegramApiEnvelope<unknown>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.description ?? `telegram_send_message_failed_${response.status}`);
      }
    }
  };
}
