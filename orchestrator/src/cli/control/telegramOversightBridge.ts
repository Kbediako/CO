import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

import { logger } from '../../logger.js';
import {
  createControlTelegramReadController,
  type ControlTelegramReadController
} from './controlTelegramReadController.js';
import type {
  ControlDispatchPilotPayload,
  ControlSelectedRunRuntimeSnapshot
} from './observabilityReadModel.js';
import {
  computeTelegramProjectionStateTransition,
  createDefaultTelegramOversightState,
  readTelegramOversightState,
  type TelegramOversightBridgeState,
  writeTelegramOversightState
} from './controlTelegramPushState.js';
import {
  createTelegramOversightApiClient,
  type TelegramBotIdentity,
  type TelegramOversightApiClient,
  type TelegramUpdate,
  type TelegramUser
} from './telegramOversightApiClient.js';
import {
  createTelegramOversightControlActionApiClient,
  type TelegramOversightControlActionApiClient
} from './telegramOversightControlActionApiClient.js';
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
  private readonly controlActionClient: TelegramOversightControlActionApiClient;

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
    this.controlActionClient = createTelegramOversightControlActionApiClient({
      baseUrl: options.baseUrl,
      controlToken: options.controlToken,
      fetchImpl: options.fetchImpl
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
    const message = update.message;
    if (!message?.chat) {
      return;
    }
    const chatId = String(message.chat.id);
    if (!this.config.allowedChatIds.has(chatId)) {
      logger.warn(`[telegram-oversight] ignoring unauthorized chat ${chatId}`);
      return;
    }

    const rawText = typeof message.text === 'string' ? message.text.trim() : '';
    if (!rawText.startsWith('/')) {
      await this.telegramClient.sendMessage(chatId, 'Use /help for available commands.');
      return;
    }

    const command = normalizeTelegramCommand(rawText, this.botIdentity?.username);
    const response = await this.dispatchCommand({
      command,
      updateId: update.update_id,
      chatId,
      user: message.from ?? null
    });
    await this.telegramClient.sendMessage(chatId, response);
  }

  private async dispatchCommand(input: {
    command: string;
    updateId: number;
    chatId: string;
    user: TelegramUser | null;
  }): Promise<string> {
    const readResponse = await this.readController.dispatchReadCommand(input.command);
    if (readResponse !== null) {
      return readResponse;
    }
    switch (input.command) {
      case '/pause':
      case '/resume':
        return this.applyControlCommand(input.command.slice(1) as 'pause' | 'resume', input);
      default:
        return 'Unknown command. Use /help for commands.';
    }
  }

  private async applyControlCommand(
    action: 'pause' | 'resume',
    input: {
      updateId: number;
      chatId: string;
      user: TelegramUser | null;
    }
  ): Promise<string> {
    if (!this.config.mutationsEnabled) {
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

    const payload = await this.controlActionClient.postAction(body);
    if (payload.error) {
      return `${capitalize(action)} failed: ${payload.error}`;
    }
    return `${capitalize(action)} requested. Control decision: ${payload.traceability?.decision ?? 'applied'}${typeof payload.control_seq === 'number' ? ` (seq ${payload.control_seq})` : ''}.`;
  }

  private async maybeSendProjectionDelta(input: {
    eventSeq?: number | null;
    source?: string | null;
  }): Promise<void> {
    const now = Date.now();
    const projection = await this.readController.renderProjectionDeltaMessage();
    const transition = computeTelegramProjectionStateTransition({
      state: this.state,
      projectionHash: projection.projectionHash,
      eventSeq: input.eventSeq,
      nowMs: now,
      pushCooldownMs: this.config.pushCooldownMs
    });

    if (transition.kind === 'skip' || transition.kind === 'pending') {
      this.state = transition.nextState;
      await this.persistState();
      return;
    }

    const text = projection.text;
    for (const chatId of this.config.allowedChatIds) {
      await this.telegramClient.sendMessage(chatId, text);
    }

    this.state = transition.nextState;
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

function normalizeTelegramCommand(input: string, botUsername?: string): string {
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

function capitalize(value: string): string {
  return value.length === 0 ? value : `${value[0].toUpperCase()}${value.slice(1)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
