/* eslint-disable patterns/prefer-logger-over-console */

import { execFile, spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  CONTROL_HOST_SUPERVISION_RESTART_HISTORY_LIMIT,
  CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS,
  DEFAULT_CONTROL_HOST_SUPERVISION_LABEL,
  DEFAULT_CONTROL_HOST_SUPERVISION_KILL_TIMEOUT_SECONDS,
  DEFAULT_CONTROL_HOST_SUPERVISION_RESTART_EXIT_CODE,
  buildControlHostSupervisionConfig,
  buildControlHostSupervisionPlist,
  buildInitialControlHostSupervisionState,
  evaluateControlHostSupervisionHealthPayload,
  evaluateControlHostSupervisionProbeTimeoutDiagnostic,
  formatControlHostSupervisionMachineStatusDegradedMessage,
  readControlHostSupervisionMachineStatusDegraded,
  readControlHostSupervisionHealthDiagnostic,
  parseControlHostSupervisionCsv,
  resolveControlHostSupervisionPaths,
  resolveDefaultControlHostSupervisionEntrypoint,
  resolveDefaultControlHostSupervisionEnvFiles,
  type ControlHostSupervisionConfig,
  type ControlHostSupervisionHealthDiagnostic,
  type ControlHostSupervisionPaths,
  type ControlHostSupervisionRestartRecord,
  type ControlHostSupervisionState
} from './control/controlHostSupervision.js';
import { PROVIDER_INTAKE_STATE_FILE } from './control/controlPersistenceFiles.js';
import {
  isActiveProviderIntakeClaim,
  normalizeProviderIntakeState,
  type ProviderIntakeClaimRecord,
  type ProviderIntakeState
} from './control/providerIntakeState.js';
import {
  evaluateProviderControlHostFreshnessGauge,
  type ProviderControlHostFreshnessGaugeReport,
  type ProviderControlHostFreshnessVerdict
} from './control/providerControlHostFreshnessGauge.js';
import { DEFAULT_ATTACH_REQUEST_TIMEOUT_MS } from './coStatusAttachCliShell.js';
import { findPackageRoot } from './utils/packageInfo.js';
import { sanitizeProviderOverrideEnv } from './utils/providerOverrideEnv.js';
import {
  inspectSourceRootFreshness,
  type SourceRootFreshnessInspection
} from './utils/sourceRootFreshness.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
}

interface CommandBufferResult {
  exitCode: number;
  stdout: Buffer;
  stderr: Buffer;
  timedOut?: boolean;
}

interface ResolvedSupervisionInstall {
  label: string;
  paths: ControlHostSupervisionPaths;
  config: ControlHostSupervisionConfig | null;
}

interface ControlHostSupervisionStatusPayload {
  installed: boolean;
  label: string;
  service_target: string;
  config_path: string;
  state_path: string;
  plist_path: string;
  logs: {
    directory: string;
    stdout_path: string;
    stderr_path: string;
  };
  config: ControlHostSupervisionConfig | null;
  configured_runtime_freshness: SourceRootFreshnessInspection | null;
  state: ControlHostSupervisionState | null;
  persisted_state: ControlHostSupervisionState | null;
  launch_agent: ControlHostSupervisionLaunchAgentStatus;
  live_host: ControlHostSupervisionLiveHealthStatus | null;
  rollout: ControlHostSupervisionRolloutStatus;
  service: {
    loaded: boolean;
    loaded_source: 'launchctl' | 'live_host';
    launchctl_loaded: boolean;
    stale_launchctl_metadata: boolean;
    exit_code: number;
    summary: string | null;
    stderr: string | null;
  };
}

interface ControlHostSupervisionLaunchAgentStatus {
  exists: boolean;
  program_arguments: string[];
  working_directory: string | null;
  detected_program: string | null;
  classification: 'managed_supervision' | 'legacy_shim' | 'unknown' | 'missing';
}

interface ControlHostSupervisionRestartCleanupResult {
  result: 'no_prior_child' | 'exited_after_kickstart' | 'force_killed';
  orphanedProcessGroupPids: number[];
  orphanedDescendantPids: number[];
}

interface ControlHostSupervisionRolloutStatus {
  mode: 'managed_supervision' | 'legacy_shim' | 'mixed' | 'not_installed';
  migration_required: boolean;
  summary: string;
}

interface ControlHostSupervisionCoStatusEvidence {
  healthy: boolean;
  reason: string;
  message: string;
  diagnostic: ControlHostSupervisionHealthDiagnostic | null;
}

interface ControlHostSupervisionFreshnessEvidence {
  artifact_root: string;
  verdict: ProviderControlHostFreshnessVerdict;
  supporting_metrics_healthy: boolean;
}

interface ControlHostSupervisionLiveHealthStatus {
  checked_at: string | null;
  healthy: boolean | null;
  source: 'co_status' | 'freshness_gauge' | 'co_status+freshness_gauge' | 'none';
  reason: string | null;
  message: string | null;
  stale_launchctl_metadata: boolean;
  stale_persisted_state: boolean;
  co_status: ControlHostSupervisionCoStatusEvidence | null;
  freshness_gauge: ControlHostSupervisionFreshnessEvidence | null;
}

interface ExistingControlHostSupervisionInstallSnapshot {
  paths: ControlHostSupervisionPaths;
  configContents: string | null;
  stateContents: string | null;
  plistContents: string | null;
}

interface ControlHostSupervisionChildExitEvent {
  type: 'child_exit';
  code: number | null;
  signal: string | null;
}

interface ControlHostSupervisionChildErrorEvent {
  type: 'child_error';
  error: Error;
}

const REQUIRED_CONTROL_HOST_SUPERVISION_STRING_FIELDS = [
  'label',
  'repoRoot',
  'nodePath',
  'cliEntrypoint',
  'taskId',
  'runId',
  'pipelineId',
  'shellPath',
  'homeDir'
] as const;
const REQUIRED_CONTROL_HOST_SUPERVISION_INTEGER_FIELDS = [
  'version',
  'healthIntervalSeconds',
  'unhealthyThreshold',
  'launchdThrottleSeconds',
  'killTimeoutSeconds'
] as const;
const REQUIRED_CONTROL_HOST_SUPERVISION_PATH_FIELDS = [
  'supportDir',
  'configPath',
  'statePath',
  'plistPath',
  'logsDir',
  'stdoutLogPath',
  'stderrLogPath'
] as const;

const execFileAsync = promisify(execFile);
const COMMAND_BUFFER_MAX_BYTES = 16 * 1024 * 1024;
const CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_CAP_MS = 45_000;
const CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_HEADROOM_MS = 5_000;
const CONTROL_HOST_SUPERVISION_PROBE_ENDPOINT_READ_ATTEMPTS = 2;
const CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_FLOOR_MS = 1_000;
const CONTROL_HOST_SUPERVISION_LAUNCHCTL_BOOTSTRAP_RETRY_ATTEMPTS = 5;
const CONTROL_HOST_SUPERVISION_LAUNCHCTL_BOOTSTRAP_RETRY_DELAY_MS = 1_000;

export interface RunControlHostSupervisionCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

export async function runControlHostSupervisionCliShell(
  params: RunControlHostSupervisionCliShellParams
): Promise<void> {
  const { positionals, flags } = params;
  if (flags.help !== undefined || positionals[0] === undefined || positionals[0] === 'help') {
    params.printHelp();
    return;
  }

  const [subcommand, ...rest] = positionals;
  if (rest.length > 0) {
    throw new Error(`Unknown control-host supervise argument(s): ${rest.join(' ')}`);
  }

  switch (subcommand) {
    case 'install':
      await installControlHostSupervision(flags);
      return;
    case 'status':
      await printControlHostSupervisionStatus(flags);
      return;
    case 'restart':
      await restartControlHostSupervision(flags);
      return;
    case 'uninstall':
      await uninstallControlHostSupervision(flags);
      return;
    case 'run':
      await runControlHostSupervision(flags);
      return;
    default:
      throw new Error(`Unknown control-host supervise subcommand: ${subcommand}`);
  }
}

async function installControlHostSupervision(flags: ArgMap): Promise<void> {
  const format = readFormatFlag(flags);
  const install = resolveInstallConfig(flags);
  const serviceTarget = resolveControlHostSupervisionServiceTarget(install.config.label);
  const priorInstall = await captureExistingControlHostSupervisionInstall(install.config.paths);

  await assertControlHostSupervisionInstallPaths(install.config);
  await mkdir(dirname(install.config.paths.plistPath), { recursive: true });
  await mkdir(install.config.paths.supportDir, { recursive: true });
  await mkdir(install.config.paths.logsDir, { recursive: true });

  try {
    await writeJsonFile(install.config.paths.configPath, install.config);
    await writeJsonFile(
      install.config.paths.statePath,
      buildInitialControlHostSupervisionState({
        config: install.config,
        serviceTarget,
        status: 'installed',
        updatedAt: new Date().toISOString(),
        message: 'LaunchAgent installed; waiting for launchd supervision.'
      })
    );
    await writeFile(
      install.config.paths.plistPath,
      buildControlHostSupervisionPlist(install.config),
      'utf8'
    );

    await bootoutLaunchctlServiceTarget(serviceTarget);
    await bootstrapLaunchctlPlist(install.config.paths.plistPath);
  } catch (error) {
    const detail = (error as Error).message;
    try {
      if (priorInstall) {
        await restoreExistingControlHostSupervisionInstall(priorInstall, serviceTarget);
      } else {
        await rollbackFailedControlHostSupervisionInstall(install.config.paths, serviceTarget);
      }
    } catch (rollbackError) {
      throw new Error(`${detail} (rollback failed: ${(rollbackError as Error).message})`);
    }
    throw error;
  }

  const payload = {
    status: 'installed',
    label: install.config.label,
    service_target: serviceTarget,
    config_path: install.config.paths.configPath,
    state_path: install.config.paths.statePath,
    plist_path: install.config.paths.plistPath,
    logs: {
      directory: install.config.paths.logsDir,
      stdout_path: install.config.paths.stdoutLogPath,
      stderr_path: install.config.paths.stderrLogPath
    },
    repo_root: install.config.repoRoot,
    task_id: install.config.taskId,
    run_id: install.config.runId,
    pipeline_id: install.config.pipelineId,
    health_interval_seconds: install.config.healthIntervalSeconds,
    unhealthy_threshold: install.config.unhealthyThreshold,
    env_files: install.config.envFiles
  };

  emitOutput(
    format,
    payload,
    [
      `Installed control-host supervision for ${install.config.label}.`,
      `Service target: ${serviceTarget}`,
      `Config: ${install.config.paths.configPath}`,
      `Plist: ${install.config.paths.plistPath}`,
      `Logs: ${install.config.paths.stdoutLogPath} | ${install.config.paths.stderrLogPath}`
    ].join('\n')
  );
}

async function printControlHostSupervisionStatus(flags: ArgMap): Promise<void> {
  const format = readFormatFlag(flags);
  const resolved = await resolveStoredControlHostSupervision(flags, false);
  const serviceTarget = resolveControlHostSupervisionServiceTarget(resolved.label);
  const launchctl = await runLaunchctl(['print', serviceTarget], { allowFailure: true });
  const state = await readJsonFileIfExists<ControlHostSupervisionState>(resolved.paths.statePath);
  const plistContents = await readTextFileIfExists(resolved.paths.plistPath);
  const launchAgent = inspectControlHostSupervisionLaunchAgent(plistContents, resolved.config);
  const liveHost =
    resolved.config && launchAgent.classification === 'managed_supervision'
      ? await inspectControlHostSupervisionLiveHealth(resolved.config, state)
      : null;
  const payload = buildControlHostSupervisionStatusPayload({
    resolved,
    serviceTarget,
    state,
    launchctl,
    launchAgent,
    liveHost
  });
  emitOutput(format, payload, formatControlHostSupervisionStatus(payload));
}

async function restartControlHostSupervision(flags: ArgMap): Promise<void> {
  const format = readFormatFlag(flags);
  const resolved = await resolveStoredControlHostSupervision(flags, true);
  if (!resolved.config) {
    throw new Error('control-host supervision restart requires an installed config.');
  }
  const config = resolved.config;
  const runtimeFreshness = inspectControlHostSupervisionConfiguredRuntimeFreshness(config);
  const serviceTarget = resolveControlHostSupervisionServiceTarget(resolved.label);
  const restart = await restartExistingControlHostSupervision(
    {
      ...resolved,
      config
    },
    serviceTarget
  );

  const payload = {
    status: 'restarted',
    label: resolved.label,
    service_target: serviceTarget,
    config_path: resolved.paths.configPath,
    plist_path: resolved.paths.plistPath,
    runtime_freshness: runtimeFreshness,
    previous_child_pid: restart.previousChildPid,
    child_pid: restart.childPid,
    cleanup: {
      result: restart.cleanup.result,
      orphaned_process_group_pids: restart.cleanup.orphanedProcessGroupPids,
      orphaned_descendant_pids: restart.cleanup.orphanedDescendantPids
    }
  };
  const restartDetail =
    restart.cleanup.result === 'no_prior_child'
      ? 'No previously tracked supervised child pid was recorded.'
      : restart.cleanup.result === 'exited_after_kickstart'
        ? `Previous supervised child pid ${restart.previousChildPid} exited before restart completed.`
        : `Force-cleaned previous supervised child pid ${restart.previousChildPid}; orphaned group pids=${restart.cleanup.orphanedProcessGroupPids.join(',') || 'none'} descendants=${restart.cleanup.orphanedDescendantPids.join(',') || 'none'}.`;
  emitOutput(
    format,
    payload,
    `Restarted control-host supervision for ${resolved.label} via ${serviceTarget}. Configured runtime freshness: ${formatControlHostSupervisionRuntimeFreshness(runtimeFreshness)}. ${restartDetail}`
  );
}

async function uninstallControlHostSupervision(flags: ArgMap): Promise<void> {
  const format = readFormatFlag(flags);
  const resolved = await resolveStoredControlHostSupervision(flags, true);
  const removedPaths = await removeInstalledControlHostSupervisionArtifacts(resolved);
  const serviceTarget = resolveControlHostSupervisionServiceTarget(resolved.label);

  const payload = {
    status: 'uninstalled',
    label: resolved.label,
    service_target: serviceTarget,
    config_path: removedPaths.configPath,
    plist_path: removedPaths.plistPath,
    logs_dir: removedPaths.logsDir
  };
  emitOutput(
    format,
    payload,
    `Uninstalled control-host supervision for ${resolved.label}.`
  );
}

async function runControlHostSupervision(flags: ArgMap): Promise<void> {
  const resolved = await resolveStoredControlHostSupervision(flags, true);
  if (!resolved.config) {
    throw new Error('control-host supervise run requires an installed config.');
  }

  const config = resolved.config;
  const serviceTarget = resolveControlHostSupervisionServiceTarget(config.label);
  await assertPathExists(config.nodePath, 'Node executable');
  await assertPathExists(config.cliEntrypoint, 'Control-host supervision entrypoint');

  const priorState =
    (await readJsonFileIfExists<ControlHostSupervisionState>(config.paths.statePath)) ??
    buildInitialControlHostSupervisionState({
      config,
      serviceTarget,
      updatedAt: new Date().toISOString()
    });

  const writeState = async (
    update: Partial<ControlHostSupervisionState> & { status: string; updated_at: string }
  ): Promise<ControlHostSupervisionState> => {
    const nextState = buildNextControlHostSupervisionState({
      priorState,
      update,
      config,
      serviceTarget
    });
    await writeJsonFile(config.paths.statePath, nextState);
    Object.assign(priorState, nextState);
    return nextState;
  };

  let childEnv: NodeJS.ProcessEnv;
  try {
    childEnv = await loadBootstrapEnvironment(config);
  } catch (error) {
    const failedAt = new Date().toISOString();
    await writeState({
      status: 'bootstrap_failed',
      updated_at: failedAt,
      message: (error as Error).message
    });
    throw error;
  }
  const controlHostArgs = [
    config.cliEntrypoint,
    'control-host',
    '--task',
    config.taskId,
    '--run',
    config.runId,
    '--pipeline',
    config.pipelineId,
    '--format',
    'json'
  ];
  const child = spawn(config.nodePath, controlHostArgs, {
    cwd: config.repoRoot,
    env: childEnv,
    // Give the supervised host its own process group so timeout cleanup can
    // kill the whole wrapper->runner tree even if the wrapper exits first.
    detached: true,
    stdio: 'inherit'
  });
  const { childExitPromise, childErrorPromise } =
    createControlHostSupervisionChildEventPromises(child);
  // Fail closed if state persistence breaks after spawn; otherwise launchd can
  // restart while an orphaned control-host keeps running outside supervision.
  const writeRuntimeState = async (
    update: Partial<ControlHostSupervisionState> & { status: string; updated_at: string }
  ): Promise<ControlHostSupervisionState> =>
    writeRuntimeStateWithCleanup(child, config.killTimeoutSeconds, () => writeState(update));

  const startedAt = new Date().toISOString();
  await writeRuntimeState({
    status: 'running',
    updated_at: startedAt,
    child_pid: child.pid ?? null,
    last_started_at: startedAt,
    message: 'control-host supervision runner started.'
  });

  const stopWaiter = createStopSignalWaiter();

  let consecutiveUnhealthySamples = 0;
  const restartCount = priorState.restart_count ?? 0;

  try {
    for (;;) {
      const tickWaiter = createSleepWaiter(config.healthIntervalSeconds * 1_000);
      const event = await Promise.race([
        childExitPromise,
        childErrorPromise,
        stopWaiter.promise,
        tickWaiter.promise
      ]);
      tickWaiter.dispose();

      if (event.type === 'tick') {
        const probe = await probeControlHostHealth(config, childEnv, {
          minPollingUpdatedAt: startedAt,
          restartHistory: priorState.restart_history ?? null
        });
        const checkedAt = new Date().toISOString();
        if (probe.healthy) {
          if (isControlHostSupervisionQuarantineProbe(probe)) {
            consecutiveUnhealthySamples =
              resolveControlHostSupervisionQuarantineUnhealthySamples({
                currentConsecutiveUnhealthySamples: consecutiveUnhealthySamples,
                priorState,
                config
              });
            await writeRuntimeState({
              status: 'quarantined',
              updated_at: checkedAt,
              last_health_check_at: checkedAt,
              last_health_status: probe.reason,
              last_probe_duration_ms: probe.probeDurationMs,
              consecutive_unhealthy_samples: consecutiveUnhealthySamples,
              message: probe.message
            });
            continue;
          }
          consecutiveUnhealthySamples = 0;
          await writeRuntimeState({
            status: 'healthy',
            updated_at: checkedAt,
            last_health_check_at: checkedAt,
            last_health_status: probe.reason,
            last_probe_duration_ms: probe.probeDurationMs,
            consecutive_unhealthy_samples: 0,
            message: probe.message
          });
          continue;
        }

        consecutiveUnhealthySamples += 1;
        await writeRuntimeState({
          status: 'unhealthy',
          updated_at: checkedAt,
          last_health_check_at: checkedAt,
          last_health_status: probe.reason,
          last_probe_duration_ms: probe.probeDurationMs,
          consecutive_unhealthy_samples: consecutiveUnhealthySamples,
          message: probe.message
        });

        if (consecutiveUnhealthySamples < config.unhealthyThreshold) {
          continue;
        }

        const restartRequestedAt = new Date().toISOString();
        const restartMessage = `${probe.message} launchd restart requested after ${consecutiveUnhealthySamples} consecutive unhealthy samples.`;
        await writeRuntimeState({
          status: 'restart_required',
          updated_at: restartRequestedAt,
          last_health_check_at: restartRequestedAt,
          last_health_status: probe.reason,
          last_probe_duration_ms: probe.probeDurationMs,
          consecutive_unhealthy_samples: consecutiveUnhealthySamples,
          restart_count: restartCount + 1,
          last_restart_reason: probe.reason,
          last_restart_requested_at: restartRequestedAt,
          restart_history: appendControlHostSupervisionRestartRecord(
            priorState.restart_history ?? null,
            buildControlHostSupervisionRestartRecord({
              requestedAt: restartRequestedAt,
              reason: probe.reason,
              message: restartMessage,
              consecutiveUnhealthySamples,
              childPid: child.pid ?? null,
              probeDurationMs: probe.probeDurationMs,
              diagnostic: probe.diagnostic
            })
          ),
          message: restartMessage
        });
        console.error(
          `${restartRequestedAt} control-host unhealthy for ${consecutiveUnhealthySamples} checks; exiting for launchd restart (${probe.reason}).`
        );
        await terminateChildProcess(child, config.killTimeoutSeconds);
        process.exitCode = DEFAULT_CONTROL_HOST_SUPERVISION_RESTART_EXIT_CODE;
        return;
      }

      if (event.type === 'stop') {
        const stoppedAt = new Date().toISOString();
        await writeRuntimeState({
          status: 'stopping',
          updated_at: stoppedAt,
          message: `Supervisor received ${event.signal}; stopping child process.`
        });
        await terminateChildProcess(child, config.killTimeoutSeconds);
        const exitResult = await childExitPromise;
        const finishedAt = new Date().toISOString();
        await writeRuntimeState({
          status: 'stopped',
          updated_at: finishedAt,
          child_pid: null,
          last_exit_at: finishedAt,
          last_exit_code: exitResult.code,
          last_signal: exitResult.signal,
          message: `Supervisor stopped after ${event.signal}.`
        });
        process.exitCode = 0;
        return;
      }

      if (event.type === 'child_error') {
        const failedAt = new Date().toISOString();
        await writeRuntimeState({
          status: 'child_error',
          updated_at: failedAt,
          child_pid: null,
          last_exit_at: failedAt,
          message: event.error.message
        });
        throw event.error;
      }

      const exitedAt = new Date().toISOString();
      await writeRuntimeState({
        status: 'child_exited',
        updated_at: exitedAt,
        child_pid: null,
        last_exit_at: exitedAt,
        last_exit_code: event.code,
        last_signal: event.signal,
        message:
          event.code === null
            ? `control-host exited due to signal ${event.signal ?? 'unknown'}.`
            : `control-host exited with code ${event.code}.`
      });
      process.exitCode = event.code ?? 0;
      return;
    }
  } finally {
    stopWaiter.dispose();
  }
}

function resolveInstallConfig(flags: ArgMap): ResolvedSupervisionInstall & {
  config: ControlHostSupervisionConfig;
} {
  const cwd = process.cwd();
  const homeDir = resolve(process.env.HOME ?? process.cwd());
  const label = readStringFlag(flags, 'label') ?? undefined;
  const packageRoot = findPackageRoot();
  const envFilesFlag = parseControlHostSupervisionCsv(readStringFlag(flags, 'env-files'));
  const config = buildControlHostSupervisionConfig({
    homeDir,
    cwd,
    label,
    repoRoot: readStringFlag(flags, 'repo-root') ?? cwd,
    nodePath: readStringFlag(flags, 'node') ?? process.execPath,
    cliEntrypoint:
      readStringFlag(flags, 'cli-entrypoint') ??
      resolveDefaultControlHostSupervisionEntrypoint(process.argv[1] ?? null, packageRoot),
    taskId: readStringFlag(flags, 'task') ?? undefined,
    runId: readStringFlag(flags, 'run') ?? undefined,
    pipelineId: readStringFlag(flags, 'pipeline') ?? undefined,
    healthIntervalSeconds: readIntegerFlag(flags, 'health-interval'),
    unhealthyThreshold: readIntegerFlag(flags, 'unhealthy-threshold'),
    launchdThrottleSeconds: readIntegerFlag(flags, 'launchd-throttle'),
    killTimeoutSeconds:
      readIntegerFlag(flags, 'kill-timeout') ??
      DEFAULT_CONTROL_HOST_SUPERVISION_KILL_TIMEOUT_SECONDS,
    envFiles:
      envFilesFlag ?? resolveDefaultControlHostSupervisionEnvFiles(homeDir),
    shellPath: readStringFlag(flags, 'shell') ?? undefined
  });
  return {
    label: config.label,
    paths: config.paths,
    config
  };
}

async function resolveStoredControlHostSupervision(
  flags: ArgMap,
  requireConfig: boolean
): Promise<ResolvedSupervisionInstall> {
  const explicitConfigPath = readStringFlag(flags, 'config');
  if (explicitConfigPath) {
    const configPath = resolve(explicitConfigPath);
    const config = await readJsonFileIfExists<unknown>(configPath);
    if (!config) {
      throw new Error(`Control-host supervision config not found: ${configPath}`);
    }
    assertStoredControlHostSupervisionConfig(configPath, config);
    return {
      label: config.label,
      paths: config.paths,
      config
    };
  }

  const homeDir = resolve(process.env.HOME ?? process.cwd());
  const label = readStringFlag(flags, 'label') ?? undefined;
  const paths = resolveControlHostSupervisionPaths({ homeDir, label });
  const config = await readJsonFileIfExists<ControlHostSupervisionConfig>(paths.configPath);
  if (config) {
    assertStoredControlHostSupervisionConfig(paths.configPath, config);
  }
  if (requireConfig && !config) {
    throw new Error(
      `Control-host supervision is not installed for ${label ?? 'the default label'} (missing ${paths.configPath}).`
    );
  }
  return {
    label: config?.label ?? label ?? DEFAULT_CONTROL_HOST_SUPERVISION_LABEL,
    paths: config?.paths ?? paths,
    config
  };
}

async function loadBootstrapEnvironment(
  config: ControlHostSupervisionConfig,
  commandRunner: typeof runCommandBuffer = runCommandBuffer
): Promise<NodeJS.ProcessEnv> {
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: config.homeDir
  };
  if (config.envFiles.length === 0) {
    return baseEnv;
  }

  const existingEnvFiles: string[] = [];
  for (const envFile of config.envFiles) {
    if (await pathExists(envFile)) {
      existingEnvFiles.push(envFile);
    }
  }
  if (existingEnvFiles.length === 0) {
    return baseEnv;
  }

  const shellScript = [
    'set -a',
    ...existingEnvFiles.map(
      (envFile) =>
        `if [ -f '${escapeShellSingleQuotes(envFile)}' ]; then . '${escapeShellSingleQuotes(envFile)}'; fi`
    ),
    'env -0'
  ].join('; ');
  const bootstrapTimeoutMs = resolveControlHostSupervisionProbeTimeoutMs(
    config.healthIntervalSeconds
  );
  const result = await commandRunner(config.shellPath, ['-lc', shellScript], {
    cwd: config.repoRoot,
    env: baseEnv,
    timeoutMs: bootstrapTimeoutMs
  });
  if (result.timedOut === true) {
    throw new Error(
      `Timed out while sourcing control-host supervision env/bootstrap files after ${Math.round(bootstrapTimeoutMs / 1_000)}s.`
    );
  }
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString('utf8').trim();
    throw new Error(
      `Failed to source control-host supervision env/bootstrap files: ${stderr || 'shell returned a non-zero exit code.'}`
    );
  }
  return parseNulDelimitedEnv(result.stdout);
}

async function probeControlHostHealth(
  config: ControlHostSupervisionConfig,
  env: NodeJS.ProcessEnv,
  options: {
    minPollingUpdatedAt?: string | null;
    restartHistory?: ControlHostSupervisionRestartRecord[] | null;
    now?: string | null;
  } = {},
  commandRunner: typeof runCommand = runCommand
): Promise<{
  healthy: boolean;
  reason: string;
  message: string;
  probeDurationMs: number;
  diagnostic: ControlHostSupervisionHealthDiagnostic | null;
}> {
  const probeTimeoutMs = resolveControlHostSupervisionProbeTimeoutMs(config.healthIntervalSeconds);
  const probeStartedAt = Date.now();
  const result = await commandRunner(
    config.nodePath,
    [
      config.cliEntrypoint,
      'co-status',
      '--task',
      config.taskId,
      '--run',
      config.runId,
      '--format',
      'json',
      '--machine-status',
      '--machine-status-max-age-ms',
      String(config.healthIntervalSeconds * config.unhealthyThreshold * 1_000)
    ],
    {
      cwd: config.repoRoot,
      env,
      timeoutMs: probeTimeoutMs
    }
  );
  const probeDurationMs = Math.max(0, Date.now() - probeStartedAt);
  if (result.timedOut === true) {
    const diagnostic = await readControlHostSupervisionProbeTimeoutDiagnostic(config, env);
    const timeoutQuarantine = evaluateControlHostSupervisionProbeTimeoutDiagnostic(diagnostic, {
      minPollingUpdatedAt: options.minPollingUpdatedAt ?? null,
      restartHistory: options.restartHistory ?? null,
      maxZeroWipPollingAgeMs: config.healthIntervalSeconds * config.unhealthyThreshold * 1_000,
      now: options.now ?? null
    });
    if (timeoutQuarantine) {
      return {
        healthy: timeoutQuarantine.healthy,
        reason: timeoutQuarantine.reason,
        message: timeoutQuarantine.message,
        probeDurationMs,
        diagnostic
      };
    }
    return {
      healthy: false,
      reason: 'probe_timeout',
      message: `co-status probe timed out after ${Math.round(probeTimeoutMs / 1_000)}s.`,
      probeDurationMs,
      diagnostic
    };
  }
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || 'co-status command failed.';
    if (isCoStatusProbeTimeoutFailure(detail)) {
      const diagnostic = await readControlHostSupervisionProbeTimeoutDiagnostic(config, env);
      const timeoutQuarantine = evaluateControlHostSupervisionProbeTimeoutDiagnostic(diagnostic, {
        minPollingUpdatedAt: options.minPollingUpdatedAt ?? null,
        restartHistory: options.restartHistory ?? null,
        maxZeroWipPollingAgeMs: config.healthIntervalSeconds * config.unhealthyThreshold * 1_000,
        now: options.now ?? null
      });
      if (timeoutQuarantine) {
        return {
          healthy: timeoutQuarantine.healthy,
          reason: timeoutQuarantine.reason,
          message: timeoutQuarantine.message,
          probeDurationMs,
          diagnostic
        };
      }
      return {
        healthy: false,
        reason: 'probe_timeout',
        message: `co-status probe timed out: ${detail}`,
        probeDurationMs,
        diagnostic
      };
    }
    return {
      healthy: false,
      reason: 'probe_failed',
      message: `co-status probe failed: ${detail}`,
      probeDurationMs,
      diagnostic: null
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(result.stdout);
  } catch (error) {
    return {
      healthy: false,
      reason: 'invalid_payload',
      message: `co-status probe returned invalid JSON: ${(error as Error).message}`,
      probeDurationMs,
      diagnostic: null
    };
  }

  const machineStatusDegraded = readControlHostSupervisionMachineStatusDegraded(payload);
  if (machineStatusDegraded) {
    const persistedDiagnostic =
      machineStatusDegraded.reason === 'read_timeout'
        ? await readControlHostSupervisionProbeTimeoutDiagnostic(config, env)
        : null;
    const timeoutQuarantine =
      machineStatusDegraded.reason === 'read_timeout'
        ? evaluateControlHostSupervisionProbeTimeoutDiagnostic(persistedDiagnostic, {
            minPollingUpdatedAt: options.minPollingUpdatedAt ?? null,
            restartHistory: options.restartHistory ?? null,
            maxZeroWipPollingAgeMs: config.healthIntervalSeconds * config.unhealthyThreshold * 1_000,
            now: options.now ?? null
          })
        : null;
    if (timeoutQuarantine?.reason === 'active_worker_probe_timeout_quarantine') {
      return {
        healthy: timeoutQuarantine.healthy,
        reason: timeoutQuarantine.reason,
        message: timeoutQuarantine.message,
        probeDurationMs,
        diagnostic: persistedDiagnostic
      };
    }
    return {
      healthy: false,
      reason: 'machine_status_degraded',
      message: formatControlHostSupervisionMachineStatusDegradedMessage(machineStatusDegraded),
      probeDurationMs,
      diagnostic: persistedDiagnostic ?? readControlHostSupervisionHealthDiagnostic(payload)
    };
  }

  const diagnostic = readControlHostSupervisionHealthDiagnostic(payload);
  const evaluation = evaluateControlHostSupervisionHealthPayload(payload, {
    minPollingUpdatedAt: options.minPollingUpdatedAt ?? null,
    staleRestartRequiredGraceMs: config.healthIntervalSeconds * config.unhealthyThreshold * 1_000,
    restartHistory: options.restartHistory ?? null,
    now: options.now ?? null
  });
  return {
    healthy: evaluation.healthy,
    reason: evaluation.reason,
    message: evaluation.message,
    probeDurationMs,
    diagnostic
  };
}

function isCoStatusProbeTimeoutFailure(detail: string): boolean {
  return (
    /\b(?:timed out|timeout)\b/iu.test(detail) &&
    /\bmachine-status\b/iu.test(detail) &&
    /\bsame-endpoint current-endpoint timeout\b/iu.test(detail)
  );
}

async function readControlHostSupervisionProbeTimeoutDiagnostic(
  config: ControlHostSupervisionConfig,
  env: NodeJS.ProcessEnv
): Promise<ControlHostSupervisionHealthDiagnostic | null> {
  try {
    const statePath = resolveControlHostSupervisionProviderIntakeStatePath(config, env);
    const persistedState = await readJsonFileIfExists<ProviderIntakeState>(statePath);
    if (!persistedState) {
      return null;
    }
    const state = normalizeProviderIntakeState(persistedState);
    const runningClaims = state.claims.filter(isRunningProviderIntakeClaim);
    const activeClaims = state.claims.filter(isActiveProviderIntakeClaim);
    return readControlHostSupervisionHealthDiagnostic({
      counts: {
        running: runningClaims.length,
        retrying: null,
        active: activeClaims.length,
        max_allowed: null
      },
      polling: state.polling ?? null,
      running: runningClaims.map(buildControlHostSupervisionRunningClaimSnapshot)
    });
  } catch {
    return null;
  }
}

function resolveControlHostSupervisionProviderIntakeStatePath(
  config: ControlHostSupervisionConfig,
  env: NodeJS.ProcessEnv
): string {
  const effectiveRepoRoot = resolveControlHostSupervisionEffectiveRepoRoot(config, env);
  const configuredRunsDir = env.CODEX_ORCHESTRATOR_RUNS_DIR?.trim();
  const runsRoot =
    configuredRunsDir && configuredRunsDir.length > 0
      ? resolve(effectiveRepoRoot, configuredRunsDir)
      : join(effectiveRepoRoot, '.runs');
  return join(
    runsRoot,
    sanitizeTaskId(config.taskId),
    'cli',
    sanitizeRunId(config.runId),
    PROVIDER_INTAKE_STATE_FILE
  );
}

function resolveControlHostSupervisionEffectiveRepoRoot(
  config: ControlHostSupervisionConfig,
  env: NodeJS.ProcessEnv
): string {
  const envRepoRoot = env.CODEX_ORCHESTRATOR_ROOT?.trim();
  return envRepoRoot && envRepoRoot.length > 0
    ? resolve(config.repoRoot, envRepoRoot)
    : config.repoRoot;
}

function isRunningProviderIntakeClaim(
  claim: ProviderIntakeClaimRecord
): boolean {
  return claim.state === 'running' && isActiveProviderIntakeClaim(claim);
}

function buildControlHostSupervisionRunningClaimSnapshot(
  claim: ProviderIntakeClaimRecord
): Record<string, unknown> {
  return {
    issue_id: claim.issue_id,
    issue_identifier: claim.issue_identifier,
    state: claim.state,
    display_state: claim.issue_state,
    pid: null,
    worker_host: claim.worker_host ?? null,
    session_id: claim.run_id,
    started_at: claim.launch_started_at ?? claim.updated_at,
    last_event_at: claim.updated_at
  };
}

async function inspectControlHostSupervisionLiveHealth(
  config: ControlHostSupervisionConfig,
  state: ControlHostSupervisionState | null,
  dependencies: {
    loadBootstrapEnvironment?: typeof loadBootstrapEnvironment;
    probeControlHostHealth?: typeof probeControlHostHealth;
    evaluateFreshnessGauge?: typeof evaluateProviderControlHostFreshnessGauge;
  } = {}
): Promise<ControlHostSupervisionLiveHealthStatus | null> {
  const loadBootstrapEnvironmentImpl =
    dependencies.loadBootstrapEnvironment ?? loadBootstrapEnvironment;
  const probeControlHostHealthImpl =
    dependencies.probeControlHostHealth ?? probeControlHostHealth;
  const evaluateFreshnessGaugeImpl =
    dependencies.evaluateFreshnessGauge ?? evaluateProviderControlHostFreshnessGauge;
  const checkedAt = new Date().toISOString();

  let bootstrappedEnv: NodeJS.ProcessEnv = {};
  let coStatus: ControlHostSupervisionCoStatusEvidence | null = null;
  try {
    bootstrappedEnv = sanitizeProviderOverrideEnv(
      await loadBootstrapEnvironmentImpl(config),
      {
        stripWorkspaceArtifactEnv: true
      }
    );
    const probe = await probeControlHostHealthImpl(config, bootstrappedEnv, {
      minPollingUpdatedAt: state?.last_started_at ?? null,
      restartHistory: state?.restart_history ?? null
    });
    coStatus = {
      healthy: probe.healthy,
      reason: probe.reason,
      message: probe.message,
      diagnostic: probe.diagnostic
    };
  } catch (error) {
    coStatus = {
      healthy: false,
      reason: 'probe_failed',
      message: (error as Error).message,
      diagnostic: null
    };
  }

  let freshnessGauge: ControlHostSupervisionFreshnessEvidence | null = null;
  try {
    const artifactRoot = dirname(
      resolveControlHostSupervisionProviderIntakeStatePath(config, bootstrappedEnv)
    );
    const freshnessReport = await evaluateFreshnessGaugeImpl({
      artifactRoot
    });
    freshnessGauge = {
      artifact_root: artifactRoot,
      verdict: freshnessReport.verdict,
      supporting_metrics_healthy: hasHealthyLiveProviderControlHostFreshness(
        freshnessReport
      )
    };
  } catch {
    freshnessGauge = null;
  }

  if (coStatus?.healthy) {
    return {
      checked_at: checkedAt,
      healthy: true,
      source: freshnessGauge ? 'co_status+freshness_gauge' : 'co_status',
      reason: coStatus.reason,
      message: coStatus.message,
      stale_launchctl_metadata: false,
      stale_persisted_state: false,
      co_status: coStatus,
      freshness_gauge: freshnessGauge
    };
  }

  if (
    freshnessGauge?.supporting_metrics_healthy === true &&
    (coStatus === null ||
      coStatus.reason === 'probe_failed' ||
      coStatus.reason === 'invalid_payload')
  ) {
    return {
      checked_at: checkedAt,
      healthy: true,
      source: coStatus ? 'co_status+freshness_gauge' : 'freshness_gauge',
      reason: 'fresh_artifacts',
      message:
        'Provider/control-host freshness artifacts remain current and advancing, so live host recovery is healthier than the stale launchd or persisted supervision metadata.',
      stale_launchctl_metadata: false,
      stale_persisted_state: false,
      co_status: coStatus,
      freshness_gauge: freshnessGauge
    };
  }

  if (coStatus !== null) {
    return {
      checked_at: checkedAt,
      healthy: coStatus.healthy,
      source: 'co_status',
      reason: coStatus.reason,
      message: coStatus.message,
      stale_launchctl_metadata: false,
      stale_persisted_state: false,
      co_status: coStatus,
      freshness_gauge: freshnessGauge
    };
  }

  if (freshnessGauge !== null) {
    return {
      checked_at: checkedAt,
      healthy: freshnessGauge.supporting_metrics_healthy,
      source: 'freshness_gauge',
      reason: freshnessGauge.supporting_metrics_healthy
        ? 'fresh_artifacts'
        : 'freshness_unhealthy',
      message: freshnessGauge.supporting_metrics_healthy
        ? 'Provider/control-host freshness artifacts remain current and advancing.'
        : 'Provider/control-host freshness artifacts are not current enough to override stored supervision state.',
      stale_launchctl_metadata: false,
      stale_persisted_state: false,
      co_status: null,
      freshness_gauge: freshnessGauge
    };
  }

  return null;
}

function hasHealthyLiveProviderControlHostFreshness(
  report: ProviderControlHostFreshnessGaugeReport
): boolean {
  return (
    report.metrics.last_successful_refresh_age_ms.verdict === 'healthy' &&
    report.metrics.active_heartbeat_age_ms.verdict === 'healthy' &&
    report.metrics.polling_health.verdict === 'healthy' &&
    report.metrics.polling_health.value === 'ok'
  );
}

function buildControlHostSupervisionStatusPayload(input: {
  resolved: ResolvedSupervisionInstall;
  serviceTarget: string;
  state: ControlHostSupervisionState | null;
  launchctl: CommandResult;
  launchAgent: ControlHostSupervisionLaunchAgentStatus;
  liveHost?: ControlHostSupervisionLiveHealthStatus | null;
}): ControlHostSupervisionStatusPayload {
  const launchctlLoaded = input.launchctl.exitCode === 0;
  const serviceLoaded =
    launchctlLoaded ||
    (input.launchAgent.classification === 'managed_supervision' &&
      input.liveHost?.healthy === true);
  const effectiveState = resolveEffectiveControlHostSupervisionState(
    input.state,
    input.liveHost ?? null
  );
  const stalePersistedState = hasControlHostSupervisionStateDrift(input.state, effectiveState);
  const staleLaunchctlMetadata = serviceLoaded && !launchctlLoaded;
  const summarySource =
    input.launchctl.stdout.trim() || input.launchctl.stderr.trim() || null;
  const liveHost =
    input.liveHost === undefined || input.liveHost === null
      ? null
      : {
          ...input.liveHost,
          stale_launchctl_metadata: staleLaunchctlMetadata,
          stale_persisted_state: stalePersistedState
        };
  return {
    installed: input.resolved.config !== null,
    label: input.resolved.label,
    service_target: input.serviceTarget,
    config_path: input.resolved.paths.configPath,
    state_path: input.resolved.paths.statePath,
    plist_path: input.resolved.paths.plistPath,
    logs: {
      directory: input.resolved.paths.logsDir,
      stdout_path: input.resolved.paths.stdoutLogPath,
      stderr_path: input.resolved.paths.stderrLogPath
    },
    config: input.resolved.config,
    configured_runtime_freshness: input.resolved.config
      ? inspectControlHostSupervisionConfiguredRuntimeFreshness(input.resolved.config)
      : null,
    state: effectiveState,
    persisted_state: input.state,
    launch_agent: input.launchAgent,
    live_host: liveHost,
    rollout: classifyControlHostSupervisionRollout({
      config: input.resolved.config,
      launchAgent: input.launchAgent,
      serviceLoaded,
      launchctlLoaded
    }),
    service: {
      loaded: serviceLoaded,
      loaded_source: serviceLoaded === launchctlLoaded ? 'launchctl' : 'live_host',
      launchctl_loaded: launchctlLoaded,
      stale_launchctl_metadata: staleLaunchctlMetadata,
      exit_code: input.launchctl.exitCode,
      summary: summarySource ? firstNonEmptyLine(summarySource) : null,
      stderr: input.launchctl.stderr.trim().length > 0 ? input.launchctl.stderr.trim() : null
    }
  };
}

function formatControlHostSupervisionStatus(
  payload: ControlHostSupervisionStatusPayload
): string {
  const lines = [
    `Control-host supervision: ${payload.installed ? 'installed' : 'not installed'}`,
    `Rollout: ${payload.rollout.mode}`,
    `Migration required: ${payload.rollout.migration_required ? 'yes' : 'no'}`,
    `Label: ${payload.label}`,
    `Service target: ${payload.service_target}`,
    `Service loaded: ${payload.service.loaded ? 'yes' : 'no'}`,
    `launchctl loaded: ${payload.service.launchctl_loaded ? 'yes' : 'no'}${
      payload.service.stale_launchctl_metadata
        ? ' (stale metadata; live host evidence is healthier)'
        : ''
    }`,
    `Config: ${payload.config_path}`,
    `Plist: ${payload.plist_path}`,
    `State: ${payload.state_path}`,
    `Logs: ${payload.logs.stdout_path} | ${payload.logs.stderr_path}`
  ];
  lines.push(`Rollout summary: ${payload.rollout.summary}`);
  if (payload.launch_agent.detected_program) {
    lines.push(`LaunchAgent program: ${payload.launch_agent.detected_program}`);
  }
  if (payload.config) {
    lines.push(`Repo root: ${payload.config.repoRoot}`);
    lines.push(`CLI entrypoint: ${payload.config.cliEntrypoint}`);
    lines.push(
      `Configured runtime freshness: ${formatControlHostSupervisionRuntimeFreshness(payload.configured_runtime_freshness)}`
    );
    lines.push(
      `Task/run/pipeline: ${payload.config.taskId} / ${payload.config.runId} / ${payload.config.pipelineId}`
    );
    lines.push(
      `Health: interval=${payload.config.healthIntervalSeconds}s threshold=${payload.config.unhealthyThreshold}`
    );
  }
  if (payload.live_host) {
    lines.push(
      `Live host: ${
        payload.live_host.healthy === null
          ? 'unknown'
          : payload.live_host.healthy
            ? 'healthy'
            : 'unhealthy'
      } via ${formatControlHostSupervisionLiveHealthSource(payload.live_host.source)}`
    );
    if (payload.live_host.reason) {
      lines.push(`Live host reason: ${payload.live_host.reason}`);
    }
    if (payload.live_host.message) {
      lines.push(`Live host detail: ${payload.live_host.message}`);
    }
  }
  if (payload.state) {
    lines.push(`State status: ${payload.state.status}`);
    lines.push(
      `Supervised child pid: ${payload.state.child_pid === null ? 'none recorded' : payload.state.child_pid}`
    );
    if (payload.state.last_health_status) {
      lines.push(
        `Last health: ${payload.state.last_health_status} (${payload.state.consecutive_unhealthy_samples}/${payload.state.unhealthy_threshold})`
      );
    }
    if (payload.state.last_restart_reason) {
      lines.push(`Last restart reason: ${payload.state.last_restart_reason}`);
    }
  }
  if (payload.persisted_state && payload.live_host?.stale_persisted_state === true) {
    lines.push(`Persisted state status: ${payload.persisted_state.status}`);
    if (payload.persisted_state.last_health_status) {
      lines.push(
        `Persisted last health: ${payload.persisted_state.last_health_status} (${payload.persisted_state.consecutive_unhealthy_samples}/${payload.persisted_state.unhealthy_threshold})`
      );
    }
  }
  if (payload.service.summary) {
    lines.push(`launchctl: ${payload.service.summary}`);
  }
  return lines.join('\n');
}

function inspectControlHostSupervisionConfiguredRuntimeFreshness(
  config: ControlHostSupervisionConfig
): SourceRootFreshnessInspection {
  return inspectSourceRootFreshness({
    intendedRepoRoot: config.repoRoot,
    commandPath: config.cliEntrypoint,
    packageRoot: config.repoRoot,
    cwd: config.repoRoot
  });
}

function formatControlHostSupervisionRuntimeFreshness(
  freshness: SourceRootFreshnessInspection | null
): string {
  if (!freshness) {
    return 'unavailable';
  }
  const drift = freshness.drift_classes.length > 0
    ? ` drift=${freshness.drift_classes.join(',')}`
    : '';
  return `${freshness.status} entrypoint=${freshness.entrypoint_kind}${drift}`;
}

function formatControlHostSupervisionLiveHealthSource(
  source: ControlHostSupervisionLiveHealthStatus['source']
): string {
  switch (source) {
    case 'co_status':
      return 'co-status';
    case 'freshness_gauge':
      return 'provider freshness gauge';
    case 'co_status+freshness_gauge':
      return 'co-status plus provider freshness gauge';
    default:
      return 'no live host evidence';
  }
}

function resolveEffectiveControlHostSupervisionState(
  persistedState: ControlHostSupervisionState | null,
  liveHost: ControlHostSupervisionLiveHealthStatus | null
): ControlHostSupervisionState | null {
  if (!persistedState || liveHost?.healthy !== true) {
    return persistedState;
  }
  const effectiveStatus =
    liveHost.reason === 'active_worker_restart_quarantine' ||
    liveHost.reason === 'active_worker_probe_timeout_quarantine'
      ? 'quarantined'
      : 'healthy';
  const effectiveLastHealthStatus = liveHost.reason ?? persistedState.last_health_status;
  const effectiveConsecutiveUnhealthySamples =
    effectiveStatus === 'healthy' ? 0 : persistedState.consecutive_unhealthy_samples;
  const effectiveMessage = liveHost.message ?? persistedState.message;
  if (
    persistedState.status === effectiveStatus &&
    persistedState.last_health_status === effectiveLastHealthStatus &&
    persistedState.consecutive_unhealthy_samples === effectiveConsecutiveUnhealthySamples &&
    persistedState.message === effectiveMessage
  ) {
    return persistedState;
  }
  return {
    ...persistedState,
    status: effectiveStatus,
    updated_at: liveHost.checked_at ?? persistedState.updated_at,
    last_health_check_at: liveHost.checked_at ?? persistedState.last_health_check_at,
    last_health_status: effectiveLastHealthStatus,
    consecutive_unhealthy_samples: effectiveConsecutiveUnhealthySamples,
    message: effectiveMessage
  };
}

function hasControlHostSupervisionStateDrift(
  persistedState: ControlHostSupervisionState | null,
  effectiveState: ControlHostSupervisionState | null
): boolean {
  if (!persistedState || !effectiveState) {
    return false;
  }
  return (
    persistedState.status !== effectiveState.status ||
    persistedState.updated_at !== effectiveState.updated_at ||
    persistedState.last_health_check_at !== effectiveState.last_health_check_at ||
    persistedState.last_health_status !== effectiveState.last_health_status ||
    persistedState.consecutive_unhealthy_samples !== effectiveState.consecutive_unhealthy_samples ||
    persistedState.message !== effectiveState.message
  );
}

function inspectControlHostSupervisionLaunchAgent(
  plistContents: string | null,
  config: ControlHostSupervisionConfig | null
): ControlHostSupervisionLaunchAgentStatus {
  if (plistContents === null) {
    return {
      exists: false,
      program_arguments: [],
      working_directory: null,
      detected_program: null,
      classification: 'missing'
    };
  }
  const programArguments = extractPlistStringArray(plistContents, 'ProgramArguments');
  const workingDirectory = extractPlistStringValue(plistContents, 'WorkingDirectory');
  const detectedProgram = programArguments[0] ?? null;
  return {
    exists: true,
    program_arguments: programArguments,
    working_directory: workingDirectory,
    detected_program: detectedProgram,
    classification: classifyControlHostSupervisionLaunchAgent(programArguments, config)
  };
}

function classifyControlHostSupervisionLaunchAgent(
  programArguments: string[],
  config: ControlHostSupervisionConfig | null
): ControlHostSupervisionLaunchAgentStatus['classification'] {
  const detectedProgram = programArguments[0] ?? null;
  if (detectedProgram === null) {
    return 'unknown';
  }
  if (detectedProgram.endsWith('/co-control-host-supervisor.sh')) {
    return 'legacy_shim';
  }
  if (
    config &&
    arraysEqual(
      programArguments,
      buildExpectedControlHostSupervisionProgramArguments(config)
    )
  ) {
    return 'managed_supervision';
  }
  return 'unknown';
}

function buildExpectedControlHostSupervisionProgramArguments(
  config: ControlHostSupervisionConfig
): string[] {
  return [
    config.nodePath,
    config.cliEntrypoint,
    'control-host',
    'supervise',
    'run',
    '--config',
    config.paths.configPath
  ];
}

function classifyControlHostSupervisionRollout(input: {
  config: ControlHostSupervisionConfig | null;
  launchAgent: ControlHostSupervisionLaunchAgentStatus;
  serviceLoaded: boolean;
  launchctlLoaded?: boolean;
}): ControlHostSupervisionRolloutStatus {
  if (
    input.config &&
    input.launchAgent.exists &&
    input.launchAgent.classification === 'managed_supervision'
  ) {
    if (input.serviceLoaded && input.launchctlLoaded === false) {
      return {
        mode: 'managed_supervision',
        migration_required: false,
        summary:
          'LaunchAgent matches the stored managed supervision config; launchctl metadata appears stale because live host evidence remains healthy.'
      };
    }
    if (!input.serviceLoaded) {
      return {
        mode: 'mixed',
        migration_required: true,
        summary:
          'Managed LaunchAgent plist exists, but launchctl does not report the managed service target as loaded.'
      };
    }
    return {
      mode: 'managed_supervision',
      migration_required: false,
      summary: 'LaunchAgent matches the stored managed supervision config.'
    };
  }
  if (input.launchAgent.classification === 'legacy_shim') {
    return {
      mode: input.config ? 'mixed' : 'legacy_shim',
      migration_required: true,
      summary: input.config
        ? 'Stored managed config exists, but the active LaunchAgent still targets the legacy shim.'
        : 'LaunchAgent still targets the legacy shim wrapper.'
    };
  }
  if (!input.config && !input.launchAgent.exists) {
    return {
      mode: 'not_installed',
      migration_required: false,
      summary: 'No managed config or LaunchAgent plist is installed.'
    };
  }
  if (input.config && !input.launchAgent.exists) {
    return {
      mode: 'mixed',
      migration_required: true,
      summary: 'Managed config exists, but the LaunchAgent plist is missing.'
    };
  }
  if (!input.config && input.launchAgent.exists) {
    return {
      mode: 'mixed',
      migration_required: true,
      summary:
        'LaunchAgent exists without a matching managed config; inspect the plist before rollout.'
    };
  }
  return {
    mode: 'mixed',
    migration_required: true,
    summary:
      'Managed config exists, but the LaunchAgent program arguments do not match the packaged supervision runner.'
  };
}

function emitOutput(format: OutputFormat, payload: unknown, text: string): void {
  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(text);
}

function readFormatFlag(flags: ArgMap): OutputFormat {
  const format = readStringFlag(flags, 'format');
  if (format === undefined || format === 'text') {
    return 'text';
  }
  if (format === 'json') {
    return 'json';
  }
  throw new Error('--format must be either "text" or "json".');
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (value === true) {
    throw new Error(`--${key} requires a value.`);
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`--${key} requires a value.`);
  }
  return trimmed;
}

function readIntegerFlag(flags: ArgMap, key: string): number | undefined {
  const value = readStringFlag(flags, key);
  if (!value) {
    return undefined;
  }
  if (!/^[+-]?\d+$/u.test(value)) {
    throw new Error(`--${key} must be an integer.`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`--${key} must be an integer.`);
  }
  return parsed;
}

async function runLaunchctl(
  args: string[],
  options?: { allowFailure?: boolean }
): Promise<CommandResult> {
  const result = await runCommand('launchctl', args);
  if (result.exitCode !== 0 && !options?.allowFailure) {
    const detail = result.stderr.trim() || result.stdout.trim() || 'launchctl failed.';
    throw new Error(`launchctl ${args.join(' ')} failed: ${detail}`);
  }
  return result;
}

function buildNextControlHostSupervisionState(input: {
  priorState: ControlHostSupervisionState;
  update: Partial<ControlHostSupervisionState> & { status: string; updated_at: string };
  config: ControlHostSupervisionConfig;
  serviceTarget: string;
}): ControlHostSupervisionState {
  const resetForRunning: Partial<ControlHostSupervisionState> =
    input.update.status === 'running'
      ? {
          last_exit_at: null,
          last_exit_code: null,
          last_signal: null,
          last_health_check_at: null,
          last_health_status: null,
          last_probe_duration_ms: null,
          consecutive_unhealthy_samples: 0
        }
      : {};
  return {
    ...input.priorState,
    ...resetForRunning,
    ...input.update,
    label: input.config.label,
    repo_root: input.config.repoRoot,
    service_target: input.serviceTarget,
    unhealthy_threshold: input.config.unhealthyThreshold,
    health_interval_seconds: input.config.healthIntervalSeconds
  };
}

function buildControlHostSupervisionRestartRecord(input: {
  requestedAt: string;
  reason: string;
  message: string;
  consecutiveUnhealthySamples: number;
  childPid: number | null;
  probeDurationMs?: number | null;
  diagnostic: ControlHostSupervisionHealthDiagnostic | null;
}): ControlHostSupervisionRestartRecord {
  return {
    requested_at: input.requestedAt,
    reason: input.reason,
    message: input.message,
    consecutive_unhealthy_samples: input.consecutiveUnhealthySamples,
    child_pid: input.childPid,
    probe_duration_ms: normalizeProbeDurationMs(input.probeDurationMs),
    diagnostic: input.diagnostic
  };
}

function normalizeProbeDurationMs(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.round(value));
}

function appendControlHostSupervisionRestartRecord(
  history: ControlHostSupervisionRestartRecord[] | null | undefined,
  record: ControlHostSupervisionRestartRecord
): ControlHostSupervisionRestartRecord[] {
  return [...(history ?? []), record].slice(-CONTROL_HOST_SUPERVISION_RESTART_HISTORY_LIMIT);
}

function isControlHostSupervisionQuarantineProbe(probe: { reason: string }): boolean {
  return (
    probe.reason === 'active_worker_restart_quarantine' ||
    probe.reason === 'active_worker_probe_timeout_quarantine'
  );
}

function resolveControlHostSupervisionQuarantineUnhealthySamples(input: {
  currentConsecutiveUnhealthySamples: number;
  priorState: ControlHostSupervisionState;
  config: ControlHostSupervisionConfig;
}): number {
  const latestRestartRecord =
    input.priorState.restart_history && input.priorState.restart_history.length > 0
      ? input.priorState.restart_history[input.priorState.restart_history.length - 1]
      : null;
  const candidates = [
    input.currentConsecutiveUnhealthySamples,
    input.priorState.consecutive_unhealthy_samples,
    latestRestartRecord?.consecutive_unhealthy_samples ?? 0
  ].filter((value) => Number.isFinite(value) && value > 0);
  const priorMaximum = candidates.length > 0 ? Math.max(...candidates) : 0;
  if (priorMaximum > 0) {
    return priorMaximum;
  }
  return Math.max(1, input.config.unhealthyThreshold);
}

async function bootoutLaunchctlServiceTarget(serviceTarget: string): Promise<void> {
  const result = await runLaunchctl(['bootout', serviceTarget], { allowFailure: true });
  if (result.exitCode === 0 || isIgnorableLaunchctlBootoutFailure(result)) {
    return;
  }
  const detail = result.stderr.trim() || result.stdout.trim() || 'launchctl bootout failed.';
  throw new Error(`launchctl bootout ${serviceTarget} failed: ${detail}`);
}

async function rollbackFailedControlHostSupervisionInstall(
  paths: ControlHostSupervisionPaths,
  serviceTarget: string,
  options?: {
    bootout?: (serviceTarget: string) => Promise<void>;
    remove?: typeof rm;
  }
): Promise<void> {
  const bootout = options?.bootout ?? bootoutLaunchctlServiceTarget;
  const remove = options?.remove ?? rm;
  await bootout(serviceTarget);
  await remove(paths.plistPath, { force: true });
  await remove(paths.supportDir, { recursive: true, force: true });
  await remove(paths.logsDir, { recursive: true, force: true });
}

async function bootstrapLaunchctlPlist(
  plistPath: string,
  options?: {
    bootstrap?: (args: string[]) => Promise<void>;
    retryAttempts?: number;
    retryDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
  }
): Promise<void> {
  const bootstrap =
    options?.bootstrap ??
    (async (args: string[]) => {
      await runLaunchctl(args);
    });
  const retryAttempts =
    options?.retryAttempts ?? CONTROL_HOST_SUPERVISION_LAUNCHCTL_BOOTSTRAP_RETRY_ATTEMPTS;
  const retryDelayMs =
    options?.retryDelayMs ?? CONTROL_HOST_SUPERVISION_LAUNCHCTL_BOOTSTRAP_RETRY_DELAY_MS;
  const sleep =
    options?.sleep ??
    (async (ms: number) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });
    });

  let attemptsRemaining = retryAttempts;
  for (;;) {
    try {
      await bootstrap(['bootstrap', resolveLaunchdDomain(), plistPath]);
      return;
    } catch (error) {
      attemptsRemaining -= 1;
      if (attemptsRemaining <= 0 || !isRetryableLaunchctlBootstrapError(error)) {
        throw error;
      }
      await sleep(retryDelayMs);
    }
  }
}

async function captureExistingControlHostSupervisionInstall(
  paths: ControlHostSupervisionPaths
): Promise<ExistingControlHostSupervisionInstallSnapshot | null> {
  const [configContents, stateContents, plistContents] = await Promise.all([
    readTextFileIfExists(paths.configPath),
    readTextFileIfExists(paths.statePath),
    readTextFileIfExists(paths.plistPath)
  ]);
  if (configContents === null && stateContents === null && plistContents === null) {
    return null;
  }
  return {
    paths,
    configContents,
    stateContents,
    plistContents
  };
}

async function restoreExistingControlHostSupervisionInstall(
  snapshot: ExistingControlHostSupervisionInstallSnapshot,
  serviceTarget: string,
  options?: {
    bootout?: (serviceTarget: string) => Promise<void>;
    bootstrap?: (args: string[]) => Promise<void>;
    remove?: typeof rm;
    write?: typeof writeFile;
  }
): Promise<void> {
  const bootout = options?.bootout ?? bootoutLaunchctlServiceTarget;
  const remove = options?.remove ?? rm;
  const write = options?.write ?? writeFile;

  await bootout(serviceTarget);
  await mkdir(snapshot.paths.supportDir, { recursive: true });
  await mkdir(dirname(snapshot.paths.plistPath), { recursive: true });
  await restoreTextFile(snapshot.paths.configPath, snapshot.configContents, {
    write,
    remove
  });
  await restoreTextFile(snapshot.paths.statePath, snapshot.stateContents, {
    write,
    remove
  });
  await restoreTextFile(snapshot.paths.plistPath, snapshot.plistContents, {
    write,
    remove
  });
  if (snapshot.plistContents !== null) {
    await bootstrapLaunchctlPlist(snapshot.paths.plistPath, {
      bootstrap: options?.bootstrap
    });
  }
}

async function removeInstalledControlHostSupervisionArtifacts(
  resolved: Pick<ResolvedSupervisionInstall, 'label' | 'paths'>,
  options?: {
    bootout?: (serviceTarget: string) => Promise<void>;
    remove?: typeof rm;
  }
): Promise<ControlHostSupervisionPaths> {
  await rollbackFailedControlHostSupervisionInstall(
    resolved.paths,
    resolveControlHostSupervisionServiceTarget(resolved.label),
    options
  );
  return resolved.paths;
}

function createControlHostSupervisionChildEventPromises(
  child: Pick<NodeJS.EventEmitter, 'once'>
): {
  childExitPromise: Promise<ControlHostSupervisionChildExitEvent>;
  childErrorPromise: Promise<ControlHostSupervisionChildErrorEvent>;
} {
  return {
    childExitPromise: new Promise((resolve) => {
      child.once('exit', (code: number | null, signal: NodeJS.Signals | null) => {
        resolve({
          type: 'child_exit',
          code: typeof code === 'number' ? code : null,
          signal: typeof signal === 'string' ? signal : null
        });
      });
    }),
    childErrorPromise: new Promise((resolve) => {
      child.once('error', (error: Error) => {
        resolve({
          type: 'child_error',
          error
        });
      });
    })
  };
}

function isIgnorableLaunchctlBootoutFailure(result: CommandResult): boolean {
  const detail = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return /could not find service|service.*not found|no such process|not loaded/u.test(detail);
}

function isRetryableLaunchctlBootstrapError(error: unknown): boolean {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error);
  return /bootstrap failed:\s*5:\s*input\/output error/ui.test(detail);
}

function resolveControlHostSupervisionServiceTarget(label: string): string {
  return `${resolveLaunchdDomain()}/${label}`;
}

function resolveLaunchdDomain(): string {
  const uid = process.getuid?.();
  if (!Number.isInteger(uid)) {
    throw new Error('control-host supervision currently requires a POSIX user id.');
  }
  return `gui/${uid}`;
}

async function terminateChildProcess(
  child: ReturnType<typeof spawn>,
  killTimeoutSeconds: number,
  options?: {
    listProcessGroupPids?: (rootPid: number) => Promise<number[]>;
    killProcessGroup?: (pid: number, signal: NodeJS.Signals) => void;
    listDescendantPids?: (rootPid: number) => Promise<number[]>;
  }
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const rootPid = normalizeTrackedPid(child.pid);
  const exitPromise = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    child.once('exit', () => resolve());
  });
  child.kill('SIGTERM');
  const processGroupExitController = new AbortController();
  const processGroupExitPromise =
    rootPid === null
      ? Promise.resolve()
      : waitForProcessGroupToExit(
          rootPid,
          options?.listProcessGroupPids,
          processGroupExitController.signal
        );
  const killWaiter = createSleepWaiter(killTimeoutSeconds * 1_000);
  const timedOut = await Promise.race([
    Promise.all([exitPromise, processGroupExitPromise]).then(() => false),
    killWaiter.promise.then(() => true)
  ]).finally(() => {
    killWaiter.dispose();
  });
  if (!timedOut) {
    return;
  }
  processGroupExitController.abort();
  if (rootPid !== null) {
    killTrackedProcessGroup(rootPid, 'SIGKILL', options?.killProcessGroup);
  }
  if (child.exitCode === null && child.signalCode === null) {
    if (rootPid !== null) {
      await (
        options?.listDescendantPids ?? listDescendantProcessIds
      )(rootPid).catch(() => []);
    }
    // Generic timeout cleanup is process-group-scoped. Detached provider-worker
    // issue runs can remain descendants until reparenting and must stay
    // diagnostic-only here instead of becoming additional kill targets.
    child.kill('SIGKILL');
    await exitPromise.catch(() => undefined);
  }
}

function normalizeTrackedPid(pid: number | undefined): number | null {
  return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? pid : null;
}

async function waitForProcessGroupToExit(
  rootPid: number,
  listProcessGroupPids: (rootPid: number) => Promise<number[]> = listProcessGroupProcessIds,
  signal?: AbortSignal
): Promise<void> {
  for (;;) {
    if (signal?.aborted) {
      return;
    }
    const processGroupPids = await listProcessGroupPids(rootPid).catch(() => null);
    if (processGroupPids !== null && processGroupPids.length === 0) {
      return;
    }
    await waitForAbortableSleep(25, signal);
  }
}

async function waitForAbortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return;
  }
  const waiter = createSleepWaiter(ms);
  let abortListener: (() => void) | null = null;
  try {
    await Promise.race([
      waiter.promise,
      new Promise<void>((resolve) => {
        if (signal === undefined) {
          return;
        }
        if (signal.aborted) {
          waiter.dispose();
          resolve();
          return;
        }
        abortListener = () => {
          waiter.dispose();
          resolve();
        };
        signal.addEventListener('abort', abortListener, { once: true });
      })
    ]);
  } finally {
    if (signal !== undefined && abortListener !== null) {
      signal.removeEventListener('abort', abortListener);
    }
    waiter.dispose();
  }
}

async function listDescendantProcessIds(rootPid: number): Promise<number[]> {
  const snapshot = await runCommand('ps', ['-ax', '-o', 'pid=,ppid=']);
  if (snapshot.exitCode !== 0) {
    throw new Error(snapshot.stderr || `ps exited with code ${snapshot.exitCode}`);
  }
  const childrenByParent = new Map<number, number[]>();
  for (const line of snapshot.stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const [pidToken, parentPidToken] = trimmed.split(/\s+/u, 2);
    const pid = Number.parseInt(pidToken ?? '', 10);
    const parentPid = Number.parseInt(parentPidToken ?? '', 10);
    if (!Number.isInteger(pid) || !Number.isInteger(parentPid)) {
      continue;
    }
    const children = childrenByParent.get(parentPid) ?? [];
    children.push(pid);
    childrenByParent.set(parentPid, children);
  }
  const descendants: number[] = [];
  const visit = (parentPid: number) => {
    for (const childPid of childrenByParent.get(parentPid) ?? []) {
      visit(childPid);
      descendants.push(childPid);
    }
  };
  visit(rootPid);
  return descendants;
}

async function listProcessGroupProcessIds(rootPid: number): Promise<number[]> {
  const snapshot = await runCommand('ps', ['-ax', '-o', 'pid=,pgid=']);
  if (snapshot.exitCode !== 0) {
    throw new Error(snapshot.stderr || `ps exited with code ${snapshot.exitCode}`);
  }
  const processGroupPids: number[] = [];
  for (const line of snapshot.stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const [pidToken, processGroupToken] = trimmed.split(/\s+/u, 2);
    const pid = Number.parseInt(pidToken ?? '', 10);
    const processGroupId = Number.parseInt(processGroupToken ?? '', 10);
    if (!Number.isInteger(pid) || !Number.isInteger(processGroupId)) {
      continue;
    }
    if (processGroupId === rootPid) {
      processGroupPids.push(pid);
    }
  }
  return processGroupPids;
}

function killTrackedProcessGroup(
  pid: number,
  signal: NodeJS.Signals,
  killProcessGroup: (pid: number, signal: NodeJS.Signals) => void = (groupPid, nextSignal) =>
    process.kill(-groupPid, nextSignal)
): void {
  try {
    killProcessGroup(pid, signal);
  } catch (error) {
    if (!isMissingProcessError(error)) {
      throw error;
    }
  }
}

async function waitForProcessGroupToExitWithinTimeout(
  rootPid: number,
  timeoutMs: number,
  options?: {
    listProcessGroupPids?: (rootPid: number) => Promise<number[]>;
  }
): Promise<boolean> {
  const exitController = new AbortController();
  const killWaiter = createSleepWaiter(timeoutMs);
  const completed = await Promise.race([
    waitForProcessGroupToExit(
      rootPid,
      options?.listProcessGroupPids,
      exitController.signal
    ).then(() => true),
    killWaiter.promise.then(() => false)
  ]).finally(() => {
    exitController.abort();
    killWaiter.dispose();
  });
  return completed;
}

async function ensureTrackedProcessTreeExited(
  rootPid: number,
  killTimeoutSeconds: number,
  options?: {
    listProcessGroupPids?: (rootPid: number) => Promise<number[]>;
    killProcessGroup?: (pid: number, signal: NodeJS.Signals) => void;
    listDescendantPids?: (rootPid: number) => Promise<number[]>;
    shouldForceKillTrackedProcessGroup?: (rootPid: number) => Promise<boolean>;
  }
): Promise<ControlHostSupervisionRestartCleanupResult> {
  const timeoutMs = Math.max(0, killTimeoutSeconds * 1_000);
  const exitedAfterKickstart = await waitForProcessGroupToExitWithinTimeout(rootPid, timeoutMs, {
    listProcessGroupPids: options?.listProcessGroupPids
  });
  if (exitedAfterKickstart) {
    return {
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    };
  }

  const shouldForceKill = await (
    options?.shouldForceKillTrackedProcessGroup ??
    (async () => true)
  )(rootPid);
  if (!shouldForceKill) {
    const remainingProcessGroupPids = await (
      options?.listProcessGroupPids ?? listProcessGroupProcessIds
    )(rootPid);
    if (remainingProcessGroupPids.length > 0) {
      throw new Error(
        `Previous supervised control-host child pid ${rootPid} is still alive, but force cleanup was skipped because identity verification failed.`
      );
    }
    return {
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    };
  }

  const initialOrphanedProcessGroupPids = await (
    options?.listProcessGroupPids ?? listProcessGroupProcessIds
  )(rootPid);
  if (initialOrphanedProcessGroupPids.length === 0) {
    return {
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    };
  }
  const shouldStillForceKill = await (
    options?.shouldForceKillTrackedProcessGroup ??
    (async () => true)
  )(rootPid);
  if (!shouldStillForceKill) {
    const remainingProcessGroupPids = await (
      options?.listProcessGroupPids ?? listProcessGroupProcessIds
    )(rootPid);
    if (remainingProcessGroupPids.length > 0) {
      throw new Error(
        `Previous supervised control-host child pid ${rootPid} is still alive, but force cleanup was skipped because identity verification failed.`
      );
    }
    return {
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    };
  }
  const orphanedProcessGroupPids = await (
    options?.listProcessGroupPids ?? listProcessGroupProcessIds
  )(rootPid);
  if (orphanedProcessGroupPids.length === 0) {
    return {
      result: 'exited_after_kickstart',
      orphanedProcessGroupPids: [],
      orphanedDescendantPids: []
    };
  }
  const orphanedDescendantPids = await (
    options?.listDescendantPids ?? listDescendantProcessIds
  )(rootPid).catch(() => []);

  // Force cleanup is scoped to the stale supervised control-host process group.
  // Detached provider-worker issue runs can still appear as descendants and must
  // be preserved; we record them for diagnostics instead of killing them.
  killTrackedProcessGroup(rootPid, 'SIGKILL', options?.killProcessGroup);

  const exitedAfterForceKill = await waitForProcessGroupToExitWithinTimeout(rootPid, timeoutMs, {
    listProcessGroupPids: options?.listProcessGroupPids
  });
  if (!exitedAfterForceKill) {
    throw new Error(
      `Previous supervised control-host child pid ${rootPid} remained alive after forced cleanup.`
    );
  }

  return {
    result: 'force_killed',
    orphanedProcessGroupPids,
    orphanedDescendantPids
  };
}

async function readProcessCommand(pid: number): Promise<string | null> {
  const snapshot = await runCommand('ps', ['-p', String(pid), '-o', 'args=']);
  if (snapshot.exitCode !== 0) {
    if (snapshot.stdout.trim().length === 0) {
      return null;
    }
    throw new Error(snapshot.stderr || `ps exited with code ${snapshot.exitCode}`);
  }
  const command = snapshot.stdout.trim();
  return command.length > 0 ? command : null;
}

function parseShellStyleArguments(command: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  const flushCurrent = (): void => {
    if (current.length === 0) {
      return;
    }
    args.push(current);
    current = '';
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (quote === "'") {
      if (character === "'") {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }
    if (quote === '"') {
      if (character === '"') {
        quote = null;
        continue;
      }
      if (character === '\\') {
        const nextCharacter = command[index + 1];
        if (nextCharacter && ['\\', '"', '$', '`'].includes(nextCharacter)) {
          current += nextCharacter;
          index += 1;
          continue;
        }
      }
      current += character;
      continue;
    }
    if (/\s/.test(character)) {
      flushCurrent();
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    current += character;
  }

  if (escaped) {
    current += '\\';
  }
  flushCurrent();
  return args;
}

function readFlagValueFromArgs(args: string[], flag: string): string | null {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument) {
      continue;
    }
    if (argument === flag) {
      return args[index + 1] ?? null;
    }
    if (argument.startsWith(`${flag}=`)) {
      return argument.slice(flag.length + 1);
    }
  }
  return null;
}

function matchesExpectedSupervisedControlHostCommand(
  command: string,
  config: ControlHostSupervisionConfig
): boolean {
  const args = parseShellStyleArguments(command);
  return (
    command.includes(config.cliEntrypoint) &&
    args.includes('control-host') &&
    readFlagValueFromArgs(args, '--task') === config.taskId &&
    readFlagValueFromArgs(args, '--run') === config.runId &&
    readFlagValueFromArgs(args, '--pipeline') === config.pipelineId
  );
}

async function isTrackedSupervisedProcessRoot(
  pid: number,
  config: ControlHostSupervisionConfig,
  options?: {
    readProcessCommand?: (pid: number) => Promise<string | null>;
  }
): Promise<boolean> {
  const command = await (options?.readProcessCommand ?? readProcessCommand)(pid);
  return command !== null && matchesExpectedSupervisedControlHostCommand(command, config);
}

async function isTrackedSupervisedProcessGroup(
  rootPid: number,
  config: ControlHostSupervisionConfig,
  options?: {
    readProcessCommand?: (pid: number) => Promise<string | null>;
    listProcessGroupPids?: (rootPid: number) => Promise<number[]>;
  }
): Promise<boolean> {
  const readTrackedProcessCommand = options?.readProcessCommand ?? readProcessCommand;
  if (
    await isTrackedSupervisedProcessRoot(rootPid, config, {
      readProcessCommand: readTrackedProcessCommand
    })
  ) {
    return true;
  }

  const processGroupPids = await (
    options?.listProcessGroupPids ?? listProcessGroupProcessIds
  )(rootPid).catch(() => []);
  for (const pid of processGroupPids) {
    if (pid === rootPid) {
      continue;
    }
    const command = await readTrackedProcessCommand(pid);
    if (command !== null && matchesExpectedSupervisedControlHostCommand(command, config)) {
      return true;
    }
  }
  return false;
}

function parseIsoTimestampToMs(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resolveReportedSupervisedChildPid(
  nextState: ControlHostSupervisionState | null,
  previousState: ControlHostSupervisionState | null,
  config: ControlHostSupervisionConfig,
  options?: {
    readProcessCommand?: (pid: number) => Promise<string | null>;
    fallbackChildPid?: number | null;
    previousTrackedChildPid?: number | null;
  }
): Promise<number | null> {
  const nextChildPid = normalizeTrackedPid(nextState?.child_pid ?? undefined);
  if (nextChildPid !== null) {
    const nextUpdatedAtMs = parseIsoTimestampToMs(nextState?.updated_at);
    const previousUpdatedAtMs = parseIsoTimestampToMs(previousState?.updated_at);
    if (
      nextUpdatedAtMs === null ||
      (previousUpdatedAtMs !== null && nextUpdatedAtMs <= previousUpdatedAtMs)
    ) {
      return null;
    }
    return (await isTrackedSupervisedProcessRoot(nextChildPid, config, options))
      ? nextChildPid
      : null;
  }
  const fallbackChildPid = normalizeTrackedPid(options?.fallbackChildPid ?? undefined);
  if (
    fallbackChildPid === null ||
    fallbackChildPid === normalizeTrackedPid(options?.previousTrackedChildPid ?? undefined)
  ) {
    return null;
  }
  return (await isTrackedSupervisedProcessRoot(fallbackChildPid, config, options))
    ? fallbackChildPid
    : null;
}

function extractLaunchctlServicePid(output: string): number | null {
  const pidMatch = /^\s*pid = (\d+)\s*$/mu.exec(output);
  return normalizeTrackedPid(pidMatch ? Number.parseInt(pidMatch[1] ?? '', 10) : undefined);
}

async function readTrackedChildSnapshotForRestart(
  statePath: string,
  serviceTarget: string,
  options?: {
    readState?: (path: string) => Promise<ControlHostSupervisionState | null>;
    readLaunchctlPrint?: (serviceTarget: string) => Promise<CommandResult>;
  }
): Promise<{ state: ControlHostSupervisionState | null; trackedChildPid: number | null }> {
  try {
    const state = await (
      options?.readState ??
      (async (path: string) => await readJsonFileIfExists<ControlHostSupervisionState>(path))
    )(statePath);
    return {
      state,
      trackedChildPid: normalizeTrackedPid(state?.child_pid ?? undefined)
    };
  } catch {
    const launchctl = await (
      options?.readLaunchctlPrint ??
      (async (nextServiceTarget: string) => await runLaunchctl(['print', nextServiceTarget], { allowFailure: true }))
    )(serviceTarget);
    return {
      state: null,
      trackedChildPid: launchctl.exitCode === 0 ? extractLaunchctlServicePid(launchctl.stdout) : null
    };
  }
}

async function restartExistingControlHostSupervision(
  resolved: ResolvedSupervisionInstall & { config: ControlHostSupervisionConfig },
  serviceTarget: string,
  options?: {
    kickstart?: (serviceTarget: string) => Promise<void>;
    readState?: (path: string) => Promise<ControlHostSupervisionState | null>;
    readLaunchctlPrint?: (serviceTarget: string) => Promise<CommandResult>;
    ensureTrackedProcessTreeExited?: (
      rootPid: number,
      killTimeoutSeconds: number,
      options?: Pick<
        NonNullable<Parameters<typeof ensureTrackedProcessTreeExited>[2]>,
        'shouldForceKillTrackedProcessGroup'
      >
    ) => Promise<ControlHostSupervisionRestartCleanupResult>;
    shouldForceKillTrackedProcessGroup?: (rootPid: number) => Promise<boolean>;
    readProcessCommand?: (pid: number) => Promise<string | null>;
  }
): Promise<{
  previousChildPid: number | null;
  childPid: number | null;
  cleanup: ControlHostSupervisionRestartCleanupResult;
}> {
  const previousSnapshot = await readTrackedChildSnapshotForRestart(
    resolved.paths.statePath,
    serviceTarget,
    {
      readState: options?.readState,
      readLaunchctlPrint: options?.readLaunchctlPrint
    }
  );
  const previousChildPid = previousSnapshot.trackedChildPid;

  await (
    options?.kickstart ??
    (async (nextServiceTarget: string) => {
      await runLaunchctl(['kickstart', '-k', nextServiceTarget]);
    })
  )(serviceTarget);

  const cleanup =
    previousChildPid === null
      ? ({
          result: 'no_prior_child',
          orphanedProcessGroupPids: [],
          orphanedDescendantPids: []
        } satisfies ControlHostSupervisionRestartCleanupResult)
      : await (
          options?.ensureTrackedProcessTreeExited ?? ensureTrackedProcessTreeExited
        )(previousChildPid, resolved.config.killTimeoutSeconds, {
          shouldForceKillTrackedProcessGroup:
            options?.shouldForceKillTrackedProcessGroup ??
            (async (rootPid: number) =>
              await isTrackedSupervisedProcessGroup(rootPid, resolved.config, {
                readProcessCommand: options?.readProcessCommand
              }))
        });

  const nextSnapshot = await readTrackedChildSnapshotForRestart(
    resolved.paths.statePath,
    serviceTarget,
    {
      readState: options?.readState,
      readLaunchctlPrint: options?.readLaunchctlPrint
    }
  );
  return {
    previousChildPid,
    childPid: await resolveReportedSupervisedChildPid(
      nextSnapshot.state,
      previousSnapshot.state,
      resolved.config,
      {
        readProcessCommand: options?.readProcessCommand,
        fallbackChildPid: nextSnapshot.trackedChildPid,
        previousTrackedChildPid: previousSnapshot.trackedChildPid
      }
    ),
    cleanup
  };
}

function isMissingProcessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ESRCH'
  );
}

async function writeRuntimeStateWithCleanup<T>(
  child: ReturnType<typeof spawn>,
  killTimeoutSeconds: number,
  persist: () => Promise<T>
): Promise<T> {
  try {
    return await persist();
  } catch (error) {
    await terminateChildProcess(child, killTimeoutSeconds).catch((cleanupError) => {
      console.error(
        `Failed to stop control-host after supervision state write failure: ${
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        }`
      );
    });
    throw error;
  }
}

function createStopSignalWaiter(): {
  promise: Promise<{ type: 'stop'; signal: NodeJS.Signals }>;
  dispose: () => void;
} {
  let dispose: (() => void) | null = null;
  const promise = new Promise<{ type: 'stop'; signal: NodeJS.Signals }>((resolve) => {
    const handle = (signal: NodeJS.Signals) => {
      dispose?.();
      resolve({ type: 'stop', signal });
    };
    const onSigint = () => handle('SIGINT');
    const onSigterm = () => handle('SIGTERM');
    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);
    dispose = () => {
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
    };
  });
  return {
    promise,
    dispose: () => dispose?.()
  };
}

async function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  }
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      ...(typeof options?.timeoutMs === 'number' ? { timeout: options.timeoutMs } : {}),
      maxBuffer: COMMAND_BUFFER_MAX_BYTES
    });
    return {
      exitCode: 0,
      stdout: String(stdout),
      stderr: String(stderr)
    };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      code?: string | number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      killed?: boolean;
      signal?: string | null;
    };
    const exitCode =
      typeof execError.code === 'number' ? execError.code : execError.code === 'ENOENT' ? 127 : 1;
    const timedOut =
      typeof options?.timeoutMs === 'number' &&
      execError.killed === true &&
      execError.signal === 'SIGTERM';
    return {
      exitCode,
      stdout: bufferLikeToString(execError.stdout),
      stderr:
        bufferLikeToString(execError.stderr) ||
        (timedOut ? `command timed out after ${options.timeoutMs}ms` : execError.message),
      timedOut
    };
  }
}

async function runCommandBuffer(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  }
): Promise<CommandBufferResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      encoding: 'buffer',
      ...(typeof options?.timeoutMs === 'number' ? { timeout: options.timeoutMs } : {}),
      maxBuffer: COMMAND_BUFFER_MAX_BYTES
    });
    return {
      exitCode: 0,
      stdout: bufferLikeToBuffer(stdout),
      stderr: bufferLikeToBuffer(stderr)
    };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      code?: string | number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      killed?: boolean;
      signal?: string | null;
    };
    const exitCode =
      typeof execError.code === 'number' ? execError.code : execError.code === 'ENOENT' ? 127 : 1;
    const timedOut =
      typeof options?.timeoutMs === 'number' &&
      execError.killed === true &&
      execError.signal === 'SIGTERM';
    return {
      exitCode,
      stdout: bufferLikeToBuffer(execError.stdout),
      stderr: bufferLikeToBuffer(
        execError.stderr ?? (timedOut ? `command timed out after ${options.timeoutMs}ms` : execError.message)
      ),
      timedOut
    };
  }
}

function parseNulDelimitedEnv(raw: Buffer): NodeJS.ProcessEnv {
  const nextEnv: NodeJS.ProcessEnv = {};
  for (const entry of raw.toString('utf8').split('\u0000')) {
    if (!entry) {
      continue;
    }
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = entry.slice(0, separatorIndex);
    const value = entry.slice(separatorIndex + 1);
    nextEnv[key] = value;
  }
  return nextEnv;
}

function firstNonEmptyLine(value: string): string | null {
  for (const line of value.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return null;
}

function extractPlistStringArray(plistContents: string, key: string): string[] {
  const block = new RegExp(
    `<key>${escapeRegExp(key)}</key>\\s*<array>([\\s\\S]*?)</array>`,
    'u'
  ).exec(plistContents)?.[1];
  if (!block) {
    return [];
  }
  return [...block.matchAll(/<string>([\s\S]*?)<\/string>/gu)].map((match) =>
    decodePlistString(match[1] ?? '')
  );
}

function extractPlistStringValue(plistContents: string, key: string): string | null {
  const value = new RegExp(
    `<key>${escapeRegExp(key)}</key>\\s*<string>([\\s\\S]*?)</string>`,
    'u'
  ).exec(plistContents)?.[1];
  return typeof value === 'string' ? decodePlistString(value) : null;
}

function decodePlistString(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (const [index, value] of left.entries()) {
    if (value !== right[index]) {
      return false;
    }
  }
  return true;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function assertPathExists(
  path: string,
  label: string,
  exists: (path: string) => Promise<boolean> = pathExists
): Promise<void> {
  if (!(await exists(path))) {
    throw new Error(`${label} not found: ${path}`);
  }
}

async function assertExecutablePath(
  path: string,
  label: string,
  exists: (path: string) => Promise<boolean> = pathExists,
  isExecutable: (path: string) => Promise<boolean> = pathIsExecutable,
  isFile: (path: string) => Promise<boolean> = pathIsFile
): Promise<void> {
  await assertFilePath(path, label, exists, isFile);
  if (!(await isExecutable(path))) {
    throw new Error(`${label} is not executable: ${path}`);
  }
}

async function assertFilePath(
  path: string,
  label: string,
  exists: (path: string) => Promise<boolean> = pathExists,
  isFile: (path: string) => Promise<boolean> = pathIsFile
): Promise<void> {
  await assertPathExists(path, label, exists);
  if (!(await isFile(path))) {
    throw new Error(`${label} is not a regular file: ${path}`);
  }
}

async function assertDirectoryPath(
  path: string,
  label: string,
  exists: (path: string) => Promise<boolean> = pathExists,
  isDirectory: (path: string) => Promise<boolean> = pathIsDirectory
): Promise<void> {
  await assertPathExists(path, label, exists);
  if (!(await isDirectory(path))) {
    throw new Error(`${label} is not a directory: ${path}`);
  }
}

async function assertControlHostSupervisionInstallPaths(
  config: ControlHostSupervisionConfig,
  exists: (path: string) => Promise<boolean> = pathExists,
  isExecutable: (path: string) => Promise<boolean> = pathIsExecutable,
  isDirectory: (path: string) => Promise<boolean> = pathIsDirectory,
  isFile: (path: string) => Promise<boolean> = pathIsFile
): Promise<void> {
  await assertDirectoryPath(config.repoRoot, 'Control-host supervision repo root', exists, isDirectory);
  await assertExecutablePath(config.nodePath, 'Node executable', exists, isExecutable, isFile);
  await assertFilePath(
    config.cliEntrypoint,
    'Control-host supervision entrypoint',
    exists,
    isFile
  );
  await assertExecutablePath(config.shellPath, 'Shell executable', exists, isExecutable, isFile);
}

function assertStoredControlHostSupervisionConfig(
  configPath: string,
  config: unknown
): asserts config is ControlHostSupervisionConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error(`Invalid control-host supervision config at ${configPath}: expected an object.`);
  }
  const record = config as Record<string, unknown>;
  for (const key of REQUIRED_CONTROL_HOST_SUPERVISION_STRING_FIELDS) {
    if (!isNonEmptyString(record[key])) {
      throw new Error(
        `Invalid control-host supervision config at ${configPath}: missing ${key}.`
      );
    }
  }
  for (const key of REQUIRED_CONTROL_HOST_SUPERVISION_INTEGER_FIELDS) {
    if (!Number.isInteger(record[key])) {
      throw new Error(
        `Invalid control-host supervision config at ${configPath}: invalid ${key}.`
      );
    }
  }
  assertStoredTimerField(configPath, record.healthIntervalSeconds, 'healthIntervalSeconds');
  assertStoredTimerField(configPath, record.killTimeoutSeconds, 'killTimeoutSeconds');
  assertStoredPositiveIntegerField(configPath, record.unhealthyThreshold, 'unhealthyThreshold');
  if (!Array.isArray(record.envFiles) || record.envFiles.some((entry) => !isNonEmptyString(entry))) {
    throw new Error(`Invalid control-host supervision config at ${configPath}: invalid envFiles.`);
  }
  if (typeof record.paths !== 'object' || record.paths === null) {
    throw new Error(`Invalid control-host supervision config at ${configPath}: missing paths.`);
  }
  const paths = record.paths as Record<string, unknown>;
  for (const key of REQUIRED_CONTROL_HOST_SUPERVISION_PATH_FIELDS) {
    if (!isNonEmptyString(paths[key])) {
      throw new Error(
        `Invalid control-host supervision config at ${configPath}: missing paths.${key}.`
      );
    }
  }
  const expectedPaths = resolveControlHostSupervisionPaths({
    homeDir: record.homeDir as string,
    label: record.label as string
  });
  const resolvedConfigPath = resolve(configPath);
  if (resolvedConfigPath !== expectedPaths.configPath) {
    throw new Error(
      `Invalid control-host supervision config at ${configPath}: config path must match the managed path ${expectedPaths.configPath}.`
    );
  }
  for (const key of REQUIRED_CONTROL_HOST_SUPERVISION_PATH_FIELDS) {
    if (paths[key] !== expectedPaths[key]) {
      throw new Error(
        `Invalid control-host supervision config at ${configPath}: paths.${key} must match the managed path ${expectedPaths[key]}.`
      );
    }
  }
}

function assertStoredTimerField(
  configPath: string,
  value: unknown,
  key: 'healthIntervalSeconds' | 'killTimeoutSeconds'
): void {
  const timerSeconds = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isInteger(timerSeconds) || timerSeconds <= 0) {
    throw new Error(`Invalid control-host supervision config at ${configPath}: invalid ${key}.`);
  }
  if (timerSeconds > CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS) {
    throw new Error(
      `Invalid control-host supervision config at ${configPath}: ${key} must be <= ${CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS}.`
    );
  }
}

function assertStoredPositiveIntegerField(
  configPath: string,
  value: unknown,
  key: 'unhealthyThreshold'
): void {
  const integerValue = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isInteger(integerValue) || integerValue <= 0) {
    throw new Error(`Invalid control-host supervision config at ${configPath}: invalid ${key}.`);
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function pathIsExecutable(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function pathIsDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function pathIsFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function readJsonFileIfExists<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readTextFileIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function restoreTextFile(
  path: string,
  contents: string | null,
  options?: {
    write?: typeof writeFile;
    remove?: typeof rm;
  }
): Promise<void> {
  const write = options?.write ?? writeFile;
  const remove = options?.remove ?? rm;
  if (contents === null) {
    await remove(path, { force: true });
    return;
  }
  await write(path, contents, 'utf8');
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function bufferLikeToString(value: string | Buffer | undefined): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }
  return '';
}

function bufferLikeToBuffer(value: string | Buffer | undefined): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return Buffer.from(value, 'utf8');
  }
  return Buffer.alloc(0);
}

function escapeShellSingleQuotes(value: string): string {
  return value.replaceAll("'", "'\\''");
}

function resolveControlHostSupervisionProbeTimeoutMs(healthIntervalSeconds: number): number {
  const minimumStatusReadBudgetMs =
    DEFAULT_ATTACH_REQUEST_TIMEOUT_MS * CONTROL_HOST_SUPERVISION_PROBE_ENDPOINT_READ_ATTEMPTS +
    CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_HEADROOM_MS;
  return Math.max(
    CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_FLOOR_MS,
    Math.min(
      Math.max(healthIntervalSeconds * 1_000, minimumStatusReadBudgetMs),
      CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_CAP_MS
    )
  );
}

function createSleepWaiter(ms: number): {
  promise: Promise<{ type: 'tick' }>;
  dispose: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const promise = new Promise<{ type: 'tick' }>((resolve) => {
    timer = setTimeout(() => {
      timer = null;
      resolve({ type: 'tick' });
    }, ms);
  });
  return {
    promise,
    dispose: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };
}

export const __test__ = {
  assertControlHostSupervisionInstallPaths,
  assertStoredControlHostSupervisionConfig,
  bootstrapLaunchctlPlist,
  buildNextControlHostSupervisionState,
  buildControlHostSupervisionRestartRecord,
  buildControlHostSupervisionStatusPayload,
  classifyControlHostSupervisionRollout,
  captureExistingControlHostSupervisionInstall,
  createSleepWaiter,
  createControlHostSupervisionChildEventPromises,
  hasHealthyLiveProviderControlHostFreshness,
  formatControlHostSupervisionStatus,
  inspectControlHostSupervisionLiveHealth,
  inspectControlHostSupervisionLaunchAgent,
  isIgnorableLaunchctlBootoutFailure,
  isRetryableLaunchctlBootstrapError,
  loadBootstrapEnvironment,
  parseNulDelimitedEnv,
  probeControlHostHealth,
  readFormatFlag,
  readStringFlag,
  resolveEffectiveControlHostSupervisionState,
  resolveControlHostSupervisionProviderIntakeStatePath,
  resolveControlHostSupervisionQuarantineUnhealthySamples,
  readIntegerFlag,
  removeInstalledControlHostSupervisionArtifacts,
  restoreExistingControlHostSupervisionInstall,
  resolveReportedSupervisedChildPid,
  rollbackFailedControlHostSupervisionInstall,
  restartExistingControlHostSupervision,
  isTrackedSupervisedProcessGroup,
  resolveControlHostSupervisionProbeTimeoutMs,
  resolveControlHostSupervisionServiceTarget,
  extractLaunchctlServicePid,
  ensureTrackedProcessTreeExited,
  terminateChildProcess,
  waitForProcessGroupToExitWithinTimeout,
  writeRuntimeStateWithCleanup
};
