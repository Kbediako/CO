import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

const { readdirSpy } = vi.hoisted(() => ({
  readdirSpy: vi.fn<typeof import('node:fs/promises').readdir>()
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  readdirSpy.mockImplementation(actual.readdir);
  return {
    ...actual,
    readdir: readdirSpy
  };
});

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  const actualFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  readdirSpy.mockImplementation(actualFs.readdir);
  readdirSpy.mockClear();
  const { rm } = await import('node:fs/promises');
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function flushAsyncWork(turns = 8): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
}

async function waitForCondition(
  predicate: () => boolean,
  turns = 256
): Promise<void> {
  for (let index = 0; index < turns; index += 1) {
    if (predicate()) {
      return;
    }
    await vi.advanceTimersByTimeAsync(0);
    await flushAsyncWork();
  }
  throw new Error(`Condition not met after ${turns} timer turns.`);
}

async function createHostPaths() {
  const { mkdtemp, mkdir } = await import('node:fs/promises');
  const { resolveRunPaths } = await import('../src/cli/run/runPaths.js');

  const root = await mkdtemp(join(tmpdir(), 'provider-issue-handoff-cache-'));
  cleanupRoots.push(root);
  const env = {
    repoRoot: root,
    runsRoot: join(root, '.runs'),
    outRoot: join(root, 'out'),
    taskId: 'local-mcp'
  };
  const paths = Object.assign(resolveRunPaths(env, 'control-host'), { repoRoot: root });
  await mkdir(paths.runDir, { recursive: true });
  return { root, paths };
}

function createProviderIntakeState() {
  return {
    schema_version: 1,
    updated_at: new Date(0).toISOString(),
    rehydrated_at: null,
    latest_provider_key: null,
    latest_reason: null,
    claims: []
  };
}

function createTrackedIssue() {
  return {
    provider: 'linear' as const,
    id: 'lin-issue-1',
    identifier: 'CO-125',
    title: 'Enforce provider max concurrency',
    url: null,
    state: 'In Progress',
    state_type: 'started',
    viewer_id: 'viewer-1',
    assignee_id: 'viewer-1',
    assignee_name: 'Codex',
    workspace_id: 'workspace-1',
    team_id: 'team-1',
    team_key: 'CO',
    team_name: 'CO',
    project_id: 'project-1',
    project_name: 'Coordinator',
    priority: 2,
    created_at: '2026-03-18T04:00:00.000Z',
    updated_at: '2026-03-19T04:30:00.000Z',
    blocked_by: [],
    recent_activity: []
  };
}

describe('createProviderIssueHandoffService admission cache', () => {
  it('reuses one run-tree discovery snapshot for direct webhook admission and capacity gating', async () => {
    const { createProviderIssueHandoffService } = await import(
      '../src/cli/control/providerIssueHandoff.js'
    );
    const { root, paths } = await createHostPaths();
    const runsRoot = join(root, '.runs');
    const launcher = {
      start: vi.fn(async () => null),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state: createProviderIntakeState(),
      persist: vi.fn(async () => undefined),
      launcher
    });

    await service.handleAcceptedTrackedIssue({
      trackedIssue: createTrackedIssue(),
      deliveryId: 'delivery-cache-check',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_200_000
    });

    expect(launcher.start).toHaveBeenCalledTimes(1);
    expect(
      readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
    ).toBe(1);
  });

  it('starts deferred best-effort rehydrate retries with a fresh run-tree discovery snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-19T04:30:00.000Z'));

    const { mkdir, writeFile } = await import('node:fs/promises');
    const { createProviderIssueHandoffService } = await import(
      '../src/cli/control/providerIssueHandoff.js'
    );
    const { resolveRunPaths } = await import('../src/cli/run/runPaths.js');
    const { root, paths } = await createHostPaths();
    const runsRoot = join(root, '.runs');
    const state = createProviderIntakeState();
    state.claims.push({
      provider: 'linear',
      provider_key: 'linear:lin-issue-1',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-125',
      issue_title: 'Enforce provider max concurrency',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-03-19T04:30:00.000Z',
      task_id: 'linear-lin-issue-1',
      mapping_source: 'provider_id_fallback',
      state: 'starting',
      reason: 'provider_issue_start_launched',
      accepted_at: '2026-03-19T04:30:00.000Z',
      updated_at: '2026-03-19T04:30:00.000Z',
      last_delivery_id: 'delivery-cache-refresh',
      last_event: 'Issue',
      last_action: 'update',
      last_webhook_timestamp: 1_742_360_200_000,
      run_id: null,
      run_manifest_path: null
    });

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist: vi.fn(async () => undefined),
      launcher: {
        start: vi.fn(async () => null),
        resume: vi.fn(async () => undefined)
      },
      startPipelineId: 'diagnostics'
    });

    await service.refresh();
    expect(
      readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
    ).toBe(1);

    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-active');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-active',
        task_id: 'linear-lin-issue-1',
        pipeline_id: 'diagnostics',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-125',
        updated_at: '2026-03-19T04:30:30.000Z'
      }),
      'utf8'
    );

    await vi.advanceTimersByTimeAsync(1_001);
    await waitForCondition(
      () => state.claims[0]?.reason === 'provider_issue_rehydrated_active_run'
    );

    expect(state.claims[0]).toMatchObject({
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      task_id: 'linear-lin-issue-1',
      run_id: 'run-active',
      run_manifest_path: childPaths.manifestPath
    });
    expect(
      readdirSpy.mock.calls.filter(([path]) => path === runsRoot).length
    ).toBeGreaterThanOrEqual(2);
  });
});
