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
