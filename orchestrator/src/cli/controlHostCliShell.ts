/* eslint-disable patterns/prefer-logger-over-console */

import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { mkdir, readdir, readFile, realpath, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

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
  PROVIDER_PACKAGE_ROOT_ENV_KEY,
  PROVIDER_REPO_CONFIG_PATH_ENV_KEY
} from './utils/providerOverrideEnv.js';
import { findPackageRoot } from './utils/packageInfo.js';
import {
  ensureProviderWorkspace,
  resolveProviderResumeWorkspacePath
} from './run/workspacePath.js';
import {
  PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearResidentSessionSeed
} from './providerLinearWorkerRunner.js';
import {
  REPO_CONFIG_PATH_ENV_KEY,
} from './config/userConfig.js';
import {
  CONFIG_AUTHORITY_MODE_ENV_KEY,
  REPO_CONFIG_REQUIRED_ENV_KEY
} from './config/repoConfigPolicy.js';
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
import {
  resolveLinearConfiguredSourceSetup,
  resolveLinearWebhookSourceSetup
} from './control/linearWebhookController.js';
import {
  createProviderIssueHandoffService,
  type CreateProviderIssueHandoffServiceOptions,
  type ProviderIssueHandoffService
} from './control/providerIssueHandoff.js';
import {
  runProviderDeterministicMergeCloseout,
  runProviderReviewHandoffPromotion
} from './control/providerMergeCloseout.js';
import {
  createProviderWorkflowConfigStore,
  type ProviderWorkflowConfigStore
} from './control/providerWorkflowConfigStore.js';
import {
  findProviderWorkerHost,
  normalizeProviderWorkerHostName,
  PROVIDER_WORKER_HOST_ENV_KEY,
  type ProviderWorkerHostConfig
} from './control/providerWorkerHosts.js';
import {
  isProviderLinearWorkerProofFreshForStage,
} from './control/providerLinearWorkerTruth.js';
import {
  shouldEnableControlStatusDashboard,
  startControlStatusDashboard,
  type ControlStatusDashboardHandle
} from './control/controlStatusDashboard.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
type ControlHostTrackedIssueResolvers = Pick<
  CreateProviderIssueHandoffServiceOptions,
  'resolveTrackedIssue' | 'resolveRevalidationTrackedIssue' | 'resolveTrackedIssues'
>;

const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];
const LOCAL_SPAWN_MANIFEST_WAIT_TIMEOUT_MS = 5_000;
const REMOTE_SPAWN_MANIFEST_WAIT_TIMEOUT_MS = 20_000;
const SPAWN_MANIFEST_WAIT_INTERVAL_MS = 100;
export const DEFAULT_PROVIDER_START_PIPELINE_ID = 'provider-linear-worker';
const ALLOWED_REMOTE_PROVIDER_ENV_KEYS = [
  'ALL_PROXY',
  'all_proxy',
  'CO_LINEAR_API_KEY',
  'CO_LINEAR_API_TOKEN',
  ...CONFIG_OVERRIDE_ENV_KEYS,
  'CODEX_HOME',
  'CODEX_ORCHESTRATOR_APPSERVER_SKIP_LOGIN_CHECK',
  'CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS',
  'CODEX_ORCHESTRATOR_RUNTIME_MODE',
  'CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE',
  'CODEX_ORCHESTRATOR_RUNTIME_FALLBACK',
  'CO_PROVIDER_WORKER_MAX_TURNS',
  'CODEX_RUNTIME_MODE',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'https_proxy',
  'http_proxy',
  'LINEAR_API_KEY',
  'NODE_EXTRA_CA_CERTS',
  'NO_PROXY',
  'no_proxy',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_ORGANIZATION',
  'OPENAI_ORG_ID',
  'OPENAI_PROJECT',
  'OPENAI_PROJECT_ID',
  'SSL_CERT_DIR',
  'SSL_CERT_FILE'
] as const;

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
  transport: ProviderLaunchTransport;
}

type ProviderLaunchTransport =
  | {
      kind: 'local';
    }
  | {
      kind: 'ssh';
      host: ProviderWorkerHostConfig;
    };

type ProviderSshLaunchSpec = ProviderLaunchSpec & {
  transport: {
    kind: 'ssh';
    host: ProviderWorkerHostConfig;
  };
};

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
  const providerWorkflowConfigStore = createProviderWorkflowConfigStore({
    env,
    runDir: paths.runDir,
    pipelineId: startPipelineId
  });
  await providerWorkflowConfigStore.bootstrap();

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
    controlHostOwnership: {
      repoRoot: env.repoRoot,
      taskId,
      pipelineId: startPipelineId,
      cwd: process.cwd(),
      argv: process.argv.slice(),
      commandPath: cliEntrypoint,
      packageRoot: resolveProviderOverridePackageRoot(cliEntrypoint)
    },
    providerWorkflowConfigStore,
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
        providerWorkflowConfigStore,
        runReviewHandoffPromotion: runProviderReviewHandoffPromotion,
        runMergeCloseout: runProviderDeterministicMergeCloseout,
        ...createControlHostTrackedIssueResolvers({ readFeatureToggles }),
        launcher: {
          start: async (input) => {
            const launchSpec = await resolveProviderStartLaunchSpec(
              env,
              input.taskId,
              input.workerHost ?? null,
              providerWorkflowConfigStore
            );
            return await spawnBackgroundCliAndWaitForManifest(
              launchSpec,
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
                ...buildProviderOverrideOwnershipEnv(cliEntrypoint, launchSpec.envOverrides),
                ...buildProviderLinearSourceEnvOverrides(input),
                ...buildProviderResidentSessionEnvOverrides(input.residentSessionSeed ?? null),
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
            const launchSpec = await resolveProviderResumeLaunchSpec(
              env,
              input.runId,
              providerWorkflowConfigStore,
              input.workerHost
            );
            assertResumeLaunchSpecMatchesAdmittedWorkerHost(input.workerHost, launchSpec);
            await spawnBackgroundCli(launchSpec, cliEntrypoint, [
              'resume',
              '--run',
              input.runId,
              '--actor',
              input.actor,
              '--reason',
              input.reason
            ], {
              ...launchSpec.envOverrides,
              ...buildProviderOverrideOwnershipEnv(cliEntrypoint, launchSpec.envOverrides),
              [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: taskId,
              [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: runId,
              [PROVIDER_LAUNCH_SOURCE_ENV]: PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
              [PROVIDER_LAUNCH_TOKEN_ENV]: input.launchToken
            });
          }
        }
      })
  });

  let dashboard: ControlStatusDashboardHandle | null = null;
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
    } else if (
      shouldEnableControlStatusDashboard({
        format,
        stdoutIsTTY: process.stdout.isTTY === true,
        stderrIsTTY: process.stderr.isTTY === true,
        term: process.env.TERM ?? null,
        env: process.env
      })
    ) {
      dashboard = startControlStatusDashboard({
        runtime: lifecycle.requestContextShared.runtime,
        baseUrl: lifecycle.baseUrl,
        taskId,
        runId,
        runDir: paths.runDir,
        startPipelineId
      });
    } else {
      console.log(`Control host ready: ${lifecycle.baseUrl}`);
      console.log(`Task: ${taskId}`);
      console.log(`Run: ${runId}`);
      console.log(`Run dir: ${paths.runDir}`);
      console.log(`Start pipeline: ${startPipelineId}`);
    }

    await waitForSignal();
  } finally {
    dashboard?.stop();
    await dashboard?.flush();
    await closeControlServerPublicLifecycle(lifecycle);
  }
}

async function spawnBackgroundCliAndWaitForManifest(
  launchSpec: ProviderLaunchSpec,
  cliEntrypoint: string,
  args: string[],
  taskRunsRoot: string,
  taskId: string,
  envOverrides: Record<string, string> = {},
  correlation: SpawnManifestCorrelation | null = null
): Promise<SpawnedRunManifestInfo | null> {
  const baselineRuns = await snapshotRunManifests(taskRunsRoot);
  await spawnBackgroundCli(launchSpec, cliEntrypoint, args, envOverrides);
  return await pollForSpawnManifest({
    taskRunsRoot,
    taskId,
    baselineRuns,
    correlation,
    timeoutMs: resolveSpawnManifestWaitTimeoutMs(launchSpec),
    intervalMs: SPAWN_MANIFEST_WAIT_INTERVAL_MS
  });
}

function resolveSpawnManifestWaitTimeoutMs(launchSpec: ProviderLaunchSpec): number {
  return isProviderSshLaunchSpec(launchSpec)
    ? REMOTE_SPAWN_MANIFEST_WAIT_TIMEOUT_MS
    : LOCAL_SPAWN_MANIFEST_WAIT_TIMEOUT_MS;
}

async function spawnBackgroundCli(
  launchSpec: ProviderLaunchSpec,
  cliEntrypoint: string,
  args: string[],
  envOverrides: Record<string, string> = {}
): Promise<void> {
  if (isProviderSshLaunchSpec(launchSpec)) {
    await spawnBackgroundCliOverSsh(launchSpec, cliEntrypoint, args, envOverrides);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, cliEntrypoint, ...args], {
      cwd: launchSpec.cwd,
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

async function spawnBackgroundCliOverSsh(
  launchSpec: ProviderSshLaunchSpec,
  cliEntrypoint: string,
  args: string[],
  envOverrides: Record<string, string> = {}
): Promise<void> {
  const envValues = buildRemoteProviderEnvValues(process.env, envOverrides);
  const sshInvocation = buildRemoteProviderSshInvocation({
    host: launchSpec.transport.host,
    cwd: launchSpec.cwd,
    nodePath: resolveRemoteProviderNodePath(launchSpec.transport.host),
    cliEntrypoint,
    args,
    envValues
  });
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ssh', sshInvocation.sshArgs, {
      cwd: launchSpec.cwd,
      detached: true,
      stdio: ['pipe', 'ignore', 'ignore']
    });
    const onError = (error: Error) => reject(error);
    child.once('error', onError);
    child.once('spawn', () => {
      child.off('error', onError);
      void writeRemoteProviderScriptToSshChild(child, sshInvocation.remoteScript).then(resolve, reject);
    });
  });
}

async function writeRemoteProviderScriptToSshChild(
  child: {
    stdin?: NodeJS.WritableStream | null;
    unref(): void;
  },
  remoteScript: string
): Promise<void> {
  const stdin = child.stdin;
  if (!stdin) {
    child.unref();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      stdin.off('error', onError);
      stdin.off('finish', onFinish);
    };
    const settleResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      child.unref();
      resolve();
    };
    const settleReject = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    const onError = (error: Error) => settleReject(error);
    const onFinish = () => settleResolve();
    stdin.once('error', onError);
    stdin.once('finish', onFinish);
    try {
      stdin.end(remoteScript);
    } catch (error) {
      settleReject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function isProviderSshLaunchSpec(launchSpec: ProviderLaunchSpec): launchSpec is ProviderSshLaunchSpec {
  return launchSpec.transport.kind === 'ssh';
}

function buildRemoteProviderLaunchCommand(input: {
  cwd: string;
  nodePath: string;
  cliEntrypoint: string;
  args: string[];
  envValues: Record<string, string>;
}): string {
  const envAssignments = [
    'PATH="$PATH"',
    ...Object.entries(input.envValues)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${quoteShellArg(value)}`)
  ];
  const command = [
    quoteShellArg(input.nodePath),
    quoteShellArg(input.cliEntrypoint),
    ...input.args.map((value) => quoteShellArg(value))
  ].join(' ');
  return `cd ${quoteShellArg(input.cwd)} && exec env -i ${envAssignments.join(' ')} ${command}`;
}

function buildRemoteProviderSshInvocation(input: {
  host: ProviderWorkerHostConfig;
  cwd: string;
  nodePath: string;
  cliEntrypoint: string;
  args: string[];
  envValues: Record<string, string>;
}): {
  sshArgs: string[];
  remoteScript: string;
} {
  return {
    sshArgs: [
      '-o',
      'BatchMode=yes',
      ...input.host.ssh_options,
      input.host.ssh_destination,
      'sh',
      '-s'
    ],
    remoteScript: `${buildRemoteProviderLaunchCommand({
      cwd: input.cwd,
      nodePath: input.nodePath,
      cliEntrypoint: input.cliEntrypoint,
      args: input.args,
      envValues: input.envValues
    })}\n`
  };
}

function buildRemoteProviderEnvValues(
  inheritedEnv: NodeJS.ProcessEnv,
  envOverrides: Record<string, string> = {}
): Record<string, string> {
  const inheritedValues = Object.fromEntries(
    ALLOWED_REMOTE_PROVIDER_ENV_KEYS.flatMap((key) => {
      const value = inheritedEnv[key];
      return typeof value === 'string' ? [[key, value] as const] : [];
    })
  );
  return Object.fromEntries(
    Object.entries({
      ...inheritedValues,
      ...envOverrides
    }).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );
}

function quoteShellArg(value: string): string {
  return `'${value.replace(/'/gu, `'\\''`)}'`;
}

function buildProviderOverrideOwnershipEnv(
  cliEntrypoint: string,
  envOverrides: Record<string, string>
): Record<string, string> {
  const repoConfigPath = normalizeProviderLinearSourceValue(envOverrides[REPO_CONFIG_PATH_ENV_KEY]);
  const packageRoot =
    normalizeProviderLinearSourceValue(envOverrides.CODEX_ORCHESTRATOR_PACKAGE_ROOT) ??
    resolveProviderOverridePackageRoot(cliEntrypoint);
  return {
    ...(repoConfigPath ? { [PROVIDER_REPO_CONFIG_PATH_ENV_KEY]: repoConfigPath } : {}),
    ...(packageRoot ? { [PROVIDER_PACKAGE_ROOT_ENV_KEY]: packageRoot } : {})
  };
}

function resolveProviderOverridePackageRoot(cliEntrypoint: string): string | null {
  const configured = normalizeProviderLinearSourceValue(process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT);
  if (configured) {
    return configured;
  }
  const resolvedCliEntrypoint = (() => {
    try {
      return realpathSync(cliEntrypoint);
    } catch {
      return cliEntrypoint;
    }
  })();
  try {
    return findPackageRoot(pathToFileURL(resolvedCliEntrypoint).href);
  } catch {
    const cliDir = dirname(resolvedCliEntrypoint);
    const parentDir = dirname(cliDir);
    const fallbackRoot =
      basename(cliDir) === 'bin' && basename(parentDir) === 'dist'
        ? dirname(parentDir)
        : parentDir;
    return normalizeProviderLinearSourceValue(fallbackRoot);
  }
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
  taskId: string,
  workerHost: string | null,
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore
): Promise<ProviderLaunchSpec> {
  const workspacePath = await ensureProviderWorkspace(env.repoRoot, taskId);
  const configPath = await resolveProviderLaunchConfigPath(env, providerWorkflowConfigStore);
  return buildProviderLaunchSpec(
    env,
    workspacePath,
    configPath,
    resolveConfiguredProviderWorkerHost(providerWorkflowConfigStore, workerHost)
  );
}

async function resolveProviderResumeLaunchSpec(
  env: EnvironmentPaths,
  runId: string,
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore,
  preferredWorkerHost?: string | null
): Promise<ProviderLaunchSpec> {
  const { manifest, paths } = await loadManifest(env, runId);
  const manifestRecord = manifest as unknown as Record<string, unknown>;
  const resumeTaskId = await resolveProviderResumeTaskId(
    manifestRecord,
    runId,
    {
      runDir: paths.runDir,
      runsRoot: env.runsRoot
    }
  );
  const workspacePath = await resolveProviderResumeWorkspacePath(
    env.repoRoot,
    resumeTaskId,
    manifestRecord
  );
  const configPath = await resolveProviderLaunchConfigPath(env, providerWorkflowConfigStore);
  const persistedProofContext = await readProviderLinearLaunchContextFromProof(paths.runDir);
  const manifestStartedAt =
    typeof manifestRecord.started_at === 'string'
      ? manifestRecord.started_at
      : null;
  const resolvedWorkerHost = preferredWorkerHost === undefined
    ? resolveFreshProviderLaunchContextWorkerHost(
      persistedProofContext,
      manifestStartedAt
    )
    : normalizeProviderWorkerHostName(preferredWorkerHost);
  const launchSpec = buildProviderLaunchSpec(
    env,
    workspacePath,
    configPath,
    resolveConfiguredProviderWorkerHost(
      providerWorkflowConfigStore,
      resolvedWorkerHost,
      { allowMissing: true }
    )
  );
  return {
    ...launchSpec,
    envOverrides: {
      ...launchSpec.envOverrides,
      ...buildProviderLinearSourceEnvOverrides(
        persistedProofContext?.sourceScope ?? {
          provider: 'linear',
          workspaceId: null,
          teamId: null,
          projectId: null
        }
      )
    }
  };
}

function assertResumeLaunchSpecMatchesAdmittedWorkerHost(
  preferredWorkerHost: string | null | undefined,
  launchSpec: ProviderLaunchSpec
): void {
  const normalizedPreferredWorkerHost = normalizeProviderWorkerHostName(preferredWorkerHost);
  if (!normalizedPreferredWorkerHost) {
    return;
  }
  if (launchSpec.transport.kind === 'local') {
    throw new Error(
      `Admitted provider resume host "${normalizedPreferredWorkerHost}" resolved to local at launch time; retry under refreshed admission so the local safety cap is reapplied.`
    );
  }
  if (launchSpec.transport.host.name !== normalizedPreferredWorkerHost) {
    throw new Error(
      `Admitted provider resume host "${normalizedPreferredWorkerHost}" drifted to "${launchSpec.transport.host.name}" at launch time; retry under refreshed admission.`
    );
  }
}

async function resolveProviderLaunchConfigPath(
  env: EnvironmentPaths,
  providerWorkflowConfigStore?: ProviderWorkflowConfigStore
): Promise<string> {
  if (providerWorkflowConfigStore) {
    return await providerWorkflowConfigStore.getLaunchConfigPath();
  }
  return join(env.repoRoot, 'codex.orchestrator.json');
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

function buildProviderResidentSessionEnvOverrides(
  seed: ProviderLinearResidentSessionSeed | null
): Record<string, string> {
  return {
    [PROVIDER_LINEAR_RESIDENT_SESSION_SEED_ENV]: seed ? JSON.stringify(seed) : ''
  };
}

function buildProviderLaunchSpec(
  env: EnvironmentPaths,
  workspacePath: string,
  repoConfigPath: string,
  workerHost: ProviderWorkerHostConfig | null = null
): ProviderLaunchSpec {
  return {
    cwd: workspacePath,
    envOverrides: {
      CODEX_ORCHESTRATOR_ROOT: workspacePath,
      CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
      CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
      [REPO_CONFIG_PATH_ENV_KEY]: repoConfigPath,
      [CONFIG_AUTHORITY_MODE_ENV_KEY]: 'repo-authoritative',
      [REPO_CONFIG_REQUIRED_ENV_KEY]: '1',
      [PROVIDER_WORKER_HOST_ENV_KEY]: workerHost?.name ?? '',
      ...(workerHost ? { CODEX_ORCHESTRATOR_NODE_BIN: resolveRemoteProviderNodePath(workerHost) } : {}),
    },
    transport: workerHost
      ? {
          kind: 'ssh',
          host: workerHost
        }
      : {
          kind: 'local'
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

function createControlHostTrackedIssueResolvers(input: {
  readFeatureToggles: () => Record<string, unknown> | null | undefined;
  resolveEnv?: () => NodeJS.ProcessEnv;
  resolveIssueById?: typeof resolveLiveLinearTrackedIssueById;
  resolveIssues?: typeof resolveLiveLinearTrackedIssues;
}): ControlHostTrackedIssueResolvers {
  const resolveEnv = input.resolveEnv ?? (() => process.env);
  const resolveIssueById = input.resolveIssueById ?? resolveLiveLinearTrackedIssueById;
  const resolveIssues = input.resolveIssues ?? resolveLiveLinearTrackedIssues;

  const resolveIssueByIdWithSource = async (
    sourceSetupResolver: (
      featureToggles: Record<string, unknown> | null | undefined,
      env: NodeJS.ProcessEnv
    ) =>
      | { sourceSetup: { provider: 'linear'; workspace_id: string | null; team_id: string | null; project_id: string | null } }
      | { status: number; error: string },
    issueId: string
  ) => {
    const runtimeEnv = resolveEnv();
    const sourceSetup = sourceSetupResolver(input.readFeatureToggles(), runtimeEnv);
    if ('error' in sourceSetup) {
      return { kind: 'skip', reason: sourceSetup.error } as const;
    }
    const resolution = await resolveIssueById({
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
    return {
      kind: 'skip',
      reason: resolution.reason,
      ...(resolution.details ? { details: resolution.details } : {})
    } as const;
  };

  return {
    resolveTrackedIssue: async ({ issueId }) =>
      await resolveIssueByIdWithSource(resolveLinearWebhookSourceSetup, issueId),
    resolveRevalidationTrackedIssue: async ({ issueId }) =>
      await resolveIssueByIdWithSource(resolveLinearConfiguredSourceSetup, issueId),
    resolveTrackedIssues: async (resolverInput) => {
      const runtimeEnv = resolveEnv();
      const sourceSetup = resolveLinearWebhookSourceSetup(input.readFeatureToggles(), runtimeEnv);
      if ('error' in sourceSetup) {
        return { kind: 'skip', reason: sourceSetup.error } as const;
      }
      const resolution = await resolveIssues({
        sourceSetup: sourceSetup.sourceSetup,
        env: runtimeEnv,
        queryMode: resolverInput?.mode,
        eligibleIssueTargetCount: resolverInput?.eligibleTargetCount,
        eligibleStateSlotCounts: resolverInput?.eligibleStateSlotCounts,
        excludedIssueIds: resolverInput?.excludedIssueIds
      });
      if (resolution.kind === 'ready') {
        return { kind: 'ready', trackedIssues: resolution.tracked_issues } as const;
      }
      return { kind: 'skip', reason: resolution.reason } as const;
    }
  };
}

async function readProviderLinearLaunchContextFromProof(runDir: string): Promise<{
  sourceScope: ProviderLinearSourceScope | null;
  attemptStartedAt: string | null;
  updatedAt: string | null;
  workerHost: string | null;
} | null> {
  try {
    const raw = await readFile(join(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return parseProviderLinearLaunchContextFromProof(parsed);
  } catch {
    return null;
  }
}

function parseProviderLinearLaunchContextFromProof(input: unknown): {
  sourceScope: ProviderLinearSourceScope | null;
  attemptStartedAt: string | null;
  updatedAt: string | null;
  workerHost: string | null;
} | null {
  if (!isRecord(input)) {
    return null;
  }
  const sourceSetup = isRecord(input.source_setup) && input.source_setup.provider === 'linear'
    ? input.source_setup
    : null;
  return {
    sourceScope: sourceSetup
      ? {
          provider: 'linear',
          workspaceId:
            typeof sourceSetup.workspace_id === 'string' ? sourceSetup.workspace_id : null,
          teamId: typeof sourceSetup.team_id === 'string' ? sourceSetup.team_id : null,
          projectId: typeof sourceSetup.project_id === 'string' ? sourceSetup.project_id : null
        }
      : null,
    attemptStartedAt:
      typeof input.attempt_started_at === 'string' ? input.attempt_started_at : null,
    updatedAt: typeof input.updated_at === 'string' ? input.updated_at : null,
    workerHost: normalizeProviderWorkerHostName(input.worker_host)
  };
}

function resolveFreshProviderLaunchContextWorkerHost(
  context:
    | {
        attemptStartedAt: string | null;
        updatedAt: string | null;
        workerHost: string | null;
      }
    | null
    | undefined,
  manifestStartedAt: string | null | undefined
): string | null {
  if (!context?.workerHost) {
    return null;
  }
  return isProviderLinearWorkerProofFreshForStage(
    {
      attempt_started_at: context.attemptStartedAt,
      updated_at: context.updatedAt
    },
    manifestStartedAt ?? null
  )
    ? context.workerHost
    : null;
}

function resolveConfiguredProviderWorkerHost(
  providerWorkflowConfigStore: ProviderWorkflowConfigStore | undefined,
  workerHost: string | null,
  options: {
    allowMissing?: boolean;
  } = {}
): ProviderWorkerHostConfig | null {
  const normalizedWorkerHost = normalizeProviderWorkerHostName(workerHost);
  if (!normalizedWorkerHost) {
    return null;
  }
  const configuredHost = findProviderWorkerHost(
    providerWorkflowConfigStore?.snapshot().worker_hosts ?? [],
    normalizedWorkerHost
  );
  if (!configuredHost) {
    if (options.allowMissing === true) {
      return null;
    }
    throw new Error(
      `Configured provider worker host "${normalizedWorkerHost}" is unavailable in the current provider workflow snapshot.`
    );
  }
  return configuredHost;
}

function resolveRemoteProviderNodePath(workerHost: ProviderWorkerHostConfig): string {
  return workerHost.node_path ?? 'node';
}

export const __test__ = {
  DEFAULT_PROVIDER_START_PIPELINE_ID,
  buildProviderLaunchSpec,
  buildRemoteProviderEnvValues,
  buildRemoteProviderLaunchCommand,
  buildRemoteProviderSshInvocation,
  buildProviderLinearSourceEnvOverrides,
  buildProviderResidentSessionEnvOverrides,
  buildProviderOverrideOwnershipEnv,
  beginProviderIssueHandoffStartupRefresh,
  findSpawnManifest,
  rehydrateProviderIssueHandoffOnStartup,
  refreshProviderIssueHandoffOnStartup,
  resolveRemoteProviderNodePath,
  resolveSpawnManifestWaitTimeoutMs,
  resolveProviderResumeLaunchSpec,
  assertResumeLaunchSpecMatchesAdmittedWorkerHost,
  resolveProviderResumeTaskId,
  resolveProviderOverridePackageRoot,
  createControlHostTrackedIssueResolvers,
  snapshotRunManifests,
  writeRemoteProviderScriptToSshChild
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
