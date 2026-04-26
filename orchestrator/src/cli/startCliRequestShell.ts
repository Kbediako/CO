import type { RunEventEmitter } from './events/runEvents.js';
import type { RunStartCliShellParams } from './startCliShell.js';
import { runStartCliShell } from './startCliShell.js';
import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  PROVIDER_LAUNCH_SOURCE_CONTROL_HOST,
  PROVIDER_LAUNCH_SOURCE_ENV,
  PROVIDER_LAUNCH_TOKEN_ENV
} from '../../../scripts/lib/provider-run-contract.js';

type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';
type RuntimeModeOption = 'cli' | 'appserver';
type ArgMap = Record<string, string | boolean>;
const PROVIDER_LINEAR_WORKER_PIPELINE_ID = 'provider-linear-worker';

export interface RunStartCliRequestShellParams {
  orchestrator: RunStartCliShellParams['orchestrator'];
  positionals: string[];
  flags: ArgMap;
  runWithUi: (
    format: OutputFormat,
    action: (runEvents: RunEventEmitter) => Promise<void>
  ) => Promise<void>;
  emitRunOutput: RunStartCliShellParams['emitRunOutput'];
  maybeCaptureAutoIssueLog: RunStartCliShellParams['maybeCaptureAutoIssueLog'];
  resolveTaskFilter: RunStartCliShellParams['resolveTaskFilter'];
  withAutoIssueLogContext: RunStartCliShellParams['withAutoIssueLogContext'];
  maybeEmitRunAdoptionHint: RunStartCliShellParams['maybeEmitRunAdoptionHint'];
  resolveExecutionModeFlag: (flags: ArgMap) => ExecutionModeOption | undefined;
  resolveRuntimeModeFlag: (flags: ArgMap) => RuntimeModeOption | undefined;
  applyRepoConfigRequiredPolicy: (flags: ArgMap) => boolean;
  resolveAutoIssueLogEnabled: (flags: ArgMap) => boolean;
  resolveTargetStageId: (flags: ArgMap) => string | undefined;
  readStringFlag: (flags: ArgMap, key: string) => string | undefined;
  shouldWarnLegacyMultiAgentEnv: (flags: ArgMap) => boolean;
  applyRlmEnvOverrides: (flags: ArgMap, goal?: string) => void;
  resolveRlmTaskId: RunStartCliShellParams['resolveRlmTaskId'];
  setTaskEnvironment: RunStartCliShellParams['setTaskEnvironment'];
  log: RunStartCliShellParams['log'];
  warn: RunStartCliShellParams['warn'];
  setExitCode: RunStartCliShellParams['setExitCode'];
}

export interface ProviderLinearWorkerStartGuardInput {
  pipelineId: string | undefined;
  issueId?: string | null;
  issueIdentifier?: string | null;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

interface StartCliRequestShellDependencies {
  runStartCliShell: typeof runStartCliShell;
}

const DEFAULT_DEPENDENCIES: StartCliRequestShellDependencies = {
  runStartCliShell
};

export async function runStartCliRequestShell(
  params: RunStartCliRequestShellParams,
  overrides: Partial<StartCliRequestShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const format = resolveOutputFormat(params.flags);
  const executionMode = params.resolveExecutionModeFlag(params.flags);
  const runtimeMode = params.resolveRuntimeModeFlag(params.flags);
  params.applyRepoConfigRequiredPolicy(params.flags);
  const autoIssueLogEnabled = params.resolveAutoIssueLogEnabled(params.flags);
  const taskIdOverride = readStringFlagValue(params.flags['task']);
  const goal = params.readStringFlag(params.flags, 'goal');
  const pipelineId = params.positionals[0];
  const issueId = readStringFlagValue(params.flags['issue-id']);
  const issueIdentifier = readStringFlagValue(params.flags['issue-identifier']);

  assertProviderLinearWorkerStartAllowed({
    pipelineId,
    issueId,
    issueIdentifier,
    env: process.env
  });

  await dependencies.runStartCliShell({
    orchestrator: params.orchestrator,
    pipelineId,
    format,
    executionMode,
    runtimeMode,
    autoIssueLogEnabled,
    taskIdOverride,
    parentRunId: readStringFlagValue(params.flags['parent-run']),
    approvalPolicy: readStringFlagValue(params.flags['approval-policy']),
    issueProvider: readStringFlagValue(params.flags['issue-provider']),
    issueId,
    issueIdentifier,
    issueUpdatedAt: readStringFlagValue(params.flags['issue-updated-at']),
    targetStageId: params.resolveTargetStageId(params.flags),
    runWithUi: async (action) => await params.runWithUi(format, action),
    emitRunOutput: params.emitRunOutput,
    maybeCaptureAutoIssueLog: params.maybeCaptureAutoIssueLog,
    resolveTaskFilter: params.resolveTaskFilter,
    withAutoIssueLogContext: params.withAutoIssueLogContext,
    maybeEmitRunAdoptionHint: params.maybeEmitRunAdoptionHint,
    isLegacyCollabEnvAliasEnabled: () => params.shouldWarnLegacyMultiAgentEnv(params.flags),
    applyRlmEnvOverrides: () => params.applyRlmEnvOverrides(params.flags, goal),
    resolveRlmTaskId: params.resolveRlmTaskId,
    setTaskEnvironment: params.setTaskEnvironment,
    log: params.log,
    warn: params.warn,
    setExitCode: params.setExitCode
  });
}

export function assertProviderLinearWorkerStartAllowed(
  input: ProviderLinearWorkerStartGuardInput
): void {
  if (input.pipelineId !== PROVIDER_LINEAR_WORKER_PIPELINE_ID) {
    return;
  }

  const env = input.env ?? process.env;
  const launchSource = normalizeEnvValue(env[PROVIDER_LAUNCH_SOURCE_ENV]);
  const controlHostTaskId = normalizeEnvValue(env[PROVIDER_CONTROL_HOST_TASK_ID_ENV]);
  const controlHostRunId = normalizeEnvValue(env[PROVIDER_CONTROL_HOST_RUN_ID_ENV]);
  const launchToken = normalizeEnvValue(env[PROVIDER_LAUNCH_TOKEN_ENV]);
  if (
    launchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST &&
    controlHostTaskId &&
    controlHostRunId &&
    launchToken
  ) {
    return;
  }

  const issueHint = normalizeOptionalString(input.issueId) ??
    normalizeOptionalString(input.issueIdentifier) ??
    '<linear-issue-id>';
  const missing = [
    launchSource === PROVIDER_LAUNCH_SOURCE_CONTROL_HOST ? null : `${PROVIDER_LAUNCH_SOURCE_ENV}=control-host`,
    controlHostTaskId ? null : PROVIDER_CONTROL_HOST_TASK_ID_ENV,
    controlHostRunId ? null : PROVIDER_CONTROL_HOST_RUN_ID_ENV,
    launchToken ? null : PROVIDER_LAUNCH_TOKEN_ENV
  ].filter((value): value is string => value !== null);

  throw new Error(
    [
      'Direct `codex-orchestrator start provider-linear-worker` is unsupported without matching control-host launch provenance.',
      `Use \`codex-orchestrator control-host recover --issue-id ${issueHint} --format json\` from the shared repo root, or let the running control host launch the provider worker.`,
      `Missing required provenance: ${missing.join(', ')}.`
    ].join(' ')
  );
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return flags['format'] === 'json' ? 'json' : 'text';
}

function readStringFlagValue(value: string | boolean | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEnvValue(value: string | undefined): string | null {
  return normalizeOptionalString(value);
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
