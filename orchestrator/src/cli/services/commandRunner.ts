import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ExecEvent, UnifiedExecRunResult } from '../../../../packages/orchestrator/src/index.js';
import { ToolInvocationFailedError } from '../../../../packages/orchestrator/src/index.js';
import { getCliExecRunner, getPrivacyGuard, getExecHandleService } from './execRuntime.js';
import type { CommandStage, CliManifest, HandleRecord, PrivacyDecisionRecord } from '../types.js';
import type { RuntimeMode } from '../runtime/types.js';
import type { ExecHandleDescriptor } from '../../../../packages/orchestrator/src/index.js';
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
import { findPackageRoot } from '../utils/packageInfo.js';

const MAX_BUFFERED_OUTPUT_BYTES = 64 * 1024;
const EMIT_COMMAND_STREAM_MIRRORS = EnvUtils.getBoolean('CODEX_ORCHESTRATOR_EMIT_COMMAND_STREAMS', false);
export const MAX_CAPTURED_CHUNK_EVENTS = EnvUtils.getInt('CODEX_ORCHESTRATOR_EXEC_EVENT_MAX_CHUNKS', 500);
const MAX_COLLAB_TOOL_CALLS = EnvUtils.getInt('CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS', 200);
const PACKAGE_ROOT = findPackageRoot();
const REVIEW_EVIDENCE_CONSISTENCY_ENV_KEY = 'CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY';
const REVIEW_EVIDENCE_WAIVER_REASON_ENV_KEY = 'CODEX_REVIEW_EVIDENCE_WAIVER_REASON';
const REVIEW_TELEMETRY_POLL_INTERVAL_MS = 50;
const REVIEW_TELEMETRY_WAIT_TIMEOUT_MS = 2_000;

export interface CommandRunnerContext {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  stage: CommandStage;
  index: number;
  events?: RunEventPublisher;
  persister?: ManifestPersister;
  envOverrides?: NodeJS.ProcessEnv;
  runtimeMode?: RuntimeMode;
  runtimeSessionId?: string | null;
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

type CollabToolCallRecord = NonNullable<CliManifest['collab_tool_calls']>[number];

interface ReviewTelemetryEvidencePayload {
  generated_at?: unknown;
  output_log_path?: unknown;
  status?: unknown;
}

interface ReviewEvidenceMismatch {
  message: string;
  telemetryPath: string;
  telemetryStatus: string | null;
  telemetryGeneratedAt: string | null;
  telemetryOutputLogPath: string | null;
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
  let collabBuffer = '';
  let collabCount = manifest.collab_tool_calls?.length ?? 0;
  const manifestCaptureLimit =
    typeof manifest.collab_tool_calls_max_events === 'number'
      ? Math.max(0, Math.trunc(manifest.collab_tool_calls_max_events))
      : null;
  const hasLegacyUnknownCaptureHistory = manifestCaptureLimit === null && collabCount > 0;
  const runCollabCaptureLimit = manifestCaptureLimit ?? Math.max(0, MAX_COLLAB_TOOL_CALLS);
  if (!hasLegacyUnknownCaptureHistory) {
    manifest.collab_tool_calls_max_events = runCollabCaptureLimit;
  }

  const recordCollabToolCall = (record: CollabToolCallRecord) => {
    if (runCollabCaptureLimit <= 0) {
      return;
    }
    if (collabCount >= runCollabCaptureLimit) {
      return;
    }
    if (!manifest.collab_tool_calls) {
      manifest.collab_tool_calls = [];
    }
    manifest.collab_tool_calls.push(record);
    collabCount += 1;
    void persister?.schedule({ manifest: true });
  };

  const ingestCollabStdout = (data: string) => {
    collabBuffer += data;
    const lines = collabBuffer.split('\n');
    collabBuffer = lines.pop() ?? '';
    for (const line of lines) {
      const record = parseCollabToolCallLine(line, stage.id, entry.index);
      if (record) {
        recordCollabToolCall(record);
      }
    }
  };

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
        if (event.payload.stream === 'stdout') {
          ingestCollabStdout(event.payload.data);
        }
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
    const stageSessionId = runtimeSessionIdOrNull(sessionConfig.id);
    const inheritedRuntimeSessionId = runtimeSessionIdOrNull(context.runtimeSessionId);
    const effectiveSessionId = stageSessionId ?? inheritedRuntimeSessionId;
    const usesInheritedRuntimeSession = !stageSessionId && Boolean(inheritedRuntimeSessionId);
    const wantsPersist = Boolean(sessionConfig.persist || sessionConfig.reuse || usesInheritedRuntimeSession);
    const persistSession = Boolean(effectiveSessionId && wantsPersist);
    const reuseSession = Boolean(effectiveSessionId && (sessionConfig.reuse ?? persistSession));

    const baseEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...(envOverrides ?? {}),
      MCP_RUNNER_TASK_ID: manifest.task_id,
      CODEX_ORCHESTRATOR_TASK_ID: manifest.task_id,
      CODEX_ORCHESTRATOR_RUN_ID: manifest.run_id,
      CODEX_ORCHESTRATOR_PIPELINE_ID: manifest.pipeline_id,
      CODEX_ORCHESTRATOR_MANIFEST_PATH: paths.manifestPath,
      CODEX_ORCHESTRATOR_RUN_DIR: paths.runDir,
      CODEX_ORCHESTRATOR_RUNS_DIR: env.runsRoot,
      CODEX_ORCHESTRATOR_OUT_DIR: env.outRoot,
      CODEX_ORCHESTRATOR_ROOT: env.repoRoot,
      CODEX_ORCHESTRATOR_PACKAGE_ROOT: PACKAGE_ROOT
    };
    baseEnv.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE =
      context.runtimeMode ?? (manifest.runtime_mode === 'appserver' ? 'appserver' : 'cli');
    // Keep both keys during migration because downstream tools still read either name.
    baseEnv.CODEX_ORCHESTRATOR_RUNTIME_MODE = baseEnv.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE;
    const execEnv: NodeJS.ProcessEnv = { ...baseEnv, ...stage.env };
    const timeoutMs = resolveStageTimeoutMs(stage, execEnv);
    const invocationId = `cli-command:${manifest.run_id}:${stage.id}:${Date.now()}`;
    if (timeoutMs !== null) {
      writeEvent({ type: 'command:config', timeout_ms: timeoutMs });
    }

    let result: UnifiedExecRunResult;
    const eventCapture =
      MAX_CAPTURED_CHUNK_EVENTS > 0 ? { maxChunkEvents: MAX_CAPTURED_CHUNK_EVENTS } : undefined;
    try {
      result = await runner.run({
        command: stage.command,
        cwd: stage.cwd ?? env.repoRoot,
        env: execEnv,
        sessionId: effectiveSessionId ?? undefined,
        persistSession,
        reuseSession,
        invocationId,
        toolId: 'cli:command',
        description: stage.title,
        ...(timeoutMs !== null ? { timeoutMs } : {}),
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
    const timeoutBoundMs =
      typeof result.timeoutMs === 'number' && Number.isFinite(result.timeoutMs) && result.timeoutMs > 0
        ? Math.trunc(result.timeoutMs)
        : timeoutMs;
    const timedOut = result.timedOut === true;
    const summary = buildSummary(stage, normalizedExitCode, stdoutText, stderrText, result.signal, {
      timedOut,
      timeoutMs: timeoutBoundMs
    });
    const reviewEvidenceMismatch = shouldEnforceReviewEvidenceConsistency(stage)
      ? await verifyReviewEvidenceConsistency({
          env,
          paths,
          expectedStatus: result.status === 'succeeded' ? 'succeeded' : 'failed',
          startedAt: entry.started_at
        })
      : null;
    const reviewEvidenceWaiverReason = resolveReviewEvidenceWaiverReason(stage.env);
    let effectiveSummary = summary;
    let forceReviewEvidenceFailure = false;

    if (reviewEvidenceMismatch) {
      if (reviewEvidenceWaiverReason) {
        effectiveSummary = `${summary} (review evidence waiver: ${reviewEvidenceWaiverReason}; ${reviewEvidenceMismatch.message})`;
        writeEvent({
          type: 'command:waiver',
          waiver: 'review-evidence-consistency',
          reason: reviewEvidenceWaiverReason,
          telemetry_path: relativeToRepo(env, reviewEvidenceMismatch.telemetryPath),
          detail: reviewEvidenceMismatch.message
        });
        events?.log({
          stageId: stage.id,
          stageIndex: index,
          level: 'warn',
          source: 'system',
          message: `Review evidence waiver applied: ${reviewEvidenceMismatch.message}`
        });
      } else {
        effectiveSummary =
          result.status === 'succeeded'
            ? `Review evidence mismatch: ${reviewEvidenceMismatch.message}`
            : `Review evidence mismatch after command failure: ${reviewEvidenceMismatch.message} Command result: ${summary}`;
        forceReviewEvidenceFailure = true;
      }
    }
    const effectiveExitCode =
      forceReviewEvidenceFailure && normalizedExitCode === 0 ? 1 : normalizedExitCode;

    entry.completed_at = isoTimestamp();
    entry.exit_code = effectiveExitCode;
    entry.summary = effectiveSummary;
    entry.status = forceReviewEvidenceFailure
      ? 'failed'
      : result.status === 'succeeded'
        ? 'succeeded'
        : stage.allowFailure
          ? 'skipped'
          : 'failed';

    if (collabBuffer.trim()) {
      const record = parseCollabToolCallLine(collabBuffer, stage.id, entry.index);
      if (record) {
        recordCollabToolCall(record);
      }
      collabBuffer = '';
    }

    if (result.status !== 'succeeded' && entry.status === 'skipped') {
      const fallbackReason = timedOut ? 'timed_out' : 'command_failed';
      writeEvent({
        type: 'command:fallback',
        fallback: 'allow_failure',
        reason: fallbackReason,
        exit_code: normalizedExitCode,
        signal: result.signal,
        timeout_ms: timeoutBoundMs
      });
      events?.log({
        stageId: stage.id,
        stageIndex: index,
        level: 'warn',
        source: 'system',
        message: timedOut
          ? `Non-fatal fallback applied after timeout (${timeoutBoundMs !== null ? `${timeoutBoundMs}ms` : 'configured timeout'}).`
          : 'Non-fatal fallback applied after command failure.'
      });
    }

    if (result.status !== 'succeeded') {
      const failureReason = timedOut ? 'timed_out' : 'command_failed';
      const errorDetails: Record<string, unknown> = {
        exit_code: effectiveExitCode,
        sandbox_state: result.sandboxState,
        stderr: stderrText,
        failure_reason: failureReason
      };
      if (effectiveExitCode !== normalizedExitCode) {
        errorDetails.command_exit_code = normalizedExitCode;
      }
      if (result.signal) {
        errorDetails.signal = result.signal;
      }
      if (timeoutBoundMs !== null) {
        errorDetails.timeout_ms = timeoutBoundMs;
      }
      if (timedOut) {
        errorDetails.timed_out = true;
      }
      if (entry.status === 'skipped') {
        errorDetails.non_fatal_fallback = true;
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
        entry.status === 'skipped' ? 'command-allow-failure' : 'command-failed',
        errorDetails
      );
    }

    if (forceReviewEvidenceFailure && reviewEvidenceMismatch) {
      if (entry.error_file) {
        writeEvent({
          type: 'command:warning',
          warning: 'review-evidence-inconsistent',
          preserved_error_file: entry.error_file,
          telemetry_path: relativeToRepo(env, reviewEvidenceMismatch.telemetryPath),
          detail: reviewEvidenceMismatch.message
        });
        events?.log({
          stageId: stage.id,
          stageIndex: index,
          level: 'warn',
          source: 'system',
          message: `Review evidence mismatch preserved alongside the original command failure: ${reviewEvidenceMismatch.message}`
        });
      } else {
        entry.error_file = await appendCommandError(
          env,
          paths,
          manifest,
          entry,
          'review-evidence-inconsistent',
          {
            exit_code: effectiveExitCode,
            command_exit_code: normalizedExitCode,
            sandbox_state: result.sandboxState,
            expected_review_status: result.status === 'succeeded' ? 'succeeded' : 'failed',
            telemetry_status: reviewEvidenceMismatch.telemetryStatus,
            telemetry_generated_at: reviewEvidenceMismatch.telemetryGeneratedAt,
            telemetry_output_log_path: reviewEvidenceMismatch.telemetryOutputLogPath,
            telemetry_path: relativeToRepo(env, reviewEvidenceMismatch.telemetryPath),
            failure_reason: 'review_evidence_inconsistent',
            detail: reviewEvidenceMismatch.message
          }
        );
      }
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

    return { exitCode: effectiveExitCode, summary: effectiveSummary };
  } finally {
    unsubscribe();
    runnerLog.end();
    commandLog.end();
    privacyLog.end();
  }
}

function shouldEnforceReviewEvidenceConsistency(stage: CommandStage): boolean {
  return (
    parseBooleanEnvFlag(stage.env?.[REVIEW_EVIDENCE_CONSISTENCY_ENV_KEY]) &&
    isReviewCommandStage(stage)
  );
}

function isReviewCommandStage(stage: CommandStage): boolean {
  const stageId = stage.id.trim().toLowerCase();
  if (stageId === 'review') {
    return true;
  }
  const haystack = `${stage.title} ${stage.command}`.toLowerCase();
  return (
    haystack.includes('npm run review') ||
    haystack.includes('codex review') ||
    haystack.includes('codex-orchestrator review') ||
    haystack.includes('run-review.ts') ||
    haystack.includes('run-review.js')
  );
}

function resolveReviewEvidenceWaiverReason(
  env: Record<string, string> | NodeJS.ProcessEnv | undefined
): string | null {
  const reason = env?.[REVIEW_EVIDENCE_WAIVER_REASON_ENV_KEY]?.trim();
  return reason && reason.length > 0 ? reason : null;
}

function parseBooleanEnvFlag(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

async function verifyReviewEvidenceConsistency(options: {
  env: EnvironmentPaths;
  paths: RunPaths;
  expectedStatus: 'succeeded' | 'failed';
  startedAt: string | null | undefined;
}): Promise<ReviewEvidenceMismatch | null> {
  const telemetryPath = join(options.paths.runDir, 'review', 'telemetry.json');
  const telemetry = await waitForReviewTelemetryEvidence(telemetryPath);
  if (!telemetry) {
    return {
      message: 'review telemetry is missing, unreadable, or incomplete at terminal stage closeout.',
      telemetryPath,
      telemetryStatus: null,
      telemetryGeneratedAt: null,
      telemetryOutputLogPath: null
    };
  }

  const generatedAt =
    typeof telemetry.generated_at === 'string' && telemetry.generated_at.trim().length > 0
      ? telemetry.generated_at
      : null;
  if (!generatedAt) {
    return {
      message: 'review telemetry is missing generated_at, so terminal evidence freshness cannot be verified.',
      telemetryPath,
      telemetryStatus: coerceTelemetryString(telemetry.status),
      telemetryGeneratedAt: null,
      telemetryOutputLogPath: coerceTelemetryString(telemetry.output_log_path)
    };
  }
  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    return {
      message: `review telemetry generated_at is invalid (${generatedAt}).`,
      telemetryPath,
      telemetryStatus: coerceTelemetryString(telemetry.status),
      telemetryGeneratedAt: generatedAt,
      telemetryOutputLogPath: coerceTelemetryString(telemetry.output_log_path)
    };
  }

  const startedAtMs = typeof options.startedAt === 'string' ? Date.parse(options.startedAt) : Number.NaN;
  if (Number.isFinite(startedAtMs) && generatedAtMs < startedAtMs) {
    return {
      message: `review telemetry is stale (generated_at ${generatedAt} precedes stage start ${options.startedAt}).`,
      telemetryPath,
      telemetryStatus: coerceTelemetryString(telemetry.status),
      telemetryGeneratedAt: generatedAt,
      telemetryOutputLogPath: coerceTelemetryString(telemetry.output_log_path)
    };
  }

  const telemetryStatus = coerceTelemetryString(telemetry.status);
  if (telemetryStatus !== options.expectedStatus) {
    return {
      message: `review telemetry status ${telemetryStatus ?? '<missing>'} does not match terminal stage result ${options.expectedStatus}.`,
      telemetryPath,
      telemetryStatus,
      telemetryGeneratedAt: generatedAt,
      telemetryOutputLogPath: coerceTelemetryString(telemetry.output_log_path)
    };
  }

  const expectedOutputLogPath = relativeToRepo(
    options.env,
    join(options.paths.runDir, 'review', 'output.log')
  );
  const telemetryOutputLogPath = coerceTelemetryString(telemetry.output_log_path);
  if (telemetryOutputLogPath !== expectedOutputLogPath) {
    return {
      message: `review telemetry output_log_path ${telemetryOutputLogPath ?? '<missing>'} does not match the active run artifact ${expectedOutputLogPath}.`,
      telemetryPath,
      telemetryStatus,
      telemetryGeneratedAt: generatedAt,
      telemetryOutputLogPath
    };
  }

  return null;
}

async function waitForReviewTelemetryEvidence(
  telemetryPath: string
): Promise<ReviewTelemetryEvidencePayload | null> {
  const deadline = Date.now() + REVIEW_TELEMETRY_WAIT_TIMEOUT_MS;
  for (;;) {
    try {
      const raw = await readFile(telemetryPath, 'utf8');
      const parsed = JSON.parse(raw) as ReviewTelemetryEvidencePayload | null;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Best-effort polling only; keep waiting until the short deadline expires.
    }
    if (Date.now() >= deadline) {
      return null;
    }
    await delay(REVIEW_TELEMETRY_POLL_INTERVAL_MS);
  }
}

function coerceTelemetryString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runtimeSessionIdOrNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  signal: NodeJS.Signals | null,
  options: { timedOut?: boolean; timeoutMs?: number | null } = {}
): string {
  if (stage.summaryHint) {
    return stage.summaryHint;
  }
  if (options.timedOut) {
    const timeoutLabel =
      typeof options.timeoutMs === 'number' && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
        ? `${Math.trunc(options.timeoutMs)}ms`
        : 'configured timeout';
    return `Timed out after ${timeoutLabel}${stderr ? ` — ${truncate(stderr)}` : ''}`;
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

function parseCollabToolCallLine(
  line: string,
  stageId: string,
  commandIndex: number
): CollabToolCallRecord | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('"collab_tool_call"')) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  const eventType = record.type;
  if (eventType !== 'item.started' && eventType !== 'item.completed' && eventType !== 'item.updated') {
    return null;
  }
  const item = record.item as Record<string, unknown> | undefined;
  if (!item || item.type !== 'collab_tool_call') {
    return null;
  }
  const receiverThreadIds = Array.isArray(item.receiver_thread_ids)
    ? item.receiver_thread_ids.filter((entry) => typeof entry === 'string')
    : [];
  const senderAgentPath = typeof item.sender_agent_path === 'string' ? item.sender_agent_path : null;
  const receiverAgentPaths = parseStringArray(item.receiver_agent_paths);
  const receiverAgents = parseCollabReceiverAgents(item.receiver_agents);

  return {
    observed_at: isoTimestamp(),
    stage_id: stageId,
    command_index: commandIndex,
    event_type: eventType,
    item_id: typeof item.id === 'string' ? item.id : 'unknown',
    tool: typeof item.tool === 'string' ? item.tool : 'unknown',
    status: normalizeCollabStatus(item.status),
    sender_thread_id: typeof item.sender_thread_id === 'string' ? item.sender_thread_id : 'unknown',
    receiver_thread_ids: receiverThreadIds,
    sender_agent_path: senderAgentPath,
    receiver_agent_paths:
      receiverAgentPaths.length > 0
        ? receiverAgentPaths
        : receiverAgents
            ?.map((entry) => entry.agent_path)
            .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0) ?? null,
    receiver_agents: receiverAgents,
    prompt: typeof item.prompt === 'string' ? item.prompt : null,
    fork_context: typeof item.fork_context === 'boolean' ? item.fork_context : null,
    agents_states:
      item.agents_states && typeof item.agents_states === 'object'
        ? (item.agents_states as Record<string, unknown>)
        : null
  };
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
}

function parseCollabReceiverAgents(
  value: unknown
): NonNullable<CollabToolCallRecord['receiver_agents']> | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const parsed: NonNullable<CollabToolCallRecord['receiver_agents']> = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const threadId = typeof record.thread_id === 'string' ? record.thread_id : null;
    const agentNickname = typeof record.agent_nickname === 'string' ? record.agent_nickname : null;
    const agentRole = typeof record.agent_role === 'string' ? record.agent_role : null;
    const agentPath = typeof record.agent_path === 'string' ? record.agent_path : null;
    if (!threadId && !agentNickname && !agentRole && !agentPath) {
      continue;
    }
    parsed.push({
      thread_id: threadId,
      agent_nickname: agentNickname,
      agent_role: agentRole,
      agent_path: agentPath
    });
  }
  return parsed.length > 0 ? parsed : null;
}

function normalizeCollabStatus(value: unknown): CollabToolCallRecord['status'] {
  if (value === 'completed' || value === 'failed' || value === 'in_progress') {
    return value;
  }
  return 'in_progress';
}

function resolveStageTimeoutMs(stage: CommandStage, env: NodeJS.ProcessEnv): number | null {
  const stageTimeout = normalizeTimeoutMs(stage.timeoutMs);
  if (stageTimeout !== null) {
    return stageTimeout;
  }
  return normalizeTimeoutMs(parseNumber(env.CODEX_ORCHESTRATOR_STAGE_TIMEOUT_MS));
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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
