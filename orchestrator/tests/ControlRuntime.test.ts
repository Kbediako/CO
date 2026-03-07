import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { ControlStateStore } from '../src/cli/control/controlState.js';
import { createControlRuntime } from '../src/cli/control/controlRuntime.js';
import * as liveLinearAdvisoryRuntimeModule from '../src/cli/control/liveLinearAdvisoryRuntime.js';
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

    const initialSelectedRun = await initialSnapshot.readSelectedRunSnapshot();
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
    const repeatedSelectedRun = await repeatedSnapshot.readSelectedRunSnapshot();

    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.displayStatus).toBe('in_progress');
    expect(repeatedSelectedRun.selected?.statusReason ?? null).toBeNull();
  });

  it('keeps the selected-run cache independent when compatibility projection is read first', async () => {
    const fixture = await createFixture();
    const snapshot = fixture.runtime.snapshot();

    const initialCompatibility = await snapshot.readCompatibilityProjection();
    await seedManifest(fixture.paths, {
      summary: 'selected summary after compatibility read',
      updated_at: '2026-03-07T00:12:00.000Z'
    });

    const selectedRun = await snapshot.readSelectedRunSnapshot();

    expect(initialCompatibility.selected?.summary).toBe('initial summary');
    expect(selectedRun.selected?.summary).toBe('selected summary after compatibility read');
  });

  it('keeps the compatibility source cache independent when selected-run snapshot is read first', async () => {
    const fixture = await createFixture();
    const snapshot = fixture.runtime.snapshot();

    const initialSelectedRun = await snapshot.readSelectedRunSnapshot();
    await seedManifest(fixture.paths, {
      summary: 'compatibility summary after selected read',
      updated_at: '2026-03-07T00:13:00.000Z'
    });

    const compatibilityProjection = await snapshot.readCompatibilityProjection();

    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(compatibilityProjection.selected?.summary).toBe('compatibility summary after selected read');
  });

  it('reads control and queued-question state independently for the compatibility source', async () => {
    const questions: QuestionRecord[] = [];
    const fixture = await createFixture({ questions });
    const snapshot = fixture.runtime.snapshot();

    const initialSelectedRun = await snapshot.readSelectedRunSnapshot();
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });
    questions.push({
      question_id: 'question-1',
      parent_run_id: 'run-1',
      from_run_id: 'child-run-1',
      from_manifest_path: fixture.paths.manifestPath,
      prompt: 'Need approval',
      urgency: 'high',
      status: 'queued',
      queued_at: '2026-03-07T00:14:00.000Z',
      expires_at: null,
      expires_in_ms: null,
      auto_pause: true,
      expiry_fallback: null
    });

    const compatibilityProjection = await snapshot.readCompatibilityProjection();

    expect(initialSelectedRun.selected?.displayStatus).toBe('in_progress');
    expect(initialSelectedRun.selected?.questionSummary.queuedCount).toBe(0);
    expect(compatibilityProjection.selected?.display_status).toBe('paused');
    expect(compatibilityProjection.selected?.status_reason).toBe('queued_questions');
    expect(compatibilityProjection.selected?.question_summary.queued_count).toBe(1);
    expect(compatibilityProjection.selected?.latest_action).toBe('pause');
  });

  it('invalidates the cached snapshot on publish', async () => {
    const fixture = await createFixture();
    const initialSnapshot = fixture.runtime.snapshot();

    await initialSnapshot.readSelectedRunSnapshot();
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
    const refreshedSelectedRun = await refreshedSnapshot.readSelectedRunSnapshot();

    expect(refreshedSnapshot).not.toBe(initialSnapshot);
    expect(refreshedSelectedRun.selected?.summary).toBe('published summary');
    expect(refreshedSelectedRun.selected?.displayStatus).toBe('paused');
    expect(refreshedSelectedRun.selected?.statusReason).toBe('control_pause');
  });

  it('refreshes the cached runtime after an accepted requestRefresh', async () => {
    const fixture = await createFixture();

    await fixture.runtime.snapshot().readSelectedRunSnapshot();
    await seedManifest(fixture.paths, {
      summary: 'refreshed summary',
      updated_at: '2026-03-07T00:20:00.000Z'
    });
    fixture.controlStore.setLatestAction({
      action: 'pause',
      requestedBy: 'ui',
      reason: 'manual pause'
    });

    await fixture.runtime.requestRefresh();
    const refreshedSelectedRun = await fixture.runtime.snapshot().readSelectedRunSnapshot();

    expect(refreshedSelectedRun.selected?.summary).toBe('refreshed summary');
    expect(refreshedSelectedRun.selected?.displayStatus).toBe('paused');
    expect(refreshedSelectedRun.selected?.statusReason).toBe('control_pause');
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
    const initialDispatch = await initialSnapshot.readDispatchEvaluation();

    expect(initialDispatch.evaluation.summary.reason).not.toBe('dispatch_source_live_deferred');

    await seedManifest(fixture.paths, {
      summary: 'refreshed summary',
      updated_at: '2026-03-07T00:20:00.000Z'
    });

    await fixture.runtime.requestRefresh();
    const refreshedSnapshot = fixture.runtime.snapshot();
    const refreshedSelectedRun = await refreshedSnapshot.readSelectedRunSnapshot();
    const refreshedDispatch = await refreshedSnapshot.readDispatchEvaluation();

    expect(refreshedSelectedRun.selected?.summary).toBe('refreshed summary');
    expect(refreshedSelectedRun.dispatchPilot?.reason).toBe('dispatch_source_live_deferred');
    expect(refreshedDispatch.evaluation.summary.reason).toBe('recommendation_available');
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
    const initialSelectedRun = await initialSnapshot.readSelectedRunSnapshot();
    await seedManifest(paths, {
      summary: 'should stay hidden',
      updated_at: '2026-03-07T00:30:00.000Z'
    });

    await expect(runtime.requestRefresh()).rejects.toThrow(
      'snapshot warmup failed'
    );

    const repeatedSnapshot = runtime.snapshot();
    const repeatedSelectedRun = await repeatedSnapshot.readSelectedRunSnapshot();

    expect(repeatedSnapshot).toBe(initialSnapshot);
    expect(initialSelectedRun.selected?.summary).toBe('initial summary');
    expect(repeatedSelectedRun.selected?.summary).toBe('initial summary');
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
      snapshot.readDispatchEvaluation(),
      snapshot.readDispatchEvaluation()
    ]);

    expect(firstDispatch.evaluation.failure ?? null).toBeNull();
    expect(secondDispatch.evaluation.failure ?? null).toBeNull();
    expect(linearFetchCount).toBe(1);

    fixture.runtime.publish({ source: 'run.updated', eventSeq: 1 });

    const refreshedSnapshot = fixture.runtime.snapshot();
    const [thirdDispatch, fourthDispatch] = await Promise.all([
      refreshedSnapshot.readDispatchEvaluation(),
      refreshedSnapshot.readDispatchEvaluation()
    ]);

    expect(thirdDispatch.evaluation.failure ?? null).toBeNull();
    expect(fourthDispatch.evaluation.failure ?? null).toBeNull();
    expect(linearFetchCount).toBe(2);
  });

  it('retries explicit dispatch reads after a transient live evaluation failure on the same snapshot', async () => {
    let dispatchReadCount = 0;
    vi.spyOn(liveLinearAdvisoryRuntimeModule, 'createLiveLinearAdvisoryRuntime').mockImplementation(
      () =>
        ({
          readSnapshotSummary: () => ({
            advisory_only: true,
            configured: true,
            enabled: true,
            kill_switch: false,
            status: 'ready',
            source_status: 'ready',
            reason: 'dispatch_source_live_deferred',
            source_setup: {
              provider: 'linear',
              workspace_id: 'lin-workspace-1',
              team_id: 'lin-team-live',
              project_id: 'lin-project-1'
            }
          }),
          readDispatchEvaluation: async () => {
            dispatchReadCount += 1;
            if (dispatchReadCount === 1) {
              throw new Error('transient linear failure');
            }
            return {
              summary: {
                advisory_only: true,
                configured: true,
                enabled: true,
                kill_switch: false,
                status: 'ready',
                source_status: 'ready',
                reason: 'recommendation_available',
                source_setup: {
                  provider: 'linear',
                  workspace_id: 'lin-workspace-1',
                  team_id: 'lin-team-live',
                  project_id: 'lin-project-1'
                }
              },
              recommendation: {
                issue_identifier: 'task-1024-retry',
                dispatch_id: 'dispatch-advisory',
                summary: 'route advisory to queue',
                rationale: 'signal threshold met',
                confidence: 0.7,
                generated_at: null,
                source_setup: {
                  provider: 'linear',
                  workspace_id: 'lin-workspace-1',
                  team_id: 'lin-team-live',
                  project_id: 'lin-project-1'
                },
                tracked_issue: null
              },
              failure: null
            };
          },
          invalidate: () => {}
        }) satisfies ReturnType<typeof liveLinearAdvisoryRuntimeModule.createLiveLinearAdvisoryRuntime>
    );

    const fixture = await createFixture({
      taskId: 'task-1024-retry'
    });

    const snapshot = fixture.runtime.snapshot();

    await expect(snapshot.readDispatchEvaluation()).rejects.toThrow('transient linear failure');

    const recoveredDispatch = await snapshot.readDispatchEvaluation();

    expect(recoveredDispatch.evaluation.failure ?? null).toBeNull();
    expect(recoveredDispatch.evaluation.summary.reason).toBe('recommendation_available');
    expect(dispatchReadCount).toBe(2);
  });
});
