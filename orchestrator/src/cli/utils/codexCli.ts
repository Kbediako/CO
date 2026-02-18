import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const CONFIG_FILENAME = 'codex-cli.json';
const USE_MANAGED_ENV = 'CODEX_CLI_USE_MANAGED';

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
