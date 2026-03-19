import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createProviderIssueHandoffService
} from '../src/cli/control/providerIssueHandoff.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';

const cleanupRoots: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createHostPaths() {
  const root = await mkdtemp(join(tmpdir(), 'provider-issue-handoff-'));
  cleanupRoots.push(root);
  const env = {
    repoRoot: root,
    runsRoot: join(root, '.runs'),
    outRoot: join(root, 'out'),
    taskId: 'local-mcp'
  };
  const paths = resolveRunPaths(env, 'control-host');
  await mkdir(paths.runDir, { recursive: true });
  return { root, paths };
}

describe('createProviderIssueHandoffService', () => {
  it('launches a deterministic start for a started Linear issue without an existing run', async () => {
    const { paths } = await createHostPaths();
    const state: ProviderIntakeState = {
      schema_version: 1,
      updated_at: new Date(0).toISOString(),
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => undefined),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher,
      startPipelineId: 'diagnostics'
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: {
        provider: 'linear',
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Autonomous intake handoff',
        url: null,
        state: 'In Progress',
        state_type: 'started',
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        team_key: 'CO',
        team_name: 'CO',
        project_id: 'project-1',
        project_name: 'Coordinator',
        updated_at: '2026-03-19T04:00:00.000Z',
        recent_activity: []
      },
      deliveryId: 'delivery-1',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_360_000_000
    });

    expect(result.kind).toBe('start');
    expect(launcher.start).toHaveBeenCalledWith({
      taskId: 'linear-lin-issue-1',
      pipelineId: 'diagnostics',
      provider: 'linear',
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-2',
      issueUpdatedAt: '2026-03-19T04:00:00.000Z'
    });
    expect(launcher.resume).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      provider_key: 'linear:lin-issue-1',
      state: 'starting',
      task_id: 'linear-lin-issue-1',
      issue_identifier: 'CO-2'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('resumes the latest failed run for the same provider issue', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-1303-child'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'task-1303-child',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-19T04:30:00.000Z'
      }),
      'utf8'
    );

    const state: ProviderIntakeState = {
      schema_version: 1,
      updated_at: new Date(0).toISOString(),
      rehydrated_at: null,
      latest_provider_key: null,
      latest_reason: null,
      claims: []
    };
    const persist = vi.fn(async () => undefined);
    const launcher = {
      start: vi.fn(async () => undefined),
      resume: vi.fn(async () => undefined)
    };

    const service = createProviderIssueHandoffService({
      paths,
      state,
      persist,
      launcher
    });

    const result = await service.handleAcceptedTrackedIssue({
      trackedIssue: {
        provider: 'linear',
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Autonomous intake handoff',
        url: null,
        state: 'In Progress',
        state_type: 'started',
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        team_key: 'CO',
        team_name: 'CO',
        project_id: 'project-1',
        project_name: 'Coordinator',
        updated_at: '2026-03-19T04:31:00.000Z',
        recent_activity: []
      },
      deliveryId: 'delivery-2',
      event: 'Issue',
      action: 'update',
      webhookTimestamp: 1_742_361_000_000
    });

    expect(result.kind).toBe('resume');
    expect(launcher.resume).toHaveBeenCalledWith({
      runId: 'run-child',
      actor: 'control-host',
      reason: 'provider-accepted-issue'
    });
    expect(launcher.start).not.toHaveBeenCalled();
    expect(state.claims[0]).toMatchObject({
      state: 'resuming',
      run_id: 'run-child',
      run_manifest_path: childPaths.manifestPath,
      task_id: 'task-1303-child'
    });
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
