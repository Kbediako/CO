#!/usr/bin/env node
import { existsSync, realpathSync } from 'node:fs';
import { opendir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { CodexOrchestrator } from '../orchestrator/src/cli/orchestrator.js';
import { type ExecOutputMode } from '../orchestrator/src/cli/exec/command.js';
import { runExecCliShell, type RunExecCliShellParams } from '../orchestrator/src/cli/execCliShell.js';
import { resolveEnvironmentPaths } from '../scripts/lib/run-manifests.js';
import { normalizeEnvironmentPaths, sanitizeTaskId } from '../orchestrator/src/cli/run/environment.js';
import { RunEventEmitter } from '../orchestrator/src/cli/events/runEvents.js';
import type { HudController } from '../orchestrator/src/cli/ui/controller.js';
import { evaluateInteractiveGate } from '../orchestrator/src/cli/utils/interactive.js';
import { buildSelfCheckResult } from '../orchestrator/src/cli/selfCheck.js';
import {
  runDoctor
} from '../orchestrator/src/cli/doctor.js';
import { runDoctorUsage } from '../orchestrator/src/cli/doctorUsage.js';
import { runDoctorCliShell } from '../orchestrator/src/cli/doctorCliShell.js';
import {
  formatDoctorIssueLogSummary,
  type DoctorIssueLogResult,
  writeDoctorIssueLog
} from '../orchestrator/src/cli/doctorIssueLog.js';
import { runInitCliShell } from '../orchestrator/src/cli/initCliShell.js';
import { runCodexCliShell } from '../orchestrator/src/cli/codexCliShell.js';
import { runDevtoolsCliShell } from '../orchestrator/src/cli/devtoolsCliShell.js';
import { runDelegationCliShell } from '../orchestrator/src/cli/delegationCliShell.js';
import { runLinearCliShell } from '../orchestrator/src/cli/linearCliShell.js';
import { runSkillsCliShell } from '../orchestrator/src/cli/skillsCliShell.js';
import { runFlowCliRequestShell } from '../orchestrator/src/cli/flowCliRequestShell.js';
import { runStartCliRequestShell } from '../orchestrator/src/cli/startCliRequestShell.js';
import { runFrontendTestCliShell } from '../orchestrator/src/cli/frontendTestCliShell.js';
import { runFrontendTestCliRequestShell } from '../orchestrator/src/cli/frontendTestCliRequestShell.js';
import { runPlanCliShell } from '../orchestrator/src/cli/planCliShell.js';
import { runDoctorCliRequestShell } from '../orchestrator/src/cli/doctorCliRequestShell.js';
import { runRlmCliRequestShell } from '../orchestrator/src/cli/rlmCliRequestShell.js';
import { runRlmCompletionCliShell } from '../orchestrator/src/cli/rlmCompletionCliShell.js';
import { runResumeCliShell } from '../orchestrator/src/cli/resumeCliShell.js';
import { runStatusCliShell } from '../orchestrator/src/cli/statusCliShell.js';
import { runSelfCheckCliShell } from '../orchestrator/src/cli/selfCheckCliShell.js';
import { printSetupCliHelp, runSetupCliShell } from '../orchestrator/src/cli/setupCliShell.js';
import { runReviewCliLaunchShell } from '../orchestrator/src/cli/reviewCliLaunchShell.js';
import { findPackageRoot, loadPackageInfo } from '../orchestrator/src/cli/utils/packageInfo.js';
import { slugify } from '../orchestrator/src/cli/utils/strings.js';
import { serveMcp } from '../orchestrator/src/cli/mcp.js';
import { runMcpEnableCliShell } from '../orchestrator/src/cli/mcpEnableCliShell.js';
import { runDelegationServerCliShell } from '../orchestrator/src/cli/delegationServerCliShell.js';
import {
  DEFAULT_PROVIDER_START_PIPELINE_ID,
  runControlHostCliShell
} from '../orchestrator/src/cli/controlHostCliShell.js';
import { runControlHostProviderWorkerRecoverCliShell } from '../orchestrator/src/cli/controlHostProviderWorkerRecoverCliShell.js';
import { runControlHostFreshnessGaugeCliShell } from '../orchestrator/src/cli/controlHostFreshnessGaugeCliShell.js';
import { runControlHostSupervisionCliShell } from '../orchestrator/src/cli/controlHostSupervisionCliShell.js';
import { runCoStatusAttachCliShell } from '../orchestrator/src/cli/coStatusAttachCliShell.js';
import { runCoStatusCliShell } from '../orchestrator/src/cli/coStatusCliShell.js';
import { runCoStatusOperatorAutopilotCliShell } from '../orchestrator/src/cli/coStatusOperatorAutopilotCliShell.js';
import { runHygieneCliShell } from '../orchestrator/src/cli/quotaHygieneCliShell.js';
import {
  CONFIG_AUTHORITY_MODE_ENV_KEY,
  REPO_CONFIG_REQUIRED_ENV_KEY,
  resolveConfigAuthorityMode,
  type ConfigAuthorityMode
} from '../orchestrator/src/cli/config/repoConfigPolicy.js';

type ArgMap = Record<string, string | boolean>;
type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';
type RuntimeModeOption = 'cli' | 'appserver';
const AUTO_ISSUE_LOG_ENV_KEY = 'CODEX_ORCHESTRATOR_AUTO_ISSUE_LOG';

interface RunOutputPayload {
  run_id: string;
  status: string;
  artifact_root: string;
  manifest: string;
  log_path: string | null;
  summary: string | null;
  runtime_mode_requested: string | null;
  runtime_mode: string | null;
  runtime_provider: string | null;
  config_resolution: {
    mode: string;
    reason: string;
    config_source: string | null;
  } | null;
  runtime_fallback: {
    occurred: boolean;
    policy?: string;
    policy_source?: string;
    code: string | null;
    reason: string | null;
    from_mode: string | null;
    to_mode: string | null;
    original_target?: string | null;
    fallback_target?: string | null;
    blocking_reason?: string | null;
    checked_at: string | null;
  } | null;
  cloud_fallback: {
    policy?: string;
    policy_source?: string;
    original_target?: string | null;
    fallback_target?: string | null;
    blocking_reason?: string | null;
    reason: string;
  } | null;
  cloud_fallback_reason: string | null;
  issue_log: DoctorIssueLogResult | null;
  issue_log_error: string | null;
}

function writeStderrLine(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function isDirectExecution(entryArg = process.argv[1], metaUrl = import.meta.url): boolean {
  if (typeof entryArg !== 'string' || entryArg.length === 0) {
    return false;
  }

  const candidateUrls = new Set<string>();
  try {
    candidateUrls.add(pathToFileURL(resolve(entryArg)).href);
  } catch {
    // Fall through to the realpath check so missing/cwd issues still fail closed.
  }
  try {
    candidateUrls.add(pathToFileURL(realpathSync(entryArg)).href);
  } catch {
    // Missing or unreadable entry points should not be treated as direct execution.
  }
  return candidateUrls.has(metaUrl);
}

export async function runCodexOrchestratorCli(rawArgs: string[] = process.argv.slice(2)): Promise<number> {
  process.exitCode = 0;
  const args = [...rawArgs];
  const command = args.shift();
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }
  if (command === '--version' || command === '-v') {
    printVersion();
    return 0;
  }

  try {
    const orchestrator = new CodexOrchestrator();
    switch (command) {
      case 'start':
        await handleStart(orchestrator, args);
        break;
      case 'frontend-test':
        await handleFrontendTest(orchestrator, args);
        break;
      case 'flow':
        await handleFlow(orchestrator, args);
        break;
      case 'review':
        await handleReview(args);
        break;
      case 'plan':
        await handlePlan(orchestrator, args);
        break;
      case 'rlm':
        await handleRlm(orchestrator, args);
        break;
      case 'resume':
        await handleResume(orchestrator, args);
        break;
      case 'status':
        await handleStatus(orchestrator, args);
        break;
      case 'control-host':
        await handleControlHost(args);
        break;
      case 'co-status':
        await handleCoStatus(args);
        break;
      case 'hygiene':
        await handleHygiene(args);
        break;
      case 'exec':
        await handleExec(args);
        break;
      case 'self-check':
        await handleSelfCheck(args);
        break;
      case 'init':
        await handleInit(args);
        break;
      case 'setup':
        await handleSetup(args);
        break;
      case 'doctor':
        await handleDoctor(args);
        break;
      case 'codex':
        await handleCodex(args);
        break;
      case 'linear':
        await handleLinear(args);
        break;
      case 'devtools':
        await handleDevtools(args);
        break;
      case 'skills':
        await handleSkills(args);
        break;
      case 'mcp':
        await handleMcp(args);
        break;
      case 'pr':
        await handlePr(args);
        break;
      case 'delegate-server':
      case 'delegation-server':
        await handleDelegationServer(args);
        break;
      case 'delegation':
        await handleDelegation(args);
        break;
      case 'version':
        printVersion();
        break;
      default:
        writeStderrLine(`Unknown command: ${command}`);
        printHelp();
        process.exitCode = 1;
    }
  } catch (error) {
    writeStderrLine((error as Error)?.message ?? String(error));
    process.exitCode = 1;
  }

  return typeof process.exitCode === 'number' ? process.exitCode : 0;
}

function parseArgs(raw: string[]): { positionals: string[]; flags: ArgMap } {
  const positionals: string[] = [];
  const flags: ArgMap = {};
  const queue = [...raw];
  const booleanFlagKeys = new Set([
    'apply',
    'auto-issue-log',
    'blocked-by-source',
    'cloud',
    'cloud-preflight',
    'codex-cli',
    'codex-force',
    'collab',
    'devtools',
    'dry-run',
    'force',
    'help',
    'interactive',
    'issue-log',
    'machine-status',
    'multi-agent',
    'no-interactive',
    'repo-config-required',
    'refresh-skills',
    'ui',
    'usage',
    'watch',
    'yes'
  ]);
  const parseBooleanLiteral = (value: string): boolean | undefined => {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return undefined;
  };
  const coerceFlagValue = (key: string, value: string): string | boolean => {
    if (!booleanFlagKeys.has(key)) {
      return value;
    }
    const parsed = parseBooleanLiteral(value);
    return parsed === undefined ? value : parsed;
  };
  while (queue.length > 0) {
    const token = queue.shift();
    if (!token) {
      break;
    }
    if (token === '--') {
      positionals.push(...queue);
      break;
    }
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    if (key.includes('=')) {
      const separatorIndex = key.indexOf('=');
      const flagKey = key.slice(0, separatorIndex);
      const inlineValue = key.slice(separatorIndex + 1);
      flags[flagKey] = coerceFlagValue(flagKey, inlineValue);
      continue;
    }
    if (queue[0] && !queue[0]!.startsWith('--')) {
      flags[key] = coerceFlagValue(key, queue.shift() as string);
    } else {
      flags[key] = true;
    }
  }
  return { positionals, flags };
}

function resolveTargetStageId(flags: ArgMap): string | undefined {
  const target = flags['target'];
  if (typeof target === 'string' && target.trim().length > 0) {
    return target.trim();
  }
  const alias = flags['target-stage'];
  if (typeof alias === 'string' && alias.trim().length > 0) {
    return alias.trim();
  }
  return undefined;
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBooleanSetting(raw: string | boolean, label: string): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid ${label} value "${raw}". Expected true|false.`);
}

function resolveBooleanOption(flags: ArgMap, key: string, envKey?: string): boolean {
  const fromFlag = flags[key];
  if (fromFlag !== undefined) {
    return parseBooleanSetting(fromFlag, `--${key}`);
  }
  if (!envKey) {
    return false;
  }
  const fromEnv = process.env[envKey];
  if (typeof fromEnv !== 'string' || fromEnv.trim().length === 0) {
    return false;
  }
  return parseBooleanSetting(fromEnv, envKey);
}

function applyRepoConfigRequiredPolicy(flags: ArgMap): boolean {
  const explicitConfigMode = readStringFlag(flags, 'config-mode');
  if (flags['config-mode'] === true || (flags['config-mode'] !== undefined && !explicitConfigMode)) {
    throw new Error(
      '--config-mode requires a value. Expected one of: repo-authoritative, downstream-compatibility.'
    );
  }
  if (explicitConfigMode) {
    const mode = normalizeConfigModeFlag(explicitConfigMode);
    if (flags['repo-config-required'] !== undefined) {
      const legacyRequired = parseBooleanSetting(flags['repo-config-required'], '--repo-config-required');
      const legacyMode: ConfigAuthorityMode = legacyRequired ? 'repo-authoritative' : 'downstream-compatibility';
      if (legacyMode !== mode) {
        throw new Error(
          `Conflicting config authority flags: --config-mode ${mode} conflicts with --repo-config-required=${String(
            flags['repo-config-required']
          )} (${legacyMode}). Use one selector or make both flags agree.`
        );
      }
    }
    applyConfigModeEnv(mode);
    return mode === 'repo-authoritative';
  }

  if (flags['repo-config-required'] !== undefined) {
    const required = parseBooleanSetting(flags['repo-config-required'], '--repo-config-required');
    applyConfigModeEnv(required ? 'repo-authoritative' : 'downstream-compatibility');
    return required;
  }

  const configModeEnv = process.env[CONFIG_AUTHORITY_MODE_ENV_KEY];
  if (typeof configModeEnv === 'string' && configModeEnv.trim().length > 0) {
    const mode = normalizeConfigModeFlag(configModeEnv);
    applyConfigModeEnv(mode);
    return mode === 'repo-authoritative';
  }

  const legacyEnv = process.env[REPO_CONFIG_REQUIRED_ENV_KEY];
  if (typeof legacyEnv === 'string' && legacyEnv.trim().length > 0) {
    const mode = resolveConfigAuthorityMode(process.env).mode;
    applyConfigModeEnv(mode);
    return mode === 'repo-authoritative';
  }

  delete process.env[REPO_CONFIG_REQUIRED_ENV_KEY];
  delete process.env[CONFIG_AUTHORITY_MODE_ENV_KEY];
  return true;
}

function normalizeConfigModeFlag(raw: string): ConfigAuthorityMode {
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'repo-authoritative' ||
    normalized === 'repo_authoritative' ||
    normalized === 'repo' ||
    normalized === 'authoritative'
  ) {
    return 'repo-authoritative';
  }
  if (
    normalized === 'downstream-compatibility' ||
    normalized === 'downstream_compatibility' ||
    normalized === 'compatibility' ||
    normalized === 'compat'
  ) {
    return 'downstream-compatibility';
  }
  throw new Error('Invalid --config-mode value. Expected one of: repo-authoritative, downstream-compatibility.');
}

function applyConfigModeEnv(mode: ConfigAuthorityMode): void {
  process.env[CONFIG_AUTHORITY_MODE_ENV_KEY] = mode;
  process.env[REPO_CONFIG_REQUIRED_ENV_KEY] = mode === 'repo-authoritative' ? '1' : '0';
}

function resolveAutoIssueLogEnabled(flags: ArgMap): boolean {
  return resolveBooleanOption(flags, 'auto-issue-log', AUTO_ISSUE_LOG_ENV_KEY);
}

function resolveExecutionModeFlag(flags: ArgMap): ExecutionModeOption | undefined {
  const cloudShortcut = flags['cloud'] === true;
  const rawMode = readStringFlag(flags, 'execution-mode');

  if (cloudShortcut) {
    if (rawMode && rawMode.toLowerCase() !== 'cloud') {
      throw new Error('Cannot combine --cloud with --execution-mode values other than cloud.');
    }
    return 'cloud';
  }

  if (!rawMode) {
    return undefined;
  }

  const normalized = rawMode.toLowerCase();
  if (normalized !== 'mcp' && normalized !== 'cloud') {
    throw new Error('Invalid --execution-mode value. Expected one of: mcp, cloud.');
  }
  return normalized;
}

function resolveRuntimeModeFlag(flags: ArgMap): RuntimeModeOption | undefined {
  if (flags['runtime-mode'] === true) {
    throw new Error('--runtime-mode requires a value. Expected one of: cli, appserver.');
  }
  const rawMode = readStringFlag(flags, 'runtime-mode');
  if (flags['runtime-mode'] !== undefined && !rawMode) {
    throw new Error('--runtime-mode requires a non-empty value. Expected one of: cli, appserver.');
  }
  if (!rawMode) {
    return undefined;
  }
  const normalized = rawMode.toLowerCase();
  if (normalized !== 'cli' && normalized !== 'appserver') {
    throw new Error('Invalid --runtime-mode value. Expected one of: cli, appserver.');
  }
  return normalized;
}

type RlmMultiAgentFlagSource = 'multi-agent' | 'collab';

interface RlmMultiAgentFlagSelection {
  source: RlmMultiAgentFlagSource;
  raw: string | boolean;
}

function normalizeRlmMultiAgentValue(raw: string | boolean): 'enabled' | 'disabled' | 'invalid' {
  if (raw === true) {
    return 'enabled';
  }
  if (raw === false) {
    return 'disabled';
  }
  if (typeof raw !== 'string') {
    return 'invalid';
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'auto') {
    return 'enabled';
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return 'disabled';
  }
  return 'invalid';
}

function resolveRlmMultiAgentFlag(flags: ArgMap): RlmMultiAgentFlagSelection | null {
  const canonicalRaw = flags['multi-agent'];
  const legacyRaw = flags['collab'];
  if (canonicalRaw === undefined && legacyRaw === undefined) {
    return null;
  }

  if (canonicalRaw !== undefined && legacyRaw !== undefined) {
    const canonicalState = normalizeRlmMultiAgentValue(canonicalRaw);
    const legacyState = normalizeRlmMultiAgentValue(legacyRaw);
    if (canonicalState === 'invalid' || legacyState === 'invalid') {
      throw new Error(
        'Invalid --multi-agent/--collab value. Use --multi-agent (or legacy --collab) with auto|true|false.'
      );
    }
    if (canonicalState !== legacyState) {
      throw new Error(
        'Conflicting --multi-agent and --collab values. Use a single flag or provide matching values.'
      );
    }
    return { source: 'multi-agent', raw: canonicalRaw };
  }

  if (canonicalRaw !== undefined) {
    return { source: 'multi-agent', raw: canonicalRaw };
  }

  return { source: 'collab', raw: legacyRaw as string | boolean };
}

function shouldWarnLegacyMultiAgentEnv(flags: ArgMap, env: NodeJS.ProcessEnv): boolean {
  const explicitFlagUsed = flags['multi-agent'] !== undefined || flags['collab'] !== undefined;
  if (explicitFlagUsed) {
    return false;
  }
  return env.RLM_SYMBOLIC_MULTI_AGENT === undefined && env.RLM_SYMBOLIC_COLLAB !== undefined;
}

function applyRlmEnvOverrides(flags: ArgMap, goal?: string): void {
  if (goal) {
    process.env.RLM_GOAL = goal;
  }
  const multiAgentFlag = resolveRlmMultiAgentFlag(flags);
  if (multiAgentFlag) {
    const state = normalizeRlmMultiAgentValue(multiAgentFlag.raw);
    if (state === 'enabled') {
      // Keep canonical and legacy env keys in sync during the migration window.
      process.env.RLM_SYMBOLIC_MULTI_AGENT = '1';
      process.env.RLM_SYMBOLIC_COLLAB = '1';
      // Multi-agent subcalls are only used in the symbolic loop.
      if (!process.env.RLM_MODE) {
        process.env.RLM_MODE = 'symbolic';
      }
    } else if (state === 'disabled') {
      process.env.RLM_SYMBOLIC_MULTI_AGENT = '0';
      process.env.RLM_SYMBOLIC_COLLAB = '0';
    } else {
      throw new Error(
        'Invalid --multi-agent/--collab value. Use --multi-agent (or legacy --collab) with auto|true|false.'
      );
    }
    if (multiAgentFlag.source === 'collab') {
      console.warn('Warning: --collab is a legacy alias; prefer --multi-agent.');
    }
  }
  const validator = readStringFlag(flags, 'validator');
  if (validator) {
    process.env.RLM_VALIDATOR = validator;
  }
  const maxIterations = readStringFlag(flags, 'max-iterations');
  if (maxIterations) {
    process.env.RLM_MAX_ITERATIONS = maxIterations;
  }
  const maxMinutes = readStringFlag(flags, 'max-minutes');
  if (maxMinutes) {
    process.env.RLM_MAX_MINUTES = maxMinutes;
  }
  const roles = readStringFlag(flags, 'roles');
  if (roles) {
    process.env.RLM_ROLES = roles;
  }
}

function resolveRlmTaskId(taskFlag?: string): string {
  if (taskFlag) {
    return sanitizeTaskId(taskFlag);
  }
  const envTask = process.env.MCP_RUNNER_TASK_ID?.trim();
  if (envTask) {
    return sanitizeTaskId(envTask);
  }
  const { repoRoot } = resolveEnvironmentPaths();
  const repoName = basename(repoRoot);
  const slug = slugify(repoName, 'adhoc');
  return sanitizeTaskId(`rlm-${slug}`);
}

interface AutoIssueLogCaptureResult {
  issueLog: DoctorIssueLogResult | null;
  issueLogError: string | null;
}

async function maybeCaptureAutoIssueLog(params: {
  enabled: boolean;
  issueTitle: string;
  issueNotes: string;
  taskFilter: string | null;
}): Promise<AutoIssueLogCaptureResult> {
  if (!params.enabled) {
    return { issueLog: null, issueLogError: null };
  }
  try {
    const issueLog = await writeDoctorIssueLog({
      doctor: runDoctor(),
      issueTitle: params.issueTitle,
      issueNotes: params.issueNotes,
      taskFilter: params.taskFilter
    });
    return { issueLog, issueLogError: null };
  } catch (error) {
    const issueLogError = (error as Error)?.message ?? String(error);
    return { issueLog: null, issueLogError };
  }
}

function withAutoIssueLogContext(error: unknown, capture: AutoIssueLogCaptureResult): Error {
  const baseMessage = (error as Error)?.message ?? String(error);
  const lines = [baseMessage];
  if (capture.issueLog) {
    lines.push(
      `Auto issue log: saved to ${capture.issueLog.issue_log_path} (bundle: ${capture.issueLog.bundle_path}).`
    );
  }
  if (capture.issueLogError) {
    lines.push(`Auto issue log: failed (${capture.issueLogError})`);
  }
  return new Error(lines.join('\n'));
}

function resolveTaskFilter(preferredTaskId?: string, taskIdOverride?: string): string | null {
  const preferred = preferredTaskId?.trim();
  if (preferred) {
    return preferred;
  }
  const taskOverride = taskIdOverride?.trim();
  if (taskOverride) {
    return taskOverride;
  }
  const mcpTask = process.env.MCP_RUNNER_TASK_ID?.trim();
  if (mcpTask) {
    return mcpTask;
  }
  const taskEnv = process.env.TASK?.trim();
  if (taskEnv) {
    return taskEnv;
  }
  const codexTask = process.env.CODEX_ORCHESTRATOR_TASK_ID?.trim();
  return codexTask && codexTask.length > 0 ? codexTask : null;
}

async function handleStart(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printStartHelp();
    return;
  }
  await runStartCliRequestShell({
    orchestrator,
    positionals,
    flags,
    runWithUi: async (format, action) => await withRunUi(flags, format, action),
    emitRunOutput,
    maybeCaptureAutoIssueLog,
    resolveTaskFilter,
    withAutoIssueLogContext,
    maybeEmitRunAdoptionHint,
    resolveExecutionModeFlag,
    resolveRuntimeModeFlag,
    applyRepoConfigRequiredPolicy,
    resolveAutoIssueLogEnabled,
    resolveTargetStageId,
    readStringFlag,
    shouldWarnLegacyMultiAgentEnv: (requestFlags) => shouldWarnLegacyMultiAgentEnv(requestFlags, process.env),
    applyRlmEnvOverrides,
    resolveRlmTaskId,
    setTaskEnvironment: (taskId) => {
      process.env.MCP_RUNNER_TASK_ID = taskId;
    },
    log: (line) => console.log(line),
    warn: (line) => console.warn(line),
    setExitCode: (code) => {
      process.exitCode = code;
    }
  });
}

async function handleFrontendTest(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printFrontendTestHelp();
    return;
  }
  await runFrontendTestCliRequestShell({
    orchestrator,
    positionals,
    flags,
    resolveRuntimeModeFlag,
    applyRepoConfigRequiredPolicy,
    resolveTargetStageId,
    runWithUi: async (format, action) => await withRunUi(flags, format, action),
    emitRunOutput,
    warn: (line) => console.error(line)
  });
}

async function handleFlow(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printFlowHelp();
    return;
  }
  await runFlowCliRequestShell({
    orchestrator,
    positionals,
    flags,
    runWithUi: async (format, action) => await withRunUi(flags, format, action),
    emitRunOutput,
    formatIssueLogSummary: formatDoctorIssueLogSummary,
    toRunOutputPayload,
    maybeCaptureAutoIssueLog,
    resolveTaskFilter,
    withAutoIssueLogContext,
    maybeEmitRunAdoptionHint,
    resolveExecutionModeFlag,
    resolveRuntimeModeFlag,
    applyRepoConfigRequiredPolicy,
    resolveAutoIssueLogEnabled,
    resolveTargetStageId
  });
}

async function handleReview(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printReviewHelp();
    return;
  }
  const exitCode = await runReviewCliLaunchShell({ rawArgs });
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

async function handlePlan(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printPlanHelp();
    return;
  }
  applyRepoConfigRequiredPolicy(flags);
  const pipelineId = positionals[0];
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  await runPlanCliShell({
    orchestrator,
    pipelineId,
    taskId: typeof flags['task'] === 'string' ? (flags['task'] as string) : undefined,
    targetStageId: resolveTargetStageId(flags),
    format
  });
}

async function handleRlm(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printRlmHelp();
    return;
  }
  await runRlmCliRequestShell({
    orchestrator,
    positionals,
    flags,
    env: process.env,
    runWithUi: async (action) => await withRunUi(flags, 'text', action),
    emitRunOutput,
    resolveRuntimeModeFlag,
    applyRepoConfigRequiredPolicy,
    readStringFlag,
    applyRlmEnvOverrides,
    shouldWarnLegacyEnvAlias: shouldWarnLegacyMultiAgentEnv,
    resolveRlmTaskId,
    setTaskEnvironment: (taskId) => {
      process.env.MCP_RUNNER_TASK_ID = taskId;
    },
    runDoctor,
    resolveRepoRoot: () => resolveEnvironmentPaths().repoRoot,
    runCompletionShell: async ({ repoRoot, artifactRoot }) =>
      await runRlmCompletionCliShell({
        repoRoot,
        artifactRoot,
        log: (line) => console.log(line),
        error: (line) => console.error(line),
        setExitCode: (code) => {
          process.exitCode = code;
        }
      }),
    log: (line) => console.log(line),
    warn: (line) => console.warn(line)
  });
}

async function handleResume(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printResumeHelp();
    return;
  }
  const runtimeMode = resolveRuntimeModeFlag(flags);
  applyRepoConfigRequiredPolicy(flags);
  const runId = (flags['run'] ?? positionals[0]) as string | undefined;
  if (!runId) {
    throw new Error('resume requires --run <run-id>.');
  }
  const format: OutputFormat = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  await runResumeCliShell({
    orchestrator,
    runId,
    format,
    runtimeMode,
    resumeToken: typeof flags['token'] === 'string' ? (flags['token'] as string) : undefined,
    actor: typeof flags['actor'] === 'string' ? (flags['actor'] as string) : undefined,
    reason: typeof flags['reason'] === 'string' ? (flags['reason'] as string) : undefined,
    targetStageId: resolveTargetStageId(flags),
    runWithUi: async (action) => await withRunUi(flags, format, action),
    emitRunOutput
  });
}

async function handleStatus(orchestrator: CodexOrchestrator, rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printStatusHelp();
    return;
  }
  const runId = (flags['run'] ?? positionals[0]) as string | undefined;
  if (!runId) {
    throw new Error('status requires --run <run-id>.');
  }
  const watch = Boolean(flags['watch']);
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  const interval = parseInt((flags['interval'] as string | undefined) ?? '10', 10);
  await runStatusCliShell({ orchestrator, runId, watch, format, interval });
}

async function handleControlHost(rawArgs: string[]): Promise<void> {
  if (rawArgs[0] === 'recover' || rawArgs[0] === 'relaunch' || rawArgs[0] === 'nudge') {
    const action = rawArgs[0];
    const { positionals, flags } = parseArgs(rawArgs.slice(1));
    if (isHelpRequest(positionals, flags)) {
      printControlHostProviderWorkerRecoverHelp(action);
      return;
    }
    if (positionals.length > 0) {
      throw new Error(`Unknown control-host ${action} argument(s): ${positionals.join(' ')}`);
    }
    await runControlHostProviderWorkerRecoverCliShell({
      action,
      flags,
      printHelp: () => printControlHostProviderWorkerRecoverHelp(action)
    });
    return;
  }
  if (rawArgs[0] === 'freshness-gauge') {
    const { positionals, flags } = parseArgs(rawArgs.slice(1));
    if (isHelpRequest(positionals, flags)) {
      printControlHostFreshnessGaugeHelp();
      return;
    }
    if (positionals.length > 0) {
      throw new Error(`Unknown control-host freshness-gauge argument(s): ${positionals.join(' ')}`);
    }
    await runControlHostFreshnessGaugeCliShell({
      flags,
      printHelp: printControlHostFreshnessGaugeHelp
    });
    return;
  }
  if (rawArgs[0] === 'supervise') {
    const { positionals, flags } = parseArgs(rawArgs.slice(1));
    await runControlHostSupervisionCliShell({
      positionals,
      flags,
      printHelp: printControlHostSupervisionHelp
    });
    return;
  }
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printControlHostHelp();
    return;
  }
  if (positionals.length > 0) {
    throw new Error(`Unknown control-host argument(s): ${positionals.join(' ')}`);
  }
  await runControlHostCliShell({
    flags,
    printHelp: printControlHostHelp
  });
}

async function handleCoStatus(rawArgs: string[]): Promise<void> {
  if (rawArgs[0] === 'operator-autopilot') {
    const { positionals, flags } = parseArgs(rawArgs.slice(1));
    if (isHelpRequest(positionals, flags)) {
      printCoStatusOperatorAutopilotHelp();
      return;
    }
    await runCoStatusOperatorAutopilotCliShell({
      positionals,
      flags,
      printHelp: printCoStatusOperatorAutopilotHelp
    });
    return;
  }
  if (rawArgs[0] === 'attach') {
    const { positionals, flags } = parseArgs(rawArgs.slice(1));
    if (isHelpRequest(positionals, flags)) {
      printCoStatusAttachHelp();
      return;
    }
    if (positionals.length > 0) {
      throw new Error(`Unknown co-status attach argument(s): ${positionals.join(' ')}`);
    }
    await runCoStatusAttachCliShell({
      flags,
      printHelp: printCoStatusAttachHelp
    });
    return;
  }
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printCoStatusHelp();
    return;
  }
  await runCoStatusCliShell({
    flags,
    printHelp: printCoStatusHelp
  });
}

async function handleHygiene(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  await runHygieneCliShell({
    positionals,
    flags,
    printHelp: printHygieneHelp
  });
}

async function maybeStartHud(
  gate: ReturnType<typeof evaluateInteractiveGate>,
  emitter: RunEventEmitter
): Promise<HudController | null> {
  if (!gate.enabled) {
    return null;
  }
  const { startHud } = await import('../orchestrator/src/cli/ui/controller.js');
  return startHud({ emitter, footerNote: 'interactive HUD (read-only)' });
}

async function withRunUi(
  flags: ArgMap,
  format: OutputFormat,
  action: (runEvents: RunEventEmitter) => Promise<void>
): Promise<void> {
  const interactiveRequested = Boolean(flags['interactive'] || flags['ui']);
  const interactiveDisabled = Boolean(flags['no-interactive']);
  const runEvents = new RunEventEmitter();
  const gate = evaluateInteractiveGate({
    requested: interactiveRequested,
    disabled: interactiveDisabled,
    format,
    stdoutIsTTY: process.stdout.isTTY === true,
    stderrIsTTY: process.stderr.isTTY === true,
    term: process.env.TERM ?? null
  });

  const hud = await maybeStartHud(gate, runEvents);
  if (!gate.enabled && interactiveRequested && !interactiveDisabled && gate.reason) {
    console.error(`[HUD disabled] ${gate.reason}`);
  }

  try {
    await action(runEvents);
  } finally {
    hud?.stop();
    runEvents.dispose();
  }
}

function emitRunOutput(
  result: {
    manifest: {
      run_id: string;
      status: string;
      artifact_root: string;
      log_path: string | null;
      summary?: string | null;
      runtime_mode_requested?: string | null;
      runtime_mode?: string | null;
      runtime_provider?: string | null;
      config_resolution?: {
        mode: string;
        reason: string;
        config_source: string | null;
      } | null;
      runtime_fallback?: {
        occurred: boolean;
        policy?: string;
        policy_source?: string;
        code: string | null;
        reason: string | null;
        from_mode: string | null;
        to_mode: string | null;
        original_target?: string | null;
        fallback_target?: string | null;
        blocking_reason?: string | null;
        checked_at: string | null;
      } | null;
      cloud_fallback?: {
        policy?: string;
        policy_source?: string;
        original_target?: string | null;
        fallback_target?: string | null;
        blocking_reason?: string | null;
        reason: string;
      } | null;
    };
  },
  format: OutputFormat,
  label: string,
  issueLogCapture: AutoIssueLogCaptureResult = { issueLog: null, issueLogError: null }
): void {
  const payload = toRunOutputPayload(result, issueLogCapture);
  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(`${label}: ${payload.run_id}`);
  console.log(`Status: ${payload.status}`);
  console.log(`Manifest: ${payload.manifest}`);
  console.log(`Log: ${payload.log_path}`);
  if (payload.runtime_mode) {
    console.log(
      `Runtime: ${payload.runtime_mode}${payload.runtime_mode_requested ? ` (requested ${payload.runtime_mode_requested})` : ''}` +
        (payload.runtime_provider ? ` via ${payload.runtime_provider}` : '')
    );
  }
  if (payload.config_resolution) {
    console.log(
      `Configuration mode: ${payload.config_resolution.mode} (${payload.config_resolution.reason}; source=${payload.config_resolution.config_source ?? 'none'})`
    );
  }
  if (payload.runtime_fallback?.occurred || payload.runtime_fallback?.blocking_reason) {
    console.log(
      `Runtime fallback: policy=${payload.runtime_fallback.policy ?? 'auto'} ` +
        `code=${payload.runtime_fallback.code ?? 'runtime-fallback'} ` +
        `original_target=${payload.runtime_fallback.original_target ?? '<none>'} ` +
        `fallback_target=${payload.runtime_fallback.fallback_target ?? '<none>'} ` +
        `blocking_reason=${payload.runtime_fallback.blocking_reason ?? payload.runtime_fallback.reason ?? 'n/a'}`
    );
  }
  if (payload.cloud_fallback) {
    console.log(
      `Cloud fallback: policy=${payload.cloud_fallback.policy ?? 'auto'} ` +
        `original_target=${payload.cloud_fallback.original_target ?? 'execution:cloud'} ` +
        `fallback_target=${payload.cloud_fallback.fallback_target ?? 'execution:mcp'} ` +
        `blocking_reason=${payload.cloud_fallback.blocking_reason ?? payload.cloud_fallback.reason}`
    );
  }
  if (payload.summary) {
    console.log('Summary:');
    for (const line of payload.summary.split(/\r?\n/u)) {
      console.log(`  ${line}`);
    }
  }
  if (payload.issue_log) {
    for (const line of formatDoctorIssueLogSummary(payload.issue_log)) {
      console.log(line);
    }
  }
  if (payload.issue_log_error) {
    console.log(`Auto issue log: failed (${payload.issue_log_error})`);
  }
}

function toRunOutputPayload(
  result: {
    manifest: {
      run_id: string;
      status: string;
      artifact_root: string;
      log_path: string | null;
      summary?: string | null;
      runtime_mode_requested?: string | null;
      runtime_mode?: string | null;
      runtime_provider?: string | null;
      config_resolution?: {
        mode: string;
        reason: string;
        config_source: string | null;
      } | null;
      runtime_fallback?: {
        occurred: boolean;
        policy?: string;
        policy_source?: string;
        code: string | null;
        reason: string | null;
        from_mode: string | null;
        to_mode: string | null;
        original_target?: string | null;
        fallback_target?: string | null;
        blocking_reason?: string | null;
        checked_at: string | null;
      } | null;
      cloud_fallback?: {
        policy?: string;
        policy_source?: string;
        original_target?: string | null;
        fallback_target?: string | null;
        blocking_reason?: string | null;
        reason: string;
      } | null;
    };
  },
  issueLogCapture: AutoIssueLogCaptureResult = { issueLog: null, issueLogError: null }
): RunOutputPayload {
  return {
    run_id: result.manifest.run_id,
    status: result.manifest.status,
    artifact_root: result.manifest.artifact_root,
    manifest: `${result.manifest.artifact_root}/manifest.json`,
    log_path: result.manifest.log_path,
    summary: result.manifest.summary ?? null,
    runtime_mode_requested: result.manifest.runtime_mode_requested ?? null,
    runtime_mode: result.manifest.runtime_mode ?? null,
    runtime_provider: result.manifest.runtime_provider ?? null,
    config_resolution: result.manifest.config_resolution ?? null,
    runtime_fallback: result.manifest.runtime_fallback ?? null,
    cloud_fallback: result.manifest.cloud_fallback ?? null,
    cloud_fallback_reason: result.manifest.cloud_fallback?.reason ?? null,
    issue_log: issueLogCapture.issueLog,
    issue_log_error: issueLogCapture.issueLogError
  };
}

async function handleExec(rawArgs: string[]): Promise<void> {
  await runExecCliShell(parseExecArgs(rawArgs), {
    maybeEmitAdoptionHint: maybeEmitExecAdoptionHint
  });
}

async function shouldScanAdoptionHint(taskFilter: string | null | undefined): Promise<boolean> {
  if (!taskFilter) {
    return false;
  }
  const env = resolveEnvironmentPaths();
  const taskCliRunsRoot = join(env.runsRoot, taskFilter, 'cli');
  let handle: Awaited<ReturnType<typeof opendir>> | null = null;
  try {
    handle = await opendir(taskCliRunsRoot);
    let runCount = 0;
    for await (const entry of handle) {
      if (!entry.isDirectory()) {
        continue;
      }
      runCount += 1;
      if (runCount > 150) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  } finally {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
  }
}

async function maybeEmitAdoptionHint(taskFilter: string | null | undefined): Promise<void> {
  try {
    if (!(await shouldScanAdoptionHint(taskFilter))) {
      return;
    }
    const usage = await runDoctorUsage({ windowDays: 7, taskFilter });
    const recommendation = usage.adoption.recommendations[0];
    if (!recommendation) {
      return;
    }
    console.log(`Adoption hint: ${recommendation}`);
  } catch {
    // Exec command behavior should not fail when usage telemetry cannot be read.
  }
}

async function maybeEmitRunAdoptionHint(params: { format: OutputFormat; taskFilter: string | null | undefined }): Promise<void> {
  if (params.format !== 'text') {
    return;
  }
  await maybeEmitAdoptionHint(params.taskFilter);
}

async function maybeEmitExecAdoptionHint(taskFilter: string | null | undefined): Promise<void> {
  await maybeEmitAdoptionHint(taskFilter);
}

async function handleSelfCheck(rawArgs: string[]): Promise<void> {
  const { flags } = parseArgs(rawArgs);
  const format = (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
  await runSelfCheckCliShell({
    format,
    buildResult: buildSelfCheckResult,
    log: (line) => console.log(line)
  });
}

async function handleInit(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printInitHelp();
    return;
  }
  await runInitCliShell({ positionals, flags });
}

async function handleSetup(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printSetupCliHelp();
    return;
  }

  await runSetupCliShell({ flags });
}

async function handleDoctor(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printDoctorHelp();
    return;
  }
  if (positionals.length > 0) {
    throw new Error(`Unknown doctor argument(s): ${positionals.join(' ')}`);
  }
  await runDoctorCliRequestShell({ flags });
}

async function handleDevtools(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  await runDevtoolsCliShell({ positionals, flags });
}

async function handleDelegation(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  await runDelegationCliShell({ positionals, flags });
}

async function handleCodex(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  await runCodexCliShell({ positionals, flags, printHelp: printCodexHelp });
}

async function handleSkills(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  await runSkillsCliShell({ positionals, flags, printHelp: printSkillsHelp });
}

async function handleLinear(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  await runLinearCliShell({ positionals, flags, printHelp: printLinearHelp });
}

async function handleMcp(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  if (isHelpRequest(positionals, flags)) {
    printMcpHelp();
    return;
  }
  const subcommand = positionals.shift();
  if (!subcommand) {
    throw new Error('mcp requires a subcommand (serve|enable).');
  }
  if (subcommand === 'serve') {
    const repoRoot = typeof flags['repo'] === 'string' ? (flags['repo'] as string) : undefined;
    const dryRun = Boolean(flags['dry-run']);
    await serveMcp({ repoRoot, dryRun, extraArgs: positionals });
    return;
  }
  if (subcommand === 'enable') {
    await runMcpEnableCliShell({ rawArgs: rawArgs.slice(1) });
    return;
  }
  throw new Error(`Unknown mcp subcommand: ${subcommand}`);
}

async function handlePr(rawArgs: string[]): Promise<void> {
  if (rawArgs.length === 0 || isCliHelpToken(rawArgs[0])) {
    printPrHelp();
    return;
  }
  const [subcommand, ...subcommandArgs] = rawArgs;
  if (isPrHelpSubcommand(subcommand) && shouldPrintPrSubcommandHelp(subcommandArgs)) {
    printPrSubcommandHelp(subcommand);
    return;
  }
  const { runPrCliShell } = await import('../orchestrator/src/cli/prCliShell.js');
  await runPrCliShell({ rawArgs });
}

async function handleDelegationServer(rawArgs: string[]): Promise<void> {
  const { positionals, flags } = parseArgs(rawArgs);
  await runDelegationServerCliShell({
    positionals,
    flags,
    printHelp: printDelegationServerHelp
  });
}

function parseExecArgs(rawArgs: string[]): RunExecCliShellParams {
  const notifyTargets: string[] = [];
  let otelEndpoint: string | null = null;
  let requestedMode: ExecOutputMode | null = null;
  let jsonPretty = true;
  let cwd: string | undefined;
  let taskId: string | undefined;
  const commandTokens: string[] = [];
  let afterDoubleDash = false;

  const readValue = (currentIndex: number, inlineValue: string | undefined): { value: string | null; nextIndex: number } => {
    if (typeof inlineValue === 'string') {
      return { value: inlineValue, nextIndex: currentIndex };
    }
    const nextToken = rawArgs[currentIndex + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      return { value: nextToken, nextIndex: currentIndex + 1 };
    }
    return { value: null, nextIndex: currentIndex };
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const token = rawArgs[i]!;
    if (afterDoubleDash) {
      commandTokens.push(token);
      continue;
    }
    if (token === '--') {
      afterDoubleDash = true;
      continue;
    }
    if (!token.startsWith('--')) {
      commandTokens.push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    switch (rawKey) {
      case 'json': {
        if (requestedMode && requestedMode !== 'json') {
          throw new Error('Cannot combine --json with other output modes.');
        }
        requestedMode = 'json';
        let modeValue = inlineValue;
        if (!modeValue) {
          const probe = rawArgs[i + 1];
          if (probe === 'compact' || probe === 'pretty') {
            modeValue = probe;
            i += 1;
          }
        }
        jsonPretty = modeValue === 'compact' ? false : true;
        break;
      }
      case 'jsonl':
        if (requestedMode && requestedMode !== 'jsonl') {
          throw new Error('Cannot combine --jsonl with other output modes.');
        }
        requestedMode = 'jsonl';
        break;
      case 'notify': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--notify requires a target URI.');
        }
        i = nextIndex;
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
          .forEach((entry) => notifyTargets.push(entry));
        break;
      }
      case 'otel-endpoint': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--otel-endpoint requires a URL.');
        }
        i = nextIndex;
        otelEndpoint = value;
        break;
      }
      case 'cwd': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--cwd requires a path.');
        }
        i = nextIndex;
        cwd = value;
        break;
      }
      case 'task': {
        const { value, nextIndex } = readValue(i, inlineValue);
        if (!value) {
          throw new Error('--task requires an identifier.');
        }
        i = nextIndex;
        taskId = value;
        break;
      }
      default:
        throw new Error(`Unknown exec option: --${rawKey}`);
    }
  }

  return {
    commandTokens: normalizeExecCommandTokens(commandTokens, cwd),
    notifyTargets,
    otelEndpoint,
    requestedMode,
    jsonPretty,
    cwd,
    taskId
  };
}

function normalizeExecCommandTokens(commandTokens: string[], cwd?: string): string[] {
  if (commandTokens.length !== 1) {
    return commandTokens;
  }
  const token = commandTokens[0]!.trim();
  if (token.length === 0 || !/\s/.test(token) || looksLikeExistingPath(token, cwd)) {
    return commandTokens;
  }
  const parsed = splitShellLikeCommand(token);
  return parsed.length > 0 ? parsed : commandTokens;
}

function looksLikeExistingPath(token: string, cwd?: string): boolean {
  const probes = [token];
  if (cwd) {
    probes.push(join(cwd, token));
  }
  for (const probe of probes) {
    if (existsSync(probe)) {
      return true;
    }
  }
  return false;
}

function splitShellLikeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < command.length; i += 1) {
    const char = command[i]!;
    if (char === '\\' && quote !== null) {
      const next = command[i + 1];
      if (next === quote || next === '\\') {
        current += next;
        i += 1;
        continue;
      }
    }
    if (char === '"' || char === "'") {
      if (quote === char) {
        quote = null;
      } else if (quote === null) {
        quote = char;
      } else {
        current += char;
      }
      continue;
    }
    if (quote === null && /\s/u.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

function isHelpRequest(positionals: string[], flags: ArgMap): boolean {
  // Treat any `--help` presence as a help request, even if a user accidentally
  // supplies a value (our minimal argv parser would otherwise treat it as `--help <value>`).
  if (flags['help'] !== undefined) {
    return true;
  }
  const first = positionals[0];
  return first === 'help' || first === '--help' || first === '-h';
}

function printHelp(): void {
  console.log(`Usage: codex-orchestrator <command> [options]

Commands:
  start [pipeline]          Start a new run (default pipeline is diagnostics).
    --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
    --parent-run <id>       Link run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --format json           Emit machine-readable output.
    --execution-mode <mcp|cloud>  Force execution mode for this run and child subpipelines.
    --cloud                 Shortcut for --execution-mode cloud.
    --runtime-mode <cli|appserver>  Force runtime mode for this run and child subpipelines.
    --target <stage-id>     Focus plan/build metadata on a specific stage (alias: --target-stage).
    --auto-issue-log [true|false]  On failure, auto-write doctor issue bundle/log entry.
    --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
    --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
    --goal "<goal>"         When pipeline is rlm, set the RLM goal.
    --multi-agent [auto|true|false]  Preferred alias for multi-agent collab subagents (implies symbolic mode).
    --collab [auto|true|false]  Legacy alias for --multi-agent.
    --validator <cmd|none>  When pipeline is rlm, set the validator command.
    --max-iterations <n>    When pipeline is rlm, override max iterations.
    --max-minutes <n>       When pipeline is rlm, override max minutes.
    --roles <single|triad>  When pipeline is rlm, set role split.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  rlm "<goal>"              Run RLM loop until validator passes.
    --task <id>             Override task identifier.
    --runtime-mode <cli|appserver>  Force runtime mode for this run.
    --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
    --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
    --multi-agent [auto|true|false]  Preferred alias for multi-agent collab subagents (implies symbolic mode).
    --collab [auto|true|false]  Legacy alias for --multi-agent.
    --validator <cmd|none>  Set validator command or disable validation.
    --max-iterations <n>    Override max iterations (0 = unlimited with validator).
    --max-minutes <n>       Optional time-based guardrail in minutes.
    --roles <single|triad>  Choose single or triad role split.
    --parent-run <id>       Link run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  frontend-test             Run frontend testing pipeline.
    --devtools             Enable Chrome DevTools MCP for this run.
    --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
    --runtime-mode <cli|appserver>  Force runtime mode for this run.
    --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
    --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
    --parent-run <id>       Link run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --format json           Emit machine-readable output.
    --target <stage-id>     Focus plan/build metadata on a specific stage (alias: --target-stage).
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  flow                      Run docs-review then implementation-gate sequentially.
    --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
    --parent-run <id>       Link docs-review run to parent run id.
    --approval-policy <p>   Record approval policy metadata.
    --format json           Emit machine-readable output summary for both runs.
    --execution-mode <mcp|cloud>  Force execution mode for both runs.
    --cloud                 Shortcut for --execution-mode cloud.
    --runtime-mode <cli|appserver>  Force runtime mode for both runs.
    --target <stage-id>     Focus plan/build metadata on a specific stage (alias: --target-stage).
    --auto-issue-log [true|false]  On failure, auto-write doctor issue bundle/log entry.
    --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
    --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  review [options]          Run manifest-backed standalone review wrapper.
    Forwards flags/env to scripts/run-review (source) or dist/scripts/run-review.js (npm).
    Common flags:
      --manifest <path>     Explicit manifest path for review evidence.
      --task <id>           Task id used for prompt context.
      --uncommitted         Review uncommitted diff scope.
      --base <branch>       Review against base branch.
      --commit <sha>        Review specific commit.
      --non-interactive     Force non-interactive review behavior.
      --runtime-mode <cli|appserver>  Force runtime mode for the underlying codex review call.
      --auto-issue-log [true|false]  Auto-capture issue bundle on review failure.
      --disable-delegation-mcp [true|false]  Disable delegation MCP for this review.

  plan [pipeline]           Preview pipeline stages without executing.
    --task <id>             Override task identifier.
    --format json           Emit machine-readable output.
    --target <stage-id>     Highlight the stage chosen for orchestration (alias: --target-stage).
    --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
    --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.

  exec [command]            Run a one-off command with unified exec runtime.
    --json [compact]        Emit final JSON summary (optional compact mode).
    --jsonl                 Stream JSONL events (default when STDIN is non-interactive).
    --notify <uri>          Send run summary notifications (repeatable, comma-separated supported).
    --otel-endpoint <url>   Forward events to OTEL collector endpoint.
    --cwd <path>            Override working directory for the command.
    --task <id>             Override task identifier for manifest routing.

  resume --run <id> [options]
    --token <resume-token>  Verify the resume token before restarting.
    --actor <name>          Record who resumed the run.
    --reason <text>         Record why the run was resumed.
    --target <stage-id>     Override stage selection before resuming (alias: --target-stage).
    --runtime-mode <cli|appserver>  Force runtime mode before resuming.
    --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
    --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
    --format json           Emit machine-readable output.
    --interactive | --ui    Enable read-only HUD when running in a TTY.
    --no-interactive        Force disable HUD (default is off unless requested).

  control-host [options]
    Start a persistent Linear intake and Telegram/status host without tying it to a foreground run.
    --task <id>             Artifact task id for the host state (default: local-mcp).
    --run <id>              Host run id for persisted state files (default: control-host).
    --pipeline <id>         Pipeline used for provider-driven starts (default: diagnostics).
    --format json           Emit machine-readable readiness output.
  control-host recover|relaunch|nudge --issue-id <id> [options]
    Ask the running root control-host to recover a specific Linear provider worker.
  control-host freshness-gauge [options]
    Replay local provider/control-host artifacts and emit throughput/freshness health JSON.

  co-status [options]
    Attach the CO STATUS terminal viewer or emit the current snapshot from an already-running local control-host.
  co-status attach [options]
    Attach a read-only CO STATUS viewer to an already-running local control-host.

  hygiene quota [options]
    Emit a deterministic zero-model quota hygiene audit for local process/provider state.

  status --run <id> [--watch] [--interval N] [--format json]

  self-check [--format json]
  init codex [--cwd <path>] [--force]
    Installs AGENTS.md, mcp-client.json, .codex/config.toml (+ role files), and codex.orchestrator.json.
    --codex-cli            Also run CO-managed Codex CLI setup (plan unless --yes; activate with CODEX_CLI_USE_MANAGED=1).
    --codex-source <path>  Build from local Codex repo (or git URL).
    --codex-ref <ref>      Git ref (branch/tag/sha) when building from repo.
    --codex-download-url <url>  Download a prebuilt codex binary.
    --codex-download-sha256 <sha>  Expected SHA256 for the prebuilt download.
    --codex-force          Overwrite existing CO-managed codex binary.
    --yes                  Apply codex CLI setup (otherwise plan only).
  setup [--yes] [--refresh-skills] [--format json]
    --yes                 Apply setup (otherwise plan only).
    --refresh-skills      Overwrite bundled skills in $CODEX_HOME/skills during setup.
    --repo <path>         Repo root for delegation wiring (default cwd).
    --format json         Emit machine-readable output (dry-run only).
  doctor [--format json] [--usage] [--window-days <n>] [--task <id>] [--cloud-preflight] [--apply]
    --usage               Include a local usage snapshot (scans .runs/).
    --window-days <n>     Window for --usage (default 30).
    --task <id>           Limit --usage scan to a specific task directory.
    --cloud-preflight     Run cloud readiness preflight checks (env/codex/git/branch).
    --cloud-env-id <id>   Override env id for --cloud-preflight (default: CODEX_CLOUD_ENV_ID).
    --cloud-branch <name> Override branch for --cloud-preflight (default: CODEX_CLOUD_BRANCH).
    --issue-log           Append markdown issue entry + JSON bundle for downstream triage.
    --issue-title <text>  Optional title for --issue-log entries.
    --issue-notes <text>  Optional notes for --issue-log entries.
    --issue-log-path <p>  Output markdown path (default: docs/codex-orchestrator-issues.md).
    --apply               Plan/apply quick fixes for DevTools + delegation wiring (use with --yes).
    --yes                 Apply fixes when --apply is set.
    --format json         Emit machine-readable output (not supported with --apply).
  codex setup
    --source <path>        Build from local Codex repo (or git URL).
    --ref <ref>            Git ref (branch/tag/sha) when building from repo.
    --download-url <url>   Download a prebuilt codex binary.
    --download-sha256 <sha>  Expected SHA256 for the prebuilt download.
    --force                Overwrite existing CO-managed codex binary.
    --yes                  Apply setup (otherwise plan only; stock codex remains default until CODEX_CLI_USE_MANAGED=1).
    --format json          Emit machine-readable output.
  codex defaults
    --yes                  Apply setup (otherwise dry-run plan only).
    --force                Allow overwriting existing role files in ~/.codex/agents.
    --auth-scope <portable|chatgpt>  Select portable defaults or validated ChatGPT-auth gpt-5.5 defaults.
    --format json          Emit machine-readable output.
  devtools setup          Print DevTools MCP setup instructions.
    --yes                 Apply setup by running "codex mcp add ...".
    --format json         Emit machine-readable output (dry-run only).
  delegation setup        Configure delegation MCP server wiring.
    --repo <path>         Repo root for delegation server (default cwd).
    --yes                 Apply setup by running "codex mcp add ...".
    --format json         Emit machine-readable output (dry-run only).
  delegation cleanup-stale
    --yes                 Terminate stale delegate-server processes not rooted in a live codex client.
    --format json         Emit machine-readable output.
  skills install          Install bundled skills into $CODEX_HOME/skills.
    --force               Overwrite existing skill files.
    --only <skills>       Install only selected skills (comma-separated).
    --codex-home <path>   Override the target Codex home directory.
    --format json         Emit machine-readable output.
  linear <subcommand>     Run worker-visible Linear helper operations.
  mcp serve [--repo <path>] [--dry-run] [-- <extra args>]
  mcp enable [--servers <csv>] [--yes] [--format json]
    --servers <csv>       Comma-separated MCP server names to enable (default: all disabled).
    --yes                 Apply changes (default is plan mode).
    --format json         Emit machine-readable output.
  pr watch-merge [options]
    Monitor PR checks/reviews with polling and optional auto-merge after a quiet window.
    Use \`codex-orchestrator pr watch-merge --help\` for full options.
  pr resolve-merge [options]
    Monitor until merge-ready or actionable feedback appears; exits early when author action is required.
    Use \`codex-orchestrator pr resolve-merge --help\` for full options.
  pr ready-review [options]
    Wait through a bounded automated-feedback drain before human review handoff; exits early when author action is required.
    Use \`codex-orchestrator pr ready-review --help\` for full options.
  delegate-server         Run the delegation MCP server (stdio).
    --repo <path>         Repo root for config + manifests (default cwd).
    --mode <full|question_only|status_only>  Limit tool surface for child runs.
    --config "<key>=<value>[;...]"  Apply config overrides (repeat via separators).
  control-host            Run the persistent provider intake + oversight host.
  control-host recover    Ask the running root control-host to recover a Linear provider worker.
  co-status               Attach the CO STATUS terminal viewer or emit the current snapshot from an already-running local control-host.
  version | --version

  help                      Show this message.

Quickstart (agent-first):
  codex-orchestrator flow --task <task-id>
  NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review --task <task-id>
  codex-orchestrator doctor --format json
  codex-orchestrator doctor --usage --window-days 30
  codex-orchestrator rlm --multi-agent auto "<goal>"
  codex-orchestrator start implementation-gate --cloud --target <stage-id>

Notes:
  RLM recursion guidance: docs/guides/rlm-recursion-v2.md
  Cloud-mode preflight/fallback guide: docs/guides/cloud-mode-preflight.md
  Review artifacts guide: docs/guides/review-artifacts.md
`);
}

if (isDirectExecution()) {
  void runCodexOrchestratorCli();
}

function printVersion(): void {
  const pkg = loadPackageInfo();
  console.log(pkg.version ?? 'unknown');
}

function printSkillsHelp(): void {
  console.log(`Usage: codex-orchestrator skills <command> [options]

Commands:
  install                   Install bundled skills into $CODEX_HOME/skills.
    --force                 Overwrite existing skill files.
    --only <skills>         Install only selected skills (comma-separated).
    --codex-home <path>     Override the target Codex home directory.
    --format json           Emit machine-readable output.
`);
}

function printLinearHelp(): void {
  console.log(`Usage: codex-orchestrator linear <subcommand> [options]

Subcommands:
  issue-context
    --issue-id <id>       Linear issue id/key to inspect.
    --workspace-id <id>   Optional workspace scope check (falls back to env when configured).
    --team-id <id>        Optional team scope check (falls back to env when configured).
    --project-id <id>     Optional project scope check (falls back to env when configured).
    --format json         Emit machine-readable output.

  upsert-workpad
    --issue-id <id>       Linear issue id/key to update.
    --body <text>         Workpad body to create/update. Local markdown image refs are uploaded to Linear.
    --body-file <path>    Read workpad body from a file. Supports local image refs like file:///abs/proof.png or <file:///abs/proof (1).png>.
    --comment-id <id>     Optional persisted workpad comment id.
    --workspace-id <id>   Optional workspace scope check.
    --team-id <id>        Optional team scope check.
    --project-id <id>     Optional project scope check.
    --format json         Emit machine-readable output.

  delete-workpad
    --issue-id <id>       Linear issue id/key whose workpad should be deleted.
    --comment-id <id>     Optional persisted workpad comment id to delete.
    --workspace-id <id>   Optional workspace scope check.
    --team-id <id>        Optional team scope check.
    --project-id <id>     Optional project scope check.
    --format json         Emit machine-readable output.

  transition
    --issue-id <id>       Linear issue id/key to update.
    --state <name>        Destination Linear state name (resolved to stateId via team workflow states).
    --expected-state <name>
                         Optional expected live state name; conflicts fail closed before mutation.
    --expected-state-type <type>
                         Optional expected live workflow type; conflicts fail closed before mutation.
    --expected-updated-at <iso>
                         Optional expected live updated_at timestamp; conflicts fail closed before mutation.
    --force               Allow terminal-to-reopen transitions with an audited force reason.
    --force-reason <text> Required whenever --force is set.
    --workspace-id <id>   Optional workspace scope check.
    --team-id <id>        Optional team scope check.
    --project-id <id>     Optional project scope check.
    --format json         Emit machine-readable output.

  attach-pr
    --issue-id <id>       Linear issue id/key to update.
    --url <url>           GitHub PR URL to attach.
    --title <title>       Optional attachment title.
    --workspace-id <id>   Optional workspace scope check.
    --team-id <id>        Optional team scope check.
    --project-id <id>     Optional project scope check.
    --format json         Emit machine-readable output.

  parallelization
    --issue-id <id>       Linear issue id/key for the active provider-worker turn.
    --decision <mode>     parallelize_now, stay_serial, or forbid_parallel.
    --reason <code>       Reason code allowed for the selected decision.
    --summary <text>      Required operator summary. Include matrix/cap evidence.
    Parallel-first rule: create a pre-turn decomposition matrix before the decision.
    Matrix columns: candidate lane, file/phase scope, dependencies, overlap risk,
      expected validation artifact, child-lane owner, and cap-slot use.
    stay_serial is invalid while any safe independent child-lane candidate remains;
      single_bounded_change must label docs/test/research/review slice justifications.
    Child-lane cap: at most 2 active, pending, or unaccepted same-issue child lanes.
      On cap exhaustion, use stay_serial/existing_child_lane_active and include cap_exhausted: evidence.
      Stale in-flight accept claims older than 30 minutes, or legacy claims without timestamps, are recoverable and do not consume cap.
    Parent ownership: avoid delegated files/phases while a child lane is active; collisions
      require invalidate/reject/rebase reasoning before child patch acceptance.
    --format json         Emit machine-readable output.

  create-follow-up
    --issue-id <id>                   Source Linear issue id/key.
    --title <title>                   Follow-up issue title.
    --description <text>              Follow-up issue description.
    --description-file <path>         Read follow-up issue description from a file.
    --intent-checksum <text>          Exact wording, protected terms, and wrong interpretations to reject.
    --intent-checksum-file <path>     Read the intent checksum from a file.
    --non-goals <text>                Explicit follow-up non-goals.
    --non-goals-file <path>           Read follow-up non-goals from a file.
    --not-done-if <text>              Readiness blockers / false-done conditions.
    --not-done-if-file <path>         Read the false-done block from a file.
    --acceptance-criteria <text>      Follow-up acceptance criteria.
    --acceptance-criteria-file <path> Read follow-up acceptance criteria from a file.
    --parity-lane                     Require a parity/alignment matrix for this follow-up.
    --parity-matrix <text>            Current/reference/target matrix (required when --parity-lane is set).
    --parity-matrix-file <path>       Read the parity/alignment matrix from a file (required when --parity-lane is set).
    --canonical-owner-key <text>      Exact canonical owner key for reuse before creating a new issue.
    --canonical-owner-key-file <path> Read the canonical owner key from a file.
    --blocked-by-source               Add blocker linkage when the follow-up depends on the source issue.
    --workspace-id <id>               Optional workspace scope check.
    --team-id <id>                    Optional team scope check.
    --project-id <id>                 Optional project scope check.
    --format json                     Emit machine-readable output.

  runtime-proof
    --issue-id <id>       Linear issue id/key for audit continuity.
    --origin <url>        App origin whose permit posture should be evaluated.
    --kind <mode>         Optional proof kind: screenshot, external-link, or video.
    --proof-url <url>     Reviewer-usable proof URL for workpad/PR handoff generation.
    --title <title>       Optional proof label (defaults by kind).
    --summary <text>      Optional short proof summary for workpad/PR handoff text.
    --reachability-mode <mode>
                         Optional reviewer reachability mode: deterministic (default) or dns-public.
    --workspace-id <id>   Optional workspace scope check.
    --team-id <id>        Optional team scope check.
    --project-id <id>     Optional project scope check.
    --format json         Emit machine-readable output.

  screenshot-proof
    --issue-id <id>       Linear issue id/key for audit continuity.
    --output <path>       Optional local screenshot path (.png/.jpg/.jpeg). Defaults under .tmp/.
    --display-id <id>     Optional macOS display id for bounded display capture.
    --window-id <id>      Optional macOS window id for bounded window capture.
    --open-preview        Open the captured file in Preview and attempt bounded AppleScript cleanup.
    --workspace-id <id>   Optional workspace scope check.
    --team-id <id>        Optional team scope check.
    --project-id <id>     Optional project scope check.
    --format json         Emit machine-readable output.

  child-stream
    --pipeline <id>       Allowlisted child pipeline: docs-review, implementation-gate, or docs-relevance-advisory.
    --stream <name>       Optional task-id suffix for the child stream (defaults to the pipeline id).
    --format json         Emit machine-readable output.

  child-lane
    --action <mode>       launch, accept, reject, or invalidate.
    --stream <name>       Lane stream name / task-id suffix.
    --purpose <text>      Required for launch: bounded lane objective.
    --files <csv>         Optional comma-separated file ownership scope.
    --phases <csv>        Optional comma-separated phase ownership scope.
    --instructions <text> Optional extra bounded instructions for launch.
    --instructions-file <path>
                         Optional file containing extra bounded instructions for launch.
    --reason <text>       Optional parent decision rationale for accept/reject/invalidate.
    --format json         Emit machine-readable output.
`);
}

function printCodexHelp(): void {
  console.log(`Usage: codex-orchestrator codex <subcommand> [options]

Subcommands:
  setup                    Plan/apply CO-managed Codex CLI install.
    --source <path>        Build from local Codex repo (or git URL).
    --ref <ref>            Git ref (branch/tag/sha) when building from repo.
    --download-url <url>   Download a prebuilt codex binary.
    --download-sha256 <sha>  Expected SHA256 for the prebuilt download.
    --force                Overwrite existing CO-managed codex binary.
    --yes                  Apply setup (otherwise plan only).
    --format json          Emit machine-readable output.

  defaults                 Plan/apply additive global Codex defaults in ~/.codex/config.toml.
    --yes                  Apply setup (otherwise dry-run plan only).
    --force                Overwrite existing role files in ~/.codex/agents.
    --auth-scope <portable|chatgpt>  Select portable defaults or validated ChatGPT-auth gpt-5.5 defaults.
    --format json          Emit machine-readable output.
`);
}

function printStatusHelp(): void {
  console.log(`Usage: codex-orchestrator status --run <id> [--watch] [--interval N] [--format json]

Options:
  --run <id>         Run id to inspect.
  --watch            Poll until run reaches a terminal state.
  --interval <sec>   Poll interval when --watch is enabled (default 10).
  --format json      Emit machine-readable status output.
`);
}

function printControlHostHelp(): void {
  console.log(`Usage:
  codex-orchestrator control-host [options]
  codex-orchestrator control-host recover --issue-id <linear-issue-id> [options]
  codex-orchestrator control-host relaunch --issue-id <linear-issue-id> [options]
  codex-orchestrator control-host nudge --issue-id <linear-issue-id> [options]
  codex-orchestrator control-host freshness-gauge [options]
  codex-orchestrator control-host supervise <install|status|restart|uninstall|run> [options]

Options:
  --task <id>           Artifact task id for the host state (default: local-mcp).
  --run <id>            Host run id for persisted state files (default: control-host).
  --pipeline <id>       Pipeline used for provider-driven starts (default: ${DEFAULT_PROVIDER_START_PIPELINE_ID}).
  --format json         Emit the startup readiness payload to stdout, then keep the host running.
  --help                Show this message.

Read-only gauge subcommand:
  freshness-gauge      Replay existing local/sanitized artifacts and classify provider/control-host freshness.

Provider-worker recovery subcommands:
  recover              Ask the running root control-host to recover a specific Linear issue worker.
  relaunch             Alias-shaped recovery request for operator relaunch workflows.
  nudge                Alias-shaped recovery request for operator nudge workflows.

Supervision subcommands:
  supervise install     Install a launchd LaunchAgent-backed local control-host supervisor.
  supervise status      Show the installed launchd/config/state status.
  supervise restart     Restart the installed control-host supervisor.
  supervise uninstall   Remove the installed launchd supervisor and generated artifacts.
  supervise run         Internal long-lived runner for launchd ProgramArguments.
`);
}

function printControlHostProviderWorkerRecoverHelp(action: string): void {
  console.log(`Usage: codex-orchestrator control-host ${action} --issue-id <linear-issue-id> [options]

Ask an already-running root control-host to ${action} the provider worker for one Linear issue.
This preserves control-host admission, launch-token, provenance, deterministic issue worktree,
and root .runs/out artifact routing. Direct \`start provider-linear-worker\` remains unsupported.

Options:
  --issue-id <id>             Linear issue id/key to recover (required).
  --task <id>                 Control-host artifact task id (default: local-mcp).
  --run <id>                  Control-host run id (default: control-host).
  --manifest-path <path>      Attach to a specific control-host manifest.
  --run-dir <path>            Attach to a specific control-host run directory.
  --request-timeout-ms <n>    HTTP request timeout (default: 25000).
  --format json               Emit machine-readable result.
  --help                      Show this message.
`);
}

function printControlHostFreshnessGaugeHelp(): void {
  console.log(`Usage: codex-orchestrator control-host freshness-gauge [options]

Replay existing provider/control-host artifacts without starting a host or polling Linear/GitHub.

Options:
  --artifact-root <path>        Directory to scan for local artifacts (required unless explicit paths are provided).
  --run-dir <path>              Alias for --artifact-root when checking one run directory.
  --provider-intake-state <csv> Explicit provider-intake-state.json path(s).
  --provider-manifest <csv>     Explicit manifest.json path(s).
  --provider-proof <csv>        Explicit provider-linear-worker-proof.json path(s).
  --worker-audit-jsonl <csv>    Explicit provider worker audit JSONL path(s).
  --control-endpoint-metadata <csv> Explicit control endpoint metadata path(s).
  --status-dataset <csv>        Explicit CO STATUS/status dataset path(s).
  --polling-health <csv>        Explicit provider polling health path(s).
  --linear-budget-state <csv>   Explicit Linear shared-budget state path(s).
  --now <iso>                   Deterministic reference time for age/latency calculations.
  --strict                      Exit non-zero when the verdict is stale or contradictory.
  --max-depth <n>               Recursive artifact scan depth (default: 8).
  --stale-refresh-after-ms <n>  Refresh age threshold (default: 300000).
  --stale-heartbeat-after-ms <n> Active heartbeat age threshold (default: 600000).
  --stale-retry-after-ms <n>    Retry/backoff overdue threshold (default: 600000).
  --stale-claim-queue-after-ms <n> Claim queue age threshold (default: 1800000).
  --claim-to-start-degraded-after-ms <n> Claim-to-start degraded threshold (default: 300000).
  --start-to-heartbeat-degraded-after-ms <n> Start-to-first-heartbeat degraded threshold (default: 120000).
  --linear-headroom-low-ratio <n> Low Linear shared-budget remaining ratio (default: 0.05).
  --child-lane-cap <n>          Same-parent active/pending child-lane cap (default: 2).
  --format json                 Emit machine-readable gauge output.
  --help                        Show this message.
`);
}

function printControlHostSupervisionHelp(): void {
  console.log(`Usage: codex-orchestrator control-host supervise <install|status|restart|uninstall|run> [options]

Subcommands:
  install               Install the macOS launchd LaunchAgent plus generated config/state files.
  status                Show the current install, launchctl, and restart-reason state.
  restart               Kickstart the installed launchd service.
  uninstall             Boot out the launchd service and remove generated artifacts.
  run                   Internal long-lived supervision runner for launchd use.

Common options:
  --label <value>             LaunchAgent label (default: com.kbediako.co.control-host).
  --config <path>             Explicit config path for status, restart, uninstall, or run.
  --format json               Emit machine-readable output for install, status, restart, or uninstall.

Install options:
  --repo-root <path>          Repo root used as the supervised control-host working directory.
  --node <path>               Explicit Node executable for launchd ProgramArguments.
  --cli-entrypoint <path>     Explicit codex-orchestrator JS entrypoint for launchd ProgramArguments.
  --task <id>                 Control-host task id (default: local-mcp).
  --run <id>                  Control-host run id (default: control-host).
  --pipeline <id>             Provider start pipeline (default: provider-linear-worker).
  --health-interval <sec>     Health poll interval in seconds (default: 30).
  --unhealthy-threshold <n>   Consecutive unhealthy samples before launchd restart (default: 3).
  --launchd-throttle <sec>    LaunchAgent ThrottleInterval value (default: 15).
  --kill-timeout <sec>        Grace period before force-killing the child host (default: 10).
  --env-files <csv|none>      Comma-separated env/bootstrap files to source before launch.
  --shell <path>              Shell used to source env/bootstrap files (default: $SHELL or /bin/zsh).
`);
}

function printCoStatusHelp(): void {
  console.log(`Usage:
  codex-orchestrator co-status [options]
  codex-orchestrator co-status attach [options]
  codex-orchestrator co-status operator-autopilot local-rollout <acknowledge|clear|dismiss> [options]

Attach the CO STATUS terminal viewer to an already-running local JSON control-host,
or emit the current CO STATUS snapshot from that host in JSON mode.

Viewer options:
  --task <id>           Artifact task id for the host state (default: local-mcp).
  --run <id>            Host run id for persisted state files (default: control-host).
  --format json         Emit the current CO STATUS snapshot from the local control-host and exit.
  --machine-status      In JSON mode, emit the cheap machine-health snapshot instead of /ui/data.json.
  --machine-status-max-age-ms <ms>
                       Bound local degraded machine-status fallback freshness.
  --help                Show this message.

JSON contract:
  co-status --format json reads the authenticated operator-dashboard snapshot from the
  current local control-host and exits. Supervision probes use --machine-status so
  health reads do not depend on the heavier dashboard projection.
  Use \`control-host --format json\` for startup readiness output.

Attach subcommand:
  attach                Attach to an already-running local JSON control-host.
                        Run \`codex-orchestrator co-status attach --help\` for attach flags.

Operator autopilot lifecycle:
  operator-autopilot    Acknowledge, clear, or dismiss a pending local rollout action.
                        Run \`codex-orchestrator co-status operator-autopilot --help\` for lifecycle flags.
`);
}

function printCoStatusOperatorAutopilotHelp(): void {
  console.log(`Usage: codex-orchestrator co-status operator-autopilot local-rollout <acknowledge|clear|dismiss> [options]

Record durable lifecycle metadata for one pending operator-autopilot local rollout
action from an already-running local JSON control-host.

Options:
  --issue <id|identifier>   Pending Linear issue id or identifier to match.
  --action-id <id>          Stable local rollout action instance id to match.
  --actor <name>            Operator recording the lifecycle event (default: current user).
  --reason <text>           Required reason for the lifecycle event.
  --task <id>               Artifact task id for the host state (default: local-mcp).
  --run <id>                Host run id for persisted state files (default: control-host).
  --run-dir <path>          Resolve the host from a specific existing run directory.
  --manifest-path <path>    Resolve the host from an explicit manifest.json path.
  --format json             Emit machine-readable lifecycle output.
  --help                    Show this message.
`);
}

function printCoStatusAttachHelp(): void {
  console.log(`Usage: codex-orchestrator co-status attach [options]

Attach a read-only CO STATUS viewer to an already-running local JSON control-host.
This reads persisted endpoint/auth artifacts and does not start another control-host,
Linear poller, or Telegram poller.
If the supervised control-host restarts and rotates control_endpoint.json while
attached, the viewer re-resolves the endpoint on fetch failures and reports
stale endpoint, unavailable host, auth, and timeout guidance in the dashboard.

Options:
  --task <id>               Artifact task id for the host state (default: local-mcp).
  --run <id>                Host run id for persisted state files (default: control-host).
  --run-dir <path>          Resolve the host from a specific existing run directory.
  --manifest-path <path>    Resolve the host from an explicit manifest.json path.
  --refresh-interval-ms <n> Viewer refresh interval in milliseconds (default: 1000).
  --format json             Emit machine-readable attach target output instead of launching the viewer.
  --help                    Show this message.
`);
}

function printHygieneHelp(): void {
  console.log(`Usage: codex-orchestrator hygiene quota [options]

Emit a deterministic read-only quota hygiene audit without model-backed calls or default mutations.

Options:
  --artifact-root <path>          Control-host artifact root (default: .runs/local-mcp/cli/control-host).
  --provider-intake-state <path>  Explicit provider-intake-state.json path.
  --automations-dir <path>        Explicit Codex automations directory (default: $CODEX_HOME/automations).
  --goal-manifest <path>          Manifest to inspect for advisory current-thread goal evidence.
  --repo <path>                   Repo root for relative artifact paths (default: cwd).
  --now <iso>                     Deterministic timestamp for the report.
  --format json                   Emit machine-readable audit JSON.
  --help                          Show this message.
`);
}

function printResumeHelp(): void {
  console.log(`Usage: codex-orchestrator resume --run <id> [options]

Options:
  --run <id>            Run id to resume.
  --token <resume-token>  Verify the resume token before restarting.
  --actor <name>        Record who resumed the run.
  --reason <text>       Record why the run was resumed.
  --target <stage-id>   Override stage selection before resuming.
  --runtime-mode <cli|appserver>  Force runtime mode before resuming.
  --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
  --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
  --format json         Emit machine-readable output.
  --interactive | --ui  Enable read-only HUD when running in a TTY.
  --no-interactive      Force disable HUD.
`);
}

function printDoctorHelp(): void {
  console.log(`Usage: codex-orchestrator doctor [options]

Inspect the current repo/user environment for downstream readiness:
- packaged and seeded provider onboarding files
- DevTools + delegation MCP wiring
- Codex defaults and current CLI posture
- optional local usage and cloud preflight checks

Options:
  --format json         Emit machine-readable output (not supported with --apply).
  --usage               Include a local usage snapshot (scans .runs/).
  --window-days <n>     Window for --usage (default 30).
  --task <id>           Limit --usage scan to a specific task directory.
  --cloud-preflight     Run cloud readiness preflight checks (env/codex/git/branch).
  --cloud-env-id <id>   Override env id for --cloud-preflight (default: CODEX_CLOUD_ENV_ID).
  --cloud-branch <name> Override branch for --cloud-preflight (default: CODEX_CLOUD_BRANCH).
  --issue-log           Append markdown issue entry + JSON bundle for downstream triage.
  --issue-title <text>  Optional title for --issue-log entries.
  --issue-notes <text>  Optional notes for --issue-log entries.
  --issue-log-path <p>  Output markdown path (default: docs/codex-orchestrator-issues.md).
  --apply               Plan/apply quick fixes for DevTools + delegation wiring (use with --yes).
  --yes                 Apply fixes when --apply is set.
  --help                Show this message.

Examples:
  codex-orchestrator doctor --format json
  codex-orchestrator doctor --usage --window-days 30
  codex-orchestrator doctor --cloud-preflight --cloud-env-id <env-id> --cloud-branch main
`);
}

function printDelegationServerHelp(): void {
  console.log(`Usage: codex-orchestrator delegate-server [options]

Options:
  --repo <path>                    Repo root for config + manifests (default cwd).
  --mode <full|question_only|status_only>      Limit tool surface for child runs.
  --config "<key>=<value>[;...]"   Apply config overrides.
  --help                           Show this message.
`);
}

function printMcpHelp(): void {
  console.log(`Usage: codex-orchestrator mcp <subcommand> [options]

Subcommands:
  serve [--repo <path>] [--dry-run] [-- <extra args>]
    Proxy Codex MCP server mode through the selected Codex binary.

  enable [--servers <csv>] [--yes] [--format json]
    Enable disabled MCP servers using the existing Codex MCP definitions.
    --servers <csv>    Comma-separated server names (default: all disabled servers).
    --yes              Apply changes (default: plan only).
    --format json      Emit machine-readable output.
`);
}

function printPrHelp(): void {
  console.log(`Usage: codex-orchestrator pr <subcommand> [options]

Subcommands:
  watch-merge             Monitor PR checks/reviews with polling and optional auto-merge.
                          Supports PR_MONITOR_* env vars and standard flags (see: pr watch-merge --help).
  resolve-merge           Watch for merge readiness but exit early on actionable feedback requiring author response.
                          Inherits watch-merge flags; defaults exit-on-action-required to on.
  ready-review           Wait through a bounded automated-feedback drain before review handoff.
                          Reuses watch-merge polling, treats REVIEW_REQUIRED as informational, and defaults exit-on-action-required to on.

Examples:
  codex-orchestrator pr watch-merge --pr 211 --dry-run --quiet-minutes 10
  codex-orchestrator pr watch-merge --pr 211 --auto-merge --merge-method squash
  codex-orchestrator pr resolve-merge --pr 211 --quiet-minutes 15
  codex-orchestrator pr resolve-merge --pr 211 --auto-merge --quiet-minutes 10
  codex-orchestrator pr ready-review --pr 211 --quiet-minutes 15 --timeout-minutes 20

Guide:
  Review artifacts (prompt + output log paths): docs/guides/review-artifacts.md
`);
}

type PrHelpSubcommand = 'watch-merge' | 'resolve-merge' | 'ready-review';

function isCliHelpToken(value: string | undefined): boolean {
  return value === '--help' || value === '-h' || value === 'help';
}

function envFlagEnabled(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === null) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return fallback;
  }
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  return fallback;
}

function isPrHelpSubcommand(value: string | undefined): value is PrHelpSubcommand {
  return value === 'watch-merge' || value === 'resolve-merge' || value === 'ready-review';
}

function shouldPrintPrSubcommandHelp(args: string[]): boolean {
  if (args.length === 0) {
    return false;
  }
  if (args[0] === 'help') {
    return true;
  }
  return args.some((arg) => arg === '--help' || arg === '-h');
}

function printPrSubcommandHelp(subcommand: PrHelpSubcommand): void {
  const defaultAutoMerge = envFlagEnabled(process.env.PR_MONITOR_AUTO_MERGE, false);
  switch (subcommand) {
    case 'watch-merge':
      console.log(`Usage: codex-orchestrator pr watch-merge [options]

Monitor PR checks/reviews with polling and optionally merge after a quiet window.

Options:
  --pr <number>             PR number (default: PR for current branch)
  --owner <name>            Repo owner (default: inferred via gh repo view)
  --repo <name>             Repo name (default: inferred via gh repo view)
  --interval-seconds <n>    Poll interval in seconds (default: 30)
  --quiet-minutes <n>       Required quiet window after ready state (default: 15)
  --timeout-minutes <n>     Max monitor duration before failing (default: 180)
  --merge-method <method>   merge|squash|rebase (default: squash)
  --auto-merge              Merge automatically after quiet window
  --no-auto-merge           Never merge automatically (monitor only)
  --delete-branch           Delete remote branch when merging
  --no-delete-branch        Keep remote branch after merge
  --exit-on-action-required Exit non-zero when author action is required
  --no-exit-on-action-required Keep monitoring even when author action is required
  --dry-run                 Never call gh pr merge (report only)
  -h, --help                Show this help message

Environment:
  PR_MONITOR_QUIET_MINUTES=<n>  Override quiet window default
  PR_MONITOR_INTERVAL_SECONDS=<n>
  PR_MONITOR_TIMEOUT_MINUTES=<n>
  PR_MONITOR_AUTO_MERGE=1       Default auto-merge on (current default: ${defaultAutoMerge ? 'on' : 'off'})
  PR_MONITOR_DELETE_BRANCH=1    Default delete branch on merge
  PR_MONITOR_MERGE_METHOD=<method>
`);
      return;
    case 'resolve-merge':
      console.log(`Usage: codex-orchestrator pr resolve-merge [options]

Monitor until merge-ready or actionable feedback appears; exits early when author action is required.

Options:
  --pr <number>             PR number (default: PR for current branch)
  --owner <name>            Repo owner (default: inferred via gh repo view)
  --repo <name>             Repo name (default: inferred via gh repo view)
  --interval-seconds <n>    Poll interval in seconds (default: 30)
  --quiet-minutes <n>       Required quiet window after ready state (default: 15)
  --timeout-minutes <n>     Max monitor duration before failing (default: 180)
  --merge-method <method>   merge|squash|rebase (default: squash)
  --auto-merge              Merge automatically after quiet window
  --no-auto-merge           Never merge automatically (monitor only)
  --delete-branch           Delete remote branch when merging
  --no-delete-branch        Keep remote branch after merge
  --exit-on-action-required Exit non-zero when author action is required
  --no-exit-on-action-required Keep monitoring even when author action is required
  --dry-run                 Never call gh pr merge (report only)
  -h, --help                Show this help message

Environment:
  PR_MONITOR_QUIET_MINUTES=<n>  Override quiet window default
  PR_MONITOR_INTERVAL_SECONDS=<n>
  PR_MONITOR_TIMEOUT_MINUTES=<n>
  PR_MONITOR_AUTO_MERGE=1       Default auto-merge on (current default: ${defaultAutoMerge ? 'on' : 'off'})
  PR_MONITOR_DELETE_BRANCH=1    Default delete branch on merge
  PR_MONITOR_MERGE_METHOD=<method>
  resolve-merge default: exit-on-action-required is on
`);
      return;
    case 'ready-review':
      console.log(`Usage: codex-orchestrator pr ready-review [options]

Monitor PR checks/reviews with polling and report when review handoff is safe after a bounded automated-feedback drain.

Options:
  --pr <number>             PR number (default: PR for current branch)
  --owner <name>            Repo owner (default: inferred via gh repo view)
  --repo <name>             Repo name (default: inferred via gh repo view)
  --interval-seconds <n>    Poll interval in seconds (default: 30)
  --quiet-minutes <n>       Required quiet window after ready state (default: 15)
  --timeout-minutes <n>     Max monitor duration before failing (default: 180)
  --exit-on-action-required Exit non-zero when author action is required
  --no-exit-on-action-required Keep monitoring even when author action is required
  --dry-run                 Never call gh pr merge (report only)
  -h, --help                Show this help message

Environment:
  PR_MONITOR_QUIET_MINUTES=<n>  Override quiet window default
  PR_MONITOR_INTERVAL_SECONDS=<n>
  PR_MONITOR_TIMEOUT_MINUTES=<n>
  ready-review default: exit-on-action-required is on
  ready-review treats REVIEW_REQUIRED as informational; CHANGES_REQUESTED and actionable machine feedback still block handoff.
`);
      return;
  }
}

function printRlmHelp(): void {
  console.log(`Usage: codex-orchestrator rlm "<goal>" [options]

Options:
  --goal "<goal>"         Alternate way to set the goal (positional is preferred).
  --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
  --runtime-mode <cli|appserver>  Force runtime mode for this run.
  --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
  --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
  --multi-agent [auto|true|false]  Preferred alias for multi-agent collab subagents (implies symbolic mode).
  --collab [auto|true|false]  Legacy alias for --multi-agent.
  --validator <cmd|none>  Set validator command or disable validation.
  --max-iterations <n>    Override max iterations (0 = unlimited with validator).
  --max-minutes <n>       Optional time-based guardrail in minutes.
  --roles <single|triad>  Choose single or triad role split.
  --parent-run <id>       Link run to parent run id.
  --approval-policy <p>   Record approval policy metadata.
  --interactive | --ui    Enable read-only HUD when running in a TTY.
  --no-interactive        Force disable HUD.
  --help                  Show this message.

Examples:
  codex-orchestrator rlm "stabilize failing test lane"
  codex-orchestrator rlm --multi-agent auto "resolve conflicting product requirements"

Tips:
  - Use --multi-agent auto for ambiguous/long-horizon work.
  - Ensure multi-agent is enabled in Codex: codex features enable multi_agent (legacy alias: collab).
`);
}

function printFrontendTestHelp(): void {
  console.log(`Usage: codex-orchestrator frontend-test [options]

Runs the frontend-testing pipeline.

Options:
  --devtools              Enable Chrome DevTools MCP for this run.
  --task <id>             Override task identifier (defaults to MCP_RUNNER_TASK_ID).
  --runtime-mode <cli|appserver>  Force runtime mode for this run.
  --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
  --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
  --parent-run <id>       Link run to parent run id.
  --approval-policy <p>   Record approval policy metadata.
  --format json           Emit machine-readable output.
  --target <stage-id>     Focus plan/build metadata on a specific stage (alias: --target-stage).
  --interactive | --ui    Enable read-only HUD when running in a TTY.
  --no-interactive        Force disable HUD.
  --help                  Show this message.

Examples:
  codex-orchestrator frontend-test
  codex-orchestrator frontend-test --devtools --format json
`);
}

function printFlowHelp(): void {
  console.log(`Usage: codex-orchestrator flow [options]

Runs docs-review first, then implementation-gate. Stops on the first failure.

Options:
  --task <id>               Override task identifier.
  --parent-run <id>         Link docs-review run to parent run id.
  --approval-policy <p>     Record approval policy metadata.
  --format json             Emit machine-readable output for both runs.
  --execution-mode <mcp|cloud>  Force execution mode for both runs.
  --cloud                   Shortcut for --execution-mode cloud.
  --runtime-mode <cli|appserver>  Force runtime mode for both runs.
  --target <stage-id>       Focus plan/build metadata (applies where the stage exists).
  --auto-issue-log [true|false]  On failure, auto-write doctor issue bundle/log entry.
  --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
  --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
  --interactive | --ui      Enable read-only HUD when running in a TTY.
  --no-interactive          Force disable HUD.

Examples:
  codex-orchestrator flow --task <task-id>
  codex-orchestrator flow --task <task-id> --cloud --target implementation-gate:review

Post-run check:
  codex-orchestrator doctor --usage --window-days 30 --task <task-id>
`);
}

function printReviewHelp(): void {
  console.log(`Usage: codex-orchestrator review [options]

Runs the standalone review wrapper with manifest-backed evidence.
This command forwards arguments/environment to run-review and preserves its behavior.

Common options:
  --manifest <path>                Explicit manifest path for review evidence.
  --runs-dir <path>                Root runs directory when auto-resolving manifest.
  --task <id>                      Task id used for prompt context.
  --surface <diff|audit|architecture>  Select review surface (default: diff).
  --uncommitted                    Review uncommitted diff scope.
  --base <branch>                  Review against a base branch.
  --commit <sha>                   Review a specific commit.
  --title "<text>"                 Optional review title in the prompt.
  --non-interactive                Force non-interactive behavior.
  --runtime-mode <cli|appserver>   Force runtime mode for the underlying codex review call.
  --auto-issue-log [true|false]    Auto-capture issue bundle on review failure.
  --disable-delegation-mcp [true|false]  Disable delegation MCP for this review.
  --enable-delegation-mcp [true|false]   Legacy delegation MCP toggle (disable via false).

Environment controls (selected):
  NOTES                            Required review notes for authoritative gates ("Goal | Summary | Risks ...").
  CODEX_REVIEW_AUTHORITATIVE_GATE=1      Disallow prompt-only non-interactive handoff as gate success.
  CODEX_REVIEW_BREAK_GLASS_NOTES_FALLBACK=1  Allow missing NOTES only with owner, expiry, reason, and evidence env fields.
  CODEX_REVIEW_ALLOW_HEAVY_COMMANDS=1      Allow unrestricted heavy commands.
  CODEX_REVIEW_ENFORCE_BOUNDED_MODE=1      Enforce bounded mode (hard-stop heavy commands).
  CODEX_REVIEW_TIMEOUT_SECONDS             Optional overall timeout (0 disables when set).
  CODEX_REVIEW_STALL_TIMEOUT_SECONDS       Optional stall timeout (0 disables when set).
  CODEX_REVIEW_MONITOR_INTERVAL_SECONDS    Patience checkpoint cadence (0 disables).

Examples:
  TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review
  TASK=<task-id> NOTES="Goal: ... | Summary: ... | Risks: ..." codex-orchestrator review --manifest .runs/<task-id>/cli/<run-id>/manifest.json
`);
}

function printStartHelp(): void {
  console.log(`Usage: codex-orchestrator start [pipeline] [options]

Start a new run. If no pipeline is provided, diagnostics is used.

Options:
  --task <id>               Override task identifier.
  --parent-run <id>         Link run to parent run id.
  --approval-policy <p>     Record approval policy metadata.
  --issue-provider <name>   Persist provider identity for autonomous intake handoff.
  --issue-id <id>           Persist provider issue id on the run manifest.
  --issue-identifier <id>   Persist human issue identifier on the run manifest.
  --issue-updated-at <iso>  Persist provider issue updated timestamp on the run manifest.
  --format json             Emit machine-readable output.
  --execution-mode <mcp|cloud>  Force execution mode for this run.
  --cloud                   Shortcut for --execution-mode cloud.
  --runtime-mode <cli|appserver>  Force runtime mode for this run.
  --target <stage-id>       Focus plan/build metadata on a specific stage.
  --auto-issue-log [true|false]  On failure, auto-write doctor issue bundle/log entry.
  --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
  --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
  --goal "<goal>"           When pipeline is rlm, set the RLM goal.
  --multi-agent [auto|true|false]  Preferred alias for multi-agent collab subagents.
  --collab [auto|true|false]  Legacy alias for --multi-agent.
  --validator <cmd|none>    When pipeline is rlm, set validator command.
  --max-iterations <n>      When pipeline is rlm, override max iterations.
  --max-minutes <n>         When pipeline is rlm, override max minutes.
  --roles <single|triad>    When pipeline is rlm, set role split.
  --interactive | --ui      Enable read-only HUD when running in a TTY.
  --no-interactive          Force disable HUD.

Examples:
  codex-orchestrator start docs-review --task <task-id>
  codex-orchestrator start implementation-gate --task <task-id> --cloud --target review

Post-run check:
  codex-orchestrator doctor --usage --window-days 30 --task <task-id>
`);
}

function printPlanHelp(): void {
  console.log(`Usage: codex-orchestrator plan [pipeline] [options]

Preview pipeline stages without executing.

Options:
  --task <id>               Override task identifier.
  --format json             Emit machine-readable output.
  --target <stage-id>       Highlight the stage chosen for orchestration.
  --config-mode <repo-authoritative|downstream-compatibility>  Select repo config authority mode.
  --repo-config-required [true|false]  Legacy alias: true=repo-authoritative, false=downstream-compatibility.
`);
}

function printInitHelp(): void {
  console.log(`Usage: codex-orchestrator init codex [options]

Install starter templates into the target repository:
- AGENTS.md
- mcp-client.json
- .codex/config.toml (+ .codex/agents/* role files)
- codex.orchestrator.json

Options:
  --cwd <path>              Target directory (default current directory).
  --force                   Overwrite existing template files.
  --codex-cli               Also run CO-managed Codex CLI setup (plan unless --yes).
  --codex-source <path>     Build managed Codex CLI from local repo (or git URL).
  --codex-ref <ref>         Git ref for --codex-source.
  --codex-download-url <url>  Download managed Codex CLI prebuilt binary.
  --codex-download-sha256 <sha>  Expected SHA256 for the prebuilt download.
  --codex-force             Overwrite existing managed Codex CLI binary.
  --yes                     Apply managed Codex CLI setup.
`);
}
