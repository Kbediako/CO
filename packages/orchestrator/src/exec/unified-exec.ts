import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  ToolInvocationFailedError,
  ToolOrchestrator,
  type SandboxRetryContext,
  type ToolSandboxOptions
} from '../tool-orchestrator.js';
import type { ToolRunStatus, SandboxState, ToolRunEvent, ToolRunRecord } from '../../../shared/manifest/types.js';
import type {
  ExecBeginEvent,
  ExecChunkEvent,
  ExecEndEvent,
  ExecEvent,
  ExecRetryEvent
} from '../../../shared/events/types.js';
import { createStdioTracker, type SequencedStdioChunk, type StdioStream } from './stdio.js';
import { ExecSessionManager, type ExecSessionHandle, type ExecSessionLease } from './session-manager.js';
import { RemoteExecHandleService, type ExecHandleDescriptor } from './handle-service.js';

export interface ExecCommandExecutionResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  durationMs?: number;
  timedOut?: boolean;
  timeoutMs?: number;
}

export interface ExecCommandRequest<THandle extends ExecSessionHandle> {
  command: string;
  args?: string[];
  cwd?: string;
  env: Record<string, string>;
  attempt: number;
  sandboxState: SandboxState;
  session: ExecSessionLease<THandle>;
  timeoutMs?: number;
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
  handleService?: RemoteExecHandleService;
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
  eventCapture?: ExecEventCaptureOptions;
  timeoutMs?: number;
}

export interface ExecEventCaptureOptions {
  maxChunkEvents?: number;
}

interface ExecEventCaptureState {
  maxChunkEvents: number | null;
  capturedChunkEvents: number;
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
  timedOut?: boolean;
  timeoutMs?: number;
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
  timedOut?: boolean;
  timeoutMs?: number;
  record: ToolRunRecord;
  events: ExecEvent[];
  handle?: ExecHandleDescriptor;
}

export class UnifiedExecRunner<THandle extends ExecSessionHandle> {
  private readonly orchestrator: ToolOrchestrator;
  private readonly sessionManager: ExecSessionManager<THandle>;
  private readonly executor: ExecCommandExecutor<THandle>;
  private readonly maxBufferBytes: number;
  private readonly now: () => Date;
  private readonly idGenerator: () => string;
  private readonly listeners = new Set<(event: ExecEvent) => void>();
  private readonly handleService?: RemoteExecHandleService;

  constructor(options: UnifiedExecRunnerOptions<THandle>) {
    this.orchestrator = options.orchestrator;
    this.sessionManager = options.sessionManager;
    this.executor = options.executor ?? (defaultExecutor as ExecCommandExecutor<THandle>);
    this.maxBufferBytes = options.maxBufferBytes ?? 64 * 1024;
    this.now = options.now ?? (() => new Date());
    this.idGenerator = options.idGenerator ?? (() => randomUUID());
    this.handleService = options.handleService;
  }

  on(listener: (event: ExecEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async run(options: UnifiedExecRunOptions): Promise<UnifiedExecRunResult> {
    const args = options.args;
    const resolvedArgs = args ?? [];
    const timeoutMs = normalizeTimeoutMs(options.timeoutMs);
    const invocationId = options.invocationId ?? this.idGenerator();
    const correlationId = this.idGenerator();
    const issuedHandle = this.handleService ? this.handleService.issueHandle(correlationId) : undefined;
    const handleId = issuedHandle?.id;
    let handleClosed = false;
    const reuse = options.reuseSession ?? Boolean(options.sessionId);
    const lease = await this.sessionManager.acquire({
      id: options.sessionId,
      reuse,
      persist: options.persistSession,
      env: options.env
    });

    const events: ExecEvent[] = [];
    const captureState = createEventCaptureState(options.eventCapture);
    let chunkSequence = 0;

    const sandboxOptions = options.sandbox
      ? this.decorateSandboxOptions(options.sandbox, correlationId, events, handleId, captureState)
      : undefined;
    const metadata = {
      ...options.metadata,
      command: options.command,
      args: resolvedArgs,
      cwd: options.cwd,
      sessionId: lease.id,
      correlationId,
      persisted: lease.persisted,
      handleId,
      timeoutMs
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
            args: resolvedArgs,
            cwd: options.cwd,
            sandboxState,
            sessionId: lease.id,
            persisted: lease.persisted
          });

          await this.publishEvent(beginEvent, events, handleId, captureState);

          let capturedError: unknown;
          const attemptSummary: ExecAttemptResult = {
            exitCode: null,
            signal: null,
            stdout: '',
            stderr: '',
            durationMs: 0,
            status: 'failed',
            sandboxState,
            sessionId: lease.id,
            timedOut: false,
            ...(timeoutMs !== null ? { timeoutMs } : {})
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
              ...(timeoutMs !== null ? { timeoutMs } : {}),
              onStdout: (chunk) => {
                const sequenced = this.recordChunk(tracker, 'stdout', chunk);
                chunkSequence = sequenced.sequence;
                const chunkEvent = this.createChunkEvent({
                  attempt,
                  correlationId,
                  chunk: sequenced
                });
                void this.publishEvent(chunkEvent, events, handleId, captureState);
              },
              onStderr: (chunk) => {
                const sequenced = this.recordChunk(tracker, 'stderr', chunk);
                chunkSequence = sequenced.sequence;
                const chunkEvent = this.createChunkEvent({
                  attempt,
                  correlationId,
                  chunk: sequenced
                });
                void this.publishEvent(chunkEvent, events, handleId, captureState);
              }
            });
            attemptSummary.exitCode = outcome.exitCode ?? null;
            attemptSummary.signal = outcome.signal ?? null;
            attemptSummary.timedOut = outcome.timedOut === true;
            if (typeof outcome.timeoutMs === 'number' && Number.isFinite(outcome.timeoutMs) && outcome.timeoutMs > 0) {
              attemptSummary.timeoutMs = Math.trunc(outcome.timeoutMs);
            }
            attemptSummary.status = outcome.exitCode === 0 && !attemptSummary.timedOut ? 'succeeded' : 'failed';
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
            await this.publishEvent(endEvent, events, handleId, captureState);
          }

          if (capturedError) {
            throw capturedError;
          }
          return attemptSummary;
        }
      });

      attemptResult = result.output;
      invocationRecord = result.record;
      this.attachManifestMetadata(
        invocationRecord,
        events,
        lease,
        options,
        correlationId,
        attemptResult,
        handleId ?? undefined
      );
      const runOutcome: UnifiedExecRunResult = {
        correlationId,
        stdout: attemptResult.stdout,
        stderr: attemptResult.stderr,
        exitCode: attemptResult.exitCode,
        signal: attemptResult.signal,
        durationMs: attemptResult.durationMs,
        status: attemptResult.status,
        sandboxState: attemptResult.sandboxState,
        ...(attemptResult.timedOut ? { timedOut: true } : {}),
        ...(attemptResult.timeoutMs !== undefined ? { timeoutMs: attemptResult.timeoutMs } : {}),
        record: invocationRecord,
        events,
        handle: undefined
      };

      if (handleId && this.handleService) {
        this.handleService.close(handleId);
        handleClosed = true;
        runOutcome.handle = this.handleService.getDescriptor(handleId);
      }

      return runOutcome;
    } catch (error: unknown) {
      if (
        error instanceof ToolInvocationFailedError &&
        error.record
      ) {
        this.attachManifestMetadata(
          error.record,
          events,
          lease,
          options,
          correlationId,
          attemptResult,
          handleId ?? undefined
        );
      }
      if (handleId && this.handleService && !handleClosed) {
        this.handleService.close(handleId);
        handleClosed = true;
      }
      throw error;
    } finally {
      if (handleId && this.handleService && !handleClosed) {
        this.handleService.close(handleId);
      }
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

  private async publishEvent(
    event: ExecEvent,
    sink: ExecEvent[],
    handleId?: string,
    captureState?: ExecEventCaptureState | null
  ): Promise<void> {
    if (shouldCaptureEvent(event, captureState)) {
      sink.push(event);
    }
    if (handleId && this.handleService) {
      await this.handleService.append(handleId, event);
    }
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
    events: ExecEvent[],
    handleId?: string,
    captureState?: ExecEventCaptureState | null
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
        await this.publishEvent(retryEvent, events, handleId, captureState);
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
    attemptResult?: ExecAttemptResult,
    handleId?: string
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
        handleId,
        exitCode: attemptResult?.exitCode ?? null,
        signal: attemptResult?.signal ?? null,
        timedOut: attemptResult?.timedOut ?? null,
        timeoutMs: attemptResult?.timeoutMs ?? null
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

function createEventCaptureState(options?: ExecEventCaptureOptions): ExecEventCaptureState | null {
  const maxChunkEvents = options?.maxChunkEvents ?? null;
  if (!maxChunkEvents || maxChunkEvents <= 0) {
    return null;
  }
  return { maxChunkEvents, capturedChunkEvents: 0 };
}

function shouldCaptureEvent(
  event: ExecEvent,
  captureState?: ExecEventCaptureState | null
): boolean {
  if (!captureState || captureState.maxChunkEvents === null) {
    return true;
  }
  if (event.type !== 'exec:chunk') {
    return true;
  }
  if (captureState.capturedChunkEvents >= captureState.maxChunkEvents) {
    return false;
  }
  captureState.capturedChunkEvents += 1;
  return true;
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
  const child = spawn(request.command, request.args ?? [], {
    cwd: request.cwd,
    env: request.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (!child.stdout || !child.stderr) {
    throw new Error('Command must provide stdout and stderr streams.');
  }

  child.stdout.on('data', request.onStdout);
  child.stderr.on('data', request.onStderr);

  const timeoutMs = normalizeTimeoutMs(request.timeoutMs);
  const startedAt = Date.now();

  return await new Promise<ExecCommandExecutionResult>((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let timeoutHandle: NodeJS.Timeout | null = null;
    let forceKillHandle: NodeJS.Timeout | null = null;
    let forcedSettleHandle: NodeJS.Timeout | null = null;

    const resolveResult = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      const result: ExecCommandExecutionResult = {
        exitCode,
        signal,
        durationMs: Math.max(0, Date.now() - startedAt)
      };
      if (timedOut) {
        result.timedOut = true;
        if (timeoutMs !== null) {
          result.timeoutMs = timeoutMs;
        }
      }
      resolve(result);
    };

    const handleExit = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      resolveResult(exitCode, signal);
    };

    const handleError = (error: Error) => {
      if (timedOut) {
        return;
      }
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      child.off('exit', handleExit);
      child.off('error', handleError);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      if (forceKillHandle) {
        clearTimeout(forceKillHandle);
        forceKillHandle = null;
      }
      if (forcedSettleHandle) {
        clearTimeout(forcedSettleHandle);
        forcedSettleHandle = null;
      }
    };

    if (timeoutMs !== null) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        if (!child.killed) {
          try {
            child.kill('SIGTERM');
          } catch {
            // ignore kill errors and continue to forced settlement fallback
          }
        }
        forceKillHandle = setTimeout(() => {
          if (settled) {
            return;
          }
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore kill errors and allow forced settlement to conclude
          }
        }, 1000);
        forceKillHandle.unref?.();
        forcedSettleHandle = setTimeout(() => {
          resolveResult(null, 'SIGKILL');
        }, 1500);
        forcedSettleHandle.unref?.();
      }, timeoutMs);
      timeoutHandle.unref?.();
    }

    child.once('exit', handleExit);
    child.once('error', handleError);
  });
};

function normalizeTimeoutMs(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  if (normalized <= 0) {
    return null;
  }
  return normalized;
}

export type {
  ExecEvent,
  ExecBeginEvent,
  ExecChunkEvent,
  ExecEndEvent,
  ExecRetryEvent
} from '../../../shared/events/types.js';
