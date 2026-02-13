import { describe, expect, it } from 'vitest';

import type { BuildResult, ReviewInput, TestInput } from '../src/types.js';
import { CommandTester } from '../src/cli/adapters/CommandTester.js';
import { CommandReviewer } from '../src/cli/adapters/CommandReviewer.js';
import type { PipelineRunExecutionResult } from '../src/cli/types.js';

function buildInput(mode: 'cloud' | 'mcp'): BuildResult {
  return {
    subtaskId: 'pipeline:stage',
    artifacts: [],
    mode,
    runId: 'run-1',
    success: true
  };
}

function makeResult(status: 'ready' | 'failed'): PipelineRunExecutionResult {
  return {
    success: status === 'ready',
    notes: [],
    manifestPath: '.runs/task/cli/run-1/manifest.json',
    logPath: '.runs/task/cli/run-1/runner.ndjson',
    manifest: {
      cloud_execution: {
        task_id: 'task_e_1234567890abcdef1234567890abcdef',
        environment_id: 'env-1',
        status,
        status_url: 'https://chatgpt.com/codex/tasks/task_e_1234567890abcdef1234567890abcdef',
        submitted_at: '2026-02-13T00:00:00.000Z',
        completed_at: '2026-02-13T00:00:10.000Z',
        last_polled_at: '2026-02-13T00:00:10.000Z',
        poll_count: 2,
        poll_interval_seconds: 5,
        timeout_seconds: 120,
        attempts: 1,
        diff_path: null,
        diff_url: null,
        diff_status: 'unavailable',
        apply_status: 'not_requested',
        log_path: '.runs/task/cli/run-1/cloud/commands.ndjson',
        error: status === 'failed' ? 'Cloud task failed.' : null
      }
    } as PipelineRunExecutionResult['manifest']
  };
}

describe('cloud mode adapters', () => {
  it('CommandTester passes when cloud task is ready', async () => {
    const tester = new CommandTester(() => makeResult('ready'));
    const input: TestInput = {
      task: { id: 'task', title: 'Task' },
      build: buildInput('cloud'),
      mode: 'cloud',
      runId: 'run-1'
    };
    const result = await tester.test(input);
    expect(result.success).toBe(true);
    expect(result.reports[0]?.name).toBe('cloud-task');
    expect(result.reports[0]?.status).toBe('passed');
  });

  it('CommandReviewer fails approval when cloud task failed', async () => {
    const reviewer = new CommandReviewer(() => makeResult('failed'));
    const input: ReviewInput = {
      task: { id: 'task', title: 'Task' },
      plan: { items: [{ id: 'pipeline:stage', description: 'Stage' }] },
      build: buildInput('cloud'),
      test: {
        subtaskId: 'pipeline:stage',
        success: false,
        reports: [{ name: 'cloud-task', status: 'failed' }],
        runId: 'run-1'
      },
      mode: 'cloud',
      runId: 'run-1'
    };
    const result = await reviewer.review(input);
    expect(result.decision.approved).toBe(false);
    expect(result.summary).toContain('Cloud task');
    expect(result.summary).toContain('Cloud status URL');
  });
});
