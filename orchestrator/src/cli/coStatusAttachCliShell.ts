/* eslint-disable patterns/prefer-logger-over-console */

import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import { resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import {
  loadControlEndpoint,
  resolveRunManifestPath
} from './delegationServer.js';
import {
  shouldEnableControlStatusDashboard,
  startAttachedControlStatusDashboard,
  type ControlStatusDashboardHandle
} from './control/controlStatusDashboard.js';
import type { OperatorDashboardDataset } from './control/operatorDashboardPresenter.js';
import { normalizeEnvironmentPaths, normalizeTaskId } from './run/environment.js';
import { resolveRunPaths } from './run/runPaths.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';

const DEFAULT_ATTACH_REFRESH_INTERVAL_MS = 1_000;
export const DEFAULT_ATTACH_REQUEST_TIMEOUT_MS = 15_000;
const CSRF_HEADER = 'x-csrf-token';
type CoStatusAttachRequestErrorKind = 'auth' | 'cancelled' | 'http' | 'network' | 'timeout';

export interface RunCoStatusAttachCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

export interface CoStatusAttachTarget {
  manifestPath: string;
  taskId: string | null;
  runId: string | null;
  runDir: string;
  workspaceRoot: string;
  baseUrl: URL;
  token: string;
}

export class CoStatusAttachRequestError extends Error {
  readonly kind: CoStatusAttachRequestErrorKind;
  readonly statusCode: number | null;

  constructor(
    kind: CoStatusAttachRequestErrorKind,
    message: string,
    options: { cause?: unknown; statusCode?: number | null } = {}
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'CoStatusAttachRequestError';
    this.kind = kind;
    this.statusCode = options.statusCode ?? null;
  }
}

export async function runCoStatusAttachCliShell(
  params: RunCoStatusAttachCliShellParams
): Promise<void> {
  if (params.flags.help !== undefined) {
    params.printHelp();
    return;
  }

  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  const refreshIntervalMs = readIntervalFlag(params.flags, 'refresh-interval-ms');
  const target = await resolveAttachTarget(params.flags);
  if (format === 'json') {
    console.log(
      JSON.stringify(
        {
          status: 'ready',
          mode: 'attach',
          read_only: true,
          base_url: target.baseUrl.toString(),
          task_id: target.taskId,
          run_id: target.runId,
          run_dir: target.runDir,
          manifest_path: target.manifestPath,
          refresh_interval_ms: refreshIntervalMs
        },
        null,
        2
      )
    );
    return;
  }

  if (
    !shouldEnableControlStatusDashboard({
      format,
      stdoutIsTTY: process.stdout.isTTY === true,
      stderrIsTTY: process.stderr.isTTY === true,
      term: process.env.TERM ?? null,
      env: process.env
    })
  ) {
    console.log(`CO STATUS attach target: ${target.baseUrl}`);
    console.log(`Task: ${target.taskId ?? 'n/a'}`);
    console.log(`Run: ${target.runId ?? 'n/a'}`);
    console.log(`Run dir: ${target.runDir}`);
    console.log(`Manifest: ${target.manifestPath}`);
    return;
  }

  let dashboard: ControlStatusDashboardHandle | null = null;
  const attachAbortController = new AbortController();
  let activeTarget = target;
  try {
    dashboard = startAttachedControlStatusDashboard({
      readDataset: async (signal) =>
        await readUiDatasetWithEndpointRecovery({
          flags: params.flags,
          getTarget: () => activeTarget,
          setTarget: (nextTarget) => {
            activeTarget = nextTarget;
          },
          signal: AbortSignal.any([attachAbortController.signal, signal])
        }),
      baseUrl: target.baseUrl.toString(),
      taskId: target.taskId ?? 'unknown',
      runId: target.runId ?? 'unknown',
      runDir: target.runDir,
      startPipelineId: 'attach-viewer',
      refreshIntervalMs
    });
    await waitForSignal();
  } finally {
    attachAbortController.abort();
    dashboard?.stop();
    await dashboard?.flush();
  }
}

export async function resolveAttachTarget(flags: ArgMap): Promise<CoStatusAttachTarget> {
  const manifestFlag = readStringFlag(flags, 'manifest-path');
  const runDirFlag = readStringFlag(flags, 'run-dir');
  const requestedTaskId = readStringFlag(flags, 'task');
  const requestedRunId = readStringFlag(flags, 'run');
  const locator = resolveAttachLocator({
    manifestPath: manifestFlag,
    runDir: runDirFlag,
    taskId: requestedTaskId,
    runId: requestedRunId
  });
  const resolvedManifestPath = resolveRunManifestPath(locator.manifestPath, undefined, 'manifest_path');
  const { baseUrl, token } = await loadControlEndpoint(resolvedManifestPath);
  const runDir = dirname(resolvedManifestPath);
  const manifest = await readAttachManifest(resolvedManifestPath);
  return {
    manifestPath: resolvedManifestPath,
    taskId: manifest.taskId ?? locator.taskId,
    runId: manifest.runId ?? locator.runId,
    runDir,
    workspaceRoot: resolveAttachWorkspaceRoot({
      manifestPath: resolvedManifestPath,
      manifestWorkspacePath: manifest.workspacePath,
      runDir
    }),
    baseUrl,
    token
  };
}

function resolveAttachWorkspaceRoot(input: {
  manifestPath: string;
  manifestWorkspacePath: string | null;
  runDir: string;
}): string {
  const workspaceRoot =
    input.manifestWorkspacePath !== null
      ? resolve(dirname(input.manifestPath), input.manifestWorkspacePath)
      : deriveWorkspaceRootFromRunDir(input.runDir);
  return canonicalizeAttachWorkspaceRoot(workspaceRoot);
}

function deriveWorkspaceRootFromRunDir(runDir: string): string {
  const resolvedRunDir = resolve(runDir);
  const derived = deriveTaskRunFromRunDir(resolvedRunDir);
  if (derived.taskId !== null && derived.runId !== null) {
    return dirname(dirname(dirname(dirname(resolvedRunDir))));
  }
  return dirname(resolvedRunDir);
}

function canonicalizeAttachWorkspaceRoot(workspaceRoot: string): string {
  try {
    return realpathSync(workspaceRoot);
  } catch {
    return resolve(workspaceRoot);
  }
}

function resolveAttachLocator(input: {
  manifestPath?: string;
  runDir?: string;
  taskId?: string;
  runId?: string;
}): { manifestPath: string; taskId: string | null; runId: string | null } {
  if (input.manifestPath) {
    const manifestPath = resolve(input.manifestPath);
    const derived = deriveTaskRunFromManifestPath(manifestPath);
    return {
      manifestPath,
      taskId: input.taskId ?? derived.taskId,
      runId: input.runId ?? derived.runId
    };
  }
  if (input.runDir) {
    const runDir = resolve(input.runDir);
    const derived = deriveTaskRunFromRunDir(runDir);
    return {
      manifestPath: resolve(runDir, 'manifest.json'),
      taskId: input.taskId ?? derived.taskId,
      runId: input.runId ?? derived.runId
    };
  }
  const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
  const taskId = normalizeTaskId(input.taskId ?? 'local-mcp');
  const runId = input.runId ?? 'control-host';
  return {
    manifestPath: resolveRunPaths({ ...baseEnv, taskId }, runId).manifestPath,
    taskId,
    runId
  };
}

async function readAttachManifest(
  manifestPath: string
): Promise<{ taskId: string | null; runId: string | null; workspacePath: string | null }> {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      run_id?: unknown;
      task_id?: unknown;
      workspace_path?: unknown;
    };
    return {
      taskId: normalizeOptionalString(parsed.task_id),
      runId: normalizeOptionalString(parsed.run_id),
      workspacePath: normalizeOptionalString(parsed.workspace_path)
    };
  } catch {
    return { taskId: null, runId: null, workspacePath: null };
  }
}

export async function fetchUiDataset(
  baseUrl: URL,
  token: string,
  options: { signal?: AbortSignal; requestTimeoutMs?: number } = {}
): Promise<OperatorDashboardDataset> {
  const url = new URL('/ui/data.json', baseUrl);
  const controller = new AbortController();
  const linkedSignal = options.signal;
  const onAbort = () => controller.abort();
  if (linkedSignal) {
    if (linkedSignal.aborted) {
      controller.abort();
    } else {
      linkedSignal.addEventListener('abort', onAbort, { once: true });
    }
  }
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_ATTACH_REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        [CSRF_HEADER]: token
      },
      signal: controller.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      if (linkedSignal?.aborted) {
        throw new CoStatusAttachRequestError(
          'cancelled',
          'control-host ui request cancelled',
          { cause: error }
        );
      }
      throw new CoStatusAttachRequestError(
        'timeout',
        `control-host ui request timeout after ${requestTimeoutMs}ms`,
        { cause: error }
      );
    }
    throw new CoStatusAttachRequestError(
      'network',
      `control-host unavailable at ${url.toString()}: ${formatFetchNetworkError(error)}`,
      { cause: error }
    );
  } finally {
    clearTimeout(timer);
    linkedSignal?.removeEventListener('abort', onAbort);
  }
  if (!response.ok) {
    const statusText = response.statusText.trim() || 'HTTP error';
    if (response.status === 401 || response.status === 403) {
      throw new CoStatusAttachRequestError(
        'auth',
        `control-host ui auth failed: ${response.status} ${statusText}; refresh control_auth.json or restart co-status attach against the current control-host.`,
        { statusCode: response.status }
      );
    }
    throw new CoStatusAttachRequestError(
      'http',
      `control-host ui request failed: ${response.status} ${statusText}`,
      { statusCode: response.status }
    );
  }
  const payload = (await response.json()) as unknown;
  if (!isOperatorDashboardDataset(payload)) {
    throw new Error('control-host ui dataset invalid');
  }
  return payload;
}

export async function readUiDatasetWithEndpointRecovery(input: {
  flags: ArgMap;
  getTarget: () => CoStatusAttachTarget;
  setTarget: (target: CoStatusAttachTarget) => void;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  recoverSameEndpointTimeout?: boolean;
}): Promise<OperatorDashboardDataset> {
  const previousTarget = input.getTarget();
  try {
    return await fetchUiDataset(previousTarget.baseUrl, previousTarget.token, {
      signal: input.signal,
      requestTimeoutMs: input.requestTimeoutMs
    });
  } catch (error) {
    if (isCancelledAttachRequestError(error)) {
      throw error;
    }
    let resolvedTarget: CoStatusAttachTarget;
    try {
      resolvedTarget = await resolveAttachTarget(input.flags);
    } catch (resolveError) {
      throw new Error(
        `${formatAttachRequestFailure(error, previousTarget)} Re-resolving control_endpoint.json failed: ${
          (resolveError as Error)?.message ?? String(resolveError)
        }.`
      );
    }
    if (!isAttachTargetEndpointEquivalent(previousTarget, resolvedTarget)) {
      input.setTarget(resolvedTarget);
      try {
        return await fetchUiDataset(resolvedTarget.baseUrl, resolvedTarget.token, {
          signal: input.signal,
          requestTimeoutMs: input.requestTimeoutMs
        });
      } catch (retryError) {
        if (isCancelledAttachRequestError(retryError)) {
          throw retryError;
        }
        throw new Error(
          `control-host endpoint rotated from ${previousTarget.baseUrl.toString()} to ${resolvedTarget.baseUrl.toString()}, but the refreshed endpoint is not readable. ${formatAttachRequestFailure(retryError, resolvedTarget, { endpointAlreadyRotated: true })}`
        );
      }
    }
    if (input.recoverSameEndpointTimeout === true && isTimeoutAttachRequestError(error)) {
      try {
        return await fetchUiDataset(previousTarget.baseUrl, previousTarget.token, {
          signal: input.signal,
          requestTimeoutMs: input.requestTimeoutMs
        });
      } catch (retryError) {
        if (isCancelledAttachRequestError(retryError)) {
          throw retryError;
        }
        if (isTimeoutAttachRequestError(retryError)) {
          throw new Error(formatSameEndpointTimeoutFailure(retryError, previousTarget));
        }
        throw new Error(formatAttachRequestFailure(retryError, previousTarget));
      }
    }
    throw new Error(formatAttachRequestFailure(error, previousTarget));
  }
}

function isAttachTargetEndpointEquivalent(
  left: CoStatusAttachTarget,
  right: CoStatusAttachTarget
): boolean {
  return left.baseUrl.toString() === right.baseUrl.toString() && left.token === right.token;
}

function isCancelledAttachRequestError(error: unknown): boolean {
  return error instanceof CoStatusAttachRequestError && error.kind === 'cancelled';
}

function isTimeoutAttachRequestError(error: unknown): error is CoStatusAttachRequestError {
  return error instanceof CoStatusAttachRequestError && error.kind === 'timeout';
}

function formatSameEndpointTimeoutFailure(
  error: CoStatusAttachRequestError,
  target: CoStatusAttachTarget
): string {
  return [
    `${error.message}.`,
    `The current resolved /ui/data.json endpoint at ${target.baseUrl.toString()} timed out again after endpoint re-resolution returned the same endpoint/token; this is a same-endpoint current-endpoint timeout, not stale/dead endpoint ECONNREFUSED recovery or attach restart/rotation.`,
    'Inspect local control-host polling.stuck, polling.restart_required, and running claim evidence before treating the host as unhealthy.'
  ].join(' ');
}

function formatAttachRequestFailure(
  error: unknown,
  target: CoStatusAttachTarget,
  options: { endpointAlreadyRotated?: boolean } = {}
): string {
  if (error instanceof CoStatusAttachRequestError) {
    if (error.kind === 'network') {
      if (options.endpointAlreadyRotated) {
        return `current-host-unhealthy: ${error.message}. The refreshed control-host endpoint is still unreachable; wait for the new host to come up or rerun co-status attach.`;
      }
      return `current-host-unhealthy: control_endpoint.json; control-host unavailable; stale endpoint after control-host restart. control_endpoint.json has not rotated to a reachable host. ${error.message}. Waiting for ${resolve(target.runDir, 'control_endpoint.json')} to rotate or rerun co-status attach.`;
    }
    if (error.kind === 'timeout') {
      return `${error.message}. The control-host did not answer before the attach timeout; if restart is in progress, wait for endpoint rotation or rerun co-status attach.`;
    }
    return error.message;
  }
  return `control-host ui request failed: ${(error as Error)?.message ?? String(error)}`;
}

function formatFetchNetworkError(error: unknown): string {
  const message = (error as Error)?.message ?? String(error);
  const code = extractFetchErrorCode(error);
  return code ? `${message} (${code})` : message;
}

function extractFetchErrorCode(error: unknown): string | null {
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

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readIntervalFlag(flags: ArgMap, key: string): number {
  const value = flags[key];
  if (value === undefined) {
    return DEFAULT_ATTACH_REFRESH_INTERVAL_MS;
  }
  if (value === true || typeof value !== 'string') {
    throw new Error(`Invalid --${key}: expected integer milliseconds >= 250`);
  }
  const raw = value.trim();
  if (raw.length === 0) {
    throw new Error(`Invalid --${key}: expected integer milliseconds >= 250`);
  }
  if (!/^\d+$/u.test(raw)) {
    throw new Error(`Invalid --${key}: expected integer milliseconds >= 250`);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 250) {
    throw new Error(`Invalid --${key}: expected integer milliseconds >= 250`);
  }
  return parsed;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isOperatorDashboardDataset(value: unknown): value is OperatorDashboardDataset {
  if (!isRecord(value)) {
    return false;
  }
  if (value.mode !== 'operator_dashboard' || value.read_only !== true) {
    return false;
  }
  if (typeof value.generated_at !== 'string' || typeof value.host !== 'string') {
    return false;
  }
  if (
    !isRecord(value.counts) ||
    !isFiniteNumber(value.counts.running) ||
    !isFiniteNumber(value.counts.retrying) ||
    !isFiniteNumber(value.counts.issues)
  ) {
    return false;
  }
  if (
    !isRecord(value.totals) ||
    !isNumberOrNull(value.totals.input_tokens) ||
    !isNumberOrNull(value.totals.output_tokens) ||
    !isNumberOrNull(value.totals.total_tokens) ||
    !isFiniteNumber(value.totals.seconds_running)
  ) {
    return false;
  }
  return Array.isArray(value.running) && Array.isArray(value.retrying) && Array.isArray(value.issues);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function deriveTaskRunFromManifestPath(manifestPath: string): { taskId: string | null; runId: string | null } {
  return deriveTaskRunFromRunDir(dirname(resolve(manifestPath)));
}

function deriveTaskRunFromRunDir(runDir: string): { taskId: string | null; runId: string | null } {
  const resolvedRunDir = resolve(runDir);
  const parts = resolvedRunDir.split(/[\\/]+/u).filter((part) => part.length > 0);
  if (parts.length < 3) {
    return { taskId: null, runId: null };
  }
  const runId = parts.at(-1) ?? null;
  const cliSegment = parts.at(-2) ?? null;
  const taskId = parts.at(-3) ?? null;
  if (cliSegment !== 'cli') {
    return { taskId: null, runId: null };
  }
  return { taskId, runId };
}

async function waitForSignal(): Promise<void> {
  await new Promise<void>((resolve) => {
    const handle = () => {
      process.off('SIGINT', handle);
      process.off('SIGTERM', handle);
      resolve();
    };
    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  });
}
