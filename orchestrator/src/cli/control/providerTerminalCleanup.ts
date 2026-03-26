import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import process from 'node:process';
import { promisify } from 'node:util';

import {
  getProviderLinearIssueContext,
  type ProviderLinearWorkflowAttachment
} from './providerLinearWorkflowFacade.js';
import { isoTimestamp } from '../utils/time.js';

const execFileAsync = promisify(execFile);

export const DEFAULT_PROVIDER_TERMINAL_CLEANUP_COMMENT_TEMPLATE =
  'Closing because the Linear issue for branch {{branch}} entered a terminal state without merge.';
const PROVIDER_TERMINAL_CLEANUP_COMMAND_TIMEOUT_MS = 5_000;
const PROVIDER_TERMINAL_CLEANUP_TOTAL_BUDGET_MS = 15_000;
const PROVIDER_TERMINAL_CLEANUP_MAX_ATTACHED_PRS = 20;

export interface ProviderTerminalCleanupConfig {
  enabled: boolean;
  closeAttachedPr: {
    enabled: boolean;
    commentTemplate: string;
  };
}

export type ProviderTerminalCleanupStatus = 'disabled' | 'noop' | 'succeeded' | 'failed';

export interface ProviderTerminalCleanupResult {
  attemptedAt: string;
  status: ProviderTerminalCleanupStatus;
  summary: string;
  error: string | null;
  issueId: string;
  issueIdentifier: string | null;
  workspacePath: string;
  branch: string | null;
  attachedPrUrls: string[];
  matchingOpenPrUrls: string[];
  closedPrUrls: string[];
}

export interface ProviderTerminalCleanupCommandResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export type ProviderTerminalCleanupCommandRunner = (input: {
  command: string;
  args: string[];
  cwd: string;
}) => Promise<ProviderTerminalCleanupCommandResult>;

export type ProviderTerminalCleanupIssueContextReader = typeof getProviderLinearIssueContext;

interface ProviderTerminalCleanupDependencies {
  readIssueContext?: ProviderTerminalCleanupIssueContextReader;
  runCommand?: ProviderTerminalCleanupCommandRunner;
  now?: () => string;
  nowMs?: () => number;
}

export function resolveProviderTerminalCleanupConfig(
  value: unknown
): ProviderTerminalCleanupConfig {
  const record = asRecord(value);
  const terminalCleanup = asRecord(record?.terminal_cleanup ?? record?.terminalCleanup);
  const enabled = readBoolean(terminalCleanup, 'enabled') ?? false;
  const closeAttachedPr = asRecord(
    terminalCleanup?.close_attached_pr ?? terminalCleanup?.closeAttachedPr
  );
  return {
    enabled,
    closeAttachedPr: {
      enabled: readBoolean(closeAttachedPr, 'enabled') ?? enabled,
      commentTemplate:
        readNonEmptyString(closeAttachedPr, 'comment_template', 'commentTemplate') ??
        DEFAULT_PROVIDER_TERMINAL_CLEANUP_COMMENT_TEMPLATE
    }
  };
}

export async function runProviderTerminalCleanup(
  input: {
    issueId: string;
    issueIdentifier?: string | null;
    workspacePath: string;
    config: ProviderTerminalCleanupConfig;
    env?: NodeJS.ProcessEnv;
  },
  deps: ProviderTerminalCleanupDependencies = {}
): Promise<ProviderTerminalCleanupResult> {
  const attemptedAt = deps.now?.() ?? isoTimestamp();
  const env = input.env ?? process.env;
  const readIssueContext = deps.readIssueContext ?? getProviderLinearIssueContext;
  const runCommand = deps.runCommand ?? runProviderTerminalCleanupCommand;
  const issueIdentifier = normalizeOptionalString(input.issueIdentifier);
  const nowMs = deps.nowMs ?? Date.now;

  if (!input.config.enabled) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'disabled',
      summary: 'Terminal cleanup hook is disabled.',
      branch: null
    });
  }

  if (!input.config.closeAttachedPr.enabled) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'disabled',
      summary: 'Attached PR auto-close is disabled for terminal cleanup.',
      branch: null
    });
  }

  if (!(await workspaceExists(input.workspacePath))) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'noop',
      summary: 'Workspace was already absent before terminal cleanup.',
      branch: null
    });
  }

  const branchResult = await runCommand({
    command: 'git',
    args: ['-C', input.workspacePath, 'branch', '--show-current'],
    cwd: input.workspacePath
  });
  if (!branchResult.ok) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'failed',
      summary: 'Terminal cleanup could not determine the workspace branch.',
      error: formatCommandFailure('git', branchResult),
      branch: null
    });
  }

  const branch = normalizeOptionalString(branchResult.stdout);
  const headResult = await runCommand({
    command: 'git',
    args: ['-C', input.workspacePath, 'rev-parse', 'HEAD'],
    cwd: input.workspacePath
  });
  if (!headResult.ok) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'failed',
      summary:
        branch === null
          ? 'Terminal cleanup could not determine the detached workspace HEAD.'
          : 'Terminal cleanup could not determine the workspace HEAD.',
      error: formatCommandFailure('git', headResult),
      branch
    });
  }
  const workspaceHeadOid = normalizeOptionalString(headResult.stdout);
  if (!workspaceHeadOid) {
    if (!branch) {
      return buildResult({
        attemptedAt,
        issueId: input.issueId,
        issueIdentifier,
        workspacePath: input.workspacePath,
        status: 'noop',
        summary: 'Workspace is detached or has no current branch; skipping attached PR cleanup.',
        branch: null
      });
    }
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'failed',
      summary: 'Terminal cleanup could not determine the workspace HEAD.',
      branch
    });
  }
  const workspaceTargetLabel = formatWorkspaceTargetLabel(branch, workspaceHeadOid);
  const originUrlResult = await runCommand({
    command: 'git',
    args: ['-C', input.workspacePath, 'remote', 'get-url', 'origin'],
    cwd: input.workspacePath
  });
  if (!originUrlResult.ok) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'failed',
      summary: 'Terminal cleanup could not determine the workspace origin remote.',
      error: formatCommandFailure('git', originUrlResult),
      branch
    });
  }
  const workspaceRepoKey = parseGitHubRepositoryUrl(originUrlResult.stdout);
  if (!workspaceRepoKey) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'failed',
      summary: 'Terminal cleanup could not determine the workspace GitHub repository.',
      error: JSON.stringify(originUrlResult.stdout.trim()),
      branch
    });
  }

  const issueContext = await readIssueContext({
    issueId: input.issueId,
    env
  });
  if (!issueContext.ok) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'failed',
      summary: `Terminal cleanup could not load Linear issue context for ${input.issueId}.`,
      error: `${issueContext.error.code}: ${issueContext.error.message}`,
      branch
    });
  }

  const attachedPrUrls = collectAttachedGitHubPrUrls(issueContext.issue.attachments);
  if (attachedPrUrls.length === 0) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'noop',
      summary: `No attached GitHub PRs were present for ${workspaceTargetLabel}.`,
      branch
    });
  }

  const matchingOpenPrUrls: string[] = [];
  const closedPrUrls: string[] = [];
  const errors: string[] = [];
  let resolvedBranch = branch;
  const cleanupDeadlineMs = nowMs() + PROVIDER_TERMINAL_CLEANUP_TOTAL_BUDGET_MS;
  const sameRepoAttachedPrUrls = attachedPrUrls.filter(
    (attachedPrUrl) => parseGitHubPullRequestUrl(attachedPrUrl)?.repoKey === workspaceRepoKey
  );
  const attachedPrUrlsToProcess = sameRepoAttachedPrUrls.slice(
    0,
    PROVIDER_TERMINAL_CLEANUP_MAX_ATTACHED_PRS
  );
  if (sameRepoAttachedPrUrls.length > attachedPrUrlsToProcess.length) {
    errors.push(
      `skipped ${sameRepoAttachedPrUrls.length - attachedPrUrlsToProcess.length} attached PR(s) beyond cleanup cap of ${PROVIDER_TERMINAL_CLEANUP_MAX_ATTACHED_PRS}`
    );
  }
  let processedAttachedPrCount = 0;

  for (const attachedPrUrl of attachedPrUrlsToProcess) {
    if (nowMs() >= cleanupDeadlineMs) {
      errors.push(`cleanup budget exceeded after processing ${processedAttachedPrCount} attached PR(s)`);
      break;
    }
    processedAttachedPrCount += 1;
    const prView = await runCommand({
      command: 'gh',
      args: [
        'pr',
        'view',
        attachedPrUrl,
        '--json',
        'state,headRefName,headRefOid,url,headRepository,headRepositoryOwner,isCrossRepository'
      ],
      cwd: input.workspacePath
    });
    if (!prView.ok) {
      errors.push(`gh pr view ${attachedPrUrl}: ${formatCommandFailure('gh', prView)}`);
      continue;
    }

    const prDetails = parsePrViewResponse(prView.stdout);
    if (!prDetails) {
      errors.push(`gh pr view ${attachedPrUrl}: invalid JSON response`);
      continue;
    }

    const sameBaseRepository = prDetails.repoKey === workspaceRepoKey;
    const sameHeadRepository = prDetails.headRepoKey === workspaceRepoKey;
    const matchesBranch =
      branch !== null &&
      prDetails.headRefName === branch &&
      prDetails.headRefOid === workspaceHeadOid;
    const matchesHead =
      branch === null &&
      workspaceHeadOid !== null &&
      prDetails.headRefOid !== null &&
      prDetails.headRefOid === workspaceHeadOid;
    if (
      prDetails.state !== 'OPEN' ||
      !sameBaseRepository ||
      !sameHeadRepository ||
      (!matchesBranch && !matchesHead)
    ) {
      continue;
    }

    const closingBranch =
      prDetails.headRefName ??
      branch ??
      resolvedBranch ??
      `HEAD ${shortOid(workspaceHeadOid)}`;
    resolvedBranch ??= prDetails.headRefName;
    matchingOpenPrUrls.push(prDetails.url ?? attachedPrUrl);
    if (nowMs() >= cleanupDeadlineMs) {
      errors.push(`cleanup budget exceeded before closing ${attachedPrUrl}`);
      break;
    }
    const prClose = await runCommand({
      command: 'gh',
      args: [
        'pr',
        'close',
        attachedPrUrl,
        '--comment',
        renderClosingComment(input.config.closeAttachedPr.commentTemplate, closingBranch)
      ],
      cwd: input.workspacePath
    });
    if (!prClose.ok) {
      errors.push(`gh pr close ${attachedPrUrl}: ${formatCommandFailure('gh', prClose)}`);
      continue;
    }
    closedPrUrls.push(prDetails.url ?? attachedPrUrl);
  }

  if (errors.length > 0) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'failed',
      summary:
        matchingOpenPrUrls.length === 0
          ? `Terminal cleanup encountered ${errors.length} attached PR error(s) for ${workspaceTargetLabel}.`
          : `Terminal cleanup closed ${closedPrUrls.length} of ${matchingOpenPrUrls.length} matching attached PR(s) for ${formatWorkspaceTargetLabel(resolvedBranch, workspaceHeadOid)} and encountered ${errors.length} error(s).`,
      error: errors.join(' | '),
      branch: resolvedBranch,
      attachedPrUrls,
      matchingOpenPrUrls,
      closedPrUrls
    });
  }

  if (matchingOpenPrUrls.length === 0) {
    return buildResult({
      attemptedAt,
      issueId: input.issueId,
      issueIdentifier,
      workspacePath: input.workspacePath,
      status: 'noop',
      summary: `No attached open PR matched ${workspaceTargetLabel}.`,
      branch: resolvedBranch,
      attachedPrUrls
    });
  }

  return buildResult({
    attemptedAt,
    issueId: input.issueId,
    issueIdentifier,
    workspacePath: input.workspacePath,
    status: 'succeeded',
    summary: `Closed ${closedPrUrls.length} attached PR(s) for ${formatWorkspaceTargetLabel(resolvedBranch, workspaceHeadOid)}.`,
    branch: resolvedBranch,
    attachedPrUrls,
    matchingOpenPrUrls,
    closedPrUrls
  });
}

async function runProviderTerminalCleanupCommand(input: {
  command: string;
  args: string[];
  cwd: string;
}): Promise<ProviderTerminalCleanupCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(input.command, input.args, {
      cwd: input.cwd,
      timeout: PROVIDER_TERMINAL_CLEANUP_COMMAND_TIMEOUT_MS
    });
    return {
      ok: true,
      exitCode: 0,
      stdout,
      stderr
    };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      code?: string | number;
      stdout?: string;
      stderr?: string;
      killed?: boolean;
      signal?: string | null;
    };
    const timedOut = execError.killed === true && execError.signal === 'SIGTERM';
    return {
      ok: false,
      exitCode:
        typeof execError.code === 'number' && Number.isInteger(execError.code)
          ? execError.code
          : null,
      stdout: typeof execError.stdout === 'string' ? execError.stdout : '',
      stderr:
        typeof execError.stderr === 'string' && execError.stderr.length > 0
          ? execError.stderr
          : timedOut
            ? `command timed out after ${PROVIDER_TERMINAL_CLEANUP_COMMAND_TIMEOUT_MS}ms`
          : (execError.message ?? ''),
    };
  }
}

function buildResult(input: {
  attemptedAt: string;
  issueId: string;
  issueIdentifier: string | null;
  workspacePath: string;
  status: ProviderTerminalCleanupStatus;
  summary: string;
  error?: string | null;
  branch: string | null;
  attachedPrUrls?: string[];
  matchingOpenPrUrls?: string[];
  closedPrUrls?: string[];
}): ProviderTerminalCleanupResult {
  return {
    attemptedAt: input.attemptedAt,
    status: input.status,
    summary: input.summary,
    error: input.error ?? null,
    issueId: input.issueId,
    issueIdentifier: input.issueIdentifier,
    workspacePath: input.workspacePath,
    branch: input.branch,
    attachedPrUrls: [...(input.attachedPrUrls ?? [])],
    matchingOpenPrUrls: [...(input.matchingOpenPrUrls ?? [])],
    closedPrUrls: [...(input.closedPrUrls ?? [])]
  };
}

function collectAttachedGitHubPrUrls(attachments: ProviderLinearWorkflowAttachment[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const attachment of attachments) {
    const parsed = parseGitHubPullRequestUrl(attachment.url);
    if (!parsed || seen.has(parsed.canonicalUrl)) {
      continue;
    }
    seen.add(parsed.canonicalUrl);
    urls.push(parsed.canonicalUrl);
  }
  return urls;
}

function parsePrViewResponse(value: string): {
  state: string | null;
  headRefName: string | null;
  headRefOid: string | null;
  url: string | null;
  repoKey: string | null;
  headRepoKey: string | null;
} | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const parsedUrl = parseGitHubPullRequestUrl(typeof parsed.url === 'string' ? parsed.url : null);
    const headRepository = asRecord(parsed.headRepository);
    const headRepositoryOwner = asRecord(parsed.headRepositoryOwner);
    const headRepositoryName = normalizeOptionalString(headRepository?.name);
    const headRepositoryOwnerLogin = normalizeOptionalString(headRepositoryOwner?.login);
    const isCrossRepository =
      typeof parsed.isCrossRepository === 'boolean' ? parsed.isCrossRepository : null;
    const headRepoKey =
      headRepositoryName && headRepositoryOwnerLogin
        ? `${headRepositoryOwnerLogin.toLowerCase()}/${headRepositoryName.toLowerCase()}`
        : isCrossRepository === false
          ? parsedUrl?.repoKey ?? null
          : null;
    return {
      state:
        normalizeOptionalString(typeof parsed.state === 'string' ? parsed.state : null)?.toUpperCase() ?? null,
      headRefName: normalizeOptionalString(
        typeof parsed.headRefName === 'string' ? parsed.headRefName : null
      ),
      headRefOid: normalizeOptionalString(
        typeof parsed.headRefOid === 'string' ? parsed.headRefOid : null
      ),
      url: parsedUrl?.canonicalUrl ?? null,
      repoKey: parsedUrl?.repoKey ?? null,
      headRepoKey
    };
  } catch {
    return null;
  }
}

function renderClosingComment(template: string, branch: string): string {
  return template.replaceAll('{{branch}}', branch);
}

function formatCommandFailure(command: string, result: ProviderTerminalCleanupCommandResult): string {
  const parts = [`${command} exited ${result.exitCode ?? 'unknown'}`];
  const stderr = result.stderr.trim();
  const stdout = result.stdout.trim();
  if (stderr) {
    parts.push(`stderr=${JSON.stringify(stderr)}`);
  } else if (stdout) {
    parts.push(`stdout=${JSON.stringify(stdout)}`);
  }
  return parts.join(' ');
}

async function workspaceExists(workspacePath: string): Promise<boolean> {
  try {
    await access(workspacePath);
    return true;
  } catch {
    return false;
  }
}

function formatWorkspaceTargetLabel(branch: string | null, headOid: string | null): string {
  if (branch) {
    return `branch ${branch}`;
  }
  if (headOid) {
    return `detached HEAD ${shortOid(headOid)}`;
  }
  return 'the workspace target';
}

function shortOid(value: string | null | undefined): string {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.slice(0, 12) : 'unknown';
}

function parseGitHubPullRequestUrl(
  value: string | null | undefined
): {
  canonicalUrl: string;
  repoKey: string;
} | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    return null;
  }
  const segments = parsed.pathname.split('/').filter(Boolean);
  const owner = normalizeOptionalString(segments[0] ?? null);
  const repo = normalizeOptionalString(segments[1] ?? null);
  const resource = normalizeOptionalString(segments[2] ?? null)?.toLowerCase() ?? null;
  const pullNumber = normalizePullRequestNumber(segments[3] ?? null);
  if (!owner || !repo || resource !== 'pull' || !pullNumber) {
    return null;
  }

  return {
    canonicalUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    repoKey: `${owner.toLowerCase()}/${repo.toLowerCase()}`
  };
}

function parseGitHubRepositoryUrl(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  const scpMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (scpMatch) {
    return `${scpMatch[1]!.toLowerCase()}/${scpMatch[2]!.toLowerCase()}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    return null;
  }
  const segments = parsed.pathname.split('/').filter(Boolean);
  const owner = normalizeOptionalString(segments[0] ?? null);
  const repo = normalizeOptionalString((segments[1] ?? '').replace(/\.git$/iu, ''));
  if (!owner || !repo || segments.length !== 2) {
    return null;
  }
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function normalizePullRequestNumber(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized || !/^\d+$/u.test(normalized)) {
    return null;
  }
  return String(Number.parseInt(normalized, 10));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | null {
  const value = record?.[key];
  if (typeof value === 'boolean') {
    return value;
  }
  return null;
}

function readNonEmptyString(
  record: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(record?.[key] as string | null | undefined);
    if (value) {
      return value;
    }
  }
  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
