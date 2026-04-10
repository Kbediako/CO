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
  readdirSpy.mockClear();
  const { rm } = await import('node:fs/promises');
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

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
});
