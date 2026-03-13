import http from 'node:http';

import type { RunPaths } from '../run/runPaths.js';
import type { EffectiveDelegationConfig } from '../config/delegationConfig.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import type { ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';
import {
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import {
  type ControlServerOwnedLifecycleState,
  closeControlServerOwnedRuntime,
  startControlServerReadyInstanceLifecycle
} from './controlServerReadyInstanceLifecycle.js';
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
  private baseUrl: string | null = null;
  private readonly lifecycleState: ControlServerOwnedLifecycleState;

  private get expiryLifecycle(): ControlExpiryLifecycle | null {
    return this.lifecycleState.expiryLifecycle;
  }

  private set expiryLifecycle(value: ControlExpiryLifecycle | null) {
    this.lifecycleState.expiryLifecycle = value;
  }

  private get bootstrapLifecycle(): ControlServerBootstrapLifecycle | null {
    return this.lifecycleState.bootstrapLifecycle;
  }

  private set bootstrapLifecycle(value: ControlServerBootstrapLifecycle | null) {
    this.lifecycleState.bootstrapLifecycle = value;
  }

  private constructor(options: {
    server: http.Server;
    requestContextShared: ControlRequestSharedContext;
    baseUrl?: string | null;
    lifecycleState?: ControlServerOwnedLifecycleState;
  }) {
    this.server = options.server;
    this.requestContextShared = options.requestContextShared;
    this.baseUrl = options.baseUrl ?? null;
    this.lifecycleState = options.lifecycleState ?? {
      expiryLifecycle: null,
      bootstrapLifecycle: null
    };
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
    const readyInstance = await startControlServerReadyInstanceLifecycle({
      requestContextShared: options.requestContextShared,
      host: options.host,
      controlToken: options.controlToken,
      intervalMs: options.intervalMs
    });

    return new ControlServer({
      server: readyInstance.server,
      requestContextShared: options.requestContextShared,
      baseUrl: readyInstance.baseUrl,
      lifecycleState: readyInstance.lifecycleState
    });
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  broadcast(entry: RunEventStreamEntry): void {
    this.requestContextShared.eventTransport.broadcast(entry);
  }

  async close(): Promise<void> {
    return closeControlServerOwnedRuntime({
      server: this.server,
      requestContextShared: this.requestContextShared,
      lifecycleState: this.lifecycleState
    });
  }
}

export { isLoopbackAddress } from './uiSessionController.js';
export { formatHostForUrl } from './controlServerStartupSequence.js';
