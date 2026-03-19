import { describe, expect, it, vi } from 'vitest';

import { runRlmCliRequestShell } from '../src/cli/rlmCliRequestShell.js';

describe('runRlmCliRequestShell', () => {
  it('shapes the current RLM request and delegates to runRlmLaunchCliShell', async () => {
    const runRlmLaunchCliShellMock = vi.fn(async () => undefined);
    const resolveRuntimeModeFlag = vi.fn(() => 'appserver' as const);
    const applyRepoConfigRequiredPolicy = vi.fn(() => true);
    const readStringFlag = vi.fn((flags: Record<string, string | boolean>, key: string) => {
      const value = flags[key];
      return typeof value === 'string' ? value : undefined;
    });
    const applyRlmEnvOverrides = vi.fn();
    const shouldWarnLegacyEnvAlias = vi.fn(() => true);

    await runRlmCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: ['stabilize', 'rlm', 'lane'],
        flags: {
          goal: 'goal flag',
          task: 'task-1',
          'parent-run': 'parent-1',
          'approval-policy': 'safe',
          'multi-agent': 'auto'
        },
        env: { RLM_GOAL: 'goal env' },
        runWithUi: vi.fn(async (action) => {
          await action({} as never);
        }),
        emitRunOutput: vi.fn(),
        resolveRuntimeModeFlag,
        applyRepoConfigRequiredPolicy,
        readStringFlag,
        applyRlmEnvOverrides,
        shouldWarnLegacyEnvAlias,
        resolveRlmTaskId: vi.fn(() => 'resolved-task'),
        setTaskEnvironment: vi.fn(),
        runDoctor: vi.fn(() => ({ collab: { status: 'ok' } })),
        resolveRepoRoot: () => '/repo',
        runCompletionShell: vi.fn(async () => undefined),
        log: vi.fn(),
        warn: vi.fn()
      },
      { runRlmLaunchCliShell: runRlmLaunchCliShellMock as never }
    );

    expect(resolveRuntimeModeFlag).toHaveBeenCalled();
    expect(applyRepoConfigRequiredPolicy).toHaveBeenCalled();
    expect(readStringFlag).toHaveBeenCalledWith(expect.any(Object), 'goal');
    expect(runRlmLaunchCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeMode: 'appserver',
        goalFromArgs: 'stabilize rlm lane',
        goalFlag: 'goal flag',
        goalEnv: 'goal env',
        taskIdOverride: 'task-1',
        parentRunId: 'parent-1',
        approvalPolicy: 'safe',
        collabUserChoice: true
      })
    );

    const request = runRlmLaunchCliShellMock.mock.calls[0]?.[0];
    request.applyRlmEnvOverrides('goal');
    expect(applyRlmEnvOverrides).toHaveBeenCalledWith(expect.any(Object), 'goal');
    expect(request.shouldWarnLegacyEnvAlias()).toBe(true);
    expect(shouldWarnLegacyEnvAlias).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
  });

  it('treats env-driven collab choice as explicit even without collab flags', async () => {
    const runRlmLaunchCliShellMock = vi.fn(async () => undefined);

    await runRlmCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: [],
        flags: {},
        env: { RLM_SYMBOLIC_MULTI_AGENT: '1' },
        runWithUi: vi.fn(async () => undefined),
        emitRunOutput: vi.fn(),
        resolveRuntimeModeFlag: vi.fn(() => undefined),
        applyRepoConfigRequiredPolicy: vi.fn(() => false),
        readStringFlag: vi.fn(() => undefined),
        applyRlmEnvOverrides: vi.fn(),
        shouldWarnLegacyEnvAlias: vi.fn(() => false),
        resolveRlmTaskId: vi.fn(() => 'resolved-task'),
        setTaskEnvironment: vi.fn(),
        runDoctor: vi.fn(() => ({ collab: { status: 'disabled' } })),
        resolveRepoRoot: () => '/repo',
        runCompletionShell: vi.fn(async () => undefined),
        log: vi.fn(),
        warn: vi.fn()
      },
      { runRlmLaunchCliShell: runRlmLaunchCliShellMock as never }
    );

    expect(runRlmLaunchCliShellMock).toHaveBeenCalledWith(expect.objectContaining({ collabUserChoice: true }));
  });

  it('preserves raw task, parent-run, and approval-policy flag strings', async () => {
    const runRlmLaunchCliShellMock = vi.fn(async () => undefined);

    await runRlmCliRequestShell(
      {
        orchestrator: { start: vi.fn() } as never,
        positionals: [],
        flags: {
          task: '  task with spaces  ',
          'parent-run': '  parent-run  ',
          'approval-policy': '  policy  '
        },
        env: {},
        runWithUi: vi.fn(async () => undefined),
        emitRunOutput: vi.fn(),
        resolveRuntimeModeFlag: vi.fn(() => undefined),
        applyRepoConfigRequiredPolicy: vi.fn(() => false),
        readStringFlag: vi.fn(() => undefined),
        applyRlmEnvOverrides: vi.fn(),
        shouldWarnLegacyEnvAlias: vi.fn(() => false),
        resolveRlmTaskId: vi.fn(() => 'resolved-task'),
        setTaskEnvironment: vi.fn(),
        runDoctor: vi.fn(() => ({ collab: { status: 'disabled' } })),
        resolveRepoRoot: () => '/repo',
        runCompletionShell: vi.fn(async () => undefined),
        log: vi.fn(),
        warn: vi.fn()
      },
      { runRlmLaunchCliShell: runRlmLaunchCliShellMock as never }
    );

    expect(runRlmLaunchCliShellMock).toHaveBeenCalledWith(
      expect.objectContaining({
        taskIdOverride: '  task with spaces  ',
        parentRunId: '  parent-run  ',
        approvalPolicy: '  policy  '
      })
    );
  });
});
