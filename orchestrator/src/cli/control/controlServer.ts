import http from 'node:http';

import type { RunPaths } from '../run/runPaths.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { type ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import { type ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';
import {
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import { createBoundControlServerRequestShell } from './controlServerRequestShellBinding.js';
import { startControlServerReadyInstanceStartup } from './controlServerReadyInstanceStartup.js';
import { prepareControlServerStartupInputs } from './controlServerStartupInputPreparation.js';

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
    const startupInputs = await prepareControlServerStartupInputs({
      paths: options.paths,
      config: options.config,
      eventStream: options.eventStream,
      runId: options.runId,
      sessionTtlMs: SESSION_TTL_MS
    });

    return ControlServer.startPendingReadyInstance({
      requestContextShared: startupInputs.requestContextShared,
      host: startupInputs.host,
      controlToken: startupInputs.controlToken,
      intervalMs: EXPIRY_INTERVAL_MS
    });
  }

  private static async startPendingReadyInstance(options: {
    requestContextShared: ControlRequestSharedContext;
    host: string;
    controlToken: string;
    intervalMs: number;
  }): Promise<ControlServer> {
    return ControlServer.activatePendingReadyInstance({
      requestContextShared: options.requestContextShared,
      host: options.host,
      controlToken: options.controlToken,
      intervalMs: options.intervalMs
    });
  }

  private static async activatePendingReadyInstance(options: {
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
    return this.shutdownOwnedRuntime();
  }

  private async shutdownOwnedRuntime(): Promise<void> {
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
