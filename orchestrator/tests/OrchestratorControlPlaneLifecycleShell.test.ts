import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runOrchestratorControlPlaneLifecycleShell } from '../src/cli/services/orchestratorControlPlaneLifecycleShell.js';

describe('runOrchestratorControlPlaneLifecycleShell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults the emitter, emits manifest-backed run events, forwards lifecycle context, and closes on success', async () => {
    const close = vi.fn(async () => undefined);
    const events: Array<Record<string, unknown>> = [];
    const startLifecycle = vi.fn(async (input) => {
      input.emitter.on('*', (event) => events.push(event as never));
      return {
        eventStream: { label: 'event-stream' },
        onEventEntry: vi.fn(),
        close
      };
    });
    const runWithLifecycle = vi.fn(async (context) => {
      expect(context.eventStream).toEqual({ label: 'event-stream' });
      expect(context.runEvents).toBeDefined();
      expect(typeof context.onEventEntry).toBe('function');
      context.runEvents?.runStarted([], 'running');
      return 'ok';
    });

    const result = await runOrchestratorControlPlaneLifecycleShell({
      repoRoot: '/tmp/repo',
      pipeline: { id: 'pipeline-1', title: 'Pipeline 1' },
      manifest: { task_id: 'task-1', run_id: 'run-1' } as never,
      paths: {
        manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
        logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
      } as never,
      startLifecycle,
      runWithLifecycle
    });

    expect(result).toBe('ok');
    expect(startLifecycle).toHaveBeenCalledOnce();
    expect(startLifecycle.mock.calls[0]?.[0]).toMatchObject({
      repoRoot: '/tmp/repo',
      taskId: 'task-1',
      runId: 'run-1',
      pipeline: { id: 'pipeline-1', title: 'Pipeline 1' }
    });
    expect(startLifecycle.mock.calls[0]?.[0].emitter).toBeDefined();
    expect(runWithLifecycle).toHaveBeenCalledOnce();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'run:started',
      taskId: 'task-1',
      runId: 'run-1',
      pipelineId: 'pipeline-1',
      pipelineTitle: 'Pipeline 1',
      manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
      logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson',
      status: 'running',
      stages: []
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('runs onStartFailure when startup fails before the lifecycle is live', async () => {
    const onStartFailure = vi.fn(async () => undefined);
    const runWithLifecycle = vi.fn();

    await expect(
      runOrchestratorControlPlaneLifecycleShell({
        repoRoot: '/tmp/repo',
        pipeline: { id: 'pipeline-1', title: 'Pipeline 1' },
        manifest: { task_id: 'task-1', run_id: 'run-1' } as never,
        paths: {
          manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
          logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
        } as never,
        startLifecycle: vi.fn(async () => {
          throw new Error('boom');
        }),
        onStartFailure,
        runWithLifecycle
      })
    ).rejects.toThrow('boom');

    expect(onStartFailure).toHaveBeenCalledOnce();
    expect(runWithLifecycle).not.toHaveBeenCalled();
  });

  it('does not run onStartFailure when the callback fails after startup and still closes', async () => {
    const close = vi.fn(async () => undefined);
    const onStartFailure = vi.fn(async () => undefined);
    const runWithLifecycle = vi.fn(async () => {
      throw new Error('callback failed');
    });

    await expect(
      runOrchestratorControlPlaneLifecycleShell({
        repoRoot: '/tmp/repo',
        pipeline: { id: 'pipeline-1', title: 'Pipeline 1' },
        manifest: { task_id: 'task-1', run_id: 'run-1' } as never,
        paths: {
          manifestPath: '/tmp/repo/.runs/task-1/run-1/manifest.json',
          logPath: '/tmp/repo/.runs/task-1/run-1/runner.ndjson'
        } as never,
        startLifecycle: vi.fn(async () => ({
          eventStream: { label: 'event-stream' },
          onEventEntry: vi.fn(),
          close
        })),
        onStartFailure,
        runWithLifecycle
      })
    ).rejects.toThrow('callback failed');

    expect(onStartFailure).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });
});
