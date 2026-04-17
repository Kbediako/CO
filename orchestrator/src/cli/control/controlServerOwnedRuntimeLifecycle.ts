import http from 'node:http';

import type { ControlBootstrapAssembly } from './controlBootstrapAssembly.js';
import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';
import { createBoundControlServerRequestShell } from './controlServerRequestShellBinding.js';
import type { ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';

export interface ControlServerOwnedLifecycleState {
  expiryLifecycle: ControlExpiryLifecycle | null;
  bootstrapLifecycle: ControlServerBootstrapLifecycle | null;
}

export interface ControlServerOwnedRuntimeState {
  server: http.Server;
  requestContextShared: ControlRequestSharedContext;
  lifecycleState: ControlServerOwnedLifecycleState;
  publishBootstrapAssembly(assembly: ControlBootstrapAssembly): void;
}

interface CloseControlServerOwnedRuntimeOptions {
  server: http.Server;
  requestContextShared: Pick<ControlRequestSharedContext, 'clients'>;
  lifecycleState: ControlServerOwnedLifecycleState;
  serverClosePromise?: Promise<void> | null;
}

export function createControlServerOwnedRuntime(
  requestContextShared: ControlRequestSharedContext
): ControlServerOwnedRuntimeState {
  const lifecycleState: ControlServerOwnedLifecycleState = {
    expiryLifecycle: null,
    bootstrapLifecycle: null
  };
  const ownedRuntime: ControlServerOwnedRuntimeState = {
    server: null as unknown as http.Server,
    requestContextShared,
    lifecycleState,
    publishBootstrapAssembly(assembly) {
      lifecycleState.expiryLifecycle = assembly.expiryLifecycle;
      lifecycleState.bootstrapLifecycle = assembly.bootstrapLifecycle;
    }
  };

  ownedRuntime.server = createBoundControlServerRequestShell({
    readRequestContextShared: () => ownedRuntime.requestContextShared,
    readExpiryLifecycle: () => ownedRuntime.lifecycleState.expiryLifecycle
  });

  return ownedRuntime;
}

export function assertControlServerBootstrapAssemblyPublished(
  lifecycleState: ControlServerOwnedLifecycleState
): void {
  if (!lifecycleState.expiryLifecycle || !lifecycleState.bootstrapLifecycle) {
    throw new Error('Control server ready instance startup did not publish bootstrap assembly');
  }
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

  const serverClosePromise = options.serverClosePromise ?? beginControlServerShutdown(options.server);
  options.server.closeIdleConnections?.();
  options.server.closeAllConnections?.();
  await serverClosePromise;
}

export function beginControlServerShutdown(server: http.Server): Promise<void> {
  if (!server.listening) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    try {
      server.close((error) => {
        if (!error || isServerNotRunningError(error)) {
          resolve();
          return;
        }
        reject(error);
      });
    } catch (error) {
      if (isServerNotRunningError(error)) {
        resolve();
        return;
      }
      reject(error);
    }
  });
}

function isServerNotRunningError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'ERR_SERVER_NOT_RUNNING';
}
