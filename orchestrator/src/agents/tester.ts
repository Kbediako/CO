import type { TestInput, TestResult, TesterAgent } from '../types.js';

export type TesterStrategy = (input: TestInput) => Promise<TestResult> | TestResult;

export class FunctionalTesterAgent implements TesterAgent {
  constructor(private readonly strategy: TesterStrategy) {}

  async test(input: TestInput): Promise<TestResult> {
    const result = await this.strategy(input);
    if (!result || typeof result.success !== 'boolean') {
      throw new Error('Tester strategy must return a TestResult with success flag');
    }
    return result;
  }
}
