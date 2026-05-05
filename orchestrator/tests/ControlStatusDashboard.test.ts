import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ControlRuntime } from '../src/cli/control/controlRuntime.js';
import {
  buildUiDataset,
  type OperatorDashboardDataset
} from '../src/cli/control/operatorDashboardPresenter.js';
import {
  renderControlStatusFrame,
  shouldEnableControlStatusDashboard,
  startAttachedControlStatusDashboard,
  startControlStatusDashboard
} from '../src/cli/control/controlStatusDashboard.js';

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(0x1b)}(?:\\[[0-?]*[ -/]*[@-~]|[@-Z\\\\-_])`, 'g');
const ANSI_ALT_SCREEN_ENTER = '\u001b[?1049h';
const ANSI_ALT_SCREEN_EXIT = '\u001b[?1049l';
const ANSI_CLEAR_HOME = '\u001b[H\u001b[2J';
const ANSI_CLEAR_DOWN = '\u001b[J';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

function countTerminalRows(value: string, columns: number): number {
  return value
    .split('\n')
    .reduce((rowCount, line) => rowCount + Math.max(1, Math.ceil(measureTerminalWidth(line) / columns)), 0);
}

function measureTerminalWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    width += isFullwidthCodePoint(char.codePointAt(0) ?? 0) ? 2 : 1;
  }
  return width;
}

function isFullwidthCodePoint(codePoint: number): boolean {
  return (
    codePoint >= 0x1100 &&
    (
      codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0x3247 && codePoint !== 0x303f) ||
      (codePoint >= 0x3250 && codePoint <= 0x4dbf) ||
      (codePoint >= 0x4e00 && codePoint <= 0xa4c6) ||
      (codePoint >= 0xa960 && codePoint <= 0xa97c) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6b) ||
      (codePoint >= 0xff01 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1b000 && codePoint <= 0x1b001) ||
      (codePoint >= 0x1f200 && codePoint <= 0x1f251) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd)
    )
  );
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
      issues: 2,
      max_allowed: 4
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
      next_poll_in_ms: 15000,
      source_updated_at: '2026-03-30T01:14:51.000Z'
    },
    selected_issue_identifier: 'CO-26',
    selected: null,
    running: [
      {
        issue_identifier: 'CO-26',
        issue_id: 'issue-26',
        task_id: 'linear-a861',
        run_id: 'run-26',
        summary: 'Terminal dashboard renderer in progress',
        display_state: 'running',
        status_reason: null,
        pid: '4242',
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
        summary: 'Waiting for retry backoff',
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
          pid: '4242',
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
  it('keeps worker_host in the operator dataset while leaving control-host labels intact', () => {
    const projection: Parameters<typeof buildUiDataset>[0]['projection'] = {
      running: [
        {
          issue_identifier: 'CO-26',
          issue_id: 'issue-26',
          state: 'running',
          display_state: 'running',
          status_reason: null,
          pid: '4242',
          worker_host: 'worker-host-01',
          session_id: 'session-26',
          turn_count: 4,
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
          state: 'retrying',
          display_state: 'retrying',
          status_reason: 'rate_limited',
          session_id: 'session-27',
          worker_host: 'worker-host-02',
          thread_id: 'thread-27',
          turn_count: 2,
          workspace_path: '/repo/.workspaces/linear-b27',
          attempt: 2,
          due_at: '2026-03-30T01:16:00.000Z',
          error: 'rate limit exceeded',
          last_event: 'retry_scheduled',
          last_message: 'Retry queued',
          started_at: '2026-03-30T01:10:00.000Z',
          last_event_at: '2026-03-30T01:14:40.000Z'
        }
      ],
      maxConcurrentAgents: 4,
      codexTotals: {
        input_tokens: 100,
        output_tokens: 117,
        total_tokens: 217,
        seconds_running: 912.5
      },
      rateLimits: null,
      issues: [
        {
          issueIdentifier: 'CO-26',
          aliases: ['CO-26'],
          payload: {
            issue_identifier: 'CO-26',
            issue_id: 'issue-26',
            task_id: 'linear-a861',
            run_id: 'run-26',
            status: 'running',
            raw_status: 'in_progress',
            display_status: 'running',
            status_reason: null,
            workspace: {
              path: '/repo/.workspaces/linear-a861'
            },
            worker_host: 'worker-host-01',
            attempts: {
              restart_count: null,
              current_retry_attempt: null
            },
            running: null,
            retry: null,
            logs: {
              codex_session_logs: []
            },
            summary: 'Terminal dashboard renderer in progress',
            latest_event: null,
            question_summary: {
              queued_count: 0,
              latest_question: null
            },
            recent_events: [],
            last_error: null,
            tracked: {
              linear: null
            },
            provider_linear_worker_proof: null,
            provider_debug_snapshot: null
          }
        },
        {
          issueIdentifier: 'CO-27',
          aliases: ['CO-27'],
          payload: {
            issue_identifier: 'CO-27',
            issue_id: 'issue-27',
            task_id: 'linear-b27',
            run_id: 'run-27',
            status: 'retrying',
            raw_status: 'retrying',
            display_status: 'retrying',
            status_reason: 'rate_limited',
            workspace: {
              path: '/repo/.workspaces/linear-b27'
            },
            worker_host: 'worker-host-02',
            attempts: {
              restart_count: 1,
              current_retry_attempt: 2
            },
            running: null,
            retry: {
              issue_identifier: 'CO-27',
              issue_id: 'issue-27',
              task_id: 'linear-b27',
              run_id: 'run-27',
              state: 'retrying',
              display_state: 'retrying',
              status_reason: 'rate_limited',
              session_id: 'session-27',
              worker_host: 'worker-host-02',
              thread_id: 'thread-27',
              turn_count: 2,
              workspace_path: '/repo/.workspaces/linear-b27',
              attempt: 2,
              due_at: '2026-03-30T01:16:00.000Z',
              error: 'rate limit exceeded',
              last_event: 'retry_scheduled',
              last_message: 'Retry queued',
              started_at: '2026-03-30T01:10:00.000Z',
              last_event_at: '2026-03-30T01:14:40.000Z'
            },
            logs: {
              codex_session_logs: []
            },
            summary: 'Waiting for retry backoff',
            latest_event: null,
            question_summary: {
              queued_count: 0,
              latest_question: null
            },
            recent_events: [],
            last_error: 'rate limit exceeded',
            tracked: {
              linear: null
            },
            provider_linear_worker_proof: null,
            provider_debug_snapshot: null
          }
        }
      ],
      selected: {
        issue_id: 'issue-26',
        issue_identifier: 'CO-26',
        task_id: 'linear-a861',
        run_id: 'run-26',
        raw_status: 'in_progress',
        display_status: 'running',
        status_reason: null,
        started_at: '2026-03-30T01:00:00.000Z',
        updated_at: '2026-03-30T01:14:59.000Z',
        completed_at: null,
        summary: 'Terminal dashboard renderer in progress',
        last_error: null,
        latest_action: null,
        latest_event: null,
        workspace: {
          path: '/repo/.workspaces/linear-a861'
        },
        worker_host: 'worker-host-01',
        question_summary: {
          queued_count: 0,
          latest_question: null
        },
        tracked: {
          linear: null
        }
      },
      dispatchPilot: null,
      tracked: null,
      providerIntake: null,
      providerWorkflow: null,
      polling: null
    };

    const dataset = buildUiDataset({
      projection,
      generatedAt: '2026-03-30T01:15:00.000Z'
    });

    expect(dataset.selected).toMatchObject({
      worker_host: 'worker-host-01'
    });
    expect(dataset.running).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-26',
        host: expect.any(String),
        worker_host: 'worker-host-01'
      })
    ]);
    expect(dataset.retrying).toEqual([
      expect.objectContaining({
        issue_identifier: 'CO-27',
        host: expect.any(String),
        worker_host: 'worker-host-02'
      })
    ]);
    expect(dataset.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          issue_identifier: 'CO-26',
          worker_host: 'worker-host-01',
          workspace: expect.objectContaining({
            host: expect.any(String)
          })
        }),
        expect.objectContaining({
          issue_identifier: 'CO-27',
          worker_host: 'worker-host-02',
          workspace: expect.objectContaining({
            host: expect.any(String)
          })
        })
      ])
    );
  });

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
    const plainFrame = stripAnsi(frame);
    const lines = plainFrame.split('\n');
    expect(lines).toHaveLength(23);
    expect(lines.slice(0, 9)).toEqual([
      '╭─ CO STATUS',
      '│ Agents: 1/4 max allowed',
      '│ Throughput: 1,842 tps',
      '│ Runtime: 15m 12s',
      '│ Tokens: in 100 | out 117 | total 217 | reasoning n/a',
      '│ Rate Limits: Codex primary 63.3% | secondary 60% | credits 1234.50',
      '│ Project: CO Control and Advisory',
      '│ Next refresh: 15s | source 9s old',
      '├─ Running'
    ]);
    expect(plainFrame).toContain('│ Agents: 1/4 max allowed');
    expect(plainFrame).toContain('│ Throughput: 1,842 tps');
    expect(plainFrame).toContain('│ Tokens: in 100 | out 117 | total 217 | reasoning n/a');
    expect(plainFrame).toContain('│ Rate Limits: Codex primary 63.3% | secondary 60% | credits 1234.50');
    expect(plainFrame).toContain('│   ID         STAGE        PID');
    expect(plainFrame).toContain('│ ● CO-26      running      4242');
    expect(plainFrame).toContain('Terminal dashboard renderer in progress');
    expect(plainFrame).toContain('│  ↻ CO-27 retry scheduled in 1m | attempt 2 | rate limit exceeded');
    expect(plainFrame).toContain('├─ Status controls');
    expect(plainFrame).toContain('│ Inspect: live | alternate screen | full frame');
  });

  it('renders reasoning output tokens when Codex usage reports them', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        totals: {
          ...buildDataset().totals,
          reasoning_output_tokens: 31
        }
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      throughputTps: 1842.7
    });

    expect(stripAnsi(frame)).toContain('│ Tokens: in 100 | out 117 | total 217 | reasoning 31');
  });

  it('renders remote worker_host ownership in the live running and retry frame text', () => {
    const baseDataset = buildDataset();
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        running: [
          {
            ...baseDataset.running[0],
            worker_host: 'worker-host-01'
          }
        ],
        retrying: [
          {
            ...baseDataset.retrying[0],
            worker_host: 'worker-host-02'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 120,
      throughputTps: 1842.7
    });

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toContain('worker-host-01 |');
    expect(plainFrame).toContain('worker-host-02 | rate limit exceeded');
  });

  it('renders model provenance in full and compact CO STATUS frames', () => {
    const baseDataset = buildDataset();
    const runningModelProvenance = {
      schema_version: 1,
      model: 'gpt-5.5',
      review_model: 'gpt-5.5',
      model_reasoning_effort: 'xhigh',
      source: 'config_default',
      confidence: 'high',
      degraded_reason: null,
      observed_at: '2026-03-30T01:14:59.000Z',
      runtime_model: null,
      runtime_review_model: null,
      runtime_reasoning_effort: null,
      command_model: null,
      config_model: 'gpt-5.5',
      config_review_model: 'gpt-5.5',
      config_reasoning_effort: 'xhigh',
      config_path: '/Users/kbediako/.codex/config.toml'
    } as const;
    const retryModelProvenance = {
      ...runningModelProvenance,
      model: 'gpt-5.4',
      source: 'runtime_reported',
      confidence: 'medium',
      degraded_reason: 'runtime_metadata_partial_config_backfill',
      runtime_model: 'gpt-5.4'
    } as const;
    const dataset = buildDataset({
      running: [
        {
          ...baseDataset.running[0],
          resolved_model_provenance: runningModelProvenance
        }
      ],
      retrying: [
        {
          ...baseDataset.retrying[0],
          resolved_model_provenance: retryModelProvenance
        }
      ]
    });
    const commonInput = {
      dataset,
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 180,
      throughputTps: 1842.7
    };

    const fullFrame = stripAnsi(renderControlStatusFrame(commonInput));
    expect(fullFrame).toContain(
      '│   ↳ CO-26 model gpt-5.5 | review gpt-5.5 | reasoning xhigh | source config_default | confidence high'
    );
    expect(fullFrame).toContain(
      '│   ↳ CO-27 model gpt-5.4 | review gpt-5.5 | reasoning xhigh | source runtime_reported | confidence medium | degraded runtime_metadata_partial_config_backfill'
    );

    const compactFrame = stripAnsi(
      renderControlStatusFrame({
        ...commonInput,
        viewMode: 'compact'
      })
    );
    expect(compactFrame).toContain('Running: CO-26 | running | model gpt-5.5 config_default/high |');
    expect(compactFrame).toContain(
      'Retry: CO-27 | retry scheduled in 1m | model gpt-5.4 runtime_reported/medium degraded runtime_metadata_partial_config_backfill |'
    );
  });

  it('labels live primary-screen renders as primary scrollback', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset(),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'attach-viewer',
      terminalColumns: 120,
      throughputTps: 1842.7,
      surfaceMode: 'primary'
    });

    expect(stripAnsi(frame)).toContain('│ Inspect: live | primary scrollback | full frame');
  });

  it('adds recency context when the running event falls back to a generic phase token', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        running: [
          {
            ...buildDataset().running[0],
            summary: null,
            last_event: 'turn_running',
            last_message: 'Provider worker turn is active.',
            last_event_at: '2026-03-30T01:00:00.000Z'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'attach-viewer',
      terminalColumns: 120,
      throughputTps: 1842.7,
      surfaceMode: 'primary'
    });

    expect(stripAnsi(frame)).toContain('turn running (15m ago)');
  });

  it('advances runtime, AGE / TURN, and fallback event recency against a live local clock', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        running: [
          {
            ...buildDataset().running[0],
            summary: null,
            display_event: null,
            last_event: 'turn_running',
            last_message: 'Provider worker turn is active.',
            last_event_at: '2026-03-30T01:14:55.000Z'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'attach-viewer',
      terminalColumns: 120,
      throughputTps: 1842.7,
      surfaceMode: 'primary',
      referenceTime: new Date('2026-03-30T01:15:00.000Z'),
      liveReferenceTime: new Date('2026-03-30T01:15:05.000Z')
    });

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toContain('│ Runtime: 15m 17s');
    expect(plainFrame).toContain('15m 5s / 4');
    expect(plainFrame).toContain('turn running (10s ago)');
  });

  it('prefers projection-authored running event text over renderer fallbacks', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        running: [
          {
            ...buildDataset().running[0],
            summary: null,
            display_event: 'linear requests exhausted; next tracked-issue refresh at 43s',
            last_event: 'turn_running',
            last_message: 'Provider worker turn is active.',
            last_event_at: '2026-03-30T01:00:00.000Z'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'attach-viewer',
      terminalColumns: 120,
      throughputTps: 1842.7,
      surfaceMode: 'primary'
    });

    expect(stripAnsi(frame)).toContain('linear requests exhausted; next tracked-i...');
    expect(stripAnsi(frame)).not.toContain('turn running (15m ago)');
  });

  it('lets a high-signal status reason outrank the generic aged event fallback', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        running: [
          {
            ...buildDataset().running[0],
            summary: null,
            status_reason: 'queued_questions',
            last_event: 'turn_running',
            last_message: 'Provider worker turn is active.',
            last_event_at: '2026-03-30T01:00:00.000Z'
          }
        ]
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'attach-viewer',
      terminalColumns: 120,
      throughputTps: 1842.7,
      surfaceMode: 'primary'
    });

    expect(stripAnsi(frame)).toContain('queued questions');
    expect(stripAnsi(frame)).not.toContain('turn running (15m ago)');
  });

  it('renders narrow terminals with an explicit reduced running table and sorted retry queue', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        counts: {
          running: 1,
          retrying: 3,
          issues: 4,
          max_allowed: 4
        },
        retrying: [
          {
            issue_identifier: 'CO-31',
            issue_id: 'issue-31',
            task_id: 'linear-c31',
            run_id: 'run-31',
            summary: 'Network retry pending',
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
            summary: 'Rate-limit retry pending',
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
            summary: 'Worker restart pending',
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
    expect(plainFrame).toContain('│ Throughput: 15 tps');
    expect(plainFrame).toContain('│ Rate Limits: Codex primary 63.3% | secondary 60% | credits 1234.50');
    expect(plainFrame).toContain('│   ID        STAGE      PID');
    expect(plainFrame).toContain('│ ● CO-26     running    4242');
    expect(plainFrame).toContain('│  ↻ CO-30 retry scheduled in 2s | attempt 1 | error with \\nnewline');
    expect(plainFrame).toContain('│  ↻ CO-31 retry scheduled in 5s | attempt 4 | network timeout');
    expect(plainFrame).toContain(
      '│  ↻ CO-32 retry scheduled in 9s | attempt 2 | worker crashed restarting cleanly'
    );
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
    expect(retryLine).toContain('provider timeout w...');
    expect(retryLine?.length ?? 0).toBeLessThanOrEqual(68);
  });

  it('renders empty sections cleanly', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        counts: { running: 0, retrying: 0, issues: 0, max_allowed: 4 },
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

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toContain('│ Agents: 0/4 max allowed');
    expect(plainFrame).toContain('│ Project: n/a');
    expect(plainFrame).toContain('│   ID         STAGE        PID');
    expect(plainFrame).toContain('│  No active agents');
    expect(plainFrame).toContain('│  No queued retries');
  });

  it('renders unavailable max allowed capacity without fabricating a tracked-issue ceiling', () => {
    const dataset = buildDataset({
      counts: {
        ...buildDataset().counts,
        issues: 9,
        max_allowed: null
      }
    });

    const fullFrame = stripAnsi(
      renderControlStatusFrame({
        dataset,
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'provider-linear-worker',
        terminalColumns: 120,
        throughputTps: 0
      })
    );
    const compactFrame = stripAnsi(
      renderControlStatusFrame({
        dataset,
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'provider-linear-worker',
        terminalColumns: 120,
        terminalRows: 10,
        throughputTps: 0,
        paused: true,
        viewMode: 'compact',
        pendingUpdate: false
      })
    );

    expect(fullFrame).toContain('│ Agents: 1/n/a max allowed');
    expect(fullFrame).not.toContain('│ Agents: 1/9 max allowed');
    expect(compactFrame).toContain('│ Status: 1/n/a max allowed | 15m 12s | next 15s | source 9s old');
    expect(compactFrame).not.toContain('│ Status: 1/9 max allowed | 15m 12s | next 15s | source 9s old');
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
      '│ Status: 1/4 max allowed | 15m 12s | next 15s | source 9s old',
      '│ Tokens: in 100 | out 117 | total 217 | reasoning n/a',
      '│ Rate Limits: Codex primary 63.3% | secondary 60% | credits 1234.50',
      '│ Running: CO-26 | running | Terminal dashboard renderer in progress',
      '│ Retry: CO-27 | retry scheduled in 1m | rate limit exceeded',
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
          next_refresh_state: 'checking',
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

    expect(stripAnsi(frame)).toContain('│ Status: 1/4 max allowed | 15m 12s | checking now... | source 9s old');
  });

  it('renders cooldown-suppressed next refresh from projected truth instead of raw checking or stale scheduling', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        polling: {
          ...buildDataset().polling,
          checking: true,
          next_poll_in_ms: (58 * 60 + 11) * 1000,
          next_refresh_state: 'cooldown',
          next_refresh_at: '2026-03-30T01:44:32.000Z',
          next_refresh_in_ms: (29 * 60 + 32) * 1000,
          source_updated_at: '2026-03-30T01:15:00.000Z',
          linear_budget: {
            observed_at: '2026-03-30T01:15:00.000Z',
            source: 'control-host-polling',
            request_id: 'polling-budget-dashboard',
            retry_after_seconds: 29 * 60 + 32,
            cooldown_until: '2026-03-30T01:44:32.000Z',
            cooldown_active: true,
            suppression: 'cooldown',
            suppression_reason: 'linear_budget_shared_cooldown',
            requests: {
              limit: 30,
              remaining: 0,
              reset_at: '2026-03-30T01:44:32.000Z'
            },
            endpoint_requests: null,
            complexity: null,
            endpoint_complexity: null
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

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toContain('│ Next refresh: 29m 32s | source 0s old');
    expect(plainFrame).not.toContain('│ Next refresh: checking now...');
    expect(plainFrame).not.toContain('│ Next refresh: 58m 11s');
  });

  it('does not fall back to raw checking or stale scheduling once projected state exists', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        polling: {
          ...buildDataset().polling,
          checking: true,
          next_poll_in_ms: (58 * 60 + 11) * 1000,
          next_refresh_state: 'cooldown',
          next_refresh_at: '2026-03-30T01:44:32.000Z',
          next_refresh_in_ms: null,
          source_updated_at: '2026-03-30T01:15:00.000Z'
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

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toContain('│ Next refresh: n/a | source 0s old');
    expect(plainFrame).not.toContain('│ Next refresh: checking now...');
    expect(plainFrame).not.toContain('│ Next refresh: 58m 11s');
  });

  it('renders absolute rate-limit reset timestamps against the dashboard snapshot time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T02:00:00.000Z'));

    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          limit_id: 'gpt-5',
          primary: {
            remaining: 0,
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

    expect(stripAnsi(frame)).toContain('│ Rate Limits: Codex primary resets 1m');
  });

  it('renders higher-order countdowns and age values for long live windows', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        totals: {
          ...buildDataset().totals,
          seconds_running: 18_725
        },
        polling: {
          ...buildDataset().polling!,
          next_poll_in_ms: (5 * 3600 + 2 * 60) * 1000
        },
        rate_limits: {
          limit_id: 'gpt-5',
          primary: {
            remaining: 0,
            limit: 30,
            reset_at: '2026-03-30T06:45:00.000Z'
          }
        },
        running: [
          {
            ...buildDataset().running[0],
            started_at: '2026-03-27T21:15:00.000Z'
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
    expect(plainFrame).toContain('│ Runtime: 5h 12m');
    expect(plainFrame).toContain('│ Next refresh: 5h 2m');
    expect(plainFrame).toContain('│ Rate Limits: Codex primary resets 5h 30m');
    expect(plainFrame).toContain('2d 4h / 4');
  });

  it('renders Codex usage-window rate limits with explicit 5-hour and weekly labels', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          primary: {
            usedPercent: 12.5,
            windowDurationMins: 300
          },
          secondary: {
            usedPercent: 48,
            windowDurationMins: 10080
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

    expect(stripAnsi(frame)).toContain(
      '│ Rate Limits: Codex 5-hour 87.5% | weekly 52%'
    );
  });

  it('renders snake-case Codex session-log windows with explicit 5-hour and weekly labels', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          primary: {
            used_percent: 12.5,
            window_minutes: 300
          },
          secondary: {
            used_percent: 48,
            window_minutes: 10080
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

    expect(stripAnsi(frame)).toContain(
      '│ Rate Limits: Codex 5-hour 87.5% | weekly 52%'
    );
  });

  it('falls back to percent remaining when an exhausted Codex usage window lacks reset metadata', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          primary: {
            usedPercent: 100,
            windowDurationMins: 300
          },
          secondary: {
            usedPercent: 48,
            windowDurationMins: 10080
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

    const rateLimitLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.startsWith('│ Rate Limits: '));
    expect(rateLimitLine).toBeDefined();
    expect(rateLimitLine).toContain('Codex 5-hour 0% | weekly 52%');
    expect(rateLimitLine).not.toContain('resets soon');
  });

  it('renders authoritative Linear budget snapshots instead of falling back to unavailable', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          observed_at: '2026-03-30T01:15:00.000Z',
          source: 'control-host-polling',
          suppression: 'low',
          requests: {
            remaining: 19,
            limit: 30,
            reset_at: '2026-03-30T01:15:42.000Z'
          },
          complexity: {
            remaining: 180,
            limit: 200,
            reset_at: '2026-03-30T01:15:07.000Z'
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

    expect(stripAnsi(frame)).toContain(
      '│ Rate Limits: Linear requests 63.3% | complexity 90%'
    );
  });

  it.each([96, 115])(
    'keeps both Codex and Linear rate-limit state visible when combined sources render in %i columns',
    (terminalColumns) => {
      const frame = renderControlStatusFrame({
        dataset: buildDataset({
          rate_limits: {
            codex: buildDataset().rate_limits,
            linear_budget: {
              observed_at: '2026-03-30T01:15:00.000Z',
              source: 'linear-budget-state',
              suppression: 'cooldown',
              retry_after_seconds: 120,
              requests: {
                remaining: 19,
                limit: 30,
                reset_at: '2026-03-30T01:15:42.000Z'
              },
              complexity: {
                remaining: 180,
                limit: 200,
                reset_at: '2026-03-30T01:15:07.000Z'
              }
            }
          }
        }),
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'provider-linear-worker',
        terminalColumns,
        throughputTps: 0
      });

      const plainFrame = stripAnsi(frame);
      const rateLimitLine = plainFrame
        .split('\n')
        .find((line) => line.startsWith('│ Rate Limits: '));
      expect(rateLimitLine).toBeDefined();
      expect(rateLimitLine).toContain('Codex primary 63.3% | secondary 60% | credits 1234.50 ||');
      expect(rateLimitLine).toContain('Linear requests 63.3%');
      if (terminalColumns === 96) {
        expect(rateLimitLine).toContain('Linear requests 63.3%...');
      } else {
        expect(rateLimitLine).toContain('Linear requests 63.3% | complexity 90%');
        expect(rateLimitLine).not.toContain('...');
      }
      expect(rateLimitLine?.length ?? 0).toBeLessThanOrEqual(terminalColumns);
    }
  );

  it('surfaces exhausted endpoint Linear buckets in the compact Rate Limits row even when shared buckets still have headroom', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          codex: buildDataset().rate_limits,
          linear_budget: {
            observed_at: '2026-03-30T01:15:00.000Z',
            source: 'linear-budget-state',
            suppression: 'cooldown',
            retry_after_seconds: 120,
            requests: {
              remaining: 19,
              limit: 30,
              reset_at: '2026-03-30T01:15:42.000Z'
            },
            endpoint_requests: {
              remaining: 0,
              limit: 12,
              reset_at: '2026-03-30T01:17:00.000Z'
            },
            complexity: {
              remaining: 180,
              limit: 200,
              reset_at: '2026-03-30T01:15:07.000Z'
            }
          }
        }
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 140,
      throughputTps: 0
    });

    const rateLimitLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.startsWith('│ Rate Limits: '));
    expect(rateLimitLine).toBeDefined();
    expect(rateLimitLine).toContain('Linear requests resets 2m | complexity 90%');
    expect(rateLimitLine).not.toContain('Linear requests 63.3%');
  });

  it('uses the later exhausted Linear bucket reset when both shared and endpoint request buckets are exhausted', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          codex: buildDataset().rate_limits,
          linear_budget: {
            observed_at: '2026-03-30T01:15:00.000Z',
            source: 'linear-budget-state',
            suppression: 'cooldown',
            retry_after_seconds: 300,
            requests: {
              remaining: 0,
              limit: 30,
              reset_at: '2026-03-30T01:16:00.000Z'
            },
            endpoint_requests: {
              remaining: 0,
              limit: 12,
              reset_at: '2026-03-30T01:20:00.000Z'
            },
            complexity: {
              remaining: 180,
              limit: 200,
              reset_at: '2026-03-30T01:15:07.000Z'
            }
          }
        }
      }),
      baseUrl: 'http://127.0.0.1:4100',
      taskId: 'local-mcp',
      runId: 'control-host',
      runDir: '/repo/.runs/local-mcp/cli/control-host',
      startPipelineId: 'provider-linear-worker',
      terminalColumns: 140,
      throughputTps: 0
    });

    const rateLimitLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.startsWith('│ Rate Limits: '));
    expect(rateLimitLine).toBeDefined();
    expect(rateLimitLine).toContain('Linear requests resets 5m | complexity 90%');
    expect(rateLimitLine).not.toContain('Linear requests resets 1m');
  });

  it('surfaces legacy Codex request limits without leaking raw source labels', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          source: 'legacy-proof',
          requests: {
            remaining: 1,
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

    const plainFrame = stripAnsi(frame);
    expect(plainFrame).toContain('│ Rate Limits: Codex requests 3.3%');
    expect(plainFrame).not.toContain('legacy-proof');
  });

  it('surfaces exhausted legacy Codex endpoint requests when the shared bucket still has headroom', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          source: 'legacy-proof',
          requests: {
            remaining: 19,
            limit: 30,
            reset_at: '2026-03-30T01:15:42.000Z'
          },
          endpoint_requests: {
            remaining: 0,
            limit: 12,
            reset_at: '2026-03-30T01:17:00.000Z'
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

    const rateLimitLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.startsWith('│ Rate Limits: '));
    expect(rateLimitLine).toBeDefined();
    expect(rateLimitLine).toContain('Codex requests resets 2m');
    expect(rateLimitLine).not.toContain('Codex requests 63.3%');
  });

  it('prefers the known later reset for exhausted legacy Codex request buckets', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          source: 'legacy-proof',
          requests: {
            remaining: 0,
            limit: 30
          },
          endpoint_requests: {
            remaining: 0,
            limit: 12,
            reset_at: '2026-03-30T01:20:00.000Z'
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

    const rateLimitLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.startsWith('│ Rate Limits: '));
    expect(rateLimitLine).toBeDefined();
    expect(rateLimitLine).toContain('Codex requests resets 5m');
    expect(rateLimitLine).not.toContain('Codex requests resets soon');
  });

  it('accepts legacy reset timestamp aliases when choosing the visible exhausted Codex request bucket', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          source: 'legacy-proof',
          requests: {
            remaining: 0,
            limit: 30
          },
          endpoint_requests: {
            remaining: 0,
            limit: 12,
            resets_at: '2026-03-30T01:20:00.000Z'
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

    const rateLimitLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.startsWith('│ Rate Limits: '));
    expect(rateLimitLine).toBeDefined();
    expect(rateLimitLine).toContain('Codex requests resets 5m');
    expect(rateLimitLine).not.toContain('Codex requests resets soon');
  });

  it('keeps legacy Codex request limits visible when combined with Linear budget', () => {
    const frame = renderControlStatusFrame({
      dataset: buildDataset({
        rate_limits: {
          codex: {
            source: 'legacy-proof',
            observed_at: '2026-03-30T01:15:00.000Z',
            suppression: 'cooldown',
            retry_after_seconds: 120,
            requests: {
              remaining: 1,
              limit: 30,
              reset_at: '2026-03-30T01:16:00.000Z'
            }
          },
          linear_budget: {
            observed_at: '2026-03-30T01:15:00.000Z',
            source: 'linear-budget-state',
            suppression: 'cooldown',
            retry_after_seconds: 120,
            requests: {
              remaining: 19,
              limit: 30,
              reset_at: '2026-03-30T01:15:42.000Z'
            },
            complexity: {
              remaining: 180,
              limit: 200,
              reset_at: '2026-03-30T01:15:07.000Z'
            }
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

    const rateLimitLine = stripAnsi(frame)
      .split('\n')
      .find((line) => line.startsWith('│ Rate Limits: '));
    expect(rateLimitLine).toBeDefined();
    expect(rateLimitLine).toContain('Codex requests 3.3% || Linear requests 63.3% | complexity 90%');
    expect(rateLimitLine).not.toContain('legacy-proof');
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
    expect(plainFrame).not.toContain('│ Dashboard: http://127.0.0.1:4100');
    expect(plainFrame).toContain('│ Rate Limits: Codex primary 63.3% | secondary 60% | credits 1234.50');
    expect(plainFrame).toContain('│ ● CO-26      running');
    expect(plainFrame).toContain('worker link active');
    expect(plainFrame).toContain('│  ↻ CO-27 retry scheduled in 1m | attempt 2 | oops red next line');
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

    expect(stripAnsi(frame)).toContain('│  ↻ CO-27 retry scheduled in 1m | attempt 2 | C:\\runs\\retry next line');
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
    expect(plainFrame).toContain('│ Tokens: in n/a | out n/a | total n/a | reasoning n/a');
    expect(plainFrame).toContain('│ ● CO-26      running      4242');
    expect(plainFrame).toContain('15m / 4             n/a session-26');
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
    expect(plainFrame).not.toContain('│ Dashboard: ');
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

  it('keeps the launched dashboard on alternate screen when using the default tty output stream', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    const originalColumns = Object.getOwnPropertyDescriptor(process.stdout, 'columns');
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true
    });
    Object.defineProperty(process.stdout, 'columns', {
      configurable: true,
      value: 120
    });
    const writeSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(((chunk: string | Uint8Array) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

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

    try {
      const handle = startControlStatusDashboard(
        {
          runtime,
          baseUrl: 'http://127.0.0.1:4100',
          taskId: 'local-mcp',
          runId: 'control-host',
          runDir: '/repo/.runs/local-mcp/cli/control-host',
          startPipelineId: 'provider-linear-worker',
          refreshIntervalMs: 1000
        },
        {
          readDataset: async () => buildDataset(),
          setTimeout,
          clearTimeout
        }
      );

      await handle.flush();
      expect(writes[0]).toContain(ANSI_ALT_SCREEN_ENTER);
      expect(stripAnsi(writes[0] ?? '')).toContain('│ Inspect: live | alternate screen | full frame');
      handle.stop();
    } finally {
      writeSpy.mockRestore();
      if (originalIsTTY) {
        Object.defineProperty(process.stdout, 'isTTY', originalIsTTY);
      }
      if (originalColumns) {
        Object.defineProperty(process.stdout, 'columns', originalColumns);
      }
    }
  });

  it('keeps attached viewers on primary scrollback while refreshing live data', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let readCount = 0;

    const handle = startAttachedControlStatusDashboard(
      {
        readDataset: async () =>
          buildDataset({
            totals: {
              ...buildDataset().totals,
              total_tokens: 217 + readCount++
            }
          }),
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'attach-viewer',
        refreshIntervalMs: 1000,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          columns: 120,
          isTTY: true
        }
      },
      {
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    expect(writes[0]).not.toContain(ANSI_ALT_SCREEN_ENTER);
    expect(writes[0]).not.toContain(ANSI_ALT_SCREEN_EXIT);
    expect(writes[0]).not.toContain(ANSI_CLEAR_HOME);
    expect(stripAnsi(writes[0] ?? '')).toContain('│ Inspect: live | primary scrollback | full frame');
    expect(stripAnsi(writes[0] ?? '')).not.toContain('│ Dashboard: ');

    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();
    expect(writes).toHaveLength(2);
    expect(writes[1]).not.toContain(ANSI_ALT_SCREEN_ENTER);
    expect(writes[1]).not.toContain(ANSI_ALT_SCREEN_EXIT);
    expect(writes[1]).not.toContain(ANSI_CLEAR_HOME);
    expect(writes[1]).toContain(ANSI_CLEAR_DOWN);
    expect(writes[1]).toMatch(new RegExp(String.raw`\r\u001b\[\d+A\u001b\[J`));
    expect(stripAnsi(writes[1] ?? '')).toContain('│ Inspect: live | primary scrollback | full frame');
    expect(stripAnsi(writes[1] ?? '')).not.toContain('│ Dashboard: ');
    expect(stripAnsi(writes[1] ?? '')).toContain('│ Runtime: 15m 13s');
    expect(stripAnsi(writes[1] ?? '')).toContain('15m 1s / 4');
    expect(stripAnsi(writes[1] ?? '')).toContain('│ Tokens: in 100 | out 117 | total 218 | reasoning n/a');

    handle.stop();
    expect(writes[writes.length - 1]).toBe('\n');
  });

  it('accounts for wrapped terminal rows when rewriting the pinned primary attach frame', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let readCount = 0;
    let columns = 120;

    const handle = startAttachedControlStatusDashboard(
      {
        readDataset: async () =>
          buildDataset({
            running: [
              {
                ...buildDataset().running[0],
                summary:
                  'This is an intentionally long running summary to force wrapped rows in the pinned primary live region'
              }
            ],
            totals: {
              ...buildDataset().totals,
              total_tokens: 217 + readCount++
            }
          }),
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'attach-viewer',
        refreshIntervalMs: 1000,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          get columns() {
            return columns;
          },
          isTTY: true
        }
      },
      {
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    columns = 40;
    const expectedWrappedRows = stripAnsi(writes[0] ?? '')
      .split('\n')
      .reduce((rowCount, line) => rowCount + Math.max(1, Math.ceil(line.length / columns)), 0);
    expect(expectedWrappedRows).toBeGreaterThan(stripAnsi(writes[0] ?? '').split('\n').length);

    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();

    expect(writes[1]).toContain(`\r\u001b[${expectedWrappedRows - 1}A\u001b[J`);
    handle.stop();
  });

  it('counts wide CJK cells when rewriting the pinned primary attach frame', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let readCount = 0;
    let columns = 120;

    const handle = startAttachedControlStatusDashboard(
      {
        readDataset: async () =>
          buildDataset({
            running: [
              {
                ...buildDataset().running[0],
                summary: `Wide glyph regression ${'漢'.repeat(28)}`
              }
            ],
            totals: {
              ...buildDataset().totals,
              total_tokens: 217 + readCount++
            }
          }),
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'attach-viewer',
        refreshIntervalMs: 1000,
        output: {
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          get columns() {
            return columns;
          },
          isTTY: true
        }
      },
      {
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    columns = 40;

    const strippedFrame = stripAnsi(writes[0] ?? '');
    const expectedWrappedRows = countTerminalRows(strippedFrame, columns);
    const naiveWrappedRows = strippedFrame
      .split('\n')
      .reduce((rowCount, line) => rowCount + Math.max(1, Math.ceil(line.length / columns)), 0);
    expect(expectedWrappedRows).toBeGreaterThan(naiveWrappedRows);

    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();

    expect(writes[1]).toContain(`\r\u001b[${expectedWrappedRows - 1}A\u001b[J`);
    handle.stop();
  });

  it('falls back to a fresh full-screen rewrite when either pinned frame exceeds the viewport', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let readCount = 0;
    let readIndex = 0;
    const shortDataset = () =>
      buildDataset({
        counts: {
          running: 0,
          retrying: 0,
          issues: 0
        },
        running: [],
        retrying: []
      });

    const tallDataset = () =>
      buildDataset({
        counts: {
          running: 8,
          retrying: 4,
          issues: 12
        },
        running: Array.from({ length: 8 }, (_, index) => ({
          ...buildDataset().running[0],
          issue_identifier: `CO-${26 + index}`,
          issue_id: `issue-${26 + index}`,
          task_id: `linear-${26 + index}`,
          run_id: `run-${26 + index}`,
          session_id: `session-${26 + index}`,
          thread_id: `thread-${26 + index}`,
          summary: `Tall pinned frame row ${index + 1}`,
          tokens: {
            ...buildDataset().running[0].tokens,
            total_tokens: 217 + readCount
          }
        })),
        retrying: Array.from({ length: 4 }, (_, index) => ({
          ...buildDataset().retrying[0],
          issue_identifier: `CO-${40 + index}`,
          issue_id: `issue-${40 + index}`,
          task_id: `linear-${40 + index}`,
          run_id: `run-${40 + index}`,
          summary: `Queued retry row ${index + 1}`
        })),
        totals: {
          ...buildDataset().totals,
          total_tokens: 217 + readCount++
        }
      });

    const handle = startAttachedControlStatusDashboard(
      {
        readDataset: async () => (readIndex++ === 0 ? shortDataset() : tallDataset()),
        baseUrl: 'http://127.0.0.1:4100',
        taskId: 'local-mcp',
        runId: 'control-host',
        runDir: '/repo/.runs/local-mcp/cli/control-host',
        startPipelineId: 'attach-viewer',
        refreshIntervalMs: 1000,
        output: {
          rows: 23,
          columns: 120,
          write(chunk: string) {
            writes.push(chunk);
            return true;
          },
          isTTY: true
        }
      },
      {
        setTimeout,
        clearTimeout
      }
    );

    await handle.flush();
    expect(stripAnsi(writes[0] ?? '').split('\n').length).toBeLessThanOrEqual(23);

    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();

    expect(stripAnsi(writes[1] ?? '').split('\n').length).toBeGreaterThan(23);
    expect(writes[1]).toContain(ANSI_CLEAR_HOME);
    expect(writes[1]).not.toContain(ANSI_CLEAR_DOWN);
    expect(writes[1]).not.toMatch(new RegExp(String.raw`\r\u001b\[\d+A\u001b\[J`));

    await vi.advanceTimersByTimeAsync(1000);
    await handle.flush();

    expect(writes[2]).toContain(ANSI_CLEAR_HOME);
    expect(writes[2]).not.toContain(ANSI_CLEAR_DOWN);
    expect(writes[2]).not.toMatch(new RegExp(String.raw`\r\u001b\[\d+A\u001b\[J`));
    handle.stop();
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
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Runtime: 15m 12s');

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
    expect(stripAnsi(writes.at(-1) ?? '')).toContain('│ Status: 1/4 max allowed | 15m 12s | next 15s');
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

  it('preserves the prompt-separating newline when stopping from alternate mode after resuming a paused primary rerender', async () => {
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

    input.emitText('p');
    await handle.flush();
    expect(writes.at(-1)?.startsWith(`${ANSI_ALT_SCREEN_ENTER}\u001b[H\u001b[2J`)).toBe(true);

    handle.stop();

    expect(writes.at(-1)).toBe(`${ANSI_ALT_SCREEN_EXIT}\n`);
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
    const updatedDataset = buildDataset({
      generated_at: '2026-03-30T01:15:05.000Z',
      totals: {
        ...buildDataset().totals,
        seconds_running: 930
      },
      running: [
        {
          ...buildDataset().running[0],
          display_event: 'Worker turn updated after pause',
          last_event_at: '2026-03-30T01:15:04.000Z'
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

    resolveSecondDataset?.(updatedDataset);
    await handle.flush();

    const pauseWrites = writes.slice(liveWriteCount);
    expect(pauseWrites).toHaveLength(1);
    expect(pauseWrites[0]?.startsWith(ANSI_ALT_SCREEN_EXIT)).toBe(true);
    expect(stripAnsi(pauseWrites[0] ?? '')).toContain(
      '│ Inspect: paused | primary snapshot | full frame | updates waiting'
    );
    expect(stripAnsi(pauseWrites[0] ?? '')).toContain('│ Runtime: 15m 12s');
    expect(stripAnsi(pauseWrites[0] ?? '')).not.toContain('│ Runtime: 15m 30s');
    expect(stripAnsi(pauseWrites[0] ?? '')).not.toContain('Worker turn updated after pause');
    expect(pauseWrites[0]?.endsWith('\n')).toBe(true);
    expect(pauseWrites.filter((write) => write.endsWith('\n'))).toHaveLength(1);

    handle.stop();
  });

  it('freezes paused runtime, AGE / TURN, and fallback event recency when pause lands before the first frame', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    const input = new MockDashboardInput();
    let resolveDataset: ((dataset: OperatorDashboardDataset) => void) | null = null;
    const pendingDataset = new Promise<OperatorDashboardDataset>((resolve) => {
      resolveDataset = resolve;
    });
    let currentTime = Date.parse('2026-03-30T01:15:30.000Z');
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
        readDataset: async () => await pendingDataset,
        setTimeout,
        clearTimeout,
        now: () => new Date(currentTime)
      }
    );

    input.emitText('p');
    await Promise.resolve();

    resolveDataset?.(
      buildDataset({
        running: [
          {
            ...buildDataset().running[0],
            summary: null,
            display_event: null,
            last_event: 'turn_running',
            last_message: 'Provider worker turn is active.',
            last_event_at: '2026-03-30T01:14:55.000Z'
          }
        ]
      })
    );
    await handle.flush();

    const pausedFrame = stripAnsi(writes.at(-1) ?? '');
    expect(pausedFrame).toContain('│ Inspect: paused | primary snapshot | full frame');
    expect(pausedFrame).toContain('│ Runtime: 15m 12s');
    expect(pausedFrame).toContain('│ Next refresh: 15s | source 9s old');
    expect(pausedFrame).toContain('15m / 4');
    expect(pausedFrame).toContain('turn running (5s ago)');

    currentTime += 5000;
    input.emitText('c');
    await handle.flush();
    input.emitText('c');
    await handle.flush();

    const refrozenFrame = stripAnsi(writes.at(-1) ?? '');
    expect(refrozenFrame).toContain('│ Inspect: paused | primary snapshot | full frame');
    expect(refrozenFrame).toContain('│ Runtime: 15m 12s');
    expect(refrozenFrame).toContain('│ Next refresh: 15s | source 9s old');
    expect(refrozenFrame).toContain('15m / 4');
    expect(refrozenFrame).toContain('turn running (5s ago)');
    expect(refrozenFrame).not.toContain('│ Runtime: 15m 17s');
    expect(refrozenFrame).not.toContain('│ Next refresh: 10s | source 14s old');
    expect(refrozenFrame).not.toContain('15m 5s / 4');
    expect(refrozenFrame).not.toContain('turn running (10s ago)');

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
    expect(plainFrame).toContain('│ ● CO-26      running      4242     15m / 4');
    expect(plainFrame).toContain('│  ↻ CO-27 retry scheduled in 1m | attempt 2 | rate limit exceeded');

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

  it('preserves the throughput baseline when aggregate token totals are temporarily unavailable', async () => {
    vi.useFakeTimers();

    const writes: string[] = [];
    let currentTime = Date.parse('2026-03-30T01:15:00.000Z');
    const totals: Array<number | null> = [1000, null, 1060];
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

    expect(stripAnsi(writes[2] ?? '')).toContain('│ Throughput: 30 tps');

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

  it('skips the post-refresh read when stop lands during requestRefresh', async () => {
    const writes: string[] = [];
    let resolveRefresh: (() => void) | null = null;
    let signalRefreshStarted: (() => void) | null = null;
    const refreshStarted = new Promise<void>((resolve) => {
      signalRefreshStarted = resolve;
    });
    const requestRefresh = vi.fn(async () => {
      signalRefreshStarted?.();
      signalRefreshStarted = null;
      await new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
    });
    const runtime = {
      requestRefresh,
      subscribe: vi.fn(() => () => undefined),
      snapshot: vi.fn(() => ({
        readCompatibilityProjection: vi.fn(async () => {
          throw new Error('unexpected readCompatibilityProjection call in test');
        })
      }))
    } as unknown as ControlRuntime;
    const readDataset = vi.fn(async () => buildDataset());

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
        readDataset
      }
    );

    await refreshStarted;
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(readDataset).not.toHaveBeenCalled();

    handle.stop();
    resolveRefresh?.();
    await handle.flush();

    expect(readDataset).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
});
