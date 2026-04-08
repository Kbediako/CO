import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createSelectedRunProjectionReader,
  discoverCompatibilityCollectionContexts,
  discoverAuthoritativeRetryCollectionContexts,
  type SelectedRunProjectionContext
} from '../src/cli/control/selectedRunProjection.js';
import type { ProviderIntakeState } from '../src/cli/control/providerIntakeState.js';
import {
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerChildStreamRecord,
  type ProviderLinearWorkerChildLaneRecord,
  type ProviderLinearWorkerProof
} from '../src/cli/providerLinearWorkerRunner.js';
import { resolveRunPaths } from '../src/cli/run/runPaths.js';

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
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

  it('surfaces the authoritative provider debug snapshot and semantic latest event for merge closeout lanes', async () => {
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
        summary: 'Merge closeout lane active.'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'turn_completed',
          owner_status: 'in_progress',
          last_event: 'task_complete',
          last_message: 'Merge closeout lane active.',
          last_event_at: '2026-03-20T01:15:28.970Z',
          linear_audit: {
            path: join(childPaths.runDir, 'provider-linear-worker-linear-audit.jsonl'),
            attempted_count: 1,
            success_count: 1,
            failure_count: 0,
            latest_recorded_at: '2026-03-20T01:16:10.000Z',
            parallelization_entries: [],
            latest_by_operation: {
              transition: {
                recorded_at: '2026-03-20T01:16:10.000Z',
                operation: 'transition',
                ok: true,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: 'updated',
                via: null,
                state: 'Merging',
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: null,
                error_message: null
              }
            }
          }
        }),
        null,
        2
      ),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Merging',
      reason: 'provider_issue_rehydrated_active_run',
      state: 'running',
      merge_closeout: {
        recorded_at: '2026-03-20T01:16:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:16:20.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 2,
          checks_failed: 0,
          required_checks_pending: 2,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:16:20.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'rehydrated',
        is_rehydrated: true
      },
      pull_request: {
        number: 82
      },
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'waiting',
        recovery_recommendation: 'wait_for_checks'
      },
      stall_classification: 'waiting_on_checks'
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'waiting_on_checks',
      message: 'Waiting for required checks before merge.',
      at: '2026-03-20T01:16:20.000Z'
    });
  });

  it('uses the displayed child summary timestamp for latestEvent when newer child activity has no summary', async () => {
    const { root, paths } = await createHostPaths();
    const baseTimestampMs = Date.parse('2026-03-30T01:15:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(new Date(baseTimestampMs));
    const attemptStartedAt = new Date(baseTimestampMs - 5 * 60 * 1000).toISOString();
    const childStreamLaunchedAt = new Date(baseTimestampMs - 4 * 60 * 1000).toISOString();
    const childStreamRecordedAt = new Date(baseTimestampMs - 3.5 * 60 * 1000).toISOString();
    const childLaneLaunchAt = new Date(baseTimestampMs - 3 * 60 * 1000).toISOString();
    const childLaneDecisionAt = new Date(baseTimestampMs - 2 * 60 * 1000).toISOString();
    const updatedAt = new Date(baseTimestampMs - 60 * 1000).toISOString();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-child-summary-fallback');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child-summary-fallback',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: updatedAt,
        summary: 'provider run active'
      }),
      'utf8'
    );
    const childStreams: ProviderLinearWorkerChildStreamRecord[] = [
      {
        stream: 'co-109-docs-review',
        pipeline_id: 'docs-review',
        task_id: 'linear-co-109-docs-review',
        run_id: 'run-child-stream-109',
        status: 'failed',
        manifest_path: join(childPaths.runDir, 'docs-review-manifest.json'),
        artifact_root: join(childPaths.runDir, 'docs-review-artifacts'),
        log_path: null,
        summary: 'docs-review failed at docs:freshness after spec-guard passed',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: null,
        source_setup: null,
        launched_at: childStreamLaunchedAt,
        recorded_at: childStreamRecordedAt
      }
    ];
    const childLanes: ProviderLinearWorkerChildLaneRecord[] = [
      {
        stream: 'event-truth',
        pipeline_id: 'implementation-gate',
        task_id: 'linear-co-109-event-truth',
        run_id: 'run-child-lane-109',
        status: 'completed',
        manifest_path: join(childPaths.runDir, 'event-truth-manifest.json'),
        artifact_root: join(childPaths.runDir, 'event-truth-artifacts'),
        log_path: null,
        summary: null,
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        workspace_path: null,
        source_setup: null,
        launched_at: childLaneLaunchAt,
        purpose: 'Tighten authoritative EVENT truth.',
        instructions: null,
        scope: {
          files: ['orchestrator/src/cli/control/providerIssueObservability.ts'],
          phases: ['implementation']
        },
        parent_snapshot: {
          base_sha: null,
          issue_updated_at: attemptStartedAt,
          issue_state: 'In Progress',
          issue_state_type: 'started',
          captured_at: childLaneLaunchAt
        },
        lane_workspace_path: null,
        patch_artifact_path: null,
        decision: 'accepted',
        in_flight_action: null,
        decision_at: childLaneDecisionAt,
        decision_reason: null
      }
    ];
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: attemptStartedAt,
          current_turn_started_at: attemptStartedAt,
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_message: 'Provider worker turn is active.',
          last_event_at: attemptStartedAt,
          rate_limits: {
            primary: {
              used_percent: 18,
              window_minutes: 300
            },
            secondary: {
              used_percent: 52,
              window_minutes: 10080
            }
          },
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: updatedAt,
          child_streams: childStreams,
          child_lanes: childLanes
        }),
        null,
        2
      ),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'running',
      reason: 'provider_issue_active_run',
      updated_at: updatedAt,
      run_id: 'run-child-summary-fallback'
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      progress: {
        phase: 'turn_running',
        kind: 'worker',
        status: 'progressing',
        summary: 'docs-review failed at docs:freshness after spec-guard passed',
        summary_recorded_at: childStreamRecordedAt,
        last_semantic_progress_at: childLaneDecisionAt
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'turn_running',
      message: 'docs-review failed at docs:freshness after spec-guard passed',
      at: childStreamRecordedAt
    });
  });

  it('surfaces pending shared-root reconciliation instead of terminal success after merge closeout', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-shared-root-pending');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-shared-root-pending',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-04-05T06:50:15.000Z',
        summary: 'Completed successfully'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'succeeded',
          last_event: 'task_complete',
          last_message: 'Worker exited after merge closeout.',
          last_event_at: '2026-04-05T06:50:10.000Z',
          updated_at: '2026-04-05T06:50:15.000Z',
          end_reason: 'issue_inactive'
        }),
        null,
        2
      ),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Done',
      issue_state_type: 'completed',
      state: 'handoff_failed',
      reason: 'provider_issue_merge_closeout_action_required',
      merge_closeout: {
        recorded_at: '2026-04-05T06:50:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary: 'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-05T06:50:30.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_dirty',
          before_status: '## main...origin/main\\n M tasks/index.json',
          after_status: '## main...origin/main\\n M tasks/index.json'
        },
        linear_transition: null
      }
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.displayStatus).toBe('pending_shared_root_reconciliation');
    expect(selected?.rawStatus).toBe('succeeded');
    expect(selected?.statusReason).toBe('shared_root_dirty');
    expect(selected?.summary).toBe(
      'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.'
    );
    expect(selected?.providerDebugSnapshot).toMatchObject({
      progress: {
        phase: 'pending_shared_root_reconciliation',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_reason: 'shared_root_dirty'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'pending_shared_root_reconciliation',
      message:
        'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
      reason: 'shared_root_dirty'
    });
  });

  it('keeps failed shared-root reconciliation visible as lastError after merge closeout', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-shared-root-failed');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-shared-root-failed',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-04-05T06:50:15.000Z',
        summary: 'Completed successfully'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'succeeded',
          last_event: 'task_complete',
          last_message: 'Worker exited after merge closeout.',
          last_event_at: '2026-04-05T06:50:10.000Z',
          updated_at: '2026-04-05T06:50:15.000Z',
          end_reason: 'issue_inactive'
        }),
        null,
        2
      ),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Done',
      issue_state_type: 'completed',
      state: 'completed',
      reason: 'provider_issue_merge_closeout_merged',
      merge_closeout: {
        recorded_at: '2026-04-05T06:50:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Done',
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        status: 'merged',
        reason: 'shared_root_reconciliation_failed',
        summary: 'Merged attached PR #82; shared-root reconciliation failed (shared_root_fast_forward_failed) after the Linear issue transitioned to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-05T06:50:30.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: {
          status: 'failed',
          reason: 'shared_root_fast_forward_failed',
          before_status: '## main...origin/main [behind 1]',
          after_status: null
        },
        linear_transition: {
          status: 'transitioned',
          attempted_at: '2026-04-05T06:50:20.000Z',
          previous_state: 'Merging',
          target_state: 'Done',
          issue_state: 'Done',
          issue_state_type: 'completed',
          issue_updated_at: '2026-04-05T06:50:30.000Z',
          error: null
        }
      }
    };

    const selected = await createProjectionReader(
      paths,
      childPaths.manifestPath,
      providerIntakeState
    ).buildSelectedRunContext();

    expect(selected?.displayStatus).toBe('failed');
    expect(selected?.rawStatus).toBe('succeeded');
    expect(selected?.statusReason).toBe('shared_root_fast_forward_failed');
    expect(selected?.summary).toBe(
      'Merged attached PR #82; shared-root reconciliation failed (shared_root_fast_forward_failed) after the Linear issue transitioned to Done.'
    );
    expect(selected?.lastError).toBe('shared_root_fast_forward_failed');
    expect(selected?.latestEvent).toMatchObject({
      event: 'failed',
      reason: 'shared_root_fast_forward_failed'
    });
  });

  it('ignores stale terminal proof snapshots when the selected stage started later', async () => {
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
        started_at: '2026-03-20T01:20:00.000Z',
        updated_at: '2026-03-20T01:20:05.000Z',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:00.000Z',
          owner_phase: 'ended',
          owner_status: 'succeeded',
          last_event: 'task_complete',
          last_message: 'Old worker run completed.',
          last_event_at: '2026-03-20T01:15:28.970Z',
          updated_at: '2026-03-20T01:16:00.000Z',
          end_reason: 'issue_inactive'
        }),
        null,
        2
      ),
      'utf8'
    );

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(paths, undefined)
    ).buildSelectedRunContext();

    expect(selected?.rawStatus).toBe('in_progress');
    expect(selected?.completedAt).toBeNull();
    expect(selected?.providerDebugSnapshot).toBeNull();
  });

  it('keeps the generic latest event when no provider claim or proof exists', async () => {
    const { paths } = await createHostPaths();
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );

    const projectionContext = createProjectionContext(paths, undefined);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot?.progress).toMatchObject({
      phase: 'unknown',
      kind: 'workflow',
      status: 'progressing'
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Tracked issue is active.'
    });
  });

  it('keeps the generic latest event when provider evidence is only a stale claim', async () => {
    const { paths } = await createHostPaths();
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'stale',
      reason: 'provider_issue_stale',
      updated_at: '2026-03-20T01:14:28.970Z'
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'stale'
      },
      progress: {
        phase: 'unknown',
        kind: 'workflow',
        status: 'progressing'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Tracked issue is active.'
    });
  });

  it('keeps the generic latest event when stale claim merge-closeout data is the only provider evidence', async () => {
    const { paths } = await createHostPaths();
    await writeFile(
      paths.manifestPath,
      JSON.stringify({
        run_id: 'control-host',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Tracked issue is active.'
      }),
      'utf8'
    );
    const providerIntakeState = createProviderIntakeState(paths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      state: 'stale',
      reason: 'provider_issue_stale',
      updated_at: '2026-03-20T01:14:28.970Z',
      issue_state: 'Merging',
      issue_state_type: 'started',
      merge_closeout: {
        recorded_at: '2026-03-20T01:16:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:16:20.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 2,
          checks_failed: 0,
          required_checks_pending: 2,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:16:20.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Tracked issue is active.',
        state: 'In Progress',
        state_type: 'started',
        updated_at: '2026-03-20T01:15:28.970Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'stale'
      },
      pull_request: {
        number: 82
      },
      progress: {
        phase: 'waiting_on_checks',
        kind: 'merge_closeout',
        status: 'waiting'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Tracked issue is active.'
    });
  });

  it('keeps stale pending shared-root reconciliation visible until the live issue reaches a terminal state', async () => {
    const { root, paths } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const childPaths = resolveRunPaths(childEnv, 'run-stale-shared-root-pending');
    await mkdir(childPaths.runDir, { recursive: true });
    await writeFile(
      childPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-stale-shared-root-pending',
        task_id: 'linear-lin-issue-1',
        status: 'succeeded',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-04-05T06:50:15.000Z',
        summary: 'Completed successfully'
      }),
      'utf8'
    );

    const providerIntakeState = createProviderIntakeState(childPaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-05T06:50:30.000Z',
      state: 'stale',
      reason: 'provider_issue_stale',
      merge_closeout: {
        recorded_at: '2026-04-05T06:50:30.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-04-05T06:50:30.000Z',
        status: 'action_required',
        reason: 'pending_shared_root_reconciliation',
        summary: 'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'MERGED',
          review_decision: 'APPROVED',
          merge_state_status: 'UNKNOWN',
          ready_to_merge: false,
          gate_reasons: ['state=MERGED'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 0,
          checks_failed: 0,
          required_checks_pending: 0,
          required_checks_failed: 0,
          updated_at: '2026-04-05T06:50:30.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: {
          status: 'skipped',
          reason: 'shared_root_dirty',
          before_status: '## main...origin/main\\n M tasks/index.json',
          after_status: '## main...origin/main\\n M tasks/index.json'
        },
        linear_transition: null
      }
    };

    const projectionContext = createProjectionContext(paths, providerIntakeState);
    projectionContext.linearAdvisoryState = {
      tracked_issue: {
        id: 'lin-issue-1',
        identifier: 'CO-2',
        title: 'Shared-root reconciliation is still pending.',
        state: 'Merging',
        state_type: 'started',
        updated_at: '2026-04-05T06:51:00.000Z'
      } as never
    };

    const selected = await createSelectedRunProjectionReader(projectionContext).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        freshness: 'stale'
      },
      progress: {
        phase: 'pending_shared_root_reconciliation',
        kind: 'merge_closeout',
        status: 'stalled',
        stall_reason: 'shared_root_dirty'
      }
    });
    expect(selected?.rawStatus).toBe('succeeded');
    expect(selected?.displayStatus).toBe('pending_shared_root_reconciliation');
    expect(selected?.statusReason).toBe('shared_root_dirty');
    expect(selected?.latestEvent).toMatchObject({
      event: 'pending_shared_root_reconciliation',
      message:
        'Merged attached PR #82; shared-root reconciliation is pending (shared_root_dirty) before the Linear issue can transition to Done.',
      reason: 'shared_root_dirty'
    });
  });

  it('does not borrow provider claims from same-issue sibling runs', async () => {
    const { root } = await createHostPaths();
    const childEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const selectedPaths = resolveRunPaths(childEnv, 'run-selected');
    await mkdir(selectedPaths.runDir, { recursive: true });
    await writeFile(
      selectedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-selected',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Selected sibling run is active.'
      }),
      'utf8'
    );
    const activePaths = resolveRunPaths(childEnv, 'run-active');
    const providerIntakeState = createProviderIntakeState(activePaths.manifestPath);
    providerIntakeState.claims[0] = {
      ...providerIntakeState.claims[0]!,
      run_id: 'run-active',
      run_manifest_path: activePaths.manifestPath,
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      issue_state: 'Merging',
      issue_state_type: 'started',
      merge_closeout: {
        recorded_at: '2026-03-20T01:16:20.000Z',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        issue_state: 'Merging',
        issue_state_type: 'started',
        issue_updated_at: '2026-03-20T01:16:20.000Z',
        status: 'watching',
        reason: 'checks_pending',
        summary: 'Waiting for required checks before merge.',
        attached_pr_urls: ['https://github.com/asabeko/CO/pull/82'],
        pr: {
          url: 'https://github.com/asabeko/CO/pull/82',
          owner: 'asabeko',
          repo: 'CO',
          number: 82
        },
        snapshot: {
          state: 'OPEN',
          review_decision: 'APPROVED',
          merge_state_status: 'BLOCKED',
          ready_to_merge: false,
          gate_reasons: ['required_checks_pending'],
          action_required_reasons: [],
          unresolved_thread_count: 0,
          checks_pending: 2,
          checks_failed: 0,
          required_checks_pending: 2,
          required_checks_failed: 0,
          updated_at: '2026-03-20T01:16:20.000Z',
          merged_at: null,
          head_oid: 'head-oid-82'
        },
        merge_attempt: null,
        shared_root: null,
        linear_transition: null
      }
    };

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(selectedPaths, providerIntakeState)
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toBeNull();
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Selected sibling run is active.'
    });
  });

  it('prefers the selected issue claim over a different-task claim with the same run id', async () => {
    const { root } = await createHostPaths();
    const selectedEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const selectedPaths = resolveRunPaths(selectedEnv, 'run-child');
    await mkdir(selectedPaths.runDir, { recursive: true });
    await writeFile(
      selectedPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-child',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Selected run stays scoped to its own issue.'
      }),
      'utf8'
    );

    const providerIntakeState: ProviderIntakeState = {
      schema_version: 1,
      updated_at: '2026-03-20T01:16:00.000Z',
      rehydrated_at: '2026-03-20T01:16:00.000Z',
      latest_provider_key: 'linear:lin-issue-1',
      latest_reason: 'provider_issue_rehydrated_active_run',
      claims: [
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-99',
          issue_id: 'lin-issue-99',
          issue_identifier: 'CO-99',
          issue_title: 'Different task with colliding run id',
          issue_state: 'Merging',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:16:10.000Z',
          task_id: 'linear-lin-issue-99',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T01:12:00.000Z',
          updated_at: '2026-03-20T01:16:10.000Z',
          last_delivery_id: 'delivery-99',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_010_000,
          run_id: 'run-child',
          run_manifest_path: join(root, '.runs', 'linear-lin-issue-99', 'cli', 'run-child', 'manifest.json')
        },
        {
          provider: 'linear',
          provider_key: 'linear:lin-issue-1',
          issue_id: 'lin-issue-1',
          issue_identifier: 'CO-2',
          issue_title: 'Selected run issue',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-20T01:16:20.000Z',
          task_id: 'linear-lin-issue-1',
          mapping_source: 'provider_id_fallback',
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          accepted_at: '2026-03-20T01:12:30.000Z',
          updated_at: '2026-03-20T01:16:20.000Z',
          last_delivery_id: 'delivery-1',
          last_event: 'Issue',
          last_action: 'update',
          last_webhook_timestamp: 1_742_360_020_000,
          run_id: 'run-child',
          run_manifest_path: selectedPaths.manifestPath
        }
      ]
    };

    const selected = await createSelectedRunProjectionReader(
      createProjectionContext(selectedPaths, providerIntakeState)
    ).buildSelectedRunContext();

    expect(selected?.providerDebugSnapshot).toMatchObject({
      claim: {
        reason: 'provider_issue_rehydrated_active_run',
        run_id: 'run-child',
        updated_at: '2026-03-20T01:16:20.000Z'
      }
    });
    expect(selected?.latestEvent).toMatchObject({
      event: 'in_progress',
      message: 'Selected run stays scoped to its own issue.'
    });
  });

  it('does not synthesize completedAt for queued selected runs', async () => {
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
        status: 'queued',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Queued for retry.'
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'queued',
      summary: 'Queued for retry.',
      completedAt: null
    });
  });

  it('treats canceled selected runs as terminal for completedAt projection', async () => {
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
        status: 'canceled',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:15:28.970Z',
        summary: 'Run canceled by operator.'
      }),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'canceled',
      completedAt: '2026-03-20T01:15:28.970Z'
    });
  });

  it('prefers newer failed provider proof over an optimistic manifest status', async () => {
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
        summary: 'Provider linear worker completed with forced standalone review enabled for handoff',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker completed with forced standalone review enabled for handoff'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'codex_exit_1',
          updated_at: '2026-03-20T01:15:29.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'failed'
    });
    expect(selected?.summary).toContain('Provider linear worker failed with Codex exit code 1.');
    expect(selected?.lastError).toContain('Provider linear worker failed with Codex exit code 1.');
  });

  it('honors camelCase manifest timestamps before preferring older provider proof', async () => {
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
        updatedAt: '2026-03-20T01:15:30.970Z',
        summary: 'Provider linear worker reached review handoff.',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker reached review handoff.'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'codex_exit_1',
          updated_at: '2026-03-20T01:15:29.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      summary: 'Provider linear worker reached review handoff.',
      lastError: null
    });
  });

  it('ignores terminal proof rewritten from a prior attempt after a rerun starts', async () => {
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
        started_at: '2026-03-20T01:15:30.970Z',
        updated_at: '2026-03-20T01:15:29.970Z',
        summary: 'Provider linear worker reached review handoff.',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker reached review handoff.'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          owner_phase: 'ended',
          owner_status: 'failed',
          end_reason: 'codex_exit_1',
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          updated_at: '2026-03-20T01:15:31.970Z'
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected).toMatchObject({
      rawStatus: 'succeeded',
      summary: 'Provider linear worker reached review handoff.',
      lastError: null
    });
  });

  it('ignores deterministic mutation suppressions recorded before the current provider attempt', async () => {
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
        summary: 'Provider linear worker completed with forced standalone review enabled for handoff',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker completed with forced standalone review enabled for handoff'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          linear_audit: {
            path: '/tmp/provider-linear-worker-linear-audit.jsonl',
            attempted_count: 1,
            success_count: 0,
            failure_count: 1,
            latest_recorded_at: '2026-03-20T01:15:27.970Z',
            parallelization_entries: [],
            latest_by_operation: {
              'create-follow-up': {
                recorded_at: '2026-03-20T01:15:27.970Z',
                operation: 'create-follow-up',
                ok: false,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: null,
                via: null,
                state: null,
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: 'linear_follow_up_parity_matrix_missing',
                error_message: 'Parity/alignment follow-up issues require a parity matrix.'
              }
            }
          }
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.summary).toContain('Provider linear worker stopped because the issue was no longer active.');
    expect(selected?.summary).not.toContain('deterministic provider mutation suppressed');
  });

  it('omits degradation text when provider proof cannot be scoped to a single attempt', async () => {
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
        summary: 'Provider linear worker completed with forced standalone review enabled for handoff',
        commands: [
          {
            id: 'provider-linear-worker',
            status: 'succeeded',
            summary: 'Provider linear worker completed with forced standalone review enabled for handoff'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: undefined,
          linear_audit: {
            path: '/tmp/provider-linear-worker-linear-audit.jsonl',
            attempted_count: 1,
            success_count: 0,
            failure_count: 1,
            latest_recorded_at: '2026-03-20T01:15:27.970Z',
            parallelization_entries: [],
            latest_by_operation: {
              'create-follow-up': {
                recorded_at: '2026-03-20T01:15:27.970Z',
                operation: 'create-follow-up',
                ok: false,
                issue_id: 'lin-issue-1',
                issue_identifier: 'CO-2',
                source_setup: null,
                action: null,
                via: null,
                state: null,
                follow_up_issue_id: null,
                follow_up_issue_identifier: null,
                failed_relation_type: null,
                comment_id: null,
                attachment_id: null,
                error_code: 'linear_follow_up_parity_matrix_missing',
                error_message: 'Parity/alignment follow-up issues require a parity matrix.'
              }
            }
          }
        })
      ),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.summary).toContain('Provider linear worker stopped because the issue was no longer active.');
    expect(selected?.summary).not.toContain('deterministic provider mutation suppressed');
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
    const childLane: ProviderLinearWorkerChildLaneRecord = {
      stream: 'projection-proof',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-lin-issue-1-projection-proof',
      run_id: 'child-lane-run-1',
      status: 'succeeded',
      manifest_path: join(root, '.runs', 'linear-lin-issue-1-projection-proof', 'cli', 'child-lane-run-1', 'manifest.json'),
      artifact_root: join(root, '.runs', 'linear-lin-issue-1-projection-proof', 'cli', 'child-lane-run-1'),
      log_path: null,
      summary: 'Selected-run projection proof lane finished',
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-2',
      workspace_path: join(root, '.workspaces', 'linear-lin-issue-1'),
      source_setup: null,
      launched_at: '2026-03-20T01:15:40.000Z',
      purpose: 'Add child_lanes proof coverage',
      instructions: null,
      scope: {
        files: ['orchestrator/tests/SelectedRunProjection.test.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-20T01:15:28.970Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-20T01:15:35.000Z'
      },
      lane_workspace_path: join(root, '.child-lanes', 'projection-proof-child-run-1'),
      patch_artifact_path: join(root, '.runs', 'linear-lin-issue-1-projection-proof', 'cli', 'child-lane-run-1', 'provider-linear-child-lane.patch'),
      patch_bytes: 128,
      decision: 'accepted',
      decision_at: '2026-03-20T01:15:50.000Z',
      decision_reason: 'Parent accepted the projection proof lane.'
    };
    const proof: ProviderLinearWorkerProof = {
      ...buildProviderLinearWorkerProof({
        workspace_path: join(root, '.workspaces', 'linear-lin-issue-1')
      }),
      child_lanes: [childLane]
    };
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(proof),
      'utf8'
    );

    const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

    expect(selected?.runId).toBe('run-child');
    expect(selected?.providerLinearWorkerProof).toEqual(proof);
    expect(selected?.providerLinearWorkerProof?.child_lanes?.[0]?.scope.files).toEqual([
      'orchestrator/tests/SelectedRunProjection.test.ts'
    ]);
  });

  it('refreshes in-progress provider proofs from session telemetry during projection reads', async () => {
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
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: null,
          latest_session_id: null,
          latest_session_id_source: null,
          turn_count: 1,
          last_event: 'item.completed',
          last_message: null,
          last_event_at: null,
          tokens: {
            input_tokens: null,
            output_tokens: null,
            total_tokens: null
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '20');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, 'rollout-2026-03-20T01-15-30-000Z-thread-1.jsonl'),
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          }
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-3'
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 55,
                output_tokens: 21,
                total_tokens: 76
              }
            },
            rate_limits: {
              primary: {
                used_percent: 18,
                window_minutes: 300
              },
              secondary: {
                used_percent: 52,
                window_minutes: 10080
              }
            }
          }
        })
      ].join('\n'),
      'utf8'
    );

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

      expect(selected?.providerLinearWorkerProof).toMatchObject({
        latest_turn_id: 'turn-3',
        latest_session_id: 'thread-1-turn-3',
        latest_session_id_source: 'derived_from_thread_and_turn',
        tokens: {
          input_tokens: 55,
          output_tokens: 21,
          total_tokens: 76
        },
        rate_limits: {
          primary: {
            used_percent: 18,
            window_minutes: 300
          },
          secondary: {
            used_percent: 52,
            window_minutes: 10080
          }
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('refreshes in-progress provider proofs when token fields are undefined in the sidecar', async () => {
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
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'item.completed',
          last_message: null,
          last_event_at: null,
          tokens: {} as ProviderLinearWorkerProof['tokens'],
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '20');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, 'rollout-2026-03-20T01-15-30-000Z-thread-1.jsonl'),
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          }
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-3'
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 55,
                output_tokens: 21,
                total_tokens: 76
              }
            },
            rate_limits: {
              primary: {
                used_percent: 18,
                window_minutes: 300
              },
              secondary: {
                used_percent: 52,
                window_minutes: 10080
              }
            }
          }
        })
      ].join('\n'),
      'utf8'
    );

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

      expect(selected?.providerLinearWorkerProof).toMatchObject({
        latest_turn_id: 'turn-3',
        latest_session_id: 'thread-1-turn-3',
        latest_session_id_source: 'derived_from_thread_and_turn',
        tokens: {
          input_tokens: 55,
          output_tokens: 21,
          total_tokens: 76
        },
        rate_limits: {
          primary: {
            used_percent: 18,
            window_minutes: 300
          },
          secondary: {
            used_percent: 52,
            window_minutes: 10080
          }
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
  });

  it('refreshes in-progress provider proofs when rate_limits is omitted in the sidecar', async () => {
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
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'item.completed',
          last_message: null,
          last_event_at: null,
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          },
          rate_limits: undefined as unknown as ProviderLinearWorkerProof['rate_limits'],
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    const sessionDir = join(codexHome, 'sessions', '2026', '03', '20');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, 'rollout-2026-03-20T01-15-30-000Z-thread-1.jsonl'),
      [
        JSON.stringify({
          type: 'session_meta',
          payload: {
            id: 'thread-1',
            cwd: root,
            initial_prompt: 'You are the provider worker for Linear issue CO-2: Autonomous intake handoff'
          }
        }),
        JSON.stringify({
          type: 'turn_context',
          payload: {
            turn_id: 'turn-3'
          }
        }),
        JSON.stringify({
          type: 'event_msg',
          payload: {
            type: 'token_count',
            info: {
              total_token_usage: {
                input_tokens: 55,
                output_tokens: 21,
                total_tokens: 76
              }
            },
            rate_limits: {
              primary: {
                used_percent: 18,
                window_minutes: 300
              },
              secondary: {
                used_percent: 52,
                window_minutes: 10080
              }
            }
          }
        })
      ].join('\n'),
      'utf8'
    );

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();

      expect(selected?.providerLinearWorkerProof).toMatchObject({
        latest_turn_id: 'turn-3',
        latest_session_id: 'thread-1-turn-3',
        latest_session_id_source: 'derived_from_thread_and_turn',
        tokens: {
          input_tokens: 55,
          output_tokens: 21,
          total_tokens: 76
        },
        rate_limits: {
          primary: {
            used_percent: 18,
            window_minutes: 300
          },
          secondary: {
            used_percent: 52,
            window_minutes: 10080
          }
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
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

  it('treats canceled manifests as retry fallback candidates when provider intake state is absent', async () => {
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
        status: 'canceled',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'retry aborted before handoff',
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
      rawStatus: 'canceled',
      displayStatus: 'canceled',
      summary: 'retry aborted before handoff'
    });
  });

  it('excludes auxiliary manual live proof harness runs from compatibility discovery', async () => {
    const { root, paths } = await createHostPaths();
    const taskEnv = {
      repoRoot: root,
      runsRoot: join(root, '.runs'),
      outRoot: join(root, 'out'),
      taskId: 'linear-lin-issue-1'
    };
    const liveRunPaths = resolveRunPaths(taskEnv, 'run-live');
    await mkdir(liveRunPaths.runDir, { recursive: true });
    await writeFile(
      liveRunPaths.manifestPath,
      JSON.stringify({
        run_id: 'run-live',
        task_id: 'linear-lin-issue-1',
        status: 'in_progress',
        issue_provider: 'linear',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        updated_at: '2026-03-20T01:16:00.000Z',
        summary: 'provider run active',
        commands: []
      }),
      'utf8'
    );

    const helperRunPaths = resolveRunPaths(taskEnv, '2026-03-20T01-16-30-000Z-manual-live-proof');
    await mkdir(helperRunPaths.runDir, { recursive: true });
    await writeFile(
      helperRunPaths.manifestPath,
      JSON.stringify({
        run_id: '2026-03-20T01-16-30-000Z-manual-live-proof',
        task_id: 'linear-lin-issue-1',
        issue_id: 'lin-issue-1',
        issue_identifier: 'CO-2',
        status: 'in_progress',
        updated_at: '2026-03-20T01:16:30.000Z',
        summary: 'manual live proof harness'
      }),
      'utf8'
    );

    const discovery = await discoverCompatibilityCollectionContexts(createProjectionContext(paths));

    expect(discovery.running.map((entry) => entry.runId)).toEqual(['run-live']);
    expect(discovery.running.find((entry) => entry.runId?.includes('manual-live-proof'))).toBeUndefined();
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

  it('preserves proof updated_at when projection refresh finds no new session telemetry', async () => {
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
    await writeFile(
      join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME),
      JSON.stringify(
        buildProviderLinearWorkerProof({
          attempt_started_at: '2026-03-20T01:15:28.970Z',
          latest_turn_id: null,
          latest_session_id: null,
          latest_session_id_source: null,
          turn_count: 1,
          last_event: 'token_count',
          last_message: 'stale proof snapshot',
          last_event_at: '2026-03-20T01:15:28.970Z',
          tokens: {
            input_tokens: 41,
            output_tokens: 9,
            total_tokens: 50
          },
          rate_limits: {
            primary: {
              used_percent: 18,
              window_minutes: 300
            },
            secondary: {
              used_percent: 52,
              window_minutes: 10080
            }
          },
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: root,
          end_reason: null,
          updated_at: '2026-03-20T01:15:28.970Z'
        }),
        null,
        2
      ),
      'utf8'
    );

    const codexHome = join(root, '.codex');
    await mkdir(codexHome, { recursive: true });

    const originalCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = codexHome;
    try {
      const selected = await createProjectionReader(paths, childPaths.manifestPath).buildSelectedRunContext();
      const onDisk = JSON.parse(
        await readFile(join(childPaths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME), 'utf8')
      ) as ProviderLinearWorkerProof;

      expect(selected?.providerLinearWorkerProof?.updated_at).toBe('2026-03-20T01:15:28.970Z');
      expect(selected?.providerLinearWorkerProof?.rate_limits).toEqual({
        primary: {
          used_percent: 18,
          window_minutes: 300
        },
        secondary: {
          used_percent: 52,
          window_minutes: 10080
        }
      });
      expect(onDisk.updated_at).toBe('2026-03-20T01:15:28.970Z');
      expect(onDisk.rate_limits).toEqual({
        primary: {
          used_percent: 18,
          window_minutes: 300
        },
        secondary: {
          used_percent: 52,
          window_minutes: 10080
        }
      });
    } finally {
      if (originalCodexHome === undefined) {
        delete process.env.CODEX_HOME;
      } else {
        process.env.CODEX_HOME = originalCodexHome;
      }
    }
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
