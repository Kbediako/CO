import { describe, expect, it, beforeEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
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

    const statePath = join(outDir, newerRun.taskId, 'state.json');
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
});
