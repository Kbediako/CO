import process from 'node:process';

import { logger } from '../../logger.js';
import { evaluateInteractiveGate } from '../utils/interactive.js';
import type { ControlRuntime } from './controlRuntime.js';
import {
  readUiDataset,
  type OperatorDashboardDataset,
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

interface TokenSample {
  timestampMs: number;
  totalTokens: number;
}

interface RunningColumn {
  key: 'id' | 'stage' | 'age' | 'tokens' | 'session' | 'event';
  label: string;
  width: number;
  align?: 'left' | 'right';
}

interface SummarySegment {
  text: string;
  color: string;
  truncateMode?: 'end' | 'middle';
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
  terminalColumns?: number | null;
  throughputTps?: number | null;
  referenceTime?: Date;
}

export interface ControlStatusDashboardGateInput {
  format: 'json' | 'text';
  stdoutIsTTY?: boolean;
  stderrIsTTY?: boolean;
  term?: string | null;
  env?: NodeJS.ProcessEnv;
}

const ANSI_CLEAR_HOME = '\u001b[H\u001b[2J';
const ANSI_RESET = '\u001b[0m';
const ANSI_BOLD = '\u001b[1m';
const ANSI_BLUE = '\u001b[34m';
const ANSI_CYAN = '\u001b[36m';
const ANSI_DIM = '\u001b[2m';
const ANSI_GREEN = '\u001b[32m';
const ANSI_MAGENTA = '\u001b[35m';
const ANSI_RED = '\u001b[31m';
const ANSI_YELLOW = '\u001b[33m';
const ANSI_GRAY = '\u001b[90m';
const ANSI_CLEAR_CONTROL = '\u001b';
const ANSI_CLEAR_BELL = '\u0007';
const CONTROL_CHARACTER_CLASS = `${String.fromCharCode(0x00)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}-${String.fromCharCode(0x9f)}`;
const ANSI_CONTROL_SEQUENCE_PATTERN = new RegExp(
  `${ANSI_CLEAR_CONTROL}(?:\\[[0-?]*[ -/]*[@-~]|\\][^${ANSI_CLEAR_BELL}${ANSI_CLEAR_CONTROL}]*(?:${ANSI_CLEAR_BELL}|${ANSI_CLEAR_CONTROL}\\\\)|[@-Z\\\\-_])`,
  'g'
);
const CONTROL_CHARACTER_PATTERN = new RegExp(`[${CONTROL_CHARACTER_CLASS}]`, 'g');
const DEFAULT_REFRESH_INTERVAL_MS = 1_000;
const DEFAULT_TERMINAL_COLUMNS = 115;
const THROUGHPUT_WINDOW_MS = 5_000;
const DEFAULT_OUTPUT: DashboardOutput = process.stdout;
const NUMBER_FORMAT = new Intl.NumberFormat('en-US');

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
  let tokenSamples: TokenSample[] = [];

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
      const now = deps.now();
      const referenceTime = resolveReferenceTime(undefined, dataset.generated_at, now);
      tokenSamples = appendTokenSample(tokenSamples, now.getTime(), dataset.totals.total_tokens);
      output.write(`${ANSI_CLEAR_HOME}${renderControlStatusFrame({
        dataset,
        baseUrl: options.baseUrl,
        taskId: options.taskId,
        runId: options.runId,
        runDir: options.runDir,
        startPipelineId: options.startPipelineId,
        terminalColumns: output.columns ?? null,
        throughputTps: rollingTokensPerSecond(tokenSamples),
        referenceTime
      })}\n`);
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      logger.warn(`Failed rendering CO STATUS dashboard frame: ${message}`);
      if (stopped) {
        return;
      }
      output.write(
        `${ANSI_CLEAR_HOME}${renderControlStatusErrorFrame(
          options,
          deps.now(),
          message,
          output.columns ?? null
        )}\n`
      );
    }
  }
}

export function renderControlStatusFrame(input: RenderControlStatusFrameInput): string {
  const referenceTime = resolveReferenceTime(input.referenceTime, input.dataset.generated_at);
  const terminalColumns = resolveTerminalColumns(input.terminalColumns);
  const runningColumns = selectRunningColumns(terminalColumns);
  const lines: string[] = [
    colorize('╭─ CO STATUS', ANSI_BOLD),
    renderAgentsLine(input.dataset, terminalColumns),
    renderThroughputLine(input.throughputTps ?? 0, terminalColumns),
    renderRuntimeLine(input.dataset, terminalColumns),
    renderTokensLine(input.dataset, terminalColumns),
    renderRateLimitsLine(input.dataset, referenceTime, terminalColumns),
    renderProjectLine(input.dataset, terminalColumns),
    renderDashboardLine(input.baseUrl, terminalColumns),
    renderNextRefreshLine(input.dataset, terminalColumns),
    colorize('├─ Running', ANSI_BOLD),
    '│',
    renderRunningHeaderRow(runningColumns),
    renderRunningSeparatorRow(runningColumns)
  ];

  lines.push(...renderRunningRows(input.dataset.running, runningColumns, referenceTime));
  lines.push('│');
  lines.push(colorize('├─ Backoff queue', ANSI_BOLD));
  lines.push('│');
  lines.push(...renderRetryRows(input.dataset.retrying, referenceTime, terminalColumns));
  lines.push('╰─');

  return lines.join('\n');
}

function renderControlStatusErrorFrame(
  input: Pick<
    StartControlStatusDashboardOptions,
    'baseUrl' | 'taskId' | 'runId' | 'runDir' | 'startPipelineId'
  >,
  now: Date,
  message: string,
  terminalColumns?: number | null
): string {
  const safe = (value: unknown): string => sanitizeDisplayValue(value);
  const columns = resolveTerminalColumns(terminalColumns);
  return [
    colorize('╭─ CO STATUS', ANSI_BOLD),
    renderSummaryLine('Generated', [{ text: now.toISOString(), color: ANSI_CYAN }], columns),
    renderSummaryLine(
      'Dashboard',
      [{ text: safe(input.baseUrl), color: ANSI_CYAN, truncateMode: 'middle' }],
      columns
    ),
    renderSummaryLine(
      'Task',
      [
        { text: safe(input.taskId), color: ANSI_CYAN },
        { text: ' | ', color: ANSI_GRAY },
        { text: 'Run: ', color: ANSI_BOLD },
        { text: safe(input.runId), color: ANSI_CYAN }
      ],
      columns
    ),
    renderSummaryLine(
      'Pipeline',
      [
        { text: safe(input.startPipelineId), color: ANSI_CYAN },
        { text: ' | ', color: ANSI_GRAY },
        { text: 'Run dir: ', color: ANSI_BOLD },
        { text: safe(input.runDir), color: ANSI_CYAN, truncateMode: 'middle' }
      ],
      columns
    ),
    renderSummaryLine('Dashboard error', [{ text: safe(message), color: ANSI_RED }], columns),
    '╰─'
  ].join('\n');
}

function renderAgentsLine(dataset: OperatorDashboardDataset, terminalColumns: number): string {
  return renderSummaryLine(
    'Agents',
    [
      { text: formatCount(dataset.counts.running), color: ANSI_GREEN },
      { text: '/', color: ANSI_GRAY },
      { text: `${formatCount(dataset.counts.issues)} tracked`, color: ANSI_GRAY }
    ],
    terminalColumns
  );
}

function renderThroughputLine(throughputTps: number, terminalColumns: number): string {
  return renderSummaryLine(
    'Throughput',
    [{ text: `${formatTps(throughputTps)} tps`, color: ANSI_CYAN }],
    terminalColumns
  );
}

function renderRuntimeLine(dataset: OperatorDashboardDataset, terminalColumns: number): string {
  return renderSummaryLine(
    'Runtime',
    [{ text: formatRuntimeSeconds(dataset.totals.seconds_running), color: ANSI_MAGENTA }],
    terminalColumns
  );
}

function renderTokensLine(dataset: OperatorDashboardDataset, terminalColumns: number): string {
  return renderSummaryLine(
    'Tokens',
    [
      { text: `in ${formatOptionalCount(dataset.totals.input_tokens)}`, color: ANSI_YELLOW },
      { text: ' | ', color: ANSI_GRAY },
      { text: `out ${formatOptionalCount(dataset.totals.output_tokens)}`, color: ANSI_YELLOW },
      { text: ' | ', color: ANSI_GRAY },
      { text: `total ${formatOptionalCount(dataset.totals.total_tokens)}`, color: ANSI_YELLOW }
    ],
    terminalColumns
  );
}

function renderRateLimitsLine(
  dataset: OperatorDashboardDataset,
  referenceTime: Date,
  terminalColumns: number
): string {
  return renderSummaryLine(
    'Rate Limits',
    formatRateLimitSegments(dataset.rate_limits, referenceTime),
    terminalColumns
  );
}

function renderProjectLine(dataset: OperatorDashboardDataset, terminalColumns: number): string {
  const project = resolveProjectLabel(dataset);
  return renderSummaryLine(
    'Project',
    [{ text: project, color: project === 'n/a' ? ANSI_GRAY : ANSI_CYAN }],
    terminalColumns
  );
}

function renderDashboardLine(baseUrl: string, terminalColumns: number): string {
  return renderSummaryLine(
    'Dashboard',
    [{ text: sanitizeDisplayValue(baseUrl), color: ANSI_CYAN, truncateMode: 'middle' }],
    terminalColumns
  );
}

function renderNextRefreshLine(dataset: OperatorDashboardDataset, terminalColumns: number): string {
  const polling = dataset.polling;
  if (polling?.checking) {
    return renderSummaryLine(
      'Next refresh',
      [{ text: 'checking now...', color: ANSI_CYAN }],
      terminalColumns
    );
  }
  if (typeof polling?.next_poll_in_ms === 'number' && Number.isFinite(polling.next_poll_in_ms)) {
    const seconds = Math.max(0, Math.ceil(polling.next_poll_in_ms / 1000));
    return renderSummaryLine(
      'Next refresh',
      [{ text: `${seconds}s`, color: ANSI_CYAN }],
      terminalColumns
    );
  }
  return renderSummaryLine('Next refresh', [{ text: 'n/a', color: ANSI_GRAY }], terminalColumns);
}

function renderRunningHeaderRow(columns: RunningColumn[]): string {
  const labels = columns.map((column) => formatCell(column.label, column.width));
  return `│   ${colorize(labels.join(' '), ANSI_GRAY)}`;
}

function renderRunningSeparatorRow(columns: RunningColumn[]): string {
  const separatorWidth =
    columns.reduce((sum, column) => sum + column.width, 0) + Math.max(0, columns.length - 1);
  return `│   ${colorize('─'.repeat(separatorWidth), ANSI_GRAY)}`;
}

function renderRunningRows(
  entries: OperatorDashboardSessionPayload[],
  columns: RunningColumn[],
  referenceTime: Date
): string[] {
  if (entries.length === 0) {
    return [`│  ${colorize('No active agents', ANSI_GRAY)}`];
  }
  return [...entries]
    .sort((left, right) => left.issue_identifier.localeCompare(right.issue_identifier))
    .map((entry) => renderRunningRow(entry, columns, referenceTime));
}

function renderRunningRow(
  entry: OperatorDashboardSessionPayload,
  columns: RunningColumn[],
  referenceTime: Date
): string {
  const accent = resolveRunningAccent(entry);
  const cells = columns.map((column) => {
    const value = formatRunningColumnValue(entry, column.key, referenceTime);
    const formatted = formatCell(value, column.width, column.align);
    switch (column.key) {
      case 'id':
        return colorize(formatted, ANSI_CYAN);
      case 'age':
        return colorize(formatted, ANSI_MAGENTA);
      case 'tokens':
        return colorize(formatted, ANSI_YELLOW);
      case 'session':
        return colorize(formatted, ANSI_CYAN);
      case 'stage':
      case 'event':
        return colorize(formatted, accent);
      default:
        return formatted;
    }
  });
  return `│ ${colorize('●', accent)} ${cells.join(' ')}`;
}

function renderRetryRows(
  entries: OperatorDashboardRetryPayload[],
  referenceTime: Date,
  terminalColumns: number
): string[] {
  if (entries.length === 0) {
    return [`│  ${colorize('No queued retries', ANSI_GRAY)}`];
  }
  return [...entries]
    .sort((left, right) => compareDueAt(left.due_at, right.due_at))
    .map((entry) => renderRetryRow(entry, referenceTime, terminalColumns));
}

function renderRetryRow(
  entry: OperatorDashboardRetryPayload,
  referenceTime: Date,
  terminalColumns: number
): string {
  const issueIdentifier = sanitizeDisplayValue(entry.issue_identifier);
  const attempt = formatNullable(entry.attempt);
  const relativeDue = formatRelativeDue(entry.due_at, referenceTime);
  const prefixText = `${issueIdentifier} attempt=${attempt} in ${relativeDue}`;
  const availableErrorWidth = Math.max(0, terminalColumns - 5 - prefixText.length);
  const error = formatRetryError(entry.error, availableErrorWidth);
  return (
    `│  ${colorize('↻', ANSI_YELLOW)} ` +
    colorize(issueIdentifier, ANSI_RED) +
    ' ' +
    colorize(`attempt=${attempt}`, ANSI_YELLOW) +
    colorize(' in ', ANSI_DIM) +
    colorize(relativeDue, ANSI_CYAN) +
    error
  );
}

function resolveRunningAccent(entry: OperatorDashboardSessionPayload): string {
  const lastEvent = sanitizeDisplayValue(entry.last_event).toLowerCase();
  const displayState = sanitizeDisplayValue(entry.display_state).toLowerCase();
  if (lastEvent.includes('turn_completed')) {
    return ANSI_MAGENTA;
  }
  if (lastEvent.includes('task_started') || lastEvent.includes('turn_started')) {
    return ANSI_GREEN;
  }
  if (lastEvent.includes('token')) {
    return ANSI_YELLOW;
  }
  if (displayState.includes('retry')) {
    return ANSI_BLUE;
  }
  if (displayState.includes('fail') || displayState.includes('error')) {
    return ANSI_RED;
  }
  return ANSI_BLUE;
}

function formatRunningColumnValue(
  entry: OperatorDashboardSessionPayload,
  key: RunningColumn['key'],
  referenceTime: Date
): string {
  switch (key) {
    case 'id':
      return sanitizeDisplayValue(entry.issue_identifier);
    case 'stage':
      return sanitizeDisplayValue(entry.display_state);
    case 'age':
      return formatRuntimeAndTurns(entry.started_at, referenceTime, entry.turn_count);
    case 'tokens':
      return formatOptionalCount(entry.tokens.total_tokens);
    case 'session':
      return compactSessionId(entry.session_id);
    case 'event':
      return summarizeRunningEvent(entry);
    default:
      return '-';
  }
}

function summarizeRunningEvent(entry: OperatorDashboardSessionPayload): string {
  const lastMessage = sanitizeDisplayValue(entry.last_message);
  if (lastMessage !== '-') {
    return lastMessage;
  }
  const lastEvent = sanitizeDisplayValue(entry.last_event);
  if (lastEvent !== '-') {
    return lastEvent;
  }
  const statusReason = sanitizeDisplayValue(entry.status_reason);
  if (statusReason !== '-') {
    return statusReason;
  }
  return sanitizeDisplayValue(entry.display_state);
}

function selectRunningColumns(terminalColumns: number): RunningColumn[] {
  const baseColumns: RunningColumn[] =
    terminalColumns >= 120
      ? [
          { key: 'id', label: 'ID', width: 10 },
          { key: 'stage', label: 'STAGE', width: 12 },
          { key: 'age', label: 'AGE / TURN', width: 12 },
          { key: 'tokens', label: 'TOKENS', width: 10, align: 'right' },
          { key: 'session', label: 'SESSION', width: 14 },
          { key: 'event', label: 'EVENT', width: 0 }
        ]
      : terminalColumns >= 96
        ? [
            { key: 'id', label: 'ID', width: 10 },
            { key: 'stage', label: 'STAGE', width: 12 },
            { key: 'age', label: 'AGE / TURN', width: 12 },
            { key: 'tokens', label: 'TOKENS', width: 10, align: 'right' },
            { key: 'event', label: 'EVENT', width: 0 }
          ]
        : terminalColumns >= 78
          ? [
              { key: 'id', label: 'ID', width: 9 },
              { key: 'stage', label: 'STAGE', width: 10 },
              { key: 'tokens', label: 'TOKENS', width: 9, align: 'right' },
              { key: 'event', label: 'EVENT', width: 0 }
            ]
          : [
              { key: 'id', label: 'ID', width: 8 },
              { key: 'stage', label: 'STAGE', width: 8 },
              { key: 'event', label: 'EVENT', width: 0 }
            ];

  const fixedWidth = baseColumns
    .filter((column) => column.key !== 'event')
    .reduce((sum, column) => sum + column.width, 0);
  const gapWidth = Math.max(0, baseColumns.length - 1);
  const minimumEventWidth = terminalColumns >= 96 ? 18 : 12;
  const eventWidth = Math.max(minimumEventWidth, terminalColumns - 4 - fixedWidth - gapWidth);
  return baseColumns.map((column) =>
    column.key === 'event' ? { ...column, width: eventWidth } : column
  );
}

function resolveProjectLabel(dataset: OperatorDashboardDataset): string {
  const projectName =
    dataset.tracked?.linear?.project_name ??
    dataset.selected?.tracked?.linear?.project_name ??
    dataset.issues
      .map((issue) => issue.tracked?.linear?.project_name ?? null)
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0) ??
    null;
  if (!projectName) {
    return 'n/a';
  }
  return sanitizeDisplayValue(projectName);
}

function appendTokenSample(
  samples: TokenSample[],
  timestampMs: number,
  totalTokens: number | null | undefined
): TokenSample[] {
  const normalizedTotal = normalizeFiniteNumber(totalTokens);
  const baselineSamples =
    samples.length > 0 && normalizedTotal < samples[0].totalTokens ? [] : samples;
  return [{ timestampMs, totalTokens: normalizedTotal }, ...baselineSamples].filter(
    (sample) => sample.timestampMs >= timestampMs - THROUGHPUT_WINDOW_MS
  );
}

function rollingTokensPerSecond(samples: TokenSample[]): number {
  if (samples.length < 2) {
    return 0;
  }
  const newest = samples[0];
  const oldest = samples[samples.length - 1];
  const elapsedMs = newest.timestampMs - oldest.timestampMs;
  const deltaTokens = Math.max(0, newest.totalTokens - oldest.totalTokens);
  if (elapsedMs <= 0) {
    return 0;
  }
  return deltaTokens / (elapsedMs / 1000);
}

function compareDueAt(left: string | null | undefined, right: string | null | undefined): number {
  const leftMs = parseTimestamp(left);
  const rightMs = parseTimestamp(right);
  if (leftMs === null && rightMs === null) {
    return 0;
  }
  if (leftMs === null) {
    return 1;
  }
  if (rightMs === null) {
    return -1;
  }
  return leftMs - rightMs;
}

function formatRelativeDue(dueAt: string | null | undefined, referenceTime: Date): string {
  const dueTimestamp = parseTimestamp(dueAt);
  if (dueTimestamp === null) {
    return 'n/a';
  }
  const remainingMs = Math.max(0, dueTimestamp - referenceTime.getTime());
  const seconds = Math.floor(remainingMs / 1000);
  const milliseconds = remainingMs % 1000;
  return `${seconds}.${String(milliseconds).padStart(3, '0')}s`;
}

function formatRetryError(error: string | null | undefined, maxWidth = 96): string {
  const sanitized = sanitizeDisplayValue(error);
  if (sanitized === '-' || maxWidth <= 0) {
    return '';
  }
  return colorize(truncatePlain(` error=${sanitized}`, maxWidth), ANSI_DIM);
}

function formatRuntimeAndTurns(
  startedAt: string | null | undefined,
  referenceTime: Date,
  turnCount: number | null | undefined
): string {
  const startedTimestamp = parseTimestamp(startedAt);
  const runtime =
    startedTimestamp === null
      ? 'n/a'
      : formatRuntimeSeconds(Math.max(0, (referenceTime.getTime() - startedTimestamp) / 1000));
  if (typeof turnCount === 'number' && Number.isFinite(turnCount) && turnCount > 0) {
    return `${runtime} / ${Math.floor(turnCount)}`;
  }
  return runtime;
}

function formatRuntimeSeconds(value: number | null | undefined): string {
  const seconds = Math.max(0, Math.floor(normalizeFiniteNumber(value)));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function formatTps(value: number | null | undefined): string {
  return formatCount(Math.max(0, Math.floor(normalizeFiniteNumber(value))));
}

function formatCount(value: number | string | null | undefined): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return '0';
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return NUMBER_FORMAT.format(Math.trunc(parsed));
    }
    return sanitizeDisplayValue(trimmed);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return NUMBER_FORMAT.format(Math.trunc(value));
  }
  return '0';
}

function formatOptionalCount(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return '-';
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return NUMBER_FORMAT.format(Math.trunc(parsed));
    }
    return sanitizeDisplayValue(trimmed);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return NUMBER_FORMAT.format(Math.trunc(value));
  }
  return '-';
}

function formatRateLimitSegments(
  value: Record<string, unknown> | null | undefined,
  referenceTime: Date
): SummarySegment[] {
  if (!value || Object.keys(value).length === 0) {
    return [{ text: 'unavailable', color: ANSI_GRAY }];
  }

  const limitId = readRecordString(value, ['limit_id', 'limitId', 'limit_name', 'limitName']);
  const primary = asRecord(value.primary);
  const secondary = asRecord(value.secondary);
  const credits = asRecord(value.credits);
  if (limitId || primary || secondary || credits) {
    const pieces: SummarySegment[] = [
      { text: sanitizeDisplayValue(limitId ?? 'unknown'), color: ANSI_YELLOW }
    ];
    if (primary) {
      pieces.push({ text: ' | ', color: ANSI_GRAY });
      pieces.push({
        text: `primary ${formatRateLimitBucket(primary, referenceTime)}`,
        color: ANSI_CYAN
      });
    }
    if (secondary) {
      pieces.push({ text: ' | ', color: ANSI_GRAY });
      pieces.push({
        text: `secondary ${formatRateLimitBucket(secondary, referenceTime)}`,
        color: ANSI_CYAN
      });
    }
    if (credits) {
      pieces.push({ text: ' | ', color: ANSI_GRAY });
      pieces.push({ text: formatRateLimitCredits(credits), color: ANSI_GREEN });
    }
    return pieces;
  }

  return [{ text: formatRecord(value), color: ANSI_GRAY }];
}

function formatRateLimitBucket(bucket: Record<string, unknown>, referenceTime: Date): string {
  const remaining = readRecordNumber(bucket, ['remaining']);
  const limit = readRecordNumber(bucket, ['limit']);
  const resetSeconds =
    readRecordNumber(bucket, ['reset_in_seconds', 'resetInSeconds']) ??
    secondsUntilTimestamp(
      readRecordString(bucket, ['reset_at', 'resetAt', 'resets_at', 'resetsAt']),
      referenceTime
    );

  let base = 'n/a';
  if (remaining !== null && limit !== null) {
    base = `${formatCount(remaining)}/${formatCount(limit)}`;
  } else if (remaining !== null) {
    base = `remaining ${formatCount(remaining)}`;
  } else if (limit !== null) {
    base = `limit ${formatCount(limit)}`;
  }

  if (resetSeconds !== null) {
    return `${base} reset ${Math.max(0, Math.floor(resetSeconds))}s`;
  }
  return base;
}

function formatRateLimitCredits(credits: Record<string, unknown>): string {
  if (readRecordBoolean(credits, ['unlimited']) === true) {
    return 'credits unlimited';
  }
  if (readRecordBoolean(credits, ['has_credits', 'hasCredits']) === false) {
    return 'credits none';
  }
  const balance = readRecordNumber(credits, ['balance']);
  if (balance !== null) {
    return `credits ${balance.toFixed(2)}`;
  }
  return 'credits available';
}

function formatRecord(value: Record<string, unknown>): string {
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

function compactSessionId(sessionId: string | null | undefined): string {
  const sanitized = sanitizeDisplayValue(sessionId);
  if (sanitized === '-') {
    return sanitized;
  }
  if (sanitized.length <= 10) {
    return sanitized;
  }
  return `${sanitized.slice(0, 4)}...${sanitized.slice(-6)}`;
}

function renderSummaryLine(
  label: string,
  segments: SummarySegment[],
  terminalColumns: number
): string {
  const prefix = `│ ${label}: `;
  const maxWidth = Math.max(0, terminalColumns - prefix.length);
  return colorize(prefix, ANSI_BOLD) + colorizeSummarySegments(segments, maxWidth);
}

function colorizeSummarySegments(segments: SummarySegment[], maxWidth: number): string {
  if (maxWidth <= 0 || segments.length === 0) {
    return '';
  }
  if (segments.length === 1 && segments[0]?.truncateMode === 'middle') {
    return colorize(truncateMiddle(segments[0].text, maxWidth), segments[0].color);
  }

  const totalWidth = segments.reduce((sum, segment) => sum + segment.text.length, 0);
  if (totalWidth <= maxWidth) {
    return segments.map((segment) => colorize(segment.text, segment.color)).join('');
  }

  if (maxWidth <= 3) {
    return colorize(
      segments
        .map((segment) => segment.text)
        .join('')
        .slice(0, maxWidth),
      segments[0]?.color ?? ANSI_GRAY
    );
  }

  let remaining = maxWidth - 3;
  let ellipsisColor = segments[0]?.color ?? ANSI_GRAY;
  const rendered: string[] = [];
  for (const segment of segments) {
    if (remaining <= 0) {
      ellipsisColor = segment.color;
      break;
    }
    if (segment.text.length <= remaining) {
      rendered.push(colorize(segment.text, segment.color));
      remaining -= segment.text.length;
      ellipsisColor = segment.color;
      continue;
    }
    rendered.push(colorize(segment.text.slice(0, remaining), segment.color));
    ellipsisColor = segment.color;
    remaining = 0;
    break;
  }
  rendered.push(colorize('...', ellipsisColor));
  return rendered.join('');
}

function formatCell(value: string, width: number, align: 'left' | 'right' = 'left'): string {
  const sanitized = truncatePlain(sanitizeDisplayValue(value), width);
  return align === 'right' ? sanitized.padStart(width) : sanitized.padEnd(width);
}

function truncatePlain(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function sanitizeDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  const sanitized = sanitizeTerminalText(String(value));
  return sanitized.length === 0 ? '-' : sanitized;
}

function truncate(value: string, maxLength: number): string {
  const sanitized = sanitizeDisplayValue(value);
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  if (maxLength <= 3) {
    return sanitized.slice(0, maxLength);
  }
  return `${sanitized.slice(0, maxLength - 3)}...`;
}

function truncateMiddle(value: string, maxLength: number): string {
  const sanitized = sanitizeDisplayValue(value);
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  const headLength = Math.max(1, Math.floor((maxLength - 3) / 2));
  const tailLength = Math.max(1, maxLength - 3 - headLength);
  return `${sanitized.slice(0, headLength)}...${sanitized.slice(-tailLength)}`;
}

function sanitizeTerminalText(value: string): string {
  return value
    .replace(/\r\n|\n|\r/g, ' ')
    .replace(ANSI_CONTROL_SEQUENCE_PATTERN, ' ')
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveReferenceTime(
  referenceTime: Date | undefined,
  generatedAt: string,
  fallbackTime: Date = new Date(0)
): Date {
  if (referenceTime instanceof Date && Number.isFinite(referenceTime.getTime())) {
    return referenceTime;
  }
  const parsed = parseTimestamp(generatedAt);
  return parsed === null ? fallbackTime : new Date(parsed);
}

function resolveTerminalColumns(value: number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return DEFAULT_TERMINAL_COLUMNS;
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function secondsUntilTimestamp(value: string | null | undefined, referenceTime: Date): number | null {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) {
    return null;
  }
  return Math.max(0, Math.floor((timestamp - referenceTime.getTime()) / 1000));
}

function normalizeFiniteNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatNullable(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return sanitizeDisplayValue(value);
}

function readRecordString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readRecordNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function readRecordBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function colorize(value: string, ansiCode: string): string {
  return `${ansiCode}${value}${ANSI_RESET}`;
}
