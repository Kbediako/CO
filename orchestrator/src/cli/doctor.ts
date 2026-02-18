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
import {
  isManagedCodexCliEnabled,
  resolveCodexCliBin,
  resolveCodexCliReadiness,
  type CodexCliReadiness
} from './utils/codexCli.js';
import { resolveCodexHome } from './utils/codexPaths.js';
import { resolveOptionalDependency, type OptionalResolutionSource } from './utils/optionalDeps.js';
import { runCloudPreflight, type CloudPreflightIssue } from './utils/cloudPreflight.js';

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
      managed_opt_in: boolean;
    };
    managed: CodexCliReadiness;
  };
  collab: {
    status: 'ok' | 'disabled' | 'unavailable';
    enabled: boolean | null;
    feature_key: 'multi_agent' | 'collab' | null;
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

export interface DoctorCloudPreflightResult {
  ok: boolean;
  details: {
    codex_bin: string;
    environment_id: string | null;
    branch: string | null;
  };
  issues: CloudPreflightIssue[];
  guidance: string[];
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
              'Quick fix: codex-orchestrator doctor --apply --yes',
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
  const managedOptIn = isManagedCodexCliEnabled(process.env);
  const managedCodex = resolveCodexCliReadiness(process.env);

  const features = readCodexFeatureFlags(codexBin);
  const collabFeatureKey: DoctorResult['collab']['feature_key'] =
    features === null
      ? null
      : Object.prototype.hasOwnProperty.call(features, 'multi_agent')
        ? 'multi_agent'
        : Object.prototype.hasOwnProperty.call(features, 'collab')
          ? 'collab'
          : null;
  const collabEnabled =
    collabFeatureKey === 'multi_agent'
      ? features?.multi_agent ?? null
      : collabFeatureKey === 'collab'
        ? features?.collab ?? null
        : null;
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
      active: { command: codexBin, managed_opt_in: managedOptIn },
      managed: managedCodex
    },
    collab: {
      status: collabStatus,
      enabled: collabEnabled,
      feature_key: collabFeatureKey,
      enablement: [
        'Enable collab for symbolic RLM runs with: codex-orchestrator rlm --multi-agent auto "<goal>" (legacy: --collab auto).',
        'Or set: RLM_SYMBOLIC_MULTI_AGENT=1 (legacy alias: RLM_SYMBOLIC_COLLAB=1).',
        'If multi-agent is disabled in codex features: codex features enable multi_agent (legacy alias: collab)'
      ]
    },
    cloud: {
      status: cloudStatus,
      env_id_configured: cloudEnvIdConfigured,
      branch: cloudBranch,
      enablement: [
        'Set CODEX_CLOUD_ENV_ID to a valid Codex Cloud environment id.',
        'Optional: set CODEX_CLOUD_BRANCH (must exist on origin).',
        'Then run a pipeline stage in cloud mode with: codex-orchestrator start <pipeline> --cloud --target <stage-id>',
        'If cloud preflight fails, CO falls back to mcp and records the reason in manifest.summary (surfaced in start output).'
      ]
    },
    delegation: {
      status: delegationStatus,
      config: delegationConfig,
      enablement: [
        'Quick fix: codex-orchestrator doctor --apply --yes',
        'Run: codex-orchestrator delegation setup --yes',
        'Or manually: codex mcp add delegation -- codex-orchestrator delegate-server',
        "Enable for a run with: codex -c 'mcp_servers.delegation.enabled=true' ...",
        'See: codex-orchestrator init codex'
      ]
    }
  };
}

export async function runDoctorCloudPreflight(options: {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  environmentId?: string | null;
  branch?: string | null;
  taskId?: string | null;
} = {}): Promise<DoctorCloudPreflightResult> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const codexBin = resolveCodexCliBin(env);
  const taskId =
    normalizeOptionalString(options.taskId)
    ?? normalizeOptionalString(env.MCP_RUNNER_TASK_ID)
    ?? normalizeOptionalString(env.TASK)
    ?? normalizeOptionalString(env.CODEX_ORCHESTRATOR_TASK_ID);
  const environmentId =
    normalizeOptionalString(options.environmentId)
    ?? normalizeOptionalString(env.CODEX_CLOUD_ENV_ID)
    ?? resolveTaskMetadataCloudEnvironmentId(cwd, taskId);
  const branch = normalizeOptionalBranch(options.branch) ?? normalizeOptionalBranch(env.CODEX_CLOUD_BRANCH);

  const preflight = await runCloudPreflight({
    repoRoot: cwd,
    codexBin,
    environmentId,
    branch,
    env
  });
  const guidance = buildCloudPreflightGuidance(preflight.issues);

  return {
    ok: preflight.ok,
    details: {
      codex_bin: preflight.details.codexBin,
      environment_id: preflight.details.environmentId,
      branch: preflight.details.branch
    },
    issues: preflight.issues,
    guidance
  };
}

export function formatDoctorCloudPreflightSummary(result: DoctorCloudPreflightResult): string[] {
  const lines: string[] = [];
  lines.push(`Cloud preflight: ${result.ok ? 'ok' : 'failed'}`);
  lines.push(`  - codex bin: ${result.details.codex_bin}`);
  lines.push(`  - environment id: ${result.details.environment_id ?? '<unset>'}`);
  lines.push(`  - branch: ${result.details.branch ?? '<unset>'}`);

  if (result.issues.length > 0) {
    lines.push('  - issues:');
    for (const issue of result.issues) {
      lines.push(`    - [${issue.code}] ${issue.message}`);
    }
  }

  if (result.guidance.length > 0) {
    lines.push('  - guidance:');
    for (const item of result.guidance) {
      lines.push(`    - ${item}`);
    }
  }

  return lines;
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
  lines.push(
    `  - managed opt-in: ${result.codex_cli.active.managed_opt_in ? 'enabled' : 'disabled'} (set CODEX_CLI_USE_MANAGED=1)`
  );
  lines.push(`  - managed: ${result.codex_cli.managed.status} (${result.codex_cli.managed.config.path})`);
  if (result.codex_cli.managed.status === 'invalid' && result.codex_cli.managed.config.error) {
    lines.push(`    error: ${result.codex_cli.managed.config.error}`);
  }
  if (result.codex_cli.managed.status === 'ok') {
    lines.push(`  - binary: ${result.codex_cli.managed.binary.status} (${result.codex_cli.managed.binary.path})`);
    if (!result.codex_cli.active.managed_opt_in) {
      lines.push('  - note: managed binary is installed but inactive; stock codex is currently selected.');
    }
    if (result.codex_cli.managed.install?.version) {
      lines.push(`  - version: ${result.codex_cli.managed.install.version}`);
    }
  }

  lines.push(`Collab: ${result.collab.status}`);
  if (result.collab.enabled !== null) {
    lines.push(`  - enabled: ${result.collab.enabled}`);
  }
  if (result.collab.feature_key) {
    lines.push(`  - feature key: ${result.collab.feature_key}`);
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

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalBranch(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.replace(/^refs\/heads\//u, '') : null;
}

function resolveTaskMetadataCloudEnvironmentId(repoRoot: string, taskId: string | null): string | null {
  if (!taskId) {
    return null;
  }
  const tasksPath = join(repoRoot, 'tasks', 'index.json');
  if (!existsSync(tasksPath)) {
    return null;
  }
  try {
    const raw = readFileSync(tasksPath, 'utf8');
    const parsed = JSON.parse(raw) as { items?: unknown };
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const match = items.find((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const record = item as Record<string, unknown>;
      return matchesTaskIdentifier(record.id, taskId) || matchesTaskIdentifier(record.slug, taskId);
    });
    if (!match || typeof match !== 'object') {
      return null;
    }
    const record = match as Record<string, unknown>;
    const metadata = (record.metadata ?? null) as Record<string, unknown> | null;
    const cloudMetadata =
      metadata && typeof metadata.cloud === 'object' && metadata.cloud
        ? (metadata.cloud as Record<string, unknown>)
        : null;
    const candidates: Array<string | null> = [
      normalizeOptionalString(typeof metadata?.cloudEnvId === 'string' ? metadata.cloudEnvId : null),
      normalizeOptionalString(typeof metadata?.cloud_env_id === 'string' ? metadata.cloud_env_id : null),
      normalizeOptionalString(typeof metadata?.envId === 'string' ? metadata.envId : null),
      normalizeOptionalString(typeof metadata?.environmentId === 'string' ? metadata.environmentId : null),
      normalizeOptionalString(typeof cloudMetadata?.envId === 'string' ? cloudMetadata.envId : null),
      normalizeOptionalString(typeof cloudMetadata?.environmentId === 'string' ? cloudMetadata.environmentId : null),
      normalizeOptionalString(typeof cloudMetadata?.cloudEnvId === 'string' ? cloudMetadata.cloudEnvId : null),
      normalizeOptionalString(typeof cloudMetadata?.cloud_env_id === 'string' ? cloudMetadata.cloud_env_id : null)
    ];
    return candidates.find((value): value is string => Boolean(value)) ?? null;
  } catch {
    return null;
  }
}

function matchesTaskIdentifier(value: unknown, taskId: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return false;
  }
  return normalized === taskId || taskId.startsWith(`${normalized}-`);
}

function buildCloudPreflightGuidance(issues: CloudPreflightIssue[]): string[] {
  if (issues.length === 0) {
    return ['Cloud preflight passed. You can run cloud mode with `--cloud --target <stage-id>`.'];
  }

  const guidance: string[] = [];
  for (const issue of issues) {
    switch (issue.code) {
      case 'missing_environment':
        guidance.push('Set CODEX_CLOUD_ENV_ID or provide target metadata.cloudEnvId.');
        break;
      case 'branch_missing':
        guidance.push('Push the branch to origin or set CODEX_CLOUD_BRANCH to an existing remote branch.');
        break;
      case 'codex_unavailable':
        guidance.push('Install Codex CLI or set CODEX_CLI_BIN to a valid codex binary.');
        break;
      case 'git_unavailable':
        guidance.push('Install git or run with CODEX_CLOUD_BRANCH unset to skip remote branch verification.');
        break;
      default:
        break;
    }
  }

  return [...new Set(guidance)];
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
