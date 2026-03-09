import http from 'node:http';

import {
  buildControlRequestContext,
  type ControlRequestContext,
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';

export interface ControlServerRequestShellRuntime {
  requestContextShared: ControlRequestSharedContext;
  expiryLifecycle: ControlExpiryLifecycle | null;
}

export interface ControlServerRequestShellOptions {
  readRuntime(): ControlServerRequestShellRuntime | null;
  handleRequest(context: ControlRequestContext): Promise<void>;
}

export function createControlServerRequestShell(
  options: ControlServerRequestShellOptions
): http.Server {
  return http.createServer((req, res) => {
    const runtime = options.readRuntime();
    if (!runtime) {
      writeControlServerUnavailable(res);
      return;
    }

    options
      .handleRequest(buildLiveControlRequestContext(runtime, req, res))
      .catch((error) => writeTopLevelControlRequestError(res, error));
  });
}

function buildLiveControlRequestContext(
  runtime: ControlServerRequestShellRuntime,
  req: http.IncomingMessage,
  res: http.ServerResponse
): ControlRequestContext {
  return buildControlRequestContext({
    ...runtime.requestContextShared,
    req,
    res,
    expiryLifecycle: runtime.expiryLifecycle
  });
}

function writeControlServerUnavailable(res: http.ServerResponse): void {
  res.writeHead(503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'control_server_unavailable' }));
}

function writeTopLevelControlRequestError(
  res: http.ServerResponse,
  error: unknown
): void {
  const status = readErrorStatus(error);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
}

function readErrorStatus(error: unknown): number {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }
  return 500;
}
