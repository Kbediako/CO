import { spawn } from 'node:child_process';
import process from 'node:process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveCodexCliBin } from './utils/codexCli.js';
import { resolveCodexHome } from './utils/codexPaths.js';

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
  const repoRoot = options.repoRoot ?? process.cwd();
  const codexBin = resolveCodexCliBin(env);
  const codexHome = resolveCodexHome(env);
  const configPath = join(codexHome, 'config.toml');

  const plan = {
    codexBin,
    codexHome,
    repoRoot,
    commandLine: `${codexBin} mcp add delegation -- codex-orchestrator delegate-server --repo ${repoRoot}`
  };

  const configured = isDelegationConfigured(configPath);
  const readiness = { configured, configPath };

  if (!options.apply) {
    return { status: 'planned', plan, readiness };
  }

  if (configured) {
    return { status: 'skipped', reason: 'Delegation MCP is already configured.', plan, readiness };
  }

  await applyDelegationSetup({ codexBin, repoRoot }, env);
  const configuredAfter = isDelegationConfigured(configPath);
  return { status: 'applied', plan, readiness: { ...readiness, configured: configuredAfter } };
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

async function applyDelegationSetup(plan: { codexBin: string; repoRoot: string }, env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      plan.codexBin,
      ['mcp', 'add', 'delegation', '--', 'codex-orchestrator', 'delegate-server', '--repo', plan.repoRoot],
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
  });
}

function isDelegationConfigured(configPath: string): boolean {
  if (!existsSync(configPath)) {
    return false;
  }
  try {
    // Keep parsing loose; we only need to know whether a delegation entry exists.
    const raw = readFileSync(configPath, 'utf8');
    return hasMcpServerEntry(raw, 'delegation');
  } catch {
    return false;
  }
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
