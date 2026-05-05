import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';

import { resolveCodexHome } from './utils/codexPaths.js';
import { resolveCodexCliBin } from './utils/codexCli.js';
import {
  codexFeatureProbeDisablesMultiAgentV2,
  codexFeatureProbeRejectsAgentMaxThreads,
  findConfiguredRemovedFeatureKeys,
  readCodexFeatureProbe,
  type CodexFeatureProbeResult
} from './utils/codexFeatures.js';
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

export const BASELINE_MODEL = 'gpt-5.4';
export const BASELINE_REVIEW_MODEL = BASELINE_MODEL;
export const CURRENT_CHATGPT_MODEL = 'gpt-5.5';
export const BASELINE_REASONING = 'xhigh';
export const BASELINE_REASONING_MINIMUM = 'high';
export const BASELINE_AGENTS = {
  max_threads: 12,
  max_depth: 4
} as const;
export const LOCAL_MODEL_OPT_INS = [CURRENT_CHATGPT_MODEL] as const;
export const CO_MANAGED_REMOVED_FEATURE_KEYS = ['js_repl', 'js_repl_tools_only'] as const;
const LOCAL_MODEL_OPT_IN_SET = new Set<string>(LOCAL_MODEL_OPT_INS);
const CO_MANAGED_REMOVED_FEATURE_KEY_SET = new Set<string>(CO_MANAGED_REMOVED_FEATURE_KEYS);
const CODEX_ORCHESTRATOR_CONFIG_KEY = 'codex_orchestrator';
const LOCAL_MODEL_OPT_IN_CONFIG_KEY = 'local_model_opt_in';

interface RoleDefinition {
  key: 'explorer_fast' | 'worker_complex' | 'awaiter';
  description: string;
  fileName: 'explorer-fast.toml' | 'worker-complex.toml' | 'awaiter-high.toml';
  configFile: string;
  templatePath: string;
  managedMigrationBaselines?: readonly ManagedMigrationBaseline[];
  managedMigrationContentVariants?: readonly ManagedMigrationContentVariant[];
}

interface ManagedMigrationBaseline {
  model: string;
  modelReasoningEffort: 'high' | 'xhigh';
}

interface ManagedMigrationContentVariant extends ManagedMigrationBaseline {
  overrideComment?: string;
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
    managedMigrationBaselines: [{ model: 'gpt-5.5', modelReasoningEffort: 'xhigh' }]
  },
  {
    key: 'awaiter',
    description: 'Awaiter override (keeps awaiter behavior with latest codex/high reasoning).',
    fileName: 'awaiter-high.toml',
    configFile: './agents/awaiter-high.toml',
    templatePath: join('templates', 'codex', '.codex', 'agents', 'awaiter-high.toml'),
    managedMigrationBaselines: [{ model: 'gpt-5.5', modelReasoningEffort: 'xhigh' }],
    managedMigrationContentVariants: [
      {
        model: 'gpt-5.5',
        modelReasoningEffort: 'high',
        overrideComment: '# with CO portable override to use gpt-5.4 at high reasoning.'
      }
    ]
  }
];

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
  writeReason: 'create' | 'force' | 'managed_migration' | null;
}

export async function runCodexDefaultsSetup(
  options: CodexDefaultsSetupOptions = {}
): Promise<CodexDefaultsSetupResult> {
  const env = options.env ?? process.env;
  const force = Boolean(options.force);
  const apply = Boolean(options.apply);
  const configState = await loadConfigState(buildConfigPath(env));
  const topLevelLocalModelOptIn = resolveRequestedLocalModelOptIn(
    configState.parsed,
    options.authScope
  );
  const roleAndReviewLocalModelOptIn = resolveRoleAndReviewLocalModelOptIn(
    configState.parsed,
    topLevelLocalModelOptIn,
    options.authScope
  );
  const authScope: CodexDefaultsAuthScope = topLevelLocalModelOptIn ? 'chatgpt' : 'portable';
  const plan = buildPlan(env, force, authScope);
  const roleDefinitions = await loadRoleDefinitions();
  const featureProbe = readCodexFeatureProbe(resolveCodexCliBin(env), env);
  const removedCoManagedFeatureKeys = findConfiguredCoManagedRemovedFeatureKeys(
    configState.parsed,
    featureProbe
  );
  const nextConfig = mergeBaselineDefaults(
    configState.parsed,
    roleDefinitions,
    {
      topLevelLocalModelOptIn,
      reviewModelOptIn: roleAndReviewLocalModelOptIn,
      requestedAuthScope: options.authScope,
      featureProbe,
      removedCoManagedFeatureKeys
    }
  );
  const activeRoleDefinitions = buildActiveRoleDefinitions(
    roleDefinitions,
    roleAndReviewLocalModelOptIn
  );
  const configChanged =
    canonicalizeConfigValue(configState.parsed) !== canonicalizeConfigValue(nextConfig);
  const roleChanges = await planRoleChanges(plan.agentsDir, force, activeRoleDefinitions);

  if (!apply) {
    const changes = buildPlannedChanges({
      configPath: plan.configPath,
      configExists: configState.exists,
      configChanged,
      removedCoManagedFeatureKeys,
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
      detail: formatAppliedConfigChangeDetail({
        configExists: configState.exists,
        removedCoManagedFeatureKeys
      })
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

function buildConfigPath(env: NodeJS.ProcessEnv): string {
  return join(resolveCodexHome(env), 'config.toml');
}

function buildPlan(
  env: NodeJS.ProcessEnv,
  force: boolean,
  authScope: CodexDefaultsAuthScope
): CodexDefaultsSetupPlan {
  const configPath = buildConfigPath(env);
  const codexHome = resolveCodexHome(env);
  return {
    codexHome,
    configPath,
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
  options: {
    topLevelLocalModelOptIn: (typeof LOCAL_MODEL_OPT_INS)[number] | null;
    reviewModelOptIn: (typeof LOCAL_MODEL_OPT_INS)[number] | null;
    requestedAuthScope?: CodexDefaultsAuthScope;
    featureProbe: CodexFeatureProbeResult;
    removedCoManagedFeatureKeys: readonly string[];
  }
): Record<string, unknown> {
  const next = structuredClone(existing);
  pruneCoManagedRemovedFeatureKeys(next, options.removedCoManagedFeatureKeys);
  next.model = resolveModelDefault(options.topLevelLocalModelOptIn, BASELINE_MODEL);
  next.review_model = resolveModelDefault(options.reviewModelOptIn, BASELINE_REVIEW_MODEL);
  next.model_reasoning_effort = BASELINE_REASONING;
  removeLegacyLocalModelOptInMarker(next);

  const agents = isRecord(next.agents) ? structuredClone(next.agents as Record<string, unknown>) : {};
  if (isMultiAgentV2Enabled(next, options.featureProbe)) {
    delete agents.max_threads;
  } else {
    agents.max_threads = BASELINE_AGENTS.max_threads;
  }

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

export function isLocalModelOptIn(value: unknown): value is (typeof LOCAL_MODEL_OPT_INS)[number] {
  return typeof value === 'string' && LOCAL_MODEL_OPT_IN_SET.has(value);
}

export function resolveLocalModelOptIn(existing: Record<string, unknown>): (typeof LOCAL_MODEL_OPT_INS)[number] | null {
  const localConfig = isRecord(existing[CODEX_ORCHESTRATOR_CONFIG_KEY])
    ? (existing[CODEX_ORCHESTRATOR_CONFIG_KEY] as Record<string, unknown>)
    : null;
  const configuredModel = localConfig?.[LOCAL_MODEL_OPT_IN_CONFIG_KEY];
  return isLocalModelOptIn(configuredModel) ? configuredModel : null;
}

function resolveRequestedLocalModelOptIn(
  existing: Record<string, unknown>,
  requestedAuthScope?: CodexDefaultsAuthScope
): (typeof LOCAL_MODEL_OPT_INS)[number] | null {
  if (requestedAuthScope === 'portable') {
    return null;
  }
  if (requestedAuthScope === 'chatgpt') {
    return CURRENT_CHATGPT_MODEL;
  }
  const model = readOptionalString(existing.model);
  const reviewModel = readOptionalString(existing.review_model);
  if (isLocalModelOptIn(model)) {
    return model;
  }
  if (isLocalModelOptIn(reviewModel)) {
    return reviewModel;
  }
  return null;
}

function resolveRoleAndReviewLocalModelOptIn(
  existing: Record<string, unknown>,
  topLevelLocalModelOptIn: (typeof LOCAL_MODEL_OPT_INS)[number] | null,
  requestedAuthScope?: CodexDefaultsAuthScope
): (typeof LOCAL_MODEL_OPT_INS)[number] | null {
  if (requestedAuthScope === 'portable') {
    return null;
  }
  if (topLevelLocalModelOptIn) {
    return topLevelLocalModelOptIn;
  }
  const reviewModel = readOptionalString(existing.review_model);
  const existingLocalModelOptIn = resolveLocalModelOptIn(existing);
  return existingLocalModelOptIn === topLevelLocalModelOptIn
    && reviewModel === topLevelLocalModelOptIn
    && isLocalModelOptIn(reviewModel)
    ? reviewModel
    : null;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function removeLegacyLocalModelOptInMarker(next: Record<string, unknown>): void {
  const existingConfig = isRecord(next[CODEX_ORCHESTRATOR_CONFIG_KEY])
    ? structuredClone(next[CODEX_ORCHESTRATOR_CONFIG_KEY] as Record<string, unknown>)
    : {};

  if (LOCAL_MODEL_OPT_IN_CONFIG_KEY in existingConfig) {
    delete existingConfig[LOCAL_MODEL_OPT_IN_CONFIG_KEY];
    if (Object.keys(existingConfig).length > 0) {
      next[CODEX_ORCHESTRATOR_CONFIG_KEY] = existingConfig;
    } else {
      delete next[CODEX_ORCHESTRATOR_CONFIG_KEY];
    }
  }
}

export function formatModelDefaultExpectation(baseline: string): string {
  return `${CURRENT_CHATGPT_MODEL} when ChatGPT-auth access is verified (fallback: ${baseline})`;
}

function resolveModelDefault(localModelOptIn: (typeof LOCAL_MODEL_OPT_INS)[number] | null, baseline: string): string {
  return localModelOptIn ?? baseline;
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

    if (definition.managedMigrationContents.includes(current)) {
      changes.push({
        definition,
        path,
        existingContent: current,
        currentStatus: 'pending',
        detail: `Will update ${definition.fileName} from a prior CO-managed model baseline.`,
        writeReason: 'managed_migration'
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
    loaded.push({
      ...definition,
      content,
      managedMigrationContents: buildManagedMigrationContents(content, definition)
    });
  }
  return loaded;
}

function buildActiveRoleDefinitions(
  roleDefinitions: readonly LoadedRoleDefinition[],
  localModelOptIn: (typeof LOCAL_MODEL_OPT_INS)[number] | null
): LoadedRoleDefinition[] {
  if (!localModelOptIn) {
    return [...roleDefinitions];
  }

  return roleDefinitions.map((definition) => {
    const matchingOptInBaseline = definition.managedMigrationBaselines?.find(
      (baseline) => baseline.model === localModelOptIn
    );
    if (!matchingOptInBaseline) {
      return definition;
    }

    const optInContent = applyRoleBaselineOverrides(
      definition.content,
      definition.fileName,
      matchingOptInBaseline
    );
    return {
      ...definition,
      content: optInContent,
      managedMigrationContents: uniqueRoleContents([
        definition.content,
        ...definition.managedMigrationContents
      ]).filter((migrationContent) => migrationContent !== optInContent)
    };
  });
}

function buildManagedMigrationContents(
  content: string,
  definition: RoleDefinition
): readonly string[] {
  const migrationContents = [
    ...(definition.managedMigrationBaselines ?? []),
    ...(definition.managedMigrationContentVariants ?? [])
  ].map((baseline) => applyRoleBaselineOverrides(content, definition.fileName, baseline));
  return uniqueRoleContents(migrationContents).filter((migrationContent) => migrationContent !== content);
}

function uniqueRoleContents(contents: readonly string[]): string[] {
  return [...new Set(contents)];
}

function formatAppliedRoleWriteDetail(roleChange: PlannedRoleChange): string {
  switch (roleChange.writeReason) {
    case 'create':
      return `Created ${roleChange.definition.fileName}.`;
    case 'force':
      return `Overwrote ${roleChange.definition.fileName} because --force was set.`;
    case 'managed_migration':
      return `Updated ${roleChange.definition.fileName} from a prior CO-managed model baseline.`;
    case null:
      return roleChange.detail;
  }
}

function applyRoleBaselineOverrides(
  content: string,
  fileName: RoleDefinition['fileName'],
  baseline: ManagedMigrationContentVariant
): string {
  let next = replaceRoleTomlString(content, 'model', baseline.model, fileName);
  next = replaceRoleTomlString(
    next,
    'model_reasoning_effort',
    baseline.modelReasoningEffort,
    fileName
  );
  return next.replace(
    /^# with CO override to use .+ at .+ reasoning\.$/m,
    baseline.overrideComment
      ?? `# with CO override to use ${baseline.model} at ${baseline.modelReasoningEffort} reasoning.`
  );
}

function replaceRoleTomlString(
  content: string,
  key: string,
  value: string,
  fileName: RoleDefinition['fileName']
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
  removedCoManagedFeatureKeys: readonly string[];
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
      ? formatPlannedConfigChangeDetail({
        configExists: params.configExists,
        removedCoManagedFeatureKeys: params.removedCoManagedFeatureKeys
      })
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

export function findConfiguredCoManagedRemovedFeatureKeys(
  config: Record<string, unknown>,
  featureProbe: CodexFeatureProbeResult | null | undefined
): string[] {
  const configuredRemovedFeatureKeys = findConfiguredRemovedFeatureKeys(
    isRecord(config.features) ? (config.features as Record<string, unknown>) : null,
    featureProbe
  );
  return configuredRemovedFeatureKeys
    .filter((key) => CO_MANAGED_REMOVED_FEATURE_KEY_SET.has(key))
    .sort();
}

function pruneCoManagedRemovedFeatureKeys(
  config: Record<string, unknown>,
  removedCoManagedFeatureKeys: readonly string[]
): void {
  if (removedCoManagedFeatureKeys.length === 0 || !isRecord(config.features)) {
    return;
  }
  const features = structuredClone(config.features as Record<string, unknown>);
  for (const key of removedCoManagedFeatureKeys) {
    delete features[key];
  }
  if (Object.keys(features).length === 0) {
    delete config.features;
  } else {
    config.features = features;
  }
}

function formatPlannedConfigChangeDetail(params: {
  configExists: boolean;
  removedCoManagedFeatureKeys: readonly string[];
}): string {
  if (!params.configExists) {
    return 'Will create config.toml with CO baseline defaults.';
  }
  const cleanup = formatRemovedFeatureCleanupClause(params.removedCoManagedFeatureKeys);
  return cleanup
    ? `Will update CO-compatible baseline defaults, ${cleanup}, and preserve unrelated keys.`
    : 'Will update CO-compatible baseline defaults while preserving unrelated keys.';
}

function formatAppliedConfigChangeDetail(params: {
  configExists: boolean;
  removedCoManagedFeatureKeys: readonly string[];
}): string {
  if (!params.configExists) {
    return 'Created config.toml with CO baseline defaults.';
  }
  const cleanup = formatRemovedFeatureCleanupClause(params.removedCoManagedFeatureKeys);
  return cleanup
    ? `Updated CO-compatible baseline defaults, ${cleanup}, and preserved unrelated keys.`
    : 'Updated CO-compatible baseline defaults and preserved unrelated keys.';
}

function formatRemovedFeatureCleanupClause(removedCoManagedFeatureKeys: readonly string[]): string | null {
  return removedCoManagedFeatureKeys.length > 0
    ? `pruned stale CO-managed removed feature keys: ${removedCoManagedFeatureKeys.join(', ')}`
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isMultiAgentV2Enabled(
  config: Record<string, unknown>,
  featureProbe: CodexFeatureProbeResult
): boolean {
  if (featureProbe.flags?.multi_agent_v2 === true) {
    return true;
  }
  if (codexFeatureProbeDisablesMultiAgentV2(featureProbe)) {
    return false;
  }
  if (codexFeatureProbeRejectsAgentMaxThreads(featureProbe)) {
    return true;
  }
  if (!isRecord(config.features)) {
    return false;
  }
  return readBooleanValue(config.features.multi_agent_v2) === true;
}

function readBooleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
