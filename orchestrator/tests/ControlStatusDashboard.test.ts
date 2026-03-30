import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ControlRuntime } from '../src/cli/control/controlRuntime.js';
import type { OperatorDashboardDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import {
  renderControlStatusFrame,
  shouldEnableControlStatusDashboard,
  startControlStatusDashboard
} from '../src/cli/control/controlStatusDashboard.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function buildDataset(overrides: Partial<OperatorDashboardDataset> = {}): OperatorDashboardDataset {
  return {
    generated_at: '2026-03-30T01:15:00.000Z',
    mode: 'operator_dashboard',
    read_only: true,
    host: 'co-control-host',
    counts: {
      running: 1,
      retrying: 1,
      issues: 2
    },
    totals: {
      input_tokens: 100,
      output_tokens: 117,
      total_tokens: 217,
      seconds_running: 912.5
    },
    rate_limits: {
      reset_seconds: 42,
      rpm_remaining: 19
    },
    polling: {
      enabled: true,
      interval_ms: 15000,
      checking: false,
      queued: false,
      last_mode: 'poll',
      last_requested_at: '2026-03-30T01:14:50.000Z',
      last_completed_at: '2026-03-30T01:14:51.000Z',
      last_success_at: '2026-03-30T01:14:51.000Z',
      last_error_at: null,
      last_error: null,
      next_poll_at: '2026-03-30T01:15:06.000Z',
      next_poll_in_ms: 15000
    },
    selected_issue_identifier: 'CO-26',
    selected: null,
    running: [
      {
        issue_identifier: 'CO-26',
        issue_id: 'issue-26',
        task_id: 'linear-a861',
        run_id: 'run-26',
        display_state: 'running',
        status_reason: null,
        session_id: 'session-26',
        thread_id: 'thread-26',
        turn_count: 4,
        workspace_path: '/repo/.workspaces/linear-a861',
        host: 'co-control-host',
        last_event: 'turn_started',
        last_message: 'Worker turn active',
        started_at: '2026-03-30T01:00:00.000Z',
        last_event_at: '2026-03-30T01:14:59.000Z',
        tokens: {
          input_tokens: 100,
          output_tokens: 117,
          total_tokens: 217
        }
      }
    ],
    retrying: [
      {
        issue_identifier: 'CO-27',
        issue_id: 'issue-27',
        task_id: 'linear-b27',
        run_id: 'run-27',
        display_state: 'retrying',
        status_reason: 'rate_limited',
        session_id: 'session-27',
        thread_id: 'thread-27',
        turn_count: 2,
        workspace_path: '/repo/.workspaces/linear-b27',
        host: 'co-control-host',
        attempt: 2,
        due_at: '2026-03-30T01:16:00.000Z',
        error: 'rate limit exceeded',
        last_event: 'retry_scheduled',
        last_message: 'Retry queued',
        started_at: '2026-03-30T01:10:00.000Z',
        last_event_at: '2026-03-30T01:14:40.000Z'
      }
    ],
    issues: [
      {
        issue_identifier: 'CO-26',
        issue_id: 'issue-26',
        task_id: 'linear-a861',
        run_id: 'run-26',
        status: 'running',
        raw_status: 'in_progress',
        display_status: 'running',
        status_reason: null,
        title: 'Add terminal observability dashboard as CO STATUS',
        url: 'https://linear.app/asabeko/issue/CO-26',
        workspace: {
          path: '/repo/.workspaces/linear-a861',
          host: 'co-control-host'
        },
        session: {
          session_id: 'session-26',
          thread_id: 'thread-26',
          turn_count: 4
        },
        owner: {
          phase: 'active',
          status: 'running'
        },
        tokens: {
          input_tokens: 100,
          output_tokens: 117,
          total_tokens: 217
        },
        rate_limits: {
          reset_seconds: 42
        },
        summary: 'Terminal dashboard renderer in progress',
        last_error: null,
        latest_event: {
          at: '2026-03-30T01:14:59.000Z',
          event: 'turn_started',
          message: 'Worker turn active'
        },
        recent_agent_activity: [],
        linear_activity: [],
        running: null,
        retry: null,
        attempts: [],
        tracked: null,
        provider_linear_worker_proof: {
          issue_id: 'issue-26',
          issue_identifier: 'CO-26',
          thread_id: 'thread-26',
          latest_turn_id: 'turn-26',
          latest_session_id: 'session-26',
          latest_session_id_source: 'derived_from_thread_and_turn',
          turn_count: 4,
          last_event: 'turn_started',
          last_message: 'Worker turn active',
          last_event_at: '2026-03-30T01:14:59.000Z',
          tokens: {
            input_tokens: 100,
            output_tokens: 117,
            total_tokens: 217
          },
          rate_limits: {
            reset_seconds: 42
          },
          owner_phase: 'active',
          owner_status: 'in_progress',
          workspace_path: '/repo/.workspaces/linear-a861',
          source_setup: null,
          linear_audit: null,
          child_streams: [],
          end_reason: null,
          updated_at: '2026-03-30T01:14:59.000Z'
        },
        is_selected: true
      },
      {
        issue_identifier: 'CO-27',
        issue_id: 'issue-27',
        task_id: 'linear-b27',
        run_id: 'run-27',
        status: 'retrying',
        raw_status: 'retrying',
        display_status: 'retrying',
        status_reason: 'rate_limited',
        title: 'Retry queue sample',
        url: 'https://linear.app/asabeko/issue/CO-27',
        workspace: {
          path: '/repo/.workspaces/linear-b27',
          host: 'co-control-host'
        },
        session: {
          session_id: 'session-27',
          thread_id: 'thread-27',
          turn_count: 2
        },
        owner: {
          phase: 'paused',
          status: 'failed'
        },
        tokens: null,
        rate_limits: null,
        summary: 'Waiting for retry backoff',
        last_error: 'rate limit exceeded',
        latest_event: {
          at: '2026-03-30T01:14:40.000Z',
          event: 'retry_scheduled',
          message: 'Retry queued'
        },
        recent_agent_activity: [],
        linear_activity: [],
        running: null,
        retry: {
          issue_identifier: 'CO-27',
          issue_id: 'issue-27',
          display_state: 'retrying',
          status_reason: 'rate_limited',
          task_id: 'linear-b27',
          run_id: 'run-27',
          attempt: 2,
          due_at: '2026-03-30T01:16:00.000Z',
          error: 'rate limit exceeded',
          session_id: 'session-27',
          thread_id: 'thread-27',
          turn_count: 2,
          workspace_path: '/repo/.workspaces/linear-b27',
          last_event: 'retry_scheduled',
          last_message: 'Retry queued',
          started_at: '2026-03-30T01:10:00.000Z',
          last_event_at: '2026-03-30T01:14:40.000Z'
        },
        attempts: [],
        tracked: null,
        provider_linear_worker_proof: null,
        is_selected: false
      }
    ],
    ...overrides
  };
}

describe('control status dashboard', () => {
  it('renders the CO STATUS frame with summary, queue, and issue sections', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset(),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker'
    });

    expect(frame).toContain('CO STATUS');
    expect(frame).toContain('Summary: running=1 retrying=1 issues=2 tokens=217 runtime=15m12s');
    expect(frame).toContain('Rate limits: reset_seconds=42 | rpm_remaining=19');
    expect(frame).toContain('RUNNING SESSIONS');
    expect(frame).toContain('CO-26 | running | session=session-26');
    expect(frame).toContain('RETRY / BACKOFF');
    expect(frame).toContain('CO-27 | retrying | attempt=2');
    expect(frame).toContain('ISSUES');
    expect(frame).toContain('* CO-26 | state=running | owner=active/running');
    expect(frame).toContain('retry=attempt=2 due=2026-03-30T01:16:00.000Z status=retrying | last_error=rate limit exceeded');
  });

  it('renders empty sections cleanly', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        counts: { running: 0, retrying: 0, issues: 0 },
        running: [],
        retrying: [],
        issues: []
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker'
    });

    expect(frame).toContain('RUNNING SESSIONS\n(none)');
    expect(frame).toContain('RETRY / BACKOFF\n(none)');
    expect(frame).toContain('ISSUES\n(none)');
  });

  it('sanitizes terminal control characters before rendering issue text fields', () => {
    const dataset = buildDataset();
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        generated_at: '2026-03-30T01:15:00.000Z\u001b[31m unsafe',
        host: 'co-control-host\u0007bell',
        issues: dataset.issues.map((issue, index) =>
          index === 0
            ? {
                ...issue,
                issue_identifier: 'CO-26\u001b[31m',
                display_status: 'running\u001b[2J',
                workspace: {
                  ...issue.workspace,
                  host: 'co-control-host\u001b[31m'
                },
                summary: 'unsafe\n\u001b]8;;https://example.com\u0007link\u001b]8;;\u0007',
                last_error: 'oops\u001b[31mred',
                latest_event: {
                  ...(issue.latest_event ?? {
                    at: '2026-03-30T01:14:59.000Z',
                    event: 'turn_started',
                    message: null
                  }),
                  message: 'message\u001b[2Jwipe'
                }
              }
            : issue
        )
      }),
      baseUrl: 'http://127.0.0.1:4100\u001b[2J',
      taskId: 'local\u0007mcp',
      runId: 'control\u001b[31mhost',
      runDir: '/repo/.runs/local-mcp/\u001b[2Jcontrol-host',
      startPipelineId: 'provider\u001b[31m-linear-worker'
    });

    expect(frame).not.toContain('\u001b');
    expect(frame).not.toContain('\u0007');
    expect(frame).toContain('Generated: 2026-03-30T01:15:00.000Z unsafe | Mode: read-only | Host: co-control-host bell');
    expect(frame).toContain('Control: http://127.0.0.1:4100 | Task: local mcp | Run: control host | Start pipeline: provider -linear-worker');
    expect(frame).toContain('Run dir: /repo/.runs/local-mcp/ control-host');
    expect(frame).toContain('* CO-26 | state=running | owner=active/running | session=session-26 thread=thread-26 turns=4 | workspace=/repo/.workspaces/linear-a861 | host=co-control-host');
    expect(frame).toContain('last_error=oops red');
    expect(frame).toContain('latest=turn_started | 2026-03-30T01:14:59.000Z | message wipe');
    expect(frame).toContain('summary=unsafe link');
  });

  it('enables the dashboard only for text-mode tty output', () => {
    expect(
      shouldEnableControlStatusDashboard({
        format: 'text',
        stdoutIsTTY: true,
        stderrIsTTY: true,
        term: 'xterm-256color',
        env: {}
      })
    ).toBe(true);

    expect(
      shouldEnableControlStatusDashboard({
        format: 'json',
        stdoutIsTTY: true,
        stderrIsTTY: true,
        term: 'xterm-256color',
        env: {}
      })
    ).toBe(false);

    expect(
      shouldEnableControlStatusDashboard({
        format: 'text',
        stdoutIsTTY: false,
        stderrIsTTY: true,
        term: 'xterm-256color',
        env: {}
      })
    ).toBe(false);
  });

  it('ignores inherited CI markers when both terminal streams are interactive', () => {
    expect(
      shouldEnableControlStatusDashboard({
        format: 'text',
        stdoutIsTTY: true,
        stderrIsTTY: true,
        term: 'xterm-256color',
        env: {
          CI: 'true'
        }
      })
    ).toBe(true);
  });

  it('requests a fresh runtime snapshot on timer ticks while using runtime subscriptions for event rerenders', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let listener: (() => void) | null = null;
    const requestRefresh = vi.fn(async () => undefined);
    const subscribe = vi.fn((input: () => void) => {
      listener = input;
      return () => {
        listener = null;
      };
    });
    const runtime = {
      requestRefresh,
      subscribe,
      snapshot: vi.fn(() => ({
        readCompatibilityProjection: vi.fn(async () => {
          throw new Error('unexpected readCompatibilityProjection call in test');
        })
      }))
    } as unknown as ControlRuntime;

    const handle = startControlStatusDashboard(
      {
        runtime,
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'provider-linear-worker',
        refreshIntervalMs: 1000,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          }
        }
      },
      {
        readDataset: async () => buildDataset(),
        // Uses the mocked timer functions installed by vi.useFakeTimers().
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(writes[0]).toContain('\u001b[H\u001b[2JCO STATUS');

    listener?.();
    await handle.flush();
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();
    expect(requestRefresh).toHaveBeenCalledTimes(2);
    expect(writes).toHaveLength(3);

    handle.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(requestRefresh).toHaveBeenCalledTimes(2);
  });

  it('does not queue follow-up renders after stop when a render is already in flight', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let listener: (() => void) | null = null;
    let resolveDataset: ((value: OperatorDashboardDataset) => void) | null = null;
    let signalDatasetStarted: (() => void) | null = null;
    const datasetStarted = new Promise<void>((resolve) => {
      signalDatasetStarted = resolve;
    });
    const requestRefresh = vi.fn(async () => undefined);
    const subscribe = vi.fn((input: () => void) => {
      listener = input;
      return () => {
        listener = null;
      };
    });
    const runtime = {
      requestRefresh,
      subscribe,
      snapshot: vi.fn(() => ({
        readCompatibilityProjection: vi.fn(async () => {
          throw new Error('unexpected readCompatibilityProjection call in test');
        })
      }))
    } as unknown as ControlRuntime;
    const readDataset = vi.fn(
      async () => {
        signalDatasetStarted?.();
        return await new Promise<OperatorDashboardDataset>((resolve) => {
          resolveDataset = resolve;
        });
      }
    );

    const handle = startControlStatusDashboard(
      {
        runtime,
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'provider-linear-worker',
        refreshIntervalMs: 1000,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          }
        }
      },
      {
        readDataset,
        // Uses the mocked timer functions installed by vi.useFakeTimers().
        setTimeout,
        clearTimeout
      }
    );

    await datasetStarted;
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(readDataset).toHaveBeenCalledTimes(1);

    listener?.();
    handle.stop();
    resolveDataset?.(buildDataset());

    await handle.flush();
    await vi.advanceTimersByTimeAsync(5000);

    expect(readDataset).toHaveBeenCalledTimes(1);
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(0);
  });
});
