import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventBus } from '../src/events/EventBus.js';
import { TaskManager } from '../src/manager.js';
import {
  FunctionalPlannerAgent,
  FunctionalBuilderAgent,
  FunctionalTesterAgent,
  FunctionalReviewerAgent
} from '../src/agents/index.js';
import { TaskStateStore } from '../src/persistence/TaskStateStore.js';
import { RunManifestWriter } from '../src/persistence/RunManifestWriter.js';
import * as Sanitize from '../src/persistence/sanitizeTaskId.js';
import type {
  BuildResult,
  PlanResult,
  ReviewResult,
  TaskContext,
  TestResult
} from '../src/types.js';

describe('TaskManager', () => {
  const baseTask: TaskContext = {
    id: '0001',
    title: 'Orchestrate core implementation',
    metadata: {}
  };

  it('executes planner, builder, tester, and reviewer in sequence and emits events', async () => {
    const plan: PlanResult = {
      items: [{ id: 'subtask-A', description: 'Implement manager pipeline' }],
      notes: 'Scaffold orchestrator core'
    };

    const plannerFn = vi.fn(async () => plan);
    const builderFn = vi.fn(async () => ({
      subtaskId: 'subtask-A',
      artifacts: [
        { path: '.runs/3/diff.patch', description: 'Manager scaffolding diff' }
      ],
      mode: 'mcp' as const,
      notes: 'Mutation via MCP path',
      success: true,
      runId: 'ignored-by-normalizer'
    } satisfies BuildResult));

    const testerFn = vi.fn(async () => ({
      subtaskId: 'subtask-A',
      success: true,
      reports: [{ name: 'npm test', status: 'passed' }],
      runId: 'ignored'
    } satisfies TestResult));

    const reviewerFn = vi.fn(async () => ({
      summary: 'Ready for human review',
      decision: { approved: true, feedback: 'Looks safe' }
    } satisfies ReviewResult));

    const planner = new FunctionalPlannerAgent(plannerFn);
    const builder = new FunctionalBuilderAgent(builderFn);
    const tester = new FunctionalTesterAgent(testerFn);
    const reviewer = new FunctionalReviewerAgent(reviewerFn);
    const eventBus = new EventBus();
    const events: string[] = [];
    for (const type of ['plan:completed', 'build:completed', 'test:completed', 'review:completed', 'run:completed'] as const) {
      eventBus.on(type, (event) => {
        events.push(event.type);
      });
    }

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      eventBus,
      runIdFactory: () => 'run-fixed'
    });

    const result = await manager.execute(baseTask);

    expect(plannerFn).toHaveBeenCalledWith(baseTask);
    expect(builderFn).toHaveBeenCalledWith({
      task: baseTask,
      plan,
      target: plan.items[0],
      mode: 'mcp',
      runId: 'run-fixed'
    });
    expect(testerFn).toHaveBeenCalledWith({
      task: baseTask,
      build: expect.objectContaining({ subtaskId: 'subtask-A', mode: 'mcp', runId: 'run-fixed' }),
      mode: 'mcp',
      runId: 'run-fixed'
    });
    expect(reviewerFn).toHaveBeenCalledWith({
      task: baseTask,
      plan,
      build: expect.objectContaining({ subtaskId: 'subtask-A', mode: 'mcp' }),
      test: expect.objectContaining({ success: true }),
      mode: 'mcp',
      runId: 'run-fixed'
    });

    expect(result.runId).toBe('run-fixed');
    expect(result.mode).toBe('mcp');
    expect(result.plan).toEqual(plan);
    expect(events).toEqual([
      'plan:completed',
      'build:completed',
      'test:completed',
      'review:completed',
      'run:completed'
    ]);
  });

  it('selects cloud mode when subtask requires cloud execution', async () => {
    const cloudTask: TaskContext = {
      ...baseTask,
      metadata: { execution: { parallel: false } }
    };

    const plan: PlanResult = {
      items: [
        { id: 'subtask-cloud', description: 'Run in cloud', requires_cloud: true, selected: true },
        { id: 'fallback', description: 'Local fallback' }
      ],
      targetId: 'subtask-cloud'
    };

    const planner = new FunctionalPlannerAgent(async () => plan);
    const builder = new FunctionalBuilderAgent(async (input) => ({
      subtaskId: input.target.id,
      artifacts: [],
      mode: input.mode,
      notes: 'ran',
      success: true,
      runId: 'should-overwrite'
    }));
    const tester = new FunctionalTesterAgent(async (input) => ({
      subtaskId: input.build.subtaskId,
      success: true,
      reports: [],
      runId: input.runId
    }));
    const reviewer = new FunctionalReviewerAgent(async () => ({
      summary: 'approved',
      decision: { approved: true }
    }));

    const manager = new TaskManager({ planner, builder, tester, reviewer });
    const result = await manager.execute(cloudTask);

    expect(result.mode).toBe('cloud');
    expect(result.build.mode).toBe('cloud');
  });

  it('throws when planner produces no subtasks', async () => {
    const planner = new FunctionalPlannerAgent(async () => ({ items: [] }));
    const builder = new FunctionalBuilderAgent(async () => {
      throw new Error('builder should not run');
    });
    const tester = new FunctionalTesterAgent(async () => {
      throw new Error('tester should not run');
    });
    const reviewer = new FunctionalReviewerAgent(async () => {
      throw new Error('reviewer should not run');
    });

    const manager = new TaskManager({ planner, builder, tester, reviewer });

    await expect(manager.execute(baseTask)).rejects.toThrow('Planner returned no executable subtasks.');
  });

  it('persists run summaries when persistence is configured', async () => {
    const root = await mkdtemp(join(tmpdir(), 'task-manager-persist-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');

    const plan: PlanResult = {
      items: [{ id: 'persist', description: 'Persist to disk' }]
    };

    const planner = new FunctionalPlannerAgent(async () => plan);
    const builder = new FunctionalBuilderAgent(async (input) => ({
      subtaskId: input.target.id,
      artifacts: [],
      mode: input.mode,
      success: true,
      runId: input.runId
    }));
    const tester = new FunctionalTesterAgent(async () => ({
      subtaskId: 'persist',
      success: true,
      reports: [],
      runId: 'run-fixed'
    }));
    const reviewer = new FunctionalReviewerAgent(async () => ({
      summary: 'ok',
      decision: { approved: true }
    }));

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => 'run-fixed',
      persistence: {
        stateStore: new TaskStateStore({ runsDir, outDir }),
        manifestWriter: new RunManifestWriter({ runsDir })
      }
    });

    await manager.execute(baseTask);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const manifest = JSON.parse(
      await readFile(join(runsDir, baseTask.id, 'run-fixed', 'manifest.json'), 'utf-8')
    );
    expect(manifest.runId).toBe('run-fixed');

    const state = JSON.parse(await readFile(join(outDir, baseTask.id, 'state.json'), 'utf-8'));
    expect(state.lastRunAt).toBe(manifest.timestamp);
    expect(state.runs).toHaveLength(1);
  });

  it('sanitizes task IDs before persisting run artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'task-manager-sanitize-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const taskWithPunctuation: TaskContext = {
      ...baseTask,
      id: 'task.safe-123'
    };

    const plan: PlanResult = {
      items: [{ id: 'sanitize', description: 'Validate persistence paths' }]
    };

    const planner = new FunctionalPlannerAgent(async () => plan);
    const builder = new FunctionalBuilderAgent(async (input) => ({
      subtaskId: input.target.id,
      artifacts: [],
      mode: input.mode,
      success: true,
      runId: input.runId
    }));
    const tester = new FunctionalTesterAgent(async () => ({
      subtaskId: 'sanitize',
      success: true,
      reports: [],
      runId: 'run-fixed'
    }));
    const reviewer = new FunctionalReviewerAgent(async () => ({
      summary: 'ok',
      decision: { approved: true }
    }));

    const sanitizeSpy = vi.spyOn(Sanitize, 'sanitizeTaskId');

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => 'run-fixed',
      persistence: {
        stateStore: new TaskStateStore({ runsDir, outDir }),
        manifestWriter: new RunManifestWriter({ runsDir })
      }
    });

    try {
      await manager.execute(taskWithPunctuation);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(sanitizeSpy).toHaveBeenCalledWith(taskWithPunctuation.id);

      const expectedManifestPath = join(runsDir, taskWithPunctuation.id, 'run-fixed', 'manifest.json');
      const manifest = JSON.parse(await readFile(expectedManifestPath, 'utf-8'));
      expect(manifest.taskId).toBe(taskWithPunctuation.id);
    } finally {
      sanitizeSpy.mockRestore();
    }
  });
});
