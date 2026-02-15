import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildDevtoolsSetupPlan,
  DEVTOOLS_SKILL_NAME,
  resolveDevtoolsReadiness,
  type DevtoolsReadiness
} from './utils/devtools.js';
import { resolveCodexCliBin, resolveCodexCliReadiness, type CodexCliReadiness } from './utils/codexCli.js';
import { resolveCodexHome } from './utils/codexPaths.js';
import { resolveOptionalDependency, type OptionalResolutionSource } from './utils/optionalDeps.js';

const OPTIONAL_DEPENDENCIES = [
  {
    name: 'playwright',
    install: 'npm install --save-dev playwright && npx playwright install'
  },
  { name: 'pngjs', install: 'npm install --save-dev pngjs' },
  { name: 'pixelmatch', install: 'npm install --save-dev pixelmatch' },
  { name: 'cheerio', install: 'npm install --save-dev cheerio' }
];

export interface DoctorDependencyStatus {
  name: string;
  status: 'ok' | 'missing';
  source: OptionalResolutionSource;
  install?: string;
}

export interface DoctorDevtoolsStatus {
  status: DevtoolsReadiness['status'];
  skill: {
    name: string;
    status: 'ok' | 'missing';
    path: string;
    install?: string[];
  };
  config: {
    status: 'ok' | 'missing' | 'invalid';
    path: string;
    detail?: string;
    error?: string;
    install?: string[];
  };
  enablement: string[];
}

export interface DoctorResult {
  status: 'ok' | 'warning';
  missing: string[];
  dependencies: DoctorDependencyStatus[];
  devtools: DoctorDevtoolsStatus;
  codex_cli: {
    active: {
      command: string;
    };
    managed: CodexCliReadiness;
  };
  collab: {
    status: 'ok' | 'disabled' | 'unavailable';
    enabled: boolean | null;
    enablement: string[];
  };
  cloud: {
    status: 'ok' | 'not_configured' | 'unavailable';
    env_id_configured: boolean;
    branch: string | null;
    enablement: string[];
  };
  delegation: {
    status: 'ok' | 'missing-config' | 'unavailable';
    config: {
      status: 'ok' | 'missing';
      path: string;
      detail?: string;
    };
    enablement: string[];
  };
}

export function runDoctor(cwd: string = process.cwd()): DoctorResult {
  const dependencies: DoctorDependencyStatus[] = OPTIONAL_DEPENDENCIES.map((entry) => {
    const resolved = resolveOptionalDependency(entry.name, cwd);
    if (resolved.path) {
      return { name: entry.name, status: 'ok', source: resolved.source };
    }
    return {
      name: entry.name,
      status: 'missing',
      source: null,
      install: entry.install
    };
  });

  const readiness = resolveDevtoolsReadiness();
  const setupPlan = buildDevtoolsSetupPlan();
  const devtools: DoctorDevtoolsStatus = {
    status: readiness.status,
    skill: {
      name: DEVTOOLS_SKILL_NAME,
      status: readiness.skill.status,
      path: readiness.skill.path,
      install:
        readiness.skill.status === 'ok'
          ? undefined
          : [
              `Copy the ${DEVTOOLS_SKILL_NAME} skill into ${setupPlan.codexHome}/skills/${DEVTOOLS_SKILL_NAME}`,
              `Expected file: ${readiness.skill.path}`
            ]
    },
    config: {
      status: readiness.config.status,
      path: readiness.config.path,
      detail: readiness.config.detail,
      error: readiness.config.error,
      install:
        readiness.config.status === 'ok'
          ? undefined
          : [
              'Run: codex-orchestrator devtools setup',
              `Run: ${setupPlan.commandLine}`,
              `Config path: ${setupPlan.configPath}`,
              'Config snippet:',
              ...setupPlan.configSnippet.split('\n')
            ]
    },
    enablement: [
      'Enable DevTools for a run with CODEX_REVIEW_DEVTOOLS=1',
      "Or run Codex with: codex -c 'mcp_servers.chrome-devtools.enabled=true' ..."
    ]
  };

  const missing = dependencies.filter((dep) => dep.status === 'missing').map((dep) => dep.name);
  if (readiness.skill.status === 'missing') {
    missing.push(DEVTOOLS_SKILL_NAME);
  }
  if (readiness.config.status !== 'ok') {
    missing.push(`${DEVTOOLS_SKILL_NAME}-config`);
  }

  const codexBin = resolveCodexCliBin(process.env);
  const managedCodex = resolveCodexCliReadiness(process.env);

  const features = readCodexFeatureFlags(codexBin);
  const collabEnabled = features?.collab ?? null;
  const collabStatus: DoctorResult['collab']['status'] =
    features === null ? 'unavailable' : collabEnabled ? 'ok' : 'disabled';

  const cloudCmdAvailable = canRunCommand(codexBin, ['cloud', '--help']);
  const cloudEnvIdConfigured =
    typeof process.env.CODEX_CLOUD_ENV_ID === 'string' && process.env.CODEX_CLOUD_ENV_ID.trim().length > 0;
  const cloudBranch =
    typeof process.env.CODEX_CLOUD_BRANCH === 'string' && process.env.CODEX_CLOUD_BRANCH.trim().length > 0
      ? process.env.CODEX_CLOUD_BRANCH.trim().replace(/^refs\/heads\//u, '')
      : null;
  const cloudStatus: DoctorResult['cloud']['status'] =
    !cloudCmdAvailable ? 'unavailable' : cloudEnvIdConfigured ? 'ok' : 'not_configured';

  const delegationConfig = inspectDelegationConfig();
  const delegationStatus: DoctorResult['delegation']['status'] =
    delegationConfig.status === 'ok' ? 'ok' : 'missing-config';

  return {
    status: missing.length === 0 ? 'ok' : 'warning',
    missing,
    dependencies,
    devtools,
    codex_cli: {
      active: { command: codexBin },
      managed: managedCodex
    },
    collab: {
      status: collabStatus,
      enabled: collabEnabled,
      enablement: [
        'Enable collab for symbolic RLM runs with: codex-orchestrator rlm --collab "<goal>"',
        'Or set: RLM_SYMBOLIC_COLLAB=1 (implies symbolic mode when using --collab).',
        'If collab is disabled in codex features: codex features enable collab'
      ]
    },
    cloud: {
      status: cloudStatus,
      env_id_configured: cloudEnvIdConfigured,
      branch: cloudBranch,
      enablement: [
        'Set CODEX_CLOUD_ENV_ID to a valid Codex Cloud environment id.',
        'Optional: set CODEX_CLOUD_BRANCH (must exist on origin).',
        'Then run a pipeline stage in cloud mode with: codex-orchestrator start <pipeline> --cloud --target <stage-id>'
      ]
    },
    delegation: {
      status: delegationStatus,
      config: delegationConfig,
      enablement: [
        'Run: codex-orchestrator delegation setup --yes',
        'Or manually: codex mcp add delegation -- codex-orchestrator delegate-server',
        "Enable for a run with: codex -c 'mcp_servers.delegation.enabled=true' ...",
        'See: codex-orchestrator init codex'
      ]
    }
  };
}

export function formatDoctorSummary(result: DoctorResult): string[] {
  const lines: string[] = [];
  lines.push(`Status: ${result.status}`);

  for (const dep of result.dependencies) {
    if (dep.status === 'ok') {
      const source = dep.source ? ` (${dep.source})` : '';
      lines.push(`  - ${dep.name}: ok${source}`);
    } else {
      lines.push(`  - ${dep.name}: missing`);
      if (dep.install) {
        lines.push(`    install: ${dep.install}`);
      }
    }
  }

  lines.push(`DevTools: ${result.devtools.status}`);
  if (result.devtools.skill.status === 'ok') {
    lines.push(`  - ${result.devtools.skill.name}: ok (${result.devtools.skill.path})`);
  } else {
    lines.push(`  - ${result.devtools.skill.name}: missing`);
    for (const instruction of result.devtools.skill.install ?? []) {
      lines.push(`    install: ${instruction}`);
    }
  }
  if (result.devtools.config.status === 'ok') {
    lines.push(`  - config.toml: ok (${result.devtools.config.path})`);
  } else {
    const label =
      result.devtools.config.status === 'invalid'
        ? `invalid (${result.devtools.config.path})`
        : `missing (${result.devtools.config.path})`;
    lines.push(`  - config.toml: ${label}`);
    if (result.devtools.config.detail) {
      lines.push(`    detail: ${result.devtools.config.detail}`);
    }
    if (result.devtools.config.error) {
      lines.push(`    error: ${result.devtools.config.error}`);
    }
    for (const instruction of result.devtools.config.install ?? []) {
      lines.push(`    install: ${instruction}`);
    }
  }
  for (const line of result.devtools.enablement) {
    lines.push(`  - ${line}`);
  }

  lines.push(`Codex CLI: ${result.codex_cli.active.command}`);
  lines.push(`  - managed: ${result.codex_cli.managed.status} (${result.codex_cli.managed.config.path})`);
  if (result.codex_cli.managed.status === 'invalid' && result.codex_cli.managed.config.error) {
    lines.push(`    error: ${result.codex_cli.managed.config.error}`);
  }
  if (result.codex_cli.managed.status === 'ok') {
    lines.push(`  - binary: ${result.codex_cli.managed.binary.status} (${result.codex_cli.managed.binary.path})`);
    if (result.codex_cli.managed.install?.version) {
      lines.push(`  - version: ${result.codex_cli.managed.install.version}`);
    }
  }

  lines.push(`Collab: ${result.collab.status}`);
  if (result.collab.enabled !== null) {
    lines.push(`  - enabled: ${result.collab.enabled}`);
  }
  for (const line of result.collab.enablement) {
    lines.push(`  - ${line}`);
  }

  lines.push(`Cloud: ${result.cloud.status}`);
  lines.push(`  - CODEX_CLOUD_ENV_ID: ${result.cloud.env_id_configured ? 'set' : 'missing'}`);
  lines.push(`  - CODEX_CLOUD_BRANCH: ${result.cloud.branch ?? '<unset>'}`);
  for (const line of result.cloud.enablement) {
    lines.push(`  - ${line}`);
  }

  lines.push(`Delegation: ${result.delegation.status}`);
  const delegationConfigLabel =
    result.delegation.config.status === 'ok'
      ? `ok (${result.delegation.config.path})`
      : `missing (${result.delegation.config.path})`;
  lines.push(`  - config.toml: ${delegationConfigLabel}`);
  if (result.delegation.config.detail) {
    lines.push(`    detail: ${result.delegation.config.detail}`);
  }
  for (const line of result.delegation.enablement) {
    lines.push(`  - ${line}`);
  }

  return lines;
}

function readCodexFeatureFlags(codexBin: string): Record<string, boolean> | null {
  const result = spawnSync(codexBin, ['features', 'list'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  const stdout = String(result.stdout ?? '');
  const flags: Record<string, boolean> = {};
  for (const line of stdout.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const tokens = trimmed.split(/\s+/u);
    if (tokens.length < 2) {
      continue;
    }
    const name = tokens[0] ?? '';
    const enabledToken = tokens[tokens.length - 1] ?? '';
    if (!name) {
      continue;
    }
    if (enabledToken === 'true') {
      flags[name] = true;
    } else if (enabledToken === 'false') {
      flags[name] = false;
    }
  }
  return flags;
}

function canRunCommand(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'ignore'],
    timeout: 5000
  });
  if (result.error) {
    return false;
  }
  return result.status === 0;
}

function inspectDelegationConfig(env: NodeJS.ProcessEnv = process.env): { status: 'ok' | 'missing'; path: string; detail?: string } {
  const codexHome = resolveCodexHome(env);
  const configPath = join(codexHome, 'config.toml');
  if (!existsSync(configPath)) {
    return { status: 'missing', path: configPath, detail: 'config.toml not found' };
  }
  try {
    const raw = readFileSync(configPath, 'utf8');
    const hasEntry = hasMcpServerEntry(raw, 'delegation');
    if (hasEntry) {
      return { status: 'ok', path: configPath };
    }
    return { status: 'missing', path: configPath, detail: 'mcp_servers.delegation entry not found' };
  } catch (error) {
    return {
      status: 'missing',
      path: configPath,
      detail: error instanceof Error ? error.message : String(error)
    };
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
