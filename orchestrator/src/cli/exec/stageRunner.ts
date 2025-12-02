import { runCommandStage, type CommandRunHooks } from '../services/commandRunner.js';
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

  const hooks: CommandRunHooks = {
    onEvent: (event) => {
      context.execEvents.push(event);
      const serialized = serializeExecEvent(event);
      context.telemetryTasks.push(Promise.resolve(context.telemetrySink.record(serialized)).then(() => undefined));
      if (context.outputMode === 'jsonl' && context.jsonlWriter) {
        context.jsonlWriter.write(serialized);
      } else if (context.outputMode === 'interactive') {
        streamInteractive(context.stdout, context.stderr, event);
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
