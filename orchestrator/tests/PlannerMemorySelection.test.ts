import { describe, expect, it } from 'vitest';

import { CommandPlanner } from '../src/cli/adapters/CommandPlanner.js';
import {
  buildTaskMemoryContext,
  createPromptPackTaskMemoryRefId,
  readSelectedMemoryRefs,
  TASK_MEMORY_SOURCE0_REF_ID
} from '../src/cli/services/plannerMemory.js';
import type { PipelineDefinition } from '../src/cli/types.js';
import type { TaskContext } from '../src/types.js';

const diagnosticsPipeline: PipelineDefinition = {
  id: 'diagnostics',
  title: 'Diagnostics Pipeline',
  tags: ['diagnostics', 'implementation'],
  stages: [
    {
      kind: 'command',
      id: 'run-diagnostics',
      title: 'Run Diagnostics',
      command: 'npm run diagnostics'
    }
  ]
};

describe('CommandPlanner planner memory selection', () => {
  it('keeps planner metadata unchanged when task memory is absent', async () => {
    const planner = new CommandPlanner(diagnosticsPipeline);
    const task: TaskContext = {
      id: 'task-1',
      title: 'Investigate diagnostics regressions',
      metadata: {}
    };

    const plan = await planner.plan(task);

    expect(readSelectedMemoryRefs(plan.items[0]!)).toEqual([]);
  });

  it('selects source_0 plus a matching prompt-pack ref when task memory is present', async () => {
    const planner = new CommandPlanner(diagnosticsPipeline);
    const task: TaskContext = {
      id: 'task-1',
      title: 'Investigate diagnostics regressions',
      metadata: {},
      memory: buildTaskMemoryContext([
        { id: 'pp-implementation', domain: 'implementation', experienceSlots: 1 },
        { id: 'pp-diagnostics', domain: 'diagnostics', experienceSlots: 2 }
      ])
    };

    const plan = await planner.plan(task);

    expect(readSelectedMemoryRefs(plan.items[0]!)).toEqual([
      TASK_MEMORY_SOURCE0_REF_ID,
      createPromptPackTaskMemoryRefId('pp-diagnostics')
    ]);
  });

  it('recomputes planner-selected memory refs when the planner is reused for a different task', async () => {
    const planner = new CommandPlanner(diagnosticsPipeline);

    const firstPlan = await planner.plan({
      id: 'task-1',
      title: 'Investigate diagnostics regressions',
      metadata: {},
      memory: buildTaskMemoryContext([
        { id: 'pp-diagnostics', domain: 'diagnostics', experienceSlots: 2 }
      ])
    });
    const secondPlan = await planner.plan({
      id: 'task-2',
      title: 'Investigate implementation regressions',
      metadata: {},
      memory: buildTaskMemoryContext([
        { id: 'pp-implementation', domain: 'implementation', experienceSlots: 1 }
      ])
    });

    expect(readSelectedMemoryRefs(firstPlan.items[0]!)).toEqual([
      TASK_MEMORY_SOURCE0_REF_ID,
      createPromptPackTaskMemoryRefId('pp-diagnostics')
    ]);
    expect(readSelectedMemoryRefs(secondPlan.items[0]!)).toEqual([
      TASK_MEMORY_SOURCE0_REF_ID,
      createPromptPackTaskMemoryRefId('pp-implementation')
    ]);
  });
});
