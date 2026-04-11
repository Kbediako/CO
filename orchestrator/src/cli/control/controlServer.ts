import http from 'node:http';

import type { RunEventStreamEntry } from '../events/runEventStream.js';
import {
  closeControlServerPublicLifecycle,
  startControlServerPublicLifecycle,
  type StartedControlServerPublicLifecycle
} from './controlServerPublicLifecycle.js';

type ControlServerOptions = Parameters<typeof startControlServerPublicLifecycle>[0];

export class ControlServer {
  private readonly server: http.Server;
  private readonly requestContextShared: StartedControlServerPublicLifecycle['requestContextShared'];
  private baseUrl: string | null = null;
  private readonly lifecycleState: StartedControlServerPublicLifecycle['lifecycleState'];
  private readonly providerRefreshTimer: StartedControlServerPublicLifecycle['providerRefreshTimer'];
  private readonly providerRefreshStartupTrigger: StartedControlServerPublicLifecycle['providerRefreshStartupTrigger'];
  private readonly controlHostOwnership: StartedControlServerPublicLifecycle['controlHostOwnership'];

  private constructor(options: StartedControlServerPublicLifecycle) {
    this.server = options.server;
    this.requestContextShared = options.requestContextShared;
    this.baseUrl = options.baseUrl;
    this.lifecycleState = options.lifecycleState;
    this.providerRefreshTimer = options.providerRefreshTimer;
    this.providerRefreshStartupTrigger = options.providerRefreshStartupTrigger;
    this.controlHostOwnership = options.controlHostOwnership;
  }

  static async start(options: ControlServerOptions): Promise<ControlServer> {
    return new ControlServer(await startControlServerPublicLifecycle(options));
  }

  getBaseUrl(): string | null {
    return this.baseUrl;
  }

  broadcast(entry: RunEventStreamEntry): void {
    this.requestContextShared.eventTransport.broadcast(entry);
  }

  async close(): Promise<void> {
    return closeControlServerPublicLifecycle({
      server: this.server,
      requestContextShared: this.requestContextShared,
      lifecycleState: this.lifecycleState,
      providerRefreshTimer: this.providerRefreshTimer,
      providerRefreshStartupTrigger: this.providerRefreshStartupTrigger,
      controlHostOwnership: this.controlHostOwnership
    });
  }
}

export { isLoopbackAddress } from './uiSessionController.js';
export { formatHostForUrl } from './controlServerStartupSequence.js';
