import type { RunEventEmitter } from './events/runEvents.js';
import type { RunStartCliShellParams } from './startCliShell.js';
import { runStartCliShell } from './startCliShell.js';

type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';
type RuntimeModeOption = 'cli' | 'appserver';
type ArgMap = Record<string, string | boolean>;

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

  await dependencies.runStartCliShell({
    orchestrator: params.orchestrator,
    pipelineId: params.positionals[0],
    format,
    executionMode,
    runtimeMode,
    autoIssueLogEnabled,
    taskIdOverride,
    parentRunId: readStringFlagValue(params.flags['parent-run']),
    approvalPolicy: readStringFlagValue(params.flags['approval-policy']),
    issueProvider: readStringFlagValue(params.flags['issue-provider']),
    issueId: readStringFlagValue(params.flags['issue-id']),
    issueIdentifier: readStringFlagValue(params.flags['issue-identifier']),
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
