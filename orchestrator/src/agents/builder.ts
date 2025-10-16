import type { BuilderAgent, BuilderInput, BuildResult } from '../types.js';

export type BuilderStrategy = (input: BuilderInput) => Promise<BuildResult> | BuildResult;

export class FunctionalBuilderAgent implements BuilderAgent {
  constructor(private readonly strategy: BuilderStrategy) {}

  async build(input: BuilderInput): Promise<BuildResult> {
    const result = await this.strategy(input);
    if (!result || !result.subtaskId) {
      throw new Error('Builder strategy must return a BuildResult with subtaskId');
    }
    return result;
  }
}
