/* eslint-disable patterns/prefer-logger-over-console */

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
const DEFAULT_ATTACH_REQUEST_TIMEOUT_MS = 15_000;
const CSRF_HEADER = 'x-csrf-token';

export interface RunCoStatusAttachCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

interface CoStatusAttachTarget {
  manifestPath: string;
  taskId: string | null;
  runId: string | null;
  runDir: string;
  baseUrl: URL;
  token: string;
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
  try {
    dashboard = startAttachedControlStatusDashboard({
      readDataset: async () => await fetchUiDataset(target.baseUrl, target.token),
      baseUrl: target.baseUrl.toString(),
      taskId: target.taskId ?? 'unknown',
      runId: target.runId ?? 'unknown',
      runDir: target.runDir,
      startPipelineId: 'attach-viewer',
      refreshIntervalMs
    });
    await waitForSignal();
  } finally {
    dashboard?.stop();
    await dashboard?.flush();
  }
}

async function resolveAttachTarget(flags: ArgMap): Promise<CoStatusAttachTarget> {
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
    baseUrl,
    token
  };
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
): Promise<{ taskId: string | null; runId: string | null }> {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as { task_id?: unknown; run_id?: unknown };
    return {
      taskId: normalizeOptionalString(parsed.task_id),
      runId: normalizeOptionalString(parsed.run_id)
    };
  } catch {
    return { taskId: null, runId: null };
  }
}

async function fetchUiDataset(baseUrl: URL, token: string): Promise<OperatorDashboardDataset> {
  const url = new URL('/ui/data.json', baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_ATTACH_REQUEST_TIMEOUT_MS);
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
      throw new Error('control-host ui request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`control-host ui request failed: ${response.status} ${response.statusText}`);
  }
  const payload = (await response.json()) as Partial<OperatorDashboardDataset> | null;
  if (payload?.mode !== 'operator_dashboard' || payload.read_only !== true) {
    throw new Error('control-host ui dataset invalid');
  }
  return payload as OperatorDashboardDataset;
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
  const raw = readStringFlag(flags, key);
  if (!raw) {
    return DEFAULT_ATTACH_REFRESH_INTERVAL_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 250) {
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
