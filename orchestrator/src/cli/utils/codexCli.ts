import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

import { resolveCodexOrchestratorHome } from './codexPaths.js';

export interface CodexCliInstallInfo {
  binary_path: string;
  method: 'download' | 'build';
  source?: string;
  ref?: string;
  installed_at: string;
  version?: string;
  sha256?: string;
}

export interface CodexCliReadiness {
  status: 'ok' | 'missing' | 'invalid';
  config: {
    status: 'ok' | 'missing' | 'invalid';
    path: string;
    error?: string;
  };
  binary: {
    status: 'ok' | 'missing';
    path: string;
  };
  install?: CodexCliInstallInfo;
}

export interface CodexCliBinaryProbe {
  command: string;
  path: string | null;
  version: string | null;
  status: 'ok' | 'unavailable';
  error?: string;
}

export interface CodexAppBundleBinaryProbe {
  path: string;
  version: string | null;
  status: 'absent' | 'ok' | 'unavailable';
  error?: string;
}

export interface CodexCliVersionDrift {
  status: 'ok' | 'advisory' | 'not_applicable' | 'unknown';
  message: string | null;
}

export interface CodexCliBinaryProvenance {
  active: CodexCliBinaryProbe;
  app_bundle: CodexAppBundleBinaryProbe;
  version_drift: CodexCliVersionDrift;
}

const CONFIG_FILENAME = 'codex-cli.json';
const USE_MANAGED_ENV = 'CODEX_CLI_USE_MANAGED';
export const DEFAULT_CODEX_APP_BUNDLE_CLI_PATH = '/Applications/Codex.app/Contents/Resources/codex';
const CODEX_VERSION_PROBE_TIMEOUT_MS = 5000;
type CommandPathProbeResult = { path: string | null; error?: string };
type VersionProbeResult = { status: 'ok' | 'unavailable'; version: string | null; error?: string };

export function resolveCodexCliRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveCodexOrchestratorHome(env), 'codex-cli');
}

export function resolveCodexCliConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveCodexCliRoot(env), CONFIG_FILENAME);
}

export function resolveCodexCliBinPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveCodexCliRoot(env), 'bin', codexBinaryName());
}

export function resolveCodexCliBin(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.CODEX_CLI_BIN?.trim();
  if (override) {
    return override;
  }
  if (!isManagedCodexCliEnabled(env)) {
    return 'codex';
  }
  const { config } = readCodexCliConfig(env);
  if (config?.binary_path) {
    return config.binary_path;
  }
  return 'codex';
}

export function inspectCodexCliBinaryProvenance(options: {
  command?: string;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  appBundlePath?: string;
  timeoutMs?: number;
} = {}): CodexCliBinaryProvenance {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const command = options.command ?? resolveCodexCliBin(env);
  const timeoutMs = options.timeoutMs ?? CODEX_VERSION_PROBE_TIMEOUT_MS;
  const activePath = resolveCommandPath(command, { env, cwd, timeoutMs });
  const activeVersion = probeCodexVersion(command, { env, cwd, timeoutMs });
  const active: CodexCliBinaryProbe = {
    command,
    path: activePath.path,
    version: activeVersion.version,
    status: activeVersion.status,
    error: activeVersion.error ?? activePath.error
  };

  const appBundlePath = options.appBundlePath ?? DEFAULT_CODEX_APP_BUNDLE_CLI_PATH;
  const appBundle = inspectCodexAppBundleBinary(appBundlePath, { env, cwd, timeoutMs });

  return {
    active,
    app_bundle: appBundle,
    version_drift: compareCodexBinaryVersions(active, appBundle)
  };
}

export function isManagedCodexCliEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTrueFlag(env[USE_MANAGED_ENV]);
}

export function resolveCodexCliReadiness(env: NodeJS.ProcessEnv = process.env): CodexCliReadiness {
  const configPath = resolveCodexCliConfigPath(env);
  if (!existsSync(configPath)) {
    return {
      status: 'missing',
      config: { status: 'missing', path: configPath },
      binary: { status: 'missing', path: resolveCodexCliBinPath(env) }
    };
  }

  const { config, error } = readCodexCliConfig(env);
  if (error || !config) {
    return {
      status: 'invalid',
      config: { status: 'invalid', path: configPath, error: error ?? 'Invalid config JSON.' },
      binary: { status: 'missing', path: resolveCodexCliBinPath(env) }
    };
  }

  const binaryPath = config.binary_path;
  const binaryExists = binaryPath ? existsSync(binaryPath) : false;
  const binaryStatus = binaryExists ? 'ok' : 'missing';
  if (binaryExists && config.sha256) {
    const actualSha256 = sha256FileSync(binaryPath);
    if (actualSha256 !== config.sha256) {
      return {
        status: 'invalid',
        config: {
          status: 'invalid',
          path: configPath,
          error: `codex-cli sha256 mismatch (expected ${config.sha256}, got ${actualSha256})`
        },
        binary: { status: binaryStatus, path: binaryPath },
        install: config
      };
    }
  }
  const status = binaryStatus === 'ok' ? 'ok' : 'missing';

  return {
    status,
    config: { status: 'ok', path: configPath },
    binary: { status: binaryStatus, path: binaryPath },
    install: config
  };
}

export function readCodexCliConfig(
  env: NodeJS.ProcessEnv = process.env
): { config: CodexCliInstallInfo | null; error?: string } {
  const configPath = resolveCodexCliConfigPath(env);
  if (!existsSync(configPath)) {
    return { config: null };
  }
  try {
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as CodexCliInstallInfo;
    if (!parsed || typeof parsed.binary_path !== 'string') {
      return { config: null, error: 'codex-cli.json missing binary_path.' };
    }
    return { config: parsed };
  } catch (error) {
    return { config: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function codexBinaryName(): string {
  return process.platform === 'win32' ? 'codex.exe' : 'codex';
}

function resolveCommandPath(command: string, options: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  timeoutMs: number;
}): CommandPathProbeResult {
  const trimmed = command.trim();
  if (!trimmed) {
    return { path: null, error: 'Codex CLI command is empty.' };
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    return { path: resolve(options.cwd, trimmed) };
  }

  const result = process.platform === 'win32'
    ? spawnSync('where', [trimmed], {
        cwd: options.cwd,
        env: options.env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeoutMs
      })
    : spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'sh', trimmed], {
        cwd: options.cwd,
        env: options.env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeoutMs
      });

  if (result.error) {
    return { path: null, error: result.error.message };
  }
  if (result.status !== 0) {
    return { path: null, error: normalizeProbeError(result.stderr) ?? `${trimmed} was not found on PATH.` };
  }
  const firstLine = firstOutputLine(result.stdout);
  return firstLine ? { path: firstLine } : { path: null, error: `${trimmed} path probe produced no output.` };
}

function inspectCodexAppBundleBinary(path: string, options: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  timeoutMs: number;
}): CodexAppBundleBinaryProbe {
  if (!existsSync(path)) {
    return { path, version: null, status: 'absent' };
  }
  const version = probeCodexVersion(path, options);
  if (version.status !== 'ok') {
    return {
      path,
      version: null,
      status: 'unavailable',
      error: version.error ?? 'Codex app bundle binary version probe failed.'
    };
  }
  return { path, version: version.version, status: 'ok' };
}

function probeCodexVersion(command: string, options: {
  env: NodeJS.ProcessEnv;
  cwd: string;
  timeoutMs: number;
}): VersionProbeResult {
  const result = spawnSync(command, ['--version'], {
    cwd: options.cwd,
    env: options.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: options.timeoutMs
  });
  if (result.error) {
    return { status: 'unavailable', version: null, error: result.error.message };
  }
  if (result.status !== 0) {
    return {
      status: 'unavailable',
      version: null,
      error: normalizeProbeError(result.stderr) ?? `${command} --version exited with status ${result.status ?? 'unknown'}.`
    };
  }
  const version = firstOutputLine(result.stdout) ?? firstOutputLine(result.stderr);
  if (!version) {
    return {
      status: 'unavailable',
      version: null,
      error: `${command} --version produced no output.`
    };
  }
  return { status: 'ok', version };
}

function compareCodexBinaryVersions(
  active: CodexCliBinaryProbe,
  appBundle: CodexAppBundleBinaryProbe
): CodexCliVersionDrift {
  if (appBundle.status === 'absent') {
    return { status: 'not_applicable', message: null };
  }
  if (active.status !== 'ok' || appBundle.status !== 'ok' || !active.version || !appBundle.version) {
    return {
      status: 'unknown',
      message:
        'Codex binary provenance is incomplete because one or more version probes failed; no version drift decision was made.'
    };
  }
  if (active.version === appBundle.version) {
    return { status: 'ok', message: null };
  }
  return {
    status: 'advisory',
    message:
      `Active Codex CLI version ${active.version} (${active.path ?? active.command}) differs from app bundle version ${appBundle.version} (${appBundle.path}).`
  };
}

function firstOutputLine(output: string | null | undefined): string | null {
  const line = output
    ?.split(/\r?\n/u)
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  return line ?? null;
}

function normalizeProbeError(output: string | null | undefined): string | null {
  return firstOutputLine(output);
}

function isTrueFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    default:
      return false;
  }
}

function sha256FileSync(path: string): string {
  const hash = createHash('sha256');
  hash.update(readFileSync(path));
  return hash.digest('hex');
}
