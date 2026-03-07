import http from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
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
  type ControlState,
  type ControlTransport,
  type TransportIdempotencyEntry
} from './controlState.js';
import { ConfirmationStore, type ConfirmationRequest, type ConfirmationStoreSnapshot } from './confirmations.js';
import { QuestionQueue, type QuestionRecord, type QuestionUrgency } from './questions.js';
import { DelegationTokenStore, type DelegationTokenRecord } from './delegationTokens.js';
import {
  evaluateTrackerDispatchPilot,
  type DispatchPilotEvaluation
} from './trackerDispatchPilot.js';
import {
  startTelegramOversightBridge,
  type ControlDispatchPayload,
  type QuestionsPayload,
  type TelegramOversightBridge,
  type TelegramOversightReadAdapter
} from './telegramOversightBridge.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import {
  resolveLiveLinearTrackedIssueById,
  type LiveLinearTrackedIssue
} from './linearDispatchSource.js';
import { createControlRuntime, type ControlRuntime } from './controlRuntime.js';
import {
  readDispatchExtension,
  type DispatchExtensionResult
} from './observabilitySurface.js';
import { handleObservabilityApiRequest } from './observabilityApiController.js';
import { handleUiDataRequest } from './uiDataController.js';
import { handleUiSessionRequest } from './uiSessionController.js';

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
const TRANSPORT_MUTATING_ACTIONS = new Set<ControlAction['action']>(['pause', 'resume', 'cancel']);
const TRANSPORT_IDENTITY_PATTERN = /^[A-Za-z0-9._:@-]{1,128}$/;
const TRANSPORT_SOURCE_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const TRANSPORT_PRINCIPAL_PATTERN = /^[A-Za-z0-9._:@/=-]{1,256}$/;
const TRANSPORT_NONCE_PATTERN = /^[A-Za-z0-9._~:/+=-]{8,256}$/;
const TRANSPORT_METADATA_KEYS = [
  'actor_id',
  'actorId',
  'actor_source',
  'actorSource',
  'transport_principal',
  'transportPrincipal',
  'principal',
  'transport_nonce',
  'transportNonce',
  'transport_nonce_expires_at',
  'transportNonceExpiresAt',
  'nonce',
  'nonce_expires_at',
  'nonceExpiresAt'
] as const;
const DEFAULT_TRANSPORT_IDEMPOTENCY_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_TRANSPORT_NONCE_MAX_TTL_MS = 10 * 60 * 1000;
const MAX_TRANSPORT_POLICY_WINDOW_MS = 24 * 60 * 60 * 1000;
const LINEAR_ADVISORY_STATE_FILE = 'linear-advisory-state.json';
const LINEAR_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;
const LINEAR_ADVISORY_SEEN_DELIVERY_LIMIT = 100;

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
    await handleLinearWebhook(context);
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
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(`: ok\n\n`);
    context.clients.add(res);
    req.on('close', () => {
      context.clients.delete(res);
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
    const action = readStringValue(body, 'action');
    if (!isControlAction(action)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_action' }));
      return;
    }
    if (auth.kind === 'session' && action !== 'pause' && action !== 'resume') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ui_action_disallowed' }));
      return;
    }
    if (auth.kind === 'session' && hasCoordinatorMetadata(body)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ui_control_metadata_disallowed' }));
      return;
    }

    let resolvedRequestId = readStringValue(body, 'request_id', 'requestId');
    let intentId = readStringValue(body, 'intent_id', 'intentId') ?? null;
    const requestedBy = readStringValue(body, 'requested_by', 'requestedBy') ?? 'ui';
    const reason = readStringValue(body, 'reason');
    let snapshot = context.controlStore.snapshot();
    const taskId = resolveTaskIdFromManifestPath(context.paths.manifestPath);
    const confirmNonce = action === 'cancel' ? readStringValue(body, 'confirm_nonce', 'confirmNonce') : undefined;
    const deferTransportResolutionToConfirmation =
      action === 'cancel' && Boolean(confirmNonce) && !hasAnyOwnProperty(body, ['transport']);
    const transportMutationResult: TransportMutationResolveResult = deferTransportResolutionToConfirmation
      ? { request: null }
      : resolveTransportMutationRequest(body, action);
    if (transportMutationResult.error) {
      const transportMutationStatus = transportMutationResult.status ?? 400;
      const traceability = buildCanonicalTraceability({
        action,
        decision: 'rejected',
        requestId: resolvedRequestId ?? null,
        intentId,
        taskId,
        runId: snapshot.run_id,
        manifestPath: context.paths.manifestPath,
        transport: transportMutationResult.partial?.transport ?? null,
        actorId: transportMutationResult.partial?.actorId ?? null,
        actorSource: transportMutationResult.partial?.actorSource ?? null,
        principal: transportMutationResult.partial?.principal ?? null
      });
      writeControlError(res, transportMutationStatus, transportMutationResult.error, traceability);
      return;
    }
    let transportMutation = transportMutationResult.request;
    let isTransportMutation = Boolean(transportMutation);
    let transportPolicy: TransportMutatingPolicy | null = null;
    let transportIdempotencyWindowMs: number | null = null;

    const validateTransportMutationRequest = (): boolean => {
      if (!transportMutation) {
        transportPolicy = null;
        transportIdempotencyWindowMs = null;
        return true;
      }
      transportPolicy = resolveTransportMutatingPolicy(snapshot.feature_toggles);
      transportIdempotencyWindowMs = null;
      const baseTraceability = buildCanonicalTraceability({
        action,
        decision: 'rejected',
        requestId: resolvedRequestId ?? null,
        intentId,
        taskId,
        runId: snapshot.run_id,
        manifestPath: context.paths.manifestPath,
        transport: transportMutation.transport,
        actorId: transportMutation.actorId,
        actorSource: transportMutation.actorSource,
        principal: transportMutation.principal
      });

      if (!transportPolicy.enabled) {
        writeControlError(res, 403, 'transport_mutating_controls_disabled', baseTraceability);
        return false;
      }
      if (transportPolicy.allowedTransports && !transportPolicy.allowedTransports.has(transportMutation.transport)) {
        writeControlError(res, 403, 'transport_mutating_transport_not_allowed', baseTraceability);
        return false;
      }
      if (!resolvedRequestId && !intentId) {
        writeControlError(res, 400, 'transport_idempotency_key_missing', baseTraceability);
        return false;
      }
      const nowMs = Date.now();
      if (transportMutation.nonceExpiresAtMs <= nowMs) {
        writeControlError(res, 409, 'transport_nonce_expired', baseTraceability);
        return false;
      }
      if (transportMutation.nonceExpiresAtMs - nowMs > transportPolicy.nonceMaxTtlMs) {
        writeControlError(res, 400, 'transport_nonce_expiry_out_of_range', baseTraceability);
        return false;
      }
      if (context.controlStore.isTransportNonceConsumed(transportMutation.nonce)) {
        writeControlError(res, 409, 'transport_nonce_replayed', baseTraceability);
        return false;
      }
      transportIdempotencyWindowMs = transportPolicy.idempotencyWindowMs;
      return true;
    };

    if (!validateTransportMutationRequest()) {
      return;
    }

    const persistControlWithTransportNonce = async (): Promise<void> => {
      if (!transportMutation) {
        await context.persist.control();
        return;
      }
      context.controlStore.consumeTransportNonce({
        nonce: transportMutation.nonce,
        action,
        transport: transportMutation.transport,
        requestId: resolvedRequestId ?? null,
        intentId,
        expiresAt: transportMutation.nonceExpiresAt
      });
      try {
        await context.persist.control();
      } catch (error) {
        context.controlStore.rollbackTransportNonce(transportMutation.nonce);
        throw error;
      }
    };

    const replayIfIdempotent = async (): Promise<boolean> => {
      // Nonce checks can prune expired transport replay entries; read a fresh snapshot before replay lookup.
      snapshot = context.controlStore.snapshot();
      const transportReplayEntry =
        transportMutation && action === 'cancel'
          ? findTransportIdempotencyReplayEntry({
              snapshot,
              action,
              transport: transportMutation.transport,
              requestId: resolvedRequestId ?? null,
              intentId
            })
          : null;
      const genericReplayAllowed =
        !isTransportMutation &&
        isIdempotentReplay(snapshot, action, resolvedRequestId ?? null, intentId) &&
        (action !== 'cancel' || !snapshot.latest_action?.transport);
      if (!transportReplayEntry && !genericReplayAllowed) {
        return false;
      }
      await persistControlWithTransportNonce();
      const replayRequestId = transportReplayEntry
        ? transportReplayEntry.request_id
        : withUndefinedFallback(snapshot.latest_action?.request_id, resolvedRequestId ?? null);
      const replayIntentId = transportReplayEntry
        ? transportReplayEntry.intent_id
        : withUndefinedFallback(snapshot.latest_action?.intent_id, intentId ?? null);
      const replayTraceability =
        action === 'cancel'
          ? buildCanonicalTraceability({
              action,
              decision: 'replayed',
              requestId: replayRequestId,
              intentId: replayIntentId,
              taskId,
              runId: snapshot.run_id,
              manifestPath: context.paths.manifestPath,
              transport: transportReplayEntry?.transport ?? snapshot.latest_action?.transport ?? transportMutation?.transport ?? null,
              actorId: transportReplayEntry ? transportReplayEntry.actor_id : snapshot.latest_action?.actor_id ?? null,
              actorSource: transportReplayEntry
                ? transportReplayEntry.actor_source
                : snapshot.latest_action?.actor_source ?? null,
              principal: transportReplayEntry
                ? transportReplayEntry.transport_principal
                : snapshot.latest_action?.transport_principal ?? null
            })
          : null;
      await emitControlActionAuditEvent(context, {
        outcome: 'replayed',
        action,
        requestedBy,
        reason: reason ?? null,
        requestId: replayRequestId,
        intentId: replayIntentId,
        snapshot,
        traceability: replayTraceability
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      const payload = { ...snapshot, idempotent_replay: true };
      res.end(JSON.stringify(replayTraceability ? { ...payload, traceability: replayTraceability } : payload));
      return true;
    };

    if (!deferTransportResolutionToConfirmation && (await replayIfIdempotent())) {
      return;
    }

    if (action === 'cancel') {
      if (!confirmNonce) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'confirmation_required' }));
        return;
      }
      const tool = readStringValue(body, 'tool') ?? 'delegate.cancel';
      const params = readRecordValue(body, 'params') ?? {};
      let validation;
      try {
        validation = context.confirmationStore.validateNonce({
          confirmNonce,
          tool,
          params
        });
      } catch (error) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error)?.message ?? 'confirmation_invalid' }));
        return;
      }
      const confirmedRequestId = readStringValue(validation.request.params, 'request_id', 'requestId');
      const confirmedIntentId = readStringValue(validation.request.params, 'intent_id', 'intentId');
      resolvedRequestId = confirmedRequestId ?? validation.request.request_id;
      intentId = confirmedIntentId ?? intentId;
      await context.persist.confirmations();
      await emitControlEvent(context, {
        event: 'confirmation_resolved',
        actor: 'runner',
        payload: {
          request_id: validation.request.request_id,
          nonce_id: validation.nonce_id,
          outcome: 'approved'
        }
      });

      const confirmedTransportMutationResult = resolveTransportMutationRequestFromConfirmationScope({
        body,
        params: validation.request.params,
        action
      });
      if (confirmedTransportMutationResult.error) {
        const confirmedTransportMutationStatus = confirmedTransportMutationResult.status ?? 400;
        const traceability = buildCanonicalTraceability({
          action,
          decision: 'rejected',
          requestId: resolvedRequestId ?? null,
          intentId,
          taskId,
          runId: snapshot.run_id,
          manifestPath: context.paths.manifestPath,
          transport: confirmedTransportMutationResult.partial?.transport ?? null,
          actorId: confirmedTransportMutationResult.partial?.actorId ?? null,
          actorSource: confirmedTransportMutationResult.partial?.actorSource ?? null,
          principal: confirmedTransportMutationResult.partial?.principal ?? null
        });
        writeControlError(res, confirmedTransportMutationStatus, confirmedTransportMutationResult.error, traceability);
        return;
      }
      transportMutation = confirmedTransportMutationResult.request;
      isTransportMutation = Boolean(transportMutation);
      if (!validateTransportMutationRequest()) {
        return;
      }
      if (await replayIfIdempotent()) {
        return;
      }
    }

    const update = context.controlStore.updateAction({
      action,
      requestedBy,
      requestId: resolvedRequestId,
      intentId,
      reason,
      ...(transportMutation && transportIdempotencyWindowMs !== null
        ? {
            transportContext: {
              transport: transportMutation.transport,
              actorId: transportMutation.actorId,
              actorSource: transportMutation.actorSource,
              principal: transportMutation.principal,
              idempotencyWindowMs: transportIdempotencyWindowMs
            }
          }
        : {})
    });
    snapshot = update.snapshot;
    if (transportMutation || !update.idempotentReplay) {
      await persistControlWithTransportNonce();
    }
    if (!update.idempotentReplay) {
      context.runtime.publish({ source: 'control.action' });
    }
    const replayEntry = update.replayEntry ?? null;
    const auditRequestId = update.idempotentReplay
      ? replayEntry
        ? replayEntry.request_id
        : snapshot.latest_action?.request_id ?? resolvedRequestId ?? null
      : resolvedRequestId ?? snapshot.latest_action?.request_id ?? null;
    const auditIntentId = update.idempotentReplay
      ? replayEntry
        ? replayEntry.intent_id
        : snapshot.latest_action?.intent_id ?? intentId ?? null
      : intentId ?? snapshot.latest_action?.intent_id ?? null;
    const traceability = transportMutation
      ? buildCanonicalTraceability({
          action,
          decision: update.idempotentReplay ? 'replayed' : 'applied',
          requestId: auditRequestId,
          intentId: auditIntentId,
          taskId,
          runId: snapshot.run_id,
          manifestPath: context.paths.manifestPath,
          transport: transportMutation.transport,
          actorId: replayEntry?.actor_id ?? transportMutation.actorId,
          actorSource: replayEntry?.actor_source ?? transportMutation.actorSource,
          principal: replayEntry?.transport_principal ?? transportMutation.principal
        })
      : null;
    await emitControlActionAuditEvent(context, {
      outcome: update.idempotentReplay ? 'replayed' : 'applied',
      action,
      requestedBy,
      reason: reason ?? null,
      requestId: auditRequestId,
      intentId: auditIntentId,
      snapshot,
      traceability
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const payload = update.idempotentReplay ? { ...snapshot, idempotent_replay: true } : snapshot;
    res.end(JSON.stringify(traceability ? { ...payload, traceability } : payload));
    return;
  }

  if (url.pathname === '/confirmations/create' && req.method === 'POST') {
    await expireConfirmations(context);
    const body = await readJsonBody(req);
    const rawAction = readStringValue(body, 'action');
    const action = rawAction === 'cancel' || rawAction === 'merge' ? rawAction : 'other';
    let tool = readStringValue(body, 'tool') ?? 'unknown';
    let params = readRecordValue(body, 'params') ?? {};
    if (auth.kind === 'session') {
      if (rawAction !== 'cancel' || tool !== 'ui.cancel') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ui_confirmation_disallowed' }));
        return;
      }
      tool = 'ui.cancel';
      params = {};
    }
    const { confirmation, wasCreated } = context.confirmationStore.create({
      action,
      tool,
      params
    });
    await context.persist.confirmations();

    if (wasCreated && context.config.confirm.autoPause) {
      const latestAction = context.controlStore.snapshot().latest_action?.action ?? null;
      if (latestAction !== 'pause') {
        context.controlStore.updateAction({
          action: 'pause',
          requestedBy: 'runner',
          requestId: confirmation.request_id,
          reason: 'confirmation_required'
        });
        await context.persist.control();
        context.runtime.publish({ source: 'control.action' });
      }
    }

    const runId = context.controlStore.snapshot().run_id;
    if (wasCreated) {
      await emitControlEvent(context, {
        event: 'confirmation_required',
        actor: 'runner',
        payload: {
          request_id: confirmation.request_id,
          confirm_scope: {
            run_id: runId,
            action: confirmation.action,
            action_params_digest: confirmation.action_params_digest
          },
          action_params_digest: confirmation.action_params_digest,
          digest_alg: confirmation.digest_alg,
          confirm_expires_in_ms: Date.parse(confirmation.expires_at) - Date.parse(confirmation.requested_at)
        }
      });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        request_id: confirmation.request_id,
        confirm_scope: {
          run_id: runId,
          action: confirmation.action,
          action_params_digest: confirmation.action_params_digest
        },
        action_params_digest: confirmation.action_params_digest,
        digest_alg: confirmation.digest_alg,
        confirm_expires_in_ms: Date.parse(confirmation.expires_at) - Date.parse(confirmation.requested_at)
      })
    );
    return;
  }

  if (url.pathname === '/confirmations' && req.method === 'GET') {
    await expireConfirmations(context);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ pending: sanitizeConfirmations(context.confirmationStore.listPending()) }));
    return;
  }

  if (url.pathname === '/confirmations/approve' && req.method === 'POST') {
    await expireConfirmations(context);
    const body = await readJsonBody(req);
    const requestId = readStringValue(body, 'request_id', 'requestId');
    if (!requestId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_request_id' }));
      return;
    }
    const actor = readStringValue(body, 'actor') ?? 'ui';
    context.confirmationStore.approve(requestId, actor);
    const entry = context.confirmationStore.get(requestId);
    await context.persist.confirmations();

    if (entry && entry.tool.startsWith('ui.') && entry.action === 'cancel') {
      try {
        const nonce = context.confirmationStore.issue(requestId);
        const validation = context.confirmationStore.validateNonce({
          confirmNonce: nonce.confirm_nonce,
          tool: entry.tool,
          params: entry.params
        });
        await context.persist.confirmations();
        await emitControlEvent(context, {
          event: 'confirmation_resolved',
          actor: 'runner',
          payload: {
            request_id: validation.request.request_id,
            nonce_id: validation.nonce_id,
            outcome: 'approved'
          }
        });
        context.controlStore.updateAction({
          action: 'cancel',
          requestedBy: actor,
          requestId: requestId
        });
        await context.persist.control();
        context.runtime.publish({ source: 'control.action' });
      } catch (error) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error)?.message ?? 'confirmation_invalid' }));
        return;
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'approved' }));
    return;
  }

  if ((url.pathname === '/confirmations/issue' || url.pathname === '/confirmations/consume') && req.method === 'POST') {
    await expireConfirmations(context);
    const body = await readJsonBody(req);
    const requestId = readStringValue(body, 'request_id', 'requestId');
    if (!requestId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_request_id' }));
      return;
    }
    let nonce;
    try {
      nonce = context.confirmationStore.issue(requestId);
    } catch (error) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error)?.message ?? 'confirmation_invalid' }));
      return;
    }
    await context.persist.confirmations();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(nonce));
    return;
  }

  if (url.pathname === '/confirmations/validate' && req.method === 'POST') {
    await expireConfirmations(context);
    const body = await readJsonBody(req);
    const confirmNonce = readStringValue(body, 'confirm_nonce', 'confirmNonce');
    if (!confirmNonce) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_confirm_nonce' }));
      return;
    }
    const tool = readStringValue(body, 'tool') ?? 'unknown';
    const params = readRecordValue(body, 'params') ?? {};
    let validation;
    try {
      validation = context.confirmationStore.validateNonce({ confirmNonce, tool, params });
    } catch (error) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error)?.message ?? 'confirmation_invalid' }));
      return;
    }
    await context.persist.confirmations();
    await emitControlEvent(context, {
      event: 'confirmation_resolved',
      actor: 'runner',
      payload: {
        request_id: validation.request.request_id,
        nonce_id: validation.nonce_id,
        outcome: 'approved'
      }
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'valid', request_id: validation.request.request_id, nonce_id: validation.nonce_id }));
    return;
  }

  if (url.pathname === '/security/violation' && req.method === 'POST') {
    const body = await readJsonBody(req);
    await emitControlEvent(context, {
      event: 'security_violation',
      actor: 'runner',
      payload: {
        kind: readStringValue(body, 'kind') ?? 'unknown',
        summary: readStringValue(body, 'summary') ?? 'security_violation',
        severity: readStringValue(body, 'severity') ?? 'high',
        related_request_id: readStringValue(body, 'related_request_id', 'relatedRequestId') ?? null,
        details_redacted: true
      }
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'recorded' }));
    return;
  }

  if (url.pathname === '/delegation/register' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const token = readStringValue(body, 'token');
    const parentRunId = readStringValue(body, 'parent_run_id', 'parentRunId');
    const childRunId = readStringValue(body, 'child_run_id', 'childRunId');
    if (!token || !parentRunId || !childRunId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_delegation_fields' }));
      return;
    }
    const record = context.delegationTokens.register(token, parentRunId, childRunId);
    await context.persist.delegationTokens();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'registered', token_id: record.token_id }));
    return;
  }

  if (url.pathname === '/questions' && req.method === 'GET') {
    await expireQuestions(context);
    const questions = context.questionQueue.list();
    queueQuestionResolutions(context, questions);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ questions }));
    return;
  }

  if (url.pathname === '/questions/enqueue' && req.method === 'POST') {
    const delegationAuth = readDelegationHeaders(req);
    if (!delegationAuth || !validateDelegation(context, delegationAuth)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'delegation_token_invalid' }));
      return;
    }

    const body = await readJsonBody(req);
    const prompt = readStringValue(body, 'prompt');
    if (!prompt) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_prompt' }));
      return;
    }
    const autoPause = readBooleanValue(body, 'auto_pause', 'autoPause') ?? true;
    const expiryFallback = parseExpiryFallback(readStringValue(body, 'expiry_fallback', 'expiryFallback'));
    const parentRunId = context.controlStore.snapshot().run_id;
    const rawFromManifest = readStringValue(body, 'from_manifest_path', 'fromManifestPath');
    let resolvedFromManifest: string | null = null;
    if (rawFromManifest) {
      try {
        resolvedFromManifest = resolveRunManifestPath(
          rawFromManifest,
          context.config.ui.allowedRunRoots,
          'from_manifest_path'
        );
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_manifest_path' }));
        return;
      }
      const manifest = await readJsonFile<CliManifest>(resolvedFromManifest);
      if (!manifest || manifest.run_id !== delegationAuth.childRunId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'delegation_run_mismatch' }));
        return;
      }
    }
    const record = context.questionQueue.enqueue({
      parentRunId,
      fromRunId: delegationAuth.childRunId,
      fromManifestPath: resolvedFromManifest ?? null,
      prompt,
      urgency: parseUrgency(readStringValue(body, 'urgency')),
      expiresInMs: readNumberValue(body, 'expires_in_ms', 'expiresInMs'),
      autoPause,
      expiryFallback
    });
    await context.persist.questions();
    await emitControlEvent(context, {
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
    });
    context.runtime.publish({ source: 'questions.enqueue' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(record));
    return;
  }

  if (url.pathname === '/questions/answer' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const questionId = readStringValue(body, 'question_id', 'questionId');
    const answer = readStringValue(body, 'answer');
    if (!questionId || !answer) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_question_or_answer' }));
      return;
    }
    try {
      context.questionQueue.answer(questionId, answer, readStringValue(body, 'answered_by', 'answeredBy') ?? 'user');
    } catch (error) {
      const message = (error as Error)?.message ?? 'question_invalid';
      const status = message === 'question_not_found' ? 404 : 409;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
      return;
    }
    await context.persist.questions();
    const record = context.questionQueue.get(questionId);
    if (record) {
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
      await maybeResolveChildQuestion(context, record, record.status);
    }
    context.runtime.publish({ source: 'questions.answer' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'answered' }));
    return;
  }

  if (url.pathname === '/questions/dismiss' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const questionId = readStringValue(body, 'question_id', 'questionId');
    if (!questionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_question_id' }));
      return;
    }
    try {
      context.questionQueue.dismiss(questionId, readStringValue(body, 'dismissed_by', 'dismissedBy') ?? 'user');
    } catch (error) {
      const message = (error as Error)?.message ?? 'question_invalid';
      const status = message === 'question_not_found' ? 404 : 409;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
      return;
    }
    await context.persist.questions();
    const record = context.questionQueue.get(questionId);
    if (record) {
      await emitControlEvent(context, {
        event: 'question_closed',
        actor: 'user',
        payload: {
          question_id: record.question_id,
          parent_run_id: record.parent_run_id,
          outcome: record.status,
          closed_at: record.closed_at,
          expires_at: record.expires_at ?? null
        }
      });
      await maybeResolveChildQuestion(context, record, record.status);
    }
    context.runtime.publish({ source: 'questions.dismiss' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'dismissed' }));
    return;
  }

  if (url.pathname.startsWith('/questions/') && req.method === 'GET') {
    await expireQuestions(context);
    const delegationAuth = readDelegationHeaders(req);
    if (delegationAuth && !validateDelegation(context, delegationAuth)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'delegation_token_invalid' }));
      return;
    }
    const questionId = url.pathname.split('/').pop();
    const record = questionId ? context.questionQueue.get(questionId) : null;
    if (!record) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    if (delegationAuth && record.from_run_id !== delegationAuth.childRunId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'delegation_scope_mismatch' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(record));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

type LinearAdvisoryDeliveryOutcome = 'accepted' | 'duplicate' | 'ignored' | 'rejected';

interface LinearAdvisoryDeliveryRecord {
  delivery_id: string;
  event: string | null;
  action: string | null;
  issue_id: string | null;
  webhook_timestamp: number | null;
  processed_at: string;
  outcome: LinearAdvisoryDeliveryOutcome;
  reason: string;
}

interface LinearAdvisoryLatestEvent {
  delivery_id: string;
  event: string | null;
  action: string | null;
  issue_id: string | null;
  webhook_timestamp: number | null;
  processed_at: string;
}

interface LinearAdvisoryState {
  schema_version: number;
  updated_at: string;
  latest_delivery_id: string | null;
  latest_result: LinearAdvisoryDeliveryOutcome | null;
  latest_reason: string | null;
  latest_event: LinearAdvisoryLatestEvent | null;
  latest_accepted_at: string | null;
  tracked_issue: LiveLinearTrackedIssue | null;
  seen_deliveries: LinearAdvisoryDeliveryRecord[];
}

async function handleLinearWebhook(context: RequestContext): Promise<void> {
  if (!context.req || !context.res) {
    return;
  }
  const { req, res } = context;
  if (req.method !== 'POST') {
    writeLinearWebhookResponse(res, 405, 'rejected', 'method_not_allowed');
    return;
  }

  const deliveryId = readHeaderValue(req.headers['linear-delivery']);
  if (!deliveryId) {
    writeLinearWebhookResponse(res, 400, 'rejected', 'linear_delivery_header_missing');
    return;
  }

  const signature = readHeaderValue(req.headers['linear-signature']);
  if (!signature) {
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_signature_missing');
    return;
  }

  const webhookSecret = process.env.CO_LINEAR_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    writeLinearWebhookResponse(res, 503, 'rejected', 'linear_webhook_secret_missing');
    return;
  }

  const rawBody = await readRawBody(req);
  if (!isLinearWebhookSignatureValid(signature, rawBody, webhookSecret)) {
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_signature_invalid');
    return;
  }

  const payload = parseJsonRecord(rawBody);
  if (!payload) {
    writeLinearWebhookResponse(res, 400, 'rejected', 'invalid_json');
    return;
  }

  const webhookTimestamp = resolveLinearWebhookTimestamp(payload);
  if (!webhookTimestamp) {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: readHeaderValue(req.headers['linear-event']) ?? readStringValue(payload, 'type') ?? null,
      action: readStringValue(payload, 'action') ?? null,
      issueId: readLinearWebhookIssueId(payload),
      webhookTimestamp: null,
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_invalid'
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: readHeaderValue(req.headers['linear-event']) ?? readStringValue(payload, 'type') ?? null,
      action: readStringValue(payload, 'action') ?? null,
      issueId: readLinearWebhookIssueId(payload),
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_invalid'
    });
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_webhook_timestamp_invalid');
    return;
  }

  if (Math.abs(Date.now() - webhookTimestamp) > LINEAR_WEBHOOK_MAX_AGE_MS) {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: readHeaderValue(req.headers['linear-event']) ?? readStringValue(payload, 'type') ?? null,
      action: readStringValue(payload, 'action') ?? null,
      issueId: readLinearWebhookIssueId(payload),
      webhookTimestamp,
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_expired'
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: readHeaderValue(req.headers['linear-event']) ?? readStringValue(payload, 'type') ?? null,
      action: readStringValue(payload, 'action') ?? null,
      issueId: readLinearWebhookIssueId(payload),
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_expired'
    });
    writeLinearWebhookResponse(res, 401, 'rejected', 'linear_webhook_timestamp_expired');
    return;
  }

  const eventName = readHeaderValue(req.headers['linear-event']) ?? readStringValue(payload, 'type') ?? null;
  const action = readStringValue(payload, 'action') ?? null;
  const issueId = readLinearWebhookIssueId(payload);

  if (hasSeenLinearDelivery(context.linearAdvisoryState, deliveryId)) {
    markLinearAdvisoryDuplicate(context.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      outcome: 'duplicate',
      reason: 'linear_delivery_duplicate'
    });
    writeLinearWebhookResponse(res, 200, 'duplicate', 'linear_delivery_duplicate');
    return;
  }

  const sourceSetup = resolveLinearWebhookSourceSetup(context);
  if ('error' in sourceSetup) {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'rejected',
      reason: sourceSetup.error
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      outcome: 'rejected',
      reason: sourceSetup.error
    });
    writeLinearWebhookResponse(res, sourceSetup.status, 'rejected', sourceSetup.error);
    return;
  }

  if ((eventName ?? '').toLowerCase() !== 'issue' || (readStringValue(payload, 'type') ?? '').toLowerCase() !== 'issue') {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'ignored',
      reason: 'linear_event_unsupported'
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      outcome: 'ignored',
      reason: 'linear_event_unsupported'
    });
    writeLinearWebhookResponse(res, 200, 'ignored', 'linear_event_unsupported');
    return;
  }

  if (action !== 'create' && action !== 'update') {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'ignored',
      reason: 'linear_action_unsupported'
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      outcome: 'ignored',
      reason: 'linear_action_unsupported'
    });
    writeLinearWebhookResponse(res, 200, 'ignored', 'linear_action_unsupported');
    return;
  }

  if (!issueId) {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId: null,
      webhookTimestamp,
      outcome: 'rejected',
      reason: 'linear_issue_id_missing'
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: eventName,
      action,
      issueId: null,
      outcome: 'rejected',
      reason: 'linear_issue_id_missing'
    });
    writeLinearWebhookResponse(res, 400, 'rejected', 'linear_issue_id_missing');
    return;
  }

  const resolution = await resolveLiveLinearTrackedIssueById({
    issueId,
    sourceSetup: sourceSetup.sourceSetup,
    env: process.env
  });

  if (resolution.kind === 'ready') {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'accepted',
      reason: 'linear_delivery_accepted',
      trackedIssue: resolution.tracked_issue
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      outcome: 'accepted',
      reason: 'linear_delivery_accepted'
    });
    writeLinearWebhookResponse(res, 200, 'accepted', 'linear_delivery_accepted');
    context.runtime.publish({ source: 'linear.webhook' });
    return;
  }

  if (shouldIgnoreLinearResolutionReason(resolution.reason)) {
    recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      webhookTimestamp,
      outcome: 'ignored',
      reason: resolution.reason
    });
    await context.persist.linearAdvisory();
    await emitLinearWebhookAuditEvent(context, {
      deliveryId,
      event: eventName,
      action,
      issueId,
      outcome: 'ignored',
      reason: resolution.reason
    });
    writeLinearWebhookResponse(res, 200, 'ignored', resolution.reason);
    return;
  }

  recordLinearAdvisoryOutcome(context.linearAdvisoryState, {
    deliveryId,
    event: eventName,
    action,
    issueId,
    webhookTimestamp,
    outcome: 'rejected',
    reason: resolution.reason
  });
  await context.persist.linearAdvisory();
  await emitLinearWebhookAuditEvent(context, {
    deliveryId,
    event: eventName,
    action,
    issueId,
    outcome: 'rejected',
    reason: resolution.reason
  });
  writeLinearWebhookResponse(res, resolution.status, 'rejected', resolution.reason);
}

function writeLinearWebhookResponse(
  res: http.ServerResponse,
  status: number,
  outcome: LinearAdvisoryDeliveryOutcome,
  reason: string
): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: outcome, reason, timestamp: isoTimestamp() }));
}

function resolveLinearWebhookSourceSetup(
  context: RequestContext
): { sourceSetup: { provider: 'linear'; workspace_id: string | null; team_id: string | null; project_id: string | null } } | {
  status: number;
  error: string;
} {
  const evaluation = evaluateTrackerDispatchPilot({
    featureToggles: context.controlStore.snapshot().feature_toggles,
    defaultIssueIdentifier: null
  });
  if (!evaluation.summary.configured) {
    return { status: 503, error: 'dispatch_source_unavailable' };
  }
  if (!evaluation.summary.enabled) {
    return { status: 409, error: 'dispatch_source_disabled' };
  }
  if (evaluation.summary.kill_switch) {
    return { status: 409, error: 'dispatch_source_kill_switched' };
  }
  if (!evaluation.summary.source_setup || evaluation.summary.source_setup.provider !== 'linear') {
    return { status: 422, error: 'dispatch_source_binding_missing' };
  }
  return { sourceSetup: evaluation.summary.source_setup };
}

function shouldIgnoreLinearResolutionReason(reason: string): boolean {
  return (
    reason === 'dispatch_source_issue_not_found' ||
    reason === 'dispatch_source_workspace_mismatch' ||
    reason === 'dispatch_source_team_mismatch' ||
    reason === 'dispatch_source_project_mismatch'
  );
}

function readLinearWebhookIssueId(payload: Record<string, unknown>): string | null {
  const data = readRecordValue(payload, 'data');
  if (!data) {
    return null;
  }
  return readStringValue(data, 'id') ?? null;
}

function resolveLinearWebhookTimestamp(payload: Record<string, unknown>): number | null {
  const raw = payload.webhookTimestamp;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function parseJsonRecord(payload: Buffer): Record<string, unknown> | null {
  if (payload.length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(payload.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isLinearWebhookSignatureValid(signature: string, payload: Buffer, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  return safeTokenCompare(signature, expected);
}

function normalizeLinearAdvisoryState(input: LinearAdvisoryState | null): LinearAdvisoryState {
  const state = input ?? {
    schema_version: 1,
    updated_at: new Date(0).toISOString(),
    latest_delivery_id: null,
    latest_result: null,
    latest_reason: null,
    latest_event: null,
    latest_accepted_at: null,
    tracked_issue: null,
    seen_deliveries: []
  };
  return {
    schema_version: 1,
    updated_at: typeof state.updated_at === 'string' && state.updated_at.trim().length > 0 ? state.updated_at : new Date(0).toISOString(),
    latest_delivery_id: typeof state.latest_delivery_id === 'string' ? state.latest_delivery_id : null,
    latest_result:
      state.latest_result === 'accepted' ||
      state.latest_result === 'duplicate' ||
      state.latest_result === 'ignored' ||
      state.latest_result === 'rejected'
        ? state.latest_result
        : null,
    latest_reason: typeof state.latest_reason === 'string' ? state.latest_reason : null,
    latest_event: state.latest_event ?? null,
    latest_accepted_at: typeof state.latest_accepted_at === 'string' ? state.latest_accepted_at : null,
    tracked_issue: state.tracked_issue ?? null,
    seen_deliveries: Array.isArray(state.seen_deliveries)
      ? state.seen_deliveries.slice(-LINEAR_ADVISORY_SEEN_DELIVERY_LIMIT)
      : []
  };
}

function hasSeenLinearDelivery(state: LinearAdvisoryState, deliveryId: string): boolean {
  return state.seen_deliveries.some((entry) => entry.delivery_id === deliveryId);
}

function markLinearAdvisoryDuplicate(
  state: LinearAdvisoryState,
  input: {
    deliveryId: string;
    event: string | null;
    action: string | null;
    issueId: string | null;
    webhookTimestamp: number | null;
  }
): void {
  state.updated_at = isoTimestamp();
  state.latest_result = 'duplicate';
  state.latest_reason = 'linear_delivery_duplicate';
  state.latest_event = {
    delivery_id: input.deliveryId,
    event: input.event,
    action: input.action,
    issue_id: input.issueId,
    webhook_timestamp: input.webhookTimestamp,
    processed_at: state.updated_at
  };
}

function recordLinearAdvisoryOutcome(
  state: LinearAdvisoryState,
  input: {
    deliveryId: string;
    event: string | null;
    action: string | null;
    issueId: string | null;
    webhookTimestamp: number | null;
    outcome: LinearAdvisoryDeliveryOutcome;
    reason: string;
    trackedIssue?: LiveLinearTrackedIssue | null;
  }
): void {
  const processedAt = isoTimestamp();
  state.updated_at = processedAt;
  state.latest_result = input.outcome;
  state.latest_reason = input.reason;
  state.latest_event = {
    delivery_id: input.deliveryId,
    event: input.event,
    action: input.action,
    issue_id: input.issueId,
    webhook_timestamp: input.webhookTimestamp,
    processed_at: processedAt
  };
  state.latest_delivery_id = input.deliveryId;
  state.seen_deliveries = [
    ...state.seen_deliveries.filter((entry) => entry.delivery_id !== input.deliveryId),
    {
      delivery_id: input.deliveryId,
      event: input.event,
      action: input.action,
      issue_id: input.issueId,
      webhook_timestamp: input.webhookTimestamp,
      processed_at: processedAt,
      outcome: input.outcome,
      reason: input.reason
    }
  ].slice(-LINEAR_ADVISORY_SEEN_DELIVERY_LIMIT);
  if (input.outcome === 'accepted' && input.trackedIssue) {
    state.latest_accepted_at = processedAt;
    state.tracked_issue = input.trackedIssue;
  }
}

async function emitLinearWebhookAuditEvent(
  context: RequestContext,
  input: {
    deliveryId: string;
    event: string | null;
    action: string | null;
    issueId: string | null;
    outcome: LinearAdvisoryDeliveryOutcome;
    reason: string;
  }
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

function isControlAction(action: unknown): action is 'pause' | 'resume' | 'cancel' | 'fail' {
  return action === 'pause' || action === 'resume' || action === 'cancel' || action === 'fail';
}

interface TransportMutatingPolicy {
  enabled: boolean;
  idempotencyWindowMs: number;
  nonceMaxTtlMs: number;
  allowedTransports: ReadonlySet<ControlTransport> | null;
}

interface TransportMutationRequest {
  transport: ControlTransport;
  actorId: string;
  actorSource: string;
  principal: string;
  nonce: string;
  nonceExpiresAt: string;
  nonceExpiresAtMs: number;
}

interface TransportMutationResolveResult {
  request: TransportMutationRequest | null;
  status?: number;
  error?: string;
  partial?: {
    transport: ControlTransport | null;
    actorId?: string | null;
    actorSource?: string | null;
    principal?: string | null;
  };
}

function resolveTransportMutationRequest(
  body: Record<string, unknown>,
  action: ControlAction['action']
): TransportMutationResolveResult {
  const mutatingAction = TRANSPORT_MUTATING_ACTIONS.has(action);
  const hasTransportField = Object.prototype.hasOwnProperty.call(body, 'transport');
  const hasTransportMetadata = TRANSPORT_METADATA_KEYS.some((key) => Object.prototype.hasOwnProperty.call(body, key));
  if (mutatingAction && hasTransportMetadata && !hasTransportField) {
    return { request: null, status: 400, error: 'transport_invalid', partial: { transport: null } };
  }
  const rawTransport = body.transport;
  const normalizedTransport = typeof rawTransport === 'string' ? rawTransport.trim() : undefined;
  if (hasTransportField && mutatingAction && !normalizedTransport) {
    return { request: null, status: 400, error: 'transport_invalid', partial: { transport: null } };
  }
  const transport = parseTransport(normalizedTransport);
  if (normalizedTransport && !transport) {
    return { request: null, status: 400, error: 'transport_unsupported', partial: { transport: null } };
  }
  if (!transport || !mutatingAction) {
    return { request: null };
  }

  const actorId = readStringValue(body, 'actor_id', 'actorId');
  if (!actorId) {
    return { request: null, status: 400, error: 'transport_actor_id_missing', partial: { transport } };
  }
  if (!TRANSPORT_IDENTITY_PATTERN.test(actorId)) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_id_invalid',
      partial: { transport, actorId }
    };
  }

  const actorSource = readStringValue(body, 'actor_source', 'actorSource');
  if (!actorSource) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_source_missing',
      partial: { transport, actorId }
    };
  }
  if (!TRANSPORT_SOURCE_PATTERN.test(actorSource)) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_source_invalid',
      partial: { transport, actorId, actorSource }
    };
  }
  if (!actorSource.toLowerCase().startsWith(transport)) {
    return {
      request: null,
      status: 400,
      error: 'transport_actor_source_mismatch',
      partial: { transport, actorId, actorSource }
    };
  }

  const principal = readStringValue(body, 'transport_principal', 'transportPrincipal', 'principal');
  if (!principal) {
    return {
      request: null,
      status: 400,
      error: 'transport_principal_missing',
      partial: { transport, actorId, actorSource }
    };
  }
  if (!TRANSPORT_PRINCIPAL_PATTERN.test(principal)) {
    return {
      request: null,
      status: 400,
      error: 'transport_principal_invalid',
      partial: { transport, actorId, actorSource, principal }
    };
  }

  const nonce = readStringValue(body, 'transport_nonce', 'transportNonce', 'nonce');
  if (!nonce) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_missing',
      partial: { transport, actorId, actorSource, principal }
    };
  }
  if (!TRANSPORT_NONCE_PATTERN.test(nonce)) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_invalid',
      partial: { transport, actorId, actorSource, principal }
    };
  }

  const rawExpiry = readStringValue(
    body,
    'transport_nonce_expires_at',
    'transportNonceExpiresAt',
    'nonce_expires_at',
    'nonceExpiresAt'
  );
  if (!rawExpiry) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_expiry_missing',
      partial: { transport, actorId, actorSource, principal }
    };
  }
  const nonceExpiresAtMs = Date.parse(rawExpiry);
  if (!Number.isFinite(nonceExpiresAtMs)) {
    return {
      request: null,
      status: 400,
      error: 'transport_nonce_expiry_invalid',
      partial: { transport, actorId, actorSource, principal }
    };
  }

  return {
    request: {
      transport,
      actorId,
      actorSource,
      principal,
      nonce,
      nonceExpiresAt: new Date(nonceExpiresAtMs).toISOString(),
      nonceExpiresAtMs
    }
  };
}

function resolveTransportMutationRequestFromConfirmationScope(input: {
  body: Record<string, unknown>;
  params: Record<string, unknown>;
  action: ControlAction['action'];
}): TransportMutationResolveResult {
  const hasBodyTransportField = hasAnyOwnProperty(input.body, ['transport']);
  const hasBodyTransportMetadata = hasAnyOwnProperty(input.body, TRANSPORT_METADATA_KEYS);
  const hasConfirmedTransportField = hasAnyOwnProperty(input.params, ['transport']);
  const hasConfirmedTransportMetadata = hasAnyOwnProperty(input.params, TRANSPORT_METADATA_KEYS);
  const confirmedTransportRaw = readStringValue(input.params, 'transport');
  const confirmedTransport = parseTransport(confirmedTransportRaw);
  if (!confirmedTransport) {
    if (hasConfirmedTransportField || hasConfirmedTransportMetadata || hasBodyTransportField || hasBodyTransportMetadata) {
      return {
        request: null,
        status: 409,
        error: 'confirmation_scope_mismatch',
        partial: { transport: null }
      };
    }
    return { request: null };
  }

  const confirmedActorId = readStringValue(input.params, 'actor_id', 'actorId');
  const confirmedActorSource = readStringValue(input.params, 'actor_source', 'actorSource');
  const confirmedPrincipal = readStringValue(input.params, 'transport_principal', 'transportPrincipal', 'principal');
  const topLevelTransport = readStringValue(input.body, 'transport');
  const topLevelActorId = readStringValue(input.body, 'actor_id', 'actorId');
  const topLevelActorSource = readStringValue(input.body, 'actor_source', 'actorSource');
  const topLevelPrincipal = readStringValue(input.body, 'transport_principal', 'transportPrincipal', 'principal');
  const hasTopLevelActorId = hasAnyOwnProperty(input.body, ['actor_id', 'actorId']);
  const hasTopLevelActorSource = hasAnyOwnProperty(input.body, ['actor_source', 'actorSource']);
  const hasTopLevelPrincipal = hasAnyOwnProperty(input.body, ['transport_principal', 'transportPrincipal', 'principal']);
  if (
    (hasBodyTransportField && topLevelTransport !== confirmedTransport) ||
    (hasTopLevelActorId && topLevelActorId !== confirmedActorId) ||
    (hasTopLevelActorSource && topLevelActorSource !== confirmedActorSource) ||
    (hasTopLevelPrincipal && topLevelPrincipal !== confirmedPrincipal)
  ) {
    return {
      request: null,
      status: 409,
      error: 'confirmation_scope_mismatch',
      partial: {
        transport: confirmedTransport,
        actorId: confirmedActorId ?? null,
        actorSource: confirmedActorSource ?? null,
        principal: confirmedPrincipal ?? null
      }
    };
  }

  return resolveTransportMutationRequest(
    {
      ...input.body,
      transport: confirmedTransport,
      actor_id: confirmedActorId,
      actor_source: confirmedActorSource,
      transport_principal: confirmedPrincipal
    },
    input.action
  );
}

function parseTransport(value: string | undefined): ControlTransport | null {
  if (!value) {
    return null;
  }
  if (value === 'discord' || value === 'telegram') {
    return value;
  }
  return null;
}

function resolveTransportMutatingPolicy(
  featureToggles: Record<string, unknown> | null | undefined
): TransportMutatingPolicy {
  const toggles = featureToggles ?? {};
  const direct = readRecordValue(toggles, 'transport_mutating_controls');
  const coordinator = readRecordValue(toggles, 'coordinator');
  const nested = coordinator ? readRecordValue(coordinator, 'transport_mutating_controls') : undefined;
  const policy = nested ?? direct ?? {};
  const allowedTransportValues = readStringArrayValue(policy, 'allowed_transports', 'allowedTransports');
  return {
    enabled: readBooleanValue(policy, 'enabled') ?? false,
    idempotencyWindowMs: clampPolicyWindow(
      readNumberValue(policy, 'idempotency_window_ms', 'idempotencyWindowMs'),
      DEFAULT_TRANSPORT_IDEMPOTENCY_WINDOW_MS
    ),
    nonceMaxTtlMs: clampPolicyWindow(
      readNumberValue(policy, 'nonce_max_ttl_ms', 'nonceMaxTtlMs'),
      DEFAULT_TRANSPORT_NONCE_MAX_TTL_MS
    ),
    allowedTransports: resolveAllowedTransportPolicy(allowedTransportValues)
  };
}

function resolveAllowedTransportPolicy(values: string[] | undefined): ReadonlySet<ControlTransport> | null {
  if (!values) {
    return null;
  }
  const allowed = new Set<ControlTransport>();
  for (const value of values) {
    const transport = parseTransport(value);
    if (transport) {
      allowed.add(transport);
    }
  }
  return allowed;
}

function clampPolicyWindow(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(value), 1), MAX_TRANSPORT_POLICY_WINDOW_MS);
}

function buildCanonicalTraceability(input: {
  action: ControlAction['action'];
  decision: 'applied' | 'replayed' | 'rejected';
  requestId: string | null;
  intentId: string | null;
  taskId: string | null;
  runId: string | null;
  manifestPath: string;
  transport: ControlTransport | null;
  actorId: string | null;
  actorSource: string | null;
  principal: string | null;
  timestamp?: string;
}): Record<string, unknown> {
  const timestamp = input.timestamp ?? isoTimestamp();
  return {
    actor_id: input.actorId,
    actor_source: input.actorSource,
    transport: input.transport,
    transport_principal: input.principal,
    intent_id: input.intentId,
    request_id: input.requestId,
    task_id: input.taskId,
    run_id: input.runId,
    manifest_path: input.manifestPath,
    action: input.action,
    decision: input.decision,
    timestamp
  };
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

function hasCoordinatorMetadata(body: Record<string, unknown>): boolean {
  const disallowedKeys = [
    'intent_id',
    'intentId',
    'request_id',
    'requestId',
    'task_id',
    'taskId',
    'run_id',
    'runId',
    'manifest_path',
    'manifestPath'
  ];
  return disallowedKeys.some((key) => Object.prototype.hasOwnProperty.call(body, key));
}

function isIdempotentReplay(
  snapshot: ControlState,
  action: ControlAction['action'],
  requestId: string | null,
  intentId: string | null
): boolean {
  const latest = snapshot.latest_action;
  if (!latest || latest.action !== action) {
    return false;
  }
  if (requestId && latest.request_id === requestId) {
    return true;
  }
  if (intentId && latest.intent_id === intentId) {
    return true;
  }
  return false;
}

function findTransportIdempotencyReplayEntry(input: {
  snapshot: ControlState;
  action: ControlAction['action'];
  transport: ControlTransport;
  requestId: string | null;
  intentId: string | null;
}): TransportIdempotencyEntry | null {
  const index = input.snapshot.transport_mutation?.idempotency_index ?? [];
  for (const entry of index) {
    if (entry.action !== input.action || entry.transport !== input.transport) {
      continue;
    }
    if (entry.key_type === 'request' && input.requestId && entry.key === input.requestId) {
      return entry;
    }
    if (entry.key_type === 'intent' && input.intentId && entry.key === input.intentId) {
      return entry;
    }
  }
  return null;
}

function withUndefinedFallback<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value;
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

function sanitizeConfirmations(
  entries: ConfirmationRequest[]
): Array<Omit<ConfirmationRequest, 'params'>> {
  return entries.map((entry) => {
    const sanitized = { ...entry } as Partial<ConfirmationRequest>;
    delete sanitized.params;
    return sanitized as Omit<ConfirmationRequest, 'params'>;
  });
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

function hasAnyOwnProperty(record: Record<string, unknown>, keys: readonly string[]): boolean {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return true;
    }
  }
  return false;
}

function readNumberValue(record: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBooleanValue(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
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

function readStringArrayValue(record: Record<string, unknown>, ...keys: string[]): string[] | undefined {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }
    const parsed: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') {
        continue;
      }
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        parsed.push(trimmed);
      }
    }
    return parsed;
  }
  return undefined;
}

function parseUrgency(value: string | undefined): QuestionUrgency {
  if (value === 'low' || value === 'med' || value === 'high') {
    return value;
  }
  return 'med';
}

function parseExpiryFallback(value: string | undefined): 'pause' | 'resume' | 'fail' | undefined {
  if (value === 'pause' || value === 'resume' || value === 'fail') {
    return value;
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
