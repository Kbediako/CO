import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { acquireLockWithRetry, type LockRetryOptions } from '../../persistence/lockFile.js';
import { isoTimestamp } from '../utils/time.js';
import type { ProviderOperatorAutopilotPendingActionRecord } from './providerOperatorAutopilot.js';
import type { ProviderOperatorAutopilotLifecycleRecord } from './providerOperatorAutopilotLifecycle.js';

const execFileAsync = promisify(execFile);

export const PROVIDER_OPERATOR_AUTOPILOT_LOCAL_ROLLOUT_EXECUTION_FILENAME =
  'provider-operator-autopilot-local-rollout-executions.json';
const LOCAL_ROLLOUT_EXECUTION_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 450,
  initialDelayMs: 10,
  backoffFactor: 1.2,
  maxDelayMs: 100,
  staleMs: 30_000
};
const DEFAULT_LOCAL_ROLLOUT_EXECUTION_TIMEOUT_MS = 15_000;
const SUPPORTED_NODE_PLATFORMS = new Set<NodeJS.Platform>([
  'aix',
  'android',
  'darwin',
  'freebsd',
  'haiku',
  'linux',
  'openbsd',
  'sunos',
  'win32',
  'cygwin',
  'netbsd'
]);

export type ProviderOperatorAutopilotLocalRolloutRunnerKind =
  | 'codex_orchestrator'
  | 'npm_script';

export interface ProviderOperatorAutopilotLocalRolloutActionConfig {
  id: string;
  enabled: boolean;
  order: number;
  runner: ProviderOperatorAutopilotLocalRolloutRunnerKind;
  args: string[];
  script: string | null;
  timeout_ms: number;
  require_clean_repo: boolean;
  required_branch: string | null;
  supported_platforms: NodeJS.Platform[];
  invalid_supported_platforms: string[];
  deploy_class: boolean;
  deploy_opt_in: boolean;
  requires_issue_identifier: boolean;
}

export interface ProviderOperatorAutopilotLocalRolloutExecutionConfig {
  enabled: boolean;
  actions: ProviderOperatorAutopilotLocalRolloutActionConfig[];
}

export type ProviderOperatorAutopilotLocalRolloutTerminalState =
  | 'succeeded'
  | 'skipped'
  | 'failed';

export type ProviderOperatorAutopilotLocalRolloutExecutionRecordKind =
  | 'started'
  | 'terminal';

export type ProviderOperatorAutopilotLocalRolloutPreflightStatus =
  | 'passed'
  | 'skipped'
  | 'failed';

export type ProviderOperatorAutopilotLocalRolloutPreflightReason =
  | 'missing_config'
  | 'undeclared_action'
  | 'dirty_repo'
  | 'wrong_branch'
  | 'missing_binary'
  | 'unsupported_host'
  | 'ambiguous_target'
  | 'deploy_class_not_opted_in'
  | 'execution_audit_failed'
  | 'execution_interrupted'
  | 'command_failed'
  | 'lifecycle_record_failed';

export interface ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord {
  record_kind: ProviderOperatorAutopilotLocalRolloutExecutionRecordKind;
  action_instance_id: string;
  action_id: string;
  issue_id: string;
  issue_identifier: string | null;
  preflight: {
    status: ProviderOperatorAutopilotLocalRolloutPreflightStatus;
    reason: ProviderOperatorAutopilotLocalRolloutPreflightReason | null;
    checked_at: string;
    summary: string;
  };
  started_at: string | null;
  ended_at: string;
  terminal_state: ProviderOperatorAutopilotLocalRolloutTerminalState;
  reason: ProviderOperatorAutopilotLocalRolloutPreflightReason | null;
  summary: string;
  command: {
    runner: ProviderOperatorAutopilotLocalRolloutRunnerKind | null;
    command: string | null;
    args: string[];
    cwd: string | null;
    timeout_ms: number | null;
  };
  exit_code: number | null;
  stdout: string | null;
  stderr: string | null;
}

export interface ProviderOperatorAutopilotLocalRolloutExecutionStore {
  version: 1;
  records: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[];
}

export interface ProviderOperatorAutopilotLocalRolloutCommandResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export type ProviderOperatorAutopilotLocalRolloutCommandRunner = (input: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
}) => Promise<ProviderOperatorAutopilotLocalRolloutCommandResult>;

export interface ProviderOperatorAutopilotLocalRolloutExecutionOutcome {
  attempts: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[];
  lifecycle_records: ProviderOperatorAutopilotLifecycleRecord[];
}

interface ExecuteLocalRolloutActionsDependencies {
  now?: () => string;
  platform?: NodeJS.Platform;
  runCommand?: ProviderOperatorAutopilotLocalRolloutCommandRunner;
  appendExecutionAttempt?: (
    record: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
  ) => Promise<void>;
  appendLifecycleRecord?: (record: ProviderOperatorAutopilotLifecycleRecord) => Promise<void>;
  fileExists?: (path: string) => Promise<boolean>;
}

export function resolveProviderOperatorAutopilotLocalRolloutExecutionPath(
  runDir: string
): string {
  return join(runDir, PROVIDER_OPERATOR_AUTOPILOT_LOCAL_ROLLOUT_EXECUTION_FILENAME);
}

export async function readProviderOperatorAutopilotLocalRolloutExecutionRecords(
  executionPath: string
): Promise<ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[]> {
  let raw: string;
  try {
    raw = await readFile(executionPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const parsed = JSON.parse(raw) as unknown;
  return parseExecutionStore(parsed).records;
}

export async function appendProviderOperatorAutopilotLocalRolloutExecutionRecord(
  executionPath: string,
  record: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
): Promise<ProviderOperatorAutopilotLocalRolloutExecutionStore> {
  return withExecutionWriteLock(executionPath, async () => {
    const records = await readProviderOperatorAutopilotLocalRolloutExecutionRecords(
      executionPath
    );
    const nextStore: ProviderOperatorAutopilotLocalRolloutExecutionStore = {
      version: 1,
      records: [...records, cloneLocalRolloutExecutionAttempt(record)]
    };
    await writeExecutionStore(executionPath, nextStore);
    return {
      version: 1,
      records: nextStore.records.map(cloneLocalRolloutExecutionAttempt)
    };
  });
}

export function cloneLocalRolloutExecutionAttempt(
  record: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord {
  return {
    record_kind: record.record_kind ?? 'terminal',
    action_instance_id: record.action_instance_id,
    action_id: record.action_id,
    issue_id: record.issue_id,
    issue_identifier: record.issue_identifier,
    preflight: { ...record.preflight },
    started_at: record.started_at,
    ended_at: record.ended_at,
    terminal_state: record.terminal_state,
    reason: record.reason,
    summary: record.summary,
    command: {
      runner: record.command.runner,
      command: record.command.command,
      args: [...record.command.args],
      cwd: record.command.cwd,
      timeout_ms: record.command.timeout_ms
    },
    exit_code: record.exit_code,
    stdout: record.stdout,
    stderr: record.stderr
  };
}

export function resolveProviderOperatorAutopilotLocalRolloutExecutionConfig(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutExecutionConfig {
  const postMergeRollout = asRecord(value);
  const execution = asRecord(
    postMergeRollout?.execution ?? postMergeRollout?.local_rollout_execution
  );
  const enabled = readBoolean(execution, 'enabled') ?? false;
  const actionValues = Array.isArray(execution?.actions) ? execution.actions : [];
  const actions = actionValues
    .map(parseActionConfig)
    .filter((action): action is ProviderOperatorAutopilotLocalRolloutActionConfig =>
      Boolean(action)
    )
    .sort(compareActionConfig);
  return { enabled, actions };
}

export function resolveEnabledLocalRolloutExecutionActionIds(
  config: ProviderOperatorAutopilotLocalRolloutExecutionConfig
): string[] {
  if (!config.enabled) {
    return [];
  }
  return uniqueStrings(
    config.actions.filter((action) => action.enabled).sort(compareActionConfig).map((action) => action.id)
  );
}

export async function executeProviderOperatorAutopilotLocalRolloutActions(
  input: {
    pendingActions: ProviderOperatorAutopilotPendingActionRecord[];
    config: ProviderOperatorAutopilotLocalRolloutExecutionConfig;
    repoRoot: string;
    priorAttempts?: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[];
  },
  deps: ExecuteLocalRolloutActionsDependencies = {}
): Promise<ProviderOperatorAutopilotLocalRolloutExecutionOutcome> {
  const now = deps.now ?? isoTimestamp;
  const platform = deps.platform ?? process.platform;
  const runCommand = deps.runCommand ?? runLocalRolloutCommand;
  const fileExists = deps.fileExists ?? defaultFileExists;
  const actionMap = buildActionConfigMap(input.config.actions);
  const priorAttempts = (input.priorAttempts ?? []).map(cloneLocalRolloutExecutionAttempt);
  const relevantAttempts: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[] = [];
  const lifecycleRecords: ProviderOperatorAutopilotLifecycleRecord[] = [];

  if (!input.config.enabled) {
    return { attempts: [], lifecycle_records: [] };
  }

  const priorByActionKey = new Map<
    string,
    ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
  >();
  const priorByActionKeyForEmptyProjection = new Map<
    string,
    ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
  >();
  for (const attempt of priorAttempts) {
    const attemptKey = executionAttemptKey(attempt);
    priorByActionKey.set(attemptKey, selectPriorExecutionAttempt(priorByActionKey.get(attemptKey), attempt));
    priorByActionKeyForEmptyProjection.set(
      attemptKey,
      selectPriorExecutionAttemptForProjection(
        priorByActionKeyForEmptyProjection.get(attemptKey),
        attempt
      )
    );
  }

  for (const pendingAction of input.pendingActions) {
    const actionIds = uniqueStrings(pendingAction.executable_action_ids ?? []);
    const succeededActionIds = new Set<string>();
    let sawNonSuccess = false;
    if (actionIds.length === 0) {
      appendPriorAttemptsForActionInstance({
        target: relevantAttempts,
        priorByActionKey: priorByActionKeyForEmptyProjection,
        actionInstanceId: pendingAction.action_instance_id
      });
      continue;
    }
    for (const actionId of actionIds) {
      const priorAttempt = priorByActionKey.get(
        `${pendingAction.action_instance_id}\u0000${actionId}`
      );
      if (priorAttempt && shouldReusePriorExecutionAttempt(priorAttempt)) {
        relevantAttempts.push(cloneLocalRolloutExecutionAttempt(priorAttempt));
        if (isSucceededTerminalAttempt(priorAttempt)) {
          succeededActionIds.add(actionId);
        } else {
          sawNonSuccess = true;
          break;
        }
        continue;
      }

      const actionResult = await runSingleLocalRolloutAction({
        action: actionMap.get(actionId) ?? null,
        actionId,
        pendingAction,
        repoRoot: input.repoRoot,
        now,
        platform,
        runCommand,
        fileExists,
        appendExecutionAttempt: deps.appendExecutionAttempt
      });
      const shouldAppendTerminalAttempt =
        Boolean(deps.appendExecutionAttempt) && actionResult.appendTerminalAttempt;
      const recordsReadyForProjection = shouldAppendTerminalAttempt
        ? actionResult.records.filter((record) => record !== actionResult.terminalAttempt)
        : actionResult.records;
      for (const record of recordsReadyForProjection) {
        relevantAttempts.push(cloneLocalRolloutExecutionAttempt(record));
      }
      const attempt = actionResult.terminalAttempt;
      let terminalAttemptPersisted = false;
      if (!actionResult.appendTerminalAttempt) {
        terminalAttemptPersisted = false;
      }
      if (deps.appendExecutionAttempt && actionResult.appendTerminalAttempt) {
        try {
          await deps.appendExecutionAttempt(attempt);
          terminalAttemptPersisted = true;
          relevantAttempts.push(cloneLocalRolloutExecutionAttempt(attempt));
        } catch {
          const failedAttempt = buildSyntheticAttempt({
            pendingAction,
            actionId,
            now,
            state: 'failed',
            reason: 'execution_audit_failed',
            summary:
              'Local rollout command finished, but terminal execution audit persistence failed.'
          });
          relevantAttempts.push(cloneLocalRolloutExecutionAttempt(failedAttempt));
        }
      }
      if (isSucceededTerminalAttempt(attempt) && terminalAttemptPersisted) {
        succeededActionIds.add(actionId);
      } else {
        sawNonSuccess = true;
        break;
      }
    }

    if (!sawNonSuccess && succeededActionIds.size === actionIds.length) {
      if (!deps.appendLifecycleRecord) {
        const failedAttempt = buildSyntheticAttempt({
          pendingAction,
          actionId: actionIds.at(-1) ?? 'unknown',
          now,
          state: 'failed',
          reason: 'lifecycle_record_failed',
          summary:
            'Local rollout actions succeeded, but lifecycle clear persistence is unavailable.'
        });
        relevantAttempts.push(cloneLocalRolloutExecutionAttempt(failedAttempt));
        continue;
      }
      const lifecycleRecord: ProviderOperatorAutopilotLifecycleRecord = {
        action_instance_id: pendingAction.action_instance_id,
        kind: 'local_rollout',
        issue_id: pendingAction.issue_id,
        issue_identifier: pendingAction.issue_identifier,
        state: 'cleared',
        actor: 'operator-autopilot',
        reason: `unattended local rollout actions succeeded: ${actionIds.join(', ')}`,
        recorded_at: now(),
        source: 'operator-autopilot'
      };
      try {
        await deps.appendLifecycleRecord(lifecycleRecord);
        lifecycleRecords.push(lifecycleRecord);
      } catch {
        const failedAttempt = buildSyntheticAttempt({
          pendingAction,
          actionId: actionIds.at(-1) ?? 'unknown',
          now,
          state: 'failed',
          reason: 'lifecycle_record_failed',
          summary: 'Local rollout actions succeeded, but lifecycle clear persistence failed.'
        });
        relevantAttempts.push(cloneLocalRolloutExecutionAttempt(failedAttempt));
      }
    }
  }

  return {
    attempts: relevantAttempts.map(cloneLocalRolloutExecutionAttempt),
    lifecycle_records: lifecycleRecords
  };
}

function appendPriorAttemptsForActionInstance(input: {
  target: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[];
  priorByActionKey: Map<string, ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord>;
  actionInstanceId: string;
}): void {
  for (const attempt of input.priorByActionKey.values()) {
    if (attempt.action_instance_id !== input.actionInstanceId) {
      continue;
    }
    input.target.push(cloneLocalRolloutExecutionAttempt(attempt));
  }
}

function parseActionConfig(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutActionConfig | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const id = readNonEmptyString(record, 'id');
  const runner = normalizeRunnerKind(record.runner);
  if (!id || !runner) {
    return null;
  }
  const platformConfig = readPlatformArray(record, 'supported_platforms', 'supportedPlatforms');
  return {
    id,
    enabled: readBoolean(record, 'enabled') ?? false,
    order: readInteger(record, 'order') ?? Number.MAX_SAFE_INTEGER,
    runner,
    args: readStringArray(record, 'args') ?? [],
    script: readNonEmptyString(record, 'script'),
    timeout_ms:
      readPositiveInteger(record, 'timeout_ms', 'timeoutMs') ??
      DEFAULT_LOCAL_ROLLOUT_EXECUTION_TIMEOUT_MS,
    require_clean_repo: readBoolean(record, 'require_clean_repo', 'requireCleanRepo') ?? true,
    required_branch: readNonEmptyString(record, 'required_branch', 'requiredBranch'),
    supported_platforms: platformConfig?.supported ?? [],
    invalid_supported_platforms: platformConfig?.invalid ?? [],
    deploy_class: readBoolean(record, 'deploy_class', 'deployClass') ?? false,
    deploy_opt_in: readBoolean(record, 'deploy_opt_in', 'deployOptIn') ?? false,
    requires_issue_identifier:
      readBoolean(record, 'requires_issue_identifier', 'requiresIssueIdentifier') ?? false
  };
}

function compareActionConfig(
  left: ProviderOperatorAutopilotLocalRolloutActionConfig,
  right: ProviderOperatorAutopilotLocalRolloutActionConfig
): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }
  return left.id.localeCompare(right.id);
}

function buildActionConfigMap(
  actions: ProviderOperatorAutopilotLocalRolloutActionConfig[]
): Map<string, ProviderOperatorAutopilotLocalRolloutActionConfig> {
  const actionMap = new Map<string, ProviderOperatorAutopilotLocalRolloutActionConfig>();
  for (const action of [...actions].sort(compareActionConfig)) {
    const existing = actionMap.get(action.id);
    if (!existing || (!existing.enabled && action.enabled)) {
      actionMap.set(action.id, action);
    }
  }
  return actionMap;
}

async function runSingleLocalRolloutAction(input: {
  action: ProviderOperatorAutopilotLocalRolloutActionConfig | null;
  actionId: string;
  pendingAction: ProviderOperatorAutopilotPendingActionRecord;
  repoRoot: string;
  now: () => string;
  platform: NodeJS.Platform;
  runCommand: ProviderOperatorAutopilotLocalRolloutCommandRunner;
  fileExists: (path: string) => Promise<boolean>;
  appendExecutionAttempt?: (
    record: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
  ) => Promise<void>;
}): Promise<{
  records: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord[];
  terminalAttempt: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord;
  appendTerminalAttempt: boolean;
}> {
  const checkedAt = input.now();
  if (!input.appendExecutionAttempt) {
    const failedAttempt = buildAttempt({
      pendingAction: input.pendingAction,
      actionId: input.actionId,
      preflight: {
        status: 'failed',
        reason: 'execution_audit_failed',
        checked_at: checkedAt,
        summary:
          'Local rollout action was not launched because execution audit persistence is unavailable.'
      },
      startedAt: null,
      endedAt: input.now(),
      terminalState: 'failed',
      reason: 'execution_audit_failed',
      summary:
        'Local rollout action was not launched because execution audit persistence is unavailable.',
      command: {
        runner: input.action?.runner ?? null,
        command: null,
        args: [],
        cwd: input.repoRoot,
        timeout_ms: input.action?.timeout_ms ?? null
      },
      exitCode: null,
      stdout: null,
      stderr: null
    });
    return {
      records: [failedAttempt],
      terminalAttempt: failedAttempt,
      appendTerminalAttempt: false
    };
  }
  const preflight = await preflightLocalRolloutAction(input);
  if (preflight.status !== 'passed' || !preflight.command) {
    const attempt = buildAttempt({
      pendingAction: input.pendingAction,
      actionId: input.actionId,
      preflight: {
        status: preflight.status,
        reason: preflight.reason,
        checked_at: checkedAt,
        summary: preflight.summary
      },
      startedAt: null,
      endedAt: input.now(),
      terminalState: preflight.status === 'failed' ? 'failed' : 'skipped',
      reason: preflight.reason,
      summary: preflight.summary,
      command: preflight.command,
      exitCode: null,
      stdout: null,
      stderr: null
    });
    return { records: [attempt], terminalAttempt: attempt, appendTerminalAttempt: true };
  }

  const command = preflight.command;
  if (!command.command || !command.cwd || command.timeout_ms === null) {
    const attempt = buildAttempt({
      pendingAction: input.pendingAction,
      actionId: input.actionId,
      preflight: {
        status: 'skipped',
        reason: 'missing_binary',
        checked_at: checkedAt,
        summary: `Local rollout action ${input.actionId} could not resolve its runner binary.`
      },
      startedAt: null,
      endedAt: input.now(),
      terminalState: 'skipped',
      reason: 'missing_binary',
      summary: `Local rollout action ${input.actionId} could not resolve its runner binary.`,
      command,
      exitCode: null,
      stdout: null,
      stderr: null
    });
    return { records: [attempt], terminalAttempt: attempt, appendTerminalAttempt: true };
  }

  const startedAt = input.now();
  const startedAttempt = buildAttempt({
    pendingAction: input.pendingAction,
    actionId: input.actionId,
    recordKind: 'started',
    preflight: {
      status: 'passed',
      reason: null,
      checked_at: checkedAt,
      summary: 'Local rollout action preflight passed.'
    },
    startedAt,
    endedAt: startedAt,
    terminalState: 'failed',
    reason: 'execution_interrupted',
    summary: `Local rollout action ${input.actionId} started; terminal result has not been recorded.`,
    command: preflight.command,
    exitCode: null,
    stdout: null,
    stderr: null
  });
  try {
    await input.appendExecutionAttempt?.(startedAttempt);
  } catch {
    const failedAttempt = buildAttempt({
      pendingAction: input.pendingAction,
      actionId: input.actionId,
      preflight: {
        status: 'failed',
        reason: 'execution_audit_failed',
        checked_at: checkedAt,
        summary:
          'Local rollout action preflight passed, but started audit persistence failed.'
      },
      startedAt: null,
      endedAt: input.now(),
      terminalState: 'failed',
      reason: 'execution_audit_failed',
      summary:
        'Local rollout action was not launched because started audit persistence failed.',
      command: preflight.command,
      exitCode: null,
      stdout: null,
      stderr: null
    });
    return {
      records: [failedAttempt],
      terminalAttempt: failedAttempt,
      appendTerminalAttempt: false
    };
  }
  const result = await input.runCommand({
    command: command.command,
    args: command.args,
    cwd: command.cwd,
    timeoutMs: command.timeout_ms
  });
  const endedAt = input.now();
  const terminalAttempt = buildAttempt({
    pendingAction: input.pendingAction,
    actionId: input.actionId,
    preflight: {
      status: 'passed',
      reason: null,
      checked_at: checkedAt,
      summary: 'Local rollout action preflight passed.'
    },
    startedAt,
    endedAt,
    terminalState: result.ok ? 'succeeded' : 'failed',
    reason: result.ok ? null : 'command_failed',
    summary: result.ok
      ? `Executed local rollout action ${input.actionId}.`
      : `Local rollout action ${input.actionId} failed.`,
    command: preflight.command,
    exitCode: result.exitCode,
    stdout: normalizeCommandText(result.stdout),
    stderr: normalizeCommandText(result.stderr)
  });
  return {
    records: [startedAttempt, terminalAttempt],
    terminalAttempt,
    appendTerminalAttempt: true
  };
}

async function preflightLocalRolloutAction(input: {
  action: ProviderOperatorAutopilotLocalRolloutActionConfig | null;
  actionId: string;
  pendingAction: ProviderOperatorAutopilotPendingActionRecord;
  repoRoot: string;
  platform: NodeJS.Platform;
  runCommand: ProviderOperatorAutopilotLocalRolloutCommandRunner;
  fileExists: (path: string) => Promise<boolean>;
}): Promise<{
  status: ProviderOperatorAutopilotLocalRolloutPreflightStatus;
  reason: ProviderOperatorAutopilotLocalRolloutPreflightReason | null;
  summary: string;
  command: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord['command'] | null;
}> {
  const action = input.action;
  if (!action) {
    return preflightSkip('undeclared_action', `Local rollout action ${input.actionId} is not declared.`);
  }
  if (!action.enabled) {
    return preflightSkip('missing_config', `Local rollout action ${action.id} is disabled.`);
  }
  if (action.deploy_class && !action.deploy_opt_in) {
    return preflightSkip(
      'deploy_class_not_opted_in',
      `Deploy-class local rollout action ${action.id} is not explicitly opted in.`
    );
  }
  if (action.invalid_supported_platforms.length > 0) {
    return preflightSkip(
      'unsupported_host',
      `Local rollout action ${action.id} has unsupported platform entries: ${action.invalid_supported_platforms.join(', ')}.`
    );
  }
  if (
    action.supported_platforms.length > 0 &&
    !action.supported_platforms.includes(input.platform)
  ) {
    return preflightSkip(
      'unsupported_host',
      `Local rollout action ${action.id} does not support host platform ${input.platform}.`
    );
  }
  if (action.requires_issue_identifier && !input.pendingAction.issue_identifier) {
    return preflightSkip(
      'ambiguous_target',
      `Local rollout action ${action.id} requires an issue identifier.`
    );
  }
  if (action.require_clean_repo) {
    const statusResult = await input.runCommand({
      command: 'git',
      args: ['-C', input.repoRoot, 'status', '--porcelain'],
      cwd: input.repoRoot,
      timeoutMs: DEFAULT_LOCAL_ROLLOUT_EXECUTION_TIMEOUT_MS
    });
    if (!statusResult.ok || normalizeCommandText(statusResult.stdout)) {
      return preflightSkip(
        'dirty_repo',
        `Local rollout action ${action.id} requires a clean repository.`
      );
    }
  }
  if (action.required_branch) {
    const branchResult = await input.runCommand({
      command: 'git',
      args: ['-C', input.repoRoot, 'branch', '--show-current'],
      cwd: input.repoRoot,
      timeoutMs: DEFAULT_LOCAL_ROLLOUT_EXECUTION_TIMEOUT_MS
    });
    const currentBranch = normalizeCommandText(branchResult.stdout);
    if (!branchResult.ok || currentBranch !== action.required_branch) {
      return preflightSkip(
        'wrong_branch',
        `Local rollout action ${action.id} requires branch ${action.required_branch}; current branch is ${currentBranch || 'detached'}.`
      );
    }
  }
  const command = await resolveActionCommand({
    action,
    repoRoot: input.repoRoot,
    platform: input.platform,
    fileExists: input.fileExists
  });
  if (!command) {
    return preflightSkip(
      'missing_binary',
      `Local rollout action ${action.id} could not resolve its runner binary.`
    );
  }
  return {
    status: 'passed',
    reason: null,
    summary: 'Local rollout action preflight passed.',
    command
  };
}

function preflightSkip(
  reason: ProviderOperatorAutopilotLocalRolloutPreflightReason,
  summary: string
): {
  status: ProviderOperatorAutopilotLocalRolloutPreflightStatus;
  reason: ProviderOperatorAutopilotLocalRolloutPreflightReason;
  summary: string;
  command: null;
} {
  return {
    status: reason === 'command_failed' || reason === 'lifecycle_record_failed' ? 'failed' : 'skipped',
    reason,
    summary,
    command: null
  };
}

async function resolveActionCommand(input: {
  action: ProviderOperatorAutopilotLocalRolloutActionConfig;
  repoRoot: string;
  platform?: NodeJS.Platform;
  fileExists: (path: string) => Promise<boolean>;
}): Promise<ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord['command'] | null> {
  if (input.action.runner === 'codex_orchestrator') {
    const cliPath = join(input.repoRoot, 'bin', 'codex-orchestrator.js');
    if (!(await input.fileExists(cliPath))) {
      return null;
    }
    return {
      runner: 'codex_orchestrator',
      command: process.execPath,
      args: [cliPath, ...input.action.args],
      cwd: input.repoRoot,
      timeout_ms: input.action.timeout_ms
    };
  }
  if (input.action.runner === 'npm_script') {
    if (!input.action.script) {
      return null;
    }
    const packageJsonPath = join(input.repoRoot, 'package.json');
    if (!(await input.fileExists(packageJsonPath))) {
      return null;
    }
    return {
      runner: 'npm_script',
      command: input.platform === 'win32' ? 'npm.cmd' : 'npm',
      args: [
        'run',
        input.action.script,
        ...(input.action.args.length > 0 ? ['--', ...input.action.args] : [])
      ],
      cwd: input.repoRoot,
      timeout_ms: input.action.timeout_ms
    };
  }
  return null;
}

function buildSyntheticAttempt(input: {
  pendingAction: ProviderOperatorAutopilotPendingActionRecord;
  actionId: string;
  now: () => string;
  state: ProviderOperatorAutopilotLocalRolloutTerminalState;
  reason: ProviderOperatorAutopilotLocalRolloutPreflightReason;
  summary: string;
}): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord {
  const at = input.now();
  return buildAttempt({
    pendingAction: input.pendingAction,
    actionId: input.actionId,
    preflight: {
      status: 'failed',
      reason: input.reason,
      checked_at: at,
      summary: input.summary
    },
    startedAt: null,
    endedAt: at,
    terminalState: input.state,
    reason: input.reason,
    summary: input.summary,
    command: null,
    exitCode: null,
    stdout: null,
    stderr: null
  });
}

function buildAttempt(input: {
  pendingAction: ProviderOperatorAutopilotPendingActionRecord;
  actionId: string;
  recordKind?: ProviderOperatorAutopilotLocalRolloutExecutionRecordKind;
  preflight: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord['preflight'];
  startedAt: string | null;
  endedAt: string;
  terminalState: ProviderOperatorAutopilotLocalRolloutTerminalState;
  reason: ProviderOperatorAutopilotLocalRolloutPreflightReason | null;
  summary: string;
  command: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord['command'] | null;
  exitCode: number | null;
  stdout: string | null;
  stderr: string | null;
}): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord {
  return {
    record_kind: input.recordKind ?? 'terminal',
    action_instance_id: input.pendingAction.action_instance_id,
    action_id: input.actionId,
    issue_id: input.pendingAction.issue_id,
    issue_identifier: input.pendingAction.issue_identifier,
    preflight: input.preflight,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    terminal_state: input.terminalState,
    reason: input.reason,
    summary: input.summary,
    command: input.command ?? {
      runner: null,
      command: null,
      args: [],
      cwd: null,
      timeout_ms: null
    },
    exit_code: input.exitCode,
    stdout: input.stdout,
    stderr: input.stderr
  };
}

function selectPriorExecutionAttempt(
  existing:
    | ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
    | undefined,
  candidate: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord {
  if (!existing) {
    return candidate;
  }
  if (
    candidate.reason === 'lifecycle_record_failed' &&
    isSucceededTerminalAttempt(existing)
  ) {
    return existing;
  }
  if (candidate.record_kind === 'terminal') {
    return candidate;
  }
  if (existing.record_kind === 'terminal') {
    return existing;
  }
  return candidate;
}

function selectPriorExecutionAttemptForProjection(
  existing:
    | ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
    | undefined,
  candidate: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord {
  if (!existing) {
    return candidate;
  }
  if (candidate.record_kind === 'terminal') {
    return candidate;
  }
  if (existing.record_kind === 'terminal') {
    return existing;
  }
  return candidate;
}

function shouldReusePriorExecutionAttempt(
  attempt: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
): boolean {
  if (attempt.record_kind === 'started') {
    return true;
  }
  return attempt.terminal_state !== 'skipped';
}

function isSucceededTerminalAttempt(
  attempt: ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
): boolean {
  return attempt.record_kind === 'terminal' && attempt.terminal_state === 'succeeded';
}

async function runLocalRolloutCommand(input: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
}): Promise<ProviderOperatorAutopilotLocalRolloutCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(input.command, input.args, {
      cwd: input.cwd,
      timeout: input.timeoutMs,
      maxBuffer: 10 * 1024 * 1024
    });
    return { ok: true, exitCode: 0, stdout, stderr };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      code?: string | number;
      stdout?: string;
      stderr?: string;
    };
    return {
      ok: false,
      exitCode: typeof execError.code === 'number' ? execError.code : null,
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? execError.message
    };
  }
}

function executionAttemptKey(
  attempt: Pick<
    ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord,
    'action_instance_id' | 'action_id'
  >
): string {
  return `${attempt.action_instance_id}\u0000${attempt.action_id}`;
}

async function defaultFileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeCommandText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

async function writeExecutionStore(
  executionPath: string,
  store: ProviderOperatorAutopilotLocalRolloutExecutionStore
): Promise<void> {
  await mkdir(dirname(executionPath), { recursive: true });
  const tempPath = `${executionPath}.${process.pid}.${Date.now()}.${Math.random()
    .toString(16)
    .slice(2)}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    await rename(tempPath, executionPath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function withExecutionWriteLock<T>(
  executionPath: string,
  body: () => Promise<T>
): Promise<T> {
  const lockPath = `${executionPath}.lock`;
  const lock = await acquireLockWithRetry({
    taskId: 'provider-operator-autopilot-local-rollout-execution',
    lockPath,
    retry: LOCAL_ROLLOUT_EXECUTION_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(lockPath), { recursive: true });
    },
    createError: (_taskId, attempts) =>
      new Error(
        `Timed out waiting for local rollout execution store lock after ${attempts} attempts.`
      )
  });
  try {
    return await body();
  } finally {
    await lock.release();
  }
}

function parseExecutionStore(value: unknown): ProviderOperatorAutopilotLocalRolloutExecutionStore {
  const record = asRecord(value);
  if (!record || record.version !== 1 || !Array.isArray(record.records)) {
    throw new Error('Operator autopilot local rollout execution store is malformed.');
  }
  const records = record.records.map(parseExecutionAttemptRecord);
  if (records.some((entry) => entry === null)) {
    throw new Error(
      'Operator autopilot local rollout execution store contains malformed records.'
    );
  }
  return {
    version: 1,
    records: records.map((entry) =>
      cloneLocalRolloutExecutionAttempt(
        entry as ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord
      )
    )
  };
}

function parseExecutionAttemptRecord(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutExecutionAttemptRecord | null {
  const record = asRecord(value);
  const preflight = asRecord(record?.preflight);
  const command = asRecord(record?.command);
  if (!record || !preflight || !command) {
    return null;
  }
  const actionInstanceId = readNonEmptyString(record, 'action_instance_id');
  const actionId = readNonEmptyString(record, 'action_id');
  const issueId = readNonEmptyString(record, 'issue_id');
  const checkedAt = readNonEmptyString(preflight, 'checked_at');
  const endedAt = readNonEmptyString(record, 'ended_at');
  const terminalState = normalizeTerminalState(record.terminal_state);
  const preflightStatus = normalizePreflightStatus(preflight.status);
  const preflightReason = normalizePreflightReason(preflight.reason);
  const reason = normalizePreflightReason(record.reason);
  if (!actionInstanceId || !actionId || !issueId || !checkedAt || !endedAt || !terminalState || !preflightStatus) {
    return null;
  }
  return {
    record_kind: normalizeExecutionRecordKind(record.record_kind),
    action_instance_id: actionInstanceId,
    action_id: actionId,
    issue_id: issueId,
    issue_identifier: readOptionalString(record, 'issue_identifier'),
    preflight: {
      status: preflightStatus,
      reason: preflightReason,
      checked_at: checkedAt,
      summary: readNonEmptyString(preflight, 'summary') ?? ''
    },
    started_at: readOptionalString(record, 'started_at'),
    ended_at: endedAt,
    terminal_state: terminalState,
    reason,
    summary: readNonEmptyString(record, 'summary') ?? '',
    command: {
      runner: normalizeRunnerKind(command.runner),
      command: readOptionalString(command, 'command'),
      args: readStringArray(command, 'args') ?? [],
      cwd: readOptionalString(command, 'cwd'),
      timeout_ms: readInteger(command, 'timeout_ms')
    },
    exit_code: readInteger(record, 'exit_code'),
    stdout: readOptionalString(record, 'stdout'),
    stderr: readOptionalString(record, 'stderr')
  };
}

function normalizeRunnerKind(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutRunnerKind | null {
  return value === 'codex_orchestrator' || value === 'npm_script' ? value : null;
}

function normalizeTerminalState(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutTerminalState | null {
  return value === 'succeeded' || value === 'skipped' || value === 'failed'
    ? value
    : null;
}

function normalizeExecutionRecordKind(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutExecutionRecordKind {
  return value === 'started' || value === 'terminal' ? value : 'terminal';
}

function normalizePreflightStatus(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutPreflightStatus | null {
  return value === 'passed' || value === 'skipped' || value === 'failed' ? value : null;
}

function normalizePreflightReason(
  value: unknown
): ProviderOperatorAutopilotLocalRolloutPreflightReason | null {
  return value === 'missing_config' ||
    value === 'undeclared_action' ||
    value === 'dirty_repo' ||
    value === 'wrong_branch' ||
    value === 'missing_binary' ||
    value === 'unsupported_host' ||
    value === 'ambiguous_target' ||
    value === 'deploy_class_not_opted_in' ||
    value === 'execution_audit_failed' ||
    value === 'execution_interrupted' ||
    value === 'command_failed' ||
    value === 'lifecycle_record_failed'
    ? value
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function readBoolean(record: Record<string, unknown> | null | undefined, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return null;
}

function readNonEmptyString(record: Record<string, unknown> | null | undefined, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readOptionalString(record: Record<string, unknown> | null | undefined, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readStringArray(record: Record<string, unknown> | null | undefined, ...keys: string[]): string[] | null {
  for (const key of keys) {
    const value = record?.[key];
    if (!Array.isArray(value)) {
      continue;
    }
    const strings = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
    return strings;
  }
  return null;
}

function readPlatformArray(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): { supported: NodeJS.Platform[]; invalid: string[] } | null {
  for (const key of keys) {
    if (!record || !(key in record)) {
      continue;
    }
    const values = record[key];
    if (!Array.isArray(values)) {
      return { supported: [], invalid: [formatInvalidPlatformEntry(values)] };
    }
    const supported: NodeJS.Platform[] = [];
    const invalid: string[] = [];
    for (const value of values) {
      if (typeof value !== 'string') {
        invalid.push(formatInvalidPlatformEntry(value));
        continue;
      }
      const platform = value.trim();
      if (!platform) {
        invalid.push(formatInvalidPlatformEntry(value));
      } else if (SUPPORTED_NODE_PLATFORMS.has(platform as NodeJS.Platform)) {
        supported.push(platform as NodeJS.Platform);
      } else {
        invalid.push(platform);
      }
    }
    return { supported, invalid };
  }
  return null;
}

function formatInvalidPlatformEntry(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim() || '<blank>';
  }
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return '<non-string>';
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function readInteger(record: Record<string, unknown> | null | undefined, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }
  }
  return null;
}

function readPositiveInteger(record: Record<string, unknown> | null | undefined, ...keys: string[]): number | null {
  const value = readInteger(record, ...keys);
  return value !== null && value > 0 ? value : null;
}
