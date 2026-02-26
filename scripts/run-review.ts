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
import { createInterface } from 'node:readline';
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
import { collectManifests, resolveEnvironmentPaths } from './lib/run-manifests.js';

const execFileAsync = promisify(execFile);
const { repoRoot, runsRoot: defaultRunsDir } = resolveEnvironmentPaths();
const DEFAULT_REVIEW_STARTUP_LOOP_MIN_EVENTS = 8;
const DEFAULT_REVIEW_MONITOR_INTERVAL_SECONDS = 60;
const DEFAULT_LARGE_SCOPE_FILE_THRESHOLD = 25;
const DEFAULT_LARGE_SCOPE_LINE_THRESHOLD = 1200;
const REVIEW_COMMAND_CHECK_TIMEOUT_MS = 30_000;
const REVIEW_ARTIFACTS_DIRNAME = 'review';
const REVIEW_OUTPUT_PREVIEW_LIMIT = 32_768;
const BENIGN_STDIO_ERROR_CODES = new Set(['EPIPE', 'ERR_STREAM_DESTROYED']);
const REVIEW_AUTO_ISSUE_LOG_ENV_KEY = 'CODEX_REVIEW_AUTO_ISSUE_LOG';
const REVIEW_ENABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_ENABLE_DELEGATION_MCP';
const REVIEW_DISABLE_DELEGATION_MCP_ENV_KEY = 'CODEX_REVIEW_DISABLE_DELEGATION_MCP';
const REVIEW_MONITOR_INTERVAL_ENV_KEY = 'CODEX_REVIEW_MONITOR_INTERVAL_SECONDS';
const REVIEW_LARGE_SCOPE_FILE_THRESHOLD_ENV_KEY = 'CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD';
const REVIEW_LARGE_SCOPE_LINE_THRESHOLD_ENV_KEY = 'CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD';
const REVIEW_ALLOW_HEAVY_COMMANDS_ENV_KEY = 'CODEX_REVIEW_ALLOW_HEAVY_COMMANDS';
const REVIEW_ENFORCE_BOUNDED_MODE_ENV_KEY = 'CODEX_REVIEW_ENFORCE_BOUNDED_MODE';
const REVIEW_TELEMETRY_DEBUG_ENV_KEY = 'CODEX_REVIEW_DEBUG_TELEMETRY';
const REVIEW_DISABLE_DELEGATION_CONFIG_OVERRIDE = 'mcp_servers.delegation.enabled=false';
const REVIEW_DELEGATION_STARTUP_LINE_RE = /\bmcp:\s*delegation\s+(starting|ready)\b/i;
const REVIEW_PROGRESS_SIGNAL_LINE_RE = /^(thinking|exec|codex)\b/i;
const REVIEW_HEAVY_SCRIPT_TARGETS = new Set([
  'test',
  'lint',
  'build',
  'typecheck',
  'check',
  'docs:check',
  'docs:freshness'
]);
const REVIEW_PACKAGE_RUN_SUBCOMMAND_ALIASES = new Set(['run', 'run-script', 'rum', 'urn']);
const REVIEW_PACKAGE_TEST_SUBCOMMAND_ALIASES = new Set(['test', 't', 'tst']);
const REVIEW_SHELL_COMMANDS = new Set([
  'bash',
  'sh',
  'zsh',
  'ksh',
  'fish',
  'pwsh',
  'powershell',
  'cmd',
  'cmd.exe'
]);
const REVIEW_OUTPUT_SUMMARY_TAIL_LINE_LIMIT = 20;
const REVIEW_OUTPUT_SUMMARY_HEAVY_COMMAND_LIMIT = 8;
const REVIEW_OUTPUT_SUMMARY_COMMAND_LIMIT = 64;

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

function extractMarkdownSection(content: string, heading: string): string[] | null {
  const lines = content.split('\n');
  const headingLine = `## ${heading}`;
  const startIndex = lines.findIndex((line) => line.trim() === headingLine);
  if (startIndex === -1) {
    return null;
  }

  const body: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.trim().startsWith('## ')) {
      break;
    }
    body.push(line);
  }

  return body;
}

async function buildTaskContext(taskKey: string): Promise<string[]> {
  const checklistPath = await resolveTaskChecklistPath(taskKey);
  if (!checklistPath) {
    return [];
  }

  const relativeChecklist = path.relative(repoRoot, checklistPath);
  const checklist = await readFile(checklistPath, 'utf8');
  const headerBullets = extractTaskHeaderBulletLines(checklist);

  const lines: string[] = ['Task context:', `- Task checklist: \`${relativeChecklist}\``];
  for (const bullet of headerBullets) {
    lines.push(bullet);
  }

  const prdLine = headerBullets.find((line) => line.toLowerCase().includes('primary prd:'));
  const prdPath = prdLine ? extractBacktickedPath(prdLine) : null;
  if (prdPath) {
    const absPrdPath = path.resolve(repoRoot, prdPath);
    if (await pathExists(absPrdPath)) {
      const prd = await readFile(absPrdPath, 'utf8');
      const summary = extractMarkdownSection(prd, 'Summary');
      const summaryBullets =
        summary
          ?.map((line) => line.trimEnd())
          .filter((line) => line.trim().startsWith('- '))
          .slice(0, 6) ?? [];
      if (summaryBullets.length > 0) {
        lines.push('', `PRD summary (\`${prdPath}\`):`, ...summaryBullets);
      }
    }
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
    const envManifest = process.env.MANIFEST ?? process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
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
  const taskLabel = options.task ?? process.env.MCP_RUNNER_TASK_ID ?? process.env.TASK ?? 'unknown-task';
  const notes = resolveReviewNotes({
    notes: process.env.NOTES?.trim(),
    taskLabel,
    relativeManifest
  });
  const diffBudgetOverride = process.env.DIFF_BUDGET_OVERRIDE_REASON?.trim();

  const promptLines = [
    `Review task: ${taskLabel}`,
    `Evidence manifest: ${relativeManifest}`,
  ];

  const taskKey = options.task ?? process.env.MCP_RUNNER_TASK_ID ?? process.env.TASK;
  if (taskKey) {
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
    '- The solution is minimal and avoids unnecessary abstraction/scope',
    '- README/SOP docs match the implemented behavior',
    '- Commands/scripts are non-interactive (no TTY prompts)',
    '- Evidence + checklist mirroring requirements are satisfied',
    '',
    'Call out any remaining documentation/code mismatches or guardrail violations.'
  );
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
    promptLines.push(
      '',
      'Execution constraints (bounded review mode):',
      '- Keep this review focused on changed files and nearby dependencies.',
      '- Avoid full validation suites (for example `npm run test`, `npm run lint`, `npm run build`) during this pass.',
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

  if (diffBudgetOverride) {
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
  const autoIssueLogEnabled = options.autoIssueLog ?? false;

  const runReview = async (resolved: { command: string; args: string[] }) =>
    runCodexReview({
      command: resolved.command,
      args: resolved.args,
      env: runtimeContext.env,
      stdio: nonInteractive ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
      blockHeavyCommands: enforceBoundedMode,
      timeoutMs,
      stallTimeoutMs,
      startupLoopTimeoutMs,
      startupLoopMinEvents,
      monitorIntervalMs,
      outputLogPath: artifactPaths.outputLogPath
    });
  const writeTelemetry = async (
    status: 'succeeded' | 'failed',
    errorMessage?: string | null
  ): Promise<ReviewOutputSummary | null> => {
    try {
      return await persistReviewTelemetry({
        telemetryPath: artifactPaths.telemetryPath,
        outputLogPath: artifactPaths.outputLogPath,
        status,
        error: errorMessage ?? null
      });
    } catch (telemetryError) {
      const telemetryMessage = telemetryError instanceof Error ? telemetryError.message : String(telemetryError);
      console.error(`[run-review] failed to persist review telemetry: ${telemetryMessage}`);
      return null;
    }
  };

  try {
    await runReview(resolvedScoped);
    const telemetrySummary = await writeTelemetry('succeeded');
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
        await runReview(resolvedUnscoped);
        const telemetrySummary = await writeTelemetry('succeeded');
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
        const telemetrySummary = await writeTelemetry('failed', retryMessage);
        if (telemetrySummary) {
          logReviewTelemetrySummary(telemetrySummary, artifactPaths.telemetryPath);
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
    const telemetrySummary = await writeTelemetry('failed', errorMessage);
    if (telemetrySummary) {
      logReviewTelemetrySummary(telemetrySummary, artifactPaths.telemetryPath);
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
  const details: string[] = [];

  if (options.commit) {
    lines.push(`Review scope hint: commit \`${options.commit}\``);
    const summary = await tryGit([
      'show',
      '--no-color',
      '--name-status',
      '--no-patch',
      '--format=medium',
      options.commit
    ]);
    if (summary) {
      details.push(summary);
    }
  } else if (options.base) {
    lines.push(`Review scope hint: diff vs base \`${options.base}\``);
    const diff = await tryGit(['diff', '--no-color', '--name-status', `${options.base}...HEAD`]);
    if (diff) {
      details.push(diff);
    }
  } else {
    lines.push('Review scope hint: uncommitted working tree changes (default).');
    const status = await tryGit(['status', '--porcelain=v1', '-b']);
    if (status) {
      details.push(status);
    }
  }

  if (details.length > 0) {
    lines.push('', 'Git scope summary:', '```', ...details, '```');
  } else {
    lines.push('', 'Git scope summary: unavailable (git command failed).');
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

function parseStatusPathCount(statusOutput: string): number {
  const paths = new Set<string>();
  for (const rawLine of statusOutput.split(/\r?\n/u)) {
    const line = rawLine.trimEnd();
    if (!line) {
      continue;
    }
    if (line.startsWith('## ')) {
      continue;
    }
    const pathPortion = line.slice(3).trim();
    if (!pathPortion) {
      continue;
    }
    const currentPath = pathPortion.includes(' -> ')
      ? pathPortion.split(' -> ').at(-1)?.trim() ?? pathPortion
      : pathPortion;
    if (currentPath) {
      paths.add(currentPath);
    }
  }
  return paths.size;
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

  const status = await tryGit(['status', '--porcelain=v1']);
  const diff = await tryGit(['diff', '--numstat']);
  const cachedDiff = await tryGit(['diff', '--cached', '--numstat']);
  const untracked = await tryGit(['ls-files', '--others', '--exclude-standard', '-z']);
  const untrackedPaths = untracked ? parseNullDelimitedPaths(untracked) : [];
  const untrackedLines = untrackedPaths.length > 0 ? await countWorkingTreeLines(untrackedPaths) : null;

  const changedFiles = status ? parseStatusPathCount(status) : null;
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
  const runDir = configuredRunDir && configuredRunDir.length > 0 ? configuredRunDir : path.dirname(manifestPath);
  return path.join(runDir, REVIEW_ARTIFACTS_DIRNAME);
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

interface ReviewOutputSummary {
  lineCount: number;
  commandStarts: string[];
  completionCount: number;
  startupEvents: number;
  reviewProgressSignals: number;
  heavyCommandStarts: string[];
  lastLines: string[];
}

interface PersistReviewTelemetryOptions {
  telemetryPath: string;
  outputLogPath: string;
  status: 'succeeded' | 'failed';
  error?: string | null;
}

function normalizeReviewCommandLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) {
    return '';
  }
  const succeededIndex = trimmed.indexOf(' succeeded in ');
  if (succeededIndex >= 0) {
    return trimmed.slice(0, succeededIndex).trimEnd();
  }
  const exitedIndex = trimmed.indexOf(' exited ');
  if (exitedIndex >= 0) {
    return trimmed.slice(0, exitedIndex).trimEnd();
  }
  return trimmed;
}

function splitShellControlSegments(command: string): string[] {
  if (!command.trim()) {
    return [];
  }
  const segments: string[] = [];
  let current = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      segments.push(trimmed);
    }
    current = '';
  };

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] ?? '';
    const next = command[index + 1] ?? '';

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === ';' || char === '\n') {
      pushCurrent();
      continue;
    }

    if (char === '&') {
      if (next === '&') {
        pushCurrent();
        index += 1;
        continue;
      }
      pushCurrent();
      continue;
    }

    if (char === '|') {
      if (next === '|') {
        pushCurrent();
        index += 1;
        continue;
      }
      pushCurrent();
      continue;
    }

    current += char;
  }

  pushCurrent();
  return segments;
}

function tokenizeShellSegment(segment: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const pushCurrent = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = '';
    }
  };

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index] ?? '';

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (/\s/u.test(char)) {
      pushCurrent();
      continue;
    }

    current += char;
  }

  pushCurrent();
  return tokens;
}

function normalizeCommandToken(token: string): string {
  const normalized = token.trim().replace(/\\/gu, '/');
  const basename = normalized.split('/').pop() ?? normalized;
  return basename.replace(/\.(?:exe|cmd|bat|ps1)$/i, '').toLowerCase();
}

function stripLeadingEnvAssignments(tokens: string[]): string[] {
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    index += 1;
  }
  return tokens.slice(index);
}

function packageOptionConsumesValue(option: string): boolean {
  if (/^--(?:prefix|workspace|filter|cwd)$/iu.test(option)) {
    return true;
  }
  if (/^-(?:C|w)$/iu.test(option)) {
    return true;
  }
  return false;
}

function resolvePackageScriptTarget(args: string[]): string | null {
  let index = 0;
  while (index < args.length) {
    const token = args[index] ?? '';
    const normalized = token.toLowerCase();

    if (normalized === '--') {
      const fallback = args[index + 1];
      return fallback ? fallback.toLowerCase() : null;
    }

    if (REVIEW_PACKAGE_TEST_SUBCOMMAND_ALIASES.has(normalized)) {
      return 'test';
    }

    if (REVIEW_PACKAGE_RUN_SUBCOMMAND_ALIASES.has(normalized)) {
      index += 1;
      while (index < args.length) {
        const candidate = args[index] ?? '';
        const candidateNormalized = candidate.toLowerCase();
        if (candidateNormalized === '--') {
          index += 1;
          continue;
        }
        if (candidate.startsWith('-')) {
          index += packageOptionConsumesValue(candidate) ? 2 : 1;
          continue;
        }
        return candidateNormalized;
      }
      return null;
    }

    if (token.startsWith('-')) {
      index += packageOptionConsumesValue(token) ? 2 : 1;
      continue;
    }

    return normalized;
  }
  return null;
}

function unwrapEnvCommandTokens(tokens: string[]): string[] {
  if (tokens.length === 0 || normalizeCommandToken(tokens[0] ?? '') !== 'env') {
    return tokens;
  }

  let index = 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();

    if (token === '--') {
      index += 1;
      break;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      index += 1;
      continue;
    }

    if (normalized === '-u' || normalized === '--unset') {
      index += 2;
      continue;
    }

    if (normalized.startsWith('--unset=')) {
      index += 1;
      continue;
    }

    if (token.startsWith('-')) {
      index += 1;
      continue;
    }

    break;
  }

  return tokens.slice(index);
}

function hasHeavyCommandTokens(tokens: string[]): boolean {
  if (tokens.length === 0) {
    return false;
  }
  const unwrappedTokens = unwrapEnvCommandTokens(tokens);
  if (unwrappedTokens.length === 0) {
    return false;
  }

  if (unwrappedTokens.length !== tokens.length) {
    return hasHeavyCommandTokens(unwrappedTokens);
  }

  const command = normalizeCommandToken(unwrappedTokens[0] ?? '');
  const args = unwrappedTokens.slice(1);

  if (command === 'npm' || command === 'pnpm' || command === 'yarn' || command === 'bun') {
    const scriptTarget = resolvePackageScriptTarget(args);
    return scriptTarget !== null && REVIEW_HEAVY_SCRIPT_TARGETS.has(scriptTarget);
  }

  if (command === 'pytest') {
    return true;
  }

  if (command === 'python' || command === 'python3' || command === 'py') {
    for (let index = 0; index < args.length - 1; index += 1) {
      if ((args[index] ?? '').toLowerCase() !== '-m') {
        continue;
      }
      if (normalizeCommandToken(args[index + 1] ?? '') === 'pytest') {
        return true;
      }
    }
  }

  const firstArg = normalizeCommandToken(args[0] ?? '');
  if (command === 'go' && firstArg === 'test') {
    return true;
  }
  if (command === 'cargo' && firstArg === 'test') {
    return true;
  }
  if (command === 'mvn' || command === 'mvnw' || command === 'gradle' || command === 'gradlew') {
    return args.some((arg) => {
      const normalized = normalizeCommandToken(arg);
      return normalized === 'test' || normalized.endsWith(':test');
    });
  }

  return false;
}

function isShellCommandFlagWithPayload(flag: string): boolean {
  const normalized = flag.toLowerCase();
  if (normalized === '/c' || normalized === '-c') {
    return true;
  }
  return /^-[^-]*c[^-]*$/u.test(normalized);
}

function extractShellCommandPayload(tokens: string[]): string | null {
  if (tokens.length < 2) {
    return null;
  }
  const command = normalizeCommandToken(tokens[0] ?? '');
  if (!REVIEW_SHELL_COMMANDS.has(command)) {
    return null;
  }
  for (let index = 1; index < tokens.length; index += 1) {
    if (!isShellCommandFlagWithPayload(tokens[index] ?? '')) {
      continue;
    }
    if (command === 'cmd') {
      const payload = tokens.slice(index + 1).join(' ').trim();
      return payload.length > 0 ? payload : null;
    }
    const payload = tokens[index + 1];
    return payload ? payload.trim() : null;
  }
  return null;
}

function detectHeavyReviewCommandFromSegment(segment: string, depth = 0): string | null {
  const tokens = stripLeadingEnvAssignments(tokenizeShellSegment(segment));
  if (tokens.length === 0) {
    return null;
  }

  if (depth < 3) {
    const payload = extractShellCommandPayload(tokens);
    if (payload) {
      const nestedSegments = splitShellControlSegments(payload);
      for (const nestedSegment of nestedSegments) {
        const nestedHeavyCommand = detectHeavyReviewCommandFromSegment(nestedSegment, depth + 1);
        if (nestedHeavyCommand) {
          return nestedHeavyCommand;
        }
      }
    }
  }

  return hasHeavyCommandTokens(tokens) ? segment.trim() : null;
}

function detectHeavyReviewCommand(line: string): string | null {
  const segments = splitShellControlSegments(line);
  for (const segment of segments) {
    const heavyCommand = detectHeavyReviewCommandFromSegment(segment);
    if (heavyCommand) {
      return heavyCommand;
    }
  }
  return null;
}

function isLikelyReviewCommandLine(line: string): boolean {
  if (!line) {
    return false;
  }
  if (detectHeavyReviewCommand(line)) {
    return true;
  }
  if (/^(?:npm|pnpm|yarn|bun|node|npx|git|bash|sh|zsh|python|pytest|go|cargo|mvn|gradle(?:w)?)\b/i.test(line)) {
    return true;
  }
  if (line.includes(' in ') && /\s-\w+\s+/u.test(line)) {
    return true;
  }
  return false;
}

async function summarizeReviewOutputLog(outputLogPath: string): Promise<ReviewOutputSummary | null> {
  if (!(await pathExists(outputLogPath))) {
    return null;
  }

  const lineReader = createInterface({
    input: createReadStream(outputLogPath, { encoding: 'utf8' }),
    crlfDelay: Infinity
  });

  const commandStarts: string[] = [];
  const heavyCommandStarts: string[] = [];
  const lastLines: string[] = [];
  let lineCount = 0;
  let completionCount = 0;
  let startupEvents = 0;
  let reviewProgressSignals = 0;
  let awaitingCommandLine = false;

  for await (const rawLine of lineReader) {
    lineCount += 1;
    const line = String(rawLine ?? '').trimEnd();
    const trimmed = line.trim();

    if (trimmed.length > 0) {
      lastLines.push(trimmed);
      if (lastLines.length > REVIEW_OUTPUT_SUMMARY_TAIL_LINE_LIMIT) {
        lastLines.shift();
      }
    }

    if (REVIEW_DELEGATION_STARTUP_LINE_RE.test(trimmed)) {
      startupEvents += 1;
    }
    if (REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed)) {
      reviewProgressSignals += 1;
    }

    if (trimmed === 'exec') {
      awaitingCommandLine = true;
      continue;
    }

    if (awaitingCommandLine && trimmed.length > 0) {
      const commandLine = normalizeReviewCommandLine(trimmed);
      if (isLikelyReviewCommandLine(commandLine)) {
        if (commandStarts.length >= REVIEW_OUTPUT_SUMMARY_COMMAND_LIMIT) {
          commandStarts.shift();
        }
        commandStarts.push(commandLine);
        if (detectHeavyReviewCommand(commandLine)) {
          if (heavyCommandStarts.length < REVIEW_OUTPUT_SUMMARY_HEAVY_COMMAND_LIMIT) {
            heavyCommandStarts.push(commandLine);
          }
        }
        awaitingCommandLine = false;
      } else if (REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed) || /\bsucceeded in\b|\bexited\b/i.test(trimmed)) {
        awaitingCommandLine = false;
      }
    }

    if (/\bsucceeded in\b|\bexited\b/i.test(trimmed)) {
      completionCount += 1;
    }
  }

  return {
    lineCount,
    commandStarts,
    completionCount,
    startupEvents,
    reviewProgressSignals,
    heavyCommandStarts,
    lastLines
  };
}

async function persistReviewTelemetry(options: PersistReviewTelemetryOptions): Promise<ReviewOutputSummary | null> {
  const summary = await summarizeReviewOutputLog(options.outputLogPath);
  const includeRawTelemetry = envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]);
  const persistedSummary = sanitizeTelemetrySummaryForPersistence(
    summary,
    includeRawTelemetry
  );
  const payload = {
    version: 1,
    generated_at: new Date().toISOString(),
    status: options.status,
    error: sanitizeTelemetryErrorForPersistence(options.error ?? null, includeRawTelemetry),
    output_log_path: path.relative(repoRoot, options.outputLogPath),
    summary: persistedSummary
  };
  await writeFile(options.telemetryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return summary;
}

function sanitizeTelemetrySummaryForPersistence(
  summary: ReviewOutputSummary | null,
  includeRawTelemetry: boolean
): ReviewOutputSummary | null {
  if (!summary || includeRawTelemetry) {
    return summary;
  }
  return {
    ...summary,
    commandStarts: redactTelemetryLines(summary.commandStarts, 'command'),
    heavyCommandStarts: redactTelemetryLines(summary.heavyCommandStarts, 'heavy-command'),
    lastLines: redactTelemetryLines(summary.lastLines, 'output-line')
  };
}

function redactTelemetryLines(lines: string[], label: string): string[] {
  return lines.map(
    (_line, index) =>
      `[redacted ${label} ${index + 1}; set ${REVIEW_TELEMETRY_DEBUG_ENV_KEY}=1 to persist raw values]`
  );
}

function sanitizeTelemetryErrorForPersistence(error: string | null, includeRawTelemetry: boolean): string | null {
  if (!error || includeRawTelemetry) {
    return error;
  }
  return `[redacted error; set ${REVIEW_TELEMETRY_DEBUG_ENV_KEY}=1 to persist raw values]`;
}

function logReviewTelemetrySummary(summary: ReviewOutputSummary, telemetryPath: string): void {
  const debugTelemetry = envFlagEnabled(process.env[REVIEW_TELEMETRY_DEBUG_ENV_KEY]);
  console.error(
    `[run-review] review telemetry: ${summary.commandStarts.length} command start(s), ${summary.heavyCommandStarts.length} heavy command start(s), ${summary.startupEvents} delegation startup event(s), ${summary.reviewProgressSignals} review progress signal(s).`
  );
  const lastCommand = summary.commandStarts.at(-1);
  if (lastCommand) {
    if (debugTelemetry) {
      console.error(`[run-review] last command started: ${lastCommand}`);
    } else {
      console.error(
        `[run-review] last command started: [redacted] (set ${REVIEW_TELEMETRY_DEBUG_ENV_KEY}=1 to print raw command text).`
      );
    }
  }
  if (summary.completionCount < summary.commandStarts.length) {
    console.error(
      `[run-review] command completions observed: ${summary.completionCount}; possible in-flight command at termination.`
    );
  }
  if (summary.heavyCommandStarts.length > 0) {
    if (debugTelemetry) {
      console.error(`[run-review] heavy commands detected: ${summary.heavyCommandStarts.join(' | ')}`);
    } else {
      console.error(
        `[run-review] heavy commands detected: ${summary.heavyCommandStarts.length} sample(s) captured (set ${REVIEW_TELEMETRY_DEBUG_ENV_KEY}=1 to print raw command text).`
      );
    }
  }
  if (summary.lastLines.length > 0) {
    if (debugTelemetry) {
      console.error(`[run-review] output tail: ${summary.lastLines.join(' || ')}`);
    } else {
      console.error(
        `[run-review] output tail captured: ${summary.lastLines.length} line(s) hidden by default (set ${REVIEW_TELEMETRY_DEBUG_ENV_KEY}=1 to print raw tail).`
      );
    }
  }
  console.error(`[run-review] review telemetry saved to: ${path.relative(repoRoot, telemetryPath)}`);
}

class CodexReviewError extends Error {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  outputPreview: string;

  constructor(
    message: string,
    options: {
      exitCode: number | null;
      signal: NodeJS.Signals | null;
      timedOut: boolean;
      outputPreview: string;
    }
  ) {
    super(message);
    this.name = 'CodexReviewError';
    this.exitCode = options.exitCode;
    this.signal = options.signal;
    this.timedOut = options.timedOut;
    this.outputPreview = options.outputPreview;
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
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  startupLoopTimeoutMs: number | null;
  startupLoopMinEvents: number;
  monitorIntervalMs: number | null;
  outputLogPath: string;
}

interface ReviewStartupLoopState {
  startupEvents: number;
  reviewProgressObserved: boolean;
  pendingStdoutFragment: string;
  pendingStderrFragment: string;
}

interface ReviewCommandSignalState {
  awaitingCommandLine: boolean;
  pendingStdoutFragment: string;
  pendingStderrFragment: string;
  blockedHeavyCommand: string | null;
}

function trackReviewStartupLoopSignals(
  chunk: string,
  state: ReviewStartupLoopState,
  stream: 'stdout' | 'stderr'
): void {
  if (state.reviewProgressObserved) {
    return;
  }

  const pendingFragment = stream === 'stdout'
    ? state.pendingStdoutFragment
    : state.pendingStderrFragment;
  const combined = `${pendingFragment}${chunk}`;
  const lines = combined.split(/\r?\n/u);
  const nextPendingFragment = lines.pop() ?? '';
  if (stream === 'stdout') {
    state.pendingStdoutFragment = nextPendingFragment;
  } else {
    state.pendingStderrFragment = nextPendingFragment;
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (REVIEW_DELEGATION_STARTUP_LINE_RE.test(trimmed)) {
      state.startupEvents += 1;
      continue;
    }
    if (REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed)) {
      state.reviewProgressObserved = true;
      return;
    }
  }
}

function trackReviewCommandSignals(
  chunk: string,
  state: ReviewCommandSignalState,
  stream: 'stdout' | 'stderr',
  blockHeavyCommands: boolean
): void {
  const pendingFragment = stream === 'stdout'
    ? state.pendingStdoutFragment
    : state.pendingStderrFragment;
  const combined = `${pendingFragment}${chunk}`;
  const lines = combined.split(/\r?\n/u);
  const nextPendingFragment = lines.pop() ?? '';
  if (stream === 'stdout') {
    state.pendingStdoutFragment = nextPendingFragment;
  } else {
    state.pendingStderrFragment = nextPendingFragment;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed === 'exec') {
      state.awaitingCommandLine = true;
      continue;
    }
    if (!state.awaitingCommandLine) {
      continue;
    }
    const commandLine = normalizeReviewCommandLine(trimmed);
    if (!isLikelyReviewCommandLine(commandLine)) {
      if (REVIEW_PROGRESS_SIGNAL_LINE_RE.test(trimmed) || /\bsucceeded in\b|\bexited\b/i.test(trimmed)) {
        state.awaitingCommandLine = false;
      }
      continue;
    }
    state.awaitingCommandLine = false;
    if (blockHeavyCommands && detectHeavyReviewCommand(commandLine) && !state.blockedHeavyCommand) {
      state.blockedHeavyCommand = commandLine;
    }
  }
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

async function runCodexReview(options: RunCodexReviewOptions): Promise<{ preview: string }> {
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
  let preview = '';
  let lastOutputAtMs = Date.now();
  const startupLoopState: ReviewStartupLoopState = {
    startupEvents: 0,
    reviewProgressObserved: false,
    pendingStdoutFragment: '',
    pendingStderrFragment: ''
  };
  const commandSignalState: ReviewCommandSignalState = {
    awaitingCommandLine: false,
    pendingStdoutFragment: '',
    pendingStderrFragment: '',
    blockedHeavyCommand: null
  };

  const capture = (chunk: Buffer, target: NodeJS.WriteStream, stream: 'stdout' | 'stderr') => {
    lastOutputAtMs = Date.now();
    if (!outputStream.writableEnded && !outputStream.destroyed) {
      outputStream.write(chunk);
    }
    writeToStreamSafely(target, chunk);
    const next = chunk.toString('utf8');
    trackReviewStartupLoopSignals(next, startupLoopState, stream);
    trackReviewCommandSignals(next, commandSignalState, stream, options.blockHeavyCommands);
    if (preview.length < REVIEW_OUTPUT_PREVIEW_LIMIT) {
      preview = `${preview}${next}`.slice(0, REVIEW_OUTPUT_PREVIEW_LIMIT);
    }
  };

  const onStdout = (chunk: Buffer) => capture(chunk, process.stdout, 'stdout');
  const onStderr = (chunk: Buffer) => capture(chunk, process.stderr, 'stderr');
  child.stdout?.on('data', onStdout);
  child.stderr?.on('data', onStderr);

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
      blockHeavyCommands: options.blockHeavyCommands,
      getLastOutputAtMs: () => lastOutputAtMs,
      getStartupLoopState: () => startupLoopState,
      getBlockedHeavyCommand: () => commandSignalState.blockedHeavyCommand,
      detached,
      onCleanup: cleanup
    });
    await outputClosed;
    return { preview };
  } catch (error) {
    cleanup();
    await outputClosed;
    if (error instanceof CodexReviewError) {
      error.outputPreview = preview || error.outputPreview;
    }
    throw error;
  }
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

function formatDurationMs(durationMs: number): string {
  const roundedMs = Math.max(0, Math.round(durationMs));
  if (roundedMs < 1000) {
    return `${roundedMs}ms`;
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m ${seconds}s`;
}

interface WaitForChildExitOptions {
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  startupLoopTimeoutMs: number | null;
  startupLoopMinEvents: number;
  monitorIntervalMs: number | null;
  blockHeavyCommands: boolean;
  getLastOutputAtMs: () => number;
  getStartupLoopState: () => ReviewStartupLoopState;
  getBlockedHeavyCommand: () => string | null;
  detached: boolean;
  onCleanup?: () => void;
}

async function waitForChildExit(
  child: ChildProcess,
  options: WaitForChildExitOptions
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let timeoutHandle: NodeJS.Timeout | undefined;
    let stallHandle: NodeJS.Timeout | undefined;
    let startupLoopHandle: NodeJS.Timeout | undefined;
    let monitorHandle: NodeJS.Timeout | undefined;
    let heavyCommandHandle: NodeJS.Timeout | undefined;
    let killHandle: NodeJS.Timeout | undefined;
    let hardKillArmed = false;
    const startMs = Date.now();

    const cleanup = () => {
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
      if (heavyCommandHandle) {
        clearInterval(heavyCommandHandle);
      }
      if (killHandle && !hardKillArmed) {
        clearTimeout(killHandle);
      }
      child.removeListener('error', onError);
      child.removeListener('close', onClose);
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
      cleanup();
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
    };

    child.once('error', onError);
    child.once('close', onClose);

    const requestTermination = (message: string, timedOut = true) => {
      if (settled) {
        return;
      }

      signalChildProcess(child, 'SIGTERM', options.detached);
      hardKillArmed = true;
      killHandle = setTimeout(() => {
        if (child.exitCode === null) {
          signalChildProcess(child, 'SIGKILL', options.detached);
        }
      }, 5000);
      killHandle.unref();

      settleWithError(
        new CodexReviewError(message, {
          exitCode: 1,
          signal: null,
          timedOut,
          outputPreview: ''
        })
      );
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

    const monitorIntervalMs = options.monitorIntervalMs;
    if (monitorIntervalMs !== null) {
      const checkpointIntervalMs = Math.max(1000, monitorIntervalMs);
      monitorHandle = setInterval(() => {
        const elapsedMs = Date.now() - startMs;
        const idleMs = Date.now() - options.getLastOutputAtMs();
        const state = options.getStartupLoopState();
        const startupStatus = state.reviewProgressObserved
          ? 'review progress observed'
          : `${state.startupEvents} delegation startup events, no review progress yet`;
        console.log(
          `[run-review] waiting on codex review (${formatDurationMs(
            elapsedMs
          )} elapsed, ${formatDurationMs(idleMs)} idle; ${startupStatus}).`
        );
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
  relativeManifest: string;
}): string {
  if (options.notes) {
    return options.notes;
  }
  const fallback =
    `Goal: standalone review handoff | ` +
    `Summary: auto-generated NOTES fallback (task=${options.taskLabel}, manifest=${options.relativeManifest}) | ` +
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
  --non-interactive              Force non-interactive Codex review mode.
  --auto-issue-log[=true|false]  Capture issue bundle on failure.
  --enable-delegation-mcp[=true|false]   Enable delegation MCP for this review run.
  --disable-delegation-mcp[=true|false]  Disable delegation MCP for this review run.
  -h, --help                     Show this help.

Environment:
  NOTES (recommended)            Goal/summary/risks context. If omitted, wrapper generates fallback notes.
  MANIFEST                       Alternative manifest path source.
  MCP_RUNNER_TASK_ID / TASK      Task id fallback when --task is omitted.
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
