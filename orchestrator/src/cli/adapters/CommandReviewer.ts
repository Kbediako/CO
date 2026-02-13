import type { ReviewerAgent, ReviewInput, ReviewResult } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';

type ResultProvider = () => PipelineRunExecutionResult | null;

export class CommandReviewer implements ReviewerAgent {
  constructor(private readonly getResult: ResultProvider) {}

  async review(input: ReviewInput): Promise<ReviewResult> {
    const result = this.requireResult();
    if (input.mode === 'cloud') {
      const cloudExecution = result.manifest.cloud_execution;
      const status = cloudExecution?.status ?? 'unknown';
      const cloudTask = cloudExecution?.task_id ?? '<unknown>';
      const summaryLines = [
        status === 'ready'
          ? `Cloud task ${cloudTask} completed successfully.`
          : `Cloud task ${cloudTask} did not complete successfully (${status}).`,
        `Manifest: ${result.manifestPath}`,
        `Runner log: ${result.logPath}`,
        ...(cloudExecution?.status_url ? [`Cloud status URL: ${cloudExecution.status_url}`] : [])
      ];
      return {
        summary: summaryLines.join('\n'),
        decision: {
          approved: status === 'ready' && result.success,
          feedback: cloudExecution?.error ?? (result.notes.join('\n') || undefined)
        }
      };
    }

    const summaryLines = [
      result.success
        ? 'Diagnostics pipeline succeeded.'
        : 'Diagnostics pipeline failed — inspect manifest for details.',
      `Manifest: ${result.manifestPath}`,
      `Runner log: ${result.logPath}`
    ];
    const summary = summaryLines.join('\n');
    return {
      summary,
      decision: {
        approved: result.success,
        feedback: result.notes.join('\n') || undefined
      }
    };
  }

  private requireResult(): PipelineRunExecutionResult {
    const result = this.getResult();
    if (!result) {
      throw new Error('Pipeline result unavailable during reviewer stage.');
    }
    return result;
  }
}
