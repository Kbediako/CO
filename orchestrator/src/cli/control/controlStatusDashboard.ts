import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

import { logger } from '../../logger.js';
import { evaluateInteractiveGate } from '../utils/interactive.js';
import type { ControlRuntime } from './controlRuntime.js';
import {
  readUiDataset,
  type OperatorDashboardDataset,
  type OperatorDashboardGoalSummary,
  type OperatorDashboardRetryPayload,
  type OperatorDashboardSessionPayload
} from './operatorDashboardPresenter.js';

type DashboardOutput = Pick<NodeJS.WriteStream, 'write'> & {
  columns?: number;
  rows?: number;
  isTTY?: boolean;
};

type DashboardInput = Pick<NodeJS.ReadStream, 'isTTY' | 'on' | 'off' | 'pause' | 'resume'> & {
  setRawMode?: (mode: boolean) => void;
};

interface ControlStatusDashboardDependencies {
  readDataset: (runtime: ControlRuntime, signal?: AbortSignal) => Promise<OperatorDashboardDataset>;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  now: () => Date;
}

interface TokenSample {
  timestampMs: number;
  totalTokens: number;
}

interface RunningColumn {
  key: 'id' | 'stage' | 'pid' | 'age' | 'tokens' | 'session' | 'event';
  label: string;
  width: number;
  align?: 'left' | 'right';
}

interface SummarySegment {
  text: string;
  color: string;
  truncateMode?: 'end' | 'middle';
}

type DashboardResolvedModelProvenance = NonNullable<
  | OperatorDashboardSessionPayload['resolved_model_provenance']
  | OperatorDashboardRetryPayload['resolved_model_provenance']
>;
type DashboardGoalSummary = NonNullable<OperatorDashboardGoalSummary>;

type DashboardViewMode = 'full' | 'compact';
type DashboardSurfaceMode = 'primary' | 'alternate';

interface DashboardFrameState {
  paused: boolean;
  pausedLiveReferenceTime: Date | null;
  viewMode: DashboardViewMode;
  surfaceMode: DashboardSurfaceMode;
  pendingUpdate: boolean;
  snapshotStatus: 'idle' | 'saved' | 'failed';
  snapshotPath: string | null;
  snapshotMessage: string | null;
}

interface RenderedDashboardState {
  dataset: OperatorDashboardDataset;
  referenceTime: Date;
  liveClockStartedAt: Date;
  throughputTps: number;
}

const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
const combiningMarkPattern = /^\p{Mark}$/u;
const extendedPictographicPattern = /\p{Extended_Pictographic}/u;
const keycapPattern = /^[0-9#*]\uFE0F?\u20E3$/u;

export interface StartControlStatusDashboardOptions {
  runtime: ControlRuntime;
  baseUrl: string;
  taskId: string;
  runId: string;
  runDir: string;
  startPipelineId: string;
  refreshIntervalMs?: number;
  output?: DashboardOutput;
  input?: DashboardInput;
}

export interface StartAttachedControlStatusDashboardOptions {
  readDataset: (signal: AbortSignal) => Promise<OperatorDashboardDataset>;
  baseUrl: string;
  taskId: string;
  runId: string;
  runDir: string;
  startPipelineId: string;
  refreshIntervalMs?: number;
  output?: DashboardOutput;
  input?: DashboardInput;
}

export interface ControlStatusDashboardHandle {
  stop(): void;
  flush(): Promise<void>;
}

interface StartControlStatusViewerOptions {
  readDataset: (signal: AbortSignal) => Promise<OperatorDashboardDataset>;
  requestRefresh?: (() => Promise<void>) | null;
  subscribe?: ((listener: () => void) => () => void) | null;
  baseUrl: string;
  taskId: string;
  runId: string;
  runDir: string;
  startPipelineId: string;
  refreshIntervalMs?: number;
  output?: DashboardOutput;
  input?: DashboardInput;
  liveSurfaceMode?: DashboardSurfaceMode;
  showDashboardLine?: boolean;
}

export interface RenderControlStatusFrameInput {
  dataset: OperatorDashboardDataset;
  baseUrl: string;
  taskId: string;
  runId: string;
  runDir: string;
  startPipelineId: string;
  showDashboardLine?: boolean;
  terminalColumns?: number | null;
  terminalRows?: number | null;
  throughputTps?: number | null;
  referenceTime?: Date;
  liveReferenceTime?: Date;
  paused?: boolean;
  viewMode?: DashboardViewMode;
  surfaceMode?: DashboardSurfaceMode;
  pendingUpdate?: boolean;
  snapshotStatus?: 'idle' | 'saved' | 'failed';
  snapshotPath?: string | null;
  snapshotMessage?: string | null;
}

export interface ControlStatusDashboardGateInput {
  format: 'json' | 'text';
  stdoutIsTTY?: boolean;
  stderrIsTTY?: boolean;
  term?: string | null;
  env?: NodeJS.ProcessEnv;
}

const ANSI_CLEAR_HOME = '\u001b[H\u001b[2J';
const ANSI_CLEAR_DOWN = '\u001b[J';
const ANSI_ENTER_ALT_SCREEN = '\u001b[?1049h';
const ANSI_EXIT_ALT_SCREEN = '\u001b[?1049l';
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
const DEFAULT_INPUT: DashboardInput = process.stdin;
const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const DASHBOARD_SNAPSHOT_DIRNAME = 'co-status-snapshots';

const DEFAULT_DEPENDENCIES: ControlStatusDashboardDependencies = {
  readDataset: async (runtime, signal) =>
    await readUiDataset(
      {
        readCompatibilityProjection: async () => await runtime.snapshot().readCompatibilityProjection(signal)
      },
      { signal }
    ),
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
  const liveOutput = options.output ?? DEFAULT_OUTPUT;
  return startControlStatusViewer(
    {
      readDataset: async (signal) => await deps.readDataset(options.runtime, signal),
      requestRefresh: async () => {
        await options.runtime.requestRefresh();
      },
      subscribe: (listener) => options.runtime.subscribe(listener),
      baseUrl: options.baseUrl,
      taskId: options.taskId,
      runId: options.runId,
      runDir: options.runDir,
      startPipelineId: options.startPipelineId,
      refreshIntervalMs: options.refreshIntervalMs,
      output: options.output,
      input: options.input,
      liveSurfaceMode: liveOutput.isTTY === true ? 'alternate' : 'primary',
      showDashboardLine: false
    },
    deps
  );
}

export function startAttachedControlStatusDashboard(
  options: StartAttachedControlStatusDashboardOptions,
  overrides: Partial<ControlStatusDashboardDependencies> = {}
): ControlStatusDashboardHandle {
  const deps = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return startControlStatusViewer(
    {
      readDataset: options.readDataset,
      requestRefresh: null,
      subscribe: null,
      baseUrl: options.baseUrl,
      taskId: options.taskId,
      runId: options.runId,
      runDir: options.runDir,
      startPipelineId: options.startPipelineId,
      refreshIntervalMs: options.refreshIntervalMs,
      output: options.output,
      input: options.input,
      liveSurfaceMode: 'primary',
      showDashboardLine: false
    },
    deps
  );
}

function startControlStatusViewer(
  options: StartControlStatusViewerOptions,
  deps: ControlStatusDashboardDependencies
): ControlStatusDashboardHandle {
  const refreshIntervalMs = Math.max(250, options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS);
  const output = options.output ?? DEFAULT_OUTPUT;
  const input = options.input ?? DEFAULT_INPUT;
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  let activeRender: Promise<void> | null = null;
  let activeReadController: AbortController | null = null;
  let queuedRender = false;
  let queuedForceRefresh = false;
  let queuedReadDataset = false;
  let queuedUseCachedFrame = false;
  let tokenSamples: TokenSample[] = [];
  let renderedState: RenderedDashboardState | null = null;
  let escapeSequenceState: 'idle' | 'escape' | 'control' = 'idle';
  const liveSurfaceMode: DashboardSurfaceMode = options.liveSurfaceMode ?? 'primary';
  const enablePinnedPrimaryLiveRegion = liveSurfaceMode === 'primary' && output.isTTY === true;
  let activeSurfaceMode: DashboardSurfaceMode = 'primary';
  let activePrimaryFrame: string | null = null;
  let primarySurfacePromptNeedsNewline = false;
  let frameState: DashboardFrameState = {
    paused: false,
    pausedLiveReferenceTime: null,
    viewMode: 'full',
    surfaceMode: liveSurfaceMode,
    pendingUpdate: false,
    snapshotStatus: 'idle',
    snapshotPath: null,
    snapshotMessage: null
  };
  let snapshotWrite: Promise<void> | null = null;

  const queueRender = (forceRefresh: boolean, useCachedFrame: boolean): void => {
    if (stopped) {
      return;
    }
    queuedForceRefresh = queuedForceRefresh || forceRefresh;
    queuedReadDataset = queuedReadDataset || forceRefresh || !useCachedFrame;
    queuedUseCachedFrame = queuedUseCachedFrame || useCachedFrame;
    if (activeRender) {
      queuedRender = true;
      return;
    }
    startQueuedRender();
  };

  const requestRender = (forceRefresh: boolean): void => {
    if (stopped) {
      return;
    }
    if (frameState.paused) {
      frameState = {
        ...frameState,
        pendingUpdate: true
      };
      return;
    }
    queueRender(forceRefresh, false);
  };

  const requestCachedFrameRender = (): void => {
    if (stopped) {
      return;
    }
    queueRender(false, true);
  };

  const clearQueuedRenderState = (): boolean => {
    const hadQueuedRender = queuedRender || queuedForceRefresh || queuedReadDataset || queuedUseCachedFrame;
    queuedRender = false;
    queuedForceRefresh = false;
    queuedReadDataset = false;
    queuedUseCachedFrame = false;
    return hadQueuedRender;
  };

  const startQueuedRender = (): void => {
    const forceRefresh = queuedForceRefresh;
    const useCachedFrame = queuedUseCachedFrame && !queuedReadDataset && !forceRefresh;
    queuedRender = false;
    queuedForceRefresh = false;
    queuedReadDataset = false;
    queuedUseCachedFrame = false;
    activeRender = renderFrame(forceRefresh, useCachedFrame).finally(() => {
      activeRender = null;
      if (stopped || !queuedRender) {
        return;
      }
      startQueuedRender();
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

  const unsubscribe = options.subscribe?.(() => {
    requestRender(false);
  }) ?? (() => undefined);

  const detachInput = attachInteractiveInput();
  requestRender(true);
  scheduleTick();

  return {
    stop() {
      stopped = true;
      queuedRender = false;
      queuedForceRefresh = false;
      activeReadController?.abort();
      if (timer) {
        deps.clearTimeout(timer);
        timer = null;
      }
      detachInput();
      unsubscribe();
      if (activeSurfaceMode === 'alternate') {
        output.write(`${ANSI_EXIT_ALT_SCREEN}${primarySurfacePromptNeedsNewline ? '\n' : ''}`);
        activeSurfaceMode = 'primary';
      } else if (primarySurfacePromptNeedsNewline || activePrimaryFrame !== null) {
        output.write('\n');
      }
      activePrimaryFrame = null;
      primarySurfacePromptNeedsNewline = false;
    },
    async flush() {
      await activeRender;
      await snapshotWrite;
      await activeRender;
    }
  };

  function attachInteractiveInput(): () => void {
    if (input.isTTY !== true || typeof input.on !== 'function' || typeof input.off !== 'function') {
      return () => undefined;
    }
    let rawModeEnabled = false;
    const onData = (chunk: Buffer | string): void => {
      void handleInputChunk(chunk);
    };
    try {
      input.setRawMode?.(true);
      rawModeEnabled = true;
    } catch {
      return () => undefined;
    }
    input.resume?.();
    input.on('data', onData);
    return () => {
      input.off('data', onData);
      if (rawModeEnabled) {
        try {
          input.setRawMode?.(false);
        } catch {
          // Ignore TTY restore failures during shutdown.
        }
      }
      input.pause?.();
    };
  }

  async function handleInputChunk(chunk: Buffer | string): Promise<void> {
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    for (const character of text) {
      if (escapeSequenceState === 'escape') {
        if (character === '[' || character === 'O') {
          escapeSequenceState = 'control';
          continue;
        }
        escapeSequenceState = 'idle';
        continue;
      }
      if (escapeSequenceState === 'control') {
        if (character >= '@' && character <= '~') {
          escapeSequenceState = 'idle';
        }
        continue;
      }
      if (character === '\u001b') {
        escapeSequenceState = 'escape';
        continue;
      }
      if (character === '\u0003') {
        process.kill(process.pid, 'SIGINT');
        return;
      }
      if (isControlCharacter(character)) {
        continue;
      }
      const key = character.toLowerCase();
      if (key === 'p') {
        const enteringPaused = !frameState.paused;
        frameState = {
          ...frameState,
          paused: enteringPaused,
          pausedLiveReferenceTime:
            enteringPaused && renderedState ? deriveLiveReferenceTime(renderedState, deps.now()) : null,
          surfaceMode: enteringPaused ? 'primary' : liveSurfaceMode
        };
        if (frameState.paused) {
          if (activeRender) {
            const hadQueuedRender = clearQueuedRenderState();
            frameState = {
              ...frameState,
              pendingUpdate: frameState.pendingUpdate || hadQueuedRender
            };
            if (renderedState) {
              queuedRender = true;
              queuedUseCachedFrame = true;
            }
            continue;
          }
          requestCachedFrameRender();
        } else {
          const shouldForceRefresh = frameState.pendingUpdate;
          frameState = {
            ...frameState,
            pendingUpdate: false
          };
          queueRender(shouldForceRefresh, false);
        }
        continue;
      }
      if (key === 'c') {
        frameState = {
          ...frameState,
          viewMode: frameState.viewMode === 'full' ? 'compact' : 'full'
        };
        requestCachedFrameRender();
        continue;
      }
      if (key === 's') {
        if (!snapshotWrite) {
          snapshotWrite = exportSnapshot().finally(() => {
            snapshotWrite = null;
          });
        }
      }
    }
  }

  async function exportSnapshot(): Promise<void> {
    if (!renderedState) {
      return;
    }
    const timestamp = formatSnapshotTimestamp(deps.now());
    const snapshotDir = join(options.runDir, DASHBOARD_SNAPSHOT_DIRNAME);
    const snapshotPath = join(snapshotDir, `co-status-${timestamp}.txt`);
    try {
      await mkdir(snapshotDir, { recursive: true });
      const frame = renderControlStatusFrame({
        dataset: renderedState.dataset,
        baseUrl: options.baseUrl,
        taskId: options.taskId,
        runId: options.runId,
        runDir: options.runDir,
        startPipelineId: options.startPipelineId,
        showDashboardLine: options.showDashboardLine,
        terminalColumns: output.columns ?? null,
        terminalRows: output.rows ?? null,
        throughputTps: renderedState.throughputTps,
        referenceTime: renderedState.referenceTime,
        liveReferenceTime: resolveDisplayedLiveReferenceTime(renderedState, frameState, deps.now()),
        paused: frameState.paused,
        viewMode: frameState.viewMode,
        surfaceMode: frameState.surfaceMode,
        pendingUpdate: frameState.pendingUpdate,
        snapshotStatus: 'saved',
        snapshotPath,
        snapshotMessage: 'saved'
      });
      await writeFile(snapshotPath, `${stripAnsiSequences(frame)}\n`, 'utf8');
      frameState = {
        ...frameState,
        snapshotStatus: 'saved',
        snapshotPath,
        snapshotMessage: 'saved'
      };
    } catch (error) {
      frameState = {
        ...frameState,
        snapshotStatus: 'failed',
        snapshotMessage: sanitizeDisplayValue((error as Error)?.message ?? String(error))
      };
    }
    requestCachedFrameRender();
  }

  async function renderFrame(forceRefresh: boolean, useCachedFrame: boolean): Promise<void> {
    try {
      if (useCachedFrame && renderedState && !forceRefresh) {
        const frame = renderControlStatusFrame({
          dataset: renderedState.dataset,
          baseUrl: options.baseUrl,
          taskId: options.taskId,
          runId: options.runId,
          runDir: options.runDir,
          startPipelineId: options.startPipelineId,
          showDashboardLine: options.showDashboardLine,
          terminalColumns: output.columns ?? null,
          terminalRows: output.rows ?? null,
          throughputTps: renderedState.throughputTps,
          referenceTime: renderedState.referenceTime,
          liveReferenceTime: resolveDisplayedLiveReferenceTime(renderedState, frameState, deps.now()),
          paused: frameState.paused,
          viewMode: frameState.viewMode,
          surfaceMode: frameState.surfaceMode,
          pendingUpdate: frameState.pendingUpdate,
          snapshotStatus: frameState.snapshotStatus,
          snapshotPath: frameState.snapshotPath,
          snapshotMessage: frameState.snapshotMessage
        });
        writeFrame(frame);
        return;
      }
      if (forceRefresh) {
        await options.requestRefresh?.();
      }
      if (stopped) {
        return;
      }
      const readController = new AbortController();
      activeReadController = readController;
      const dataset = await options.readDataset(readController.signal).finally(() => {
        if (activeReadController === readController) {
          activeReadController = null;
        }
      });
      if (stopped) {
        return;
      }
      const now = deps.now();
      const referenceTime = resolveReferenceTime(undefined, dataset.generated_at, now);
      const liveClockStartedAt =
        renderedState && renderedState.dataset.generated_at === dataset.generated_at
          ? renderedState.liveClockStartedAt
          : now;
      tokenSamples = appendTokenSample(tokenSamples, now.getTime(), dataset.totals.total_tokens);
      const throughputTps = rollingTokensPerSecond(tokenSamples);
      const nextRenderedState: RenderedDashboardState = {
        dataset,
        referenceTime,
        liveClockStartedAt,
        throughputTps
      };
      if (frameState.paused && renderedState) {
        frameState = {
          ...frameState,
          pendingUpdate: true
        };
        return;
      }
      const liveReferenceTime =
        frameState.paused && frameState.pausedLiveReferenceTime === null
          ? deriveLiveReferenceTime(nextRenderedState, now)
          : resolveDisplayedLiveReferenceTime(nextRenderedState, frameState, now);
      renderedState = nextRenderedState;
      frameState = {
        ...frameState,
        pausedLiveReferenceTime:
          frameState.paused && frameState.pausedLiveReferenceTime === null
            ? liveReferenceTime
            : frameState.pausedLiveReferenceTime,
        pendingUpdate: frameState.paused ? frameState.pendingUpdate : false
      };
      const frame = renderControlStatusFrame({
        dataset,
        baseUrl: options.baseUrl,
        taskId: options.taskId,
        runId: options.runId,
        runDir: options.runDir,
        startPipelineId: options.startPipelineId,
        showDashboardLine: options.showDashboardLine,
        terminalColumns: output.columns ?? null,
        terminalRows: output.rows ?? null,
        throughputTps,
        referenceTime,
        liveReferenceTime,
        paused: frameState.paused,
        viewMode: frameState.viewMode,
        surfaceMode: frameState.surfaceMode,
        pendingUpdate: frameState.pendingUpdate,
        snapshotStatus: frameState.snapshotStatus,
        snapshotPath: frameState.snapshotPath,
        snapshotMessage: frameState.snapshotMessage
      });
      writeFrame(frame);
    } catch (error) {
      const message = (error as Error)?.message ?? String(error);
      if (stopped) {
        return;
      }
      logger.warn(`Failed rendering CO STATUS dashboard frame: ${message}`);
      writeFrame(
        renderControlStatusErrorFrame(
          options,
          deps.now(),
          message,
          output.columns ?? null
        )
      );
    }
  }

  function writeFrame(frame: string): void {
    if (frameState.surfaceMode === 'alternate') {
      activePrimaryFrame = null;
      if (activeSurfaceMode !== 'alternate') {
        activeSurfaceMode = 'alternate';
        output.write(`${ANSI_ENTER_ALT_SCREEN}${ANSI_CLEAR_HOME}${frame}`);
        return;
      }
      output.write(`${ANSI_CLEAR_HOME}${frame}`);
      return;
    }

    if (activeSurfaceMode === 'alternate') {
      activeSurfaceMode = 'primary';
      activePrimaryFrame = null;
      primarySurfacePromptNeedsNewline = false;
      output.write(`${ANSI_EXIT_ALT_SCREEN}${ANSI_CLEAR_HOME}${frame}\n`);
      return;
    }

    primarySurfacePromptNeedsNewline = true;
    if (enablePinnedPrimaryLiveRegion) {
      if (activePrimaryFrame !== null) {
        const viewportRows = resolveTerminalRows(output.rows ?? null);
        const previousRowCount = countFrameRows(activePrimaryFrame, output.columns ?? null);
        const currentRowCount = countFrameRows(frame, output.columns ?? null);
        if (previousRowCount > viewportRows || currentRowCount > viewportRows) {
          output.write(`${ANSI_CLEAR_HOME}${frame}`);
        } else {
          output.write(rewritePrimaryFrame(frame, previousRowCount));
        }
      } else {
        output.write(frame);
      }
      activePrimaryFrame = frame;
      return;
    }

    activePrimaryFrame = null;
    output.write(`${ANSI_CLEAR_HOME}${frame}`);
  }
}

function countFrameRows(frame: string, terminalColumns: number | null | undefined): number {
  if (frame.length === 0) {
    return 0;
  }
  const columns = resolveTerminalColumns(terminalColumns);
  return frame
    .split('\n')
    .reduce((rowCount, line) => rowCount + countWrappedTerminalRows(stripAnsiSequences(line), columns), 0);
}

function countWrappedTerminalRows(line: string, terminalColumns: number): number {
  if (terminalColumns <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(measureTerminalDisplayWidth(line) / terminalColumns));
}

function measureTerminalDisplayWidth(line: string): number {
  if (line.length === 0) {
    return 0;
  }
  if (graphemeSegmenter === null) {
    return Array.from(line).reduce((width, grapheme) => width + measureTerminalGraphemeWidth(grapheme), 0);
  }

  let width = 0;
  for (const { segment } of graphemeSegmenter.segment(line)) {
    width += measureTerminalGraphemeWidth(segment);
  }
  return width;
}

function measureTerminalGraphemeWidth(grapheme: string): number {
  if (grapheme.length === 0) {
    return 0;
  }
  if (containsExtendedPictographic(grapheme) || isRegionalIndicatorCluster(grapheme) || isKeycapCluster(grapheme)) {
    return 2;
  }

  let width = 0;
  for (const char of grapheme) {
    width += measureTerminalCodePointWidth(char);
  }
  return width;
}

function measureTerminalCodePointWidth(char: string): number {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined || isZeroWidthCodePoint(codePoint) || combiningMarkPattern.test(char)) {
    return 0;
  }
  return isFullwidthCodePoint(codePoint) ? 2 : 1;
}

function containsExtendedPictographic(value: string): boolean {
  return extendedPictographicPattern.test(value);
}

function isRegionalIndicatorCluster(value: string): boolean {
  const codePoints = Array.from(value, (char) => char.codePointAt(0) ?? 0);
  return codePoints.length > 0 && codePoints.every((codePoint) => codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff);
}

function isKeycapCluster(value: string): boolean {
  return keycapPattern.test(value);
}

function isZeroWidthCodePoint(codePoint: number): boolean {
  return (
    codePoint < 0x20 ||
    (codePoint >= 0x7f && codePoint < 0xa0) ||
    codePoint === 0x200b ||
    codePoint === 0x200c ||
    codePoint === 0x200d ||
    codePoint === 0x2060 ||
    (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef)
  );
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

function rewritePrimaryFrame(frame: string, previousRowCount: number): string {
  let prefix = '\r';
  if (previousRowCount > 1) {
    prefix += `\u001b[${previousRowCount - 1}A`;
  }
  return `${prefix}${ANSI_CLEAR_DOWN}${frame}`;
}

export function renderControlStatusFrame(input: RenderControlStatusFrameInput): string {
  const referenceTime = resolveReferenceTime(input.referenceTime, input.dataset.generated_at);
  const liveReferenceTime = resolveLiveReferenceTime(input.liveReferenceTime, referenceTime);
  const terminalColumns = resolveTerminalColumns(input.terminalColumns);
  const terminalRows = resolveTerminalRows(input.terminalRows);
  const frameState: DashboardFrameState = {
    paused: input.paused === true,
    pausedLiveReferenceTime: null,
    viewMode: input.viewMode ?? 'full',
    surfaceMode: input.surfaceMode ?? (input.paused === true ? 'primary' : 'alternate'),
    pendingUpdate: input.pendingUpdate === true,
    snapshotStatus: input.snapshotStatus ?? 'idle',
    snapshotPath: input.snapshotPath ?? null,
    snapshotMessage: input.snapshotMessage ?? null
  };
  if (frameState.viewMode === 'compact') {
    return renderCompactControlStatusFrame(
      input,
      referenceTime,
      liveReferenceTime,
      terminalColumns,
      terminalRows,
      frameState
    );
  }
  const runningColumns = selectRunningColumns(terminalColumns);
  const lines: string[] = [
    colorize('╭─ CO STATUS', ANSI_BOLD),
    renderAgentsLine(input.dataset, terminalColumns),
    ...renderDashboardDegradedLines(input.dataset, terminalColumns),
    renderThroughputLine(input.throughputTps ?? 0, terminalColumns),
    renderRuntimeLine(input.dataset, referenceTime, liveReferenceTime, terminalColumns),
    renderTokensLine(input.dataset, terminalColumns),
    renderRateLimitsLine(input.dataset, referenceTime, terminalColumns),
    renderProjectLine(input.dataset, terminalColumns),
    renderNextRefreshLine(input.dataset, liveReferenceTime, terminalColumns),
    colorize('├─ Running', ANSI_BOLD),
    '│',
    renderRunningHeaderRow(runningColumns),
    renderRunningSeparatorRow(runningColumns)
  ];

  lines.push(...renderRunningRows(input.dataset.running, runningColumns, liveReferenceTime, terminalColumns));
  lines.push('│');
  lines.push(colorize('├─ Backoff queue', ANSI_BOLD));
  lines.push('│');
  lines.push(...renderRetryRows(input.dataset.retrying, referenceTime, terminalColumns));
  lines.push('│');
  lines.push(colorize('├─ Status controls', ANSI_BOLD));
  lines.push(renderControlsLine(terminalColumns, frameState));
  lines.push(
    renderInspectLine(
      terminalColumns,
      frameState,
      linesWillExceedTerminalHeight(terminalRows, lines.length + 3) && frameState.viewMode === 'full'
    )
  );
  lines.push(renderSnapshotLine(terminalColumns, frameState));
  lines.push('╰─');

  return lines.join('\n');
}

function renderCompactControlStatusFrame(
  input: RenderControlStatusFrameInput,
  referenceTime: Date,
  liveReferenceTime: Date,
  terminalColumns: number,
  terminalRows: number,
  frameState: DashboardFrameState
): string {
  const lines: string[] = [
    colorize('╭─ CO STATUS', ANSI_BOLD),
    renderCompactStatusLine(input.dataset, referenceTime, liveReferenceTime, terminalColumns),
    ...renderDashboardDegradedLines(input.dataset, terminalColumns),
    renderTokensLine(input.dataset, terminalColumns),
    renderRateLimitsLine(input.dataset, referenceTime, terminalColumns),
    renderCompactRunningLine(input.dataset.running, liveReferenceTime, terminalColumns),
    renderCompactRetryLine(input.dataset.retrying, referenceTime, terminalColumns),
    renderControlsLine(terminalColumns, frameState),
    renderInspectLine(
      terminalColumns,
      frameState,
      linesWillExceedTerminalHeight(terminalRows, 10)
    ),
    renderSnapshotLine(terminalColumns, frameState),
    '╰─'
  ];
  return lines.join('\n');
}

function renderControlStatusErrorFrame(
  input: Pick<
    StartControlStatusViewerOptions,
    'baseUrl' | 'taskId' | 'runId' | 'runDir' | 'startPipelineId' | 'showDashboardLine'
  >,
  now: Date,
  message: string,
  terminalColumns?: number | null
): string {
  const safe = (value: unknown): string => sanitizeDisplayValue(value);
  const columns = resolveTerminalColumns(terminalColumns);
  const lines = [
    colorize('╭─ CO STATUS', ANSI_BOLD),
    renderSummaryLine('Generated', [{ text: now.toISOString(), color: ANSI_CYAN }], columns),
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
  ];
  return lines.join('\n');
}

function renderAgentsLine(dataset: OperatorDashboardDataset, terminalColumns: number): string {
  const maxAllowed = resolveMaxAllowedAgents(dataset);
  return renderSummaryLine(
    'Agents',
    [
      { text: formatCount(dataset.counts.running), color: ANSI_GREEN },
      { text: '/', color: ANSI_GRAY },
      { text: `${formatOptionalCount(maxAllowed)} max allowed`, color: ANSI_GRAY }
    ],
    terminalColumns
  );
}

function renderDashboardDegradedLines(
  dataset: OperatorDashboardDataset,
  terminalColumns: number
): string[] {
  const degraded = dataset.dashboard_degraded;
  if (!degraded) {
    return [];
  }
  const reason = sanitizeDisplayValue(degraded.reason);
  const message = sanitizeDisplayValue(degraded.message);
  return [
    renderSummaryLine(
      'Dashboard error',
      [
        { text: reason, color: ANSI_RED },
        { text: ' | ', color: ANSI_GRAY },
        { text: message, color: ANSI_RED, truncateMode: 'end' }
      ],
      terminalColumns
    )
  ];
}

function renderThroughputLine(throughputTps: number, terminalColumns: number): string {
  return renderSummaryLine(
    'Throughput',
    [{ text: `${formatTps(throughputTps)} tps`, color: ANSI_CYAN }],
    terminalColumns
  );
}

function renderRuntimeLine(
  dataset: OperatorDashboardDataset,
  referenceTime: Date,
  liveReferenceTime: Date,
  terminalColumns: number
): string {
  return renderSummaryLine(
    'Runtime',
    [{ text: formatLiveRuntimeSeconds(dataset, referenceTime, liveReferenceTime), color: ANSI_MAGENTA }],
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
      { text: `total ${formatOptionalCount(dataset.totals.total_tokens)}`, color: ANSI_YELLOW },
      { text: ' | ', color: ANSI_GRAY },
      {
        text: `reasoning ${formatOptionalCount(dataset.totals.reasoning_output_tokens)}`,
        color: ANSI_YELLOW
      }
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

function renderNextRefreshLine(
  dataset: OperatorDashboardDataset,
  liveReferenceTime: Date,
  terminalColumns: number
): string {
  const nextRefreshText = resolveNextRefreshSummaryText(dataset.polling);
  const freshnessSegments = buildPollingFreshnessSegments(dataset.polling, liveReferenceTime);
  if (nextRefreshText === 'checking now...') {
    return renderSummaryLine(
      'Next refresh',
      [{ text: 'checking now...', color: ANSI_CYAN }, ...freshnessSegments],
      terminalColumns
    );
  }
  if (nextRefreshText) {
    return renderSummaryLine(
      'Next refresh',
      [{ text: nextRefreshText, color: ANSI_CYAN }, ...freshnessSegments],
      terminalColumns
    );
  }
  return renderSummaryLine(
    'Next refresh',
    [{ text: 'n/a', color: ANSI_GRAY }, ...freshnessSegments],
    terminalColumns
  );
}

function renderCompactStatusLine(
  dataset: OperatorDashboardDataset,
  referenceTime: Date,
  liveReferenceTime: Date,
  terminalColumns: number
): string {
  const maxAllowed = resolveMaxAllowedAgents(dataset);
  const nextRefreshText = resolveNextRefreshSummaryText(dataset.polling);
  const sourceFreshnessText = resolvePollingSourceFreshnessText(dataset.polling, liveReferenceTime);
  const refreshText =
    nextRefreshText === null
      ? 'next n/a'
      : nextRefreshText === 'checking now...'
        ? nextRefreshText
        : `next ${nextRefreshText}`;
  const freshnessColor = resolvePollingSourceFreshnessColor(dataset.polling, liveReferenceTime);
  return renderSummaryLine(
    'Status',
    [
      {
        text: `${formatCount(dataset.counts.running)}/${formatOptionalCount(maxAllowed)} max allowed`,
        color: ANSI_GREEN
      },
      { text: ' | ', color: ANSI_GRAY },
      { text: formatLiveRuntimeSeconds(dataset, referenceTime, liveReferenceTime), color: ANSI_MAGENTA },
      { text: ' | ', color: ANSI_GRAY },
      { text: refreshText, color: ANSI_CYAN },
      ...(sourceFreshnessText
        ? [
            { text: ' | ', color: ANSI_GRAY } satisfies SummarySegment,
            { text: sourceFreshnessText, color: freshnessColor } satisfies SummarySegment
          ]
        : [])
    ],
    terminalColumns
  );
}

function resolveNextRefreshSummaryText(
  polling: OperatorDashboardDataset['polling']
): string | null {
  const hasProjectedState =
    polling?.next_refresh_state !== undefined && polling?.next_refresh_state !== null;
  const projectedState =
    polling?.next_refresh_state === 'cooldown' ||
    polling?.next_refresh_state === 'checking' ||
    polling?.next_refresh_state === 'scheduled' ||
    polling?.next_refresh_state === 'unknown'
      ? polling.next_refresh_state
      : null;
  const projectedCountdown =
    typeof polling?.next_refresh_in_ms === 'number' &&
    Number.isFinite(polling.next_refresh_in_ms) &&
    polling.next_refresh_in_ms >= 0
      ? polling.next_refresh_in_ms
      : null;
  if (projectedState === 'checking') {
    return 'checking now...';
  }
  if (projectedState === 'unknown') {
    return null;
  }
  if (
    (projectedState === 'cooldown' || projectedState === 'scheduled') &&
    projectedCountdown !== null
  ) {
    return formatCountdownMs(projectedCountdown);
  }
  if (hasProjectedState) {
    return null;
  }
  if (polling?.checking) {
    return 'checking now...';
  }
  if (
    typeof polling?.next_poll_in_ms === 'number' &&
    Number.isFinite(polling.next_poll_in_ms) &&
    polling.next_poll_in_ms >= 0
  ) {
    return formatCountdownMs(polling.next_poll_in_ms);
  }
  return null;
}

function buildPollingFreshnessSegments(
  polling: OperatorDashboardDataset['polling'],
  liveReferenceTime: Date
): SummarySegment[] {
  const freshnessText = resolvePollingSourceFreshnessText(polling, liveReferenceTime);
  if (!freshnessText) {
    return [];
  }
  return [
    { text: ' | ', color: ANSI_GRAY },
    {
      text: freshnessText,
      color: resolvePollingSourceFreshnessColor(polling, liveReferenceTime)
    }
  ];
}

function resolvePollingSourceFreshnessText(
  polling: OperatorDashboardDataset['polling'],
  liveReferenceTime: Date
): string | null {
  const freshnessAge = formatRelativePast(polling?.source_updated_at ?? null, liveReferenceTime);
  return freshnessAge === null ? null : `source ${freshnessAge} old`;
}

function resolvePollingSourceFreshnessColor(
  polling: OperatorDashboardDataset['polling'],
  liveReferenceTime: Date
): string {
  const sourceUpdatedAtMs = parseTimestamp(polling?.source_updated_at ?? null);
  const intervalMs =
    typeof polling?.interval_ms === 'number' && Number.isFinite(polling.interval_ms) && polling.interval_ms > 0
      ? polling.interval_ms
      : null;
  const referenceMs = liveReferenceTime.getTime();
  if (sourceUpdatedAtMs === null || intervalMs === null || !Number.isFinite(referenceMs)) {
    return ANSI_GRAY;
  }
  return referenceMs - sourceUpdatedAtMs > intervalMs ? ANSI_YELLOW : ANSI_GRAY;
}

function renderCompactRunningLine(
  entries: OperatorDashboardSessionPayload[],
  referenceTime: Date,
  terminalColumns: number
): string {
  if (entries.length === 0) {
    return renderSummaryLine('Running', [{ text: 'No active agents', color: ANSI_GRAY }], terminalColumns);
  }
  const [entry] = [...entries].sort((left, right) => left.issue_identifier.localeCompare(right.issue_identifier));
  return renderSummaryLine(
    'Running',
    [
      { text: sanitizeDisplayValue(entry.issue_identifier), color: ANSI_CYAN },
      { text: ' | ', color: ANSI_GRAY },
      { text: sanitizeDisplayValue(entry.display_state), color: resolveRunningAccent(entry) },
      { text: ' | ', color: ANSI_GRAY },
      ...buildCompactGoalSummarySegments(entry.goal_summary),
      ...buildCompactModelProvenanceSegments(entry.resolved_model_provenance),
      { text: summarizeRunningEvent(entry, referenceTime), color: ANSI_GRAY, truncateMode: 'end' }
    ],
    terminalColumns
  );
}

function renderCompactRetryLine(
  entries: OperatorDashboardRetryPayload[],
  referenceTime: Date,
  terminalColumns: number
): string {
  if (entries.length === 0) {
    return renderSummaryLine('Retry', [{ text: 'No queued retries', color: ANSI_GRAY }], terminalColumns);
  }
  const [entry] = [...entries].sort((left, right) => compareDueAt(left.due_at, right.due_at));
  return renderSummaryLine(
    'Retry',
    [
      { text: sanitizeDisplayValue(entry.issue_identifier), color: ANSI_RED },
      { text: ' | ', color: ANSI_GRAY },
      { text: `${summarizeRetryHeadline(entry)} in ${formatRelativeDue(entry.due_at, referenceTime)}`, color: ANSI_CYAN },
      { text: ' | ', color: ANSI_GRAY },
      ...buildCompactModelProvenanceSegments(entry.resolved_model_provenance),
      { text: summarizeRetryDetail(entry), color: ANSI_GRAY, truncateMode: 'end' }
    ],
    terminalColumns
  );
}

function renderControlsLine(terminalColumns: number, frameState: DashboardFrameState): string {
  return renderSummaryLine(
    'Controls',
    [
      { text: `p ${frameState.paused ? 'resume live redraw' : 'freeze live redraw'}`, color: ANSI_CYAN },
      { text: ' | ', color: ANSI_GRAY },
      { text: `c ${frameState.viewMode === 'full' ? 'compact inspect' : 'full frame'}`, color: ANSI_CYAN },
      { text: ' | ', color: ANSI_GRAY },
      { text: 's snapshot export', color: ANSI_CYAN }
    ],
    terminalColumns
  );
}

function renderInspectLine(
  terminalColumns: number,
  frameState: DashboardFrameState,
  frameExceedsTerminalHeight: boolean
): string {
  const surfaceLabel =
    frameState.surfaceMode === 'alternate'
      ? 'alternate screen'
      : frameState.paused
        ? 'primary snapshot'
        : 'primary scrollback';
  const segments: SummarySegment[] = [
    { text: frameState.paused ? 'paused' : 'live', color: frameState.paused ? ANSI_YELLOW : ANSI_GREEN },
    { text: ' | ', color: ANSI_GRAY },
    { text: surfaceLabel, color: frameState.surfaceMode === 'alternate' ? ANSI_BLUE : ANSI_MAGENTA },
    { text: ' | ', color: ANSI_GRAY },
    { text: frameState.viewMode === 'compact' ? 'compact inspect' : 'full frame', color: ANSI_CYAN }
  ];
  if (frameState.pendingUpdate) {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({ text: 'updates waiting', color: ANSI_YELLOW });
  }
  if (frameExceedsTerminalHeight && frameState.viewMode === 'full') {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({ text: 'short terminal: pause then compact', color: ANSI_RED });
  }
  return renderSummaryLine('Inspect', segments, terminalColumns);
}

function renderSnapshotLine(terminalColumns: number, frameState: DashboardFrameState): string {
  if (frameState.snapshotStatus === 'saved' && frameState.snapshotPath) {
    return renderSummaryLine(
      'Snapshot',
      [
        { text: 'saved', color: ANSI_GREEN },
        { text: ' | ', color: ANSI_GRAY },
        { text: frameState.snapshotPath, color: ANSI_CYAN, truncateMode: 'middle' }
      ],
      terminalColumns
    );
  }
  if (frameState.snapshotStatus === 'failed') {
    return renderSummaryLine(
      'Snapshot',
      [
        { text: 'save failed', color: ANSI_RED },
        { text: ' | ', color: ANSI_GRAY },
        { text: frameState.snapshotMessage ?? 'unknown error', color: ANSI_GRAY, truncateMode: 'end' }
      ],
      terminalColumns
    );
  }
  return renderSummaryLine(
    'Snapshot',
    [{ text: 'press s to export a stable frame under run dir', color: ANSI_GRAY, truncateMode: 'end' }],
    terminalColumns
  );
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
  referenceTime: Date,
  terminalColumns: number
): string[] {
  if (entries.length === 0) {
    return [`│  ${colorize('No active agents', ANSI_GRAY)}`];
  }
  return [...entries]
    .sort((left, right) => left.issue_identifier.localeCompare(right.issue_identifier))
    .flatMap((entry) => {
      const row = renderRunningRow(entry, columns, referenceTime);
      const goalRow = renderRunningGoalSummaryRow(entry, terminalColumns);
      const provenanceRow = renderRunningModelProvenanceRow(entry, terminalColumns);
      return [row, goalRow, provenanceRow].filter((line): line is string => line !== null);
    });
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
      case 'pid':
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
    .flatMap((entry) => {
      const row = renderRetryRow(entry, referenceTime, terminalColumns);
      const provenanceRow = renderRetryModelProvenanceRow(entry, terminalColumns);
      return provenanceRow === null ? [row] : [row, provenanceRow];
    });
}

function renderRetryRow(
  entry: OperatorDashboardRetryPayload,
  referenceTime: Date,
  terminalColumns: number
): string {
  const issueIdentifier = sanitizeDisplayValue(entry.issue_identifier);
  const attempt = formatNullable(entry.attempt);
  const relativeDue = formatRelativeDue(entry.due_at, referenceTime);
  const plainPrefix = `│  ↻ ${issueIdentifier} `;
  const coloredPrefix = `│  ${colorize('↻', ANSI_YELLOW)} ${colorize(issueIdentifier, ANSI_RED)} `;
  const detail = summarizeRetryDetail(entry);
  const segments: SummarySegment[] = [
    { text: summarizeRetryHeadline(entry), color: ANSI_YELLOW },
    { text: ' in ', color: ANSI_DIM },
    { text: relativeDue, color: ANSI_CYAN }
  ];
  if (attempt !== '-') {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({ text: `attempt ${attempt}`, color: ANSI_YELLOW });
  }
  if (detail !== 'n/a') {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({ text: detail, color: ANSI_GRAY, truncateMode: 'end' });
  }
  return coloredPrefix + colorizeSummarySegments(segments, Math.max(0, terminalColumns - plainPrefix.length));
}

function renderRunningModelProvenanceRow(
  entry: OperatorDashboardSessionPayload,
  terminalColumns: number
): string | null {
  return renderModelProvenanceDetailRow(
    entry.issue_identifier,
    entry.resolved_model_provenance,
    terminalColumns
  );
}

function renderRunningGoalSummaryRow(
  entry: OperatorDashboardSessionPayload,
  terminalColumns: number
): string | null {
  const segments = buildGoalSummarySegments(entry.goal_summary);
  if (!segments) {
    return null;
  }
  const displayIssueIdentifier = sanitizeDisplayValue(entry.issue_identifier);
  const plainPrefix = `│   ↳ ${displayIssueIdentifier} `;
  const coloredPrefix = `│   ${colorize('↳', ANSI_CYAN)} ${colorize(displayIssueIdentifier, ANSI_CYAN)} `;
  return coloredPrefix + colorizeSummarySegments(segments, Math.max(0, terminalColumns - plainPrefix.length));
}

function renderRetryModelProvenanceRow(
  entry: OperatorDashboardRetryPayload,
  terminalColumns: number
): string | null {
  return renderModelProvenanceDetailRow(
    entry.issue_identifier,
    entry.resolved_model_provenance,
    terminalColumns
  );
}

function renderModelProvenanceDetailRow(
  issueIdentifier: string,
  provenance: DashboardResolvedModelProvenance | null | undefined,
  terminalColumns: number
): string | null {
  const segments = buildModelProvenanceSegments(provenance);
  if (!segments) {
    return null;
  }
  const displayIssueIdentifier = sanitizeDisplayValue(issueIdentifier);
  const plainPrefix = `│   ↳ ${displayIssueIdentifier} `;
  const coloredPrefix = `│   ${colorize('↳', ANSI_CYAN)} ${colorize(displayIssueIdentifier, ANSI_CYAN)} `;
  return coloredPrefix + colorizeSummarySegments(segments, Math.max(0, terminalColumns - plainPrefix.length));
}

function buildCompactModelProvenanceSegments(
  provenance: DashboardResolvedModelProvenance | null | undefined
): SummarySegment[] {
  const summary = formatCompactModelProvenanceSummary(provenance);
  if (!summary) {
    return [];
  }
  return [
    { text: summary, color: resolveModelProvenanceConfidenceColor(provenance?.confidence) },
    { text: ' | ', color: ANSI_GRAY }
  ];
}

function buildCompactGoalSummarySegments(
  goalSummary: DashboardGoalSummary | null | undefined
): SummarySegment[] {
  if (!goalSummary) {
    return [];
  }
  const checksumSuffix = goalSummary.checksum_short ? ` ${sanitizeDisplayValue(goalSummary.checksum_short)}` : '';
  return [
    {
      text: `goal ${formatGoalSummaryStateForDisplay(goalSummary.state)}${checksumSuffix}`,
      color: resolveGoalSummaryColor(goalSummary.state)
    },
    { text: ' | ', color: ANSI_GRAY }
  ];
}

function buildGoalSummarySegments(
  goalSummary: DashboardGoalSummary | null | undefined
): SummarySegment[] | null {
  if (!goalSummary) {
    return null;
  }
  const segments: SummarySegment[] = [
    { text: `goal ${formatGoalSummaryStateForDisplay(goalSummary.state)}`, color: resolveGoalSummaryColor(goalSummary.state) }
  ];
  if (goalSummary.checksum_short) {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({
      text: `checksum ${sanitizeDisplayValue(goalSummary.checksum_short)}`,
      color: ANSI_CYAN
    });
  }
  if (goalSummary.status) {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({
      text: `status ${sanitizeDisplayValue(goalSummary.status)}`,
      color: resolveGoalSummaryColor(goalSummary.state)
    });
  }
  segments.push({ text: ' | ', color: ANSI_GRAY });
  segments.push({
    text: sanitizeDisplayValue(goalSummary.authority),
    color: ANSI_GRAY
  });
  if (goalSummary.objective_preview) {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({
      text: sanitizeDisplayValue(goalSummary.objective_preview),
      color: ANSI_GRAY,
      truncateMode: 'end'
    });
  }
  if (goalSummary.reason) {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({
      text: `reason ${sanitizeDisplayValue(goalSummary.reason)}`,
      color: ANSI_YELLOW,
      truncateMode: 'end'
    });
  }
  return segments;
}

function buildModelProvenanceSegments(
  provenance: DashboardResolvedModelProvenance | null | undefined
): SummarySegment[] | null {
  if (!provenance) {
    return null;
  }
  const confidenceColor = resolveModelProvenanceConfidenceColor(provenance.confidence);
  const segments: SummarySegment[] = [
    { text: `model ${sanitizeDisplayValue(provenance.model ?? 'unknown')}`, color: ANSI_CYAN },
    { text: ' | ', color: ANSI_GRAY },
    { text: `review ${sanitizeDisplayValue(provenance.review_model ?? 'unknown')}`, color: ANSI_CYAN },
    { text: ' | ', color: ANSI_GRAY },
    {
      text: `reasoning ${sanitizeDisplayValue(provenance.model_reasoning_effort ?? 'unknown')}`,
      color: ANSI_CYAN
    },
    { text: ' | ', color: ANSI_GRAY },
    { text: `source ${sanitizeDisplayValue(provenance.source)}`, color: confidenceColor },
    { text: ' | ', color: ANSI_GRAY },
    { text: `confidence ${sanitizeDisplayValue(provenance.confidence)}`, color: confidenceColor }
  ];
  if (provenance.degraded_reason) {
    segments.push({ text: ' | ', color: ANSI_GRAY });
    segments.push({
      text: `degraded ${sanitizeDisplayValue(provenance.degraded_reason)}`,
      color: ANSI_RED
    });
  }
  return segments;
}

function formatCompactModelProvenanceSummary(
  provenance: DashboardResolvedModelProvenance | null | undefined
): string | null {
  if (!provenance) {
    return null;
  }
  const model = sanitizeDisplayValue(provenance.model ?? 'unknown');
  const source = sanitizeDisplayValue(provenance.source);
  const confidence = sanitizeDisplayValue(provenance.confidence);
  const degraded = provenance.degraded_reason
    ? ` degraded ${sanitizeDisplayValue(provenance.degraded_reason)}`
    : '';
  return `model ${model} ${source}/${confidence}${degraded}`;
}

function resolveModelProvenanceConfidenceColor(
  confidence: DashboardResolvedModelProvenance['confidence'] | null | undefined
): string {
  switch (confidence) {
    case 'high':
      return ANSI_GREEN;
    case 'medium':
      return ANSI_YELLOW;
    case 'degraded':
      return ANSI_RED;
    default:
      return ANSI_GRAY;
  }
}

function resolveGoalSummaryColor(state: DashboardGoalSummary['state']): string {
  switch (state) {
    case 'active':
      return ANSI_GREEN;
    case 'complete':
      return ANSI_MAGENTA;
    case 'stale':
    case 'unavailable':
      return ANSI_YELLOW;
    case 'mismatched_thread':
      return ANSI_RED;
    case 'missing':
    default:
      return ANSI_GRAY;
  }
}

function formatGoalSummaryStateForDisplay(state: DashboardGoalSummary['state']): string {
  return state === 'mismatched_thread' ? 'mismatched-thread' : sanitizeDisplayValue(state);
}

function resolveRunningAccent(entry: OperatorDashboardSessionPayload): string {
  const lastEvent = normalizeRunningEventKey(entry.last_event) ?? '';
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
    case 'pid':
      return formatPid(entry.pid);
    case 'age':
      return formatRuntimeAndTurns(entry.started_at, referenceTime, entry.turn_count);
    case 'tokens':
      return formatOptionalCount(entry.tokens.total_tokens);
    case 'session':
      return compactSessionId(entry.session_id);
    case 'event':
      return summarizeRunningEvent(entry, referenceTime);
    default:
      return 'n/a';
  }
}

function summarizeRunningEvent(entry: OperatorDashboardSessionPayload, referenceTime: Date): string {
  const displayEvent = sanitizeDisplayValue(entry.display_event);
  if (displayEvent !== '-') {
    return appendWorkerHostSummary(displayEvent, entry.worker_host);
  }
  const displayState = sanitizeDisplayValue(entry.display_state).toLowerCase();
  const lastMessage = sanitizeDisplayValue(entry.last_message);
  if (isHighSignalStatusText(lastMessage, displayState)) {
    return appendWorkerHostSummary(lastMessage, entry.worker_host);
  }
  const summary = sanitizeDisplayValue(entry.summary);
  if (isHighSignalStatusText(summary, displayState) && !sameStatusText(summary, lastMessage)) {
    return appendWorkerHostSummary(summary, entry.worker_host);
  }
  const humanizedEvent = humanizeRunningEvent(entry.last_event);
  const eventAge = formatRelativePast(entry.last_event_at, referenceTime);
  if (isHighSignalStatusText(humanizedEvent, displayState)) {
    return appendWorkerHostSummary(humanizedEvent, entry.worker_host);
  }
  const statusReason = humanizeRunningEvent(entry.status_reason);
  if (isHighSignalStatusText(statusReason, displayState)) {
    return appendWorkerHostSummary(statusReason, entry.worker_host);
  }
  if (humanizedEvent !== 'n/a' && eventAge !== null) {
    return appendWorkerHostSummary(`${humanizedEvent} (${eventAge} ago)`, entry.worker_host);
  }
  if (summary !== '-') {
    return appendWorkerHostSummary(summary, entry.worker_host);
  }
  if (lastMessage !== '-') {
    return appendWorkerHostSummary(
      eventAge === null ? lastMessage : `${lastMessage} (${eventAge} ago)`,
      entry.worker_host
    );
  }
  return appendWorkerHostSummary('n/a', entry.worker_host);
}

function summarizeRetryHeadline(entry: OperatorDashboardRetryPayload): string {
  const lastEvent = humanizeRunningEvent(entry.last_event);
  if (lastEvent !== 'n/a') {
    return lastEvent;
  }
  const statusReason = humanizeRunningEvent(entry.status_reason);
  if (statusReason !== 'n/a') {
    return statusReason;
  }
  const displayState = sanitizeDisplayValue(entry.display_state);
  return displayState === '-' ? 'retrying' : displayState;
}

function summarizeRetryDetail(entry: OperatorDashboardRetryPayload): string {
  const headline = summarizeRetryHeadline(entry).toLowerCase();
  const displayState = sanitizeDisplayValue(entry.display_state).toLowerCase();
  const error = sanitizeDisplayValue(entry.error);
  if (isHighSignalStatusText(error, displayState) && !sameStatusText(error, headline)) {
    return appendWorkerHostSummary(error, entry.worker_host);
  }
  const summary = sanitizeDisplayValue(entry.summary);
  if (isHighSignalStatusText(summary, displayState) && !sameStatusText(summary, headline)) {
    return appendWorkerHostSummary(summary, entry.worker_host);
  }
  const lastMessage = sanitizeDisplayValue(entry.last_message);
  if (isHighSignalStatusText(lastMessage, displayState) && !sameStatusText(lastMessage, headline)) {
    return appendWorkerHostSummary(lastMessage, entry.worker_host);
  }
  const statusReason = humanizeRunningEvent(entry.status_reason);
  if (isHighSignalStatusText(statusReason, displayState) && !sameStatusText(statusReason, headline)) {
    return appendWorkerHostSummary(statusReason, entry.worker_host);
  }
  return appendWorkerHostSummary('n/a', entry.worker_host);
}

function appendWorkerHostSummary(summary: string, workerHost: string | null | undefined): string {
  const displayWorkerHost = sanitizeDisplayValue(workerHost);
  if (displayWorkerHost === '-') {
    return summary;
  }
  if (summary === 'n/a') {
    return `worker ${displayWorkerHost}`;
  }
  return `${displayWorkerHost} | ${summary}`;
}

function selectRunningColumns(terminalColumns: number): RunningColumn[] {
  const baseColumns: RunningColumn[] =
    terminalColumns >= 120
      ? [
          { key: 'id', label: 'ID', width: 10 },
          { key: 'stage', label: 'STAGE', width: 12 },
          { key: 'pid', label: 'PID', width: 8 },
          { key: 'age', label: 'AGE / TURN', width: 12 },
          { key: 'tokens', label: 'TOKENS', width: 10, align: 'right' },
          { key: 'session', label: 'SESSION', width: 14 },
          { key: 'event', label: 'EVENT', width: 0 }
        ]
      : terminalColumns >= 96
        ? [
            { key: 'id', label: 'ID', width: 9 },
            { key: 'stage', label: 'STAGE', width: 10 },
            { key: 'pid', label: 'PID', width: 7 },
            { key: 'age', label: 'AGE / TURN', width: 12 },
            { key: 'tokens', label: 'TOKENS', width: 9, align: 'right' },
            { key: 'session', label: 'SESSION', width: 12 },
            { key: 'event', label: 'EVENT', width: 0 }
          ]
        : terminalColumns >= 78
          ? [
              { key: 'id', label: 'ID', width: 9 },
              { key: 'stage', label: 'STAGE', width: 10 },
              { key: 'pid', label: 'PID', width: 7 },
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
  if (totalTokens === null || totalTokens === undefined || !Number.isFinite(totalTokens)) {
    return samples.filter((sample) => sample.timestampMs >= timestampMs - THROUGHPUT_WINDOW_MS);
  }
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
  return formatCountdownMs(remainingMs);
}

function formatRelativePast(timestamp: string | null | undefined, referenceTime: Date): string | null {
  const parsedTimestamp = parseTimestamp(timestamp);
  if (parsedTimestamp === null) {
    return null;
  }
  const elapsedSeconds = Math.max(0, Math.floor((referenceTime.getTime() - parsedTimestamp) / 1000));
  return formatHumanDurationShort(elapsedSeconds);
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
  const turns =
    typeof turnCount === 'number' && Number.isFinite(turnCount) && turnCount >= 0
      ? String(Math.floor(turnCount))
      : 'n/a';
  return `${runtime} / ${turns}`;
}

function formatRuntimeSeconds(value: number | null | undefined): string {
  return formatHumanDurationShort(Math.max(0, Math.floor(normalizeFiniteNumber(value))));
}

function formatLiveRuntimeSeconds(
  dataset: OperatorDashboardDataset,
  referenceTime: Date,
  liveReferenceTime: Date
): string {
  const liveDeltaSeconds = Math.max(0, (liveReferenceTime.getTime() - referenceTime.getTime()) / 1000);
  return formatRuntimeSeconds(normalizeFiniteNumber(dataset.totals.seconds_running) + liveDeltaSeconds);
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
    return 'n/a';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'n/a';
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
  return 'n/a';
}

function formatRateLimitSegments(
  value: Record<string, unknown> | null | undefined,
  referenceTime: Date
): SummarySegment[] {
  if (!value || Object.keys(value).length === 0) {
    return [{ text: 'unavailable', color: ANSI_GRAY }];
  }

  const combined = formatCombinedRateLimitSegments(value, referenceTime);
  if (combined) {
    return combined;
  }

  const codexRateLimits = formatCodexRateLimitSegments(value, referenceTime);
  if (codexRateLimits) {
    return codexRateLimits;
  }

  const linearBudget = formatLinearBudgetSegments(value, referenceTime);
  if (linearBudget) {
    return linearBudget;
  }

  return [{ text: formatRecord(value), color: ANSI_GRAY }];
}

function formatCombinedRateLimitSegments(
  value: Record<string, unknown>,
  referenceTime: Date
): SummarySegment[] | null {
  const codex = asRecord(value.codex);
  const linearBudget = asRecord(value.linear_budget) ?? asRecord(value.linearBudget);
  if (!codex || !linearBudget) {
    return null;
  }
  const pieces: SummarySegment[] = [];
  const codexPieces = formatCompactCodexRateLimitSegments(codex, referenceTime, {
    allowLegacyMetadata: true
  });
  if (codexPieces) {
    pieces.push(...codexPieces);
  }
  const linearPieces = formatCompactLinearBudgetSegments(linearBudget, referenceTime);
  if (linearPieces) {
    if (pieces.length > 0) {
      pieces.push({ text: ' || ', color: ANSI_GRAY });
    }
    pieces.push(...linearPieces);
  }
  return pieces.length > 0 ? pieces : null;
}

function formatCompactCodexRateLimitSegments(
  value: Record<string, unknown>,
  referenceTime: Date,
  options: { allowLegacyMetadata?: boolean } = {}
): SummarySegment[] | null {
  return formatOperatorCodexRateLimitSegments(value, referenceTime, {
    allowLegacyMetadata: options.allowLegacyMetadata,
    formatBucket: formatCompactRateLimitBucket,
    formatCredits: formatCompactRateLimitCredits
  });
}

function formatCodexRateLimitSegments(
  value: Record<string, unknown>,
  referenceTime: Date,
  options: { allowLegacyMetadata?: boolean } = {}
): SummarySegment[] | null {
  return formatOperatorCodexRateLimitSegments(value, referenceTime, {
    allowLegacyMetadata: options.allowLegacyMetadata,
    formatBucket: formatRateLimitBucket,
    formatCredits: formatRateLimitCredits
  });
}

function formatOperatorCodexRateLimitSegments(
  value: Record<string, unknown>,
  referenceTime: Date,
  options: {
    allowLegacyMetadata?: boolean;
    formatBucket: (bucket: Record<string, unknown>, referenceTime: Date) => string;
    formatCredits: (credits: Record<string, unknown>) => string;
  }
): SummarySegment[] | null {
  const limitId = readRecordString(value, ['limit_id', 'limitId', 'limit_name', 'limitName']);
  const primary = asRecord(value.primary);
  const secondary = asRecord(value.secondary);
  const credits = asRecord(value.credits);
  const requests = asRecord(value.requests);
  const endpointRequests = asRecord(value.endpoint_requests);
  const observedAt = readRecordString(value, ['observed_at', 'observedAt']);
  const suppression = readRecordString(value, ['suppression']);
  const retryAfterSeconds = readRecordNumber(value, ['retry_after_seconds', 'retryAfterSeconds']);
  if (!limitId && !primary && !secondary && !credits) {
    if (!requests && !endpointRequests) {
      return null;
    }
    if (
      options.allowLegacyMetadata !== true &&
      (observedAt !== null || suppression !== null || retryAfterSeconds !== null)
    ) {
      return null;
    }
    const pieces: SummarySegment[] = [{ text: 'Codex', color: ANSI_YELLOW }];
    const displayRequests = selectOperatorVisibleBudgetBucket(requests, endpointRequests, referenceTime);
    if (displayRequests) {
      appendOperatorRateLimitSegment(
        pieces,
        `requests ${options.formatBucket(displayRequests, referenceTime)}`,
        ANSI_CYAN
      );
    }
    return pieces;
  }
  const pieces: SummarySegment[] = [{ text: 'Codex', color: ANSI_YELLOW }];
  if (primary) {
    appendOperatorRateLimitSegment(
      pieces,
      `${resolveCodexRateLimitBucketLabel(primary) ?? 'primary'} ${options.formatBucket(primary, referenceTime)}`,
      ANSI_CYAN
    );
  }
  if (secondary) {
    appendOperatorRateLimitSegment(
      pieces,
      `${resolveCodexRateLimitBucketLabel(secondary) ?? 'secondary'} ${options.formatBucket(secondary, referenceTime)}`,
      ANSI_CYAN
    );
  }
  if (credits) {
    appendOperatorRateLimitSegment(pieces, options.formatCredits(credits), ANSI_GREEN);
  }
  return pieces;
}

function resolveCodexRateLimitBucketLabel(bucket: Record<string, unknown>): string | null {
  const windowDurationMins = readRecordNumber(bucket, [
    'windowDurationMins',
    'window_duration_mins',
    'window_minutes'
  ]);
  const normalizedWindowMinutes =
    windowDurationMins !== null && Number.isFinite(windowDurationMins)
      ? Math.max(0, Math.trunc(windowDurationMins))
      : null;
  if (normalizedWindowMinutes === 300) {
    return '5-hour';
  }
  if (normalizedWindowMinutes === 10_080) {
    return 'weekly';
  }
  return null;
}

function formatLinearBudgetSegments(
  value: Record<string, unknown>,
  referenceTime: Date
): SummarySegment[] | null {
  return formatOperatorLinearBudgetSegments(value, referenceTime, formatRateLimitBucket);
}

function formatCompactLinearBudgetSegments(
  value: Record<string, unknown>,
  referenceTime: Date
): SummarySegment[] | null {
  return formatOperatorLinearBudgetSegments(value, referenceTime, formatCompactRateLimitBucket);
}

function formatOperatorLinearBudgetSegments(
  value: Record<string, unknown>,
  referenceTime: Date,
  formatBucket: (bucket: Record<string, unknown>, referenceTime: Date) => string
): SummarySegment[] | null {
  const requests = asRecord(value.requests);
  const complexity = asRecord(value.complexity);
  const endpointRequests = asRecord(value.endpoint_requests);
  const endpointComplexity = asRecord(value.endpoint_complexity);
  const observedAt = readRecordString(value, ['observed_at', 'observedAt']);
  const source = readRecordString(value, ['source']);
  const suppression = readRecordString(value, ['suppression']);
  const retryAfterSeconds = readRecordNumber(value, ['retry_after_seconds', 'retryAfterSeconds']);
  const looksLikeLinearBudget =
    observedAt !== null ||
    suppression !== null ||
    retryAfterSeconds !== null ||
    source?.toLowerCase().startsWith('linear') === true;
  if (!looksLikeLinearBudget) {
    return null;
  }

  const pieces: SummarySegment[] = [{ text: 'Linear', color: ANSI_YELLOW }];
  const displayRequests = selectOperatorVisibleBudgetBucket(
    requests,
    endpointRequests,
    referenceTime
  );
  if (displayRequests) {
    appendOperatorRateLimitSegment(pieces, `requests ${formatBucket(displayRequests, referenceTime)}`, ANSI_CYAN);
  }
  const displayComplexity = selectOperatorVisibleBudgetBucket(
    complexity,
    endpointComplexity,
    referenceTime
  );
  if (displayComplexity) {
    appendOperatorRateLimitSegment(pieces, `complexity ${formatBucket(displayComplexity, referenceTime)}`, ANSI_CYAN);
  }
  return pieces;
}

function selectOperatorVisibleBudgetBucket(
  primary: Record<string, unknown> | null,
  endpoint: Record<string, unknown> | null,
  referenceTime: Date
): Record<string, unknown> | null {
  if (!primary) {
    return endpoint;
  }
  if (!endpoint) {
    return primary;
  }
  const primaryExhausted = isOperatorRateLimitBucketExhausted(primary);
  const endpointExhausted = isOperatorRateLimitBucketExhausted(endpoint);
  if (endpointExhausted && !primaryExhausted) {
    return endpoint;
  }
  if (primaryExhausted && !endpointExhausted) {
    return primary;
  }
  if (primaryExhausted && endpointExhausted) {
    return compareOperatorRateLimitBucketResetMs(primary, endpoint, referenceTime) >= 0
      ? primary
      : endpoint;
  }
  return primary;
}

function formatRateLimitBucket(bucket: Record<string, unknown>, referenceTime: Date): string {
  return formatOperatorRateLimitBucket(bucket, referenceTime);
}

function formatCompactRateLimitBucket(bucket: Record<string, unknown>, referenceTime: Date): string {
  return formatOperatorRateLimitBucket(bucket, referenceTime);
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

function isOperatorRateLimitBucketExhausted(bucket: Record<string, unknown>): boolean {
  const remaining = readRecordNumber(bucket, ['remaining']);
  if (remaining !== null) {
    return remaining <= 0;
  }
  const usedPercent = readRecordNumber(bucket, ['usedPercent', 'used_percent']);
  if (usedPercent !== null) {
    return usedPercent >= 100;
  }
  return false;
}

function compareOperatorRateLimitBucketResetMs(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  referenceTime: Date
): number {
  const leftMs = resolveOperatorRateLimitBucketResetMs(left, referenceTime);
  const rightMs = resolveOperatorRateLimitBucketResetMs(right, referenceTime);
  if (leftMs === null && rightMs === null) {
    return 0;
  }
  if (leftMs === null) {
    return -1;
  }
  if (rightMs === null) {
    return 1;
  }
  return leftMs - rightMs;
}

function resolveOperatorRateLimitBucketResetMs(
  bucket: Record<string, unknown>,
  referenceTime: Date
): number | null {
  const resetAt = readRecordString(bucket, ['reset_at', 'resetAt', 'resets_at', 'resetsAt']);
  if (resetAt) {
    const parsed = Date.parse(resetAt);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  const resetInSeconds = readRecordNumber(bucket, ['reset_in_seconds', 'resetInSeconds']);
  if (resetInSeconds !== null) {
    return referenceTime.getTime() + Math.max(0, resetInSeconds) * 1000;
  }
  return null;
}

function formatCompactRateLimitCredits(credits: Record<string, unknown>): string {
  return formatRateLimitCredits(credits);
}

function appendOperatorRateLimitSegment(
  pieces: SummarySegment[],
  text: string,
  color: string
): void {
  pieces.push({ text: pieces.length === 1 ? ' ' : ' | ', color: ANSI_GRAY });
  pieces.push({ text, color });
}

function formatOperatorRateLimitBucket(bucket: Record<string, unknown>, referenceTime: Date): string {
  if (isRateLimitBucketExhausted(bucket)) {
    const resetSeconds = resolveRateLimitBucketResetSeconds(bucket, referenceTime);
    if (resetSeconds !== null) {
      return `resets ${formatHumanDurationShort(resetSeconds)}`;
    }
  }
  const remainingPercent = resolveRateLimitBucketRemainingPercent(bucket);
  if (remainingPercent !== null) {
    return formatPercent(remainingPercent);
  }
  const remaining = readRecordNumber(bucket, ['remaining']);
  const limit = readRecordNumber(bucket, ['limit']);
  if (remaining !== null && limit !== null) {
    return `${formatCount(remaining)}/${formatCount(limit)}`;
  }
  if (remaining !== null) {
    return `remaining ${formatCount(remaining)}`;
  }
  if (limit !== null) {
    return `limit ${formatCount(limit)}`;
  }
  return 'n/a';
}

function resolveRateLimitBucketRemainingPercent(bucket: Record<string, unknown>): number | null {
  const usedPercent = readRecordNumber(bucket, ['usedPercent', 'used_percent']);
  if (usedPercent !== null) {
    return Math.min(100, Math.max(0, 100 - usedPercent));
  }
  const remaining = readRecordNumber(bucket, ['remaining']);
  const limit = readRecordNumber(bucket, ['limit']);
  if (remaining !== null && limit !== null && limit > 0) {
    return Math.min(100, Math.max(0, (remaining / limit) * 100));
  }
  return null;
}

function isRateLimitBucketExhausted(bucket: Record<string, unknown>): boolean {
  const remaining = readRecordNumber(bucket, ['remaining']);
  if (remaining !== null) {
    return remaining <= 0;
  }
  const usedPercent = readRecordNumber(bucket, ['usedPercent', 'used_percent']);
  return usedPercent !== null ? usedPercent >= 100 : false;
}

function resolveRateLimitBucketResetSeconds(
  bucket: Record<string, unknown>,
  referenceTime: Date
): number | null {
  return (
    readRecordNumber(bucket, ['reset_in_seconds', 'resetInSeconds']) ??
    secondsUntilTimestamp(
      readRecordString(bucket, ['reset_at', 'resetAt', 'resets_at', 'resetsAt']),
      referenceTime
    )
  );
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1).replace(/\.0$/, '')}%`;
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
    return 'n/a';
  }
  if (sanitized.length <= 10) {
    return sanitized;
  }
  return `${sanitized.slice(0, 4)}...${sanitized.slice(-6)}`;
}

function formatPid(pid: string | null | undefined): string {
  const sanitized = sanitizeDisplayValue(pid);
  return sanitized === '-' ? 'n/a' : sanitized;
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

function humanizeRunningEvent(event: string | null | undefined): string {
  const normalized = normalizeRunningEventKey(event);
  if (!normalized) {
    return 'n/a';
  }
  switch (normalized) {
    case 'agent_message':
      return 'agent message';
    case 'task_started':
      return 'session started';
    case 'task_complete':
    case 'turn_completed':
      return 'turn completed';
    case 'turn_started':
      return 'turn started';
    case 'turn_failed':
      return 'turn failed';
    case 'turn_cancelled':
      return 'turn cancelled';
    case 'thread_tokenusage_updated':
      return 'token usage updated';
    case 'account_ratelimits_updated':
      return 'rate limits updated';
    case 'queued_questions':
      return 'queued questions';
    case 'notification':
      return 'notification';
    case 'item_started':
      return 'item started';
    case 'item_completed':
      return 'item completed';
    case 'item_updated':
      return 'item updated';
    case 'retry_scheduled':
      return 'retry scheduled';
    default:
      return normalized.replace(/_/g, ' ');
  }
}

function isHighSignalStatusText(value: string, displayState: string): boolean {
  if (value === '-' || value === 'n/a' || value.toLowerCase() === displayState) {
    return false;
  }
  const normalized = value.toLowerCase();
  if (
    normalized === 'retry queued' ||
    normalized === 'turn running' ||
    normalized === 'worker turn active' ||
    normalized === 'provider worker turn is active.' ||
    normalized === 'provider worker turn is active' ||
    normalized === 'turn active'
  ) {
    return false;
  }
  return true;
}

function sameStatusText(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function normalizeRunningEventKey(value: string | null | undefined): string | null {
  const sanitized = sanitizeDisplayValue(value);
  if (sanitized === '-') {
    return null;
  }
  return sanitized
    .toLowerCase()
    .replace(/^codex\/event\//u, '')
    .replace(/[./]+/gu, '_')
    .replace(/[^a-z0-9_]+/gu, '_')
    .replace(/_+/gu, '_')
    .replace(/^_|_$/gu, '');
}

function formatHumanDurationShort(valueSeconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(normalizeFiniteNumber(valueSeconds)));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return hours % 24 > 0 ? `${days}d ${hours % 24}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

function formatCountdownMs(valueMs: number): string {
  if (!Number.isFinite(valueMs)) {
    return 'n/a';
  }
  if (valueMs <= 0) {
    return 'now';
  }
  return formatHumanDurationShort(Math.ceil(valueMs / 1000));
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

function resolveLiveReferenceTime(liveReferenceTime: Date | undefined, fallbackTime: Date): Date {
  if (liveReferenceTime instanceof Date && Number.isFinite(liveReferenceTime.getTime())) {
    return liveReferenceTime;
  }
  return fallbackTime;
}

function deriveLiveReferenceTime(renderedState: RenderedDashboardState, now: Date): Date {
  const elapsedMs = Math.max(0, now.getTime() - renderedState.liveClockStartedAt.getTime());
  return new Date(renderedState.referenceTime.getTime() + elapsedMs);
}

function resolveDisplayedLiveReferenceTime(
  renderedState: RenderedDashboardState,
  frameState: DashboardFrameState,
  now: Date
): Date {
  if (frameState.paused && frameState.pausedLiveReferenceTime) {
    return frameState.pausedLiveReferenceTime;
  }
  return deriveLiveReferenceTime(renderedState, now);
}

function resolveMaxAllowedAgents(dataset: OperatorDashboardDataset): number | null {
  const value = dataset.counts.max_allowed;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return null;
}

function resolveTerminalColumns(value: number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return DEFAULT_TERMINAL_COLUMNS;
}

function resolveTerminalRows(value: number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return Number.POSITIVE_INFINITY;
}

function linesWillExceedTerminalHeight(terminalRows: number, lineCount: number): boolean {
  return Number.isFinite(terminalRows) && lineCount > terminalRows;
}

function isControlCharacter(value: string): boolean {
  if (value.length === 0) {
    return false;
  }
  const codePoint = value.charCodeAt(0);
  return (codePoint >= 0x00 && codePoint <= 0x1f) || (codePoint >= 0x7f && codePoint <= 0x9f);
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

function stripAnsiSequences(value: string): string {
  return value.replace(ANSI_CONTROL_SEQUENCE_PATTERN, '');
}

function formatSnapshotTimestamp(value: Date): string {
  return value.toISOString().replace(/[-:.]/g, '');
}
