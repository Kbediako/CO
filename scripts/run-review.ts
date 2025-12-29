#!/usr/bin/env node
/**
 * Helper to launch `codex review` non-interactively with the latest run manifest
 * path included as evidence for reviewers.
 *
 * Note: `codex-cli` currently rejects combining diff-scoping flags (`--uncommitted`,
 * `--base`, `--commit`) with a custom prompt. This wrapper always supplies a custom
 * prompt (to include manifest evidence), so it invokes `codex review <PROMPT>` and
 * embeds any requested scope hints (base/commit) into the prompt text instead.
 */

import { execFile, spawn } from 'node:child_process';
import type { ChildProcess, StdioOptions } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { resolveCodexCommand } from '../orchestrator/src/cli/utils/devtools.js';

const execFileAsync = promisify(execFile);

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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveTaskChecklistPath(taskKey: string): Promise<string | null> {
  const direct = path.join(process.cwd(), 'tasks', `tasks-${taskKey}.md`);
  if (await fileExists(direct)) {
    return direct;
  }

  if (!/^\d{4}$/.test(taskKey)) {
    return null;
  }

  const tasksDir = path.join(process.cwd(), 'tasks');
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

  const relativeChecklist = path.relative(process.cwd(), checklistPath);
  const checklist = await readFile(checklistPath, 'utf8');
  const headerBullets = extractTaskHeaderBulletLines(checklist);

  const lines: string[] = ['Task context:', `- Task checklist: \`${relativeChecklist}\``];
  for (const bullet of headerBullets) {
    lines.push(bullet);
  }

  const prdLine = headerBullets.find((line) => line.toLowerCase().includes('primary prd:'));
  const prdPath = prdLine ? extractBacktickedPath(prdLine) : null;
  if (prdPath) {
    const absPrdPath = path.resolve(process.cwd(), prdPath);
    if (await fileExists(absPrdPath)) {
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
  const options: CliOptions = { runsDir: path.join(process.cwd(), '.runs') };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      options.manifest = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--manifest=')) {
      options.manifest = arg.split('=')[1];
    } else if (arg === '--runs-dir') {
      options.runsDir = argv[index + 1] ?? options.runsDir;
      index += 1;
    } else if (arg.startsWith('--runs-dir=')) {
      options.runsDir = arg.split('=')[1];
    } else if (arg === '--task') {
      options.task = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--task=')) {
      options.task = arg.split('=')[1];
    } else if (arg === '--uncommitted') {
      options.uncommitted = true;
    } else if (arg === '--base') {
      options.base = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--base=')) {
      options.base = arg.split('=')[1];
    } else if (arg === '--commit') {
      options.commit = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--commit=')) {
      options.commit = arg.split('=')[1];
    } else if (arg === '--title') {
      options.title = argv[index + 1];
      index += 1;
    } else if (arg.startsWith('--title=')) {
      options.title = arg.split('=')[1];
    } else if (arg === '--non-interactive') {
      options.nonInteractive = true;
    }
  }

  if (!options.manifest) {
    const envManifest = process.env.MANIFEST ?? process.env.CODEX_ORCHESTRATOR_MANIFEST_PATH;
    if (envManifest && envManifest.trim().length > 0) {
      options.manifest = envManifest.trim();
    }
  }

  return options;
}

async function collectManifests(runsDir: string, taskFilter?: string): Promise<string[]> {
  const results: string[] = [];
  let taskIds: string[] = [];
  try {
    taskIds = await readdir(runsDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return results;
    }
    throw error;
  }

  for (const taskId of taskIds) {
    if (taskFilter && taskFilter !== taskId) {
      continue;
    }
    const taskPath = path.join(runsDir, taskId);
    const cliPath = path.join(taskPath, 'cli');
    const legacyPath = taskPath;

    const candidates: Array<{ root: string; runIds: string[] }> = [];
    try {
      const cliRunIds = await readdir(cliPath);
      candidates.push({ root: cliPath, runIds: cliRunIds });
    } catch {
      // Ignore missing CLI directory; fall back to legacy layout.
    }

    if (candidates.length === 0) {
      try {
        const legacyRunIds = await readdir(legacyPath);
        candidates.push({ root: legacyPath, runIds: legacyRunIds });
      } catch {
        continue;
      }
    }

    for (const candidate of candidates) {
      for (const runId of candidate.runIds) {
        const manifestPath = path.join(candidate.root, runId, 'manifest.json');
        results.push(manifestPath);
      }
    }
  }
  return results;
}

async function resolveManifestPath(options: CliOptions): Promise<string> {
  if (options.manifest) {
    return path.resolve(process.cwd(), options.manifest);
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

  if (!(await hasReviewCommand())) {
    throw new Error('codex CLI is missing the `review` subcommand (or is not installed).');
  }

  const relativeManifest = path.relative(process.cwd(), manifestPath);
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

  const reviewArgs = buildReviewArgs(options, promptLines.join('\n'));
  const { command, args } = resolveReviewCommand(reviewArgs);
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
    console.log(promptLines.join('\n'));
    console.log('---');
    console.log('Set FORCE_CODEX_REVIEW=1 to invoke `codex review` in this environment.');
    return;
  }
  console.log(`Launching Codex review (evidence: ${relativeManifest})`);
  const stdio: StdioOptions = nonInteractive ? ['ignore', 'inherit', 'inherit'] : 'inherit';
  const child: ChildProcess = spawn(command, args, { stdio, env: reviewEnv });

  await new Promise<void>((resolve, reject) => {
    child.once('error', (error: Error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`codex review exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  console.error('[run-review] failed:', error.message ?? error);
  process.exitCode = 1;
});

async function hasReviewCommand(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('codex', ['--help'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', () => resolve(false));
    child.once('close', () => {
      resolve(output.includes(' review'));
    });
  });
}

function buildReviewArgs(options: CliOptions, prompt: string): string[] {
  const args = ['review'];
  if (options.title) {
    args.push('--title', options.title);
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

async function runDiffBudget(options: CliOptions): Promise<void> {
  const args = ['scripts/diff-budget.mjs'];

  if (options.commit) {
    args.push('--commit', options.commit);
  } else if (options.base) {
    args.push('--base', options.base);
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('node', args, { stdio: 'inherit', env: process.env });
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
  return (
    envFlagEnabled(process.env.CI) ||
    envFlagEnabled(process.env.CODEX_REVIEW_NON_INTERACTIVE) ||
    envFlagEnabled(process.env.CODEX_NON_INTERACTIVE) ||
    envFlagEnabled(process.env.CODEX_NO_INTERACTIVE) ||
    envFlagEnabled(process.env.CODEX_NONINTERACTIVE)
  );
}

function requireReviewNotes(notes: string | undefined): asserts notes is string {
  if (!notes) {
    throw new Error('NOTES is required for reviews. Set NOTES="<goal + summary + risks + optional questions>" before running.');
  }
}

async function tryGit(args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, { maxBuffer: 1024 * 1024 });
    const trimmed = String(stdout ?? '').trimEnd();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
