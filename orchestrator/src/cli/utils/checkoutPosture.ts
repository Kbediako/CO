import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export type CheckoutPostureStatus = 'current' | 'stale' | 'ahead' | 'diverged' | 'unavailable';

export interface CheckoutPostureCommit {
  hash: string;
  short_hash: string;
  committed_date: string;
  subject: string;
}

export interface CheckoutPostureInspection {
  status: CheckoutPostureStatus;
  repo_root: string;
  inside_git_worktree: boolean;
  base_ref: 'origin/main';
  ahead: number | null;
  behind: number | null;
  dirty: {
    status: 'clean' | 'dirty' | 'unknown';
    changed_paths: number | null;
    detail: string;
  };
  head: CheckoutPostureCommit | null;
  upstream: CheckoutPostureCommit | null;
  stale_docs_may_be: boolean;
  posture_reference: {
    status: 'available' | 'unavailable';
    commit: CheckoutPostureCommit | null;
    issue_ids: string[];
    policy_lines: string[];
    paths: string[];
    detail: string;
  };
  guidance: string[];
  detail: string;
}

const BASE_REF = 'origin/main';
const GIT_TIMEOUT_MS = 5000;
const GIT_REPO_SELECTION_ENV_KEYS = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_DIR',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_WORK_TREE'
];
const PRIMARY_POSTURE_REFERENCE_PATHS = [
  'docs/guides/codex-version-policy.md',
  'docs/codex-posture-matrix.json',
  'templates/codex/.codex/config.toml'
];
const POSTURE_REFERENCE_LINE_LIMIT = 16;
const PRIORITY_POSTURE_LINE_PATTERNS = [
  /\b(Portable packaged\/generated defaults|fallback values)\b/u,
  /\bCurrent model posture\b/u,
  /\bCurrent CO-local\b/u,
  /\bCurrent release-facing\b/u,
  /\bCurrent cloud execution\b/u,
  /\bLatest app-server\b/u
];
const POSTURE_REFERENCE_PATHS = PRIMARY_POSTURE_REFERENCE_PATHS;

export function inspectCheckoutPosture(repoRoot: string): CheckoutPostureInspection {
  const repoCheck = runGit(repoRoot, ['rev-parse', '--is-inside-work-tree']);
  const worktreeProbe = classifyWorktreeProbe(repoRoot, repoCheck);
  if (worktreeProbe === 'unavailable') {
    return unavailableInspection(
      repoRoot,
      `Unable to determine whether the current directory is inside a git worktree: ${repoCheck.stderr || repoCheck.error || 'unknown git error'}`,
      'unknown'
    );
  }
  if (worktreeProbe === 'outside') {
    return unavailableInspection(repoRoot, 'Current directory is not inside a git worktree.', 'unknown', undefined, false);
  }

  const dirty = inspectDirtyWork(repoRoot);
  const head = readCommit(repoRoot, 'HEAD');
  const upstreamCheck = runGit(repoRoot, ['rev-parse', '--verify', `${BASE_REF}^{commit}`]);
  if (!upstreamCheck.ok) {
    return {
      ...unavailableInspection(repoRoot, `${BASE_REF} is not available locally.`, dirty.status, dirty),
      head,
      guidance: [
        `${BASE_REF} is not available locally; run git fetch origin refs/heads/main:refs/remotes/origin/main to refresh comparison refs.`,
        'Doctor only reports checkout posture; it does not fetch, rebase, checkout, or discard local work.'
      ]
    };
  }

  const upstream = readCommit(repoRoot, BASE_REF);
  const comparison = runGit(repoRoot, ['rev-list', '--left-right', '--count', `HEAD...${BASE_REF}`]);
  if (!comparison.ok) {
    return {
      ...unavailableInspection(
        repoRoot,
        `Unable to compare HEAD with ${BASE_REF}: ${comparison.stderr || comparison.error || 'unknown git error'}`,
        dirty.status,
        dirty
      ),
      head,
      upstream
    };
  }

  const counts = comparison.stdout.trim().split(/\s+/u);
  const ahead = Number.parseInt(counts[0] ?? '', 10);
  const behind = Number.parseInt(counts[1] ?? '', 10);
  if (!Number.isFinite(ahead) || !Number.isFinite(behind)) {
    return {
      ...unavailableInspection(
        repoRoot,
        `Unable to parse git comparison output for HEAD...${BASE_REF}: ${comparison.stdout.trim() || '<empty>'}`,
        dirty.status,
        dirty
      ),
      head,
      upstream
    };
  }

  const status = classifyComparison(ahead, behind);
  const postureReference = readPostureReference(repoRoot);
  const staleDocsMayBe = status === 'stale' || status === 'diverged';

  return {
    status,
    repo_root: repoRoot,
    inside_git_worktree: true,
    base_ref: BASE_REF,
    ahead,
    behind,
    dirty,
    head,
    upstream,
    stale_docs_may_be: staleDocsMayBe,
    posture_reference: postureReference,
    guidance: buildGuidance(status),
    detail: buildDetail(status, ahead, behind)
  };
}

export function formatCheckoutPostureSummary(result: CheckoutPostureInspection): string[] {
  const lines: string[] = [];
  lines.push(`Checkout posture: ${result.status}`);
  if (result.ahead === null || result.behind === null) {
    lines.push(`  - comparison: unavailable against ${result.base_ref}`);
    lines.push(`    detail: ${result.detail}`);
  } else {
    lines.push(`  - comparison: HEAD is ${result.ahead} ahead, ${result.behind} behind ${result.base_ref}`);
  }
  lines.push(`  - dirty local work: ${result.dirty.status} (${result.dirty.detail})`);
  if (result.head) {
    lines.push(`  - HEAD: ${formatCommit(result.head)}`);
  }
  if (result.upstream) {
    lines.push(`  - ${result.base_ref}: ${formatCommit(result.upstream)}`);
  }

  if (result.stale_docs_may_be) {
    lines.push('  - advisory: local posture docs may be stale relative to origin/main.');
    if (result.posture_reference.commit) {
      lines.push(`  - latest posture reference: ${formatCommit(result.posture_reference.commit)}`);
    }
    if (result.posture_reference.issue_ids.length > 0) {
      lines.push(`  - posture issue(s): ${result.posture_reference.issue_ids.join(', ')}`);
    }
    if (result.posture_reference.policy_lines.length > 0) {
      lines.push('  - origin/main posture:');
      for (const line of result.posture_reference.policy_lines) {
        lines.push(`    ${line}`);
      }
    } else if (result.posture_reference.status === 'unavailable') {
      lines.push(`  - posture reference detail: ${result.posture_reference.detail}`);
    }
  }

  for (const item of result.guidance) {
    lines.push(`  - ${item}`);
  }
  return lines;
}

function classifyComparison(ahead: number, behind: number): CheckoutPostureStatus {
  if (behind > 0 && ahead > 0) {
    return 'diverged';
  }
  if (behind > 0) {
    return 'stale';
  }
  if (ahead > 0) {
    return 'ahead';
  }
  return 'current';
}

function inspectDirtyWork(repoRoot: string): CheckoutPostureInspection['dirty'] {
  const status = runGit(repoRoot, ['status', '--porcelain', '--untracked-files=normal']);
  if (!status.ok) {
    return {
      status: 'unknown',
      changed_paths: null,
      detail: status.stderr || status.error || 'git status failed'
    };
  }
  const changedPaths = status.stdout.split(/\r?\n/u).filter((line) => line.trim().length > 0).length;
  return {
    status: changedPaths > 0 ? 'dirty' : 'clean',
    changed_paths: changedPaths,
    detail: changedPaths > 0
      ? `${changedPaths} changed path${changedPaths === 1 ? '' : 's'}; tracked separately from branch posture`
      : 'no local changes detected'
  };
}

function readPostureReference(repoRoot: string): CheckoutPostureInspection['posture_reference'] {
  const commit = readLatestPostureCommit(repoRoot);
  const policyLines = readOriginMainPostureLines(repoRoot);
  const issueIds = extractIssueIds([
    commit?.subject ?? '',
    ...policyLines
  ]);
  return {
    status: commit || policyLines.length > 0 ? 'available' : 'unavailable',
    commit,
    issue_ids: issueIds,
    policy_lines: policyLines,
    paths: [...POSTURE_REFERENCE_PATHS],
    detail: commit || policyLines.length > 0
      ? 'Read from local origin/main refs without fetching or checkout mutation.'
      : 'No posture reference paths were readable from origin/main.'
  };
}

function readLatestPostureCommit(repoRoot: string): CheckoutPostureCommit | null {
  return readLatestCommitForPaths(repoRoot, PRIMARY_POSTURE_REFERENCE_PATHS);
}

function readLatestCommitForPaths(repoRoot: string, paths: string[]): CheckoutPostureCommit | null {
  const result = runGit(repoRoot, [
    'log',
    '-1',
    '--format=%H%x00%h%x00%cs%x00%s',
    BASE_REF,
    '--',
    ...paths
  ]);
  if (!result.ok || !result.stdout.trim()) {
    return null;
  }
  return parseCommit(result.stdout);
}

function readOriginMainPostureLines(repoRoot: string): string[] {
  const result = runGit(repoRoot, ['show', `${BASE_REF}:docs/guides/codex-version-policy.md`]);
  if (!result.ok) {
    return [];
  }
  return extractCurrentPostureLines(result.stdout);
}

function extractCurrentPostureLines(source: string): string[] {
  const lines: string[] = [];
  let inCurrentPosture = false;
  for (const rawLine of source.split(/\r?\n/u)) {
    const trimmed = rawLine.trim();
    if (/^##\s+/u.test(trimmed)) {
      if (inCurrentPosture) {
        break;
      }
      inCurrentPosture = /^##\s+Current Posture\b/u.test(trimmed);
      continue;
    }
    if (!inCurrentPosture || !trimmed.startsWith('- ')) {
      continue;
    }
    if (isPostureSignalLine(trimmed)) {
      lines.push(trimmed);
    }
  }
  return prioritizePostureLines(lines);
}

function isPostureSignalLine(line: string): boolean {
  return /\b(Current|Latest|CO-\d+|Codex CLI|codex-cli|gpt-[\w.-]+|model posture)\b/u.test(line);
}

function prioritizePostureLines(lines: string[]): string[] {
  if (lines.length <= POSTURE_REFERENCE_LINE_LIMIT) {
    return lines;
  }

  const selectedIndexes = new Set<number>();
  for (const pattern of PRIORITY_POSTURE_LINE_PATTERNS) {
    for (const [index, line] of lines.entries()) {
      if (selectedIndexes.size >= POSTURE_REFERENCE_LINE_LIMIT) {
        break;
      }
      if (pattern.test(line)) {
        selectedIndexes.add(index);
      }
    }
  }

  for (const index of lines.keys()) {
    if (selectedIndexes.size >= POSTURE_REFERENCE_LINE_LIMIT) {
      break;
    }
    selectedIndexes.add(index);
  }

  return lines.filter((_, index) => selectedIndexes.has(index));
}

function extractIssueIds(values: string[]): string[] {
  const issueIds = new Set<string>();
  for (const value of values) {
    for (const match of value.matchAll(/\bCO-\d+\b/giu)) {
      issueIds.add(match[0].toUpperCase());
    }
  }
  return [...issueIds];
}

function buildGuidance(status: CheckoutPostureStatus): string[] {
  switch (status) {
    case 'stale':
    case 'diverged':
      return [
        'Review origin/main posture before relying on local README/AGENTS/version-policy truth.',
        'Refresh comparison refs with git fetch origin refs/heads/main:refs/remotes/origin/main when needed.',
        'Doctor only reports checkout posture; it does not fetch, rebase, checkout, or discard local work.'
      ];
    case 'ahead':
      return [
        'Ahead-only release or PR worktrees are not stale-posture drift by themselves.',
        'Doctor only reports checkout posture; it does not fetch, rebase, checkout, or discard local work.'
      ];
    case 'current':
      return [
        'HEAD matches origin/main for this local comparison ref.',
        'Doctor only reports checkout posture; it does not fetch, rebase, checkout, or discard local work.'
      ];
    case 'unavailable':
      return [
        'Configure or fetch origin/main before relying on local posture docs as current main truth.',
        'Doctor only reports checkout posture; it does not fetch, rebase, checkout, or discard local work.'
      ];
  }
}

function buildDetail(status: CheckoutPostureStatus, ahead: number, behind: number): string {
  switch (status) {
    case 'stale':
      return `HEAD is ${behind} commit${behind === 1 ? '' : 's'} behind origin/main.`;
    case 'diverged':
      return `HEAD has local commits and is ${behind} commit${behind === 1 ? '' : 's'} behind origin/main.`;
    case 'ahead':
      return `HEAD is ${ahead} commit${ahead === 1 ? '' : 's'} ahead of origin/main and not behind.`;
    case 'current':
      return 'HEAD and origin/main point at the same commit for this local comparison ref.';
    case 'unavailable':
      return 'Checkout posture comparison is unavailable.';
  }
}

function readCommit(repoRoot: string, ref: string): CheckoutPostureCommit | null {
  const result = runGit(repoRoot, ['log', '-1', '--format=%H%x00%h%x00%cs%x00%s', ref]);
  if (!result.ok || !result.stdout.trim()) {
    return null;
  }
  return parseCommit(result.stdout);
}

function parseCommit(stdout: string): CheckoutPostureCommit | null {
  const [hash, shortHash, committedDate, subject] = stdout.trim().split('\0');
  if (!hash || !shortHash || !committedDate || subject === undefined) {
    return null;
  }
  return {
    hash,
    short_hash: shortHash,
    committed_date: committedDate,
    subject
  };
}

function classifyWorktreeProbe(repoRoot: string, result: GitCommandResult): 'inside' | 'outside' | 'unavailable' {
  if (result.ok) {
    return result.stdout.trim() === 'true' ? 'inside' : 'outside';
  }
  if (!result.error && result.status === 128 && isExistingDirectory(repoRoot) && !hasDiscoverableGitMarker(repoRoot)) {
    return 'outside';
  }
  return 'unavailable';
}

function hasDiscoverableGitMarker(repoRoot: string): boolean {
  let current = resolve(repoRoot);
  if (!isExistingDirectory(current)) {
    return false;
  }

  for (;;) {
    if (existsSync(join(current, '.git'))) {
      return true;
    }
    const parent = dirname(current);
    if (parent === current) {
      return false;
    }
    current = parent;
  }
}

function isExistingDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function unavailableInspection(
  repoRoot: string,
  detail: string,
  dirtyStatus: 'clean' | 'dirty' | 'unknown',
  dirty?: CheckoutPostureInspection['dirty'],
  insideGitWorktree = true
): CheckoutPostureInspection {
  return {
    status: 'unavailable',
    repo_root: repoRoot,
    inside_git_worktree: insideGitWorktree,
    base_ref: BASE_REF,
    ahead: null,
    behind: null,
    dirty: dirty ?? {
      status: dirtyStatus,
      changed_paths: null,
      detail: dirtyStatus === 'unknown' ? 'git status was not available' : 'dirty state unavailable'
    },
    head: null,
    upstream: null,
    stale_docs_may_be: false,
    posture_reference: {
      status: 'unavailable',
      commit: null,
      issue_ids: [],
      policy_lines: [],
      paths: [...POSTURE_REFERENCE_PATHS],
      detail
    },
    guidance: buildGuidance('unavailable'),
    detail
  };
}

function formatCommit(commit: CheckoutPostureCommit): string {
  return `${commit.short_hash} ${commit.committed_date} ${commit.subject}`;
}

interface GitCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  error: string | null;
}

function runGit(
  repoRoot: string,
  args: string[]
): GitCommandResult {
  const env = { ...process.env };
  for (const key of GIT_REPO_SELECTION_ENV_KEYS) {
    delete env[key];
  }
  const result = spawnSync('git', ['-C', repoRoot, ...args], {
    encoding: 'utf8',
    env: {
      ...env,
      GIT_OPTIONAL_LOCKS: '0'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: GIT_TIMEOUT_MS
  });
  return {
    ok: !result.error && result.status === 0,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? '').trim(),
    status: result.status,
    error: result.error ? result.error.message : null
  };
}
