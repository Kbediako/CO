import type { BuilderAgent, BuilderInput, BuildArtifact, BuildResult } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';

export type PipelineExecutor = (input: BuilderInput) => Promise<PipelineRunExecutionResult>;

export class CommandBuilder implements BuilderAgent {
  constructor(private readonly executePipeline: PipelineExecutor) {}

  async build(input: BuilderInput): Promise<BuildResult> {
    const result = await this.executePipeline(input);
    const failure = resolveManifestFailure(result.manifest);
    return {
      subtaskId: input.target.id,
      artifacts: [
        { path: result.manifestPath, description: 'CLI run manifest' },
        { path: result.logPath, description: 'Runner log (ndjson)' },
        ...collectCommandErrorArtifacts(result.manifest.commands),
        ...(result.manifest.cloud_execution?.diff_path
          ? [{ path: result.manifest.cloud_execution.diff_path, description: 'Cloud diff artifact' }]
          : [])
      ],
      mode: input.mode,
      runId: input.runId,
      success: result.success,
      notes: result.notes.join('\n') || undefined,
      failureStage: failure.stage,
      failureArtifactPath: failure.artifactPath,
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

interface ManifestFailure {
  stage: string | null;
  artifactPath: string | null;
}

function resolveManifestFailure(manifest: PipelineRunExecutionResult['manifest']): ManifestFailure {
  const stage = extractStageFromStatusDetail(manifest.status_detail) ?? firstFailedCommand(manifest.commands)?.id ?? null;
  const artifactPath = stage ? findCommandErrorArtifact(manifest.commands, stage) : (firstFailedCommand(manifest.commands)?.error_file ?? null);
  return { stage, artifactPath };
}

function extractStageFromStatusDetail(statusDetail: string | null): string | null {
  const match = /^(?:stage|subpipeline):(.+):(?:failed|error)$/.exec(statusDetail ?? '');
  return match?.[1] ?? null;
}

function firstFailedCommand(
  commands: PipelineRunExecutionResult['manifest']['commands']
): PipelineRunExecutionResult['manifest']['commands'][number] | null {
  return commands.find((command) => command.status === 'failed') ?? commands.find((command) => command.error_file) ?? null;
}

function findCommandErrorArtifact(
  commands: PipelineRunExecutionResult['manifest']['commands'],
  stage: string
): string | null {
  const matching = commands.find((command) => command.id === stage && command.error_file);
  return matching?.error_file ?? firstFailedCommand(commands)?.error_file ?? null;
}

function collectCommandErrorArtifacts(commands: PipelineRunExecutionResult['manifest']['commands']): BuildArtifact[] {
  const seen = new Set<string>();
  const artifacts: BuildArtifact[] = [];
  for (const command of commands) {
    const errorFile = command.error_file;
    if (!errorFile || seen.has(errorFile)) {
      continue;
    }
    seen.add(errorFile);
    artifacts.push({
      path: errorFile,
      description: `Command error artifact (${command.id})`
    });
  }
  return artifacts;
}
