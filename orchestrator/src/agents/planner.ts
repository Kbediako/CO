import type { PlanResult, PlannerAgent, TaskContext } from '../types.js';

export type PlannerStrategy = (context: TaskContext) => Promise<PlanResult> | PlanResult;

/**
 * Planner agent that delegates to a provided strategy function. This keeps the
 * orchestrator core agnostic of how plans are generated (Agents SDK, MCP, etc.).
 */
export class FunctionalPlannerAgent implements PlannerAgent {
  constructor(private readonly strategy: PlannerStrategy) {}

  async plan(context: TaskContext): Promise<PlanResult> {
    const result = await this.strategy(context);
    if (!result || !Array.isArray(result.items)) {
      throw new Error('Planner strategy must return PlanResult.items');
    }
    return result;
  }
}
