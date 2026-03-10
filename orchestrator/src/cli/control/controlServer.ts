import http from 'node:http';
import { randomBytes } from 'node:crypto';

import type { RunPaths } from '../run/runPaths.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { type ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import { type ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';
import {
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import { createControlServerSeededRuntimeAssembly } from './controlServerSeededRuntimeAssembly.js';
import { readControlServerSeeds } from './controlServerSeedLoading.js';
import { createBoundControlServerRequestShell } from './controlServerRequestShellBinding.js';
import { startControlServerReadyInstanceStartup } from './controlServerReadyInstanceStartup.js';

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

    return ControlServer.startPendingReadyInstance({
      requestContextShared,
      host: options.config.ui.bindHost,
      controlToken: token,
      intervalMs: EXPIRY_INTERVAL_MS
    });
  }

  private static async startPendingReadyInstance(options: {
    requestContextShared: ControlRequestSharedContext;
    host: string;
    controlToken: string;
    intervalMs: number;
  }): Promise<ControlServer> {
    let instance: ControlServer | null = null;
    const server = createBoundControlServerRequestShell({
      readRequestContextShared: () => instance?.requestContextShared ?? null,
      readExpiryLifecycle: () => instance?.expiryLifecycle ?? null
    });

    instance = new ControlServer({
      server,
      requestContextShared: options.requestContextShared
    });
    instance.baseUrl = await startControlServerReadyInstanceStartup({
      server,
      requestContextShared: instance.requestContextShared,
      intervalMs: options.intervalMs,
      host: options.host,
      controlToken: options.controlToken,
      onBootstrapAssembly: ({ expiryLifecycle, bootstrapLifecycle }) => {
        instance!.expiryLifecycle = expiryLifecycle;
        instance!.bootstrapLifecycle = bootstrapLifecycle;
      },
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

export { isLoopbackAddress } from './uiSessionController.js';
export { formatHostForUrl } from './controlServerStartupSequence.js';
