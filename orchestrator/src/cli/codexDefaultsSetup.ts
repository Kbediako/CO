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

export type CodexDefaultsAuthScope = 'portable' | 'chatgpt';

export const PORTABLE_BASELINE_MODEL = 'gpt-5.4';
export const CHATGPT_AUTH_BASELINE_MODEL = 'gpt-5.5';
export const BASELINE_MODEL = PORTABLE_BASELINE_MODEL;
export const BASELINE_REVIEW_MODEL = BASELINE_MODEL;
export const ACCEPTED_BASELINE_MODELS = [PORTABLE_BASELINE_MODEL, CHATGPT_AUTH_BASELINE_MODEL] as const;
export const ACCEPTED_BASELINE_MODEL_PAIRS_LABEL =
  `${PORTABLE_BASELINE_MODEL}/${PORTABLE_BASELINE_MODEL} portable or ` +
  `${CHATGPT_AUTH_BASELINE_MODEL}/${CHATGPT_AUTH_BASELINE_MODEL} ChatGPT-auth`;
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

const LEGACY_MANAGED_TEMPLATE_TEXT: Partial<Record<RoleDefinition['key'], readonly [string, string][]>> = {
  awaiter: [
    [
      '# with CO portable override to use gpt-5.4 at high reasoning.',
      '# with CO override to use gpt-5.4 at high reasoning.'
    ]
  ]
};

interface LoadedRoleDefinition extends RoleDefinition {
  content: string;
  managedContents: readonly string[];
}

type SetupStatus = 'planned' | 'applied';
type ChangeStatus = 'pending' | 'unchanged' | 'created' | 'updated' | 'preserved';
type ChangeTarget = 'config' | 'role_file';

export interface CodexDefaultsSetupOptions {
  apply?: boolean;
  force?: boolean;
  authScope?: CodexDefaultsAuthScope;
  env?: NodeJS.ProcessEnv;
}

export interface CodexDefaultsSetupPlan {
  codexHome: string;
  configPath: string;
  agentsDir: string;
  force: boolean;
  authScope: CodexDefaultsAuthScope;
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
  shouldWrite: boolean;
  applyDetail?: string;
}

export async function runCodexDefaultsSetup(
  options: CodexDefaultsSetupOptions = {}
): Promise<CodexDefaultsSetupResult> {
  const env = options.env ?? process.env;
  const force = Boolean(options.force);
  const apply = Boolean(options.apply);
  const authScope = options.authScope ?? 'portable';
  const plan = buildPlan(env, force, authScope);
  const baselineModels = resolveBaselineModels(authScope);
  const roleDefinitions = await loadRoleDefinitions(authScope);
  const configState = await loadConfigState(plan.configPath);
  const nextConfig = mergeBaselineDefaults(configState.parsed, roleDefinitions, baselineModels);
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
    if (roleChange.shouldWrite) {
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
          roleChange.applyDetail
          ?? (roleChange.existingContent === null
            ? `Created ${roleChange.definition.fileName}.`
            : `Overwrote ${roleChange.definition.fileName} because --force was set.`)
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
  lines.push(`- Auth scope: ${result.plan.authScope}`);
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

function buildPlan(
  env: NodeJS.ProcessEnv,
  force: boolean,
  authScope: CodexDefaultsAuthScope
): CodexDefaultsSetupPlan {
  const codexHome = resolveCodexHome(env);
  return {
    codexHome,
    configPath: join(codexHome, 'config.toml'),
    agentsDir: join(codexHome, 'agents'),
    force,
    authScope
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
  roleDefinitions: readonly LoadedRoleDefinition[],
  baselineModels: { model: string; reviewModel: string }
): Record<string, unknown> {
  const next = structuredClone(existing);
  next.model = baselineModels.model;
  next.review_model = baselineModels.reviewModel;
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
        shouldWrite: true,
        applyDetail: `Created ${definition.fileName}.`
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
        shouldWrite: false
      });
      continue;
    }

    if (definition.managedContents.includes(current)) {
      changes.push({
        definition,
        path,
        existingContent: current,
        currentStatus: 'pending',
        detail: `Will update ${definition.fileName} because it matches a CO-managed baseline for a different auth scope.`,
        shouldWrite: true,
        applyDetail: `Updated ${definition.fileName} to match the selected auth scope because the existing file matched a CO-managed baseline.`
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
        shouldWrite: true,
        applyDetail: `Overwrote ${definition.fileName} because --force was set.`
      });
      continue;
    }

    changes.push({
      definition,
      path,
      existingContent: current,
      currentStatus: 'preserved',
      detail: `${definition.fileName} already exists; preserving without --force.`,
      shouldWrite: false
    });
  }

  return changes;
}

async function loadRoleDefinitions(authScope: CodexDefaultsAuthScope): Promise<LoadedRoleDefinition[]> {
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
    loaded.push({
      ...definition,
      content: scopeRoleTemplateContent(definition, content, authScope),
      managedContents: buildManagedRoleContents(definition, content)
    });
  }
  return loaded;
}

function buildManagedRoleContents(definition: RoleDefinition, content: string): string[] {
  const contents = [
    scopeRoleTemplateContent(definition, content, 'portable'),
    scopeRoleTemplateContent(definition, content, 'chatgpt')
  ];

  for (const [currentText, legacyText] of LEGACY_MANAGED_TEMPLATE_TEXT[definition.key] ?? []) {
    if (!content.includes(currentText)) {
      continue;
    }
    const legacyContent = content.replace(currentText, legacyText);
    contents.push(
      scopeRoleTemplateContent(definition, legacyContent, 'portable'),
      scopeRoleTemplateContent(definition, legacyContent, 'chatgpt')
    );
  }

  return uniqueStrings(contents);
}

function resolveBaselineModels(authScope: CodexDefaultsAuthScope): { model: string; reviewModel: string } {
  if (authScope === 'chatgpt') {
    return {
      model: CHATGPT_AUTH_BASELINE_MODEL,
      reviewModel: CHATGPT_AUTH_BASELINE_MODEL
    };
  }
  return {
    model: PORTABLE_BASELINE_MODEL,
    reviewModel: PORTABLE_BASELINE_MODEL
  };
}

function scopeRoleTemplateContent(
  definition: RoleDefinition,
  content: string,
  authScope: CodexDefaultsAuthScope
): string {
  if (definition.key === 'explorer_fast') {
    return content;
  }
  const { model } = resolveBaselineModels(authScope);
  return content.replace(/^model = "gpt-[^"]+"/m, `model = "${model}"`);
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
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
