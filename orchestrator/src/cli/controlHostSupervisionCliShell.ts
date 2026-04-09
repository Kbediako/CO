/* eslint-disable patterns/prefer-logger-over-console */

import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  DEFAULT_CONTROL_HOST_SUPERVISION_LABEL,
  DEFAULT_CONTROL_HOST_SUPERVISION_KILL_TIMEOUT_SECONDS,
  DEFAULT_CONTROL_HOST_SUPERVISION_RESTART_EXIT_CODE,
  buildControlHostSupervisionConfig,
  buildControlHostSupervisionPlist,
  buildInitialControlHostSupervisionState,
  evaluateControlHostSupervisionHealthPayload,
  parseControlHostSupervisionCsv,
  resolveControlHostSupervisionPaths,
  resolveDefaultControlHostSupervisionEntrypoint,
  resolveDefaultControlHostSupervisionEnvFiles,
  type ControlHostSupervisionConfig,
  type ControlHostSupervisionPaths,
  type ControlHostSupervisionState
} from './control/controlHostSupervision.js';
import { findPackageRoot } from './utils/packageInfo.js';

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
  state: ControlHostSupervisionState | null;
  service: {
    loaded: boolean;
    exit_code: number;
    summary: string | null;
    stderr: string | null;
  };
}

const execFileAsync = promisify(execFile);
const COMMAND_BUFFER_MAX_BYTES = 16 * 1024 * 1024;
const CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_CAP_MS = 10_000;
const CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_FLOOR_MS = 1_000;

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

  await assertControlHostSupervisionInstallPaths(install.config);
  await mkdir(dirname(install.config.paths.plistPath), { recursive: true });
  await mkdir(install.config.paths.supportDir, { recursive: true });
  await mkdir(install.config.paths.logsDir, { recursive: true });

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
  await runLaunchctl(['bootstrap', resolveLaunchdDomain(), install.config.paths.plistPath]);

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
  const payload = buildControlHostSupervisionStatusPayload({
    resolved,
    serviceTarget,
    state,
    launchctl
  });
  emitOutput(format, payload, formatControlHostSupervisionStatus(payload));
}

async function restartControlHostSupervision(flags: ArgMap): Promise<void> {
  const format = readFormatFlag(flags);
  const resolved = await resolveStoredControlHostSupervision(flags, false);
  const serviceTarget = resolveControlHostSupervisionServiceTarget(resolved.label);
  await runLaunchctl(['kickstart', '-k', serviceTarget]);

  const payload = {
    status: 'restarted',
    label: resolved.label,
    service_target: serviceTarget,
    config_path: resolved.paths.configPath,
    plist_path: resolved.paths.plistPath
  };
  emitOutput(
    format,
    payload,
    `Restarted control-host supervision for ${resolved.label} via ${serviceTarget}.`
  );
}

async function uninstallControlHostSupervision(flags: ArgMap): Promise<void> {
  const format = readFormatFlag(flags);
  const resolved = await resolveStoredControlHostSupervision(flags, false);
  const serviceTarget = resolveControlHostSupervisionServiceTarget(resolved.label);

  await bootoutLaunchctlServiceTarget(serviceTarget);
  await rm(resolved.paths.plistPath, { force: true });
  await rm(resolved.paths.supportDir, { recursive: true, force: true });
  await rm(resolved.paths.logsDir, { recursive: true, force: true });

  const payload = {
    status: 'uninstalled',
    label: resolved.label,
    service_target: serviceTarget,
    config_path: resolved.paths.configPath,
    plist_path: resolved.paths.plistPath,
    logs_dir: resolved.paths.logsDir
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
    stdio: 'inherit'
  });

  const startedAt = new Date().toISOString();
  await writeState({
    status: 'running',
    updated_at: startedAt,
    child_pid: child.pid ?? null,
    last_started_at: startedAt,
    message: 'control-host supervision runner started.'
  });

  const stopWaiter = createStopSignalWaiter();
  const childExitPromise = once(child, 'exit').then(([code, signal]) => ({
    type: 'child_exit' as const,
    code: typeof code === 'number' ? code : null,
    signal: typeof signal === 'string' ? signal : null
  }));
  const childErrorPromise = once(child, 'error').then(([error]) => ({
    type: 'child_error' as const,
    error: error as Error
  }));

  let consecutiveUnhealthySamples = 0;
  const restartCount = priorState.restart_count ?? 0;

  try {
    for (;;) {
      const event = await Promise.race([
        childExitPromise,
        childErrorPromise,
        stopWaiter.promise,
        sleep(config.healthIntervalSeconds * 1_000).then(() => ({ type: 'tick' as const }))
      ]);

      if (event.type === 'tick') {
        const probe = await probeControlHostHealth(config, childEnv);
        const checkedAt = new Date().toISOString();
        if (probe.healthy) {
          consecutiveUnhealthySamples = 0;
          await writeState({
            status: 'healthy',
            updated_at: checkedAt,
            last_health_check_at: checkedAt,
            last_health_status: 'ok',
            consecutive_unhealthy_samples: 0,
            message: probe.message
          });
          continue;
        }

        consecutiveUnhealthySamples += 1;
        await writeState({
          status: 'unhealthy',
          updated_at: checkedAt,
          last_health_check_at: checkedAt,
          last_health_status: probe.reason,
          consecutive_unhealthy_samples: consecutiveUnhealthySamples,
          message: probe.message
        });

        if (consecutiveUnhealthySamples < config.unhealthyThreshold) {
          continue;
        }

        const restartRequestedAt = new Date().toISOString();
        await writeState({
          status: 'restart_required',
          updated_at: restartRequestedAt,
          last_health_check_at: restartRequestedAt,
          last_health_status: probe.reason,
          consecutive_unhealthy_samples: consecutiveUnhealthySamples,
          restart_count: restartCount + 1,
          last_restart_reason: probe.reason,
          last_restart_requested_at: restartRequestedAt,
          message: `${probe.message} launchd restart requested after ${consecutiveUnhealthySamples} consecutive unhealthy samples.`
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
        await writeState({
          status: 'stopping',
          updated_at: stoppedAt,
          message: `Supervisor received ${event.signal}; stopping child process.`
        });
        await terminateChildProcess(child, config.killTimeoutSeconds);
        const exitResult = await childExitPromise;
        const finishedAt = new Date().toISOString();
        await writeState({
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
        await writeState({
          status: 'child_error',
          updated_at: failedAt,
          child_pid: null,
          last_exit_at: failedAt,
          message: event.error.message
        });
        throw event.error;
      }

      const exitedAt = new Date().toISOString();
      await writeState({
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
    const config = await readJsonFileIfExists<ControlHostSupervisionConfig>(configPath);
    if (!config) {
      throw new Error(`Control-host supervision config not found: ${configPath}`);
    }
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
  config: ControlHostSupervisionConfig
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
  const result = await runCommandBuffer(config.shellPath, ['-lc', shellScript], {
    cwd: config.repoRoot,
    env: baseEnv
  });
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
  commandRunner: typeof runCommand = runCommand
): Promise<{ healthy: boolean; reason: string; message: string }> {
  const probeTimeoutMs = resolveControlHostSupervisionProbeTimeoutMs(config.healthIntervalSeconds);
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
      'json'
    ],
    {
      cwd: config.repoRoot,
      env,
      timeoutMs: probeTimeoutMs
    }
  );
  if (result.timedOut === true) {
    return {
      healthy: false,
      reason: 'probe_timeout',
      message: `co-status probe timed out after ${Math.round(probeTimeoutMs / 1_000)}s.`
    };
  }
  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || 'co-status command failed.';
    return {
      healthy: false,
      reason: 'probe_failed',
      message: `co-status probe failed: ${detail}`
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(result.stdout);
  } catch (error) {
    return {
      healthy: false,
      reason: 'invalid_payload',
      message: `co-status probe returned invalid JSON: ${(error as Error).message}`
    };
  }

  const evaluation = evaluateControlHostSupervisionHealthPayload(payload);
  return {
    healthy: evaluation.healthy,
    reason: evaluation.reason,
    message: evaluation.message
  };
}

function buildControlHostSupervisionStatusPayload(input: {
  resolved: ResolvedSupervisionInstall;
  serviceTarget: string;
  state: ControlHostSupervisionState | null;
  launchctl: CommandResult;
}): ControlHostSupervisionStatusPayload {
  const summarySource =
    input.launchctl.stdout.trim() || input.launchctl.stderr.trim() || null;
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
    state: input.state,
    service: {
      loaded: input.launchctl.exitCode === 0,
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
    `Label: ${payload.label}`,
    `Service target: ${payload.service_target}`,
    `launchctl loaded: ${payload.service.loaded ? 'yes' : 'no'}`,
    `Config: ${payload.config_path}`,
    `Plist: ${payload.plist_path}`,
    `State: ${payload.state_path}`,
    `Logs: ${payload.logs.stdout_path} | ${payload.logs.stderr_path}`
  ];
  if (payload.config) {
    lines.push(`Repo root: ${payload.config.repoRoot}`);
    lines.push(
      `Task/run/pipeline: ${payload.config.taskId} / ${payload.config.runId} / ${payload.config.pipelineId}`
    );
    lines.push(
      `Health: interval=${payload.config.healthIntervalSeconds}s threshold=${payload.config.unhealthyThreshold}`
    );
  }
  if (payload.state) {
    lines.push(`State status: ${payload.state.status}`);
    if (payload.state.last_health_status) {
      lines.push(
        `Last health: ${payload.state.last_health_status} (${payload.state.consecutive_unhealthy_samples}/${payload.state.unhealthy_threshold})`
      );
    }
    if (payload.state.last_restart_reason) {
      lines.push(`Last restart reason: ${payload.state.last_restart_reason}`);
    }
  }
  if (payload.service.summary) {
    lines.push(`launchctl: ${payload.service.summary}`);
  }
  return lines.join('\n');
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

async function bootoutLaunchctlServiceTarget(serviceTarget: string): Promise<void> {
  const result = await runLaunchctl(['bootout', serviceTarget], { allowFailure: true });
  if (result.exitCode === 0 || isIgnorableLaunchctlBootoutFailure(result)) {
    return;
  }
  const detail = result.stderr.trim() || result.stdout.trim() || 'launchctl bootout failed.';
  throw new Error(`launchctl bootout ${serviceTarget} failed: ${detail}`);
}

function isIgnorableLaunchctlBootoutFailure(result: CommandResult): boolean {
  const detail = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return /could not find service|service.*not found|no such process|not loaded/u.test(detail);
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
  killTimeoutSeconds: number
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exitPromise = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    child.once('exit', () => resolve());
  });
  child.kill('SIGTERM');
  const timedOut = await Promise.race([
    exitPromise.then(() => false),
    sleep(killTimeoutSeconds * 1_000).then(() => true)
  ]);
  if (!timedOut) {
    return;
  }
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await exitPromise.catch(() => undefined);
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
  }
): Promise<CommandBufferResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      encoding: 'buffer',
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
    };
    const exitCode =
      typeof execError.code === 'number' ? execError.code : execError.code === 'ENOENT' ? 127 : 1;
    return {
      exitCode,
      stdout: bufferLikeToBuffer(execError.stdout),
      stderr: bufferLikeToBuffer(execError.stderr ?? execError.message)
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

async function assertPathExists(
  path: string,
  label: string,
  exists: (path: string) => Promise<boolean> = pathExists
): Promise<void> {
  if (!(await exists(path))) {
    throw new Error(`${label} not found: ${path}`);
  }
}

async function assertControlHostSupervisionInstallPaths(
  config: ControlHostSupervisionConfig,
  exists: (path: string) => Promise<boolean> = pathExists
): Promise<void> {
  await assertPathExists(config.nodePath, 'Node executable', exists);
  await assertPathExists(config.cliEntrypoint, 'Control-host supervision entrypoint', exists);
  await assertPathExists(config.shellPath, 'Shell executable', exists);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
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
  return Math.max(
    CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_FLOOR_MS,
    Math.min(healthIntervalSeconds * 1_000, CONTROL_HOST_SUPERVISION_PROBE_TIMEOUT_CAP_MS)
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export const __test__ = {
  assertControlHostSupervisionInstallPaths,
  buildNextControlHostSupervisionState,
  buildControlHostSupervisionStatusPayload,
  formatControlHostSupervisionStatus,
  isIgnorableLaunchctlBootoutFailure,
  parseNulDelimitedEnv,
  probeControlHostHealth,
  readFormatFlag,
  readStringFlag,
  readIntegerFlag,
  resolveControlHostSupervisionProbeTimeoutMs,
  resolveControlHostSupervisionServiceTarget
};
