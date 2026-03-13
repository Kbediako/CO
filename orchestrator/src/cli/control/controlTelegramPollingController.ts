import { logger } from '../../logger.js';
import type { ControlTelegramUpdateHandler } from './controlTelegramUpdateHandler.js';
import type { TelegramOversightApiClient, TelegramUpdate } from './telegramOversightApiClient.js';

const DEFAULT_POLL_TIMEOUT_SECONDS = 20;

export interface ControlTelegramPollingController {
  run(input: {
    isClosed: () => boolean;
    readNextUpdateId: () => number;
    persistNextUpdateId: (nextUpdateId: number, observedAt: string) => Promise<void>;
    readBotUsername: () => string | null;
  }): Promise<void>;
  abort(): void;
}

export function createControlTelegramPollingController(input: {
  pollIntervalMs: number;
  telegramClient: TelegramOversightApiClient;
  updateHandler: ControlTelegramUpdateHandler;
}): ControlTelegramPollingController {
  let activeController: AbortController | null = null;

  return {
    abort(): void {
      activeController?.abort();
      activeController = null;
    },

    async run(runtime): Promise<void> {
      while (!runtime.isClosed()) {
        try {
          const updates = await fetchUpdates({
            pollIntervalMs: input.pollIntervalMs,
            telegramClient: input.telegramClient,
            offset: runtime.readNextUpdateId(),
            setActiveController: (controller) => {
              activeController = controller;
            },
            clearActiveController: (controller) => {
              if (activeController === controller) {
                activeController = null;
              }
            }
          });
          if (updates.length > 0) {
            await handleUpdates({
              updates,
              readNextUpdateId: runtime.readNextUpdateId,
              persistNextUpdateId: runtime.persistNextUpdateId,
              readBotUsername: runtime.readBotUsername,
              updateHandler: input.updateHandler
            });
          }
        } catch (error) {
          if (runtime.isClosed() || isAbortError(error)) {
            break;
          }
          logger.warn(`[telegram-oversight] polling failed: ${(error as Error)?.message ?? String(error)}`);
        }
        if (runtime.isClosed()) {
          break;
        }
        await delay(input.pollIntervalMs);
      }
    }
  };
}

async function fetchUpdates(input: {
  pollIntervalMs: number;
  telegramClient: TelegramOversightApiClient;
  offset: number;
  setActiveController: (controller: AbortController) => void;
  clearActiveController: (controller: AbortController) => void;
}): Promise<TelegramUpdate[]> {
  const controller = new AbortController();
  input.setActiveController(controller);
  try {
    const timeout = Math.max(DEFAULT_POLL_TIMEOUT_SECONDS, Math.ceil((input.pollIntervalMs + 500) / 1_000));
    return input.telegramClient.getUpdates({
      offset: input.offset,
      timeoutSeconds: timeout,
      signal: controller.signal
    });
  } finally {
    input.clearActiveController(controller);
  }
}

async function handleUpdates(input: {
  updates: TelegramUpdate[];
  readNextUpdateId: () => number;
  persistNextUpdateId: (nextUpdateId: number, observedAt: string) => Promise<void>;
  readBotUsername: () => string | null;
  updateHandler: ControlTelegramUpdateHandler;
}): Promise<void> {
  const initialNextUpdateId = input.readNextUpdateId();
  let nextUpdateId = initialNextUpdateId;
  for (const update of input.updates) {
    nextUpdateId = Math.max(nextUpdateId, update.update_id + 1);
    try {
      await input.updateHandler.handleUpdate({
        update,
        botUsername: input.readBotUsername()
      });
    } catch (error) {
      logger.warn(
        `[telegram-oversight] failed to handle update ${update.update_id}: ${
          (error as Error)?.message ?? String(error)
        }`
      );
    }
  }
  if (nextUpdateId !== initialNextUpdateId) {
    await input.persistNextUpdateId(nextUpdateId, new Date().toISOString());
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
