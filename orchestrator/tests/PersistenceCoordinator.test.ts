import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventBus } from '../src/events/EventBus.js';
import { PersistenceCoordinator } from '../src/persistence/PersistenceCoordinator.js';
import { RunManifestWriter } from '../src/persistence/RunManifestWriter.js';
import { TaskStateStore, TaskStateStoreLockError } from '../src/persistence/TaskStateStore.js';
import type { RunSummary } from '../src/types.js';

const createRunSummary = (): RunSummary => ({
  taskId: '0001',
  runId: 'run:2025-10-16T01:33:15Z',
  mode: 'mcp',
  plan: {
    items: [{ id: 'subtask', description: 'Implement persistence' }],
    notes: 'planner output'
  },
  build: {
    subtaskId: 'subtask',
    artifacts: [],
    mode: 'mcp',
    notes: 'builder notes'
  },
  test: {
    subtaskId: 'subtask',
    success: true,
    reports: []
  },
  review: {
    summary: 'approved',
    decision: { approved: true }
  },
  timestamp: new Date().toISOString()
});

describe('PersistenceCoordinator', () => {
  let root: string;
  let runsDir: string;
  let outDir: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'orchestrator-persist-'));
    runsDir = join(root, 'runs');
    outDir = join(root, 'out');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes manifest and task state snapshot when handling a run summary', async () => {
    const stateStore = new TaskStateStore({ runsDir, outDir });
    const manifestWriter = new RunManifestWriter({ runsDir });
    const bus = new EventBus();
    const coordinator = new PersistenceCoordinator(bus, stateStore, manifestWriter);

    const summary = createRunSummary();
    await coordinator.handleRunCompleted(summary);

    const manifestPath = join(
      runsDir,
      summary.taskId,
      summary.runId.replace(/[:]/g, '-'),
      'manifest.json'
    );
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as RunSummary;
    expect(manifest.runId).toBe(summary.runId);

    const statePath = join(outDir, summary.taskId, 'state.json');
    const state = JSON.parse(await readFile(statePath, 'utf-8'));
    expect(state.taskId).toBe(summary.taskId);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0].runId).toBe(summary.runId);
    expect(state.lastRunAt).toBe(summary.timestamp);
  });

  it('invokes onError callback if lock exists', async () => {
    const stateStore = new TaskStateStore({ runsDir, outDir });
    const manifestWriter = new RunManifestWriter({ runsDir });
    const bus = new EventBus();
    const onError = vi.fn();
    const coordinator = new PersistenceCoordinator(bus, stateStore, manifestWriter, { onError });

    const summary = createRunSummary();
    await mkdir(runsDir, { recursive: true });
    const lockPath = join(runsDir, `${summary.taskId}.lock`);
    await writeFile(lockPath, 'locked', 'utf-8');

    await coordinator.handleRunCompleted(summary);

    expect(onError).toHaveBeenCalledTimes(1);
    const [error] = onError.mock.calls[0];
    expect(error).toBeInstanceOf(TaskStateStoreLockError);
  });

  it('registers run:completed listener via start()', async () => {
    const stateStore = new TaskStateStore({ runsDir, outDir });
    const manifestWriter = new RunManifestWriter({ runsDir });
    const bus = new EventBus();
    const coordinator = new PersistenceCoordinator(bus, stateStore, manifestWriter);

    const handleSpy = vi.spyOn(coordinator, 'handleRunCompleted');
    coordinator.start();

    const summary = createRunSummary();
    bus.emit({ type: 'run:completed', payload: summary });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handleSpy).toHaveBeenCalledWith(summary);

    coordinator.stop();
  });
});
