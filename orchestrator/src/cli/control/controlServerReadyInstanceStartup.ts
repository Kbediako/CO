import http from 'node:http';

import { createControlBootstrapAssembly } from './controlBootstrapAssembly.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import { emitDispatchPilotAuditEvents } from './controlServerAuditAndErrorHelpers.js';
import { startControlServerStartupSequence } from './controlServerStartupSequence.js';

interface ControlServerReadyInstanceStartupOptions {
  server: http.Server;
  requestContextShared: ControlRequestSharedContext;
  intervalMs: number;
  host: string;
  controlToken: string;
  onBootstrapAssembly(assembly: ReturnType<typeof createControlBootstrapAssembly>): void;
  closeOnFailure(): Promise<void>;
}

export async function startControlServerReadyInstanceStartup(
  options: ControlServerReadyInstanceStartupOptions
): Promise<string> {
  const bootstrapAssembly = createControlBootstrapAssembly({
    intervalMs: options.intervalMs,
    requestContextShared: options.requestContextShared,
    emitDispatchPilotAuditEvents
  });
  options.onBootstrapAssembly(bootstrapAssembly);

  return startControlServerStartupSequence({
    server: options.server,
    host: options.host,
    bootstrapLifecycle: bootstrapAssembly.bootstrapLifecycle,
    controlToken: options.controlToken,
    closeOnFailure: options.closeOnFailure
  });
}
