import { describe, expect, it, vi } from 'vitest';

import { runRlmLaunchCliShell } from '../src/cli/rlmLaunchCliShell.js';

describe('runRlmLaunchCliShell', () => {
  it('launches RLM, emits tips, and hands off to the completion shell', async () => {
    const runEvents = {} as never;
    const runWithUi = vi.fn(async (action: (runEvents: never) => Promise<void>) => {
      await action(runEvents);
    });
    const startResult = {
      manifest: {
        run_id: 'run-1',
        status: 'started',
        artifact_root: '.runs/task/cli/run-1',
        log_path: null
      }
    } as never;
    const orchestrator = {
      start: vi.fn().mockResolvedValue(startResult)
    } as never;
    const emitRunOutput = vi.fn();
    const applyRlmEnvOverrides = vi.fn();
    const resolveRlmTaskId = vi.fn(() => 'resolved-task');
    const setTaskEnvironment = vi.fn();
    const runDoctor = vi.fn(() => ({ collab: { status: 'ok' } }));
    const runCompletionShell = vi.fn(async () => undefined);
    const log = vi.fn();
    const warn = vi.fn();

    await runRlmLaunchCliShell({
      orchestrator,
      runtimeMode: 'appserver',
      goalFromArgs: 'write tests',
      taskIdOverride: 'task-1',
      parentRunId: 'parent-1',
      approvalPolicy: 'safe',
      collabUserChoice: false,
      runWithUi,
      emitRunOutput,
      applyRlmEnvOverrides,
      shouldWarnLegacyEnvAlias: () => true,
      resolveRlmTaskId,
      setTaskEnvironment,
      runDoctor,
      resolveRepoRoot: () => '/repo',
      runCompletionShell,
      log,
      warn
    });

    expect(resolveRlmTaskId).toHaveBeenCalledWith('task-1');
    expect(setTaskEnvironment).toHaveBeenCalledWith('resolved-task');
    expect(applyRlmEnvOverrides).toHaveBeenCalledWith('write tests');
    expect(warn).toHaveBeenCalledWith(
      'Warning: RLM_SYMBOLIC_COLLAB is a legacy alias; prefer RLM_SYMBOLIC_MULTI_AGENT.'
    );
    expect(log).toHaveBeenCalledWith('Task: resolved-task');
    expect(log).toHaveBeenCalledWith(
      'Tip: multi-agent collab is enabled. Try: codex-orchestrator rlm --multi-agent auto "<goal>" (legacy: --collab auto).'
    );
    expect(orchestrator.start).toHaveBeenCalledWith({
      pipelineId: 'rlm',
      taskId: 'resolved-task',
      parentRunId: 'parent-1',
      approvalPolicy: 'safe',
      runtimeMode: 'appserver',
      runEvents
    });
    expect(emitRunOutput).toHaveBeenCalledWith(startResult, 'text', 'Run started');
    expect(runCompletionShell).toHaveBeenCalledWith({
      repoRoot: '/repo',
      artifactRoot: '.runs/task/cli/run-1'
    });
  });

  it('skips doctor tip emission when collab choice is explicit', async () => {
    const orchestrator = {
      start: vi.fn().mockResolvedValue({
        manifest: { run_id: 'run-2', status: 'started', artifact_root: '.runs/task/cli/run-2', log_path: null }
      })
    } as never;
    const runDoctor = vi.fn(() => ({ collab: { status: 'ok' } }));
    const log = vi.fn();

    await runRlmLaunchCliShell({
      orchestrator,
      goalFlag: 'ship feature',
      collabUserChoice: true,
      runWithUi: async (action) => {
        await action({} as never);
      },
      emitRunOutput: vi.fn(),
      applyRlmEnvOverrides: vi.fn(),
      shouldWarnLegacyEnvAlias: () => false,
      resolveRlmTaskId: () => 'resolved-task',
      setTaskEnvironment: vi.fn(),
      runDoctor,
      resolveRepoRoot: () => '/repo',
      runCompletionShell: vi.fn(async () => undefined),
      log,
      warn: vi.fn()
    });

    expect(runDoctor).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('Task: resolved-task');
  });

  it('requires a goal before launching', async () => {
    await expect(
      runRlmLaunchCliShell({
        orchestrator: { start: vi.fn() } as never,
        collabUserChoice: false,
        runWithUi: async () => undefined,
        emitRunOutput: vi.fn(),
        applyRlmEnvOverrides: vi.fn(),
        shouldWarnLegacyEnvAlias: () => false,
        resolveRlmTaskId: () => 'resolved-task',
        setTaskEnvironment: vi.fn(),
        runDoctor: vi.fn(() => ({ collab: { status: 'disabled' } })),
        resolveRepoRoot: () => '/repo',
        runCompletionShell: vi.fn(async () => undefined),
        log: vi.fn(),
        warn: vi.fn()
      })
    ).rejects.toThrow('rlm requires a goal. Use: codex-orchestrator rlm "<goal>".');
  });
});
