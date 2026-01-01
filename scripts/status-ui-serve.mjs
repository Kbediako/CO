#!/usr/bin/env node
/**
 * Serve the Orchestrator Status UI with a single command.
 */

import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs, hasFlag } from './lib/cli-args.js';

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(process.env.CODEX_ORCHESTRATOR_ROOT ?? process.cwd());
const buildScript = path.join(repoRoot, 'scripts', 'status-ui-build.mjs');
const uiEntry = '/packages/orchestrator-status-ui/index.html';
const dataEntry = '/out/0911-orchestrator-status-ui/data.json';

const DEFAULT_PORT = 4178;
const DEFAULT_HOST = 'localhost';
const DEFAULT_REFRESH_MS = 4000;

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg']
]);

function printHelp() {
  console.log('Usage: npm run status-ui -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --port <port>        Port to listen on (default: 4178)');
  console.log('  --host <host>        Host to bind (default: localhost)');
  console.log('  --refresh <ms>       Rebuild data.json if older than this (default: 4000)');
  console.log('  --no-refresh         Disable rebuild on data requests');
  console.log('  -h, --help           Show help');
}

async function runBuild() {
  await execFileAsync(process.execPath, [buildScript, '--quiet'], { cwd: repoRoot });
  return Date.now();
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    printHelp();
    return;
  }
  const knownFlags = new Set(['port', 'host', 'refresh', 'no-refresh', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    throw new Error(`Unknown option: ${label}`);
  }

  const options = {
    port: Number(typeof args.port === 'string' ? args.port : DEFAULT_PORT),
    host: typeof args.host === 'string' ? args.host : DEFAULT_HOST,
    refreshMs: hasFlag(args, 'no-refresh')
      ? 0
      : Number(typeof args.refresh === 'string' ? args.refresh : DEFAULT_REFRESH_MS)
  };

  if (!Number.isFinite(options.port) || options.port <= 0) {
    options.port = DEFAULT_PORT;
  }
  if (!Number.isFinite(options.refreshMs) || options.refreshMs < 0) {
    options.refreshMs = DEFAULT_REFRESH_MS;
  }

  let lastBuildAt = 0;
  let buildInFlight = null;

  async function ensureFresh() {
    if (options.refreshMs === 0) {
      return;
    }
    const now = Date.now();
    if (lastBuildAt && now - lastBuildAt < options.refreshMs) {
      return;
    }
    if (!buildInFlight) {
      buildInFlight = runBuild()
        .then((timestamp) => {
          lastBuildAt = timestamp;
        })
        .catch((error) => {
          console.error(error.message ?? error);
        })
        .finally(() => {
          buildInFlight = null;
        });
    }
    await buildInFlight;
  }

  try {
    lastBuildAt = await runBuild();
  } catch (error) {
    console.error(error.message ?? error);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? options.host}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/' || pathname === '') {
        res.writeHead(302, { Location: uiEntry });
        res.end();
        return;
      }
      if (pathname === '/data.json') {
        pathname = dataEntry;
      }

      const safePath = pathname.replace(/^\/+/, '');
      const absolutePath = path.resolve(repoRoot, safePath);
      const relativePath = path.relative(repoRoot, absolutePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      if (pathname === dataEntry) {
        await ensureFresh();
      }

      let stat;
      try {
        stat = await fs.stat(absolutePath);
      } catch {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      let filePath = absolutePath;
      if (stat.isDirectory()) {
        filePath = path.join(absolutePath, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = contentTypes.get(ext) ?? 'application/octet-stream';
      const contents = await fs.readFile(filePath);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store'
      });
      res.end(contents);
    } catch (error) {
      res.writeHead(500);
      res.end(error.message ?? 'Server error');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Status UI running at http://${options.host}:${options.port}/`);
  });
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  });
}
