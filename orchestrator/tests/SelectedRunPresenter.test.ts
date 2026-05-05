import { describe, expect, it } from 'vitest';

import { buildUiDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import type {
  CompatibilityProjectionIssueRecord,
  ControlCompatibilityProjectionSnapshot,
  ControlIssuePayload
} from '../src/cli/control/observabilityReadModel.js';
import type { ProviderLinearWorkerChildLaneRecord } from '../src/cli/providerLinearWorkerRunner.js';

function buildIssueRecord(
  payload: Partial<ControlIssuePayload> & Pick<ControlIssuePayload, 'issue_identifier'>
): CompatibilityProjectionIssueRecord {
  return {
    issueIdentifier: payload.issue_identifier,
    aliases: [payload.issue_identifier, payload.issue_id ?? payload.issue_identifier],
    payload: {
      issue_identifier: payload.issue_identifier,
      issue_id: payload.issue_id ?? payload.issue_identifier.toLowerCase(),
      task_id: payload.task_id ?? `${payload.issue_identifier.toLowerCase()}-task`,
      run_id: payload.run_id ?? `${payload.issue_identifier.toLowerCase()}-run`,
      status: payload.status ?? 'running',
      raw_status: payload.raw_status ?? 'in_progress',
      display_status: payload.display_status ?? 'running',
      status_reason: payload.status_reason ?? null,
      workspace: payload.workspace ?? {
        path: `/repo/.workspaces/${payload.issue_identifier.toLowerCase()}`
      },
      attempts: payload.attempts ?? {
        restart_count: null,
        current_retry_attempt: null
      },
      running: payload.running ?? null,
      retry: payload.retry ?? null,
      logs: payload.logs ?? {
        codex_session_logs: []
      },
      summary: payload.summary ?? null,
      latest_event: payload.latest_event ?? null,
      question_summary: payload.question_summary ?? {
        queued_count: 0,
        latest_question: null
      },
      recent_events: payload.recent_events ?? [],
      last_error: payload.last_error ?? null,
      tracked: payload.tracked ?? { linear: null },
      ...(payload.provider_linear_worker_proof
        ? { provider_linear_worker_proof: payload.provider_linear_worker_proof }
        : {}),
      ...(payload.provider_debug_snapshot
        ? { provider_debug_snapshot: payload.provider_debug_snapshot }
        : {}),
      ...(payload.dispatch_pilot ? { dispatch_pilot: payload.dispatch_pilot } : {})
    }
  };
}

function buildProjection(
  overrides: Partial<ControlCompatibilityProjectionSnapshot> = {}
): ControlCompatibilityProjectionSnapshot {
  const providerProofChildLanes: ProviderLinearWorkerChildLaneRecord[] = [
    {
      stream: 'presenter-proof',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'linear-e52-presenter-proof',
      run_id: 'child-run-1',
      status: 'succeeded',
      manifest_path: '/repo/.runs/linear-e52-presenter-proof/cli/child-run-1/manifest.json',
      artifact_root: '/repo/.runs/linear-e52-presenter-proof/cli/child-run-1',
      log_path: null,
      summary: 'Selected-run presenter proof lane completed',
      issue_id: 'issue-7',
      issue_identifier: 'CO-7',
      workspace_path: '/repo/.workspaces/co-7',
      source_setup: null,
      launched_at: '2026-03-27T04:05:30.000Z',
      purpose: 'Add selected-run presenter child-lane proof coverage',
      instructions: null,
      scope: {
        files: ['orchestrator/tests/SelectedRunPresenter.test.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-27T04:05:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-27T04:05:20.000Z'
      },
      lane_workspace_path: '/repo/.workspaces/co-7/.child-lanes/presenter-proof-child-run-1',
      patch_artifact_path: '/repo/.runs/linear-e52-presenter-proof/cli/child-run-1/provider-linear-child-lane.patch',
      patch_bytes: 144,
      decision: 'accepted',
      decision_at: '2026-03-27T04:05:40.000Z',
      decision_reason: 'Parent accepted the presenter proof lane.'
    }
  ];
  const runningIssue = buildIssueRecord({
    issue_identifier: 'CO-7',
    issue_id: 'issue-7',
    task_id: 'linear-e52',
    run_id: 'run-7',
    status: 'running',
    raw_status: 'in_progress',
    display_status: 'paused',
    status_reason: 'queued_questions',
    workspace: {
      path: '/repo/.workspaces/co-7'
    },
    running: {
      issue_id: 'issue-7',
      issue_identifier: 'CO-7',
      state: 'running',
      display_state: 'paused',
      status_reason: 'queued_questions',
      session_id: 'session-7',
      turn_count: 4,
      last_event: 'pause',
      last_message: 'Waiting on operator input',
      started_at: '2026-03-27T04:00:00.000Z',
      last_event_at: '2026-03-27T04:05:00.000Z',
      tokens: {
        input_tokens: 120,
        output_tokens: 45,
        total_tokens: 165
      }
    },
    summary: 'Waiting on operator input',
    latest_event: {
      at: '2026-03-27T04:05:00.000Z',
      event: 'pause',
      message: 'Waiting on operator input'
    },
    recent_events: [
      {
        at: '2026-03-27T04:05:00.000Z',
        event: 'pause',
        message: 'Waiting on operator input'
      }
    ],
    tracked: {
      linear: {
        provider: 'linear',
        id: 'lin-7',
        identifier: 'CO-7',
        title: 'Add richer operator observability surface',
        url: 'https://linear.app/asabeko/issue/CO-7',
        state: 'In Progress',
        state_type: 'started',
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        team_key: 'CO',
        team_name: 'CO',
        project_id: 'project-1',
        project_name: 'Codex Orchestrator',
        updated_at: '2026-03-27T04:06:00.000Z',
        recent_activity: [
          {
            id: 'activity-1',
            created_at: '2026-03-27T04:04:00.000Z',
            actor_name: 'operator',
            summary: 'State moved to In Progress'
          }
        ]
      }
    },
    provider_linear_worker_proof: {
      issue_id: 'issue-7',
      issue_identifier: 'CO-7',
      thread_id: 'thread-7',
      latest_turn_id: 'turn-4',
      latest_session_id: 'session-7',
      latest_session_id_source: 'provider',
      turn_count: 4,
      last_event: 'pause',
      last_message: 'Waiting on operator input',
      last_event_at: '2026-03-27T04:05:00.000Z',
      tokens: {
        input_tokens: 120,
        output_tokens: 45,
        total_tokens: 165
      },
      rate_limits: {
        reset_seconds: 18
      },
      owner_phase: 'active',
      owner_status: 'paused',
      workspace_path: '/repo/.workspaces/co-7',
      child_lanes: providerProofChildLanes,
      end_reason: null,
      updated_at: '2026-03-27T04:05:00.000Z'
    }
  });
  const retryIssue = buildIssueRecord({
    issue_identifier: 'CO-8',
    issue_id: 'issue-8',
    task_id: 'linear-e53',
    run_id: 'run-8',
    status: 'retrying',
    raw_status: 'resumable',
    display_status: 'retrying',
    status_reason: 'retry_scheduled',
    workspace: {
      path: '/repo/.workspaces/co-8'
    },
    retry: {
      issue_id: 'issue-8',
      issue_identifier: 'CO-8',
      task_id: 'linear-e53',
      run_id: 'run-8',
      state: 'resumable',
      display_state: 'retrying',
      status_reason: 'retry_scheduled',
      session_id: 'session-8',
      thread_id: 'thread-8',
      turn_count: 2,
      workspace_path: '/repo/.workspaces/co-8',
      attempt: 2,
      due_at: '2026-03-27T04:10:00.000Z',
      error: 'rate limit exceeded',
      last_event: 'retry_scheduled',
      last_message: 'Retry queued after rate limit',
      started_at: '2026-03-27T03:30:00.000Z',
      last_event_at: '2026-03-27T04:06:00.000Z'
    },
    attempts: {
      restart_count: 1,
      current_retry_attempt: 2
    },
    summary: 'Retry queued after rate limit',
    latest_event: {
      at: '2026-03-27T04:06:00.000Z',
      event: 'retry_scheduled',
      message: 'Retry queued after rate limit'
    },
    recent_events: [],
    last_error: 'rate limit exceeded',
    provider_linear_worker_proof: {
      issue_id: 'issue-8',
      issue_identifier: 'CO-8',
      thread_id: 'thread-8',
      latest_turn_id: 'turn-2',
      latest_session_id: 'session-8',
      latest_session_id_source: 'provider',
      turn_count: 2,
      last_event: 'retry_scheduled',
      last_message: 'Retry queued after rate limit',
      last_event_at: '2026-03-27T04:06:00.000Z',
      tokens: {
        input_tokens: 40,
        output_tokens: 12,
        total_tokens: 52
      },
      rate_limits: {
        reset_seconds: 42
      },
      owner_phase: 'retry',
      owner_status: 'queued',
      workspace_path: '/repo/.workspaces/co-8',
      end_reason: null,
      updated_at: '2026-03-27T04:06:00.000Z'
    }
  });

  return {
    running: [runningIssue.payload.running!],
    retrying: [retryIssue.payload.retry!],
    codexTotals: {
      input_tokens: 160,
      output_tokens: 57,
      total_tokens: 217,
      seconds_running: 912.5
    },
    rateLimits: {
      reset_seconds: 42
    },
    issues: [runningIssue, retryIssue],
    selected: {
      issue_id: 'issue-7',
      issue_identifier: 'CO-7',
      task_id: 'linear-e52',
      run_id: 'run-7',
      raw_status: 'in_progress',
      display_status: 'paused',
      status_reason: 'queued_questions',
      started_at: '2026-03-27T04:00:00.000Z',
      updated_at: '2026-03-27T04:05:00.000Z',
      completed_at: null,
      summary: 'Waiting on operator input',
      last_error: null,
      latest_action: 'pause',
      latest_event: {
        at: '2026-03-27T04:05:00.000Z',
        event: 'pause',
        message: 'Waiting on operator input',
        requested_by: 'operator',
        reason: 'queued_questions'
      },
      workspace: {
        path: '/repo/.workspaces/co-7'
      },
      question_summary: {
        queued_count: 1,
        latest_question: {
          question_id: 'question-1',
          prompt: 'Approve the scope?',
          urgency: 'high',
          queued_at: '2026-03-27T04:05:10.000Z'
        }
      },
      tracked: runningIssue.payload.tracked,
      provider_linear_worker_proof: runningIssue.payload.provider_linear_worker_proof!
    },
    dispatchPilot: null,
    tracked: null,
    providerIntake: null,
    providerWorkflow: {
      status: 'ready',
      pipeline_id: 'provider-linear',
      source_path: '/repo/provider-workflow.json',
      snapshot_path: '/repo/.tmp/provider-workflow.snapshot.json',
      last_reload_attempt_at: '2026-03-27T04:06:00.000Z',
      last_success_at: '2026-03-27T04:06:00.000Z',
      last_error_at: null,
      last_error: null
    },
    polling: {
      enabled: true,
      interval_ms: 15000,
      checking: false,
      queued: false,
      last_mode: 'poll',
      last_requested_at: '2026-03-27T04:06:00.000Z',
      last_completed_at: '2026-03-27T04:06:01.000Z',
      last_success_at: '2026-03-27T04:06:01.000Z',
      last_error_at: null,
      last_error: null,
      next_poll_at: '2026-03-27T04:06:16.000Z',
      next_poll_in_ms: 15000
    },
    ...overrides
  };
}

describe('OperatorDashboardPresenter', () => {
  it('builds a richer operator dashboard dataset from the compatibility projection', () => {
    const dataset = buildUiDataset({
      projection: buildProjection(),
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset).toMatchObject({
      generated_at: '2026-03-27T04:06:02.000Z',
      mode: 'operator_dashboard',
      read_only: true,
      counts: {
        running: 1,
        retrying: 1,
        issues: 2
      },
      totals: {
        total_tokens: 217,
        seconds_running: 912.5
      },
      rate_limits: {
        reset_seconds: 42
      },
      polling: {
        enabled: true,
        last_mode: 'poll',
        next_poll_in_ms: 15000
      },
      selected_issue_identifier: 'CO-7'
    });

    expect(dataset.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-7',
        session_id: 'session-7',
        thread_id: 'thread-7',
        turn_count: 4,
        display_state: 'paused'
      })
    ]);
    expect(dataset.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-8',
        attempt: 2,
        error: 'rate limit exceeded',
        thread_id: 'thread-8'
      })
    ]);
    expect(dataset.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue_identifier: 'CO-7',
          status: 'running',
          display_status: 'paused',
          status_reason: 'queued_questions',
          title: 'Add richer operator observability surface',
          session: {
            session_id: 'session-7',
            thread_id: 'thread-7',
            turn_count: 4
          },
          owner: {
            phase: 'active',
            status: 'paused'
          },
          is_selected: true
        }),
        expect.objectContaining({
          issue_identifier: 'CO-8',
          last_error: 'rate limit exceeded',
          retry: expect.objectContaining({
            attempt: 2
          })
        })
      ])
    );
    expect(dataset.selected?.provider_linear_worker_proof?.child_lanes).toEqual([
      expect.objectContaining({
        stream: 'presenter-proof',
        decision: 'accepted',
        scope: {
          files: ['orchestrator/tests/SelectedRunPresenter.test.ts'],
          phases: []
        }
      })
    ]);
    expect(dataset.issues.find((issue) => issue.issue_identifier === 'CO-7')?.provider_linear_worker_proof?.child_lanes).toEqual([
      expect.objectContaining({
        stream: 'presenter-proof',
        patch_artifact_path: '/repo/.runs/linear-e52-presenter-proof/cli/child-run-1/provider-linear-child-lane.patch'
      })
    ]);
  });

  it('keeps stale proof workspace paths from overriding current dashboard rows', () => {
    const staleProof = {
      issue_id: 'issue-10',
      issue_identifier: 'CO-10',
      attempt_started_at: '2026-03-27T03:00:00.000Z',
      thread_id: null,
      latest_turn_id: null,
      latest_session_id: null,
      latest_session_id_source: null,
      turn_count: 0,
      last_event: 'turn_running',
      last_message: 'stale proof',
      last_event_at: '2026-03-27T03:05:00.000Z',
      tokens: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0
      },
      rate_limits: null,
      owner_phase: 'turn_running',
      owner_status: 'in_progress',
      workspace_path: '/repo/.workspaces/stale-co-10',
      linear_audit: null,
      progress: null,
      tracked_issue_error: null,
      end_reason: null,
      updated_at: '2026-03-27T03:05:00.000Z'
    } as NonNullable<ControlIssuePayload['provider_linear_worker_proof']>;
    const issue = buildIssueRecord({
      issue_identifier: 'CO-10',
      issue_id: 'issue-10',
      task_id: 'linear-co-10',
      run_id: 'run-10',
      workspace: {
        path: '/repo/.workspaces/current-co-10'
      },
      running: {
        issue_id: 'issue-10',
        issue_identifier: 'CO-10',
        state: 'running',
        display_state: 'running',
        status_reason: null,
        session_id: null,
        turn_count: null,
        last_event: 'provider_intake_refresh',
        last_message: 'current row',
        started_at: '2026-03-27T03:00:00.000Z',
        last_event_at: '2026-03-27T04:05:00.000Z',
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        }
      },
      provider_debug_snapshot: {
        live_linear_state: {
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-03-27T04:05:00.000Z'
        },
        claim: {
          state: 'running',
          reason: 'provider_issue_rehydrated_active_run',
          updated_at: '2026-03-27T04:05:00.000Z',
          run_id: 'run-10',
          issue_state: 'In Progress',
          issue_state_type: 'started',
          issue_updated_at: '2026-03-27T04:05:00.000Z',
          launch_source: 'control-host',
          launch_started_at: '2026-03-27T04:00:00.000Z',
          retry: null,
          freshness: 'current',
          is_rehydrated: true,
          rehydrated_at: '2026-03-27T04:05:00.000Z'
        },
        worker: null,
        parallelization: null,
        pull_request: null,
        progress: null,
        last_audit_operation: null,
        last_cross_issue_audit_operation: null,
        last_semantic_progress_at: '2026-03-27T04:05:00.000Z',
        stall_classification: null,
        stall_reason: null,
        recovery_recommendation: null
      },
      provider_linear_worker_proof: staleProof
    });

    const dataset = buildUiDataset({
      projection: buildProjection({
        selected: null,
        running: [issue.payload.running!],
        retrying: [],
        issues: [issue]
      })
    });

    expect(dataset.running[0]?.workspace_path).toBe('/repo/.workspaces/current-co-10');
    expect(dataset.issues[0]?.workspace.path).toBe('/repo/.workspaces/current-co-10');
  });

  it('falls back to the latest event when no recent agent-activity list exists', () => {
    const projection = buildProjection();
    const retryIssue = projection.issues.find((issue) => issue.issueIdentifier === 'CO-8');
    expect(retryIssue).toBeTruthy();
    if (!retryIssue) {
      return;
    }
    retryIssue.payload.provider_linear_worker_proof = {
      ...retryIssue.payload.provider_linear_worker_proof!,
      last_event: 'proof-only',
      last_message: 'Provider proof only',
      last_event_at: '2026-03-27T04:06:59.000Z'
    };
    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    const retryDatasetIssue = dataset.issues.find((issue) => issue.issue_identifier === 'CO-8');
    expect(retryDatasetIssue?.recent_agent_activity).toEqual([
      {
        at: '2026-03-27T04:06:00.000Z',
        event: 'retry_scheduled',
        message: 'Retry queued after rate limit'
      }
    ]);
  });

  it('carries reasoning output token usage through the operator dashboard dataset', () => {
    const projection = buildProjection();
    projection.codexTotals = {
      ...projection.codexTotals,
      reasoning_output_tokens: 31
    };
    projection.running = projection.running.map((entry) => ({
      ...entry,
      tokens: {
        ...entry.tokens,
        reasoning_output_tokens: 17
      }
    }));
    const runningIssue = projection.issues.find((issue) => issue.issueIdentifier === 'CO-7');
    expect(runningIssue?.payload.provider_linear_worker_proof).toBeTruthy();
    if (!runningIssue?.payload.provider_linear_worker_proof) {
      return;
    }
    runningIssue.payload.provider_linear_worker_proof = {
      ...runningIssue.payload.provider_linear_worker_proof,
      tokens: {
        ...runningIssue.payload.provider_linear_worker_proof.tokens,
        reasoning_output_tokens: 17
      }
    };

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset.totals.reasoning_output_tokens).toBe(31);
    expect(dataset.running[0]?.tokens.reasoning_output_tokens).toBe(17);
    expect(dataset.issues.find((issue) => issue.issue_identifier === 'CO-7')?.tokens?.reasoning_output_tokens).toBe(17);
  });

  it('preserves resolved model provenance on running and retry dashboard rows', () => {
    const projection = buildProjection();
    const resolvedModelProvenance = {
      schema_version: 1,
      model: 'gpt-5.5',
      review_model: 'gpt-5.5',
      model_reasoning_effort: 'xhigh',
      source: 'config_default',
      confidence: 'medium',
      degraded_reason: 'runtime_model_unreported',
      observed_at: '2026-05-05T04:41:00.000Z',
      runtime_model: null,
      runtime_review_model: null,
      runtime_reasoning_effort: null,
      command_model: null,
      config_model: 'gpt-5.5',
      config_review_model: 'gpt-5.5',
      config_reasoning_effort: 'xhigh',
      config_path: '/repo/.codex/config.toml'
    } as const;
    projection.running = projection.running.map((entry) => ({
      ...entry,
      resolved_model_provenance: resolvedModelProvenance
    }));
    projection.retrying = projection.retrying.map((entry) => ({
      ...entry,
      resolved_model_provenance: resolvedModelProvenance
    }));

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset.running[0]?.resolved_model_provenance).toEqual(resolvedModelProvenance);
    expect(dataset.retrying[0]?.resolved_model_provenance).toEqual(resolvedModelProvenance);
  });

  it('falls back to provider proof activity when manifest-backed latest-event data is absent', () => {
    const projection = buildProjection();
    const retryIssue = projection.issues.find((issue) => issue.issueIdentifier === 'CO-8');
    expect(retryIssue).toBeTruthy();
    if (!retryIssue) {
      return;
    }
    retryIssue.payload.latest_event = null;
    retryIssue.payload.retry = {
      ...retryIssue.payload.retry!,
      last_event: 'retry-layer-only',
      last_message: 'Retry layer only',
      last_event_at: '2026-03-27T04:06:58.000Z'
    };
    retryIssue.payload.provider_linear_worker_proof = {
      ...retryIssue.payload.provider_linear_worker_proof!,
      last_event: 'proof-layer-only',
      last_message: 'Provider proof only',
      last_event_at: '2026-03-27T04:06:59.000Z'
    };

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset.issues.find((issue) => issue.issue_identifier === 'CO-8')?.recent_agent_activity).toEqual([
      {
        at: '2026-03-27T04:06:59.000Z',
        event: 'proof-layer-only',
        message: 'Provider proof only'
      }
    ]);
  });

  it('keeps retry rows pinned to retry-source identifiers when the issue payload prefers a running sibling', () => {
    const projection = buildProjection();
    const runningIssue = projection.issues.find((issue) => issue.issueIdentifier === 'CO-7');
    expect(runningIssue).toBeTruthy();
    if (!runningIssue) {
      return;
    }

    projection.retrying = [
      {
        ...projection.retrying[0]!,
        issue_identifier: 'CO-7',
        issue_id: 'issue-7',
        task_id: 'linear-e52-retry',
        run_id: 'run-7-retry',
        session_id: 'session-7-retry',
        thread_id: 'thread-7-retry',
        turn_count: 6,
        workspace_path: '/repo/.workspaces/co-7-retry'
      }
    ];
    projection.issues = [runningIssue];

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-7',
        task_id: 'linear-e52-retry',
        run_id: 'run-7-retry',
        session_id: 'session-7-retry',
        thread_id: 'thread-7-retry',
        turn_count: 6,
        workspace_path: '/repo/.workspaces/co-7-retry'
      })
    ]);
    expect(dataset.selected?.task_id).toBe('linear-e52');
    expect(dataset.selected?.run_id).toBe('run-7');
  });

  it('does not inherit a running sibling workspace path for retry rows', () => {
    const projection = buildProjection();
    const runningIssue = projection.issues.find((issue) => issue.issueIdentifier === 'CO-7');
    expect(runningIssue).toBeTruthy();
    if (!runningIssue) {
      return;
    }

    projection.retrying = [
      {
        ...projection.retrying[0]!,
        issue_identifier: 'CO-7',
        issue_id: 'issue-7',
        task_id: 'linear-e52-retry',
        run_id: 'run-7-retry',
        workspace_path: null
      }
    ];
    projection.issues = [runningIssue];

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-7',
        task_id: 'linear-e52-retry',
        run_id: 'run-7-retry',
        workspace_path: null
      })
    ]);
  });

  it('keeps running and retry summaries pinned to stable issue identity before identifier fallback', () => {
    const projection = buildProjection();
    const runningIssue = projection.issues.find((issue) => issue.payload.issue_id === 'issue-7');
    expect(runningIssue).toBeTruthy();
    if (!runningIssue) {
      return;
    }

    const siblingAliasIssue = buildIssueRecord({
      issue_identifier: 'CO-7',
      issue_id: 'issue-7-sibling',
      task_id: 'linear-e52-sibling',
      run_id: 'run-7-sibling',
      summary: 'Sibling summary should not leak into the active run',
      workspace: {
        path: '/repo/.workspaces/co-7-sibling'
      }
    });
    projection.issues = [runningIssue, siblingAliasIssue];
    projection.retrying = [
      {
        ...projection.retrying[0]!,
        issue_identifier: 'CO-7',
        issue_id: 'issue-7',
        task_id: 'linear-e52-retry',
        run_id: 'run-7-retry'
      }
    ];

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-7',
        task_id: 'linear-e52',
        run_id: 'run-7',
        summary: 'Waiting on operator input'
      })
    ]);
    expect(dataset.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-7',
        task_id: 'linear-e52-retry',
        run_id: 'run-7-retry',
        summary: 'Waiting on operator input'
      })
    ]);
  });

  it('falls back to provider proof workspace paths when the issue payload is missing one', () => {
    const projection = buildProjection();
    const runningIssue = projection.issues.find((issue) => issue.issueIdentifier === 'CO-7');
    expect(runningIssue).toBeTruthy();
    if (!runningIssue) {
      return;
    }
    runningIssue.payload.workspace.path = null;

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-27T04:06:02.000Z'
    });

    expect(dataset.issues.find((issue) => issue.issue_identifier === 'CO-7')?.workspace.path).toBe(
      '/repo/.workspaces/co-7'
    );
  });

  it('returns an empty read-only dataset when the compatibility projection is empty', () => {
    const dataset = buildUiDataset({
      projection: buildProjection({
        running: [],
        retrying: [],
        codexTotals: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          seconds_running: 0
        },
        rateLimits: null,
        issues: [],
        selected: null,
        tracked: null,
        providerWorkflow: null,
        polling: null
      }),
      generatedAt: '2026-03-27T04:07:00.000Z'
    });

    expect(dataset).toMatchObject({
      generated_at: '2026-03-27T04:07:00.000Z',
      mode: 'operator_dashboard',
      read_only: true,
      counts: {
        running: 0,
        retrying: 0,
        issues: 0
      },
      totals: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rate_limits: null,
      selected: null,
      selected_issue_identifier: null,
      running: [],
      retrying: [],
      issues: []
    });
  });
});
