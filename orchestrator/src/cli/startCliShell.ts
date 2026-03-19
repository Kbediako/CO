/* eslint-disable patterns/prefer-logger-over-console */

import type { RunEventEmitter } from './events/runEvents.js';
import type { CodexOrchestrator } from './orchestrator.js';
import type { DoctorIssueLogResult } from './doctorIssueLog.js';
import type { PipelineExecutionResult } from './types.js';

type OutputFormat = 'json' | 'text';
type ExecutionModeOption = 'mcp' | 'cloud';
type RuntimeModeOption = 'cli' | 'appserver';

interface AutoIssueLogCaptureResult {
  issueLog: DoctorIssueLogResult | null;
  issueLogError: string | null;
}

export interface RunStartCliShellParams {
  orchestrator: CodexOrchestrator;
  pipelineId?: string;
  format: OutputFormat;
  executionMode?: ExecutionModeOption;
  runtimeMode?: RuntimeModeOption;
  autoIssueLogEnabled: boolean;
  taskIdOverride?: string;
  parentRunId?: string;
  approvalPolicy?: string;
  issueProvider?: string;
  issueId?: string;
  issueIdentifier?: string;
  issueUpdatedAt?: string;
  targetStageId?: string;
  runWithUi: (action: (runEvents: RunEventEmitter) => Promise<void>) => Promise<void>;
  emitRunOutput: (
    result: PipelineExecutionResult,
    format: OutputFormat,
    label: string,
    issueLogCapture?: AutoIssueLogCaptureResult
  ) => void;
  maybeCaptureAutoIssueLog: (params: {
    enabled: boolean;
    issueTitle: string;
    issueNotes: string;
    taskFilter: string | null;
  }) => Promise<AutoIssueLogCaptureResult>;
  resolveTaskFilter: (preferredTaskId?: string, taskIdOverride?: string) => string | null;
  withAutoIssueLogContext: (error: unknown, capture: AutoIssueLogCaptureResult) => Error;
  maybeEmitRunAdoptionHint: (params: {
    format: OutputFormat;
    taskFilter: string | null | undefined;
  }) => Promise<void>;
  isLegacyCollabEnvAliasEnabled: () => boolean;
  applyRlmEnvOverrides: () => void;
  resolveRlmTaskId: (taskFlag?: string) => string;
  setTaskEnvironment: (taskId: string) => void;
  log: (line: string) => void;
  warn: (line: string) => void;
  setExitCode: (code: number) => void;
}

interface RunStartCliShellDependencies {
  warnLegacyEnvMessage: string;
}

const DEFAULT_DEPENDENCIES: RunStartCliShellDependencies = {
  warnLegacyEnvMessage: 'Warning: RLM_SYMBOLIC_COLLAB is a legacy alias; prefer RLM_SYMBOLIC_MULTI_AGENT.'
};

export async function runStartCliShell(
  params: RunStartCliShellParams,
  overrides: Partial<RunStartCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const isRlm = params.pipelineId === 'rlm';

  if (isRlm) {
    const warnLegacyEnvAlias = params.isLegacyCollabEnvAliasEnabled();
    params.applyRlmEnvOverrides();
    if (warnLegacyEnvAlias) {
      params.warn(dependencies.warnLegacyEnvMessage);
    }
  }

  let taskIdOverride = params.taskIdOverride;
  try {
    await params.runWithUi(async (runEvents) => {
      if (isRlm) {
        taskIdOverride = params.resolveRlmTaskId(taskIdOverride);
        params.setTaskEnvironment(taskIdOverride);
        if (params.format !== 'json') {
          params.log(`Task: ${taskIdOverride}`);
        }
      }

      const result = await params.orchestrator.start({
        pipelineId: params.pipelineId,
        taskId: taskIdOverride,
        parentRunId: params.parentRunId,
        approvalPolicy: params.approvalPolicy,
        issueProvider: params.issueProvider,
        issueId: params.issueId,
        issueIdentifier: params.issueIdentifier,
        issueUpdatedAt: params.issueUpdatedAt,
        targetStageId: params.targetStageId,
        executionMode: params.executionMode,
        runtimeMode: params.runtimeMode,
        runEvents
      });

      const issueLogCapture =
        result.manifest.status !== 'succeeded'
          ? await params.maybeCaptureAutoIssueLog({
              enabled: params.autoIssueLogEnabled,
              issueTitle: `Auto issue log: start ${params.pipelineId ?? 'diagnostics'} failed`,
              issueNotes: `Automatic failure capture for run ${result.manifest.run_id} (${result.manifest.status}).`,
              taskFilter: params.resolveTaskFilter(result.manifest.task_id, taskIdOverride)
            })
          : { issueLog: null, issueLogError: null };

      params.emitRunOutput(result, params.format, 'Run started', issueLogCapture);

      if (result.manifest.status === 'failed' || result.manifest.status === 'cancelled') {
        params.setExitCode(1);
      }

      if (result.manifest.status === 'succeeded' && result.manifest.pipeline_id !== 'rlm') {
        await params.maybeEmitRunAdoptionHint({
          format: params.format,
          taskFilter: params.resolveTaskFilter(result.manifest.task_id, taskIdOverride)
        });
      }
    });
  } catch (error) {
    const issueLogCapture = await params.maybeCaptureAutoIssueLog({
      enabled: params.autoIssueLogEnabled,
      issueTitle: `Auto issue log: start ${params.pipelineId ?? 'diagnostics'} failed before run manifest`,
      issueNotes: 'Automatic failure capture for start setup failure before run manifest creation.',
      taskFilter: params.resolveTaskFilter(undefined, taskIdOverride)
    });
    throw params.withAutoIssueLogContext(error, issueLogCapture);
  }
}
