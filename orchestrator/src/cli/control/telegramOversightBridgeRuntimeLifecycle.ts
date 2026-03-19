import type { TelegramOversightBridgeState } from './controlTelegramPushState.js';
import type { TelegramBotIdentity } from './telegramOversightApiClient.js';

export interface TelegramOversightBridgeRuntimeLifecycle {
  start(): Promise<void>;
  close(): Promise<void>;
  isClosed(): boolean;
}

export function createTelegramOversightBridgeRuntimeLifecycle(input: {
  loadState: () => Promise<TelegramOversightBridgeState>;
  setState: (state: TelegramOversightBridgeState) => void;
  getBotIdentity: () => Promise<TelegramBotIdentity>;
  runPolling: (runtime: {
    isClosed: () => boolean;
    readBotUsername: () => string | null;
  }) => Promise<void>;
  abortPolling: () => void;
  flushNotifications: () => Promise<void>;
  logEnabled: (botUsername: string | null) => void;
}): TelegramOversightBridgeRuntimeLifecycle {
  let closed = false;
  let loopPromise: Promise<void> | null = null;
  let botIdentity: TelegramBotIdentity | null = null;

  return {
    async start(): Promise<void> {
      input.setState(await input.loadState());
      botIdentity = await input.getBotIdentity();
      input.logEnabled(botIdentity.username ?? null);
      loopPromise = input.runPolling({
        isClosed: () => closed,
        readBotUsername: () => botIdentity?.username ?? null
      });
    },

    async close(): Promise<void> {
      closed = true;
      input.abortPolling();
      if (loopPromise) {
        await loopPromise;
        loopPromise = null;
      }
      try {
        await input.flushNotifications();
      } catch {
        // Ignore queued notification errors during shutdown.
      }
    },

    isClosed(): boolean {
      return closed;
    },
  };
}
