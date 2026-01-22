import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import { EnvUtils } from '../../../../packages/shared/config/env.js';
import { resolveCodexCliBin } from './codexCli.js';
import { resolveCodexHome } from './codexPaths.js';

export const DEVTOOLS_SKILL_NAME = 'chrome-devtools';
export const DEVTOOLS_CONFIG_OVERRIDE = 'mcp_servers.chrome-devtools.enabled=true';
const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_MCP_CONFIG_OVERRIDES', 'CODEX_CONFIG_OVERRIDES'];
const DEVTOOLS_CONFIG_FILENAME = 'config.toml';
const DEVTOOLS_MCP_COMMAND = [
  'mcp',
  'add',
  DEVTOOLS_SKILL_NAME,
  '--',
  'npx',
  '-y',
  'chrome-devtools-mcp@latest',
  '--categoryEmulation',
  '--categoryPerformance',
  '--categoryNetwork'
];

const DEVTOOLS_CONFIG_SNIPPET = [
  '[mcp_servers.chrome-devtools]',
  'command = "npx"',
  'args = ["-y", "chrome-devtools-mcp@latest", "--categoryEmulation", "--categoryPerformance", "--categoryNetwork"]',
  'enabled = false'
].join('\n');

export interface DevtoolsConfigStatus {
  status: 'ok' | 'missing' | 'invalid';
  path: string;
  detail?: string;
  error?: string;
}

export interface DevtoolsReadiness {
  status: 'ok' | 'missing-skill' | 'missing-config' | 'missing-both' | 'invalid-config';
  skill: {
    status: 'ok' | 'missing';
    path: string;
  };
  config: DevtoolsConfigStatus;
}

export interface DevtoolsSetupPlan {
  codexHome: string;
  configPath: string;
  command: string;
  args: string[];
  commandLine: string;
  configSnippet: string;
}

export function isDevtoolsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.CODEX_REVIEW_DEVTOOLS;
  if (!raw) {
    return false;
  }
  return EnvUtils.isTrue(raw.trim().toLowerCase());
}

export function resolveCodexConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  return join(resolveCodexHome(env), DEVTOOLS_CONFIG_FILENAME);
}

export function resolveDevtoolsReadiness(env: NodeJS.ProcessEnv = process.env): DevtoolsReadiness {
  const codexHome = resolveCodexHome(env);
  const skillPath = join(codexHome, 'skills', DEVTOOLS_SKILL_NAME, 'SKILL.md');
  const skillInstalled = existsSync(skillPath);
  const config = inspectDevtoolsConfig(env);
  const configReady = config.status === 'ok';

  let status: DevtoolsReadiness['status'];
  if (config.status === 'invalid') {
    status = 'invalid-config';
  } else if (!skillInstalled && !configReady) {
    status = 'missing-both';
  } else if (!skillInstalled) {
    status = 'missing-skill';
  } else if (!configReady) {
    status = 'missing-config';
  } else {
    status = 'ok';
  }

  return {
    status,
    skill: {
      status: skillInstalled ? 'ok' : 'missing',
      path: skillPath
    },
    config
  };
}

export function buildDevtoolsSetupPlan(env: NodeJS.ProcessEnv = process.env): DevtoolsSetupPlan {
  const codexHome = resolveCodexHome(env);
  const configPath = resolveCodexConfigPath(env);
  const command = resolveCodexCliBin(env);
  const args = [...DEVTOOLS_MCP_COMMAND];
  return {
    codexHome,
    configPath,
    command,
    args,
    commandLine: [command, ...args].join(' '),
    configSnippet: DEVTOOLS_CONFIG_SNIPPET
  };
}

export function resolveCodexCommand(
  args: string[],
  env: NodeJS.ProcessEnv = process.env
): { command: string; args: string[] } {
  const overrides = parseConfigOverrides(env);

  if (!isDevtoolsEnabled(env)) {
    const command = resolveCodexCliBin(env);
    return { command, args: applyConfigOverrides(overrides, args) };
  }

  const readiness = resolveDevtoolsReadiness(env);
  if (readiness.status !== 'ok') {
    throw new Error(formatDevtoolsPreflightError(readiness));
  }

  const mergedOverrides = dedupeOverrides([DEVTOOLS_CONFIG_OVERRIDE, ...overrides]);
  const command = resolveCodexCliBin(env);
  return {
    command,
    args: applyConfigOverrides(mergedOverrides, args)
  };
}

export function formatDevtoolsPreflightError(readiness: DevtoolsReadiness): string {
  const lines: string[] = ['DevTools MCP is not ready for this run.'];
  lines.push(`- Skill: ${readiness.skill.status} (${readiness.skill.path})`);
  const configStatus =
    readiness.config.status === 'invalid'
      ? `invalid (${readiness.config.path})`
      : `${readiness.config.status} (${readiness.config.path})`;
  lines.push(`- Config: ${configStatus}`);
  if (readiness.config.detail) {
    lines.push(`  detail: ${readiness.config.detail}`);
  }
  if (readiness.config.error) {
    lines.push(`  error: ${readiness.config.error}`);
  }
  lines.push('Run `codex-orchestrator doctor --format json` for details.');
  lines.push('Run `codex-orchestrator devtools setup` to configure the MCP server.');
  return lines.join('\n');
}

function inspectDevtoolsConfig(env: NodeJS.ProcessEnv = process.env): DevtoolsConfigStatus {
  const configPath = resolveCodexConfigPath(env);
  if (!existsSync(configPath)) {
    return { status: 'missing', path: configPath, detail: 'config.toml not found' };
  }
  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (error) {
    return {
      status: 'invalid',
      path: configPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  const hasEntry = hasDevtoolsConfigEntry(raw);
  if (hasEntry) {
    return { status: 'ok', path: configPath };
  }
  return {
    status: 'missing',
    path: configPath,
    detail: 'chrome-devtools entry not found'
  };
}

function hasDevtoolsConfigEntry(raw: string): boolean {
  const lines = raw.split('\n');
  let currentTable: string | null = null;

  for (const line of lines) {
    const trimmed = stripTomlComment(line).trim();
    if (!trimmed) {
      continue;
    }
    const tableMatch = trimmed.match(/^\[(.+)\]$/);
    if (tableMatch) {
      currentTable = tableMatch[1]?.trim() ?? null;
      if (
        currentTable === 'mcp_servers.chrome-devtools' ||
        currentTable === 'mcp_servers."chrome-devtools"' ||
        currentTable === "mcp_servers.'chrome-devtools'"
      ) {
        return true;
      }
      continue;
    }

    if (trimmed.startsWith('mcp_servers.')) {
      if (trimmed.startsWith('mcp_servers."chrome-devtools".')) {
        return true;
      }
      if (trimmed.startsWith("mcp_servers.'chrome-devtools'.")) {
        return true;
      }
      if (trimmed.startsWith('mcp_servers.chrome-devtools.')) {
        return true;
      }
      if (trimmed.startsWith('mcp_servers."chrome-devtools"=')) {
        return true;
      }
      if (trimmed.startsWith("mcp_servers.'chrome-devtools'=")) {
        return true;
      }
      if (trimmed.startsWith('mcp_servers.chrome-devtools=')) {
        return true;
      }
    }

    if (currentTable === 'mcp_servers') {
      if (/^"?chrome-devtools"?\s*=/.test(trimmed)) {
        return true;
      }
    }
  }

  return false;
}

function parseConfigOverrides(env: NodeJS.ProcessEnv): string[] {
  const overrides: string[] = [];
  for (const key of CONFIG_OVERRIDE_ENV_KEYS) {
    const raw = env[key];
    if (!raw) {
      continue;
    }
    const parts = raw
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    overrides.push(...parts);
  }
  return dedupeOverrides(overrides);
}

function applyConfigOverrides(overrides: string[], args: string[]): string[] {
  if (overrides.length === 0) {
    return args;
  }
  const configArgs: string[] = [];
  for (const override of overrides) {
    configArgs.push('-c', override);
  }
  return [...configArgs, ...args];
}

function dedupeOverrides(overrides: string[]): string[] {
  return Array.from(new Set(overrides.filter((override) => override.trim().length > 0)));
}

function stripTomlComment(line: string): string {
  const index = line.indexOf('#');
  if (index === -1) {
    return line;
  }
  return line.slice(0, index);
}
