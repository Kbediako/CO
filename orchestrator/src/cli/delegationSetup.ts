import { spawn } from 'node:child_process';
import process from 'node:process';
import { join, resolve } from 'node:path';

import { resolveCodexCliBin } from './utils/codexCli.js';
import { resolveCodexHome } from './utils/codexPaths.js';
import { buildCommandPreview } from './utils/commandPreview.js';
import { readDelegationFallbackConfig } from './utils/delegationConfigParser.js';
import {
  classifyDelegationTransport,
  inspectDelegationMcpConfig,
  readPinnedRepo,
  resolveDelegationServerInvocation
} from './utils/delegationMcpHealth.js';

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
  const delegateServer = resolveDelegationServerInvocation({
    allowMissingDist: !options.apply,
    env,
    execPath: process.execPath
  });

  const plan = {
    codexBin,
    codexHome,
    repoRoot,
    commandLine: buildCommandPreview(codexBin, [
      'mcp',
      'add',
      'delegation',
      '--',
      delegateServer.command,
      ...delegateServer.args,
      '--repo',
      repoRoot
    ])
  };

  const probe = inspectDelegationReadiness({ configPath, repoRoot, env });
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
  const configuredAfter = inspectDelegationReadiness({ configPath, repoRoot, env }).configured;
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
  configPath: string;
  repoRoot: string;
  env: NodeJS.ProcessEnv;
}): { configured: boolean; removeExisting: boolean; envVars: Record<string, string>; reason?: string } {
  const requestedRepo = resolve(options.repoRoot);
  const snapshot = inspectDelegationMcpConfig(options.env);
  const existing = snapshot.entry;
  if (existing) {
    const envVars = existing.envVars;
    const isDelegationServer =
      existing.args.includes('delegate-server') || existing.args.includes('delegation-server');
    if (!isDelegationServer) {
      return {
        configured: false,
        removeExisting: true,
        envVars,
        reason: 'Existing delegation MCP entry does not point to codex-orchestrator delegate-server; reconfiguring.'
      };
    }
    const transport = classifyDelegationTransport(existing);
    if (transport.status !== 'safe') {
      return {
        configured: false,
        removeExisting: true,
        envVars,
        reason: `Existing delegation MCP entry uses ${transport.kind} transport; reconfiguring to the direct dist entrypoint.`
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
  const delegateServer = resolveDelegationServerInvocation({ env, execPath: process.execPath });
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
          delegateServer.command,
          ...delegateServer.args,
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

function inspectDelegationReadinessFallback(
  configPath: string,
  requestedRepo: string
): { configured: boolean; removeExisting: boolean; envVars: Record<string, string>; reason?: string } {
  const config = readDelegationFallbackConfig(configPath);
  if (!config) {
    return { configured: false, removeExisting: false, envVars: {} };
  }
  const isDelegationServer = config.args.includes('delegate-server') || config.args.includes('delegation-server');
  if (!isDelegationServer) {
    return {
      configured: false,
      removeExisting: true,
      envVars: config.envVars,
      reason: 'Existing delegation MCP entry does not point to codex-orchestrator delegate-server; reconfiguring.'
    };
  }
  const transport = classifyDelegationTransport({
    source: 'fallback',
    command: config.command,
    args: config.args,
    envVars: config.envVars,
    pinnedRepo: readPinnedRepo(config.args),
    commandLine: buildCommandPreview(config.command ?? '<missing>', config.args)
  });
  if (transport.status !== 'safe') {
    return {
      configured: false,
      removeExisting: true,
      envVars: config.envVars,
      reason: `Existing delegation MCP entry uses ${transport.kind} transport; reconfiguring to the direct dist entrypoint.`
    };
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
