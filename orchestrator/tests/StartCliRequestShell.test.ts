import { describe, expect, it, vi } from 'vitest';

import { runStartCliRequestShell } from '../src/cli/startCliRequestShell.js';

describe('runStartCliRequestShell', () => {
  it('shapes a start request and delegates to runStartCliShell', async () => {
    const runStartCliShellMock = vi.fn(async () => undefined);
    const runWithUi = vi.fn(async () => undefined);
    const resolveExecutionModeFlag = vi.fn(() => 'cloud' as const);
    const resolveRuntimeModeFlag = vi.fn(() => 'cli' as const);
    const applyRepoConfigRequiredPolicy = vi.fn(() => true);
    const resolveAutoIssueLogEnabled = vi.fn(() => true);
    const resolveTargetStageId = vi.fn(() => 'stage-1');
    const readStringFlag = vi.fn((flags, key: string) =>
      typeof flags[key] === 'string' ? (flags[key] as string) : undefined
    );
    const shouldWarnLegacyMultiAgentEnv = vi.fn(() => true);
    const applyRlmEnvOverrides = vi.fn();

    await runStartCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: ['rlm'],
        flags: {
          format: 'json',
          task: 'task-1',
          goal: 'ship it',
          'parent-run': 'parent-1',
          'approval-policy': 'never',
          'target-stage': 'stage-1',
          'auto-issue-log': true
        },
        runWithUi,
        emitRunOutput: vi.fn(),
        maybeCaptureAutoIssueLog: vi.fn(),
        resolveTaskFilter: vi.fn(),
        withAutoIssueLogContext: vi.fn(),
        maybeEmitRunAdoptionHint: vi.fn(),
        resolveExecutionModeFlag,
        resolveRuntimeModeFlag,
        applyRepoConfigRequiredPolicy,
        resolveAutoIssueLogEnabled,
        resolveTargetStageId,
        readStringFlag,
        shouldWarnLegacyMultiAgentEnv,
        applyRlmEnvOverrides,
        resolveRlmTaskId: vi.fn(),
        setTaskEnvironment: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
        setExitCode: vi.fn()
      },
      { runStartCliShell: runStartCliShellMock as never }
    );

    expect(resolveExecutionModeFlag).toHaveBeenCalled();
    expect(resolveRuntimeModeFlag).toHaveBeenCalled();
    expect(applyRepoConfigRequiredPolicy).toHaveBeenCalled();
    expect(resolveAutoIssueLogEnabled).toHaveBeenCalled();
    expect(resolveTargetStageId).toHaveBeenCalled();
    expect(runStartCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineId: 'rlm',
        format: 'json',
        executionMode: 'cloud',
        runtimeMode: 'cli',
        autoIssueLogEnabled: true,
        taskIdOverride: 'task-1',
        parentRunId: 'parent-1',
        approvalPolicy: 'never',
        targetStageId: 'stage-1'
      })
    );

    const request = runStartCliShellMock.mock.calls[0]?.[0];
    expect(request.isLegacyCollabEnvAliasEnabled()).toBe(true);
    request.applyRlmEnvOverrides();
    expect(applyRlmEnvOverrides).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'ship it' }),
      'ship it'
    );
    await request.runWithUi(async () => undefined);
    expect(runWithUi).toHaveBeenCalled();
  });

  it('defaults format to text and omits optional string fields when unset', async () => {
    const runStartCliShellMock = vi.fn(async () => undefined);

    await runStartCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: [],
        flags: {},
        runWithUi: vi.fn(async () => undefined),
        emitRunOutput: vi.fn(),
        maybeCaptureAutoIssueLog: vi.fn(),
        resolveTaskFilter: vi.fn(),
        withAutoIssueLogContext: vi.fn(),
        maybeEmitRunAdoptionHint: vi.fn(),
        resolveExecutionModeFlag: vi.fn(() => undefined),
        resolveRuntimeModeFlag: vi.fn(() => undefined),
        applyRepoConfigRequiredPolicy: vi.fn(() => false),
        resolveAutoIssueLogEnabled: vi.fn(() => false),
        resolveTargetStageId: vi.fn(() => undefined),
        readStringFlag: vi.fn(() => undefined),
        shouldWarnLegacyMultiAgentEnv: vi.fn(() => false),
        applyRlmEnvOverrides: vi.fn(),
        resolveRlmTaskId: vi.fn(),
        setTaskEnvironment: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
        setExitCode: vi.fn()
      },
      { runStartCliShell: runStartCliShellMock as never }
    );

    expect(runStartCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineId: undefined,
        format: 'text',
        taskIdOverride: undefined,
        parentRunId: undefined,
        approvalPolicy: undefined,
        targetStageId: undefined
      })
    );
  });
});
