import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { chmod, readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeJsonAtomic } from '../utils/fs.js';
import { isoTimestamp } from '../utils/time.js';
import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import {
  ControlStateStore,
  type ControlAction,
  type ControlState
} from './controlState.js';
import { ConfirmationStore, type ConfirmationStoreSnapshot } from './confirmations.js';
import { QuestionQueue, type QuestionRecord } from './questions.js';
import { DelegationTokenStore, type DelegationTokenRecord } from './delegationTokens.js';
import { type DispatchPilotEvaluation } from './trackerDispatchPilot.js';
import {
  startTelegramOversightBridge,
  type ControlDispatchPayload,
  type QuestionsPayload,
  type TelegramOversightBridge,
  type TelegramOversightReadAdapter
} from './telegramOversightBridge.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { createControlRuntime, type ControlRuntime } from './controlRuntime.js';
import {
  readDispatchExtension,
  type DispatchExtensionResult
} from './observabilitySurface.js';
import { handleObservabilityApiRequest } from './observabilityApiController.js';
import { handleUiDataRequest } from './uiDataController.js';
import { handleUiSessionRequest } from './uiSessionController.js';
import { handleSecurityViolationRequest } from './securityViolationController.js';
import { handleEventsSseRequest } from './eventsSseController.js';
import { handleQuestionQueueRequest } from './questionQueueController.js';
import { handleDelegationRegisterRequest } from './delegationRegisterController.js';
import { handleConfirmationListRequest } from './confirmationListController.js';
import { handleConfirmationCreateRequest } from './confirmationCreateController.js';
import { handleConfirmationApproveRequest } from './confirmationApproveController.js';
import { handleConfirmationIssueConsumeRequest } from './confirmationIssueConsumeController.js';
import { handleConfirmationValidateRequest } from './confirmationValidateController.js';
import {
  normalizeControlActionRequest,
  type TransportMutationRequest
} from './controlActionPreflight.js';
import {
  type ControlActionFinalizationPlan
} from './controlActionFinalization.js';
import { resolveControlActionControllerSequencing } from './controlActionControllerSequencing.js';
import {
  handleLinearWebhookRequest,
  normalizeLinearAdvisoryState,
  type LinearAdvisoryState,
  type LinearWebhookAuditEventInput
} from './linearWebhookController.js';

interface ControlServerOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: RunEventStream;
  runId: string;
}

const MAX_BODY_BYTES = 1024 * 1024;
const EXPIRY_INTERVAL_MS = 15_000;
const SESSION_TTL_MS = 15 * 60 * 1000;
const CHILD_CONTROL_TIMEOUT_MS = 15_000;
const CSRF_HEADER = 'x-csrf-token';
const DELEGATION_TOKEN_HEADER = 'x-codex-delegation-token';
const DELEGATION_RUN_HEADER = 'x-codex-delegation-run-id';
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const UI_ASSET_PATHS: Record<string, string> = {
  '/ui': 'index.html',
  '/ui/': 'index.html',
  '/ui/app.js': 'app.js',
  '/ui/styles.css': 'styles.css',
  '/ui/favicon.svg': 'favicon.svg'
};
const UI_ROOT = resolveUiRoot();
const LINEAR_ADVISORY_STATE_FILE = 'linear-advisory-state.json';

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

class SessionTokenStore {
  private readonly ttlMs: number;
  private readonly tokens = new Map<string, number>();

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  issue(): { token: string; expiresAt: string } {
    this.prune();
    const token = randomBytes(24).toString('hex');
    const expiresAt = Date.now() + this.ttlMs;
    this.tokens.set(token, expiresAt);
    return { token, expiresAt: new Date(expiresAt).toISOString() };
  }

  validate(token: string): boolean {
    this.prune();
    const expiresAt = this.tokens.get(token);
    if (!expiresAt) {
      return false;
    }
    if (expiresAt <= Date.now()) {
      this.tokens.delete(token);
      return false;
    }
    return true;
  }

  private prune(): void {
    const now = Date.now();
    for (const [token, expiresAt] of this.tokens.entries()) {
      if (expiresAt <= now) {
        this.tokens.delete(token);
      }
    }
  }
}

export class ControlServer {
  private readonly server: http.Server;
  private readonly controlStore: ControlStateStore;
  private readonly confirmationStore: ConfirmationStore;
  private readonly questionQueue: QuestionQueue;
  private readonly delegationTokens: DelegationTokenStore;
  private readonly sessionTokens: SessionTokenStore;
  private readonly eventStream?: RunEventStream;
  private readonly clients: Set<http.ServerResponse>;
  private readonly persist: RequestContext['persist'];
  private readonly paths: RunPaths;
  private readonly linearAdvisoryState: LinearAdvisoryState;
  private readonly controlRuntime: ControlRuntime;
  private telegramBridge: TelegramOversightBridge | null = null;
  private unsubscribeTelegramBridge: (() => void) | null = null;
  private baseUrl: string | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;

  private constructor(options: {
    server: http.Server;
    controlStore: ControlStateStore;
    confirmationStore: ConfirmationStore;
    questionQueue: QuestionQueue;
    delegationTokens: DelegationTokenStore;
    sessionTokens: SessionTokenStore;
    eventStream?: RunEventStream;
    clients: Set<http.ServerResponse>;
    persist: RequestContext['persist'];
    paths: RunPaths;
    linearAdvisoryState: LinearAdvisoryState;
    controlRuntime: ControlRuntime;
  }) {
    this.server = options.server;
    this.controlStore = options.controlStore;
    this.confirmationStore = options.confirmationStore;
    this.questionQueue = options.questionQueue;
    this.delegationTokens = options.delegationTokens;
    this.sessionTokens = options.sessionTokens;
    this.eventStream = options.eventStream;
    this.clients = options.clients;
    this.persist = options.persist;
    this.paths = options.paths;
    this.linearAdvisoryState = options.linearAdvisoryState;
    this.controlRuntime = options.controlRuntime;
  }

  static async start(options: ControlServerOptions): Promise<ControlServer> {
    const token = randomBytes(24).toString('hex');
    const controlSeed = await readJsonFile<ControlState>(options.paths.controlPath);
    const confirmationsSeed = await readJsonFile<ConfirmationStoreSnapshot>(options.paths.confirmationsPath);
    const questionsSeed = await readJsonFile<{ questions?: QuestionRecord[] }>(options.paths.questionsPath);
    const delegationSeed = await readJsonFile<{ tokens?: DelegationTokenRecord[] }>(
      options.paths.delegationTokensPath
    );
    const linearAdvisoryStatePath = join(options.paths.runDir, LINEAR_ADVISORY_STATE_FILE);
    const linearAdvisorySeed = await readJsonFile<LinearAdvisoryState>(linearAdvisoryStatePath);

    const controlStore = new ControlStateStore({
      runId: options.runId,
      controlSeq: controlSeed?.control_seq ?? 0,
      latestAction: controlSeed?.latest_action ?? null,
      featureToggles: controlSeed?.feature_toggles ?? null,
      transportMutation: controlSeed?.transport_mutation ?? null
    });
    const defaultToggles = controlSeed?.feature_toggles ?? {};
    if (!('rlm' in defaultToggles)) {
      controlStore.updateFeatureToggles({ rlm: { policy: options.config.rlm.policy } });
    }

    const confirmationStore = new ConfirmationStore({
      runId: options.runId,
      expiresInMs: options.config.confirm.expiresInMs,
      maxPending: options.config.confirm.maxPending,
      seed: {
        pending: confirmationsSeed?.pending ?? [],
        issued: confirmationsSeed?.issued ?? [],
        consumed_nonce_ids: confirmationsSeed?.consumed_nonce_ids ?? []
      }
    });

    const questionQueue = new QuestionQueue({ seed: questionsSeed?.questions ?? [] });
    const delegationTokens = new DelegationTokenStore({ seed: delegationSeed?.tokens ?? [] });
    const sessionTokens = new SessionTokenStore(SESSION_TTL_MS);
    const linearAdvisoryState = normalizeLinearAdvisoryState(linearAdvisorySeed);
    const controlRuntime = createControlRuntime({
      controlStore,
      questionQueue,
      paths: options.paths,
      linearAdvisoryState
    });

    const clients = new Set<http.ServerResponse>();
    const persist = {
      control: async () => writeJsonAtomic(options.paths.controlPath, controlStore.snapshot()),
      confirmations: async () => writeJsonAtomic(options.paths.confirmationsPath, confirmationStore.snapshot()),
      questions: async () => writeJsonAtomic(options.paths.questionsPath, { questions: questionQueue.list() }),
      delegationTokens: async () => writeJsonAtomic(options.paths.delegationTokensPath, { tokens: delegationTokens.list() }),
      linearAdvisory: async () => writeJsonAtomic(linearAdvisoryStatePath, linearAdvisoryState)
    };

    let instance: ControlServer | null = null;
    const server = http.createServer((req, res) => {
      handleRequest({
        req,
        res,
        token,
        controlStore,
        confirmationStore,
        questionQueue,
        delegationTokens,
        sessionTokens,
        eventStream: options.eventStream,
        config: options.config,
        persist,
        clients,
        paths: options.paths,
        linearAdvisoryState,
        runtime: controlRuntime
      }).catch((error) => {
        const status = error instanceof HttpError ? error.status : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error)?.message ?? String(error) }));
      });
    });

    instance = new ControlServer({
      server,
      controlStore,
      confirmationStore,
      questionQueue,
      delegationTokens,
      sessionTokens,
      eventStream: options.eventStream,
      clients,
      persist,
      paths: options.paths,
      linearAdvisoryState,
      controlRuntime
    });

    const host = options.config.ui.bindHost;
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off('error', onError);
        try {
          server.close(() => undefined);
        } catch {
          // Ignore close errors on a server that failed to bind.
        }
        reject(error);
      };
      server.once('error', onError);
      server.listen(0, host, () => {
        server.off('error', onError);
        resolve();
      });
    });
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    instance.baseUrl = `http://${formatHostForUrl(host)}:${port}`;
    server.on('error', (error) => {
      logger.error(`Control server error: ${(error as Error)?.message ?? String(error)}`);
    });

    try {
      await writeJsonAtomic(options.paths.controlAuthPath, {
        token,
        created_at: isoTimestamp()
      });
      await chmod(options.paths.controlAuthPath, 0o600).catch(() => undefined);
      await writeJsonAtomic(options.paths.controlEndpointPath, {
        base_url: instance.baseUrl,
        token_path: options.paths.controlAuthPath
      });
      await chmod(options.paths.controlEndpointPath, 0o600).catch(() => undefined);
      await writeJsonAtomic(options.paths.controlPath, controlStore.snapshot());

      instance.expiryTimer = setInterval(() => {
        expireConfirmations({
          ...instance.buildContext(options.config, token),
          req: null,
          res: null
        }).catch(() => undefined);
        expireQuestions({
          ...instance.buildContext(options.config, token),
          req: null,
          res: null
        }).catch(() => undefined);
      }, EXPIRY_INTERVAL_MS);

      if (instance.baseUrl) {
        try {
          instance.telegramBridge = await startTelegramOversightBridge({
            runDir: options.paths.runDir,
            readAdapter: instance.createTelegramOversightReadAdapter(options.config, token),
            baseUrl: instance.baseUrl,
            controlToken: token
          });
          if (instance.telegramBridge) {
            instance.unsubscribeTelegramBridge = instance.controlRuntime.subscribe((input) =>
              instance.telegramBridge?.notifyProjectionDelta(input)
            );
          }
        } catch (error) {
          logger.warn(
            `Failed to start Telegram oversight bridge: ${(error as Error)?.message ?? String(error)}`
          );
          instance.unsubscribeTelegramBridge?.();
          instance.unsubscribeTelegramBridge = null;
          instance.telegramBridge = null;
        }
      }
    } catch (error) {
      if (instance.expiryTimer) {
        clearInterval(instance.expiryTimer);
        instance.expiryTimer = null;
      }
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      throw error;
    }

    return instance;
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  broadcast(entry: RunEventStreamEntry): void {
    const payload = `data: ${JSON.stringify(entry)}\n\n`;
    for (const client of this.clients) {
      client.write(payload, (error) => {
        if (error) {
          this.clients.delete(client);
        }
      });
    }
    this.controlRuntime.publish({
      eventSeq: entry.seq,
      source: entry.event
    });
  }

  async close(): Promise<void> {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
      this.expiryTimer = null;
    }
    this.unsubscribeTelegramBridge?.();
    this.unsubscribeTelegramBridge = null;
    if (this.telegramBridge) {
      await this.telegramBridge.close().catch((error) => {
        logger.warn(`Failed to close Telegram oversight bridge: ${(error as Error)?.message ?? String(error)}`);
      });
      this.telegramBridge = null;
    }
    for (const client of this.clients) {
      client.end();
    }
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }

  private buildContext(config: EffectiveDelegationConfig, token: string): Omit<RequestContext, 'req' | 'res'> {
    return {
      token,
      controlStore: this.controlStore,
      confirmationStore: this.confirmationStore,
      questionQueue: this.questionQueue,
      delegationTokens: this.delegationTokens,
      sessionTokens: this.sessionTokens,
      eventStream: this.eventStream,
      config,
      persist: this.persist,
      clients: this.clients,
      paths: this.paths,
      linearAdvisoryState: this.linearAdvisoryState,
      runtime: this.controlRuntime
    };
  }

  private createTelegramOversightReadAdapter(
    config: EffectiveDelegationConfig,
    token: string
  ): TelegramOversightReadAdapter {
    const buildInternalContext = (): RequestContext => ({
      req: null,
      res: null,
      ...this.buildContext(config, token)
    });

    return {
      readSelectedRun: async () => this.controlRuntime.snapshot().readSelectedRunSnapshot(),

      readDispatch: async (): Promise<ControlDispatchPayload> => {
        const context = buildInternalContext();
        const runtimeSnapshot = this.controlRuntime.snapshot();
        const result = await readDispatchExtension({
          readDispatchEvaluation: () => runtimeSnapshot.readDispatchEvaluation()
        });
        await emitDispatchPilotAuditEvents(context, {
          surface: 'telegram_dispatch',
          evaluation: result.evaluation,
          issueIdentifier: result.issueIdentifier
        });
        return buildTelegramOversightDispatchPayload(result);
      },

      readQuestions: async (): Promise<QuestionsPayload> => {
        const context = buildInternalContext();
        await expireQuestions(context);
        const questions = context.questionQueue.list();
        queueQuestionResolutions(context, questions);
        return { questions };
      }
    };
  }
}

interface RequestContext {
  req: http.IncomingMessage | null;
  res: http.ServerResponse | null;
  token: string;
  controlStore: ControlStateStore;
  confirmationStore: ConfirmationStore;
  questionQueue: QuestionQueue;
  delegationTokens: DelegationTokenStore;
  sessionTokens: SessionTokenStore;
  eventStream?: RunEventStream;
  config: EffectiveDelegationConfig;
  persist: {
    control: () => Promise<void>;
    confirmations: () => Promise<void>;
    questions: () => Promise<void>;
    delegationTokens: () => Promise<void>;
    linearAdvisory: () => Promise<void>;
  };
  clients: Set<http.ServerResponse>;
  paths: RunPaths;
  linearAdvisoryState: LinearAdvisoryState;
  runtime: ControlRuntime;
}

async function handleRequest(context: RequestContext): Promise<void> {
  if (!context.req || !context.res) {
    return;
  }
  const { req, res } = context;
  const url = new URL(req.url ?? '/', 'http://localhost');
  const runtimeSnapshot = context.runtime.snapshot();
  const presenterContext = {
    controlStore: context.controlStore,
    paths: context.paths,
    readSelectedRunSnapshot: () => runtimeSnapshot.readSelectedRunSnapshot(),
    readCompatibilityProjection: () => runtimeSnapshot.readCompatibilityProjection()
  };
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: isoTimestamp() }));
    return;
  }

  if (url.pathname === '/' || url.pathname === '') {
    const search = url.search ? url.search : '';
    res.writeHead(302, { Location: `/ui${search}` });
    res.end();
    return;
  }

  const uiAsset = resolveUiAssetPath(url.pathname);
  if (uiAsset) {
    await serveUiAsset(uiAsset, res);
    return;
  }

  if (
    handleUiSessionRequest({
      req,
      res,
      allowedHosts: normalizeAllowedHosts(context.config.ui.allowedBindHosts),
      issueSession: () => context.sessionTokens.issue(),
      isLoopbackAddress
    })
  ) {
    return;
  }

  if (url.pathname === '/integrations/linear/webhook') {
    await handleLinearWebhookRequest({
      req,
      res,
      linearAdvisoryState: context.linearAdvisoryState,
      readRawBody,
      persistLinearAdvisory: context.persist.linearAdvisory,
      emitAuditEvent: (input) => emitLinearWebhookAuditEvent(context, input),
      readFeatureToggles: () => context.controlStore.snapshot().feature_toggles,
      publishRuntime: () => context.runtime.publish({ source: 'linear.webhook' })
    });
    return;
  }

  const auth = resolveAuthToken(req, context);
  if (!auth) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  if (requiresCsrf(req) && !isCsrfValid(req, auth.token)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'csrf_invalid' }));
    return;
  }

  if (isRunnerOnlyEndpoint(url.pathname, req.method) && auth.kind !== 'control') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'runner_only' }));
    return;
  }

  if (url.pathname === '/events' && req.method === 'GET') {
    handleEventsSseRequest({
      req,
      res,
      clients: context.clients
    });
    return;
  }

  if (
    await handleUiDataRequest({
      req,
      res,
      presenterContext
    })
  ) {
    return;
  }

  if (
    await handleObservabilityApiRequest({
      req,
      res,
      presenterContext,
      readRequestBody: () => readJsonBody(req),
      requestRefresh: () => context.runtime.requestRefresh(),
      readDispatchEvaluation: () => runtimeSnapshot.readDispatchEvaluation(),
      onDispatchEvaluated: (record) => emitDispatchPilotAuditEvents(context, record)
    })
  ) {
    return;
  }

  if (url.pathname === '/control/action' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const snapshot = context.controlStore.snapshot();
    const taskId = resolveTaskIdFromManifestPath(context.paths.manifestPath);
    const normalized = normalizeControlActionRequest({
      body,
      authKind: auth.kind,
      snapshot,
      taskId,
      manifestPath: context.paths.manifestPath
    });
    if (!normalized.ok) {
      writeControlError(res, normalized.status, normalized.error, normalized.traceability);
      return;
    }
    const { action, requestedBy, reason } = normalized.value;
    const tool = readStringValue(body, 'tool') ?? 'delegate.cancel';
    const params = readRecordValue(body, 'params') ?? {};

    const persistControlWithTransportNonce = async (input: {
      requestId: string | null;
      intentId: string | null;
      transportMutation: TransportMutationRequest | null;
    }): Promise<void> => {
      if (!input.transportMutation) {
        await context.persist.control();
        return;
      }
      context.controlStore.consumeTransportNonce({
        nonce: input.transportMutation.nonce,
        action,
        transport: input.transportMutation.transport,
        requestId: input.requestId ?? null,
        intentId: input.intentId,
        expiresAt: input.transportMutation.nonceExpiresAt
      });
      try {
        await context.persist.control();
      } catch (error) {
        context.controlStore.rollbackTransportNonce(input.transportMutation.nonce);
        throw error;
      }
    };

    const applyFinalizationPlan = async (input: {
      requestId: string | null;
      intentId: string | null;
      transportMutation: TransportMutationRequest | null;
      plan: ControlActionFinalizationPlan;
    }): Promise<void> => {
      if (input.plan.persistRequired) {
        await persistControlWithTransportNonce({
          requestId: input.requestId,
          intentId: input.intentId,
          transportMutation: input.transportMutation
        });
      }
      if (input.plan.publishRequired) {
        context.runtime.publish({ source: 'control.action' });
      }
      await emitControlActionAuditEvent(context, {
        outcome: input.plan.response.outcome,
        action,
        requestedBy,
        reason: reason ?? null,
        requestId: input.plan.response.requestId,
        intentId: input.plan.response.intentId,
        snapshot: input.plan.snapshot,
        traceability: input.plan.response.traceability
      });
      res.writeHead(input.plan.response.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(input.plan.response.body));
    };

    const sequencing = await resolveControlActionControllerSequencing({
      body,
      tool,
      params,
      snapshot,
      taskId,
      manifestPath: context.paths.manifestPath,
      normalized: normalized.value,
      isTransportNonceConsumed: (nonce) => context.controlStore.isTransportNonceConsumed(nonce),
      validateConfirmation: (validationInput) =>
        context.confirmationStore.validateNonce(validationInput),
      persistConfirmations: () => context.persist.confirmations(),
      emitConfirmationResolved: (payload) =>
        emitControlEvent(context, {
          event: 'confirmation_resolved',
          actor: 'runner',
          payload
        }),
      readSnapshot: () => context.controlStore.snapshot(),
      updateAction: (updateInput) => context.controlStore.updateAction(updateInput)
    });
    if (sequencing.kind === 'error') {
      writeControlError(res, sequencing.status, sequencing.error, sequencing.traceability);
      return;
    }
    await applyFinalizationPlan(sequencing);
    return;
  }

  if (
    await handleConfirmationCreateRequest({
      req,
      res,
      authKind: auth.kind,
      readRequestBody: () => readJsonBody(req),
      expireConfirmations: () => expireConfirmations(context),
      createConfirmation: ({ action, tool, params }) =>
        context.confirmationStore.create({ action, tool, params }),
      persistConfirmations: () => context.persist.confirmations(),
      maybeAutoPause: async (requestId) => {
        if (!context.config.confirm.autoPause) {
          return;
        }
        const latestAction = context.controlStore.snapshot().latest_action?.action ?? null;
        if (latestAction === 'pause') {
          return;
        }
        context.controlStore.updateAction({
          action: 'pause',
          requestedBy: 'runner',
          requestId,
          reason: 'confirmation_required'
        });
        await context.persist.control();
        context.runtime.publish({ source: 'control.action' });
      },
      readRunId: () => context.controlStore.snapshot().run_id,
      emitConfirmationRequired: (payload) =>
        emitControlEvent(context, {
          event: 'confirmation_required',
          actor: 'runner',
          payload
        })
    })
  ) {
    return;
  }

  if (
    await handleConfirmationListRequest({
      req,
      res,
      expireConfirmations: () => expireConfirmations(context),
      listPendingConfirmations: () => context.confirmationStore.listPending()
    })
  ) {
    return;
  }

  if (
    await handleConfirmationApproveRequest({
      req,
      res,
      readRequestBody: () => readJsonBody(req),
      expireConfirmations: () => expireConfirmations(context),
      approveConfirmation: (requestId, actor) => context.confirmationStore.approve(requestId, actor),
      readConfirmation: (requestId) => context.confirmationStore.get(requestId),
      persistConfirmations: () => context.persist.confirmations(),
      issueConfirmation: (requestId) => context.confirmationStore.issue(requestId),
      validateConfirmation: (input) =>
        context.confirmationStore.validateNonce({
          confirmNonce: input.confirmNonce,
          tool: input.tool,
          params: input.params
        }),
      emitConfirmationResolved: (payload) =>
        emitControlEvent(context, {
          event: 'confirmation_resolved',
          actor: 'runner',
          payload
        }),
      updateControlAction: (input) =>
        context.controlStore.updateAction({
          action: input.action,
          requestedBy: input.requestedBy,
          requestId: input.requestId
        }),
      persistControl: () => context.persist.control(),
      publishRuntime: () => context.runtime.publish({ source: 'control.action' })
    })
  ) {
    return;
  }

  if (
    await handleConfirmationIssueConsumeRequest({
      req,
      res,
      readRequestBody: () => readJsonBody(req),
      expireConfirmations: () => expireConfirmations(context),
      issueConfirmation: (requestId) => context.confirmationStore.issue(requestId),
      persistConfirmations: () => context.persist.confirmations()
    })
  ) {
    return;
  }

  if (
    await handleConfirmationValidateRequest({
      req,
      res,
      readRequestBody: () => readJsonBody(req),
      expireConfirmations: () => expireConfirmations(context),
      validateConfirmation: ({ confirmNonce, tool, params }) =>
        context.confirmationStore.validateNonce({ confirmNonce, tool, params }),
      persistConfirmations: () => context.persist.confirmations(),
      emitConfirmationResolved: (payload) =>
        emitControlEvent(context, {
          event: 'confirmation_resolved',
          actor: 'runner',
          payload
        })
    })
  ) {
    return;
  }

  if (
    await handleSecurityViolationRequest({
      req,
      res,
      readRequestBody: () => readJsonBody(req),
      emitSecurityViolation: (payload) =>
        emitControlEvent(context, {
          event: 'security_violation',
          actor: 'runner',
          payload
        })
    })
  ) {
    return;
  }

  if (
    await handleDelegationRegisterRequest({
      req,
      res,
      delegationTokens: context.delegationTokens,
      readRequestBody: () => readJsonBody(req),
      persistDelegationTokens: () => context.persist.delegationTokens()
    })
  ) {
    return;
  }

  if (
    await handleQuestionQueueRequest({
      req,
      res,
      questionQueue: context.questionQueue,
      readRequestBody: () => readJsonBody(req),
      expireQuestions: () => expireQuestions(context),
      queueQuestionResolutions: (records) => queueQuestionResolutions(context, records),
      readDelegationHeaders: () => readDelegationHeaders(req),
      validateDelegation: (auth) => Boolean(validateDelegation(context, auth)),
      resolveManifestPath: (rawPath) =>
        resolveRunManifestPath(rawPath, context.config.ui.allowedRunRoots, 'from_manifest_path'),
      readManifest: (path) => readJsonFile<CliManifest>(path),
      getParentRunId: () => context.controlStore.snapshot().run_id,
      persistQuestions: () => context.persist.questions(),
      resolveChildQuestion: (record, outcome) => maybeResolveChildQuestion(context, record, outcome),
      emitQuestionQueued: (record) =>
        emitControlEvent(context, {
          event: 'question_queued',
          actor: 'delegate',
          payload: {
            question_id: record.question_id,
            parent_run_id: record.parent_run_id,
            from_run_id: record.from_run_id,
            prompt: record.prompt,
            urgency: record.urgency,
            queued_at: record.queued_at,
            expires_at: record.expires_at ?? null,
            expires_in_ms: record.expires_in_ms ?? null
          }
        }),
      emitQuestionAnswered: async (record) => {
        await emitControlEvent(context, {
          event: 'question_answered',
          actor: 'user',
          payload: {
            question_id: record.question_id,
            parent_run_id: record.parent_run_id,
            answer: record.answer,
            answered_by: record.answered_by,
            answered_at: record.answered_at
          }
        });
        await emitControlEvent(context, {
          event: 'question_closed',
          actor: 'runner',
          payload: {
            question_id: record.question_id,
            parent_run_id: record.parent_run_id,
            outcome: record.status,
            closed_at: record.closed_at,
            expires_at: record.expires_at ?? null
          }
        });
      },
      emitQuestionDismissed: (record) =>
        emitControlEvent(context, {
          event: 'question_closed',
          actor: 'user',
          payload: {
            question_id: record.question_id,
            parent_run_id: record.parent_run_id,
            outcome: record.status,
            closed_at: record.closed_at,
            expires_at: record.expires_at ?? null
          }
        }),
      publishRuntime: (source) => context.runtime.publish({ source })
    })
  ) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

async function emitLinearWebhookAuditEvent(
  context: RequestContext,
  input: LinearWebhookAuditEventInput
): Promise<void> {
  await emitControlEvent(context, {
    event: 'linear_advisory_webhook_processed',
    actor: 'runner',
    payload: {
      delivery_id: input.deliveryId,
      event_name: input.event,
      action: input.action,
      issue_id: input.issueId,
      outcome: input.outcome,
      reason: input.reason,
      advisory_only: true
    }
  });
}

async function emitDispatchPilotAuditEvents(
  context: RequestContext,
  input: {
    surface: 'api_v1_dispatch' | 'telegram_dispatch';
    evaluation: DispatchPilotEvaluation;
    issueIdentifier: string | null;
  }
): Promise<void> {
  const snapshot = context.controlStore.snapshot();
  const decision = input.evaluation.failure
    ? 'fail_closed'
    : input.evaluation.summary.status === 'ready'
      ? 'ready'
      : 'blocked';
  const statusCode = input.evaluation.failure?.status ?? 200;
  const eventPayload = {
    surface: input.surface,
    advisory_only: true,
    issue_identifier: input.issueIdentifier,
    task_id: resolveTaskIdFromManifestPath(context.paths.manifestPath),
    run_id: snapshot.run_id,
    control_seq: snapshot.control_seq,
    decision,
    status: input.evaluation.summary.status,
    source_status: input.evaluation.summary.source_status,
    reason: input.evaluation.failure?.reason ?? input.evaluation.summary.reason
  };

  await emitControlEvent(context, {
    event: 'dispatch_pilot_evaluated',
    actor: 'runner',
    payload: eventPayload
  });
  await emitControlEvent(context, {
    event: 'dispatch_pilot_viewed',
    actor: 'runner',
    payload: {
      ...eventPayload,
      http_status: statusCode,
      recommendation_available: Boolean(input.evaluation.recommendation)
    }
  });
}

function writeControlError(
  res: http.ServerResponse,
  status: number,
  error: string,
  traceability?: Record<string, unknown>
): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(traceability ? { error, traceability } : { error }));
}

async function emitControlActionAuditEvent(
  context: RequestContext,
  input: {
    outcome: 'applied' | 'replayed';
    action: ControlAction['action'];
    requestedBy: string;
    reason: string | null;
    requestId: string | null;
    intentId: string | null;
    snapshot: ControlState;
    traceability?: Record<string, unknown> | null;
  }
): Promise<void> {
  await emitControlEvent(context, {
    event: input.outcome === 'replayed' ? 'control_action_replayed' : 'control_action_applied',
    actor: 'runner',
    payload: {
      idempotent_replay: input.outcome === 'replayed',
      ...buildControlActionTracePayload(context, input),
      ...(input.traceability ? { traceability: input.traceability } : {})
    }
  });
}

function buildControlActionTracePayload(
  context: RequestContext,
  input: {
    action: ControlAction['action'];
    requestedBy: string;
    reason: string | null;
    requestId: string | null;
    intentId: string | null;
    snapshot: ControlState;
    traceability?: Record<string, unknown> | null;
  }
): Record<string, unknown> {
  const latestAction = input.snapshot.latest_action;
  const traceability = input.traceability ?? null;
  const traceTransport =
    traceability && Object.prototype.hasOwnProperty.call(traceability, 'transport')
      ? typeof traceability.transport === 'string'
        ? traceability.transport
        : null
      : undefined;
  const traceActorId =
    traceability && Object.prototype.hasOwnProperty.call(traceability, 'actor_id')
      ? typeof traceability.actor_id === 'string'
        ? traceability.actor_id
        : null
      : undefined;
  const traceActorSource =
    traceability && Object.prototype.hasOwnProperty.call(traceability, 'actor_source')
      ? typeof traceability.actor_source === 'string'
        ? traceability.actor_source
        : null
      : undefined;
  const tracePrincipal =
    traceability && Object.prototype.hasOwnProperty.call(traceability, 'transport_principal')
      ? typeof traceability.transport_principal === 'string'
        ? traceability.transport_principal
        : null
      : undefined;
  return {
    action: input.action,
    request_id: input.requestId,
    intent_id: input.intentId,
    requested_by: input.requestedBy,
    requested_reason: input.reason,
    control_seq: input.snapshot.control_seq,
    task_id: resolveTaskIdFromManifestPath(context.paths.manifestPath),
    run_id: input.snapshot.run_id,
    manifest_path: context.paths.manifestPath,
    transport: traceTransport !== undefined ? traceTransport : latestAction?.transport ?? null,
    actor_id: traceActorId !== undefined ? traceActorId : latestAction?.actor_id ?? null,
    actor_source: traceActorSource !== undefined ? traceActorSource : latestAction?.actor_source ?? null,
    transport_principal:
      tracePrincipal !== undefined ? tracePrincipal : latestAction?.transport_principal ?? null
  };
}

function resolveTaskIdFromManifestPath(manifestPath: string): string | null {
  const runDir = dirname(manifestPath);
  const cliDir = dirname(runDir);
  if (basename(cliDir) !== 'cli') {
    return null;
  }
  const taskDir = dirname(cliDir);
  const taskId = basename(taskDir);
  return taskId || null;
}

async function expireConfirmations(context: RequestContext): Promise<void> {
  const expired = context.confirmationStore.expire();
  if (expired.length === 0) {
    return;
  }
  await context.persist.confirmations();
  for (const entry of expired) {
    await emitControlEvent(context, {
      event: 'confirmation_resolved',
      actor: 'runner',
      payload: {
        request_id: entry.request.request_id,
        nonce_id: entry.nonce_id,
        outcome: 'expired'
      }
    });
  }
}

async function expireQuestions(context: RequestContext): Promise<void> {
  const expired = context.questionQueue.expire();
  if (expired.length === 0) {
    return;
  }
  await context.persist.questions();
  for (const record of expired) {
    await emitControlEvent(context, {
      event: 'question_closed',
      actor: 'runner',
      payload: {
        question_id: record.question_id,
        parent_run_id: record.parent_run_id,
        outcome: 'expired',
        closed_at: record.closed_at ?? null,
        expires_at: record.expires_at ?? null
      }
    });
    await maybeResolveChildQuestion(context, record, 'expired');
  }
  context.runtime.publish({ source: 'questions.expire' });
}

function resolveAuthToken(
  req: http.IncomingMessage,
  context: RequestContext
): { token: string; kind: 'control' | 'session' } | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length);
  if (safeTokenCompare(token, context.token)) {
    return { token, kind: 'control' };
  }
  if (context.sessionTokens.validate(token)) {
    return { token, kind: 'session' };
  }
  return null;
}

function isCsrfValid(req: http.IncomingMessage, token: string): boolean {
  const header = req.headers[CSRF_HEADER] as string | undefined;
  if (!header) {
    return false;
  }
  return safeTokenCompare(header, token);
}

function requiresCsrf(req: http.IncomingMessage): boolean {
  const method = (req.method ?? 'GET').toUpperCase();
  return method !== 'GET' && method !== 'HEAD';
}

function isRunnerOnlyEndpoint(pathname: string, method?: string): boolean {
  if ((method ?? 'GET').toUpperCase() !== 'POST') {
    return false;
  }
  const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  return (
    normalized === '/confirmations/issue' ||
    normalized === '/confirmations/consume' ||
    normalized === '/confirmations/validate' ||
    normalized === '/delegation/register' ||
    normalized === '/questions/enqueue' ||
    normalized === '/security/violation'
  );
}

export function formatHostForUrl(host: string): string {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }
  return host;
}

export function isLoopbackAddress(address: string | undefined | null): boolean {
  if (!address) {
    return false;
  }
  if (LOOPBACK_HOSTS.has(address)) {
    return true;
  }
  if (address.startsWith('::ffff:')) {
    return address.slice(7) === '127.0.0.1';
  }
  return false;
}

function safeTokenCompare(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

async function readRawBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new HttpError(413, 'request_body_too_large');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const rawBuffer = await readRawBody(req);
  if (rawBuffer.length === 0) {
    return {};
  }
  const raw = rawBuffer.toString('utf8');
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    logger.warn(`Failed to read JSON file ${path}: ${(error as Error)?.message ?? error}`);
    return null;
  }
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function emitControlEvent(
  context: RequestContext,
  input: { event: string; actor: string; payload: Record<string, unknown> }
): Promise<void> {
  if (!context.eventStream) {
    return;
  }
  let entry: RunEventStreamEntry;
  try {
    entry = await context.eventStream.append({
      event: input.event,
      actor: input.actor,
      payload: input.payload
    });
  } catch (error) {
    logger.warn(`Failed to append control event ${input.event}: ${(error as Error)?.message ?? error}`);
    return;
  }
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of context.clients) {
    client.write(payload, (error) => {
      if (error) {
        context.clients.delete(client);
      }
    });
  }
}

function buildTelegramOversightDispatchPayload(
  result: DispatchExtensionResult
): ControlDispatchPayload {
  if (result.kind === 'ok') {
    return result.payload as ControlDispatchPayload;
  }
  const dispatchPilot =
    result.details.dispatch_pilot && typeof result.details.dispatch_pilot === 'object'
      ? (result.details.dispatch_pilot as NonNullable<ControlDispatchPayload['dispatch_pilot']>)
      : result.evaluation.summary;
  return {
    dispatch_pilot: dispatchPilot,
    error: {
      code: result.failure.code,
      details: {
        dispatch_pilot: dispatchPilot
      }
    }
  };
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

function readRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readDelegationHeaders(req: http.IncomingMessage): { token: string; childRunId: string } | null {
  const token = readHeaderValue(req.headers[DELEGATION_TOKEN_HEADER]);
  const childRunId = readHeaderValue(req.headers[DELEGATION_RUN_HEADER]);
  if (!token || !childRunId) {
    return null;
  }
  return { token, childRunId };
}

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    const values: string[] = [];
    for (const entry of value) {
      if (typeof entry !== 'string') {
        continue;
      }
      const parts = entry.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed) {
          values.push(trimmed);
        }
      }
    }
    return readUniqueHeaderValue(values);
  }
  if (typeof value === 'string') {
    const parts = value.split(',');
    const values: string[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        values.push(trimmed);
      }
    }
    return readUniqueHeaderValue(values);
  }
  return null;
}

function readUniqueHeaderValue(values: string[]): string | null {
  if (values.length === 0) {
    return null;
  }
  const unique = new Set(values);
  if (unique.size > 1) {
    return null;
  }
  return values[0];
}

function validateDelegation(
  context: RequestContext,
  auth: { token: string; childRunId: string }
): DelegationTokenRecord | null {
  const parentRunId = context.controlStore.snapshot().run_id;
  return context.delegationTokens.validate(auth.token, parentRunId, auth.childRunId);
}

async function maybeResolveChildQuestion(
  context: RequestContext,
  record: QuestionRecord,
  outcome: QuestionRecord['status'] | 'expired'
): Promise<void> {
  const autoPause = record.auto_pause ?? true;
  if (!autoPause || !record.from_manifest_path) {
    return;
  }

  let action: 'resume' | 'fail' | 'pause' | null = null;
  let reason = 'question_answered';
  if (outcome === 'expired') {
    const fallback = record.expiry_fallback ?? context.config.delegate.expiryFallback ?? 'pause';
    if (fallback === 'pause') {
      action = 'pause';
      reason = 'question_expired';
    } else {
      action = fallback === 'resume' ? 'resume' : 'fail';
      reason = 'question_expired';
    }
  } else {
    action = 'resume';
    reason = outcome === 'dismissed' ? 'question_dismissed' : 'question_answered';
  }

  if (!action) {
    return;
  }

  const shouldResolve = await isChildAwaitingQuestion(context, record.from_manifest_path);
  if (!shouldResolve) {
    return;
  }

  try {
    await callChildControlEndpoint(context, record.from_manifest_path, {
      action,
      requested_by: 'parent',
      reason
    });
  } catch (error) {
    const message = (error as Error)?.message ?? String(error);
    logger.warn(`Failed to resolve child question: ${message}`);
    await emitControlEvent(context, {
      event: 'question.resolve_child_fallback',
      actor: 'control',
      payload: {
        question_id: record.question_id,
        outcome,
        action,
        reason,
        non_fatal: true,
        error: message
      }
    });
  }
}

function queueQuestionResolutions(context: RequestContext, records: QuestionRecord[]): void {
  for (const record of records) {
    if (record.status === 'queued') {
      continue;
    }
    void maybeResolveChildQuestion(context, record, record.status).catch((error) => {
      const message = (error as Error)?.message ?? String(error);
      logger.warn(`Failed to resolve child question: ${message}`);
      void emitControlEvent(context, {
        event: 'question.resolve_child_fallback',
        actor: 'control',
        payload: {
          question_id: record.question_id,
          outcome: record.status,
          action: 'unknown',
          reason: 'resolution_enqueue_failed',
          non_fatal: true,
          error: message
        }
      });
    });
  }
}

async function isChildAwaitingQuestion(context: RequestContext, manifestPath: string): Promise<boolean> {
  try {
    const resolvedManifest = resolveRunManifestPath(manifestPath, context.config.ui.allowedRunRoots, 'from_manifest_path');
    const controlPath = resolve(dirname(resolvedManifest), 'control.json');
    const snapshot = await readJsonFile<ControlState>(controlPath);
    const latest = snapshot?.latest_action;
    if (!latest || latest.action !== 'pause') {
      return false;
    }
    return latest.reason === 'awaiting_question_answer';
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      logger.warn(`Failed to inspect child question state: ${(error as Error)?.message ?? error}`);
    }
    return false;
  }
}

async function callChildControlEndpoint(
  context: RequestContext,
  manifestPath: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { baseUrl, token } = await loadControlEndpoint(manifestPath, context);
  const url = new URL('/control/action', baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHILD_CONTROL_TIMEOUT_MS);
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        [CSRF_HEADER]: token
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('child control request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`child control error: ${res.status} ${message}`);
  }
}

async function loadControlEndpoint(
  manifestPath: string,
  context: RequestContext
): Promise<{ baseUrl: URL; token: string }> {
  const resolvedManifest = resolveRunManifestPath(manifestPath, context.config.ui.allowedRunRoots, 'from_manifest_path');
  const runDir = dirname(resolvedManifest);
  const endpointPath = resolve(runDir, 'control_endpoint.json');
  const raw = await readFile(endpointPath, 'utf8');
  const endpointInfo = JSON.parse(raw) as { base_url?: string; token_path?: string };
  const baseUrl = validateControlBaseUrl(endpointInfo.base_url, context.config.ui.allowedBindHosts);
  const tokenPath = resolveControlTokenPath(endpointInfo.token_path, runDir);
  const token = await readControlToken(tokenPath);
  return { baseUrl, token };
}

function validateControlBaseUrl(raw: unknown, allowedHosts?: string[]): URL {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('control base_url missing');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('control base_url invalid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('control base_url invalid');
  }
  if (parsed.username || parsed.password) {
    throw new Error('control base_url invalid');
  }
  const allowed = normalizeAllowedHosts(allowedHosts);
  if (allowed.size > 0 && !allowed.has(parsed.hostname.toLowerCase())) {
    throw new Error('control base_url not permitted');
  }
  return parsed;
}

function normalizeAllowedHosts(allowedHosts?: string[]): Set<string> {
  const values = allowedHosts && allowedHosts.length > 0 ? allowedHosts : Array.from(LOOPBACK_HOSTS);
  return new Set(values.map((entry) => entry.toLowerCase()));
}

function resolveControlTokenPath(tokenPath: unknown, runDir: string): string {
  const fallback = resolve(runDir, 'control_auth.json');
  const raw = typeof tokenPath === 'string' ? tokenPath.trim() : '';
  const resolved = raw ? resolve(runDir, raw) : fallback;
  if (!isPathWithinRoots(resolved, [runDir])) {
    throw new Error('control auth path invalid');
  }
  return resolved;
}

async function readControlToken(tokenPath: string): Promise<string> {
  const tokenRaw = await readFile(tokenPath, 'utf8');
  const parsedToken = safeJsonParse(tokenRaw);
  const tokenValue =
    parsedToken && typeof parsedToken === 'object' && !Array.isArray(parsedToken)
      ? (parsedToken as Record<string, unknown>).token
      : null;
  const token =
    typeof tokenValue === 'string' && tokenValue.trim().length > 0
      ? tokenValue.trim()
      : tokenRaw.trim();
  if (!token) {
    throw new Error('control auth token missing');
  }
  return token;
}

function resolveRunManifestPath(rawPath: string, allowedRoots: string[], label: string): string {
  const resolved = resolve(rawPath);
  const canonicalPath = realpathSafe(resolved);
  assertRunManifestPath(canonicalPath, label);
  if (!isPathWithinRoots(canonicalPath, allowedRoots)) {
    throw new Error(`${label} not permitted`);
  }
  return canonicalPath;
}

function assertRunManifestPath(pathname: string, label: string): void {
  const resolvedPath = resolve(pathname);
  if (basename(resolvedPath) !== 'manifest.json') {
    throw new Error(`${label} invalid`);
  }
  const runDir = dirname(resolvedPath);
  const cliDir = dirname(runDir);
  if (basename(cliDir) !== 'cli') {
    throw new Error(`${label} invalid`);
  }
  const taskDir = dirname(cliDir);
  if (!basename(runDir) || !basename(taskDir)) {
    throw new Error(`${label} invalid`);
  }
}

function isPathWithinRoots(pathname: string, roots: string[]): boolean {
  const resolved = normalizePath(realpathSafe(pathname));
  return roots.some((root) => {
    const resolvedRoot = normalizePath(realpathSafe(root));
    if (resolvedRoot === resolved) {
      return true;
    }
    const relativePath = relative(resolvedRoot, resolved);
    if (!relativePath) {
      return true;
    }
    if (isAbsolute(relativePath)) {
      return false;
    }
    return !relativePath.startsWith(`..${sep}`) && relativePath !== '..';
  });
}

function realpathSafe(pathname: string): string {
  try {
    return realpathSync(pathname);
  } catch {
    return resolve(pathname);
  }
}

function normalizePath(pathname: string): string {
  return process.platform === 'win32' ? pathname.toLowerCase() : pathname;
}

function resolveUiRoot(): string | null {
  const candidates = [
    resolve(process.cwd(), 'packages', 'orchestrator-status-ui'),
    resolve(process.cwd(), '..', 'packages', 'orchestrator-status-ui'),
    resolve(process.cwd(), '..', '..', 'packages', 'orchestrator-status-ui'),
    resolve(fileURLToPath(new URL('../../../../packages/orchestrator-status-ui', import.meta.url)))
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return null;
}

function resolveUiAssetPath(pathname: string): string | null {
  if (!UI_ROOT) {
    return null;
  }
  const asset = UI_ASSET_PATHS[pathname];
  if (!asset) {
    return null;
  }
  return resolve(UI_ROOT, asset);
}

async function serveUiAsset(assetPath: string, res: http.ServerResponse): Promise<void> {
  try {
    const payload = await readFile(assetPath);
    res.writeHead(200, {
      'Content-Type': resolveUiContentType(assetPath),
      'Cache-Control': 'no-store'
    });
    res.end(payload);
  } catch (error) {
    logger.warn(`Failed to serve UI asset ${assetPath}: ${(error as Error)?.message ?? error}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function resolveUiContentType(assetPath: string): string {
  if (assetPath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (assetPath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  if (assetPath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }
  if (assetPath.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  return 'application/octet-stream';
}

export const __test__ = {
  readDelegationHeaders,
  callChildControlEndpoint
};
