import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { chmod, copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';

import {
  resolveCodexCliBinPath,
  resolveCodexCliConfigPath,
  resolveCodexCliReadiness,
  resolveCodexCliRoot,
  type CodexCliInstallInfo,
  type CodexCliReadiness
} from './utils/codexCli.js';
import { resolveCodexHome } from './utils/codexPaths.js';

export interface CodexCliSetupOptions {
  apply?: boolean;
  force?: boolean;
  source?: string;
  ref?: string;
  downloadUrl?: string;
  downloadSha256?: string;
  env?: NodeJS.ProcessEnv;
}

export interface CodexCliSetupPlan {
  codexHome: string;
  installRoot: string;
  binPath: string;
  configPath: string;
  method: 'download' | 'build';
  source?: string;
  ref?: string;
  downloadUrl?: string;
  downloadSha256?: string;
  commandLine: string;
}

export interface CodexCliSetupResult {
  status: 'planned' | 'applied' | 'skipped';
  reason?: string;
  plan: CodexCliSetupPlan;
  readiness: CodexCliReadiness;
  install?: CodexCliInstallInfo | null;
}

export async function runCodexCliSetup(
  options: CodexCliSetupOptions = {}
): Promise<CodexCliSetupResult> {
  const env = options.env ?? process.env;
  const plan = buildCodexCliSetupPlan(options, env);
  const readiness = resolveCodexCliReadiness(env);

  if (!options.apply) {
    return { status: 'planned', plan, readiness, install: readiness.install ?? null };
  }

  if (readiness.status === 'ok' && !options.force) {
    return {
      status: 'skipped',
      reason: 'CO-managed Codex CLI already installed.',
      plan,
      readiness,
      install: readiness.install ?? null
    };
  }

  if (readiness.config.status === 'invalid' && !options.force) {
    throw new Error(`codex-cli config is invalid: ${readiness.config.path}`);
  }

  if (plan.method === 'download') {
    if (!plan.downloadUrl) {
      throw new Error('codex setup requires --download-url (or CODEX_CLI_DOWNLOAD_URL) when using download mode.');
    }
    if (!plan.downloadSha256) {
      throw new Error('codex setup requires --download-sha256 (or CODEX_CLI_DOWNLOAD_SHA256) for download mode.');
    }
    await downloadCodexCli(plan.downloadUrl, plan.binPath, plan.downloadSha256);
  } else {
    if (!plan.source) {
      throw new Error('codex setup requires --source (or CODEX_CLI_SOURCE) when using build mode.');
    }
    const workspace = await prepareSource(plan.source, plan.ref, plan.installRoot);
    try {
      await buildCodexCli(workspace);
    } catch (error) {
      throw formatCargoMissingHint(error);
    }
    const builtBinary = join(workspace, 'target', 'release', codexBinaryName());
    if (!existsSync(builtBinary)) {
      throw new Error(`codex CLI binary not found at ${builtBinary}`);
    }
    await ensureParentDir(plan.binPath);
    await copyFile(builtBinary, plan.binPath);
    await chmod(plan.binPath, 0o755);
  }

  const install = await writeCodexCliConfig(plan, env);
  const updatedReadiness = resolveCodexCliReadiness(env);
  return { status: 'applied', plan, readiness: updatedReadiness, install };
}

export function formatCodexCliSetupSummary(result: CodexCliSetupResult): string[] {
  const lines: string[] = [];
  lines.push(`Codex CLI setup: ${result.status}`);
  if (result.reason) {
    lines.push(`Note: ${result.reason}`);
  }

  lines.push(`- Codex home: ${result.plan.codexHome}`);
  lines.push(`- Install root: ${result.plan.installRoot}`);
  lines.push(`- Binary: ${result.plan.binPath}`);
  lines.push(`- Config: ${result.plan.configPath}`);
  lines.push(`- Method: ${result.plan.method}`);
  if (result.plan.source) {
    lines.push(`- Source: ${result.plan.source}`);
  }
  if (result.plan.ref) {
    lines.push(`- Ref: ${result.plan.ref}`);
  }
  if (result.plan.downloadUrl) {
    lines.push(`- Download URL: ${result.plan.downloadUrl}`);
  }
  if (result.plan.downloadSha256) {
    lines.push(`- Download SHA256: ${result.plan.downloadSha256}`);
  }
  if (result.install?.sha256) {
    lines.push(`- Installed SHA256: ${result.install.sha256}`);
  }
  lines.push(`- Command: ${result.plan.commandLine}`);
  lines.push('- Selection: stock `codex` stays default. Set CODEX_CLI_USE_MANAGED=1 to use this managed binary.');

  if (result.status === 'planned') {
    lines.push('Run with --yes to apply this setup.');
  }

  return lines;
}

function buildCodexCliSetupPlan(
  options: CodexCliSetupOptions,
  env: NodeJS.ProcessEnv
): CodexCliSetupPlan {
  const codexHome = resolveCodexHome(env);
  const installRoot = resolveCodexCliRoot(env);
  const binPath = resolveCodexCliBinPath(env);
  const configPath = resolveCodexCliConfigPath(env);
  const source = firstNonEmpty(options.source, env.CODEX_CLI_SOURCE);
  const ref = firstNonEmpty(options.ref, env.CODEX_CLI_REF);
  const downloadUrl = firstNonEmpty(options.downloadUrl, env.CODEX_CLI_DOWNLOAD_URL);
  const downloadSha256 = firstNonEmpty(options.downloadSha256, env.CODEX_CLI_DOWNLOAD_SHA256);
  const method = downloadUrl ? 'download' : 'build';
  const commandLine =
    method === 'download'
      ? `download ${downloadUrl ?? '<download-url>'} (sha256: ${downloadSha256 ?? '<sha256>'})`
      : `cargo build -p codex-cli --release (cwd: ${source ?? '<source>'})`;

  return {
    codexHome,
    installRoot,
    binPath,
    configPath,
    method,
    source,
    ref,
    downloadUrl,
    downloadSha256,
    commandLine
  };
}

async function downloadCodexCli(
  url: string,
  destination: string,
  expectedSha256: string
): Promise<void> {
  await ensureParentDir(destination);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download codex CLI: ${response.status} ${response.statusText}`);
  }
  const body = response.body;
  if (!body) {
    throw new Error('Download response has no body.');
  }
  const tempPath = `${destination}.tmp`;
  try {
    await pipeline(Readable.fromWeb(body as ReadableStream), createWriteStream(tempPath));
    await chmod(tempPath, 0o755);
    const actualSha256 = await sha256File(tempPath);
    if (actualSha256 !== expectedSha256) {
      throw new Error(`codex CLI sha256 mismatch: expected ${expectedSha256}, got ${actualSha256}`);
    }
    await rename(tempPath, destination);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

async function prepareSource(source: string, ref: string | undefined, root: string): Promise<string> {
  const resolved = resolve(source);
  if (existsSync(resolved)) {
    const workspace = await resolveWorkspace(resolved);
    if (!workspace) {
      throw new Error(`codex source missing Cargo workspace at ${resolved}`);
    }
    return workspace;
  }

  const cloneDir = join(root, 'src');
  if (!existsSync(cloneDir)) {
    await runCommand('git', ['clone', source, cloneDir]);
  } else {
    await runCommand('git', ['-C', cloneDir, 'fetch', '--all', '--prune']);
  }
  if (ref) {
    await runCommand('git', ['-C', cloneDir, 'checkout', ref]);
  }
  const workspace = await resolveWorkspace(cloneDir);
  if (!workspace) {
    throw new Error(`codex source missing Cargo workspace at ${cloneDir}`);
  }
  return workspace;
}

async function resolveWorkspace(sourceRoot: string): Promise<string | null> {
  const nested = join(sourceRoot, 'codex-rs', 'Cargo.toml');
  if (existsSync(nested)) {
    return join(sourceRoot, 'codex-rs');
  }
  const rootCargo = join(sourceRoot, 'Cargo.toml');
  if (existsSync(rootCargo)) {
    return sourceRoot;
  }
  return null;
}

async function buildCodexCli(workspace: string): Promise<void> {
  await runCommand('cargo', ['build', '-p', 'codex-cli', '--release'], { cwd: workspace });
}

async function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const env = { ...process.env };
    if (process.stdin?.isTTY !== true) {
      env.GIT_TERMINAL_PROMPT = env.GIT_TERMINAL_PROMPT ?? '0';
      env.GIT_ASKPASS = env.GIT_ASKPASS ?? 'echo';
      env.GCM_INTERACTIVE = env.GCM_INTERACTIVE ?? 'never';
    }
    const child = spawn(command, args, { stdio: 'inherit', cwd: options.cwd, env });
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

async function writeCodexCliConfig(
  plan: CodexCliSetupPlan,
  env: NodeJS.ProcessEnv
): Promise<CodexCliInstallInfo> {
  const config: CodexCliInstallInfo = {
    binary_path: plan.binPath,
    method: plan.method,
    source: plan.source,
    ref: plan.ref,
    installed_at: new Date().toISOString()
  };
  if (plan.downloadUrl) {
    config.source = plan.downloadUrl;
  }
  const sha256 = await sha256File(plan.binPath);
  config.sha256 = sha256;
  const version = await probeCodexCliVersion(plan.binPath, env);
  if (version) {
    config.version = version;
  }

  await ensureParentDir(plan.configPath);
  await writeFile(plan.configPath, JSON.stringify(config, null, 2));
  return config;
}

async function probeCodexCliVersion(
  binaryPath: string,
  env: NodeJS.ProcessEnv
): Promise<string | undefined> {
  try {
    const output = await execCommand(binaryPath, ['--version'], env);
    const trimmed = output.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

async function execCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<string> {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise(stdout);
      } else {
        reject(new Error(stderr || `${command} exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

async function ensureParentDir(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function sha256File(path: string): Promise<string> {
  return await new Promise<string>((resolvePromise, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolvePromise(hash.digest('hex')));
    stream.on('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
  });
}

function codexBinaryName(): string {
  return process.platform === 'win32' ? 'codex.exe' : 'codex';
}

function formatCargoMissingHint(error: unknown): Error {
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message ?? '';
  if (isCargoMissingError(err, message)) {
    return new Error(
      'cargo was not found in PATH. If you installed via rustup, add "$HOME/.cargo/bin" to PATH and retry.'
    );
  }
  return err;
}

function isCargoMissingError(error: Error, message: string): boolean {
  const err = error as NodeJS.ErrnoException;
  if (err.code === 'ENOENT' && message.includes('cargo')) {
    return true;
  }
  return message.includes('spawn cargo ENOENT');
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}
