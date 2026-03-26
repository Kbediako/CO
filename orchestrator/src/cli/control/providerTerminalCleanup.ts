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
      summary: `No attached GitHub PRs were present for branch ${branch}.`,
      branch
    });
  }

  const matchingOpenPrUrls: string[] = [];
  const closedPrUrls: string[] = [];
  const errors: string[] = [];
  let resolvedBranch = branch;
  const workspaceTargetLabel = formatWorkspaceTargetLabel(branch, workspaceHeadOid);

  for (const attachedPrUrl of attachedPrUrls) {
    const prView = await runCommand({
      command: 'gh',
      args: ['pr', 'view', attachedPrUrl, '--json', 'state,headRefName,headRefOid,url'],
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

    const matchesBranch =
      branch !== null &&
      prDetails.headRefName === branch &&
      prDetails.headRefOid === workspaceHeadOid;
    const matchesHead =
      branch === null &&
      workspaceHeadOid !== null &&
      prDetails.headRefOid !== null &&
      prDetails.headRefOid === workspaceHeadOid;
    if (prDetails.state !== 'OPEN' || (!matchesBranch && !matchesHead)) {
      continue;
    }

    const closingBranch =
      prDetails.headRefName ??
      branch ??
      resolvedBranch ??
      `HEAD ${shortOid(workspaceHeadOid)}`;
    resolvedBranch ??= prDetails.headRefName;
    matchingOpenPrUrls.push(prDetails.url ?? attachedPrUrl);
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
          : `Terminal cleanup closed ${closedPrUrls.length} of ${matchingOpenPrUrls.length} matching attached PR(s) for ${formatWorkspaceTargetLabel(resolvedBranch, workspaceHeadOid)}.`,
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
      cwd: input.cwd
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
    };
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
} | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      state:
        normalizeOptionalString(typeof parsed.state === 'string' ? parsed.state : null)?.toUpperCase() ?? null,
      headRefName: normalizeOptionalString(
        typeof parsed.headRefName === 'string' ? parsed.headRefName : null
      ),
      headRefOid: normalizeOptionalString(
        typeof parsed.headRefOid === 'string' ? parsed.headRefOid : null
      ),
      url: parseGitHubPullRequestUrl(typeof parsed.url === 'string' ? parsed.url : null)?.canonicalUrl ?? null
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
    canonicalUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`
  };
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
