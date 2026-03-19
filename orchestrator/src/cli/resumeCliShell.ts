import type { RunEventEmitter } from './events/runEvents.js';
import type { CodexOrchestrator } from './orchestrator.js';
import type { PipelineExecutionResult } from './types.js';

type OutputFormat = 'json' | 'text';
type RuntimeModeOption = 'cli' | 'appserver';

export interface RunResumeCliShellParams {
  orchestrator: CodexOrchestrator;
  runId: string;
  format: OutputFormat;
  runtimeMode?: RuntimeModeOption;
  resumeToken?: string;
  actor?: string;
  reason?: string;
  targetStageId?: string;
  runWithUi: (action: (runEvents: RunEventEmitter) => Promise<void>) => Promise<void>;
  emitRunOutput: (result: PipelineExecutionResult, format: OutputFormat, label: string) => void;
}

export async function runResumeCliShell(params: RunResumeCliShellParams): Promise<void> {
  await params.runWithUi(async (runEvents) => {
    const result = await params.orchestrator.resume({
      runId: params.runId,
      resumeToken: params.resumeToken,
      actor: params.actor,
      reason: params.reason,
      targetStageId: params.targetStageId,
      runtimeMode: params.runtimeMode,
      runEvents
    });
    params.emitRunOutput(result, params.format, 'Run resumed');
  });
}
