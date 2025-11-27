import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createInitialHudState,
  HudStore,
  reduceHudState,
  type HudState
} from '../src/cli/ui/store.js';
import type {
  LogEvent,
  RunStartedEvent,
  StageCompletedEvent,
  StageStartedEvent
} from '../src/cli/events/runEvents.js';

const baseRunStarted: RunStartedEvent = {
  type: 'run:started',
  timestamp: '2025-01-01T00:00:00Z',
  runId: 'run-hud',
  taskId: 'task-hud',
  pipelineId: 'pipeline-hud',
  pipelineTitle: 'HUD Test',
  manifestPath: '/runs/manifest.json',
  logPath: '/runs/runner.ndjson',
  status: 'in_progress',
  stages: [
    {
      index: 1,
      id: 'stage-1',
      title: 'Stage One',
      kind: 'command',
      status: 'pending',
      summary: null,
      exitCode: null,
      logPath: null,
      subRunId: null
    }
  ]
};

describe('reduceHudState', () => {
  it('tracks stage lifecycle transitions', () => {
    const stageStarted: StageStartedEvent = {
      type: 'stage:started',
      timestamp: '2025-01-01T00:01:00Z',
      runId: 'run-hud',
      taskId: 'task-hud',
      stageId: 'stage-1',
      stageIndex: 1,
      title: 'Stage One',
      kind: 'command',
      status: 'running',
      logPath: '/runs/commands/01-stage-1.ndjson'
    };
    const stageCompleted: StageCompletedEvent = {
      type: 'stage:completed',
      timestamp: '2025-01-01T00:02:00Z',
      runId: 'run-hud',
      taskId: 'task-hud',
      stageId: 'stage-1',
      stageIndex: 1,
      title: 'Stage One',
      kind: 'command',
      status: 'succeeded',
      exitCode: 0,
      summary: 'ok',
      logPath: '/runs/commands/01-stage-1.ndjson',
      subRunId: null
    };

    let state = reduceHudState(createInitialHudState(), baseRunStarted);
    expect(state.stages[0]?.status).toBe('pending');

    state = reduceHudState(state, stageStarted);
    expect(state.stages[0]?.status).toBe('running');
    expect(state.stages[0]?.logPath).toContain('commands/01-stage-1');

    state = reduceHudState(state, stageCompleted);
    expect(state.stages[0]?.status).toBe('succeeded');
    expect(state.stages[0]?.summary).toBe('ok');
    expect(state.lastUpdated).toBe(stageCompleted.timestamp);
  });

  it('enforces bounded log tails', () => {
    let state: HudState = reduceHudState(createInitialHudState(), baseRunStarted, 3);
    const logEvents: LogEvent[] = Array.from({ length: 5 }).map((_, index) => ({
      type: 'log',
      timestamp: `2025-01-01T00:00:0${index}Z`,
      runId: 'run-hud',
      taskId: 'task-hud',
      stageId: null,
      stageIndex: null,
      level: 'info',
      message: `line-${index + 1}`
    }));
    for (const log of logEvents) {
      state = reduceHudState(state, log, 3);
    }
    expect(state.logs).toHaveLength(3);
    expect(state.logs[0]?.message).toBe('line-3');
    expect(state.logs[2]?.message).toBe('line-5');
  });
});

describe('HudStore batching', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches event delivery before notifying listeners', async () => {
    const store = new HudStore({ batchIntervalMs: 10, logLimit: 5 });
    const seen: HudState[] = [];
    store.subscribe((state) => {
      seen.push(state);
    });

    store.enqueue(baseRunStarted);
    store.enqueue({
      type: 'log',
      timestamp: '2025-01-01T00:00:01Z',
      runId: 'run-hud',
      taskId: 'task-hud',
      stageId: null,
      stageIndex: null,
      level: 'info',
      message: 'batched'
    } satisfies LogEvent);

    expect(seen).toHaveLength(1); // initial subscription callback

    await vi.runAllTimersAsync();

    expect(seen).toHaveLength(2);
    expect(seen[1]?.logs[0]?.message).toBe('batched');
    expect(seen[1]?.runId).toBe('run-hud');
  });
});
