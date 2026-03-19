import type { RunRlmLaunchCliShellParams } from './rlmLaunchCliShell.js';
import { runRlmLaunchCliShell } from './rlmLaunchCliShell.js';

type RuntimeModeOption = 'cli' | 'appserver';
type ArgMap = Record<string, string | boolean>;

export interface RunRlmCliRequestShellParams {
  orchestrator: RunRlmLaunchCliShellParams['orchestrator'];
  positionals: string[];
  flags: ArgMap;
  env: NodeJS.ProcessEnv;
  runWithUi: RunRlmLaunchCliShellParams['runWithUi'];
  emitRunOutput: RunRlmLaunchCliShellParams['emitRunOutput'];
  resolveRuntimeModeFlag: (flags: ArgMap) => RuntimeModeOption | undefined;
  applyRepoConfigRequiredPolicy: (flags: ArgMap) => boolean;
  readStringFlag: (flags: ArgMap, key: string) => string | undefined;
  applyRlmEnvOverrides: (flags: ArgMap, goal?: string) => void;
  shouldWarnLegacyEnvAlias: (flags: ArgMap, env: NodeJS.ProcessEnv) => boolean;
  resolveRlmTaskId: RunRlmLaunchCliShellParams['resolveRlmTaskId'];
  setTaskEnvironment: RunRlmLaunchCliShellParams['setTaskEnvironment'];
  runDoctor: RunRlmLaunchCliShellParams['runDoctor'];
  resolveRepoRoot: RunRlmLaunchCliShellParams['resolveRepoRoot'];
  runCompletionShell: RunRlmLaunchCliShellParams['runCompletionShell'];
  log: RunRlmLaunchCliShellParams['log'];
  warn: RunRlmLaunchCliShellParams['warn'];
}

interface RlmCliRequestShellDependencies {
  runRlmLaunchCliShell: typeof runRlmLaunchCliShell;
}

const DEFAULT_DEPENDENCIES: RlmCliRequestShellDependencies = {
  runRlmLaunchCliShell
};

export async function runRlmCliRequestShell(
  params: RunRlmCliRequestShellParams,
  overrides: Partial<RlmCliRequestShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const runtimeMode = params.resolveRuntimeModeFlag(params.flags);
  params.applyRepoConfigRequiredPolicy(params.flags);
  const goalFromArgs = params.positionals.length > 0 ? params.positionals.join(' ') : undefined;

  const collabUserChoice =
    params.flags['collab'] !== undefined ||
    params.flags['multi-agent'] !== undefined ||
    params.env.RLM_SYMBOLIC_COLLAB !== undefined ||
    params.env.RLM_SYMBOLIC_MULTI_AGENT !== undefined;

  await dependencies.runRlmLaunchCliShell({
    orchestrator: params.orchestrator,
    runtimeMode,
    goalFromArgs,
    goalFlag: params.readStringFlag(params.flags, 'goal') ?? undefined,
    goalEnv: params.env.RLM_GOAL,
    taskIdOverride: readRawStringFlagValue(params.flags['task']),
    parentRunId: readRawStringFlagValue(params.flags['parent-run']),
    approvalPolicy: readRawStringFlagValue(params.flags['approval-policy']),
    collabUserChoice,
    runWithUi: params.runWithUi,
    emitRunOutput: params.emitRunOutput,
    applyRlmEnvOverrides: (goal) => params.applyRlmEnvOverrides(params.flags, goal),
    shouldWarnLegacyEnvAlias: () => params.shouldWarnLegacyEnvAlias(params.flags, params.env),
    resolveRlmTaskId: params.resolveRlmTaskId,
    setTaskEnvironment: params.setTaskEnvironment,
    runDoctor: params.runDoctor,
    resolveRepoRoot: params.resolveRepoRoot,
    runCompletionShell: params.runCompletionShell,
    log: params.log,
    warn: params.warn
  });
}

function readRawStringFlagValue(value: string | boolean | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  return value;
}
