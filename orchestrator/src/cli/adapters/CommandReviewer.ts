import type { ReviewerAgent, ReviewInput, ReviewResult } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';

type ResultProvider = () => PipelineRunExecutionResult | null;

export class CommandReviewer implements ReviewerAgent {
  constructor(private readonly getResult: ResultProvider) {}

  async review(input: ReviewInput): Promise<ReviewResult> {
    void input;
    const result = this.requireResult();
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
