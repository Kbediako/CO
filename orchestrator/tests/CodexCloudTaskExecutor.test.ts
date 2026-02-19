import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  CodexCloudTaskExecutor,
  extractCloudTaskId,
  mapCloudStatusToken,
  parseCloudStatusToken,
  type CloudCommandRunner
} from '../src/cloud/CodexCloudTaskExecutor.js';

const TASK_ID = 'task_e_1234567890abcdef1234567890abcdef';

describe('CodexCloudTaskExecutor', () => {
  it('submits, polls, and captures diff for a successful cloud task', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-exec-success-'));
    const runner = vi
      .fn<Parameters<CloudCommandRunner>, ReturnType<CloudCommandRunner>>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: `Submitted: ${TASK_ID}\n`,
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ tasks: [{ id: TASK_ID, url: `https://chatgpt.com/codex/tasks/${TASK_ID}` }] }),
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '[RUNNING] test task\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '[READY] test task\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'diff --git a/file.txt b/file.txt\n+hello\n',
        stderr: ''
      });

    const executor = new CodexCloudTaskExecutor({
      commandRunner: runner,
      now: () => '2026-02-13T00:00:00.000Z',
      sleepFn: async () => {}
    });

    const result = await executor.execute({
      codexBin: 'codex',
      prompt: 'Fix the issue',
      environmentId: 'env_123',
      repoRoot: root,
      runDir: join(root, '.runs', 'task', 'cli', 'run-1'),
      pollIntervalSeconds: 1,
      timeoutSeconds: 60,
      attempts: 1
    });

    expect(result.success).toBe(true);
    expect(result.cloudExecution.task_id).toBe(TASK_ID);
    expect(result.cloudExecution.status).toBe('ready');
    expect(result.cloudExecution.diff_status).toBe('available');
    expect(result.cloudExecution.status_url).toBe(`https://chatgpt.com/codex/tasks/${TASK_ID}`);
    expect(result.cloudExecution.diff_path).toBeTruthy();
    const diffPath = join(root, result.cloudExecution.diff_path as string);
    const diff = await readFile(diffPath, 'utf8');
    expect(diff).toContain('diff --git');
    expect(runner).toHaveBeenCalledTimes(5);
  });

  it('treats non-zero pending status responses as in-progress and keeps polling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-exec-pending-nonzero-'));
    const runner = vi
      .fn<Parameters<CloudCommandRunner>, ReturnType<CloudCommandRunner>>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: `Submitted: ${TASK_ID}\n`,
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ tasks: [{ id: TASK_ID, url: `https://chatgpt.com/codex/tasks/${TASK_ID}` }] }),
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: '[PENDING] test task\n',
        stderr: 'no diff\n'
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '[READY] test task\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'diff --git a/file.txt b/file.txt\n+hello\n',
        stderr: ''
      });

    const executor = new CodexCloudTaskExecutor({
      commandRunner: runner,
      now: () => '2026-02-13T00:00:00.000Z',
      sleepFn: async () => {}
    });

    const result = await executor.execute({
      codexBin: 'codex',
      prompt: 'Fix the issue',
      environmentId: 'env_123',
      repoRoot: root,
      runDir: join(root, '.runs', 'task', 'cli', 'run-1'),
      pollIntervalSeconds: 1,
      timeoutSeconds: 60,
      attempts: 1
    });

    expect(result.success).toBe(true);
    expect(result.cloudExecution.status).toBe('ready');
    expect(result.cloudExecution.diff_status).toBe('available');
    expect(result.cloudExecution.poll_count).toBe(2);
    expect(runner).toHaveBeenCalledTimes(5);
  });

  it('fails gracefully when task id cannot be parsed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-exec-parse-failure-'));
    const runner = vi
      .fn<Parameters<CloudCommandRunner>, ReturnType<CloudCommandRunner>>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'submitted without id',
        stderr: ''
      });
    const executor = new CodexCloudTaskExecutor({
      commandRunner: runner,
      sleepFn: async () => {}
    });

    const result = await executor.execute({
      codexBin: 'codex',
      prompt: 'Fix the issue',
      environmentId: 'env_123',
      repoRoot: root,
      runDir: join(root, '.runs', 'task', 'cli', 'run-1'),
      pollIntervalSeconds: 1,
      timeoutSeconds: 10,
      attempts: 1
    });

    expect(result.success).toBe(false);
    expect(result.cloudExecution.status).toBe('failed');
    expect(result.cloudExecution.error).toContain('Unable to parse cloud task id');
  });

  it('marks failed when cloud status reaches terminal failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-exec-status-failure-'));
    const runner = vi
      .fn<Parameters<CloudCommandRunner>, ReturnType<CloudCommandRunner>>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: `Submitted: ${TASK_ID}\n`,
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ tasks: [{ id: TASK_ID, url: `https://chatgpt.com/codex/tasks/${TASK_ID}` }] }),
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '[FAILED] test task\n',
        stderr: ''
      });
    const executor = new CodexCloudTaskExecutor({
      commandRunner: runner,
      sleepFn: async () => {}
    });

    const result = await executor.execute({
      codexBin: 'codex',
      prompt: 'Fix the issue',
      environmentId: 'env_123',
      repoRoot: root,
      runDir: join(root, '.runs', 'task', 'cli', 'run-1'),
      pollIntervalSeconds: 1,
      timeoutSeconds: 10,
      attempts: 1
    });

    expect(result.success).toBe(false);
    expect(result.cloudExecution.status).toBe('failed');
    expect(result.cloudExecution.diff_status).toBe('unavailable');
  });

  it('passes branch and feature toggles through to cloud exec', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-exec-flags-'));
    const runner = vi
      .fn<Parameters<CloudCommandRunner>, ReturnType<CloudCommandRunner>>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: `Submitted: ${TASK_ID}\n`,
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ tasks: [{ id: TASK_ID, url: `https://chatgpt.com/codex/tasks/${TASK_ID}` }] }),
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '[READY] test task\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

    const executor = new CodexCloudTaskExecutor({
      commandRunner: runner,
      now: () => '2026-02-13T00:00:00.000Z',
      sleepFn: async () => {}
    });

    await executor.execute({
      codexBin: 'codex',
      prompt: 'Fix the issue',
      environmentId: 'env_123',
      repoRoot: root,
      runDir: join(root, '.runs', 'task', 'cli', 'run-1'),
      pollIntervalSeconds: 1,
      timeoutSeconds: 60,
      attempts: 1,
      branch: 'main',
      enableFeatures: ['sqlite', 'memory_tool', 'sqlite'],
      disableFeatures: ['js_repl']
    });

    expect(runner).toHaveBeenCalledTimes(4);
    expect(runner.mock.calls[0]?.[0].args).toEqual([
      'cloud',
      'exec',
      '--env',
      'env_123',
      '--attempts',
      '1',
      '--branch',
      'main',
      '--enable',
      'sqlite',
      '--enable',
      'memory_tool',
      '--disable',
      'js_repl',
      'Fix the issue'
    ]);
  });

  it('respects custom status retry limit and backoff settings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-exec-status-retry-limit-'));
    const runner = vi
      .fn<Parameters<CloudCommandRunner>, ReturnType<CloudCommandRunner>>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: `Submitted: ${TASK_ID}\n`,
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ tasks: [{ id: TASK_ID, url: `https://chatgpt.com/codex/tasks/${TASK_ID}` }] }),
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: 'transient status error',
        stderr: 'retry'
      })
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: 'transient status error',
        stderr: 'retry'
      })
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: 'transient status error',
        stderr: 'retry'
      });
    const sleepFn = vi.fn(async () => {});
    const executor = new CodexCloudTaskExecutor({
      commandRunner: runner,
      sleepFn
    });

    const result = await executor.execute({
      codexBin: 'codex',
      prompt: 'Fix the issue',
      environmentId: 'env_123',
      repoRoot: root,
      runDir: join(root, '.runs', 'task', 'cli', 'run-1'),
      pollIntervalSeconds: 1,
      timeoutSeconds: 10,
      attempts: 1,
      statusRetryLimit: 2,
      statusRetryBackoffMs: 5
    });

    expect(result.success).toBe(false);
    expect(result.cloudExecution.status).toBe('failed');
    expect(result.cloudExecution.error).toContain('codex cloud status failed 3 times');
    expect(sleepFn).toHaveBeenCalledTimes(2);
    expect(sleepFn.mock.calls.map((call) => call[0])).toEqual([5, 10]);
  });

  it('caps retry sleep to the remaining timeout when backoff is oversized', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-exec-status-backoff-cap-'));
    const runner = vi
      .fn<Parameters<CloudCommandRunner>, ReturnType<CloudCommandRunner>>()
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: `Submitted: ${TASK_ID}\n`,
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ tasks: [{ id: TASK_ID, url: `https://chatgpt.com/codex/tasks/${TASK_ID}` }] }),
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: 'transient status error',
        stderr: 'retry'
      })
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: 'transient status error',
        stderr: 'retry'
      });
    const sleepFn = vi.fn(async () => {});
    const executor = new CodexCloudTaskExecutor({
      commandRunner: runner,
      sleepFn
    });

    const result = await executor.execute({
      codexBin: 'codex',
      prompt: 'Fix the issue',
      environmentId: 'env_123',
      repoRoot: root,
      runDir: join(root, '.runs', 'task', 'cli', 'run-1'),
      pollIntervalSeconds: 1,
      timeoutSeconds: 1,
      attempts: 1,
      statusRetryLimit: 1,
      statusRetryBackoffMs: 60_000
    });

    expect(result.success).toBe(false);
    expect(result.cloudExecution.error).toContain('codex cloud status failed 2 times');
    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(sleepFn.mock.calls[0]?.[0]).toBeLessThanOrEqual(1_000);
  });
});

describe('cloud task parsing helpers', () => {
  it('extracts task id and status tokens', () => {
    expect(extractCloudTaskId(`created ${TASK_ID}`)).toBe(TASK_ID);
    expect(parseCloudStatusToken('[READY] done')).toBe('READY');
    expect(mapCloudStatusToken('READY')).toBe('ready');
    expect(mapCloudStatusToken('RUNNING')).toBe('running');
    expect(mapCloudStatusToken('FAILED')).toBe('failed');
  });
});
