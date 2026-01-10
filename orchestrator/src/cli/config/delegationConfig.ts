import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const toml = require('@iarna/toml');

export type ConfigSource = 'global' | 'repo' | 'env' | 'cli';

export interface DelegationConfigLayer {
  source: ConfigSource;
  delegate?: {
    allowNested?: boolean;
    toolProfile?: string[];
    allowedToolServers?: string[];
    mode?: 'full' | 'question_only';
    expiryFallback?: 'pause' | 'resume' | 'fail';
  };
  rlm?: {
    policy?: 'always' | 'auto' | 'off';
    environment?: string;
    allowedEnvironments?: string[];
    maxIterations?: number;
    maxSubcalls?: number;
    maxSubcallDepth?: number;
    wallClockTimeoutMs?: number;
    budgetUsd?: number;
    budgetTokens?: number;
    rootModel?: string;
    subModel?: string;
  };
  runner?: {
    mode?: 'prod' | 'dev';
    allowedModes?: Array<'prod' | 'dev'>;
  };
  ui?: {
    controlEnabled?: boolean;
    bindHost?: string;
    allowedBindHosts?: string[];
    allowedRunRoots?: string[];
  };
  github?: {
    enabled?: boolean;
    operations?: string[];
  };
  paths?: {
    allowedRoots?: string[];
  };
  confirm?: {
    autoPause?: boolean;
    maxPending?: number;
    expiresInMs?: number;
  };
  sandbox?: {
    network?: boolean;
  };
}

export interface EffectiveDelegationConfig {
  delegate: {
    allowNested: boolean;
    toolProfile: string[];
    allowedToolServers: string[];
    mode: 'full' | 'question_only';
    expiryFallback: 'pause' | 'resume' | 'fail';
  };
  rlm: {
    policy: 'always' | 'auto' | 'off';
    environment: string;
    allowedEnvironments: string[];
    maxIterations: number;
    maxSubcalls: number;
    maxSubcallDepth: number;
    wallClockTimeoutMs: number;
    budgetUsd: number;
    budgetTokens: number;
    rootModel: string;
    subModel: string;
  };
  runner: {
    mode: 'prod' | 'dev';
    allowedModes: Array<'prod' | 'dev'>;
  };
  ui: {
    controlEnabled: boolean;
    bindHost: string;
    allowedBindHosts: string[];
    allowedRunRoots: string[];
  };
  github: {
    enabled: boolean;
    operations: string[];
  };
  paths: {
    allowedRoots: string[];
  };
  confirm: {
    autoPause: boolean;
    maxPending: number;
    expiresInMs: number;
  };
  sandbox: {
    network: boolean;
  };
}

const DEFAULT_ALLOWED_RUN_ROOTS: string[] = [];

const DEFAULT_CONFIG: EffectiveDelegationConfig = {
  delegate: {
    allowNested: false,
    toolProfile: [],
    allowedToolServers: [],
    mode: 'question_only',
    expiryFallback: 'pause'
  },
  rlm: {
    policy: 'always',
    environment: 'docker',
    allowedEnvironments: ['docker'],
    maxIterations: 50,
    maxSubcalls: 200,
    maxSubcallDepth: 1,
    wallClockTimeoutMs: 30 * 60 * 1000,
    budgetUsd: 0,
    budgetTokens: 0,
    rootModel: '',
    subModel: ''
  },
  runner: {
    mode: 'prod',
    allowedModes: ['prod']
  },
  ui: {
    controlEnabled: false,
    bindHost: '127.0.0.1',
    allowedBindHosts: ['127.0.0.1'],
    allowedRunRoots: DEFAULT_ALLOWED_RUN_ROOTS
  },
  github: {
    enabled: false,
    operations: []
  },
  paths: {
    allowedRoots: []
  },
  confirm: {
    autoPause: true,
    maxPending: 3,
    expiresInMs: 15 * 60 * 1000
  },
  sandbox: {
    network: false
  }
};

const SOURCE_PRIORITY: Record<ConfigSource, number> = {
  global: 1,
  repo: 2,
  env: 3,
  cli: 4
};

export async function loadDelegationConfigFiles(options: {
  repoRoot: string;
  env?: NodeJS.ProcessEnv;
  codexHome?: string;
}): Promise<{ global: DelegationConfigLayer | null; repo: DelegationConfigLayer | null }> {
  const env = options.env ?? process.env;
  const codexHome = options.codexHome ?? resolveCodexHome(env);
  const globalPath = join(codexHome, 'config.toml');
  const repoPath = join(options.repoRoot, '.codex', 'orchestrator.toml');

  const globalRaw = await readTomlFile(globalPath);
  const repoRaw = await readTomlFile(repoPath);

  return {
    global: globalRaw ? normalizeLayer(globalRaw, 'global') : null,
    repo: repoRaw ? normalizeLayer(repoRaw, 'repo') : null
  };
}

export function computeEffectiveDelegationConfig(options: {
  repoRoot: string;
  layers: DelegationConfigLayer[];
}): EffectiveDelegationConfig {
  const sorted = [...options.layers].sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]);
  const merged = sorted.reduce<DelegationConfigLayer>((acc, layer) => mergeLayer(acc, layer), {
    source: 'global'
  });

  const repoLayer = sorted.find((layer) => layer.source === 'repo');

  const defaults = structuredClone(DEFAULT_CONFIG);
  const effective: EffectiveDelegationConfig = {
    delegate: {
      ...defaults.delegate,
      ...(merged.delegate ?? {})
    },
    rlm: {
      ...defaults.rlm,
      ...(merged.rlm ?? {})
    },
    runner: {
      ...defaults.runner,
      ...(merged.runner ?? {})
    },
    ui: {
      ...defaults.ui,
      ...(merged.ui ?? {})
    },
    github: {
      ...defaults.github
    },
    paths: {
      ...defaults.paths,
      ...(merged.paths ?? {})
    },
    confirm: {
      ...defaults.confirm,
      ...(merged.confirm ?? {})
    },
    sandbox: {
      ...defaults.sandbox,
      ...(merged.sandbox ?? {})
    }
  };

  if (effective.delegate.mode !== 'full' && effective.delegate.mode !== 'question_only') {
    effective.delegate.mode = defaults.delegate.mode;
  }

  const repoAllowedRoots =
    typeof repoLayer?.paths?.allowedRoots !== 'undefined' ? repoLayer.paths.allowedRoots : [options.repoRoot];
  const repoCapRoots = normalizeRoots(repoAllowedRoots);
  const requestedRoots =
    typeof merged.paths?.allowedRoots !== 'undefined' ? merged.paths.allowedRoots : repoCapRoots;
  const candidateRoots = normalizeRoots(requestedRoots);
  effective.paths.allowedRoots = intersectRoots(repoCapRoots, candidateRoots);

  const repoToolCap = repoLayer?.delegate?.allowedToolServers ?? [];
  const requestedToolProfile = merged.delegate?.toolProfile ?? repoToolCap;
  effective.delegate.allowedToolServers = [...repoToolCap];
  effective.delegate.toolProfile = intersectExact(repoToolCap, requestedToolProfile);

  const repoAllowedModes = repoLayer?.runner?.allowedModes ?? defaults.runner.allowedModes;
  effective.runner.allowedModes = repoAllowedModes;
  const requestedMode = merged.runner?.mode ?? defaults.runner.mode;
  effective.runner.mode = repoAllowedModes.includes(requestedMode) ? requestedMode : repoAllowedModes[0] ?? defaults.runner.mode;

  const repoAllowedEnvs = repoLayer?.rlm?.allowedEnvironments ?? defaults.rlm.allowedEnvironments;
  effective.rlm.allowedEnvironments = repoAllowedEnvs;
  const requestedEnv = merged.rlm?.environment ?? defaults.rlm.environment;
  effective.rlm.environment = repoAllowedEnvs.includes(requestedEnv) ? requestedEnv : repoAllowedEnvs[0] ?? defaults.rlm.environment;

  const repoAllowedBindHosts = repoLayer?.ui?.allowedBindHosts ?? defaults.ui.allowedBindHosts;
  effective.ui.allowedBindHosts = repoAllowedBindHosts;
  const requestedBindHost = merged.ui?.bindHost ?? defaults.ui.bindHost;
  effective.ui.bindHost = repoAllowedBindHosts.includes(requestedBindHost)
    ? requestedBindHost
    : repoAllowedBindHosts[0] ?? defaults.ui.bindHost;

  const repoAllowNetwork = Boolean(repoLayer?.sandbox?.network ?? defaults.sandbox.network);
  effective.sandbox.network = repoAllowNetwork && Boolean(merged.sandbox?.network ?? defaults.sandbox.network);

  const githubEnabled = Boolean(repoLayer?.github?.enabled ?? false);
  effective.github.enabled = githubEnabled;
  effective.github.operations = githubEnabled ? [...(repoLayer?.github?.operations ?? [])] : [];

  if (effective.ui.allowedRunRoots.length === 0) {
    effective.ui.allowedRunRoots = [options.repoRoot];
  }

  return effective;
}

function mergeLayer(base: DelegationConfigLayer, update: DelegationConfigLayer): DelegationConfigLayer {
  const merged: DelegationConfigLayer = {
    ...base,
    source: update.source
  };

  merged.delegate = mergeSection(base.delegate, update.delegate);
  merged.rlm = mergeSection(base.rlm, update.rlm);
  merged.runner = mergeSection(base.runner, update.runner);
  merged.ui = mergeSection(base.ui, update.ui);
  merged.github = mergeSection(base.github, update.github);
  merged.paths = mergeSection(base.paths, update.paths);
  merged.confirm = mergeSection(base.confirm, update.confirm);
  merged.sandbox = mergeSection(base.sandbox, update.sandbox);

  return merged;
}

function mergeSection<T extends Record<string, unknown> | undefined>(
  base?: T,
  update?: T
): T | undefined {
  if (!update) {
    return base;
  }
  if (!base) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(update)) {
      if (typeof value === 'undefined') {
        continue;
      }
      if (Array.isArray(value)) {
        cleaned[key] = [...value];
        continue;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = { ...(value as Record<string, unknown>) };
        continue;
      }
      cleaned[key] = value;
    }
    return cleaned as T;
  }
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(update)) {
    if (typeof value === 'undefined') {
      continue;
    }
    if (Array.isArray(value)) {
      merged[key] = [...value];
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...(merged[key] as Record<string, unknown>), ...value };
      continue;
    }
    merged[key] = value;
  }
  return merged as T;
}

async function readTomlFile(path: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = toml.parse(raw);
    return parsed as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function normalizeLayer(raw: Record<string, unknown>, source: ConfigSource): DelegationConfigLayer {
  return {
    source,
    delegate: normalizeDelegate(raw.delegate),
    rlm: normalizeRlm(raw.rlm),
    runner: normalizeRunner(raw.runner),
    ui: normalizeUi(raw.ui),
    github: normalizeGithub(raw.github),
    paths: normalizePaths(raw.paths),
    confirm: normalizeConfirm(raw.confirm),
    sandbox: normalizeSandbox(raw.sandbox)
  };
}

function normalizeDelegate(value: unknown): DelegationConfigLayer['delegate'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    allowNested: asBoolean(record.allow_nested ?? record.allowNested),
    toolProfile: asStringArray(record.tool_profile ?? record.toolProfile),
    allowedToolServers: asStringArray(record.allowed_tool_servers ?? record.allowedToolServers),
    mode: asString(record.mode) as 'full' | 'question_only' | undefined,
    expiryFallback: asString(record.question_expiry_fallback ?? record.expiryFallback) as
      | 'pause'
      | 'resume'
      | 'fail'
      | undefined
  };
}

function normalizeRlm(value: unknown): DelegationConfigLayer['rlm'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    policy: asString(record.policy) as 'always' | 'auto' | 'off' | undefined,
    environment: asString(record.environment) ?? asString(record.env),
    allowedEnvironments: asStringArray(record.allowed_environments ?? record.allowedEnvironments),
    maxIterations: asNumber(record.max_iterations ?? record.maxIterations),
    maxSubcalls: asNumber(record.max_subcalls ?? record.maxSubcalls),
    maxSubcallDepth: asNumber(record.max_subcall_depth ?? record.maxSubcallDepth),
    wallClockTimeoutMs: asNumber(record.wall_clock_timeout_ms ?? record.wallClockTimeoutMs),
    budgetUsd: asNumber(record.budget_usd ?? record.budgetUsd),
    budgetTokens: asNumber(record.budget_tokens ?? record.budgetTokens),
    rootModel: asString(record.root_model ?? record.rootModel),
    subModel: asString(record.sub_model ?? record.subModel)
  };
}

function normalizeRunner(value: unknown): DelegationConfigLayer['runner'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    mode: asString(record.mode) as 'prod' | 'dev' | undefined,
    allowedModes: asStringArray(record.allowed_modes ?? record.allowedModes) as Array<'prod' | 'dev'> | undefined
  };
}

function normalizeUi(value: unknown): DelegationConfigLayer['ui'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    controlEnabled: asBoolean(record.control_enabled ?? record.controlEnabled),
    bindHost: asString(record.bind_host ?? record.bindHost),
    allowedBindHosts: asStringArray(record.allowed_bind_hosts ?? record.allowedBindHosts),
    allowedRunRoots: asStringArray(record.allowed_run_roots ?? record.allowedRunRoots)
  };
}

function normalizeGithub(value: unknown): DelegationConfigLayer['github'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    enabled: asBoolean(record.enabled),
    operations: asStringArray(record.operations)
  };
}

function normalizePaths(value: unknown): DelegationConfigLayer['paths'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    allowedRoots: asStringArray(record.allowed_roots ?? record.allowedRoots)
  };
}

function normalizeConfirm(value: unknown): DelegationConfigLayer['confirm'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    autoPause: asBoolean(record.auto_pause ?? record.autoPause),
    maxPending: asNumber(record.max_pending ?? record.maxPending),
    expiresInMs: asNumber(record.expires_in_ms ?? record.expiresInMs)
  };
}

function normalizeSandbox(value: unknown): DelegationConfigLayer['sandbox'] {
  const record = asRecord(value);
  if (!record) return undefined;
  return {
    network: asBoolean(record.network)
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim());
  }
  if (typeof value === 'string') {
    return [value.trim()];
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function resolveCodexHome(env: NodeJS.ProcessEnv): string {
  const override = env.CODEX_HOME?.trim();
  if (override) {
    return isAbsolute(override) ? override : resolve(process.cwd(), override);
  }
  return join(homedir(), '.codex');
}

function normalizeRoots(roots: string[]): string[] {
  const normalized = roots
    .filter((root) => typeof root === 'string')
    .map((root) => realpathSafe(resolve(root)))
    .filter((root) => root.length > 0);
  return Array.from(new Set(normalized));
}

function intersectExact(cap: string[], requested: string[]): string[] {
  if (cap.length === 0 || requested.length === 0) {
    return [];
  }
  const set = new Set(cap);
  return requested.filter((entry) => set.has(entry));
}

function intersectRoots(cap: string[], requested: string[]): string[] {
  if (cap.length === 0 || requested.length === 0) {
    return [];
  }
  const resolvedCap = cap.map((root) => realpathSafe(resolve(root)));
  return requested
    .map((root) => realpathSafe(resolve(root)))
    .filter((candidate) => resolvedCap.some((allowed) => isWithinRoot(allowed, candidate)));
}

function isWithinRoot(root: string, candidate: string): boolean {
  if (root === candidate) {
    return true;
  }
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  return candidate.startsWith(normalizedRoot);
}

function realpathSafe(pathname: string): string {
  try {
    return realpathSync(pathname);
  } catch {
    return pathname;
  }
}

export function resolveConfigDir(pathname: string): string {
  return dirname(pathname);
}

export function splitDelegationConfigOverrides(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function parseDelegationConfigOverride(
  value: string,
  source: ConfigSource
): DelegationConfigLayer | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = toml.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  return normalizeLayer(parsed as Record<string, unknown>, source);
}
