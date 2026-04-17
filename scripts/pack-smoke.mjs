#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, chmod, cp, mkdtemp, mkdir, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { runPack } from './lib/npm-pack.js';

const REVIEW_ENV_BLOCKLIST = new Set([
  'FORCE_CODEX_REVIEW',
  'CODEX_CLI_BIN',
  'CODEX_CONFIG_OVERRIDES',
  'CODEX_MCP_CONFIG_OVERRIDES',
  'NOTES',
  'SKIP_DIFF_BUDGET',
  'TASK',
  'MCP_RUNNER_TASK_ID',
  'CODEX_ORCHESTRATOR_ROOT',
  'CODEX_ORCHESTRATOR_RUN_DIR',
  'CODEX_ORCHESTRATOR_RUNS_DIR',
  'CODEX_ORCHESTRATOR_OUT_DIR'
]);
const MARKETPLACE_NAME = 'codex-orchestrator';
const PLUGIN_NAME = 'codex-orchestrator';

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.once('error', (error) => reject(error));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function runCommandCapture(command, args, options = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', (error) => reject(error));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `${command} exited with code ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`
          )
        );
      }
    });
  });
}

async function assertPathExists(filePath, label) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

async function assertPathMissing(filePath, label) {
  try {
    await access(filePath);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return;
    }
    throw error;
  }
  throw new Error(`${label} should be absent: ${filePath}`);
}

async function assertFileIncludes(filePath, text, label) {
  const raw = await readFile(filePath, 'utf8');
  if (!raw.includes(text)) {
    throw new Error(`${label} missing expected text "${text}" (${filePath})`);
  }
}

async function readJsonFile(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${filePath} (${error?.message ?? String(error)})`);
  }
}

async function listMarkdownFiles(rootPath) {
  const files = [];
  async function walk(currentPath) {
    let entries = [];
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const nextPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(nextPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(nextPath);
      }
    }
  }
  await walk(rootPath);
  return files.sort();
}

function extractMarkdownLinkTargets(markdown) {
  const targets = [];
  const pattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(pattern)) {
    const rawTarget = match[1]?.trim();
    if (!rawTarget) {
      continue;
    }
    const normalized = rawTarget.startsWith('<') && rawTarget.endsWith('>')
      ? rawTarget.slice(1, -1).trim()
      : rawTarget;
    if (!normalized || normalized.startsWith('#')) {
      continue;
    }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(normalized) || normalized.startsWith('//')) {
      continue;
    }
    targets.push(normalized);
  }
  return targets;
}

async function assertMarkdownLinksResolve(packageRoot) {
  const candidateRoots = [
    path.join(packageRoot, 'README.md'),
    path.join(packageRoot, 'docs'),
    path.join(packageRoot, 'skills'),
    path.join(packageRoot, 'templates')
  ];
  const markdownFiles = [];
  for (const candidate of candidateRoots) {
    try {
      const statPath = await access(candidate).then(() => candidate).catch(() => null);
      if (!statPath) {
        continue;
      }
      if (candidate.endsWith('.md')) {
        markdownFiles.push(candidate);
      } else {
        markdownFiles.push(...(await listMarkdownFiles(candidate)));
      }
    } catch {
      // ignore missing optional roots
    }
  }

  for (const markdownPath of markdownFiles) {
    const raw = await readFile(markdownPath, 'utf8');
    for (const target of extractMarkdownLinkTargets(raw)) {
      const [relativeTarget] = target.split('#');
      const cleanTarget = relativeTarget?.split('?')[0] ?? relativeTarget;
      if (!cleanTarget) {
        continue;
      }
      const resolved = path.resolve(path.dirname(markdownPath), cleanTarget);
      try {
        await access(resolved);
      } catch {
        const relativeSource = path.relative(packageRoot, markdownPath) || path.basename(markdownPath);
        throw new Error(`broken packaged markdown link in ${relativeSource}: ${target}`);
      }
    }
  }
}

async function writeMockCodexBin(tempDir) {
  if (process.platform === 'win32') {
    const mockPath = path.join(tempDir, 'codex-mock.cmd');
    const script = [
      '@echo off',
      'if "%1"=="--help" (',
      '  echo codex help',
      '  echo   review',
      '  exit /b 0',
      ')',
      'set cmd=%1',
      'if "%1"=="-c" set cmd=%3',
      'if "%cmd%"=="review" (',
      '  echo thinking',
      '  echo codex review mock ok',
      '  exit /b 0',
      ')',
      'echo codex mock unsupported args: %*',
      'exit /b 2',
      ''
    ].join('\r\n');
    await writeFile(mockPath, script, 'utf8');
    return mockPath;
  }

  const mockPath = path.join(tempDir, 'codex-mock.sh');
  const script = `#!/usr/bin/env sh
set -eu
if [ "\${1:-}" = "--help" ]; then
  printf '%s\n' "codex help" "  review"
  exit 0
fi
cmd="\${1:-}"
if [ "$cmd" = "-c" ]; then
  shift 2
  cmd="\${1:-}"
fi
if [ "$cmd" = "review" ]; then
  printf '%s\n' "thinking" "codex review mock ok"
  exit 0
fi
printf '%s\n' "codex mock unsupported args: $*" >&2
exit 2
`;
  await writeFile(mockPath, script, 'utf8');
  await chmod(mockPath, 0o755);
  return mockPath;
}

function readMcpResponse(stream, timeoutMs = 5000) {
  if (!stream) {
    return Promise.reject(new Error('MCP smoke requires stdout stream'));
  }
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    let settled = false;
    const timer = timeoutMs > 0 ? setTimeout(() => finalize(new Error('MCP response timed out')), timeoutMs) : null;

    const finalize = (error, payload) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      stream.off('data', onData);
      stream.off('error', onError);
      stream.off('end', onEnd);
      if (error) {
        reject(error);
      } else {
        resolve(payload);
      }
    };

    const onError = (error) => finalize(error instanceof Error ? error : new Error(String(error)));
    const onEnd = () => finalize(new Error('MCP response stream ended before payload'));
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);

      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const header = buffer.slice(0, headerEnd).toString('utf8');
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          finalize(new Error('Missing Content-Length header in framed response'));
          return;
        }
        const length = Number(match[1]);
        const bodyStart = headerEnd + 4;
        if (buffer.length < bodyStart + length) {
          return;
        }
        const body = buffer.slice(bodyStart, bodyStart + length).toString('utf8');
        try {
          const payload = JSON.parse(body);
          finalize(null, { kind: 'framed', payload });
        } catch (error) {
          finalize(error instanceof Error ? error : new Error('Failed to parse framed response'));
        }
        return;
      }

      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }
      const lineBuffer = buffer.slice(0, newlineIndex);
      const line = lineBuffer.toString('utf8').trim();
      if (!line) {
        buffer = buffer.slice(newlineIndex + 1);
        return;
      }
      if (/^content-length:/i.test(line)) {
        // Wait for the remainder of the framed header/body.
        return;
      }
      buffer = buffer.slice(newlineIndex + 1);
      try {
        const payload = JSON.parse(line);
        finalize(null, { kind: 'jsonl', payload });
      } catch (error) {
        finalize(error instanceof Error ? error : new Error('Failed to parse JSONL response'));
      }
    };

    stream.on('data', onData);
    stream.on('error', onError);
    stream.on('end', onEnd);
  });
}

async function runDelegateServerJsonlSmoke(binPath, repoRoot) {
  const child = spawn(binPath, ['delegate-server', '--repo', repoRoot, '--mode', 'question_only'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });
  try {
    const responsePromise = readMcpResponse(child.stdout);
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });
    child.stdin.write(`${payload}\n`);
    child.stdin.end();
    const response = await responsePromise;
    if (!response || response.kind !== 'jsonl') {
      throw new Error('Expected JSONL response for JSONL request');
    }
    if (!response.payload || response.payload.jsonrpc !== '2.0' || response.payload.id !== 1) {
      throw new Error('Expected JSON-RPC response with matching id');
    }
    if (!response.payload.error && !response.payload.result) {
      throw new Error('Expected JSON-RPC result or error payload');
    }
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) {
      await new Promise((resolve) => child.once('exit', resolve));
    }
  }
}

async function commandSucceeds(command, args, options = {}) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      ...options
    });
    child.once('error', () => resolve(false));
    child.once('exit', (code) => resolve(code === 0));
  });
}

async function codexSupportsMarketplace(command, options = {}) {
  return await commandSucceeds(command, ['marketplace', 'add', '--help'], options);
}

async function assertPluginLauncherShape(pluginRoot, label) {
  const manifestPath = path.join(pluginRoot, '.mcp.json');
  const mcpManifest = await readJsonFile(manifestPath, `${label} mcp manifest`);
  const launcher = mcpManifest?.mcpServers?.['codex-orchestrator'];
  if (!launcher || typeof launcher !== 'object') {
    throw new Error(`${label} mcp manifest must define mcpServers.codex-orchestrator`);
  }
  if (launcher.command !== 'node') {
    throw new Error(`${label} mcp manifest must launch through node`);
  }
  if (
    !Array.isArray(launcher.args) ||
    launcher.args.length !== 3 ||
    launcher.args[0] !== './launcher.mjs' ||
    launcher.args[1] !== 'mcp' ||
    launcher.args[2] !== 'serve'
  ) {
    throw new Error(`${label} mcp manifest must use the packaged launcher with explicit mcp serve args`);
  }
  if (Object.prototype.hasOwnProperty.call(launcher, 'cwd')) {
    throw new Error(`${label} mcp manifest must inherit the Codex workspace cwd`);
  }
  return launcher;
}

function resolveLauncherInvocationArgs(pluginRoot, launcherArgs) {
  if (!Array.isArray(launcherArgs) || launcherArgs.length === 0) {
    return [];
  }
  const [entrypoint, ...rest] = launcherArgs;
  if (typeof entrypoint === 'string' && entrypoint.startsWith('./')) {
    return [path.join(pluginRoot, entrypoint), ...rest];
  }
  return launcherArgs;
}

async function runCachedPluginLauncherSmoke(pluginRoot, env, label, workspaceRoot) {
  const launcher = await assertPluginLauncherShape(pluginRoot, label);
  const launchCwd = path.resolve(workspaceRoot);
  await assertPathExists(launchCwd, `${label} workspace cwd`);
  const invocationArgs = [...resolveLauncherInvocationArgs(pluginRoot, launcher.args), '--dry-run'];
  const { stdout, stderr } = await runCommandCapture(launcher.command, invocationArgs, {
    cwd: launchCwd,
    env
  });
  const output = `${stdout}${stderr}`;
  const normalizedLaunchCwd = await realpath(launchCwd);
  const expectedRepoRoot = `[mcp] repo root: ${normalizedLaunchCwd}`;
  if (!output.includes(expectedRepoRoot)) {
    throw new Error(`${label} launcher dry-run must report ${normalizedLaunchCwd} as the repo root`);
  }
  const cachedPluginRoot = await realpath(path.resolve(pluginRoot));
  const cachedRepoRoot = `[mcp] repo root: ${cachedPluginRoot}`;
  if (output.includes(cachedRepoRoot)) {
    throw new Error(`${label} launcher dry-run must not report the cached plugin root as the repo root`);
  }
}

async function createServedGitMarketplace(sourceRoot, bareRepoPath) {
  const gitSourceRoot = `${bareRepoPath}.src`;
  await cp(sourceRoot, gitSourceRoot, { recursive: true });
  await runCommand('git', ['init'], { cwd: gitSourceRoot, stdio: 'ignore' });
  await runCommand('git', ['config', 'user.email', 'pack-smoke@example.com'], {
    cwd: gitSourceRoot,
    stdio: 'ignore'
  });
  await runCommand('git', ['config', 'user.name', 'Pack Smoke'], {
    cwd: gitSourceRoot,
    stdio: 'ignore'
  });
  await runCommand('git', ['add', '.'], { cwd: gitSourceRoot, stdio: 'ignore' });
  await runCommand('git', ['commit', '-m', 'pack smoke marketplace source'], {
    cwd: gitSourceRoot,
    stdio: 'ignore'
  });
  await runCommand('git', ['clone', '--bare', gitSourceRoot, bareRepoPath], {
    cwd: path.dirname(bareRepoPath),
    stdio: 'ignore'
  });
  await runCommand('git', ['update-server-info'], {
    cwd: bareRepoPath,
    stdio: 'ignore'
  });
}

async function withStaticHttpRoot(rootPath, run) {
  const absoluteRoot = path.resolve(rootPath);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const relativePath = pathname.replace(/^\/+/u, '');
      const resolvedPath = path.resolve(absoluteRoot, relativePath || '.');
      if (resolvedPath !== absoluteRoot && !resolvedPath.startsWith(`${absoluteRoot}${path.sep}`)) {
        response.statusCode = 403;
        response.end('Forbidden');
        return;
      }
      const body = await readFile(resolvedPath);
      response.statusCode = 200;
      response.setHeader('Content-Length', body.byteLength);
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      response.end(body);
    } catch (error) {
      const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : null;
      response.statusCode = errorCode === 'ENOENT' || errorCode === 'EISDIR' ? 404 : 500;
      response.end(response.statusCode === 404 ? 'Not Found' : 'Internal Server Error');
    }
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Static git marketplace server did not expose a TCP address.');
  }
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    const closePromise = once(server, 'close');
    server.close();
    await closePromise;
  }
}

function startAppServerJsonlClient(command, env) {
  const child = spawn(command, ['app-server'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env
  });
  child.stdout.setEncoding('utf8');

  let nextId = 1;
  let buffer = '';
  const pending = new Map();

  const rejectPending = (error) => {
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
  };

  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    while (true) {
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        break;
      }
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) {
        continue;
      }

      let payload;
      try {
        payload = JSON.parse(line);
      } catch (error) {
        rejectPending(error instanceof Error ? error : new Error('Failed to parse app-server JSONL payload'));
        return;
      }

      if (!Object.prototype.hasOwnProperty.call(payload, 'id')) {
        continue;
      }

      const entry = pending.get(payload.id);
      if (!entry) {
        continue;
      }
      pending.delete(payload.id);
      if (payload.error) {
        entry.reject(new Error(`app-server ${payload.method ?? 'request'} failed: ${JSON.stringify(payload.error)}`));
      } else {
        entry.resolve(payload.result);
      }
    }
  });

  child.once('error', (error) => rejectPending(error instanceof Error ? error : new Error(String(error))));
  child.once('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    rejectPending(new Error(`app-server exited with ${reason}`));
  });

  return {
    async request(method, params) {
      const id = nextId++;
      child.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
      return await new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    notify(method, params) {
      child.stdin.write(`${JSON.stringify(params === undefined ? { method } : { method, params })}\n`);
    },
    async close() {
      child.kill('SIGTERM');
      if (child.exitCode === null && child.signalCode === null) {
        await new Promise((resolve) => child.once('exit', resolve));
      }
    }
  };
}

async function installMarketplacePlugin(codexBin, env, pluginVersion, label) {
  const appServer = startAppServerJsonlClient(codexBin, env);
  try {
    await appServer.request('initialize', {
      clientInfo: {
        name: 'co_pack_smoke',
        title: 'CO Pack Smoke',
        version: '0.0.1'
      }
    });
    appServer.notify('initialized');

    const beforeInstall = await appServer.request('plugin/list', { forceRemoteSync: false });
    const marketplace = beforeInstall.marketplaces.find((entry) => entry.name === MARKETPLACE_NAME);
    if (!marketplace) {
      throw new Error(`${label} plugin/list did not expose the ${MARKETPLACE_NAME} marketplace`);
    }
    const pluginBefore = marketplace.plugins.find((entry) => entry.name === PLUGIN_NAME);
    if (!pluginBefore) {
      throw new Error(`${label} plugin/list did not expose the ${PLUGIN_NAME} plugin`);
    }
    if (pluginBefore.installed || pluginBefore.enabled) {
      throw new Error(`${label} plugin/list unexpectedly reported ${PLUGIN_NAME} as pre-installed`);
    }

    const installResult = await appServer.request('plugin/install', {
      marketplacePath: marketplace.path,
      pluginName: PLUGIN_NAME
    });
    if (!installResult || installResult.authPolicy !== 'ON_INSTALL') {
      throw new Error(`${label} plugin/install did not return the expected auth policy`);
    }

    const afterInstall = await appServer.request('plugin/list', { forceRemoteSync: false });
    const installedMarketplace = afterInstall.marketplaces.find((entry) => entry.name === MARKETPLACE_NAME);
    const pluginAfter = installedMarketplace?.plugins.find((entry) => entry.name === PLUGIN_NAME);
    if (!pluginAfter || !pluginAfter.installed || !pluginAfter.enabled) {
      throw new Error(`${label} plugin/install did not leave ${PLUGIN_NAME} installed and enabled`);
    }

    const codexHome = env.CODEX_HOME;
    if (typeof codexHome !== 'string' || codexHome.length === 0) {
      throw new Error(`${label} marketplace env must define CODEX_HOME`);
    }
    const configPath = path.join(codexHome, 'config.toml');
    await assertFileIncludes(configPath, `[marketplaces.${MARKETPLACE_NAME}]`, `${label} marketplace config`);
    await assertFileIncludes(
      configPath,
      `[plugins."${PLUGIN_NAME}@${MARKETPLACE_NAME}"]`,
      `${label} plugin enablement config`
    );

    const cachedPluginRoot = path.join(codexHome, 'plugins', 'cache', MARKETPLACE_NAME, PLUGIN_NAME, pluginVersion);
    await assertPathExists(path.join(cachedPluginRoot, '.codex-plugin', 'plugin.json'), `${label} cached plugin manifest`);
    await assertPathExists(path.join(cachedPluginRoot, '.mcp.json'), `${label} cached plugin mcp manifest`);
    await assertPathExists(path.join(cachedPluginRoot, 'launcher.mjs'), `${label} cached plugin launcher`);
    const mcpStatuses = await appServer.request('mcpServerStatus/list', { detail: 'full', limit: 100 });
    const registeredServer = Array.isArray(mcpStatuses?.data)
      ? mcpStatuses.data.find((entry) => entry?.name === PLUGIN_NAME)
      : null;
    if (!registeredServer) {
      throw new Error(`${label} mcpServerStatus/list did not expose ${PLUGIN_NAME}`);
    }
    return { cachedPluginRoot, configPath };
  } finally {
    await appServer.close();
  }
}

async function runMarketplaceInstallScenario({ label, codexBin, tempDir, pluginVersion, addArgs, expectedConfigLines }) {
  const homeRoot = path.join(tempDir, `.codex-plugin-smoke-home-${label}`);
  const codexHome = path.join(homeRoot, '.codex');
  await mkdir(codexHome, { recursive: true });

  const marketplaceEnv = {
    ...process.env,
    HOME: homeRoot,
    CODEX_HOME: codexHome
  };

  await runCommand(codexBin, ['marketplace', 'add', ...addArgs], {
    cwd: tempDir,
    env: marketplaceEnv
  });
  const configPath = path.join(codexHome, 'config.toml');
  for (const expectedLine of expectedConfigLines) {
    await assertFileIncludes(configPath, expectedLine, `${label} marketplace config`);
  }
  const { cachedPluginRoot } = await installMarketplacePlugin(codexBin, marketplaceEnv, pluginVersion, label);
  const workspaceRoot = path.join(tempDir, `.codex-plugin-smoke-workspace-${label}`);
  await mkdir(workspaceRoot, { recursive: true });
  await runCachedPluginLauncherSmoke(cachedPluginRoot, marketplaceEnv, `${label} cached plugin`, workspaceRoot);
}

async function runMarketplacePluginSmoke(packageRoot, tempDir) {
  const codexBin = process.env.PACK_SMOKE_CODEX_BIN ?? 'codex';
  const allowMarketplaceSkip = process.env.PACK_SMOKE_ALLOW_MARKETPLACE_SKIP === '1';
  const codexAvailable = await commandSucceeds(codexBin, ['--version']);
  if (!codexAvailable) {
    if (allowMarketplaceSkip) {
      console.warn(`Skipping marketplace smoke: ${codexBin} is unavailable in this environment.`);
      return;
    }
    throw new Error(
      `Marketplace smoke requires ${codexBin} in PATH. Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 only for local-dev opt-out.`
    );
  }
  const marketplaceCapable = await codexSupportsMarketplace(codexBin);
  if (!marketplaceCapable) {
    if (allowMarketplaceSkip) {
      console.warn(`Skipping marketplace smoke: ${codexBin} does not expose codex marketplace add.`);
      return;
    }
    throw new Error(
      'Marketplace smoke requires a Codex CLI with `marketplace add` support. Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 only for local-dev opt-out.'
    );
  }

  const marketplaceRoot = path.join(tempDir, 'codex-marketplace-root');
  await cp(packageRoot, marketplaceRoot, { recursive: true });

  const packageManifestPath = path.join(marketplaceRoot, 'package.json');
  const marketplaceManifestPath = path.join(marketplaceRoot, '.agents', 'plugins', 'marketplace.json');
  const pluginRoot = path.join(marketplaceRoot, 'plugins', PLUGIN_NAME);
  const pluginManifestPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');
  const packageManifest = await readJsonFile(packageManifestPath, 'packaged package manifest');
  const marketplaceManifest = await readJsonFile(marketplaceManifestPath, 'packaged marketplace manifest');
  const marketplaceEntry = Array.isArray(marketplaceManifest.plugins)
    ? marketplaceManifest.plugins.find((entry) => entry?.name === PLUGIN_NAME)
    : null;
  if (!marketplaceEntry || marketplaceEntry.source?.path !== `./plugins/${PLUGIN_NAME}`) {
    throw new Error(
      `packaged marketplace manifest must expose ${PLUGIN_NAME} from ./plugins/${PLUGIN_NAME}`
    );
  }
  const pluginManifest = await readJsonFile(pluginManifestPath, 'packaged plugin manifest');
  if (pluginManifest.version !== packageManifest.version) {
    throw new Error(
      `plugin manifest version ${pluginManifest.version} must match packaged version ${packageManifest.version}`
    );
  }
  await assertPluginLauncherShape(pluginRoot, 'packaged plugin');

  await runMarketplaceInstallScenario({
    label: 'local-marketplace',
    codexBin,
    tempDir,
    pluginVersion: pluginManifest.version,
    addArgs: [marketplaceRoot],
    expectedConfigLines: [
      `[marketplaces.${MARKETPLACE_NAME}]`,
      'source_type = "local"'
    ]
  });

  const servedGitRoot = path.join(tempDir, 'codex-marketplace-served.git');
  await createServedGitMarketplace(marketplaceRoot, servedGitRoot);
  await withStaticHttpRoot(path.dirname(servedGitRoot), async (origin) => {
    const marketplaceUrl = `${origin}/${path.basename(servedGitRoot)}`;
    await runMarketplaceInstallScenario({
      label: 'git-marketplace',
      codexBin,
      tempDir,
      pluginVersion: pluginManifest.version,
      addArgs: [marketplaceUrl],
      expectedConfigLines: [
        `[marketplaces.${MARKETPLACE_NAME}]`,
        'source_type = "git"',
        `source = "${marketplaceUrl}"`
      ]
    });
  });
}

export function buildPackSmokeReviewEnv(tempDir, sourceEnv = process.env) {
  const env = { ...sourceEnv };
  for (const key of Object.keys(env)) {
    if (REVIEW_ENV_BLOCKLIST.has(key) || key.startsWith('CODEX_REVIEW_') || key.startsWith('DIFF_BUDGET_')) {
      delete env[key];
    }
  }
  return {
    ...env,
    NOTES: 'Goal: pack smoke review coverage | Summary: package smoke path | Risks: low',
    CODEX_REVIEW_NON_INTERACTIVE: '1',
    CODEX_ORCHESTRATOR_ROOT: tempDir,
    MCP_RUNNER_TASK_ID: 'pack-smoke'
  };
}

async function main() {
  let record;
  let tarballPath = null;
  let tempDir = null;

  try {
    record = await runPack();
    if (record.filename) {
      tarballPath = path.resolve(process.cwd(), record.filename);
    }

    tempDir = await mkdtemp(path.join(os.tmpdir(), 'codex-pack-smoke-'));
    const pkgJsonPath = path.join(tempDir, 'package.json');
    await writeFile(pkgJsonPath, JSON.stringify({ name: 'pack-smoke', private: true }, null, 2));

    if (!tarballPath) {
      throw new Error('pack smoke requires a tarball filename');
    }

    await runCommand('npm', ['install', tarballPath, '--no-fund', '--no-audit', '--ignore-scripts'], {
      cwd: tempDir
    });

    const packageRoot = path.join(tempDir, 'node_modules', '@kbediako', 'codex-orchestrator');
    const binName = process.platform === 'win32' ? 'codex-orchestrator.cmd' : 'codex-orchestrator';
    const binPath = path.join(tempDir, 'node_modules', '.bin', binName);

    await assertPathExists(path.join(packageRoot, '.agents', 'plugins', 'marketplace.json'), 'packaged marketplace file');
    const packagedPluginRoot = path.join(packageRoot, 'plugins', 'codex-orchestrator');
    await assertPathExists(path.join(packagedPluginRoot, '.codex-plugin', 'plugin.json'), 'packaged plugin manifest');
    await assertPathExists(path.join(packagedPluginRoot, '.mcp.json'), 'packaged plugin mcp manifest');
    await assertPathExists(path.join(packagedPluginRoot, 'launcher.mjs'), 'packaged plugin launcher');
    await assertPathExists(path.join(packageRoot, 'bin', 'codex-orchestrator.js'), 'packaged bootstrap bin');
    await assertPathExists(path.join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js'), 'packaged dist bin');
    await assertPathMissing(path.join(packageRoot, 'bin', 'codex-orchestrator.ts'), 'repo-only source CLI');
    await assertPathMissing(path.join(packageRoot, 'orchestrator', 'src'), 'repo-only orchestrator sources');
    await assertPathMissing(path.join(packageRoot, 'node_modules', 'ts-node'), 'nested repo-only ts-node dependency');
    await assertPathMissing(path.join(tempDir, 'node_modules', 'ts-node'), 'hoisted repo-only ts-node dependency');

    await assertMarkdownLinksResolve(packageRoot);
    await assertPluginLauncherShape(packagedPluginRoot, 'packaged plugin');
    await runCommand(binPath, ['--help'], { cwd: tempDir });
    await runCommand(binPath, ['--version'], { cwd: tempDir });
    await runCommand(binPath, ['review', '--help'], { cwd: tempDir });
    await runCommand(binPath, ['self-check', '--format', 'json'], { cwd: tempDir });
    await runDelegateServerJsonlSmoke(binPath, tempDir);

    const seededRepo = path.join(tempDir, 'seeded-repo');
    await mkdir(seededRepo, { recursive: true });
    await runCommand(binPath, ['init', 'codex', '--cwd', seededRepo], { cwd: tempDir });
    await assertPathExists(
      path.join(seededRepo, '.codex', 'providers', 'README.md'),
      'seeded providers README'
    );
    await assertPathExists(
      path.join(seededRepo, '.codex', 'providers', 'provider.env.example'),
      'seeded provider env example'
    );
    await assertPathExists(
      path.join(seededRepo, '.codex', 'providers', 'control.example.json'),
      'seeded provider control example'
    );

    const runDir = path.join(tempDir, '.runs', 'pack-smoke', 'cli', '2026-01-01T00-00-00-000Z-packsmoke');
    const manifestPath = path.join(runDir, 'manifest.json');
    await mkdir(runDir, { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify({ run_id: 'pack-smoke', summary: { status: 'completed' } }, null, 2)}\n`
    );

    const baseReviewEnv = buildPackSmokeReviewEnv(tempDir);

    await runCommand(binPath, ['review', '--manifest', manifestPath, '--non-interactive'], {
      cwd: tempDir,
      env: baseReviewEnv
    });

    const reviewDir = path.join(runDir, 'review');
    const promptPath = path.join(reviewDir, 'prompt.txt');
    await assertPathExists(promptPath, 'review prompt artifact');
    await assertFileIncludes(promptPath, 'Review task: pack-smoke', 'review prompt artifact');

    const mockCodex = await writeMockCodexBin(tempDir);
    await runCommand(binPath, ['review', '--manifest', manifestPath, '--non-interactive'], {
      cwd: tempDir,
      env: {
        ...baseReviewEnv,
        FORCE_CODEX_REVIEW: '1',
        CODEX_CLI_BIN: mockCodex,
        CODEX_REVIEW_MONITOR_INTERVAL_SECONDS: '0'
      }
    });

    const outputLogPath = path.join(reviewDir, 'output.log');
    const telemetryPath = path.join(reviewDir, 'telemetry.json');
    await assertPathExists(outputLogPath, 'review output artifact');
    await assertPathExists(telemetryPath, 'review telemetry artifact');
    await assertFileIncludes(telemetryPath, '"status": "succeeded"', 'review telemetry artifact');

    const codexHome = path.join(tempDir, '.codex-home');
    await runCommand(
      binPath,
      ['skills', 'install', '--only', 'long-poll-wait', '--codex-home', codexHome, '--force'],
      { cwd: tempDir }
    );
    const installedLongPollSkillPath = path.join(codexHome, 'skills', 'long-poll-wait', 'SKILL.md');
    await assertPathExists(installedLongPollSkillPath, 'installed long-poll-wait skill');
    await assertFileIncludes(installedLongPollSkillPath, 'name: long-poll-wait', 'long-poll-wait skill');
    await assertFileIncludes(
      installedLongPollSkillPath,
      'Poll until terminal state',
      'long-poll-wait skill'
    );
    await runMarketplacePluginSmoke(packageRoot, tempDir);

    console.log('✅ pack smoke passed');
  } catch (error) {
    console.error(`❌ pack smoke failed: ${error?.message ?? String(error)}`);
    process.exitCode = 1;
  } finally {
    if (tarballPath) {
      try {
        await rm(tarballPath, { force: true });
      } catch {
        // ignore cleanup failures
      }
    }
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
