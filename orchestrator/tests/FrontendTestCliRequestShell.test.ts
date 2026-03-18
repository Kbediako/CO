import { describe, expect, it, vi } from 'vitest';

import { runFrontendTestCliRequestShell } from '../src/cli/frontendTestCliRequestShell.js';

describe('runFrontendTestCliRequestShell', () => {
  it('shapes a frontend-test request and delegates to runFrontendTestCliShell', async () => {
    const runFrontendTestCliShellMock = vi.fn(async () => undefined);
    const resolveRuntimeModeFlag = vi.fn(() => 'appserver' as const);
    const applyRepoConfigRequiredPolicy = vi.fn(() => true);
    const resolveTargetStageId = vi.fn(() => 'target-stage');
    const runWithUi = vi.fn(async () => undefined);
    const emitRunOutput = vi.fn();
    const warn = vi.fn();

    await runFrontendTestCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: ['extra-one', 'extra-two'],
        flags: {
          format: 'json',
          devtools: true,
          task: ' task-id ',
          'parent-run': ' parent-run ',
          'approval-policy': ' never ',
          'target-stage': 'target-stage'
        },
        resolveRuntimeModeFlag,
        applyRepoConfigRequiredPolicy,
        resolveTargetStageId,
        runWithUi,
        emitRunOutput,
        warn
      },
      { runFrontendTestCliShell: runFrontendTestCliShellMock as never }
    );

    expect(resolveRuntimeModeFlag).toHaveBeenCalled();
    expect(applyRepoConfigRequiredPolicy).toHaveBeenCalled();
    expect(resolveTargetStageId).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[frontend-test] ignoring extra arguments: extra-one extra-two');
    expect(runFrontendTestCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'json',
        devtoolsEnabled: true,
        runtimeMode: 'appserver',
        taskId: ' task-id ',
        parentRunId: ' parent-run ',
        approvalPolicy: ' never ',
        targetStageId: 'target-stage',
        emitRunOutput
      })
    );

    const request = runFrontendTestCliShellMock.mock.calls[0]?.[0];
    await request.runWithUi(async () => undefined);
    expect(runWithUi).toHaveBeenCalled();
  });

  it('defaults format to text and omits optional string fields when unset', async () => {
    const runFrontendTestCliShellMock = vi.fn(async () => undefined);

    await runFrontendTestCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: [],
        flags: {},
        resolveRuntimeModeFlag: vi.fn(() => undefined),
        applyRepoConfigRequiredPolicy: vi.fn(() => false),
        resolveTargetStageId: vi.fn(() => undefined),
        runWithUi: vi.fn(async () => undefined),
        emitRunOutput: vi.fn(),
        warn: vi.fn()
      },
      { runFrontendTestCliShell: runFrontendTestCliShellMock as never }
    );

    expect(runFrontendTestCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'text',
        devtoolsEnabled: false,
        runtimeMode: undefined,
        taskId: undefined,
        parentRunId: undefined,
        approvalPolicy: undefined,
        targetStageId: undefined
      })
    );
  });
});
