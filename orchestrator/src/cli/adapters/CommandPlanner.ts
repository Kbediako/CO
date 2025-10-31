import type { PlannerAgent, PlanResult, TaskContext } from '../../types.js';
import type { PipelineDefinition } from '../types.js';

export class CommandPlanner implements PlannerAgent {
  constructor(private readonly pipeline: PipelineDefinition) {}

  async plan(task: TaskContext): Promise<PlanResult> {
    void task;
    return {
      items: this.pipeline.stages.map((stage) => ({
        id: `${this.pipeline.id}:${stage.id}`,
        description: stage.title,
        requires_cloud: false
      })),
      notes: this.pipeline.description
    };
  }
}
