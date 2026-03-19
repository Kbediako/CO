import type { RunEventEmitter } from './events/runEvents.js';
import type { RunFrontendTestCliShellParams } from './frontendTestCliShell.js';
import { runFrontendTestCliShell } from './frontendTestCliShell.js';

type OutputFormat = 'json' | 'text';
type RuntimeModeOption = 'cli' | 'appserver';
type ArgMap = Record<string, string | boolean>;

export interface RunFrontendTestCliRequestShellParams {
  orchestrator: RunFrontendTestCliShellParams['orchestrator'];
  positionals: string[];
  flags: ArgMap;
  resolveRuntimeModeFlag: (flags: ArgMap) => RuntimeModeOption | undefined;
  applyRepoConfigRequiredPolicy: (flags: ArgMap) => boolean;
  resolveTargetStageId: (flags: ArgMap) => string | undefined;
  runWithUi: (
    format: OutputFormat,
    action: (runEvents: RunEventEmitter) => Promise<void>
  ) => Promise<void>;
  emitRunOutput: RunFrontendTestCliShellParams['emitRunOutput'];
  warn: (line: string) => void;
}

interface FrontendTestCliRequestShellDependencies {
  runFrontendTestCliShell: typeof runFrontendTestCliShell;
}

const DEFAULT_DEPENDENCIES: FrontendTestCliRequestShellDependencies = {
  runFrontendTestCliShell
};

export async function runFrontendTestCliRequestShell(
  params: RunFrontendTestCliRequestShellParams,
  overrides: Partial<FrontendTestCliRequestShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const format = resolveOutputFormat(params.flags);
  const devtoolsEnabled = Boolean(params.flags['devtools']);
  const runtimeMode = params.resolveRuntimeModeFlag(params.flags);
  params.applyRepoConfigRequiredPolicy(params.flags);

  if (params.positionals.length > 0) {
    params.warn(`[frontend-test] ignoring extra arguments: ${params.positionals.join(' ')}`);
  }

  await dependencies.runFrontendTestCliShell({
    orchestrator: params.orchestrator,
    format,
    devtoolsEnabled,
    runtimeMode,
    taskId: readRawStringFlagValue(params.flags['task']),
    parentRunId: readRawStringFlagValue(params.flags['parent-run']),
    approvalPolicy: readRawStringFlagValue(params.flags['approval-policy']),
    targetStageId: params.resolveTargetStageId(params.flags),
    runWithUi: async (action) => await params.runWithUi(format, action),
    emitRunOutput: params.emitRunOutput
  });
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return flags['format'] === 'json' ? 'json' : 'text';
}

function readRawStringFlagValue(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
