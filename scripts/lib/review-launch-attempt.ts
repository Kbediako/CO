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
import { formatCommandIntentViolationLabel } from './review-command-intent-classification.js';
import {
  CodexReviewError,
  signalChildProcess
} from './review-execution-runtime.js';
import { formatReviewOutcomeSummary } from './review-execution-telemetry.js';
import type {
  ReviewLaunchContext,
  ReviewTelemetryPayload
} from './review-execution-telemetry.js';

const REVIEW_COMMAND_CHECK_TIMEOUT_MS = 30_000;
const REVIEW_ARTIFACTS_DIRNAME = 'review';
const REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE = 'mcp_servers.delegation.enabled=false';
const REVIEW_READ_ONLY_PERMISSION_PROFILE_CONFIG_OVERRIDE = 'default_permissions=":read-only"';
const REVIEW_LEGACY_READ_ONLY_SANDBOX_CONFIG_OVERRIDE = 'sandbox_mode="read-only"';
const REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_OWNER = 'CO-485';
const REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_TRIGGER =
  'active Codex CLI rejects default_permissions';
const REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_INTRODUCED_AT = '2026-05-02';
const REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_REVIEW_AT = '2026-05-02';
const REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_EXPIRES_AT = '2026-06-01';
const REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_REMOVAL_CONDITION =
  'release-facing Codex CLI pins move beyond 0.125 or the pinned CLI accepts default_permissions';
const REVIEW_PARTIAL_OUTPUT_HINT_BOUNDARY_KINDS = new Set(['timeout', 'stall', 'startup-loop']);
const COMMAND_INTENT_RETRY_PROMPT_PREFIX = [
  'Strict bounded review retry.',
  'A previous bounded review attempt crossed the command-intent boundary by trying to run validation or another disallowed orchestration command.',
  'Do not run validation commands, nested review/pipeline commands, or delegation control commands in this retry.',
  'Use read-only inspection only. If validation would improve confidence, list the command as a follow-up instead of executing it.',
  'Return a review verdict: start with concrete findings, or state that you found no actionable issues.'
].join('\n');

type ScopeFlagMode = 'commit' | 'base' | 'uncommitted';
type ReviewTitleSource = 'user' | 'notes-surface';

export interface ReviewLaunchCliOptions {
  task?: string;
  runtimeMode?: RuntimeMode;
  base?: string;
  commit?: string;
  title?: string;
  titleSource?: ReviewTitleSource;
  uncommitted?: boolean;
  enableDelegationMcp?: boolean;
  disableDelegationMcp?: boolean;
}

interface ReviewArgsOptions {
  includeScopeFlags: boolean;
  disableDelegationMcp: boolean;
  inlineReadOnlySandbox?: boolean;
  readOnlyConfigOverride?: string;
  contractOutputSchemaPath?: string | null;
  contractOutputLastMessagePath?: string | null;
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
  stdinInput?: string | null;
}

interface ReviewRunResult {
  preview: string;
  state: ReviewExecutionState;
  terminationBoundary?: ReviewTerminationBoundaryRecord | null;
}

export interface ReviewLaunchAttemptShellOptions {
  cliOptions: ReviewLaunchCliOptions;
  prompt: string;
  retryWithoutScopeFlagsGateError?: string | null;
  runtimeContext: RuntimeCodexCommandContext;
  repoRoot: string;
  manifestPath: string;
  artifactPaths: ReviewArtifactPaths;
  contractOutputSchemaPath?: string | null;
  contractOutputLastMessagePath?: string | null;
  autoIssueLogEnabled: boolean;
  telemetryDebugEnabled: boolean;
  telemetryDebugEnvKey: string;
  runReview: (resolved: ResolvedReviewCommand) => Promise<ReviewRunResult>;
  writeTelemetry: (
    state: ReviewExecutionState,
    status: 'succeeded' | 'failed',
    errorMessage?: string | null,
    terminationBoundary?: ReviewTerminationBoundaryRecord | null,
    launchContext?: ReviewLaunchContext | null
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
  // Keep review launch retries centralized here while run-review, non-interactive handoff,
  // and execution-boundary preflight still share the same launch semantics.
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
    disableDelegationMcp,
    contractOutputSchemaPath: options.contractOutputSchemaPath,
    contractOutputLastMessagePath: options.contractOutputLastMessagePath
  });
  const scopedLaunchContext = buildReviewLaunchContext(options.cliOptions, {
    includeScopeFlags: true,
    contractOutputSchemaPath: options.contractOutputSchemaPath,
    contractOutputLastMessagePath: options.contractOutputLastMessagePath
  });
  const scopedUsesStructuredContractExec = Boolean(
    options.contractOutputSchemaPath?.trim() && options.contractOutputLastMessagePath?.trim()
  );
  const resolvedScoped = {
    ...resolveCommand(scopedReviewArgs, options.runtimeContext),
    stdinInput: scopedUsesStructuredContractExec ? `${options.prompt}\n` : null
  };
  const launchedWithExplicitScope = scopedReviewArgs.some(
    (arg) => arg === '--base' || arg === '--commit' || arg === '--uncommitted'
  );
  console.log(`Review prompt saved to: ${path.relative(options.repoRoot, options.artifactPaths.promptPath)}`);
  console.log(`Review output log: ${path.relative(options.repoRoot, options.artifactPaths.outputLogPath)}`);
  console.log(
    `Launching Codex review (evidence: ${path.relative(options.repoRoot, options.manifestPath)})`
  );
  if (
    scopedLaunchContext.prompt_delivery === 'artifact-only' &&
    scopedLaunchContext.scope_flag_mode !== null
  ) {
    if (scopedLaunchContext.reviewer_visible_context_transport === 'scoped-title') {
      const titleSourceLabel =
        scopedLaunchContext.reviewer_visible_title_source === 'user'
          ? 'user-provided --title'
          : 'bounded NOTES+surface title';
      console.log(
        `[run-review] explicit ${scopedLaunchContext.scope_flag_mode} scope keeps full prompt context in the saved artifact; current codex review still rejects inline prompt transport under scope flags, so this launch omits any prompt argument and uses ${titleSourceLabel} for reviewer-visible context.`
      );
    } else {
      console.log(
        `[run-review] explicit ${scopedLaunchContext.scope_flag_mode} scope keeps prompt context in the saved artifact only; current codex review still treats stdin ("-") as [PROMPT], so this launch omits any prompt argument.`
      );
    }
  }

  const reportSuccess = async (
    execution: ReviewRunResult,
    launchContext: ReviewLaunchContext,
    preservedTerminationBoundary?: ReviewTerminationBoundaryRecord | null
  ): Promise<void> => {
    const telemetryPayload = await options.writeTelemetry(
      execution.state,
      'succeeded',
      null,
      preservedTerminationBoundary ?? execution.terminationBoundary ?? null,
      launchContext
    );
    console.log(`Review output saved to: ${path.relative(options.repoRoot, options.artifactPaths.outputLogPath)}`);
    if (telemetryPayload) {
      console.log(`[run-review] review outcome: ${formatReviewOutcomeSummary(telemetryPayload)}.`);
      console.log(
        `Review telemetry saved to: ${path.relative(options.repoRoot, options.artifactPaths.telemetryPath)}`
      );
    } else {
      console.warn(
        '[run-review] review telemetry unavailable (persistence failed); see earlier telemetry error logs.'
      );
    }
  };

  const reportFailure = async (
    error: unknown,
    launchContext: ReviewLaunchContext
  ): Promise<void> => {
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
          failureTerminationBoundary,
          launchContext
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

  const maybeRetryAfterCommandIntentBoundary = async (
    error: unknown,
    launchContext: ReviewLaunchContext,
    resolvedFailedLaunch: ResolvedReviewCommand
  ): Promise<boolean> => {
    if (!shouldRetryAfterCommandIntentBoundary(error, launchContext)) {
      return false;
    }
    const commandIntentBoundary =
      error instanceof CodexReviewError ? error.terminationBoundary : null;
    const commandIntentFailureState =
      error instanceof CodexReviewError && error.reviewState instanceof ReviewExecutionState
        ? error.reviewState
        : null;
    const commandIntentRetryOptions = buildCommandIntentRetryOptions(options.cliOptions);
    const commandIntentRetryPrompt = buildCommandIntentRetryPrompt(
      options.prompt,
      commandIntentFailureState,
      options.cliOptions
    );
    const buildCommandIntentRetryArgs = (readOnlyConfigOverride: string): string[] =>
      buildReviewArgs(commandIntentRetryOptions, commandIntentRetryPrompt, {
        includeScopeFlags: false,
        disableDelegationMcp,
        inlineReadOnlySandbox: true,
        readOnlyConfigOverride
      });
    const commandIntentRetryArgs = buildCommandIntentRetryArgs(
      REVIEW_READ_ONLY_PERMISSION_PROFILE_CONFIG_OVERRIDE
    );
    const commandIntentRetryLaunchContext = buildReviewLaunchContext(
      commandIntentRetryOptions,
      {
        includeScopeFlags: false
      }
    );
    const resolvedCommandIntentRetry = resolveCommand(
      commandIntentRetryArgs,
      options.runtimeContext
    );
    if (resolvedReviewCommandsEqual(resolvedFailedLaunch, resolvedCommandIntentRetry)) {
      await reportFailure(error, launchContext);
      throw error;
    }
    // CO-395 justify retaining fallback: durable bounded-review safety contract.
    // This retry preserves the logical scope in the prompt, adds no-validation
    // guidance, uses a read-only permission profile, and records the original command-intent
    // boundary in success telemetry instead of masking it as clean success.
    console.log(
      '[run-review] bounded review blocked a validation command; retrying once with reviewer-visible inline no-validation context so the reviewer can produce a verdict without running validation.'
    );
    console.log(
      '[run-review] command-intent retry keeps the original scope in the inline prompt and adds a read-only permission-profile override; another validation command remains a fail-closed boundary.'
    );
    try {
      const retryExecution = await options.runReview(resolvedCommandIntentRetry);
      if (commandIntentFailureState) {
        retryExecution.state.recordCommandIntentViolationsFrom(commandIntentFailureState);
      }
      await reportSuccess(
        retryExecution,
        commandIntentRetryLaunchContext,
        commandIntentBoundary
      );
      return true;
    } catch (retryError) {
      if (isDefaultPermissionsUnsupportedError(retryError)) {
        const legacyRetryLaunchContext = withLegacyReadOnlySandboxFallbackContext(
          commandIntentRetryLaunchContext
        );
        const legacyFallbackExpiryError = buildLegacyReadOnlySandboxFallbackExpiryError();
        if (legacyFallbackExpiryError) {
          await reportFailure(legacyFallbackExpiryError, legacyRetryLaunchContext);
          throw legacyFallbackExpiryError;
        }
        const legacyRetryArgs = buildCommandIntentRetryArgs(
          REVIEW_LEGACY_READ_ONLY_SANDBOX_CONFIG_OVERRIDE
        );
        const resolvedLegacyRetry = resolveCommand(legacyRetryArgs, options.runtimeContext);
        if (!resolvedReviewCommandsEqual(resolvedCommandIntentRetry, resolvedLegacyRetry)) {
          console.log(
            `[run-review] read-only permission-profile override was rejected by this Codex CLI; retrying command-intent recovery once with legacy sandbox_mode="read-only" compatibility override. legacy_fallback_owner=${REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_OWNER} legacy_fallback_expires_at=${REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_EXPIRES_AT}.`
          );
          try {
            const legacyRetryExecution = await options.runReview(resolvedLegacyRetry);
            if (commandIntentFailureState) {
              legacyRetryExecution.state.recordCommandIntentViolationsFrom(commandIntentFailureState);
            }
            await reportSuccess(
              legacyRetryExecution,
              legacyRetryLaunchContext,
              commandIntentBoundary
            );
            return true;
          } catch (legacyRetryError) {
            await reportFailure(legacyRetryError, legacyRetryLaunchContext);
            throw legacyRetryError;
          }
        }
      }
      await reportFailure(retryError, commandIntentRetryLaunchContext);
      throw retryError;
    }
  };

  try {
    const execution = await options.runReview(resolvedScoped);
    await reportSuccess(execution, scopedLaunchContext);
    return;
  } catch (error) {
    if (await maybeRetryAfterCommandIntentBoundary(error, scopedLaunchContext, resolvedScoped)) {
      return;
    }
    if (shouldRetryScopedWithoutSynthesizedTitle(error, options.cliOptions)) {
      // CO-395 expire fallback metadata:
      // Owner: review wrapper / CO-395. Trigger: Codex rejects synthesized scoped
      // --title transport. Introduced: CO-43 on 2026-03-30. Review by:
      // 2026-05-10. Maximum lifetime: 2026-05-26. Removal condition: current
      // audited Codex target accepts synthesized scoped titles for
      // --base/--commit/--uncommitted, or prompt transport is consolidated by a
      // larger review-wrapper refactor.
      const scopedArtifactOnlyOptions = {
        ...options.cliOptions,
        title: undefined,
        titleSource: undefined
      };
      const scopedArtifactOnlyArgs = buildReviewArgs(scopedArtifactOnlyOptions, options.prompt, {
        includeScopeFlags: true,
        disableDelegationMcp
      });
      const scopedArtifactOnlyLaunchContext = buildReviewLaunchContext(scopedArtifactOnlyOptions, {
        includeScopeFlags: true
      });
      const resolvedScopedArtifactOnly = resolveCommand(
        scopedArtifactOnlyArgs,
        options.runtimeContext
      );
      if (resolvedReviewCommandsEqual(resolvedScoped, resolvedScopedArtifactOnly)) {
        await reportFailure(error, scopedLaunchContext);
        throw error;
      }
      console.log(
        '[run-review] codex CLI rejected synthesized scoped --title transport; retrying the same explicit scope without --title and falling back to artifact-only reviewer-visible context.'
      );
      try {
        const retryExecution = await options.runReview(resolvedScopedArtifactOnly);
        await reportSuccess(retryExecution, scopedArtifactOnlyLaunchContext);
        return;
      } catch (retryError) {
        if (
          await maybeRetryAfterCommandIntentBoundary(
            retryError,
            scopedArtifactOnlyLaunchContext,
            resolvedScopedArtifactOnly
          )
        ) {
          return;
        }
        await reportFailure(retryError, scopedArtifactOnlyLaunchContext);
        throw retryError;
      }
    }
    if (
      scopedLaunchContext.prompt_delivery !== 'inline' &&
      isPromptScopeIncompatibility(error)
    ) {
      await reportFailure(error, scopedLaunchContext);
      throw error;
    }
    if (shouldRetryWithoutScopeFlags(error)) {
      if (
        launchedWithExplicitScope &&
        options.retryWithoutScopeFlagsGateError &&
        shouldRewriteRetryFailureAsScopeGate(error, options.cliOptions)
      ) {
        const retryGateError = buildRetryWithoutScopeFlagsGateError(
          error,
          options.repoRoot,
          options.retryWithoutScopeFlagsGateError
        );
        await reportFailure(retryGateError, scopedLaunchContext);
        throw retryGateError;
      }
      // CO-395 remove fallback: never retry by dropping explicit scope flags.
      // Unscoped prompt failures also remain real launch failures; the wrapper no
      // longer changes the review contract to obtain a verdict.
      await reportFailure(error, scopedLaunchContext);
      throw error;
    }

    await reportFailure(error, scopedLaunchContext);
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
  options: Pick<
    ReviewLaunchCliOptions,
    'base' | 'commit' | 'title' | 'titleSource' | 'uncommitted'
  >,
  prompt: string,
  opts: ReviewArgsOptions
): string[] {
  const args: string[] = [];
  const contractOutputSchemaPath = opts.contractOutputSchemaPath?.trim() || null;
  const contractOutputLastMessagePath = opts.contractOutputLastMessagePath?.trim() || null;
  const useStructuredContractExec = Boolean(contractOutputSchemaPath && contractOutputLastMessagePath);
  if (!useStructuredContractExec) {
    if (opts.disableDelegationMcp) {
      args.push('-c', REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE);
    }
    if (opts.inlineReadOnlySandbox) {
      args.push('-c', opts.readOnlyConfigOverride ?? REVIEW_READ_ONLY_PERMISSION_PROFILE_CONFIG_OVERRIDE);
    }
    args.push('review');
  } else {
    if (opts.disableDelegationMcp) {
      args.push('-c', REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE);
    }
    args.push('exec');
    args.push('-s', 'read-only');
    args.push('--output-schema', contractOutputSchemaPath as string);
    args.push('--output-last-message', contractOutputLastMessagePath as string);
  }
  const reviewTitle = resolveReviewTitle(options);
  if (reviewTitle.title && !useStructuredContractExec) {
    args.push('--title', reviewTitle.title);
  }

  const scopeFlag = resolveScopeFlag(options);
  if (opts.includeScopeFlags && scopeFlag && !useStructuredContractExec) {
    args.push(...scopeFlag.args);
  }

  const launchContext = buildReviewLaunchContext(options, opts);
  if (launchContext.prompt_delivery === 'inline') {
    args.push(prompt);
  } else if (launchContext.prompt_delivery === 'stdin') {
    args.push('-');
  }
  return args;
}

function buildReviewLaunchContext(
  options: Pick<ReviewLaunchCliOptions, 'base' | 'commit' | 'title' | 'titleSource' | 'uncommitted'>,
  opts: Pick<ReviewArgsOptions, 'includeScopeFlags' | 'contractOutputSchemaPath' | 'contractOutputLastMessagePath'>
): ReviewLaunchContext {
  const scopedFlag = opts.includeScopeFlags ? resolveScopeFlag(options) : null;
  const reviewTitle = resolveReviewTitle(options);
  const contractOutputSchemaPath = opts.contractOutputSchemaPath?.trim() || null;
  const contractOutputLastMessagePath = opts.contractOutputLastMessagePath?.trim() || null;
  const useStructuredContractExec = Boolean(contractOutputSchemaPath && contractOutputLastMessagePath);
  const promptDelivery = useStructuredContractExec ? 'stdin' : scopedFlag ? 'artifact-only' : 'inline';
  return {
    scope_flag_mode: useStructuredContractExec ? null : (scopedFlag?.mode ?? null),
    prompt_delivery: promptDelivery,
    reviewer_visible_context_transport: useStructuredContractExec
      ? 'stdin-prompt'
      : scopedFlag
        ? reviewTitle.source
          ? 'scoped-title'
          : 'artifact-only'
        : 'inline-prompt',
    reviewer_visible_title_source: scopedFlag && !useStructuredContractExec ? reviewTitle.source : null,
    ...(useStructuredContractExec
      ? {
          transport: 'codex-exec-output-schema' as const,
          output_schema_path: contractOutputSchemaPath as string,
          output_last_message_path: contractOutputLastMessagePath as string
        }
      : {})
  };
}

function withLegacyReadOnlySandboxFallbackContext(
  launchContext: ReviewLaunchContext
): ReviewLaunchContext {
  return {
    ...launchContext,
    legacy_fallback_attempt: 'review-wrapper-read-only-sandbox-compatibility',
    legacy_fallback_owner: REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_OWNER,
    legacy_fallback_trigger: REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_TRIGGER,
    legacy_fallback_introduced_at: REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_INTRODUCED_AT,
    legacy_fallback_review_at: REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_REVIEW_AT,
    legacy_fallback_expires_at: REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_EXPIRES_AT,
    legacy_fallback_removal_condition: REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_REMOVAL_CONDITION
  };
}

function buildLegacyReadOnlySandboxFallbackExpiryError(now = new Date()): Error | null {
  const expiryEnd = Date.parse(`${REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_EXPIRES_AT}T23:59:59.999Z`);
  if (!Number.isFinite(expiryEnd) || now.getTime() <= expiryEnd) {
    return null;
  }
  return new Error(
    `[run-review] legacy sandbox_mode="read-only" compatibility fallback expired after ${REVIEW_LEGACY_READ_ONLY_SANDBOX_FALLBACK_EXPIRES_AT}; remove the fallback or refresh the CO-485 fallback-expiry contract before retrying.`
  );
}

function resolveReviewTitle(
  options: Pick<ReviewLaunchCliOptions, 'title' | 'titleSource'>
): { title: string | null; source: ReviewTitleSource | null } {
  const rawTitle = typeof options.title === 'string' ? options.title.trim() : '';
  if (rawTitle.length === 0) {
    return { title: null, source: null };
  }

  return {
    title: rawTitle,
    source: options.titleSource ?? 'user'
  };
}

function resolveReviewCommand(
  reviewArgs: string[],
  context: RuntimeCodexCommandContext
): ResolvedReviewCommand {
  return resolveRuntimeCodexCommand(reviewArgs, context);
}

export function resolveReviewArtifactsDir(manifestPath: string, repoRoot: string): string {
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

function resolvedReviewCommandsEqual(
  left: ResolvedReviewCommand,
  right: ResolvedReviewCommand
): boolean {
  return (
    left.command === right.command &&
    left.args.length === right.args.length &&
    left.args.every((arg, index) => arg === right.args[index])
  );
}

function isDefaultPermissionsUnsupportedError(error: unknown): boolean {
  const haystack = [
    error instanceof Error ? error.message : String(error),
    error instanceof CodexReviewError ? error.outputPreview : ''
  ].join('\n');
  return /default_permissions requires a `?\[permissions\]`? table/i.test(haystack);
}

function shouldRetryAfterCommandIntentBoundary(
  error: unknown,
  launchContext: ReviewLaunchContext
): boolean {
  return (
    error instanceof CodexReviewError &&
    error.terminationBoundary?.kind === 'command-intent' &&
    launchContext.prompt_delivery === 'artifact-only' &&
    launchContext.scope_flag_mode !== null
  );
}

function buildCommandIntentRetryOptions(options: ReviewLaunchCliOptions): ReviewLaunchCliOptions {
  return {
    ...options,
    title: undefined,
    titleSource: undefined
  };
}

function buildCommandIntentRetryPrompt(
  prompt: string,
  failureState: ReviewExecutionState | null,
  options: Pick<ReviewLaunchCliOptions, 'base' | 'commit' | 'uncommitted'>
): string {
  const boundaryState = failureState?.getCommandIntentBoundaryState() ?? null;
  const blockedAttemptLine = boundaryState?.violationKind
    ? `Blocked attempt: ${formatCommandIntentViolationLabel(boundaryState.violationKind)}.`
    : 'Blocked attempt: bounded command-intent boundary.';
  const blockedSampleLine = boundaryState?.violationSample
    ? `Treat this as a follow-up command only, not something to rerun: ${boundaryState.violationSample}`
    : 'Treat any validation or nested review command you considered as a follow-up command only, not something to rerun.';
  const scopeLine = formatCommandIntentRetryScopeLine(options);
  return [
    COMMAND_INTENT_RETRY_PROMPT_PREFIX,
    scopeLine,
    blockedAttemptLine,
    blockedSampleLine,
    '',
    prompt
  ].join('\n');
}

function formatCommandIntentRetryScopeLine(
  options: Pick<ReviewLaunchCliOptions, 'base' | 'commit' | 'uncommitted'>
): string {
  const scopeFlag = resolveScopeFlag(options);
  if (!scopeFlag) {
    return 'Retry review scope: wrapper default review scope.';
  }
  return `Retry review scope: ${scopeFlag.args.join(' ')}. Use this same logical scope while inspecting the diff.`;
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

function shouldRetryScopedWithoutSynthesizedTitle(
  error: unknown,
  cliOptions: Pick<ReviewLaunchCliOptions, 'base' | 'commit' | 'titleSource' | 'uncommitted'>
): boolean {
  if (cliOptions.titleSource !== 'notes-surface') {
    return false;
  }
  if (!resolveScopeFlag(cliOptions)) {
    return false;
  }
  if (!error || typeof error !== 'object') {
    return false;
  }
  const preview = 'outputPreview' in error ? String((error as any).outputPreview ?? '') : '';
  const message = 'message' in error ? String((error as any).message ?? '') : '';
  const combined = `${message}\n${preview}`.toLowerCase();
  const lines = combined
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return (
    hasExplicitScopeFlagRejectionSignal(lines, '--title') ||
    lines.some((line) => line.includes('--title') && hasPromptScopeFlagRejectionSignal(line))
  );
}

function isPromptScopeIncompatibility(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const preview = 'outputPreview' in error ? String((error as any).outputPreview ?? '') : '';
  const message = 'message' in error ? String((error as any).message ?? '') : '';
  const combined = `${message}\n${preview}`.toLowerCase();
  return (
    combined.includes('prompt cannot') ||
    combined.includes('custom prompt') ||
    combined.includes('with a prompt')
  );
}

function shouldRewriteRetryFailureAsScopeGate(
  error: unknown,
  cliOptions: Pick<ReviewLaunchCliOptions, 'base' | 'commit' | 'uncommitted'>
): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const scopeFlag = resolveScopeFlag(cliOptions);
  const scopeFlagToken = scopeFlag?.args[0]?.toLowerCase() ?? null;
  if (!scopeFlagToken) {
    return false;
  }
  const preview = 'outputPreview' in error ? String((error as any).outputPreview ?? '') : '';
  const message = 'message' in error ? String((error as any).message ?? '') : '';
  const combined = `${message}\n${preview}`.toLowerCase();
  const lines = combined
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return (
    hasExplicitScopeFlagRejectionSignal(lines, scopeFlagToken) ||
    lines.some(
      (line) =>
        line.includes(scopeFlagToken) &&
        hasPromptScopeFlagRejectionSignal(line)
    ) ||
    hasPromptScopeIncompatibilitySignal(lines, scopeFlagToken)
  );
}

function hasExplicitScopeFlagRejectionSignal(lines: string[], scopeFlagToken: string): boolean {
  const escapedScopeFlagToken = escapeForRegExp(scopeFlagToken);
  const quotedOrBareScopeFlagToken = `(?:['"]${escapedScopeFlagToken}['"]|${escapedScopeFlagToken})`;
  const tokenBoundary = `(?=$|\\s|[),.:;])`;
  const directScopeRejectionPatterns = [
    new RegExp(`(?:unknown option|unknown flag|unrecognized option)\\s+${quotedOrBareScopeFlagToken}${tokenBoundary}`),
    new RegExp(`^(?:option\\s+)?${quotedOrBareScopeFlagToken}\\s+(?:cannot be used with|cannot be combined|is incompatible with)`),
    new RegExp(`^(?:flag\\s+)?${quotedOrBareScopeFlagToken}\\s+(?:cannot be used with|cannot be combined|is incompatible with)`),
    new RegExp(`.+(?:cannot be used with|cannot be combined|incompatible with)\\s+${quotedOrBareScopeFlagToken}${tokenBoundary}`)
  ];
  return lines.some((line) => directScopeRejectionPatterns.some((pattern) => pattern.test(line)));
}

function hasPromptScopeFlagRejectionSignal(line: string): boolean {
  const mentionsPrompt =
    line.includes('prompt cannot') ||
    line.includes('custom prompt') ||
    line.includes('with a prompt');
  if (!mentionsPrompt) {
    return false;
  }
  return (
    line.includes('unknown option') ||
    line.includes('unknown flag') ||
    line.includes('unrecognized option') ||
    line.includes('cannot be used with') ||
    line.includes('cannot be combined') ||
    line.includes('incompatible with') ||
    line.includes('prompt cannot') ||
    line.includes('custom prompt') ||
    line.includes('with a prompt')
  );
}

function hasPromptScopeIncompatibilitySignal(
  lines: string[],
  _scopeFlagToken: string
): boolean {
  return lines.some((line) => {
    const mentionsPrompt =
      line.includes('prompt cannot') ||
      line.includes('custom prompt') ||
      line.includes('with a prompt');
    if (!mentionsPrompt) {
      return false;
    }
    return (
      line.includes('diff scoping') ||
      line.includes('diff-scoping') ||
      line.includes('review scope') ||
      line.includes('scope flags')
    );
  });
}

function buildRetryWithoutScopeFlagsGateError(
  error: unknown,
  repoRoot: string,
  retryWithoutScopeFlagsGateError: string
): CodexReviewError {
  const originalError = error instanceof CodexReviewError ? error : null;
  return new CodexReviewError(
    `codex CLI rejected the explicit review scope flags, and retrying without them would remove explicit review scope. ${retryWithoutScopeFlagsGateError}`,
    {
      exitCode:
        typeof originalError?.exitCode === 'number' && originalError.exitCode > 0
          ? originalError.exitCode
          : 1,
      signal: originalError?.signal ?? null,
      timedOut: false,
      outputPreview: originalError?.outputPreview ?? '',
      reviewState: originalError?.reviewState ?? new ReviewExecutionState({ repoRoot }),
      terminationBoundary: originalError?.terminationBoundary ?? null
    }
  );
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
