import type { ReviewInput, ReviewResult, ReviewerAgent } from '../types.js';

export type ReviewerStrategy = (input: ReviewInput) => Promise<ReviewResult> | ReviewResult;

export class FunctionalReviewerAgent implements ReviewerAgent {
  constructor(private readonly strategy: ReviewerStrategy) {}

  async review(input: ReviewInput): Promise<ReviewResult> {
    const result = await this.strategy(input);
    if (!result || !result.decision) {
      throw new Error('Reviewer strategy must include a decision');
    }
    return result;
  }
}
