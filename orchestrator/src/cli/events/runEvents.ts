import { EventEmitter } from 'node:events';

import type { CommandStatus, CliManifest, PipelineDefinition, RunStatus } from '../types.js';
import { isoTimestamp } from '../utils/time.js';

export type RunEventType =
  | 'run:started'
  | 'run:completed'
  | 'run:error'
  | 'stage:started'
  | 'stage:completed'
  | 'log'
  | 'tool:call';

export interface RunEventBase {
  type: RunEventType;
  timestamp: string;
  runId: string;
  taskId: string;
}

export interface RunStageSnapshot {
  index: number;
  id: string;
  title: string;
  kind: 'command' | 'subpipeline';
  status: CommandStatus;
  summary: string | null;
  exitCode: number | null;
  logPath: string | null;
  subRunId?: string | null;
}

export interface RunStartedEvent extends RunEventBase {
  type: 'run:started';
  pipelineId: string;
  pipelineTitle: string;
  manifestPath: string;
  logPath: string;
  status: RunStatus;
  stages: RunStageSnapshot[];
}

export interface StageStartedEvent extends RunEventBase {
  type: 'stage:started';
  stageId: string;
  stageIndex: number;
  title: string;
  kind: 'command' | 'subpipeline';
  logPath: string | null;
  status: CommandStatus;
}

export interface StageCompletedEvent extends RunEventBase {
  type: 'stage:completed';
  stageId: string;
  stageIndex: number;
  title: string;
  kind: 'command' | 'subpipeline';
  status: CommandStatus;
  exitCode: number | null;
  summary: string | null;
  logPath: string | null;
  subRunId?: string | null;
}

export interface RunCompletedEvent extends RunEventBase {
  type: 'run:completed';
  pipelineId: string;
  status: RunStatus;
  manifestPath: string;
  runSummaryPath: string | null;
  metricsPath: string | null;
  summary: string | null;
}

export interface RunErrorEvent extends RunEventBase {
  type: 'run:error';
  pipelineId: string;
  message: string;
  stageId?: string | null;
}

export interface LogEvent extends RunEventBase {
  type: 'log';
  stageId: string | null;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: 'stdout' | 'stderr' | 'system';
  stageIndex?: number | null;
}

export interface ToolCallEvent extends RunEventBase {
  type: 'tool:call';
  stageId: string | null;
  toolName: string;
  status: string;
  message?: string;
  attempt?: number;
  stageIndex?: number | null;
}

export type RunEvent =
  | RunStartedEvent
  | StageStartedEvent
  | StageCompletedEvent
  | RunCompletedEvent
  | RunErrorEvent
  | LogEvent
  | ToolCallEvent;

export type RunEventListener<T extends RunEventType | '*'> = T extends '*'
  ? (event: RunEvent) => void
  : (event: Extract<RunEvent, { type: T }>) => void;

export class RunEventEmitter {
  private readonly emitter = new EventEmitter({ captureRejections: false });

  emit(event: RunEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on<T extends RunEventType | '*'>(type: T, listener: RunEventListener<T>): () => void {
    const wrapped = (payload: RunEvent) => (listener as RunEventListener<'*'>)(payload);
    this.emitter.on(type, wrapped);
    return () => {
      this.emitter.off(type, wrapped);
    };
  }

  dispose(): void {
    this.emitter.removeAllListeners();
  }
}

export interface RunEventContext {
  taskId: string;
  runId: string;
  pipelineId: string;
  pipelineTitle: string;
  manifestPath: string;
  logPath: string;
}

export class RunEventPublisher {
  constructor(private readonly emitter: RunEventEmitter | undefined, private readonly context: RunEventContext) {}

  runStarted(stages: RunStageSnapshot[], status: RunStatus): void {
    this.emit<RunStartedEvent>('run:started', {
      pipelineId: this.context.pipelineId,
      pipelineTitle: this.context.pipelineTitle,
      manifestPath: this.context.manifestPath,
      logPath: this.context.logPath,
      status,
      stages
    });
  }

  stageStarted(payload: Omit<StageStartedEvent, keyof RunEventBase | 'type'>): void {
    this.emit<StageStartedEvent>('stage:started', payload);
  }

  stageCompleted(payload: Omit<StageCompletedEvent, keyof RunEventBase | 'type'>): void {
    this.emit<StageCompletedEvent>('stage:completed', payload);
  }

  runCompleted(payload: Omit<RunCompletedEvent, keyof RunEventBase | 'type'>): void {
    this.emit<RunCompletedEvent>('run:completed', payload);
  }

  runError(payload: Omit<RunErrorEvent, keyof RunEventBase | 'type'>): void {
    this.emit<RunErrorEvent>('run:error', payload);
  }

  log(payload: Omit<LogEvent, keyof RunEventBase | 'type'>): void {
    this.emit<LogEvent>('log', payload);
  }

  toolCall(payload: Omit<ToolCallEvent, keyof RunEventBase | 'type'>): void {
    this.emit<ToolCallEvent>('tool:call', payload);
  }

  private emit<TEvent extends RunEvent>(
    type: TEvent['type'],
    payload: Omit<TEvent, keyof RunEventBase | 'type'>
  ): void {
    if (!this.emitter) {
      return;
    }
    const base: RunEventBase = {
      type: type as RunEventType,
      timestamp: isoTimestamp(),
      taskId: this.context.taskId,
      runId: this.context.runId
    };
    const event = { ...base, ...payload } as unknown as RunEvent;
    this.emitter.emit(event);
  }
}

export function snapshotStages(
  manifest: CliManifest,
  pipeline: PipelineDefinition
): RunStageSnapshot[] {
  return manifest.commands.map((command) => {
    const stage = pipeline.stages[command.index - 1];
    return {
      index: command.index,
      id: command.id,
      title: command.title,
      kind: stage?.kind === 'subpipeline' ? 'subpipeline' : 'command',
      status: command.status,
      summary: command.summary,
      exitCode: command.exit_code,
      logPath: command.log_path,
      subRunId: command.sub_run_id
    };
  });
}
