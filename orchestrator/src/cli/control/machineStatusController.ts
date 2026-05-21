import http from 'node:http';

import {
  readMachineStatusDataset,
  type ControlMachineStatusPresenterContext
} from './controlMachineStatusPresenter.js';
import { buildCompatibilityErrorResponse } from './observabilitySurface.js';

export const MACHINE_STATUS_PATH = '/ui/machine-status.json';
const JSON_NO_STORE_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

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
    body: await readMachineStatusDataset(context.presenterContext)
  });
  return true;
}

function writeMachineStatusResponse(
  res: http.ServerResponse,
  response: { status: number; headers: Record<string, string>; body: unknown }
): void {
  res.writeHead(response.status, response.headers);
  res.end(JSON.stringify(response.body));
}
