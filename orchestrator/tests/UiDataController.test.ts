import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { buildUiDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import { readCompatibilityState } from '../src/cli/control/observabilitySurface.js';
import {
  __test__ as uiDataControllerTest,
  handleUiDataRequest
} from '../src/cli/control/uiDataController.js';
import type {
  CompatibilityProjectionIssueRecord,
  ControlCompatibilityProjectionSnapshot
} from '../src/cli/control/observabilityReadModel.js';

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

function buildProjection(
  overrides: Partial<ControlCompatibilityProjectionSnapshot> = {}
): ControlCompatibilityProjectionSnapshot {
  return {
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
    dispatchPilot: null,
    tracked: null,
    providerIntake: null,
    providerWorkflow: null,
    polling: null,
    ...overrides
  };
}

function buildIssueRecord(input: {
  issueIdentifier: string;
  issueId: string | null;
  taskId: string | null;
  runId: string | null;
  aliases: string[];
  summary: string | null;
}): CompatibilityProjectionIssueRecord {
  return {
    issueIdentifier: input.issueIdentifier,
    aliases: input.aliases,
    payload: {
      issue_identifier: input.issueIdentifier,
      issue_id: input.issueId,
      task_id: input.taskId,
      run_id: input.runId,
      status: 'running',
      raw_status: 'in_progress',
      display_status: 'running',
      status_reason: null,
      workspace: {
        path: input.taskId ? `/tmp/${input.taskId}` : null
      },
      attempts: {
        restart_count: null,
        current_retry_attempt: null
      },
      running: null,
      retry: null,
      logs: {
        codex_session_logs: []
      },
      summary: input.summary,
      latest_event: null,
      question_summary: {
        queued_count: 0,
        latest_question: null
      },
      recent_events: [],
      last_error: null,
      tracked: {
        linear: null
      }
    }
  };
}

describe('UiDataController', () => {
  it('returns false and leaves the response untouched for non-ui routes', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'GET',
        url: '/api/v1/state'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readCompatibilityProjection: async () => buildProjection()
      }
    });

    expect(handled).toBe(false);
    expect(state.statusCode).toBeNull();
    expect(state.headers).toBeNull();
    expect(state.body).toBeNull();
  });

  it('returns the ui-specific method-not-allowed envelope for non-GET requests', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'POST',
        url: '/ui/data.json'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readCompatibilityProjection: async () => buildProjection()
      }
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(405);
    expect(state.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(state.body).toMatchObject({
      error: {
        code: 'method_not_allowed',
        details: {
          surface: 'ui',
          route: '/ui/data.json',
          allowed_method: 'GET'
        }
      }
    });
  });

  it('returns the operator-dashboard ui dataset with no-store headers', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'GET',
        url: '/ui/data.json'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readCompatibilityProjection: async () => buildProjection()
      }
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(200);
    expect(state.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    expect(state.body).toMatchObject({
      mode: 'operator_dashboard',
      read_only: true,
      counts: {
        running: 0,
        retrying: 0,
        issues: 0
      },
      running: [],
      retrying: [],
      issues: [],
      selected: null
    });
  });

  it('returns an explicit degraded dashboard when projection reading fails', async () => {
    const { res, state } = createResponseRecorder();
    const handled = await handleUiDataRequest({
      req: {
        method: 'GET',
        url: '/ui/data.json'
      } as Pick<http.IncomingMessage, 'method' | 'url'>,
      res,
      presenterContext: {
        readCompatibilityProjection: async () => {
          throw new Error('compatibility projection unavailable');
        }
      }
    });

    expect(handled).toBe(true);
    expect(state.statusCode).toBe(200);
    expect(state.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    expect(state.body).toMatchObject({
      mode: 'operator_dashboard',
      read_only: true,
      counts: {
        running: 0,
        retrying: 0,
        issues: 0
      },
      dashboard_degraded: {
        reason: 'read_failed',
        source: 'ui_data_controller',
        message: 'compatibility projection unavailable',
        timeout_ms: null
      }
    });
  });

  it('returns an explicit degraded dashboard when projection reading times out', async () => {
    vi.useFakeTimers();
    try {
      const { res, state } = createResponseRecorder();
      const handledPromise = handleUiDataRequest({
        req: {
          method: 'GET',
          url: '/ui/data.json'
        } as Pick<http.IncomingMessage, 'method' | 'url'>,
        res,
        presenterContext: {
          readCompatibilityProjection: async () =>
            await new Promise<ControlCompatibilityProjectionSnapshot>(() => undefined)
        }
      });

      await vi.advanceTimersByTimeAsync(uiDataControllerTest.DEFAULT_UI_DATA_READ_TIMEOUT_MS);

      await expect(handledPromise).resolves.toBe(true);
      expect(state.statusCode).toBe(200);
      expect(state.body).toMatchObject({
        mode: 'operator_dashboard',
        dashboard_degraded: {
          reason: 'read_timeout',
          source: 'ui_data_controller',
          message: `operator dashboard read timed out after ${uiDataControllerTest.DEFAULT_UI_DATA_READ_TIMEOUT_MS}ms`,
          timeout_ms: uiDataControllerTest.DEFAULT_UI_DATA_READ_TIMEOUT_MS
        }
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts the pending dashboard read after a controller timeout', async () => {
    vi.useFakeTimers();
    try {
      const { res, state } = createResponseRecorder();
      let observedSignal: AbortSignal | undefined;
      let abortReason: unknown;
      const handledPromise = handleUiDataRequest({
        req: {
          method: 'GET',
          url: '/ui/data.json'
        } as Pick<http.IncomingMessage, 'method' | 'url'>,
        res,
        presenterContext: {
          readCompatibilityProjection: async (signal?: AbortSignal) => {
            observedSignal = signal;
            return await new Promise<ControlCompatibilityProjectionSnapshot>((_resolve, reject) => {
              signal?.addEventListener(
                'abort',
                () => {
                  abortReason = signal.reason;
                  reject(signal.reason);
                },
                { once: true }
              );
            });
          }
        }
      });

      await vi.advanceTimersByTimeAsync(uiDataControllerTest.DEFAULT_UI_DATA_READ_TIMEOUT_MS);

      await expect(handledPromise).resolves.toBe(true);
      expect(state.statusCode).toBe(200);
      expect(state.body).toMatchObject({
        dashboard_degraded: {
          reason: 'read_timeout'
        }
      });
      expect(observedSignal?.aborted).toBe(true);
      expect(abortReason).toBeInstanceOf(Error);
      expect((abortReason as Error).message).toBe(
        `operator dashboard read timed out after ${uiDataControllerTest.DEFAULT_UI_DATA_READ_TIMEOUT_MS}ms`
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('builds the operator-dashboard dataset directly from the compatibility projection', () => {
    const dataset = buildUiDataset({
      projection: buildProjection({
        polling: {
          enabled: true,
          interval_ms: 15000,
          checking: true,
          queued: false,
          last_mode: 'poll',
          last_requested_at: '2026-03-27T04:06:00.000Z',
          last_completed_at: null,
          last_success_at: null,
          last_error_at: null,
          last_error: null,
          next_poll_at: null,
          next_poll_in_ms: null
        }
      }),
      generatedAt: '2026-03-27T04:07:00.000Z'
    });

    expect(dataset).toMatchObject({
      generated_at: '2026-03-27T04:07:00.000Z',
      mode: 'operator_dashboard',
      polling: {
        enabled: true,
        checking: true,
        last_mode: 'poll'
      }
    });
  });

  it('keeps the operator-dashboard dataset aligned with /api/v1/state for overlapping fields', async () => {
    const projection = buildProjection({
      running: [
        {
          issue_identifier: 'linear-co-76-fallback',
          issue_id: 'issue-76',
          state: 'running',
          display_state: 'running',
          status_reason: null,
          session_id: 'session-76',
          turn_count: 4,
          last_event: 'turn_started',
          last_message: 'Worker turn active',
          started_at: '2026-04-03T08:00:00.000Z',
          last_event_at: '2026-04-03T08:00:30.000Z',
          tokens: {
            input_tokens: 12,
            output_tokens: 8,
            total_tokens: 20
          }
        }
      ],
      retrying: [
        {
          issue_identifier: 'linear-co-77-fallback',
          issue_id: 'issue-77-row',
          task_id: 'linear-co-77',
          run_id: 'run-co-77',
          state: 'retrying',
          display_state: 'retrying',
          status_reason: 'rate_limited',
          session_id: 'session-77',
          thread_id: 'thread-77',
          turn_count: 2,
          workspace_path: '/tmp/co-77',
          attempt: 2,
          due_at: '2026-04-03T08:01:00.000Z',
          error: 'rate limit exceeded',
          last_event: 'retry_scheduled',
          last_message: 'Retry queued',
          started_at: '2026-04-03T07:55:00.000Z',
          last_event_at: '2026-04-03T08:00:40.000Z'
        }
      ],
      issues: [
        buildIssueRecord({
          issueIdentifier: 'CO-76',
          issueId: 'issue-76',
          taskId: 'linear-co-76',
          runId: 'run-1',
          aliases: ['CO-76', 'issue-76', 'linear-co-76-fallback'],
          summary: 'Worker turn active'
        }),
        buildIssueRecord({
          issueIdentifier: 'CO-77',
          issueId: 'issue-77-canonical',
          taskId: 'linear-co-77',
          runId: 'run-co-77',
          aliases: ['CO-77', 'issue-77-canonical', 'linear-co-77-fallback', 'run-co-77'],
          summary: 'Retry queued'
        })
      ],
      codexTotals: {
        input_tokens: 12,
        output_tokens: 8,
        total_tokens: 20,
        seconds_running: 61
      },
      rateLimits: {
        source: 'control-host-polling',
        requests: {
          remaining: 19,
          limit: 30,
          reset_in_seconds: 42
        }
      },
      selected: {
        issue_id: 'issue-76',
        issue_identifier: 'CO-76',
        task_id: 'linear-co-76',
        run_id: 'run-1',
        raw_status: 'in_progress',
        display_status: 'running',
        status_reason: null,
        started_at: '2026-04-03T08:00:00.000Z',
        updated_at: '2026-04-03T08:00:30.000Z',
        completed_at: null,
        summary: 'Worker turn active',
        last_error: null,
        latest_action: null,
        latest_event: {
          event: 'turn_started',
          message: 'Worker turn active',
          at: '2026-04-03T08:00:30.000Z'
        },
        workspace: {
          path: '/tmp/co-76'
        },
        question_summary: {
          queued_count: 0,
          latest_question: null
        },
        tracked: {
          linear: null
        }
      },
      polling: {
        enabled: true,
        interval_ms: 15000,
        checking: false,
        queued: false,
        last_mode: 'poll',
        last_requested_at: '2026-04-03T08:00:00.000Z',
        last_completed_at: '2026-04-03T08:00:01.000Z',
        last_success_at: '2026-04-03T08:00:01.000Z',
        last_error_at: null,
        last_error: null,
        next_poll_at: '2026-04-03T08:00:15.000Z',
        next_poll_in_ms: 15000,
        control_host_owner: {
          status: 'owned',
          reason: null,
          updated_at: '2026-04-03T08:00:00.000Z',
          diagnostic_path: null,
          lock_dir: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.lock',
          owner_path: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.json',
          owner: {
            owner_token: 'owner-token',
            status: 'owned',
            pid: 123,
            ppid: 1,
            hostname: 'host.local',
            acquired_at: '2026-04-03T08:00:00.000Z',
            updated_at: '2026-04-03T08:00:00.000Z',
            released_at: null,
            repo_root: '/repo',
            task_id: 'local-mcp',
            run_id: 'control-host',
            run_dir: '/repo/.runs/local-mcp/cli/control-host',
            pipeline_id: 'provider-linear-worker',
            source_root_freshness: {
              schema_version: 1,
              status: 'warning',
              observed_at: '2026-04-03T08:00:00.000Z',
              intended_repo_root: '/repo',
              intended_repo_root_realpath: '/repo',
              command_path: '/stale/bin/codex-orchestrator.ts',
              command_path_realpath: '/stale/bin/codex-orchestrator.ts',
              package_root: '/stale',
              package_root_realpath: '/stale',
              source_root: '/stale',
              source_root_realpath: '/stale',
              entrypoint_kind: 'source',
              base_ref: 'origin/main',
              source_checkout: null,
              intended_checkout: null,
              drift_classes: ['supervised_source_root_drift'],
              provenance: {
                command_path_source: 'argv',
                package_root_source: 'explicit',
                source_root_source: 'package_root',
                command_path_inside_package: true,
                package_root_matches_intended: false,
                source_root_matches_intended: false,
                source_entry_exists: true,
                dist_entry_exists: true
              },
              guidance: ['Restart or relaunch the supervised control-host from the intended current source root before trusting provider-worker posture.'],
              detail: 'Detected source/root drift: supervised_source_root_drift.'
            },
            lock_dir: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.lock',
            owner_path: '/repo/.runs/local-mcp/cli/control-host/control-host-owner.json'
          }
        }
      }
    });

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-04-03T08:00:05.000Z'
    });
    const state = await readCompatibilityState({
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
      paths: {
        manifestPath: '/repo/.runs/local-mcp/cli/control-host/manifest.json',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        logPath: '/repo/.runs/local-mcp/cli/control-host/runner.ndjson'
      },
      readCompatibilityProjection: async () => projection
    });

    expect(dataset.counts.running).toBe(state.counts.running);
    expect(dataset.counts.retrying).toBe(state.counts.retrying);
    expect(state.running_ids).toEqual(['CO-76']);
    expect(state.retrying_ids).toEqual(['CO-77']);
    expect(dataset.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'linear-co-76-fallback',
        issue_id: 'issue-76',
        id: 'CO-76',
        bucket: 'running',
        state: 'running',
        reason: null,
        aliases: expect.arrayContaining(['CO-76', 'issue-76', 'linear-co-76-fallback'])
      })
    ]);
    expect(dataset.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'linear-co-77-fallback',
        issue_id: 'issue-77-row',
        id: 'CO-77',
        bucket: 'retrying',
        state: 'retrying',
        reason: 'rate_limited',
        aliases: expect.arrayContaining([
          'CO-77',
          'issue-77-canonical',
          'linear-co-77-fallback',
          'issue-77-row',
          'run-co-77'
        ])
      })
    ]);
    expect(
      dataset.running.map((entry) => ({
        issue_identifier: entry.issue_identifier,
        issue_id: entry.issue_id,
        display_state: entry.display_state,
        status_reason: entry.status_reason,
        session_id: entry.session_id,
        turn_count: entry.turn_count,
        last_event: entry.last_event,
        last_message: entry.last_message,
        started_at: entry.started_at,
        last_event_at: entry.last_event_at,
        tokens: entry.tokens
      }))
    ).toEqual(
      state.running.map((entry) => ({
        issue_identifier: entry.issue_identifier,
        issue_id: entry.issue_id,
        display_state: entry.display_state,
        status_reason: entry.status_reason,
        session_id: entry.session_id,
        turn_count: entry.turn_count,
        last_event: entry.last_event,
        last_message: entry.last_message,
        started_at: entry.started_at,
        last_event_at: entry.last_event_at,
        tokens: entry.tokens
      }))
    );
    expect(
      dataset.retrying.map((entry) => ({
        issue_identifier: entry.issue_identifier,
        issue_id: entry.issue_id,
        task_id: entry.task_id,
        run_id: entry.run_id,
        display_state: entry.display_state,
        status_reason: entry.status_reason,
        session_id: entry.session_id,
        thread_id: entry.thread_id,
        turn_count: entry.turn_count,
        workspace_path: entry.workspace_path,
        attempt: entry.attempt,
        due_at: entry.due_at,
        error: entry.error,
        last_event: entry.last_event,
        last_message: entry.last_message,
        started_at: entry.started_at,
        last_event_at: entry.last_event_at
      }))
    ).toEqual(
      state.retrying.map((entry) => ({
        issue_identifier: entry.issue_identifier,
        issue_id: entry.issue_id,
        task_id: entry.task_id,
        run_id: entry.run_id,
        display_state: entry.display_state,
        status_reason: entry.status_reason,
        session_id: entry.session_id,
        thread_id: entry.thread_id,
        turn_count: entry.turn_count,
        workspace_path: entry.workspace_path,
        attempt: entry.attempt,
        due_at: entry.due_at,
        error: entry.error,
        last_event: entry.last_event,
        last_message: entry.last_message,
        started_at: entry.started_at,
        last_event_at: entry.last_event_at
      }))
    );
    expect(dataset.totals).toEqual(state.codex_totals);
    expect(dataset.rate_limits).toEqual(state.rate_limits);
    expect(dataset.polling).toEqual(state.polling);
    expect(dataset.polling?.control_host_owner?.owner?.source_root_freshness).toMatchObject({
      status: 'warning',
      command_path: '/stale/bin/codex-orchestrator.ts',
      drift_classes: ['supervised_source_root_drift']
    });
    expect(dataset.selected).toEqual(state.selected);
    expect(dataset.selected?.run_id).toBe('run-1');
  });
});
