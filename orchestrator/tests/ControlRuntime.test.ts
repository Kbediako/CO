import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ControlStateStore } from '../src/cli/control/controlState.js';
import { createControlRuntime } from '../src/cli/control/controlRuntime.js';
import type { QuestionRecord } from '../src/cli/control/questions.js';
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
  questions?: QuestionRecord[];
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
    questionQueue: { list: () => options.questions ?? [] },
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

function buildTrackedIssue(): NonNullable<CreateFixtureOptions['linearAdvisoryState']>['tracked_issue'] {
  return {
    provider: 'linear',
    id: 'lin-issue-1',
    identifier: 'PREPROD-101',
    title: 'Investigate advisory routing',
    url: 'https://linear.app/asabeko/issue/PREPROD-101',
    state: 'In Progress',
    state_type: 'started',
    workspace_id: 'lin-workspace-1',
    team_id: 'lin-team-live',
    team_key: 'PREPROD',
    team_name: 'PRE-PRO/PRODUCTION',
    project_id: 'lin-project-1',
    project_name: 'Icon Agency (Bookings)',
    updated_at: '2026-03-06T02:00:00.000Z',
    recent_activity: [
      {
        id: 'history-1',
        created_at: '2026-03-06T01:00:00.000Z',
        actor_name: 'Operator One',
        summary: 'Todo -> In Progress'
      }
    ]
  };
}

describe('ControlRuntime', () => {
  it('reuses the cached snapshot across repeated reads until invalidated', async () => {
    const fixture = await createFixture();
    const initialSnapshot = fixture.runtime.snapshot();

    const initialState = await initialSnapshot.readCompatibilityState();
    const initialSelectedRun = await initialSnapshot.readSelectedRunReadModel();
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
    const repeatedSelectedRun = await repeatedSnapshot.readSelectedRunReadModel();

    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(readSelected(initialState).summary).toBe('initial summary');
    expect(readSelected(repeatedState).summary).toBe('initial summary');
    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.summary).toBe('initial summary');
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
    const refreshedSelectedRun = await refreshedSnapshot.readSelectedRunReadModel();

    expect(refreshedSnapshot).not.toBe(initialSnapshot);
    expect(readSelected(refreshedState).summary).toBe('published summary');
    expect(refreshedSelectedRun.selected?.summary).toBe('published summary');
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

  it('keeps selected-run dispatch summaries aligned after requestRefresh invalidates live advisory caches', async () => {
    const fixture = await createFixture({
      taskId: 'task-1024',
      featureToggles: buildLiveLinearDispatchPilot(),
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    const realFetch = globalThis.fetch;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        return buildLiveLinearGraphqlResponse();
      }
      return realFetch(input, init);
    });

    const initialSnapshot = fixture.runtime.snapshot();
    const initialDispatch = await initialSnapshot.readCompatibilityDispatch();

    expect(initialDispatch.evaluation.summary.reason).not.toBe('dispatch_source_live_deferred');

    await seedManifest(fixture.paths, {
      summary: 'refreshed summary',
      updated_at: '2026-03-07T00:20:00.000Z'
    });

    const result = await fixture.runtime.requestRefresh({ action: 'refresh' });
    const refreshedSnapshot = fixture.runtime.snapshot();
    const refreshedSelectedRun = await refreshedSnapshot.readSelectedRunReadModel();
    const refreshedState = await refreshedSnapshot.readCompatibilityState();

    expect(result.kind).toBe('accepted');
    expect(refreshedSelectedRun.selected?.summary).toBe('refreshed summary');
    expect(refreshedSelectedRun.dispatch_pilot).toEqual(refreshedState.dispatch_pilot);
    expect(refreshedSelectedRun.dispatch_pilot?.reason).toBe('dispatch_source_live_deferred');
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

  it('keeps shared selected-run snapshot fields aligned across state issue and ui payloads', async () => {
    const fixture = await createFixture({
      taskId: 'task-1025',
      linearAdvisoryState: { tracked_issue: buildTrackedIssue() },
      questions: [
        {
          question_id: 'q-1025',
          parent_run_id: 'run-parent',
          from_run_id: 'run-child',
          prompt: 'Need operator approval for dispatch routing',
          urgency: 'high',
          status: 'queued',
          queued_at: '2026-03-07T00:05:00.000Z',
          expires_at: null,
          expires_in_ms: null,
          auto_pause: true,
          expiry_fallback: null
        }
      ]
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    const snapshot = fixture.runtime.snapshot();
    const statePayload = await snapshot.readCompatibilityState();
    const selectedRunPayload = await snapshot.readSelectedRunReadModel();
    const issueResult = await snapshot.readCompatibilityIssue('task-1025');
    const uiPayload = (await snapshot.readUiDataset()) as {
      selected?: {
        raw_status?: string;
        display_status?: string;
        status_reason?: string | null;
        question_summary?: unknown;
        tracked?: unknown;
      } | null;
      tasks?: Array<{
        raw_status?: string;
        display_status?: string;
        status_reason?: string | null;
        question_summary?: unknown;
        tracked?: unknown;
      }>;
      runs?: Array<{
        raw_status?: string;
        display_status?: string;
        status_reason?: string | null;
        question_summary?: unknown;
        tracked?: unknown;
      }>;
    };

    expect(issueResult.kind).toBe('ok');
    if (issueResult.kind !== 'ok') {
      throw new Error('expected issue payload');
    }

    const stateSelected = statePayload.selected;
    const issuePayload = issueResult.payload;
    const runtimeSelected = selectedRunPayload.selected;
    const uiSelected = uiPayload.selected;
    const uiTask = uiPayload.tasks?.[0];
    const uiRun = uiPayload.runs?.[0];

    expect(stateSelected?.raw_status).toBe('in_progress');
    expect(stateSelected?.display_status).toBe('paused');
    expect(stateSelected?.status_reason).toBe('queued_questions');
    expect(runtimeSelected).toEqual(stateSelected);
    expect(selectedRunPayload.dispatch_pilot).toEqual(statePayload.dispatch_pilot);
    expect(selectedRunPayload.tracked).toEqual(statePayload.tracked);
    expect(issuePayload.display_status).toBe(stateSelected?.display_status);
    expect(issuePayload.status_reason).toBe(stateSelected?.status_reason);
    expect(issuePayload.question_summary).toEqual(stateSelected?.question_summary);
    expect(issuePayload.tracked).toEqual(stateSelected?.tracked ?? {});
    expect(uiSelected?.raw_status).toBe(stateSelected?.raw_status);
    expect(uiSelected?.display_status).toBe(stateSelected?.display_status);
    expect(uiSelected?.status_reason).toBe(stateSelected?.status_reason);
    expect(uiSelected?.question_summary).toEqual(stateSelected?.question_summary);
    expect(uiSelected?.tracked).toEqual(stateSelected?.tracked);
    expect(uiTask?.raw_status).toBe(stateSelected?.raw_status);
    expect(uiTask?.display_status).toBe(stateSelected?.display_status);
    expect(uiTask?.status_reason).toBe(stateSelected?.status_reason);
    expect(uiTask?.question_summary).toEqual(stateSelected?.question_summary);
    expect(uiTask?.tracked).toEqual(stateSelected?.tracked);
    expect(uiRun?.raw_status).toBe(stateSelected?.raw_status);
    expect(uiRun?.display_status).toBe(stateSelected?.display_status);
    expect(uiRun?.status_reason).toBe(stateSelected?.status_reason);
    expect(uiRun?.question_summary).toEqual(stateSelected?.question_summary);
    expect(uiRun?.tracked).toEqual(stateSelected?.tracked);
    expect(statePayload.running[0]?.display_state).toBe('paused');
    expect(statePayload.running[0]?.status_reason).toBe('queued_questions');
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
