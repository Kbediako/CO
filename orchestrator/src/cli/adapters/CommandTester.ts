import type { TesterAgent, TestInput, TestResult, TestReport } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';
import { ensureGuardrailStatus } from '../run/manifest.js';

type ResultProvider = () => PipelineRunExecutionResult | null;

export class CommandTester implements TesterAgent {
  constructor(private readonly getResult: ResultProvider) {}

  async test(input: TestInput): Promise<TestResult> {
    const result = this.requireResult();
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
