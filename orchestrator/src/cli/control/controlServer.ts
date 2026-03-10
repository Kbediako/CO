import http from 'node:http';
import { randomBytes } from 'node:crypto';

import type { RunPaths } from '../run/runPaths.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { handleControlUiSessionAdmission } from './uiSessionController.js';
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
import { createControlServerSeededRuntimeAssembly } from './controlServerSeededRuntimeAssembly.js';
import { createControlServerRequestShell } from './controlServerRequestShell.js';
import { readControlServerSeeds } from './controlServerSeedLoading.js';
import { handleControlAuthenticatedRouteBranch } from './controlServerAuthenticatedRouteBranch.js';
import {
  emitDispatchPilotAuditEvents,
  emitLinearWebhookAuditEvent,
} from './controlServerAuditAndErrorHelpers.js';
import { handlePublicControlRoute } from './controlServerPublicRouteHelpers.js';
import { readRawBody } from './controlServerRequestBodyHelpers.js';

interface ControlServerOptions {
  paths: RunPaths;
  config: EffectiveDelegationConfig;
  eventStream?: RunEventStream;
  runId: string;
}

const EXPIRY_INTERVAL_MS = 15_000;
const SESSION_TTL_MS = 15 * 60 * 1000;

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
  if (
    await handlePublicControlRoute({
      pathname: url.pathname,
      search: url.search ? url.search : '',
      res
    })
  ) {
    return;
  }

  if (
    handleControlUiSessionAdmission({
      req,
      res,
      allowedBindHosts: context.config.ui.allowedBindHosts,
      issueSession: () => context.sessionTokens.issue()
    })
  ) {
    return;
  }

  if (
    await handleLinearWebhookRequest({
      req,
      res,
      linearAdvisoryState: context.linearAdvisoryState,
      readRawBody,
      persistLinearAdvisory: context.persist.linearAdvisory,
      emitAuditEvent: (input) => emitLinearWebhookAuditEvent(context, input),
      readFeatureToggles: () => context.controlStore.snapshot().feature_toggles,
      publishRuntime: () => context.runtime.publish({ source: 'linear.webhook' })
    })
  ) {
    return;
  }

  await handleControlAuthenticatedRouteBranch({
    pathname: url.pathname,
    req,
    res,
    context,
    runtimeSnapshot,
    presenterContext
  });
}

export { isLoopbackAddress } from './uiSessionController.js';
export { formatHostForUrl } from './controlServerStartupSequence.js';
