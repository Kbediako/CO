import type { BuilderAgent, BuilderInput, BuildResult } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';

export type PipelineExecutor = (input: BuilderInput) => Promise<PipelineRunExecutionResult>;

export class CommandBuilder implements BuilderAgent {
  constructor(private readonly executePipeline: PipelineExecutor) {}

  async build(input: BuilderInput): Promise<BuildResult> {
    const result = await this.executePipeline(input);
    return {
      subtaskId: input.target.id,
      artifacts: [
        { path: result.manifestPath, description: 'CLI run manifest' },
        { path: result.logPath, description: 'Runner log (ndjson)' },
        ...(result.manifest.cloud_execution?.diff_path
          ? [{ path: result.manifest.cloud_execution.diff_path, description: 'Cloud diff artifact' }]
          : [])
      ],
      mode: input.mode,
      runId: input.runId,
      success: result.success,
      notes: result.notes.join('\n') || undefined,
      cloudExecution: result.manifest.cloud_execution
        ? {
            taskId: result.manifest.cloud_execution.task_id,
            environmentId: result.manifest.cloud_execution.environment_id,
            status: result.manifest.cloud_execution.status,
            statusUrl: result.manifest.cloud_execution.status_url,
            submittedAt: result.manifest.cloud_execution.submitted_at,
            completedAt: result.manifest.cloud_execution.completed_at,
            lastPolledAt: result.manifest.cloud_execution.last_polled_at,
            pollCount: result.manifest.cloud_execution.poll_count,
            pollIntervalSeconds: result.manifest.cloud_execution.poll_interval_seconds,
            timeoutSeconds: result.manifest.cloud_execution.timeout_seconds,
            attempts: result.manifest.cloud_execution.attempts,
            diffPath: result.manifest.cloud_execution.diff_path,
            diffUrl: result.manifest.cloud_execution.diff_url,
            diffStatus: result.manifest.cloud_execution.diff_status,
            applyStatus: result.manifest.cloud_execution.apply_status,
            logPath: result.manifest.cloud_execution.log_path,
            error: result.manifest.cloud_execution.error
          }
        : null
    };
  }
}
