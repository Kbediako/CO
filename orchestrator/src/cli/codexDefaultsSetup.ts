import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';

import { resolveCodexHome } from './utils/codexPaths.js';
import { findPackageRoot } from './utils/packageInfo.js';
import { writeAtomicFile } from '../utils/atomicWrite.js';

const require = createRequire(import.meta.url);
let tomlLibrary:
  | {
      parse: (source: string) => unknown;
      stringify: (value: unknown) => string;
    }
  | null
  | undefined;

export const BASELINE_MODEL = 'gpt-5.5';
export const BASELINE_REVIEW_MODEL = BASELINE_MODEL;
export const BASELINE_REASONING = 'xhigh';
export const BASELINE_REASONING_MINIMUM = 'high';
export const BASELINE_AGENTS = {
  max_threads: 12,
  max_depth: 4
} as const;

interface RoleDefinition {
  key: 'explorer_fast' | 'worker_complex' | 'awaiter';
  description: string;
  fileName: 'explorer-fast.toml' | 'worker-complex.toml' | 'awaiter-high.toml';
  configFile: string;
  templatePath: string;
  model?: string;
  modelReasoningEffort?: string;
  managedMigrationReasoningEfforts?: readonly ManagedMigrationReasoningEffort[];
}

const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    key: 'explorer_fast',
    description: 'Fast explorer (spark file/codebase search only).',
    fileName: 'explorer-fast.toml',
    configFile: './agents/explorer-fast.toml',
    templatePath: join('templates', 'codex', '.codex', 'agents', 'explorer-fast.toml')
  },
  {
    key: 'worker_complex',
    description: 'Complex implementation role.',
    fileName: 'worker-complex.toml',
    configFile: './agents/worker-complex.toml',
    templatePath: join('templates', 'codex', '.codex', 'agents', 'worker-complex.toml'),
    model: BASELINE_MODEL,
    modelReasoningEffort: BASELINE_REASONING,
    managedMigrationReasoningEfforts: ['xhigh']
  },
  {
    key: 'awaiter',
    description: 'Awaiter override (keeps awaiter behavior with latest codex/xhigh reasoning).',
    fileName: 'awaiter-high.toml',
    configFile: './agents/awaiter-high.toml',
    templatePath: join('templates', 'codex', '.codex', 'agents', 'awaiter-high.toml'),
    model: BASELINE_MODEL,
    modelReasoningEffort: BASELINE_REASONING,
    managedMigrationReasoningEfforts: ['high']
  }
];

const MANAGED_MIGRATION_MODEL = 'gpt-5.4';
type ManagedMigrationReasoningEffort = 'high' | 'xhigh';

interface LoadedRoleDefinition extends RoleDefinition {
  content: string;
  managedMigrationContents: readonly string[];
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
  writeReason: 'create' | 'force' | 'managed_migration' | null;
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
  const configChanged =
    canonicalizeConfigValue(configState.parsed) !== canonicalizeConfigValue(nextConfig);
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
    const rendered = `${getTomlLibrary().stringify(nextConfig)}\n`;
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
    if (roleChange.writeReason) {
      await writeAtomicFile(roleChange.path, roleChange.definition.content, {
        ensureDir: true,
        encoding: 'utf8'
      });
      changes.push({
        target: 'role_file',
        name: roleChange.definition.key,
        path: roleChange.path,
        status: roleChange.existingContent === null ? 'created' : 'updated',
        detail: formatAppliedRoleWriteDetail(roleChange)
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
    const parsed = getTomlLibrary().parse(raw);
    if (!isRecord(parsed)) {
      throw new Error('top-level TOML document must be a table.');
    }
    return { exists: true, parsed: parsed as Record<string, unknown> };
  } catch (error) {
    const reason = (error as Error)?.message ?? String(error);
    throw new Error(`Failed to parse Codex config TOML at ${configPath}: ${reason}`);
  }
}

function getTomlLibrary(): {
  parse: (source: string) => unknown;
  stringify: (value: unknown) => string;
} {
  if (tomlLibrary) {
    return tomlLibrary;
  }
  if (tomlLibrary === null) {
    throw new Error('Failed to load @iarna/toml.');
  }
  try {
    tomlLibrary = require('@iarna/toml') as {
      parse: (source: string) => unknown;
      stringify: (value: unknown) => string;
    };
    return tomlLibrary;
  } catch (error) {
    tomlLibrary = null;
    throw error;
  }
}

function canonicalizeConfigValue(value: unknown): string | undefined {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeConfigValue(entry) ?? 'null').join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .flatMap(([key, entry]) => {
        const canonicalEntry = canonicalizeConfigValue(entry);
        if (typeof canonicalEntry === 'undefined') {
          return [];
        }
        return [`${JSON.stringify(key)}:${canonicalEntry}`];
      });
    return `{${entries.join(',')}}`;
  }
  return undefined;
}

function mergeBaselineDefaults(
  existing: Record<string, unknown>,
  roleDefinitions: readonly LoadedRoleDefinition[]
): Record<string, unknown> {
  const next = structuredClone(existing);
  next.model = BASELINE_MODEL;
  next.review_model = BASELINE_REVIEW_MODEL;
  next.model_reasoning_effort = BASELINE_REASONING;

  const agents = isRecord(next.agents) ? structuredClone(next.agents as Record<string, unknown>) : {};
  agents.max_threads = BASELINE_AGENTS.max_threads;

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
        detail: `Will create ${definition.fileName}.`,
        writeReason: 'create'
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
        detail: `${definition.fileName} already matches CO baseline defaults.`,
        writeReason: null
      });
      continue;
    }

    if (definition.managedMigrationContents.includes(current)) {
      changes.push({
        definition,
        path,
        existingContent: current,
        currentStatus: 'pending',
        detail: `Will update ${definition.fileName} from a prior CO-managed gpt-5.4 baseline.`,
        writeReason: 'managed_migration'
      });
      continue;
    }

    if (force) {
      changes.push({
        definition,
        path,
        existingContent: current,
        currentStatus: 'pending',
        detail: `Will overwrite ${definition.fileName} because --force is set.`,
        writeReason: 'force'
      });
      continue;
    }

    changes.push({
      definition,
      path,
      existingContent: current,
      currentStatus: 'preserved',
      detail: `${definition.fileName} already exists; preserving without --force.`,
      writeReason: null
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
    const currentContent = applyRoleBaselineOverrides(content, definition);
    loaded.push({
      ...definition,
      content: currentContent,
      managedMigrationContents: buildManagedMigrationContents(content, definition, currentContent)
    });
  }
  return loaded;
}

function buildManagedMigrationContents(
  content: string,
  definition: RoleDefinition,
  currentContent: string
): readonly string[] {
  if (!definition.model || !definition.modelReasoningEffort) {
    return [];
  }

  const migrationContents = (definition.managedMigrationReasoningEfforts ?? []).map((modelReasoningEffort) =>
    applyRoleBaselineOverrides(content, {
      ...definition,
      model: MANAGED_MIGRATION_MODEL,
      modelReasoningEffort
    })
  );
  return [...new Set(migrationContents)].filter((migrationContent) => migrationContent !== currentContent);
}

function formatAppliedRoleWriteDetail(roleChange: PlannedRoleChange): string {
  switch (roleChange.writeReason) {
    case 'create':
      return `Created ${roleChange.definition.fileName}.`;
    case 'force':
      return `Overwrote ${roleChange.definition.fileName} because --force was set.`;
    case 'managed_migration':
      return `Updated ${roleChange.definition.fileName} from a prior CO-managed gpt-5.4 baseline.`;
    case null:
      return roleChange.detail;
  }
}

function applyRoleBaselineOverrides(content: string, definition: RoleDefinition): string {
  let next = content;
  if (definition.model) {
    next = replaceRoleTomlString(next, 'model', definition.model, definition.fileName);
  }
  if (definition.modelReasoningEffort) {
    next = replaceRoleTomlString(
      next,
      'model_reasoning_effort',
      definition.modelReasoningEffort,
      definition.fileName
    );
  }
  if (definition.model && definition.modelReasoningEffort) {
    next = next.replace(
      /^# with CO override to use .+ at .+ reasoning\.$/m,
      `# with CO override to use ${definition.model} at ${definition.modelReasoningEffort} reasoning.`
    );
  }
  return next;
}

function replaceRoleTomlString(
  content: string,
  key: string,
  value: string,
  fileName: string
): string {
  const pattern = new RegExp(`^(${key}\\s*=\\s*)"[^"]*"$`, 'm');
  if (!pattern.test(content)) {
    throw new Error(`Role template ${fileName} is missing a ${key} assignment.`);
  }
  return content.replace(pattern, (_match, prefix: string) => `${prefix}"${value}"`);
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
  return typeof value === 'object' && value !== null && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
