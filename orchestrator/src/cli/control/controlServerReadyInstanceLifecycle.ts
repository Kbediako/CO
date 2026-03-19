import http from 'node:http';

import type { ControlRequestSharedContext } from './controlRequestContext.js';
import {
  assertControlServerBootstrapAssemblyPublished,
  closeControlServerOwnedRuntime,
  createControlServerOwnedRuntime,
  type ControlServerOwnedLifecycleState
} from './controlServerOwnedRuntimeLifecycle.js';
import { startControlServerReadyInstanceStartup } from './controlServerReadyInstanceStartup.js';

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

export async function startControlServerReadyInstanceLifecycle(
  options: StartControlServerReadyInstanceLifecycleOptions
): Promise<StartControlServerReadyInstanceLifecycleResult> {
  const ownedRuntime = createControlServerOwnedRuntime(options.requestContextShared);

  const baseUrl = await startControlServerReadyInstanceStartup({
    server: ownedRuntime.server,
    requestContextShared: ownedRuntime.requestContextShared,
    intervalMs: options.intervalMs,
    host: options.host,
    controlToken: options.controlToken,
    onBootstrapAssembly: ownedRuntime.publishBootstrapAssembly,
    closeOnFailure: () =>
      closeControlServerOwnedRuntime({
        server: ownedRuntime.server,
        requestContextShared: ownedRuntime.requestContextShared,
        lifecycleState: ownedRuntime.lifecycleState
      })
  });

  assertControlServerBootstrapAssemblyPublished(ownedRuntime.lifecycleState);

  return {
    server: ownedRuntime.server,
    baseUrl,
    lifecycleState: ownedRuntime.lifecycleState
  };
}

export {
  closeControlServerOwnedRuntime,
  type ControlServerOwnedLifecycleState
} from './controlServerOwnedRuntimeLifecycle.js';
