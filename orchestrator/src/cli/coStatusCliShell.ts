/* eslint-disable patterns/prefer-logger-over-console */

import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

import {
  readMachineStatusDatasetWithEndpointRecovery,
  readUiDatasetWithEndpointRecovery,
  resolveAttachTarget,
  type CoStatusAttachTarget,
  runCoStatusAttachCliShell
} from './coStatusAttachCliShell.js';
import { readControlServerSeeds } from './control/controlServerSeedLoading.js';
import { ControlStateStore } from './control/controlState.js';
import { createControlRuntime } from './control/controlRuntime.js';
import {
  buildMachineStatusDataset,
  type ControlMachineStatusDataset
} from './control/controlMachineStatusPresenter.js';
import {
  markLinearAdvisoryStateStaleFromProviderIntake,
  normalizeLinearAdvisoryState
} from './control/linearWebhookController.js';
import {
  readUiDataset,
  type OperatorDashboardDataset,
  type OperatorDashboardIssuePayload,
  type OperatorDashboardSessionPayload
} from './control/operatorDashboardPresenter.js';
import {
  evaluateProviderControlHostFreshnessGauge,
  type ProviderControlHostFreshnessGaugeReport,
  type ProviderControlHostFreshnessVerdict
} from './control/providerControlHostFreshnessGauge.js';
import {
  buildProviderIntakeSummary,
  isActiveProviderIntakeClaim,
  normalizeProviderIntakeState,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState
} from './control/providerIntakeState.js';
import {
  readProviderLinearWorkerWorkspacePath,
  type ControlProviderIntakeUnavailablePayload,
  type ControlPollingHealthPayload,
  type ControlLatestEventPayload,
  type ControlRunningPayload,
  type ControlSelectedRunPayload,
  type ControlStatusFallbackExpiryMetadata
} from './control/observabilityReadModel.js';
import type { RunPaths } from './run/runPaths.js';
import { findPackageRoot } from './utils/packageInfo.js';
import {
  inspectSourceRootFreshness,
  type SourceRootFreshnessInspection
} from './utils/sourceRootFreshness.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
const CO_STATUS_ATTACH_UNSUPPORTED_FLAGS = ['pipeline'] as const;
const DEFAULT_CO_STATUS_JSON_REQUEST_TIMEOUT_MS = 5_000;
const DEFAULT_LOCAL_MACHINE_STATUS_MAX_AGE_MS = 90_000;
const LOCAL_DEGRADED_FALLBACK_ALLOWED_VERDICTS = new Set<ProviderControlHostFreshnessVerdict>([
  'healthy',
  'degraded'
]);
const LOCAL_DEGRADED_FALLBACK_ALLOWED_FINDING_CODES = new Set(['active_worker_proof_missing']);
const LOCAL_MACHINE_STATUS_DEGRADED_ALLOWED_FINDING_CODES = new Set([
  ...LOCAL_DEGRADED_FALLBACK_ALLOWED_FINDING_CODES,
  'refresh_timestamp_missing'
]);
const CURRENT_HOST_UNHEALTHY_MARKER = 'current-host-unhealthy';
const CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK =
  'control-host unavailable; stale endpoint after control-host restart';
const LEGACY_CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK =
  'control-host unavailable; control_endpoint.json has not rotated to a reachable host';
const CURRENT_HOST_UNHEALTHY_ROTATED_ENDPOINT_FALLBACK =
  'refreshed control-host endpoint is still unreachable';
const SELECTED_RUN_PROJECTION_FALLBACK = 'selected-run projection fallback';
const COMPATIBILITY_ISSUE_PROJECTION_FALLBACK = 'compatibility issue projection fallback';
const SOURCE_AUTHORITY_LABELS_FALLBACK =
  'CLI/API/UI /ui/data.json source labels and authority/proof split';

type CoStatusDegradedReadReason =
  | 'ui_request_timeout'
  | 'current_host_unhealthy'
  | 'dashboard_read_failed'
  | 'dashboard_read_timeout';

const LOCAL_MACHINE_STATUS_DEGRADED_ALLOWED_REASONS = new Set<CoStatusDegradedReadReason>([
  'ui_request_timeout'
]);

type DegradedMetadataPayloadIdentity = {
  issue_identifier: string;
  issue_id: string | null;
  task_id: string | null;
  run_id: string | null;
};

export interface CoStatusDegradedReadPayload {
  reason: CoStatusDegradedReadReason;
  source: 'local_machine_status' | 'local_seeded_runtime' | 'operator_dashboard_degraded';
  freshness_verdict: ProviderControlHostFreshnessVerdict;
  artifact_root: string;
  finding_codes: string[];
}

export type CoStatusOperatorDashboardDataset = OperatorDashboardDataset & {
  degraded_read?: CoStatusDegradedReadPayload;
};

type CoStatusMachineStatusCompatibilityFields = Partial<
  Pick<
    OperatorDashboardDataset,
    | 'selected_issue_identifier'
    | 'selected'
    | 'totals'
    | 'rate_limits'
    | 'repo_gates'
    | 'tracked'
    | 'fallback_expiry'
  >
>;

export type CoStatusMachineStatusJsonDataset = ControlMachineStatusDataset &
  CoStatusMachineStatusCompatibilityFields & {
    degraded_read?: CoStatusDegradedReadPayload;
  };

export type CoStatusJsonDataset = CoStatusOperatorDashboardDataset | CoStatusMachineStatusJsonDataset;

export interface CoStatusHealthzDataset {
  status: 'ok';
  mode: 'control_host_liveness';
  timestamp?: string;
  read_only?: true;
}

export interface RunCoStatusCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

interface CoStatusRuntimeFreshnessBlockPayload {
  mode: 'co_status_runtime_freshness';
  read_only: true;
  status: 'blocked';
  reason: 'stale_generated_runtime';
  stale_generated_runtime: true;
  source_root_freshness: SourceRootFreshnessInspection;
  detail: string;
}

interface CoStatusCliShellDependencies {
  inspectRuntimeFreshness: () => SourceRootFreshnessInspection;
  setExitCode: (code: number) => void;
  log: (message: string) => void;
  error: (message: string) => void;
}

const DEFAULT_CO_STATUS_CLI_SHELL_DEPENDENCIES: CoStatusCliShellDependencies = {
  inspectRuntimeFreshness: inspectCurrentCoStatusRuntimeFreshness,
  setExitCode: (code: number) => {
    process.exitCode = code;
  },
  log: (message: string) => console.log(message),
  error: (message: string) => console.error(message)
};

export async function runCoStatusCliShell(
  params: RunCoStatusCliShellParams,
  overrides: Partial<CoStatusCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_CO_STATUS_CLI_SHELL_DEPENDENCIES, ...overrides };
  if (params.flags.help !== undefined) {
    params.printHelp();
    return;
  }

  assertAttachCompatibleFlags(params.flags);
  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  const explicitMachineStatus = readBooleanFlag(params.flags, 'machine-status');
  const explicitHealthz = readBooleanFlag(params.flags, 'healthz');
  const requestedDashboardJson =
    readBooleanFlag(params.flags, 'dashboard') || readBooleanFlag(params.flags, 'operator-dashboard');
  if (explicitHealthz) {
    const dataset = await readCoStatusHealthzDataset({ flags: params.flags });
    dependencies.log(JSON.stringify(dataset, null, 2));
    return;
  }
  const explicitMachineStatusJsonSnapshot =
    format === 'json' && explicitMachineStatus && !requestedDashboardJson;
  let runtimeFreshnessBlock: CoStatusRuntimeFreshnessBlockPayload | null = null;
  try {
    runtimeFreshnessBlock = resolveCoStatusRuntimeFreshnessBlock(
      dependencies.inspectRuntimeFreshness()
    );
  } catch (error) {
    if (!explicitMachineStatusJsonSnapshot) {
      throw error;
    }
  }
  if (runtimeFreshnessBlock && !explicitMachineStatusJsonSnapshot) {
    emitCoStatusRuntimeFreshnessBlock(runtimeFreshnessBlock, format, dependencies);
    return;
  }
  if (format !== 'json') {
    await runCoStatusAttachCliShell(params);
    return;
  }

  const dataset = requestedDashboardJson
    ? await readCoStatusJsonDataset({ flags: params.flags })
    : await readCoStatusMachineStatusDataset({ flags: params.flags });
  dependencies.log(JSON.stringify(dataset, null, 2));
}

function inspectCurrentCoStatusRuntimeFreshness(): SourceRootFreshnessInspection {
  const packageRoot = findPackageRoot();
  const envRepoRoot = process.env.CODEX_ORCHESTRATOR_ROOT?.trim();
  return inspectSourceRootFreshness({
    intendedRepoRoot: envRepoRoot || packageRoot,
    argv: process.argv,
    packageRoot
  });
}

function resolveCoStatusRuntimeFreshnessBlock(
  freshness: SourceRootFreshnessInspection
): CoStatusRuntimeFreshnessBlockPayload | null {
  if (!freshness.drift_classes.includes('source_vs_dist_drift')) {
    return null;
  }
  return {
    mode: 'co_status_runtime_freshness',
    read_only: true,
    status: 'blocked',
    reason: 'stale_generated_runtime',
    stale_generated_runtime: true,
    source_root_freshness: freshness,
    detail:
      `co-status is running generated dist while a source entrypoint exists (${freshness.detail || freshness.entrypoint_kind}); run co-status through the source-first bootstrap entrypoint before trusting current provider or control-host status.`
  };
}

function emitCoStatusRuntimeFreshnessBlock(
  payload: CoStatusRuntimeFreshnessBlockPayload,
  format: OutputFormat,
  dependencies: CoStatusCliShellDependencies
): void {
  if (format === 'json') {
    dependencies.log(JSON.stringify(payload, null, 2));
  } else {
    dependencies.error(`co-status blocked: ${payload.detail}`);
    dependencies.error(
      `Runtime freshness: ${payload.source_root_freshness.status}; drift=${payload.source_root_freshness.drift_classes.join(', ')}`
    );
  }
  dependencies.setExitCode(1);
}

export async function readCoStatusMachineStatusDataset(input: {
  flags: ArgMap;
  requestTimeoutMs?: number;
}): Promise<CoStatusJsonDataset> {
  let target = await resolveAttachTarget(input.flags);
  const requestTimeoutMs = input.requestTimeoutMs ?? DEFAULT_CO_STATUS_JSON_REQUEST_TIMEOUT_MS;
  const maxMachineStatusAgeMs = readOptionalNonNegativeIntegerFlag(
    input.flags,
    'machine-status-max-age-ms'
  ) ?? DEFAULT_LOCAL_MACHINE_STATUS_MAX_AGE_MS;
  try {
    return await readMachineStatusDatasetWithEndpointRecovery({
      flags: input.flags,
      getTarget: () => target,
      setTarget: (nextTarget) => {
        target = nextTarget;
      },
      requestTimeoutMs,
      recoverSameEndpointTimeout: true
    });
  } catch (error) {
    const degradedDataset = await tryReadDegradedMachineStatusDataset({
      error,
      target,
      allowedReasons: LOCAL_MACHINE_STATUS_DEGRADED_ALLOWED_REASONS,
      maxMachineStatusAgeMs
    });
    if (!degradedDataset) {
      throw error;
    }
    return degradedDataset;
  }
}

export async function readCoStatusHealthzDataset(input: {
  flags: ArgMap;
  requestTimeoutMs?: number;
}): Promise<CoStatusHealthzDataset> {
  let target = await resolveAttachTarget(input.flags);
  const requestTimeoutMs = input.requestTimeoutMs ?? DEFAULT_CO_STATUS_JSON_REQUEST_TIMEOUT_MS;
  try {
    return await fetchCoStatusHealthzDataset(target, requestTimeoutMs);
  } catch (error) {
    let resolvedTarget: CoStatusAttachTarget;
    try {
      resolvedTarget = await resolveAttachTarget(input.flags);
    } catch (resolveError) {
      throw new Error(
        `${formatCoStatusHealthzRequestFailure(error, target)} Re-resolving control_endpoint.json failed: ${
          (resolveError as Error)?.message ?? String(resolveError)
        }.`
      );
    }

    if (!isCoStatusAttachTargetEndpointEquivalent(target, resolvedTarget)) {
      const previousTarget = target;
      target = resolvedTarget;
      try {
        return await fetchCoStatusHealthzDataset(target, requestTimeoutMs);
      } catch (retryError) {
        throw new Error(
          `control-host endpoint rotated from ${previousTarget.baseUrl.toString()} to ${target.baseUrl.toString()}, but the refreshed healthz endpoint is not readable. ${formatCoStatusHealthzRequestFailure(retryError, target, { endpointAlreadyRotated: true })}`
        );
      }
    }

    if (isCoStatusHealthzTimeoutError(error)) {
      try {
        return await fetchCoStatusHealthzDataset(target, requestTimeoutMs);
      } catch (retryError) {
        if (isCoStatusHealthzTimeoutError(retryError)) {
          throw new Error(formatCoStatusHealthzSameEndpointTimeoutFailure(retryError, target));
        }
        throw new Error(formatCoStatusHealthzRequestFailure(retryError, target));
      }
    }

    throw new Error(formatCoStatusHealthzRequestFailure(error, target));
  }
}

class CoStatusHealthzRequestError extends Error {
  readonly kind: 'auth' | 'http' | 'network' | 'timeout';

  constructor(kind: CoStatusHealthzRequestError['kind'], message: string, options: { cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CoStatusHealthzRequestError';
    this.kind = kind;
  }
}

async function fetchCoStatusHealthzDataset(
  target: CoStatusAttachTarget,
  requestTimeoutMs: number
): Promise<CoStatusHealthzDataset> {
  const url = new URL('/healthz', target.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${target.token}`,
        'x-csrf-token': target.token
      },
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new CoStatusHealthzRequestError(
        'timeout',
        `control-host healthz request timeout after ${requestTimeoutMs}ms`,
        { cause: error }
      );
    }
    throw new CoStatusHealthzRequestError(
      'network',
      `control-host healthz unavailable at ${url.toString()}: ${formatCoStatusHealthzFetchNetworkError(error)}`,
      { cause: error }
    );
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const statusText = response.statusText.trim() || 'HTTP error';
    if (response.status === 401 || response.status === 403) {
      throw new CoStatusHealthzRequestError(
        'auth',
        `control-host healthz auth failed: ${response.status} ${statusText}; refresh control_auth.json or restart co-status against the current control-host.`
      );
    }
    throw new CoStatusHealthzRequestError(
      'http',
      `control-host healthz request failed: ${response.status} ${statusText}`
    );
  }
  const payload = (await response.json()) as unknown;
  if (!isCoStatusHealthzDataset(payload)) {
    throw new Error('control-host healthz payload invalid');
  }
  return payload;
}

function isCoStatusAttachTargetEndpointEquivalent(
  left: CoStatusAttachTarget,
  right: CoStatusAttachTarget
): boolean {
  return left.baseUrl.toString() === right.baseUrl.toString() && left.token === right.token;
}

function isCoStatusHealthzTimeoutError(error: unknown): error is CoStatusHealthzRequestError {
  return error instanceof CoStatusHealthzRequestError && error.kind === 'timeout';
}

function formatCoStatusHealthzSameEndpointTimeoutFailure(
  error: CoStatusHealthzRequestError,
  target: CoStatusAttachTarget
): string {
  return [
    `${error.message}.`,
    `The current resolved /healthz endpoint at ${target.baseUrl.toString()} timed out again after endpoint re-resolution returned the same endpoint/token; this is a same-endpoint current-endpoint timeout from endpoint starvation or event-loop blocking, not stale/dead endpoint ECONNREFUSED recovery or attach restart/rotation.`
  ].join(' ');
}

function formatCoStatusHealthzRequestFailure(
  error: unknown,
  target: CoStatusAttachTarget,
  options: { endpointAlreadyRotated?: boolean } = {}
): string {
  if (error instanceof CoStatusHealthzRequestError) {
    if (error.kind === 'network') {
      if (options.endpointAlreadyRotated) {
        return `current-host-unhealthy: ${error.message}. The refreshed control-host healthz endpoint is still unreachable; wait for the new host to come up or rerun co-status.`;
      }
      return `current-host-unhealthy: control_endpoint.json; control-host unavailable; stale endpoint after control-host restart. control_endpoint.json has not rotated to a reachable host. ${error.message}. Waiting for ${resolve(target.runDir, 'control_endpoint.json')} to rotate or rerun co-status.`;
    }
    if (error.kind === 'timeout') {
      return `${error.message}. The control-host did not answer before the healthz timeout; if restart is in progress, wait for endpoint rotation or rerun co-status.`;
    }
    return error.message;
  }
  return `control-host healthz request failed: ${(error as Error)?.message ?? String(error)}`;
}

function formatCoStatusHealthzFetchNetworkError(error: unknown): string {
  const message = (error as Error)?.message ?? String(error);
  const code = extractCoStatusHealthzFetchErrorCode(error);
  return code ? `${message} (${code})` : message;
}

function extractCoStatusHealthzFetchErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }
  const cause = (error as { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object') {
    return null;
  }
  const code = (cause as { code?: unknown }).code;
  return typeof code === 'string' && code.trim().length > 0 ? code : null;
}

function isCoStatusHealthzDataset(payload: unknown): payload is CoStatusHealthzDataset {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { status?: unknown }).status === 'ok' &&
    (payload as { mode?: unknown }).mode === 'control_host_liveness'
  );
}

export async function readCoStatusJsonDataset(input: {
  flags: ArgMap;
  requestTimeoutMs?: number;
}): Promise<CoStatusJsonDataset> {
  let target = await resolveAttachTarget(input.flags);
  const requestTimeoutMs = input.requestTimeoutMs ?? DEFAULT_CO_STATUS_JSON_REQUEST_TIMEOUT_MS;
  const maxMachineStatusAgeMs = readOptionalNonNegativeIntegerFlag(
    input.flags,
    'machine-status-max-age-ms'
  ) ?? DEFAULT_LOCAL_MACHINE_STATUS_MAX_AGE_MS;
  try {
    const dataset = await readUiDatasetWithEndpointRecovery({
      flags: input.flags,
      getTarget: () => target,
      setTarget: (nextTarget) => {
        target = nextTarget;
      },
      requestTimeoutMs,
      recoverSameEndpointTimeout: true
    });
    return await annotateDashboardDegradedRead(dataset, target, maxMachineStatusAgeMs);
  } catch (error) {
    const degradedMachineStatus = await tryReadDegradedMachineStatusDataset({
      error,
      target,
      allowedReasons: LOCAL_MACHINE_STATUS_DEGRADED_ALLOWED_REASONS,
      maxMachineStatusAgeMs
    });
    if (degradedMachineStatus) {
      return degradedMachineStatus;
    }
    const degradedDataset = await tryReadLocalDegradedUiDataset({
      error,
      target
    });
    if (degradedDataset) {
      return degradedDataset;
    }
    throw error;
  }
}

async function annotateDashboardDegradedRead(
  dataset: OperatorDashboardDataset,
  target: CoStatusAttachTarget,
  maxMachineStatusAgeMs: number
): Promise<CoStatusJsonDataset> {
  if (!dataset.dashboard_degraded) {
    return dataset;
  }
  const freshnessReport = await evaluateProviderControlHostFreshnessGauge({
    artifactRoot: target.runDir
  });
  const machineStatusDataset = await readLocalMachineStatusDataset(target);
  if (
    !isEligibleMachineStatusDegradedRead(
      machineStatusDataset,
      freshnessReport,
      maxMachineStatusAgeMs
    )
  ) {
    throw new Error(
      'Operator dashboard returned degraded data but machine status is not eligible for a degraded read.'
    );
  }
  return {
    ...dataset,
    degraded_read: buildDegradedReadPayload(
      target,
      freshnessReport,
      dataset.dashboard_degraded.reason === 'read_timeout'
        ? 'dashboard_read_timeout'
        : 'dashboard_read_failed',
      'operator_dashboard_degraded'
    )
  };
}

async function tryReadDegradedMachineStatusDataset(input: {
  error: unknown;
  target: CoStatusAttachTarget;
  allowedReasons: ReadonlySet<CoStatusDegradedReadReason>;
  maxMachineStatusAgeMs: number;
}): Promise<CoStatusMachineStatusJsonDataset | null> {
  const degradedReason = resolveLocalDegradedReadReason(input.error);
  if (!degradedReason || !input.allowedReasons.has(degradedReason)) {
    return null;
  }

  const freshnessReport = await evaluateProviderControlHostFreshnessGauge({
    artifactRoot: input.target.runDir
  });
  const localDataset = await readLocalMachineStatusDataset(input.target);
  if (
    isEligibleMachineStatusDegradedRead(
      localDataset,
      freshnessReport,
      input.maxMachineStatusAgeMs
    )
  ) {
    return {
      ...localDataset,
      degraded_read: buildDegradedReadPayload(
        input.target,
        freshnessReport,
        degradedReason,
        'local_machine_status'
      )
    };
  }

  return null;
}

function isEligibleMachineStatusDegradedRead(
  dataset: ControlMachineStatusDataset,
  freshnessReport: ProviderControlHostFreshnessGaugeReport,
  maxMachineStatusAgeMs: number
): boolean {
  return (
    isEligibleMachineStatusFreshnessReport(freshnessReport) &&
    isEligibleDegradedMachineStatusDataset(dataset, freshnessReport, maxMachineStatusAgeMs)
  );
}

function isEligibleDegradedMachineStatusDataset(
  dataset: ControlMachineStatusDataset,
  freshnessReport: ProviderControlHostFreshnessGaugeReport,
  maxMachineStatusAgeMs: number
): boolean {
  const refreshAgeVerdict = freshnessReport.metrics.last_successful_refresh_age_ms.verdict;
  if (
    !LOCAL_DEGRADED_FALLBACK_ALLOWED_VERDICTS.has(refreshAgeVerdict) &&
    !hasOnlyAllowedMachineStatusFreshnessFindings(freshnessReport)
  ) {
    return false;
  }
  const polling = dataset.polling as Record<string, unknown> | null;
  if (!polling) {
    return false;
  }
  if (dataset.provider_intake_unavailable) {
    return false;
  }
  const providerIntake = dataset.provider_intake ?? null;
  return (
    (providerIntake?.active_claim_count ?? 0) === 0 &&
    isRecentMachineStatusTimestamp(polling.updated_at, maxMachineStatusAgeMs) &&
    isRecentMachineStatusTimestamp(polling.progress_updated_at, maxMachineStatusAgeMs) &&
    polling.stuck !== true &&
    polling.restart_required !== true &&
    polling.reason == null &&
    polling.last_error == null &&
    !hasActiveNoProgressRefresh(polling) &&
    !hasStaleControlHostOwnerFreshness(polling)
  );
}

function isRecentMachineStatusTimestamp(value: unknown, maxAgeMs: number): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const timestampMs = Date.parse(value);
  if (!Number.isFinite(timestampMs)) {
    return false;
  }
  const nowMs = Date.now();
  return timestampMs <= nowMs && nowMs - timestampMs <= maxAgeMs;
}

function hasActiveNoProgressRefresh(polling: Record<string, unknown> | null | undefined): boolean {
  if (!polling) {
    return false;
  }
  if (polling.stuck === true || polling.restart_required === true) {
    return true;
  }
  if (polling.checking !== true) {
    return false;
  }
  const progressElapsedMs =
    typeof polling.progress_elapsed_ms === 'number' && Number.isFinite(polling.progress_elapsed_ms)
      ? polling.progress_elapsed_ms
      : null;
  const stalledAfterMs =
    typeof polling.stalled_after_ms === 'number' && Number.isFinite(polling.stalled_after_ms)
      ? polling.stalled_after_ms
      : null;
  return (
    progressElapsedMs !== null &&
    stalledAfterMs !== null &&
    progressElapsedMs > stalledAfterMs
  );
}

function hasStaleControlHostOwnerFreshness(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const freshness = record.source_root_freshness;
  if (
    typeof freshness === 'object' &&
    freshness !== null &&
    !Array.isArray(freshness)
  ) {
    const freshnessRecord = freshness as Record<string, unknown>;
    if (
      freshnessRecord.status === 'warning' ||
      freshnessRecord.status === 'stale' ||
      (Array.isArray(freshnessRecord.drift_classes) && freshnessRecord.drift_classes.length > 0)
    ) {
      return true;
    }
  }
  return Object.values(record).some(hasStaleControlHostOwnerFreshness);
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
  return flags[key] === true || flags[key] === 'true';
}

function readOptionalNonNegativeIntegerFlag(flags: ArgMap, key: string): number | null {
  const value = flags[key];
  if (value === undefined) {
    return null;
  }
  if (value === true || typeof value !== 'string') {
    throw new Error(`Invalid --${key}: expected integer milliseconds >= 0`);
  }
  const raw = value.trim();
  if (!/^\d+$/u.test(raw)) {
    throw new Error(`Invalid --${key}: expected integer milliseconds >= 0`);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --${key}: expected integer milliseconds >= 0`);
  }
  return parsed;
}

function assertAttachCompatibleFlags(flags: ArgMap): void {
  const unsupported = CO_STATUS_ATTACH_UNSUPPORTED_FLAGS.filter((flag) => flags[flag] !== undefined);
  if (unsupported.length === 0) {
    return;
  }
  const renderedFlags = unsupported.map((flag) => `--${flag}`).join(', ');
  throw new Error(
    `co-status attaches to an existing control host and does not accept launch-only flags: ${renderedFlags}. Use \`control-host\` to start a control host with launch settings.`
  );
}

async function tryReadLocalDegradedUiDataset(input: {
  error: unknown;
  target: CoStatusAttachTarget;
}): Promise<CoStatusJsonDataset | null> {
  const degradedReason = resolveLocalDegradedReadReason(input.error);
  if (!degradedReason) {
    return null;
  }

  const freshnessReport = await evaluateProviderControlHostFreshnessGauge({
    artifactRoot: input.target.runDir
  });
  const refreshAgeVerdict = freshnessReport.metrics.last_successful_refresh_age_ms.verdict;
  if (
    !isEligibleLocalDegradedFallbackFreshnessReport(freshnessReport) ||
    !LOCAL_DEGRADED_FALLBACK_ALLOWED_VERDICTS.has(refreshAgeVerdict)
  ) {
    return null;
  }

  const localDataset = await readLocalUiDataset(input.target);
  if (
    await hasUnsafeActiveProviderIntakeRun(localDataset.providerIntakeState) ||
    hasActiveNoProgressRefresh(localDataset.providerIntakeState.polling)
  ) {
    return null;
  }
  const dataset = applyProviderIntakeTruthOverlay(
    localDataset.dataset,
    input.target,
    localDataset.providerIntakeState
  );
  const providerIntake = dataset.provider_intake ?? null;
  if (!providerIntake || providerIntake.active_claim_count < 1) {
    return null;
  }

  return {
    ...dataset,
    degraded_read: buildDegradedReadPayload(input.target, freshnessReport, degradedReason)
  };
}

async function hasUnsafeActiveProviderIntakeRun(state: ProviderIntakeState): Promise<boolean> {
  const activeClaims = state.claims.filter(isDegradedActiveClaim);
  for (const claim of activeClaims) {
    if (!claim.run_manifest_path) {
      continue;
    }
    const manifest = await readJsonRecord(claim.run_manifest_path);
    if (!manifest) {
      return true;
    }
    const status = typeof manifest?.status === 'string' ? manifest.status : null;
    if (status === 'failed' || status === 'cancelled' || status === 'canceled') {
      return true;
    }
  }
  return false;
}

async function readJsonRecord(path: string): Promise<Record<string, unknown> | null> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function resolveLocalDegradedReadReason(error: unknown): CoStatusDegradedReadReason | null {
  const message = (error as Error)?.message ?? String(error);
  if (message.includes('Re-resolving control_endpoint.json failed')) {
    return null;
  }
  if (isCurrentHostUnhealthyErrorMessage(message)) {
    return 'current_host_unhealthy';
  }
  const sameEndpointTimeout = message.includes('same-endpoint current-endpoint timeout');
  if (sameEndpointTimeout && message.includes('control-host ui request timeout after')) {
    return 'ui_request_timeout';
  }
  if (sameEndpointTimeout && message.includes('control-host machine-status request timeout after')) {
    return 'ui_request_timeout';
  }
  return null;
}

function isCurrentHostUnhealthyErrorMessage(message: string): boolean {
  return [
    CURRENT_HOST_UNHEALTHY_MARKER,
    CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK,
    LEGACY_CURRENT_HOST_UNHEALTHY_STALE_ENDPOINT_FALLBACK,
    CURRENT_HOST_UNHEALTHY_ROTATED_ENDPOINT_FALLBACK
  ].some((fragment) => message.includes(fragment));
}

function isEligibleLocalDegradedFallbackFreshnessReport(
  report: ProviderControlHostFreshnessGaugeReport
): boolean {
  if (report.verdict === 'healthy') {
    return true;
  }
  if (!LOCAL_DEGRADED_FALLBACK_ALLOWED_VERDICTS.has(report.verdict) && report.verdict !== 'unknown') {
    return false;
  }
  return (
    report.findings.length > 0 &&
    report.findings.every((finding) => LOCAL_DEGRADED_FALLBACK_ALLOWED_FINDING_CODES.has(finding.code))
  );
}

function isEligibleMachineStatusFreshnessReport(
  report: ProviderControlHostFreshnessGaugeReport
): boolean {
  return (
    isEligibleLocalDegradedFallbackFreshnessReport(report) ||
    hasOnlyAllowedMachineStatusFreshnessFindings(report)
  );
}

function hasOnlyAllowedMachineStatusFreshnessFindings(
  report: ProviderControlHostFreshnessGaugeReport
): boolean {
  return (
    report.verdict === 'unknown' &&
    report.findings.length > 0 &&
    report.findings.every((finding) =>
      LOCAL_MACHINE_STATUS_DEGRADED_ALLOWED_FINDING_CODES.has(finding.code)
    )
  );
}

function buildDegradedReadPayload(
  target: CoStatusAttachTarget,
  report: ProviderControlHostFreshnessGaugeReport,
  reason: CoStatusDegradedReadReason,
  source: CoStatusDegradedReadPayload['source'] = 'local_seeded_runtime'
): CoStatusDegradedReadPayload {
  return {
    reason,
    source,
    freshness_verdict: report.verdict,
    artifact_root: target.runDir,
    finding_codes: report.findings.map((finding) => finding.code)
  };
}

function applyProviderIntakeTruthOverlay(
  dataset: OperatorDashboardDataset,
  target: CoStatusAttachTarget,
  providerIntakeState: ProviderIntakeState
): OperatorDashboardDataset {
  const providerIntake = dataset.provider_intake ?? null;
  const selectedClaim = selectDegradedOverlayClaim(providerIntakeState, providerIntake?.selected_claim.issue_identifier);
  if (!selectedClaim) {
    return dataset;
  }

  const activeClaims = [...providerIntakeState.claims]
    .sort(compareDegradedClaims)
    .filter(isDegradedActiveClaim);
  const runningClaims = activeClaims.filter((claim) => resolveDegradedClaimState(claim) === 'running');
  const status = resolveDegradedClaimStatus(resolveDegradedClaimState(selectedClaim));
  const selectedFallbackExpiry = selectControlHostFallbackExpiry(dataset.fallback_expiry, [
    SELECTED_RUN_PROJECTION_FALLBACK,
    SOURCE_AUTHORITY_LABELS_FALLBACK
  ]);
  const runningFallbackExpiry = selectControlHostFallbackExpiry(dataset.fallback_expiry, [
    SELECTED_RUN_PROJECTION_FALLBACK,
    SOURCE_AUTHORITY_LABELS_FALLBACK
  ]);
  const issueFallbackExpiry = selectControlHostFallbackExpiry(dataset.fallback_expiry, [
    COMPATIBILITY_ISSUE_PROJECTION_FALLBACK,
    SOURCE_AUTHORITY_LABELS_FALLBACK
  ]);
  const selectedExisting = selectMatchingDegradedMetadataPayload(
    dataset.selected,
    selectedClaim
  );
  const selected = buildDegradedSelectedPayload(
    selectedExisting,
    selectedExisting,
    selectedClaim,
    target,
    status,
    selectedFallbackExpiry
  );
  const runningEntries = runningClaims.map((claim) => {
    const existingRunning =
      dataset.running.find((entry) => isDegradedMetadataPayloadMatchingClaim(entry, claim)) ?? null;
    const existingIssue =
      dataset.issues.find((entry) => isDegradedMetadataPayloadMatchingClaim(entry, claim)) ?? null;
    const existingIssueMetadata = selectMatchingDegradedMetadataPayload(existingIssue, claim);
    const selectedClaimFallbackExpiry =
      isDegradedMetadataPayloadMatchingClaim(selected, claim) ? selected.fallback_expiry : undefined;
    const fallbackExpiry = mergeDegradedFallbackExpiry(
      existingRunning?.fallback_expiry,
      existingIssueMetadata?.running?.fallback_expiry,
      selectedClaimFallbackExpiry,
      runningFallbackExpiry
    );
    return buildDegradedRunningSessionPayload(
      claim,
      selected,
      dataset.host,
      fallbackExpiry,
      existingRunning,
      existingIssueMetadata
    );
  });
  const synthesizedIssues = activeClaims.length > 0 ? activeClaims : [selectedClaim];
  const issues = [
    ...synthesizedIssues.map((claim) => {
      const existingIssue =
        dataset.issues.find((entry) => isDegradedMetadataPayloadMatchingClaim(entry, claim)) ?? null;
      const existingIssueMetadata = selectMatchingDegradedMetadataPayload(existingIssue, claim);
      return buildDegradedIssuePayload(
        existingIssue,
        existingIssueMetadata,
        claim,
        selected,
        dataset.host,
        resolveDegradedClaimStatus(resolveDegradedClaimState(claim)),
        issueFallbackExpiry,
        runningFallbackExpiry,
        dataset.running.find((entry) => isDegradedMetadataPayloadMatchingClaim(entry, claim)) ?? null
      );
    }),
    ...dataset.issues.filter(
      (entry) =>
        entry.issue_identifier !== selected.issue_identifier &&
        !synthesizedIssues.some((claim) => claim.issue_identifier === entry.issue_identifier) &&
        !isDegradedPlaceholderIssue(entry, target)
    )
  ].map((entry) => ({
    ...entry,
    is_selected: entry.issue_identifier === selected.issue_identifier
  }));

  return {
    ...dataset,
    counts: {
      ...dataset.counts,
      running: runningEntries.length > 0 ? runningEntries.length : dataset.counts.running,
      issues: issues.length
    },
    selected_issue_identifier: selected.issue_identifier,
    selected,
    running: runningEntries.length > 0 ? runningEntries : dataset.running,
    issues
  };
}

function selectDegradedOverlayClaim(
  state: ProviderIntakeState,
  selectedIssueIdentifier: string | undefined
): ProviderIntakeClaimRecord | null {
  const activeClaims = [...state.claims].sort(compareDegradedClaims).filter(isDegradedActiveClaim);
  const preferred = typeof selectedIssueIdentifier === 'string'
    ? activeClaims.find((claim) => claim.issue_identifier === selectedIssueIdentifier) ??
      state.claims.find((claim) => claim.issue_identifier === selectedIssueIdentifier) ??
      null
    : null;
  return preferred ?? activeClaims[0] ?? state.claims[0] ?? null;
}

function isDegradedActiveClaim(claim: ProviderIntakeClaimRecord): boolean {
  switch (claim.state) {
    case 'accepted':
    case 'starting':
    case 'running':
    case 'resuming':
    case 'resumable':
    case 'handoff_failed':
      return true;
    default:
      return false;
  }
}

function compareDegradedClaims(
  left: ProviderIntakeClaimRecord,
  right: ProviderIntakeClaimRecord
): number {
  return rankDegradedClaimState(right.state) - rankDegradedClaimState(left.state)
    || Date.parse(right.updated_at) - Date.parse(left.updated_at);
}

function rankDegradedClaimState(state: ProviderIntakeClaimRecord['state']): number {
  switch (state) {
    case 'running':
      return 9;
    case 'resuming':
      return 8;
    case 'starting':
      return 7;
    case 'resumable':
      return 6;
    case 'accepted':
      return 5;
    case 'released':
      return 4;
    case 'handoff_failed':
      return 3;
    case 'completed':
      return 2;
    case 'duplicate':
      return 1;
    case 'stale':
      return 0;
    case 'ignored':
    default:
      return -1;
  }
}

function isDegradedPlaceholderIssue(
  issue: OperatorDashboardIssuePayload,
  target: CoStatusAttachTarget
): boolean {
  return (
    issue.task_id === (target.taskId ?? issue.task_id) &&
    issue.run_id === (target.runId ?? issue.run_id) &&
    (
      issue.issue_identifier === (target.taskId ?? null) ||
      issue.issue_identifier === (target.runId ?? null)
    )
  );
}

function buildDegradedSelectedPayload(
  existing: ControlSelectedRunPayload | null,
  existingMetadata: ControlSelectedRunPayload | null,
  claim: ProviderIntakeClaimRecord,
  target: CoStatusAttachTarget,
  status: { raw_status: string; display_status: string; issue_status: string },
  datasetFallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined
): ControlSelectedRunPayload {
  const latestEvent = buildDegradedLatestEvent(claim);
  return {
    issue_id: claim.issue_id,
    issue_identifier: claim.issue_identifier,
    task_id: claim.task_id,
    run_id: claim.run_id,
    raw_status: status.raw_status,
    display_status: status.display_status,
    status_reason: claim.reason,
    started_at: existing?.started_at ?? null,
    updated_at: claim.updated_at,
    completed_at: null,
    summary: claim.issue_title,
    last_error: existing?.last_error ?? null,
    latest_action: existing?.latest_action ?? null,
    latest_event: latestEvent,
    workspace: {
      path: existing?.workspace.path ?? target.workspaceRoot
    },
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    question_summary: existing?.question_summary ?? {
      queued_count: 0,
      latest_question: null
    },
    tracked: existing?.tracked ?? { linear: null },
    ...resolveDegradedFallbackExpiry(existingMetadata?.fallback_expiry, datasetFallbackExpiry)
  };
}

function selectMatchingDegradedMetadataPayload<TPayload extends DegradedMetadataPayloadIdentity>(
  existing: TPayload | null | undefined,
  claim: ProviderIntakeClaimRecord
): TPayload | null {
  return isDegradedMetadataPayloadMatchingClaim(existing, claim) ? existing ?? null : null;
}

function isDegradedMetadataPayloadMatchingClaim(
  existing: DegradedMetadataPayloadIdentity | null | undefined,
  claim: ProviderIntakeClaimRecord
): boolean {
  if (!existing || existing.issue_identifier !== claim.issue_identifier) {
    return false;
  }
  if (!requiredMetadataIdentifierMatchesClaim(existing.issue_id, claim.issue_id)) {
    return false;
  }
  if (!requiredMetadataIdentifierMatchesClaim(existing.task_id, claim.task_id)) {
    return false;
  }
  if (!optionalMetadataIdentifierMatchesClaim(existing.run_id, claim.run_id)) {
    return false;
  }
  return true;
}

function requiredMetadataIdentifierMatchesClaim(
  existingValue: string | null,
  claimValue: string | null
): boolean {
  return existingValue !== null && claimValue !== null && existingValue === claimValue;
}

function optionalMetadataIdentifierMatchesClaim(
  existingValue: string | null,
  claimValue: string | null
): boolean {
  return existingValue === claimValue;
}

function buildDegradedIssuePayload(
  existing: OperatorDashboardIssuePayload | null,
  existingMetadata: OperatorDashboardIssuePayload | null,
  claim: ProviderIntakeClaimRecord,
  selected: ControlSelectedRunPayload,
  host: string,
  status: { raw_status: string; display_status: string; issue_status: string },
  issueFallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined,
  runningFallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined,
  existingRunning: OperatorDashboardSessionPayload | null = null
): OperatorDashboardIssuePayload {
  const selectedClaimFallbackExpiry =
    isDegradedMetadataPayloadMatchingClaim(selected, claim) ? selected.fallback_expiry : undefined;
  const running = resolveDegradedClaimState(claim) === 'running'
    ? buildDegradedRunningPayload(
        claim,
        mergeDegradedFallbackExpiry(
          existingMetadata?.running?.fallback_expiry,
          selectedClaimFallbackExpiry,
          runningFallbackExpiry
        )
      )
    : null;
  return {
    issue_identifier: claim.issue_identifier,
    issue_id: claim.issue_id,
    task_id: claim.task_id,
    run_id: claim.run_id,
    status: status.issue_status,
    raw_status: status.raw_status,
    display_status: status.display_status,
    status_reason: claim.reason,
    title: claim.issue_title,
    url: existing?.url ?? null,
    workspace: {
      path: resolveDegradedClaimWorkspacePath({
        claim,
        selected,
        existingIssue: existingMetadata,
        existingRunning
      }),
      host
    },
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    session: {
      session_id: existing?.session.session_id ?? null,
      thread_id: existing?.session.thread_id ?? null,
      turn_count: existing?.session.turn_count ?? null
    },
    owner: existing?.owner ?? {
      phase: null,
      status: null
    },
    tokens: existing?.tokens ?? null,
    rate_limits: existing?.rate_limits ?? null,
    summary: claim.issue_title,
    last_error: existing?.last_error ?? null,
    latest_event: buildDegradedLatestEvent(claim),
    recent_agent_activity: existing?.recent_agent_activity ?? [],
    linear_activity: existing?.linear_activity ?? [],
    running,
    retry: existing?.retry ?? null,
    attempts: existing?.attempts ?? {
      restart_count: null,
      current_retry_attempt: claim.retry_attempt ?? null
    },
    tracked: existing?.tracked ?? selected.tracked,
    provider_linear_worker_proof: existing?.provider_linear_worker_proof ?? null,
    provider_debug_snapshot: existing?.provider_debug_snapshot ?? null,
    ...resolveDegradedFallbackExpiry(
      existingMetadata?.fallback_expiry,
      issueFallbackExpiry
    ),
    is_selected: true
  };
}

function buildDegradedRunningPayload(
  claim: ProviderIntakeClaimRecord,
  fallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined
): ControlRunningPayload {
  return {
    issue_id: claim.issue_id,
    issue_identifier: claim.issue_identifier,
    state: 'running',
    display_state: 'running',
    status_reason: claim.reason,
    pid: null,
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    session_id: null,
    turn_count: null,
    last_event: 'provider_intake_refresh',
    last_message: claim.reason,
    display_event: 'provider_intake_refresh',
    event_source: 'provider_intake_state',
    message_recorded_at: claim.updated_at,
    source_updated_at: claim.updated_at,
    started_at: null,
    last_event_at: claim.updated_at,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    },
    ...resolveDegradedFallbackExpiry(fallbackExpiry)
  };
}

function buildDegradedRunningSessionPayload(
  claim: ProviderIntakeClaimRecord,
  selected: ControlSelectedRunPayload,
  host: string,
  fallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined,
  existingRunning: OperatorDashboardSessionPayload | null = null,
  existingIssue: OperatorDashboardIssuePayload | null = null
): OperatorDashboardSessionPayload {
  return {
    issue_identifier: claim.issue_identifier,
    issue_id: claim.issue_id,
    id: claim.issue_identifier,
    bucket: 'running',
    state: 'running',
    reason: claim.reason,
    aliases: [claim.task_id, claim.run_id].filter((value): value is string => Boolean(value)),
    task_id: claim.task_id,
    run_id: claim.run_id,
    summary: claim.issue_title,
    display_state: 'running',
    status_reason: claim.reason,
    pid: null,
    session_id: null,
    thread_id: null,
    turn_count: null,
    workspace_path: resolveDegradedClaimWorkspacePath({
      claim,
      selected,
      existingIssue,
      existingRunning
    }),
    host,
    ...(claim.worker_host !== undefined ? { worker_host: claim.worker_host ?? null } : {}),
    last_event: 'provider_intake_refresh',
    last_message: claim.reason,
    display_event: 'provider_intake_refresh',
    started_at: null,
    last_event_at: claim.updated_at,
    tokens: {
      input_tokens: null,
      output_tokens: null,
      total_tokens: null
    },
    ...resolveDegradedFallbackExpiry(fallbackExpiry)
  };
}

function resolveDegradedClaimWorkspacePath(input: {
  claim: ProviderIntakeClaimRecord;
  selected: ControlSelectedRunPayload;
  existingIssue: OperatorDashboardIssuePayload | null;
  existingRunning: OperatorDashboardSessionPayload | null;
}): string | null {
  if (input.existingRunning?.workspace_path) {
    return input.existingRunning.workspace_path;
  }
  if (input.existingIssue?.workspace.path) {
    return input.existingIssue.workspace.path;
  }
  const proofWorkspacePath = readProviderLinearWorkerWorkspacePath(
    input.existingIssue?.provider_linear_worker_proof ?? null,
    input.existingIssue?.running?.started_at ?? input.existingRunning?.started_at ?? null,
    input.existingIssue?.provider_debug_snapshot ?? null
  );
  if (proofWorkspacePath) {
    return proofWorkspacePath;
  }
  return isDegradedMetadataPayloadMatchingClaim(input.selected, input.claim)
    ? input.selected.workspace.path
    : null;
}

function resolveDegradedFallbackExpiry(
  ...sources: Array<ControlStatusFallbackExpiryMetadata[] | undefined>
): { fallback_expiry: ControlStatusFallbackExpiryMetadata[] } | Record<string, never> {
  const fallbackExpiry = mergeDegradedFallbackExpiry(...sources);
  return fallbackExpiry
    ? {
        fallback_expiry: fallbackExpiry
      }
    : {};
}

function mergeDegradedFallbackExpiry(
  ...sources: Array<ControlStatusFallbackExpiryMetadata[] | undefined>
): ControlStatusFallbackExpiryMetadata[] | undefined {
  const merged: ControlStatusFallbackExpiryMetadata[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    for (const entry of source ?? []) {
      const key = `${entry.fallback}\u0000${entry.decision}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push({ ...entry });
    }
  }
  return merged.length > 0 ? merged : undefined;
}

function selectControlHostFallbackExpiry(
  fallbackExpiry: ControlStatusFallbackExpiryMetadata[] | undefined,
  fallbacks: string[]
): ControlStatusFallbackExpiryMetadata[] | undefined {
  if (!fallbackExpiry) {
    return undefined;
  }
  const fallbackSet = new Set(fallbacks);
  const selected = fallbackExpiry.filter((entry) => fallbackSet.has(entry.fallback));
  return selected.length > 0 ? selected : undefined;
}

function buildDegradedLatestEvent(
  claim: ProviderIntakeClaimRecord
): ControlLatestEventPayload | null {
  return {
    event: 'provider_intake_refresh',
    message: claim.reason,
    at: claim.updated_at
  };
}

function resolveDegradedClaimStatus(state: string): {
  raw_status: string;
  display_status: string;
  issue_status: string;
} {
  if (state === 'running') {
    return {
      raw_status: 'in_progress',
      display_status: 'running',
      issue_status: 'running'
    };
  }
  return {
    raw_status: state,
    display_status: state,
    issue_status: state
  };
}

function resolveDegradedClaimState(claim: Pick<ProviderIntakeClaimRecord, 'state' | 'reason'>): string {
  return claim.state === 'handoff_failed' && claim.reason === 'provider_issue_handoff_owned'
    ? 'handoff_owned'
    : claim.state;
}

async function readLocalUiDataset(target: CoStatusAttachTarget): Promise<{
  dataset: OperatorDashboardDataset;
  providerIntakeState: ProviderIntakeState;
}> {
  const paths = buildRunPathsFromTarget(target);
  const { controlSeed, linearAdvisorySeed, providerIntakeSeed } = await readControlServerSeeds(paths);
  const providerIntakeState = normalizeProviderIntakeState(providerIntakeSeed);
  const controlStore = new ControlStateStore({
    runId: target.runId ?? 'control-host',
    controlSeq: controlSeed?.control_seq ?? 0,
    latestAction: controlSeed?.latest_action ?? null,
    featureToggles: controlSeed?.feature_toggles ?? null,
    transportMutation: controlSeed?.transport_mutation ?? null
  });
  const linearAdvisoryState = normalizeLinearAdvisoryState(linearAdvisorySeed);
  markLinearAdvisoryStateStaleFromProviderIntake(linearAdvisoryState, providerIntakeState);
  const runtime = createControlRuntime({
    controlStore,
    questionQueue: { list: () => [] },
    paths,
    linearAdvisoryState,
    providerIntakeState
  });
  return {
    dataset: await readUiDataset({
      readCompatibilityProjection: () => runtime.snapshot().readCompatibilityProjection()
    }),
    providerIntakeState
  };
}

async function readLocalMachineStatusDataset(
  target: CoStatusAttachTarget
): Promise<ControlMachineStatusDataset> {
  const paths = buildRunPathsFromTarget(target);
  const { providerIntakeSeed } = await readControlServerSeeds(paths);
  const providerIntakeState = normalizeProviderIntakeState(providerIntakeSeed);
  const providerIntakeUnavailable = readProviderIntakeUnavailablePayload(providerIntakeState);
  return buildMachineStatusDataset({
    providerIntake: providerIntakeUnavailable ? null : buildProviderIntakeSummary(providerIntakeState),
    runningClaims: providerIntakeUnavailable
      ? []
      : providerIntakeState.claims.filter(
          (claim) => claim.state === 'running' && isActiveProviderIntakeClaim(claim)
        ),
    providerIntakeUnavailable,
    polling: providerIntakeState.polling as ControlPollingHealthPayload | null
  });
}

function readProviderIntakeUnavailablePayload(
  state: ProviderIntakeState
): ControlProviderIntakeUnavailablePayload | null {
  if (state.authority?.status !== 'unavailable') {
    return null;
  }
  return {
    reason: state.authority.reason,
    updated_at: state.authority.updated_at
  };
}

function buildRunPathsFromTarget(target: CoStatusAttachTarget): RunPaths {
  const runDir = resolve(target.runDir);
  const manifestPath = resolve(target.manifestPath);
  return {
    runDir,
    manifestPath,
    heartbeatPath: join(runDir, '.heartbeat'),
    resumeTokenPath: join(runDir, '.resume-token'),
    logPath: join(runDir, 'runner.ndjson'),
    eventsPath: join(runDir, 'events.jsonl'),
    controlPath: join(runDir, 'control.json'),
    controlAuthPath: join(runDir, 'control_auth.json'),
    controlEndpointPath: join(runDir, 'control_endpoint.json'),
    confirmationsPath: join(runDir, 'confirmations.json'),
    questionsPath: join(runDir, 'questions.json'),
    delegationTokensPath: join(runDir, 'delegation_tokens.json'),
    commandsDir: join(runDir, 'commands'),
    errorsDir: join(runDir, 'errors'),
    compatDir: join(findTaskCliDir(runDir), 'mcp', target.runId ?? 'control-host'),
    compatManifestPath: join(findTaskCliDir(runDir), 'mcp', target.runId ?? 'control-host', 'manifest.json'),
    localCompatDir: join(findRunsRoot(runDir), 'local-mcp', target.runId ?? 'control-host')
  };
}

function findTaskCliDir(runDir: string): string {
  return resolve(runDir, '..', '..');
}

function findRunsRoot(runDir: string): string {
  const parts = resolve(runDir).split(sep);
  const runsIndex = parts.lastIndexOf('.runs');
  if (runsIndex <= 0) {
    return resolve(runDir, '..', '..', '..');
  }
  return parts.slice(0, runsIndex + 1).join(sep) || sep;
}

export const __test__ = {
  DEFAULT_CO_STATUS_JSON_REQUEST_TIMEOUT_MS,
  applyProviderIntakeTruthOverlay,
  isDegradedMetadataPayloadMatchingClaim,
  resolveCoStatusRuntimeFreshnessBlock
};
