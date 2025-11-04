import { createWriteStream } from 'node:fs';
import { join } from 'node:path';

import type { ExecEvent } from '../../../../packages/orchestrator/src/index.js';
import { getCliExecRunner } from './execRuntime.js';
import type { CommandStage, CliManifest } from '../types.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import { relativeToRepo } from '../run/runPaths.js';
import {
  appendCommandError,
  updateCommandStatus,
  saveManifest
} from '../run/manifest.js';
import { slugify } from '../utils/strings.js';
import { isoTimestamp } from '../utils/time.js';

const MAX_BUFFERED_OUTPUT_BYTES = 64 * 1024;

export interface CommandRunnerContext {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  stage: CommandStage;
  index: number;
}

interface CommandRunResult {
  exitCode: number;
  summary: string;
}

export async function runCommandStage(context: CommandRunnerContext): Promise<CommandRunResult> {
  const { env, paths, manifest, stage, index } = context;
  const entryIndex = index - 1;
  const entry = updateCommandStatus(manifest, entryIndex, {
    status: 'running',
    started_at: isoTimestamp(),
    exit_code: null,
    summary: null
  });

  const logFile = join(paths.commandsDir, `${String(index).padStart(2, '0')}-${slugify(stage.id)}.ndjson`);
  entry.log_path = relativeToRepo(env, logFile);
  await saveManifest(paths, manifest);

  const runnerLog = createWriteStream(paths.logPath, { flags: 'a' });
  const commandLog = createWriteStream(logFile, { flags: 'a' });

  const writeEvent = (message: Record<string, unknown>) => {
    const payload = `${JSON.stringify({ ...message, timestamp: isoTimestamp(), index })}\n`;
    runnerLog.write(payload);
    commandLog.write(payload);
  };

  writeEvent({ type: 'command:start', command: stage.command });

  const runner = getCliExecRunner();

  let activeCorrelationId: string | null = null;
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let stdoutTruncated = false;
  let stderrTruncated = false;

  const handleEvent = (event: ExecEvent) => {
    if (!activeCorrelationId) {
      activeCorrelationId = event.correlationId;
    }
    if (event.correlationId !== activeCorrelationId) {
      return;
    }
    streamEvent(writeEvent, event, {
      onStdout: (bytes) => {
        stdoutBytes += bytes;
        stdoutTruncated = stdoutTruncated || stdoutBytes > MAX_BUFFERED_OUTPUT_BYTES;
      },
      onStderr: (bytes) => {
        stderrBytes += bytes;
        stderrTruncated = stderrTruncated || stderrBytes > MAX_BUFFERED_OUTPUT_BYTES;
      }
    });
  };

  const unsubscribe = runner.on(handleEvent);
  try {
    const sessionConfig = stage.session ?? {};
    const sessionId = sessionConfig.id;
    const wantsPersist = Boolean(sessionConfig.persist || sessionConfig.reuse);
    const persistSession = Boolean(sessionId && wantsPersist);
    const reuseSession = Boolean(sessionId && (sessionConfig.reuse ?? persistSession));

    const execEnv: NodeJS.ProcessEnv = { ...process.env, ...stage.env };
    const invocationId = `cli-command:${manifest.run_id}:${stage.id}:${Date.now()}`;

    const result = await runner.run({
      command: stage.command,
      args: [],
      cwd: stage.cwd ?? env.repoRoot,
      env: execEnv,
      sessionId: sessionId ?? undefined,
      persistSession,
      reuseSession,
      invocationId,
      toolId: 'cli:command',
      description: stage.title,
      metadata: {
        stageId: stage.id,
        pipelineId: manifest.pipeline_id,
        runId: manifest.run_id,
        commandIndex: entry.index
      }
    });

    const normalizedExitCode =
      result.exitCode ?? (result.signal ? 128 : 0);
    const stdoutText = result.stdout.trim();
    const stderrText = result.stderr.trim();
    const summary = buildSummary(stage, normalizedExitCode, stdoutText, stderrText, result.signal);

    entry.completed_at = isoTimestamp();
    entry.exit_code = normalizedExitCode;
    entry.summary = summary;
    entry.status = result.status === 'succeeded' ? 'succeeded' : stage.allowFailure ? 'skipped' : 'failed';

    if (entry.status === 'failed') {
      const errorDetails: Record<string, unknown> = {
        exit_code: normalizedExitCode,
        sandbox_state: result.sandboxState,
        stderr: stderrText
      };
      if (result.signal) {
        errorDetails.signal = result.signal;
      }
      if (stdoutTruncated) {
        errorDetails.stdout_truncated = true;
      }
      if (stderrTruncated) {
        errorDetails.stderr_truncated = true;
      }
      entry.error_file = await appendCommandError(
        env,
        paths,
        manifest,
        entry,
        'command-failed',
        errorDetails
      );
    }

    await saveManifest(paths, manifest);

    return { exitCode: normalizedExitCode, summary };
  } finally {
    unsubscribe();
    runnerLog.end();
    commandLog.end();
  }
}

function streamEvent(
  writeEvent: (payload: Record<string, unknown>) => void,
  event: ExecEvent,
  hooks: { onStdout: (bytes: number) => void; onStderr: (bytes: number) => void }
): void {
  switch (event.type) {
    case 'exec:begin':
      writeEvent({
        type: 'exec:begin',
        correlation_id: event.correlationId,
        attempt: event.attempt,
        command: event.payload.command,
        args: event.payload.args,
        cwd: event.payload.cwd,
        session_id: event.payload.sessionId,
        sandbox_state: event.payload.sandboxState,
        persisted: event.payload.persisted
      });
      break;
    case 'exec:chunk': {
      writeEvent({
        type: 'exec:chunk',
        correlation_id: event.correlationId,
        attempt: event.attempt,
        stream: event.payload.stream,
        sequence: event.payload.sequence,
        bytes: event.payload.bytes,
        data: event.payload.data
      });
      writeEvent({
        type: event.payload.stream === 'stdout' ? 'command:stdout' : 'command:stderr',
        data: event.payload.data
      });
      if (event.payload.stream === 'stdout') {
        hooks.onStdout(event.payload.bytes);
      } else {
        hooks.onStderr(event.payload.bytes);
      }
      break;
    }
    case 'exec:retry':
      writeEvent({
        type: 'exec:retry',
        correlation_id: event.correlationId,
        attempt: event.attempt,
        delay_ms: event.payload.delayMs,
        sandbox_state: event.payload.sandboxState,
        error: event.payload.errorMessage
      });
      break;
    case 'exec:end':
      writeEvent({
        type: 'exec:end',
        correlation_id: event.correlationId,
        attempt: event.attempt,
        exit_code: event.payload.exitCode,
        signal: event.payload.signal,
        duration_ms: event.payload.durationMs,
        status: event.payload.status
      });
      writeEvent({
        type: 'command:end',
        exit_code: event.payload.exitCode,
        signal: event.payload.signal,
        duration_ms: event.payload.durationMs
      });
      break;
    default:
      break;
  }
}

function buildSummary(
  stage: CommandStage,
  exitCode: number,
  stdout: string,
  stderr: string,
  signal: NodeJS.Signals | null
): string {
  if (stage.summaryHint) {
    return stage.summaryHint;
  }
  if (signal) {
    return `Terminated with signal ${signal}${stderr ? ` — ${truncate(stderr)}` : ''}`;
  }
  if (exitCode !== 0) {
    return `Exited with code ${exitCode}${stderr ? ` — ${truncate(stderr)}` : ''}`;
  }
  if (stdout) {
    return truncate(stdout);
  }
  if (stderr) {
    return truncate(stderr);
  }
  return `Command completed with code ${exitCode}`;
}

function truncate(value: string, length = 240): string {
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, length)}…`;
}
