import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ControlRuntime } from '../src/cli/control/controlRuntime.js';
import type { OperatorDashboardDataset } from '../src/cli/control/operatorDashboardPresenter.js';
import {
  renderControlStatusFrame,
  shouldEnableControlStatusDashboard,
  startControlStatusDashboard
} from '../src/cli/control/controlStatusDashboard.js';

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(0x1b)}(?:\\[[0-?]*[ -/]*[@-~]|[@-Z\\\\-_])`, 'g');
const ANSI_ALT_SCREEN_ENTER = '\u001b[?1049h';
const ANSI_ALT_SCREEN_EXIT = '\u001b[?1049l';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

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
      limit_id: 'gpt-5',
      primary: {
        remaining: 19,
        limit: 30,
        reset_in_seconds: 42
      },
      secondary: {
        remaining: 3,
        limit: 5,
        reset_in_seconds: 7
      },
      credits: {
        balance: 1234.5
      }
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
        tracked: {
          linear: {
            provider: 'linear',
            id: 'issue-26',
            identifier: 'CO-26',
            title: 'Add terminal observability dashboard as CO STATUS',
            url: 'https://linear.app/asabeko/issue/CO-26',
            state: 'In Progress',
            state_type: 'started',
            workspace_id: 'workspace-1',
            team_id: 'team-1',
            team_key: 'CO',
            team_name: 'CO',
            project_id: 'project-1',
            project_name: 'CO Control and Advisory',
            updated_at: '2026-03-30T01:14:59.000Z',
            recent_activity: []
          }
        },
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
    tracked: {
      linear: {
        provider: 'linear',
        id: 'issue-26',
        identifier: 'CO-26',
        title: 'Add terminal observability dashboard as CO STATUS',
        url: 'https://linear.app/asabeko/issue/CO-26',
        state: 'In Progress',
        state_type: 'started',
        workspace_id: 'workspace-1',
        team_id: 'team-1',
        team_key: 'CO',
        team_name: 'CO',
        project_id: 'project-1',
        project_name: 'CO Control and Advisory',
        updated_at: '2026-03-30T01:14:59.000Z',
        recent_activity: []
      }
    },
    ...overrides
  };
}

class MockDashboardInput extends EventEmitter {
  readonly isTTY = true;
  readonly rawModes: boolean[] = [];
  pauseCalls = 0;
  resumeCalls = 0;

  setRawMode(mode: boolean): void {
    this.rawModes.push(mode);
  }

  pause(): void {
    this.pauseCalls += 1;
  }

  resume(): void {
    this.resumeCalls += 1;
  }

  emitText(value: string): void {
    this.emit('data', Buffer.from(value, 'utf8'));
  }
}

describe('control status dashboard', () => {
  it('renders a wide full-frame snapshot with Symphony-style terminal chrome', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset(),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      throughputTps: 1842.7
    });

    expect(frame).toContain('\u001b[1m╭─ CO STATUS\u001b[0m');
    expect(stripAnsi(frame)).toBe([
      '╭─ CO STATUS',
      '│ Agents: 1/2 tracked',
      '│ Throughput: 1,842 tps',
      '│ Runtime: 15m 12s',
      '│ Tokens: in 100 | out 117 | total 217',
      '│ Rate Limits: gpt-5 | primary 19/30 reset 42s | secondary 3/5 reset 7s | credits 1234.50',
      '│ Project: CO Control and Advisory',
      '│ Dashboard: http://127.0.0.1:4100',
      '│ Next refresh: 15s',
      '├─ Running',
      '│',
      '│   ID         STAGE        AGE / TURN   TOKENS     SESSION        EVENT                                                ',
      '│   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────',
      '│ ● CO-26      running      15m 0s / 4          217 session-26     Worker turn active                                   ',
      '│',
      '├─ Backoff queue',
      '│',
      '│  ↻ CO-27 attempt=2 in 60.000s error=rate limit exceeded',
      '│',
      '│ Controls: p freeze live redraw | c compact inspect | s snapshot export',
      '│ Inspect: live | alternate screen | full frame',
      '│ Snapshot: press s to export a stable frame under run dir',
      '╰─'
    ].join('\n'));
  });

  it('renders narrow terminals with an explicit reduced running table and sorted retry queue', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        counts: {
          running: 1,
          retrying: 3,
          issues: 4
        },
        retrying: [
          {
            issue_identifier: 'CO-31',
            issue_id: 'issue-31',
            task_id: 'linear-c31',
            run_id: 'run-31',
            display_state: 'retrying',
            status_reason: 'network',
            session_id: 'session-31',
            thread_id: 'thread-31',
            turn_count: 1,
            workspace_path: '/repo/.workspaces/linear-c31',
            host: 'co-control-host',
            attempt: 4,
            due_at: '2026-03-30T01:15:04.250Z',
            error: 'network timeout',
            last_event: 'retry_scheduled',
            last_message: 'Retry queued',
            started_at: '2026-03-30T01:10:00.000Z',
            last_event_at: '2026-03-30T01:14:40.000Z'
          },
          {
            issue_identifier: 'CO-30',
            issue_id: 'issue-30',
            task_id: 'linear-c30',
            run_id: 'run-30',
            display_state: 'retrying',
            status_reason: 'rate_limited',
            session_id: 'session-30',
            thread_id: 'thread-30',
            turn_count: 1,
            workspace_path: '/repo/.workspaces/linear-c30',
            host: 'co-control-host',
            attempt: 1,
            due_at: '2026-03-30T01:15:01.500Z',
            error: 'error with \\nnewline',
            last_event: 'retry_scheduled',
            last_message: 'Retry queued',
            started_at: '2026-03-30T01:10:00.000Z',
            last_event_at: '2026-03-30T01:14:40.000Z'
          },
          {
            issue_identifier: 'CO-32',
            issue_id: 'issue-32',
            task_id: 'linear-c32',
            run_id: 'run-32',
            display_state: 'retrying',
            status_reason: 'provider_error',
            session_id: 'session-32',
            thread_id: 'thread-32',
            turn_count: 1,
            workspace_path: '/repo/.workspaces/linear-c32',
            host: 'co-control-host',
            attempt: 2,
            due_at: '2026-03-30T01:15:09.000Z',
            error: 'worker crashed\nrestarting cleanly',
            last_event: 'retry_scheduled',
            last_message: 'Retry queued',
            started_at: '2026-03-30T01:10:00.000Z',
            last_event_at: '2026-03-30T01:14:40.000Z'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 84,
      throughputTps: 15.4
    });

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toBe([
      '╭─ CO STATUS',
      '│ Agents: 1/4 tracked',
      '│ Throughput: 15 tps',
      '│ Runtime: 15m 12s',
      '│ Tokens: in 100 | out 117 | total 217',
      '│ Rate Limits: gpt-5 | primary 19/30 reset 42s | secondary 3/5 reset 7s | credits...',
      '│ Project: CO Control and Advisory',
      '│ Dashboard: http://127.0.0.1:4100',
      '│ Next refresh: 15s',
      '├─ Running',
      '│',
      '│   ID        STAGE      TOKENS    EVENT                                            ',
      '│   ────────────────────────────────────────────────────────────────────────────────',
      '│ ● CO-26     running          217 Worker turn active                               ',
      '│',
      '├─ Backoff queue',
      '│',
      '│  ↻ CO-30 attempt=1 in 1.500s error=error with \\nnewline',
      '│  ↻ CO-31 attempt=4 in 4.250s error=network timeout',
      '│  ↻ CO-32 attempt=2 in 9.000s error=worker crashed restarting cleanly',
      '│',
      '│ Controls: p freeze live redraw | c compact inspect | s snapshot export',
      '│ Inspect: live | alternate screen | full frame',
      '│ Snapshot: press s to export a stable frame under run dir',
      '╰─'
    ].join('\n'));
    for (const line of plainFrame.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(84);
    }
  });

  it('clamps retry error text to the available row width on narrow terminals', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        retrying: [
          {
            ...buildDataset().retrying[0],
            error:
              'provider timeout while streaming a very long recovery payload that should not wrap the retry queue row on narrow terminals'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 68,
      throughputTps: 0
    });

    const retryLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.includes('↻ CO-27'));
    expect(retryLine).toBeDefined();
    expect(retryLine).toContain('error=');
    expect(retryLine?.length ?? 0).toBeLessThanOrEqual(68);
  });

  it('renders empty sections cleanly', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        counts: { running: 0, retrying: 0, issues: 0 },
        running: [],
        retrying: [],
        issues: [],
        tracked: { linear: null }
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      throughputTps: 0
    });

    expect(stripAnsi(frame)).toBe([
      '╭─ CO STATUS',
      '│ Agents: 0/0 tracked',
      '│ Throughput: 0 tps',
      '│ Runtime: 15m 12s',
      '│ Tokens: in 100 | out 117 | total 217',
      '│ Rate Limits: gpt-5 | primary 19/30 reset 42s | secondary 3/5 reset 7s | credits 1234.50',
      '│ Project: n/a',
      '│ Dashboard: http://127.0.0.1:4100',
      '│ Next refresh: 15s',
      '├─ Running',
      '│',
      '│   ID         STAGE        AGE / TURN   TOKENS     SESSION        EVENT                                                ',
      '│   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────',
      '│  No active agents',
      '│',
      '├─ Backoff queue',
      '│',
      '│  No queued retries',
      '│',
      '│ Controls: p freeze live redraw | c compact inspect | s snapshot export',
      '│ Inspect: live | alternate screen | full frame',
      '│ Snapshot: press s to export a stable frame under run dir',
      '╰─'
    ].join('\n'));
  });

  it('renders compact inspect mode as a short-terminal summary frame', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset(),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      terminalRows: 10,
      throughputTps: 1842.7,
      paused: true,
      viewMode: 'compact',
      pendingUpdate: true,
      snapshotStatus: 'saved',
      snapshotPath:
        '/repo/.runs/local-mcp/cli/control-host/co-status-snapshots/co-status-20260331T093000Z.txt',
      snapshotMessage: 'saved'
    });

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toBe([
      '╭─ CO STATUS',
      '│ Status: 1/2 tracked | 15m 12s | next 15s',
      '│ Tokens: in 100 | out 117 | total 217',
      '│ Rate Limits: gpt-5 | primary 19/30 reset 42s | secondary 3/5 reset 7s | credits 1234.50',
      '│ Running: CO-26 | running | Worker turn active',
      '│ Retry: CO-27 | in 60.000s | rate limit exceeded',
      '│ Controls: p resume live redraw | c full frame | s snapshot export',
      '│ Inspect: paused | primary snapshot | compact inspect | updates waiting',
      '│ Snapshot: saved | /repo/.runs/local-mcp/cli/control-host/co-status-snapshots/co-status-20260331T093000Z.txt',
      '╰─'
    ].join('\n'));
    expect(plainFrame.split('\n')).toHaveLength(10);
  });

  it('keeps the active polling state visible in compact inspect mode', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        polling: {
          ...buildDataset().polling,
          checking: true,
          next_poll_in_ms: 15000
        }
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      terminalRows: 10,
      viewMode: 'compact'
    });

    expect(stripAnsi(frame)).toContain('│ Status: 1/2 tracked | 15m 12s | checking now...');
  });

  it('renders absolute rate-limit reset timestamps against the dashboard snapshot time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T02:00:00.000Z'));

    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          limit_id: 'gpt-5',
          primary: {
            remaining: 19,
            limit: 30,
            reset_at: '2026-03-30T01:16:00.000Z'
          }
        }
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      throughputTps: 0
    });

    expect(stripAnsi(frame)).toContain('│ Rate Limits: gpt-5 | primary 19/30 reset 60s');
  });

  it('sanitizes terminal control characters before rendering text fields', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          ...buildDataset().rate_limits,
          limit_id: 'gpt-5\u001b[31m'
        },
        tracked: { linear: null },
        running: [
          {
            ...buildDataset().running[0],
            issue_identifier: 'CO-26\u001b[31m',
            display_state: 'running\u001b[2J',
            last_message: 'worker\n\u001b]8;;https://example.com\u0007link\u001b]8;;\u0007 active'
          }
        ],
        retrying: [
          {
            ...buildDataset().retrying[0],
            issue_identifier: 'CO-27\u001b[31m',
            error: 'oops\u001b[31mred\nnext line'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100\u001b[2J',
      taskId: 'local\u0007mcp',
      runId: 'control\u001b[31mhost',
      runDir: '/repo/.runs/local-mcp/\u001b[2Jcontrol-host',
      startPipelineId: 'provider\u001b[31m-linear-worker',
      terminalColumns: 120,
      throughputTps: 0
    });

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).not.toContain('\u0007');
    expect(plainFrame).toContain('│ Dashboard: http://127.0.0.1:4100');
    expect(plainFrame).toContain('│ Rate Limits: gpt-5 | primary 19/30 reset 42s | secondary 3/5 reset 7s | credits 1234.50');
    expect(plainFrame).toContain('│ ● CO-26      running');
    expect(plainFrame).toContain('worker link active');
    expect(plainFrame).toContain('│  ↻ CO-27 attempt=2 in 60.000s error=oops red next line');
  });

  it('preserves literal backslashes while normalizing real newlines', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        retrying: [
          {
            ...buildDataset().retrying[0],
            error: 'C:\\runs\\retry\nnext line'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      throughputTps: 0
    });

    expect(stripAnsi(frame)).toContain('│  ↻ CO-27 attempt=2 in 60.000s error=C:\\runs\\retry next line');
  });

  it('renders unknown token usage as unavailable instead of numeric zero', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        totals: {
          ...buildDataset().totals,
          input_tokens: null,
          output_tokens: null,
          total_tokens: null
        },
        running: [
          {
            ...buildDataset().running[0],
            tokens: {
              input_tokens: null,
              output_tokens: null,
              total_tokens: null
            }
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      throughputTps: 0
    });

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toContain('│ Tokens: in - | out - | total -');
    expect(plainFrame).toContain('│ ● CO-26      running      15m 0s / 4            - session-26');
  });

  it('clamps dashboard error frames to the active terminal width', async () => {
    const writes: string[] = [];
    const runtime = {
      requestRefresh: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined),
      snapshot: vi.fn(() => ({
        readCompatibilityProjection: vi.fn(async () => {
          throw new Error('unexpected readCompatibilityProjection call in test');
        })
      }))
    } as unknown as ControlRuntime;

    const handle = startControlStatusDashboard(
      {
        runtime,
        baseUrl:
          'https://control.example.internal/operators/dashboard/with/a/very/long/path/that/needs/clamping',
        taskId: 'local-mcp-very-long-task-id',
        runId: 'control-host-very-long-run-id',
        runDir: '/repo/.runs/local-mcp/cli/control-host/with/a/very/long/path/for/error-frame-tests',
        startPipelineId: 'provider-linear-worker-with-extra-suffix',
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 60
        }
      },
      {
        readDataset: async () => {
          throw new Error(
            'provider returned an extremely verbose diagnostic payload while refreshing the dashboard'
          );
        },
        setTimeout,
        clearTimeout,
        now: () => new Date('2026-03-30T01:15:30.000Z')
      }
    );

    await handle.flush();

    const plainFrame = stripAnsi(writes[0] ?? '');
    expect(plainFrame).toContain('│ Dashboard: ');
    expect(plainFrame).toContain('│ Pipeline: ');
    expect(plainFrame).toContain('│ Dashboard error: ');
    for (const line of plainFrame.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(60);
    }

    handle.stop();
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
          },
          columns: 120
        }
      },
      {
        readDataset: async () => buildDataset(),
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(writes[0]).toContain('\u001b[H\u001b[2J\u001b[1m╭─ CO STATUS');

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

  it('suppresses timed and runtime-triggered rerenders while paused until resumed', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    const input = new MockDashboardInput();
    let listener: (() => void) | null = null;
    const requestRefresh = vi.fn(async () => undefined);
    const runtime = {
      requestRefresh,
      subscribe: vi.fn((callback: () => void) => {
        listener = callback;
        return () => {
          listener = null;
        };
      }),
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
        input,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          rows: 10,
          isTTY: true
        }
      },
      {
        readDataset: async () => buildDataset(),
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(writes[0]?.endsWith('\n')).toBe(false);
    expect(writes[0]?.startsWith(`${ANSI_ALT_SCREEN_ENTER}\u001b[H\u001b[2J`)).toBe(true);

    input.emitText('p');
    await handle.flush();
    const pausedWriteCount = writes.length;
    expect(writes.at(-1)?.startsWith(`${ANSI_ALT_SCREEN_EXIT}\u001b[H\u001b[2J`)).toBe(true);
    expect(writes.at(-1)?.endsWith('\n')).toBe(true);
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: paused | primary snapshot | full frame');

    listener?.();
    await handle.flush();
    expect(writes).toHaveLength(pausedWriteCount);

    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(pausedWriteCount);

    input.emitText('c');
    await handle.flush();
    expect(stripAnsi(writes.at(-1) ?? '')).toContain(
      '│ Inspect: paused | primary snapshot | compact inspect | updates waiting'
    );
    expect(writes.at(-1)?.startsWith('\u001b[H\u001b[2J')).toBe(true);
    expect(writes.at(-1)?.endsWith('\n')).toBe(false);
    expect(writes).toHaveLength(pausedWriteCount + 1);

    input.emitText('p');
    await handle.flush();
    expect(requestRefresh).toHaveBeenCalledTimes(2);
    expect(writes.at(-1)?.startsWith(`${ANSI_ALT_SCREEN_ENTER}\u001b[H\u001b[2J`)).toBe(true);
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: live | alternate screen | compact inspect');

    handle.stop();
    expect(input.rawModes).toEqual([true, false]);
  });

  it('adds a prompt-separating newline when stopping after a paused primary rerender, even if resume was requested first', async () => {
    const writes: string[] = [];
    const input = new MockDashboardInput();
    let listener: (() => void) | null = null;
    const runtime = {
      requestRefresh: vi.fn(async () => undefined),
      subscribe: vi.fn((callback: () => void) => {
        listener = callback;
        return () => {
          listener = null;
        };
      }),
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
        input,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          rows: 10,
          isTTY: true
        }
      },
      {
        readDataset: async () => buildDataset(),
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();

    input.emitText('p');
    await handle.flush();
    input.emitText('c');
    await handle.flush();

    expect(writes.at(-1)?.startsWith('\u001b[H\u001b[2J')).toBe(true);
    expect(writes.at(-1)?.endsWith('\n')).toBe(false);

    listener?.();
    await handle.flush();
    input.emitText('p');
    await Promise.resolve();
    handle.stop();

    expect(writes.at(-1)).toBe('\n');
    expect(input.rawModes).toEqual([true, false]);
  });

  it('preserves queued force refreshes when an inspect rerender is requested mid-render', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    const input = new MockDashboardInput();
    let resolveFirstDataset: ((dataset: OperatorDashboardDataset) => void) | null = null;
    const firstDataset = new Promise<OperatorDashboardDataset>((resolve) => {
      resolveFirstDataset = resolve;
    });
    let readCount = 0;
    const requestRefresh = vi.fn(async () => undefined);
    const runtime = {
      requestRefresh,
      subscribe: vi.fn(() => () => undefined),
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
        input,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          rows: 10,
          isTTY: true
        }
      },
      {
        readDataset: async () => {
          readCount += 1;
          if (readCount === 1) {
            return await firstDataset;
          }
          return buildDataset();
        },
        setTimeout,
        clearTimeout
      }
    );

    expect(requestRefresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(requestRefresh).toHaveBeenCalledTimes(1);

    input.emitText('c');
    await Promise.resolve();

    resolveFirstDataset?.(buildDataset());
    await handle.flush();

    expect(requestRefresh).toHaveBeenCalledTimes(2);
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: live | alternate screen | compact inspect');

    handle.stop();
  });

  it('does not let cached inspect rerenders swallow queued runtime updates', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    const input = new MockDashboardInput();
    let listener: (() => void) | null = null;
    let resolveFirstDataset: ((dataset: OperatorDashboardDataset) => void) | null = null;
    const firstDataset = new Promise<OperatorDashboardDataset>((resolve) => {
      resolveFirstDataset = resolve;
    });
    let readCount = 0;
    const updatedDataset = buildDataset({
      running: [
        {
          ...buildDataset().running[0],
          last_message: 'Worker turn updated'
        }
      ]
    });
    const runtime = {
      requestRefresh: vi.fn(async () => undefined),
      subscribe: vi.fn((callback: () => void) => {
        listener = callback;
        return () => {
          listener = null;
        };
      }),
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
        input,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          rows: 10,
          isTTY: true
        }
      },
      {
        readDataset: async () => {
          readCount += 1;
          if (readCount === 1) {
            return await firstDataset;
          }
          return updatedDataset;
        },
        setTimeout,
        clearTimeout
      }
    );

    listener?.();
    await Promise.resolve();
    input.emitText('c');
    await Promise.resolve();

    resolveFirstDataset?.(buildDataset());
    await handle.flush();

    expect(readCount).toBe(2);
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: live | alternate screen | compact inspect');
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Running: CO-26 | running | Worker turn updated');

    handle.stop();
  });

  it('preserves pending updates that arrive while paused during an in-flight render', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    const input = new MockDashboardInput();
    let listener: (() => void) | null = null;
    let resolveFirstDataset: ((dataset: OperatorDashboardDataset) => void) | null = null;
    const firstDataset = new Promise<OperatorDashboardDataset>((resolve) => {
      resolveFirstDataset = resolve;
    });
    let readCount = 0;
    const requestRefresh = vi.fn(async () => undefined);
    const runtime = {
      requestRefresh,
      subscribe: vi.fn((callback: () => void) => {
        listener = callback;
        return () => {
          listener = null;
        };
      }),
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
        input,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          rows: 10,
          isTTY: true
        }
      },
      {
        readDataset: async () => {
          readCount += 1;
          if (readCount === 1) {
            return await firstDataset;
          }
          return buildDataset();
        },
        setTimeout,
        clearTimeout
      }
    );

    expect(requestRefresh).toHaveBeenCalledTimes(1);

    input.emitText('p');
    await Promise.resolve();
    listener?.();
    await Promise.resolve();

    resolveFirstDataset?.(buildDataset());
    await handle.flush();

    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: paused | primary snapshot | full frame | updates waiting');

    input.emitText('p');
    await handle.flush();

    expect(requestRefresh).toHaveBeenCalledTimes(2);
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: live | alternate screen | full frame');

    handle.stop();
  });

  it('keeps the pause handoff scrollback-clean when pausing during an in-flight live refresh', async () => {
    const writes: string[] = [];
    const input = new MockDashboardInput();
    let listener: (() => void) | null = null;
    let resolveSecondDataset: ((dataset: OperatorDashboardDataset) => void) | null = null;
    const secondDataset = new Promise<OperatorDashboardDataset>((resolve) => {
      resolveSecondDataset = resolve;
    });
    let readCount = 0;
    const runtime = {
      requestRefresh: vi.fn(async () => undefined),
      subscribe: vi.fn((callback: () => void) => {
        listener = callback;
        return () => {
          listener = null;
        };
      }),
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
        input,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          rows: 10,
          isTTY: true
        }
      },
      {
        readDataset: async () => {
          readCount += 1;
          if (readCount === 2) {
            return await secondDataset;
          }
          return buildDataset();
        },
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    const liveWriteCount = writes.length;

    listener?.();
    await Promise.resolve();
    input.emitText('p');
    await Promise.resolve();

    resolveSecondDataset?.(buildDataset());
    await handle.flush();

    const pauseWrites = writes.slice(liveWriteCount);
    expect(pauseWrites).toHaveLength(2);
    expect(pauseWrites[0]?.startsWith(ANSI_ALT_SCREEN_EXIT)).toBe(true);
    expect(stripAnsi(pauseWrites[0] ?? '')).toContain('│ Inspect: paused | primary snapshot | full frame');
    expect(pauseWrites[0]?.endsWith('\n')).toBe(true);
    expect(pauseWrites[1]?.startsWith('\u001b[H\u001b[2J')).toBe(true);
    expect(stripAnsi(pauseWrites[1] ?? '')).toContain('│ Inspect: paused | primary snapshot | full frame');
    expect(pauseWrites[1]?.endsWith('\n')).toBe(false);
    expect(pauseWrites.filter((write) => write.endsWith('\n'))).toHaveLength(1);

    handle.stop();
  });

  it('warns when the rendered full frame exceeds the visible terminal height by a single row', () => {
    const unconstrainedFrame = stripAnsi(
      renderControlStatusFrame({
        dataset: buildDataset(),
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'provider-linear-worker',
        terminalColumns: 120,
        terminalRows: Number.POSITIVE_INFINITY
      })
    );
    const fullFrameLineCount = unconstrainedFrame.split('\n').length;

    const constrainedFrame = stripAnsi(
      renderControlStatusFrame({
        dataset: buildDataset(),
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'provider-linear-worker',
        terminalColumns: 120,
        terminalRows: fullFrameLineCount - 1
      })
    );

    expect(constrainedFrame).toContain(
      '│ Inspect: live | alternate screen | full frame | short terminal: pause then compact'
    );
  });

  it('ignores terminal escape sequences so arrow keys do not trigger compact inspect', async () => {
    const writes: string[] = [];
    const input = new MockDashboardInput();
    const runtime = {
      requestRefresh: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined),
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
        input,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          rows: 10,
          isTTY: true
        }
      },
      {
        readDataset: async () => buildDataset(),
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    const initialWriteCount = writes.length;

    input.emitText('\u001b[');
    await handle.flush();
    input.emitText('C');
    await handle.flush();
    expect(writes).toHaveLength(initialWriteCount);
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: live | alternate screen | full frame');

    input.emitText('c');
    await handle.flush();
    expect(writes).toHaveLength(initialWriteCount + 1);
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: live | alternate screen | compact inspect');

    handle.stop();
  });

  it('exports the current inspect frame under the host run directory and keeps the live dashboard available', async () => {
    vi.useFakeTimers();

    const runDir = await mkdtemp(join(tmpdir(), 'co-status-dashboard-'));
    try {
      const writes: string[] = [];
      const input = new MockDashboardInput();
      const runtime = {
        requestRefresh: vi.fn(async () => undefined),
        subscribe: vi.fn(() => () => undefined),
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
          runDir,
          startPipelineId: 'provider-linear-worker',
          input,
          output: {
            write(chunk: string) {
              writes.push(chunk);
              return true;
            },
            columns: 220,
            rows: 10,
            isTTY: true
          }
        },
        {
          readDataset: async () => buildDataset(),
          setTimeout,
          clearTimeout
        }
      );

      await handle.flush();
      input.emitText('p');
      await handle.flush();
      input.emitText('c');
      await handle.flush();
      input.emitText('s');
      await handle.flush();

      const snapshotDir = join(runDir, 'co-status-snapshots');
      const [snapshotFile] = await readdir(snapshotDir);
      expect(snapshotFile).toBeDefined();
      const snapshotPath = join(snapshotDir, snapshotFile as string);
      const snapshotText = await readFile(snapshotPath, 'utf8');
      expect(snapshotText).toContain('╭─ CO STATUS');
      expect(snapshotText).toContain('│ Inspect: paused | primary snapshot | compact inspect');
      expect(stripAnsi(writes.at(-1) ?? '')).toContain(`│ Snapshot: saved | ${snapshotPath}`);

      input.emitText('p');
      await handle.flush();
      expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Inspect: live | alternate screen | compact inspect');

      handle.stop();
    } finally {
      await rm(runDir, { recursive: true, force: true });
    }
  });

  it('uses unique snapshot filenames for rapid exports in the same second', async () => {
    vi.useFakeTimers();

    const runDir = await mkdtemp(join(tmpdir(), 'co-status-dashboard-'));
    let currentTime = new Date('2026-03-30T01:15:30.001Z');
    try {
      const input = new MockDashboardInput();
      const runtime = {
        requestRefresh: vi.fn(async () => undefined),
        subscribe: vi.fn(() => () => undefined),
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
          runDir,
          startPipelineId: 'provider-linear-worker',
          input,
          output: {
            write() {
              return true;
            },
            columns: 220,
            rows: 10,
            isTTY: true
          }
        },
        {
          readDataset: async () => buildDataset(),
          setTimeout,
          clearTimeout,
          now: () => new Date(currentTime)
        }
      );

      await handle.flush();
      input.emitText('s');
      await handle.flush();

      currentTime = new Date('2026-03-30T01:15:30.002Z');
      input.emitText('s');
      await handle.flush();

      const snapshotDir = join(runDir, 'co-status-snapshots');
      const snapshotFiles = (await readdir(snapshotDir)).sort();
      expect(snapshotFiles).toHaveLength(2);
      expect(snapshotFiles[0]).not.toBe(snapshotFiles[1]);
      expect(snapshotFiles[0]).toContain('20260330T011530001Z');
      expect(snapshotFiles[1]).toContain('20260330T011530002Z');

      handle.stop();
    } finally {
      await rm(runDir, { recursive: true, force: true });
    }
  });

  it('anchors live frame timing to the dataset snapshot timestamp', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    const runtime = {
      requestRefresh: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined),
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
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120
        }
      },
      {
        readDataset: async () => buildDataset(),
        setTimeout,
        clearTimeout,
        now: () => new Date('2026-03-30T01:15:30.000Z')
      }
    );

    await handle.flush();

    const plainFrame = stripAnsi(writes[0] ?? '');
    expect(plainFrame).toContain('│ ● CO-26      running      15m 0s / 4');
    expect(plainFrame).toContain('│  ↻ CO-27 attempt=2 in 60.000s error=rate limit exceeded');

    handle.stop();
  });

  it('resets the throughput baseline when aggregate token totals drop between snapshots', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let currentTime = Date.parse('2026-03-30T01:15:00.000Z');
    const totals = [1000, 200, 260];
    let readCount = 0;
    const runtime = {
      requestRefresh: vi.fn(async () => undefined),
      subscribe: vi.fn(() => () => undefined),
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
          },
          columns: 120
        }
      },
      {
        readDataset: async () =>
          buildDataset({
            totals: {
              ...buildDataset().totals,
              output_tokens: totals[Math.min(readCount, totals.length - 1)],
              total_tokens: totals[Math.min(readCount++, totals.length - 1)]
            }
          }),
        setTimeout,
        clearTimeout,
        now: () => new Date(currentTime)
      }
    );

    await handle.flush();
    currentTime += 1000;
    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();
    currentTime += 1000;
    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();

    expect(stripAnsi(writes[2] ?? '')).toContain('│ Throughput: 60 tps');

    handle.stop();
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
    const readDataset = vi.fn(async () => {
      signalDatasetStarted?.();
      return await new Promise<OperatorDashboardDataset>((resolve) => {
        resolveDataset = resolve;
      });
    });

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
          },
          columns: 120
        }
      },
      {
        readDataset,
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
