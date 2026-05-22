import http from 'node:http';

import {
  buildDegradedMachineStatusDataset,
  readMachineStatusDataset,
  type ControlMachineStatusDataset,
  type ControlMachineStatusPresenterContext
} from './controlMachineStatusPresenter.js';
import { buildCompatibilityErrorResponse } from './observabilitySurface.js';

export const MACHINE_STATUS_PATH = '/ui/machine-status.json';
const JSON_NO_STORE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const DEFAULT_MACHINE_STATUS_READ_TIMEOUT_MS = 1_000;

export interface MachineStatusControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  presenterContext: ControlMachineStatusPresenterContext;
}

export async function handleMachineStatusRequest(
  context: MachineStatusControllerContext
): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== MACHINE_STATUS_PATH) {
    return false;
  }

  if (method !== 'GET') {
    writeMachineStatusResponse(
      context.res,
      buildCompatibilityErrorResponse({
        status: 405,
        code: 'method_not_allowed',
        message: 'Method not allowed',
        details: {
          surface: 'ui',
          route: MACHINE_STATUS_PATH,
          allowed_method: 'GET'
        }
      })
    );
    return true;
  }

  writeMachineStatusResponse(context.res, {
    status: 200,
    headers: JSON_NO_STORE_HEADERS,
    body: await readMachineStatusDatasetWithControllerDegradation(context.presenterContext)
  });
  return true;
}

async function readMachineStatusDatasetWithControllerDegradation(
  presenterContext: ControlMachineStatusPresenterContext
): Promise<ControlMachineStatusDataset> {
  try {
    return await readMachineStatusDatasetWithControllerTimeout(
      presenterContext,
      DEFAULT_MACHINE_STATUS_READ_TIMEOUT_MS
    );
  } catch (error) {
    const isTimeout = error instanceof MachineStatusReadTimeoutError;
    return buildDegradedMachineStatusDataset({
      reason: isTimeout ? 'read_timeout' : 'read_failed',
      message: formatMachineStatusReadError(error),
      timeoutMs: isTimeout ? error.timeoutMs : null
    });
  }
}

async function readMachineStatusDatasetWithControllerTimeout(
  presenterContext: ControlMachineStatusPresenterContext,
  timeoutMs: number
): Promise<ControlMachineStatusDataset> {
  const abortController = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutError = new MachineStatusReadTimeoutError(timeoutMs);
    return await Promise.race([
      readMachineStatusDataset(presenterContext, { signal: abortController.signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => {
            abortController.abort(timeoutError);
            reject(timeoutError);
          },
          timeoutMs
        );
      })
    ]);
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

function formatMachineStatusReadError(error: unknown): string {
  if (error instanceof MachineStatusReadTimeoutError) {
    return `control-host machine-status read timed out after ${error.timeoutMs}ms`;
  }
  const maybeMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? (error as { message?: unknown }).message
      : undefined;
  const message =
    typeof maybeMessage === 'string'
      ? maybeMessage
      : maybeMessage === null || maybeMessage === undefined
        ? String(error)
        : String(maybeMessage);
  return message.trim().length > 0 ? message : 'control-host machine-status read failed';
}

function writeMachineStatusResponse(
  res: http.ServerResponse,
  response: { status: number; headers: Record<string, string>; body: unknown }
): void {
  res.writeHead(response.status, response.headers);
  res.end(JSON.stringify(response.body));
}

class MachineStatusReadTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`control-host machine-status read timed out after ${timeoutMs}ms`);
    this.name = 'MachineStatusReadTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export const __test__ = {
  DEFAULT_MACHINE_STATUS_READ_TIMEOUT_MS,
  readMachineStatusDatasetWithControllerTimeout
};
