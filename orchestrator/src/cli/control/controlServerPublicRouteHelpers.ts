import type http from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from '../../logger.js';
import { isoTimestamp } from '../utils/time.js';

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
  res: Pick<http.ServerResponse, 'writeHead' | 'end'>;
}

export async function handlePublicControlRoute(context: PublicControlRouteContext): Promise<boolean> {
  if (context.pathname === '/health') {
    context.res.writeHead(200, { 'Content-Type': 'application/json' });
    context.res.end(JSON.stringify({ status: 'ok', timestamp: isoTimestamp() }));
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
