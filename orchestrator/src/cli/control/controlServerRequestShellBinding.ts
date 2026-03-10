import http from 'node:http';

import type { ControlRequestSharedContext } from './controlRequestContext.js';
import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import { handleControlRequest } from './controlRequestController.js';
import { createControlServerRequestShell } from './controlServerRequestShell.js';

export interface ControlServerRequestShellBindingOptions {
  readRequestContextShared(): ControlRequestSharedContext | null;
  readExpiryLifecycle(): ControlExpiryLifecycle | null;
}

export function createBoundControlServerRequestShell(
  options: ControlServerRequestShellBindingOptions
): http.Server {
  return createControlServerRequestShell({
    readRuntime: () => {
      const requestContextShared = options.readRequestContextShared();
      if (!requestContextShared) {
        return null;
      }
      return {
        requestContextShared,
        expiryLifecycle: options.readExpiryLifecycle()
      };
    },
    handleRequest: handleControlRequest
  });
}
