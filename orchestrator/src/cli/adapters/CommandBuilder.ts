import type { BuilderAgent, BuilderInput, BuildResult } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';

export type PipelineExecutor = () => Promise<PipelineRunExecutionResult>;

export class CommandBuilder implements BuilderAgent {
  constructor(private readonly executePipeline: PipelineExecutor) {}

  async build(input: BuilderInput): Promise<BuildResult> {
    const result = await this.executePipeline();
    return {
      subtaskId: input.target.id,
      artifacts: [
        { path: result.manifestPath, description: 'CLI run manifest' },
        { path: result.logPath, description: 'Runner log (ndjson)' }
      ],
      mode: input.mode,
      runId: input.runId,
      success: result.success,
      notes: result.notes.join('\n') || undefined
    };
  }
}
