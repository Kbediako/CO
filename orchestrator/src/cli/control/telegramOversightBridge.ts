import { join } from 'node:path';

import { logger } from '../../logger.js';
import {
  createControlTelegramCommandController,
  type ControlTelegramCommandController
} from './controlTelegramCommandController.js';
import {
  createControlTelegramReadController,
  type ControlTelegramReadController
} from './controlTelegramReadController.js';
import {
  createControlTelegramProjectionNotificationController,
  type ControlTelegramProjectionNotificationController
} from './controlTelegramProjectionNotificationController.js';
import {
  createControlTelegramUpdateHandler,
  type ControlTelegramUpdateHandler
} from './controlTelegramUpdateHandler.js';
import type {
  ControlDispatchPilotPayload,
  ControlSelectedRunRuntimeSnapshot
} from './observabilityReadModel.js';
import {
  createDefaultTelegramOversightState,
  readTelegramOversightState,
  type TelegramOversightBridgeState,
  writeTelegramOversightState
} from './controlTelegramPushState.js';
import {
  createTelegramOversightApiClient,
  type TelegramBotIdentity,
  type TelegramOversightApiClient,
  type TelegramUpdate
} from './telegramOversightApiClient.js';
import { createTelegramOversightControlActionApiClient } from './telegramOversightControlActionApiClient.js';
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_POLL_TIMEOUT_SECONDS = 20;
const DEFAULT_PUSH_COOLDOWN_MS = 30_000;
const TELEGRAM_STATE_FILE = 'telegram-oversight-state.json';

interface TelegramOversightBridgeConfig {
  botToken: string;
  allowedChatIds: ReadonlySet<string>;
  mutationsEnabled: boolean;
  pollIntervalMs: number;
  pushEnabled: boolean;
  pushCooldownMs: number;
}

export interface ControlDispatchPayload {
  dispatch_pilot?: ControlDispatchPilotPayload | null;
  recommendation?: {
    dispatch_id?: string | null;
    summary?: string | null;
    rationale?: string | null;
    confidence?: number | null;
    tracked_issue?: {
      identifier?: string | null;
      title?: string | null;
      state?: string | null;
      url?: string | null;
      team_key?: string | null;
    } | null;
  } | null;
  error?: {
    code?: string;
    details?: {
      dispatch_pilot?: ControlDispatchPilotPayload | null;
    };
  } | null;
}

export interface QuestionRecordPayload {
  question_id?: string;
  urgency?: string;
  prompt?: string;
  status?: string;
}

export interface QuestionsPayload {
  questions?: QuestionRecordPayload[];
}

type FetchLike = typeof fetch;

export interface TelegramOversightBridge {
  notifyProjectionDelta(input?: {
    eventSeq?: number | null;
    source?: string | null;
  }): Promise<void>;
  close(): Promise<void>;
}

export interface TelegramOversightReadAdapter {
  readSelectedRun(): Promise<ControlSelectedRunRuntimeSnapshot>;
  readDispatch(): Promise<ControlDispatchPayload>;
  readQuestions(): Promise<QuestionsPayload>;
}

interface StartTelegramOversightBridgeOptions {
  runDir: string;
  readAdapter: TelegramOversightReadAdapter;
  baseUrl: string;
  controlToken: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
}

export async function startTelegramOversightBridge(
  options: StartTelegramOversightBridgeOptions
): Promise<TelegramOversightBridge | null> {
  const config = resolveTelegramOversightBridgeConfig(options.env ?? process.env);
  if (!config) {
    return null;
  }

  const bridge = new TelegramOversightBridgeRuntime({
    config,
    runDir: options.runDir,
    readAdapter: options.readAdapter,
    baseUrl: options.baseUrl,
    controlToken: options.controlToken,
    fetchImpl: options.fetchImpl ?? fetch
  });
  await bridge.start();
  return bridge;
}

class TelegramOversightBridgeRuntime implements TelegramOversightBridge {
  private readonly config: TelegramOversightBridgeConfig;
  private readonly readController: ControlTelegramReadController;
  private readonly statePath: string;
  private readonly telegramClient: TelegramOversightApiClient;
  private readonly commandController: ControlTelegramCommandController;
  private readonly updateHandler: ControlTelegramUpdateHandler;
  private readonly projectionNotificationController: ControlTelegramProjectionNotificationController;

  private closed = false;
  private loopPromise: Promise<void> | null = null;
  private activeController: AbortController | null = null;
  private state: TelegramOversightBridgeState = createDefaultTelegramOversightState();
  private botIdentity: TelegramBotIdentity | null = null;
  private notificationQueue: Promise<void> = Promise.resolve();

  constructor(options: {
    config: TelegramOversightBridgeConfig;
    runDir: string;
    readAdapter: TelegramOversightReadAdapter;
    baseUrl: string;
    controlToken: string;
    fetchImpl: FetchLike;
  }) {
    this.config = options.config;
    this.readController = createControlTelegramReadController({
      readAdapter: options.readAdapter,
      mutationsEnabled: options.config.mutationsEnabled
    });
    this.statePath = join(options.runDir, TELEGRAM_STATE_FILE);
    this.telegramClient = createTelegramOversightApiClient({
      botToken: options.config.botToken,
      fetchImpl: options.fetchImpl
    });
    const controlActionClient = createTelegramOversightControlActionApiClient({
      baseUrl: options.baseUrl,
      controlToken: options.controlToken,
      fetchImpl: options.fetchImpl
    });
    this.commandController = createControlTelegramCommandController({
      mutationsEnabled: options.config.mutationsEnabled,
      controlActionClient
    });
    this.updateHandler = createControlTelegramUpdateHandler({
      allowedChatIds: options.config.allowedChatIds,
      readController: this.readController,
      commandController: this.commandController,
      sendMessage: (chatId, text) => this.telegramClient.sendMessage(chatId, text)
    });
    this.projectionNotificationController = createControlTelegramProjectionNotificationController({
      allowedChatIds: options.config.allowedChatIds,
      pushCooldownMs: options.config.pushCooldownMs,
      renderProjectionDeltaMessage: () => this.readController.renderProjectionDeltaMessage(),
      sendMessage: (chatId, text) => this.telegramClient.sendMessage(chatId, text)
    });
  }

  async start(): Promise<void> {
    this.state = await readTelegramOversightState(this.statePath);
    this.botIdentity = await this.telegramClient.getMe();
    logger.info(
      `[telegram-oversight] enabled for ${Array.from(this.config.allowedChatIds).length} chat(s) as @${
        this.botIdentity.username ?? 'bot'
      }`
    );
    this.loopPromise = this.pollLoop();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
    if (this.loopPromise) {
      await this.loopPromise;
      this.loopPromise = null;
    }
    try {
      await this.notificationQueue;
    } catch {
      // Ignore queued notification errors during shutdown.
    }
  }

  async notifyProjectionDelta(
    input: {
      eventSeq?: number | null;
      source?: string | null;
    } = {}
  ): Promise<void> {
    if (!this.config.pushEnabled || this.closed) {
      return;
    }
    this.notificationQueue = this.notificationQueue
      .then(() => this.maybeSendProjectionDelta(input))
      .catch((error) => {
        logger.warn(`[telegram-oversight] push notification failed: ${(error as Error)?.message ?? String(error)}`);
      });
    await this.notificationQueue;
  }

  private async pollLoop(): Promise<void> {
    while (!this.closed) {
      try {
        const updates = await this.fetchUpdates();
        if (updates.length > 0) {
          await this.handleUpdates(updates);
        }
      } catch (error) {
        if (this.closed || isAbortError(error)) {
          break;
        }
        logger.warn(`[telegram-oversight] polling failed: ${(error as Error)?.message ?? String(error)}`);
      }
      if (this.closed) {
        break;
      }
      await delay(this.config.pollIntervalMs);
    }
  }

  private async fetchUpdates(): Promise<TelegramUpdate[]> {
    const controller = new AbortController();
    this.activeController = controller;
    try {
      const timeout = Math.max(
        DEFAULT_POLL_TIMEOUT_SECONDS,
        Math.ceil((this.config.pollIntervalMs + 500) / 1_000)
      );
      return this.telegramClient.getUpdates({
        offset: this.state.next_update_id,
        timeoutSeconds: timeout,
        signal: controller.signal
      });
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }

  private async handleUpdates(updates: TelegramUpdate[]): Promise<void> {
    let nextUpdateId = this.state.next_update_id;
    for (const update of updates) {
      nextUpdateId = Math.max(nextUpdateId, update.update_id + 1);
      try {
        await this.handleUpdate(update);
      } catch (error) {
        logger.warn(
          `[telegram-oversight] failed to handle update ${update.update_id}: ${
            (error as Error)?.message ?? String(error)
          }`
        );
      }
    }
    if (nextUpdateId !== this.state.next_update_id) {
      this.state = {
        ...this.state,
        next_update_id: nextUpdateId,
        updated_at: new Date().toISOString()
      };
      await this.persistState();
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    await this.updateHandler.handleUpdate({
      update,
      botUsername: this.botIdentity?.username ?? null
    });
  }

  private async maybeSendProjectionDelta(input: {
    eventSeq?: number | null;
    source?: string | null;
  }): Promise<void> {
    const result = await this.projectionNotificationController.notifyProjectionDelta({
      state: this.state,
      eventSeq: input.eventSeq
    });
    this.state = result.nextState;
    await this.persistState();
  }

  private async persistState(): Promise<void> {
    await writeTelegramOversightState(this.statePath, this.state);
  }
}

function resolveTelegramOversightBridgeConfig(env: NodeJS.ProcessEnv): TelegramOversightBridgeConfig | null {
  if (!parseBooleanEnv(env.CO_TELEGRAM_POLLING_ENABLED)) {
    return null;
  }
  const botToken = env.CO_TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    return null;
  }
  const allowedChatIds = parseCsvSet(env.CO_TELEGRAM_ALLOWED_CHAT_IDS);
  if (allowedChatIds.size === 0) {
    return null;
  }
  return {
    botToken,
    allowedChatIds,
    mutationsEnabled: parseBooleanEnv(env.CO_TELEGRAM_ENABLE_MUTATIONS),
    pollIntervalMs: parsePositiveIntegerEnv(env.CO_TELEGRAM_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS),
    pushEnabled: parseBooleanEnv(env.CO_TELEGRAM_PUSH_ENABLED),
    pushCooldownMs: parsePositiveIntegerEnv(env.CO_TELEGRAM_PUSH_INTERVAL_MS, DEFAULT_PUSH_COOLDOWN_MS)
  };
}

function parseCsvSet(value: string | undefined): Set<string> {
  if (!value) {
    return new Set();
  }
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return new Set(entries);
}

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parsePositiveIntegerEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
