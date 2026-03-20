/* eslint-disable patterns/prefer-logger-over-console */

import { spawn } from 'node:child_process';
import { access, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../../../scripts/lib/provider-run-contract.js';
import { resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import {
  computeEffectiveDelegationConfig,
  loadDelegationConfigFiles,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import { logger } from '../logger.js';
import { resolveRunPaths } from './run/runPaths.js';
import { normalizeEnvironmentPaths, normalizeTaskId } from './run/environment.js';
import {
  closeControlServerPublicLifecycle,
  startControlServerPublicLifecycle
} from './control/controlServerPublicLifecycle.js';
import { createProviderIssueHandoffService } from './control/providerIssueHandoff.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';

const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];
const SPAWN_MANIFEST_WAIT_TIMEOUT_MS = 5_000;
const SPAWN_MANIFEST_WAIT_INTERVAL_MS = 100;

interface SpawnedRunManifestInfo {
  runId: string;
  manifestPath: string;
}

export interface RunControlHostCliShellParams {
  flags: ArgMap;
  printHelp: () => void;
}

export async function runControlHostCliShell(
  params: RunControlHostCliShellParams
): Promise<void> {
  if (params.flags['help'] !== undefined) {
    params.printHelp();
    return;
  }

  const baseEnv = normalizeEnvironmentPaths(resolveEnvironmentPaths());
  const taskId = normalizeTaskId(readStringFlag(params.flags, 'task') ?? 'local-mcp');
  const runId = readStringFlag(params.flags, 'run') ?? 'control-host';
  const startPipelineId = readStringFlag(params.flags, 'pipeline') ?? 'diagnostics';
  const format: OutputFormat = readStringFlag(params.flags, 'format') === 'json' ? 'json' : 'text';
  const env = { ...baseEnv, taskId };
  const paths = resolveRunPaths(env, runId);
  await mkdir(paths.runDir, { recursive: true });

  const configFiles = await loadDelegationConfigFiles({ repoRoot: env.repoRoot });
  const layers = [
    configFiles.global,
    configFiles.repo,
    ...collectDelegationEnvOverrides()
  ].filter(Boolean) as DelegationConfigLayer[];
  const config = computeEffectiveDelegationConfig({
    repoRoot: env.repoRoot,
    layers
  });

  const cliEntrypoint = process.argv[1];
  if (!cliEntrypoint) {
    throw new Error('Unable to resolve current codex-orchestrator CLI entrypoint.');
  }

  const lifecycle = await startControlServerPublicLifecycle({
    paths,
    config,
    runId,
    createProviderIssueHandoff: ({ providerIntakeState, persistProviderIntake, publishRuntime }) =>
      createProviderIssueHandoffService({
        paths,
        state: providerIntakeState,
        persist: persistProviderIntake,
        startPipelineId,
        publishRuntime,
        launcher: {
          start: async (input) => {
            return await spawnBackgroundCliAndWaitForManifest(
              env.repoRoot,
              cliEntrypoint,
              [
                'start',
                input.pipelineId,
                '--task',
                input.taskId,
                '--issue-provider',
                input.provider,
                '--issue-id',
                input.issueId,
                '--issue-identifier',
                input.issueIdentifier,
                ...(input.issueUpdatedAt ? ['--issue-updated-at', input.issueUpdatedAt] : [])
              ],
              join(env.runsRoot, input.taskId, 'cli'),
              input.taskId,
              {
                [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: taskId,
                [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: runId,
                [PROVIDER_LAUNCH_SOURCE_ENV]: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
                [PROVIDER_LAUNCH_TOKEN_ENV]: input.launchToken
              }
            );
          },
          resume: async (input) => {
            await spawnBackgroundCli(env.repoRoot, cliEntrypoint, [
              'resume',
              '--run',
              input.runId,
              '--actor',
              input.actor,
              '--reason',
              input.reason
            ], {
              [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: taskId,
              [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: runId,
              [PROVIDER_LAUNCH_SOURCE_ENV]: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
              [PROVIDER_LAUNCH_TOKEN_ENV]: input.launchToken
            });
          }
        }
      })
  });

  try {
    await lifecycle.requestContextShared.providerIssueHandoff?.rehydrate();
    lifecycle.requestContextShared.runtime.publish({ source: 'provider-intake.rehydrate' });

    const payload = {
      status: 'ready',
      base_url: lifecycle.baseUrl,
      task_id: taskId,
      run_id: runId,
      run_dir: paths.runDir,
      start_pipeline_id: startPipelineId
    };
    if (format === 'json') {
      console.log(JSON.stringify(payload));
    } else {
      console.log(`Control host ready: ${lifecycle.baseUrl}`);
      console.log(`Task: ${taskId}`);
      console.log(`Run: ${runId}`);
      console.log(`Run dir: ${paths.runDir}`);
      console.log(`Start pipeline: ${startPipelineId}`);
    }

    await waitForSignal();
  } finally {
    await closeControlServerPublicLifecycle(lifecycle);
  }
}

async function spawnBackgroundCliAndWaitForManifest(
  repoRoot: string,
  cliEntrypoint: string,
  args: string[],
  taskRunsRoot: string,
  taskId: string,
  envOverrides: Record<string, string> = {}
): Promise<SpawnedRunManifestInfo | null> {
  const baselineRuns = await snapshotRunManifests(taskRunsRoot);
  const spawnStart = Date.now();
  await spawnBackgroundCli(repoRoot, cliEntrypoint, args, envOverrides);
  return await pollForSpawnManifest({
    taskRunsRoot,
    taskId,
    baselineRuns,
    spawnStart,
    timeoutMs: SPAWN_MANIFEST_WAIT_TIMEOUT_MS,
    intervalMs: SPAWN_MANIFEST_WAIT_INTERVAL_MS
  });
}

async function spawnBackgroundCli(
  repoRoot: string,
  cliEntrypoint: string,
  args: string[],
  envOverrides: Record<string, string> = {}
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, cliEntrypoint, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...envOverrides },
      detached: true,
      stdio: 'ignore'
    });
    const onError = (error: Error) => reject(error);
    child.once('error', onError);
    child.once('spawn', () => {
      child.off('error', onError);
      child.unref();
      resolve();
    });
  });
}

async function snapshotRunManifests(taskRunsRoot: string): Promise<Set<string>> {
  let entries: Array<import('node:fs').Dirent>;
  try {
    entries = await readdir(taskRunsRoot, { withFileTypes: true });
  } catch {
    return new Set<string>();
  }

  const snapshot = new Set<string>();
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory()) {
        return;
      }
      const manifestPath = join(taskRunsRoot, entry.name, 'manifest.json');
      try {
        await access(manifestPath);
        snapshot.add(entry.name);
      } catch {
        // Ignore incomplete runs while taking the baseline snapshot.
      }
    })
  );
  return snapshot;
}

async function pollForSpawnManifest(params: {
  taskRunsRoot: string;
  taskId: string;
  baselineRuns: Set<string>;
  spawnStart: number;
  timeoutMs: number;
  intervalMs: number;
}): Promise<SpawnedRunManifestInfo | null> {
  const deadline = Date.now() + params.timeoutMs;
  while (Date.now() <= deadline) {
    const manifest = await findSpawnManifest(params);
    if (manifest) {
      return manifest;
    }
    await delay(params.intervalMs);
  }
  return null;
}

async function findSpawnManifest(params: {
  taskRunsRoot: string;
  taskId: string;
  baselineRuns: Set<string>;
  spawnStart: number;
}): Promise<SpawnedRunManifestInfo | null> {
  let entries: Array<import('node:fs').Dirent>;
  try {
    entries = await readdir(params.taskRunsRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates: Array<{ runId: string; manifestPath: string; mtimeMs: number }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || params.baselineRuns.has(entry.name)) {
      continue;
    }
    const manifestPath = join(params.taskRunsRoot, entry.name, 'manifest.json');
    let stats;
    try {
      stats = await stat(manifestPath);
    } catch {
      continue;
    }
    if (stats.mtimeMs < params.spawnStart) {
      continue;
    }
    candidates.push({ runId: entry.name, manifestPath, mtimeMs: stats.mtimeMs });
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate.manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as { run_id?: string; task_id?: string };
      if (typeof parsed.task_id === 'string' && parsed.task_id !== params.taskId) {
        continue;
      }
      const runId =
        typeof parsed.run_id === 'string' && parsed.run_id.trim().length > 0
          ? parsed.run_id.trim()
          : candidate.runId;
      if (!runId) {
        continue;
      }
      return { runId, manifestPath: candidate.manifestPath };
    } catch {
      continue;
    }
  }

  return null;
}

function collectDelegationEnvOverrides(env: NodeJS.ProcessEnv = process.env): DelegationConfigLayer[] {
  const layers: DelegationConfigLayer[] = [];
  for (const key of CONFIG_OVERRIDE_ENV_KEYS) {
    const raw = env[key];
    if (!raw) {
      continue;
    }
    const values = splitDelegationConfigOverrides(raw);
    for (const value of values) {
      try {
        const layer = parseDelegationConfigOverride(value, 'env');
        if (layer) {
          layers.push(layer);
        }
      } catch (error) {
        logger.warn(
          `Invalid delegation config override (env): ${(error as Error)?.message ?? String(error)}`
        );
      }
    }
  }
  return layers;
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
