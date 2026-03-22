/* eslint-disable patterns/prefer-logger-over-console */

import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
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
import type { EnvironmentPaths } from './run/environment.js';
import { normalizeEnvironmentPaths, normalizeTaskId } from './run/environment.js';
import { loadManifest } from './run/manifest.js';
import {
  ensureProviderWorkspace,
  resolveProviderResumeWorkspacePath
} from './run/workspacePath.js';
import { PROVIDER_LINEAR_WORKER_PROOF_FILENAME } from './providerLinearWorkerRunner.js';
import {
  closeControlServerPublicLifecycle,
  runProviderIssueHandoffRefresh,
  runProviderIssueHandoffRehydrate,
  startControlServerPublicLifecycle
} from './control/controlServerPublicLifecycle.js';
import {
  resolveLiveLinearTrackedIssueById,
  resolveLiveLinearTrackedIssues
} from './control/linearDispatchSource.js';
import { resolveLinearWebhookSourceSetup } from './control/linearWebhookController.js';
import {
  createProviderIssueHandoffService,
  type ProviderIssueHandoffService
} from './control/providerIssueHandoff.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';

const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];
const SPAWN_MANIFEST_WAIT_TIMEOUT_MS = 5_000;
const SPAWN_MANIFEST_WAIT_INTERVAL_MS = 100;
const DEFAULT_PROVIDER_START_PIPELINE_ID = 'provider-linear-worker';

interface SpawnedRunManifestInfo {
  runId: string;
  manifestPath: string;
}

interface SpawnManifestCorrelation {
  issueProvider?: string | null;
  issueId?: string | null;
  issueIdentifier?: string | null;
  issueUpdatedAt?: string | null;
  providerControlHostTaskId?: string | null;
  providerControlHostRunId?: string | null;
}

interface ProviderLaunchSpec {
  cwd: string;
  envOverrides: Record<string, string>;
}

interface ProviderLinearSourceScope {
  provider: 'linear';
  workspaceId?: string | null;
  teamId?: string | null;
  projectId?: string | null;
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
  const startPipelineId =
    readStringFlag(params.flags, 'pipeline') ?? DEFAULT_PROVIDER_START_PIPELINE_ID;
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
    createProviderIssueHandoff: ({
      providerIntakeState,
      persistProviderIntake,
      publishRuntime,
      readFeatureToggles
    }) =>
      createProviderIssueHandoffService({
        paths: { ...paths, repoRoot: env.repoRoot },
        state: providerIntakeState,
        persist: persistProviderIntake,
        startPipelineId,
        publishRuntime,
        readFeatureToggles,
        resolveTrackedIssue: async ({ issueId }) => {
          const runtimeEnv = process.env;
          const sourceSetup = resolveLinearWebhookSourceSetup(readFeatureToggles(), runtimeEnv);
          if ('error' in sourceSetup) {
            return { kind: 'skip', reason: sourceSetup.error } as const;
          }
          const resolution = await resolveLiveLinearTrackedIssueById({
            issueId,
            sourceSetup: sourceSetup.sourceSetup,
            env: runtimeEnv
          });
          if (resolution.kind === 'ready') {
            return { kind: 'ready', trackedIssue: resolution.tracked_issue } as const;
          }
          if (shouldReleaseTrackedIssueClaim(resolution.reason)) {
            return { kind: 'release', reason: resolution.reason } as const;
          }
          return { kind: 'skip', reason: resolution.reason } as const;
        },
        resolveTrackedIssues: async () => {
          const runtimeEnv = process.env;
          const sourceSetup = resolveLinearWebhookSourceSetup(readFeatureToggles(), runtimeEnv);
          if ('error' in sourceSetup) {
            return { kind: 'skip', reason: sourceSetup.error } as const;
          }
          const resolution = await resolveLiveLinearTrackedIssues({
            sourceSetup: sourceSetup.sourceSetup,
            env: runtimeEnv
          });
          if (resolution.kind === 'ready') {
            return { kind: 'ready', trackedIssues: resolution.tracked_issues } as const;
          }
          return { kind: 'skip', reason: resolution.reason } as const;
        },
        launcher: {
          start: async (input) => {
            const launchSpec = await resolveProviderStartLaunchSpec(env, input.taskId);
            return await spawnBackgroundCliAndWaitForManifest(
              launchSpec.cwd,
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
                ...launchSpec.envOverrides,
                ...buildProviderLinearSourceEnvOverrides(input),
                [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: taskId,
                [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: runId,
                [PROVIDER_LAUNCH_SOURCE_ENV]: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
                [PROVIDER_LAUNCH_TOKEN_ENV]: input.launchToken
              },
              {
                issueProvider: input.provider,
                issueId: input.issueId,
                issueIdentifier: input.issueIdentifier,
                issueUpdatedAt: input.issueUpdatedAt,
                providerControlHostTaskId: taskId,
                providerControlHostRunId: runId
              }
            );
          },
          resume: async (input) => {
            const launchSpec = await resolveProviderResumeLaunchSpec(env, input.runId);
            await spawnBackgroundCli(launchSpec.cwd, cliEntrypoint, [
              'resume',
              '--run',
              input.runId,
              '--actor',
              input.actor,
              '--reason',
              input.reason
            ], {
              ...launchSpec.envOverrides,
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
    await rehydrateProviderIssueHandoffOnStartup(lifecycle.requestContextShared.providerIssueHandoff);
    const providerRefreshStartupTrigger = lifecycle.providerRefreshStartupTrigger ?? null;
    lifecycle.providerRefreshStartupTrigger = null;
    void beginProviderIssueHandoffStartupRefresh(
      lifecycle.requestContextShared.providerIssueHandoff,
      () => lifecycle.requestContextShared.runtime.publish({ source: 'provider-intake.rehydrate' }),
      lifecycle.triggerProviderRefresh ?? undefined,
      providerRefreshStartupTrigger
    );

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
  cwd: string,
  cliEntrypoint: string,
  args: string[],
  taskRunsRoot: string,
  taskId: string,
  envOverrides: Record<string, string> = {},
  correlation: SpawnManifestCorrelation | null = null
): Promise<SpawnedRunManifestInfo | null> {
  const baselineRuns = await snapshotRunManifests(taskRunsRoot);
  await spawnBackgroundCli(cwd, cliEntrypoint, args, envOverrides);
  return await pollForSpawnManifest({
    taskRunsRoot,
    taskId,
    baselineRuns,
    correlation,
    timeoutMs: SPAWN_MANIFEST_WAIT_TIMEOUT_MS,
    intervalMs: SPAWN_MANIFEST_WAIT_INTERVAL_MS
  });
}

async function spawnBackgroundCli(
  cwd: string,
  cliEntrypoint: string,
  args: string[],
  envOverrides: Record<string, string> = {}
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, cliEntrypoint, ...args], {
      cwd,
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
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    snapshot.add(entry.name);
  }
  return snapshot;
}

async function pollForSpawnManifest(params: {
  taskRunsRoot: string;
  taskId: string;
  baselineRuns: Set<string>;
  correlation: SpawnManifestCorrelation | null;
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
  correlation?: SpawnManifestCorrelation | null;
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
    candidates.push({ runId: entry.name, manifestPath, mtimeMs: stats.mtimeMs });
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate.manifestPath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.task_id === 'string' && parsed.task_id !== params.taskId) {
        continue;
      }
      if (!manifestMatchesCorrelation(parsed, params.correlation ?? null)) {
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

async function resolveProviderStartLaunchSpec(
  env: EnvironmentPaths,
  taskId: string
): Promise<ProviderLaunchSpec> {
  const workspacePath = await ensureProviderWorkspace(env.repoRoot, taskId);
  return buildProviderLaunchSpec(env, workspacePath);
}

async function resolveProviderResumeLaunchSpec(
  env: EnvironmentPaths,
  runId: string
): Promise<ProviderLaunchSpec> {
  const { manifest, paths } = await loadManifest(env, runId);
  const resumeTaskId = await resolveProviderResumeTaskId(
    manifest as unknown as Record<string, unknown>,
    runId,
    {
      runDir: paths.runDir,
      runsRoot: env.runsRoot
    }
  );
  const workspacePath = await resolveProviderResumeWorkspacePath(
    env.repoRoot,
    resumeTaskId,
    manifest as unknown as Record<string, unknown>
  );
  const launchSpec = buildProviderLaunchSpec(env, workspacePath);
  return {
    ...launchSpec,
    envOverrides: {
      ...launchSpec.envOverrides,
      ...(await resolveProviderResumeLinearSourceEnvOverrides(paths.runDir))
    }
  };
}

function buildProviderLinearSourceEnvOverrides(input: ProviderLinearSourceScope): Record<string, string> {
  const workspaceId = normalizeProviderLinearSourceValue(input.workspaceId);
  const teamId = normalizeProviderLinearSourceValue(input.teamId);
  const projectId = normalizeProviderLinearSourceValue(input.projectId);
  return {
    CO_LINEAR_WORKSPACE_ID: workspaceId ?? '',
    CO_LINEAR_TEAM_ID: teamId ?? '',
    CO_LINEAR_PROJECT_ID: projectId ?? ''
  };
}

function buildProviderLaunchSpec(
  env: EnvironmentPaths,
  workspacePath: string
): ProviderLaunchSpec {
  return {
    cwd: workspacePath,
    envOverrides: {
      CODEX_ORCHESTRATOR_ROOT: workspacePath,
      CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
      CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot
    }
  };
}

function shouldReleaseTrackedIssueClaim(reason: string): boolean {
  return (
    reason === 'dispatch_source_issue_not_found' ||
    reason === 'dispatch_source_workspace_mismatch' ||
    reason === 'dispatch_source_team_mismatch' ||
    reason === 'dispatch_source_project_mismatch'
  );
}

async function resolveProviderResumeLinearSourceEnvOverrides(runDir: string): Promise<Record<string, string>> {
  const sourceScope = await readProviderLinearSourceScopeFromProof(runDir);
  return buildProviderLinearSourceEnvOverrides(
    sourceScope ?? {
      provider: 'linear',
      workspaceId: null,
      teamId: null,
      projectId: null
    }
  );
}

async function readProviderLinearSourceScopeFromProof(
  runDir: string
): Promise<ProviderLinearSourceScope | null> {
  try {
    const raw = await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return parseProviderLinearSourceScopeFromProof(parsed);
  } catch {
    return null;
  }
}

function parseProviderLinearSourceScopeFromProof(input: unknown): ProviderLinearSourceScope | null {
  if (!isRecord(input) || !isRecord(input.source_setup) || input.source_setup.provider !== 'linear') {
    return null;
  }
  return {
    provider: 'linear',
    workspaceId:
      typeof input.source_setup.workspace_id === 'string' ? input.source_setup.workspace_id : null,
    teamId: typeof input.source_setup.team_id === 'string' ? input.source_setup.team_id : null,
    projectId: typeof input.source_setup.project_id === 'string' ? input.source_setup.project_id : null
  };
}

export const __test__ = {
  DEFAULT_PROVIDER_START_PIPELINE_ID,
  buildProviderLinearSourceEnvOverrides,
  beginProviderIssueHandoffStartupRefresh,
  findSpawnManifest,
  rehydrateProviderIssueHandoffOnStartup,
  refreshProviderIssueHandoffOnStartup,
  resolveProviderResumeLaunchSpec,
  resolveProviderResumeTaskId,
  snapshotRunManifests
};

function normalizeProviderLinearSourceValue(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function beginProviderIssueHandoffStartupRefresh(
  providerIssueHandoff: ProviderIssueHandoffService | null | undefined,
  onSettled?: () => void,
  refreshProviderIssueHandoff?: (() => Promise<void>) | null,
  startupRefreshTrigger?: NodeJS.Timeout | null
): Promise<void> {
  if (startupRefreshTrigger) {
    clearTimeout(startupRefreshTrigger);
  }
  const refreshPromise = refreshProviderIssueHandoff
    ? Promise.resolve()
        .then(() => refreshProviderIssueHandoff())
        .catch((error) => {
          logger.warn(
            `Provider issue startup refresh failed: ${(error as Error)?.message ?? String(error)}`
          );
        })
    : refreshProviderIssueHandoffOnStartup(providerIssueHandoff);
  return refreshPromise.finally(() => {
    onSettled?.();
  });
}

async function refreshProviderIssueHandoffOnStartup(
  providerIssueHandoff: ProviderIssueHandoffService | null | undefined
): Promise<void> {
  if (!providerIssueHandoff) {
    return;
  }
  try {
    await runProviderIssueHandoffRefresh(providerIssueHandoff);
  } catch (error) {
    logger.warn(
      `Provider issue startup refresh failed: ${(error as Error)?.message ?? String(error)}`
    );
  }
}

async function rehydrateProviderIssueHandoffOnStartup(
  providerIssueHandoff: ProviderIssueHandoffService | null | undefined
): Promise<void> {
  if (!providerIssueHandoff) {
    return;
  }
  try {
    await runProviderIssueHandoffRehydrate(providerIssueHandoff);
  } catch (error) {
    logger.warn(
      `Provider issue startup rehydrate failed: ${(error as Error)?.message ?? String(error)}`
    );
  }
}

function manifestMatchesCorrelation(
  manifest: Record<string, unknown>,
  correlation: SpawnManifestCorrelation | null
): boolean {
  if (!correlation) {
    return true;
  }

  return (
    manifestFieldMatches(manifest, 'issue_provider', correlation.issueProvider) &&
    manifestFieldMatches(manifest, 'issue_id', correlation.issueId) &&
    manifestFieldMatches(manifest, 'issue_identifier', correlation.issueIdentifier) &&
    manifestFieldMatches(manifest, 'issue_updated_at', correlation.issueUpdatedAt) &&
    manifestFieldMatches(
      manifest,
      'provider_control_host_task_id',
      correlation.providerControlHostTaskId
    ) &&
    manifestFieldMatches(manifest, 'provider_control_host_run_id', correlation.providerControlHostRunId)
  );
}

function manifestFieldMatches(
  manifest: Record<string, unknown>,
  field: string,
  expected: string | null | undefined
): boolean {
  if (!expected) {
    return true;
  }
  return readManifestString(manifest, field) === expected;
}

function readManifestString(manifest: Record<string, unknown>, field: string): string | null {
  const value = manifest[field];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveProviderResumeTaskId(
  manifest: Record<string, unknown>,
  runId: string,
  pathMetadata?: { runDir: string; runsRoot: string }
): Promise<string> {
  const manifestTaskId = readManifestString(manifest, 'task_id');
  const taskIdCandidate =
    manifestTaskId ??
    (pathMetadata
      ? await deriveProviderResumeTaskIdFromRunDir(pathMetadata.runDir, pathMetadata.runsRoot)
      : null);
  if (!taskIdCandidate) {
    throw new Error(`Unable to derive provider resume manifest task_id for run ${runId}.`);
  }
  try {
    return normalizeTaskId(taskIdCandidate);
  } catch (error) {
    throw new Error(
      `Invalid provider resume manifest task_id for run ${runId}: ${(error as Error)?.message ?? String(error)}`
    );
  }
}

async function deriveProviderResumeTaskIdFromRunDir(
  runDir: string,
  runsRoot: string
): Promise<string | null> {
  const [resolvedRunDir, resolvedRunsRoot] = await Promise.all([
    canonicalizePath(runDir),
    canonicalizePath(runsRoot)
  ]);
  const relativeRunDir = relative(resolvedRunsRoot, resolvedRunDir);
  if (
    !relativeRunDir ||
    relativeRunDir === '..' ||
    relativeRunDir.startsWith(`..${sep}`) ||
    isAbsolute(relativeRunDir)
  ) {
    return null;
  }

  const segments = relativeRunDir.split(sep).filter((segment) => segment.length > 0);
  if (segments.length === 3 && segments[1] === 'cli') {
    return segments[0] ?? null;
  }
  if (segments.length === 2) {
    return segments[0] ?? null;
  }
  return null;
}

async function canonicalizePath(pathname: string): Promise<string> {
  try {
    return await realpath(pathname);
  } catch {
    return resolve(pathname);
  }
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
