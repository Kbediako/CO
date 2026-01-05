import { runCommandStage, type CommandRunHooks, MAX_CAPTURED_CHUNK_EVENTS } from '../services/commandRunner.js';
import { serializeExecEvent } from '../../../../packages/shared/events/serializer.js';
import type { ExecEvent } from '../../../../packages/shared/events/types.js';
import type { ToolRunRecord } from '../../../../packages/shared/manifest/types.js';
import { sanitizeToolRunRecord } from '../../../../packages/shared/manifest/writer.js';
import type { ExecRunContext } from './context.js';
import type { RunResultSummary } from './types.js';

export interface StageRunResult {
  summary: RunResultSummary | null;
  toolRecord: ToolRunRecord | null;
  commandError: unknown;
}

export async function runExecStage(context: ExecRunContext): Promise<StageRunResult> {
  let runResultSummary: RunResultSummary | null = null;
  let toolRecord: ToolRunRecord | null = null;
  const maxChunkEvents = MAX_CAPTURED_CHUNK_EVENTS;
  let capturedChunkEvents = 0;

  const shouldCaptureEvent = (event: ExecEvent): boolean => {
    if (maxChunkEvents <= 0) {
      return true;
    }
    if (event.type !== 'exec:chunk') {
      return true;
    }
    if (capturedChunkEvents >= maxChunkEvents) {
      return false;
    }
    capturedChunkEvents += 1;
    return true;
  };

  const hooks: CommandRunHooks = {
    onEvent: (event) => {
      const captureEvent = shouldCaptureEvent(event);
      let serialized: ReturnType<typeof serializeExecEvent> | null = null;
      const getSerialized = () => {
        if (!serialized) {
          serialized = serializeExecEvent(event);
        }
        return serialized;
      };

      if (context.outputMode === 'jsonl' && context.jsonlWriter) {
        context.jsonlWriter(getSerialized());
      } else if (context.outputMode === 'interactive') {
        streamInteractive(context.stdout, context.stderr, event);
      }

      if (captureEvent) {
        context.execEvents.push(event);
        const payload = getSerialized();
        context.telemetryTasks.push(Promise.resolve(context.telemetrySink.record(payload)).then(() => undefined));
      }
    },
    onResult: (result) => {
      runResultSummary = {
        correlationId: result.correlationId,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        signal: result.signal,
        durationMs: result.durationMs,
        status: result.status,
        sandboxState: result.sandboxState
      };
      toolRecord = sanitizeToolRunRecord(JSON.parse(JSON.stringify(result.record)) as ToolRunRecord);
    },
    onError: (error) => {
      toolRecord = sanitizeToolRunRecord(JSON.parse(JSON.stringify(error.record)) as ToolRunRecord);
    }
  };

  let commandError: unknown = null;
  try {
    await runCommandStage(
      {
        env: context.env,
        paths: context.paths,
        manifest: context.manifest,
        stage: context.stage,
        index: 1
      },
      hooks
    );
  } catch (error) {
    commandError = error;
  }

  return {
    summary: runResultSummary,
    toolRecord,
    commandError
  };
}

export function streamInteractive(
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream,
  event: ExecEvent
): void {
  switch (event.type) {
    case 'exec:chunk':
      if (event.payload.stream === 'stdout') {
        stdout.write(event.payload.data);
      } else {
        stderr.write(event.payload.data);
      }
      break;
    case 'exec:retry':
      stderr.write(
        `[retry] attempt ${event.attempt} in ${event.payload.delayMs}ms — ${event.payload.errorMessage}\n`
      );
      break;
    default:
      break;
  }
}
