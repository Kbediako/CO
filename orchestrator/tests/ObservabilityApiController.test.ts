import http from 'node:http';

import { describe, expect, it } from 'vitest';

import { buildCompatibilityProjectionSnapshot } from '../src/cli/control/compatibilityIssuePresenter.js';
import {
  handleObservabilityApiRequest,
  resolveObservabilityApiRoute
} from '../src/cli/control/observabilityApiController.js';
import type { ControlState } from '../src/cli/control/controlState.js';
import type { ControlCompatibilitySourceContext } from '../src/cli/control/observabilityReadModel.js';
import type { ProviderLinearWorkerChildLaneRecord } from '../src/cli/providerLinearWorkerRunner.js';

const CONTROL_STATE: ControlState = {
  run_id: 'run-1',
  control_seq: 0,
  latest_action: null,
  history: [],
  pending_confirmation: null,
  queued_questions: null,
  question_events: [],
  sessions: null,
  transport_idempotency: null,
  provider_traces: null
};

function createResponseRecorder() {
  const state: {
    statusCode: number | null;
    headers: Record<string, string> | null;
    body: unknown;
  } = {
    statusCode: null,
    headers: null,
    body: null
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = headers;
      return this;
    },
    end(payload?: string) {
      state.body = payload ? JSON.parse(payload) : null;
      return this;
    }
  } as unknown as http.ServerResponse;

  return { res, state };
}

function buildCompatibilitySource(
  issueIdentifier: string,
  overrides: Partial<ControlCompatibilitySourceContext> = {}
): ControlCompatibilitySourceContext {
  return {
    issueIdentifier,
    issueId: `${issueIdentifier}-id`,
    taskId: issueIdentifier,
    runId: `${issueIdentifier}-run`,
    lookupAliases: [issueIdentifier, `${issueIdentifier}-run`],
    rawStatus: 'in_progress',
    displayStatus: 'in_progress',
    statusReason: null,
    startedAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:01:00.000Z',
    completedAt: null,
    summary: `${issueIdentifier} summary`,
    lastError: null,
    latestAction: null,
    latestEvent: {
      at: '2026-03-20T00:01:00.000Z',
      event: 'in_progress',
      message: `${issueIdentifier} summary`,
      requestedBy: null,
      reason: null
    },
    workspacePath: `/tmp/${issueIdentifier}`,
    questionSummary: {
      queuedCount: 0,
      latestQuestion: null
    },
    tracked: null,
    ...overrides
  };
}

describe('ObservabilityApiController', () => {
  it('resolves api routes and reserves dispatch from issue matching', () => {
    expect(resolveObservabilityApiRoute('/ui/data.json')).toEqual({ kind: 'none' });
    expect(resolveObservabilityApiRoute('/api/v1/state')).toEqual({ kind: 'state' });
    expect(resolveObservabilityApiRoute('/api/v1/refresh')).toEqual({ kind: 'refresh' });
    expect(resolveObservabilityApiRoute('/api/v1/dispatch')).toEqual({ kind: 'dispatch' });
    expect(resolveObservabilityApiRoute('/api/v1/%64ispatch')).toEqual({ kind: 'not_found' });
    expect(resolveObservabilityApiRoute('/api/v1/task-1038')).toEqual({
      kind: 'issue',
      issueIdentifier: 'task-1038'
    });
  });

  it('returns method-not-allowed envelopes for state POST requests', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleObservabilityApiRequest({
      req: {
        method: 'POST',
        url: '/api/v1/state'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1038/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1038/cli/run-1',
          logPath: '/repo/.runs/task-1038/cli/run-1/log.txt'
        },
        readCompatibilityProjection: async () => ({
          running: [],
          retrying: [],
          codexTotals: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            seconds_running: 0
          },
          rateLimits: null,
          selected: null,
          dispatchPilot: null,
          tracked: null
        })
      },
      readRequestBody: async () => ({}),
      requestRefresh: async () => ({
        queued: true,
        coalesced: false,
        requested_at: '2026-03-21T15:02:00.000Z',
        operations: ['reconcile']
      }),
      readDispatchEvaluation: async () => ({
        issueIdentifier: null,
        evaluation: {
          summary: {
            status: 'disabled',
            reason: 'pilot_disabled_default_off',
            source_status: 'disabled',
            advisory_only: true,
            source_setup: null
          },
          recommendation: null,
          failure: null
        }
      })
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(405);
    expect(state.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(state.body).toMatchObject({
      error: {
        code: 'method_not_allowed',
        details: {
          surface: 'api_v1',
          allowed_method: 'GET'
        }
      },
      traceability: {
        surface: 'api_v1',
        decision: 'rejected',
        reason: 'method_not_allowed'
      }
    });
  });

  it('synthesizes the refresh acknowledgement when the adapter returns no payload', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleObservabilityApiRequest({
      req: {
        method: 'POST',
        url: '/api/v1/refresh'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1038/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1038/cli/run-1',
          logPath: '/repo/.runs/task-1038/cli/run-1/log.txt'
        },
        readCompatibilityProjection: async () => ({
          running: [],
          retrying: [],
          codexTotals: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            seconds_running: 0
          },
          rateLimits: null,
          selected: null,
          dispatchPilot: null,
          tracked: null
        })
      },
      readRequestBody: async () => ({ action: 'refresh' }),
      requestRefresh: async () => undefined as never,
      readDispatchEvaluation: async () => ({
        issueIdentifier: null,
        evaluation: {
          summary: {
            status: 'disabled',
            reason: 'pilot_disabled_default_off',
            source_status: 'disabled',
            advisory_only: true,
            source_setup: null
          },
          recommendation: null,
          failure: null
        }
      })
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(202);
    expect(state.body).toMatchObject({
      queued: true,
      coalesced: false,
      operations: ['poll', 'reconcile'],
      traceability: {
        decision: 'acknowledged',
        reason: 'refresh_requested',
        requested_action: 'refresh'
      }
    });
    expect((state.body as { requested_at?: string }).requested_at).toBeTruthy();
  });

  it('surfaces provider workflow reload health on the state endpoint', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleObservabilityApiRequest({
      req: {
        method: 'GET',
        url: '/api/v1/state'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1038/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1038/cli/run-1',
          logPath: '/repo/.runs/task-1038/cli/run-1/log.txt'
        },
        readCompatibilityProjection: async () => ({
          running: [],
          retrying: [],
          codexTotals: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            seconds_running: 0
          },
          rateLimits: null,
          selected: null,
          dispatchPilot: null,
          tracked: null,
          providerIntake: null,
          providerWorkflow: {
            status: 'reload_failed',
            pipeline_id: 'provider-linear-worker',
            source_path: '/repo/codex.orchestrator.json',
            snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
            last_reload_attempt_at: '2026-03-24T00:00:00.000Z',
            last_success_at: '2026-03-23T23:59:00.000Z',
            last_error_at: '2026-03-24T00:00:00.000Z',
            last_error: 'Unexpected end of JSON input'
          }
        })
      },
      readRequestBody: async () => ({}),
      requestRefresh: async () => ({
        queued: true,
        coalesced: false,
        requested_at: '2026-03-21T15:02:00.000Z',
        operations: ['reconcile']
      }),
      readDispatchEvaluation: async () => ({
        issueIdentifier: null,
        evaluation: {
          summary: {
            status: 'disabled',
            reason: 'pilot_disabled_default_off',
            source_status: 'disabled',
            advisory_only: true,
            source_setup: null
          },
          recommendation: null,
          failure: null
        }
      })
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({
      provider_workflow: {
        status: 'reload_failed',
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_error: 'Unexpected end of JSON input'
      }
    });
  });

  it('surfaces a healthy provider workflow snapshot on the state endpoint', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleObservabilityApiRequest({
      req: {
        method: 'GET',
        url: '/api/v1/state'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        controlStore: {
          snapshot: () => CONTROL_STATE
        },
        paths: {
          manifestPath: '/repo/.runs/task-1038/cli/run-1/manifest.json',
          runDir: '/repo/.runs/task-1038/cli/run-1',
          logPath: '/repo/.runs/task-1038/cli/run-1/log.txt'
        },
        readCompatibilityProjection: async () => ({
          running: [],
          retrying: [],
          codexTotals: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            seconds_running: 0
          },
          rateLimits: null,
          selected: null,
          dispatchPilot: null,
          tracked: null,
          providerIntake: null,
          providerWorkflow: {
            status: 'ready',
            pipeline_id: 'provider-linear-worker',
            source_path: '/repo/codex.orchestrator.json',
            snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
            last_reload_attempt_at: '2026-03-24T00:00:00.000Z',
            last_success_at: '2026-03-24T00:00:00.000Z',
            last_error_at: null,
            last_error: null
          }
        })
      },
      readRequestBody: async () => ({}),
      requestRefresh: async () => ({
        queued: true,
        coalesced: false,
        requested_at: '2026-03-21T15:02:00.000Z',
        operations: ['reconcile']
      }),
      readDispatchEvaluation: async () => ({
        issueIdentifier: null,
        evaluation: {
          summary: {
            status: 'disabled',
            reason: 'pilot_disabled_default_off',
            source_status: 'disabled',
            advisory_only: true,
            source_setup: null
          },
          recommendation: null,
          failure: null
        }
      })
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({
      provider_workflow: {
        status: 'ready',
        pipeline_id: 'provider-linear-worker',
        source_path: '/repo/codex.orchestrator.json',
        snapshot_path: '/repo/.runs/local-mcp/cli/control-host/provider-workflow.last-known-good.json',
        last_success_at: '2026-03-24T00:00:00.000Z',
        last_error_at: null,
        last_error: null
      }
    });
  });

  it('keeps running counters null without proof and surfaces authoritative retry metadata when present', () => {
    const runningSource = buildCompatibilitySource('task-1311-running', {
      compatibilityState: 'In Progress',
      displayStatus: 'awaiting_input',
      statusReason: 'queued_questions',
      questionSummary: {
        queuedCount: 1,
        latestQuestion: {
          questionId: 'q-1',
          prompt: 'Proceed?',
          urgency: 'high',
          queuedAt: '2026-03-20T00:01:30.000Z'
        }
      }
    });
    const retryingSource = buildCompatibilitySource('task-1311-retrying', {
      rawStatus: 'failed',
      displayStatus: 'failed',
      updatedAt: '2026-03-20T00:02:00.000Z',
      summary: 'retry pending',
      providerRetryState: {
        active: true,
        attempt: 2,
        due_at: '2026-03-20T00:03:00.000Z',
        error: 'retry queued'
      }
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: runningSource,
      running: [runningSource],
      retrying: [retryingSource],
      codexTotals: {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        seconds_running: 60
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null
    });

    expect(projection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-running',
        state: 'In Progress',
        display_state: 'awaiting_input',
        status_reason: 'queued_questions',
        session_id: null,
        turn_count: null,
        tokens: {
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        }
      })
    ]);
    expect(projection.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-retrying',
        state: 'failed',
        session_id: null,
        workspace_path: '/tmp/task-1311-retrying',
        attempt: 2,
        due_at: '2026-03-20T00:03:00.000Z',
        error: 'retry queued'
      })
    ]);
    expect(projection.codexTotals).toEqual({
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      seconds_running: 60
    });
    const retryIssue = projection.issues.find((issue) => issue.issueIdentifier === 'task-1311-retrying');
    expect(projection.issues.find((issue) => issue.issueIdentifier === 'task-1311-running')?.payload.status).toBe(
      'running'
    );
    expect(retryIssue?.payload.status).toBe('retrying');
    expect(retryIssue?.payload.attempts).toEqual({
      restart_count: 1,
      current_retry_attempt: 2
    });
  });

  it('keeps running event telemetry aligned with the authoritative selected event when worker proof is stale', () => {
    const runningSource = buildCompatibilitySource('task-1311-running', {
      compatibilityState: 'In Progress',
      displayStatus: 'awaiting_input',
      statusReason: 'queued_questions',
      updatedAt: '2026-03-20T00:02:00.000Z',
      latestEvent: {
        at: '2026-03-20T00:02:00.000Z',
        event: 'pause',
        message: 'Awaiting operator input',
        requestedBy: 'telegram',
        reason: 'queued_questions'
      },
      providerLinearWorkerProof: {
        issue_id: 'task-1311-running-id',
        issue_identifier: 'task-1311-running',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'task_complete',
        last_message: 'done',
        last_event_at: '2026-03-20T00:01:00.000Z',
        tokens: {
          input_tokens: 12,
          output_tokens: 8,
          total_tokens: 20
        },
        rate_limits: null,
        owner_phase: 'turn_completed',
        owner_status: 'in_progress',
        workspace_path: '/tmp/task-1311-running',
        end_reason: null,
        updated_at: '2026-03-20T00:01:00.000Z'
      }
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: runningSource,
      running: [runningSource],
      retrying: [],
      codexTotals: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
        seconds_running: 120
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null
    });

    expect(projection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-running',
        session_id: 'thread-1-turn-1',
        turn_count: 1,
        last_event: 'pause',
        last_message: 'Awaiting operator input',
        last_event_at: '2026-03-20T00:02:00.000Z',
        tokens: {
          input_tokens: 12,
          output_tokens: 8,
          total_tokens: 20
        }
      })
    ]);
  });

  it('keeps control-action events from being masked by stale proof events', () => {
    const runningSource = buildCompatibilitySource('task-1311-running', {
      compatibilityState: 'In Progress',
      displayStatus: 'paused',
      statusReason: 'control_pause',
      latestAction: 'pause',
      updatedAt: '2026-03-20T00:02:00.000Z',
      summary: 'Awaiting operator input',
      latestEvent: {
        at: '2026-03-20T00:02:00.000Z',
        event: 'pause',
        message: 'Awaiting operator input',
        requestedBy: 'telegram',
        reason: 'control_pause'
      },
      providerLinearWorkerProof: {
        issue_id: 'task-1311-running-id',
        issue_identifier: 'task-1311-running',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'task_complete',
        last_message: 'done',
        last_event_at: '2026-03-20T00:01:00.000Z',
        tokens: {
          input_tokens: 12,
          output_tokens: 8,
          total_tokens: 20
        },
        rate_limits: null,
        owner_phase: 'turn_completed',
        owner_status: 'in_progress',
        workspace_path: '/tmp/task-1311-running',
        end_reason: null,
        updated_at: '2026-03-20T00:01:00.000Z'
      }
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: runningSource,
      running: [runningSource],
      retrying: [],
      codexTotals: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
        seconds_running: 120
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null
    });

    expect(projection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-running',
        last_event: 'pause',
        last_message: 'Awaiting operator input',
        last_event_at: '2026-03-20T00:02:00.000Z'
      })
    ]);
  });

  it('restores proof event precedence after sticky resume actions', () => {
    const runningSource = buildCompatibilitySource('task-1311-running', {
      compatibilityState: 'In Progress',
      displayStatus: 'in_progress',
      statusReason: null,
      latestAction: 'resume',
      updatedAt: '2026-03-20T00:02:00.000Z',
      summary: 'Operator resumed the run',
      latestEvent: {
        at: '2026-03-20T00:02:00.000Z',
        event: 'resume',
        message: 'Operator resumed the run',
        requestedBy: 'telegram',
        reason: 'operator_resume'
      },
      providerLinearWorkerProof: {
        issue_id: 'task-1311-running-id',
        issue_identifier: 'task-1311-running',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'turn.completed',
        last_message: 'Worker resumed and completed a turn',
        last_event_at: '2026-03-20T00:03:00.000Z',
        tokens: {
          input_tokens: 12,
          output_tokens: 8,
          total_tokens: 20
        },
        rate_limits: null,
        owner_phase: 'turn_completed',
        owner_status: 'in_progress',
        workspace_path: '/tmp/task-1311-running',
        end_reason: null,
        updated_at: '2026-03-20T00:03:00.000Z'
      }
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: runningSource,
      running: [runningSource],
      retrying: [],
      codexTotals: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
        seconds_running: 120
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null
    });

    expect(projection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-running',
        last_event: 'turn.completed',
        last_message: 'Worker resumed and completed a turn',
        last_event_at: '2026-03-20T00:03:00.000Z'
      })
    ]);
  });

  it('preserves authoritative message and timestamp when selected and proof share the same event key', () => {
    const runningSource = buildCompatibilitySource('task-1311-running', {
      updatedAt: '2026-03-20T00:02:00.000Z',
      latestEvent: {
        at: '2026-03-20T00:02:00.000Z',
        event: 'turn.completed',
        message: 'Manifest event is newer',
        requestedBy: null,
        reason: null
      },
      providerLinearWorkerProof: {
        issue_id: 'task-1311-running-id',
        issue_identifier: 'task-1311-running',
        thread_id: 'thread-1',
        latest_turn_id: 'turn-1',
        latest_session_id: 'thread-1-turn-1',
        latest_session_id_source: 'derived_from_thread_and_turn',
        turn_count: 1,
        last_event: 'turn.completed',
        last_message: 'Proof event is stale',
        last_event_at: '2026-03-20T00:01:00.000Z',
        tokens: {
          input_tokens: 12,
          output_tokens: 8,
          total_tokens: 20
        },
        rate_limits: null,
        owner_phase: 'turn_completed',
        owner_status: 'in_progress',
        workspace_path: '/tmp/task-1311-running',
        end_reason: null,
        updated_at: '2026-03-20T00:01:00.000Z'
      }
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: runningSource,
      running: [runningSource],
      retrying: [],
      codexTotals: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
        seconds_running: 120
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null
    });

    expect(projection.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'task-1311-running',
        last_event: 'turn.completed',
        last_message: 'Manifest event is newer',
        last_event_at: '2026-03-20T00:02:00.000Z'
      })
    ]);
  });

  it('preserves nested child lane proof details on compatibility issue payloads', () => {
    const childLane: ProviderLinearWorkerChildLaneRecord = {
      stream: 'api-proof',
      pipeline_id: 'provider-linear-child-lane',
      task_id: 'task-1311-running-api-proof',
      run_id: 'child-run-1',
      status: 'succeeded',
      manifest_path: '/tmp/task-1311-running/.runs/task-1311-running-api-proof/cli/child-run-1/manifest.json',
      artifact_root: '/tmp/task-1311-running/.runs/task-1311-running-api-proof/cli/child-run-1',
      log_path: null,
      summary: 'Compatibility projection API proof lane completed',
      issue_id: 'task-1311-running-id',
      issue_identifier: 'task-1311-running',
      workspace_path: '/tmp/task-1311-running',
      source_setup: null,
      launched_at: '2026-03-20T00:01:20.000Z',
      purpose: 'Add observability projection child-lane proof coverage',
      instructions: null,
      scope: {
        files: ['orchestrator/tests/ObservabilityApiController.test.ts'],
        phases: []
      },
      parent_snapshot: {
        base_sha: 'parent-base-sha',
        issue_updated_at: '2026-03-20T00:01:00.000Z',
        issue_state: 'In Progress',
        issue_state_type: 'started',
        captured_at: '2026-03-20T00:01:10.000Z'
      },
      lane_workspace_path: '/tmp/task-1311-running/.child-lanes/api-proof-child-run-1',
      patch_artifact_path:
        '/tmp/task-1311-running/.runs/task-1311-running-api-proof/cli/child-run-1/provider-linear-child-lane.patch',
      patch_bytes: 188,
      decision: 'accepted',
      decision_at: '2026-03-20T00:01:30.000Z',
      decision_reason: 'Parent accepted the API proof lane.'
    };
    const providerLinearWorkerProof = {
      issue_id: 'task-1311-running-id',
      issue_identifier: 'task-1311-running',
      thread_id: 'thread-1',
      latest_turn_id: 'turn-1',
      latest_session_id: 'thread-1-turn-1',
      latest_session_id_source: 'derived_from_thread_and_turn',
      turn_count: 1,
      last_event: 'task_complete',
      last_message: 'done',
      last_event_at: '2026-03-20T00:01:00.000Z',
      tokens: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20
      },
      rate_limits: null,
      owner_phase: 'turn_completed',
      owner_status: 'in_progress',
      workspace_path: '/tmp/task-1311-running',
      linear_audit: null,
      child_streams: [],
      child_lanes: [childLane],
      end_reason: null,
      updated_at: '2026-03-20T00:01:00.000Z'
    } as NonNullable<ControlCompatibilitySourceContext['providerLinearWorkerProof']>;

    const runningSource = buildCompatibilitySource('task-1311-running', {
      compatibilityState: 'In Progress',
      providerLinearWorkerProof
    });

    const projection = buildCompatibilityProjectionSnapshot({
      selected: runningSource,
      running: [runningSource],
      retrying: [],
      codexTotals: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
        seconds_running: 120
      },
      rateLimits: null,
      dispatchPilot: null,
      tracked: null,
      providerIntake: null
    });

    expect(
      projection.issues.find((issue) => issue.issueIdentifier === 'task-1311-running')?.payload
        .provider_linear_worker_proof?.child_lanes
    ).toEqual([
      expect.objectContaining({
        stream: 'api-proof',
        decision: 'accepted',
        scope: {
          files: ['orchestrator/tests/ObservabilityApiController.test.ts'],
          phases: []
        }
      })
    ]);
  });
});
