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
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { resolveCodexCommand } from '../orchestrator/src/cli/utils/devtools.js';
import { parseArgs as parseCliArgs, hasFlag } from './lib/cli-args.js';
import { pathExists } from './lib/docs-helpers.js';
import { collectManifests, resolveEnvironmentPaths } from './lib/run-manifests.js';

const execFileAsync = promisify(execFile);
const { repoRoot, runsRoot: defaultRunsDir } = resolveEnvironmentPaths();
const DEFAULT_NON_INTERACTIVE_REVIEW_TIMEOUT_SECONDS = 15 * 60;
const DEFAULT_NON_INTERACTIVE_REVIEW_STALL_TIMEOUT_SECONDS = 10 * 60;
const REVIEW_COMMAND_CHECK_TIMEOUT_MS = 30_000;
const REVIEW_ARTIFACTS_DIRNAME = 'review';
const REVIEW_OUTPUT_PREVIEW_LIMIT = 32_768;
const BENIGN_STDIO_ERROR_CODES = new Set(['EPIPE', 'ERR_STREAM_DESTROYED']);

interface CliOptions {
  manifest?: string;
  runsDir: string;
  task?: string;
  base?: string;
  commit?: string;
  title?: string;
  uncommitted?: boolean;
  nonInteractive?: boolean;
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

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { runsDir: defaultRunsDir };
  const { args, entries } = parseCliArgs(argv);

  for (const entry of entries) {
    if (entry.key === 'manifest' && typeof entry.value === 'string') {
      options.manifest = path.resolve(repoRoot, entry.value);
    } else if (entry.key === 'runs-dir' && typeof entry.value === 'string') {
      options.runsDir = path.resolve(repoRoot, entry.value);
    } else if (entry.key === 'task' && typeof entry.value === 'string') {
      options.task = entry.value;
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
    }
  }

  if (hasFlag(args, 'uncommitted')) {
    options.uncommitted = true;
  }
  if (hasFlag(args, 'non-interactive')) {
    options.nonInteractive = true;
  }

  if (!options.manifest) {
    const envManifest = process.env.MANIFEST ?? process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    if (envManifest && envManifest.trim().length > 0) {
      options.manifest = path.resolve(repoRoot, envManifest.trim());
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
  if (shouldRunDiffBudget()) {
    await runDiffBudget(options);
  } else {
    console.log('[run-review] skipping diff budget (already executed by pipeline).');
  }
  const manifestPath = await resolveManifestPath(options);

  await ensureReviewCommandAvailable();

  const relativeManifest = path.relative(repoRoot, manifestPath);
  const taskLabel = process.env.TASK ?? process.env.MCP_RUNNER_TASK_ID ?? options.task ?? 'unknown-task';
  const notes = process.env.NOTES?.trim();
  const diffBudgetOverride = process.env.DIFF_BUDGET_OVERRIDE_REASON?.trim();
  requireReviewNotes(notes);

  const promptLines = [
    `Review task: ${taskLabel}`,
    `Evidence manifest: ${relativeManifest}`,
  ];

  const taskKey = process.env.MCP_RUNNER_TASK_ID ?? options.task ?? process.env.TASK;
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

  const scopeNotes = await buildScopeNotes(options);
  if (scopeNotes.length > 0) {
    promptLines.push('', ...scopeNotes);
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

  await ensureReviewCommandAvailable();
  const scopedReviewArgs = buildReviewArgs(options, prompt, { includeScopeFlags: true });
  const resolvedScoped = resolveReviewCommand(scopedReviewArgs);
  console.log(`Review prompt saved to: ${path.relative(repoRoot, artifactPaths.promptPath)}`);
  console.log(`Review output log: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
  console.log(`Launching Codex review (evidence: ${relativeManifest})`);
  const timeoutMs = resolveReviewTimeoutMs(nonInteractive);
  if (timeoutMs !== null) {
    console.log(
      `[run-review] enforcing codex review timeout at ${Math.round(timeoutMs / 1000)}s (set CODEX_REVIEW_TIMEOUT_SECONDS=0 to disable).`
    );
  }
  const stallTimeoutMs = resolveReviewStallTimeoutMs(nonInteractive);
  if (stallTimeoutMs !== null) {
    console.log(
      `[run-review] enforcing codex review stall timeout at ${Math.round(
        stallTimeoutMs / 1000
      )}s of no output (set CODEX_REVIEW_STALL_TIMEOUT_SECONDS=0 to disable).`
    );
  }

  try {
    await runCodexReview({
      command: resolvedScoped.command,
      args: resolvedScoped.args,
      env: reviewEnv,
      stdio: nonInteractive ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
      timeoutMs,
      stallTimeoutMs,
      outputLogPath: artifactPaths.outputLogPath
    });
    console.log(`Review output saved to: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
  } catch (error) {
    if (shouldRetryWithoutScopeFlags(error)) {
      console.log('[run-review] codex CLI rejected scope flags with a custom prompt; retrying without flags.');
      const unscopedArgs = buildReviewArgs(options, prompt, { includeScopeFlags: false });
      const resolvedUnscoped = resolveReviewCommand(unscopedArgs);
      await runCodexReview({
        command: resolvedUnscoped.command,
        args: resolvedUnscoped.args,
        env: reviewEnv,
        stdio: nonInteractive ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
        timeoutMs,
        stallTimeoutMs,
        outputLogPath: artifactPaths.outputLogPath
      });
      console.log(`Review output saved to: ${path.relative(repoRoot, artifactPaths.outputLogPath)}`);
      return;
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

async function ensureReviewCommandAvailable(): Promise<void> {
  const resolved = resolveCodexCommand(['--help'], process.env);
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

type ScopeFlagMode = 'uncommitted' | 'base' | 'commit';

interface ReviewArgsOptions {
  includeScopeFlags: boolean;
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

function buildReviewArgs(options: CliOptions, prompt: string, opts: ReviewArgsOptions): string[] {
  const args = ['review'];
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

function resolveReviewCommand(reviewArgs: string[]): { command: string; args: string[] } {
  return resolveCodexCommand(reviewArgs, process.env);
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

interface ReviewArtifactPaths {
  reviewDir: string;
  promptPath: string;
  outputLogPath: string;
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

  await writeFile(promptPath, `${prompt}\n`, 'utf8');

  return { reviewDir, promptPath, outputLogPath };
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
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  outputLogPath: string;
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
  let preview = '';
  let lastOutputAtMs = Date.now();

  const capture = (chunk: Buffer, target: NodeJS.WriteStream) => {
    lastOutputAtMs = Date.now();
    if (!outputStream.writableEnded && !outputStream.destroyed) {
      outputStream.write(chunk);
    }
    writeToStreamSafely(target, chunk);
    if (preview.length < REVIEW_OUTPUT_PREVIEW_LIMIT) {
      const next = chunk.toString('utf8');
      preview = `${preview}${next}`.slice(0, REVIEW_OUTPUT_PREVIEW_LIMIT);
    }
  };

  const onStdout = (chunk: Buffer) => capture(chunk, process.stdout);
  const onStderr = (chunk: Buffer) => capture(chunk, process.stderr);
  child.stdout?.on('data', onStdout);
  child.stderr?.on('data', onStderr);

  const cleanup = () => {
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
      getLastOutputAtMs: () => lastOutputAtMs,
      detached,
      onCleanup: cleanup
    });
    return { preview };
  } catch (error) {
    cleanup();
    if (error instanceof CodexReviewError) {
      error.outputPreview = preview || error.outputPreview;
    }
    throw error;
  }
}

async function runDiffBudget(options: CliOptions): Promise<void> {
  const args = ['scripts/diff-budget.mjs'];

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

function resolveReviewTimeoutMs(nonInteractive: boolean): number | null {
  const configured = process.env.CODEX_REVIEW_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return nonInteractive ? DEFAULT_NON_INTERACTIVE_REVIEW_TIMEOUT_SECONDS * 1000 : null;
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

function resolveReviewStallTimeoutMs(nonInteractive: boolean): number | null {
  const configured = process.env.CODEX_REVIEW_STALL_TIMEOUT_SECONDS?.trim();
  if (!configured) {
    return nonInteractive ? DEFAULT_NON_INTERACTIVE_REVIEW_STALL_TIMEOUT_SECONDS * 1000 : null;
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

interface WaitForChildExitOptions {
  timeoutMs: number | null;
  stallTimeoutMs: number | null;
  getLastOutputAtMs: () => number;
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
    let killHandle: NodeJS.Timeout | undefined;
    let hardKillArmed = false;

    const cleanup = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (stallHandle) {
        clearInterval(stallHandle);
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

    const requestTermination = (message: string) => {
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
          timedOut: true,
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

function requireReviewNotes(notes: string | undefined): asserts notes is string {
  if (!notes) {
    throw new Error('NOTES is required for reviews. Set NOTES="<goal + summary + risks + optional questions>" before running.');
  }
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
