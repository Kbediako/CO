import {
  type ExecBeginEvent,
  type ExecChunkEvent,
  type ExecEndEvent,
  type ExecEvent,
  type ExecRetryEvent,
  type JsonlEvent,
  type RunSummaryEvent,
  type RunSummaryEventPayload
} from './types.js';

function serializeBegin(event: ExecBeginEvent): JsonlEvent {
  return {
    type: event.type,
    timestamp: event.timestamp,
    payload: {
      attempt: event.attempt,
      correlationId: event.correlationId,
      command: event.payload.command,
      args: event.payload.args,
      cwd: event.payload.cwd ?? null,
      sessionId: event.payload.sessionId,
      sandboxState: event.payload.sandboxState,
      persisted: event.payload.persisted
    }
  };
}

function serializeChunk(event: ExecChunkEvent): JsonlEvent {
  return {
    type: event.type,
    timestamp: event.timestamp,
    payload: {
      attempt: event.attempt,
      correlationId: event.correlationId,
      stream: event.payload.stream,
      sequence: event.payload.sequence,
      bytes: event.payload.bytes,
      data: event.payload.data
    }
  };
}

function serializeEnd(event: ExecEndEvent): JsonlEvent {
  return {
    type: event.type,
    timestamp: event.timestamp,
    payload: {
      attempt: event.attempt,
      correlationId: event.correlationId,
      exitCode: event.payload.exitCode,
      signal: event.payload.signal,
      durationMs: event.payload.durationMs,
      stdout: event.payload.stdout,
      stderr: event.payload.stderr,
      sandboxState: event.payload.sandboxState,
      sessionId: event.payload.sessionId,
      status: event.payload.status
    }
  };
}

function serializeRetry(event: ExecRetryEvent): JsonlEvent {
  return {
    type: event.type,
    timestamp: event.timestamp,
    payload: {
      attempt: event.attempt,
      correlationId: event.correlationId,
      delayMs: event.payload.delayMs,
      sandboxState: event.payload.sandboxState,
      errorMessage: event.payload.errorMessage
    }
  };
}

export function serializeExecEvent(event: ExecEvent): JsonlEvent {
  switch (event.type) {
    case 'exec:begin':
      return serializeBegin(event);
    case 'exec:chunk':
      return serializeChunk(event);
    case 'exec:end':
      return serializeEnd(event);
    case 'exec:retry':
      return serializeRetry(event);
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export function serializeRunSummaryEvent(
  payload: RunSummaryEventPayload,
  timestamp = new Date().toISOString()
): RunSummaryEvent {
  return {
    type: 'run:summary',
    timestamp,
    payload
  };
}
