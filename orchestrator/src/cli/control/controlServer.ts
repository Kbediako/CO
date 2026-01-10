import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, realpathSync } from 'node:fs';
import { chmod, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeJsonAtomic } from '../utils/fs.js';
import { isoTimestamp } from '../utils/time.js';
import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import type { CliManifest } from '../types.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import { ControlStateStore, type ControlState } from './controlState.js';
import { ConfirmationStore, type ConfirmationRequest, type ConfirmationStoreSnapshot } from './confirmations.js';
import { QuestionQueue, type QuestionRecord, type QuestionUrgency } from './questions.js';
import { DelegationTokenStore, type DelegationTokenRecord } from './delegationTokens.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';

interface ControlServerOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: RunEventStream;
  runId: string;
}

const MAX_BODY_BYTES = 1024 * 1024;
const EXPIRY_INTERVAL_MS = 15_000;
const SESSION_TTL_MS = 15 * 60 * 1000;
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
  }

  static async start(options: ControlServerOptions): Promise<ControlServer> {
    const token = randomBytes(24).toString('hex');
    const controlSeed = await readJsonFile<ControlState>(options.paths.controlPath);
    const confirmationsSeed = await readJsonFile<ConfirmationStoreSnapshot>(options.paths.confirmationsPath);
    const questionsSeed = await readJsonFile<{ questions?: QuestionRecord[] }>(options.paths.questionsPath);
    const delegationSeed = await readJsonFile<{ tokens?: DelegationTokenRecord[] }>(
      options.paths.delegationTokensPath
    );

    const controlStore = new ControlStateStore({
      runId: options.runId,
      controlSeq: controlSeed?.control_seq ?? 0,
      latestAction: controlSeed?.latest_action ?? null,
      featureToggles: controlSeed?.feature_toggles ?? null
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

    const clients = new Set<http.ServerResponse>();
    const persist = {
      control: async () => writeJsonAtomic(options.paths.controlPath, controlStore.snapshot()),
      confirmations: async () => writeJsonAtomic(options.paths.confirmationsPath, confirmationStore.snapshot()),
      questions: async () => writeJsonAtomic(options.paths.questionsPath, { questions: questionQueue.list() }),
      delegationTokens: async () => writeJsonAtomic(options.paths.delegationTokensPath, { tokens: delegationTokens.list() })
    };

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
        paths: options.paths
      }).catch((error) => {
        const status = error instanceof HttpError ? error.status : 500;
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error)?.message ?? String(error) }));
      });
    });

    const instance = new ControlServer({
      server,
      controlStore,
      confirmationStore,
      questionQueue,
      delegationTokens,
      sessionTokens,
      eventStream: options.eventStream,
      clients,
      persist,
      paths: options.paths
    });

    const host = options.config.ui.bindHost;
    await new Promise<void>((resolve) => {
      server.listen(0, host, () => resolve());
    });
    const address = server.address();
    const port = typeof address === 'string' || !address ? 0 : address.port;
    instance.baseUrl = `http://${formatHostForUrl(host)}:${port}`;

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
  }

  async close(): Promise<void> {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
      this.expiryTimer = null;
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
      paths: this.paths
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
  };
  clients: Set<http.ServerResponse>;
  paths: RunPaths;
}

async function handleRequest(context: RequestContext): Promise<void> {
  if (!context.req || !context.res) {
    return;
  }
  const { req, res } = context;
  const url = new URL(req.url ?? '/', 'http://localhost');
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

  if (url.pathname === '/auth/session' && (req.method === 'GET' || req.method === 'POST')) {
    if (!isLoopbackAddress(req.socket.remoteAddress)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'loopback_only' }));
      return;
    }
    const allowedHosts = normalizeAllowedHosts(context.config.ui.allowedBindHosts);
    const hostHeader = parseHostHeader(req.headers.host);
    if (!hostHeader || !allowedHosts.has(hostHeader)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'host_not_allowed' }));
      return;
    }
    const originHost = parseOriginHost(req.headers.origin);
    if (originHost) {
      if (!allowedHosts.has(originHost)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'origin_not_allowed' }));
        return;
      }
    } else if (req.method !== 'GET') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'origin_required' }));
      return;
    }
    const session = context.sessionTokens.issue();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ token: session.token, expires_at: session.expiresAt }));
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

  if (url.pathname === '/ui/data.json' && req.method === 'GET') {
    const payload = await buildUiDataset(context);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
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

    let resolvedRequestId = readStringValue(body, 'request_id', 'requestId');
    if (action === 'cancel') {
      const confirmNonce = readStringValue(body, 'confirm_nonce', 'confirmNonce');
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
      resolvedRequestId = validation.request.request_id;
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
    }

    const reason = readStringValue(body, 'reason');
    context.controlStore.updateAction({
      action,
      requestedBy: readStringValue(body, 'requested_by', 'requestedBy') ?? 'ui',
      requestId: resolvedRequestId,
      reason
    });
    await context.persist.control();
    const snapshot = context.controlStore.snapshot();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(snapshot));
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

function isControlAction(action: unknown): action is 'pause' | 'resume' | 'cancel' | 'fail' {
  return action === 'pause' || action === 'resume' || action === 'cancel' || action === 'fail';
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

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
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
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
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

function readStringValue(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
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
  const token = req.headers[DELEGATION_TOKEN_HEADER] as string | undefined;
  const childRunId = req.headers[DELEGATION_RUN_HEADER] as string | undefined;
  if (!token || !childRunId) {
    return null;
  }
  return { token, childRunId };
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
    logger.warn(`Failed to resolve child question: ${(error as Error)?.message ?? error}`);
  }
}

function queueQuestionResolutions(context: RequestContext, records: QuestionRecord[]): void {
  for (const record of records) {
    if (record.status === 'queued') {
      continue;
    }
    void maybeResolveChildQuestion(context, record, record.status).catch((error) => {
      logger.warn(`Failed to resolve child question: ${(error as Error)?.message ?? error}`);
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
  } catch {
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
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      [CSRF_HEADER]: token
    },
    body: JSON.stringify(payload)
  });
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

function parseHostHeader(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    if (end === -1) {
      return null;
    }
    return trimmed.slice(1, end).toLowerCase();
  }
  const parts = trimmed.split(':');
  if (parts.length > 2) {
    return trimmed.toLowerCase();
  }
  const host = parts[0]?.trim();
  return host ? host.toLowerCase() : null;
}

function parseOriginHost(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
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
  assertRunManifestPath(resolved, label);
  if (!isPathWithinRoots(resolved, allowedRoots)) {
    throw new Error(`${label} not permitted`);
  }
  return resolved;
}

function assertRunManifestPath(pathname: string, label: string): void {
  if (basename(pathname) !== 'manifest.json') {
    throw new Error(`${label} invalid`);
  }
  const runDir = dirname(pathname);
  const cliDir = dirname(runDir);
  if (basename(cliDir) !== 'cli') {
    throw new Error(`${label} invalid`);
  }
  const taskDir = dirname(cliDir);
  const runsDir = dirname(taskDir);
  if (basename(runsDir) !== '.runs') {
    throw new Error(`${label} invalid`);
  }
  if (!basename(runDir) || !basename(taskDir)) {
    throw new Error(`${label} invalid`);
  }
}

function isPathWithinRoots(pathname: string, roots: string[]): boolean {
  const resolved = realpathSafe(pathname);
  return roots.some((root) => {
    const resolvedRoot = realpathSafe(root);
    if (resolvedRoot === resolved) {
      return true;
    }
    const normalizedRoot = resolvedRoot.endsWith('/') ? resolvedRoot : `${resolvedRoot}/`;
    return resolved.startsWith(normalizedRoot);
  });
}

function realpathSafe(pathname: string): string {
  try {
    return realpathSync(pathname);
  } catch {
    return resolve(pathname);
  }
}

async function buildUiDataset(context: RequestContext): Promise<Record<string, unknown>> {
  const manifest = await readJsonFile<CliManifest>(context.paths.manifestPath);
  const generatedAt = isoTimestamp();
  if (!manifest) {
    return { generated_at: generatedAt, tasks: [], runs: [], codebase: null, activity: [] };
  }

  const bucketInfo = classifyBucket(manifest.status, context.controlStore.snapshot());
  const approvalsTotal = Array.isArray(manifest.approvals) ? manifest.approvals.length : 0;
  const repoRoot = resolveRepoRootFromRunDir(context.paths.runDir);
  const links = {
    manifest: repoRoot ? relative(repoRoot, context.paths.manifestPath) : context.paths.manifestPath,
    log: repoRoot ? relative(repoRoot, context.paths.logPath) : context.paths.logPath,
    metrics: null,
    state: null
  };

  const stages = Array.isArray(manifest.commands)
    ? manifest.commands.map((command) => ({
        id: command.id,
        title: command.title || command.id,
        status: command.status
      }))
    : [];

  const runEntry = {
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    status: manifest.status,
    started_at: manifest.started_at,
    updated_at: manifest.updated_at,
    completed_at: manifest.completed_at,
    stages,
    links,
    approvals_pending: 0,
    approvals_total: approvalsTotal,
    heartbeat_stale: false
  };

  const taskEntry = {
    task_id: manifest.task_id,
    title: manifest.pipeline_title || manifest.task_id,
    bucket: bucketInfo.bucket,
    bucket_reason: bucketInfo.reason,
    status: manifest.status,
    last_update: manifest.updated_at,
    latest_run_id: manifest.run_id,
    approvals_pending: 0,
    approvals_total: approvalsTotal,
    summary: manifest.summary ?? ''
  };

  return {
    generated_at: generatedAt,
    tasks: [taskEntry],
    runs: [runEntry],
    codebase: null,
    activity: []
  };
}

function classifyBucket(
  status: CliManifest['status'],
  control: ControlState
): { bucket: string; reason: string } {
  if (status === 'queued') {
    return { bucket: 'pending', reason: 'queued' };
  }
  if (status === 'in_progress') {
    const latest = control.latest_action?.action ?? null;
    if (latest === 'pause') {
      return { bucket: 'ongoing', reason: 'paused' };
    }
    return { bucket: 'active', reason: 'running' };
  }
  if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
    return { bucket: 'complete', reason: 'terminal' };
  }
  return { bucket: 'pending', reason: 'unknown' };
}

function resolveRepoRootFromRunDir(runDir: string): string | null {
  const candidate = resolve(runDir, '..', '..', '..', '..');
  return candidate || null;
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
