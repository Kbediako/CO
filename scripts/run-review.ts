#!/usr/bin/env node
/**
 * Helper to launch `codex review` non-interactively with the latest run manifest
 * path included as evidence for reviewers.
 *
 * Note: some codex CLI versions reject combining diff-scoping flags
 * (`--uncommitted`, `--base`, `--commit`) with a custom prompt. This wrapper
 * always supplies a custom prompt (to include manifest evidence), so it will
 * try real scope flags first and fall back to embedding scope hints into the
 * prompt if the CLI rejects the flag/prompt combination.
 */

import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  parseRuntimeMode,
  type RuntimeMode
} from '../orchestrator/src/cli/runtime/index.js';
import { parseArgs as parseCliArgs, hasFlag } from './lib/cli-args.js';
import { pathExists } from './lib/docs-helpers.js';
import {
  allowHeavyReviewCommands,
  enforceBoundedReviewMode,
  prepareReviewExecutionBoundaryPreflight,
  REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY,
  REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY
} from './lib/review-execution-boundary-preflight.js';
import {
  runReviewLaunchAttemptShell
} from './lib/review-launch-attempt.js';
import { prepareReviewNonInteractiveHandoffShell } from './lib/review-non-interactive-handoff.js';
import {
  buildActiveCloseoutProvenanceLines,
  buildReviewPromptContext,
  type ReviewSurface
} from './lib/review-prompt-context.js';
import {
  type ReviewTerminationBoundaryRecord,
  ReviewExecutionState
} from './lib/review-execution-state.js';
import {
  runCodexReview
} from './lib/review-execution-runtime.js';
import {
  logReviewTelemetrySummary as logReviewExecutionTelemetrySummary,
  type ReviewTelemetryPayload,
  writeReviewExecutionTelemetry
} from './lib/review-execution-telemetry.js';
import {
  assessReviewScope,
  buildLargeScopeAdvisoryPromptLines,
  buildScopeNotes,
  collectReviewScopePaths,
  formatScopeMetrics,
  logReviewScopeAssessment,
  resolveEffectiveScopeMode
} from './lib/review-scope-advisory.js';
import { collectManifests, resolveEnvironmentPaths } from './lib/run-manifests.js';

const { repoRoot, runsRoot: defaultRunsDir } = resolveEnvironmentPaths();
const BENIGN_STDIO_ERROR_CODES = new Set(['EPIPE', 'ERR_STREAM_DESTROYED']);
const REVIEW_AUTO_ISSUE_LOG_ENV_KEY = 'CODEX_REVIEW_AUTO_ISSUE_LOG';
const REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_ENABLE_DELEGATION_MCP';
const REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_DISABLE_DELEGATION_MCP';
const REVIEW_TELEMETRY_DEBUG_ENV_KEY = 'CODEX_REVIEW_DEBUG_TELEMETRY';
const REVIEW_SURFACE_ENV_KEY = 'CODEX_REVIEW_SURFACE';

interface CliOptions {
  manifest?: string;
  runsDir: string;
  task?: string;
  runtimeMode?: RuntimeMode;
  base?: string;
  commit?: string;
  title?: string;
  uncommitted?: boolean;
  nonInteractive?: boolean;
  autoIssueLog?: boolean;
  enableDelegationMcp?: boolean;
  disableDelegationMcp?: boolean;
  surface?: ReviewSurface;
  help?: boolean;
}

function installStdioErrorGuards(): void {
  const guard = (error: NodeJS.ErrnoException) => {
    const code = typeof error?.code === 'string' ? error.code : '';
    if (BENIGN_STDIO_ERROR_CODES.has(code)) {
      return;
    }
    setImmediate(() => {
      throw error;
    });
  };

  process.stdout.on('error', guard);
  process.stderr.on('error', guard);
}

installStdioErrorGuards();

function parseBooleanOptionValue(raw: string | boolean, label: string): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid ${label} value "${raw}". Expected true|false.`);
}

function parseRuntimeModeOption(raw: string | boolean, label: string): RuntimeMode {
  if (typeof raw !== 'string') {
    throw new Error(`${label} requires a value. Expected one of: cli, appserver.`);
  }
  const parsed = parseRuntimeMode(raw);
  if (!parsed) {
    throw new Error(`Invalid ${label} value "${raw}". Expected one of: cli, appserver.`);
  }
  return parsed;
}

function parseReviewSurfaceOption(raw: string | boolean, label: string): ReviewSurface {
  if (typeof raw !== 'string') {
    throw new Error(`${label} requires a value. Expected one of: diff, audit, architecture.`);
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'diff' || normalized === 'audit' || normalized === 'architecture') {
    return normalized;
  }
  throw new Error(`Invalid ${label} value "${raw}". Expected one of: diff, audit, architecture.`);
}

function inferTaskFromManifestPath(manifestPath: string): string | null {
  const segments = path.normalize(manifestPath).split(path.sep).filter((segment) => segment.length > 0);
  const fileName = segments.at(-1);
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment !== '.runs' && segment !== 'runs') {
      continue;
    }
    const taskSegment = segments[index + 1];
    const layoutSegment = segments[index + 2];
    if (taskSegment && (layoutSegment === 'cli' || layoutSegment === 'mcp')) {
      return taskSegment;
    }
    const runSegment = segments[index + 2];
    const maybeManifest = segments[index + 3];
    if (taskSegment && runSegment && (maybeManifest === 'manifest.json' || fileName === 'manifest.json')) {
      return taskSegment;
    }
  }
  return null;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { runsDir: defaultRunsDir };
  const { args, entries, positionals } = parseCliArgs(argv);
  if (hasFlag(args, 'help') || hasFlag(args, 'h') || positionals.includes('help')) {
    options.help = true;
    return options;
  }

  for (const entry of entries) {
    if (entry.key === 'manifest' && typeof entry.value === 'string') {
      options.manifest = path.resolve(repoRoot, entry.value);
    } else if (entry.key === 'runs-dir' && typeof entry.value === 'string') {
      options.runsDir = path.resolve(repoRoot, entry.value);
    } else if (entry.key === 'task' && typeof entry.value === 'string') {
      options.task = entry.value;
    } else if (entry.key === 'runtime-mode') {
      options.runtimeMode = parseRuntimeModeOption(entry.value, '--runtime-mode');
    } else if (entry.key === 'base' && typeof entry.value === 'string') {
      options.base = entry.value;
    } else if (entry.key === 'commit' && typeof entry.value === 'string') {
      options.commit = entry.value;
    } else if (entry.key === 'title' && typeof entry.value === 'string') {
      options.title = entry.value;
    } else if (entry.key === 'uncommitted') {
      options.uncommitted = true;
    } else if (entry.key === 'non-interactive') {
      options.nonInteractive = true;
    } else if (entry.key === 'auto-issue-log') {
      options.autoIssueLog = parseBooleanOptionValue(entry.value, '--auto-issue-log');
    } else if (entry.key === 'enable-delegation-mcp') {
      options.enableDelegationMcp = parseBooleanOptionValue(entry.value, '--enable-delegation-mcp');
    } else if (entry.key === 'disable-delegation-mcp') {
      options.disableDelegationMcp = parseBooleanOptionValue(entry.value, '--disable-delegation-mcp');
    } else if (entry.key === 'surface') {
      options.surface = parseReviewSurfaceOption(entry.value, '--surface');
    }
  }

  if (hasFlag(args, 'uncommitted')) {
    options.uncommitted = true;
  }
  if (hasFlag(args, 'non-interactive')) {
    options.nonInteractive = true;
  }
  if (hasFlag(args, 'auto-issue-log')) {
    options.autoIssueLog = true;
  }
  if (hasFlag(args, 'enable-delegation-mcp')) {
    options.enableDelegationMcp = true;
  }
  if (hasFlag(args, 'disable-delegation-mcp')) {
    options.disableDelegationMcp = true;
  }

  if (!options.manifest) {
    const envManifest = process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH ?? process.env.MANIFEST;
    if (envManifest && envManifest.trim().length > 0) {
      options.manifest = path.resolve(repoRoot, envManifest.trim());
    }
  }

  if (!options.task && options.manifest) {
    const taskFromManifest = inferTaskFromManifestPath(options.manifest);
    if (taskFromManifest) {
      options.task = taskFromManifest;
    }
  }

  if (!options.task && !options.manifest) {
    const taskFromEnv = process.env.MCP_RUNNER_TASK_ID?.trim() || process.env.TASK?.trim();
    if (taskFromEnv) {
      options.task = taskFromEnv;
    }
  }

  if (options.surface === undefined) {
    const fromEnv = process.env[REVIEW_SURFACE_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.surface = parseReviewSurfaceOption(fromEnv, REVIEW_SURFACE_ENV_KEY);
    }
  }

  if (options.autoIssueLog === undefined) {
    const fromEnv = process.env[REVIEW_AUTO_ISSUE_LOG_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.autoIssueLog = parseBooleanOptionValue(fromEnv, REVIEW_AUTO_ISSUE_LOG_ENV_KEY);
    }
  }

  if (options.disableDelegationMcp === undefined) {
    const fromEnv = process.env[REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.disableDelegationMcp = parseBooleanOptionValue(fromEnv, REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY);
    }
  }

  if (options.enableDelegationMcp === undefined) {
    const fromEnv = process.env[REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY];
    if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
      options.enableDelegationMcp = parseBooleanOptionValue(
        fromEnv,
        REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY
      );
    }
  }

  return options;
}

async function resolveManifestPath(options: CliOptions): Promise<string> {
  if (options.manifest) {
    return options.manifest;
  }

  const runDirManifest = await resolveManifestPathFromRunDir();
  if (runDirManifest) {
    return runDirManifest;
  }

  const manifests = await collectManifests(options.runsDir, options.task);
  if (manifests.length === 0) {
    throw new Error('No run manifests found. Provide --manifest or execute the orchestrator first.');
  }

  const scored = await Promise.all(
    manifests.map(async (manifestPath) => {
      try {
        const fileStat = await stat(manifestPath);
        return { manifestPath, mtimeMs: fileStat.mtimeMs };
      } catch {
        return { manifestPath, mtimeMs: 0 };
      }
    })
  );

  scored.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return scored[0]?.manifestPath ?? manifests[0];
}

async function resolveManifestPathFromRunDir(): Promise<string | null> {
  const configuredRunDir = process.env.CODEX_ORCHESTRATOR_RUN_DIR?.trim();
  if (!configuredRunDir) {
    return null;
  }

  const manifestPath = path.join(path.resolve(repoRoot, configuredRunDir), 'manifest.json');
  return (await pathExists(manifestPath)) ? manifestPath : null;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printReviewWrapperHelp();
    return;
  }
  if (shouldRunDiffBudget()) {
    await runDiffBudget(options);
  } else {
    console.log('[run-review] skipping diff budget (already executed by pipeline).');
  }
  const manifestPath = await resolveManifestPath(options);

  const relativeManifest = path.relative(repoRoot, manifestPath);
  const runnerLogPath = path.join(path.dirname(manifestPath), 'runner.ndjson');
  const runnerLogExists = await pathExists(runnerLogPath);
  const relativeRunnerLog = path.relative(repoRoot, runnerLogPath);
  const manifestTask = inferTaskFromManifestPath(manifestPath);
  const envTask = process.env.MCP_RUNNER_TASK_ID ?? process.env.TASK;
  const taskKey = options.task ?? envTask ?? manifestTask;
  const taskLabel = taskKey ?? 'unknown-task';
  const reviewSurface = options.surface ?? 'diff';
  const diffBudgetOverride = process.env.DIFF_BUDGET_OVERRIDE_REASON?.trim();
  const scopeMode = resolveEffectiveScopeMode(options);
  const allowHeavyCommands = allowHeavyReviewCommands();
  const {
    promptLines,
    reviewTaskContext,
    activeCloseoutBundleRoots
  } = await buildReviewPromptContext({
    repoRoot,
    taskKey,
    taskLabel,
    reviewSurface,
    relativeManifest,
    runnerLogExists,
    relativeRunnerLog,
    notes: process.env.NOTES,
    scopeMode,
    includeBoundedReviewConstraints: !allowHeavyCommands
  });
  const enforceBoundedMode = !allowHeavyCommands && enforceBoundedReviewMode();
  if (allowHeavyCommands) {
    console.log(
      `[run-review] heavy review commands allowed (${REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY}=1).`
    );
  } else {
    console.log(
      `[run-review] bounded review guidance enabled by default (set ${REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY}=1 to opt into unrestricted heavy-command execution).`
    );
    if (enforceBoundedMode) {
      console.log(
        `[run-review] bounded enforcement enabled (${REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY}=1); heavy command starts will terminate the review.`
      );
    }
  }

  const scopePathCollection = await collectReviewScopePaths(options, repoRoot);
  const scopeNotes = buildScopeNotes(options, scopePathCollection);
  if (scopeNotes.length > 0) {
    promptLines.push('', ...scopeNotes);
  }
  const activeCloseoutProvenanceLines = buildActiveCloseoutProvenanceLines(
    repoRoot,
    activeCloseoutBundleRoots
  );
  if (activeCloseoutProvenanceLines.length > 0) {
    promptLines.push('', ...activeCloseoutProvenanceLines);
  }
  const scopeAssessment = await assessReviewScope(options, repoRoot);
  const scopeMetrics = formatScopeMetrics(scopeAssessment);
  logReviewScopeAssessment(scopeAssessment, scopeMetrics);
  const scopeAdvisoryPromptLines = buildLargeScopeAdvisoryPromptLines(scopeAssessment, scopeMetrics);
  if (scopeAdvisoryPromptLines.length > 0) {
    promptLines.push('', ...scopeAdvisoryPromptLines);
  }

  if (reviewSurface === 'audit' && diffBudgetOverride) {
    promptLines.push('', `Diff budget override: ${diffBudgetOverride}`);
  }

  const prompt = promptLines.join('\n');
  const { artifactPaths, nonInteractive, reviewEnv, handedOff } =
    await prepareReviewNonInteractiveHandoffShell({
      cliNonInteractive: options.nonInteractive,
      env: process.env,
      manifestPath,
      prompt,
      repoRoot,
      runnerLogExists,
      runnerLogPath,
      stdinIsTTY: process.stdin?.isTTY === true
    });
  if (handedOff) {
    return;
  }

  const boundaryPreflight = await prepareReviewExecutionBoundaryPreflight({
    cliOptions: options,
    manifestPath,
    env: reviewEnv,
    repoRoot,
    reviewSurface,
    architectureSurfacePaths: reviewTaskContext.architectureSurfacePaths,
    scopeTouchedPaths: scopePathCollection.paths,
    activeCloseoutBundleRoots,
    runnerLogExists,
    runnerLogPath,
    allowHeavyCommands
  });
  const {
    runtimeContext,
    timeoutMs,
    stallTimeoutMs,
    startupLoopTimeoutMs,
    startupLoopMinEvents,
    monitorIntervalMs,
    lowSignalTimeoutMs,
    verdictStabilityTimeoutMs,
    metaSurfaceTimeoutMs,
    allowedMetaSurfaceKinds,
    touchedPaths,
    startupAnchorMode,
    enforceStartupAnchorBoundary,
    enforceActiveCloseoutBundleRereadBoundary,
    enforceRelevantReinspectionDwellBoundary,
    auditStartupAnchorPaths,
    allowedMetaSurfacePaths,
    auditStartupAnchorEnvVarPaths,
    allowedMetaSurfaceEnvVarPaths
  } = boundaryPreflight;
  const autoIssueLogEnabled = options.autoIssueLog ?? false;
  const runReview = async (resolved: { command: string; args: string[] }) =>
    runCodexReview({
      command: resolved.command,
      args: resolved.args,
      env: runtimeContext.env,
      stdio: nonInteractive ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
      activeCloseoutBundleRoots,
      blockHeavyCommands: enforceBoundedMode,
      allowValidationCommandIntents: allowHeavyCommands,
      timeoutMs,
      stallTimeoutMs,
      startupLoopTimeoutMs,
      startupLoopMinEvents,
      monitorIntervalMs,
      lowSignalTimeoutMs,
      verdictStabilityTimeoutMs,
      metaSurfaceTimeoutMs,
      enforceStartupAnchorBoundary,
      enforceActiveCloseoutBundleRereadBoundary,
      enforceRelevantReinspectionDwellBoundary,
      allowedMetaSurfaceKinds: [...allowedMetaSurfaceKinds],
      scopeMode,
      startupAnchorMode,
      auditStartupAnchorPaths,
      allowedMetaSurfacePaths,
      auditStartupAnchorEnvVarPaths,
      allowedMetaSurfaceEnvVarPaths,
      repoRoot,
      touchedPaths,
      outputLogPath: artifactPaths.outputLogPath
    });
  const writeTelemetry = async (
    state: ReviewExecutionState,
    status: 'succeeded' | 'failed',
    errorMessage?: string | null,
    terminationBoundary?: ReviewTerminationBoundaryRecord | null
  ): Promise<ReviewTelemetryPayload | null> =>
    writeReviewExecutionTelemetry({
      state,
      status,
      error: errorMessage ?? null,
      terminationBoundary,
      outputLogPath: artifactPaths.outputLogPath,
      repoRoot,
      telemetryPath: artifactPaths.telemetryPath,
      includeRawTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
      telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY
    });

  await runReviewLaunchAttemptShell({
    cliOptions: options,
    prompt,
    runtimeContext,
    repoRoot,
    manifestPath,
    artifactPaths,
    autoIssueLogEnabled,
    telemetryDebugEnabled: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
    telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY,
    runReview,
    writeTelemetry,
    logTelemetrySummary: logReviewExecutionTelemetrySummary,
    logTerminationBoundaryFallback
  });
}

main().catch((error) => {
  console.error('[run-review] failed:', error.message ?? error);
  process.exitCode = typeof error?.exitCode === 'number' ? error.exitCode : 1;
});

async function runDiffBudget(options: CliOptions): Promise<void> {
  const scriptPath = path.join(repoRoot, 'scripts', 'diff-budget.mjs');
  const relativeScriptPath = path.relative(repoRoot, scriptPath);
  if (!(await pathExists(scriptPath))) {
    console.log(
      `[run-review] skipping diff budget (missing ${relativeScriptPath}; downstream npm environment detected).`
    );
    return;
  }
  const args = [scriptPath];

  if (options.commit) {
    args.push('--commit', options.commit);
  } else if (options.base) {
    args.push('--base', options.base);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('node', args, { stdio: 'inherit', env: process.env, cwd: repoRoot });
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`diff budget exited with code ${code}`));
      }
    });
  });
}

function shouldRunDiffBudget(): boolean {
  return !(envFlagEnabled(process.env.DIFF_BUDGET_STAGE) || envFlagEnabled(process.env.SKIP_DIFF_BUDGET));
}

function logTerminationBoundaryFallback(
  boundaryRecord: ReviewTerminationBoundaryRecord | null
): void {
  if (!boundaryRecord) {
    return;
  }
  console.error(
    `[run-review] termination boundary: ${boundaryRecord.kind} (${boundaryRecord.provenance}).`
  );
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function printReviewWrapperHelp(): void {
  console.log(`Usage: npm run review -- [options]

Standalone review wrapper for Codex review with manifest-backed context.

Options:
  --manifest <path>              Explicit run manifest path.
  --task <task-id>               Task id used to resolve latest manifest.
  --runtime-mode <cli|appserver> Runtime mode for the underlying Codex review call.
  --runs-dir <path>              Override .runs root for manifest discovery.
  --uncommitted                  Review uncommitted diff scope.
  --base <ref>                   Review diff from base ref.
  --commit <sha>                 Review a single commit.
  --title <title>                Set a custom review title.
  --surface <diff|audit|architecture>  Review surface (default: diff).
  --non-interactive              Force non-interactive Codex review mode.
  --auto-issue-log[=true|false]  Capture issue bundle on failure.
  --enable-delegation-mcp[=true|false]   Enable delegation MCP for this review run.
  --disable-delegation-mcp[=true|false]  Disable delegation MCP for this review run.
  -h, --help                     Show this help.

Environment:
  NOTES (recommended)            Goal/summary/risks context. If omitted, wrapper generates fallback notes.
  MANIFEST                       Alternative manifest path source.
  MCP_RUNNER_TASK_ID / TASK      Task id fallback when --task is omitted.
  ${REVIEW_SURFACE_ENV_KEY}      Review surface fallback when --surface is omitted.
`);
}
