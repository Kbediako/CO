import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  ToolInvocationFailedError,
  ToolOrchestrator,
  type SandboxRetryContext,
  type ToolSandboxOptions
} from '../tool-orchestrator.js';
import type { ToolRunStatus, SandboxState, ToolRunEvent, ToolRunRecord } from '../../../shared/manifest/types.js';
import { createStdioTracker, type SequencedStdioChunk, type StdioStream } from '../../../shared/streams/stdio.js';
import { ExecSessionManager, type ExecSessionHandle, type ExecSessionLease } from './session-manager.js';

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
    stream: StdioStream;
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

export type ExecEvent = ExecBeginEvent | ExecChunkEvent | ExecEndEvent | ExecRetryEvent;

export interface ExecCommandExecutionResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs?: number;
}

export interface ExecCommandRequest<THandle extends ExecSessionHandle> {
  command: string;
  args: string[];
  cwd?: string;
  env: Record<string, string>;
  attempt: number;
  sandboxState: SandboxState;
  session: ExecSessionLease<THandle>;
  onStdout(chunk: Buffer | string): void;
  onStderr(chunk: Buffer | string): void;
}

export type ExecCommandExecutor<THandle extends ExecSessionHandle> = (
  request: ExecCommandRequest<THandle>
) => Promise<ExecCommandExecutionResult>;

export interface UnifiedExecRunnerOptions<THandle extends ExecSessionHandle> {
  orchestrator: ToolOrchestrator;
  sessionManager: ExecSessionManager<THandle>;
  executor?: ExecCommandExecutor<THandle>;
  maxBufferBytes?: number;
  now?: () => Date;
  idGenerator?: () => string;
}

export interface UnifiedExecRunOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  sessionId?: string;
  reuseSession?: boolean;
  persistSession?: boolean;
  approvalRequired?: boolean;
  approvalKey?: string;
  toolId?: string;
  description?: string;
  invocationId?: string;
  sandbox?: ToolSandboxOptions;
  metadata?: Record<string, unknown>;
}

export interface ExecAttemptResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  status: ToolRunStatus;
  sandboxState: SandboxState;
  sessionId: string;
}

export interface UnifiedExecRunResult {
  correlationId: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs: number;
  status: ToolRunStatus;
  sandboxState: SandboxState;
  record: ToolRunRecord;
  events: ExecEvent[];
}

export class UnifiedExecRunner<THandle extends ExecSessionHandle> {
  private readonly orchestrator: ToolOrchestrator;
  private readonly sessionManager: ExecSessionManager<THandle>;
  private readonly executor: ExecCommandExecutor<THandle>;
  private readonly maxBufferBytes: number;
  private readonly now: () => Date;
  private readonly idGenerator: () => string;
  private readonly listeners = new Set<(event: ExecEvent) => void>();

  constructor(options: UnifiedExecRunnerOptions<THandle>) {
    this.orchestrator = options.orchestrator;
    this.sessionManager = options.sessionManager;
    this.executor = options.executor ?? (defaultExecutor as ExecCommandExecutor<THandle>);
    this.maxBufferBytes = options.maxBufferBytes ?? 64 * 1024;
    this.now = options.now ?? (() => new Date());
    this.idGenerator = options.idGenerator ?? (() => randomUUID());
  }

  on(listener: (event: ExecEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async run(options: UnifiedExecRunOptions): Promise<UnifiedExecRunResult> {
    const args = options.args ?? [];
    const invocationId = options.invocationId ?? this.idGenerator();
    const correlationId = this.idGenerator();
    const reuse = options.reuseSession ?? Boolean(options.sessionId);
    const lease = await this.sessionManager.acquire({
      id: options.sessionId,
      reuse,
      persist: options.persistSession,
      env: options.env
    });

    const events: ExecEvent[] = [];
    let chunkSequence = 0;

    const sandboxOptions = options.sandbox
      ? this.decorateSandboxOptions(options.sandbox, correlationId, events)
      : undefined;
    const metadata = {
      ...options.metadata,
      command: options.command,
      args,
      cwd: options.cwd,
      sessionId: lease.id,
      correlationId,
      persisted: lease.persisted
    };

    const toolInvocation = {
      id: invocationId,
      tool: options.toolId ?? 'exec',
      description: options.description,
      approvalRequired: options.approvalRequired,
      approvalKey: options.approvalKey,
      metadata,
      sandbox: sandboxOptions
    } as const;

    let attemptResult: ExecAttemptResult | undefined;
    let invocationRecord: ToolRunRecord | undefined;

    try {
      const result = await this.orchestrator.invoke<ExecAttemptResult>({
        ...toolInvocation,
        run: async ({ attempt, sandboxState }) => {
          const attemptStartedAt = this.now();
          const tracker = createStdioTracker({
            maxBufferBytes: this.maxBufferBytes,
            now: this.now,
            startSequence: chunkSequence
          });
          const beginEvent = this.createBeginEvent({
            attempt,
            correlationId,
            command: options.command,
            args,
            cwd: options.cwd,
            sandboxState,
            sessionId: lease.id,
            persisted: lease.persisted
          });

          this.emit(beginEvent, events);

          let capturedError: unknown;
          const attemptSummary: ExecAttemptResult = {
            exitCode: null,
            signal: null,
            stdout: '',
            stderr: '',
            durationMs: 0,
            status: 'failed',
            sandboxState,
            sessionId: lease.id
          };

          try {
            const outcome = await this.executor({
              command: options.command,
              args,
              cwd: options.cwd,
              env: lease.envSnapshot,
              attempt,
              sandboxState,
              session: lease,
              onStdout: (chunk) => {
                const sequenced = this.recordChunk(tracker, 'stdout', chunk);
                chunkSequence = sequenced.sequence;
                const chunkEvent = this.createChunkEvent({
                  attempt,
                  correlationId,
                  chunk: sequenced
                });
                this.emit(chunkEvent, events);
              },
              onStderr: (chunk) => {
                const sequenced = this.recordChunk(tracker, 'stderr', chunk);
                chunkSequence = sequenced.sequence;
                const chunkEvent = this.createChunkEvent({
                  attempt,
                  correlationId,
                  chunk: sequenced
                });
                this.emit(chunkEvent, events);
              }
            });
            attemptSummary.exitCode = outcome.exitCode ?? null;
            attemptSummary.signal = outcome.signal ?? null;
            attemptSummary.status = outcome.exitCode === 0 ? 'succeeded' : 'failed';
            attemptSummary.durationMs = outcome.durationMs ?? 0;
          } catch (error: unknown) {
            capturedError = error;
          } finally {
            const completedAt = this.now();
            const derivedDuration = Math.max(0, completedAt.getTime() - attemptStartedAt.getTime());
            if (attemptSummary.durationMs <= 0) {
              attemptSummary.durationMs = derivedDuration;
            }
            attemptSummary.stdout = tracker.getBuffered('stdout');
            attemptSummary.stderr = tracker.getBuffered('stderr');
            const endEvent = this.createEndEvent({
              attempt,
              correlationId,
              summary: attemptSummary
            });
            this.emit(endEvent, events);
          }

          if (capturedError) {
            throw capturedError;
          }
          return attemptSummary;
        }
      });

      attemptResult = result.output;
      invocationRecord = result.record;
      this.attachManifestMetadata(invocationRecord, events, lease, options, correlationId, attemptResult);
      return {
        correlationId,
        stdout: attemptResult.stdout,
        stderr: attemptResult.stderr,
        exitCode: attemptResult.exitCode,
        signal: attemptResult.signal,
        durationMs: attemptResult.durationMs,
        status: attemptResult.status,
        sandboxState: attemptResult.sandboxState,
        record: invocationRecord,
        events
      };
    } catch (error: unknown) {
      if (
        error instanceof ToolInvocationFailedError &&
        error.record
      ) {
        this.attachManifestMetadata(error.record, events, lease, options, correlationId, attemptResult);
      }
      throw error;
    } finally {
      await lease.release();
    }
  }

  private recordChunk(
    tracker: ReturnType<typeof createStdioTracker>,
    stream: StdioStream,
    chunk: Buffer | string
  ): SequencedStdioChunk {
    return tracker.push(stream, chunk);
  }

  private emit(event: ExecEvent, sink: ExecEvent[]): void {
    sink.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private createBeginEvent(params: {
    attempt: number;
    correlationId: string;
    command: string;
    args: string[];
    cwd?: string;
    sandboxState: SandboxState;
    sessionId: string;
    persisted: boolean;
  }): ExecBeginEvent {
    return {
      type: 'exec:begin',
      correlationId: params.correlationId,
      attempt: params.attempt,
      timestamp: this.now().toISOString(),
      payload: {
        command: params.command,
        args: params.args,
        cwd: params.cwd,
        sandboxState: params.sandboxState,
        sessionId: params.sessionId,
        persisted: params.persisted
      }
    };
  }

  private createChunkEvent(params: {
    attempt: number;
    correlationId: string;
    chunk: SequencedStdioChunk;
  }): ExecChunkEvent {
    return {
      type: 'exec:chunk',
      correlationId: params.correlationId,
      attempt: params.attempt,
      timestamp: params.chunk.timestamp,
      payload: {
        stream: params.chunk.stream,
        sequence: params.chunk.sequence,
        bytes: params.chunk.bytes,
        data: params.chunk.data
      }
    };
  }

  private createEndEvent(params: {
    attempt: number;
    correlationId: string;
    summary: ExecAttemptResult;
  }): ExecEndEvent {
    return {
      type: 'exec:end',
      correlationId: params.correlationId,
      attempt: params.attempt,
      timestamp: this.now().toISOString(),
      payload: {
        exitCode: params.summary.exitCode,
        signal: params.summary.signal,
        durationMs: params.summary.durationMs,
        stdout: params.summary.stdout,
        stderr: params.summary.stderr,
        sandboxState: params.summary.sandboxState,
        sessionId: params.summary.sessionId,
        status: params.summary.status
      }
    };
  }

  private createRetryEvent(params: {
    attempt: number;
    correlationId: string;
    delayMs: number;
    sandboxState: SandboxState;
    error: unknown;
  }): ExecRetryEvent {
    return {
      type: 'exec:retry',
      correlationId: params.correlationId,
      attempt: params.attempt,
      timestamp: this.now().toISOString(),
      payload: {
        delayMs: params.delayMs,
        sandboxState: params.sandboxState,
        errorMessage: getErrorMessage(params.error)
      }
    };
  }

  private decorateSandboxOptions(
    input: ToolSandboxOptions,
    correlationId: string,
    events: ExecEvent[]
  ): ToolSandboxOptions {
    const { onRetry, ...rest } = input;
    const decorated: ToolSandboxOptions = {
      ...rest,
      onRetry: async (context: SandboxRetryContext) => {
        const retryEvent = this.createRetryEvent({
          attempt: context.attempt,
          correlationId,
          delayMs: context.delayMs,
          sandboxState: context.sandboxState,
          error: context.error
        });
        this.emit(retryEvent, events);
        if (onRetry) {
          await onRetry.call(input, context);
        }
      }
    };
    return decorated;
  }

  private attachManifestMetadata(
    record: ToolRunRecord,
    events: ExecEvent[],
    lease: ExecSessionLease<THandle>,
    options: UnifiedExecRunOptions,
    correlationId: string,
    attemptResult?: ExecAttemptResult
  ): void {
    const execMetadata = {
      ...(record.metadata ?? {}),
      exec: {
        command: options.command,
        args: options.args ?? [],
        cwd: options.cwd,
        sessionId: lease.id,
        persisted: lease.persisted,
        correlationId,
        exitCode: attemptResult?.exitCode ?? null,
        signal: attemptResult?.signal ?? null
      }
    };
    record.metadata = execMetadata;
    if (attemptResult) {
      record.status = attemptResult.status;
      record.sandboxState = attemptResult.sandboxState;
    } else if (record.status !== 'failed') {
      record.status = 'failed';
    }
    record.events = events.map((event) => this.toManifestEvent(event));
  }

  private toManifestEvent(event: ExecEvent): ToolRunEvent {
    switch (event.type) {
      case 'exec:begin':
        return {
          type: 'exec:begin',
          correlationId: event.correlationId,
          timestamp: event.timestamp,
          attempt: event.attempt,
          command: event.payload.command,
          args: event.payload.args,
          cwd: event.payload.cwd,
          sandboxState: event.payload.sandboxState,
          sessionId: event.payload.sessionId,
          persisted: event.payload.persisted
        };
      case 'exec:chunk':
        return {
          type: 'exec:chunk',
          correlationId: event.correlationId,
          timestamp: event.timestamp,
          attempt: event.attempt,
          stream: event.payload.stream,
          sequence: event.payload.sequence,
          bytes: event.payload.bytes,
          data: event.payload.data
        };
      case 'exec:end':
        return {
          type: 'exec:end',
          correlationId: event.correlationId,
          timestamp: event.timestamp,
          attempt: event.attempt,
          exitCode: event.payload.exitCode,
          signal: event.payload.signal,
          durationMs: event.payload.durationMs,
          stdout: event.payload.stdout,
          stderr: event.payload.stderr,
          sandboxState: event.payload.sandboxState,
          sessionId: event.payload.sessionId,
          status: event.payload.status
        };
      case 'exec:retry':
        return {
          type: 'exec:retry',
          correlationId: event.correlationId,
          timestamp: event.timestamp,
          attempt: event.attempt,
          delayMs: event.payload.delayMs,
          sandboxState: event.payload.sandboxState,
          errorMessage: event.payload.errorMessage
        };
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

const defaultExecutor: ExecCommandExecutor<ExecSessionHandle> = async (request) => {
  const child = spawn(request.command, request.args, {
    cwd: request.cwd,
    env: request.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (!child.stdout || !child.stderr) {
    throw new Error('Command must provide stdout and stderr streams.');
  }

  child.stdout.on('data', request.onStdout);
  child.stderr.on('data', request.onStderr);

  return await new Promise<ExecCommandExecutionResult>((resolve, reject) => {
    const handleExit = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      resolve({ exitCode, signal });
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      child.off('exit', handleExit);
      child.off('error', handleError);
    };

    child.once('exit', handleExit);
    child.once('error', handleError);
  });
};
