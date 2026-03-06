import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logger } from '../../logger.js';
import { writeJsonAtomic } from '../utils/fs.js';

const TELEGRAM_API_ROOT = 'https://api.telegram.org';
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

interface TelegramOversightBridgeState {
  next_update_id: number;
  updated_at: string;
  push: {
    last_sent_projection_hash: string | null;
    last_sent_at: string | null;
    last_event_seq: number | null;
    pending_projection_hash: string | null;
    pending_projection_observed_at: string | null;
  };
}

interface TelegramBotIdentity {
  id: number;
  username?: string;
  first_name?: string;
}

interface TelegramApiEnvelope<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

interface TelegramChat {
  id: number;
  type?: string;
  title?: string;
  username?: string;
}

interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface ControlDispatchPilotPayload {
  status?: string;
  source_status?: string;
  reason?: string;
}

export interface ControlTrackedLinearPayload {
  identifier?: string | null;
  title?: string | null;
  state?: string | null;
  url?: string | null;
  team_key?: string | null;
}

export interface ControlQuestionSummaryPayload {
  queued_count?: number;
  latest_question?: {
    question_id?: string | null;
    prompt?: string | null;
    urgency?: string | null;
    queued_at?: string | null;
  } | null;
}

export interface ControlLatestEventPayload {
  event?: string | null;
  message?: string | null;
  at?: string | null;
  requested_by?: string | null;
  reason?: string | null;
}

export interface ControlSelectedRunPayload {
  issue_identifier?: string | null;
  run_id?: string | null;
  raw_status?: string | null;
  display_status?: string | null;
  status_reason?: string | null;
  summary?: string | null;
  latest_event?: ControlLatestEventPayload | null;
  question_summary?: ControlQuestionSummaryPayload | null;
  tracked?: {
    linear?: ControlTrackedLinearPayload;
  } | null;
}

export interface ControlStatePayload {
  counts?: {
    running?: number;
    retrying?: number;
  };
  running?: Array<{
    issue_identifier?: string | null;
    session_id?: string | null;
    state?: string | null;
    display_state?: string | null;
    status_reason?: string | null;
    last_event?: string | null;
    last_message?: string | null;
  }>;
  selected?: ControlSelectedRunPayload | null;
  dispatch_pilot?: ControlDispatchPilotPayload | null;
  tracked?: {
    linear?: ControlTrackedLinearPayload;
  } | null;
}

export interface ControlIssuePayload {
  issue_identifier?: string | null;
  status?: string | null;
  raw_status?: string | null;
  display_status?: string | null;
  status_reason?: string | null;
  summary?: string | null;
  latest_event?: ControlLatestEventPayload | null;
  question_summary?: ControlQuestionSummaryPayload | null;
  recent_events?: ControlLatestEventPayload[];
  tracked?: {
    linear?: ControlTrackedLinearPayload;
  } | null;
  dispatch_pilot?: ControlDispatchPilotPayload | null;
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

interface ControlActionResponse {
  error?: string;
  control_seq?: number;
  traceability?: {
    decision?: string;
  };
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
  readState(): Promise<ControlStatePayload>;
  readIssue(issueIdentifier: string): Promise<ControlIssuePayload | null>;
  readDispatch(): Promise<ControlDispatchPayload>;
  readQuestions(): Promise<QuestionsPayload>;
  resolveIssueIdentifier(): Promise<string | null>;
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
  private readonly runDir: string;
  private readonly readAdapter: TelegramOversightReadAdapter;
  private readonly baseUrl: string;
  private readonly controlToken: string;
  private readonly fetchImpl: FetchLike;
  private readonly statePath: string;

  private closed = false;
  private loopPromise: Promise<void> | null = null;
  private activeController: AbortController | null = null;
  private state: TelegramOversightBridgeState = {
    next_update_id: 0,
    updated_at: new Date(0).toISOString(),
    push: {
      last_sent_projection_hash: null,
      last_sent_at: null,
      last_event_seq: null,
      pending_projection_hash: null,
      pending_projection_observed_at: null
    }
  };
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
    this.runDir = options.runDir;
    this.readAdapter = options.readAdapter;
    this.baseUrl = options.baseUrl;
    this.controlToken = options.controlToken;
    this.fetchImpl = options.fetchImpl;
    this.statePath = join(options.runDir, TELEGRAM_STATE_FILE);
  }

  async start(): Promise<void> {
    this.state = await readTelegramState(this.statePath);
    this.botIdentity = await this.callTelegram<TelegramBotIdentity>('getMe');
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
      const query = new URLSearchParams({
        offset: String(this.state.next_update_id),
        timeout: String(timeout),
        allowed_updates: JSON.stringify(['message'])
      });
      const response = await this.fetchImpl(this.telegramUrl(`getUpdates?${query.toString()}`), {
        signal: controller.signal
      });
      const payload = (await response.json()) as TelegramApiEnvelope<TelegramUpdate[]>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.description ?? `telegram_get_updates_failed_${response.status}`);
      }
      return Array.isArray(payload.result) ? payload.result : [];
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
      await this.sendMessage(chatId, 'Use /help for available commands.');
      return;
    }

    const command = normalizeTelegramCommand(rawText, this.botIdentity?.username);
    const response = await this.dispatchCommand({
      command,
      updateId: update.update_id,
      chatId,
      user: message.from ?? null
    });
    await this.sendMessage(chatId, response);
  }

  private async dispatchCommand(input: {
    command: string;
    updateId: number;
    chatId: string;
    user: TelegramUser | null;
  }): Promise<string> {
    switch (input.command) {
      case '/start':
        return 'CO oversight is connected. Use /help for commands.';
      case '/help':
        return buildHelpMessage(this.config.mutationsEnabled);
      case '/status':
        return this.renderStatus();
      case '/issue':
        return this.renderIssue();
      case '/dispatch':
        return this.renderDispatch();
      case '/questions':
        return this.renderQuestions();
      case '/pause':
      case '/resume':
        return this.applyControlCommand(input.command.slice(1) as 'pause' | 'resume', input);
      default:
        return 'Unknown command. Use /help for commands.';
    }
  }

  private async renderStatus(): Promise<string> {
    const payload = await this.readAdapter.readState();
    const selected = payload.selected ?? null;
    const running = payload.running?.[0] ?? null;
    const dispatch = payload.dispatch_pilot ?? null;
    const trackedLinear = selected?.tracked?.linear ?? payload.tracked?.linear ?? null;
    if (!selected && !running) {
      return [
        'CO status',
        'No active running projection.',
        trackedLinear?.identifier
          ? `Linear: ${trackedLinear.identifier}${trackedLinear.title ? ` - ${truncateLine(trackedLinear.title, 120)}` : ''}`
          : null,
        trackedLinear?.state ? `Linear state: ${trackedLinear.state}` : null,
        formatDispatchSummary(dispatch)
      ]
        .filter(Boolean)
        .join('\n');
    }

    const issueIdentifier = selected?.issue_identifier ?? running?.issue_identifier ?? 'n/a';
    const sessionId = selected?.run_id ?? running?.session_id ?? null;
    const displayStatus = selected?.display_status ?? running?.display_state ?? running?.state ?? 'unknown';
    const rawStatus = selected?.raw_status ?? running?.state ?? null;
    const statusReason = selected?.status_reason ?? running?.status_reason ?? null;
    const latestEvent = selected?.latest_event ?? null;
    const questionSummary = selected?.question_summary ?? null;
    const summary = latestEvent?.message ?? selected?.summary ?? running?.last_message ?? null;

    return [
      'CO status',
      `Issue: ${issueIdentifier}`,
      formatStateLine(displayStatus, rawStatus),
      statusReason ? `Reason: ${statusReason}` : null,
      sessionId ? `Session: ${sessionId}` : null,
      latestEvent?.event ? `Last event: ${latestEvent.event}` : running?.last_event ? `Last event: ${running.last_event}` : null,
      summary ? `Summary: ${truncateLine(summary, 180)}` : null,
      formatQuestionSummary(questionSummary),
      trackedLinear?.identifier
        ? `Linear: ${trackedLinear.identifier}${trackedLinear.title ? ` - ${truncateLine(trackedLinear.title, 120)}` : ''}`
        : null,
      trackedLinear?.state ? `Linear state: ${trackedLinear.state}` : null,
      formatDispatchSummary(dispatch)
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async renderIssue(): Promise<string> {
    const issueIdentifier = await this.readAdapter.resolveIssueIdentifier();
    if (!issueIdentifier) {
      return 'No issue identifier is available for the current run.';
    }
    const payload = await this.readAdapter.readIssue(issueIdentifier);
    if (!payload) {
      throw new Error('not_found');
    }
    const trackedLinear = payload.tracked?.linear ?? null;
    const latestEvent = payload.latest_event ?? payload.recent_events?.[0] ?? null;
    const displayStatus = payload.display_status ?? payload.status ?? 'unknown';

    return [
      `Issue ${payload.issue_identifier ?? issueIdentifier}`,
      formatStateLine(displayStatus, payload.raw_status ?? payload.status ?? null, 'Status'),
      payload.status_reason ? `Reason: ${payload.status_reason}` : null,
      trackedLinear?.identifier ? `Linear: ${trackedLinear.identifier}${trackedLinear.title ? ` - ${truncateLine(trackedLinear.title, 120)}` : ''}` : null,
      trackedLinear?.state ? `Linear state: ${trackedLinear.state}` : null,
      trackedLinear?.url ? `Linear URL: ${trackedLinear.url}` : null,
      latestEvent?.event ? `Latest event: ${latestEvent.event}` : null,
      latestEvent?.message
        ? `Latest summary: ${truncateLine(latestEvent.message, 180)}`
        : payload.summary
          ? `Latest summary: ${truncateLine(payload.summary, 180)}`
          : null,
      formatQuestionSummary(payload.question_summary),
      formatDispatchSummary(payload.dispatch_pilot ?? null)
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async renderDispatch(): Promise<string> {
    const payload = await this.readAdapter.readDispatch();
    const dispatchPilot = payload.dispatch_pilot ?? payload.error?.details?.dispatch_pilot ?? null;
    const trackedIssue = payload.recommendation?.tracked_issue ?? null;

    return [
      'Dispatch advisory',
      formatDispatchSummary(dispatchPilot),
      payload.recommendation?.summary ? `Summary: ${truncateLine(payload.recommendation.summary, 180)}` : null,
      payload.recommendation?.rationale ? `Rationale: ${truncateLine(payload.recommendation.rationale, 180)}` : null,
      payload.recommendation?.confidence !== undefined && payload.recommendation?.confidence !== null
        ? `Confidence: ${payload.recommendation.confidence}`
        : null,
      trackedIssue?.identifier
        ? `Tracked issue: ${trackedIssue.identifier}${trackedIssue.title ? ` - ${truncateLine(trackedIssue.title, 120)}` : ''}`
        : null,
      trackedIssue?.url ? `Tracked URL: ${trackedIssue.url}` : null,
      payload.error?.code ? `Status: ${payload.error.code}` : null
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async renderQuestions(): Promise<string> {
    const payload = await this.readAdapter.readQuestions();
    const queued = (payload.questions ?? []).filter((question) => question.status === 'queued');
    if (queued.length === 0) {
      return 'No queued questions.';
    }
    return [
      `Queued questions: ${queued.length}`,
      ...queued.slice(0, 3).map((question) => {
        const urgency = question.urgency ? ` [${question.urgency}]` : '';
        return `${question.question_id ?? 'question'}${urgency}: ${truncateLine(question.prompt ?? '', 140)}`;
      })
    ].join('\n');
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

    const payload = await this.writeControlJson<ControlActionResponse>('/control/action', body);
    if (payload.error) {
      return `${capitalize(action)} failed: ${payload.error}`;
    }
    return `${capitalize(action)} requested. Control decision: ${payload.traceability?.decision ?? 'applied'}${typeof payload.control_seq === 'number' ? ` (seq ${payload.control_seq})` : ''}.`;
  }

  private async writeControlJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await this.fetchImpl(new URL(path, this.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.controlToken}`,
        'x-csrf-token': this.controlToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return readJsonResponse<T>(response);
  }

  private async sendMessage(chatId: string, text: string): Promise<void> {
    const response = await this.fetchImpl(this.telegramUrl('sendMessage'), {
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

  private async callTelegram<T>(method: string): Promise<T> {
    const response = await this.fetchImpl(this.telegramUrl(method));
    const payload = (await response.json()) as TelegramApiEnvelope<T>;
    if (!response.ok || !payload.ok || payload.result === undefined) {
      throw new Error(payload.description ?? `telegram_${method}_failed_${response.status}`);
    }
    return payload.result;
  }

  private telegramUrl(method: string): string {
    return `${TELEGRAM_API_ROOT}/bot${this.config.botToken}/${method}`;
  }

  private async maybeSendProjectionDelta(input: {
    eventSeq?: number | null;
    source?: string | null;
  }): Promise<void> {
    const normalizedEventSeq =
      typeof input.eventSeq === 'number' && Number.isFinite(input.eventSeq) ? Math.floor(input.eventSeq) : null;
    const nextEventSeq = normalizedEventSeq ?? this.state.push.last_event_seq;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const payload = await this.readAdapter.readState();
    const projectionHash = buildProjectionHash(payload);

    if (!projectionHash || projectionHash === this.state.push.last_sent_projection_hash) {
      this.state = {
        ...this.state,
        updated_at: nowIso,
        push: {
          ...this.state.push,
          last_event_seq: nextEventSeq,
          pending_projection_hash: null,
          pending_projection_observed_at: null
        }
      };
      await this.persistState();
      return;
    }

    const lastSentAtMs = this.state.push.last_sent_at ? Date.parse(this.state.push.last_sent_at) : Number.NaN;
    if (Number.isFinite(lastSentAtMs) && now - lastSentAtMs < this.config.pushCooldownMs) {
      this.state = {
        ...this.state,
        updated_at: nowIso,
        push: {
          ...this.state.push,
          last_event_seq: nextEventSeq,
          pending_projection_hash: projectionHash,
          pending_projection_observed_at:
            projectionHash === this.state.push.pending_projection_hash
              ? this.state.push.pending_projection_observed_at ?? nowIso
              : nowIso
        }
      };
      await this.persistState();
      return;
    }

    const text = await this.renderStatus();
    for (const chatId of this.config.allowedChatIds) {
      await this.sendMessage(chatId, text);
    }

    const sentAt = new Date(now).toISOString();
    this.state = {
      ...this.state,
      updated_at: sentAt,
      push: {
        last_sent_projection_hash: projectionHash,
        last_sent_at: sentAt,
        last_event_seq: nextEventSeq,
        pending_projection_hash: null,
        pending_projection_observed_at: null
      }
    };
    await this.persistState();
  }

  private async persistState(): Promise<void> {
    await writeJsonAtomic(this.statePath, this.state);
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

async function readTelegramState(path: string): Promise<TelegramOversightBridgeState> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<TelegramOversightBridgeState>;
    const nextUpdateId =
      typeof parsed.next_update_id === 'number' && Number.isInteger(parsed.next_update_id) && parsed.next_update_id >= 0
        ? parsed.next_update_id
        : 0;
    return {
      next_update_id: nextUpdateId,
      updated_at:
        typeof parsed.updated_at === 'string' && parsed.updated_at.trim().length > 0
          ? parsed.updated_at
          : new Date(0).toISOString(),
      push: {
        last_sent_projection_hash:
          parsed.push && typeof parsed.push === 'object' && !Array.isArray(parsed.push)
            ? readStringValue(parsed.push as Record<string, unknown>, 'last_sent_projection_hash') ?? null
            : null,
        last_sent_at:
          parsed.push && typeof parsed.push === 'object' && !Array.isArray(parsed.push)
            ? readStringValue(parsed.push as Record<string, unknown>, 'last_sent_at') ?? null
            : null,
        last_event_seq:
          parsed.push &&
          typeof parsed.push === 'object' &&
          !Array.isArray(parsed.push) &&
          typeof (parsed.push as Record<string, unknown>).last_event_seq === 'number' &&
          Number.isInteger((parsed.push as Record<string, unknown>).last_event_seq)
            ? ((parsed.push as Record<string, unknown>).last_event_seq as number)
            : null,
        pending_projection_hash:
          parsed.push && typeof parsed.push === 'object' && !Array.isArray(parsed.push)
            ? readStringValue(parsed.push as Record<string, unknown>, 'pending_projection_hash') ?? null
            : null,
        pending_projection_observed_at:
          parsed.push && typeof parsed.push === 'object' && !Array.isArray(parsed.push)
            ? readStringValue(parsed.push as Record<string, unknown>, 'pending_projection_observed_at') ?? null
            : null
      }
    };
  } catch {
    return {
      next_update_id: 0,
      updated_at: new Date(0).toISOString(),
      push: {
        last_sent_projection_hash: null,
        last_sent_at: null,
        last_event_seq: null,
        pending_projection_hash: null,
        pending_projection_observed_at: null
      }
    };
  }
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    const message = resolveErrorMessage(payload);
    throw new Error(message);
  }
  return payload;
}

function resolveErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'request_failed';
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.error === 'string' && record.error.trim().length > 0) {
    return record.error.trim();
  }
  const error = record.error;
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const errorRecord = error as Record<string, unknown>;
    const code = typeof errorRecord.code === 'string' ? errorRecord.code : null;
    const message = typeof errorRecord.message === 'string' ? errorRecord.message : null;
    if (code && message) {
      return `${code}: ${message}`;
    }
    if (code) {
      return code;
    }
    if (message) {
      return message;
    }
  }
  return 'request_failed';
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

function buildHelpMessage(mutationsEnabled: boolean): string {
  return [
    'Commands:',
    '/start',
    '/help',
    '/status',
    '/issue',
    '/dispatch',
    '/questions',
    mutationsEnabled ? '/pause' : '/pause (disabled)',
    mutationsEnabled ? '/resume' : '/resume (disabled)'
  ].join('\n');
}

function formatDispatchSummary(
  dispatchPilot: ControlDispatchPilotPayload | null | undefined
): string | null {
  if (!dispatchPilot) {
    return null;
  }
  const status = dispatchPilot.status ?? 'unknown';
  const sourceStatus = dispatchPilot.source_status ?? 'unknown';
  const reason = dispatchPilot.reason ? ` (${dispatchPilot.reason})` : '';
  return `Dispatch: ${status}/${sourceStatus}${reason}`;
}

function formatStateLine(
  displayStatus: string | null | undefined,
  rawStatus: string | null | undefined,
  label = 'State'
): string {
  const normalizedDisplay = displayStatus && displayStatus.trim().length > 0 ? displayStatus.trim() : 'unknown';
  const normalizedRaw = rawStatus && rawStatus.trim().length > 0 ? rawStatus.trim() : null;
  if (!normalizedRaw || normalizedRaw === normalizedDisplay) {
    return `${label}: ${normalizedDisplay}`;
  }
  return `${label}: ${normalizedDisplay} (raw ${normalizedRaw})`;
}

function formatQuestionSummary(summary: ControlQuestionSummaryPayload | null | undefined): string | null {
  if (!summary || typeof summary.queued_count !== 'number' || summary.queued_count <= 0) {
    return null;
  }
  const latestQuestion = summary.latest_question ?? null;
  const latestPrompt =
    latestQuestion?.prompt && latestQuestion.prompt.trim().length > 0
      ? truncateLine(latestQuestion.prompt, 120)
      : null;
  const urgency =
    latestQuestion?.urgency && latestQuestion.urgency.trim().length > 0 ? ` [${latestQuestion.urgency}]` : '';
  if (latestQuestion?.question_id) {
    return `Queued questions: ${summary.queued_count} (latest ${latestQuestion.question_id}${urgency}${latestPrompt ? `: ${latestPrompt}` : ''})`;
  }
  return `Queued questions: ${summary.queued_count}`;
}

function truncateLine(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(maxLength - 3, 1))}...`;
}

function buildProjectionHash(payload: ControlStatePayload): string | null {
  const selected = payload.selected ?? null;
  const running = payload.running?.[0] ?? null;
  const dispatchPilot = payload.dispatch_pilot ?? null;
  const trackedLinear = selected?.tracked?.linear ?? payload.tracked?.linear ?? null;
  const questionSummary = selected?.question_summary ?? null;
  if (!selected && !running && !trackedLinear && !dispatchPilot && !questionSummary) {
    return null;
  }
  const fingerprint = {
    selected: selected
      ? {
          issue_identifier: selected.issue_identifier ?? null,
          run_id: selected.run_id ?? null,
          raw_status: selected.raw_status ?? null,
          display_status: selected.display_status ?? null,
          status_reason: selected.status_reason ?? null,
          summary: selected.summary ?? null,
          latest_event: selected.latest_event
            ? {
                event: selected.latest_event.event ?? null,
                message: selected.latest_event.message ?? null,
                at: selected.latest_event.at ?? null
              }
            : null,
          question_summary: questionSummary
            ? {
                queued_count: questionSummary.queued_count ?? 0,
                latest_question_id: questionSummary.latest_question?.question_id ?? null
              }
            : null
        }
      : null,
    running: running
      ? {
          issue_identifier: running.issue_identifier ?? null,
          session_id: running.session_id ?? null,
          state: running.state ?? null,
          display_state: running.display_state ?? null,
          status_reason: running.status_reason ?? null,
          last_event: running.last_event ?? null,
          last_message: running.last_message ?? null
        }
      : null,
    dispatch_pilot: dispatchPilot
      ? {
          status: dispatchPilot.status ?? null,
          source_status: dispatchPilot.source_status ?? null,
          reason: dispatchPilot.reason ?? null
        }
      : null,
    tracked_linear: trackedLinear
      ? {
          identifier: trackedLinear.identifier ?? null,
          title: trackedLinear.title ?? null,
          state: trackedLinear.state ?? null,
          url: trackedLinear.url ?? null,
          team_key: trackedLinear.team_key ?? null
        }
      : null
  };
  return createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex');
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

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
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
