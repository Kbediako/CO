import http from 'node:http';

import {
  buildDegradedUiDataset,
  readUiDataset,
  type OperatorDashboardDataset,
  type OperatorDashboardPresenterContext
} from './operatorDashboardPresenter.js';
import { buildCompatibilityErrorResponse } from './observabilitySurface.js';

const UI_DATA_PATH = '/ui/data.json';
const JSON_NO_STORE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const DEFAULT_UI_DATA_READ_TIMEOUT_MS = 1_000;

export interface UiDataControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  presenterContext: OperatorDashboardPresenterContext;
}

export async function handleUiDataRequest(context: UiDataControllerContext): Promise<boolean> {
  const method = context.req.method ?? 'GET';
  const pathname = new URL(context.req.url ?? '/', 'http://localhost').pathname;
  if (pathname !== UI_DATA_PATH) {
    return false;
  }

  if (method !== 'GET') {
    writeUiDataResponse(
      context.res,
      buildCompatibilityErrorResponse({
        status: 405,
        code: 'method_not_allowed',
        message: 'Method not allowed',
        details: {
          surface: 'ui',
          route: UI_DATA_PATH,
          allowed_method: 'GET'
        }
      })
    );
    return true;
  }

  writeUiDataResponse(context.res, {
    status: 200,
    headers: JSON_NO_STORE_HEADERS,
    body: await readUiDatasetWithControllerDegradation(context.presenterContext)
  });
  return true;
}

async function readUiDatasetWithControllerDegradation(
  presenterContext: OperatorDashboardPresenterContext
): Promise<OperatorDashboardDataset> {
  try {
    return await readUiDatasetWithControllerTimeout(
      presenterContext,
      DEFAULT_UI_DATA_READ_TIMEOUT_MS
    );
  } catch (error) {
    const isTimeout = error instanceof UiDataReadTimeoutError;
    return buildDegradedUiDataset({
      reason: isTimeout ? 'read_timeout' : 'read_failed',
      message: formatUiDataReadError(error),
      timeoutMs: isTimeout ? error.timeoutMs : null
    });
  }
}

async function readUiDatasetWithControllerTimeout(
  presenterContext: OperatorDashboardPresenterContext,
  timeoutMs: number
): Promise<OperatorDashboardDataset> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      readUiDataset(presenterContext),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new UiDataReadTimeoutError(timeoutMs)),
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

function formatUiDataReadError(error: unknown): string {
  if (error instanceof UiDataReadTimeoutError) {
    return `operator dashboard read timed out after ${error.timeoutMs}ms`;
  }
  const message = (error as Error)?.message ?? String(error);
  return message.trim().length > 0 ? message : 'operator dashboard read failed';
}

function writeUiDataResponse(
  res: http.ServerResponse,
  response: { status: number; headers: Record<string, string>; body: unknown }
): void {
  res.writeHead(response.status, response.headers);
  res.end(JSON.stringify(response.body));
}

class UiDataReadTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`operator dashboard read timed out after ${timeoutMs}ms`);
    this.name = 'UiDataReadTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export const __test__ = {
  DEFAULT_UI_DATA_READ_TIMEOUT_MS,
  readUiDatasetWithControllerTimeout
};
