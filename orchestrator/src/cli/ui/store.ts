import type {
  RunEvent,
  RunStartedEvent,
  StageCompletedEvent,
  StageStartedEvent,
  ToolCallEvent
} from '../events/runEvents.js';
import type { RunStatus, CommandStatus } from '../types.js';

export interface HudStage {
  id: string;
  index: number;
  title: string;
  kind: 'command' | 'subpipeline';
  status: CommandStatus;
  summary: string | null;
  exitCode: number | null;
  logPath: string | null;
  subRunId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface HudLogEntry {
  id: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  stageId: string | null;
  stageIndex?: number | null;
  timestamp: string;
}

export interface HudState {
  runId: string | null;
  taskId: string | null;
  pipelineTitle: string | null;
  status: RunStatus | 'idle';
  manifestPath: string | null;
  runSummaryPath: string | null;
  metricsPath: string | null;
  logPath: string | null;
  stages: HudStage[];
  logs: HudLogEntry[];
  startedAt: string | null;
  completedAt: string | null;
  lastUpdated: string | null;
}

export interface HudStoreOptions {
  logLimit?: number;
  batchIntervalMs?: number;
}

const DEFAULT_LOG_LIMIT = 200;
const DEFAULT_BATCH_INTERVAL_MS = 120;

export function createInitialHudState(): HudState {
  return {
    runId: null,
    taskId: null,
    pipelineTitle: null,
    status: 'idle',
    manifestPath: null,
    runSummaryPath: null,
    metricsPath: null,
    logPath: null,
    stages: [],
    logs: [],
    startedAt: null,
    completedAt: null,
    lastUpdated: null
  };
}

export function reduceHudState(
  state: HudState,
  event: RunEvent,
  logLimit: number = DEFAULT_LOG_LIMIT
): HudState {
  switch (event.type) {
    case 'run:started':
      return applyRunStarted(state, event);
    case 'stage:started':
      return applyStageStarted(state, event);
    case 'stage:completed':
      return applyStageCompleted(state, event);
    case 'run:completed':
      return {
        ...state,
        status: event.status,
        manifestPath: event.manifestPath,
        runSummaryPath: event.runSummaryPath,
        metricsPath: event.metricsPath,
        completedAt: event.timestamp,
        lastUpdated: event.timestamp
      };
    case 'run:error': {
      const status = state.status === 'succeeded' ? state.status : 'failed';
      return appendLogEntry(
        {
          ...state,
          status,
          lastUpdated: event.timestamp
        },
        {
          id: buildLogId(state),
          message: event.message,
          level: 'error',
          stageId: event.stageId ?? null,
          timestamp: event.timestamp
        },
        logLimit
      );
    }
    case 'log':
      return appendLogEntry(state, {
        id: buildLogId(state),
        message: event.message,
        level: event.level,
        stageId: event.stageId,
        stageIndex: event.stageIndex ?? null,
        timestamp: event.timestamp
      }, logLimit);
    case 'tool:call':
      return appendLogEntry(
        state,
        {
          id: buildLogId(state),
          message: formatToolCall(event),
          level: 'info',
          stageId: event.stageId,
          stageIndex: event.stageIndex ?? null,
          timestamp: event.timestamp
        },
        logLimit
      );
    default:
      return state;
  }
}

export class HudStore {
  private state: HudState = createInitialHudState();
  private readonly logLimit: number;
  private readonly batchIntervalMs: number;
  private readonly listeners = new Set<(state: HudState) => void>();
  private pendingEvents: RunEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(options: HudStoreOptions = {}) {
    this.logLimit = options.logLimit ?? DEFAULT_LOG_LIMIT;
    this.batchIntervalMs = options.batchIntervalMs ?? DEFAULT_BATCH_INTERVAL_MS;
  }

  getState(): HudState {
    return this.state;
  }

  enqueue(event: RunEvent): void {
    this.pendingEvents.push(event);
    this.scheduleFlush();
  }

  subscribe(listener: (state: HudState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.listeners.clear();
    this.pendingEvents = [];
  }

  private scheduleFlush(): void {
    if (this.batchTimer) {
      return;
    }
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.flush();
    }, this.batchIntervalMs);
  }

  private flush(): void {
    if (this.pendingEvents.length === 0) {
      return;
    }
    const events = this.pendingEvents;
    this.pendingEvents = [];
    let nextState = this.state;
    for (const event of events) {
      nextState = reduceHudState(nextState, event, this.logLimit);
    }
    this.state = nextState;
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

function applyRunStarted(state: HudState, event: RunStartedEvent): HudState {
  const stages = event.stages
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((stage) => ({
      id: stage.id,
      index: stage.index,
      title: stage.title,
      kind: stage.kind,
      status: stage.status,
      summary: stage.summary,
      exitCode: stage.exitCode,
      logPath: stage.logPath,
      subRunId: stage.subRunId,
      startedAt: stage.status === 'running' ? event.timestamp : null,
      completedAt: ['succeeded', 'failed', 'skipped'].includes(stage.status) ? event.timestamp : null
    }));
  return {
    ...state,
    runId: event.runId,
    taskId: event.taskId,
    pipelineTitle: event.pipelineTitle,
    status: event.status,
    manifestPath: event.manifestPath,
    logPath: event.logPath,
    stages,
    startedAt: event.timestamp,
    completedAt: null,
    lastUpdated: event.timestamp
  };
}

function applyStageStarted(state: HudState, event: StageStartedEvent): HudState {
  const stages = updateStages(state.stages, {
    id: event.stageId,
    index: event.stageIndex,
    title: event.title,
    kind: event.kind,
    status: 'running',
    summary: null,
    exitCode: null,
    logPath: event.logPath ?? null,
    startedAt: event.timestamp
  });
  return {
    ...state,
    stages,
    status: state.status === 'idle' ? 'in_progress' : state.status,
    lastUpdated: event.timestamp
  };
}

function applyStageCompleted(state: HudState, event: StageCompletedEvent): HudState {
  const stages = updateStages(state.stages, {
    id: event.stageId,
    index: event.stageIndex,
    title: event.title,
    kind: event.kind,
    status: event.status,
    summary: event.summary,
    exitCode: event.exitCode,
    logPath: event.logPath ?? null,
    completedAt: event.timestamp,
    subRunId: event.subRunId
  });
  return {
    ...state,
    stages,
    lastUpdated: event.timestamp
  };
}

function updateStages(stages: HudStage[], update: Partial<HudStage> & { id: string; index: number; title: string; kind: 'command' | 'subpipeline' }): HudStage[] {
  const existingIndex = stages.findIndex((stage) => stage.id === update.id);
  if (existingIndex >= 0) {
    const next = stages.slice();
    next[existingIndex] = {
      ...next[existingIndex],
      ...update
    };
    return next.sort((a, b) => a.index - b.index);
  }
  const summary = 'summary' in update ? update.summary ?? null : null;
  const exitCode = 'exitCode' in update ? update.exitCode ?? null : null;
  const logPath = 'logPath' in update ? update.logPath ?? null : null;
  return [
    ...stages,
    {
      ...update,
      status: update.status ?? 'pending',
      summary,
      exitCode,
      logPath
    } as HudStage
  ].sort((a, b) => a.index - b.index);
}

function appendLogEntry(state: HudState, entry: HudLogEntry, limit: number): HudState {
  const nextLogs = [...state.logs, entry];
  if (nextLogs.length > limit) {
    nextLogs.splice(0, nextLogs.length - limit);
  }
  return { ...state, logs: nextLogs, lastUpdated: entry.timestamp };
}

function buildLogId(state: HudState): string {
  return `${state.logs.length + 1}`;
}

function formatToolCall(event: ToolCallEvent): string {
  const stageFragment = event.stageId ? ` [${event.stageId}]` : '';
  const attempt = typeof event.attempt === 'number' ? ` attempt ${event.attempt}` : '';
  const message = event.message ? ` - ${event.message}` : '';
  return `${event.toolName}${stageFragment}: ${event.status}${attempt}${message}`;
}
