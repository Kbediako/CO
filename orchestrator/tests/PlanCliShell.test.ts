import { describe, expect, it, vi } from 'vitest';

import { runPlanCliShell } from '../src/cli/planCliShell.js';

describe('runPlanCliShell', () => {
  it('emits plan JSON output and forwards optional arguments', async () => {
    const result = {
      pipeline: { id: 'docs-review', title: 'Docs Review', description: null, source: 'default' },
      stages: [],
      plan: { items: [], notes: 'plan-notes' }
    } as never;
    const orchestrator = {
      plan: vi.fn().mockResolvedValue(result)
    } as never;
    const stdout = { write: vi.fn() };

    await runPlanCliShell({
      orchestrator,
      pipelineId: 'docs-review',
      taskId: 'task-123',
      targetStageId: 'stage-1',
      format: 'json'
    }, { stdout });

    expect(orchestrator.plan).toHaveBeenCalledWith({
      pipelineId: 'docs-review',
      taskId: 'task-123',
      targetStageId: 'stage-1'
    });
    expect(stdout.write).toHaveBeenCalledWith(`${JSON.stringify(result, null, 2)}\n`);
  });

  it('emits formatted text output with a trailing newline', async () => {
    const result = {
      pipeline: { id: 'docs-review', title: 'Docs Review', description: null, source: 'default' },
      stages: [],
      plan: { items: [], notes: 'plan-notes' }
    } as never;
    const orchestrator = {
      plan: vi.fn().mockResolvedValue(result)
    } as never;
    const stdout = { write: vi.fn() };
    const formatPreview = vi.fn().mockReturnValue('formatted plan');

    await runPlanCliShell({
      orchestrator,
      pipelineId: 'docs-review',
      format: 'text'
    }, { stdout, formatPlanPreview: formatPreview });

    expect(orchestrator.plan).toHaveBeenCalledWith({
      pipelineId: 'docs-review',
      taskId: undefined,
      targetStageId: undefined
    });
    expect(formatPreview).toHaveBeenCalledWith(result);
    expect(stdout.write).toHaveBeenCalledWith('formatted plan\n');
  });
});
