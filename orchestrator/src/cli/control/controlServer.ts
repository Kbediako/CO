import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../../logger.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunPaths } from '../run/runPaths.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { handleUiSessionRequest } from './uiSessionController.js';
import { admitAuthenticatedControlRoute } from './authenticatedControlRouteGate.js';
import { handleAuthenticatedRouteRequest } from './authenticatedRouteController.js';
import { handleLinearWebhookRequest } from './linearWebhookController.js';
import { type ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import { type ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';
import { createControlBootstrapAssembly } from './controlBootstrapAssembly.js';
import { startControlServerStartupSequence } from './controlServerStartupSequence.js';
import {
  buildControlPresenterRuntimeContext,
  type ControlRequestContext,
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import { createControlQuestionChildResolutionAdapter } from './controlQuestionChildResolution.js';
import { createControlServerSeededRuntimeAssembly } from './controlServerSeededRuntimeAssembly.js';
import { createControlServerRequestShell } from './controlServerRequestShell.js';
import { readControlServerSeeds } from './controlServerSeedLoading.js';
import {
  emitControlActionAuditEvent,
  emitDispatchPilotAuditEvents,
  emitLinearWebhookAuditEvent,
  writeControlError
} from './controlServerAuditAndErrorHelpers.js';
import { readJsonBody, readRawBody } from './controlServerRequestBodyHelpers.js';

interface ControlServerOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: RunEventStream;
  runId: string;
}

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

export class ControlServer {
  private readonly server: http.Server;
  private readonly requestContextShared: ControlRequestSharedContext;
  private bootstrapLifecycle: ControlServerBootstrapLifecycle | null = null;
  private baseUrl: string | null = null;
  private expiryLifecycle: ControlExpiryLifecycle | null = null;

  private constructor(options: {
    server: http.Server;
    requestContextShared: ControlRequestSharedContext;
  }) {
    this.server = options.server;
    this.requestContextShared = options.requestContextShared;
  }

  static async start(options: ControlServerOptions): Promise<ControlServer> {
    const token = randomBytes(24).toString('hex');
    const {
      controlSeed,
      confirmationsSeed,
      questionsSeed,
      delegationSeed,
      linearAdvisorySeed
    } = await readControlServerSeeds(options.paths);

    const { requestContextShared } = createControlServerSeededRuntimeAssembly({
      runId: options.runId,
      token,
      config: options.config,
      paths: options.paths,
      eventStream: options.eventStream,
      sessionTtlMs: SESSION_TTL_MS,
      controlSeed,
      confirmationsSeed,
      questionsSeed,
      delegationSeed,
      linearAdvisorySeed
    });

    let instance: ControlServer | null = null;
    const server = createControlServerRequestShell({
      readRuntime: () =>
        instance
          ? {
              requestContextShared: instance.requestContextShared,
              expiryLifecycle: instance.expiryLifecycle
            }
          : null,
      handleRequest
    });

    instance = new ControlServer({
      server,
      requestContextShared
    });
    const bootstrapAssembly = createControlBootstrapAssembly({
      intervalMs: EXPIRY_INTERVAL_MS,
      requestContextShared: instance.requestContextShared,
      emitDispatchPilotAuditEvents
    });
    instance.expiryLifecycle = bootstrapAssembly.expiryLifecycle;
    instance.bootstrapLifecycle = bootstrapAssembly.bootstrapLifecycle;

    instance.baseUrl = await startControlServerStartupSequence({
      server,
      host: options.config.ui.bindHost,
      bootstrapLifecycle: instance.bootstrapLifecycle,
      controlToken: token,
      closeOnFailure: () => instance!.close()
    });

    return instance;
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  broadcast(entry: RunEventStreamEntry): void {
    this.requestContextShared.eventTransport.broadcast(entry);
  }

  async close(): Promise<void> {
    this.expiryLifecycle?.close();
    this.expiryLifecycle = null;
    await this.bootstrapLifecycle?.close();
    this.bootstrapLifecycle = null;
    for (const client of this.requestContextShared.clients) {
      client.end();
    }
    await new Promise<void>((resolve) => {
      this.server.close(() => resolve());
    });
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

export { formatHostForUrl } from './controlServerStartupSequence.js';

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
