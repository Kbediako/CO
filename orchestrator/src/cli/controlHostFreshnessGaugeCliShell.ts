/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import {
  assertProviderControlHostFreshnessArtifactRoot,
  evaluateProviderControlHostFreshnessGauge,
  formatProviderControlHostFreshnessGaugeText,
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
  const artifactRoot = readStringFlag(params.flags, 'artifact-root') ?? readStringFlag(params.flags, 'run-dir') ?? '.';
  await assertProviderControlHostFreshnessArtifactRoot(artifactRoot);
  const report = await evaluateProviderControlHostFreshnessGauge({
    artifactRoot,
    now: readStringFlag(params.flags, 'now'),
    strict: readBooleanFlag(params.flags, 'strict'),
    maxDepth: readIntegerFlag(params.flags, 'max-depth'),
    thresholds: readThresholdFlags(params.flags)
  });
  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatProviderControlHostFreshnessGaugeText(report));
  }
  if (report.strict_failed) {
    process.exitCode = 1;
  }
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
