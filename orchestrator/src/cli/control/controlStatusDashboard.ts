import process from 'node:process';

import { logger } from '../../logger.js';
import { evaluateInteractiveGate } from '../utils/interactive.js';
import type { ControlRuntime } from './controlRuntime.js';
import {
  readUiDataset,
  type OperatorDashboardDataset,
  type OperatorDashboardIssuePayload,
  type OperatorDashboardRetryPayload,
  type OperatorDashboardSessionPayload
} from './operatorDashboardPresenter.js';

type DashboardOutput = Pick<NodeJS.WriteStream, 'write'> & {
  columns?: number;
  isTTY?: boolean;
};

interface ControlStatusDashboardDependencies {
  readDataset: (runtime: ControlRuntime) => Promise<OperatorDashboardDataset>;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  now: () => Date;
}

export interface StartControlStatusDashboardOptions {
  runtime: ControlRuntime;
  baseUrl: string;
  taskId: string;
  runId: string;
  runDir: string;
  startPipelineId: string;
  refreshIntervalMs?: number;
  output?: DashboardOutput;
}

export interface ControlStatusDashboardHandle {
  stop(): void;
  flush(): Promise<void>;
}

export interface RenderControlStatusFrameInput {
  dataset: OperatorDashboardDataset;
  baseUrl: string;
  taskId: string;
  runId: string;
  runDir: string;
  startPipelineId: string;
}

export interface ControlStatusDashboardGateInput {
  format: 'json' | 'text';
  stdoutIsTTY?: boolean;
  stderrIsTTY?: boolean;
  term?: string | null;
  env?: NodeJS.ProcessEnv;
}

const ANSI_CLEAR_HOME = '\u001b[H\u001b[2J';
const DEFAULT_REFRESH_INTERVAL_MS = 1_000;
const DEFAULT_OUTPUT: DashboardOutput = process.stdout;
const ESCAPE_CHARACTER = String.fromCharCode(0x1b);
const BELL_CHARACTER = String.fromCharCode(0x07);
const CONTROL_CHARACTER_CLASS = `${String.fromCharCode(0x00)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}-${String.fromCharCode(0x9f)}`;
const ANSI_CONTROL_SEQUENCE_PATTERN = new RegExp(
  `${ESCAPE_CHARACTER}(?:\\[[0-?]*[ -/]*[@-~]|\\][^${BELL_CHARACTER}${ESCAPE_CHARACTER}]*(?:${BELL_CHARACTER}|${ESCAPE_CHARACTER}\\\\)|[@-Z\\\\-_])`,
  'g'
);
const CONTROL_CHARACTER_PATTERN = new RegExp(`[${CONTROL_CHARACTER_CLASS}]`, 'g');

const DEFAULT_DEPENDENCIES: ControlStatusDashboardDependencies = {
  readDataset: async (runtime) =>
    await readUiDataset({
      readCompatibilityProjection: async () => await runtime.snapshot().readCompatibilityProjection()
    }),
  setTimeout,
  clearTimeout,
  now: () => new Date()
};

export function shouldEnableControlStatusDashboard(
  input: ControlStatusDashboardGateInput
): boolean {
  return evaluateInteractiveGate({
    requested: true,
    format: input.format,
    stdoutIsTTY: input.stdoutIsTTY,
    stderrIsTTY: input.stderrIsTTY,
    term: input.term,
    // CO STATUS is a real terminal surface, so inherited CI markers should
    // not suppress it when both output streams are interactive.
    env:
      input.env === undefined
        ? undefined
        : {
            ...input.env,
            CI: undefined
          }
  }).enabled;
}

export function startControlStatusDashboard(
  options: StartControlStatusDashboardOptions,
  overrides: Partial<ControlStatusDashboardDependencies> = {}
): ControlStatusDashboardHandle {
  const deps = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const refreshIntervalMs = Math.max(250, options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS);
  const output = options.output ?? DEFAULT_OUTPUT;
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let activeRender: Promise<void> | null = null;
  let queuedRender = false;
  let queuedForceRefresh = false;

  const requestRender = (forceRefresh: boolean): void => {
    if (stopped) {
      return;
    }
    queuedForceRefresh = queuedForceRefresh || forceRefresh;
    if (activeRender) {
      queuedRender = true;
      return;
    }
    activeRender = renderFrame().finally(() => {
      activeRender = null;
      if (stopped || !queuedRender) {
        return;
      }
      requestRender(queuedForceRefresh);
    });
  };

  const scheduleTick = (): void => {
    if (stopped) {
      return;
    }
    timer = deps.setTimeout(() => {
      timer = null;
      if (stopped) {
        return;
      }
      requestRender(true);
      if (stopped) {
        return;
      }
      scheduleTick();
    }, refreshIntervalMs);
    timer.unref?.();
  };

  const unsubscribe = options.runtime.subscribe(() => {
    requestRender(false);
  });

  requestRender(true);
  scheduleTick();

  return {
    stop() {
      stopped = true;
      queuedRender = false;
      queuedForceRefresh = false;
      if (timer) {
        deps.clearTimeout(timer);
        timer = null;
      }
      unsubscribe();
    },
    async flush() {
      await activeRender;
    }
  };

  async function renderFrame(): Promise<void> {
    const forceRefresh = queuedForceRefresh;
    queuedForceRefresh = false;
    queuedRender = false;
    try {
      if (forceRefresh) {
        await options.runtime.requestRefresh();
      }
      const dataset = await deps.readDataset(options.runtime);
      if (stopped) {
        return;
      }
      output.write(`${ANSI_CLEAR_HOME}${renderControlStatusFrame({
        dataset,
        baseUrl: options.baseUrl,
        taskId: options.taskId,
        runId: options.runId,
        runDir: options.runDir,
        startPipelineId: options.startPipelineId
      })}\n`);
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      logger.warn(`Failed rendering CO STATUS dashboard frame: ${message}`);
      if (stopped) {
        return;
      }
      output.write(`${ANSI_CLEAR_HOME}${renderControlStatusErrorFrame(options, deps.now(), message)}\n`);
    }
  }
}

export function renderControlStatusFrame(input: RenderControlStatusFrameInput): string {
  const safe = (value: unknown): string => sanitizeDisplayValue(value);
  const lines: string[] = [];
  lines.push('CO STATUS');
  lines.push(`Generated: ${safe(input.dataset.generated_at)} | Mode: read-only | Host: ${safe(input.dataset.host)}`);
  lines.push(
    `Control: ${safe(input.baseUrl)} | Task: ${safe(input.taskId)} | Run: ${safe(input.runId)} | Start pipeline: ${safe(input.startPipelineId)}`
  );
  lines.push(`Run dir: ${safe(input.runDir)}`);
  lines.push(
    `Summary: running=${safe(input.dataset.counts.running)} retrying=${safe(input.dataset.counts.retrying)} issues=${safe(input.dataset.counts.issues)} tokens=${safe(input.dataset.totals.total_tokens)} runtime=${safe(formatSeconds(input.dataset.totals.seconds_running))}`
  );
  lines.push(`Rate limits: ${safe(formatRecord(input.dataset.rate_limits))}`);
  lines.push(`Polling: ${safe(formatPolling(input.dataset))}`);
  lines.push('');
  lines.push('RUNNING SESSIONS');
  lines.push(...renderRunningSessions(input.dataset.running));
  lines.push('');
  lines.push('RETRY / BACKOFF');
  lines.push(...renderRetryQueue(input.dataset.retrying));
  lines.push('');
  lines.push('ISSUES');
  lines.push(...renderIssues(input.dataset.issues));
  return lines.join('\n');
}

function renderControlStatusErrorFrame(
  input: Pick<StartControlStatusDashboardOptions, 'baseUrl' | 'taskId' | 'runId' | 'runDir' | 'startPipelineId'>,
  now: Date,
  message: string
): string {
  const safe = (value: unknown): string => sanitizeDisplayValue(value);
  return [
    'CO STATUS',
    `Generated: ${now.toISOString()} | Mode: read-only | Host: unavailable`,
    `Control: ${safe(input.baseUrl)} | Task: ${safe(input.taskId)} | Run: ${safe(input.runId)} | Start pipeline: ${safe(input.startPipelineId)}`,
    `Run dir: ${safe(input.runDir)}`,
    `Dashboard error: ${safe(message)}`
  ].join('\n');
}

function renderRunningSessions(entries: OperatorDashboardSessionPayload[]): string[] {
  if (entries.length === 0) {
    return ['(none)'];
  }
  const safe = (value: unknown): string => sanitizeDisplayValue(value);
  return entries.map(
    (entry) =>
      `${safe(entry.issue_identifier)} | ${safe(entry.display_state)} | session=${safe(formatNullable(entry.session_id))} | thread=${safe(formatNullable(entry.thread_id))} | turns=${safe(formatNullable(entry.turn_count))} | tokens=${safe(formatNullable(entry.tokens.total_tokens))} | workspace=${safe(formatPath(entry.workspace_path))} | host=${safe(entry.host)}`
  );
}

function renderRetryQueue(entries: OperatorDashboardRetryPayload[]): string[] {
  if (entries.length === 0) {
    return ['(none)'];
  }
  const safe = (value: unknown): string => sanitizeDisplayValue(value);
  return entries.map(
    (entry) =>
      `${safe(entry.issue_identifier)} | ${safe(entry.display_state)} | attempt=${safe(formatNullable(entry.attempt))} | due=${safe(formatNullable(entry.due_at))} | session=${safe(formatNullable(entry.session_id))} | workspace=${safe(formatPath(entry.workspace_path))} | host=${safe(entry.host)} | error=${safe(formatNullable(entry.error))}`
  );
}

function renderIssues(entries: OperatorDashboardIssuePayload[]): string[] {
  if (entries.length === 0) {
    return ['(none)'];
  }
  const lines: string[] = [];
  const safe = (value: unknown): string => sanitizeDisplayValue(value);
  for (const issue of entries) {
    lines.push(
      `${issue.is_selected ? '*' : '-'} ${safe(issue.issue_identifier)} | state=${safe(issue.display_status)} | owner=${safe(formatOwner(issue))} | session=${safe(formatSession(issue))} | workspace=${safe(formatPath(issue.workspace.path))} | host=${safe(issue.workspace.host)}`
    );
    lines.push(
      `  retry=${safe(formatIssueRetry(issue))} | last_error=${safe(formatNullable(issue.last_error))} | latest=${safe(formatLatest(issue))} | summary=${safe(truncate(issue.summary ?? '-', 96))}`
    );
  }
  return lines;
}

function formatOwner(issue: OperatorDashboardIssuePayload): string {
  const phase = formatNullable(issue.owner.phase);
  const status = formatNullable(issue.owner.status);
  return `${phase}/${status}`;
}

function formatSession(issue: OperatorDashboardIssuePayload): string {
  const sessionId = formatNullable(issue.session.session_id);
  const threadId = formatNullable(issue.session.thread_id);
  const turns = formatNullable(issue.session.turn_count);
  return `${sessionId} thread=${threadId} turns=${turns}`;
}

function formatIssueRetry(issue: OperatorDashboardIssuePayload): string {
  if (!issue.retry) {
    return 'none';
  }
  return `attempt=${formatNullable(issue.retry.attempt)} due=${formatNullable(issue.retry.due_at)} status=${formatNullable(issue.retry.display_state)}`;
}

function formatLatest(issue: OperatorDashboardIssuePayload): string {
  const event = issue.latest_event?.event ?? issue.provider_linear_worker_proof?.last_event ?? null;
  const at = issue.latest_event?.at ?? issue.provider_linear_worker_proof?.last_event_at ?? null;
  const message = issue.latest_event?.message ?? issue.provider_linear_worker_proof?.last_message ?? null;
  return truncate(
    [event, at, message].filter((value): value is string => typeof value === 'string' && value.length > 0).join(' | ') || '-',
    96
  );
}

function formatPolling(dataset: OperatorDashboardDataset): string {
  const polling = dataset.polling;
  if (!polling) {
    return 'unavailable';
  }
  return [
    `enabled=${polling.enabled ? 'yes' : 'no'}`,
    `checking=${polling.checking ? 'yes' : 'no'}`,
    `queued=${polling.queued ? 'yes' : 'no'}`,
    `mode=${formatNullable(polling.last_mode)}`,
    `next=${formatMilliseconds(polling.next_poll_in_ms)}`,
    `last_success=${formatNullable(polling.last_success_at)}`,
    `last_error=${formatNullable(polling.last_error)}`
  ].join(' | ');
}

function formatMilliseconds(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }
  if (value < 1_000) {
    return `${Math.max(0, Math.round(value))}ms`;
  }
  return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}s`;
}

function formatSeconds(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }
  if (value < 60) {
    return `${value.toFixed(value >= 10 ? 0 : 1)}s`;
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
}

function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return truncate(String(value), 64);
}

function formatPath(value: string | null | undefined): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '-';
  }
  return truncateMiddle(value.trim(), 48);
}

function formatRecord(value: Record<string, unknown> | null | undefined): string {
  if (!value || Object.keys(value).length === 0) {
    return 'none';
  }
  return truncate(
    Object.entries(value)
      .map(([key, entry]) => `${sanitizeDisplayValue(key)}=${formatRecordValue(entry)}`)
      .join(' | '),
    140
  );
}

function formatRecordValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return sanitizeDisplayValue(value);
  }
  try {
    return sanitizeDisplayValue(JSON.stringify(value));
  } catch {
    return sanitizeDisplayValue(String(value));
  }
}

function sanitizeDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  const sanitized = sanitizeTerminalText(String(value));
  return sanitized.length === 0 ? '-' : sanitized;
}

function truncate(value: string, maxLength: number): string {
  const sanitized = sanitizeTerminalText(value);
  if (sanitized.length === 0) {
    return '-';
  }
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  return `${sanitized.slice(0, Math.max(0, maxLength - 3))}...`;
}

function truncateMiddle(value: string, maxLength: number): string {
  const sanitized = sanitizeTerminalText(value);
  if (sanitized.length === 0) {
    return '-';
  }
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  const sliceLength = Math.max(1, Math.floor((maxLength - 3) / 2));
  return `${sanitized.slice(0, sliceLength)}...${sanitized.slice(sanitized.length - sliceLength)}`;
}

function sanitizeTerminalText(value: string): string {
  return value
    .replace(ANSI_CONTROL_SEQUENCE_PATTERN, ' ')
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
