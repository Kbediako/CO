import { describe, expect, it } from 'vitest';
import { TaskManager } from '../src/manager.js';
import { FunctionalPlannerAgent } from '../src/agents/planner.js';
import { FunctionalBuilderAgent } from '../src/agents/builder.js';
import { FunctionalTesterAgent } from '../src/agents/tester.js';
import { FunctionalReviewerAgent } from '../src/agents/reviewer.js';
import type { ExecutionMode, PlanItem, PlanResult, TaskContext } from '../src/types.js';
import { CodexOrchestrator } from '../src/cli/orchestrator.js';
import { CommandPlanner } from '../src/cli/adapters/CommandPlanner.js';
import type { PipelineDefinition, PipelineStage } from '../src/cli/types.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseTask: TaskContext = {
  id: 'task-1',
  title: 'Test task',
  metadata: {}
};

function makePlanItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'stage-1',
    description: 'Stage',
    ...overrides
  };
}

async function resolveManagerMode(
  taskMetadata: TaskContext['metadata'] | undefined,
  itemOverrides: Partial<PlanItem>
): Promise<ExecutionMode> {
  const planItem = makePlanItem(itemOverrides);
  const plan: PlanResult = { items: [planItem], notes: 'plan' };
  const planner = new FunctionalPlannerAgent(async () => plan);
  const builder = new FunctionalBuilderAgent(async (input) => ({
    subtaskId: input.target.id,
    artifacts: [],
    mode: input.mode,
    runId: input.runId,
    success: true
  }));
  const tester = new FunctionalTesterAgent(async (input) => ({
    subtaskId: input.build.subtaskId,
    success: true,
    reports: [],
    runId: input.runId
  }));
  const reviewer = new FunctionalReviewerAgent(async () => ({
    summary: 'ok',
    decision: { approved: true }
  }));
  const task: TaskContext = {
    id: baseTask.id,
    title: baseTask.title,
    ...(taskMetadata !== undefined ? { metadata: taskMetadata } : {})
  };

  const manager = new TaskManager({
    planner,
    builder,
    tester,
    reviewer,
    runIdFactory: () => 'run-1'
  });

  const summary = await manager.execute(task);
  return summary.mode;
}

function resolveCliRequiresCloud(
  taskMetadata: TaskContext['metadata'] | undefined,
  itemOverrides: Partial<PlanItem>
): boolean {
  const root = tmpdir();
  const orchestrator = new CodexOrchestrator({
    repoRoot: root,
    runsRoot: join(root, 'runs'),
    outRoot: join(root, 'out'),
    taskId: 'task-1'
  });
  const method = (orchestrator as unknown as {
    requiresCloudExecution: (task: TaskContext, subtask: PlanItem) => boolean;
  }).requiresCloudExecution;
  const task: TaskContext = {
    id: baseTask.id,
    title: baseTask.title,
    ...(taskMetadata !== undefined ? { metadata: taskMetadata } : {})
  };
  return method.call(orchestrator, task, makePlanItem(itemOverrides));
}

async function resolvePlannerItem(stageOverrides: Record<string, unknown>): Promise<PlanItem> {
  const stage = {
    kind: 'command',
    id: 'stage-1',
    title: 'Stage',
    command: 'echo test',
    ...stageOverrides
  } as PipelineStage;
  const pipeline: PipelineDefinition = {
    id: 'pipeline-1',
    title: 'Pipeline',
    stages: [stage]
  };
  const planner = new CommandPlanner(pipeline);
  const plan = await planner.plan({ id: 'task-1', title: 'Task', metadata: {} });
  return plan.items[0]!;
}

describe('execution-mode resolution', () => {
  it('manager trims metadata.mode and accepts truthy synonyms', async () => {
    const mode = await resolveManagerMode(
      { execution: { parallel: false } },
      { metadata: { mode: ' YeS ' } }
    );
    expect(mode).toBe('cloud');
  });

  it('manager prioritizes metadata.mode over metadata.executionMode', async () => {
    const mode = await resolveManagerMode(
      { mode: 'mcp', executionMode: 'cloud' },
      {}
    );
    expect(mode).toBe('mcp');
  });

  it('manager allows parallel override even when requires_cloud is false', async () => {
    const mode = await resolveManagerMode(
      { execution: { parallel: true } },
      { requires_cloud: false }
    );
    expect(mode).toBe('cloud');
  });

  it('cli treats explicit requires_cloud as final even when parallel is set', () => {
    const requiresCloud = resolveCliRequiresCloud(
      { execution: { parallel: true } },
      { requires_cloud: false }
    );
    expect(requiresCloud).toBe(false);
  });

  it('cli lowercases executionMode but does not trim whitespace', () => {
    const requiresCloud = resolveCliRequiresCloud(
      { execution: { parallel: false } },
      { metadata: { executionMode: ' Cloud ' } }
    );
    expect(requiresCloud).toBe(false);
  });

  it('cli lowercases executionMode casing without trimming', () => {
    const requiresCloud = resolveCliRequiresCloud(
      { execution: { parallel: false } },
      { metadata: { executionMode: 'ClOuD' } }
    );
    expect(requiresCloud).toBe(true);
  });

  it('cli prefers metadata.executionMode over metadata.mode', () => {
    const requiresCloud = resolveCliRequiresCloud(
      { execution: { parallel: false } },
      { metadata: { executionMode: 'mcp', mode: 'cloud' } }
    );
    expect(requiresCloud).toBe(false);
  });

  it('planner trims executionMode and maps it to requires_cloud', async () => {
    const item = await resolvePlannerItem({ plan: { executionMode: ' Cloud ' } });
    expect(item.requires_cloud).toBe(true);
    expect(item.metadata?.executionMode).toBe('cloud');
  });

  it('planner honors boolean flags before executionMode', async () => {
    const item = await resolvePlannerItem({
      requires_cloud: false,
      plan: { executionMode: 'cloud' }
    });
    expect(item.requires_cloud).toBe(false);
  });
});
