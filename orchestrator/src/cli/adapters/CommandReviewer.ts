import type { ReviewerAgent, ReviewInput, ReviewResult } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';
import { diagnoseCloudFailure } from './cloudFailureDiagnostics.js';

type ResultProvider = () => PipelineRunExecutionResult | null;

export class CommandReviewer implements ReviewerAgent {
  constructor(private readonly getResult: ResultProvider) {}

  async review(input: ReviewInput): Promise<ReviewResult> {
    const result = this.requireResult();
    if (input.mode === 'cloud') {
      const cloudExecution = result.manifest.cloud_execution;
      if (!cloudExecution) {
        const summaryLines = [
          result.success
            ? 'Cloud mode requested but preflight failed; fell back to MCP mode successfully.'
            : 'Cloud mode requested but preflight failed; fell back to MCP mode and the run failed.',
          `Manifest: ${result.manifestPath}`,
          `Runner log: ${result.logPath}`
        ];
        return {
          summary: summaryLines.join('\n'),
          decision: {
            approved: result.success,
            feedback: result.notes.join('\n') || result.manifest.summary || undefined
          }
        };
      }
      const status = cloudExecution?.status ?? 'unknown';
      const cloudTask = cloudExecution?.task_id ?? '<unknown>';
      const approved = status === 'ready' && result.success;
      const diagnosis = diagnoseCloudFailure({
        status,
        statusDetail: result.manifest.status_detail ?? null,
        error: cloudExecution?.error ?? null
      });
      const summaryLines = [
        approved
          ? `Cloud task ${cloudTask} completed successfully.`
          : `Cloud task ${cloudTask} did not complete successfully (${status}).`,
        `Manifest: ${result.manifestPath}`,
        `Runner log: ${result.logPath}`,
        ...(cloudExecution?.status_url ? [`Cloud status URL: ${cloudExecution.status_url}`] : [])
      ];
      if (!approved) {
        summaryLines.push(`Failure class: ${diagnosis.category}`);
        summaryLines.push(`Guidance: ${diagnosis.guidance}`);
      }
      const feedbackLines = [cloudExecution?.error ?? (result.notes.join('\n') || undefined)].filter(
        (line): line is string => Boolean(line && line.trim().length > 0)
      );
      if (!approved) {
        feedbackLines.push(`Failure class: ${diagnosis.category}`);
        feedbackLines.push(`Guidance: ${diagnosis.guidance}`);
      }
      return {
        summary: summaryLines.join('\n'),
        decision: {
          approved,
          feedback: feedbackLines.length > 0 ? feedbackLines.join('\n') : undefined
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
