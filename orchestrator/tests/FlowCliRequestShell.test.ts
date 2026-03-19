import { describe, expect, it, vi } from 'vitest';

import { runFlowCliRequestShell } from '../src/cli/flowCliRequestShell.js';

describe('runFlowCliRequestShell', () => {
  it('shapes a flow request and delegates to runFlowCliShell', async () => {
    const runFlowCliShellMock = vi.fn(async () => undefined);
    const runWithUi = vi.fn(async () => undefined);
    const resolveExecutionModeFlag = vi.fn(() => 'cloud' as const);
    const resolveRuntimeModeFlag = vi.fn(() => 'cli' as const);
    const applyRepoConfigRequiredPolicy = vi.fn(() => true);
    const resolveAutoIssueLogEnabled = vi.fn(() => true);
    const resolveTargetStageId = vi.fn(() => 'docs-review:quick');

    await runFlowCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: [],
        flags: {
          format: 'json',
          task: 'task-1',
          'parent-run': 'parent-1',
          'approval-policy': 'never',
          'target-stage': 'docs-review:quick',
          'auto-issue-log': true
        },
        runWithUi,
        emitRunOutput: vi.fn(),
        formatIssueLogSummary: vi.fn(() => []),
        toRunOutputPayload: vi.fn(),
        maybeCaptureAutoIssueLog: vi.fn(),
        resolveTaskFilter: vi.fn(),
        withAutoIssueLogContext: vi.fn(),
        maybeEmitRunAdoptionHint: vi.fn(),
        resolveExecutionModeFlag,
        resolveRuntimeModeFlag,
        applyRepoConfigRequiredPolicy,
        resolveAutoIssueLogEnabled,
        resolveTargetStageId
      },
      { runFlowCliShell: runFlowCliShellMock as never }
    );

    expect(resolveExecutionModeFlag).toHaveBeenCalled();
    expect(resolveRuntimeModeFlag).toHaveBeenCalled();
    expect(applyRepoConfigRequiredPolicy).toHaveBeenCalled();
    expect(resolveAutoIssueLogEnabled).toHaveBeenCalled();
    expect(resolveTargetStageId).toHaveBeenCalled();
    expect(runFlowCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'json',
        executionMode: 'cloud',
        runtimeMode: 'cli',
        autoIssueLogEnabled: true,
        taskId: 'task-1',
        parentRunId: 'parent-1',
        approvalPolicy: 'never',
        targetStageId: 'docs-review:quick'
      })
    );

    const request = runFlowCliShellMock.mock.calls[0]?.[0];
    await request.runWithUi(async () => undefined);
    expect(runWithUi).toHaveBeenCalled();
  });

  it('rejects positional arguments and defaults format to text', async () => {
    await expect(
      runFlowCliRequestShell({
        orchestrator: { start: vi.fn() } as never,
        positionals: ['extra'],
        flags: {},
        runWithUi: vi.fn(async () => undefined),
        emitRunOutput: vi.fn(),
        formatIssueLogSummary: vi.fn(() => []),
        toRunOutputPayload: vi.fn(),
        maybeCaptureAutoIssueLog: vi.fn(),
        resolveTaskFilter: vi.fn(),
        withAutoIssueLogContext: vi.fn(),
        maybeEmitRunAdoptionHint: vi.fn(),
        resolveExecutionModeFlag: vi.fn(() => undefined),
        resolveRuntimeModeFlag: vi.fn(() => undefined),
        applyRepoConfigRequiredPolicy: vi.fn(() => false),
        resolveAutoIssueLogEnabled: vi.fn(() => false),
        resolveTargetStageId: vi.fn(() => undefined)
      })
    ).rejects.toThrow('flow does not accept positional arguments: extra');
  });
});
