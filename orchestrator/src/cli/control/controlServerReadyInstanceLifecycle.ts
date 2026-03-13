import http from 'node:http';

import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import { createBoundControlServerRequestShell } from './controlServerRequestShellBinding.js';
import { startControlServerReadyInstanceStartup } from './controlServerReadyInstanceStartup.js';
import type { ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';

export interface ControlServerOwnedLifecycleState {
  expiryLifecycle: ControlExpiryLifecycle | null;
  bootstrapLifecycle: ControlServerBootstrapLifecycle | null;
}

interface ControlServerOwnedRuntimeState {
  server: http.Server;
  requestContextShared: ControlRequestSharedContext;
  lifecycleState: ControlServerOwnedLifecycleState;
}

interface StartControlServerReadyInstanceLifecycleOptions {
  requestContextShared: ControlRequestSharedContext;
  host: string;
  controlToken: string;
  intervalMs: number;
}

interface StartControlServerReadyInstanceLifecycleResult {
  server: http.Server;
  baseUrl: string;
  lifecycleState: ControlServerOwnedLifecycleState;
}

interface CloseControlServerOwnedRuntimeOptions {
  server: http.Server;
  requestContextShared: Pick<ControlRequestSharedContext, 'clients'>;
  lifecycleState: ControlServerOwnedLifecycleState;
}

export async function startControlServerReadyInstanceLifecycle(
  options: StartControlServerReadyInstanceLifecycleOptions
): Promise<StartControlServerReadyInstanceLifecycleResult> {
  const ownedRuntime: ControlServerOwnedRuntimeState = {
    server: null as unknown as http.Server,
    requestContextShared: options.requestContextShared,
    lifecycleState: {
      expiryLifecycle: null,
      bootstrapLifecycle: null
    }
  };
  const server = createBoundControlServerRequestShell({
    readRequestContextShared: () => ownedRuntime.requestContextShared,
    readExpiryLifecycle: () => ownedRuntime.lifecycleState.expiryLifecycle
  });
  ownedRuntime.server = server;

  const baseUrl = await startControlServerReadyInstanceStartup({
    server,
    requestContextShared: ownedRuntime.requestContextShared,
    intervalMs: options.intervalMs,
    host: options.host,
    controlToken: options.controlToken,
    onBootstrapAssembly: ({ expiryLifecycle, bootstrapLifecycle }) => {
      ownedRuntime.lifecycleState.expiryLifecycle = expiryLifecycle;
      ownedRuntime.lifecycleState.bootstrapLifecycle = bootstrapLifecycle;
    },
    closeOnFailure: () =>
      closeControlServerOwnedRuntime({
        server: ownedRuntime.server,
        requestContextShared: ownedRuntime.requestContextShared,
        lifecycleState: ownedRuntime.lifecycleState
      })
  });

  const expiryLifecycle = ownedRuntime.lifecycleState.expiryLifecycle;
  const bootstrapLifecycle = ownedRuntime.lifecycleState.bootstrapLifecycle;
  if (!expiryLifecycle || !bootstrapLifecycle) {
    throw new Error('Control server ready instance startup did not publish bootstrap assembly');
  }

  return {
    server: ownedRuntime.server,
    baseUrl,
    lifecycleState: ownedRuntime.lifecycleState
  };
}

export async function closeControlServerOwnedRuntime(
  options: CloseControlServerOwnedRuntimeOptions
): Promise<void> {
  const expiryLifecycle = options.lifecycleState.expiryLifecycle;
  expiryLifecycle?.close();
  options.lifecycleState.expiryLifecycle = null;

  const bootstrapLifecycle = options.lifecycleState.bootstrapLifecycle;
  await bootstrapLifecycle?.close();
  options.lifecycleState.bootstrapLifecycle = null;

  for (const client of options.requestContextShared.clients) {
    client.end();
  }

  await new Promise<void>((resolve) => {
    options.server.close(() => resolve());
  });
}
