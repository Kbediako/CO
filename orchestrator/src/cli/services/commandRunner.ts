import { createWriteStream, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

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
  markManifestGoalEvidenceExplicitClear,
  updateCommandStatus
} from '../run/manifest.js';
import { persistManifest, type ManifestPersister } from '../run/manifestPersister.js';
import {
  normalizeProviderLinearGoalEvidenceForProof,
  normalizeProviderLinearGoalEvidenceValue,
  PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR,
  PROVIDER_LINEAR_WORKER_PROOF_FILENAME,
  type ProviderLinearWorkerProof
} from '../providerLinearWorkerRunner.js';
import { slugify } from '../utils/strings.js';
import { isoTimestamp } from '../utils/time.js';
import { buildCommandPreview } from '../utils/commandPreview.js';
import { EnvUtils } from '../../../../packages/shared/config/index.js';
import {
  coerceReviewFindingPriority,
  coerceReviewSemanticVerdict,
  deriveReviewOutcomeDisposition,
  formatReviewContractTelemetrySummary,
  formatReviewSemanticVerdictSummary,
  type ReviewOutcomeDisposition
} from '../../../../scripts/lib/review-execution-telemetry.js';
import { findPackageRoot } from '../utils/packageInfo.js';
import {
  applyResolvedProgramInvocationEnvOverrides,
  resolvePackageProgramInvocation,
  resolveProviderLinearWorkerProgramInvocation
} from '../utils/packageProgramResolver.js';
import {
  buildProviderLinearWorkerTerminalSummary,
  deriveDeterministicProviderMutationSuppressions,
  formatDeterministicProviderMutationDegradationSummary,
  isProviderLinearWorkerProofFreshForStage,
  REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY,
  resolveProviderLinearWorkerAttemptStartedAt,
  resolveProviderLinearWorkerTerminalReason,
  resolveProviderLinearWorkerTerminalStatus
} from '../control/providerLinearWorkerTruth.js';

const MAX_BUFFERED_OUTPUT_BYTES = 64 * 1024;
const EMIT_COMMAND_STREAM_MIRRORS = EnvUtils.getBoolean('CODEX_ORCHESTRATOR_EMIT_COMMAND_STREAMS', false);
export const MAX_CAPTURED_CHUNK_EVENTS = EnvUtils.getInt('CODEX_ORCHESTRATOR_EXEC_EVENT_MAX_CHUNKS', 500);
const MAX_COLLAB_TOOL_CALLS = EnvUtils.getInt('CODEX_ORCHESTRATOR_COLLAB_MAX_EVENTS', 200);
const PACKAGE_ROOT = findPackageRoot();
const REVIEW_EVIDENCE_CONSISTENCY_ENV_KEY = 'CODEX_REVIEW_ENFORCE_EVIDENCE_CONSISTENCY';
const REVIEW_EVIDENCE_WAIVER_REASON_ENV_KEY = 'CODEX_REVIEW_EVIDENCE_WAIVER_REASON';
const REVIEW_TELEMETRY_POLL_INTERVAL_MS = 50;
const REVIEW_TELEMETRY_WAIT_TIMEOUT_MS = 2_000;
const REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_LINE_PATTERN =
  /^(?:(?:trace|debug|info|warn|error)\s+|\d{4}-\d{2}-\d{2}T[^\r\n]*?\s+(?:trace|debug|info|warn|error)\s+)codex_core::session:\s+failed to record rollout items:\s+thread\b[^\r\n]*\bnot found\b/iu;
const PROVIDER_LINEAR_WORKER_PROOF_LOCK_DIAGNOSTIC_PATTERN =
  /(?:Failed to acquire provider-linear-worker proof lock|\[lock_diagnostics\b[^\]\r\n]*provider-linear-worker-proof\.json\.lock[^\]\r\n]*\])/iu;
const REVIEW_OUTCOME_BOUNDARY_PRESENCE_SENTINEL = {
  kind: 'timeout',
  provenance: 'review-timeout',
  reason: '',
  sample: null
} as const;

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

interface ResolvedStageInvocation {
  command: string;
  args?: string[];
  preview: string;
  warning?: string | null;
  envOverrides?: NodeJS.ProcessEnv;
}

type CollabToolCallRecord = NonNullable<CliManifest['collab_tool_calls']>[number];

interface ReviewTelemetryEvidencePayload {
  generated_at?: unknown;
  output_log_path?: unknown;
  status?: unknown;
  review_outcome?: unknown;
  review_verdict?: unknown;
  highest_finding_priority?: unknown;
  finding_count?: unknown;
  contract_path?: unknown;
  contract_mode?: unknown;
  contract_validation?: unknown;
  contract_overall_verdict?: unknown;
  axis_verdicts?: unknown;
  axis_finding_counts?: unknown;
  proposal_counts?: unknown;
  error?: unknown;
  termination_boundary?: unknown;
  launch_context?: unknown;
}

interface ReviewEvidenceMismatch {
  message: string;
  telemetryPath: string;
  telemetryStatus: string | null;
  telemetryGeneratedAt: string | null;
  telemetryOutputLogPath: string | null;
}

interface ReviewTelemetryEvidenceSource {
  label: string;
  repoRoot: string;
  runDir: string;
  telemetryPath: string;
  outputLogPath: string;
  expectedOutputLogPath: string;
  topLevel: boolean;
}

interface ProviderReviewTelemetryEvidence extends ReviewTelemetryEvidenceSource {
  telemetry: ReviewTelemetryEvidencePayload;
  generatedAt: string | null;
  manifestCompletedAt: string | null;
}

interface ProviderNestedReviewRunCandidate {
  repoRoot: string;
  runDir: string;
  taskEntry: string;
  runEntry: string;
  proofLinked: boolean;
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

  const runner = getCliExecRunner();
  let invocationPreview = stage.command;

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
          message: invocationPreview,
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
    baseEnv.CODEX_ORCHESTRATOR_NODE_BIN = process.execPath;
    baseEnv.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE =
      context.runtimeMode ?? (manifest.runtime_mode === 'appserver' ? 'appserver' : 'cli');
    // Keep both keys during migration because downstream tools still read either name.
    baseEnv.CODEX_ORCHESTRATOR_RUNTIME_MODE = baseEnv.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE;
    const execEnv: NodeJS.ProcessEnv = { ...baseEnv, ...stage.env };
    execEnv.CODEX_ORCHESTRATOR_NODE_BIN = process.execPath;
    const invocation = resolveStageInvocation(stage, execEnv);
    applyResolvedProgramInvocationEnvOverrides(execEnv, invocation.envOverrides);
    if (invocation.warning) {
      logger.warn(invocation.warning);
      writeEvent({ type: 'command:warning', warning: invocation.warning });
    }
    invocationPreview = invocation.preview;
    writeEvent({ type: 'command:start', command: invocationPreview });
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
        command: invocation.command,
        args: invocation.args,
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
    const enforceReviewEvidenceConsistency = shouldEnforceReviewEvidenceConsistency(stage);
    const providerLinearWorkerStage = isProviderLinearWorkerCommandStage(stage);
    const reviewTelemetryPath = join(paths.runDir, 'review', 'telemetry.json');
    const shouldAwaitReviewTelemetry =
      (isReviewCommandStage(stage) || providerLinearWorkerStage) &&
      shouldAwaitReviewTelemetryEvidence(execEnv, enforceReviewEvidenceConsistency);
    const reviewTelemetry = isReviewCommandStage(stage) || providerLinearWorkerStage
      ? await loadReviewTelemetryEvidence(reviewTelemetryPath, {
          waitForEvidence: shouldAwaitReviewTelemetry
        })
      : null;
    const reviewEvidenceMismatch =
      isReviewCommandStage(stage) && (enforceReviewEvidenceConsistency || reviewTelemetry !== null)
      ? await verifyReviewEvidenceConsistency({
          env,
          paths,
          expectedStatus: result.status === 'succeeded' ? 'succeeded' : 'failed',
          startedAt: entry.started_at,
          telemetry: reviewTelemetry,
          telemetryPreloaded: shouldAwaitReviewTelemetry,
          telemetryPath: reviewTelemetryPath
        })
      : null;
    const providerReviewTelemetryMismatch =
      providerLinearWorkerStage && reviewTelemetry !== null
      ? verifyReviewTelemetryFreshness({
          env,
          paths,
          startedAt: entry.started_at,
          telemetry: reviewTelemetry,
          telemetryPath: reviewTelemetryPath
        })
      : null;
    let providerReviewTelemetry =
      providerReviewTelemetryMismatch === null
        ? reviewTelemetry
        : null;
    let providerReviewTelemetrySource =
      providerLinearWorkerStage && providerReviewTelemetry !== null
        ? buildTopLevelReviewTelemetryEvidenceSource({ env, paths, telemetryPath: reviewTelemetryPath })
        : null;
    const providerReviewTelemetryExpectedPath = providerLinearWorkerStage
      ? relativeToRepo(env, reviewTelemetryPath)
      : null;
    const reviewEvidenceWaiverReason = resolveReviewEvidenceWaiverReason(stage.env);
    let effectiveSummary = summary;
    let forceReviewEvidenceFailure = false;
    let forceProviderLinearWorkerFailure = false;
    let providerLinearWorkerFailureReason: string | null = null;
    let providerLinearWorkerTerminalStatus: string | null = null;
    let providerLinearWorkerTerminalReason: string | null = null;
    let providerLinearWorkerReviewOutcomeSummary: string | null = null;
    let reviewOutputLogNoiseSummary: string | null = null;

    if (reviewEvidenceMismatch && enforceReviewEvidenceConsistency) {
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
    if (!reviewEvidenceMismatch) {
      const reviewOutcomeSummary = formatReviewTelemetryOutcomeSummary(
        providerLinearWorkerStage ? providerReviewTelemetry : reviewTelemetry
      );
      if (reviewOutcomeSummary) {
        effectiveSummary = `${effectiveSummary} (${reviewOutcomeSummary})`;
      }
      reviewOutputLogNoiseSummary = await formatReviewOutputLogNoiseSummary({
        paths,
        telemetry: providerLinearWorkerStage ? providerReviewTelemetry : reviewTelemetry
      });
      if (reviewOutputLogNoiseSummary) {
        effectiveSummary = `${effectiveSummary} (${reviewOutputLogNoiseSummary})`;
      }
    }
    if (providerLinearWorkerStage) {
      let providerLinearWorkerProof = await loadProviderLinearWorkerProof(
        join(paths.runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME)
      );
      let providerLinearWorkerProofRecord = providerLinearWorkerProof as Record<string, unknown> | null;
      if (
        providerLinearWorkerProofRecord &&
        !isProviderLinearWorkerProofFreshForStage(providerLinearWorkerProofRecord, entry.started_at ?? null)
      ) {
        providerLinearWorkerProof = null;
        providerLinearWorkerProofRecord = null;
      }
      manifest.provider_linear_worker_tokens =
        buildProviderLinearWorkerManifestTokenUsage(providerLinearWorkerProof?.tokens) ?? null;
      const providerLinearWorkerGoalEvidence =
        buildProviderLinearWorkerManifestGoalEvidence(providerLinearWorkerProof) ?? null;
      manifest.goal_evidence = providerLinearWorkerGoalEvidence;
      if (providerLinearWorkerGoalEvidence === null) {
        markManifestGoalEvidenceExplicitClear(manifest);
      }
      if (result.status === 'succeeded' && providerLinearWorkerProofRecord === null) {
        providerLinearWorkerFailureReason = 'provider_linear_worker_proof_missing_or_unreadable';
        effectiveSummary = buildProviderLinearWorkerTerminalSummary({
          status: 'failed',
          endReason: 'provider_linear_worker_proof_missing_or_unreadable',
          reviewOutputLogNoiseSummary
        });
        forceProviderLinearWorkerFailure = true;
      }
      const proofTerminalStatus = resolveProviderLinearWorkerTerminalStatus(providerLinearWorkerProofRecord);
      const proofTerminalReason = resolveProviderLinearWorkerTerminalReason(providerLinearWorkerProofRecord);
      providerLinearWorkerTerminalStatus = proofTerminalStatus;
      providerLinearWorkerTerminalReason = proofTerminalReason;
      const proofAttemptStartedAt =
        resolveProviderLinearWorkerAttemptStartedAt(providerLinearWorkerProofRecord) ?? entry.started_at ?? null;
      const requiresProviderReviewSemanticVerdict =
        proofTerminalStatus === 'succeeded' &&
        proofTerminalReason === 'issue_review_handoff' &&
        result.status === 'succeeded';
      if (
        requiresProviderReviewSemanticVerdict &&
        providerReviewTelemetry !== null &&
        verifyReviewTelemetryFreshness({
          env,
          paths,
          startedAt: proofAttemptStartedAt,
          telemetry: providerReviewTelemetry,
          telemetryPath: providerReviewTelemetrySource?.telemetryPath ?? reviewTelemetryPath,
          expectedOutputLogPath: providerReviewTelemetrySource?.expectedOutputLogPath
        }) !== null
      ) {
        providerReviewTelemetry = null;
        providerReviewTelemetrySource = null;
        reviewOutputLogNoiseSummary = null;
      }
      if (requiresProviderReviewSemanticVerdict && providerReviewTelemetry === null) {
        const awaitedReviewTelemetry = await waitForFreshReviewTelemetryEvidence(reviewTelemetryPath, {
          isFresh: (telemetry) =>
            verifyReviewTelemetryFreshness({
              env,
              paths,
              startedAt: proofAttemptStartedAt,
              telemetry,
              telemetryPath: reviewTelemetryPath
            }) === null
        });
        if (awaitedReviewTelemetry) {
          providerReviewTelemetry = awaitedReviewTelemetry;
          providerReviewTelemetrySource = buildTopLevelReviewTelemetryEvidenceSource({
            env,
            paths,
            telemetryPath: reviewTelemetryPath
          });
          reviewOutputLogNoiseSummary = await formatReviewOutputLogNoiseSummary({
            paths,
            telemetry: providerReviewTelemetry,
            outputLogPath: providerReviewTelemetrySource.outputLogPath
          });
        }
      }
      if (requiresProviderReviewSemanticVerdict && providerReviewTelemetry === null) {
        const nestedReviewEvidence = await loadProviderLinearWorkerNestedReviewTelemetryEvidence({
          env,
          paths,
          proof: providerLinearWorkerProofRecord,
          proofAttemptStartedAt
        });
        if (nestedReviewEvidence) {
          providerReviewTelemetry = nestedReviewEvidence.telemetry;
          providerReviewTelemetrySource = nestedReviewEvidence;
          reviewOutputLogNoiseSummary = await formatReviewOutputLogNoiseSummary({
            paths,
            telemetry: providerReviewTelemetry,
            outputLogPath: nestedReviewEvidence.outputLogPath
          });
        }
      }
      const reviewTelemetryStatus = coerceTelemetryStatusValue(providerReviewTelemetry?.status);
      const requiresGovernedContract = requiresGovernedReviewContract(execEnv);
      let reviewOutcomeSummary = appendReviewContractRequirementSummary(
        formatReviewTelemetryOutcomeSummary(providerReviewTelemetry),
        providerReviewTelemetry,
        requiresGovernedContract
      );
      const reviewEvidenceSourceSummary = formatReviewTelemetryEvidenceSourceSummary(
        providerReviewTelemetrySource,
        env
      );
      if (reviewEvidenceSourceSummary) {
        reviewOutcomeSummary = appendReviewOutcomeSummaryDetail(
          reviewOutcomeSummary,
          reviewEvidenceSourceSummary
        );
      }
      const reviewSemanticVerdict = providerReviewTelemetry
        ? resolveReviewSemanticVerdict(providerReviewTelemetry, {
            requireContract: requiresGovernedContract
          })
        : requiresProviderReviewSemanticVerdict
          ? 'unknown'
          : null;
      const governedReviewHandoffFailureReason =
        requiresProviderReviewSemanticVerdict && requiresGovernedContract
          ? resolveGovernedReviewHandoffFailureReason(
              providerReviewTelemetry,
              providerReviewTelemetrySource ?? buildTopLevelReviewTelemetryEvidenceSource({ env, paths, telemetryPath: reviewTelemetryPath })
            )
          : null;
      providerLinearWorkerReviewOutcomeSummary = reviewOutcomeSummary;
      const mutationSuppressions = deriveDeterministicProviderMutationSuppressions(
        providerLinearWorkerProof?.linear_audit ?? null,
        {
          recordedAtNotBefore: proofAttemptStartedAt,
          issueId: providerLinearWorkerProof?.issue_id ?? null
        }
      );
      const degradationSummary = formatDeterministicProviderMutationDegradationSummary(mutationSuppressions);

      if (proofTerminalStatus === 'failed') {
        providerLinearWorkerFailureReason = 'provider_linear_worker_terminal_failed';
        effectiveSummary = buildProviderLinearWorkerTerminalSummary({
          status: 'failed',
          endReason: proofTerminalReason,
          reviewOutcomeSummary,
          reviewOutputLogNoiseSummary,
          degradationSummary
        });
        forceProviderLinearWorkerFailure = true;
      } else if (providerLinearWorkerFailureReason === null && reviewTelemetryStatus === 'failed') {
        providerLinearWorkerFailureReason = 'provider_linear_worker_review_failed';
        effectiveSummary = buildProviderLinearWorkerTerminalSummary({
          status: 'failed',
          endReason: null,
          reviewOutcomeSummary: reviewOutcomeSummary ?? 'review telemetry reported terminal failure',
          reviewOutputLogNoiseSummary,
          degradationSummary
        });
        forceProviderLinearWorkerFailure = true;
      } else if (providerLinearWorkerFailureReason === null && governedReviewHandoffFailureReason) {
        const governedReviewOutcomeSummary = appendReviewOutcomeSummaryDetail(
          reviewOutcomeSummary,
          `governed review handoff failed: ${governedReviewHandoffFailureReason}`
        );
        providerLinearWorkerReviewOutcomeSummary = governedReviewOutcomeSummary;
        providerLinearWorkerFailureReason = 'provider_linear_worker_review_not_clean';
        effectiveSummary = buildProviderLinearWorkerTerminalSummary({
          status: 'failed',
          endReason: 'governed_review_handoff_not_clean',
          reviewOutcomeSummary: governedReviewOutcomeSummary,
          reviewOutputLogNoiseSummary,
          degradationSummary
        });
        forceProviderLinearWorkerFailure = true;
      } else if (
        providerLinearWorkerFailureReason === null &&
        requiresProviderReviewSemanticVerdict &&
        reviewSemanticVerdict === 'findings'
      ) {
        providerLinearWorkerFailureReason = 'provider_linear_worker_review_findings';
        effectiveSummary = buildProviderLinearWorkerTerminalSummary({
          status: 'failed',
          endReason: 'review_findings_detected',
          reviewOutcomeSummary: reviewOutcomeSummary ?? 'semantic review verdict: findings',
          reviewOutputLogNoiseSummary,
          degradationSummary
        });
        forceProviderLinearWorkerFailure = true;
      } else if (
        providerLinearWorkerFailureReason === null &&
        requiresProviderReviewSemanticVerdict &&
        reviewSemanticVerdict === 'unknown'
      ) {
        const unknownReviewOutcomeSummary = appendReviewOutcomeSummaryDetail(
          reviewOutcomeSummary ?? 'semantic review verdict: unknown',
          `expected review telemetry path: ${providerReviewTelemetryExpectedPath ?? reviewTelemetryPath}`
        );
        providerLinearWorkerReviewOutcomeSummary = unknownReviewOutcomeSummary;
        providerLinearWorkerFailureReason = 'provider_linear_worker_review_unknown';
        effectiveSummary = buildProviderLinearWorkerTerminalSummary({
          status: 'failed',
          endReason: 'review_verdict_unknown',
          reviewOutcomeSummary: unknownReviewOutcomeSummary,
          reviewOutputLogNoiseSummary,
          degradationSummary
        });
        forceProviderLinearWorkerFailure = true;
      } else if (proofTerminalStatus === 'succeeded' && result.status === 'succeeded') {
        effectiveSummary = buildProviderLinearWorkerTerminalSummary({
          status: 'succeeded',
          endReason: proofTerminalReason,
          reviewOutcomeSummary,
          reviewOutputLogNoiseSummary,
          degradationSummary
        });
      } else if (degradationSummary) {
        effectiveSummary = `${effectiveSummary} (${degradationSummary})`;
      }
    }
    const effectiveExitCode =
      (forceReviewEvidenceFailure || forceProviderLinearWorkerFailure) && normalizedExitCode === 0
        ? 1
        : normalizedExitCode;

    entry.completed_at = isoTimestamp();
    entry.exit_code = effectiveExitCode;
    entry.summary = effectiveSummary;
    entry.status = forceReviewEvidenceFailure || forceProviderLinearWorkerFailure
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
      const proofLockSecondaryDiagnostics =
        providerLinearWorkerStage && providerLinearWorkerTerminalReason
          ? extractSecondaryProviderProofLockDiagnostics(stderrText)
          : null;
      const errorDetails: Record<string, unknown> = {
        exit_code: effectiveExitCode,
        sandbox_state: result.sandboxState,
        stderr: proofLockSecondaryDiagnostics?.primaryStderr ?? stderrText,
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
      if (providerLinearWorkerTerminalStatus) {
        errorDetails.provider_linear_worker_terminal_status = providerLinearWorkerTerminalStatus;
      }
      if (providerLinearWorkerTerminalReason) {
        errorDetails.provider_linear_worker_end_reason = providerLinearWorkerTerminalReason;
      }
      if (providerLinearWorkerReviewOutcomeSummary) {
        errorDetails.review_outcome_summary = providerLinearWorkerReviewOutcomeSummary;
      }
      if (providerReviewTelemetryExpectedPath) {
        errorDetails.review_telemetry_path = providerReviewTelemetrySource
          ? relativeToRepo(env, providerReviewTelemetrySource.telemetryPath)
          : providerReviewTelemetryExpectedPath;
      }
      if (proofLockSecondaryDiagnostics) {
        errorDetails.secondary_diagnostics = {
          provider_linear_worker_proof_lock: {
            disposition: 'deduped_secondary',
            count: proofLockSecondaryDiagnostics.count,
            samples: proofLockSecondaryDiagnostics.samples
          }
        };
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

    if (forceProviderLinearWorkerFailure && result.status === 'succeeded' && !entry.error_file) {
      const errorDetails: Record<string, unknown> = {
        exit_code: effectiveExitCode,
        command_exit_code: normalizedExitCode,
        sandbox_state: result.sandboxState,
        failure_reason: providerLinearWorkerFailureReason ?? 'provider_linear_worker_authoritative_failure',
        detail: effectiveSummary
      };
      if (providerLinearWorkerTerminalStatus) {
        errorDetails.provider_linear_worker_terminal_status = providerLinearWorkerTerminalStatus;
      }
      if (providerLinearWorkerTerminalReason) {
        errorDetails.provider_linear_worker_end_reason = providerLinearWorkerTerminalReason;
      }
      if (providerLinearWorkerReviewOutcomeSummary) {
        errorDetails.review_outcome_summary = providerLinearWorkerReviewOutcomeSummary;
      }
      if (providerReviewTelemetryExpectedPath) {
        errorDetails.review_telemetry_path = providerReviewTelemetrySource
          ? relativeToRepo(env, providerReviewTelemetrySource.telemetryPath)
          : providerReviewTelemetryExpectedPath;
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
        'provider-linear-worker-authoritative-failed',
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

function shouldAwaitReviewTelemetryEvidence(
  execEnv: NodeJS.ProcessEnv,
  enforceReviewEvidenceConsistency: boolean
): boolean {
  if (enforceReviewEvidenceConsistency) {
    return true;
  }
  const forced = parseBooleanEnvFlag(execEnv.FORCE_CODEX_REVIEW);
  const nonInteractive =
    process.stdin.isTTY !== true ||
    parseBooleanEnvFlag(execEnv.CODEX_REVIEW_NON_INTERACTIVE) ||
    parseBooleanEnvFlag(execEnv.CODEX_NON_INTERACTIVE) ||
    parseBooleanEnvFlag(execEnv.CODEX_NO_INTERACTIVE);
  return forced || !nonInteractive;
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

function isProviderLinearWorkerCommandStage(stage: CommandStage): boolean {
  const stageId = stage.id.trim().toLowerCase();
  if (stageId === 'provider-linear-worker') {
    return true;
  }
  const haystack = `${stage.title} ${stage.command}`.toLowerCase();
  return haystack.includes('providerlinearworkerrunner');
}

function resolveStageInvocation(
  stage: CommandStage,
  env: NodeJS.ProcessEnv
): ResolvedStageInvocation {
  if (isProviderLinearWorkerCommandStage(stage)) {
    const providerWorkerPackageRoot =
      normalizeOptionalString(env.CODEX_ORCHESTRATOR_PACKAGE_ROOT) ?? PACKAGE_ROOT;
    const invocation = resolveProviderLinearWorkerProgramInvocation({
      allowConfiguredForeignPackageRoot: true,
      env,
      execPath: normalizeOptionalString(env.CODEX_ORCHESTRATOR_NODE_BIN) ?? process.execPath,
      packageRoot: providerWorkerPackageRoot
    });
    return {
      command: invocation.command,
      args: invocation.args,
      preview: buildCommandPreview(invocation.command, invocation.args),
      warning: invocation.warning,
      envOverrides: invocation.envOverrides
    };
  }
  const packageRootInvocation = resolvePackageRootDistStageInvocation(stage.command, env);
  if (packageRootInvocation) {
    return packageRootInvocation;
  }
  return {
    command: stage.command,
    preview: stage.command
  };
}

function resolvePackageRootDistStageInvocation(
  commandLine: string,
  env: NodeJS.ProcessEnv
): ResolvedStageInvocation | null {
  const match = commandLine.match(
    /^\s*node\s+["']?\$CODEX_ORCHESTRATOR_PACKAGE_ROOT\/dist\/([^"'\s]+?\.js)["']?(.*)$/u
  );
  if (!match) {
    return null;
  }
  const [, distRelativePath, trailingArgsRaw] = match;
  const invocation = resolvePackageProgramInvocation({
    allowConfiguredForeignPackageRoot: true,
    env,
    packageRoot: PACKAGE_ROOT,
    execPath: normalizeOptionalString(env.CODEX_ORCHESTRATOR_NODE_BIN) ?? process.execPath,
    distRelativePath
  });
  const command = `${buildCommandPreview(invocation.command, invocation.args)}${trailingArgsRaw}`;
  return {
    command,
    preview: command,
    warning: invocation.warning,
    envOverrides: invocation.envOverrides
  };
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
  telemetry?: ReviewTelemetryEvidencePayload | null;
  telemetryPreloaded?: boolean;
  telemetryPath?: string;
}): Promise<ReviewEvidenceMismatch | null> {
  const telemetryPath = options.telemetryPath ?? join(options.paths.runDir, 'review', 'telemetry.json');
  const telemetry =
    options.telemetryPreloaded === true
      ? options.telemetry ?? null
      : options.telemetry ?? (await waitForReviewTelemetryEvidence(telemetryPath));
  if (!telemetry) {
    return {
      message: 'review telemetry is missing, unreadable, or incomplete at terminal stage closeout.',
      telemetryPath,
      telemetryStatus: null,
      telemetryGeneratedAt: null,
      telemetryOutputLogPath: null
    };
  }

  const freshnessMismatch = verifyReviewTelemetryFreshness({
    env: options.env,
    paths: options.paths,
    startedAt: options.startedAt,
    telemetry,
    telemetryPath
  });
  if (freshnessMismatch) {
    return freshnessMismatch;
  }

  const generatedAt = coerceTelemetryString(telemetry.generated_at);
  const telemetryStatus = coerceTelemetryString(telemetry.status);
  const telemetryOutputLogPath = coerceTelemetryString(telemetry.output_log_path);
  if (telemetryStatus !== options.expectedStatus) {
    return {
      message: `review telemetry status ${telemetryStatus ?? '<missing>'} does not match terminal stage result ${options.expectedStatus}.`,
      telemetryPath,
      telemetryStatus,
      telemetryGeneratedAt: generatedAt,
      telemetryOutputLogPath
    };
  }

  return null;
}

function verifyReviewTelemetryFreshness(options: {
  env: EnvironmentPaths;
  paths: RunPaths;
  startedAt: string | null | undefined;
  telemetry: ReviewTelemetryEvidencePayload;
  telemetryPath: string;
  expectedOutputLogPath?: string;
}): ReviewEvidenceMismatch | null {
  const { env, paths, startedAt, telemetry, telemetryPath } = options;
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

  const startedAtMs = typeof startedAt === 'string' ? Date.parse(startedAt) : Number.NaN;
  if (Number.isFinite(startedAtMs) && generatedAtMs < startedAtMs) {
    return {
      message: `review telemetry is stale (generated_at ${generatedAt} precedes stage start ${startedAt}).`,
      telemetryPath,
      telemetryStatus: coerceTelemetryString(telemetry.status),
      telemetryGeneratedAt: generatedAt,
      telemetryOutputLogPath: coerceTelemetryString(telemetry.output_log_path)
    };
  }

  const expectedOutputLogPath =
    options.expectedOutputLogPath ??
    relativeToRepo(
      env,
      join(paths.runDir, 'review', 'output.log')
    );
  const telemetryStatus = coerceTelemetryString(telemetry.status);
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

async function loadReviewTelemetryEvidence(
  telemetryPath: string,
  options: { waitForEvidence: boolean }
): Promise<ReviewTelemetryEvidencePayload | null> {
  if (options.waitForEvidence) {
    return await waitForReviewTelemetryEvidence(telemetryPath);
  }
  return await readReviewTelemetryEvidence(telemetryPath);
}

async function waitForReviewTelemetryEvidence(
  telemetryPath: string
): Promise<ReviewTelemetryEvidencePayload | null> {
  return await waitForFreshReviewTelemetryEvidence(telemetryPath, {
    isFresh: () => true
  });
}

async function waitForFreshReviewTelemetryEvidence(
  telemetryPath: string,
  options: {
    isFresh: (telemetry: ReviewTelemetryEvidencePayload) => boolean;
  }
): Promise<ReviewTelemetryEvidencePayload | null> {
  const deadline = Date.now() + REVIEW_TELEMETRY_WAIT_TIMEOUT_MS;
  for (;;) {
    const telemetry = await readReviewTelemetryEvidence(telemetryPath);
    if (telemetry && options.isFresh(telemetry)) {
      return telemetry;
    }
    if (Date.now() >= deadline) {
      return null;
    }
    await delay(REVIEW_TELEMETRY_POLL_INTERVAL_MS);
  }
}

async function readReviewTelemetryEvidence(
  telemetryPath: string
): Promise<ReviewTelemetryEvidencePayload | null> {
  try {
    const raw = await readFile(telemetryPath, 'utf8');
    const parsed = JSON.parse(raw) as ReviewTelemetryEvidencePayload | null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readDirectoryNames(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function loadProviderLinearWorkerNestedReviewTelemetryEvidence(options: {
  env: EnvironmentPaths;
  paths: RunPaths;
  proof: Record<string, unknown> | null;
  proofAttemptStartedAt: string | null;
}): Promise<ProviderReviewTelemetryEvidence | null> {
  const workspacePath = coerceTelemetryString(options.proof?.workspace_path);
  const issueId = coerceTelemetryString(options.proof?.issue_id);
  if (!workspacePath || !isAbsolute(workspacePath) || !issueId) {
    return null;
  }
  const issueIdentifier = coerceTelemetryString(options.proof?.issue_identifier);
  const parentRunId = basename(options.paths.runDir);
  const runsRoots = resolveProviderLinearWorkerNestedReviewRunsRoots(options.env);
  const runCandidates = new Map<string, ProviderNestedReviewRunCandidate>();
  for (const candidate of collectProviderLinearWorkerProofNestedReviewRunCandidates(options.proof, {
    issueId,
    issueIdentifier,
    workspacePath
  })) {
    if (!runsRoots.some((runsRoot) => isPathWithin(runsRoot, candidate.runDir))) {
      continue;
    }
    runCandidates.set(resolve(candidate.runDir), candidate);
  }
  for (const runsRoot of runsRoots) {
    const taskEntries = await resolveProviderLinearWorkerNestedReviewTaskEntries(runsRoot, issueId);
    for (const taskEntry of taskEntries) {
      const cliRoot = join(runsRoot, taskEntry, 'cli');
      for (const runEntry of await readDirectoryNames(cliRoot)) {
        const runDir = join(cliRoot, runEntry);
        const key = resolve(runDir);
        if (!runCandidates.has(key)) {
          runCandidates.set(key, {
            repoRoot: workspacePath,
            runDir,
            taskEntry,
            runEntry,
            proofLinked: false
          });
        }
      }
    }
  }
  const candidates: ProviderReviewTelemetryEvidence[] = [];

  for (const candidate of runCandidates.values()) {
    const manifest = await readJsonFile<Record<string, unknown>>(join(candidate.runDir, 'manifest.json'));
    if (
      !manifest ||
      !isProviderLinearWorkerNestedReviewManifest(manifest, {
        issueId,
        issueIdentifier,
        parentRunId,
        proofLinked: candidate.proofLinked
      })
    ) {
      continue;
    }
    const telemetryPath = join(candidate.runDir, 'review', 'telemetry.json');
    const telemetry = await readReviewTelemetryEvidence(telemetryPath);
    if (!telemetry) {
      continue;
    }
    const evidenceSource = buildNestedReviewTelemetryEvidenceSource({
      repoRoot: candidate.repoRoot,
      taskEntry: candidate.taskEntry,
      runEntry: candidate.runEntry,
      runDir: candidate.runDir,
      telemetryPath
    });
    const freshnessMismatch = verifyReviewTelemetryFreshness({
      env: options.env,
      paths: options.paths,
      startedAt: options.proofAttemptStartedAt,
      telemetry,
      telemetryPath,
      expectedOutputLogPath: evidenceSource.expectedOutputLogPath
    });
    if (freshnessMismatch) {
      continue;
    }
    candidates.push({
      ...evidenceSource,
      telemetry,
      generatedAt: coerceTelemetryString(telemetry.generated_at),
      manifestCompletedAt:
        coerceTelemetryString(manifest.completed_at) ??
        coerceTelemetryString(manifest.updated_at) ??
        coerceTelemetryString(manifest.started_at)
    });
  }

  return candidates.sort(compareProviderReviewTelemetryEvidenceDesc)[0] ?? null;
}

function resolveProviderLinearWorkerNestedReviewRunsRoots(env: EnvironmentPaths): string[] {
  return [resolve(env.runsRoot)];
}

function collectProviderLinearWorkerProofNestedReviewRunCandidates(
  proof: Record<string, unknown> | null,
  identity: { issueId: string; issueIdentifier: string | null; workspacePath: string }
): ProviderNestedReviewRunCandidate[] {
  const childStreams = Array.isArray(proof?.child_streams) ? proof.child_streams : [];
  const candidates: ProviderNestedReviewRunCandidate[] = [];
  for (const rawChildStream of childStreams) {
    const childStream = coerceTelemetryRecord(rawChildStream);
    if (!childStream || !isProviderLinearWorkerNestedReviewChildStream(childStream, identity)) {
      continue;
    }
    const runDir = resolveProviderLinearWorkerNestedReviewChildStreamRunDir(
      childStream,
      identity.workspacePath
    );
    if (!runDir) {
      continue;
    }
    candidates.push({
      repoRoot: identity.workspacePath,
      runDir,
      taskEntry: coerceTelemetryString(childStream.task_id) ?? basename(dirname(dirname(runDir))),
      runEntry: coerceTelemetryString(childStream.run_id) ?? basename(runDir),
      proofLinked: true
    });
  }
  return candidates;
}

function isProviderLinearWorkerNestedReviewChildStream(
  childStream: Record<string, unknown>,
  identity: { issueId: string; issueIdentifier: string | null }
): boolean {
  if (coerceTelemetryString(childStream.pipeline_id) !== 'implementation-gate') {
    return false;
  }
  if (coerceTelemetryString(childStream.status) !== 'succeeded') {
    return false;
  }
  if (coerceTelemetryString(childStream.issue_id) !== identity.issueId) {
    return false;
  }
  if (
    identity.issueIdentifier &&
    coerceTelemetryString(childStream.issue_identifier) !== identity.issueIdentifier
  ) {
    return false;
  }
  return true;
}

function resolveProviderLinearWorkerNestedReviewChildStreamRunDir(
  childStream: Record<string, unknown>,
  workspacePath: string
): string | null {
  const manifestPath = resolveProviderLinearWorkerNestedReviewChildStreamPath(
    coerceTelemetryString(childStream.manifest_path),
    workspacePath
  );
  if (manifestPath) {
    return dirname(manifestPath);
  }
  return resolveProviderLinearWorkerNestedReviewChildStreamPath(
    coerceTelemetryString(childStream.artifact_root),
    workspacePath
  );
}

function resolveProviderLinearWorkerNestedReviewChildStreamPath(
  value: string | null,
  workspacePath: string
): string | null {
  if (!value) {
    return null;
  }
  return isAbsolute(value) ? resolve(value) : resolve(workspacePath, value);
}

async function resolveProviderLinearWorkerNestedReviewTaskEntries(
  runsRoot: string,
  issueId: string
): Promise<string[]> {
  const exactTaskEntry = `linear-${issueId}`;
  const preferredEntries = new Set<string>([exactTaskEntry]);
  const entries = await readDirectoryNames(runsRoot);
  for (const entry of entries) {
    if (entry === exactTaskEntry || entry.includes(issueId)) {
      preferredEntries.add(entry);
    }
  }
  return [...preferredEntries].filter((entry) => entries.includes(entry));
}

function isProviderLinearWorkerNestedReviewManifest(
  manifest: Record<string, unknown>,
  identity: { issueId: string; issueIdentifier: string | null; parentRunId: string; proofLinked: boolean }
): boolean {
  const pipelineId = coerceTelemetryString(manifest.pipeline_id) ?? coerceTelemetryString(manifest.pipelineId);
  if (pipelineId !== 'implementation-gate') {
    return false;
  }
  const status = coerceTelemetryString(manifest.status);
  if (status !== 'succeeded') {
    return false;
  }
  const manifestIssueId = coerceTelemetryString(manifest.issue_id) ?? coerceTelemetryString(manifest.issueId);
  if (manifestIssueId && manifestIssueId !== identity.issueId) {
    return false;
  }
  const manifestIssueIdentifier =
    coerceTelemetryString(manifest.issue_identifier) ?? coerceTelemetryString(manifest.issueIdentifier);
  if (
    identity.issueIdentifier &&
    manifestIssueIdentifier &&
    manifestIssueIdentifier !== identity.issueIdentifier
  ) {
    return false;
  }
  const manifestIssueMatches = Boolean(
    manifestIssueId === identity.issueId ||
      (identity.issueIdentifier && manifestIssueIdentifier === identity.issueIdentifier)
  );
  const manifestParentRunId =
    coerceTelemetryString(manifest.parent_run_id) ?? coerceTelemetryString(manifest.parentRunId);
  const manifestLineageMatches = manifestParentRunId === identity.parentRunId;
  return manifestIssueMatches && (identity.proofLinked || manifestLineageMatches);
}

function buildTopLevelReviewTelemetryEvidenceSource(options: {
  env: EnvironmentPaths;
  paths: RunPaths;
  telemetryPath: string;
}): ReviewTelemetryEvidenceSource {
  const outputLogPath = join(options.paths.runDir, 'review', 'output.log');
  return {
    label: 'parent provider run',
    repoRoot: options.env.repoRoot,
    runDir: options.paths.runDir,
    telemetryPath: options.telemetryPath,
    outputLogPath,
    expectedOutputLogPath: relativeToRepo(options.env, outputLogPath),
    topLevel: true
  };
}

function buildNestedReviewTelemetryEvidenceSource(options: {
  repoRoot: string;
  taskEntry: string;
  runEntry: string;
  runDir: string;
  telemetryPath: string;
}): ReviewTelemetryEvidenceSource {
  const outputLogPath = join(options.runDir, 'review', 'output.log');
  return {
    label: `nested implementation-gate ${options.taskEntry}/${options.runEntry}`,
    repoRoot: options.repoRoot,
    runDir: options.runDir,
    telemetryPath: options.telemetryPath,
    outputLogPath,
    expectedOutputLogPath: relative(options.repoRoot, outputLogPath),
    topLevel: false
  };
}

function compareProviderReviewTelemetryEvidenceDesc(
  left: ProviderReviewTelemetryEvidence,
  right: ProviderReviewTelemetryEvidence
): number {
  const recency = compareOptionalIsoTimestampDesc(
    left.generatedAt ?? left.manifestCompletedAt,
    right.generatedAt ?? right.manifestCompletedAt
  );
  if (recency !== 0) {
    return recency;
  }
  return right.runDir.localeCompare(left.runDir);
}

function compareOptionalIsoTimestampDesc(left: string | null | undefined, right: string | null | undefined): number {
  const leftMs = typeof left === 'string' ? Date.parse(left) : Number.NaN;
  const rightMs = typeof right === 'string' ? Date.parse(right) : Number.NaN;
  if (Number.isFinite(leftMs) && Number.isFinite(rightMs)) {
    return rightMs - leftMs;
  }
  if (Number.isFinite(leftMs)) {
    return -1;
  }
  if (Number.isFinite(rightMs)) {
    return 1;
  }
  return 0;
}

async function loadProviderLinearWorkerProof(
  proofPath: string
): Promise<ProviderLinearWorkerProof | null> {
  try {
    const raw = await readFile(proofPath, 'utf8');
    const parsed = JSON.parse(raw) as ProviderLinearWorkerProof | null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildProviderLinearWorkerManifestTokenUsage(
  tokens: ProviderLinearWorkerProof['tokens'] | null | undefined
): NonNullable<CliManifest['provider_linear_worker_tokens']> | null {
  if (!tokens || typeof tokens !== 'object') {
    return null;
  }
  const inputTokens = normalizeManifestTokenCount(tokens.input_tokens);
  const outputTokens = normalizeManifestTokenCount(tokens.output_tokens);
  const totalTokens = normalizeManifestTokenCount(tokens.total_tokens);
  const reasoningOutputTokens = normalizeManifestTokenCount(tokens.reasoning_output_tokens);
  if (
    inputTokens === null &&
    outputTokens === null &&
    totalTokens === null &&
    reasoningOutputTokens === null
  ) {
    return null;
  }
  const usage: NonNullable<CliManifest['provider_linear_worker_tokens']> = {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens
  };
  if (reasoningOutputTokens !== null) {
    usage.reasoning_output_tokens = reasoningOutputTokens;
  }
  return usage;
}

function buildProviderLinearWorkerManifestGoalEvidence(
  proof: ProviderLinearWorkerProof | null | undefined
): NonNullable<CliManifest['goal_evidence']> | null {
  const goalEvidence = proof?.goal_evidence;
  if (!goalEvidence || typeof goalEvidence !== 'object') {
    return null;
  }
  if (goalEvidence.authority !== 'advisory_only' || goalEvidence.linear_authority_preserved !== true) {
    return null;
  }
  const notAuthorizedFor = Array.isArray(goalEvidence.not_authorized_for)
    ? goalEvidence.not_authorized_for
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item): item is string => item.length > 0)
    : [];
  const notAuthorizedForSet = new Set(notAuthorizedFor);
  const hasCanonicalDenialSet = PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR.every((item) =>
    notAuthorizedForSet.has(item)
  );
  if (
    !hasCanonicalDenialSet ||
    notAuthorizedFor.length !== PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR.length ||
    notAuthorizedForSet.size !== PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR.length
  ) {
    return null;
  }
  const goalEvidenceValue = normalizeProviderLinearGoalEvidenceValue(goalEvidence);
  if (goalEvidenceValue === null) {
    return null;
  }
  const normalizedGoalEvidence = normalizeProviderLinearGoalEvidenceForProof({
    candidate: null,
    previous: goalEvidenceValue,
    proofThreadId: proof?.thread_id ?? null,
    proofTurnId: proof?.latest_turn_id ?? null,
    observedAt: isoTimestamp(),
    currentTurnStartedAt: proof?.current_turn_started_at ?? proof?.attempt_started_at ?? null,
    featureEnabled: null,
    runtimeMode: proof?.runtime?.selected_mode ?? null
  });
  if (normalizedGoalEvidence === null) {
    return null;
  }
  return {
    ...normalizedGoalEvidence,
    authority: 'advisory_only',
    linear_authority_preserved: true,
    not_authorized_for: [...PROVIDER_LINEAR_GOAL_EVIDENCE_NOT_AUTHORIZED_FOR]
  };
}

function normalizeManifestTokenCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : null;
}

function coerceTelemetryString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceTelemetryRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function coerceTelemetryStatusValue(value: unknown): 'succeeded' | 'failed' | null {
  if (value === 'succeeded' || value === 'failed') {
    return value;
  }
  return null;
}

function hasNullTelemetryError(telemetry: ReviewTelemetryEvidencePayload | null): boolean {
  return telemetry?.error === null;
}

function coerceReviewOutcomeDisposition(value: unknown): ReviewOutcomeDisposition | null {
  switch (value) {
    case 'clean-success':
    case 'bounded-success':
    case 'failed-boundary':
    case 'failed-other':
      return value;
    default:
      return null;
  }
}

function hasTelemetryTerminationBoundary(
  telemetry: ReviewTelemetryEvidencePayload | null
): boolean {
  return coerceTelemetryTerminationBoundaryKind(telemetry) !== null;
}

function coerceTelemetryTerminationBoundaryKind(
  telemetry: ReviewTelemetryEvidencePayload | null
): string | null {
  if (!telemetry) {
    return null;
  }
  const boundary = telemetry.termination_boundary;
  if (boundary === null || typeof boundary !== 'object' || Array.isArray(boundary)) {
    return null;
  }
  return coerceTelemetryString((boundary as Record<string, unknown>).kind);
}

function resolveReviewTelemetryOutcomeDisposition(
  telemetry: ReviewTelemetryEvidencePayload | null
): ReviewOutcomeDisposition | null {
  if (!telemetry) {
    return null;
  }
  const explicitDisposition = coerceReviewOutcomeDisposition(telemetry.review_outcome);
  const telemetryStatus = coerceTelemetryStatusValue(telemetry.status);
  if (!telemetryStatus) {
    return null;
  }
  const derivedDisposition = deriveReviewOutcomeDisposition({
    status: telemetryStatus,
    terminationBoundary: hasTelemetryTerminationBoundary(telemetry)
      ? REVIEW_OUTCOME_BOUNDARY_PRESENCE_SENTINEL
      : null
  });
  return explicitDisposition === derivedDisposition ? explicitDisposition : derivedDisposition;
}

function resolveStrictReviewTelemetryOutcomeDisposition(
  telemetry: ReviewTelemetryEvidencePayload | null
): ReviewOutcomeDisposition | null {
  if (!telemetry) {
    return null;
  }
  const explicitDisposition = coerceReviewOutcomeDisposition(telemetry.review_outcome);
  const telemetryStatus = coerceTelemetryStatusValue(telemetry.status);
  if (!explicitDisposition || !telemetryStatus) {
    return null;
  }
  const derivedDisposition = deriveReviewOutcomeDisposition({
    status: telemetryStatus,
    terminationBoundary: hasTelemetryTerminationBoundary(telemetry)
      ? REVIEW_OUTCOME_BOUNDARY_PRESENCE_SENTINEL
      : null
  });
  return explicitDisposition === derivedDisposition ? explicitDisposition : null;
}

function formatReviewTelemetryOutcomeSummary(
  telemetry: ReviewTelemetryEvidencePayload | null
): string | null {
  const disposition = resolveReviewTelemetryOutcomeDisposition(telemetry);
  if (!disposition) {
    return null;
  }
  const boundaryKind = coerceTelemetryTerminationBoundaryKind(telemetry);
  const outcomeSummary = (() => {
    switch (disposition) {
      case 'clean-success':
        return 'review outcome: clean success';
      case 'bounded-success':
        return boundaryKind
          ? `review outcome: bounded success via ${boundaryKind}; not a wrapper failure`
          : 'review outcome: bounded success with preserved termination boundary; not a wrapper failure';
      case 'failed-boundary':
        return boundaryKind
          ? `review outcome: review-wrapper failure via ${boundaryKind}`
          : 'review outcome: review-wrapper failure via explicit termination boundary';
      case 'failed-other':
        return 'review outcome: review command failed without termination-boundary classification; not an explicit wrapper-boundary failure';
    }
  })();
  const semanticSummary = formatReviewSemanticVerdictSummary({
    review_verdict: resolveReviewSemanticVerdict(telemetry),
    highest_finding_priority: coerceReviewFindingPriority(telemetry?.highest_finding_priority),
    finding_count: coerceTelemetryFindingCount(telemetry?.finding_count)
  });
  const contractSummary = formatReviewContractTelemetrySummary({
    contract_mode: coerceReviewContractMode(telemetry?.contract_mode),
    contract_validation: coerceReviewContractValidation(telemetry?.contract_validation),
    contract_overall_verdict: coerceReviewContractAxisVerdict(telemetry?.contract_overall_verdict)
  });
  const proposalSummary = formatReviewContractProposalSummary(telemetry);
  return [outcomeSummary, semanticSummary, contractSummary, proposalSummary].filter(Boolean).join('; ');
}

function resolveReviewSemanticVerdict(
  telemetry: ReviewTelemetryEvidencePayload | null,
  options: { requireContract?: boolean } = {}
): ReturnType<typeof coerceReviewSemanticVerdict> {
  if (!telemetry) {
    return null;
  }
  if (options.requireContract || coerceTelemetryString(telemetry.contract_mode) === 'enforce') {
    const validation = coerceReviewContractValidation(telemetry.contract_validation);
    const overall = coerceReviewContractAxisVerdict(telemetry.contract_overall_verdict);
    if (validation?.status !== 'valid') {
      return 'unknown';
    }
    if (overall === 'clean') {
      return 'clean';
    }
    if (overall === 'findings' || overall === 'blocked') {
      return 'findings';
    }
    return 'unknown';
  }
  return coerceReviewSemanticVerdict(telemetry.review_verdict) ?? 'unknown';
}

function requiresGovernedReviewContract(env: NodeJS.ProcessEnv): boolean {
  const configured = coerceTelemetryString(env.CODEX_REVIEW_CONTRACT_MODE)?.toLowerCase();
  if (configured) {
    return configured === 'enforce';
  }
  return envFlagEnabled(env.CODEX_REVIEW_AUTHORITATIVE_GATE);
}

function envFlagEnabled(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function coerceReviewContractMode(value: unknown): 'off' | 'shadow' | 'enforce' | null {
  return value === 'off' || value === 'shadow' || value === 'enforce' ? value : null;
}

function coerceReviewContractAxisVerdict(
  value: unknown
): 'clean' | 'findings' | 'blocked' | 'unknown' | null {
  return value === 'clean' || value === 'findings' || value === 'blocked' || value === 'unknown'
    ? value
    : null;
}

function coerceReviewContractValidation(value: unknown): {
  status: 'off' | 'missing' | 'invalid' | 'valid';
  errors: string[];
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const status = record.status;
  if (!(status === 'off' || status === 'missing' || status === 'invalid' || status === 'valid')) {
    return null;
  }
  const errors = Array.isArray(record.errors)
    ? record.errors.filter((entry): entry is string => typeof entry === 'string')
    : [];
  return { status, errors };
}

function formatReviewContractProposalSummary(
  telemetry: ReviewTelemetryEvidencePayload | null
): string | null {
  const counts = telemetry?.proposal_counts;
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    return null;
  }
  const record = counts as Record<string, unknown>;
  const codeChange = coerceTelemetryFindingCount(record.code_change) ?? 0;
  const agentLoop = coerceTelemetryFindingCount(record.agent_loop) ?? 0;
  if (codeChange === 0 && agentLoop === 0) {
    return null;
  }
  return `review contract proposals: code_change=${codeChange}, agent_loop=${agentLoop}`;
}

function appendReviewContractRequirementSummary(
  summary: string | null,
  telemetry: ReviewTelemetryEvidencePayload | null,
  required: boolean
): string | null {
  if (!required) {
    return summary;
  }
  if (!telemetry) {
    return [summary, 'review contract: required but telemetry is missing'].filter(Boolean).join('; ');
  }
  const validation = coerceReviewContractValidation(telemetry.contract_validation);
  if (validation) {
    return summary;
  }
  return [summary, 'review contract: required but missing'].filter(Boolean).join('; ');
}

function appendReviewOutcomeSummaryDetail(summary: string | null, detail: string): string {
  return [summary, detail].filter(Boolean).join('; ');
}

function formatReviewTelemetryEvidenceSourceSummary(
  source: ReviewTelemetryEvidenceSource | null,
  env: EnvironmentPaths
): string | null {
  if (!source || source.topLevel) {
    return null;
  }
  return `review evidence source: ${source.label} (${relativeToRepo(env, source.telemetryPath)})`;
}

function resolveGovernedReviewHandoffFailureReason(
  telemetry: ReviewTelemetryEvidencePayload | null,
  source: ReviewTelemetryEvidenceSource
): string | null {
  if (!telemetry) {
    return null;
  }
  const disposition = resolveStrictReviewTelemetryOutcomeDisposition(telemetry);
  if (!disposition) {
    return 'review outcome is missing or invalid';
  }
  if (disposition !== 'clean-success') {
    return `review outcome is ${disposition}`;
  }
  const validation = coerceReviewContractValidation(telemetry.contract_validation);
  const overall = coerceReviewContractAxisVerdict(telemetry.contract_overall_verdict);
  if (validation?.status !== 'valid' || overall !== 'clean') {
    return null;
  }
  const contractArtifactFailure = resolveGovernedReviewContractArtifactFailureReason(
    telemetry,
    source
  );
  if (contractArtifactFailure) {
    return contractArtifactFailure;
  }
  const launchContext = coerceTelemetryRecord(telemetry.launch_context);
  const launchFailure = resolveGovernedReviewLaunchContextFailureReason(launchContext);
  if (launchFailure) {
    return launchFailure;
  }
  const proposalCounts = coerceReviewContractProposalCounts(telemetry.proposal_counts);
  if ((proposalCounts?.agent_loop ?? 0) > 0) {
    return 'agent-loop proposals require routing before handoff';
  }
  return null;
}

function resolveGovernedReviewContractArtifactFailureReason(
  telemetry: ReviewTelemetryEvidencePayload,
  source: ReviewTelemetryEvidenceSource
): string | null {
  const contractPath = coerceTelemetryString(telemetry.contract_path);
  if (!contractPath) {
    return 'review contract path is missing';
  }
  const artifactPath = resolveReviewContractArtifactPath(contractPath, source);
  if (!artifactPath) {
    return `review contract path is ${contractPath}`;
  }
  try {
    const artifact = statSync(artifactPath);
    if (!artifact.isFile()) {
      return 'review contract artifact is not a file';
    }
  } catch {
    return 'review contract artifact is missing';
  }
  return null;
}

function resolveReviewContractArtifactPath(
  contractPath: string,
  source: ReviewTelemetryEvidenceSource
): string | null {
  const runDir = resolve(source.runDir);
  const artifactPath =
    contractPath === 'review/contract.json'
      ? resolve(runDir, contractPath)
      : isAbsolute(contractPath)
        ? resolve(contractPath)
        : resolve(source.repoRoot, contractPath);
  if (!isPathWithin(runDir, artifactPath)) {
    return null;
  }
  return artifactPath;
}

function isPathWithin(parent: string, child: string): boolean {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

function resolveGovernedReviewLaunchContextFailureReason(
  launchContext: Record<string, unknown> | null
): string | null {
  if (!launchContext) {
    return 'review launch context is missing';
  }
  const legacyFallbackAttempt = coerceTelemetryString(launchContext?.legacy_fallback_attempt);
  if (legacyFallbackAttempt) {
    return `review launch used legacy fallback ${legacyFallbackAttempt}`;
  }
  const transport = coerceTelemetryString(launchContext.transport);
  if (transport !== 'codex-exec-output-schema') {
    return `review launch transport is ${transport ?? 'missing'}`;
  }
  const promptDelivery = coerceTelemetryString(launchContext.prompt_delivery);
  if (promptDelivery !== 'stdin') {
    return `review prompt delivery is ${promptDelivery ?? 'missing'}`;
  }
  const contextTransport = coerceTelemetryString(launchContext.reviewer_visible_context_transport);
  if (contextTransport !== 'stdin-prompt') {
    return `reviewer-visible context transport is ${contextTransport ?? 'missing'}`;
  }
  if (!coerceTelemetryString(launchContext.output_schema_path)) {
    return 'review output schema path is missing';
  }
  if (!coerceTelemetryString(launchContext.output_last_message_path)) {
    return 'review output last-message path is missing';
  }
  return null;
}

function coerceReviewContractProposalCounts(value: unknown): {
  code_change: number;
  agent_loop: number;
} | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    code_change: coerceTelemetryFindingCount(record.code_change) ?? 0,
    agent_loop: coerceTelemetryFindingCount(record.agent_loop) ?? 0
  };
}

function coerceTelemetryFindingCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : null;
}

async function formatReviewOutputLogNoiseSummary(options: {
  paths: RunPaths;
  telemetry: ReviewTelemetryEvidencePayload | null;
  outputLogPath?: string;
}): Promise<string | null> {
  const explicitDisposition = coerceReviewOutcomeDisposition(options.telemetry?.review_outcome);
  if (explicitDisposition !== 'clean-success' && explicitDisposition !== 'bounded-success') {
    return null;
  }
  const disposition = resolveReviewTelemetryOutcomeDisposition(options.telemetry);
  if (disposition !== explicitDisposition) {
    return null;
  }
  if (!hasNullTelemetryError(options.telemetry)) {
    return null;
  }

  try {
    const outputLog = await readFile(options.outputLogPath ?? join(options.paths.runDir, 'review', 'output.log'), 'utf8');
    const observedCleanupNoise = outputLog
      .split(/\r?\n/u)
      .some((line) => REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_LINE_PATTERN.test(line));
    if (!observedCleanupNoise) {
      return null;
    }
  } catch {
    return null;
  }

  return REVIEW_ROLLOUT_ITEM_THREAD_NOT_FOUND_LOG_NOISE_SUMMARY;
}

function extractSecondaryProviderProofLockDiagnostics(stderr: string): {
  primaryStderr: string;
  count: number;
  samples: string[];
} | null {
  if (!stderr || !PROVIDER_LINEAR_WORKER_PROOF_LOCK_DIAGNOSTIC_PATTERN.test(stderr)) {
    return null;
  }
  const primaryLines: string[] = [];
  const diagnosticLines: string[] = [];
  for (const line of stderr.split(/\r?\n/u)) {
    if (PROVIDER_LINEAR_WORKER_PROOF_LOCK_DIAGNOSTIC_PATTERN.test(line)) {
      diagnosticLines.push(line.trim());
    } else {
      primaryLines.push(line);
    }
  }
  if (diagnosticLines.length === 0) {
    return null;
  }
  const primaryStderr = primaryLines.join('\n').trim();
  return {
    primaryStderr: primaryStderr.length > 0 ? primaryStderr : stderr,
    count: diagnosticLines.length,
    samples: [...new Set(diagnosticLines.filter(Boolean))].slice(0, 3)
  };
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
  if (stage.summaryHint) {
    return stage.summaryHint;
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
  const receiverThreadIdSlots = parseStringSlots(item.receiver_thread_ids);
  const receiverThreadIds = receiverThreadIdSlots.filter((entry): entry is string => entry !== null);
  const senderAgentPath = normalizeOptionalString(item.sender_agent_path);
  const receiverAgentPathSlots = parseStringSlots(item.receiver_agent_paths);
  const receiverAgentPaths = receiverAgentPathSlots.filter((entry): entry is string => entry !== null);
  const receiverAgents = parseCollabReceiverAgents(item.receiver_agents, {
    receiverThreadIdSlots,
    receiverAgentPathSlots
  });

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

function parseStringSlots(value: unknown): Array<string | null> {
  return Array.isArray(value) ? value.map((entry) => normalizeOptionalString(entry)) : [];
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCollabReceiverAgents(
  value: unknown,
  slots: {
    receiverThreadIdSlots?: Array<string | null>;
    receiverAgentPathSlots?: Array<string | null>;
  } = {}
): NonNullable<CollabToolCallRecord['receiver_agents']> | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const { receiverThreadIdSlots = [], receiverAgentPathSlots = [] } = slots;
  const parsed: NonNullable<CollabToolCallRecord['receiver_agents']> = [];
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const threadId = normalizeOptionalString(record.thread_id) ?? receiverThreadIdSlots[index] ?? null;
    const agentNickname = normalizeOptionalString(record.agent_nickname);
    const agentRole = normalizeOptionalString(record.agent_role);
    const agentPath = normalizeOptionalString(record.agent_path) ?? receiverAgentPathSlots[index] ?? null;
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
