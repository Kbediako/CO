import type { TesterAgent, TestInput, TestResult, TestReport } from '../../types.js';
import type { PipelineRunExecutionResult } from '../types.js';
import { guardrailCommandPresent } from '../run/manifest.js';

type ResultProvider = () => PipelineRunExecutionResult | null;

export class CommandTester implements TesterAgent {
  constructor(private readonly getResult: ResultProvider) {}

  async test(input: TestInput): Promise<TestResult> {
    const result = this.requireResult();
    const guardrails = guardrailCommandPresent(result.manifest);
    const reports: TestReport[] = [
      {
        name: 'guardrails',
        status: guardrails ? 'passed' : 'failed',
        details: guardrails ? 'spec-guard step succeeded' : 'spec-guard step missing or failed'
      }
    ];

    return {
      subtaskId: input.build.subtaskId,
      success: guardrails && result.success,
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
