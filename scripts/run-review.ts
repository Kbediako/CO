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

import { execFile, spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext,
  type RuntimeMode
} from '../orchestrator/src/cli/runtime/index.js';
import { runDoctor } from '../orchestrator/src/cli/doctor.js';
import {
  formatDoctorIssueLogSummary,
  type DoctorIssueLogResult,
  writeDoctorIssueLog
} from '../orchestrator/src/cli/doctorIssueLog.js';
import { parseArgs as parseCliArgs, hasFlag } from './lib/cli-args.js';
import { pathExists } from './lib/docs-helpers.js';
import {
  buildActiveCloseoutProvenanceLines,
  buildReviewPromptContext,
  type ReviewScopeMode,
  type ReviewSurface
} from './lib/review-prompt-context.js';
import {
  ARCHITECTURE_ALLOWED_META_SURFACE_KINDS,
  AUDIT_ALLOWED_META_SURFACE_KINDS,
  formatDurationMs,
  type ReviewTerminationBoundaryKind,
  type ReviewTerminationBoundaryRecord,
  type ReviewStartupAnchorMode,
  ReviewExecutionState
} from './lib/review-execution-state.js';
import {
  CodexReviewError,
  runCodexReview,
  signalChildProcess
} from './lib/review-execution-runtime.js';
import {
  buildReviewTelemetryPayload,
  logReviewTelemetrySummary as logReviewExecutionTelemetrySummary,
  persistReviewTelemetry as persistReviewExecutionTelemetry,
  type ReviewTelemetryPayload
} from './lib/review-execution-telemetry.js';
import {
  parseNameStatusPathCollection,
  parseStatusZPathCollection,
  parseStatusZPaths,
  type ReviewScopePathCollection
} from './lib/review-scope-paths.js';
import { collectManifests, resolveEnvironmentPaths } from './lib/run-manifests.js';

const execFileAsync = promisify(execFile);
const { repoRoot, runsRoot: defaultRunsDir } = resolveEnvironmentPaths();
const DEFAULT_REVIEW_STARTUP_LOOP_MIN_EVENTS = 8;
const DEFAULT_REVIEW_MONITOR_INTERVAL_SECONDS = 60;
const DEFAULT_LARGE_SCOPE_FILE_THRESHOLD = 25;
const DEFAULT_LARGE_SCOPE_LINE_THRESHOLD = 1200;
const REVIEW_COMMAND_CHECK_TIMEOUT_MS = 30_000;
const REVIEW_ARTIFACTS_DIRNAME = 'review';
const BENIGN_STDIO_ERROR_CODES = new Set(['EPIPE', 'ERR_STREAM_DESTROYED']);
const REVIEW_AUTO_ISSUE_LOG_ENV_KEY = 'CODEX_REVIEW_AUTO_ISSUE_LOG';
const REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_ENABLE_DELEGATION_MCP';
const REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_DISABLE_DELEGATION_MCP';
const REVIEW_MONITOR_INTERVAL_ENV_KEY = 'CODEX_REVIEW_MONITOR_INTERVAL_SECONDS';
const REVIEW_LARGE_SCOPE_FILE_THRESHOLD_ENV_KEY = 'CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD';
const REVIEW_LARGE_SCOPE_LINE_THRESHOLD_ENV_KEY = 'CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD';
const REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY = 'CODEX_REVIEW_ALLOW_HEAVY_COMMANDS';
const REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY = 'CODEX_REVIEW_ENFORCE_BOUNDED_MODE';
const REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_LOW_SIGNAL_TIMEOUT_SECONDS';
const REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_VERDICT_STABILITY_TIMEOUT_SECONDS';
const REVIEW_META_SURFACE_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS';
const REVIEW_TELEMETRY_DEBUG_ENV_KEY = 'CODEX_REVIEW_DEBUG_TELEMETRY';
const REVIEW_SURFACE_ENV_KEY = 'CODEX_REVIEW_SURFACE';
const REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE = 'mcp_servers.delegation.enabled=false';
const REVIEW_PARTIAL_OUTPUT_HINT_BOUNDARY_KINDS = new Set<ReviewTerminationBoundaryKind>([
  'timeout',
  'stall',
  'startup-loop'
]);

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

  const scopePathCollection = await collectReviewScopePaths(options);
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
  const scopeAssessment = await assessReviewScope(options);
  const scopeMetrics = formatScopeMetrics(scopeAssessment);
  if (scopeAssessment.mode === 'uncommitted') {
    if (scopeMetrics) {
      console.log(`[run-review] review scope metrics: ${scopeMetrics}.`);
    } else {
      console.log('[run-review] review scope metrics unavailable (git scope stats could not be resolved).');
    }
    if (scopeAssessment.largeScope) {
      const detail = scopeMetrics ?? 'metrics unavailable';
      console.warn(
        `[run-review] large uncommitted review scope detected (${detail}; thresholds: ${scopeAssessment.fileThreshold} files / ${scopeAssessment.lineThreshold} lines).`
      );
      console.warn(
        '[run-review] this scope profile is known to produce long CO review traversals; prefer scoped reviews (`--base`/`--commit`) when practical.'
      );
      promptLines.push(
        '',
        `Scope advisory: large uncommitted diff detected (${detail}; thresholds: ${scopeAssessment.fileThreshold} files / ${scopeAssessment.lineThreshold} lines).`,
        'Prioritize highest-risk findings first and report actionable issues early; avoid exhaustive low-signal traversal before surfacing initial findings.',
        'If full coverage is incomplete, call out residual risk areas explicitly.'
      );
    }
  }

  if (reviewSurface === 'audit' && diffBudgetOverride) {
    promptLines.push('', `Diff budget override: ${diffBudgetOverride}`);
  }

  const prompt = promptLines.join('\n');
  const artifactPaths = await prepareReviewArtifacts(manifestPath, prompt);
  const nonInteractive = options.nonInteractive ?? shouldForceNonInteractive();
  const reviewEnv = { ...process.env };
  reviewEnv.MANIFEST = manifestPath;
  if (runnerLogExists) {
    reviewEnv.RUNNER_LOG = runnerLogPath;
    reviewEnv.RUN_LOG = runnerLogPath;
  } else {
    delete reviewEnv.RUNNER_LOG;
    delete reviewEnv.RUN_LOG;
  }
  const stdinIsTTY = process.stdin?.isTTY === true;
  if (nonInteractive) {
    reviewEnv.CODEX_NON_INTERACTIVE = reviewEnv.CODEX_NON_INTERACTIVE ?? '1';
    reviewEnv.CODEX_NO_INTERACTIVE = reviewEnv.CODEX_NO_INTERACTIVE ?? '1';
    reviewEnv.CODEX_INTERACTIVE = reviewEnv.CODEX_INTERACTIVE ?? '0';
  }
  if (
    nonInteractive &&
    !envFlagEnabled(process.env.FORCE_CODEX_REVIEW) &&
    (envFlagEnabled(process.env.CI) ||
      !stdinIsTTY ||
      envFlagEnabled(process.env.CODEX_REVIEW_NON_INTERACTIVE) ||
      envFlagEnabled(process.env.CODEX_NON_INTERACTIVE) ||
      envFlagEnabled(process.env.CODEX_NO_INTERACTIVE) ||
      envFlagEnabled(process.env.CODEX_NONINTERACTIVE))
  ) {
    console.log('Codex review handoff (non-interactive):');
    console.log('---');
    console.log(prompt);
    console.log('---');
    console.log(`Review prompt saved to: ${path.relative(repoRoot, artifactPaths.promptPath)}`);
    console.log('Set FORCE_CODEX_REVIEW=1 to invoke `codex review` in this environment.');
    return;
  }

  const runtimeContext = await resolveReviewRuntimeContext({
    options,
    manifestPath,
    env: reviewEnv
  });
  console.log(`[run-review] ${formatRuntimeSelectionSummary(runtimeContext.runtime)}.`);

  await ensureReviewCommandAvailable(runtimeContext);
  const disableDelegationMcp =
    options.disableDelegationMcp ??
    (options.enableDelegationMcp === undefined ? false : !options.enableDelegationMcp);
  if (disableDelegationMcp) {
    console.log(
      '[run-review] delegation MCP disabled for this review (explicit opt-out via --disable-delegation-mcp or CODEX_REVIEW_DISABLE_DELEGATION_MCP=1).'
    );
  } else {
    console.log(
      '[run-review] delegation MCP enabled for this review (default; set --disable-delegation-mcp or CODEX_REVIEW_DISABLE_DELEGATION_MCP=1 to disable).'
    );
  }
  const scopedReviewArgs = buildReviewArgs(options, prompt, {
    includeScopeFlags: true,
    disableDelegationMcp
  });
  const resolvedScoped = resolveReviewCommand(scopedReviewArgs, runtimeContext);
  console.log(`Review prompt saved to: ${path.relative(repoRoot, artifactPaths.promptPath)}`);
  console.log(`Review output log: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
  console.log(`Launching Codex review (evidence: ${relativeManifest})`);
  const timeoutMs = resolveReviewTimeoutMs();
  if (timeoutMs !== null) {
    console.log(
      `[run-review] enforcing codex review timeout at ${Math.round(timeoutMs / 1000)}s (configured via CODEX_REVIEW_TIMEOUT_SECONDS).`
    );
  }
  const stallTimeoutMs = resolveReviewStallTimeoutMs();
  if (stallTimeoutMs !== null) {
    console.log(
      `[run-review] enforcing codex review stall timeout at ${Math.round(
        stallTimeoutMs / 1000
      )}s of no output (configured via CODEX_REVIEW_STALL_TIMEOUT_SECONDS).`
    );
  }
  const startupLoopTimeoutMs = resolveReviewStartupLoopTimeoutMs();
  const startupLoopMinEvents = resolveReviewStartupLoopMinEvents();
  if (startupLoopTimeoutMs !== null) {
    console.log(
      `[run-review] enforcing delegation-startup loop timeout at ${Math.round(
        startupLoopTimeoutMs / 1000
      )}s after ${startupLoopMinEvents} startup events (configured via CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS).`
    );
  }
  const monitorIntervalMs = resolveReviewMonitorIntervalMs();
  if (monitorIntervalMs === null) {
    console.log(
      '[run-review] patience-first monitor checkpoints disabled (configured via CODEX_REVIEW_MONITOR_INTERVAL_SECONDS=0).'
    );
  } else {
    console.log(
      `[run-review] patience-first monitor checkpoints every ${formatDurationMs(
        monitorIntervalMs
      )} (set CODEX_REVIEW_MONITOR_INTERVAL_SECONDS=0 to disable).`
    );
  }
  const lowSignalTimeoutMs = !allowHeavyCommands ? resolveReviewLowSignalTimeoutMs() : null;
  const verdictStabilityTimeoutMs = !allowHeavyCommands
    ? resolveReviewVerdictStabilityTimeoutMs()
    : null;
  const metaSurfaceTimeoutMs = !allowHeavyCommands ? resolveReviewMetaSurfaceTimeoutMs() : null;
  const allowedMetaSurfaceKinds =
    reviewSurface === 'audit'
      ? AUDIT_ALLOWED_META_SURFACE_KINDS
      : reviewSurface === 'architecture'
        ? ARCHITECTURE_ALLOWED_META_SURFACE_KINDS
      : ([] as const);
  const scopeTouchedPaths = scopePathCollection.paths;
  const architectureRelevantPaths =
    reviewSurface === 'architecture'
      ? reviewTaskContext.architectureSurfacePaths
          .map((entry) => path.relative(repoRoot, entry))
          .filter((entry) => entry.length > 0)
      : [];
  const touchedPaths =
    reviewSurface === 'architecture'
      ? [...new Set([...scopeTouchedPaths, ...architectureRelevantPaths])]
      : scopeTouchedPaths;
  const startupAnchorMode: ReviewStartupAnchorMode | null = !allowHeavyCommands
    ? reviewSurface === 'audit'
      ? 'audit'
      : reviewSurface === 'diff' && touchedPaths.length > 0
        ? 'diff'
        : null
    : null;
  const enforceStartupAnchorBoundary = startupAnchorMode !== null;
  const enforceActiveCloseoutBundleRereadBoundary =
    reviewSurface === 'diff' && !allowHeavyCommands && activeCloseoutBundleRoots.length > 0;
  const announceRelevantReinspectionDwellBoundary =
    (reviewSurface === 'diff' || reviewSurface === 'architecture') &&
    !allowHeavyCommands &&
    touchedPaths.length > 0;
  const enforceRelevantReinspectionDwellBoundary =
    announceRelevantReinspectionDwellBoundary && lowSignalTimeoutMs !== null;
  if (!allowHeavyCommands) {
    if (lowSignalTimeoutMs === null) {
      console.log(
        `[run-review] low-signal drift guard disabled (${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0).`
      );
    } else {
      console.log(
        `[run-review] low-signal drift guard enabled after ${formatDurationMs(
          lowSignalTimeoutMs
        )} of repetitive bounded activity (set ${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    }
    if (verdictStabilityTimeoutMs === null) {
      console.log(
        `[run-review] verdict-stability guard disabled (${REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY}=0).`
      );
    } else {
      console.log(
        `[run-review] verdict-stability guard enabled after ${formatDurationMs(
          verdictStabilityTimeoutMs
        )} of repeated speculative no-progress output (set ${REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    }
    if (metaSurfaceTimeoutMs === null) {
      console.log(
        `[run-review] meta-surface expansion guard disabled (${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0).`
      );
    } else if (allowedMetaSurfaceKinds.length > 0) {
      const allowedMetaSurfaceLabel =
        reviewSurface === 'audit' ? 'allowed audit meta surfaces' : 'allowed architecture meta surfaces';
      console.log(
        `[run-review] meta-surface expansion guard enabled after ${formatDurationMs(
          metaSurfaceTimeoutMs
        )} of sustained off-task meta activity; ${allowedMetaSurfaceLabel}: ${allowedMetaSurfaceKinds.join(
          ', '
        )} (set ${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    } else {
      console.log(
        `[run-review] meta-surface expansion guard enabled after ${formatDurationMs(
          metaSurfaceTimeoutMs
        )} of sustained off-task meta activity (set ${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0 to disable).`
      );
    }
    if (startupAnchorMode === 'diff') {
      console.log(
        '[run-review] startup-anchor boundary enabled for diff mode; repeated memory/skills/review-docs/manifest/review-artifact reads before the first startup anchor will terminate the review.'
      );
    } else if (startupAnchorMode === 'audit') {
      console.log(
        '[run-review] startup-anchor boundary enabled for audit mode; repeated memory/skills/review-doc reads before the first manifest/runner-log startup anchor will terminate the review.'
      );
    }
    if (announceRelevantReinspectionDwellBoundary) {
      if (lowSignalTimeoutMs === null) {
        console.log(
          `[run-review] bounded relevant reinspection dwell boundary disabled (${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0).`
        );
      } else {
        console.log(
          `[run-review] bounded relevant reinspection dwell boundary enabled after ${formatDurationMs(
            lowSignalTimeoutMs
          )} of repetitive on-task reinspection without concrete findings (set ${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0 to disable).`
        );
      }
    }
  }
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
      auditStartupAnchorPaths:
        reviewSurface === 'audit'
          ? [manifestPath, ...(runnerLogExists ? [runnerLogPath] : [])]
          : [],
      allowedMetaSurfacePaths:
        reviewSurface === 'audit'
          ? [manifestPath, ...(runnerLogExists ? [runnerLogPath] : [])]
          : reviewSurface === 'architecture'
            ? reviewTaskContext.architectureSurfacePaths
          : [],
      auditStartupAnchorEnvVarPaths:
        reviewSurface === 'audit'
          ? {
              MANIFEST: manifestPath,
              ...(runnerLogExists ? { RUNNER_LOG: runnerLogPath, RUN_LOG: runnerLogPath } : {})
            }
          : {},
      allowedMetaSurfaceEnvVarPaths:
        reviewSurface === 'audit'
          ? {
              MANIFEST: manifestPath,
              ...(runnerLogExists ? { RUNNER_LOG: runnerLogPath, RUN_LOG: runnerLogPath } : {})
            }
          : {},
      repoRoot,
      touchedPaths,
      outputLogPath: artifactPaths.outputLogPath
    });
  const writeTelemetry = async (
    state: ReviewExecutionState,
    status: 'succeeded' | 'failed',
    errorMessage?: string | null,
    terminationBoundary?: ReviewTerminationBoundaryRecord | null
  ): Promise<ReviewTelemetryPayload | null> => {
    try {
      const payload = buildReviewTelemetryPayload({
        outputLogPath: artifactPaths.outputLogPath,
        repoRoot,
        status,
        error: errorMessage ?? null,
        terminationBoundary:
          status === 'failed'
            ? terminationBoundary !== undefined
              ? terminationBoundary ?? null
              : state.getTerminationBoundaryRecord(errorMessage ?? null)
            : null,
        includeRawTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
        telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY,
        summary: state.buildOutputSummary()
      });
      return await persistReviewExecutionTelemetry({
        payload,
        telemetryPath: artifactPaths.telemetryPath,
      });
    } catch (telemetryError) {
      const telemetryMessage = telemetryError instanceof Error ? telemetryError.message : String(telemetryError);
      console.error(`[run-review] failed to persist review telemetry: ${telemetryMessage}`);
      return null;
    }
  };

  try {
    const execution = await runReview(resolvedScoped);
    const telemetryPayload = await writeTelemetry(execution.state, 'succeeded');
    console.log(`Review output saved to: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
    if (telemetryPayload) {
      console.log(`Review telemetry saved to: ${path.relative(repoRoot, artifactPaths.telemetryPath)}`);
    } else {
      console.warn(
        `[run-review] review telemetry unavailable (persistence failed); see earlier telemetry error logs.`
      );
    }
  } catch (error) {
    if (shouldRetryWithoutScopeFlags(error)) {
      console.log('[run-review] codex CLI rejected scope flags with a custom prompt; retrying without flags.');
      const unscopedArgs = buildReviewArgs(options, prompt, {
        includeScopeFlags: false,
        disableDelegationMcp
      });
      const resolvedUnscoped = resolveReviewCommand(unscopedArgs, runtimeContext);
      try {
        const retryExecution = await runReview(resolvedUnscoped);
        const telemetryPayload = await writeTelemetry(retryExecution.state, 'succeeded');
        console.log(`Review output saved to: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
        if (telemetryPayload) {
          console.log(`Review telemetry saved to: ${path.relative(repoRoot, artifactPaths.telemetryPath)}`);
        } else {
          console.warn(
            `[run-review] review telemetry unavailable (persistence failed); see earlier telemetry error logs.`
          );
        }
        return;
      } catch (retryError) {
        await maybeCaptureReviewFailureIssueLog({
          enabled: autoIssueLogEnabled,
          error: retryError,
          taskFilter: options.task ?? null,
          manifestPath,
          outputLogPath: artifactPaths.outputLogPath
        });
        const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
        const retryState =
          retryError instanceof CodexReviewError &&
          'reviewState' in retryError &&
          retryError.reviewState instanceof ReviewExecutionState
            ? retryError.reviewState
            : null;
        const retryTerminationBoundary =
          retryError instanceof CodexReviewError ? retryError.terminationBoundary : null;
        const telemetryPayload = retryState
          ? await writeTelemetry(
              retryState,
              'failed',
              retryMessage,
              retryTerminationBoundary
            )
          : null;
        if (telemetryPayload) {
          logReviewExecutionTelemetrySummary(
            telemetryPayload,
            path.relative(repoRoot, artifactPaths.telemetryPath),
            {
              debugTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
              telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY
            }
          );
        } else if (retryState) {
          logTerminationBoundaryFallback(
            retryTerminationBoundary ?? retryState.getTerminationBoundaryRecord(retryMessage)
          );
        }
        if (shouldLogPartialReviewOutput(retryTerminationBoundary)) {
          console.error(`Review output log (partial): ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
        }
        throw retryError;
      }
    }
    await maybeCaptureReviewFailureIssueLog({
      enabled: autoIssueLogEnabled,
      error,
      taskFilter: options.task ?? null,
      manifestPath,
      outputLogPath: artifactPaths.outputLogPath
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
      ? await writeTelemetry(
          failureState,
          'failed',
          errorMessage,
          failureTerminationBoundary
        )
      : null;
    if (telemetryPayload) {
      logReviewExecutionTelemetrySummary(
        telemetryPayload,
        path.relative(repoRoot, artifactPaths.telemetryPath),
        {
          debugTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
          telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY
        }
      );
    } else if (failureState) {
      logTerminationBoundaryFallback(
        failureTerminationBoundary ?? failureState.getTerminationBoundaryRecord(errorMessage)
      );
    }
    if (shouldLogPartialReviewOutput(failureTerminationBoundary)) {
      console.error(`Review output log (partial): ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
    }
    throw error;
  }
}

main().catch((error) => {
  console.error('[run-review] failed:', error.message ?? error);
  process.exitCode = typeof error?.exitCode === 'number' ? error.exitCode : 1;
});

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

async function resolveReviewRuntimeContext(params: {
  options: CliOptions;
  manifestPath: string;
  env: NodeJS.ProcessEnv;
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
    repoRoot,
    env: params.env,
    runId: runId ?? `review-${Date.now()}`
  });
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

type ScopeFlagMode = ReviewScopeMode;

interface ReviewArgsOptions {
  includeScopeFlags: boolean;
  disableDelegationMcp: boolean;
}

interface ReviewScopeAssessment {
  mode: ScopeFlagMode;
  changedFiles: number | null;
  changedLines: number | null;
  largeScope: boolean;
  fileThreshold: number;
  lineThreshold: number;
}

async function collectReviewScopePaths(options: CliOptions): Promise<ReviewScopePathCollection> {
  if (options.commit) {
    const summary = await tryGit(['show', '--no-color', '--name-status', '--format=', options.commit]);
    return summary ? parseNameStatusPathCollection(summary) : { paths: [], renderedLines: [] };
  }
  if (options.base) {
    const diff = await tryGit(['diff', '--no-color', '--name-status', `${options.base}...HEAD`]);
    return diff ? parseNameStatusPathCollection(diff) : { paths: [], renderedLines: [] };
  }
  const status = await tryGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  return status ? parseStatusZPathCollection(status) : { paths: [], renderedLines: [] };
}

function resolveScopeFlag(options: CliOptions): { mode: ScopeFlagMode; args: string[] } | null {
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

function resolveEffectiveScopeMode(options: CliOptions): ScopeFlagMode {
  if (options.commit) {
    return 'commit';
  }
  if (options.base) {
    return 'base';
  }
  return 'uncommitted';
}

function buildReviewArgs(options: CliOptions, prompt: string, opts: ReviewArgsOptions): string[] {
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
): { command: string; args: string[] } {
  return resolveRuntimeCodexCommand(reviewArgs, context);
}

function buildScopeNotes(options: CliOptions, scopePathCollection: ReviewScopePathCollection): string[] {
  const lines: string[] = [];
  const scopePaths = scopePathCollection.paths;
  const renderedScopeLines = scopePathCollection.renderedLines;

  if (options.commit) {
    lines.push(`Review scope hint: commit \`${options.commit}\``);
  } else if (options.base) {
    lines.push(`Review scope hint: diff vs base \`${options.base}\``);
  } else {
    lines.push('Review scope hint: uncommitted working tree changes (default).');
  }

  if (scopePaths.length > 0) {
    lines.push('', `Review scope paths (${scopePaths.length}):`, '```', ...renderedScopeLines, '```');
  } else {
    lines.push('', 'Review scope paths: unavailable or empty.');
  }

  return lines;
}

function resolveLargeScopeFileThreshold(): number {
  const configured = process.env[REVIEW_LARGE_SCOPE_FILE_THRESHOLD_ENV_KEY]?.trim();
  if (!configured) {
    return DEFAULT_LARGE_SCOPE_FILE_THRESHOLD;
  }
  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${REVIEW_LARGE_SCOPE_FILE_THRESHOLD_ENV_KEY} must be a positive integer.`);
  }
  return parsed;
}

function resolveLargeScopeLineThreshold(): number {
  const configured = process.env[REVIEW_LARGE_SCOPE_LINE_THRESHOLD_ENV_KEY]?.trim();
  if (!configured) {
    return DEFAULT_LARGE_SCOPE_LINE_THRESHOLD;
  }
  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${REVIEW_LARGE_SCOPE_LINE_THRESHOLD_ENV_KEY} must be a positive integer.`);
  }
  return parsed;
}

function parseNumstatLineDelta(numstatOutput: string): number {
  let total = 0;
  for (const rawLine of numstatOutput.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const [added, deleted] = line.split(/\s+/u);
    const addCount = Number(added);
    const delCount = Number(deleted);
    total += Number.isFinite(addCount) ? addCount : 0;
    total += Number.isFinite(delCount) ? delCount : 0;
  }
  return total;
}

function parseNullDelimitedPaths(raw: string): string[] {
  return raw.split('\u0000').filter((entry) => entry.length > 0);
}

async function countWorkingTreeFileLines(relativePath: string): Promise<number> {
  const absolutePath = path.resolve(repoRoot, relativePath);
  try {
    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      return 0;
    }
  } catch {
    return 0;
  }

  return await new Promise<number>((resolve) => {
    const stream = createReadStream(absolutePath);
    let sawData = false;
    let sawBinaryByte = false;
    let newlineCount = 0;
    let lastByte = 0;
    let settled = false;

    const settle = (value: number) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    stream.once('error', () => settle(0));
    stream.on('data', (chunk: Buffer | string) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      if (!buffer || buffer.length === 0) {
        return;
      }
      sawData = true;
      if (buffer.includes(0x00)) {
        sawBinaryByte = true;
        stream.destroy();
        return;
      }
      for (const byte of buffer.values()) {
        if (byte === 0x0a) {
          newlineCount += 1;
        }
      }
      lastByte = buffer[buffer.length - 1] ?? lastByte;
    });
    stream.once('close', () => {
      if (!sawData || sawBinaryByte) {
        settle(0);
      }
    });
    stream.once('end', () => {
      if (!sawData || sawBinaryByte) {
        settle(0);
        return;
      }
      settle(newlineCount + (lastByte === 0x0a ? 0 : 1));
    });
  });
}

async function countWorkingTreeLines(paths: string[]): Promise<number> {
  let total = 0;
  for (const relativePath of paths) {
    total += await countWorkingTreeFileLines(relativePath);
  }
  return total;
}

async function assessReviewScope(options: CliOptions): Promise<ReviewScopeAssessment> {
  const mode = resolveEffectiveScopeMode(options);
  const fileThreshold = resolveLargeScopeFileThreshold();
  const lineThreshold = resolveLargeScopeLineThreshold();

  if (mode !== 'uncommitted') {
    return {
      mode,
      changedFiles: null,
      changedLines: null,
      largeScope: false,
      fileThreshold,
      lineThreshold
    };
  }

  const status = await tryGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const diff = await tryGit(['diff', '--numstat']);
  const cachedDiff = await tryGit(['diff', '--cached', '--numstat']);
  const untracked = await tryGit(['ls-files', '--others', '--exclude-standard', '-z']);
  const untrackedPaths = untracked ? parseNullDelimitedPaths(untracked) : [];
  const untrackedLines = untrackedPaths.length > 0 ? await countWorkingTreeLines(untrackedPaths) : null;

  const changedFiles = status ? parseStatusZPaths(status).length : null;
  let changedLines: number | null = null;
  if (diff || cachedDiff || untrackedLines !== null) {
    changedLines = 0;
    if (diff) {
      changedLines += parseNumstatLineDelta(diff);
    }
    if (cachedDiff) {
      changedLines += parseNumstatLineDelta(cachedDiff);
    }
    if (untrackedLines !== null) {
      changedLines += untrackedLines;
    }
  }

  const exceedsFileThreshold = changedFiles !== null && changedFiles >= fileThreshold;
  const exceedsLineThreshold = changedLines !== null && changedLines >= lineThreshold;

  return {
    mode,
    changedFiles,
    changedLines,
    largeScope: exceedsFileThreshold || exceedsLineThreshold,
    fileThreshold,
    lineThreshold
  };
}

function formatScopeMetrics(scope: ReviewScopeAssessment): string | null {
  const parts: string[] = [];
  if (scope.changedFiles !== null) {
    parts.push(`${scope.changedFiles} files`);
  }
  if (scope.changedLines !== null) {
    parts.push(`${scope.changedLines} lines`);
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(', ');
}

interface ReviewArtifactPaths {
  reviewDir: string;
  promptPath: string;
  outputLogPath: string;
  telemetryPath: string;
}

function resolveReviewArtifactsDir(manifestPath: string): string {
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

async function prepareReviewArtifacts(manifestPath: string, prompt: string): Promise<ReviewArtifactPaths> {
  const reviewDir = resolveReviewArtifactsDir(manifestPath);
  await mkdir(reviewDir, { recursive: true });

  const promptPath = path.join(reviewDir, 'prompt.txt');
  const outputLogPath = path.join(reviewDir, 'output.log');
  const telemetryPath = path.join(reviewDir, 'telemetry.json');

  await writeFile(promptPath, `${prompt}\n`, 'utf8');

  return { reviewDir, promptPath, outputLogPath, telemetryPath };
}

interface ReviewFailureIssueLogOptions {
  enabled: boolean;
  error: unknown;
  taskFilter: string | null;
  manifestPath: string;
  outputLogPath: string;
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
    `Manifest: ${path.relative(repoRoot, options.manifestPath)}`,
    `Output log: ${path.relative(repoRoot, options.outputLogPath)}`
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

function allowHeavyReviewCommands(): boolean {
  return envFlagEnabled(process.env[REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY]);
}

function enforceBoundedReviewMode(): boolean {
  return envFlagEnabled(process.env[REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY]);
}

function shouldForceNonInteractive(): boolean {
  const stdinIsTTY = process.stdin?.isTTY === true;
  return (
    !stdinIsTTY ||
    envFlagEnabled(process.env.CI) ||
    envFlagEnabled(process.env.CODEX_REVIEW_NON_INTERACTIVE) ||
    envFlagEnabled(process.env.CODEX_NON_INTERACTIVE) ||
    envFlagEnabled(process.env.CODEX_NO_INTERACTIVE) ||
    envFlagEnabled(process.env.CODEX_NONINTERACTIVE)
  );
}

function resolveReviewTimeoutMs(): number | null {
  const configured = process.env.CODEX_REVIEW_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return null;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error('CODEX_REVIEW_TIMEOUT_SECONDS must be a finite number.');
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

function resolveReviewStallTimeoutMs(): number | null {
  const configured = process.env.CODEX_REVIEW_STALL_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return null;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error('CODEX_REVIEW_STALL_TIMEOUT_SECONDS must be a finite number.');
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

function resolveReviewStartupLoopTimeoutMs(): number | null {
  const configured = process.env.CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return null;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error('CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS must be a finite number.');
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

function resolveReviewStartupLoopMinEvents(): number {
  const configured = process.env.CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS?.trim();
  if (!configured) {
    return DEFAULT_REVIEW_STARTUP_LOOP_MIN_EVENTS;
  }

  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error('CODEX_REVIEW_STARTUP_LOOP_MIN_EVENTS must be a positive integer.');
  }
  return parsed;
}

function resolveReviewMonitorIntervalMs(): number | null {
  const configured = process.env[REVIEW_MONITOR_INTERVAL_ENV_KEY]?.trim();
  if (!configured) {
    return DEFAULT_REVIEW_MONITOR_INTERVAL_SECONDS * 1000;
  }

  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_MONITOR_INTERVAL_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

function resolveReviewLowSignalTimeoutMs(): number | null {
  const configured = process.env[REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY]?.trim();
  if (!configured) {
    return 180_000;
  }
  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

function resolveReviewVerdictStabilityTimeoutMs(): number | null {
  const configured = process.env[REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY]?.trim();
  if (!configured) {
    return 180_000;
  }
  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_VERDICT_STABILITY_TIMEOUT_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
}

function resolveReviewMetaSurfaceTimeoutMs(): number | null {
  const configured = process.env[REVIEW_META_SURFACE_TIMEOUT_ENV_KEY]?.trim();
  if (!configured) {
    return 180_000;
  }
  const parsedSeconds = Number(configured);
  if (!Number.isFinite(parsedSeconds)) {
    throw new Error(`${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY} must be a finite number.`);
  }
  if (parsedSeconds <= 0) {
    return null;
  }
  return Math.round(parsedSeconds * 1000);
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

async function tryGit(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, { maxBuffer: 1024 * 1024, cwd: repoRoot });
    const trimmed = String(stdout ?? '').trimEnd();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
