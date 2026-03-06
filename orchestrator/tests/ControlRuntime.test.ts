import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ControlStateStore } from '../src/cli/control/controlState.js';
import { createControlRuntime } from '../src/cli/control/controlRuntime.js';
import { resolveRunPaths, type RunPaths } from '../src/cli/run/runPaths.js';

interface TestFixture {
  root: string;
  paths: RunPaths;
  controlStore: ControlStateStore;
  runtime: ReturnType<typeof createControlRuntime>;
}

const cleanupRoots: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createFixture(): Promise<TestFixture> {
  const root = await mkdtemp(join(tmpdir(), 'control-runtime-'));
  cleanupRoots.push(root);

  const env = {
    repoRoot: root,
    runsRoot: join(root, '.runs'),
    outRoot: join(root, 'out'),
    taskId: 'task-1023'
  };
  const paths = resolveRunPaths(env, 'run-1');
  const controlStore = new ControlStateStore({ runId: 'run-1' });

  await mkdir(paths.runDir, { recursive: true });
  await seedManifest(paths, {
    summary: 'initial summary',
    updated_at: '2026-03-07T00:00:00.000Z'
  });

  const runtime = createControlRuntime({
    controlStore,
    questionQueue: { list: () => [] },
    paths,
    linearAdvisoryState: { tracked_issue: null },
    env
  });

  return { root, paths, controlStore, runtime };
}

async function seedManifest(
  paths: Pick<RunPaths, 'manifestPath'>,
  overrides: Record<string, unknown> = {}
): Promise<void> {
  await writeFile(
    paths.manifestPath,
    JSON.stringify({
      run_id: 'run-1',
      task_id: 'task-1023',
      status: 'in_progress',
      started_at: '2026-03-07T00:00:00.000Z',
      updated_at: '2026-03-07T00:00:00.000Z',
      completed_at: null,
      summary: 'task is running',
      commands: [],
      approvals: [],
      ...overrides
    }),
    'utf8'
  );
}

function readSelected(payload: Record<string, unknown>): Record<string, unknown> {
  return payload.selected as Record<string, unknown>;
}

function readRunning(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  return payload.running as Array<Record<string, unknown>>;
}

describe('ControlRuntime', () => {
  it('reuses the cached snapshot across repeated reads until invalidated', async () => {
    const fixture = await createFixture();
    const initialSnapshot = fixture.runtime.snapshot();

    const initialState = await initialSnapshot.readCompatibilityState();
    await seedManifest(fixture.paths, {
      summary: 'updated summary',
      updated_at: '2026-03-07T00:10:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    const repeatedSnapshot = fixture.runtime.snapshot();
    const repeatedState = await repeatedSnapshot.readCompatibilityState();

    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(readSelected(initialState).summary).toBe('initial summary');
    expect(readSelected(repeatedState).summary).toBe('initial summary');
    expect(readSelected(repeatedState).display_status).toBe('in_progress');
    expect(readRunning(repeatedState)[0]?.display_state).toBe('in_progress');
  });

  it('invalidates the cached snapshot on publish', async () => {
    const fixture = await createFixture();
    const initialSnapshot = fixture.runtime.snapshot();

    await initialSnapshot.readCompatibilityState();
    await seedManifest(fixture.paths, {
      summary: 'published summary',
      updated_at: '2026-03-07T00:15:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    fixture.runtime.publish({ source: 'run.updated', eventSeq: 1 });

    const refreshedSnapshot = fixture.runtime.snapshot();
    const refreshedState = await refreshedSnapshot.readCompatibilityState();

    expect(refreshedSnapshot).not.toBe(initialSnapshot);
    expect(readSelected(refreshedState).summary).toBe('published summary');
    expect(readSelected(refreshedState).display_status).toBe('paused');
    expect(readSelected(refreshedState).status_reason).toBe('control_pause');
    expect(readRunning(refreshedState)[0]?.display_state).toBe('paused');
  });

  it('refreshes the cached runtime after an accepted requestRefresh', async () => {
    const fixture = await createFixture();

    await fixture.runtime.snapshot().readCompatibilityState();
    await seedManifest(fixture.paths, {
      summary: 'refreshed summary',
      updated_at: '2026-03-07T00:20:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    const result = await fixture.runtime.requestRefresh({ action: 'refresh' });
    const refreshedState = await fixture.runtime.snapshot().readCompatibilityState();

    expect(result.kind).toBe('accepted');
    expect(readSelected(refreshedState).summary).toBe('refreshed summary');
    expect(readSelected(refreshedState).display_status).toBe('paused');
    expect(readSelected(refreshedState).status_reason).toBe('control_pause');
    expect(readRunning(refreshedState)[0]?.last_message).toBe('refreshed summary');
  });

  it('keeps the cached runtime unchanged when requestRefresh rejects the envelope', async () => {
    const fixture = await createFixture();
    const initialSnapshot = fixture.runtime.snapshot();

    const initialState = await initialSnapshot.readCompatibilityState();
    await seedManifest(fixture.paths, {
      summary: 'should stay hidden',
      updated_at: '2026-03-07T00:25:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    const result = await fixture.runtime.requestRefresh({ action: 'pause' });
    const repeatedSnapshot = fixture.runtime.snapshot();
    const repeatedState = await repeatedSnapshot.readCompatibilityState();

    expect(result).toMatchObject({
      kind: 'rejected',
      reason: 'forbidden_mutating_action',
      requestAction: 'pause'
    });
    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(readSelected(initialState).summary).toBe('initial summary');
    expect(readSelected(repeatedState).summary).toBe('initial summary');
    expect(readSelected(repeatedState).display_status).toBe('in_progress');
    expect(readRunning(repeatedState)[0]?.display_state).toBe('in_progress');
  });

  it('preserves the previous cached snapshot when accepted refresh warmup fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'control-runtime-'));
    cleanupRoots.push(root);

    const env = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1023'
    };
    const paths = resolveRunPaths(env, 'run-1');
    let snapshotCalls = 0;
    const controlStore = {
      snapshot() {
      snapshotCalls += 1;
        if (snapshotCalls >= 6) {
          throw new Error('snapshot warmup failed');
        }
        return {
          run_id: 'run-1',
          control_seq: 0,
          latest_action: null,
          feature_toggles: null,
          transport_mutation: null
        };
      }
    };

    await mkdir(paths.runDir, { recursive: true });
    await seedManifest(paths, {
      summary: 'initial summary',
      updated_at: '2026-03-07T00:00:00.000Z'
    });

    const runtime = createControlRuntime({
      controlStore,
      questionQueue: { list: () => [] },
      paths,
      linearAdvisoryState: { tracked_issue: null },
      env
    });

    const initialSnapshot = runtime.snapshot();
    const initialState = await initialSnapshot.readCompatibilityState();
    await seedManifest(paths, {
      summary: 'should stay hidden',
      updated_at: '2026-03-07T00:30:00.000Z'
    });

    await expect(runtime.requestRefresh({ action: 'refresh' })).rejects.toThrow(
      'snapshot warmup failed'
    );

    const repeatedSnapshot = runtime.snapshot();
    const repeatedState = await repeatedSnapshot.readCompatibilityState();

    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(readSelected(initialState).summary).toBe('initial summary');
    expect(readSelected(repeatedState).summary).toBe('initial summary');
  });
});
