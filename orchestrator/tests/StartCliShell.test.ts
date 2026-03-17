import { afterEach, describe, expect, it, vi } from 'vitest';

import { runStartCliShell } from '../src/cli/startCliShell.js';

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe('runStartCliShell', () => {
  it('runs a non-rlm start inside the UI wrapper, emits output, and follows with adoption hint on success', async () => {
    const runEvents = { label: 'start-run-events' } as never;
    const runWithUi = vi.fn(async (action: (runEvents: never) => Promise<void>) => {
      await action(runEvents);
    });
    const result = {
      manifest: {
        run_id: 'run-1',
        status: 'succeeded',
        task_id: 'task-1-actual',
        pipeline_id: 'diagnostics'
      }
    } as never;
    const orchestrator = {
      start: vi.fn().mockResolvedValue(result)
    } as never;
    const emitRunOutput = vi.fn();
    const maybeEmitRunAdoptionHint = vi.fn(async () => undefined);
    const resolveTaskFilter = vi.fn(() => 'task-1-filter');

    await runStartCliShell({
      orchestrator,
      pipelineId: 'diagnostics',
      format: 'text',
      executionMode: 'mcp',
      runtimeMode: 'cli',
      autoIssueLogEnabled: false,
      taskIdOverride: 'task-1',
      parentRunId: 'parent-run-1',
      approvalPolicy: 'never',
      targetStageId: 'stage-1',
      runWithUi,
      emitRunOutput,
      maybeCaptureAutoIssueLog: vi.fn(async () => ({ issueLog: null, issueLogError: null })),
      resolveTaskFilter,
      withAutoIssueLogContext: vi.fn((error) => error as Error),
      maybeEmitRunAdoptionHint,
      isLegacyCollabEnvAliasEnabled: () => false,
      applyRlmEnvOverrides: vi.fn(),
      resolveRlmTaskId: vi.fn(),
      setTaskEnvironment: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      setExitCode: vi.fn()
    });

    expect(runWithUi).toHaveBeenCalledTimes(1);
    expect(orchestrator.start).toHaveBeenCalledWith({
      pipelineId: 'diagnostics',
      taskId: 'task-1',
      parentRunId: 'parent-run-1',
      approvalPolicy: 'never',
      targetStageId: 'stage-1',
      executionMode: 'mcp',
      runtimeMode: 'cli',
      runEvents
    });
    expect(emitRunOutput).toHaveBeenCalledWith(result, 'text', 'Run started', {
      issueLog: null,
      issueLogError: null
    });
    expect(resolveTaskFilter).toHaveBeenLastCalledWith('task-1-actual', 'task-1');
    expect(maybeEmitRunAdoptionHint).toHaveBeenCalledWith({
      format: 'text',
      taskFilter: 'task-1-filter'
    });
  });

  it('captures failed run issue logs and maps failed statuses to exit code 1', async () => {
    const issueLog = {
      issue_log_path: '/tmp/issues.md',
      bundle_path: '/tmp/issues.json'
    };
    const result = {
      manifest: {
        run_id: 'run-2',
        status: 'failed',
        task_id: 'task-2-actual',
        pipeline_id: 'diagnostics'
      }
    } as never;
    const orchestrator = {
      start: vi.fn().mockResolvedValue(result)
    } as never;
    const maybeCaptureAutoIssueLog = vi.fn(async () => ({
      issueLog,
      issueLogError: null
    }));
    const setExitCode = vi.fn();
    const maybeEmitRunAdoptionHint = vi.fn(async () => undefined);

    await runStartCliShell({
      orchestrator,
      pipelineId: 'diagnostics',
      format: 'json',
      autoIssueLogEnabled: true,
      taskIdOverride: 'task-2',
      runWithUi: vi.fn(async (action: (runEvents: never) => Promise<void>) => {
        await action({ label: 'run-events' } as never);
      }),
      emitRunOutput: vi.fn(),
      maybeCaptureAutoIssueLog,
      resolveTaskFilter: vi.fn(() => 'task-2-filter'),
      withAutoIssueLogContext: vi.fn((error) => error as Error),
      maybeEmitRunAdoptionHint,
      isLegacyCollabEnvAliasEnabled: () => false,
      applyRlmEnvOverrides: vi.fn(),
      resolveRlmTaskId: vi.fn(),
      setTaskEnvironment: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      setExitCode
    });

    expect(maybeCaptureAutoIssueLog).toHaveBeenCalledWith({
      enabled: true,
      issueTitle: 'Auto issue log: start diagnostics failed',
      issueNotes: 'Automatic failure capture for run run-2 (failed).',
      taskFilter: 'task-2-filter'
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(maybeEmitRunAdoptionHint).not.toHaveBeenCalled();
  });

  it('wraps pre-manifest failures with captured start issue-log context', async () => {
    const expected = new Error('wrapped start error');
    const maybeCaptureAutoIssueLog = vi.fn(async () => ({
      issueLog: { issue_log_path: '/tmp/issues.md', bundle_path: '/tmp/issues.json' },
      issueLogError: null
    }));
    const withAutoIssueLogContext = vi.fn(() => expected);

    await expect(
      runStartCliShell({
        orchestrator: {
          start: vi.fn()
        } as never,
        pipelineId: 'diagnostics',
        format: 'text',
        autoIssueLogEnabled: true,
        taskIdOverride: 'task-pre-manifest',
        runWithUi: vi.fn(async () => {
          throw new Error('boom');
        }),
        emitRunOutput: vi.fn(),
        maybeCaptureAutoIssueLog,
        resolveTaskFilter: vi.fn(() => 'task-pre-manifest'),
        withAutoIssueLogContext,
        maybeEmitRunAdoptionHint: vi.fn(async () => undefined),
        isLegacyCollabEnvAliasEnabled: () => false,
        applyRlmEnvOverrides: vi.fn(),
        resolveRlmTaskId: vi.fn(),
        setTaskEnvironment: vi.fn(),
        log: vi.fn(),
        warn: vi.fn(),
        setExitCode: vi.fn()
      })
    ).rejects.toBe(expected);

    expect(maybeCaptureAutoIssueLog).toHaveBeenCalledWith({
      enabled: true,
      issueTitle: 'Auto issue log: start diagnostics failed before run manifest',
      issueNotes: 'Automatic failure capture for start setup failure before run manifest creation.',
      taskFilter: 'task-pre-manifest'
    });
    expect(withAutoIssueLogContext).toHaveBeenCalled();
  });

  it('applies the rlm-specific task shaping and suppresses adoption hints for successful rlm starts', async () => {
    const runEvents = { label: 'rlm-run-events' } as never;
    const runWithUi = vi.fn(async (action: (runEvents: never) => Promise<void>) => {
      await action(runEvents);
    });
    const result = {
      manifest: {
        run_id: 'run-rlm',
        status: 'succeeded',
        task_id: 'task-rlm',
        pipeline_id: 'rlm'
      }
    } as never;
    const orchestrator = {
      start: vi.fn().mockResolvedValue(result)
    } as never;
    const applyRlmEnvOverrides = vi.fn();
    const resolveRlmTaskId = vi.fn(() => 'resolved-rlm-task');
    const setTaskEnvironment = vi.fn();
    const log = vi.fn();
    const warn = vi.fn();
    const maybeEmitRunAdoptionHint = vi.fn(async () => undefined);

    await runStartCliShell(
      {
        orchestrator,
        pipelineId: 'rlm',
        format: 'text',
        autoIssueLogEnabled: false,
        taskIdOverride: 'task-rlm-input',
        runWithUi,
        emitRunOutput: vi.fn(),
        maybeCaptureAutoIssueLog: vi.fn(async () => ({ issueLog: null, issueLogError: null })),
        resolveTaskFilter: vi.fn(() => 'task-rlm-filter'),
        withAutoIssueLogContext: vi.fn((error) => error as Error),
        maybeEmitRunAdoptionHint,
        isLegacyCollabEnvAliasEnabled: () => true,
        applyRlmEnvOverrides,
        resolveRlmTaskId,
        setTaskEnvironment,
        log,
        warn,
        setExitCode: vi.fn()
      }
    );

    expect(applyRlmEnvOverrides).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      'Warning: RLM_SYMBOLIC_COLLAB is a legacy alias; prefer RLM_SYMBOLIC_MULTI_AGENT.'
    );
    expect(resolveRlmTaskId).toHaveBeenCalledWith('task-rlm-input');
    expect(setTaskEnvironment).toHaveBeenCalledWith('resolved-rlm-task');
    expect(log).toHaveBeenCalledWith('Task: resolved-rlm-task');
    expect(orchestrator.start).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineId: 'rlm',
        taskId: 'resolved-rlm-task',
        runEvents
      })
    );
    expect(maybeEmitRunAdoptionHint).not.toHaveBeenCalled();
  });
});
