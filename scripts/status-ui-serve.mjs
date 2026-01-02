#!/usr/bin/env node
/**
 * Serve the Orchestrator Status UI with a single command.
 */

import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, hasFlag } from './lib/cli-args.js';
import { createStaticFileHandler, normalizePathname } from './lib/mirror-server.mjs';
import { toPosixPath } from './lib/docs-helpers.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

const execFileAsync = promisify(execFile);

const { repoRoot, outRoot } = resolveEnvironmentPaths();
const buildScript = path.join(repoRoot, 'scripts', 'status-ui-build.mjs');
const uiEntry = `/${toPosixPath(
  path.relative(repoRoot, path.join(repoRoot, 'packages', 'orchestrator-status-ui', 'index.html'))
)}`;
const dataEntry = `/${toPosixPath(
  path.relative(outRoot, path.join(outRoot, '0911-orchestrator-status-ui', 'data.json'))
)}`;

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
    port: Number(typeof args.port === 'string' ? args.port : 4178),
    host: typeof args.host === 'string' ? args.host : 'localhost',
    refreshMs: hasFlag(args, 'no-refresh')
      ? 0
      : Number(typeof args.refresh === 'string' ? args.refresh : 4000)
  };

  if (!Number.isFinite(options.port) || options.port <= 0) {
    options.port = 4178;
  }
  if (!Number.isFinite(options.refreshMs) || options.refreshMs < 0) {
    options.refreshMs = 4000;
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

  const { handler: uiHandler } = createStaticFileHandler({
    rootDir: repoRoot,
    cspHeader: null,
    enableRange: false,
    cacheControl: () => 'no-store',
    resolvePathname: async (req) => {
      return normalizePathname(req.url ?? '/');
    }
  });

  const { handler: dataHandler } = createStaticFileHandler({
    rootDir: outRoot,
    cspHeader: null,
    enableRange: false,
    cacheControl: () => 'no-store',
    resolvePathname: async (req) => {
      const pathname = normalizePathname(req.url ?? '/');
      if (pathname === '/data.json') {
        return dataEntry;
      }
      return null;
    }
  });

  const server = http.createServer(async (req, res) => {
    const rawUrl = req.url ?? '/';
    const pathname = normalizePathname(rawUrl);
    if (!pathname) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    if (pathname === '/' || pathname === '') {
      let search = '';
      try {
        const parsed = new URL(rawUrl, `http://${options.host}`);
        const params = new URLSearchParams(parsed.search);
        if (!params.has('data')) {
          params.set('data', '/data.json');
        }
        const serialized = params.toString();
        if (serialized) {
          search = `?${serialized}`;
        }
      } catch {
        // Fall back to default data override.
        search = '?data=/data.json';
      }
      res.writeHead(302, { Location: `${uiEntry}${search}` });
      res.end();
      return;
    }

    if (pathname === '/data.json') {
      await ensureFresh();
      await dataHandler(req, res);
      return;
    }

    await uiHandler(req, res);
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
