import { afterEach, describe, expect, it, vi } from 'vitest';
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

interface CreateFixtureOptions {
  taskId?: string;
  featureToggles?: Record<string, unknown>;
  linearAdvisoryState?: Parameters<typeof createControlRuntime>[0]['linearAdvisoryState'];
  env?: NodeJS.ProcessEnv;
}

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createFixture(options: CreateFixtureOptions = {}): Promise<TestFixture> {
  const root = await mkdtemp(join(tmpdir(), 'control-runtime-'));
  cleanupRoots.push(root);
  const taskId = options.taskId ?? 'task-1023';

  const env = {
    repoRoot: root,
    runsRoot: join(root, '.runs'),
    outRoot: join(root, 'out'),
    taskId
  };
  const paths = resolveRunPaths(env, 'run-1');
  const controlStore = new ControlStateStore({
    runId: 'run-1',
    featureToggles: options.featureToggles ?? null
  });

  await mkdir(paths.runDir, { recursive: true });
  await seedManifest(paths, {
    task_id: taskId,
    summary: 'initial summary',
    updated_at: '2026-03-07T00:00:00.000Z'
  });

  const runtime = createControlRuntime({
    controlStore,
    questionQueue: { list: () => [] },
    paths,
    linearAdvisoryState: options.linearAdvisoryState ?? { tracked_issue: null },
    env: options.env
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

function buildLiveLinearDispatchPilot(): Record<string, unknown> {
  return {
    dispatch_pilot: {
      enabled: true,
      source: {
        provider: 'linear',
        live: true,
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    }
  };
}

function buildLiveLinearGraphqlResponse(): Response {
  return new Response(
    JSON.stringify({
      data: {
        viewer: {
          organization: {
            id: 'lin-workspace-1'
          }
        },
        issues: {
          nodes: [
            {
              id: 'lin-issue-1',
              identifier: 'PREPROD-101',
              title: 'Investigate advisory routing',
              url: 'https://linear.app/asabeko/issue/PREPROD-101',
              updatedAt: '2026-03-06T02:00:00.000Z',
              state: {
                name: 'In Progress',
                type: 'started'
              },
              team: {
                id: 'lin-team-live',
                key: 'PREPROD',
                name: 'PRE-PRO/PRODUCTION'
              },
              project: {
                id: 'lin-project-1',
                name: 'Icon Agency (Bookings)'
              },
              history: {
                nodes: [
                  {
                    id: 'history-1',
                    createdAt: '2026-03-06T01:00:00.000Z',
                    actor: {
                      displayName: 'Operator One'
                    },
                    fromState: {
                      name: 'Todo'
                    },
                    toState: {
                      name: 'In Progress'
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
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
        if (snapshotCalls >= 5) {
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

  it('keeps state issue and ui reads provider-free when only live dispatch is configured', async () => {
    const fixture = await createFixture({
      taskId: 'task-1024',
      featureToggles: buildLiveLinearDispatchPilot(),
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    const realFetch = globalThis.fetch;
    let linearFetchCount = 0;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        linearFetchCount += 1;
        return buildLiveLinearGraphqlResponse();
      }
      return realFetch(input, init);
    });

    const snapshot = fixture.runtime.snapshot();
    const statePayload = (await snapshot.readCompatibilityState()) as {
      tracked?: { linear?: unknown };
    };
    const issueResult = await snapshot.readCompatibilityIssue('task-1024');
    const uiPayload = (await snapshot.readUiDataset()) as {
      selected?: { tracked?: { linear?: unknown } } | null;
      tasks?: Array<{ tracked?: { linear?: unknown } }>;
      runs?: Array<{ tracked?: { linear?: unknown } }>;
    };

    expect(linearFetchCount).toBe(0);
    expect(statePayload.tracked?.linear ?? null).toBeNull();
    expect(issueResult.kind).toBe('ok');
    if (issueResult.kind !== 'ok') {
      throw new Error('expected issue payload');
    }
    const issuePayload = issueResult.payload as {
      tracked?: { linear?: unknown };
    };
    expect(issuePayload.tracked?.linear ?? null).toBeNull();
    expect(uiPayload.selected?.tracked?.linear ?? null).toBeNull();
    expect(uiPayload.tasks?.[0]?.tracked?.linear ?? null).toBeNull();
    expect(uiPayload.runs?.[0]?.tracked?.linear ?? null).toBeNull();
  });

  it('reports deterministic snapshot source_unavailable state when live dispatch credentials are missing', async () => {
    const fixture = await createFixture({
      taskId: 'task-1024-missing-credentials',
      featureToggles: buildLiveLinearDispatchPilot()
    });
    const realFetch = globalThis.fetch;
    let linearFetchCount = 0;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        linearFetchCount += 1;
        return buildLiveLinearGraphqlResponse();
      }
      return realFetch(input, init);
    });

    const snapshot = fixture.runtime.snapshot();
    const statePayload = (await snapshot.readCompatibilityState()) as {
      dispatch_pilot?: { status?: string; source_status?: string; reason?: string };
    };
    const issueResult = await snapshot.readCompatibilityIssue('task-1024-missing-credentials');
    const uiPayload = (await snapshot.readUiDataset()) as {
      selected?: { tracked?: { linear?: unknown } } | null;
    };

    expect(linearFetchCount).toBe(0);
    expect(statePayload.dispatch_pilot).toMatchObject({
      status: 'source_unavailable',
      source_status: 'unavailable',
      reason: 'dispatch_source_credentials_missing'
    });
    expect(issueResult.kind).toBe('ok');
    if (issueResult.kind !== 'ok') {
      throw new Error('expected issue payload');
    }
    const issuePayload = issueResult.payload as {
      dispatch_pilot?: { status?: string; source_status?: string; reason?: string };
      tracked?: { linear?: unknown };
    };
    expect(issuePayload.dispatch_pilot).toMatchObject({
      status: 'source_unavailable',
      source_status: 'unavailable',
      reason: 'dispatch_source_credentials_missing'
    });
    expect(issuePayload.tracked?.linear ?? null).toBeNull();
    expect(uiPayload.selected?.tracked?.linear ?? null).toBeNull();
  });

  it('single-flights explicit dispatch reads and invalidates the advisory cache on publish', async () => {
    const fixture = await createFixture({
      taskId: 'task-1024',
      featureToggles: buildLiveLinearDispatchPilot(),
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    const realFetch = globalThis.fetch;
    let linearFetchCount = 0;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        linearFetchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return buildLiveLinearGraphqlResponse();
      }
      return realFetch(input, init);
    });

    const snapshot = fixture.runtime.snapshot();
    const [firstDispatch, secondDispatch] = await Promise.all([
      snapshot.readCompatibilityDispatch(),
      snapshot.readCompatibilityDispatch()
    ]);

    expect(firstDispatch.kind).toBe('ok');
    expect(secondDispatch.kind).toBe('ok');
    expect(linearFetchCount).toBe(1);

    fixture.runtime.publish({ source: 'run.updated', eventSeq: 1 });

    const refreshedSnapshot = fixture.runtime.snapshot();
    const [thirdDispatch, fourthDispatch] = await Promise.all([
      refreshedSnapshot.readCompatibilityDispatch(),
      refreshedSnapshot.readCompatibilityDispatch()
    ]);

    expect(thirdDispatch.kind).toBe('ok');
    expect(fourthDispatch.kind).toBe('ok');
    expect(linearFetchCount).toBe(2);
  });
});
