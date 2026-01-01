#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { parseArgs, hasFlag } from './lib/cli-args.js';

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_FILES = 25;
const DEFAULT_MAX_LINES = 800;
const MAX_UNTRACKED_BYTES_FOR_LINE_COUNT = 1024 * 1024;

const IGNORED_EXACT_PATHS = new Set(['package-lock.json']);
const IGNORED_PREFIXES = [
  '.runs/',
  'archives/',
  'dist/',
  'node_modules/',
  'out/'
];

function showUsage() {
  console.log(`Usage: node scripts/diff-budget.mjs [--dry-run] [--commit <sha>] [--base <ref>] [--max-files <n>] [--max-lines <n>]

Guards against oversized diffs that are likely to hide unnecessary scope/complexity.

Defaults:
  --max-files ${DEFAULT_MAX_FILES}
  --max-lines ${DEFAULT_MAX_LINES}

Escape hatch:
  Set DIFF_BUDGET_OVERRIDE_REASON="<why this diff must be large>" to bypass (still prints the totals).

Base selection order:
  For --commit: uses the commit's own diff (ignores working tree state).
  For working-tree diffs:
  1) --base <ref>
  2) BASE_SHA env var (CI)
  3) origin/main (when available)
  4) initial commit

Options:
  --dry-run     Report failures without exiting non-zero
  --commit      Check the diff budget for a single commit (uses \`git show\`)
  --base        Git ref/sha to diff against
  --max-files   Maximum number of changed files (ignored paths excluded)
  --max-lines   Maximum total lines changed (additions + deletions; ignored paths excluded)
  -h, --help    Show this help message`);
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

async function verifyGitRef(ref) {
  if (!ref || String(ref).trim().length === 0) {
    return false;
  }
  try {
    await execFileAsync('git', ['rev-parse', '--verify', ref], { maxBuffer: 1024 * 1024 });
    return true;
  } catch {
    return false;
  }
}

async function resolveBaseRef(baseArg) {
  if (baseArg && (await verifyGitRef(baseArg))) {
    return baseArg;
  }

  const envBase = process.env.BASE_SHA ?? process.env.DIFF_BUDGET_BASE;
  if (envBase && (await verifyGitRef(envBase))) {
    return envBase;
  }

  const defaultRef = 'origin/main';
  if (await verifyGitRef(defaultRef)) {
    return defaultRef;
  }

  const { stdout } = await execFileAsync('git', ['rev-list', '--max-parents=0', 'HEAD'], {
    maxBuffer: 1024 * 1024
  });
  const commits = String(stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (commits.length === 0) {
    throw new Error('Unable to locate repository history for diff budget.');
  }
  return commits[commits.length - 1] || 'HEAD';
}

async function runGit(args, options = {}) {
  const { stdout } = await execFileAsync('git', args, {
    maxBuffer: 20 * 1024 * 1024,
    ...options
  });
  return String(stdout ?? '').trimEnd();
}

function isIgnoredPath(filePath) {
  if (!filePath) {
    return true;
  }
  if (IGNORED_EXACT_PATHS.has(filePath)) {
    return true;
  }
  for (const prefix of IGNORED_PREFIXES) {
    if (filePath.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

async function listUntrackedFiles() {
  try {
    const output = await runGit(['ls-files', '--others', '--exclude-standard']);
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseNumstatLine(line) {
  const [rawAdded, rawDeleted, ...rest] = line.split('\t');
  const filePath = rest.join('\t').trim();
  if (!filePath) {
    return null;
  }

  if (rawAdded === '-' || rawDeleted === '-') {
    return { filePath, added: 0, deleted: 0, binary: true };
  }

  const added = Number(rawAdded);
  const deleted = Number(rawDeleted);
  return {
    filePath,
    added: Number.isFinite(added) ? added : 0,
    deleted: Number.isFinite(deleted) ? deleted : 0,
    binary: false
  };
}

async function collectCommitDiff(commit) {
  if (!(await verifyGitRef(commit))) {
    throw new Error(`Invalid commit ref: ${commit}`);
  }

  const [nameOnly, numstatRaw] = await Promise.all([
    runGit(['show', '--name-only', '--no-renames', '--format=', commit]),
    runGit(['show', '--numstat', '--no-renames', '--format=', commit])
  ]);

  const changedFiles = new Set(
    nameOnly
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  );

  const numstatEntries = numstatRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseNumstatLine)
    .filter(Boolean);

  const numstatByPath = new Map(numstatEntries.map((entry) => [entry.filePath, entry]));

  return { changedFiles, numstatByPath };
}

async function countUntrackedLines(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  try {
    const info = await stat(abs);
    if (info.size > MAX_UNTRACKED_BYTES_FOR_LINE_COUNT) {
      return { kind: 'too-large', sizeBytes: info.size };
    }
    const content = await readFile(abs, 'utf8');
    if (!content) {
      return { kind: 'lines', lines: 0 };
    }
    return { kind: 'lines', lines: content.split(/\r?\n/).length };
  } catch {
    return { kind: 'unreadable' };
  }
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help')) {
    showUsage();
    return;
  }
  const knownFlags = new Set(['dry-run', 'commit', 'base', 'max-files', 'max-lines', 'h', 'help']);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    showUsage();
    process.exitCode = 2;
    return;
  }

  const cliOptions = {
    dryRun: hasFlag(args, 'dry-run'),
    commit: typeof args.commit === 'string' ? args.commit : undefined,
    base: typeof args.base === 'string' ? args.base : undefined,
    maxFiles: typeof args['max-files'] === 'string' ? args['max-files'] : undefined,
    maxLines: typeof args['max-lines'] === 'string' ? args['max-lines'] : undefined
  };
  const maxFiles = parseNumber(cliOptions.maxFiles ?? process.env.DIFF_BUDGET_MAX_FILES, DEFAULT_MAX_FILES);
  const maxLines = parseNumber(cliOptions.maxLines ?? process.env.DIFF_BUDGET_MAX_LINES, DEFAULT_MAX_LINES);

  const overrideReason = process.env.DIFF_BUDGET_OVERRIDE_REASON?.trim();

  const commitRef = cliOptions.commit?.trim();
  const modeLabel = commitRef ? `commit=${commitRef}` : 'working-tree';

  let changedFiles = new Set();
  let numstatByPath = new Map();
  let untrackedRaw = [];
  let baseRef = null;

  if (commitRef) {
    ({ changedFiles, numstatByPath } = await collectCommitDiff(commitRef));
  } else {
    baseRef = await resolveBaseRef(cliOptions.base);
    const [nameOnly, numstatRaw, untracked] = await Promise.all([
      runGit(['diff', '--name-only', '--no-renames', baseRef]),
      runGit(['diff', '--numstat', '--no-renames', baseRef]),
      listUntrackedFiles()
    ]);

    changedFiles = new Set(
      nameOnly
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    );

    for (const filePath of untracked) {
      changedFiles.add(filePath);
    }

    const numstatEntries = numstatRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseNumstatLine)
      .filter(Boolean);
    numstatByPath = new Map(numstatEntries.map((entry) => [entry.filePath, entry]));
    untrackedRaw = untracked;
  }

  let consideredFiles = 0;
  let totalAdded = 0;
  let totalDeleted = 0;
  const perFileLines = [];
  const untrackedIssues = [];

  for (const filePath of [...changedFiles].sort()) {
    if (isIgnoredPath(filePath)) {
      continue;
    }

    consideredFiles += 1;

    const numstat = numstatByPath.get(filePath);
    if (numstat) {
      totalAdded += numstat.added;
      totalDeleted += numstat.deleted;
      perFileLines.push({ filePath, lines: numstat.added + numstat.deleted, binary: numstat.binary });
      continue;
    }

    if (!commitRef && untrackedRaw.includes(filePath)) {
      const lines = await countUntrackedLines(filePath);
      if (lines?.kind === 'lines') {
        totalAdded += lines.lines;
        perFileLines.push({ filePath, lines: lines.lines, binary: false });
      } else {
        perFileLines.push({ filePath, lines: 0, binary: true });
        untrackedIssues.push({ filePath, ...lines });
      }
      continue;
    }

    perFileLines.push({ filePath, lines: 0, binary: false });
  }

  const totalLines = totalAdded + totalDeleted;
  const failures = [];

  if (consideredFiles > maxFiles) {
    failures.push(`changed files ${consideredFiles} > ${maxFiles}`);
  }
  if (totalLines > maxLines) {
    failures.push(`total lines changed ${totalLines} > ${maxLines}`);
  }
  if (untrackedIssues.length > 0) {
    failures.push(`untracked files could not be measured: ${untrackedIssues.length}`);
  }

  if (failures.length === 0) {
    const baseLabel = baseRef ? `base=${baseRef}` : modeLabel;
    console.log(
      `✅ Diff budget: OK (${baseLabel}, files=${consideredFiles}/${maxFiles}, lines=${totalLines}/${maxLines}, +${totalAdded}/-${totalDeleted})`
    );
    return;
  }

  const topFiles = [...perFileLines]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .map((entry) => `  - ${entry.filePath}: ${entry.lines}${entry.binary ? ' (binary/unknown)' : ''}`);

  const baseLabel = baseRef ? `base=${baseRef}` : modeLabel;
  const exceededLabel = overrideReason
    ? '⚠️ Diff budget exceeded (override applied)'
    : '❌ Diff budget exceeded';
  console.log(`${exceededLabel} (${baseLabel})`);
  for (const failure of failures) {
    console.log(` - ${failure}`);
  }
  if (topFiles.length > 0) {
    console.log('Top changed files:');
    for (const line of topFiles) {
      console.log(line);
    }
  }

  if (untrackedIssues.length > 0) {
    console.log('Untracked measurement issues:');
    for (const issue of untrackedIssues) {
      if (issue.kind === 'too-large') {
        console.log(`  - ${issue.filePath}: too large to measure (${issue.sizeBytes} bytes)`);
      } else if (issue.kind === 'unreadable') {
        console.log(`  - ${issue.filePath}: unreadable`);
      } else {
        console.log(`  - ${issue.filePath}: unknown`);
      }
    }
  }

  if (overrideReason) {
    console.log('');
    console.log(`Override accepted via DIFF_BUDGET_OVERRIDE_REASON: ${overrideReason}`);
    return;
  }

  console.log('');
  console.log('To proceed, either split the change into smaller diffs or set an explicit justification:');
  console.log('  DIFF_BUDGET_OVERRIDE_REASON="why this diff must be large" node scripts/diff-budget.mjs');

  if (cliOptions.dryRun) {
    console.log('Dry run: exiting successfully despite failures.');
    return;
  }

  process.exitCode = 1;
}

main().catch((error) => {
  const message =
    error && typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error);
  console.error(`Diff budget failed: ${message}`);
  process.exit(1);
});
