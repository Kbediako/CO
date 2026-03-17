/* eslint-disable patterns/prefer-logger-over-console */

import type { RunEventEmitter } from './events/runEvents.js';
import type { CodexOrchestrator } from './orchestrator.js';

type RuntimeModeOption = 'cli' | 'appserver';

interface DoctorStatusSummary {
  collab: { status: 'ok' | 'disabled' | string };
}

interface PipelineExecutionManifest {
  run_id: string;
  status: string;
  artifact_root: string;
  log_path: string | null;
}

interface PipelineExecutionResultLike {
  manifest: PipelineExecutionManifest;
}

export interface RunRlmLaunchCliShellParams {
  orchestrator: CodexOrchestrator;
  runtimeMode?: RuntimeModeOption;
  goalFromArgs?: string;
  goalFlag?: string;
  goalEnv?: string;
  taskIdOverride?: string;
  parentRunId?: string;
  approvalPolicy?: string;
  collabUserChoice: boolean;
  runWithUi: (action: (runEvents: RunEventEmitter) => Promise<void>) => Promise<void>;
  emitRunOutput: (result: PipelineExecutionResultLike, format: 'text', label: string) => void;
  applyRlmEnvOverrides: (goal: string) => void;
  shouldWarnLegacyEnvAlias: () => boolean;
  resolveRlmTaskId: (taskFlag?: string) => string;
  setTaskEnvironment: (taskId: string) => void;
  runDoctor: () => DoctorStatusSummary;
  resolveRepoRoot: () => string;
  runCompletionShell: (params: { repoRoot: string; artifactRoot: string }) => Promise<void>;
  log: (line: string) => void;
  warn: (line: string) => void;
}

interface RlmLaunchCliShellDependencies {
  missingGoalMessage: string;
  enabledTipMessage: string;
  disabledTipMessage: string;
  legacyEnvAliasWarning: string;
}

const DEFAULT_DEPENDENCIES: RlmLaunchCliShellDependencies = {
  missingGoalMessage: 'rlm requires a goal. Use: codex-orchestrator rlm "<goal>".',
  enabledTipMessage:
    'Tip: multi-agent collab is enabled. Try: codex-orchestrator rlm --multi-agent auto "<goal>" (legacy: --collab auto).',
  disabledTipMessage:
    'Tip: multi-agent collab is available but disabled. Enable with: codex features enable multi_agent (legacy alias: collab).',
  legacyEnvAliasWarning: 'Warning: RLM_SYMBOLIC_COLLAB is a legacy alias; prefer RLM_SYMBOLIC_MULTI_AGENT.'
};

export async function runRlmLaunchCliShell(
  params: RunRlmLaunchCliShellParams,
  overrides: Partial<RlmLaunchCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const goal = params.goalFromArgs ?? params.goalFlag ?? params.goalEnv?.trim();
  if (!goal) {
    throw new Error(dependencies.missingGoalMessage);
  }

  const taskId = params.resolveRlmTaskId(params.taskIdOverride);
  params.setTaskEnvironment(taskId);
  const warnLegacyEnvAlias = params.shouldWarnLegacyEnvAlias();
  params.applyRlmEnvOverrides(goal);
  if (warnLegacyEnvAlias) {
    params.warn(dependencies.legacyEnvAliasWarning);
  }

  params.log(`Task: ${taskId}`);

  if (!params.collabUserChoice) {
    const doctor = params.runDoctor();
    if (doctor.collab.status === 'ok') {
      params.log(dependencies.enabledTipMessage);
    } else if (doctor.collab.status === 'disabled') {
      params.log(dependencies.disabledTipMessage);
    }
  }

  let startResult: PipelineExecutionResultLike | null = null;
  await params.runWithUi(async (runEvents) => {
    startResult = await params.orchestrator.start({
      pipelineId: 'rlm',
      taskId,
      parentRunId: params.parentRunId,
      approvalPolicy: params.approvalPolicy,
      runtimeMode: params.runtimeMode,
      runEvents
    });
    params.emitRunOutput(startResult, 'text', 'Run started');
  });

  if (!startResult) {
    throw new Error('rlm run failed to start.');
  }

  const resolvedStart = startResult as PipelineExecutionResultLike;
  await params.runCompletionShell({
    repoRoot: params.resolveRepoRoot(),
    artifactRoot: resolvedStart.manifest.artifact_root
  });
}
