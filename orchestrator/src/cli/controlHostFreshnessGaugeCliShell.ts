/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import {
  assertProviderControlHostFreshnessArtifactRoot,
  evaluateProviderControlHostFreshnessGauge,
  formatProviderControlHostFreshnessGaugeText,
  type ProviderControlHostFreshnessGaugeSources,
  type ProviderControlHostFreshnessGaugeThresholds
} from './control/providerControlHostFreshnessGauge.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';

export interface RunControlHostFreshnessGaugeCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

export async function runControlHostFreshnessGaugeCliShell(
  params: RunControlHostFreshnessGaugeCliShellParams
): Promise<void> {
  if (params.flags.help !== undefined) {
    params.printHelp();
    return;
  }
  const artifactRoot = readStringFlag(params.flags, 'artifact-root') ?? readStringFlag(params.flags, 'run-dir');
  const paths = readExplicitPathFlags(params.flags);
  if (!artifactRoot && !hasExplicitPaths(paths)) {
    throw new Error(
      'control-host freshness-gauge requires --artifact-root <path>, --run-dir <path>, or explicit artifact path flags.'
    );
  }
  if (artifactRoot) {
    await assertProviderControlHostFreshnessArtifactRoot(artifactRoot);
  }
  const report = await evaluateProviderControlHostFreshnessGauge({
    artifactRoot,
    now: readStringFlag(params.flags, 'now'),
    strict: readBooleanFlag(params.flags, 'strict'),
    maxDepth: readIntegerFlag(params.flags, 'max-depth'),
    thresholds: readThresholdFlags(params.flags),
    paths
  });
  const format = readOutputFormatFlag(params.flags);
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatProviderControlHostFreshnessGaugeText(report));
  }
  if (report.strict_failed) {
    process.exitCode = 1;
  }
}

function readExplicitPathFlags(flags: ArgMap): Partial<Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>> {
  return compactPathOptions({
    provider_intake_state: readPathListFlag(flags, 'provider-intake-state'),
    provider_manifests: readPathListFlag(flags, 'provider-manifest', 'provider-manifests'),
    provider_proofs: readPathListFlag(flags, 'provider-proof', 'provider-proofs'),
    worker_audit_jsonl: readPathListFlag(flags, 'worker-audit-jsonl'),
    control_endpoint_metadata: readPathListFlag(flags, 'control-endpoint-metadata'),
    status_datasets: readPathListFlag(flags, 'status-dataset', 'status-datasets'),
    polling_health: readPathListFlag(flags, 'polling-health'),
    linear_budget_state: readPathListFlag(flags, 'linear-budget-state')
  });
}

function compactPathOptions(
  paths: Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>
): Partial<Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>> {
  return Object.fromEntries(
    Object.entries(paths).filter(([, value]) => Array.isArray(value) && value.length > 0)
  ) as Partial<Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>>;
}

function hasExplicitPaths(paths: Partial<Omit<ProviderControlHostFreshnessGaugeSources, 'artifact_root'>>): boolean {
  return Object.values(paths).some((value) => Array.isArray(value) && value.length > 0);
}

function readPathListFlag(flags: ArgMap, ...keys: string[]): string[] {
  return keys.flatMap((key) => {
    const raw = readStringFlag(flags, key);
    return raw === undefined
      ? []
      : raw.split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  });
}

function readThresholdFlags(flags: ArgMap): Partial<ProviderControlHostFreshnessGaugeThresholds> {
  return {
    staleRefreshAfterMs: readIntegerFlag(flags, 'stale-refresh-after-ms') ?? undefined,
    staleHeartbeatAfterMs: readIntegerFlag(flags, 'stale-heartbeat-after-ms') ?? undefined,
    staleRetryAfterMs: readIntegerFlag(flags, 'stale-retry-after-ms') ?? undefined,
    staleClaimQueueAfterMs: readIntegerFlag(flags, 'stale-claim-queue-after-ms') ?? undefined,
    claimToStartDegradedAfterMs: readIntegerFlag(flags, 'claim-to-start-degraded-after-ms') ?? undefined,
    startToHeartbeatDegradedAfterMs: readIntegerFlag(flags, 'start-to-heartbeat-degraded-after-ms') ?? undefined,
    linearHeadroomLowRatio: readNumberFlag(flags, 'linear-headroom-low-ratio') ?? undefined,
    childLaneCap: readIntegerFlag(flags, 'child-lane-cap') ?? undefined
  };
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBooleanFlag(flags: ArgMap, key: string): boolean {
  const value = flags[key];
  if (value === undefined) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid --${key}: expected true|false.`);
}

function readIntegerFlag(flags: ArgMap, key: string): number | null {
  const raw = readStringFlag(flags, key);
  if (raw === undefined) {
    return null;
  }
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Invalid --${key}: expected non-negative integer milliseconds.`);
  }
  return Number(raw);
}

function readNumberFlag(flags: ArgMap, key: string): number | null {
  const raw = readStringFlag(flags, key);
  if (raw === undefined) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid --${key}: expected non-negative number.`);
  }
  return parsed;
}

function readOutputFormatFlag(flags: ArgMap): OutputFormat {
  const raw = readStringFlag(flags, 'format');
  if (raw === undefined || raw === 'text') {
    return 'text';
  }
  if (raw === 'json') {
    return 'json';
  }
  throw new Error(`Invalid --format: expected text|json, got ${JSON.stringify(raw)}.`);
}
