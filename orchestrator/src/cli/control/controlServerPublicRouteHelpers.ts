import type http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../../logger.js';
import { isoTimestamp } from '../utils/time.js';
import type { ControlMachineStatusDataset } from './controlMachineStatusPresenter.js';

const UI_ASSET_PATHS: Record<string, string> = {
  '/ui': 'index.html',
  '/ui/': 'index.html',
  '/ui/app.js': 'app.js',
  '/ui/styles.css': 'styles.css',
  '/ui/favicon.svg': 'favicon.svg'
};
const UI_ROOT = resolveUiRoot();

export interface PublicControlRouteContext {
  pathname: string;
  search: string;
  req?: Pick<http.IncomingMessage, 'headers'>;
  res: Pick<http.ServerResponse, 'writeHead' | 'end'>;
  controlToken?: string;
  readCommittedMachineStatusDataset?: () => ControlMachineStatusDataset;
}

export async function handlePublicControlRoute(context: PublicControlRouteContext): Promise<boolean> {
  if (context.pathname === '/health') {
    context.res.writeHead(200, { 'Content-Type': 'application/json' });
    context.res.end(
      JSON.stringify({
        status: 'ok',
        mode: 'control_host_liveness',
        timestamp: isoTimestamp()
      })
    );
    return true;
  }

  if (context.pathname === '/healthz') {
    if (!isHealthzTokenValid(context)) {
      context.res.writeHead(401, { 'Content-Type': 'application/json' });
      context.res.end(JSON.stringify({ error: 'unauthorized' }));
      return true;
    }
    context.res.writeHead(200, { 'Content-Type': 'application/json' });
    context.res.end(
      JSON.stringify({
        status: 'ok',
        mode: 'control_host_liveness',
        timestamp: isoTimestamp()
      })
    );
    return true;
  }

  if (context.pathname === '/readyz') {
    const readiness = buildReadinessPayload(readCommittedMachineStatusDatasetForReadiness(context));
    context.res.writeHead(200, { 'Content-Type': 'application/json' });
    context.res.end(
      JSON.stringify({
        status: readiness.status,
        mode: 'control_host_readiness',
        timestamp: isoTimestamp(),
        diagnostics: readiness.diagnostics
      })
    );
    return true;
  }

  if (context.pathname === '/' || context.pathname === '') {
    context.res.writeHead(302, { Location: `/ui${context.search}` });
    context.res.end();
    return true;
  }

  const uiAsset = resolveUiAssetPath(context.pathname);
  if (!uiAsset) {
    return false;
  }

  await serveUiAsset(uiAsset, context.res);
  return true;
}

function isHealthzTokenValid(context: PublicControlRouteContext): boolean {
  const controlToken = typeof context.controlToken === 'string' ? context.controlToken : '';
  if (controlToken.length === 0) {
    return false;
  }
  const authorization = context.req?.headers.authorization;
  const header = typeof authorization === 'string' ? authorization : null;
  if (!header?.startsWith('Bearer ')) {
    return false;
  }
  const token = header.slice('Bearer '.length);
  const tokenBuffer = Buffer.from(token, 'utf8');
  const controlTokenBuffer = Buffer.from(controlToken, 'utf8');
  if (tokenBuffer.length !== controlTokenBuffer.length) {
    return false;
  }
  return timingSafeEqual(tokenBuffer, controlTokenBuffer);
}

function readCommittedMachineStatusDatasetForReadiness(
  context: PublicControlRouteContext
): ControlMachineStatusDataset | undefined {
  try {
    return context.readCommittedMachineStatusDataset?.();
  } catch (error) {
    logger.warn(
      `Failed to read committed machine-status dataset for /readyz: ${
        (error as Error)?.message ?? String(error)
      }`
    );
    return undefined;
  }
}

function buildReadinessPayload(dataset: ControlMachineStatusDataset | undefined): {
  status: 'ok' | 'degraded';
  diagnostics: {
    machine_status_snapshot: 'available' | 'unavailable';
    polling_status?: 'ok' | 'degraded' | 'unavailable';
    polling_stuck?: boolean;
    restart_required?: boolean;
    last_error?: string | null;
    reason?: string | null;
  };
} {
  if (!dataset) {
    return {
      status: 'degraded',
      diagnostics: {
        machine_status_snapshot: 'unavailable',
        polling_status: 'unavailable'
      }
    };
  }
  const polling = dataset.polling;
  if (!polling) {
    return {
      status: 'degraded',
      diagnostics: {
        machine_status_snapshot: 'available',
        polling_status: 'unavailable'
      }
    };
  }
  const hasPollingError =
    (typeof polling.last_error === 'string' && polling.last_error.trim().length > 0) ||
    (typeof polling.reason === 'string' && polling.reason.trim().length > 0);
  const degraded = polling.stuck === true || polling.restart_required === true || hasPollingError;
  return {
    status: degraded ? 'degraded' : 'ok',
    diagnostics: {
      machine_status_snapshot: 'available',
      polling_status: degraded ? 'degraded' : 'ok',
      polling_stuck: polling.stuck === true,
      restart_required: polling.restart_required === true,
      last_error: polling.last_error ?? null,
      reason: polling.reason ?? null
    }
  };
}

function resolveUiRoot(): string | null {
  const candidates = [
    resolve(process.cwd(), 'packages', 'orchestrator-status-ui'),
    resolve(process.cwd(), '..', 'packages', 'orchestrator-status-ui'),
    resolve(process.cwd(), '..', '..', 'packages', 'orchestrator-status-ui'),
    resolve(fileURLToPath(new URL('../../../../packages/orchestrator-status-ui', import.meta.url)))
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return null;
}

function resolveUiAssetPath(pathname: string): string | null {
  if (!UI_ROOT) {
    return null;
  }
  const asset = UI_ASSET_PATHS[pathname];
  if (!asset) {
    return null;
  }
  return resolve(UI_ROOT, asset);
}

async function serveUiAsset(
  assetPath: string,
  res: Pick<http.ServerResponse, 'writeHead' | 'end'>
): Promise<void> {
  try {
    const payload = await readFile(assetPath);
    res.writeHead(200, {
      'Content-Type': resolveUiContentType(assetPath),
      'Cache-Control': 'no-store'
    });
    res.end(payload);
  } catch (error) {
    logger.warn(`Failed to serve UI asset ${assetPath}: ${(error as Error)?.message ?? error}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function resolveUiContentType(assetPath: string): string {
  if (assetPath.endsWith('.html')) {
    return 'text/html; charset=utf-8';
  }
  if (assetPath.endsWith('.css')) {
    return 'text/css; charset=utf-8';
  }
  if (assetPath.endsWith('.js')) {
    return 'application/javascript; charset=utf-8';
  }
  if (assetPath.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  return 'application/octet-stream';
}
