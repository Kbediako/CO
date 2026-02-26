import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';

import { resolveCodexHome } from './utils/codexPaths.js';
import { findPackageRoot } from './utils/packageInfo.js';
import { writeAtomicFile } from '../utils/atomicWrite.js';

const require = createRequire(import.meta.url);
const toml = require('@iarna/toml') as {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
};
const canonicalize = require('canonicalize') as (value: unknown) => string | undefined;

const BASELINE_MODEL = 'gpt-5.3-codex';
const BASELINE_REASONING = 'xhigh';
const BASELINE_AGENTS = {
  max_threads: 12,
  max_depth: 4,
  max_spawn_depth: 4
} as const;

interface RoleDefinition {
  key: 'explorer_fast' | 'worker_complex' | 'awaiter';
  description: string;
  fileName: 'explorer-fast.toml' | 'worker-complex.toml' | 'awaiter-high.toml';
  configFile: string;
  templatePath: string;
}

const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    key: 'explorer_fast',
    description: 'Fast explorer (spark text-only).',
    fileName: 'explorer-fast.toml',
    configFile: './agents/explorer-fast.toml',
    templatePath: join('templates', 'codex', '.codex', 'agents', 'explorer-fast.toml')
  },
  {
    key: 'worker_complex',
    description: 'Complex implementation role.',
    fileName: 'worker-complex.toml',
    configFile: './agents/worker-complex.toml',
    templatePath: join('templates', 'codex', '.codex', 'agents', 'worker-complex.toml')
  },
  {
    key: 'awaiter',
    description: 'Awaiter override (keeps awaiter behavior with latest codex/high reasoning).',
    fileName: 'awaiter-high.toml',
    configFile: './agents/awaiter-high.toml',
    templatePath: join('templates', 'codex', '.codex', 'agents', 'awaiter-high.toml')
  }
];

interface LoadedRoleDefinition extends RoleDefinition {
  content: string;
}

type SetupStatus = 'planned' | 'applied';
type ChangeStatus = 'pending' | 'unchanged' | 'created' | 'updated' | 'preserved';
type ChangeTarget = 'config' | 'role_file';

export interface CodexDefaultsSetupOptions {
  apply?: boolean;
  force?: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface CodexDefaultsSetupPlan {
  codexHome: string;
  configPath: string;
  agentsDir: string;
  force: boolean;
}

export interface CodexDefaultsSetupChange {
  target: ChangeTarget;
  name: string;
  path: string;
  status: ChangeStatus;
  detail: string;
}

export interface CodexDefaultsSetupResult {
  status: SetupStatus;
  plan: CodexDefaultsSetupPlan;
  changes: CodexDefaultsSetupChange[];
}

interface PlannedRoleChange {
  definition: LoadedRoleDefinition;
  path: string;
  existingContent: string | null;
  currentStatus: ChangeStatus;
  detail: string;
}

export async function runCodexDefaultsSetup(
  options: CodexDefaultsSetupOptions = {}
): Promise<CodexDefaultsSetupResult> {
  const env = options.env ?? process.env;
  const force = Boolean(options.force);
  const apply = Boolean(options.apply);
  const plan = buildPlan(env, force);
  const roleDefinitions = await loadRoleDefinitions();
  const configState = await loadConfigState(plan.configPath);
  const nextConfig = mergeBaselineDefaults(configState.parsed, roleDefinitions);
  const configChanged = canonicalize(configState.parsed) !== canonicalize(nextConfig);
  const roleChanges = await planRoleChanges(plan.agentsDir, force, roleDefinitions);

  if (!apply) {
    const changes = buildPlannedChanges({
      configPath: plan.configPath,
      configExists: configState.exists,
      configChanged,
      roleChanges
    });
    return {
      status: 'planned',
      plan,
      changes
    };
  }

  const changes: CodexDefaultsSetupChange[] = [];

  if (configChanged || !configState.exists) {
    const rendered = `${toml.stringify(nextConfig)}\n`;
    await writeAtomicFile(plan.configPath, rendered, { ensureDir: true, encoding: 'utf8' });
    changes.push({
      target: 'config',
      name: 'config.toml',
      path: plan.configPath,
      status: configState.exists ? 'updated' : 'created',
      detail: configState.exists
        ? 'Updated CO baseline defaults additively and preserved unrelated keys.'
        : 'Created config.toml with CO baseline defaults.'
    });
  } else {
    changes.push({
      target: 'config',
      name: 'config.toml',
      path: plan.configPath,
      status: 'unchanged',
      detail: 'CO baseline defaults already present.'
    });
  }

  await mkdir(plan.agentsDir, { recursive: true });

  for (const roleChange of roleChanges) {
    const shouldWrite =
      roleChange.existingContent === null
      || (force && roleChange.existingContent !== roleChange.definition.content);
    if (shouldWrite) {
      await writeAtomicFile(roleChange.path, roleChange.definition.content, {
        ensureDir: true,
        encoding: 'utf8'
      });
      changes.push({
        target: 'role_file',
        name: roleChange.definition.key,
        path: roleChange.path,
        status: roleChange.existingContent === null ? 'created' : 'updated',
        detail:
          roleChange.existingContent === null
            ? `Created ${roleChange.definition.fileName}.`
            : `Overwrote ${roleChange.definition.fileName} because --force was set.`
      });
      continue;
    }

    changes.push({
      target: 'role_file',
      name: roleChange.definition.key,
      path: roleChange.path,
      status: roleChange.currentStatus,
      detail: roleChange.detail
    });
  }

  return {
    status: 'applied',
    plan,
    changes
  };
}

export function formatCodexDefaultsSetupSummary(result: CodexDefaultsSetupResult): string[] {
  const lines: string[] = [];
  lines.push(`Codex defaults setup: ${result.status}`);
  lines.push(`- Codex home: ${result.plan.codexHome}`);
  lines.push(`- Config: ${result.plan.configPath}`);
  lines.push(`- Agents dir: ${result.plan.agentsDir}`);
  lines.push(`- Force overwrite: ${result.plan.force ? 'yes' : 'no'}`);
  lines.push('- Changes:');
  for (const change of result.changes) {
    lines.push(`  - ${change.target}:${change.name} -> ${change.status} (${change.path})`);
    lines.push(`    ${change.detail}`);
  }
  if (result.status === 'planned') {
    lines.push('Run with --yes to apply this setup.');
  }
  return lines;
}

function buildPlan(env: NodeJS.ProcessEnv, force: boolean): CodexDefaultsSetupPlan {
  const codexHome = resolveCodexHome(env);
  return {
    codexHome,
    configPath: join(codexHome, 'config.toml'),
    agentsDir: join(codexHome, 'agents'),
    force
  };
}

async function loadConfigState(configPath: string): Promise<{ exists: boolean; parsed: Record<string, unknown> }> {
  if (!existsSync(configPath)) {
    return { exists: false, parsed: {} };
  }

  const raw = await readFile(configPath, 'utf8');
  try {
    const parsed = toml.parse(raw);
    if (!isRecord(parsed)) {
      throw new Error('top-level TOML document must be a table.');
    }
    return { exists: true, parsed: parsed as Record<string, unknown> };
  } catch (error) {
    const reason = (error as Error)?.message ?? String(error);
    throw new Error(`Failed to parse Codex config TOML at ${configPath}: ${reason}`);
  }
}

function mergeBaselineDefaults(
  existing: Record<string, unknown>,
  roleDefinitions: readonly LoadedRoleDefinition[]
): Record<string, unknown> {
  const next = structuredClone(existing);
  next.model = BASELINE_MODEL;
  next.model_reasoning_effort = BASELINE_REASONING;

  const agents = isRecord(next.agents) ? structuredClone(next.agents as Record<string, unknown>) : {};
  agents.max_threads = BASELINE_AGENTS.max_threads;
  agents.max_depth = BASELINE_AGENTS.max_depth;
  agents.max_spawn_depth = BASELINE_AGENTS.max_spawn_depth;

  for (const role of roleDefinitions) {
    const existingRole = isRecord(agents[role.key])
      ? structuredClone(agents[role.key] as Record<string, unknown>)
      : {};
    existingRole.description = role.description;
    existingRole.config_file = role.configFile;
    agents[role.key] = existingRole;
  }

  next.agents = agents;
  return next;
}

async function planRoleChanges(
  agentsDir: string,
  force: boolean,
  roleDefinitions: readonly LoadedRoleDefinition[]
): Promise<PlannedRoleChange[]> {
  const changes: PlannedRoleChange[] = [];

  for (const definition of roleDefinitions) {
    const path = join(agentsDir, definition.fileName);
    if (!existsSync(path)) {
      changes.push({
        definition,
        path,
        existingContent: null,
        currentStatus: 'pending',
        detail: `Will create ${definition.fileName}.`
      });
      continue;
    }

    const current = await readFile(path, 'utf8');
    if (current === definition.content) {
      changes.push({
        definition,
        path,
        existingContent: current,
        currentStatus: 'unchanged',
        detail: `${definition.fileName} already matches CO baseline defaults.`
      });
      continue;
    }

    if (force) {
      changes.push({
        definition,
        path,
        existingContent: current,
        currentStatus: 'pending',
        detail: `Will overwrite ${definition.fileName} because --force is set.`
      });
      continue;
    }

    changes.push({
      definition,
      path,
      existingContent: current,
      currentStatus: 'preserved',
      detail: `${definition.fileName} already exists; preserving without --force.`
    });
  }

  return changes;
}

async function loadRoleDefinitions(): Promise<LoadedRoleDefinition[]> {
  const packageRoot = findPackageRoot();
  const loaded: LoadedRoleDefinition[] = [];
  for (const definition of ROLE_DEFINITIONS) {
    const templateFile = join(packageRoot, definition.templatePath);
    let content: string;
    try {
      content = await readFile(templateFile, 'utf8');
    } catch (error) {
      const reason = (error as Error)?.message ?? String(error);
      throw new Error(`Unable to read role template ${templateFile}: ${reason}`);
    }
    loaded.push({ ...definition, content });
  }
  return loaded;
}

function buildPlannedChanges(params: {
  configPath: string;
  configExists: boolean;
  configChanged: boolean;
  roleChanges: PlannedRoleChange[];
}): CodexDefaultsSetupChange[] {
  const changes: CodexDefaultsSetupChange[] = [];
  const configStatus: ChangeStatus = params.configChanged || !params.configExists ? 'pending' : 'unchanged';
  changes.push({
    target: 'config',
    name: 'config.toml',
    path: params.configPath,
    status: configStatus,
    detail: configStatus === 'pending'
      ? params.configExists
        ? 'Will update CO baseline defaults additively while preserving unrelated keys.'
        : 'Will create config.toml with CO baseline defaults.'
      : 'CO baseline defaults already present.'
  });

  for (const roleChange of params.roleChanges) {
    changes.push({
      target: 'role_file',
      name: roleChange.definition.key,
      path: roleChange.path,
      status: roleChange.currentStatus,
      detail: roleChange.detail
    });
  }

  return changes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}
