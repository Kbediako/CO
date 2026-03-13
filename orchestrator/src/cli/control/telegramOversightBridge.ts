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
  createControlTelegramPollingController,
  type ControlTelegramPollingController
} from './controlTelegramPollingController.js';
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
  type TelegramOversightBridgeState,
} from './controlTelegramPushState.js';
import {
  createTelegramOversightApiClient,
  type TelegramOversightApiClient
} from './telegramOversightApiClient.js';
import { createTelegramOversightControlActionApiClient } from './telegramOversightControlActionApiClient.js';
import {
  createTelegramOversightBridgeRuntimeLifecycle,
  type TelegramOversightBridgeRuntimeLifecycle
} from './telegramOversightBridgeRuntimeLifecycle.js';
import {
  createTelegramOversightBridgeProjectionDeliveryQueue,
  type TelegramOversightBridgeProjectionDeliveryQueue
} from './telegramOversightBridgeProjectionDeliveryQueue.js';
import {
  advanceTelegramOversightBridgeStateNextUpdateId,
  applyTelegramOversightBridgeStatePatch,
  createTelegramOversightBridgeStateStore,
  type TelegramOversightBridgeStateStore
} from './telegramOversightBridgeStateStore.js';
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_PUSH_COOLDOWN_MS = 30_000;

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
  private readonly stateStore: TelegramOversightBridgeStateStore;
  private readonly telegramClient: TelegramOversightApiClient;
  private readonly commandController: ControlTelegramCommandController;
  private readonly updateHandler: ControlTelegramUpdateHandler;
  private readonly pollingController: ControlTelegramPollingController;
  private readonly projectionNotificationController: ControlTelegramProjectionNotificationController;
  private readonly runtimeLifecycle: TelegramOversightBridgeRuntimeLifecycle;
  private readonly projectionDeliveryQueue: TelegramOversightBridgeProjectionDeliveryQueue;

  private state: TelegramOversightBridgeState = createDefaultTelegramOversightState();

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
    this.stateStore = createTelegramOversightBridgeStateStore(options.runDir);
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
    this.pollingController = createControlTelegramPollingController({
      pollIntervalMs: options.config.pollIntervalMs,
      telegramClient: this.telegramClient,
      updateHandler: this.updateHandler
    });
    this.projectionNotificationController = createControlTelegramProjectionNotificationController({
      allowedChatIds: options.config.allowedChatIds,
      pushCooldownMs: options.config.pushCooldownMs,
      renderProjectionDeltaMessage: () => this.readController.renderProjectionDeltaMessage(),
      sendMessage: (chatId, text) => this.telegramClient.sendMessage(chatId, text)
    });
    let readRuntimeClosed: (() => boolean) | null = null;
    this.projectionDeliveryQueue = createTelegramOversightBridgeProjectionDeliveryQueue({
      pushEnabled: this.config.pushEnabled,
      isClosed: () => readRuntimeClosed?.() ?? false,
      readPushState: () => this.state.push,
      notifyProjectionDelta: ({ pushState, eventSeq }) =>
        this.projectionNotificationController.notifyProjectionDelta({
          pushState,
          eventSeq
        }),
      applyStatePatchAndSave: async (statePatch) => {
        this.state = applyTelegramOversightBridgeStatePatch(this.state, statePatch);
        await this.stateStore.saveState(this.state);
      },
      logDeliveryFailure: (error) => {
        logger.warn(`[telegram-oversight] push notification failed: ${(error as Error)?.message ?? String(error)}`);
      }
    });
    this.runtimeLifecycle = createTelegramOversightBridgeRuntimeLifecycle({
      loadState: () => this.stateStore.loadState(),
      setState: (state) => {
        this.state = state;
      },
      getBotIdentity: () => this.telegramClient.getMe(),
      runPolling: (runtime) =>
        this.pollingController.run({
          isClosed: runtime.isClosed,
          readNextUpdateId: () => this.state.next_update_id,
          persistNextUpdateId: (nextUpdateId, observedAt) => this.persistNextUpdateId(nextUpdateId, observedAt),
          readBotUsername: runtime.readBotUsername
        }),
      abortPolling: () => this.pollingController.abort(),
      flushNotifications: async () => {
        await this.projectionDeliveryQueue.flushNotifications();
      },
      logEnabled: (botUsername) => {
        logger.info(
          `[telegram-oversight] enabled for ${Array.from(this.config.allowedChatIds).length} chat(s) as @${
            botUsername ?? 'bot'
          }`
        );
      }
    });
    readRuntimeClosed = () => this.runtimeLifecycle.isClosed();
  }

  async start(): Promise<void> {
    await this.runtimeLifecycle.start();
  }

  async close(): Promise<void> {
    await this.runtimeLifecycle.close();
  }

  async notifyProjectionDelta(
    input: {
      eventSeq?: number | null;
      source?: string | null;
    } = {}
  ): Promise<void> {
    await this.projectionDeliveryQueue.notifyProjectionDelta(input);
  }

  private async persistNextUpdateId(nextUpdateId: number, observedAt: string): Promise<void> {
    this.state = advanceTelegramOversightBridgeStateNextUpdateId(this.state, nextUpdateId, observedAt);
    await this.stateStore.saveState(this.state);
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
