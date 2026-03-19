import { describe, expect, it, vi } from 'vitest';

import type { TaskManager } from '../src/manager.js';
import { EventBus } from '../src/events/EventBus.js';
import { attachOrchestratorPlanTargetTracker } from '../src/cli/services/orchestratorPlanTargetTracker.js';

function createManager(): TaskManager {
  return { bus: new EventBus() } as unknown as TaskManager;
}

function emitPlanCompleted(manager: TaskManager, targetId: string | null): void {
  manager.bus.emit({
    type: 'plan:completed',
    payload: {
      task: { id: 'task-1', title: 'Task 1' },
      plan: { items: [], targetId },
      runId: 'run-1'
    }
  } as never);
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('attachOrchestratorPlanTargetTracker', () => {
  it('updates plan_target_id and persists when the completed target changes', async () => {
    const manager = createManager();
    const manifest = { run_id: 'run-1', task_id: 'task-1', plan_target_id: null } as never;
    const paths = { runDir: '/tmp/repo/.runs/task-1/run-1' } as never;
    const persister = { label: 'persister' } as never;
    const persistManifestImpl = vi.fn(async () => undefined);

    attachOrchestratorPlanTargetTracker({
      manager,
      manifest,
      paths,
      persister,
      persistManifestImpl
    });

    emitPlanCompleted(manager, 'target-1');
    await flushMicrotasks();

    expect(manifest.plan_target_id).toBe('target-1');
    expect(persistManifestImpl).toHaveBeenCalledOnce();
    expect(persistManifestImpl).toHaveBeenCalledWith(paths, manifest, persister, { force: true });
  });

  it('skips persistence when the completed target matches the existing manifest target', async () => {
    const manager = createManager();
    const manifest = { run_id: 'run-1', task_id: 'task-1', plan_target_id: 'target-1' } as never;
    const persistManifestImpl = vi.fn(async () => undefined);

    attachOrchestratorPlanTargetTracker({
      manager,
      manifest,
      paths: { runDir: '/tmp/repo/.runs/task-1/run-1' } as never,
      persister: { label: 'persister' } as never,
      persistManifestImpl
    });

    emitPlanCompleted(manager, 'target-1');
    await flushMicrotasks();

    expect(manifest.plan_target_id).toBe('target-1');
    expect(persistManifestImpl).not.toHaveBeenCalled();
  });

  it('warns without throwing when persisting the updated target fails', async () => {
    const manager = createManager();
    const manifest = { run_id: 'run-1', task_id: 'task-1', plan_target_id: null } as never;
    const warning = vi.fn();
    const persistManifestImpl = vi.fn(async () => {
      throw new Error('persist failed');
    });

    attachOrchestratorPlanTargetTracker({
      manager,
      manifest,
      paths: { runDir: '/tmp/repo/.runs/task-1/run-1' } as never,
      persister: { label: 'persister' } as never,
      persistManifestImpl,
      warn: warning
    });

    expect(() => emitPlanCompleted(manager, 'target-1')).not.toThrow();
    await flushMicrotasks();

    expect(manifest.plan_target_id).toBe('target-1');
    expect(persistManifestImpl).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith('Failed to persist plan target for run run-1: persist failed');
  });
});
