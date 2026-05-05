import { describe, expect, it } from 'vitest';

import {
  buildCompatibilityProjectionSnapshot,
  buildCompatibilityRetryEntry,
  buildCompatibilityRunningEntry
} from '../src/cli/control/compatibilityIssuePresenter.js';
import type {
  ControlCompatibilityRuntimeSnapshot,
  ControlCompatibilitySourceContext
} from '../src/cli/control/observabilityReadModel.js';
import { resolveProviderWorkerHost } from '../src/cli/control/observabilityReadModel.js';

function buildCompatibilitySource(
  overrides: Partial<ControlCompatibilitySourceContext> = {}
): ControlCompatibilitySourceContext {
  return {
    issueProvider: 'linear',
    issueIdentifier: 'CO-100',
    issueId: 'issue-100',
    taskId: 'linear-co-100',
    runId: 'run-co-100',
    lookupAliases: ['CO-100', 'issue-100'],
    rawStatus: 'succeeded',
    displayStatus: 'succeeded',
    statusReason: null,
    startedAt: '2026-04-06T02:30:00.000Z',
    updatedAt: '2026-04-06T02:35:00.000Z',
    completedAt: '2026-04-06T02:35:00.000Z',
    summary: 'Completed successfully',
    lastError: null,
    latestAction: null,
    latestEvent: null,
    workspacePath: '/repo/.workspaces/co-100',
    pipelineId: null,
    pipelineTitle: 'Implementation gate',
    stages: [],
    approvalsTotal: 0,
    manifestPath: '/repo/.runs/linear-co-100/cli/run-co-100/manifest.json',
    runDir: '/repo/.runs/linear-co-100/cli/run-co-100',
    questionSummary: {
      queuedCount: 0,
      latestQuestion: null
    },
    tracked: { linear: null },
    compatibilityState: null,
    providerLinearWorkerProof: null,
    providerDebugSnapshot: null,
    providerRetryState: null,
    ...overrides
  };
}

function buildCompatibilityRuntime(
  selected: ControlCompatibilitySourceContext | null
): ControlCompatibilityRuntimeSnapshot {
  return {
    selected,
    running: [],
    retrying: [],
    codexTotals: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 0
    },
    rateLimits: null,
    dispatchPilot: null,
    tracked: null,
    providerIntake: null,
    providerWorkflow: null,
    polling: null
  };
}

function buildProviderIntakeSummary(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'linear',
    summary_scope: 'single_claim',
    selection_strategy: null,
    claim_count: 1,
    active_claim_count: 1,
    running_claim_count: 1,
    active_issue_identifiers: ['CO-100'],
    running_issue_identifiers: ['CO-100'],
    selected_claim: {
      provider: 'linear',
      issue_id: 'issue-100',
      issue_identifier: 'CO-100',
      issue_title: 'CO-100',
      issue_state: 'In Progress',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-06T02:35:00.000Z',
      task_id: 'linear-co-100',
      mapping_source: 'provider_id_fallback',
      state: 'running',
      reason: 'provider_issue_rehydrated_active_run',
      run_id: 'run-co-100',
      worker_host: 'worker-host-intake',
      freshness: 'current',
      retry: null,
      updated_at: '2026-04-06T02:35:00.000Z'
    },
    rehydrated_at: '2026-04-06T02:35:00.000Z',
    is_rehydrated: false,
    updated_at: '2026-04-06T02:35:00.000Z',
    ...overrides
  };
}

function buildExhaustedLinearPolling() {
  return {
    next_poll_in_ms: 43_000,
    linear_budget: {
      observed_at: '2026-04-06T02:35:00.000Z',
      source: 'control-host-polling',
      suppression: 'cooldown',
      suppression_reason: 'linear_budget_shared_cooldown',
      retry_after_seconds: 43,
      cooldown_until: '2026-04-06T02:35:43.000Z',
      cooldown_active: true,
      request_id: 'polling-budget-owner',
      requests: {
        remaining: 0,
        limit: 30,
        reset_at: '2026-04-06T02:35:43.000Z'
      },
      endpoint_requests: null,
      complexity: null,
      endpoint_complexity: null
    }
  } as ControlCompatibilityRuntimeSnapshot['polling'];
}

describe('CompatibilityIssuePresenter', () => {
  it('projects resolved model provenance into selected and running read-model payloads', () => {
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
    const source = buildCompatibilitySource({
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      completedAt: null,
      providerLinearWorkerProof: {
        issue_id: 'issue-100',
        issue_identifier: 'CO-100',
        resolved_model_provenance: resolvedModelProvenance,
        updated_at: '2026-05-05T04:41:00.000Z'
      } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
    });

    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(source),
      running: [source]
    });

    expect(projection.selected?.resolved_model_provenance).toEqual(resolvedModelProvenance);
    expect(
      projection.selected?.provider_linear_worker_proof?.resolved_model_provenance
    ).toEqual(resolvedModelProvenance);
    expect(projection.running[0]?.resolved_model_provenance).toEqual(
      resolvedModelProvenance
    );
    const issuePayload = projection.issues.find((issue) => issue.issueIdentifier === 'CO-100')
      ?.payload;
    expect(issuePayload?.running?.resolved_model_provenance).toEqual(
      resolvedModelProvenance
    );
    expect(issuePayload?.provider_linear_worker_proof?.resolved_model_provenance).toEqual(
      resolvedModelProvenance
    );
  });

  it('ignores stale proof-derived worker_host values for the current attempt', () => {
    expect(
      resolveProviderWorkerHost({
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          attempt_started_at: '2026-04-06T02:00:00.000Z',
          worker_host: 'worker-host-stale'
        },
        stageStartedAt: '2026-04-06T02:30:00.000Z'
      })
    ).toBeNull();
  });

  it('prefers claim launch_started_at over older started_at when filtering stale proof worker_host', () => {
    const source = buildCompatibilitySource({
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      startedAt: '2026-04-06T02:00:00.000Z',
      providerLinearWorkerProof: {
        issue_id: 'issue-100',
        issue_identifier: 'CO-100',
        attempt_started_at: '2026-04-06T02:10:00.000Z',
        updated_at: '2026-04-06T02:20:00.000Z',
        worker_host: 'worker-host-stale'
      } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']> & {
        worker_host: string;
      },
      providerDebugSnapshot: {
        live_linear_state: {
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-06T02:35:00.000Z'
        },
        claim: {
          state: 'in_progress',
          updated_at: '2026-04-06T02:35:00.000Z',
          accepted_at: '2026-04-06T02:05:00.000Z',
          launch_started_at: '2026-04-06T02:30:00.000Z',
          worker_host: null
        },
        worker: null,
        parallelization: null,
        pull_request: null,
        progress: null,
        last_audit_operation: null,
        last_semantic_progress_at: '2026-04-06T02:35:00.000Z',
        stall_classification: null,
        stall_reason: null,
        recovery_recommendation: null
      } as NonNullable<ControlCompatibilitySourceContext['providerDebugSnapshot']>
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: source,
      running: [source],
      retrying: [source],
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      providerWorkflow: null,
      polling: null
    });

    expect(projection.selected?.worker_host).toBeUndefined();
    expect(projection.running[0]?.worker_host).toBeUndefined();
    expect(projection.retrying[0]?.worker_host).toBeUndefined();
    expect(projection.issues[0]?.payload.worker_host).toBeUndefined();
  });

  it('prefers a fresh proof worker_host over a stale intake fallback', () => {
    expect(
      resolveProviderWorkerHost({
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          attempt_started_at: '2026-04-06T02:30:00.000Z',
          updated_at: '2026-04-06T02:35:00.000Z',
          worker_host: 'worker-host-proof'
        },
        providerIntake: buildProviderIntakeSummary({
          selected_claim: {
            ...buildProviderIntakeSummary().selected_claim,
            worker_host: 'worker-host-stale'
          }
        }),
        stageStartedAt: '2026-04-06T02:30:00.000Z'
      })
    ).toBe('worker-host-proof');
  });

  it('does not resurrect intake worker_host when the claim explicitly clears it', () => {
    expect(
      resolveProviderWorkerHost({
        providerDebugSnapshot: {
          live_linear_state: {
            state: 'In Progress',
            state_type: 'started',
            updated_at: '2026-04-06T02:35:00.000Z'
          },
          claim: {
            state: 'running',
            reason: 'provider_issue_rehydrated_active_run',
            updated_at: '2026-04-06T02:35:00.000Z',
            run_id: 'run-co-100',
            worker_host: null,
            launch_source: 'control-host',
            launch_started_at: '2026-04-06T02:30:00.000Z',
            freshness: 'current',
            is_rehydrated: false,
            rehydrated_at: null
          },
          worker: null,
          parallelization: null,
          pull_request: null,
          progress: null,
          last_audit_operation: null,
          last_semantic_progress_at: '2026-04-06T02:35:00.000Z',
          stall_classification: null,
          stall_reason: null,
          recovery_recommendation: null
        },
        providerIntake: buildProviderIntakeSummary({
          selected_claim: {
            ...buildProviderIntakeSummary().selected_claim,
            worker_host: 'worker-host-stale'
          }
        })
      })
    ).toBeNull();
  });

  it('does not resurrect intake worker_host when fresh proof explicitly clears it', () => {
    expect(
      resolveProviderWorkerHost({
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          attempt_started_at: '2026-04-06T02:30:00.000Z',
          updated_at: '2026-04-06T02:35:00.000Z',
          worker_host: null
        },
        providerIntake: buildProviderIntakeSummary({
          selected_claim: {
            ...buildProviderIntakeSummary().selected_claim,
            worker_host: 'worker-host-stale'
          }
        }),
        stageStartedAt: '2026-04-06T02:30:00.000Z'
      })
    ).toBeNull();
  });

  it('uses provider intake fallback for selected and issue payloads when no claim or proof host is present', () => {
    const source = buildCompatibilitySource({
      rawStatus: 'in_progress',
      displayStatus: 'In Progress'
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: source,
      running: [],
      retrying: [],
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: buildProviderIntakeSummary(),
      providerWorkflow: null,
      polling: null
    });

    expect(projection.selected?.worker_host).toBe('worker-host-intake');
    expect(projection.issues[0]?.payload.worker_host).toBe('worker-host-intake');
  });

  it('does not leak a selected intake worker_host into a different issue payload', () => {
    const source = buildCompatibilitySource({
      issueIdentifier: 'CO-240',
      issueId: 'issue-240',
      taskId: 'linear-co-240',
      runId: 'run-co-240',
      lookupAliases: ['CO-240', 'issue-240'],
      rawStatus: 'in_progress',
      displayStatus: 'In Progress'
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: source,
      running: [],
      retrying: [],
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: buildProviderIntakeSummary(),
      providerWorkflow: null,
      polling: null
    });

    expect(projection.selected?.worker_host).toBeUndefined();
    expect(projection.issues[0]?.payload.worker_host).toBeUndefined();
  });

  it('surfaces worker_host through selected, running, retrying, and issue payloads', () => {
    const workerHost = 'worker-host-01';
    const source = buildCompatibilitySource({
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      providerLinearWorkerProof: {
        issue_id: 'issue-100',
        issue_identifier: 'CO-100',
        pid: '123',
        latest_session_id: 'session-3',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 2,
        last_event: 'turn_running',
        last_message: 'Provider worker turn is active.',
        last_event_at: '2026-04-06T02:35:00.000Z',
        tokens: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0
        },
        rate_limits: null,
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        workspace_path: '/repo/.workspaces/co-100',
        linear_audit: null,
        progress: null,
        tracked_issue_error: null,
        end_reason: null,
        updated_at: '2026-04-06T02:35:00.000Z',
        worker_host: workerHost
      } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']> & {
        worker_host: string;
      },
      providerDebugSnapshot: {
        live_linear_state: {
          state: 'In Progress',
          state_type: 'started',
          updated_at: '2026-04-06T02:35:00.000Z'
        },
        claim: null,
        worker: {
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          pid: '123',
          worker_host: workerHost,
          thread_id: 'thread-1',
          latest_session_id: 'session-3',
          turn_count: 2,
          last_event: 'turn_running',
          last_event_at: '2026-04-06T02:35:00.000Z',
          updated_at: '2026-04-06T02:35:00.000Z'
        },
        parallelization: null,
        pull_request: null,
        progress: null,
        last_audit_operation: null,
        last_semantic_progress_at: '2026-04-06T02:35:00.000Z',
        stall_classification: null,
        stall_reason: null,
        recovery_recommendation: null
      } as NonNullable<ControlCompatibilitySourceContext['providerDebugSnapshot']>
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: source,
      running: [source],
      retrying: [source],
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        seconds_running: 0
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      providerWorkflow: null,
      polling: null
    });

    expect(projection.selected).toMatchObject({
      issue_identifier: 'CO-100',
      worker_host: workerHost,
      provider_debug_snapshot: {
        worker: {
          worker_host: workerHost
        }
      }
    });
    expect(projection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-100',
        worker_host: workerHost
      })
    ]);
    expect(projection.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-100',
        worker_host: workerHost
      })
    ]);
    expect(projection.issues[0]?.payload).toMatchObject({
      issue_identifier: 'CO-100',
      worker_host: workerHost,
      provider_debug_snapshot: {
        worker: {
          worker_host: workerHost
        }
      }
    });
  });

  it.each([
    {
      displayStatus: 'pending_shared_root_reconciliation',
      statusReason: 'shared_root_dirty'
    },
    {
      displayStatus: 'failed',
      statusReason: 'shared_root_fast_forward_failed'
    }
  ])(
    'promotes terminal merge-closeout display status %s to the issue status field',
    ({ displayStatus, statusReason }) => {
      const projection = buildCompatibilityProjectionSnapshot(
        buildCompatibilityRuntime(
          buildCompatibilitySource({
            displayStatus,
            statusReason
          })
        )
      );

      expect(projection.selected).toMatchObject({
        raw_status: 'succeeded',
        display_status: displayStatus,
        status_reason: statusReason
      });
      expect(projection.issues).toHaveLength(1);
      expect(projection.issues[0]?.payload).toMatchObject({
        status: displayStatus,
        raw_status: 'succeeded',
        display_status: displayStatus,
        status_reason: statusReason
      });
    }
  );

  it('prefers scoped debug progress summaries over stale proof progress summaries for display_event', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          progress: {
            kind: 'worker',
            phase: 'worker_turn',
            summary: 'stale proof progress summary',
            status: 'active',
            source: 'provider_linear_worker_proof',
            last_semantic_progress_at: '2026-04-06T02:34:00.000Z',
            stall_reason: null,
            recorded_at: '2026-04-06T02:34:00.000Z'
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>,
        providerDebugSnapshot: {
          progress: {
            kind: 'worker',
            phase: 'worker_turn',
            summary: 'updated TECH_SPEC + validating status parity',
            status: 'active',
            source: 'provider_debug_snapshot',
            last_semantic_progress_at: '2026-04-06T02:35:00.000Z',
            stall_reason: null,
            recorded_at: '2026-04-06T02:35:00.000Z'
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerDebugSnapshot']>
      })
    );

    expect(runningEntry.display_event).toBe('updated TECH_SPEC + validating status parity');
  });

  it('does not surface selected-only synthetic linear task-id fallback sources as issue rows', () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const projection = buildCompatibilityProjectionSnapshot(
      buildCompatibilityRuntime(
        buildCompatibilitySource({
          issueProvider: 'linear',
          issueIdentifier: taskId,
          issueId: taskId,
          taskId,
          pipelineId: 'provider-linear-worker',
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          updatedAt: '2026-04-06T02:35:00.000Z',
          completedAt: null,
          summary: 'fallback-only selected source'
        })
      )
    );

    expect(projection.selected?.issue_identifier).toBe(taskId);
    expect(projection.issues).toEqual([]);
  });

  it('does not surface slug-shaped synthetic linear fallback task ids as issue rows', () => {
    const taskId = 'linear-lin-issue-1';
    const projection = buildCompatibilityProjectionSnapshot(
      buildCompatibilityRuntime(
        buildCompatibilitySource({
          issueProvider: 'linear',
          issueIdentifier: taskId,
          issueId: taskId,
          taskId,
          pipelineId: 'provider-linear-worker',
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          updatedAt: '2026-04-06T02:35:00.000Z',
          completedAt: null,
          summary: 'fallback-only selected source using slug fallback task id'
        })
      )
    );

    expect(projection.selected?.issue_identifier).toBe(taskId);
    expect(projection.issues).toEqual([]);
  });

  it('does not surface synthetic linear fallback rows from running or retry registration', () => {
    const runningTaskId = 'linear-lin-issue-1';
    const retryTaskId = 'linear-lin-issue-2';
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(null),
      running: [
        buildCompatibilitySource({
          issueProvider: 'linear',
          issueIdentifier: runningTaskId,
          issueId: runningTaskId,
          taskId: runningTaskId,
          pipelineId: 'provider-linear-worker',
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          completedAt: null,
          summary: 'fallback-only running source using slug fallback task id'
        })
      ],
      retrying: [
        buildCompatibilitySource({
          issueProvider: 'linear',
          issueIdentifier: retryTaskId,
          issueId: retryTaskId,
          taskId: retryTaskId,
          pipelineId: 'provider-linear-worker',
          rawStatus: 'failed',
          displayStatus: 'retrying',
          completedAt: null,
          summary: 'fallback-only retry source using slug fallback task id'
        })
      ]
    });

    expect(projection.running).toEqual([]);
    expect(projection.retrying).toEqual([]);
    expect(projection.issues).toEqual([]);
  });

  it('marks synthetic fallback-only retry entries with fallback metadata', () => {
    const taskId = 'linear-lin-issue-2';
    const retry = buildCompatibilityRetryEntry(
      buildCompatibilitySource({
        issueProvider: 'linear',
        issueIdentifier: taskId,
        issueId: taskId,
        taskId,
        pipelineId: 'provider-linear-worker',
        rawStatus: 'failed',
        displayStatus: 'retrying',
        completedAt: null,
        summary: 'fallback-only retry source using slug fallback task id'
      })
    );

    expect(retry.fallback_expiry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fallback: 'synthetic identity/status fallback that hides CLI/API/UI disagreement',
          decision: 'remove fallback',
          owner: 'CO-398'
        })
      ])
    );
  });

  it('does not surface child-shaped parent fallback aliases from running or retry registration', () => {
    const parentTaskId = 'linear-lin-issue-1';
    const runningTaskId = `${parentTaskId}-docs-review`;
    const retryTaskId = `${parentTaskId}-implementation-gate`;
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(null),
      running: [
        buildCompatibilitySource({
          issueProvider: 'linear',
          issueIdentifier: parentTaskId,
          issueId: parentTaskId,
          taskId: runningTaskId,
          pipelineId: 'docs-review',
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          completedAt: null,
          summary: 'child-shaped running source still reporting the parent fallback alias'
        })
      ],
      retrying: [
        buildCompatibilitySource({
          issueProvider: 'linear',
          issueIdentifier: parentTaskId,
          issueId: parentTaskId,
          taskId: retryTaskId,
          pipelineId: 'implementation-gate',
          rawStatus: 'failed',
          displayStatus: 'retrying',
          completedAt: null,
          summary: 'child-shaped retry source still reporting the parent fallback alias'
        })
      ]
    });

    expect(projection.running).toEqual([]);
    expect(projection.retrying).toEqual([]);
    expect(projection.issues).toEqual([]);
  });

  it('keeps non-linear selected rows even when their task id matches the synthetic linear pattern', () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const projection = buildCompatibilityProjectionSnapshot(
      buildCompatibilityRuntime(
        buildCompatibilitySource({
          issueProvider: 'github',
          issueIdentifier: taskId,
          issueId: taskId,
          taskId,
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          updatedAt: '2026-04-06T02:35:00.000Z',
          completedAt: null,
          summary: 'non-linear selected source'
        })
      )
    );

    expect(projection.issues.map((issue) => issue.issueIdentifier)).toEqual([taskId]);
  });

  it('keeps linear-tagged selected rows when provider-worker provenance is absent', () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const projection = buildCompatibilityProjectionSnapshot(
      buildCompatibilityRuntime(
        buildCompatibilitySource({
          issueProvider: 'linear',
          issueIdentifier: taskId,
          issueId: taskId,
          taskId,
          pipelineId: 'custom-background-pipeline',
          pipelineTitle: 'Custom Background Pipeline',
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          updatedAt: '2026-04-06T02:35:00.000Z',
          completedAt: null,
          summary: 'linear-tagged custom pipeline should stay visible'
        })
      )
    );

    expect(projection.issues.map((issue) => issue.issueIdentifier)).toEqual([taskId]);
  });

  it('keeps null-provider child-pipeline fallback rows when worker evidence is absent', () => {
    const parentTaskId = 'linear-lin-issue-1';
    const childTaskId = `${parentTaskId}-docs-review`;
    const projection = buildCompatibilityProjectionSnapshot(
      buildCompatibilityRuntime(
        buildCompatibilitySource({
          issueProvider: null,
          issueIdentifier: parentTaskId,
          issueId: parentTaskId,
          taskId: childTaskId,
          pipelineId: 'docs-review',
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          updatedAt: '2026-04-06T02:35:00.000Z',
          completedAt: null,
          summary: 'generic docs-review run with fallback-shaped issue fields'
        })
      )
    );

    expect(projection.issues.map((issue) => issue.issueIdentifier)).toEqual([parentTaskId]);
  });

  it('keeps selected rows when optional provider-worker provenance fields are omitted', () => {
    const taskId = 'linear-0b49c08c-53a1-4225-8d09-28457165fbc8';
    const projection = buildCompatibilityProjectionSnapshot(
      buildCompatibilityRuntime(
        buildCompatibilitySource({
          issueProvider: null,
          issueIdentifier: taskId,
          issueId: taskId,
          taskId,
          pipelineTitle: undefined,
          providerLinearWorkerProof: undefined,
          rawStatus: 'in_progress',
          displayStatus: 'In Progress',
          updatedAt: '2026-04-06T02:35:00.000Z',
          completedAt: null,
          summary: 'generic selected source with omitted provenance helpers'
        })
      )
    );

    expect(projection.issues.map((issue) => issue.issueIdentifier)).toEqual([taskId]);
  });

  it('keeps the projected child-summary message and timestamp when newer proof telemetry is generic', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        latestEvent: {
          event: 'turn_running',
          message: 'docs-review failed at docs:freshness after spec-guard passed',
          at: '2026-04-06T02:34:00.000Z',
          source: 'child_stream_summary',
          messageRecordedAt: '2026-04-06T02:34:00.000Z',
          sourceUpdatedAt: '2026-04-06T02:34:00.000Z',
          candidates: [
            {
              source: 'child_stream_summary',
              event: null,
              summary: 'docs-review failed at docs:freshness after spec-guard passed',
              message_recorded_at: '2026-04-06T02:34:00.000Z',
              source_updated_at: '2026-04-06T02:34:00.000Z',
              derived: true,
              accepted: true,
              rejection_reason: null
            }
          ],
          requestedBy: null,
          reason: null
        },
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'session-3',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_message: 'Provider worker turn is active.',
          last_event_at: '2026-04-06T02:35:00.000Z',
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:00.000Z'
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>,
        providerDebugSnapshot: {
          progress: {
            kind: 'worker',
            phase: 'turn_running',
            summary: 'docs-review failed at docs:freshness after spec-guard passed',
            summary_recorded_at: '2026-04-06T02:34:00.000Z',
            status: 'progressing',
            last_semantic_progress_at: '2026-04-06T02:35:00.000Z',
            stall_reason: null,
            recovery_recommendation: 'continue_waiting',
            stall_classification: 'progressing'
          }
        } as NonNullable<ControlCompatibilitySourceContext['providerDebugSnapshot']>
      })
    );

    expect(runningEntry.last_event).toBe('turn_running');
    expect(runningEntry.last_message).toBe(
      'docs-review failed at docs:freshness after spec-guard passed'
    );
    expect(runningEntry.last_event_at).toBe('2026-04-06T02:34:00.000Z');
    expect(runningEntry.display_event).toBe(
      'docs-review failed at docs:freshness after spec-guard passed'
    );
    expect(runningEntry.event_source).toBe('child_stream_summary');
    expect(runningEntry.message_recorded_at).toBe('2026-04-06T02:34:00.000Z');
    expect(runningEntry.source_updated_at).toBe('2026-04-06T02:34:00.000Z');
    expect(runningEntry.event_candidates).toEqual([
      {
        source: 'child_stream_summary',
        event: null,
        summary: 'docs-review failed at docs:freshness after spec-guard passed',
        message_recorded_at: '2026-04-06T02:34:00.000Z',
        source_updated_at: '2026-04-06T02:34:00.000Z',
        derived: true,
        accepted: true,
        rejection_reason: null
      }
    ]);
  });

  it('uses canonical proof activity content when current-turn activity outruns legacy proof fields', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_message: null,
          last_event_at: '2026-04-06T02:35:00.000Z',
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: 'Investigating provider-worker EVENT provenance.',
            recorded_at: '2026-04-06T02:35:30.000Z',
            source: 'session_log_hydration',
            turn_id: 'turn-2',
            session_id: 'thread-1-turn-2'
          },
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:30.000Z'
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry).toMatchObject({
      session_id: 'thread-1-turn-2',
      last_event: 'agent_message',
      last_message: 'Investigating provider-worker EVENT provenance.',
      display_event: 'Investigating provider-worker EVENT provenance.',
      event_source: 'canonical_session_log_hydration',
      message_recorded_at: '2026-04-06T02:35:30.000Z',
      source_updated_at: '2026-04-06T02:35:30.000Z',
      last_event_at: '2026-04-06T02:35:30.000Z',
      event_candidates: [
        {
          source: 'canonical_session_log_hydration',
          event: 'agent_message',
          summary: 'Investigating provider-worker EVENT provenance.',
          message_recorded_at: '2026-04-06T02:35:30.000Z',
          source_updated_at: '2026-04-06T02:35:30.000Z',
          derived: false,
          accepted: true,
          rejection_reason: null
        }
      ]
    });
  });

  it('does not backfill legacy proof freshness or session ids when canonical activity is incomplete', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-1',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_message: 'older legacy message',
          last_event_at: '2026-04-06T02:34:30.000Z',
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: 'Investigating provider-worker EVENT provenance.',
            recorded_at: null,
            source: 'stdout_jsonl',
            turn_id: 'turn-2',
            session_id: null
          },
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:30.000Z'
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry).toMatchObject({
      session_id: null,
      last_event: 'agent_message',
      last_message: 'Investigating provider-worker EVENT provenance.',
      display_event: 'Investigating provider-worker EVENT provenance.',
      event_source: 'canonical_stdout_jsonl',
      message_recorded_at: null,
      source_updated_at: '2026-04-06T02:35:30.000Z',
      last_event_at: '2026-04-06T02:35:00.000Z'
    });
  });

  it('does not leak latest-event candidates when proof telemetry wins the running row', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'running',
        displayStatus: 'Running',
        summary: 'Provider worker turn is active.',
        latestEvent: {
          event: 'running',
          message: null,
          at: '2026-04-06T02:34:00.000Z',
          source: 'child_stream_summary',
          messageRecordedAt: '2026-04-06T02:34:00.000Z',
          sourceUpdatedAt: '2026-04-06T02:34:00.000Z',
          candidates: [
            {
              source: 'child_stream_summary',
              event: null,
              summary: 'old child summary',
              message_recorded_at: '2026-04-06T02:34:00.000Z',
              source_updated_at: '2026-04-06T02:34:00.000Z',
              derived: true,
              accepted: true,
              rejection_reason: null
            }
          ],
          requestedBy: null,
          reason: null
        },
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_message: null,
          last_event_at: '2026-04-06T02:35:00.000Z',
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: 'Investigating provider-worker EVENT provenance.',
            recorded_at: '2026-04-06T02:35:30.000Z',
            source: 'session_log_hydration',
            turn_id: 'turn-2',
            session_id: 'thread-1-turn-2'
          },
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:30.000Z'
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry.event_source).toBe('canonical_session_log_hydration');
    expect(runningEntry.event_candidates).toEqual([
      {
        source: 'canonical_session_log_hydration',
        event: 'agent_message',
        summary: 'Investigating provider-worker EVENT provenance.',
        message_recorded_at: '2026-04-06T02:35:30.000Z',
        source_updated_at: '2026-04-06T02:35:30.000Z',
        derived: false,
        accepted: true,
        rejection_reason: null
      }
    ]);
  });

  it('keeps proof-origin event candidates self-contained when proof wins on message alone', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'running',
        displayStatus: 'Running',
        summary: 'Provider worker turn is active.',
        latestEvent: {
          event: 'running',
          message: null,
          at: '2026-04-06T02:34:00.000Z',
          source: 'child_stream_summary',
          messageRecordedAt: '2026-04-06T02:34:00.000Z',
          sourceUpdatedAt: '2026-04-06T02:34:00.000Z',
          candidates: [],
          requestedBy: null,
          reason: null
        },
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: null,
          last_message: null,
          last_event_at: null,
          current_turn_activity: {
            event: null,
            message_or_payload: 'Investigating provider-worker EVENT provenance.',
            recorded_at: '2026-04-06T02:35:30.000Z',
            source: 'stdout_jsonl',
            turn_id: 'turn-2',
            session_id: 'thread-1-turn-2'
          },
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:30.000Z'
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry.last_event).toBe('running');
    expect(runningEntry.last_message).toBe('Investigating provider-worker EVENT provenance.');
    expect(runningEntry.event_candidates).toEqual([
      {
        source: 'canonical_stdout_jsonl',
        event: null,
        summary: 'Investigating provider-worker EVENT provenance.',
        message_recorded_at: '2026-04-06T02:35:30.000Z',
        source_updated_at: '2026-04-06T02:35:30.000Z',
        derived: false,
        accepted: true,
        rejection_reason: null
      }
    ]);
  });

  it('keeps message_recorded_at aligned with the source of the displayed message', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'running',
        displayStatus: 'Running',
        summary: 'Provider worker turn is active.',
        latestEvent: {
          event: 'running',
          message: 'docs-review failed at docs:freshness after spec-guard passed',
          at: '2026-04-06T02:34:00.000Z',
          source: 'child_stream_summary',
          messageRecordedAt: '2026-04-06T02:34:00.000Z',
          sourceUpdatedAt: '2026-04-06T02:34:00.000Z',
          candidates: [],
          requestedBy: null,
          reason: null
        },
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: null,
          last_message: null,
          last_event_at: null,
          current_turn_activity: {
            event: 'agent_message',
            message_or_payload: null,
            recorded_at: '2026-04-06T02:35:30.000Z',
            source: 'stdout_jsonl',
            turn_id: 'turn-2',
            session_id: 'thread-1-turn-2'
          },
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:30.000Z'
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry).toMatchObject({
      last_event: 'agent_message',
      last_message: 'docs-review failed at docs:freshness after spec-guard passed',
      message_recorded_at: '2026-04-06T02:34:00.000Z',
      source_updated_at: '2026-04-06T02:35:30.000Z'
    });
    expect(runningEntry.event_candidates).toEqual([
      {
        source: 'canonical_stdout_jsonl',
        event: 'agent_message',
        summary: null,
        message_recorded_at: null,
        source_updated_at: '2026-04-06T02:35:30.000Z',
        derived: false,
        accepted: true,
        rejection_reason: null
      }
    ]);
  });

  it('keeps latest-message freshness null when the latest source has no explicit message timestamp', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'running',
        displayStatus: 'Running',
        summary: 'Provider worker turn is active.',
        latestEvent: {
          event: 'turn_running',
          message: 'Provider worker turn is active.',
          at: '2026-04-06T02:35:30.000Z',
          source: 'provider_debug_snapshot',
          messageRecordedAt: null,
          sourceUpdatedAt: '2026-04-06T02:35:30.000Z',
          candidates: [],
          requestedBy: null,
          reason: null
        }
      })
    );

    expect(runningEntry).toMatchObject({
      last_event: 'turn_running',
      last_message: 'Provider worker turn is active.',
      event_source: 'provider_debug_snapshot',
      message_recorded_at: null,
      source_updated_at: '2026-04-06T02:35:30.000Z'
    });
  });

  it('does not reuse legacy proof last_event_at as message freshness when legacy proof wins', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'running',
        displayStatus: 'Running',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'thread-1-turn-2',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'turn_started',
          last_message: 'Investigating provider-worker EVENT provenance.',
          last_event_at: '2026-04-06T02:35:30.000Z',
          current_turn_activity: null,
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'turn_running',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:30.000Z'
        } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>
      })
    );

    expect(runningEntry).toMatchObject({
      last_event: 'turn_started',
      last_message: 'Investigating provider-worker EVENT provenance.',
      event_source: 'legacy_proof_fields',
      message_recorded_at: null,
      source_updated_at: '2026-04-06T02:35:30.000Z'
    });
    expect(runningEntry.event_candidates).toEqual([
      {
        source: 'legacy_proof_fields',
        event: 'turn_started',
        summary: 'Investigating provider-worker EVENT provenance.',
        message_recorded_at: null,
        source_updated_at: '2026-04-06T02:35:30.000Z',
        derived: false,
        accepted: true,
        rejection_reason: null
      }
    ]);
  });

  it('prefers the source with newer semantic progress even when its displayed summary is older', () => {
    const fresherSemanticSource = buildCompatibilitySource({
      issueId: 'issue-100',
      runId: 'run-with-summary-age',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'Provider worker turn is active.',
      latestEvent: {
        event: 'turn_running',
        message: 'docs-review failed at docs:freshness after spec-guard passed',
        at: '2026-04-06T02:34:00.000Z',
        requestedBy: null,
        reason: null
      },
      providerDebugSnapshot: {
        progress: {
          kind: 'worker',
          phase: 'turn_running',
          summary: 'docs-review failed at docs:freshness after spec-guard passed',
          summary_recorded_at: '2026-04-06T02:34:00.000Z',
          status: 'progressing',
          last_semantic_progress_at: '2026-04-06T02:35:00.000Z',
          stall_reason: null,
          recovery_recommendation: 'continue_waiting',
          stall_classification: 'progressing'
        },
        last_semantic_progress_at: '2026-04-06T02:35:00.000Z'
      } as NonNullable<ControlCompatibilitySourceContext['providerDebugSnapshot']>
    });
    const newerSummaryTimestampSource = buildCompatibilitySource({
      issueId: 'issue-100',
      runId: 'run-with-newer-summary-age',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'A sibling source emitted a newer generic row.',
      latestEvent: {
        event: 'turn_running',
        message: 'A sibling source emitted a newer generic row.',
        at: '2026-04-06T02:34:30.000Z',
        requestedBy: null,
        reason: null
      },
      updatedAt: '2026-04-06T02:34:30.000Z'
    });
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(fresherSemanticSource),
      running: [newerSummaryTimestampSource, fresherSemanticSource]
    });

    expect(projection.running[0]).toMatchObject({
      issue_id: 'issue-100',
      last_message: 'docs-review failed at docs:freshness after spec-guard passed',
      display_event: 'docs-review failed at docs:freshness after spec-guard passed',
      last_event_at: '2026-04-06T02:34:00.000Z'
    });
  });

  it('does not assign shared Linear polling ownership when no tracked Linear issue exists', () => {
    const source = buildCompatibilitySource({
      issueProvider: 'local',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'Provider worker turn is active.'
    });
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(source),
      running: [source],
      polling: buildExhaustedLinearPolling()
    });

    expect(projection.running[0]?.display_event).not.toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('does not fall back to issueIdentifier when the tracked Linear owner issueId mismatches the running row', () => {
    const selected = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: 'issue-owner',
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      tracked: {
        linear: {
          id: 'issue-owner',
          identifier: 'CO-100'
        } as NonNullable<ControlCompatibilitySourceContext['tracked']>['linear']
      }
    });
    const runningSource = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: 'issue-sibling',
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'Provider worker turn is active.'
    });
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(selected),
      running: [runningSource],
      polling: buildExhaustedLinearPolling()
    });

    expect(projection.running[0]?.issue_id).toBe('issue-sibling');
    expect(projection.running[0]?.display_event).not.toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('falls back to issueIdentifier when the tracked Linear owner has an issueId but the running row is legacy id-less', () => {
    const selected = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: 'issue-owner',
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      tracked: {
        linear: {
          id: 'issue-owner',
          identifier: 'CO-100'
        } as NonNullable<ControlCompatibilitySourceContext['tracked']>['linear']
      }
    });
    const runningSource = buildCompatibilitySource({
      issueProvider: 'linear',
      issueId: null,
      issueIdentifier: 'CO-100',
      rawStatus: 'in_progress',
      displayStatus: 'In Progress',
      summary: 'Provider worker turn is active.'
    });
    const projection = buildCompatibilityProjectionSnapshot({
      ...buildCompatibilityRuntime(selected),
      running: [runningSource],
      polling: buildExhaustedLinearPolling()
    });

    expect(projection.running[0]?.issue_id).toBeNull();
    expect(projection.running[0]?.display_event).toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('prefers the projected next refresh countdown over stale raw scheduled polling for requests exhaustion', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.'
      }),
      {
        ...buildExhaustedLinearPolling(),
        next_poll_in_ms: (58 * 60 + 11) * 1000,
        next_refresh_state: 'cooldown',
        next_refresh_at: '2026-04-06T03:04:32.000Z',
        next_refresh_in_ms: (29 * 60 + 32) * 1000
      }
    );

    expect(runningEntry.display_event).toBe(
      'linear requests exhausted; next tracked-issue refresh at 29m 32s'
    );
  });

  it('uses the projected next refresh countdown for complexity exhaustion when available', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.'
      }),
      {
        ...buildExhaustedLinearPolling(),
        next_refresh_state: 'cooldown',
        next_refresh_at: '2026-04-06T03:04:32.000Z',
        next_refresh_in_ms: (29 * 60 + 32) * 1000,
        linear_budget: {
          ...buildExhaustedLinearPolling()!.linear_budget!,
          requests: {
            remaining: 7,
            limit: 30,
            reset_at: '2026-04-06T02:40:00.000Z'
          },
          complexity: {
            remaining: 0,
            limit: 200,
            reset_at: '2026-04-06T03:04:32.000Z'
          }
        }
      }
    );

    expect(runningEntry.display_event).toBe(
      'linear complexity budget exhausted; next tracked-issue refresh at 29m 32s'
    );
  });

  it('falls back to retry_after_seconds instead of stale raw scheduling when projected state exists without a countdown', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.'
      }),
      {
        ...buildExhaustedLinearPolling(),
        next_poll_in_ms: (58 * 60 + 11) * 1000,
        next_refresh_state: 'cooldown',
        next_refresh_at: '2026-04-06T03:04:32.000Z',
        next_refresh_in_ms: null
      }
    );

    expect(runningEntry.display_event).toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('prefers retry_after_seconds over legacy next_poll_in_ms when projection fields are absent', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.'
      }),
      {
        ...buildExhaustedLinearPolling(),
        next_poll_in_ms: (58 * 60 + 11) * 1000,
        next_refresh_at: null,
        next_refresh_in_ms: null
      }
    );

    expect(runningEntry.display_event).toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('prefers the authoritative proof retry-after over a stale polling projection', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'session-3',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'linear requests exhausted; polling deferred until reset',
          last_message: null,
          last_event_at: '2026-04-06T02:35:43.000Z',
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'worker_turn',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          linear_budget: {
            ...buildExhaustedLinearPolling()!.linear_budget!,
            observed_at: '2026-04-06T02:35:43.000Z',
            source: 'provider-linear-worker-proof',
            retry_after_seconds: 43
          },
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:43.000Z'
        }
      }),
      {
        ...buildExhaustedLinearPolling(),
        next_refresh_state: 'cooldown',
        next_refresh_at: '2026-04-06T03:04:32.000Z',
        next_refresh_in_ms: (29 * 60 + 32) * 1000,
        linear_budget: {
          ...buildExhaustedLinearPolling()!.linear_budget!,
          observed_at: '2026-04-06T02:35:00.000Z',
          retry_after_seconds: (29 * 60) + 32
        }
      }
    );

    expect(runningEntry.display_event).toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('keeps projected shared polling exhaustion visible during cooldown despite stale checking and endpoint-only proof exhaustion', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'session-3',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'account/ratelimits/updated',
          last_message: 'rate limits updated',
          last_event_at: '2026-04-06T02:35:43.000Z',
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'worker_turn',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          linear_budget: {
            ...buildExhaustedLinearPolling()!.linear_budget!,
            observed_at: '2026-04-06T02:35:43.000Z',
            source: 'provider-linear-worker-proof',
            suppression: 'none',
            suppression_reason: null,
            retry_after_seconds: null,
            cooldown_until: null,
            cooldown_active: false,
            requests: {
              remaining: 8,
              limit: 30,
              reset_at: '2026-04-06T02:36:13.000Z'
            },
            endpoint_requests: {
              remaining: 0,
              limit: 12,
              reset_at: '2026-04-06T02:35:44.000Z'
            }
          },
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:43.000Z'
        }
      }),
      {
        ...buildExhaustedLinearPolling(),
        checking: true,
        next_refresh_state: 'cooldown',
        next_refresh_at: '2026-04-06T02:35:43.000Z',
        next_refresh_in_ms: 43_000
      }
    );

    expect(runningEntry.display_event).toBe(
      'linear requests exhausted; next tracked-issue refresh at 43s'
    );
  });

  it('drops polling exhaustion once the shared cooldown has transitioned into a real poll attempt', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.',
        providerLinearWorkerProof: {
          issue_id: 'issue-100',
          issue_identifier: 'CO-100',
          pid: '123',
          thread_id: 'thread-1',
          latest_turn_id: 'turn-2',
          latest_session_id: 'session-3',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 2,
          last_event: 'account/ratelimits/updated',
          last_message: 'rate limits updated',
          last_event_at: '2026-04-06T02:35:44.000Z',
          tokens: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          },
          rate_limits: null,
          owner_phase: 'worker_turn',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/co-100',
          linear_audit: null,
          progress: null,
          linear_budget: {
            ...buildExhaustedLinearPolling()!.linear_budget!,
            observed_at: '2026-04-06T02:35:44.000Z',
            source: 'provider-linear-worker-proof',
            suppression: 'none',
            suppression_reason: null,
            retry_after_seconds: null,
            cooldown_until: null,
            cooldown_active: false,
            requests: {
              remaining: 8,
              limit: 30,
              reset_at: '2026-04-06T02:36:14.000Z'
            }
          },
          tracked_issue_error: null,
          end_reason: null,
          updated_at: '2026-04-06T02:35:44.000Z'
        }
      }),
      {
        ...buildExhaustedLinearPolling(),
        checking: true,
        next_refresh_state: 'checking',
        next_refresh_at: null,
        next_refresh_in_ms: null
      }
    );

    expect(runningEntry.display_event).toBe('rate limits updated');
  });

  it('drops polling exhaustion once the projected state has moved to an ordinary scheduled poll', () => {
    const runningEntry = buildCompatibilityRunningEntry(
      buildCompatibilitySource({
        rawStatus: 'in_progress',
        displayStatus: 'In Progress',
        summary: 'Provider worker turn is active.'
      }),
      {
        ...buildExhaustedLinearPolling(),
        next_refresh_state: 'scheduled',
        next_refresh_at: '2026-04-06T02:35:43.000Z',
        next_refresh_in_ms: 43_000
      }
    );

    expect(runningEntry.display_event).toBeNull();
  });
});
