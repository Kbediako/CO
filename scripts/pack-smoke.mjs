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
    child.once('close', (code) => {
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

async function assertNoImportedCommandSkills(skillsRoot, label) {
  let entries = [];
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
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
  const importedSkill = entries.find((entry) => entry.name.startsWith('source-command-'));
  if (importedSkill) {
    throw new Error(`${label} should be absent: ${importedSkill.name}`);
  }
}

async function assertFileIncludes(filePath, text, label) {
  const raw = await readFile(filePath, 'utf8');
  if (!raw.includes(text)) {
    throw new Error(`${label} missing expected text "${text}" (${filePath})`);
  }
}

async function assertFileExcludes(filePath, text, label) {
  const raw = await readFile(filePath, 'utf8');
  if (raw.includes(text)) {
    throw new Error(`${label} must not include ungoverned text "${text}" (${filePath})`);
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

const MARKETPLACE_COMMAND_CANDIDATES = [
  {
    surface: 'plugin-marketplace',
    displayName: 'codex plugin marketplace add',
    addArgs: ['plugin', 'marketplace', 'add'],
    helpArgs: ['plugin', 'marketplace', 'add', '--help'],
    requiredHelpArgs: [
      ['plugin', 'marketplace', 'upgrade', '--help'],
      ['plugin', 'marketplace', 'remove', '--help']
    ]
  },
  {
    surface: 'legacy-marketplace',
    displayName: 'codex marketplace add',
    addArgs: ['marketplace', 'add'],
    helpArgs: ['marketplace', 'add', '--help'],
    requiredHelpArgs: []
  }
];

function formatMarketplaceAddCommand(commandArgs) {
  return `codex ${commandArgs.join(' ')}`;
}

function formatSupportedMarketplaceAddCommands() {
  return MARKETPLACE_COMMAND_CANDIDATES.map(
    (candidate) => `\`${formatMarketplaceAddCommand(candidate.addArgs)}\``
  ).join(' or ');
}

function formatHelpCommand(command, args) {
  return `${command} ${args.join(' ')}`;
}

export async function resolveMarketplaceCommandSupport(command, options = {}, probe = commandSucceeds) {
  for (const candidate of MARKETPLACE_COMMAND_CANDIDATES) {
    if (!(await probe(command, candidate.helpArgs, options))) {
      continue;
    }
    const missingHelpCommands = [];
    for (const requiredArgs of candidate.requiredHelpArgs) {
      if (!(await probe(command, requiredArgs, options))) {
        missingHelpCommands.push(formatHelpCommand(command, requiredArgs));
      }
    }
    const support = {
      surface: candidate.surface,
      displayName: candidate.displayName,
      addArgs: [...candidate.addArgs],
      helpArgs: [...candidate.helpArgs],
      missingHelpCommands
    };
    if (candidate.surface === 'plugin-marketplace') {
      return support;
    }
    if (missingHelpCommands.length === 0) {
      return support;
    }
  }
  return null;
}

export function resolveMarketplaceSmokePrerequisite({
  codexBin = 'codex',
  allowMarketplaceSkip = false,
  marketplaceSkipReason = '',
  codexAvailable,
  marketplaceCommand = null,
  marketplaceCommandArgs = null
}) {
  const skipReason = String(marketplaceSkipReason ?? '').trim();
  const resolvedMarketplaceCommand =
    marketplaceCommand ??
    (Array.isArray(marketplaceCommandArgs)
      ? {
          addArgs: marketplaceCommandArgs,
          displayName: formatMarketplaceAddCommand(marketplaceCommandArgs),
          missingHelpCommands: []
        }
      : null);
  const missingHelpCommands = Array.isArray(resolvedMarketplaceCommand?.missingHelpCommands)
    ? resolvedMarketplaceCommand.missingHelpCommands
    : [];
  if (!codexAvailable) {
    if (allowMarketplaceSkip && skipReason.length > 0) {
      return {
        status: 'skip',
        reason: 'codex-unavailable',
        message: `Skipping marketplace smoke: ${codexBin} is unavailable in this environment. Reason: ${skipReason}`
      };
    }
    if (allowMarketplaceSkip) {
      return {
        status: 'fail',
        reason: 'missing-skip-reason',
        message:
          'PACK_SMOKE_MARKETPLACE_SKIP_REASON is required when PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 skips marketplace coverage.'
      };
    }
    return {
      status: 'fail',
      reason: 'codex-unavailable',
      message:
        `Marketplace smoke requires ${codexBin} in PATH. Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 with PACK_SMOKE_MARKETPLACE_SKIP_REASON only for local-dev opt-out.`
    };
  }

  if (!resolvedMarketplaceCommand) {
    if (allowMarketplaceSkip && skipReason.length > 0) {
      return {
        status: 'skip',
        reason: 'marketplace-unsupported',
        message:
          `Skipping marketplace smoke: ${codexBin} does not expose a supported marketplace add command (${formatSupportedMarketplaceAddCommands()}). Reason: ${skipReason}`
      };
    }
    if (allowMarketplaceSkip) {
      return {
        status: 'fail',
        reason: 'missing-skip-reason',
        message:
          'PACK_SMOKE_MARKETPLACE_SKIP_REASON is required when PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 skips marketplace coverage.'
      };
    }
    return {
      status: 'fail',
      reason: 'marketplace-unsupported',
      message:
        `Marketplace smoke requires a Codex CLI with a supported marketplace add command (${formatSupportedMarketplaceAddCommands()}). Set PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 with PACK_SMOKE_MARKETPLACE_SKIP_REASON only for local-dev opt-out.`
    };
  }

  if (missingHelpCommands.length > 0) {
    if (allowMarketplaceSkip && skipReason.length > 0) {
      return {
        status: 'skip',
        reason: 'marketplace-help-incomplete',
        message:
          `Skipping marketplace smoke: ${codexBin} has incomplete plugin marketplace help. Missing: ${missingHelpCommands.join(', ')}. Reason: ${skipReason}`
      };
    }
    if (allowMarketplaceSkip) {
      return {
        status: 'fail',
        reason: 'missing-skip-reason',
        message:
          'PACK_SMOKE_MARKETPLACE_SKIP_REASON is required when PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 skips marketplace coverage.'
      };
    }
    return {
      status: 'fail',
      reason: 'marketplace-help-incomplete',
      message:
        `Marketplace smoke requires plugin marketplace upgrade/remove help detection to pass. Missing: ${missingHelpCommands.join(', ')}.`
    };
  }

  return {
    status: 'run',
    reason: 'marketplace-supported',
    message: `Marketplace smoke prerequisites satisfied via ${formatMarketplaceAddCommand(resolvedMarketplaceCommand.addArgs)}.`
  };
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

export async function assertPackagedPluginGovernanceShape(pluginRoot, label) {
  const pluginManifestPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');
  const pluginManifest = await readJsonFile(pluginManifestPath, `${label} plugin manifest`);
  if (Object.prototype.hasOwnProperty.call(pluginManifest, 'hooks')) {
    throw new Error(
      `${label} plugin manifest must not declare plugin-bundled hooks without explicit CO hook governance`
    );
  }
  await assertPathMissing(
    path.join(pluginRoot, 'hooks', 'hooks.json'),
    `${label} default plugin-bundled hooks manifest`
  );
  await assertPathMissing(path.join(pluginRoot, 'hooks.json'), `${label} default plugin-bundled hooks config`);
  await assertPathMissing(path.join(pluginRoot, '.codex', 'config.toml'), `${label} imported Codex config`);
  await assertPathMissing(path.join(pluginRoot, '.codex', 'hooks.json'), `${label} imported hooks config`);
  await assertPathMissing(path.join(pluginRoot, '.codex', 'hooks'), `${label} imported hook scripts`);
  await assertPathMissing(path.join(pluginRoot, '.codex', 'agents'), `${label} imported subagent config`);
  await assertNoImportedCommandSkills(
    path.join(pluginRoot, '.agents', 'skills'),
    `${label} imported external-agent command skill`
  );
  await assertPathMissing(path.join(pluginRoot, 'CLAUDE.md'), `${label} external-agent guidance source`);
}

export async function assertPluginInstallConfigGovernance(configPath, label) {
  await assertFileExcludes(configPath, 'hooks.state', `${label} plugin install config`);
  await assertFileExcludes(configPath, 'codex_hooks', `${label} plugin install config`);
  await assertFileExcludes(configPath, 'plugin_hooks', `${label} plugin install config`);
  await assertFileExcludes(configPath, 'external_migration', `${label} plugin install config`);
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
      return await new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        try {
          child.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
        } catch (error) {
          pending.delete(id);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
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
    await assertPluginInstallConfigGovernance(configPath, label);

    const cachedPluginRoot = path.join(codexHome, 'plugins', 'cache', MARKETPLACE_NAME, PLUGIN_NAME, pluginVersion);
    await assertPathExists(path.join(cachedPluginRoot, '.codex-plugin', 'plugin.json'), `${label} cached plugin manifest`);
    await assertPathExists(path.join(cachedPluginRoot, '.mcp.json'), `${label} cached plugin mcp manifest`);
    await assertPathExists(path.join(cachedPluginRoot, 'launcher.mjs'), `${label} cached plugin launcher`);
    await assertPackagedPluginGovernanceShape(cachedPluginRoot, `${label} cached plugin`);
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

async function runMarketplaceInstallScenario({
  label,
  codexBin,
  marketplaceCommandArgs,
  tempDir,
  pluginVersion,
  addArgs,
  expectedConfigLines,
  afterInstall
}) {
  // Keep CODEX_HOME outside the temp package tree so cached plugin launches
  // cannot resolve undeclared modules from tempDir/node_modules ancestors.
  const homeRoot = await mkdtemp(path.join(os.tmpdir(), `codex-plugin-smoke-home-${label}-`));
  const codexHome = path.join(homeRoot, '.codex');
  await mkdir(codexHome, { recursive: true });

  try {
    const marketplaceEnv = {
      ...process.env,
      HOME: homeRoot,
      CODEX_HOME: codexHome
    };

    await runCommand(codexBin, [...marketplaceCommandArgs, ...addArgs], {
      cwd: tempDir,
      env: marketplaceEnv
    });
    const configPath = path.join(codexHome, 'config.toml');
    for (const expectedLine of expectedConfigLines) {
      await assertFileIncludes(configPath, expectedLine, `${label} marketplace config`);
    }
    const { cachedPluginRoot, configPath: installedConfigPath } = await installMarketplacePlugin(
      codexBin,
      marketplaceEnv,
      pluginVersion,
      label
    );
    if (typeof afterInstall === 'function') {
      await afterInstall({
        cachedPluginRoot,
        configPath: installedConfigPath,
        homeRoot,
        codexHome,
        marketplaceEnv
      });
    }
    const workspaceRoot = path.join(tempDir, `.codex-plugin-smoke-workspace-${label}`);
    await mkdir(workspaceRoot, { recursive: true });
    await runCachedPluginLauncherSmoke(cachedPluginRoot, marketplaceEnv, `${label} cached plugin`, workspaceRoot);
  } finally {
    await rm(homeRoot, { recursive: true, force: true });
  }
}

async function rewriteMarketplaceSourceToRelative(configPath, sourceRoot) {
  const relativeSourceRoot = path.relative(path.dirname(configPath), sourceRoot);
  const updatedLines = [];
  let inMarketplaceSection = false;
  let replaced = false;
  for (const line of (await readFile(configPath, 'utf8')).split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inMarketplaceSection = trimmed === `[marketplaces.${MARKETPLACE_NAME}]`;
      updatedLines.push(line);
      continue;
    }
    if (inMarketplaceSection && /^source\s*=/.test(trimmed)) {
      const indentation = line.slice(0, line.indexOf(trimmed));
      updatedLines.push(`${indentation}source = ${JSON.stringify(relativeSourceRoot)}`);
      replaced = true;
      continue;
    }
    updatedLines.push(line);
  }
  if (!replaced) {
    throw new Error(`Unable to rewrite ${configPath} with a relative local marketplace source.`);
  }
  await writeFile(configPath, updatedLines.join('\n'));
  await assertFileIncludes(
    configPath,
    `source = ${JSON.stringify(relativeSourceRoot)}`,
    'relative local marketplace config'
  );
}

async function runMarketplacePluginSmoke(packageRoot, tempDir) {
  const codexBin = process.env.PACK_SMOKE_CODEX_BIN ?? 'codex';
  const allowMarketplaceSkip = process.env.PACK_SMOKE_ALLOW_MARKETPLACE_SKIP === '1';
  const marketplaceSkipReason = process.env.PACK_SMOKE_MARKETPLACE_SKIP_REASON ?? '';
  const codexAvailable = await commandSucceeds(codexBin, ['--version']);
  const marketplaceCommand = codexAvailable ? await resolveMarketplaceCommandSupport(codexBin) : null;
  const prerequisite = resolveMarketplaceSmokePrerequisite({
    codexBin,
    allowMarketplaceSkip,
    marketplaceSkipReason,
    codexAvailable,
    marketplaceCommand
  });
  if (prerequisite.status === 'skip') {
    console.warn(prerequisite.message);
    return;
  }
  if (prerequisite.status === 'fail') {
    throw new Error(prerequisite.message);
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
  await assertPackagedPluginGovernanceShape(pluginRoot, 'packaged plugin');

  await runMarketplaceInstallScenario({
    label: 'local-marketplace',
    codexBin,
    marketplaceCommandArgs: marketplaceCommand.addArgs,
    tempDir,
    pluginVersion: pluginManifest.version,
    addArgs: [marketplaceRoot],
    expectedConfigLines: [
      `[marketplaces.${MARKETPLACE_NAME}]`,
      'source_type = "local"'
    ],
    afterInstall: async ({ configPath }) => {
      await rewriteMarketplaceSourceToRelative(configPath, marketplaceRoot);
    }
  });

  const servedGitRoot = path.join(tempDir, 'codex-marketplace-served.git');
  await createServedGitMarketplace(marketplaceRoot, servedGitRoot);
  await withStaticHttpRoot(path.dirname(servedGitRoot), async (origin) => {
    const marketplaceUrl = `${origin}/${path.basename(servedGitRoot)}`;
    await runMarketplaceInstallScenario({
      label: 'git-marketplace',
      codexBin,
      marketplaceCommandArgs: marketplaceCommand.addArgs,
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
    await assertPackagedPluginGovernanceShape(packagedPluginRoot, 'packaged plugin');
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
