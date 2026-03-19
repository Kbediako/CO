import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  createRuntimeCodexCommandContext,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext,
  type RuntimeMode
} from '../../orchestrator/src/cli/runtime/index.js';
import { runDoctor } from '../../orchestrator/src/cli/doctor.js';
import {
  formatDoctorIssueLogSummary,
  type DoctorIssueLogResult,
  writeDoctorIssueLog
} from '../../orchestrator/src/cli/doctorIssueLog.js';
import {
  ReviewExecutionState,
  type ReviewTerminationBoundaryRecord
} from './review-execution-state.js';
import {
  CodexReviewError,
  signalChildProcess
} from './review-execution-runtime.js';
import type { ReviewTelemetryPayload } from './review-execution-telemetry.js';

const REVIEW_COMMAND_CHECK_TIMEOUT_MS = 30_000;
const REVIEW_ARTIFACTS_DIRNAME = 'review';
const REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE = 'mcp_servers.delegation.enabled=false';
const REVIEW_PARTIAL_OUTPUT_HINT_BOUNDARY_KINDS = new Set(['timeout', 'stall', 'startup-loop']);

type ScopeFlagMode = 'commit' | 'base' | 'uncommitted';

export interface ReviewLaunchCliOptions {
  task?: string;
  runtimeMode?: RuntimeMode;
  base?: string;
  commit?: string;
  title?: string;
  uncommitted?: boolean;
  enableDelegationMcp?: boolean;
  disableDelegationMcp?: boolean;
}

interface ReviewArgsOptions {
  includeScopeFlags: boolean;
  disableDelegationMcp: boolean;
}

export interface ReviewArtifactPaths {
  reviewDir: string;
  promptPath: string;
  outputLogPath: string;
  telemetryPath: string;
}

interface ReviewFailureIssueLogOptions {
  enabled: boolean;
  error: unknown;
  taskFilter: string | null;
  manifestPath: string;
  outputLogPath: string;
  repoRoot: string;
}

interface ResolvedReviewCommand {
  command: string;
  args: string[];
}

interface ReviewRunResult {
  preview: string;
  state: ReviewExecutionState;
}

export interface ReviewLaunchAttemptShellOptions {
  cliOptions: ReviewLaunchCliOptions;
  prompt: string;
  runtimeContext: RuntimeCodexCommandContext;
  repoRoot: string;
  manifestPath: string;
  artifactPaths: ReviewArtifactPaths;
  autoIssueLogEnabled: boolean;
  telemetryDebugEnabled: boolean;
  telemetryDebugEnvKey: string;
  runReview: (resolved: ResolvedReviewCommand) => Promise<ReviewRunResult>;
  writeTelemetry: (
    state: ReviewExecutionState,
    status: 'succeeded' | 'failed',
    errorMessage?: string | null,
    terminationBoundary?: ReviewTerminationBoundaryRecord | null
  ) => Promise<ReviewTelemetryPayload | null>;
  logTelemetrySummary: (
    payload: ReviewTelemetryPayload,
    relativeTelemetryPath: string,
    options: { debugTelemetry: boolean; telemetryDebugEnvKey: string }
  ) => void;
  logTerminationBoundaryFallback: (terminationBoundary: ReviewTerminationBoundaryRecord | null) => void;
  ensureReviewCommandAvailableFn?: (context: RuntimeCodexCommandContext) => Promise<void>;
  resolveReviewCommandFn?: (
    reviewArgs: string[],
    context: RuntimeCodexCommandContext
  ) => ResolvedReviewCommand;
  captureReviewFailureIssueLogFn?: (
    options: ReviewFailureIssueLogOptions
  ) => Promise<DoctorIssueLogResult | null>;
}

export async function resolveReviewRuntimeContext(params: {
  options: Pick<ReviewLaunchCliOptions, 'runtimeMode'>;
  manifestPath: string;
  env: NodeJS.ProcessEnv;
  repoRoot: string;
}): Promise<RuntimeCodexCommandContext> {
  const runId = await resolveReviewRunId(params.manifestPath);
  const requestedMode =
    params.options.runtimeMode ??
    parseRuntimeMode(
      params.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE ??
        params.env.CODEX_ORCHESTRATOR_RUNTIME_MODE ??
        null
    );
  return await createRuntimeCodexCommandContext({
    requestedMode,
    executionMode: 'mcp',
    repoRoot: params.repoRoot,
    env: params.env,
    runId: runId ?? `review-${Date.now()}`
  });
}

export async function prepareReviewArtifacts(
  manifestPath: string,
  prompt: string,
  repoRoot: string
): Promise<ReviewArtifactPaths> {
  const reviewDir = resolveReviewArtifactsDir(manifestPath, repoRoot);
  await mkdir(reviewDir, { recursive: true });

  const promptPath = path.join(reviewDir, 'prompt.txt');
  const outputLogPath = path.join(reviewDir, 'output.log');
  const telemetryPath = path.join(reviewDir, 'telemetry.json');

  await writeFile(promptPath, `${prompt}\n`, 'utf8');

  return { reviewDir, promptPath, outputLogPath, telemetryPath };
}

export async function runReviewLaunchAttemptShell(
  options: ReviewLaunchAttemptShellOptions
): Promise<void> {
  const ensureCommandAvailable =
    options.ensureReviewCommandAvailableFn ?? ensureReviewCommandAvailable;
  const resolveCommand = options.resolveReviewCommandFn ?? resolveReviewCommand;
  const captureReviewFailureIssueLog =
    options.captureReviewFailureIssueLogFn ?? maybeCaptureReviewFailureIssueLog;

  await ensureCommandAvailable(options.runtimeContext);

  const disableDelegationMcp =
    options.cliOptions.disableDelegationMcp ??
    (options.cliOptions.enableDelegationMcp === undefined ? false : !options.cliOptions.enableDelegationMcp);
  if (disableDelegationMcp) {
    console.log(
      '[run-review] delegation MCP disabled for this review (explicit opt-out via --disable-delegation-mcp or CODEX_REVIEW_DISABLE_DELEGATION_MCP=1).'
    );
  } else {
    console.log(
      '[run-review] delegation MCP enabled for this review (default; set --disable-delegation-mcp or CODEX_REVIEW_DISABLE_DELEGATION_MCP=1 to disable).'
    );
  }

  const scopedReviewArgs = buildReviewArgs(options.cliOptions, options.prompt, {
    includeScopeFlags: true,
    disableDelegationMcp
  });
  const resolvedScoped = resolveCommand(scopedReviewArgs, options.runtimeContext);
  console.log(`Review prompt saved to: ${path.relative(options.repoRoot, options.artifactPaths.promptPath)}`);
  console.log(`Review output log: ${path.relative(options.repoRoot, options.artifactPaths.outputLogPath)}`);
  console.log(
    `Launching Codex review (evidence: ${path.relative(options.repoRoot, options.manifestPath)})`
  );

  const reportSuccess = async (execution: ReviewRunResult): Promise<void> => {
    const telemetryPayload = await options.writeTelemetry(execution.state, 'succeeded');
    console.log(`Review output saved to: ${path.relative(options.repoRoot, options.artifactPaths.outputLogPath)}`);
    if (telemetryPayload) {
      console.log(
        `Review telemetry saved to: ${path.relative(options.repoRoot, options.artifactPaths.telemetryPath)}`
      );
    } else {
      console.warn(
        '[run-review] review telemetry unavailable (persistence failed); see earlier telemetry error logs.'
      );
    }
  };

  const reportFailure = async (error: unknown): Promise<void> => {
    await captureReviewFailureIssueLog({
      enabled: options.autoIssueLogEnabled,
      error,
      taskFilter: options.cliOptions.task ?? null,
      manifestPath: options.manifestPath,
      outputLogPath: options.artifactPaths.outputLogPath,
      repoRoot: options.repoRoot
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    const failureState =
      error instanceof CodexReviewError &&
      'reviewState' in error &&
      error.reviewState instanceof ReviewExecutionState
        ? error.reviewState
        : null;
    const failureTerminationBoundary =
      error instanceof CodexReviewError ? error.terminationBoundary : null;
    const telemetryPayload = failureState
      ? await options.writeTelemetry(
          failureState,
          'failed',
          errorMessage,
          failureTerminationBoundary
        )
      : null;
    if (telemetryPayload) {
      options.logTelemetrySummary(
        telemetryPayload,
        path.relative(options.repoRoot, options.artifactPaths.telemetryPath),
        {
          debugTelemetry: options.telemetryDebugEnabled,
          telemetryDebugEnvKey: options.telemetryDebugEnvKey
        }
      );
    } else if (failureState) {
      options.logTerminationBoundaryFallback(
        failureTerminationBoundary ?? failureState.getTerminationBoundaryRecord(errorMessage)
      );
    }
    if (shouldLogPartialReviewOutput(failureTerminationBoundary)) {
      console.error(
        `Review output log (partial): ${path.relative(options.repoRoot, options.artifactPaths.outputLogPath)}`
      );
    }
  };

  try {
    const execution = await options.runReview(resolvedScoped);
    await reportSuccess(execution);
    return;
  } catch (error) {
    if (shouldRetryWithoutScopeFlags(error)) {
      console.log('[run-review] codex CLI rejected scope flags with a custom prompt; retrying without flags.');
      const unscopedArgs = buildReviewArgs(options.cliOptions, options.prompt, {
        includeScopeFlags: false,
        disableDelegationMcp
      });
      const resolvedUnscoped = resolveCommand(unscopedArgs, options.runtimeContext);
      try {
        const retryExecution = await options.runReview(resolvedUnscoped);
        await reportSuccess(retryExecution);
        return;
      } catch (retryError) {
        await reportFailure(retryError);
        throw retryError;
      }
    }

    await reportFailure(error);
    throw error;
  }
}

async function ensureReviewCommandAvailable(context: RuntimeCodexCommandContext): Promise<void> {
  const resolved = resolveRuntimeCodexCommand(['--help'], context);
  const hasReview = await new Promise<boolean>((resolve, reject) => {
    const detached = process.platform !== 'win32';
    const child = spawn(resolved.command, resolved.args, { stdio: ['ignore', 'pipe', 'pipe'], detached });
    let output = '';
    let settled = false;
    let hardKillArmed = false;
    let killHandle: NodeJS.Timeout | undefined;
    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }
      signalChildProcess(child, 'SIGTERM', detached);
      hardKillArmed = true;
      killHandle = setTimeout(() => {
        if (child.exitCode === null) {
          signalChildProcess(child, 'SIGKILL', detached);
        }
      }, 5000);
      killHandle.unref();
      settled = true;
      reject(new Error('codex --help timed out while checking the review subcommand.'));
    }, REVIEW_COMMAND_CHECK_TIMEOUT_MS);
    timeoutHandle.unref();

    const finalize = (outcome: { ok: boolean } | { error: Error }) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      if (killHandle && !hardKillArmed) {
        clearTimeout(killHandle);
      }
      if ('error' in outcome) {
        reject(outcome.error);
      } else {
        resolve(outcome.ok);
      }
    };

    child.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', (error) =>
      finalize({ error: error instanceof Error ? error : new Error(String(error)) })
    );
    child.once('close', () => {
      finalize({ ok: output.includes(' review') });
    });
  });

  if (!hasReview) {
    throw new Error('codex CLI is missing the `review` subcommand (or is not installed).');
  }
}

async function resolveReviewRunId(manifestPath: string): Promise<string | null> {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as { run_id?: unknown };
    return typeof parsed.run_id === 'string' && parsed.run_id.trim().length > 0
      ? parsed.run_id.trim()
      : null;
  } catch {
    return null;
  }
}

function resolveScopeFlag(
  options: Pick<ReviewLaunchCliOptions, 'base' | 'commit' | 'uncommitted'>
): { mode: ScopeFlagMode; args: string[] } | null {
  if (options.commit) {
    return { mode: 'commit', args: ['--commit', options.commit] };
  }
  if (options.base) {
    return { mode: 'base', args: ['--base', options.base] };
  }
  if (options.uncommitted) {
    return { mode: 'uncommitted', args: ['--uncommitted'] };
  }
  return null;
}

function buildReviewArgs(
  options: Pick<ReviewLaunchCliOptions, 'base' | 'commit' | 'title' | 'uncommitted'>,
  prompt: string,
  opts: ReviewArgsOptions
): string[] {
  const args: string[] = [];
  if (opts.disableDelegationMcp) {
    args.push('-c', REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE);
  }
  args.push('review');
  if (options.title) {
    args.push('--title', options.title);
  }

  const scopeFlag = resolveScopeFlag(options);
  if (opts.includeScopeFlags && scopeFlag) {
    args.push(...scopeFlag.args);
  }

  args.push(prompt);
  return args;
}

function resolveReviewCommand(
  reviewArgs: string[],
  context: RuntimeCodexCommandContext
): ResolvedReviewCommand {
  return resolveRuntimeCodexCommand(reviewArgs, context);
}

function resolveReviewArtifactsDir(manifestPath: string, repoRoot: string): string {
  const configuredRunDir = process.env.CODEX_ORCHESTRATOR_RUN_DIR?.trim();
  if (configuredRunDir && configuredRunDir.length > 0) {
    const resolvedRunDir = path.resolve(repoRoot, configuredRunDir);
    const configuredManifestPath = path.join(resolvedRunDir, 'manifest.json');
    if (configuredManifestPath === path.resolve(manifestPath)) {
      return path.join(resolvedRunDir, REVIEW_ARTIFACTS_DIRNAME);
    }
  }
  return path.join(path.dirname(manifestPath), REVIEW_ARTIFACTS_DIRNAME);
}

async function maybeCaptureReviewFailureIssueLog(
  options: ReviewFailureIssueLogOptions
): Promise<DoctorIssueLogResult | null> {
  if (!options.enabled) {
    return null;
  }

  const errorMessage = options.error instanceof Error ? options.error.message : String(options.error);
  const issueNotes = [
    'Automatic failure capture for standalone review wrapper.',
    `Error: ${errorMessage}`,
    `Manifest: ${path.relative(options.repoRoot, options.manifestPath)}`,
    `Output log: ${path.relative(options.repoRoot, options.outputLogPath)}`
  ].join(' | ');

  try {
    const issueLog = await writeDoctorIssueLog({
      doctor: runDoctor(),
      issueTitle: 'Auto issue log: standalone review failed',
      issueNotes,
      taskFilter: options.taskFilter
    });
    console.error('[run-review] captured review failure issue log:');
    for (const line of formatDoctorIssueLogSummary(issueLog)) {
      console.error(`[run-review] ${line}`);
    }
    return issueLog;
  } catch (issueError) {
    const message = issueError instanceof Error ? issueError.message : String(issueError);
    console.error(`[run-review] failed to capture review issue log: ${message}`);
    return null;
  }
}

function shouldLogPartialReviewOutput(
  terminationBoundary: ReviewTerminationBoundaryRecord | null
): boolean {
  return (
    terminationBoundary !== null &&
    REVIEW_PARTIAL_OUTPUT_HINT_BOUNDARY_KINDS.has(terminationBoundary.kind)
  );
}

function shouldRetryWithoutScopeFlags(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const preview = 'outputPreview' in error ? String((error as any).outputPreview ?? '') : '';
  const message = 'message' in error ? String((error as any).message ?? '') : '';
  const combined = `${message}\n${preview}`.toLowerCase();
  return (
    combined.includes('unknown option') ||
    combined.includes('unknown flag') ||
    combined.includes('unrecognized option') ||
    combined.includes('cannot be used with') ||
    combined.includes('cannot be combined') ||
    combined.includes('incompatible with') ||
    combined.includes('prompt cannot') ||
    combined.includes('custom prompt') ||
    combined.includes('with a prompt')
  );
}
