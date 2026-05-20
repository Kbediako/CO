import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

import { resolveControlHostSourceFreshnessPolicyFromPolling } from './controlHostOwnership.js';

export const DEFAULT_CONTROL_HOST_SUPERVISION_LABEL =
  'com.kbediako.co.control-host';
export const DEFAULT_CONTROL_HOST_SUPERVISION_TASK_ID = 'local-mcp';
export const DEFAULT_CONTROL_HOST_SUPERVISION_RUN_ID = 'control-host';
export const DEFAULT_CONTROL_HOST_SUPERVISION_PIPELINE_ID = 'provider-linear-worker';
export const DEFAULT_CONTROL_HOST_SUPERVISION_HEALTH_INTERVAL_SECONDS = 30;
export const DEFAULT_CONTROL_HOST_SUPERVISION_UNHEALTHY_THRESHOLD = 3;
export const DEFAULT_CONTROL_HOST_SUPERVISION_LAUNCHD_THROTTLE_SECONDS = 15;
export const DEFAULT_CONTROL_HOST_SUPERVISION_KILL_TIMEOUT_SECONDS = 10;
export const DEFAULT_CONTROL_HOST_SUPERVISION_RESTART_EXIT_CODE = 75;
export const DEFAULT_CONTROL_HOST_SUPERVISION_SHELL_PATH = '/bin/zsh';
export const DEFAULT_CONTROL_HOST_SUPERVISION_ACTIVE_WORKER_RESTART_QUARANTINE_MS =
  10 * 60 * 1000;
export const CONTROL_HOST_SUPERVISION_RESTART_HISTORY_LIMIT = 20;
export const CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS = Math.floor(
  2_147_483_647 / 1_000
);

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
  last_probe_duration_ms?: number | null;
  consecutive_unhealthy_samples: number;
  restart_count: number;
  unhealthy_threshold: number;
  health_interval_seconds: number;
  last_restart_reason: string | null;
  last_restart_requested_at: string | null;
  restart_history?: ControlHostSupervisionRestartRecord[];
  message: string | null;
}

export interface ControlHostSupervisionRunningWorkerSnapshot {
  issue_id: string | null;
  issue_identifier: string;
  state: string | null;
  display_state: string | null;
  pid: string | null;
  worker_host: string | null;
  session_id: string | null;
  started_at: string | null;
  last_event_at: string | null;
}

export interface ControlHostSupervisionPollingDiagnostic {
  updated_at: string | null;
  checking: boolean;
  queued: boolean;
  stuck: boolean;
  restart_required: boolean;
  reason: string | null;
  last_error: string | null;
  refresh_phase: string | null;
  refresh_request_class: string | null;
  refresh_provider_keys: string[] | null;
  operation_elapsed_ms: number | null;
  stalled_after_ms: number | null;
  control_host_owner: Record<string, unknown> | null;
}

export interface ControlHostSupervisionHealthDiagnostic {
  counts: {
    running: number | null;
    retrying: number | null;
    max_allowed?: number | null;
  };
  polling: ControlHostSupervisionPollingDiagnostic | null;
  running_workers: ControlHostSupervisionRunningWorkerSnapshot[];
}

export interface ControlHostSupervisionRestartRecord {
  requested_at: string;
  reason: string;
  message: string;
  consecutive_unhealthy_samples: number;
  child_pid: number | null;
  probe_duration_ms?: number | null;
  diagnostic: ControlHostSupervisionHealthDiagnostic | null;
}

export interface ControlHostSupervisionHealthEvaluation {
  healthy: boolean;
  reason:
    | 'ok'
    | 'restart_required'
    | 'stale_restart_required'
    | 'stale_supervised_source_root'
    | 'stale_supervised_source_fail_closed'
    | 'active_worker_restart_quarantine'
    | 'active_worker_probe_timeout_quarantine'
    | 'invalid_payload';
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
  const bootstrapEntrypoint = join(packageRoot, 'bin', 'codex-orchestrator.js');
  const currentEntry =
    typeof currentArgvEntry === 'string' && currentArgvEntry.trim().length > 0
      ? resolve(currentArgvEntry)
      : null;
  if (currentEntry === bootstrapEntrypoint) {
    return currentEntry;
  }
  return bootstrapEntrypoint;
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
  const healthIntervalSeconds = coercePositiveTimerSeconds(
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
  const killTimeoutSeconds = coercePositiveTimerSeconds(
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
  restartHistory?: ControlHostSupervisionRestartRecord[] | null;
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
    last_probe_duration_ms: null,
    consecutive_unhealthy_samples: 0,
    restart_count: input.restartCount ?? 0,
    unhealthy_threshold: input.config.unhealthyThreshold,
    health_interval_seconds: input.config.healthIntervalSeconds,
    last_restart_reason: input.lastRestartReason ?? null,
    last_restart_requested_at: input.lastRestartRequestedAt ?? null,
    restart_history: normalizeControlHostSupervisionRestartHistory(input.restartHistory ?? null),
    message: input.message ?? null
  };
}

export function readControlHostSupervisionHealthDiagnostic(
  payload: unknown
): ControlHostSupervisionHealthDiagnostic | null {
  if (!isRecord(payload)) {
    return null;
  }
  const counts = isRecord(payload.counts) ? payload.counts : null;
  const polling = isRecord(payload.polling) ? payload.polling : null;
  const running = Array.isArray(payload.running) ? payload.running : [];
  return {
    counts: {
      running: readFiniteNumber(counts?.running),
      retrying: readFiniteNumber(counts?.retrying),
      max_allowed: readFiniteNumber(counts?.max_allowed)
    },
    polling: polling ? buildControlHostSupervisionPollingDiagnostic(polling) : null,
    running_workers: running
      .map((entry) => buildControlHostSupervisionRunningWorkerSnapshot(entry))
      .filter((entry): entry is ControlHostSupervisionRunningWorkerSnapshot => entry !== null)
  };
}

function normalizeStoredControlHostSupervisionHealthDiagnostic(
  value: unknown
): ControlHostSupervisionHealthDiagnostic | null {
  if (!isRecord(value)) {
    return null;
  }
  const counts = isRecord(value.counts) ? value.counts : null;
  const polling = isRecord(value.polling) ? value.polling : null;
  const runningWorkers = Array.isArray(value.running_workers) ? value.running_workers : [];
  return {
    counts: {
      running: readFiniteNumber(counts?.running),
      retrying: readFiniteNumber(counts?.retrying),
      max_allowed: readFiniteNumber(counts?.max_allowed)
    },
    polling: polling ? buildControlHostSupervisionPollingDiagnostic(polling) : null,
    running_workers: runningWorkers
      .map((entry) => buildControlHostSupervisionRunningWorkerSnapshot(entry))
      .filter((entry): entry is ControlHostSupervisionRunningWorkerSnapshot => entry !== null)
  };
}

export function evaluateControlHostSupervisionHealthPayload(
  payload: unknown,
  options: {
    minPollingUpdatedAt?: string | null;
    staleRestartRequiredGraceMs?: number | null;
    restartHistory?: ControlHostSupervisionRestartRecord[] | null;
    activeWorkerRestartQuarantineMs?: number | null;
    now?: string | null;
  } = {}
): ControlHostSupervisionHealthEvaluation {
  if (!isRecord(payload)) {
    return {
      healthy: false,
      reason: 'invalid_payload',
      message: 'co-status returned a non-object payload.'
    };
  }
  const polling = isRecord(payload.polling) ? payload.polling : null;
  const diagnostic = readControlHostSupervisionHealthDiagnostic(payload);
  if (!polling) {
    return {
      healthy: true,
      reason: 'ok',
      message: 'co-status payload omitted polling state; treating it as healthy.'
    };
  }
  const sourceFreshnessPolicy = resolveControlHostSourceFreshnessPolicyFromPolling(
    polling.control_host_owner,
    { refresh: false }
  );
  if (sourceFreshnessPolicy?.action === 'restart') {
    if (
      isStaleRecoverableSourceFreshnessPolicySnapshot(polling, sourceFreshnessPolicy, {
        minPollingUpdatedAt: options.minPollingUpdatedAt,
        staleRestartRequiredGraceMs: options.staleRestartRequiredGraceMs,
        now: options.now
      })
    ) {
      const graceSeconds =
        typeof options.staleRestartRequiredGraceMs === 'number' &&
        Number.isFinite(options.staleRestartRequiredGraceMs)
          ? Math.max(0, Math.round(options.staleRestartRequiredGraceMs / 1_000))
          : null;
      return {
        healthy: true,
        reason: 'stale_restart_required',
        message: `co-status reported a stale supervised source freshness snapshot from before the current supervised child start; treating it as quiescent${
          graceSeconds === null ? '' : ` for the bounded ${graceSeconds}s startup grace window`
        } while the current host refreshes.`
      };
    }
    return {
      healthy: false,
      reason: 'stale_supervised_source_root',
      message: `${sourceFreshnessPolicy.detail} Supervision will request a bounded launchd restart before trusting provider-intake.`
    };
  }
  if (sourceFreshnessPolicy?.action === 'fail_closed') {
    return {
      healthy: true,
      reason: 'stale_supervised_source_fail_closed',
      message: `${sourceFreshnessPolicy.detail} Restart is not attempted to avoid an unsafe restart loop.`
    };
  }
  if (polling.restart_required === true) {
    if (
      isStaleRecoverableProviderRestartRequiredPolling(polling, {
        minPollingUpdatedAt: options.minPollingUpdatedAt,
        staleRestartRequiredGraceMs: options.staleRestartRequiredGraceMs,
        now: options.now
      })
    ) {
      const graceSeconds =
        typeof options.staleRestartRequiredGraceMs === 'number' &&
        Number.isFinite(options.staleRestartRequiredGraceMs)
          ? Math.max(0, Math.round(options.staleRestartRequiredGraceMs / 1_000))
          : null;
      return {
        healthy: true,
        reason: 'stale_restart_required',
        message: `co-status reported a stale provider_refresh_lifecycle_stuck restart_required snapshot from before the current supervised child start; treating it as quiescent${
          graceSeconds === null ? '' : ` for the bounded ${graceSeconds}s startup grace window`
        } while the current host refreshes.`
      };
    }
    const repeatedRestartQuarantine = resolveRepeatedActiveWorkerRestartQuarantine({
      polling,
      diagnostic,
      restartHistory: options.restartHistory ?? null,
      activeWorkerRestartQuarantineMs:
        options.activeWorkerRestartQuarantineMs ??
        DEFAULT_CONTROL_HOST_SUPERVISION_ACTIVE_WORKER_RESTART_QUARANTINE_MS,
      now: options.now
    });
    if (repeatedRestartQuarantine) {
      return repeatedRestartQuarantine;
    }
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

function isStaleRecoverableSourceFreshnessPolicySnapshot(
  polling: Record<string, unknown>,
  policy: NonNullable<ReturnType<typeof resolveControlHostSourceFreshnessPolicyFromPolling>>,
  options: {
    minPollingUpdatedAt: string | null | undefined;
    staleRestartRequiredGraceMs?: number | null;
    now?: string | null;
  }
): boolean {
  const minimumUpdatedAt = parseIsoTimestampToMs(options.minPollingUpdatedAt);
  if (minimumUpdatedAt === null) {
    return false;
  }
  const policyUpdatedAt = parseIsoTimestampToMs(policy.updated_at);
  const pollingUpdatedAt = parseIsoTimestampToMs(polling.updated_at);
  const snapshotUpdatedAt = policyUpdatedAt ?? pollingUpdatedAt;
  if (snapshotUpdatedAt === null || snapshotUpdatedAt >= minimumUpdatedAt) {
    return false;
  }
  if (
    typeof options.staleRestartRequiredGraceMs !== 'number' ||
    !Number.isFinite(options.staleRestartRequiredGraceMs)
  ) {
    return true;
  }
  const now = parseIsoTimestampToMs(options.now ?? new Date().toISOString());
  return now !== null && now - minimumUpdatedAt <= Math.max(0, options.staleRestartRequiredGraceMs);
}

function isStaleRecoverableProviderRestartRequiredPolling(
  polling: Record<string, unknown>,
  options: {
    minPollingUpdatedAt: string | null | undefined;
    staleRestartRequiredGraceMs?: number | null;
    now?: string | null;
  }
): boolean {
  if (
    polling.reason !== 'provider_refresh_lifecycle_stuck' &&
    polling.last_error !== 'provider_refresh_lifecycle_stuck'
  ) {
    return false;
  }
  const pollingUpdatedAt = parseIsoTimestampToMs(polling.updated_at);
  const minimumUpdatedAt = parseIsoTimestampToMs(options.minPollingUpdatedAt);
  if (pollingUpdatedAt === null || minimumUpdatedAt === null || pollingUpdatedAt >= minimumUpdatedAt) {
    return false;
  }
  if (
    typeof options.staleRestartRequiredGraceMs !== 'number' ||
    !Number.isFinite(options.staleRestartRequiredGraceMs)
  ) {
    return true;
  }
  const now = parseIsoTimestampToMs(options.now ?? new Date().toISOString());
  return now !== null && now - minimumUpdatedAt <= Math.max(0, options.staleRestartRequiredGraceMs);
}

function resolveRepeatedActiveWorkerRestartQuarantine(input: {
  polling: Record<string, unknown>;
  diagnostic: ControlHostSupervisionHealthDiagnostic | null;
  restartHistory: ControlHostSupervisionRestartRecord[] | null;
  activeWorkerRestartQuarantineMs: number | null;
  now?: string | null;
}): ControlHostSupervisionHealthEvaluation | null {
  if (!isProviderRefreshLifecycleRestartRequired(input.polling)) {
    return null;
  }
  const diagnostic = input.diagnostic;
  if (!diagnostic || diagnostic.running_workers.length === 0) {
    return null;
  }
  if (hasAvailableProviderWorkerCapacity(diagnostic)) {
    return null;
  }
  const restartHistory = normalizeControlHostSupervisionRestartHistory(input.restartHistory);
  if (restartHistory.length === 0) {
    return null;
  }
  const currentSignature = buildControlHostSupervisionRestartSignature(diagnostic);
  if (currentSignature === null) {
    return null;
  }
  const nowMs = parseIsoTimestampToMs(input.now ?? new Date().toISOString());
  const quarantineMs =
    typeof input.activeWorkerRestartQuarantineMs === 'number' &&
    Number.isFinite(input.activeWorkerRestartQuarantineMs)
      ? Math.max(0, input.activeWorkerRestartQuarantineMs)
      : null;
  for (let index = restartHistory.length - 1; index >= 0; index -= 1) {
    const record = restartHistory[index];
    const requestedAtMs = parseIsoTimestampToMs(record.requested_at);
    if (
      quarantineMs !== null &&
      nowMs !== null &&
      requestedAtMs !== null &&
      nowMs - requestedAtMs > quarantineMs
    ) {
      break;
    }
    const recordSignature = buildControlHostSupervisionRestartSignature(record.diagnostic);
    if (recordSignature === null || recordSignature !== currentSignature) {
      return null;
    }
    return {
      healthy: true,
      reason: 'active_worker_restart_quarantine',
      message: `co-status reported restart_required=true for the same provider refresh stuck series already restarted at ${record.requested_at}; ${diagnostic.running_workers.length} active provider worker(s) remain visible, so supervision is quarantining repeated restart churn while retaining restart_required in co-status.`
    };
  }
  return null;
}

export function evaluateControlHostSupervisionProbeTimeoutDiagnostic(
  diagnostic: ControlHostSupervisionHealthDiagnostic | null,
  options: {
    minPollingUpdatedAt?: string | null;
    restartHistory?: ControlHostSupervisionRestartRecord[] | null;
    activeWorkerRestartQuarantineMs?: number | null;
    now?: string | null;
  } = {}
): ControlHostSupervisionHealthEvaluation | null {
  if (!diagnostic || diagnostic.running_workers.length === 0) {
    return null;
  }
  if (!isCurrentControlHostSupervisionPollingDiagnostic(diagnostic.polling, options.minPollingUpdatedAt)) {
    return null;
  }
  const restartRequired = isProviderRefreshLifecycleRestartRequiredDiagnostic(diagnostic.polling);
  const activeRefresh = isActiveProviderRefreshProbeTimeoutDiagnostic(diagnostic.polling);
  if (!restartRequired && !activeRefresh) {
    return null;
  }
  if (hasAvailableProviderWorkerCapacity(diagnostic)) {
    return null;
  }
  const restartHistory = normalizeControlHostSupervisionRestartHistory(options.restartHistory);
  if (restartHistory.length === 0) {
    return null;
  }
  const currentSignature = buildControlHostSupervisionRestartSignature(diagnostic);
  if (currentSignature === null) {
    return null;
  }
  const nowMs = parseIsoTimestampToMs(options.now ?? new Date().toISOString());
  const quarantineMs =
    typeof options.activeWorkerRestartQuarantineMs === 'number' &&
    Number.isFinite(options.activeWorkerRestartQuarantineMs)
      ? Math.max(0, options.activeWorkerRestartQuarantineMs)
      : DEFAULT_CONTROL_HOST_SUPERVISION_ACTIVE_WORKER_RESTART_QUARANTINE_MS;
  for (let index = restartHistory.length - 1; index >= 0; index -= 1) {
    const record = restartHistory[index];
    const requestedAtMs = parseIsoTimestampToMs(record.requested_at);
    if (
      nowMs !== null &&
      requestedAtMs !== null &&
      nowMs - requestedAtMs > quarantineMs
    ) {
      break;
    }
    if (record.reason !== 'probe_timeout') {
      return null;
    }
    const recordSignature = buildControlHostSupervisionRestartSignature(record.diagnostic);
    if (recordSignature === null || recordSignature !== currentSignature) {
      return null;
    }
    return {
      healthy: true,
      reason: 'active_worker_probe_timeout_quarantine',
      message: `co-status probe timed out for the same active provider worker series already restarted at ${record.requested_at}; ${diagnostic.running_workers.length} active provider worker(s) remain visible in local provider-intake state, so supervision is quarantining repeated probe timeout restart churn while retaining the prior fail-closed timeout record.`
    };
  }
  return null;
}

function isProviderRefreshLifecycleRestartRequiredDiagnostic(
  polling: ControlHostSupervisionPollingDiagnostic | null
): boolean {
  if (!polling || polling.restart_required !== true) {
    return false;
  }
  return (
    polling.reason === 'provider_refresh_lifecycle_stuck' ||
    polling.last_error === 'provider_refresh_lifecycle_stuck'
  );
}

function isActiveProviderRefreshProbeTimeoutDiagnostic(
  polling: ControlHostSupervisionPollingDiagnostic | null
): boolean {
  if (!polling || polling.checking !== true) {
    return false;
  }
  if (polling.restart_required === true || polling.stuck === true) {
    return false;
  }
  if (polling.reason !== null) {
    return false;
  }
  return polling.refresh_phase?.startsWith('refresh:') === true;
}

function isCurrentControlHostSupervisionPollingDiagnostic(
  polling: ControlHostSupervisionPollingDiagnostic | null,
  minPollingUpdatedAt: string | null | undefined
): boolean {
  const minimumUpdatedAt = parseIsoTimestampToMs(minPollingUpdatedAt);
  if (minimumUpdatedAt === null) {
    return true;
  }
  const pollingUpdatedAt = parseIsoTimestampToMs(polling?.updated_at);
  return pollingUpdatedAt !== null && pollingUpdatedAt >= minimumUpdatedAt;
}

function hasAvailableProviderWorkerCapacity(
  diagnostic: ControlHostSupervisionHealthDiagnostic
): boolean {
  const running = diagnostic.counts.running;
  const retrying = diagnostic.counts.retrying;
  const maxAllowed = diagnostic.counts.max_allowed ?? null;
  if (running === null || retrying === null || maxAllowed === null) {
    return false;
  }
  return running + retrying < maxAllowed;
}

function buildControlHostSupervisionPollingDiagnostic(
  polling: Record<string, unknown>
): ControlHostSupervisionPollingDiagnostic {
  return {
    updated_at: readIsoString(polling.updated_at),
    checking: polling.checking === true,
    queued: polling.queued === true,
    stuck: polling.stuck === true,
    restart_required: polling.restart_required === true,
    reason: readNonEmptyString(polling.reason),
    last_error: readNonEmptyString(polling.last_error),
    refresh_phase: readNonEmptyString(polling.refresh_phase),
    refresh_request_class: readNonEmptyString(polling.refresh_request_class),
    refresh_provider_keys: readStringArray(polling.refresh_provider_keys),
    operation_elapsed_ms: readFiniteNumber(polling.operation_elapsed_ms),
    stalled_after_ms: readFiniteNumber(polling.stalled_after_ms),
    control_host_owner: isRecord(polling.control_host_owner) ? { ...polling.control_host_owner } : null
  };
}

function buildControlHostSupervisionRunningWorkerSnapshot(
  value: unknown
): ControlHostSupervisionRunningWorkerSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }
  const issueIdentifier = readNonEmptyString(value.issue_identifier);
  if (!issueIdentifier) {
    return null;
  }
  return {
    issue_id: readIsoOrPlainString(value.issue_id),
    issue_identifier: issueIdentifier,
    state: readNonEmptyString(value.state),
    display_state: readNonEmptyString(value.display_state),
    pid: readNonEmptyString(value.pid),
    worker_host: readNonEmptyString(value.worker_host),
    session_id: readNonEmptyString(value.session_id),
    started_at: readIsoString(value.started_at),
    last_event_at: readIsoString(value.last_event_at)
  };
}

function normalizeControlHostSupervisionRestartHistory(
  value: ControlHostSupervisionRestartRecord[] | null | undefined
): ControlHostSupervisionRestartRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = value
    .map((entry) => normalizeControlHostSupervisionRestartRecord(entry))
    .filter((entry): entry is ControlHostSupervisionRestartRecord => entry !== null);
  return normalized.slice(-CONTROL_HOST_SUPERVISION_RESTART_HISTORY_LIMIT);
}

function normalizeControlHostSupervisionRestartRecord(
  value: ControlHostSupervisionRestartRecord | null | undefined
): ControlHostSupervisionRestartRecord | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const requestedAt = readIsoString(value.requested_at);
  const reason = readNonEmptyString(value.reason);
  if (!requestedAt || !reason) {
    return null;
  }
  return {
    requested_at: requestedAt,
    reason,
    message: readNonEmptyString(value.message) ?? '',
    consecutive_unhealthy_samples: readFiniteNumber(value.consecutive_unhealthy_samples) ?? 0,
    child_pid: readFiniteNumber(value.child_pid),
    probe_duration_ms: readFiniteNumber(value.probe_duration_ms),
    diagnostic: normalizeStoredControlHostSupervisionHealthDiagnostic(value.diagnostic)
  };
}

function buildControlHostSupervisionRestartSignature(
  diagnostic: ControlHostSupervisionHealthDiagnostic | null | undefined
): string | null {
  if (!diagnostic?.polling) {
    return null;
  }
  const workerSeries = diagnostic.running_workers
    .map((worker) => buildControlHostSupervisionWorkerSeriesKey(worker))
    .filter((value): value is string => value !== null)
    .sort();
  if (workerSeries.length === 0) {
    return null;
  }
  // Quarantine repeated restart churn on the stable active-worker series, not on transient
  // refresh checkpoints that can legitimately drift within one stuck refresh cycle.
  return JSON.stringify({
    reason: buildControlHostSupervisionRestartReasonKey(diagnostic.polling),
    worker_series: workerSeries
  });
}

function buildControlHostSupervisionRestartReasonKey(
  polling: ControlHostSupervisionPollingDiagnostic
): string | null {
  if (polling.reason) {
    return polling.reason;
  }
  if (isActiveProviderRefreshProbeTimeoutDiagnostic(polling)) {
    return 'active_provider_refresh_probe_timeout';
  }
  if (isProviderRefreshLifecycleRestartRequiredDiagnostic(polling)) {
    return 'provider_refresh_lifecycle_stuck';
  }
  return polling.last_error ?? null;
}

function buildControlHostSupervisionWorkerSeriesKey(
  worker: ControlHostSupervisionRunningWorkerSnapshot
): string | null {
  if (worker.issue_identifier.length === 0) {
    return null;
  }
  return JSON.stringify({
    issue_identifier: worker.issue_identifier,
    session_id: worker.session_id ?? null,
    started_at: worker.started_at ?? null,
    pid: worker.pid ?? null
  });
}

function isProviderRefreshLifecycleRestartRequired(polling: Record<string, unknown>): boolean {
  if (polling.restart_required !== true) {
    return false;
  }
  return (
    polling.reason === 'provider_refresh_lifecycle_stuck' ||
    polling.last_error === 'provider_refresh_lifecycle_stuck'
  );
}

function parseIsoTimestampToMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readIsoString(value: unknown): string | null {
  const candidate = readNonEmptyString(value);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : null;
}

function readIsoOrPlainString(value: unknown): string | null {
  return readNonEmptyString(value);
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = value
    .map((entry) => readNonEmptyString(entry))
    .filter((entry): entry is string => entry !== null);
  return normalized.length > 0 ? normalized : null;
}

export function sanitizeControlHostSupervisionPathSegment(value: string): string {
  const trimmed = value.trim();
  const sanitized = trimmed.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (sanitized === '.' || sanitized === '..') {
    throw new Error('control-host supervision label may not resolve to "." or "..".');
  }
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

function coercePositiveTimerSeconds(
  value: number | null | undefined,
  fallback: number,
  label: string
): number {
  const parsed = coercePositiveInteger(value, fallback, label);
  if (parsed > CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS) {
    throw new Error(
      `${label} must be <= ${CONTROL_HOST_SUPERVISION_MAX_NODE_TIMER_SECONDS} seconds to stay within Node timer limits.`
    );
  }
  return parsed;
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
