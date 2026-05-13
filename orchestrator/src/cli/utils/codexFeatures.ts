import { spawnSync } from 'node:child_process';

export interface CodexFeatureProbeResult {
  flags: Record<string, boolean> | null;
  features: Record<string, CodexFeatureEntry> | null;
  removed: string[];
  stderr: string;
  error: string | null;
  status: number | null;
}

export interface CodexFeatureEntry {
  name: string;
  status: string | null;
  enabled: boolean;
  removed: boolean;
}

export const MULTI_AGENT_V2_THREAD_CAP_FEATURE_CONFIG_PATH =
  'features.multi_agent_v2.max_concurrent_threads_per_session';
export const MULTI_AGENT_V2_THREAD_CAP_CONFIG_PATH =
  'multi_agent_v2.max_concurrent_threads_per_session';

export interface ConfiguredMultiAgentV2ThreadCap {
  path: typeof MULTI_AGENT_V2_THREAD_CAP_FEATURE_CONFIG_PATH | typeof MULTI_AGENT_V2_THREAD_CAP_CONFIG_PATH;
  actual: number | null;
  valid: boolean;
}

export function readCodexFeatureProbe(
  codexBin: string,
  env: NodeJS.ProcessEnv = process.env
): CodexFeatureProbeResult {
  const result = spawnSync(codexBin, ['features', 'list'], {
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000
  });
  const stderr = String(result.stderr ?? '');
  if (result.error || result.status !== 0) {
    return {
      flags: null,
      features: null,
      removed: [],
      stderr,
      error: result.error
        ? result.error.message
        : `codex features list exited with status ${result.status ?? '<unknown>'}`,
      status: result.status
    };
  }
  const stdout = String(result.stdout ?? '');
  const features = parseCodexFeaturesFromText(stdout);
  return {
    flags: parseFeatureFlagsFromEntries(features),
    features,
    removed: Object.values(features)
      .filter((feature) => feature.removed)
      .map((feature) => feature.name)
      .sort(),
    stderr,
    error: null,
    status: result.status
  };
}

export function codexFeatureProbeRejectsAgentMaxThreads(probe: CodexFeatureProbeResult): boolean {
  const text = `${probe.error ?? ''}\n${probe.stderr}`.toLowerCase();
  const mentionsMaxThreads = /\bagents\.max_threads\b/u.test(text) || /\bmax[_\s-]?threads\b/u.test(text);
  return mentionsMaxThreads && /\bmulti_agent_v2\b/u.test(text);
}

export function codexFeatureProbeDisablesMultiAgentV2(probe: CodexFeatureProbeResult): boolean {
  return probe.flags?.multi_agent_v2 === false;
}

export function readConfiguredMultiAgentV2Enabled(config: Record<string, unknown>): boolean {
  const features = readRecordValue(config.features);
  const featureValue = features?.multi_agent_v2;
  if (readBooleanValue(featureValue) === true) {
    return true;
  }
  if (readRecordValue(featureValue)?.enabled === true) {
    return true;
  }
  return readRecordValue(config.multi_agent_v2)?.enabled === true;
}

export function readConfiguredMultiAgentV2ThreadCap(
  config: Record<string, unknown>
): ConfiguredMultiAgentV2ThreadCap | null {
  const featureScopedCap = readNumberLikeValue(
    readRecordValue(readRecordValue(config.features)?.multi_agent_v2)?.max_concurrent_threads_per_session
  );
  if (featureScopedCap.present) {
    return {
      path: MULTI_AGENT_V2_THREAD_CAP_FEATURE_CONFIG_PATH,
      actual: featureScopedCap.actual,
      valid: featureScopedCap.valid
    };
  }

  const topLevelCap = readNumberLikeValue(
    readRecordValue(config.multi_agent_v2)?.max_concurrent_threads_per_session
  );
  if (topLevelCap.present) {
    return {
      path: MULTI_AGENT_V2_THREAD_CAP_CONFIG_PATH,
      actual: topLevelCap.actual,
      valid: topLevelCap.valid
    };
  }

  return null;
}

export function findConfiguredRemovedFeatureKeys(
  configFeatures: Record<string, unknown> | null | undefined,
  probe: CodexFeatureProbeResult | null | undefined
): string[] {
  if (!configFeatures || !probe || probe.removed.length === 0) {
    return [];
  }
  const removed = new Set(probe.removed);
  return Object.keys(configFeatures)
    .filter((key) => removed.has(key))
    .sort();
}

export function parseCodexFeaturesFromText(stdout: string): Record<string, CodexFeatureEntry> {
  const features: Record<string, CodexFeatureEntry> = {};
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
    if (enabledToken !== 'true' && enabledToken !== 'false') {
      continue;
    }
    const statusTokens = tokens.slice(1, -1);
    const status = statusTokens.length > 0 ? statusTokens.join(' ') : null;
    features[name] = {
      name,
      status,
      enabled: enabledToken === 'true',
      removed: statusTokens.some((token) => token.toLowerCase() === 'removed')
    };
  }
  return features;
}

function parseFeatureFlagsFromEntries(features: Record<string, CodexFeatureEntry>): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const feature of Object.values(features)) {
    flags[feature.name] = feature.enabled;
  }
  return flags;
}

function readRecordValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readBooleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readNumberLikeValue(value: unknown): { present: boolean; actual: number | null; valid: boolean } {
  if (typeof value === 'undefined') {
    return { present: false, actual: null, valid: false };
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return { present: true, actual: value, valid: true };
  }
  return { present: true, actual: null, valid: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
