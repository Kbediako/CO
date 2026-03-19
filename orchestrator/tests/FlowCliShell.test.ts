import { afterEach, describe, expect, it, vi } from 'vitest';

import { runFlowCliShell } from '../src/cli/flowCliShell.js';

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

describe('runFlowCliShell', () => {
  it('runs both flow stages inside one UI wrapper and threads the docs run id into implementation-gate', async () => {
    const runEvents = { label: 'shared-run-events' } as never;
    const runWithUi = vi.fn(async (action: (runEvents: never) => Promise<void>) => {
      await action(runEvents);
    });
    const docsResult = {
      manifest: {
        run_id: 'docs-run-1',
        status: 'succeeded',
        task_id: 'task-1'
      }
    } as never;
    const implementationResult = {
      manifest: {
        run_id: 'impl-run-1',
        status: 'succeeded',
        task_id: 'task-1'
      }
    } as never;
    const orchestrator = {
      start: vi.fn()
        .mockResolvedValueOnce(docsResult)
        .mockResolvedValueOnce(implementationResult)
    } as never;
    const emitRunOutput = vi.fn();
    const maybeEmitRunAdoptionHint = vi.fn(async () => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runFlowCliShell({
      orchestrator,
      format: 'text',
      executionMode: 'mcp',
      runtimeMode: 'cli',
      autoIssueLogEnabled: false,
      taskId: 'task-1',
      parentRunId: 'parent-run-1',
      approvalPolicy: 'never',
      runWithUi,
      emitRunOutput,
      formatIssueLogSummary: vi.fn(() => []),
      toRunOutputPayload: vi.fn((result) => ({
        run_id: result.manifest.run_id,
        status: result.manifest.status
      })),
      maybeCaptureAutoIssueLog: vi.fn(async () => ({ issueLog: null, issueLogError: null })),
      resolveTaskFilter: vi.fn(() => 'task-1'),
      withAutoIssueLogContext: vi.fn((error) => error as Error),
      maybeEmitRunAdoptionHint
    });

    expect(runWithUi).toHaveBeenCalledTimes(1);
    expect(orchestrator.start).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        pipelineId: 'docs-review',
        taskId: 'task-1',
        parentRunId: 'parent-run-1',
        approvalPolicy: 'never',
        executionMode: 'mcp',
        runtimeMode: 'cli',
        runEvents
      })
    );
    expect(orchestrator.start).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        pipelineId: 'implementation-gate',
        taskId: 'task-1',
        parentRunId: 'docs-run-1',
        approvalPolicy: 'never',
        executionMode: 'mcp',
        runtimeMode: 'cli',
        runEvents
      })
    );
    expect(emitRunOutput).toHaveBeenCalledTimes(2);
    expect(maybeEmitRunAdoptionHint).toHaveBeenCalledWith({
      format: 'text',
      taskFilter: 'task-1'
    });
    expect(logSpy).toHaveBeenCalledWith('Flow complete: docs-review -> implementation-gate.');
  });

  it('captures the implementation-gate issue log in json mode when the second stage fails', async () => {
    const issueLog = {
      issue_log_path: '/tmp/issues.md',
      bundle_path: '/tmp/issues.json',
      run_context: { run_id: 'impl-run-2' }
    };
    const docsResult = {
      manifest: {
        run_id: 'docs-run-2',
        status: 'succeeded',
        task_id: 'task-2'
      }
    } as never;
    const implementationResult = {
      manifest: {
        run_id: 'impl-run-2',
        status: 'failed',
        task_id: 'task-2-actual'
      }
    } as never;
    const orchestrator = {
      start: vi.fn()
        .mockResolvedValueOnce(docsResult)
        .mockResolvedValueOnce(implementationResult)
    } as never;
    const resolveTaskFilter = vi.fn(() => 'task-2-filter');
    const maybeCaptureAutoIssueLog = vi.fn(async () => ({
      issueLog,
      issueLogError: null
    }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runFlowCliShell({
      orchestrator,
      format: 'json',
      autoIssueLogEnabled: true,
      taskId: 'task-2',
      runWithUi: vi.fn(async (action: (runEvents: never) => Promise<void>) => {
        await action({ label: 'run-events' } as never);
      }),
      emitRunOutput: vi.fn(),
      formatIssueLogSummary: vi.fn(() => []),
      toRunOutputPayload: vi.fn((result) => ({
        run_id: result.manifest.run_id,
        status: result.manifest.status
      })),
      maybeCaptureAutoIssueLog,
      resolveTaskFilter,
      withAutoIssueLogContext: vi.fn((error) => error as Error),
      maybeEmitRunAdoptionHint: vi.fn(async () => undefined)
    });

    expect(maybeCaptureAutoIssueLog).toHaveBeenCalledWith({
      enabled: true,
      issueTitle: 'Auto issue log: flow implementation-gate failed',
      issueNotes:
        'Automatic failure capture for implementation-gate run impl-run-2 (failed).',
      taskFilter: 'task-2-filter'
    });
    expect(resolveTaskFilter).toHaveBeenLastCalledWith('task-2-actual', 'task-2');
    expect(process.exitCode).toBe(1);

    const payload = JSON.parse(String(logSpy.mock.calls[0]?.[0])) as {
      status: string;
      failed_stage: string | null;
      docs_review: { run_id: string; status: string };
      implementation_gate: { run_id: string; status: string } | null;
      issue_log: { issue_log_path: string; bundle_path: string };
      issue_log_error: string | null;
    };
    expect(payload).toEqual({
      status: 'failed',
      failed_stage: 'implementation-gate',
      docs_review: { run_id: 'docs-run-2', status: 'succeeded' },
      implementation_gate: { run_id: 'impl-run-2', status: 'failed' },
      issue_log: {
        issue_log_path: '/tmp/issues.md',
        bundle_path: '/tmp/issues.json',
        run_context: { run_id: 'impl-run-2' }
      },
      issue_log_error: null
    });
  });
});
