import { describe, expect, it, vi } from 'vitest';

import { buildOrchestratorPlanPreview, runOrchestratorPlanShell } from '../src/cli/services/orchestratorPlanShell.js';

describe('orchestrator plan shell', () => {
  it('maps command and subpipeline stages into the public preview contract', () => {
    const preview = buildOrchestratorPlanPreview(
      {
        pipeline: {
          id: 'parent',
          title: 'Parent pipeline',
          description: null,
          stages: [
            {
              id: 'build',
              title: 'Build project',
              kind: 'command',
              command: 'npm run build',
              cwd: 'packages/app',
              env: { NODE_ENV: 'production' },
              allowFailure: true,
              summaryHint: 'compile'
            },
            {
              id: 'child-simple',
              title: 'Run simple pipeline',
              kind: 'subpipeline',
              pipeline: 'simple',
              optional: true
            }
          ]
        },
        pipelineSource: 'user'
      } as never,
      {
        targetId: 'preview-target',
        items: []
      } as never
    );

    expect(preview).toEqual({
      pipeline: {
        id: 'parent',
        title: 'Parent pipeline',
        description: null,
        source: 'user'
      },
      stages: [
        {
          index: 1,
          id: 'build',
          title: 'Build project',
          kind: 'command',
          command: 'npm run build',
          cwd: 'packages/app',
          env: { NODE_ENV: 'production' },
          allowFailure: true,
          summaryHint: 'compile'
        },
        {
          index: 2,
          id: 'child-simple',
          title: 'Run simple pipeline',
          kind: 'subpipeline',
          pipeline: 'simple',
          optional: true
        }
      ],
      plan: {
        targetId: 'preview-target',
        items: []
      },
      targetId: 'preview-target'
    });
  });

  it('falls back to planner output and normalizes unknown pipeline sources to null', async () => {
    const plannerPlan = {
      targetId: 'planner-target',
      items: [{ id: 'item-1' }]
    } as never;
    const plannerPlanSpy = vi.fn(async () => plannerPlan);
    const prepareRunSpy = vi.fn(async () => ({
      pipeline: {
        id: 'fallback',
        title: 'Fallback pipeline',
        description: 'Uses planner fallback',
        stages: [
          {
            id: 'notify',
            title: 'Notify',
            kind: 'command',
            command: 'echo done'
          }
        ]
      },
      pipelineSource: 'generated',
      planPreview: null,
      planner: { plan: plannerPlanSpy },
      taskContext: { id: 'task-1', title: 'Task 1' }
    }));

    const result = await runOrchestratorPlanShell({
      baseEnv: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      } as never,
      options: {
        taskId: 'task-override',
        pipelineId: 'fallback',
        targetStageId: 'notify'
      },
      prepareRunImpl: prepareRunSpy as never
    });

    expect(prepareRunSpy).toHaveBeenCalledWith({
      baseEnv: {
        repoRoot: '/tmp/repo',
        taskId: 'task-1',
        runsRoot: '/tmp/repo/.runs',
        outRoot: '/tmp/repo/out'
      },
      taskIdOverride: 'task-override',
      pipelineId: 'fallback',
      targetStageId: 'notify',
      planTargetFallback: null
    });
    expect(plannerPlanSpy).toHaveBeenCalledWith({ id: 'task-1', title: 'Task 1' });
    expect(result.pipeline.source).toBeNull();
    expect(result.targetId).toBe('planner-target');
    expect(result.plan).toBe(plannerPlan);
  });
});
