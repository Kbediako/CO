#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { parseArgs, hasFlag } from './lib/cli-args.js';

const execFileAsync = promisify(execFile);

const DEFAULT_MAX_FILES = 25;
const DEFAULT_MAX_LINES = 1200;
const MAX_UNTRACKED_BYTES_FOR_LINE_COUNT = 1024 * 1024;
const DEFAULT_STACKED_ADVISORY_REF = 'origin/main';

const IGNORED_EXACT_PATHS = new Set(['package-lock.json']);
const IGNORED_PREFIXES = [
  '.agent/task/',
  '.runs/',
  'archives/',
  'dist/',
  'node_modules/',
  'out/'
];
const IGNORED_TASK_CHECKLIST_PREFIX = 'tasks/tasks-';

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
  For explicit base diffs:
  1) --base <ref>
  2) BASE_SHA env var (CI)
  3) DIFF_BUDGET_BASE env var
  Local auto mode (no explicit base/env): hard-gates current working tree scope and, when ${DEFAULT_STACKED_ADVISORY_REF} exists, prints the broader aggregate branch delta as advisory context.

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

async function resolveConfiguredBaseRef(baseArg) {
  const candidates = [
    { source: '--base', ref: baseArg?.trim() },
    { source: 'BASE_SHA', ref: process.env.BASE_SHA?.trim() },
    { source: 'DIFF_BUDGET_BASE', ref: process.env.DIFF_BUDGET_BASE?.trim() }
  ];

  for (const candidate of candidates) {
    if (!candidate.ref) {
      continue;
    }
    if (await verifyGitRef(candidate.ref)) {
      return {
        baseRef: candidate.ref,
        explicitRequested: true,
        invalidRefs: []
      };
    }

    return {
      baseRef: null,
      explicitRequested: true,
      invalidRefs: [`${candidate.source}=${candidate.ref}`]
    };
  }

  return {
    baseRef: null,
    explicitRequested: false,
    invalidRefs: []
  };
}

async function resolveStackedAdvisoryRef() {
  if (await verifyGitRef(DEFAULT_STACKED_ADVISORY_REF)) {
    return DEFAULT_STACKED_ADVISORY_REF;
  }

  return null;
}

async function resolveMergeBaseRef(ref) {
  const mergeBase = await runGit(['merge-base', ref, 'HEAD']).catch(() => '');
  const trimmedMergeBase = mergeBase.trim();
  if (trimmedMergeBase && (await verifyGitRef(trimmedMergeBase))) {
    return trimmedMergeBase;
  }
  return ref;
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
  if (filePath.startsWith(IGNORED_TASK_CHECKLIST_PREFIX)) {
    return true;
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

function parsePathList(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNumstatMap(raw) {
  return new Map(
    raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseNumstatLine)
      .filter(Boolean)
      .map((entry) => [entry.filePath, entry])
  );
}

function mergeNumstatMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [filePath, entry] of map.entries()) {
      const existing = merged.get(filePath);
      merged.set(
        filePath,
        existing
          ? {
              filePath,
              added: existing.added + entry.added,
              deleted: existing.deleted + entry.deleted,
              binary: existing.binary || entry.binary
            }
          : { ...entry }
      );
    }
  }
  return merged;
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

async function collectWorkingTreeDiff() {
  const [nameOnly, cachedNameOnly, numstatRaw, cachedNumstatRaw, untracked] = await Promise.all([
    runGit(['diff', '--name-only', '--no-renames']),
    runGit(['diff', '--cached', '--name-only', '--no-renames', 'HEAD']),
    runGit(['diff', '--numstat', '--no-renames']),
    runGit(['diff', '--cached', '--numstat', '--no-renames', 'HEAD']),
    listUntrackedFiles()
  ]);

  const changedFiles = new Set([...parsePathList(nameOnly), ...parsePathList(cachedNameOnly)]);

  for (const filePath of untracked) {
    changedFiles.add(filePath);
  }

  return {
    changedFiles,
    numstatByPath: mergeNumstatMaps(parseNumstatMap(numstatRaw), parseNumstatMap(cachedNumstatRaw)),
    untrackedRaw: untracked
  };
}

async function collectBaseDiff(baseRef) {
  const [nameOnly, numstatRaw, untracked] = await Promise.all([
    runGit(['diff', '--name-only', '--no-renames', baseRef]),
    runGit(['diff', '--numstat', '--no-renames', baseRef]),
    listUntrackedFiles()
  ]);

  const changedFiles = new Set(
    nameOnly
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  );

  for (const filePath of untracked) {
    changedFiles.add(filePath);
  }

  return {
    changedFiles,
    numstatByPath: new Map(
      numstatRaw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseNumstatLine)
        .filter(Boolean)
        .map((entry) => [entry.filePath, entry])
    ),
    untrackedRaw: untracked
  };
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
    const trailingNewlineAdjustedCount =
      content.split(/\r?\n/).length - (content.endsWith('\n') ? 1 : 0);
    return { kind: 'lines', lines: Math.max(0, trailingNewlineAdjustedCount) };
  } catch {
    return { kind: 'unreadable' };
  }
}

function summarizeDiff(diff, commitRef) {
  const { changedFiles, numstatByPath, untrackedRaw } = diff;

  return { changedFiles, numstatByPath, untrackedRaw, commitRef };
}

async function measureDiff(diff) {
  const { changedFiles, numstatByPath, untrackedRaw, commitRef } = diff;

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

  return {
    consideredFiles,
    totalAdded,
    totalDeleted,
    totalLines: totalAdded + totalDeleted,
    perFileLines,
    untrackedIssues
  };
}

function buildFailures(summary, maxFiles, maxLines) {
  const failures = [];
  if (summary.consideredFiles > maxFiles) {
    failures.push(`changed files ${summary.consideredFiles} > ${maxFiles}`);
  }
  if (summary.totalLines > maxLines) {
    failures.push(`total lines changed ${summary.totalLines} > ${maxLines}`);
  }
  if (summary.untrackedIssues.length > 0) {
    failures.push(`untracked files could not be measured: ${summary.untrackedIssues.length}`);
  }
  return failures;
}

function buildTopFiles(summary) {
  return [...summary.perFileLines]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .map((entry) => `  - ${entry.filePath}: ${entry.lines}${entry.binary ? ' (binary/unknown)' : ''}`);
}

function printUntrackedIssues(summary) {
  if (summary.untrackedIssues.length === 0) {
    return;
  }

  console.log('Untracked measurement issues:');
  for (const issue of summary.untrackedIssues) {
    if (issue.kind === 'too-large') {
      console.log(`  - ${issue.filePath}: too large to measure (${issue.sizeBytes} bytes)`);
    } else if (issue.kind === 'unreadable') {
      console.log(`  - ${issue.filePath}: unreadable`);
    } else {
      console.log(`  - ${issue.filePath}: unknown`);
    }
  }
}

function formatBudgetTotals(summary, maxFiles, maxLines) {
  return `files=${summary.consideredFiles}/${maxFiles}, lines=${summary.totalLines}/${maxLines}, +${summary.totalAdded}/-${summary.totalDeleted}`;
}

function shouldPrintStackedAdvisory(hardSummary, advisorySummary) {
  return (
    advisorySummary.consideredFiles > hardSummary.consideredFiles ||
    advisorySummary.totalLines > hardSummary.totalLines
  );
}

function printStackedAdvisory(advisoryRef, summary, maxFiles, maxLines) {
  console.log('');
  console.log(
    `Advisory stacked aggregate vs ${advisoryRef}: ${formatBudgetTotals(summary, maxFiles, maxLines)}`
  );
  console.log(
    'The broader stacked branch delta is reported for context only; the hard local gate above uses the current working tree scope.'
  );
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
  const baseConfig = commitRef
    ? { baseRef: null, explicitRequested: false, invalidRefs: [] }
    : await resolveConfiguredBaseRef(cliOptions.base);
  const { baseRef, explicitRequested: explicitBaseRequested, invalidRefs } = baseConfig;

  if (!commitRef && explicitBaseRequested && !baseRef) {
    throw new Error(
      `Explicit diff base requested but no valid ref was found (${invalidRefs.join(', ')}).`
    );
  }

  const localAutoMode = !commitRef && !explicitBaseRequested && !baseRef;
  const hardScopeLabel = commitRef
    ? `commit=${commitRef}`
    : baseRef
      ? `base=${baseRef}`
      : 'scope=working-tree';

  let hardDiff;
  if (commitRef) {
    const commitDiff = await collectCommitDiff(commitRef);
    hardDiff = summarizeDiff({ ...commitDiff, untrackedRaw: [] }, commitRef);
  } else if (baseRef) {
    hardDiff = summarizeDiff(await collectBaseDiff(baseRef), null);
  } else {
    hardDiff = summarizeDiff(await collectWorkingTreeDiff(), null);
  }

  const hardSummary = await measureDiff(hardDiff);
  const failures = buildFailures(hardSummary, maxFiles, maxLines);
  const topFiles = buildTopFiles(hardSummary);

  let stackedAdvisory = null;
  if (localAutoMode) {
    const advisoryRef = await resolveStackedAdvisoryRef();
    if (advisoryRef) {
      const advisoryBaseRef = await resolveMergeBaseRef(advisoryRef);
      const advisorySummary = await measureDiff(summarizeDiff(await collectBaseDiff(advisoryBaseRef), null));
      if (shouldPrintStackedAdvisory(hardSummary, advisorySummary)) {
        stackedAdvisory = { ref: advisoryRef, summary: advisorySummary };
      }
    }
  }

  if (failures.length === 0) {
    console.log(`✅ Diff budget: OK (${hardScopeLabel}, ${formatBudgetTotals(hardSummary, maxFiles, maxLines)})`);
    if (stackedAdvisory) {
      printStackedAdvisory(stackedAdvisory.ref, stackedAdvisory.summary, maxFiles, maxLines);
    }
    return;
  }

  const exceededLabel = overrideReason
    ? '⚠️ Diff budget exceeded (override applied)'
    : '❌ Diff budget exceeded';
  console.log(`${exceededLabel} (${hardScopeLabel})`);
  for (const failure of failures) {
    console.log(` - ${failure}`);
  }
  if (topFiles.length > 0) {
    console.log('Top changed files:');
    for (const line of topFiles) {
      console.log(line);
    }
  }

  printUntrackedIssues(hardSummary);

  if (stackedAdvisory) {
    printStackedAdvisory(stackedAdvisory.ref, stackedAdvisory.summary, maxFiles, maxLines);
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
