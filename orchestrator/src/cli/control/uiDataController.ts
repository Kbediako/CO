import http from 'node:http';

import { buildCompatibilityErrorResponse } from './observabilitySurface.js';
import { readUiDataset, type SelectedRunPresenterContext } from './selectedRunPresenter.js';

const UI_DATA_PATH = '/ui/data.json';
const JSON_NO_STORE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

export interface UiDataControllerContext {
  req: Pick<http.IncomingMessage, 'method' | 'url'>;
  res: http.ServerResponse;
  presenterContext: SelectedRunPresenterContext;
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
    body: await readUiDataset(context.presenterContext)
  });
  return true;
}

function writeUiDataResponse(
  res: http.ServerResponse,
  response: { status: number; headers: Record<string, string>; body: unknown }
): void {
  res.writeHead(response.status, response.headers);
  res.end(JSON.stringify(response.body));
}
