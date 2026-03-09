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
import type { ChildProcess, StdioOptions } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
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
import { normalizeTaskKey, pathExists } from './lib/docs-helpers.js';
import {
  formatDurationMs,
  logReviewTelemetrySummary as logReviewExecutionTelemetrySummary,
  persistReviewTelemetry as persistReviewExecutionTelemetry,
  ReviewExecutionState,
  type ReviewCommandIntentBoundaryState,
  type ReviewOutputSummary,
  type ReviewStartupLoopState
} from './lib/review-execution-state.js';
import { parseNameStatusPaths, parseStatusZPaths } from './lib/review-scope-paths.js';
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
const REVIEW_META_SURFACE_TIMEOUT_ENV_KEY = 'CODEX_REVIEW_META_SURFACE_TIMEOUT_SECONDS';
const REVIEW_TELEMETRY_DEBUG_ENV_KEY = 'CODEX_REVIEW_DEBUG_TELEMETRY';
const REVIEW_SURFACE_ENV_KEY = 'CODEX_REVIEW_SURFACE';
const REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE = 'mcp_servers.delegation.enabled=false';
type ReviewSurface = 'diff' | 'audit';

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

interface TaskIndexEntry {
  id?: string;
  slug?: string;
  path?: string;
  relates_to?: string;
  paths?: {
    task?: string;
  };
}

async function readTaskIndexEntries(): Promise<TaskIndexEntry[]> {
  const taskIndexPath = path.join(repoRoot, 'tasks', 'index.json');
  if (!(await pathExists(taskIndexPath))) {
    return [];
  }

  try {
    const raw = await readFile(taskIndexPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? (parsed.items as TaskIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function extractTaskChecklistCandidate(item: TaskIndexEntry): string | null {
  const directTaskPath =
    typeof item.paths?.task === 'string'
      ? item.paths.task.trim()
      : typeof item.relates_to === 'string'
      ? item.relates_to.trim()
      : '';
  if (directTaskPath.length > 0) {
    return directTaskPath;
  }

  const legacyPath = typeof item.path === 'string' ? item.path.trim() : '';
  const candidate =
    /(?:^|\/)tasks-[0-9]{4}-[A-Za-z0-9-]+\.md$/u.test(legacyPath) ? legacyPath : '';
  return candidate.length > 0 ? candidate : null;
}

async function resolveRegisteredTaskChecklistPath(taskKey: string): Promise<string | null> {
  const items = await readTaskIndexEntries();
  if (items.length === 0) {
    return null;
  }

  const keyedItems = items
    .map((item) => ({
      key: normalizeTaskKey(item),
      checklistPath: extractTaskChecklistCandidate(item)
    }))
    .filter(
      (entry): entry is { key: string; checklistPath: string } =>
        typeof entry.key === 'string' &&
        entry.key.length > 0 &&
        typeof entry.checklistPath === 'string' &&
        entry.checklistPath.length > 0
    )
    .sort((left, right) => right.key.length - left.key.length);

  const exact = keyedItems.find((entry) => entry.key === taskKey);
  const prefix = keyedItems.find((entry) => taskKey.startsWith(`${entry.key}-`));
  const selected = exact ?? prefix;
  if (!selected) {
    return null;
  }

  const absolute = path.resolve(repoRoot, selected.checklistPath);
  return (await pathExists(absolute)) ? absolute : null;
}

async function resolveTaskChecklistPath(taskKey: string): Promise<string | null> {
  const direct = path.join(repoRoot, 'tasks', `tasks-${taskKey}.md`);
  if (await pathExists(direct)) {
    return direct;
  }

  if (!/^\d{4}$/.test(taskKey)) {
    return null;
  }

  const tasksDir = path.join(repoRoot, 'tasks');
  let entries: string[] = [];
  try {
    entries = await readdir(tasksDir);
  } catch {
    return null;
  }

  const candidates = entries
    .filter((name) => name.startsWith(`tasks-${taskKey}-`) && name.endsWith('.md'))
    .map((name) => path.join(tasksDir, name))
    .sort();

  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  return null;
}

function extractTaskHeaderBulletLines(taskChecklist: string): string[] {
  const lines = taskChecklist.split('\n');
  const checklistIndex = lines.findIndex((line) => line.trim() === '## Checklist');
  const headerLines = checklistIndex === -1 ? lines : lines.slice(0, checklistIndex);
  return headerLines
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith('- '));
}

function extractBacktickedPath(line: string): string | null {
  const match = line.match(/`([^`]+)`/);
  return match?.[1] ?? null;
}

async function buildTaskContext(taskKey: string): Promise<string[]> {
  const checklistPath =
    (await resolveRegisteredTaskChecklistPath(taskKey)) ?? (await resolveTaskChecklistPath(taskKey));
  if (!checklistPath) {
    return [];
  }

  const relativeChecklist = path.relative(repoRoot, checklistPath);
  const checklist = await readFile(checklistPath, 'utf8');
  const headerBullets = extractTaskHeaderBulletLines(checklist);

  const lines: string[] = ['Task context:', `- Task checklist: \`${relativeChecklist}\``];
  const prdLine = headerBullets.find((line) => line.toLowerCase().includes('primary prd:'));
  const prdPath = prdLine ? extractBacktickedPath(prdLine) : null;
  if (prdPath) {
    lines.push(`- Primary PRD: \`${prdPath}\``);
  }

  return lines;
}

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
    throw new Error(`${label} requires a value. Expected one of: diff, audit.`);
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'diff' || normalized === 'audit') {
    return normalized;
  }
  throw new Error(`Invalid ${label} value "${raw}". Expected one of: diff, audit.`);
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
  const manifestTask = inferTaskFromManifestPath(manifestPath);
  const envTask = process.env.MCP_RUNNER_TASK_ID ?? process.env.TASK;
  const taskKey = options.task ?? envTask ?? manifestTask;
  const taskLabel = taskKey ?? 'unknown-task';
  const reviewSurface = options.surface ?? 'diff';
  const notes = resolveReviewNotes({
    notes: process.env.NOTES?.trim(),
    taskLabel,
    surface: reviewSurface
  });
  const diffBudgetOverride = process.env.DIFF_BUDGET_OVERRIDE_REASON?.trim();
  const promptLines = [`Review task: ${taskLabel}`, `Review surface: ${reviewSurface}`];

  if (reviewSurface === 'audit') {
    promptLines.push(`Evidence manifest: ${relativeManifest}`);
  }

  if (reviewSurface === 'audit' && taskKey) {
    const contextLines = await buildTaskContext(taskKey);
    if (contextLines.length > 0) {
      promptLines.push('', ...contextLines);
    }
  }

  if (notes) {
    promptLines.push('', 'Agent notes:', notes);
  }

  promptLines.push(
    '',
    'Please review the current changes and confirm:',
    '- The solution is minimal and avoids unnecessary abstraction/scope'
  );
  if (reviewSurface === 'audit') {
    promptLines.push(
      '- README/SOP docs match the implemented behavior',
      '- Commands/scripts are non-interactive (no TTY prompts)',
      '- Evidence + checklist mirroring requirements are satisfied',
      '',
      'Call out any remaining documentation/code mismatches or guardrail violations.'
    );
  } else {
    promptLines.push(
      '- Behavior remains correct for changed files and nearby dependencies',
      '- Call out concrete regressions, risky edge cases, or missing tests in the changed area',
      '',
      'Keep this pass diff-focused. Do not audit checklist/docs/evidence surfaces unless they are directly required to assess code correctness.'
    );
  }
  const allowHeavyCommands = allowHeavyReviewCommands();
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
    const boundedFocusLine =
      reviewSurface === 'audit'
        ? '- Keep this review focused on the requested audit surfaces, supporting evidence, and directly related code/docs paths.'
        : '- Keep this review focused on changed files and nearby dependencies.';
    promptLines.push(
      '',
      'Execution constraints (bounded review mode):',
      boundedFocusLine,
      '- Avoid full validation suites (for example `npm run test`, `npm run lint`, `npm run build`, `npm run docs:check`, `npm run docs:freshness`) during this pass.',
      '- Do not launch direct validation runners (for example `npx vitest`, `npm exec jest`) or nested review/pipeline/delegation flows during this pass.',
      '- If broader validation would improve confidence, list follow-up commands instead of executing them.'
    );
  }

  const scopeNotes = await buildScopeNotes(options);
  if (scopeNotes.length > 0) {
    promptLines.push('', ...scopeNotes);
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
  const metaSurfaceTimeoutMs = !allowHeavyCommands ? resolveReviewMetaSurfaceTimeoutMs() : null;
  const allowedMetaSurfaceKinds =
    reviewSurface === 'audit'
      ? (['run-manifest', 'run-runner-log'] as const)
      : ([] as const);
  const touchedPaths = await collectReviewScopePaths(options);
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
    if (metaSurfaceTimeoutMs === null) {
      console.log(
        `[run-review] meta-surface expansion guard disabled (${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0).`
      );
    } else if (allowedMetaSurfaceKinds.length > 0) {
      console.log(
        `[run-review] meta-surface expansion guard enabled after ${formatDurationMs(
          metaSurfaceTimeoutMs
        )} of sustained off-task meta activity; allowed audit meta surfaces: ${allowedMetaSurfaceKinds.join(
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
  }
  const autoIssueLogEnabled = options.autoIssueLog ?? false;

  const runReview = async (resolved: { command: string; args: string[] }) =>
    runCodexReview({
      command: resolved.command,
      args: resolved.args,
      env: runtimeContext.env,
      stdio: nonInteractive ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
      blockHeavyCommands: enforceBoundedMode,
      allowValidationCommandIntents: allowHeavyCommands,
      timeoutMs,
      stallTimeoutMs,
      startupLoopTimeoutMs,
      startupLoopMinEvents,
      monitorIntervalMs,
      lowSignalTimeoutMs,
      metaSurfaceTimeoutMs,
      allowedMetaSurfaceKinds: [...allowedMetaSurfaceKinds],
      touchedPaths,
      outputLogPath: artifactPaths.outputLogPath
    });
  const writeTelemetry = async (
    state: ReviewExecutionState,
    status: 'succeeded' | 'failed',
    errorMessage?: string | null
  ): Promise<ReviewOutputSummary | null> => {
    try {
      return await persistReviewExecutionTelemetry({
        state,
        telemetryPath: artifactPaths.telemetryPath,
        outputLogPath: artifactPaths.outputLogPath,
        repoRoot,
        status,
        error: errorMessage ?? null,
        includeRawTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
        telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY
      });
    } catch (telemetryError) {
      const telemetryMessage = telemetryError instanceof Error ? telemetryError.message : String(telemetryError);
      console.error(`[run-review] failed to persist review telemetry: ${telemetryMessage}`);
      return null;
    }
  };

  try {
    const execution = await runReview(resolvedScoped);
    const telemetrySummary = await writeTelemetry(execution.state, 'succeeded');
    console.log(`Review output saved to: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
    if (telemetrySummary) {
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
        const telemetrySummary = await writeTelemetry(retryExecution.state, 'succeeded');
        console.log(`Review output saved to: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
        if (telemetrySummary) {
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
        const telemetrySummary = retryState
          ? await writeTelemetry(retryState, 'failed', retryMessage)
          : null;
        if (telemetrySummary) {
          logReviewExecutionTelemetrySummary(
            telemetrySummary,
            path.relative(repoRoot, artifactPaths.telemetryPath),
            {
              debugTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
              telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY
            }
          );
        }
        if (retryError instanceof CodexReviewError && retryError.timedOut) {
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
    const telemetrySummary = failureState
      ? await writeTelemetry(failureState, 'failed', errorMessage)
      : null;
    if (telemetrySummary) {
      logReviewExecutionTelemetrySummary(
        telemetrySummary,
        path.relative(repoRoot, artifactPaths.telemetryPath),
        {
          debugTelemetry: envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]),
          telemetryDebugEnvKey: REVIEW_TELEMETRY_DEBUG_ENV_KEY
        }
      );
    }
    if (error instanceof CodexReviewError && error.timedOut) {
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

type ScopeFlagMode = 'uncommitted' | 'base' | 'commit';

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

async function collectReviewScopePaths(options: CliOptions): Promise<string[]> {
  if (options.commit) {
    const summary = await tryGit(['show', '--no-color', '--name-status', '--format=', options.commit]);
    return summary ? parseNameStatusPaths(summary) : [];
  }
  if (options.base) {
    const diff = await tryGit(['diff', '--no-color', '--name-status', `${options.base}...HEAD`]);
    return diff ? parseNameStatusPaths(diff) : [];
  }
  const status = await tryGit(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  return status ? parseStatusZPaths(status) : [];
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

async function buildScopeNotes(options: CliOptions): Promise<string[]> {
  const lines: string[] = [];
  const scopePaths = [...new Set(await collectReviewScopePaths(options))].sort();

  if (options.commit) {
    lines.push(`Review scope hint: commit \`${options.commit}\``);
  } else if (options.base) {
    lines.push(`Review scope hint: diff vs base \`${options.base}\``);
  } else {
    lines.push('Review scope hint: uncommitted working tree changes (default).');
  }

  if (scopePaths.length > 0) {
    lines.push('', `Review scope paths (${scopePaths.length}):`, '```', ...scopePaths, '```');
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

class CodexReviewError extends Error {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  outputPreview: string;
  reviewState: ReviewExecutionState | null;

  constructor(
    message: string,
    options: {
      exitCode: number | null;
      signal: NodeJS.Signals | null;
      timedOut: boolean;
      outputPreview: string;
      reviewState?: ReviewExecutionState | null;
    }
  ) {
    super(message);
    this.name = 'CodexReviewError';
    this.exitCode = options.exitCode;
    this.signal = options.signal;
    this.timedOut = options.timedOut;
    this.outputPreview = options.outputPreview;
    this.reviewState = options.reviewState ?? null;
  }
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

interface RunCodexReviewOptions {
  command: string;
  args: string[];
  env: Record<string, string | undefined>;
  stdio: StdioOptions;
  blockHeavyCommands: boolean;
  allowValidationCommandIntents: boolean;
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  startupLoopTimeoutMs: number | null;
  startupLoopMinEvents: number;
  monitorIntervalMs: number | null;
  lowSignalTimeoutMs: number | null;
  metaSurfaceTimeoutMs: number | null;
  allowedMetaSurfaceKinds: string[];
  touchedPaths: string[];
  outputLogPath: string;
}

function installSignalForwarders(child: ChildProcess, detached: boolean): () => void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  const handlers = new Map<NodeJS.Signals, () => void>();

  const uninstall = () => {
    for (const [signal, handler] of handlers.entries()) {
      process.removeListener(signal, handler);
    }
    handlers.clear();
  };

  for (const signal of signals) {
    const handler = () => {
      signalChildProcess(child, signal, detached);
      uninstall();
      try {
        process.kill(process.pid, signal);
      } catch {
        process.exitCode = signal === 'SIGINT' ? 130 : 143;
      }
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }

  return uninstall;
}

function writeToStreamSafely(target: NodeJS.WriteStream, chunk: Buffer): void {
  if (target.destroyed || target.writableEnded) {
    return;
  }

  try {
    target.write(chunk, (error?: Error | null) => {
      if (!error) {
        return;
      }
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (typeof code === 'string' && BENIGN_STDIO_ERROR_CODES.has(code)) {
        return;
      }
      // Best effort only; stdout/stderr mirroring should not fail the run.
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (typeof code === 'string' && BENIGN_STDIO_ERROR_CODES.has(code)) {
      return;
    }
    throw error;
  }
}

async function runCodexReview(
  options: RunCodexReviewOptions
): Promise<{ preview: string; state: ReviewExecutionState }> {
  const detached = process.platform !== 'win32';
  const child: ChildProcess = spawn(options.command, options.args, {
    stdio: options.stdio,
    env: options.env,
    cwd: repoRoot,
    detached
  });

  const outputStream = createWriteStream(options.outputLogPath, { flags: 'w' });
  const outputClosed = new Promise<void>((resolve) => {
    outputStream.once('close', () => resolve());
    outputStream.once('error', () => resolve());
  });
  const uninstallSignalForwarders = installSignalForwarders(child, detached);
  const executionState = new ReviewExecutionState({
    blockHeavyCommands: options.blockHeavyCommands,
    allowValidationCommandIntents: options.allowValidationCommandIntents,
    lowSignalTimeoutMs: options.lowSignalTimeoutMs,
    metaSurfaceTimeoutMs: options.metaSurfaceTimeoutMs,
    allowedMetaSurfaceKinds: options.allowedMetaSurfaceKinds,
    touchedPaths: options.touchedPaths
  });

  const capture = (chunk: Buffer, target: NodeJS.WriteStream, stream: 'stdout' | 'stderr') => {
    if (!outputStream.writableEnded && !outputStream.destroyed) {
      outputStream.write(chunk);
    }
    writeToStreamSafely(target, chunk);
    executionState.observeChunk(chunk, stream);
  };

  const onStdout = (chunk: Buffer) => capture(chunk, process.stdout, 'stdout');
  const onStderr = (chunk: Buffer) => capture(chunk, process.stderr, 'stderr');
  child.stdout?.on('data', onStdout);
  child.stderr?.on('data', onStderr);
  const outputDrainPromise = Promise.all([
    waitForReadableClosure(child.stdout),
    waitForReadableClosure(child.stderr)
  ]).then(() => undefined);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    uninstallSignalForwarders();
    child.stdout?.off('data', onStdout);
    child.stderr?.off('data', onStderr);
    try {
      outputStream.end();
    } catch {
      // ignore best-effort close
    }
  };

  try {
    await waitForChildExit(child, {
      timeoutMs: options.timeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
      startupLoopTimeoutMs: options.startupLoopTimeoutMs,
      startupLoopMinEvents: options.startupLoopMinEvents,
      monitorIntervalMs: options.monitorIntervalMs,
      lowSignalTimeoutMs: options.lowSignalTimeoutMs,
      metaSurfaceTimeoutMs: options.metaSurfaceTimeoutMs,
      blockHeavyCommands: options.blockHeavyCommands,
      getLastOutputAtMs: () => executionState.getLastOutputAtMs(),
      getStartupLoopState: () => executionState.getStartupLoopState(),
      getBlockedHeavyCommand: () => executionState.getBlockedHeavyCommand(),
      getLowSignalDriftReason: () => executionState.getLowSignalDriftState().reason,
      getMetaSurfaceExpansionReason: () => executionState.getMetaSurfaceExpansionState().reason,
      getCommandIntentBoundaryState: () => executionState.getCommandIntentBoundaryState(),
      waitForOutputDrain: () => outputDrainPromise,
      formatCheckpoint: () => executionState.formatCheckpoint(),
      detached,
      onCleanup: cleanup
    });
    await outputClosed;
    return { preview: executionState.getPreview(), state: executionState };
  } catch (error) {
    cleanup();
    await outputClosed;
    if (error instanceof CodexReviewError) {
      error.outputPreview = executionState.getPreview() || error.outputPreview;
      error.reviewState = executionState;
      throw error;
    }
    const wrappedError = new CodexReviewError(
      error instanceof Error ? error.message : String(error),
      {
        exitCode: null,
        signal: null,
        timedOut: false,
        outputPreview: executionState.getPreview(),
        reviewState: executionState
      }
    );
    if (error instanceof Error && 'cause' in Error.prototype) {
      Object.defineProperty(wrappedError, 'cause', {
        value: error,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    throw wrappedError;
  }
}

function waitForReadableClosure(stream: NodeJS.ReadableStream | null | undefined): Promise<void> {
  if (!stream) {
    return Promise.resolve();
  }

  const readable = stream as NodeJS.ReadableStream & {
    readableEnded?: boolean;
    destroyed?: boolean;
  };
  if (readable.readableEnded || readable.destroyed) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const finish = () => {
      readable.off('end', finish);
      readable.off('close', finish);
      readable.off('error', finish);
      resolve();
    };
    readable.once('end', finish);
    readable.once('close', finish);
    readable.once('error', finish);
  });
}

async function waitForOutputSettlement(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
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

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function formatBoundedHeavyCommandFailure(blockedCommand: string): string {
  const guidance = `Set ${REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY}=1 to allow full validation commands.`;
  if (!envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY])) {
    return `codex review attempted heavy command in bounded mode. ${guidance}`;
  }
  return `codex review attempted heavy command in bounded mode: ${blockedCommand}. ${guidance}`;
}

function formatCommandIntentBoundaryFailure(boundaryState: ReviewCommandIntentBoundaryState): string {
  const guidance =
    'Bounded review should inspect and report, not launch explicit validation suites, direct validation runners, nested review flows, or mutating delegation control.';
  if (!boundaryState.violationKind) {
    return `codex review crossed the bounded command-intent boundary. ${guidance}`;
  }
  const kindLabel =
    boundaryState.violationKind === 'validation-suite'
      ? 'validation suite launch'
      : boundaryState.violationKind === 'validation-runner'
      ? 'direct validation runner launch'
      : boundaryState.violationKind === 'review-orchestration'
      ? 'nested review or pipeline launch'
      : 'delegation control activity';
  if (
    !envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]) ||
    !boundaryState.violationSample
  ) {
    return `codex review crossed the bounded command-intent boundary (${kindLabel}). ${guidance}`;
  }
  return `codex review crossed the bounded command-intent boundary (${kindLabel}): ${boundaryState.violationSample}. ${guidance}`;
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

interface WaitForChildExitOptions {
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  startupLoopTimeoutMs: number | null;
  startupLoopMinEvents: number;
  monitorIntervalMs: number | null;
  lowSignalTimeoutMs: number | null;
  metaSurfaceTimeoutMs: number | null;
  blockHeavyCommands: boolean;
  getLastOutputAtMs: () => number;
  getStartupLoopState: () => ReviewStartupLoopState;
  getBlockedHeavyCommand: () => string | null;
  getLowSignalDriftReason: () => string | null;
  getMetaSurfaceExpansionReason: () => string | null;
  getCommandIntentBoundaryState: () => ReviewCommandIntentBoundaryState;
  waitForOutputDrain: () => Promise<void>;
  formatCheckpoint: () => string;
  detached: boolean;
  onCleanup?: () => void;
}

async function waitForChildExit(
  child: ChildProcess,
  options: WaitForChildExitOptions
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let handlesCleared = false;
    let cleanupCompleted = false;
    let pendingTermination: CodexReviewError | null = null;
    let timeoutHandle: NodeJS.Timeout | undefined;
    let stallHandle: NodeJS.Timeout | undefined;
    let startupLoopHandle: NodeJS.Timeout | undefined;
    let monitorHandle: NodeJS.Timeout | undefined;
    let lowSignalHandle: NodeJS.Timeout | undefined;
    let metaSurfaceHandle: NodeJS.Timeout | undefined;
    let commandIntentHandle: NodeJS.Timeout | undefined;
    let heavyCommandHandle: NodeJS.Timeout | undefined;
    let killHandle: NodeJS.Timeout | undefined;
    let hardKillArmed = false;
    const startMs = Date.now();

    const clearHandles = () => {
      if (handlesCleared) {
        return;
      }
      handlesCleared = true;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (stallHandle) {
        clearInterval(stallHandle);
      }
      if (startupLoopHandle) {
        clearInterval(startupLoopHandle);
      }
      if (monitorHandle) {
        clearInterval(monitorHandle);
      }
      if (lowSignalHandle) {
        clearInterval(lowSignalHandle);
      }
      if (metaSurfaceHandle) {
        clearInterval(metaSurfaceHandle);
      }
      if (commandIntentHandle) {
        clearInterval(commandIntentHandle);
      }
      if (heavyCommandHandle) {
        clearInterval(heavyCommandHandle);
      }
      if (killHandle && !hardKillArmed) {
        clearTimeout(killHandle);
      }
      child.removeListener('error', onError);
      child.removeListener('close', onClose);
    };

    const cleanup = () => {
      if (cleanupCompleted) {
        return;
      }
      cleanupCompleted = true;
      clearHandles();
      options.onCleanup?.();
    };

    const settleWithError = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const onError = (error: Error) => {
      settleWithError(error instanceof Error ? error : new Error(String(error)));
    };

    const onClose = (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearHandles();
      void (async () => {
        try {
          await options.waitForOutputDrain();
        } catch {
          // Best-effort drain only; fall through to current runtime state.
        }
        await waitForOutputSettlement();
        cleanup();
        if (pendingTermination) {
          reject(pendingTermination);
          return;
        }
        const commandIntentBoundaryState = options.getCommandIntentBoundaryState();
        if (commandIntentBoundaryState.triggered) {
          reject(
            new CodexReviewError(formatCommandIntentBoundaryFailure(commandIntentBoundaryState), {
              exitCode: typeof code === 'number' && code > 0 ? code : 1,
              signal,
              timedOut: false,
              outputPreview: ''
            })
          );
          return;
        }
        const blockedCommand = options.getBlockedHeavyCommand();
        if (code === 0 && options.blockHeavyCommands && blockedCommand) {
          reject(
            new CodexReviewError(
              formatBoundedHeavyCommandFailure(blockedCommand),
              {
                exitCode: 1,
                signal: null,
                timedOut: false,
                outputPreview: ''
              }
            )
          );
          return;
        }
        if (code === 0) {
          resolve();
          return;
        }
        const suffix = signal ? ` (signal ${signal})` : '';
        reject(
          new CodexReviewError(`codex review exited with code ${code}${suffix}`, {
            exitCode: code,
            signal,
            timedOut: false,
            outputPreview: ''
          })
        );
      })();
    };

    child.once('error', onError);
    child.once('close', onClose);

    const requestTermination = (message: string, timedOut = true) => {
      if (settled || pendingTermination || child.exitCode !== null) {
        return;
      }

      pendingTermination = new CodexReviewError(message, {
        exitCode: 1,
        signal: null,
        timedOut,
        outputPreview: ''
      });
      signalChildProcess(child, 'SIGTERM', options.detached);
      hardKillArmed = true;
      killHandle = setTimeout(() => {
        if (child.exitCode === null) {
          signalChildProcess(child, 'SIGKILL', options.detached);
        }
      }, 5000);
      killHandle.unref();
    };

    const timeoutMs = options.timeoutMs;
    if (timeoutMs !== null) {
      timeoutHandle = setTimeout(() => {
        requestTermination(
          `codex review timed out after ${Math.round(timeoutMs / 1000)}s (set CODEX_REVIEW_TIMEOUT_SECONDS=0 to disable).`
        );
      }, timeoutMs);
      timeoutHandle.unref();
    }

    const stallTimeoutMs = options.stallTimeoutMs;
    if (stallTimeoutMs !== null) {
      const checkIntervalMs = Math.min(5000, Math.max(1000, Math.round(stallTimeoutMs / 4)));
      stallHandle = setInterval(() => {
        const idleMs = Date.now() - options.getLastOutputAtMs();
        if (idleMs < stallTimeoutMs) {
          return;
        }
        requestTermination(
          `codex review stalled with no output for ${Math.round(stallTimeoutMs / 1000)}s (set CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0 to disable).`
        );
      }, checkIntervalMs);
      stallHandle.unref();
    }

    const startupLoopTimeoutMs = options.startupLoopTimeoutMs;
    if (startupLoopTimeoutMs !== null && options.startupLoopMinEvents > 0) {
      const loopCheckIntervalMs = Math.min(5000, Math.max(1000, Math.round(startupLoopTimeoutMs / 6)));
      startupLoopHandle = setInterval(() => {
        if (Date.now() - startMs < startupLoopTimeoutMs) {
          return;
        }
        const state = options.getStartupLoopState();
        if (state.reviewProgressObserved || state.startupEvents < options.startupLoopMinEvents) {
          return;
        }
        requestTermination(
          `codex review appears stuck in delegation startup loop after ${Math.round(
            startupLoopTimeoutMs / 1000
          )}s (${state.startupEvents} startup events, no review progress). Set CODEX_REVIEW_STARTUP_LOOP_TIMEOUT_SECONDS=0 to disable.`
        );
      }, loopCheckIntervalMs);
      startupLoopHandle.unref();
    }

    if (options.blockHeavyCommands) {
      heavyCommandHandle = setInterval(() => {
        const blockedCommand = options.getBlockedHeavyCommand();
        if (!blockedCommand) {
          return;
        }
        requestTermination(formatBoundedHeavyCommandFailure(blockedCommand), false);
      }, 250);
      heavyCommandHandle.unref();
    }

    if (options.lowSignalTimeoutMs !== null) {
      lowSignalHandle = setInterval(() => {
        const lowSignalReason = options.getLowSignalDriftReason();
        if (!lowSignalReason) {
          return;
        }
        requestTermination(
          `${lowSignalReason} (set ${REVIEW_LOW_SIGNAL_TIMEOUT_ENV_KEY}=0 to disable).`,
          false
        );
      }, 1000);
      lowSignalHandle.unref();
    }

    if (options.metaSurfaceTimeoutMs !== null) {
      metaSurfaceHandle = setInterval(() => {
        const metaSurfaceReason = options.getMetaSurfaceExpansionReason();
        if (!metaSurfaceReason) {
          return;
        }
        requestTermination(
          `${metaSurfaceReason} (set ${REVIEW_META_SURFACE_TIMEOUT_ENV_KEY}=0 to disable).`,
          false
        );
      }, 1000);
      metaSurfaceHandle.unref();
    }

    commandIntentHandle = setInterval(() => {
      const boundaryState = options.getCommandIntentBoundaryState();
      if (!boundaryState.triggered) {
        return;
      }
      requestTermination(formatCommandIntentBoundaryFailure(boundaryState), false);
    }, 250);
    commandIntentHandle.unref();

    const monitorIntervalMs = options.monitorIntervalMs;
    if (monitorIntervalMs !== null) {
      const checkpointIntervalMs = Math.max(1000, monitorIntervalMs);
      monitorHandle = setInterval(() => {
        console.log(options.formatCheckpoint());
      }, checkpointIntervalMs);
      monitorHandle.unref();
    }
  });
}

function signalChildProcess(child: ChildProcess, signal: NodeJS.Signals, detached: boolean): void {
  if (detached && typeof child.pid === 'number' && child.pid > 0) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fallback to direct child signal below.
    }
  }
  try {
    child.kill(signal);
  } catch {
    // Best effort only.
  }
}

function resolveReviewNotes(options: {
  notes: string | undefined;
  taskLabel: string;
  surface: ReviewSurface;
}): string {
  if (options.notes) {
    return options.notes;
  }
  const fallback =
    `Goal: standalone review handoff | ` +
    `Summary: auto-generated NOTES fallback (task=${options.taskLabel}, surface=${options.surface}) | ` +
    'Risks: missing custom intent details may reduce review precision';
  console.warn(
    '[run-review] NOTES was not provided; using a generated fallback. ' +
      'Set NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." for higher-signal review context.'
  );
  return fallback;
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
  --surface <diff|audit>         Review surface (default: diff).
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
