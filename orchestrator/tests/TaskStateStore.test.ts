import { describe, expect, it, beforeEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, readFile, writeFile, mkdir, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { TaskStateStore, TaskStateStoreLockError } from '../src/persistence/TaskStateStore.js';
import type { RunSummary } from '../src/types.js';
import type { TaskStateSnapshot } from '../src/persistence/TaskStateStore.js';

const createRunSummary = (overrides: Partial<RunSummary> = {}): RunSummary => {
  const runId = overrides.runId ?? 'run:2025-10-29T00:00:00Z';
  return {
    taskId: '0001',
    runId,
    mode: 'mcp',
    plan: {
      items: [{ id: 'subtask', description: 'plan' }],
      notes: 'planner output'
    },
    build: {
      subtaskId: 'subtask',
      artifacts: [],
      mode: 'mcp',
      notes: 'builder notes',
      runId,
      success: true
    },
    test: {
      subtaskId: 'subtask',
      success: true,
      reports: [],
      runId
    },
    review: {
      summary: 'approved',
      decision: { approved: true }
    },
    timestamp: overrides.timestamp ?? '2025-10-29T00:00:00.000Z',
    ...overrides
  };
};

describe('TaskStateStore', () => {
  let root: string;
  let runsDir: string;
  let outDir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'task-state-store-'));
    runsDir = join(root, 'runs');
    outDir = join(root, 'out');
  });

  it('keeps lastRunAt monotonic when runs arrive out of order', async () => {
    const store = new TaskStateStore({ runsDir, outDir });

    const newerRun = createRunSummary({
      runId: 'run:2025-10-29T15:00:00Z',
      timestamp: '2025-10-29T15:00:00.000Z'
    });

    const olderRun = createRunSummary({
      runId: 'run:2025-10-28T10:00:00Z',
      timestamp: '2025-10-28T10:00:00.000Z'
    });

    await store.recordRun(newerRun);
    await store.recordRun(olderRun);

    const statePath = join(outDir, newerRun.taskId, 'runs.json');
    const state = JSON.parse(await readFile(statePath, 'utf-8')) as TaskStateSnapshot;

    expect(state.runs.map((run) => run.runId)).toEqual([olderRun.runId, newerRun.runId]);
    expect(state.lastRunAt).toBe(newerRun.timestamp);
  });

  it('retries lock acquisition before throwing a TaskStateStoreLockError', async () => {
    const store = new TaskStateStore({
      runsDir,
      outDir,
      lockRetry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 1 }
    });

    await mkdir(runsDir, { recursive: true });
    const lockPath = join(runsDir, '0001.lock');
    await writeFile(lockPath, 'locked', 'utf-8');

    await expect(store.recordRun(createRunSummary())).rejects.toBeInstanceOf(TaskStateStoreLockError);
  });

  it('clears stale lock files before retrying', async () => {
    const store = new TaskStateStore({
      runsDir,
      outDir,
      lockRetry: { maxAttempts: 1, initialDelayMs: 1, maxDelayMs: 1, staleMs: 1 }
    });

    await mkdir(runsDir, { recursive: true });
    const lockPath = join(runsDir, '0001.lock');
    await writeFile(lockPath, 'locked', 'utf-8');
    const past = new Date(Date.now() - 60_000);
    await utimes(lockPath, past, past);

    await expect(store.recordRun(createRunSummary())).resolves.toBeUndefined();
  });

  it('does not clobber retry defaults with undefined overrides', () => {
    const store = new TaskStateStore({
      runsDir,
      outDir,
      lockRetry: { maxAttempts: undefined }
    });

    expect((store as unknown as { lockRetry: { maxAttempts: number } }).lockRetry.maxAttempts).toBe(5);
  });

  it('replaces existing runs without duplicating entries and keeps ordering intact', async () => {
    const store = new TaskStateStore({ runsDir, outDir });

    const runA = createRunSummary({
      runId: 'run:2025-10-29T00:00:00Z',
      timestamp: '2025-10-29T00:00:00.000Z'
    });
    const runB = createRunSummary({
      runId: 'run:2025-10-29T01:00:00Z',
      timestamp: '2025-10-29T01:00:00.000Z'
    });
    const runC = createRunSummary({
      runId: 'run:2025-10-29T02:00:00Z',
      timestamp: '2025-10-29T02:00:00.000Z'
    });

    await store.recordRun(runA);
    await store.recordRun(runB);
    await store.recordRun(runC);

    const replacement = createRunSummary({
      runId: runB.runId,
      timestamp: '2025-10-29T04:00:00.000Z',
      build: {
        ...runB.build,
        notes: 'updated',
        runId: runB.runId
      }
    });

    await store.recordRun(replacement);

    const statePath = join(outDir, runA.taskId, 'runs.json');
    const state = JSON.parse(await readFile(statePath, 'utf-8')) as TaskStateSnapshot;

    expect(state.runs).toHaveLength(3);
    expect(state.runs.map((run) => run.runId)).toEqual([runA.runId, runC.runId, runB.runId]);
    expect(state.runs.find((run) => run.runId === runB.runId)?.build.notes).toBe('updated');
    expect(state.lastRunAt).toBe(replacement.timestamp);
  });

  it('ignores legacy metrics state.json when migrating snapshots', async () => {
    const store = new TaskStateStore({ runsDir, outDir });
    const metricsDir = join(outDir, '0001');
    await mkdir(metricsDir, { recursive: true });
    await writeFile(
      join(metricsDir, 'state.json'),
      JSON.stringify({ updated_at: '2025-12-12T00:00:00.000Z', safety: {}, throughput: {}, alerts: {} }, null, 2),
      'utf8'
    );

    await store.recordRun(createRunSummary());

    const historyPath = join(metricsDir, 'runs.json');
    const history = JSON.parse(await readFile(historyPath, 'utf-8')) as TaskStateSnapshot;
    expect(history.taskId).toBe('0001');
    expect(history.runs).toHaveLength(1);

    const metricsRaw = JSON.parse(await readFile(join(metricsDir, 'state.json'), 'utf-8')) as Record<string, unknown>;
    expect(metricsRaw).not.toHaveProperty('taskId');
  });
});
