import process from 'node:process';

import type { RunEventEmitter } from './events/runEvents.js';
import type { CodexOrchestrator } from './orchestrator.js';
import type { PipelineExecutionResult } from './types.js';

type OutputFormat = 'json' | 'text';
type RuntimeModeOption = 'cli' | 'appserver';

export interface RunFrontendTestCliShellParams {
  orchestrator: CodexOrchestrator;
  format: OutputFormat;
  devtoolsEnabled: boolean;
  runtimeMode?: RuntimeModeOption;
  taskId?: string;
  parentRunId?: string;
  approvalPolicy?: string;
  targetStageId?: string;
  runWithUi: (action: (runEvents: RunEventEmitter) => Promise<void>) => Promise<void>;
  emitRunOutput: (result: PipelineExecutionResult, format: OutputFormat, label: string) => void;
}

interface FrontendTestCliShellDependencies {
  env: NodeJS.ProcessEnv;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: FrontendTestCliShellDependencies = {
  env: process.env,
  setExitCode: (code: number) => {
    process.exitCode = code;
  }
};

export async function runFrontendTestCliShell(
  params: RunFrontendTestCliShellParams,
  overrides: Partial<FrontendTestCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const originalDevtools = dependencies.env.CODEX_REVIEW_DEVTOOLS;

  if (params.devtoolsEnabled) {
    dependencies.env.CODEX_REVIEW_DEVTOOLS = '1';
  }

  try {
    await params.runWithUi(async (runEvents) => {
      const result = await params.orchestrator.start({
        pipelineId: 'frontend-testing',
        taskId: params.taskId,
        parentRunId: params.parentRunId,
        approvalPolicy: params.approvalPolicy,
        targetStageId: params.targetStageId,
        runtimeMode: params.runtimeMode,
        runEvents
      });
      params.emitRunOutput(result, params.format, 'Run started');
      if (result.manifest.status === 'failed' || result.manifest.status === 'cancelled') {
        dependencies.setExitCode(1);
      }
    });
  } finally {
    if (params.devtoolsEnabled) {
      if (originalDevtools === undefined) {
        delete dependencies.env.CODEX_REVIEW_DEVTOOLS;
      } else {
        dependencies.env.CODEX_REVIEW_DEVTOOLS = originalDevtools;
      }
    }
  }
}
