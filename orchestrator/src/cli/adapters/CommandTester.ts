import type { TesterAgent, TestInput, TestResult, TestReport } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';
import { ensureGuardrailStatus } from '../run/manifest.js';
import { diagnoseCloudFailure } from './cloudFailureDiagnostics.js';

type ResultProvider = () => PipelineRunExecutionResult | null;

export class CommandTester implements TesterAgent {
  constructor(private readonly getResult: ResultProvider) {}

  async test(input: TestInput): Promise<TestResult> {
    const result = this.requireResult();
    if (input.mode === 'cloud') {
      const cloudExecution = result.manifest.cloud_execution;
      if (!cloudExecution) {
        // Cloud mode can fall back to MCP when preflight fails; treat that as a normal guardrail run.
        const guardrailStatus = ensureGuardrailStatus(result.manifest);
        const reports: TestReport[] = [
          {
            name: 'cloud-preflight',
            status: 'passed',
            details:
              result.manifest.summary?.trim() ||
              'Cloud execution was skipped due to preflight failure; fell back to MCP mode.'
          },
          {
            name: 'guardrails',
            status: guardrailStatus.present ? 'passed' : 'failed',
            details: guardrailStatus.present
              ? guardrailStatus.summary
              : guardrailStatus.recommendation ?? guardrailStatus.summary
          }
        ];

        return {
          subtaskId: input.build.subtaskId,
          success: guardrailStatus.present && result.success,
          reports,
          runId: input.runId
        };
      }
      const status = cloudExecution?.status ?? 'unknown';
      const passed = status === 'ready' && result.success;
      const diagnosis = diagnoseCloudFailure({
        status,
        statusDetail: result.manifest.status_detail ?? null,
        error: cloudExecution?.error ?? null
      });
      const failureDetails =
        cloudExecution?.error ??
        `Cloud task status: ${status}${cloudExecution?.task_id ? ` (${cloudExecution.task_id})` : ''}`;
      const reports: TestReport[] = [
        {
          name: 'cloud-task',
          status: passed ? 'passed' : 'failed',
          details: passed
            ? failureDetails
            : `${failureDetails}\nFailure class: ${diagnosis.category}. ${diagnosis.guidance}`
        }
      ];

      return {
        subtaskId: input.build.subtaskId,
        success: passed,
        reports,
        runId: input.runId
      };
    }

    const guardrailStatus = ensureGuardrailStatus(result.manifest);
    const reports: TestReport[] = [
      {
        name: 'guardrails',
        status: guardrailStatus.present ? 'passed' : 'failed',
        details: guardrailStatus.present
          ? guardrailStatus.summary
          : guardrailStatus.recommendation ?? guardrailStatus.summary
      }
    ];

    return {
      subtaskId: input.build.subtaskId,
      success: guardrailStatus.present && result.success,
      reports,
      runId: input.runId
    };
  }

  private requireResult(): PipelineRunExecutionResult {
    const result = this.getResult();
    if (!result) {
      throw new Error('Pipeline result unavailable during tester stage.');
    }
    return result;
  }
}
