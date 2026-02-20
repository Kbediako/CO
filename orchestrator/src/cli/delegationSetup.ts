import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { resolveCodexCliBin } from './utils/codexCli.js';
import { resolveCodexHome } from './utils/codexPaths.js';
import { buildCommandPreview } from './utils/commandPreview.js';

export interface DelegationSetupOptions {
  apply?: boolean;
  repoRoot?: string;
  env?: NodeJS.ProcessEnv;
}

export interface DelegationSetupResult {
  status: 'planned' | 'applied' | 'skipped';
  reason?: string;
  plan: {
    codexBin: string;
    codexHome: string;
    repoRoot: string;
    commandLine: string;
  };
  readiness: {
    configured: boolean;
    configPath: string;
  };
}

export async function runDelegationSetup(options: DelegationSetupOptions = {}): Promise<DelegationSetupResult> {
  const env = options.env ?? process.env;
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const codexBin = resolveCodexCliBin(env);
  const codexHome = resolveCodexHome(env);
  const configPath = join(codexHome, 'config.toml');

  const plan = {
    codexBin,
    codexHome,
    repoRoot,
    commandLine: buildCommandPreview(codexBin, [
      'mcp',
      'add',
      'delegation',
      '--',
      'codex-orchestrator',
      'delegate-server',
      '--repo',
      repoRoot
    ])
  };

  const probe = inspectDelegationReadiness({ codexBin, configPath, repoRoot, env });
  const readiness = { configured: probe.configured, configPath };

  if (!options.apply) {
    return { status: 'planned', plan, readiness };
  }

  if (probe.configured) {
    return { status: 'skipped', reason: probe.reason ?? 'Delegation MCP is already configured.', plan, readiness };
  }

  await applyDelegationSetup(
    { codexBin, repoRoot, removeExisting: probe.removeExisting, envVars: probe.envVars },
    env
  );
  const configuredAfter = inspectDelegationReadiness({ codexBin, configPath, repoRoot, env }).configured;
  return {
    status: 'applied',
    reason: probe.reason,
    plan,
    readiness: { ...readiness, configured: configuredAfter }
  };
}

export function formatDelegationSetupSummary(result: DelegationSetupResult): string[] {
  const lines: string[] = [];
  lines.push(`Delegation setup: ${result.status}`);
  if (result.reason) {
    lines.push(`Note: ${result.reason}`);
  }
  lines.push(`- Codex home: ${result.plan.codexHome}`);
  lines.push(`- Config: ${result.readiness.configured ? 'ok' : 'missing'} (${result.readiness.configPath})`);
  lines.push(`- Command: ${result.plan.commandLine}`);
  if (result.status === 'planned') {
    lines.push('Run with --yes to apply this setup.');
  }
  return lines;
}

function inspectDelegationReadiness(options: {
  codexBin: string;
  configPath: string;
  repoRoot: string;
  env: NodeJS.ProcessEnv;
}): { configured: boolean; removeExisting: boolean; envVars: Record<string, string>; reason?: string } {
  const requestedRepo = resolve(options.repoRoot);
  const existing = readDelegationMcpServer(options.codexBin, options.env);
  if (existing) {
    const envVars = existing.envVars;
    const isDelegationServer = existing.args.includes('delegate-server') || existing.args.includes('delegation-server');
    if (!isDelegationServer) {
      return {
        configured: false,
        removeExisting: true,
        envVars,
        reason: 'Existing delegation MCP entry does not point to codex-orchestrator delegate-server; reconfiguring.'
      };
    }
    if (existing.pinnedRepo) {
      const pinnedRepo = resolve(existing.pinnedRepo);
      if (pinnedRepo !== requestedRepo) {
        return {
          configured: false,
          removeExisting: true,
          envVars,
          reason: `Existing delegation MCP entry is pinned to ${existing.pinnedRepo}; reconfiguring.`
        };
      }
      return {
        configured: true,
        removeExisting: false,
        envVars,
        reason: `Delegation MCP is already configured (pinned to ${existing.pinnedRepo}).`
      };
    }
    return {
      configured: false,
      removeExisting: true,
      envVars,
      reason: `Existing delegation MCP entry is not pinned; reconfiguring to ${requestedRepo}.`
    };
  }

  // Fall back to directly scanning config.toml when the Codex CLI probe is unavailable.
  return inspectDelegationReadinessFallback(options.configPath, requestedRepo);
}

function applyDelegationSetup(
  plan: { codexBin: string; repoRoot: string; removeExisting: boolean; envVars: Record<string, string> },
  env: NodeJS.ProcessEnv
): Promise<void> {
  const envFlags: string[] = [];
  for (const [key, value] of Object.entries(plan.envVars ?? {})) {
    envFlags.push('--env', `${key}=${value}`);
  }
  return new Promise<void>((resolve, reject) => {
    const runAdd = () => {
      const child = spawn(
        plan.codexBin,
        [
          'mcp',
          'add',
          'delegation',
          ...envFlags,
          '--',
          'codex-orchestrator',
          'delegate-server',
          '--repo',
          plan.repoRoot
        ],
        { stdio: 'inherit', env }
      );
      child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
      child.once('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`codex mcp add exited with code ${code ?? 'unknown'}`));
        }
      });
    };

    if (!plan.removeExisting) {
      runAdd();
      return;
    }

    const child = spawn(plan.codexBin, ['mcp', 'remove', 'delegation'], { stdio: 'inherit', env });
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        runAdd();
      } else {
        reject(new Error(`codex mcp remove exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

function readDelegationMcpServer(
  codexBin: string,
  env: NodeJS.ProcessEnv
): { args: string[]; pinnedRepo: string | null; envVars: Record<string, string> } | null {
  const result = spawnSync(codexBin, ['mcp', 'get', 'delegation', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
    env
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  const stdout = String(result.stdout ?? '').trim();
  if (!stdout) {
    return null;
  }
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    const transport = parsed.transport as Record<string, unknown> | undefined;
    const args = Array.isArray(transport?.args)
      ? (transport!.args as unknown[]).filter((value) => typeof value === 'string') as string[]
      : [];
    const envVars: Record<string, string> = {};
    const envRecord = transport?.env;
    if (envRecord && typeof envRecord === 'object' && !Array.isArray(envRecord)) {
      for (const [key, value] of Object.entries(envRecord as Record<string, unknown>)) {
        if (typeof value === 'string') {
          envVars[key] = value;
        }
      }
    }
    const pinnedRepo = readPinnedRepo(args);
    return { args, pinnedRepo, envVars };
  } catch {
    return null;
  }
}

function readPinnedRepo(args: string[]): string | null {
  const index = args.indexOf('--repo');
  if (index === -1) {
    return null;
  }
  const candidate = args[index + 1];
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
}

function inspectDelegationReadinessFallback(
  configPath: string,
  requestedRepo: string
): { configured: boolean; removeExisting: boolean; envVars: Record<string, string>; reason?: string } {
  const config = readDelegationFallbackConfig(configPath);
  if (!config) {
    return { configured: false, removeExisting: false, envVars: {} };
  }

  const pinnedRepo = readPinnedRepo(config.args);
  if (!pinnedRepo) {
    return {
      configured: false,
      removeExisting: true,
      envVars: config.envVars,
      reason: `Existing delegation MCP entry is not pinned; reconfiguring to ${requestedRepo}.`
    };
  }

  const normalizedPinned = resolve(pinnedRepo);
  if (normalizedPinned !== requestedRepo) {
    return {
      configured: false,
      removeExisting: true,
      envVars: config.envVars,
      reason: `Existing delegation MCP entry is pinned to ${pinnedRepo}; reconfiguring.`
    };
  }

  return {
    configured: true,
    removeExisting: false,
    envVars: config.envVars,
    reason: `Delegation MCP is already configured (pinned to ${pinnedRepo}).`
  };
}

function readDelegationFallbackConfig(configPath: string): { args: string[]; envVars: Record<string, string> } | null {
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const raw = readFileSync(configPath, 'utf8');
    if (!hasMcpServerEntry(raw, 'delegation')) {
      return null;
    }
    return {
      args: readDelegationArgsFromConfig(raw),
      envVars: readDelegationEnvVarsFromConfig(raw)
    };
  } catch {
    return null;
  }
}

function readDelegationArgsFromConfig(raw: string): string[] {
  const sectionMatch = raw.match(/\[mcp_servers(?:\.delegation|\."delegation"|.'delegation')\]([\s\S]*?)(?=\n\[|$)/u);
  if (!sectionMatch) {
    return [];
  }
  const section = sectionMatch[1] ?? '';
  const argsMatch = section.match(/^\s*args\s*=\s*\[([\s\S]*?)\]/mu);
  if (!argsMatch) {
    return [];
  }
  const argsRaw = argsMatch[1] ?? '';
  const args: string[] = [];
  const tokenPattern = /"((?:\\"|[^"])*)"|'((?:\\'|[^'])*)'/gu;
  let token = tokenPattern.exec(argsRaw);
  while (token) {
    const quoted = token[1] ?? token[2] ?? '';
    const decoded = quoted.replace(/\\"/gu, '"').replace(/\\'/gu, '\'');
    args.push(decoded);
    token = tokenPattern.exec(argsRaw);
  }
  return args;
}

function readDelegationEnvVarsFromConfig(raw: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  const sectionMatch = raw.match(
    /\[mcp_servers(?:\.delegation|\."delegation"|.'delegation')\.env\]([\s\S]*?)(?=\n\[|$)/u
  );
  if (!sectionMatch) {
    return envVars;
  }
  const section = sectionMatch[1] ?? '';
  const linePattern = /^\s*([A-Za-z0-9_.-]+)\s*=\s*("(?:\\"|[^"])*"|'(?:\\'|[^'])*')\s*$/gmu;
  let match = linePattern.exec(section);
  while (match) {
    const key = match[1];
    const rawValue = match[2] ?? '';
    if (key) {
      const unquoted = rawValue.slice(1, -1);
      const decoded = unquoted.replace(/\\"/gu, '"').replace(/\\'/gu, '\'');
      envVars[key] = decoded;
    }
    match = linePattern.exec(section);
  }
  return envVars;
}

function hasMcpServerEntry(raw: string, serverName: string): boolean {
  const lines = raw.split('\n');
  let currentTable: string | null = null;

  for (const line of lines) {
    const trimmed = stripTomlComment(line).trim();
    if (!trimmed) {
      continue;
    }
    const tableMatch = trimmed.match(/^\[(.+)\]$/u);
    if (tableMatch) {
      currentTable = tableMatch[1]?.trim() ?? null;
      if (
        currentTable === `mcp_servers.${serverName}` ||
        currentTable === `mcp_servers."${serverName}"` ||
        currentTable === `mcp_servers.'${serverName}'`
      ) {
        return true;
      }
      continue;
    }

    if (trimmed.startsWith('mcp_servers.')) {
      if (trimmed.startsWith(`mcp_servers."${serverName}".`)) {
        return true;
      }
      if (trimmed.startsWith(`mcp_servers.'${serverName}'.`)) {
        return true;
      }
      if (trimmed.startsWith(`mcp_servers.${serverName}.`)) {
        return true;
      }
      if (trimmed.startsWith(`mcp_servers."${serverName}"=`)) {
        return true;
      }
      if (trimmed.startsWith(`mcp_servers.'${serverName}'=`)) {
        return true;
      }
      if (trimmed.startsWith(`mcp_servers.${serverName}=`)) {
        return true;
      }
    }

    if (currentTable === 'mcp_servers') {
      const entryPattern = new RegExp(`^"?${escapeRegExp(serverName)}"?\\s*=`, 'u');
      if (entryPattern.test(trimmed)) {
        return true;
      }
    }
  }

  return false;
}

function stripTomlComment(line: string): string {
  const index = line.indexOf('#');
  if (index === -1) {
    return line;
  }
  return line.slice(0, index);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
