import { describe, expect, it } from 'vitest';
import { TaskManager } from '../src/manager.js';
import { FunctionalPlannerAgent } from '../src/agents/planner.js';
import { FunctionalBuilderAgent } from '../src/agents/builder.js';
import { FunctionalTesterAgent } from '../src/agents/tester.js';
import { FunctionalReviewerAgent } from '../src/agents/reviewer.js';
import type { TaskContext } from '../src/types.js';
import { normalizeErrorMessage } from '../src/utils/errorMessage.js';

describe('error formatting', () => {
  it('normalizes Error, string, and object values', () => {
    expect(normalizeErrorMessage(new Error('boom'))).toBe('boom');
    expect(normalizeErrorMessage('plain')).toBe('plain');
    expect(normalizeErrorMessage({ reason: 'fail' })).toBe('{"reason":"fail"}');
  });

  it('falls back to String for circular objects', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(normalizeErrorMessage(value)).toBe('[object Object]');
  });

  it('keeps manager stage prefixes intact', async () => {
    const planner = new FunctionalPlannerAgent(async () => {
      throw new Error('planner crash');
    });
    const builder = new FunctionalBuilderAgent(async () => {
      throw new Error('builder should not run');
    });
    const tester = new FunctionalTesterAgent(async () => {
      throw new Error('tester should not run');
    });
    const reviewer = new FunctionalReviewerAgent(async () => {
      throw new Error('reviewer should not run');
    });

    const manager = new TaskManager({
      planner,
      builder,
      tester,
      reviewer,
      runIdFactory: () => 'run-1'
    });

    const task: TaskContext = { id: 'task-1', title: 'Task', metadata: {} };
    const summary = await manager.execute(task);

    expect(summary.plan.notes).toBe('Planner stage error: planner crash');
  });
});
