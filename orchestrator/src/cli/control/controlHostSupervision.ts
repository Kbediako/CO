import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

export const DEFAULT_CONTROL_HOST_SUPERVISION_LABEL =
  'com.kbediako.codex-orchestrator.control-host';
export const DEFAULT_CONTROL_HOST_SUPERVISION_TASK_ID = 'local-mcp';
export const DEFAULT_CONTROL_HOST_SUPERVISION_RUN_ID = 'control-host';
export const DEFAULT_CONTROL_HOST_SUPERVISION_PIPELINE_ID = 'provider-linear-worker';
export const DEFAULT_CONTROL_HOST_SUPERVISION_HEALTH_INTERVAL_SECONDS = 30;
export const DEFAULT_CONTROL_HOST_SUPERVISION_UNHEALTHY_THRESHOLD = 3;
export const DEFAULT_CONTROL_HOST_SUPERVISION_LAUNCHD_THROTTLE_SECONDS = 15;
export const DEFAULT_CONTROL_HOST_SUPERVISION_KILL_TIMEOUT_SECONDS = 10;
export const DEFAULT_CONTROL_HOST_SUPERVISION_RESTART_EXIT_CODE = 75;
export const DEFAULT_CONTROL_HOST_SUPERVISION_SHELL_PATH = '/bin/zsh';

export interface ControlHostSupervisionPaths {
  supportDir: string;
  configPath: string;
  statePath: string;
  plistPath: string;
  logsDir: string;
  stdoutLogPath: string;
  stderrLogPath: string;
}

export interface ControlHostSupervisionConfig {
  version: 1;
  label: string;
  repoRoot: string;
  nodePath: string;
  cliEntrypoint: string;
  taskId: string;
  runId: string;
  pipelineId: string;
  healthIntervalSeconds: number;
  unhealthyThreshold: number;
  launchdThrottleSeconds: number;
  killTimeoutSeconds: number;
  shellPath: string;
  envFiles: string[];
  homeDir: string;
  paths: ControlHostSupervisionPaths;
}

export interface BuildControlHostSupervisionConfigInput {
  homeDir?: string;
  cwd?: string;
  label?: string;
  repoRoot?: string;
  nodePath?: string;
  cliEntrypoint?: string;
  taskId?: string;
  runId?: string;
  pipelineId?: string;
  healthIntervalSeconds?: number;
  unhealthyThreshold?: number;
  launchdThrottleSeconds?: number;
  killTimeoutSeconds?: number;
  envFiles?: string[];
  shellPath?: string;
  supportDir?: string;
  logsDir?: string;
}

export interface ControlHostSupervisionState {
  version: 1;
  status: string;
  updated_at: string;
  label: string;
  repo_root: string;
  service_target: string | null;
  child_pid: number | null;
  last_started_at: string | null;
  last_exit_at: string | null;
  last_exit_code: number | null;
  last_signal: string | null;
  last_health_check_at: string | null;
  last_health_status: string | null;
  consecutive_unhealthy_samples: number;
  restart_count: number;
  unhealthy_threshold: number;
  health_interval_seconds: number;
  last_restart_reason: string | null;
  last_restart_requested_at: string | null;
  message: string | null;
}

export interface ControlHostSupervisionHealthEvaluation {
  healthy: boolean;
  reason: 'ok' | 'restart_required' | 'invalid_payload';
  message: string;
}

export function resolveDefaultControlHostSupervisionEnvFiles(
  homeDir: string = homedir()
): string[] {
  return [join(homeDir, '.local', 'bin', 'env'), join(homeDir, '.co_provider_env')];
}

export function resolveDefaultControlHostSupervisionEntrypoint(
  currentArgvEntry: string | null | undefined,
  packageRoot: string
): string {
  const currentEntry =
    typeof currentArgvEntry === 'string' && currentArgvEntry.trim().length > 0
      ? resolve(currentArgvEntry)
      : null;
  if (currentEntry && currentEntry.endsWith('.js')) {
    return currentEntry;
  }
  return join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js');
}

export function resolveControlHostSupervisionPaths(input?: {
  homeDir?: string;
  label?: string;
  supportDir?: string;
  logsDir?: string;
}): ControlHostSupervisionPaths {
  const resolvedHomeDir = resolve(input?.homeDir ?? homedir());
  const label = normalizeLabel(input?.label);
  const slug = sanitizeControlHostSupervisionPathSegment(label);
  const supportDir = resolve(
    input?.supportDir ??
      join(
        resolvedHomeDir,
        'Library',
        'Application Support',
        'codex-orchestrator',
        'control-host-supervision',
        slug
      )
  );
  const logsDir = resolve(
    input?.logsDir ?? join(resolvedHomeDir, 'Library', 'Logs', 'co-control-host', slug)
  );
  return {
    supportDir,
    configPath: join(supportDir, 'config.json'),
    statePath: join(supportDir, 'state.json'),
    plistPath: join(resolvedHomeDir, 'Library', 'LaunchAgents', `${label}.plist`),
    logsDir,
    stdoutLogPath: join(logsDir, 'stdout.log'),
    stderrLogPath: join(logsDir, 'stderr.log')
  };
}

export function buildControlHostSupervisionConfig(
  input: BuildControlHostSupervisionConfigInput
): ControlHostSupervisionConfig {
  const homeDir = resolve(input.homeDir ?? homedir());
  const cwd = resolve(input.cwd ?? process.cwd());
  const label = normalizeLabel(input.label);
  const repoRoot = resolve(input.repoRoot ?? cwd);
  const nodePath = resolveRequiredPath(input.nodePath ?? process.execPath, cwd, 'node path');
  const cliEntrypoint = resolveRequiredPath(
    input.cliEntrypoint ?? join(repoRoot, 'dist', 'bin', 'codex-orchestrator.js'),
    cwd,
    'CLI entrypoint'
  );
  const taskId = normalizeNonEmptyValue(
    input.taskId,
    DEFAULT_CONTROL_HOST_SUPERVISION_TASK_ID
  );
  const runId = normalizeNonEmptyValue(input.runId, DEFAULT_CONTROL_HOST_SUPERVISION_RUN_ID);
  const pipelineId = normalizeNonEmptyValue(
    input.pipelineId,
    DEFAULT_CONTROL_HOST_SUPERVISION_PIPELINE_ID
  );
  const healthIntervalSeconds = coercePositiveInteger(
    input.healthIntervalSeconds,
    DEFAULT_CONTROL_HOST_SUPERVISION_HEALTH_INTERVAL_SECONDS,
    'health interval'
  );
  const unhealthyThreshold = coercePositiveInteger(
    input.unhealthyThreshold,
    DEFAULT_CONTROL_HOST_SUPERVISION_UNHEALTHY_THRESHOLD,
    'unhealthy threshold'
  );
  const launchdThrottleSeconds = coerceNonNegativeInteger(
    input.launchdThrottleSeconds,
    DEFAULT_CONTROL_HOST_SUPERVISION_LAUNCHD_THROTTLE_SECONDS,
    'launchd throttle'
  );
  const killTimeoutSeconds = coercePositiveInteger(
    input.killTimeoutSeconds,
    DEFAULT_CONTROL_HOST_SUPERVISION_KILL_TIMEOUT_SECONDS,
    'kill timeout'
  );
  const shellPath = resolveRequiredPath(
    input.shellPath ?? process.env.SHELL ?? DEFAULT_CONTROL_HOST_SUPERVISION_SHELL_PATH,
    cwd,
    'shell path'
  );
  const envFiles = (input.envFiles ?? resolveDefaultControlHostSupervisionEnvFiles(homeDir)).map(
    (value, index) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        throw new Error(`env file entry at index ${index} must be non-empty.`);
      }
      return resolveOptionalPath(trimmed, cwd);
    }
  );
  const paths = resolveControlHostSupervisionPaths({
    homeDir,
    label,
    supportDir: input.supportDir,
    logsDir: input.logsDir
  });

  return {
    version: 1,
    label,
    repoRoot,
    nodePath,
    cliEntrypoint,
    taskId,
    runId,
    pipelineId,
    healthIntervalSeconds,
    unhealthyThreshold,
    launchdThrottleSeconds,
    killTimeoutSeconds,
    shellPath,
    envFiles,
    homeDir,
    paths
  };
}

export function buildControlHostSupervisionPlist(
  config: ControlHostSupervisionConfig
): string {
  const programArguments = [
    config.nodePath,
    config.cliEntrypoint,
    'control-host',
    'supervise',
    'run',
    '--config',
    config.paths.configPath
  ];
  const argumentLines = programArguments
    .map((value) => `    <string>${escapeXml(value)}</string>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(config.label)}</string>
  <key>ProgramArguments</key>
  <array>
${argumentLines}
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(config.repoRoot)}</string>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>${config.launchdThrottleSeconds}</integer>
  <key>StandardOutPath</key>
  <string>${escapeXml(config.paths.stdoutLogPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(config.paths.stderrLogPath)}</string>
</dict>
</plist>
`;
}

export function buildInitialControlHostSupervisionState(input: {
  config: ControlHostSupervisionConfig;
  serviceTarget?: string | null;
  status?: string;
  updatedAt: string;
  message?: string | null;
  restartCount?: number;
  lastRestartReason?: string | null;
  lastRestartRequestedAt?: string | null;
}): ControlHostSupervisionState {
  return {
    version: 1,
    status: normalizeNonEmptyValue(input.status, 'installed'),
    updated_at: input.updatedAt,
    label: input.config.label,
    repo_root: input.config.repoRoot,
    service_target: input.serviceTarget ?? null,
    child_pid: null,
    last_started_at: null,
    last_exit_at: null,
    last_exit_code: null,
    last_signal: null,
    last_health_check_at: null,
    last_health_status: null,
    consecutive_unhealthy_samples: 0,
    restart_count: input.restartCount ?? 0,
    unhealthy_threshold: input.config.unhealthyThreshold,
    health_interval_seconds: input.config.healthIntervalSeconds,
    last_restart_reason: input.lastRestartReason ?? null,
    last_restart_requested_at: input.lastRestartRequestedAt ?? null,
    message: input.message ?? null
  };
}

export function evaluateControlHostSupervisionHealthPayload(
  payload: unknown
): ControlHostSupervisionHealthEvaluation {
  if (!isRecord(payload)) {
    return {
      healthy: false,
      reason: 'invalid_payload',
      message: 'co-status returned a non-object payload.'
    };
  }
  const polling = isRecord(payload.polling) ? payload.polling : null;
  if (!polling) {
    return {
      healthy: false,
      reason: 'invalid_payload',
      message: 'co-status payload is missing polling state.'
    };
  }
  if (polling.restart_required === true) {
    return {
      healthy: false,
      reason: 'restart_required',
      message: 'co-status reported restart_required=true.'
    };
  }
  return {
    healthy: true,
    reason: 'ok',
    message: 'co-status reported a healthy polling state.'
  };
}

export function parseControlHostSupervisionCsv(raw: string | null | undefined): string[] | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed === '-' || trimmed.toLowerCase() === 'none') {
    return [];
  }
  return trimmed
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function sanitizeControlHostSupervisionPathSegment(value: string): string {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized.length > 0 ? sanitized : 'control-host';
}

function normalizeLabel(value: string | null | undefined): string {
  const normalized = normalizeNonEmptyValue(value, DEFAULT_CONTROL_HOST_SUPERVISION_LABEL);
  if (!/^[A-Za-z0-9._-]+$/u.test(normalized)) {
    throw new Error(
      'control-host supervision label may only contain letters, numbers, dots, underscores, and hyphens.'
    );
  }
  return normalized;
}

function normalizeNonEmptyValue(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function resolveRequiredPath(
  value: string,
  cwd: string,
  label: string
): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} must be non-empty.`);
  }
  return resolveOptionalPath(trimmed, cwd);
}

function resolveOptionalPath(value: string, cwd: string): string {
  return isAbsolute(value) ? resolve(value) : resolve(cwd, value);
}

function coercePositiveInteger(
  value: number | null | undefined,
  fallback: number,
  label: string
): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return value;
}

function coerceNonNegativeInteger(
  value: number | null | undefined,
  fallback: number,
  label: string
): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
