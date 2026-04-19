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
  serverClosePromise?: Promise<void>;
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

  await (options.serverClosePromise ?? beginClosingControlServerHttpServer(options.server));
}

export function beginClosingControlServerHttpServer(server: http.Server): Promise<void> {
  if (!server.listening) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const settleError = (error: unknown): void => {
      const code = (error as NodeJS.ErrnoException | null)?.code;
      if (code === 'ERR_SERVER_NOT_RUNNING') {
        resolve();
        return;
      }
      reject(error);
    };

    try {
      server.close((error) => {
        if (error) {
          settleError(error);
          return;
        }
        resolve();
      });
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
    } catch (error) {
      settleError(error);
    }
  });
}
