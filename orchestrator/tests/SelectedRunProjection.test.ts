import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { createSelectedRunProjectionReader } from '../src/cli/control/selectedRunProjection.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const cleanupRoots: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createHostPaths() {
  const root = await mkdtemp(join(tmpdir(), 'selected-run-projection-'));
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

function createProviderIntakeState(manifestPath: string): ProviderIntakeState {
  return {
    schema_version: 1,
    updated_at: '2026-03-20T01:15:28.970Z',
    rehydrated_at: '2026-03-20T01:15:28.970Z',
    latest_provider_key: 'linear:lin-issue-1',
    latest_reason: 'provider_issue_rehydrated_completed_run',
    claims: [
      {
        provider: 'linear',
        provider_key: 'linear:lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_title: 'Autonomous intake handoff',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:10:13.574Z',
        task_id: 'linear-lin-issue-1',
        mapping_source: 'provider_id_fallback',
        state: 'completed',
        reason: 'provider_issue_rehydrated_completed_run',
        accepted_at: '2026-03-20T01:10:13.574Z',
        updated_at: '2026-03-20T01:15:28.970Z',
        last_delivery_id: 'delivery-1',
        last_event: 'Issue',
        last_action: 'update',
        last_webhook_timestamp: 1_742_360_000_000,
        run_id: 'run-child',
        run_manifest_path: manifestPath
      }
    ]
  };
}

function createProjectionReader(paths: Awaited<ReturnType<typeof createHostPaths>>['paths'], manifestPath: string) {
  return createSelectedRunProjectionReader({
    controlStore: {
      snapshot: () => ({
        run_id: 'control-host',
        control_seq: 0,
        latest_action: null,
        history: [],
        pending_confirmation: null,
        queued_questions: null,
        question_events: [],
        sessions: null,
        transport_idempotency: null,
        provider_traces: null
      })
    },
    questionQueue: {
      list: () => []
    },
    paths,
    linearAdvisoryState: {
      tracked_issue: null
    },
    providerIntakeState: createProviderIntakeState(manifestPath)
  });
}

describe('SelectedRunProjection', () => {
  it('replaces stale stage-failure summary text for succeeded selected runs with no failed commands', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary:
          "Stage 'Run delegation guard' failed with exit code 1.\nStage 'npm run test' failed with exit code 1.",
        commands: [
          { id: 'delegation-guard', status: 'succeeded', summary: 'delegation guard passed' },
          { id: 'test', status: 'succeeded', summary: 'tests passed' }
        ]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      rawStatus: 'succeeded',
      summary: 'Completed successfully',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'succeeded',
      message: 'Completed successfully'
    });
  });

  it('preserves the manifest summary for succeeded runs when it does not look stale', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Pipeline completed with green checks.',
        commands: [{ id: 'test', status: 'succeeded', summary: 'tests passed' }]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      summary: 'Pipeline completed with green checks.',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      message: 'Pipeline completed with green checks.'
    });
  });

  it('preserves legitimate summary lines while removing stale succeeded failure lines', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary:
          "Stage 'Run delegation guard' failed with exit code 1.\nUsing repo-local codex.orchestrator.json.\nStage 'npm run test' failed with exit code 1.",
        commands: [{ id: 'test', status: 'succeeded', summary: 'tests passed' }]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      summary: 'Using repo-local codex.orchestrator.json.',
      lastError: null
    });
    expect(selected?.latestEvent).toMatchObject({
      message: 'Using repo-local codex.orchestrator.json.'
    });
  });

  it('prefers explicit manifest workspace paths over run-directory inference', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: join(root, '.workspaces', 'linear-lin-issue-1'),
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.workspacePath).toBe(join(root, '.workspaces', 'linear-lin-issue-1'));
  });

  it('threads child manifest stage, approval, and title metadata into the selected context', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        pipeline_title: 'Child Pipeline',
        approvals: [{ id: 'approval-1' }, { id: 'approval-2' }],
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: [
          { id: 'build', title: 'Build', status: 'succeeded' },
          { id: 'review', title: 'Review', status: 'in_progress' }
        ]
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      pipelineTitle: 'Child Pipeline',
      approvalsTotal: 2,
      stages: [
        {
          id: 'build',
          title: 'Build',
          status: 'succeeded'
        },
        {
          id: 'review',
          title: 'Review',
          status: 'in_progress'
        }
      ]
    });
  });
});
