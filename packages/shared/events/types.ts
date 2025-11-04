import type { SandboxState, ToolRunRecord, ToolRunStatus } from '../manifest/types.js';

export type ExecEventType = 'exec:begin' | 'exec:chunk' | 'exec:end' | 'exec:retry';

export interface ExecEventBase {
  type: ExecEventType;
  correlationId: string;
  timestamp: string;
  attempt: number;
}

export interface ExecBeginEvent extends ExecEventBase {
  type: 'exec:begin';
  payload: {
    command: string;
    args: string[];
    cwd?: string;
    sessionId: string;
    sandboxState: SandboxState;
    persisted: boolean;
  };
}

export interface ExecChunkEvent extends ExecEventBase {
  type: 'exec:chunk';
  payload: {
    stream: 'stdout' | 'stderr';
    sequence: number;
    bytes: number;
    data: string;
  };
}

export interface ExecEndEvent extends ExecEventBase {
  type: 'exec:end';
  payload: {
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    durationMs: number;
    stdout: string;
    stderr: string;
    sandboxState: SandboxState;
    sessionId: string;
    status: ToolRunStatus;
  };
}

export interface ExecRetryEvent extends ExecEventBase {
  type: 'exec:retry';
  payload: {
    delayMs: number;
    sandboxState: SandboxState;
    errorMessage: string;
  };
}

export type ExecEvent =
  | ExecBeginEvent
  | ExecChunkEvent
  | ExecEndEvent
  | ExecRetryEvent;

export interface JsonlEvent<TPayload = unknown> {
  type: string;
  timestamp: string;
  payload: TPayload;
}

export interface RunSummaryEventPayload {
  status: 'succeeded' | 'failed';
  run: {
    id: string;
    taskId: string;
    pipelineId: string;
    manifest: string;
    artifactRoot: string;
    summary: string | null;
  };
  result: {
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    durationMs: number;
    status: ToolRunStatus;
    sandboxState: SandboxState;
    correlationId: string;
    attempts: number;
  };
  command: {
    argv: string[];
    shell: string;
    cwd: string | null;
    sessionId: string;
    persisted: boolean;
  };
  outputs: {
    stdout: string;
    stderr: string;
  };
  logs: {
    runner: string;
    command: string | null;
  };
  toolRun: ToolRunRecord | null;
  metrics?: Record<string, unknown>;
  notifications?: {
    targets: string[];
    delivered: string[];
    failures: Array<{ target: string; error: string }>;
  };
}

export type RunSummaryEvent = JsonlEvent<RunSummaryEventPayload> & {
  type: 'run:summary';
};
