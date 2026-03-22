import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createSelectedRunProjectionReader,
  discoverCompatibilityCollectionContexts,
  discoverAuthoritativeRetryCollectionContexts,
  type SelectedRunProjectionContext
} from '../src/cli/control/selectedRunProjection.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import {
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerProof
} from '../src/cli/providerLinearWorkerRunner.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const cleanupRoots: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createHostPaths(
  runsRootFactory: (root: string) => string = (root) => join(root, '.runs'),
  options: { taskId?: string; runId?: string } = {}
) {
  const root = await mkdtemp(join(tmpdir(), 'selected-run-projection-'));
  cleanupRoots.push(root);
  const runsRoot = runsRootFactory(root);
  const taskId = options.taskId ?? 'local-mcp';
  const runId = options.runId ?? 'control-host';
  const env = {
    repoRoot: root,
    runsRoot,
    outRoot: join(root, 'out'),
    taskId
  };
  const paths = resolveRunPaths(env, runId);
  await mkdir(paths.runDir, { recursive: true });
  await writeFile(
    paths.manifestPath,
    JSON.stringify({
      run_id: runId,
      task_id: taskId,
      status: 'in_progress',
      workspace_path: root
    }),
    'utf8'
  );
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

function createProjectionReader(
  paths: Awaited<ReturnType<typeof createHostPaths>>['paths'],
  manifestPath: string,
  providerIntakeState: ProviderIntakeState = createProviderIntakeState(manifestPath)
) {
  return createSelectedRunProjectionReader(
    createProjectionContext(paths, providerIntakeState)
  );
}

function createProjectionContext(
  paths: Awaited<ReturnType<typeof createHostPaths>>['paths'],
  providerIntakeState?: ProviderIntakeState
): SelectedRunProjectionContext {
  return {
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
    providerIntakeState
  };
}

function buildProviderLinearWorkerProof(
  overrides: Partial<ProviderLinearWorkerProof> = {}
): ProviderLinearWorkerProof {
  return {
    issue_id: 'lin-issue-1',
    issue_identifier: 'CO-2',
    thread_id: 'thread-1',
    latest_turn_id: 'turn-2',
    latest_session_id: 'thread-1-turn-2',
    latest_session_id_source: 'derived_from_thread_and_turn',
    turn_count: 2,
    last_event: 'task_complete',
    last_message: 'done',
    last_event_at: '2026-03-20T01:15:28.970Z',
    tokens: {
      input_tokens: 12,
      output_tokens: 8,
      total_tokens: 20
    },
    rate_limits: null,
    owner_phase: 'ended',
    owner_status: 'succeeded',
    workspace_path: '/tmp/workspace',
    end_reason: 'issue_inactive',
    updated_at: '2026-03-20T01:15:28.970Z',
    ...overrides
  };
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

  it('projects the control-host workspace for child CLI manifests under repo-local overridden runs roots', async () => {
    const { root, paths } = await createHostPaths((repoRoot) => join(repoRoot, 'custom-runs'));
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, 'custom-runs'),
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
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      summary: 'provider run active',
      workspacePath: root
    });
  });

  it('projects the control-host workspace for child CLI manifests under external overridden runs roots', async () => {
    const externalRunsRoot = await mkdtemp(join(tmpdir(), 'selected-run-projection-runs-'));
    cleanupRoots.push(externalRunsRoot);
    const { root, paths } = await createHostPaths(() => externalRunsRoot);
    const childEnv = {
      repoRoot: root,
      runsRoot: externalRunsRoot,
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
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      summary: 'provider run active',
      workspacePath: root
    });
  });

  it('returns a null workspace path instead of the manifest artefact directory for non-run manifests', async () => {
    const { root, paths } = await createHostPaths();
    const externalRunRoot = join(root, 'external-provider-run');
    await mkdir(externalRunRoot, { recursive: true });
    const externalManifestPath = join(externalRunRoot, 'manifest.json');
    await writeFile(
      externalManifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, externalManifestPath).buildSelectedRunContext();

    expect(selected?.workspacePath).toBeNull();
  });

  it('falls back to the control-host manifest when a preferred provider manifest path is missing', async () => {
    const { root, paths } = await createHostPaths();
    const missingManifestPath = join(root, '.runs', 'linear-lin-issue-1', 'cli', 'missing-run', 'manifest.json');
    const providerIntakeState = createProviderIntakeState(missingManifestPath);

    const selected = await createProjectionReader(
      paths,
      paths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'local-mcp',
      runId: 'control-host',
      workspacePath: root
    });
  });

  it('projects the preferred provider child for task-scoped control hosts', async () => {
    const { root, paths } = await createHostPaths(undefined, { taskId: 'provider-host-task' });
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
        provider_control_host_task_id: 'provider-host-task',
        provider_control_host_run_id: 'control-host',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      workspacePath: root
    });
  });

  it('projects the preferred provider child for custom control-host task and run ids', async () => {
    const { root, paths } = await createHostPaths(undefined, {
      taskId: 'provider-host-task',
      runId: 'provider-host-run'
    });
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
        provider_control_host_task_id: 'provider-host-task',
        provider_control_host_run_id: 'provider-host-run',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      workspacePath: root
    });
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

  it('reads provider-linear-worker-proof.json from the selected run dir', async () => {
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
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );
    const proof = buildProviderLinearWorkerProof({
      workspace_path: join(root, '.workspaces', 'linear-lin-issue-1')
    });
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(proof),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.runId).toBe('run-child');
    expect(selected?.providerLinearWorkerProof).toEqual(proof);
  });

  it('prefers queued retry claim status text over a retained prior manifest summary', async () => {
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
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'previous run failed and is awaiting rerun',
        commands: []
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
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
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: 'run-child',
          run_manifest_path: childPaths.manifestPath,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retryable failure pending rerun'
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      rawStatus: 'resumable',
      displayStatus: 'retrying',
      summary: 'provider_issue_rehydrated_resumable_run',
      lastError: 'retryable failure pending rerun',
      workspacePath: join(root, '.workspaces', 'linear-lin-issue-1')
    });
    expect(retrying[0]?.latestEvent).toMatchObject({
      at: '2026-03-20T01:16:00.000Z',
      event: 'resumable',
      message: 'provider_issue_rehydrated_resumable_run',
      reason: 'provider_issue_rehydrated_resumable_run'
    });
  });

  it('discovers manifest-only retrying contexts when provider intake state is absent', async () => {
    const { root, paths } = await createHostPaths();
    const retryEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const retryPaths = resolveRunPaths(retryEnv, 'run-child');
    await mkdir(retryPaths.runDir, { recursive: true });
    await writeFile(
      retryPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retryable failure pending rerun',
        commands: []
      }),
      'utf8'
    );

    const discovery = await discoverCompatibilityCollectionContexts(createProjectionContext(paths));

    expect(discovery.running).toEqual([]);
    expect(discovery.retrying).toHaveLength(1);
    expect(discovery.retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      runId: 'run-child',
      rawStatus: 'failed',
      displayStatus: 'failed',
      summary: 'retryable failure pending rerun'
    });
  });

  it('discovers authoritative retry contexts even when the queued retry has no recorded attempt yet', async () => {
    const { paths } = await createHostPaths();
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
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
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: null,
          run_manifest_path: null,
          retry_queued: true,
          retry_attempt: null,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: null
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      displayStatus: 'retrying',
      rawStatus: 'resumable',
      summary: 'provider_issue_rehydrated_resumable_run',
      providerRetryState: {
        active: true,
        attempt: null,
        due_at: '2026-03-20T01:17:00.000Z',
        error: null
      }
    });
  });

  it('synthesizes the deterministic provider workspace for retry-only claims without a manifest snapshot', async () => {
    const { root, paths } = await createHostPaths();
    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
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
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: null,
          run_manifest_path: null,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retryable failure pending rerun'
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      compatibilityState: 'In Progress',
      workspacePath: join(root, '.workspaces', 'linear-lin-issue-1')
    });
  });

  it('prefers the deterministic provider workspace when an older retry manifest only points at the control workspace', async () => {
    const { root, paths } = await createHostPaths();
    const retryEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const retryPaths = resolveRunPaths(retryEnv, 'run-child');
    await mkdir(retryPaths.runDir, { recursive: true });
    await writeFile(
      retryPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'failed',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retryable failure pending rerun',
        commands: []
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
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
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:10:13.574Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: 'run-child',
          run_manifest_path: retryPaths.manifestPath,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retryable failure pending rerun'
        }
      ]
    };

    const retrying = await discoverAuthoritativeRetryCollectionContexts(
      createProjectionContext(paths, providerIntakeState)
    );

    expect(retrying).toHaveLength(1);
    expect(retrying[0]).toMatchObject({
      issueIdentifier: 'CO-2',
      workspacePath: join(root, '.workspaces', 'linear-lin-issue-1')
    });
  });

  it('keeps a task-local selected run on its own manifest when a sibling retry claim retains a prior manifest', async () => {
    const { root } = await createHostPaths((currentRoot) => join(currentRoot, '.runs'));
    const currentEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-current'
    };
    const currentPaths = resolveRunPaths(currentEnv, 'run-current');
    await mkdir(currentPaths.runDir, { recursive: true });
    await writeFile(
      currentPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-current',
        task_id: 'task-current',
        issue_provider: 'linear',
        issue_id: 'issue-current',
        issue_identifier: 'ISSUE-CURRENT',
        status: 'in_progress',
        updated_at: '2026-03-20T01:14:00.000Z',
        summary: 'current task remains selected',
        commands: []
      }),
      'utf8'
    );

    const retryEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'task-retry'
    };
    const retryPaths = resolveRunPaths(retryEnv, 'run-retry');
    await mkdir(retryPaths.runDir, { recursive: true });
    await writeFile(
      retryPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-retry',
        task_id: 'task-retry',
        issue_provider: 'linear',
        issue_id: 'issue-retry',
        issue_identifier: 'ISSUE-RETRY',
        status: 'failed',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retry sibling kept prior manifest',
        commands: []
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:issue-retry',
      latest_reason: 'provider_issue_rehydrated_resumable_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:issue-retry',
          issue_id: 'issue-retry',
          issue_identifier: 'ISSUE-RETRY',
          issue_title: 'Retry sibling',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:16:00.000Z',
          task_id: 'task-retry',
          mapping_source: 'provider_id_fallback',
          state: 'resumable',
          reason: 'provider_issue_rehydrated_resumable_run',
          accepted_at: '2026-03-20T01:15:00.000Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          last_delivery_id: 'delivery-retry',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_000_000,
          run_id: 'run-retry',
          run_manifest_path: retryPaths.manifestPath,
          retry_queued: true,
          retry_attempt: 2,
          retry_due_at: '2026-03-20T01:17:00.000Z',
          retry_error: 'retry pending'
        }
      ]
    };

    const selected = await createProjectionReader(
      currentPaths,
      currentPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected).toMatchObject({
      issueIdentifier: 'ISSUE-CURRENT',
      runId: 'run-current',
      summary: 'current task remains selected'
    });
  });
});
