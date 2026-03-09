import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeJsonAtomic } from '../utils/fs.js';
import { isoTimestamp } from '../utils/time.js';
import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
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
  type ControlDispatchPayload,
  type QuestionsPayload,
  type TelegramOversightReadAdapter
} from './telegramOversightBridge.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { createControlRuntime, type ControlRuntime } from './controlRuntime.js';
import {
  readDispatchExtension,
  type DispatchExtensionResult
} from './observabilitySurface.js';
import { handleUiSessionRequest } from './uiSessionController.js';
import { admitAuthenticatedControlRoute } from './authenticatedControlRouteGate.js';
import { handleAuthenticatedRouteRequest } from './authenticatedRouteController.js';
import {
  handleLinearWebhookRequest,
  normalizeLinearAdvisoryState,
  type LinearAdvisoryState,
  type LinearWebhookAuditEventInput
} from './linearWebhookController.js';
import {
  createControlExpiryLifecycle,
  type ControlExpiryLifecycle
} from './controlExpiryLifecycle.js';
import {
  createControlServerBootstrapLifecycle,
  type ControlServerBootstrapLifecycle
} from './controlServerBootstrapLifecycle.js';
import {
  createControlEventTransport,
  type ControlEventTransport
} from './controlEventTransport.js';
import {
  buildControlInternalContext,
  buildControlPresenterRuntimeContext,
  buildControlRequestContext,
  type ControlRequestContext,
  type ControlRequestPersist,
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import { createControlQuestionChildResolutionAdapter } from './controlQuestionChildResolution.js';
import { runQuestionReadSequence } from './questionReadSequence.js';

interface ControlServerOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: RunEventStream;
  runId: string;
}

const MAX_BODY_BYTES = 1024 * 1024;
const EXPIRY_INTERVAL_MS = 15_000;
const SESSION_TTL_MS = 15 * 60 * 1000;
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
  private readonly clients: Set<http.ServerResponse>;
  private readonly eventTransport: ControlEventTransport;
  private readonly persist: ControlRequestPersist;
  private readonly requestContextShared: ControlRequestSharedContext;
  private readonly paths: RunPaths;
  private readonly linearAdvisoryState: LinearAdvisoryState;
  private readonly controlRuntime: ControlRuntime;
  private bootstrapLifecycle: ControlServerBootstrapLifecycle | null = null;
  private baseUrl: string | null = null;
  private expiryLifecycle: ControlExpiryLifecycle | null = null;

  private constructor(options: {
    server: http.Server;
    controlStore: ControlStateStore;
    confirmationStore: ConfirmationStore;
    questionQueue: QuestionQueue;
    delegationTokens: DelegationTokenStore;
    sessionTokens: SessionTokenStore;
    clients: Set<http.ServerResponse>;
    eventTransport: ControlEventTransport;
    persist: ControlRequestPersist;
    requestContextShared: ControlRequestSharedContext;
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
    this.clients = options.clients;
    this.eventTransport = options.eventTransport;
    this.persist = options.persist;
    this.requestContextShared = options.requestContextShared;
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
    const eventTransport = createControlEventTransport({
      eventStream: options.eventStream,
      clients,
      runtime: controlRuntime
    });
    const persist = {
      control: async () => writeJsonAtomic(options.paths.controlPath, controlStore.snapshot()),
      confirmations: async () => writeJsonAtomic(options.paths.confirmationsPath, confirmationStore.snapshot()),
      questions: async () => writeJsonAtomic(options.paths.questionsPath, { questions: questionQueue.list() }),
      delegationTokens: async () => writeJsonAtomic(options.paths.delegationTokensPath, { tokens: delegationTokens.list() }),
      linearAdvisory: async () => writeJsonAtomic(linearAdvisoryStatePath, linearAdvisoryState)
    } satisfies ControlRequestPersist;
    const requestContextShared = {
      token,
      controlStore,
      confirmationStore,
      questionQueue,
      delegationTokens,
      sessionTokens,
      config: options.config,
      persist,
      clients,
      eventTransport,
      paths: options.paths,
      linearAdvisoryState,
      runtime: controlRuntime
    } satisfies ControlRequestSharedContext;

    let instance: ControlServer | null = null;
    const server = http.createServer((req, res) => {
      if (!instance) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'control_server_unavailable' }));
        return;
      }
      handleRequest(
        buildControlRequestContext({
          ...instance.requestContextShared,
          req,
          res,
          expiryLifecycle: instance.expiryLifecycle
        })
      ).catch((error) => {
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
      clients,
      eventTransport,
      persist,
      requestContextShared,
      paths: options.paths,
      linearAdvisoryState,
      controlRuntime
    });
    instance.expiryLifecycle = createControlExpiryLifecycle({
      intervalMs: EXPIRY_INTERVAL_MS,
      confirmationStore,
      questionQueue,
      persist: {
        confirmations: persist.confirmations,
        questions: persist.questions
      },
      runtime: controlRuntime,
      emitControlEvent: (input) => instance.eventTransport.emitControlEvent(input),
      createQuestionChildResolutionAdapter: () =>
        createControlQuestionChildResolutionAdapter(
          buildControlInternalContext({
            ...instance.requestContextShared,
            expiryLifecycle: instance.expiryLifecycle
          })
        )
    });
    instance.bootstrapLifecycle = createControlServerBootstrapLifecycle({
      paths: options.paths,
      persistControl: persist.control,
      startExpiryLifecycle: () => instance.expiryLifecycle?.start(),
      controlRuntime,
      createTelegramReadAdapter: () => instance.createTelegramOversightReadAdapter()
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
      if (!instance.baseUrl) {
        throw new Error('control_server_base_url_unavailable');
      }
      await instance.bootstrapLifecycle.start({
        baseUrl: instance.baseUrl,
        controlToken: token
      });
    } catch (error) {
      await instance.close();
      throw error;
    }

    return instance;
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  broadcast(entry: RunEventStreamEntry): void {
    this.eventTransport.broadcast(entry);
  }

  async close(): Promise<void> {
    this.expiryLifecycle?.close();
    this.expiryLifecycle = null;
    await this.bootstrapLifecycle?.close();
    this.bootstrapLifecycle = null;
    for (const client of this.clients) {
      client.end();
    }
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
  }

  private createTelegramOversightReadAdapter(): TelegramOversightReadAdapter {
    return {
      readSelectedRun: async () => this.controlRuntime.snapshot().readSelectedRunSnapshot(),

      readDispatch: async (): Promise<ControlDispatchPayload> => {
        const context = buildControlInternalContext({
          ...this.requestContextShared,
          expiryLifecycle: this.expiryLifecycle
        });
        const runtimeSnapshot = context.runtime.snapshot();
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
        const context = buildControlInternalContext({
          ...this.requestContextShared,
          expiryLifecycle: this.expiryLifecycle
        });
        const questionChildResolutionAdapter = createControlQuestionChildResolutionAdapter(context);
        const result = await runQuestionReadSequence({
          listQuestions: () => context.questionQueue.list(),
          expireQuestions: () =>
            this.expiryLifecycle?.expireQuestions(questionChildResolutionAdapter) ?? Promise.resolve()
        });
        questionChildResolutionAdapter.queueQuestionResolutions(result.retryCandidates);
        return { questions: result.questions };
      }
    };
  }
}

async function handleRequest(context: ControlRequestContext): Promise<void> {
  if (!context.req || !context.res) {
    return;
  }
  const { req, res } = context;
  const url = new URL(req.url ?? '/', 'http://localhost');
  const { runtimeSnapshot, presenterContext } = buildControlPresenterRuntimeContext(context);
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

  const auth = admitAuthenticatedControlRoute({
    req,
    res,
    pathname: url.pathname,
    controlToken: context.token,
    isSessionTokenValid: (token) => context.sessionTokens.validate(token)
  });
  if (!auth) {
    return;
  }

  const questionChildResolutionAdapter = createControlQuestionChildResolutionAdapter(context);
  const handled = await handleAuthenticatedRouteRequest({
    pathname: url.pathname,
    method: req.method,
    authKind: auth.kind,
    req,
    res,
    clients: context.clients,
    presenterContext,
    confirmAutoPause: context.config.confirm.autoPause,
    taskId: resolveTaskIdFromManifestPath(context.paths.manifestPath),
    manifestPath: context.paths.manifestPath,
    controlStore: context.controlStore,
    confirmationStore: context.confirmationStore,
    questionQueue: context.questionQueue,
    delegationTokens: context.delegationTokens,
    persist: context.persist,
    runtime: context.runtime,
    readRequestBody: () => readJsonBody(req),
    readDispatchEvaluation: () => runtimeSnapshot.readDispatchEvaluation(),
    onDispatchEvaluated: (record) => emitDispatchPilotAuditEvents(context, record),
    emitControlEvent: (input) => context.eventTransport.emitControlEvent(input),
    emitControlActionAuditEvent: (input) => emitControlActionAuditEvent(context, input),
    writeControlError: (status, error, traceability) =>
      writeControlError(res, status, error, traceability),
    expireConfirmations: () => context.expiryLifecycle?.expireConfirmations() ?? Promise.resolve(),
    expireQuestions: () =>
      context.expiryLifecycle?.expireQuestions(questionChildResolutionAdapter) ?? Promise.resolve(),
    queueQuestionResolutions: (records) => questionChildResolutionAdapter.queueQuestionResolutions(records),
    readDelegationHeaders: () => questionChildResolutionAdapter.readDelegationHeaders(req),
    validateDelegation: (delegationAuth) => questionChildResolutionAdapter.validateDelegation(delegationAuth),
    resolveManifestPath: (rawPath) => questionChildResolutionAdapter.resolveManifestPath(rawPath),
    readManifest: (path) => questionChildResolutionAdapter.readManifest(path),
    resolveChildQuestion: (record, outcome) =>
      questionChildResolutionAdapter.resolveChildQuestion(record, outcome)
  });

  if (handled) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}

async function emitLinearWebhookAuditEvent(
  context: ControlRequestContext,
  input: LinearWebhookAuditEventInput
): Promise<void> {
  await context.eventTransport.emitControlEvent({
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
  context: ControlRequestContext,
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

  await context.eventTransport.emitControlEvent({
    event: 'dispatch_pilot_evaluated',
    actor: 'runner',
    payload: eventPayload
  });
  await context.eventTransport.emitControlEvent({
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
  context: ControlRequestContext,
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
  await context.eventTransport.emitControlEvent({
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
  context: ControlRequestContext,
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

function normalizeAllowedHosts(allowedHosts?: string[]): Set<string> {
  const values = allowedHosts && allowedHosts.length > 0 ? allowedHosts : Array.from(LOOPBACK_HOSTS);
  return new Set(values.map((entry) => entry.toLowerCase()));
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
