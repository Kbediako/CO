import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { ReviewScopeMode } from './review-prompt-context.js';
import {
  parseNameStatusPathCollection,
  parseStatusZPathCollection,
  parseStatusZPaths,
  type ReviewScopePathCollection
} from './review-scope-paths.js';

const execFileAsync = promisify(execFile);
const DEFAULT_LARGE_SCOPE_FILE_THRESHOLD = 25;
const DEFAULT_LARGE_SCOPE_LINE_THRESHOLD = 1200;
const REVIEW_LARGE_SCOPE_FILE_THRESHOLD_ENV_KEY = 'CODEX_REVIEW_LARGE_SCOPE_FILE_THRESHOLD';
const REVIEW_LARGE_SCOPE_LINE_THRESHOLD_ENV_KEY = 'CODEX_REVIEW_LARGE_SCOPE_LINE_THRESHOLD';

export interface ReviewScopeCliOptions {
  base?: string;
  commit?: string;
}

export interface ReviewScopeAssessment {
  mode: ReviewScopeMode;
  changedFiles: number | null;
  changedLines: number | null;
  largeScope: boolean;
  fileThreshold: number;
  lineThreshold: number;
}

interface ReviewScopeLogger {
  log(message: string): void;
  warn(message: string): void;
}

export async function collectReviewScopePaths(
  options: ReviewScopeCliOptions,
  repoRoot: string
): Promise<ReviewScopePathCollection> {
  if (options.commit) {
    const summary = await tryGit(['show', '--no-color', '--name-status', '--format=', options.commit], repoRoot);
    return summary ? parseNameStatusPathCollection(summary) : { paths: [], renderedLines: [] };
  }
  if (options.base) {
    const diff = await tryGit(['diff', '--no-color', '--name-status', `${options.base}...HEAD`], repoRoot);
    return diff ? parseNameStatusPathCollection(diff) : { paths: [], renderedLines: [] };
  }
  const status = await tryGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], repoRoot);
  return status ? parseStatusZPathCollection(status) : { paths: [], renderedLines: [] };
}

export function resolveEffectiveScopeMode(options: ReviewScopeCliOptions): ReviewScopeMode {
  if (options.commit) {
    return 'commit';
  }
  if (options.base) {
    return 'base';
  }
  return 'uncommitted';
}

export function buildScopeNotes(
  options: ReviewScopeCliOptions,
  scopePathCollection: ReviewScopePathCollection
): string[] {
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

export async function assessReviewScope(
  options: ReviewScopeCliOptions,
  repoRoot: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<ReviewScopeAssessment> {
  const mode = resolveEffectiveScopeMode(options);
  const fileThreshold = resolveLargeScopeFileThreshold(env);
  const lineThreshold = resolveLargeScopeLineThreshold(env);

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

  const status = await tryGit(['status', '--porcelain=v1', '-z', '--untracked-files=all'], repoRoot);
  const diff = await tryGit(['diff', '--numstat'], repoRoot);
  const cachedDiff = await tryGit(['diff', '--cached', '--numstat'], repoRoot);
  const untracked = await tryGit(['ls-files', '--others', '--exclude-standard', '-z'], repoRoot);
  const untrackedPaths = untracked ? parseNullDelimitedPaths(untracked) : [];
  const untrackedLines = untrackedPaths.length > 0 ? await countWorkingTreeLines(untrackedPaths, repoRoot) : null;

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

export function formatScopeMetrics(scope: ReviewScopeAssessment): string | null {
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

export function logReviewScopeAssessment(
  scope: ReviewScopeAssessment,
  scopeMetrics: string | null,
  logger: ReviewScopeLogger = console
): void {
  if (scope.mode !== 'uncommitted') {
    return;
  }
  if (scopeMetrics) {
    logger.log(`[run-review] review scope metrics: ${scopeMetrics}.`);
  } else {
    logger.log('[run-review] review scope metrics unavailable (git scope stats could not be resolved).');
  }
  if (!scope.largeScope) {
    return;
  }
  const detail = scopeMetrics ?? 'metrics unavailable';
  logger.warn(
    `[run-review] large uncommitted review scope detected (${detail}; thresholds: ${scope.fileThreshold} files / ${scope.lineThreshold} lines).`
  );
  logger.warn(
    '[run-review] this scope profile is known to produce long CO review traversals; prefer scoped reviews (`--base`/`--commit`) when practical.'
  );
}

export function buildLargeScopeAdvisoryPromptLines(
  scope: ReviewScopeAssessment,
  scopeMetrics: string | null
): string[] {
  if (scope.mode !== 'uncommitted' || !scope.largeScope) {
    return [];
  }
  const detail = scopeMetrics ?? 'metrics unavailable';
  return [
    `Scope advisory: large uncommitted diff detected (${detail}; thresholds: ${scope.fileThreshold} files / ${scope.lineThreshold} lines).`,
    'Prioritize highest-risk findings first and report actionable issues early; avoid exhaustive low-signal traversal before surfacing initial findings.',
    'If full coverage is incomplete, call out residual risk areas explicitly.'
  ];
}

function resolveLargeScopeFileThreshold(env: NodeJS.ProcessEnv): number {
  const configured = env[REVIEW_LARGE_SCOPE_FILE_THRESHOLD_ENV_KEY]?.trim();
  if (!configured) {
    return DEFAULT_LARGE_SCOPE_FILE_THRESHOLD;
  }
  const parsed = Number(configured);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${REVIEW_LARGE_SCOPE_FILE_THRESHOLD_ENV_KEY} must be a positive integer.`);
  }
  return parsed;
}

function resolveLargeScopeLineThreshold(env: NodeJS.ProcessEnv): number {
  const configured = env[REVIEW_LARGE_SCOPE_LINE_THRESHOLD_ENV_KEY]?.trim();
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

async function countWorkingTreeFileLines(relativePath: string, repoRoot: string): Promise<number> {
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

async function countWorkingTreeLines(paths: string[], repoRoot: string): Promise<number> {
  let total = 0;
  for (const relativePath of paths) {
    total += await countWorkingTreeFileLines(relativePath, repoRoot);
  }
  return total;
}

async function tryGit(args: string[], repoRoot: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, { maxBuffer: 1024 * 1024, cwd: repoRoot });
    const trimmed = String(stdout ?? '').trimEnd();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
