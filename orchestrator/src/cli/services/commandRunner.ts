import { createWriteStream } from 'node:fs';
import { join } from 'node:path';

import type { ExecEvent, UnifiedExecRunResult } from '../../../../packages/orchestrator/src/index.js';
import { ToolInvocationFailedError } from '../../../../packages/orchestrator/src/index.js';
import { getCliExecRunner, getPrivacyGuard, getExecHandleService } from './execRuntime.js';
import type { CommandStage, CliManifest, HandleRecord, PrivacyDecisionRecord } from '../types.js';
import type { ExecHandleDescriptor } from '../../../../packages/orchestrator/src/exec/handle-service.js';
import type { RunEventPublisher } from '../events/runEvents.js';
import { logger } from '../../logger.js';
import type { EnvironmentPaths } from '../run/environment.js';
import type { RunPaths } from '../run/runPaths.js';
import { relativeToRepo } from '../run/runPaths.js';
import {
  appendCommandError,
  updateCommandStatus
} from '../run/manifest.js';
import { persistManifest, type ManifestPersister } from '../run/manifestPersister.js';
import { slugify } from '../utils/strings.js';
import { isoTimestamp } from '../utils/time.js';
import { EnvUtils } from '../../../../packages/shared/config/index.js';

const MAX_BUFFERED_OUTPUT_BYTES = 64 * 1024;
const EMIT_COMMAND_STREAM_MIRRORS = EnvUtils.getBoolean('CODEX_ORCHESTRATOR_EMIT_COMMAND_STREAMS', false);
const MAX_CAPTURED_CHUNK_EVENTS = EnvUtils.getInt('CODEX_ORCHESTRATOR_EXEC_EVENT_MAX_CHUNKS', 0);

export interface CommandRunnerContext {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  stage: CommandStage;
  index: number;
  events?: RunEventPublisher;
  persister?: ManifestPersister;
  envOverrides?: NodeJS.ProcessEnv;
}

export interface CommandRunHooks {
  onEvent?: (event: ExecEvent) => void;
  onResult?: (result: UnifiedExecRunResult) => void;
  onError?: (error: ToolInvocationFailedError) => void;
}

interface CommandRunResult {
  exitCode: number;
  summary: string;
}

export async function runCommandStage(
  context: CommandRunnerContext,
  hooks: CommandRunHooks = {}
): Promise<CommandRunResult> {
  const { env, paths, manifest, stage, index, events, persister, envOverrides } = context;
  const entryIndex = index - 1;
  const entry = updateCommandStatus(manifest, entryIndex, {
    status: 'running',
    started_at: isoTimestamp(),
    exit_code: null,
    summary: null
  });

  const logFile = join(paths.commandsDir, `${String(index).padStart(2, '0')}-${slugify(stage.id)}.ndjson`);
  entry.log_path = relativeToRepo(env, logFile);
  await persistManifest(paths, manifest, persister, { force: true });
  events?.stageStarted({
    stageId: stage.id,
    stageIndex: index,
    title: stage.title,
    kind: 'command',
    logPath: entry.log_path,
    status: entry.status
  });

  const runnerLog = createWriteStream(paths.logPath, { flags: 'a' });
  const commandLog = createWriteStream(logFile, { flags: 'a' });
  const privacyLogPath = join(paths.runDir, 'privacy-decisions.ndjson');
  const privacyLog = createWriteStream(privacyLogPath, { flags: 'a' });

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
    hooks.onEvent?.(event);
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
    switch (event.type) {
      case 'exec:begin':
        events?.toolCall({
          stageId: stage.id,
          stageIndex: index,
          toolName: 'exec',
          status: 'started',
          message: stage.command,
          attempt: event.attempt
        });
        break;
      case 'exec:chunk':
        events?.log({
          stageId: stage.id,
          stageIndex: index,
          level: event.payload.stream === 'stderr' ? 'error' : 'info',
          message: event.payload.data,
          source: event.payload.stream
        });
        break;
      case 'exec:retry':
        events?.toolCall({
          stageId: stage.id,
          stageIndex: index,
          toolName: 'exec',
          status: 'retry',
          message: event.payload.errorMessage,
          attempt: event.attempt
        });
        break;
      case 'exec:end':
        events?.toolCall({
          stageId: stage.id,
          stageIndex: index,
          toolName: 'exec',
          status: event.payload.status,
          message: `exit ${event.payload.exitCode ?? 'null'}`,
          attempt: event.attempt
        });
        break;
      default:
        break;
    }
  };

  const unsubscribe = runner.on(handleEvent);
  try {
    const sessionConfig = stage.session ?? {};
    const sessionId = sessionConfig.id;
    const wantsPersist = Boolean(sessionConfig.persist || sessionConfig.reuse);
    const persistSession = Boolean(sessionId && wantsPersist);
    const reuseSession = Boolean(sessionId && (sessionConfig.reuse ?? persistSession));

    const baseEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...(envOverrides ?? {}),
      CODEX_ORCHESTRATOR_TASK_ID: manifest.task_id,
      CODEX_ORCHESTRATOR_RUN_ID: manifest.run_id,
      CODEX_ORCHESTRATOR_PIPELINE_ID: manifest.pipeline_id,
      CODEX_ORCHESTRATOR_MANIFEST_PATH: paths.manifestPath,
      CODEX_ORCHESTRATOR_RUN_DIR: paths.runDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
      CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
      CODEX_ORCHESTRATOR_REPO_ROOT: env.repoRoot
    };
    const execEnv: NodeJS.ProcessEnv = { ...baseEnv, ...stage.env };
    const invocationId = `cli-command:${manifest.run_id}:${stage.id}:${Date.now()}`;

    let result: UnifiedExecRunResult;
    const eventCapture =
      MAX_CAPTURED_CHUNK_EVENTS > 0 ? { maxChunkEvents: MAX_CAPTURED_CHUNK_EVENTS } : undefined;
    try {
      result = await runner.run({
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
        eventCapture,
        metadata: {
          stageId: stage.id,
          pipelineId: manifest.pipeline_id,
          runId: manifest.run_id,
          commandIndex: entry.index
        }
      });
      hooks.onResult?.(result);

      if (result.handle) {
        recordHandle(manifest, result.handle, {
          stageId: stage.id,
          pipelineId: manifest.pipeline_id,
          runId: manifest.run_id
        });
        const appendedPrivacyRecords = updatePrivacyManifest(manifest, {
          env,
          paths,
          logPath: privacyLogPath
        });
        writePrivacyLog(privacyLog, appendedPrivacyRecords);
      }
    } catch (error) {
      if (error instanceof ToolInvocationFailedError) {
        hooks.onError?.(error);
        captureFailureHandle(manifest, stage, error);
        const appendedPrivacyRecords = updatePrivacyManifest(manifest, {
          env,
          paths,
          logPath: privacyLogPath
        });
        writePrivacyLog(privacyLog, appendedPrivacyRecords);
      }
      throw error;
    }

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

    await persistManifest(paths, manifest, persister, { force: true });
    events?.stageCompleted({
      stageId: stage.id,
      stageIndex: index,
      title: stage.title,
      kind: 'command',
      status: entry.status,
      exitCode: entry.exit_code,
      summary: entry.summary,
      logPath: entry.log_path
    });

    return { exitCode: normalizedExitCode, summary };
  } finally {
    unsubscribe();
    runnerLog.end();
    commandLog.end();
    privacyLog.end();
  }
}

function recordHandle(
  manifest: CliManifest,
  descriptor: ExecHandleDescriptor,
  context: { stageId: string | null; pipelineId: string; runId: string }
): void {
  const handles = Array.isArray(manifest.handles) ? [...manifest.handles] : [];
  const entry = {
    handle_id: descriptor.id,
    correlation_id: descriptor.correlationId,
    stage_id: context.stageId,
    pipeline_id: context.pipelineId,
    status: descriptor.status,
    frame_count: descriptor.frameCount,
    latest_sequence: descriptor.latestSequence,
    created_at: descriptor.createdAt,
    metadata: {
      run_id: context.runId
    }
  } satisfies HandleRecord;
  const existingIndex = handles.findIndex((candidate) => candidate.handle_id === entry.handle_id);
  if (existingIndex >= 0) {
    handles[existingIndex] = entry;
  } else {
    handles.push(entry);
  }
  manifest.handles = handles;
}

function updatePrivacyManifest(
  manifest: CliManifest,
  context: { env: EnvironmentPaths; paths: RunPaths; logPath: string }
): PrivacyDecisionRecord[] {
  const metrics = getPrivacyGuard().getMetrics();
  const existingDecisions = manifest.privacy?.decisions ?? [];
  const newMetricsDecisions = metrics.decisions.slice(existingDecisions.length);
  const appended = newMetricsDecisions.map((decision) => ({
    handle_id: decision.handleId,
    sequence: decision.sequence,
    action: decision.action,
    rule: decision.rule ?? null,
    reason: decision.reason ?? null,
    timestamp: decision.timestamp,
    stage_id: resolveHandleStage(manifest, decision.handleId)
  } satisfies PrivacyDecisionRecord));

  if (!manifest.privacy) {
    manifest.privacy = {
      mode: metrics.mode,
      decisions: [...appended],
      totals: {
        total_frames: metrics.totalFrames,
        redacted_frames: metrics.redactedFrames,
        blocked_frames: metrics.blockedFrames,
        allowed_frames: metrics.allowedFrames
      },
      log_path: relativeToRepo(context.env, context.logPath)
    };
  } else {
    manifest.privacy.mode = metrics.mode;
    manifest.privacy.totals = {
      total_frames: metrics.totalFrames,
      redacted_frames: metrics.redactedFrames,
      blocked_frames: metrics.blockedFrames,
      allowed_frames: metrics.allowedFrames
    };
    if (appended.length > 0) {
      manifest.privacy.decisions.push(...appended);
    }
    manifest.privacy.log_path = relativeToRepo(context.env, context.logPath);
  }

  return appended;
}

function resolveHandleStage(manifest: CliManifest, handleId: string): string | null {
  const record = manifest.handles?.find((entry) => entry.handle_id === handleId);
  return record?.stage_id ?? null;
}

function captureFailureHandle(
  manifest: CliManifest,
  stage: CommandStage,
  error: ToolInvocationFailedError
): void {
  const metadata = (error.record?.metadata as Record<string, unknown> | undefined)?.exec as
    | (Record<string, unknown> & { handleId?: string; runId?: string })
    | undefined;
  const handleId = metadata?.handleId as string | undefined;
  if (!handleId) {
    return;
  }
  try {
    const descriptor = getExecHandleService().getDescriptor(handleId);
    recordHandle(manifest, descriptor, {
      stageId: stage.id,
      pipelineId: manifest.pipeline_id,
      runId: manifest.run_id
    });
  } catch (lookupError) {
    logger.warn(
      `Handle descriptor missing for failed stage ${stage.id ?? '<unknown>'}: ${(lookupError as Error).message}`
    );
  }
}

function writePrivacyLog(stream: NodeJS.WritableStream, records: PrivacyDecisionRecord[]): void {
  if (!records || records.length === 0) {
    return;
  }
  for (const record of records) {
    stream.write(`${JSON.stringify(record)}\n`);
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
      if (EMIT_COMMAND_STREAM_MIRRORS) {
        writeEvent({
          type: event.payload.stream === 'stdout' ? 'command:stdout' : 'command:stderr',
          data: event.payload.data
        });
      }
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
