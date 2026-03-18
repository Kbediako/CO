import type { RunEventEmitter } from './events/runEvents.js';
import type { RunFlowCliShellParams } from './flowCliShell.js';
import { runFlowCliShell } from './flowCliShell.js';

type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';
type RuntimeModeOption = 'cli' | 'appserver';
type ArgMap = Record<string, string | boolean>;

export interface RunFlowCliRequestShellParams {
  orchestrator: RunFlowCliShellParams['orchestrator'];
  positionals: string[];
  flags: ArgMap;
  runWithUi: (
    format: OutputFormat,
    action: (runEvents: RunEventEmitter) => Promise<void>
  ) => Promise<void>;
  emitRunOutput: RunFlowCliShellParams['emitRunOutput'];
  formatIssueLogSummary: RunFlowCliShellParams['formatIssueLogSummary'];
  toRunOutputPayload: RunFlowCliShellParams['toRunOutputPayload'];
  maybeCaptureAutoIssueLog: RunFlowCliShellParams['maybeCaptureAutoIssueLog'];
  resolveTaskFilter: RunFlowCliShellParams['resolveTaskFilter'];
  withAutoIssueLogContext: RunFlowCliShellParams['withAutoIssueLogContext'];
  maybeEmitRunAdoptionHint: RunFlowCliShellParams['maybeEmitRunAdoptionHint'];
  resolveExecutionModeFlag: (flags: ArgMap) => ExecutionModeOption | undefined;
  resolveRuntimeModeFlag: (flags: ArgMap) => RuntimeModeOption | undefined;
  applyRepoConfigRequiredPolicy: (flags: ArgMap) => boolean;
  resolveAutoIssueLogEnabled: (flags: ArgMap) => boolean;
  resolveTargetStageId: (flags: ArgMap) => string | undefined;
}

interface FlowCliRequestShellDependencies {
  runFlowCliShell: typeof runFlowCliShell;
}

const DEFAULT_DEPENDENCIES: FlowCliRequestShellDependencies = {
  runFlowCliShell
};

export async function runFlowCliRequestShell(
  params: RunFlowCliRequestShellParams,
  overrides: Partial<FlowCliRequestShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  if (params.positionals.length > 0) {
    throw new Error(`flow does not accept positional arguments: ${params.positionals.join(' ')}`);
  }

  const format = resolveOutputFormat(params.flags);
  const executionMode = params.resolveExecutionModeFlag(params.flags);
  const runtimeMode = params.resolveRuntimeModeFlag(params.flags);
  params.applyRepoConfigRequiredPolicy(params.flags);
  const autoIssueLogEnabled = params.resolveAutoIssueLogEnabled(params.flags);

  await dependencies.runFlowCliShell({
    orchestrator: params.orchestrator,
    format,
    executionMode,
    runtimeMode,
    autoIssueLogEnabled,
    taskId: readStringFlagValue(params.flags['task']),
    parentRunId: readStringFlagValue(params.flags['parent-run']),
    approvalPolicy: readStringFlagValue(params.flags['approval-policy']),
    targetStageId: params.resolveTargetStageId(params.flags),
    runWithUi: async (action) => await params.runWithUi(format, action),
    emitRunOutput: params.emitRunOutput,
    formatIssueLogSummary: params.formatIssueLogSummary,
    toRunOutputPayload: params.toRunOutputPayload,
    maybeCaptureAutoIssueLog: params.maybeCaptureAutoIssueLog,
    resolveTaskFilter: params.resolveTaskFilter,
    withAutoIssueLogContext: params.withAutoIssueLogContext,
    maybeEmitRunAdoptionHint: params.maybeEmitRunAdoptionHint
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
