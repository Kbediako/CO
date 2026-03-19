import type { TelegramOversightBridgeState } from './controlTelegramPushState.js';
import type { TelegramBotIdentity } from './telegramOversightApiClient.js';

const DEFAULT_CLOSE_POLL_GRACE_MS = 1_000;

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
  closePollGraceMs?: number;
  flushNotifications: () => Promise<void>;
  logEnabled: (botUsername: string | null) => void;
}): TelegramOversightBridgeRuntimeLifecycle {
  let closed = false;
  let loopPromise: Promise<void> | null = null;
  let botIdentity: TelegramBotIdentity | null = null;
  const closePollGraceMs = Math.max(0, input.closePollGraceMs ?? DEFAULT_CLOSE_POLL_GRACE_MS);

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
        const activeLoopPromise = loopPromise;
        loopPromise = null;
        await Promise.race([
          activeLoopPromise.catch(() => undefined),
          delay(closePollGraceMs)
        ]);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}
