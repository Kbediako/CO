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

  it('skips tester and reviewer when the build fails', async () => {
    const plan: PlanResult = {
      items: [{ id: 'subtask-failure', description: 'Fail build' }]
    };

    const plannerFn = vi.fn(async () => plan);
    const builderFn = vi.fn(async () => ({
      subtaskId: 'subtask-failure',
      artifacts: [],
      mode: 'mcp' as const,
      success: false,
      notes: 'build failed',
      runId: 'ignored'
    } satisfies BuildResult));
    const testerFn = vi.fn(async () => {
      throw new Error('tester should not run when build fails');
    });
    const reviewerFn = vi.fn(async () => {
      throw new Error('reviewer should not run when build fails');
    });

    const planner = new FunctionalPlannerAgent(plannerFn);
    const builder = new FunctionalBuilderAgent(builderFn);
    const tester = new FunctionalTesterAgent(testerFn);
    const reviewer = new FunctionalReviewerAgent(reviewerFn);

    const eventBus = new EventBus();
    const events: string[] = [];
    for (const type of ['plan:completed', 'build:completed', 'test:completed', 'review:completed', 'run:completed'] as const) {
      eventBus.on(type, (event) => events.push(event.type));
    }

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      eventBus,
      runIdFactory: () => 'run-failed-build'
    });

    const result = await manager.execute(baseTask);

    expect(plannerFn).toHaveBeenCalledTimes(1);
    expect(builderFn).toHaveBeenCalledTimes(1);
    expect(testerFn).not.toHaveBeenCalled();
    expect(reviewerFn).not.toHaveBeenCalled();
    expect(events).toEqual(['plan:completed', 'build:completed', 'run:completed']);

    expect(result.test.reports[0]?.details).toContain('Skipped because the build stage failed.');
    expect(result.review.summary).toBe('Review skipped: build stage failed.');
  });

  it('skips reviewer when tests fail', async () => {
    const plan: PlanResult = {
      items: [{ id: 'subtask-tests', description: 'Fail tests' }]
    };

    const plannerFn = vi.fn(async () => plan);
    const builderFn = vi.fn(async () => ({
      subtaskId: 'subtask-tests',
      artifacts: [],
      mode: 'mcp' as const,
      success: true,
      runId: 'ignored'
    } satisfies BuildResult));
    const testerFn = vi.fn(async () => ({
      subtaskId: 'subtask-tests',
      success: false,
      reports: [{ name: 'npm test', status: 'failed', details: 'unit failure' }],
      runId: 'ignored'
    } satisfies TestResult));
    const reviewerFn = vi.fn(async () => {
      throw new Error('reviewer should not run when tests fail');
    });

    const planner = new FunctionalPlannerAgent(plannerFn);
    const builder = new FunctionalBuilderAgent(builderFn);
    const tester = new FunctionalTesterAgent(testerFn);
    const reviewer = new FunctionalReviewerAgent(reviewerFn);

    const eventBus = new EventBus();
    const events: string[] = [];
    for (const type of ['plan:completed', 'build:completed', 'test:completed', 'review:completed', 'run:completed'] as const) {
      eventBus.on(type, (event) => events.push(event.type));
    }

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      eventBus,
      runIdFactory: () => 'run-failed-tests'
    });

    const result = await manager.execute(baseTask);

    expect(plannerFn).toHaveBeenCalledTimes(1);
    expect(builderFn).toHaveBeenCalledTimes(1);
    expect(testerFn).toHaveBeenCalledTimes(1);
    expect(reviewerFn).not.toHaveBeenCalled();
    expect(events).toEqual(['plan:completed', 'build:completed', 'test:completed', 'run:completed']);

    expect(result.test.success).toBe(false);
    expect(result.review.summary).toBe('Review skipped: tests failed.');
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

  it('throws when planner produces only non-runnable subtasks', async () => {
    const plan: PlanResult = {
      items: [
        { id: 'blocked-1', description: 'Blocked', runnable: false },
        { id: 'blocked-2', description: 'Still blocked', runnable: false }
      ]
    };

    const planner = new FunctionalPlannerAgent(async () => plan);
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

    await expect(manager.execute(baseTask)).rejects.toThrow(
      'Planner returned no runnable subtasks after applying selection and target hints.'
    );
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

    const summary = await manager.execute(baseTask);

    // Explicitly await the persistence operation
    await manager.persistenceCoordinator!.handleRunCompleted(summary);

    const manifest = JSON.parse(
      await readFile(join(runsDir, baseTask.id, 'run-fixed', 'manifest.json'), 'utf-8')
    );
    expect(manifest.runId).toBe('run-fixed');

    const state = JSON.parse(await readFile(join(outDir, baseTask.id, 'runs.json'), 'utf-8'));
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
      let manifestRaw: string | null = null;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          manifestRaw = await readFile(expectedManifestPath, 'utf-8');
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
      if (!manifestRaw) {
        throw new Error(`Expected manifest not written: ${expectedManifestPath}`);
      }
      const manifest = JSON.parse(manifestRaw);
      expect(manifest.taskId).toBe(taskWithPunctuation.id);
    } finally {
      sanitizeSpy.mockRestore();
    }
  });

  it('persists synthesized summaries when the builder throws', async () => {
    const plan: PlanResult = {
      items: [{ id: 'builder-error', description: 'cause builder to throw', runnable: true }]
    };

    const planner = new FunctionalPlannerAgent(async () => plan);
    const builder = new FunctionalBuilderAgent(async () => {
      throw new Error('builder exploded');
    });
    const tester = new FunctionalTesterAgent(async () => {
      throw new Error('tester should not run');
    });
    const reviewer = new FunctionalReviewerAgent(async () => ({
      summary: 'should not run',
      decision: { approved: false }
    }));
    const recordRun = vi.fn().mockResolvedValue(undefined);
    const writeManifest = vi.fn().mockResolvedValue('manifest-path');

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => 'run-safe',
      persistence: {
        stateStore: { recordRun } as unknown as TaskStateStore,
        manifestWriter: { write: writeManifest } as unknown as RunManifestWriter
      }
    });

    const summary = await manager.execute(baseTask);
    expect(summary.build.success).toBe(false);
    expect(summary.build.notes).toContain('builder exploded');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(recordRun).toHaveBeenCalledWith(summary);
    expect(writeManifest).toHaveBeenCalledWith(summary);
  });

  it('persists synthesized summaries when the tester throws', async () => {
    const plan: PlanResult = {
      items: [{ id: 'tester-error', description: 'cause tester to throw', runnable: true }]
    };

    const planner = new FunctionalPlannerAgent(async () => plan);
    const builder = new FunctionalBuilderAgent(async (input) => ({
      subtaskId: input.target.id,
      artifacts: [],
      mode: input.mode,
      success: true,
      runId: input.runId
    }));
    const tester = new FunctionalTesterAgent(async () => {
      throw new Error('tester exploded');
    });
    const reviewer = new FunctionalReviewerAgent(async () => ({
      summary: 'should not run',
      decision: { approved: false }
    }));
    const recordRun = vi.fn().mockResolvedValue(undefined);
    const writeManifest = vi.fn().mockResolvedValue('manifest-path');

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => 'run-safe',
      persistence: {
        stateStore: { recordRun } as unknown as TaskStateStore,
        manifestWriter: { write: writeManifest } as unknown as RunManifestWriter
      }
    });

    const summary = await manager.execute(baseTask);
    expect(summary.test.success).toBe(false);
    expect(summary.test.reports[0]!.details).toContain('tester exploded');

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(recordRun).toHaveBeenCalledWith(summary);
    expect(writeManifest).toHaveBeenCalledWith(summary);
  });

  it('executes all runnable subtasks when TF-GRPO group flag is enabled', async () => {
    const originalFlag = process.env.FEATURE_TFGRPO_GROUP;
    process.env.FEATURE_TFGRPO_GROUP = '1';

    const plan: PlanResult = {
      items: [
        { id: 'subtask-1', description: 'Group 1' },
        { id: 'subtask-2', description: 'Group 2' },
        { id: 'blocked', description: 'Blocked', runnable: false },
        { id: 'subtask-3', description: 'Group 3' }
      ]
    };

    const builderFn = vi.fn(async (input) => ({
      subtaskId: input.target.id,
      artifacts: [],
      mode: input.mode,
      success: true,
      runId: input.runId
    }));
    const testerFn = vi.fn(async (input) => ({
      subtaskId: input.build.subtaskId,
      success: true,
      reports: [],
      runId: input.runId
    }));
    const reviewerFn = vi.fn(async () => ({
      summary: 'approved',
      decision: { approved: true }
    }));

    const planner = new FunctionalPlannerAgent(async () => plan);
    const builder = new FunctionalBuilderAgent(builderFn);
    const tester = new FunctionalTesterAgent(testerFn);
    const reviewer = new FunctionalReviewerAgent(reviewerFn);

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => 'run-group'
    });

    try {
      const summary = await manager.execute(baseTask);
      expect(builderFn).toHaveBeenCalledTimes(3);
      expect(testerFn).toHaveBeenCalledTimes(3);
      expect(reviewerFn).toHaveBeenCalledTimes(3);
      expect(summary.group?.enabled).toBe(true);
      expect(summary.group?.size).toBe(3);
      expect(summary.group?.processed).toBe(3);
      expect(summary.group?.entries.map((entry) => entry.subtaskId)).toEqual([
        'subtask-1',
        'subtask-2',
        'subtask-3'
      ]);
    } finally {
      if (originalFlag === undefined) {
        delete process.env.FEATURE_TFGRPO_GROUP;
      } else {
        process.env.FEATURE_TFGRPO_GROUP = originalFlag;
      }
    }
  });

  it('aggregates per-subtask results in group mode summaries', async () => {
    const originalFlag = process.env.FEATURE_TFGRPO_GROUP;
    process.env.FEATURE_TFGRPO_GROUP = '1';

    const plan: PlanResult = {
      items: [
        { id: 'alpha', description: 'Alpha stage' },
        { id: 'beta', description: 'Beta stage' }
      ]
    };

    const builder = new FunctionalBuilderAgent(async (input) => ({
      subtaskId: input.target.id,
      artifacts: [{ path: `${input.target.id}.diff`, description: `artifact-${input.target.id}` }],
      mode: input.mode,
      success: true,
      notes: `build-${input.target.id}`,
      runId: input.runId
    }));
    const tester = new FunctionalTesterAgent(async (input) => ({
      subtaskId: input.build.subtaskId,
      success: input.build.subtaskId !== 'beta',
      reports: [
        {
          name: 'tests',
          status: input.build.subtaskId === 'beta' ? 'failed' : 'passed',
          details: input.build.subtaskId === 'beta' ? 'integration failure' : 'all good'
        }
      ],
      runId: input.runId
    }));
    const reviewer = new FunctionalReviewerAgent(async (input) => ({
      summary: `review-${input.build.subtaskId}`,
      decision: { approved: true, feedback: input.build.subtaskId }
    }));

    const manager = new TaskManager({
      planner: new FunctionalPlannerAgent(async () => plan),
      builder,
      tester,
      reviewer,
      runIdFactory: () => 'run-aggregate'
    });

    try {
      const summary = await manager.execute(baseTask);
      expect(summary.group?.processed).toBe(2);
      expect(summary.build.subtaskId).toBe('beta');
      expect(summary.test.success).toBe(false);
      expect(summary.review.summary).toBe('Review skipped: tests failed.');
      expect(summary.builds?.map((build) => build.subtaskId)).toEqual(['alpha', 'beta']);
      expect(summary.tests?.map((test) => test.subtaskId)).toEqual(['alpha', 'beta']);
      expect(summary.reviews?.length).toBe(2);
      expect(summary.builds?.[0]?.notes).toBe('build-alpha');
      expect(summary.builds?.[0]?.artifacts[0]?.description).toBe('artifact-alpha');
      expect(summary.tests?.[1]?.reports[0]?.details).toContain('integration failure');
      expect(summary.reviews?.[1]?.summary).toContain('Review skipped');
    } finally {
      if (originalFlag === undefined) {
        delete process.env.FEATURE_TFGRPO_GROUP;
      } else {
        process.env.FEATURE_TFGRPO_GROUP = originalFlag;
      }
    }
  });
});
