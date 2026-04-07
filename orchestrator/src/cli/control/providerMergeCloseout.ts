import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';

import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';
import {
  getProviderLinearIssueContext,
  transitionProviderLinearIssueState
} from './providerLinearWorkflowFacade.js';
import { isoTimestamp } from '../utils/time.js';
import {
  buildPrMergeArgs,
  fetchPrStatusSnapshot,
  parseGitHubRepoFromRemoteUrl,
  resolveActionRequiredReasons,
  type PrWatchMergeSnapshot
} from '../../../../scripts/lib/pr-watch-merge.js';

const execFileAsync = promisify(execFile);
const PROVIDER_MERGE_CLOSEOUT_COMMAND_TIMEOUT_MS = 15_000;
const PROVIDER_MERGE_CLOSEOUT_MERGE_METHOD = 'squash';

export type ProviderMergeCloseoutStatus =
  | 'watching'
  | 'action_required'
  | 'merged'
  | 'merge_failed'
  | 'transition_failed';

export interface ProviderMergeCloseoutPullRequestRecord {
  url: string;
  owner: string;
  repo: string;
  number: number;
}

export interface ProviderMergeCloseoutSnapshotRecord {
  state: string | null;
  review_decision: string | null;
  merge_state_status: string | null;
  ready_to_merge: boolean;
  gate_reasons: string[];
  action_required_reasons: string[];
  unresolved_thread_count: number | null;
  checks_pending: number | null;
  checks_failed: number | null;
  required_checks_pending: number | null;
  required_checks_failed: number | null;
  updated_at: string | null;
  merged_at: string | null;
  head_oid: string | null;
}

export interface ProviderMergeCloseoutAttemptRecord {
  attempted_at: string;
  command: string;
  args: string[];
  exit_code: number | null;
  ok: boolean;
  stdout: string | null;
  stderr: string | null;
}

export interface ProviderMergeCloseoutSharedRootRecord {
  status: 'reconciled' | 'skipped' | 'failed';
  attempted_at: string;
  before_status: string | null;
  after_status: string | null;
  reason: string;
}

export interface ProviderMergeCloseoutLinearTransitionRecord {
  status: 'transitioned' | 'noop' | 'failed';
  attempted_at: string;
  previous_state: string | null;
  target_state: string;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  error: string | null;
}

export interface ProviderMergeCloseoutRecord {
  recorded_at: string;
  issue_id: string;
  issue_identifier: string | null;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  status: ProviderMergeCloseoutStatus;
  reason: string;
  summary: string;
  attached_pr_urls: string[];
  ignored_historical_pr_urls: string[];
  conflicting_attached_pr_urls: string[];
  pr: ProviderMergeCloseoutPullRequestRecord | null;
  snapshot: ProviderMergeCloseoutSnapshotRecord | null;
  merge_attempt: ProviderMergeCloseoutAttemptRecord | null;
  shared_root: ProviderMergeCloseoutSharedRootRecord | null;
  linear_transition: ProviderMergeCloseoutLinearTransitionRecord | null;
}

export interface ProviderMergeCloseoutCommandResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export type ProviderMergeCloseoutCommandRunner = (input: {
  command: string;
  args: string[];
  cwd: string;
}) => Promise<ProviderMergeCloseoutCommandResult>;

type ProviderPrSnapshotReaderInput = {
  owner: string;
  repo: string;
  prNumber: number;
  readinessMode?: 'merge' | 'review';
};

type ProviderPrSnapshotRecord = Record<string, unknown> | PrWatchMergeSnapshot;

interface ProviderMergeCloseoutDependencies {
  now?: () => string;
  readIssueContext?: typeof getProviderLinearIssueContext;
  transitionIssueState?: typeof transitionProviderLinearIssueState;
  runCommand?: ProviderMergeCloseoutCommandRunner;
  fetchSnapshot?: (input: ProviderPrSnapshotReaderInput) => Promise<ProviderPrSnapshotRecord>;
  resolveSnapshotActionRequiredReasons?: (
    snapshot: ProviderPrSnapshotRecord,
    options?: { readinessMode?: 'merge' | 'review' }
  ) => string[];
}

interface ProviderMergeCloseoutAttachedPrResolution {
  selected_pr: ProviderMergeCloseoutPullRequestRecord | null;
  selected_snapshot: ProviderMergeCloseoutSnapshotRecord | null;
  ignored_historical_pr_urls: string[];
  conflicting_attached_pr_urls: string[];
  selection_note: string | null;
}

export async function runProviderDeterministicMergeCloseout(
  input: {
    issueId: string;
    issueIdentifier?: string | null;
    issueState?: string | null;
    issueStateType?: string | null;
    issueUpdatedAt?: string | null;
    repoRoot: string;
    sourceSetup?: DispatchPilotSourceSetup | null;
    env?: NodeJS.ProcessEnv;
  },
  deps: ProviderMergeCloseoutDependencies = {}
): Promise<ProviderMergeCloseoutRecord> {
  const env = input.env ?? process.env;
  const now = deps.now ?? isoTimestamp;
  const readIssueContext = deps.readIssueContext ?? getProviderLinearIssueContext;
  const transitionIssueState = deps.transitionIssueState ?? transitionProviderLinearIssueState;
  const runCommand = deps.runCommand ?? runProviderMergeCloseoutCommand;
  const resolveSnapshot = deps.fetchSnapshot ?? fetchPrStatusSnapshot;
  const resolveSnapshotActionRequiredReasons =
    deps.resolveSnapshotActionRequiredReasons ??
    ((snapshot: ProviderPrSnapshotRecord, options?: { readinessMode?: 'merge' | 'review' }) =>
      resolveActionRequiredReasons(snapshot as PrWatchMergeSnapshot, options));

  const recordedAt = now();
  const base = {
    recorded_at: recordedAt,
    issue_id: input.issueId,
    issue_identifier: normalizeOptionalString(input.issueIdentifier),
    issue_state: normalizeOptionalString(input.issueState),
    issue_state_type: normalizeOptionalString(input.issueStateType),
    issue_updated_at: normalizeOptionalString(input.issueUpdatedAt),
    attached_pr_urls: [] as string[],
    ignored_historical_pr_urls: [] as string[],
    conflicting_attached_pr_urls: [] as string[],
    pr: null as ProviderMergeCloseoutPullRequestRecord | null,
    snapshot: null as ProviderMergeCloseoutSnapshotRecord | null,
    merge_attempt: null as ProviderMergeCloseoutAttemptRecord | null,
    shared_root: null as ProviderMergeCloseoutSharedRootRecord | null,
    linear_transition: null as ProviderMergeCloseoutLinearTransitionRecord | null
  };

  const repoOriginResult = await runCommand({
    command: 'git',
    args: ['-C', input.repoRoot, 'remote', 'get-url', 'origin'],
    cwd: input.repoRoot
  });
  if (!repoOriginResult.ok) {
    return {
      ...base,
      status: 'merge_failed',
      reason: 'shared_root_origin_unavailable',
      summary: 'Shared repo origin remote could not be resolved.',
      attached_pr_urls: [],
      pr: null,
      snapshot: null,
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    };
  }
  const parsedRepo = parseGitHubRepoFromRemoteUrl(repoOriginResult.stdout);
  const repoKey = parsedRepo
    ? `${parsedRepo.owner.toLowerCase()}/${parsedRepo.repo.toLowerCase()}`
    : null;
  if (!repoKey) {
    return {
      ...base,
      status: 'merge_failed',
      reason: 'shared_root_repo_unrecognized',
      summary: 'Shared repo origin is not a GitHub repository URL.',
      attached_pr_urls: [],
      pr: null,
      snapshot: null,
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    };
  }

  const issueContext = await readIssueContext({
    issueId: input.issueId,
    env,
    sourceSetup: input.sourceSetup
  });
  if (!issueContext.ok) {
    return {
      ...base,
      status: 'merge_failed',
      reason: 'linear_issue_context_failed',
      summary: `Linear issue context could not be loaded (${issueContext.error.code}).`,
      attached_pr_urls: [],
      pr: null,
      snapshot: null,
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    };
  }

  const attachedPrUrls = collectAttachedGitHubPrUrls(issueContext.issue.attachments);
  const sameRepoPrs = attachedPrUrls
    .map((url) => parseGitHubPullRequestUrl(url))
    .filter((value): value is ProviderMergeCloseoutPullRequestRecord => Boolean(value))
    .filter((value) => `${value.owner.toLowerCase()}/${value.repo.toLowerCase()}` === repoKey);
  const currentIssueState = issueContext.issue.state?.name ?? base.issue_state;
  const currentIssueStateType = issueContext.issue.state?.type ?? base.issue_state_type;
  const currentIssueUpdatedAt = issueContext.issue.updated_at ?? base.issue_updated_at;
  const baseWithContext = {
    ...base,
    issue_state: currentIssueState,
    issue_state_type: currentIssueStateType,
    issue_updated_at: currentIssueUpdatedAt,
    attached_pr_urls: [...attachedPrUrls]
  };

  if (normalizeProviderMergeCloseoutIssueState(currentIssueState) !== 'merging') {
    return {
      ...baseWithContext,
      status: 'action_required',
      reason: 'issue_no_longer_merging',
      summary:
        currentIssueState && currentIssueState.trim().length > 0
          ? `Live Linear issue state is ${currentIssueState}, so deterministic merge closeout is not armed.`
          : 'Live Linear issue state is no longer Merging, so deterministic merge closeout is not armed.'
    };
  }

  if (sameRepoPrs.length === 0) {
    return {
      ...baseWithContext,
      status: 'action_required',
      reason: attachedPrUrls.length === 0 ? 'no_attached_pr' : 'attached_pr_repo_mismatch',
      summary:
        attachedPrUrls.length === 0
          ? 'No attached GitHub pull request is present for this Merging issue.'
          : 'Attached GitHub pull requests do not match the shared repository root.'
    };
  }

  let ignoredHistoricalPrUrls: string[] = [];
  let conflictingAttachedPrUrls: string[] = [];
  let selectionNote: string | null = null;
  let pr = sameRepoPrs[0]!;
  let snapshot: ProviderMergeCloseoutSnapshotRecord | null = null;

  if (sameRepoPrs.length > 1) {
    let resolution: ProviderMergeCloseoutAttachedPrResolution;
    try {
      resolution = await resolveAttachedSameRepoPullRequestCandidate({
        candidates: sameRepoPrs,
        resolveSnapshot,
        resolveSnapshotActionRequiredReasons
      });
    } catch (error) {
      return {
        ...baseWithContext,
        status: 'merge_failed',
        reason: 'snapshot_read_failed',
        summary: `GitHub merge-readiness snapshot could not be loaded while disambiguating attached pull requests: ${(error as Error)?.message ?? String(error)}.`
      };
    }

    ignoredHistoricalPrUrls = resolution.ignored_historical_pr_urls;
    conflictingAttachedPrUrls = resolution.conflicting_attached_pr_urls;
    selectionNote = resolution.selection_note;
    if (!resolution.selected_pr) {
      return {
        ...baseWithContext,
        ignored_historical_pr_urls: [...ignoredHistoricalPrUrls],
        conflicting_attached_pr_urls: [...conflictingAttachedPrUrls],
        status: 'action_required',
        reason: 'multiple_attached_prs',
        summary: buildMultipleAttachedPrsSummary({
          repoKey,
          ignoredHistoricalPrUrls,
          conflictingAttachedPrUrls
        })
      };
    }

    pr = resolution.selected_pr;
    snapshot = resolution.selected_snapshot;
  }

  const baseWithResolution = {
    ...baseWithContext,
    ignored_historical_pr_urls: [...ignoredHistoricalPrUrls],
    conflicting_attached_pr_urls: [...conflictingAttachedPrUrls]
  };
  const summarizeSelection = (summary: string): string =>
    selectionNote ? `${summary} ${selectionNote}` : summary;

  if (!snapshot) {
    try {
      const rawSnapshot = await resolveSnapshot({
        owner: pr.owner,
        repo: pr.repo,
        prNumber: pr.number,
        readinessMode: 'merge'
      });
      const actionRequiredReasons = resolveSnapshotActionRequiredReasons(rawSnapshot as never, {
        readinessMode: 'merge'
      });
      snapshot = mapSnapshotRecord(rawSnapshot, actionRequiredReasons);
    } catch (error) {
      return {
        ...baseWithResolution,
        pr,
        status: 'merge_failed',
        reason: 'snapshot_read_failed',
        summary: summarizeSelection(
          `GitHub merge-readiness snapshot could not be loaded: ${(error as Error)?.message ?? String(error)}`
        ),
        snapshot: null
      };
    }
  }

  if (!snapshot) {
    return {
      ...baseWithResolution,
      pr,
      status: 'merge_failed',
      reason: 'snapshot_read_failed',
      summary: summarizeSelection('GitHub merge-readiness snapshot could not be loaded.'),
      snapshot: null
    };
  }

  const alreadyMerged = snapshot.merged_at !== null || snapshot.state === 'MERGED';

  if (!alreadyMerged && !snapshot.ready_to_merge) {
    const nonMergedOutcome = classifyNonMergedSnapshot(snapshot, pr.number)!;
    return {
      ...baseWithResolution,
      pr,
      snapshot,
      ...nonMergedOutcome,
      summary: summarizeSelection(nonMergedOutcome.summary)
    };
  }

  let mergeAttempt: ProviderMergeCloseoutAttemptRecord | null = null;
  let verificationSnapshot = snapshot;

  if (!alreadyMerged) {
    const mergeAttemptedAt = now();
    const mergeArgs = buildPrMergeArgs({
      owner: pr.owner,
      repo: pr.repo,
      prNumber: pr.number,
      mergeMethod: PROVIDER_MERGE_CLOSEOUT_MERGE_METHOD,
      deleteBranch: false,
      headOid: snapshot.head_oid
    });
    const mergeResult = await runCommand({
      command: 'gh',
      args: mergeArgs,
      cwd: input.repoRoot
    });
    mergeAttempt = {
      attempted_at: mergeAttemptedAt,
      command: 'gh',
      args: mergeArgs,
      exit_code: mergeResult.exitCode,
      ok: mergeResult.ok,
      stdout: normalizeCommandText(mergeResult.stdout),
      stderr: normalizeCommandText(mergeResult.stderr)
    };

    try {
      const rawVerificationSnapshot = await resolveSnapshot({
        owner: pr.owner,
        repo: pr.repo,
        prNumber: pr.number,
        readinessMode: 'merge'
      });
      verificationSnapshot = mapSnapshotRecord(
        rawVerificationSnapshot,
        resolveSnapshotActionRequiredReasons(rawVerificationSnapshot as never, {
          readinessMode: 'merge'
        })
      );
    } catch {
      // Preserve the pre-merge readiness snapshot when verification cannot be reread.
    }

    if (verificationSnapshot.merged_at === null && verificationSnapshot.state !== 'MERGED') {
      const verificationOutcome = classifyNonMergedSnapshot(verificationSnapshot, pr.number);
      if (verificationOutcome) {
        return {
          ...baseWithResolution,
          pr,
          snapshot: verificationSnapshot,
          merge_attempt: mergeAttempt,
          ...verificationOutcome,
          summary: summarizeSelection(verificationOutcome.summary)
        };
      }
      return {
        ...baseWithResolution,
        pr,
        snapshot: verificationSnapshot,
        merge_attempt: mergeAttempt,
        status: 'merge_failed',
        reason: mergeResult.ok ? 'merge_not_confirmed' : 'merge_command_failed',
        summary: summarizeSelection(
          mergeResult.ok
            ? 'GitHub merge command exited successfully, but the pull request did not report a merged timestamp.'
            : 'GitHub merge command failed before the pull request was confirmed merged.'
        )
      };
    }
  }

  const sharedRoot = await reconcileSharedRootAfterMerge({
    repoRoot: input.repoRoot,
    now,
    runCommand
  });
  if (sharedRoot.status === 'failed') {
    return {
      ...baseWithResolution,
      pr,
      snapshot: verificationSnapshot,
      merge_attempt: mergeAttempt,
      shared_root: sharedRoot,
      status: 'merge_failed',
      reason: 'shared_root_reconciliation_failed',
      summary: summarizeSelection('The pull request merged, but shared-root reconciliation failed.')
    };
  }

  if (sharedRoot.status === 'skipped') {
    return {
      ...baseWithResolution,
      pr,
      snapshot: verificationSnapshot,
      merge_attempt: mergeAttempt,
      shared_root: sharedRoot,
      status: 'action_required',
      reason: 'pending_shared_root_reconciliation',
      summary: summarizeSelection(
        alreadyMerged
          ? `Attached PR #${pr.number} was already merged; shared-root reconciliation is pending (${sharedRoot.reason}) before the Linear issue can transition to Done.`
          : `Merged attached PR #${pr.number}; shared-root reconciliation is pending (${sharedRoot.reason}) before the Linear issue can transition to Done.`
      )
    };
  }

  const transitionAttemptedAt = now();
  const transitionResult = await transitionIssueState({
    issueId: input.issueId,
    stateName: 'Done',
    env,
    sourceSetup: input.sourceSetup
  });
  const linearTransition: ProviderMergeCloseoutLinearTransitionRecord = transitionResult.ok
    ? {
        status: transitionResult.action === 'noop' ? 'noop' : 'transitioned',
        attempted_at: transitionAttemptedAt,
        previous_state: transitionResult.previous_state?.name ?? currentIssueState ?? null,
        target_state: transitionResult.target_state.name,
        issue_state: transitionResult.issue.state?.name ?? null,
        issue_state_type: transitionResult.issue.state?.type ?? null,
        issue_updated_at: transitionResult.issue.updated_at ?? currentIssueUpdatedAt,
        error: null
      }
    : {
        status: 'failed',
        attempted_at: transitionAttemptedAt,
        previous_state: currentIssueState ?? null,
        target_state: 'Done',
        issue_state: currentIssueState ?? null,
        issue_state_type: currentIssueStateType ?? null,
        issue_updated_at: currentIssueUpdatedAt,
        error: `${transitionResult.error.code}: ${transitionResult.error.message}`
      };

  if (!transitionResult.ok) {
    return {
      ...baseWithResolution,
      pr,
      snapshot: verificationSnapshot,
      merge_attempt: mergeAttempt,
      shared_root: sharedRoot,
      linear_transition: linearTransition,
      status: 'transition_failed',
      reason: 'linear_done_transition_failed',
      summary: summarizeSelection('The pull request merged, but the Linear issue could not transition to Done.')
    };
  }

  return {
    ...baseWithResolution,
    issue_state: linearTransition.issue_state,
    issue_state_type: linearTransition.issue_state_type,
    issue_updated_at: linearTransition.issue_updated_at,
    pr,
    snapshot: verificationSnapshot,
    merge_attempt: mergeAttempt,
    shared_root: sharedRoot,
    linear_transition: linearTransition,
    status: 'merged',
    reason: alreadyMerged
      ? 'merged_and_transitioned_done_after_recovery'
      : 'merged_and_transitioned_done',
    summary: summarizeSelection(
      alreadyMerged
        ? `Attached PR #${pr.number} was already merged; reconciled shared root and transitioned the Linear issue to Done.`
        : `Merged attached PR #${pr.number}, reconciled shared root, and transitioned the Linear issue to Done.`
    )
  };
}

async function reconcileSharedRootAfterMerge(input: {
  repoRoot: string;
  now: () => string;
  runCommand: ProviderMergeCloseoutCommandRunner;
}): Promise<ProviderMergeCloseoutSharedRootRecord> {
  const attemptedAt = input.now();
  const beforeStatusResult = await input.runCommand({
    command: 'git',
    args: ['-C', input.repoRoot, 'status', '--short', '--branch'],
    cwd: input.repoRoot
  });
  const beforeStatus = normalizeCommandText(beforeStatusResult.stdout);
  if (!beforeStatusResult.ok) {
    return {
      status: 'failed',
      attempted_at: attemptedAt,
      before_status: beforeStatus,
      after_status: null,
      reason: 'git_status_failed'
    };
  }
  const safety = assessSharedRootMergeSafety(beforeStatus);
  if (!safety.safe) {
    return {
      status: 'skipped',
      attempted_at: attemptedAt,
      before_status: beforeStatus,
      after_status: beforeStatus,
      reason: safety.reason
    };
  }

  const fetchResult = await input.runCommand({
    command: 'git',
    args: ['-C', input.repoRoot, 'fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main'],
    cwd: input.repoRoot
  });
  if (!fetchResult.ok) {
    return {
      status: 'failed',
      attempted_at: attemptedAt,
      before_status: beforeStatus,
      after_status: null,
      reason: 'shared_root_fetch_failed'
    };
  }

  const mergeResult = await input.runCommand({
    command: 'git',
    args: ['-C', input.repoRoot, 'merge', '--ff-only', 'origin/main'],
    cwd: input.repoRoot
  });
  if (!mergeResult.ok) {
    return {
      status: 'failed',
      attempted_at: attemptedAt,
      before_status: beforeStatus,
      after_status: null,
      reason: 'shared_root_fast_forward_failed'
    };
  }

  const afterStatusResult = await input.runCommand({
    command: 'git',
    args: ['-C', input.repoRoot, 'status', '--short', '--branch'],
    cwd: input.repoRoot
  });
  return {
    status: afterStatusResult.ok ? 'reconciled' : 'failed',
    attempted_at: attemptedAt,
    before_status: beforeStatus,
    after_status: normalizeCommandText(afterStatusResult.stdout),
    reason: afterStatusResult.ok ? 'shared_root_reconciled' : 'git_status_after_failed'
  };
}

async function runProviderMergeCloseoutCommand(input: {
  command: string;
  args: string[];
  cwd: string;
}): Promise<ProviderMergeCloseoutCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(input.command, input.args, {
      cwd: input.cwd,
      timeout: PROVIDER_MERGE_CLOSEOUT_COMMAND_TIMEOUT_MS
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
            ? `command timed out after ${PROVIDER_MERGE_CLOSEOUT_COMMAND_TIMEOUT_MS}ms`
            : (execError.message ?? '')
    };
  }
}

function collectAttachedGitHubPrUrls(
  attachments: Array<{ url?: string | null }>
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const attachment of attachments) {
    const parsed = parseGitHubPullRequestUrl(attachment?.url);
    const comparisonKey = parsed
      ? `${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}#${parsed.number}`
      : null;
    if (!parsed || !comparisonKey || seen.has(comparisonKey)) {
      continue;
    }
    seen.add(comparisonKey);
    urls.push(parsed.url);
  }
  return urls;
}

async function resolveAttachedSameRepoPullRequestCandidate(input: {
  candidates: ProviderMergeCloseoutPullRequestRecord[];
  resolveSnapshot: (
    input: ProviderPrSnapshotReaderInput
  ) => Promise<ProviderPrSnapshotRecord>;
  resolveSnapshotActionRequiredReasons: (
    snapshot: ProviderPrSnapshotRecord,
    options?: { readinessMode?: 'merge' | 'review' }
  ) => string[];
}): Promise<ProviderMergeCloseoutAttachedPrResolution> {
  const inspectedCandidates: Array<{
    pr: ProviderMergeCloseoutPullRequestRecord;
    snapshot: ProviderMergeCloseoutSnapshotRecord;
  }> = [];

  for (const pr of input.candidates) {
    const rawSnapshot = await input.resolveSnapshot({
      owner: pr.owner,
      repo: pr.repo,
      prNumber: pr.number,
      readinessMode: 'merge'
    });
    inspectedCandidates.push({
      pr,
      snapshot: mapSnapshotRecord(
        rawSnapshot,
        input.resolveSnapshotActionRequiredReasons(rawSnapshot as never, {
          readinessMode: 'merge'
        })
      )
    });
  }

  const mergedCandidates = inspectedCandidates.filter((candidate) =>
    isMergedPullRequestSnapshot(candidate.snapshot)
  );
  const nonMergedCandidates = inspectedCandidates.filter(
    (candidate) => !isMergedPullRequestSnapshot(candidate.snapshot)
  );

  if (mergedCandidates.length > 0 && nonMergedCandidates.length === 1) {
    const selectedCandidate = nonMergedCandidates[0]!;
    const ignoredHistoricalCandidates = mergedCandidates.filter((candidate) =>
      isSnapshotStrictlyOlderThanSelection(candidate.snapshot, selectedCandidate.snapshot)
    );
    if (ignoredHistoricalCandidates.length === mergedCandidates.length) {
      const ignoredHistoricalPrUrls = ignoredHistoricalCandidates.map((candidate) => candidate.pr.url);
      return {
        selected_pr: selectedCandidate.pr,
        selected_snapshot: selectedCandidate.snapshot,
        ignored_historical_pr_urls: ignoredHistoricalPrUrls,
        conflicting_attached_pr_urls: [],
        selection_note:
          ignoredHistoricalPrUrls.length > 0
            ? `Ignored historical merged PR URLs: ${ignoredHistoricalPrUrls.join(', ')}.`
            : null
      };
    }
  }

  const selectedMergedCandidate = mergedCandidates.reduce<
    | {
        pr: ProviderMergeCloseoutPullRequestRecord;
        snapshot: ProviderMergeCloseoutSnapshotRecord;
      }
    | null
  >(
    (currentNewest, candidate) =>
      !currentNewest || isSnapshotStrictlyOlderThanSelection(currentNewest.snapshot, candidate.snapshot)
        ? candidate
        : currentNewest,
    null
  );
  if (selectedMergedCandidate) {
    const otherMergedCandidates = mergedCandidates.filter(
      (candidate) => candidate.pr.url !== selectedMergedCandidate.pr.url
    );
    const ignoredHistoricalMergedCandidates = otherMergedCandidates.filter((candidate) =>
      isSnapshotStrictlyOlderThanSelection(candidate.snapshot, selectedMergedCandidate.snapshot)
    );
    const staleUnmergedCandidates = nonMergedCandidates.filter((candidate) =>
      isSnapshotStrictlyOlderThanSelection(candidate.snapshot, selectedMergedCandidate.snapshot)
    );
    if (
      ignoredHistoricalMergedCandidates.length === otherMergedCandidates.length &&
      staleUnmergedCandidates.length === nonMergedCandidates.length
    ) {
      const ignoredHistoricalPrUrls = ignoredHistoricalMergedCandidates.map((candidate) => candidate.pr.url);
      return {
        selected_pr: selectedMergedCandidate.pr,
        selected_snapshot: selectedMergedCandidate.snapshot,
        ignored_historical_pr_urls: ignoredHistoricalPrUrls,
        conflicting_attached_pr_urls: [],
        selection_note: `Selected already-merged PR ${selectedMergedCandidate.pr.url} because all remaining attached same-repo PR URLs are older.${ignoredHistoricalPrUrls.length > 0 ? ` Ignored older merged PR URLs: ${ignoredHistoricalPrUrls.join(', ')}.` : ''}${staleUnmergedCandidates.length > 0 ? ` Older unmerged PR URLs: ${staleUnmergedCandidates.map((candidate) => candidate.pr.url).join(', ')}.` : ''}`
      };
    }
  }

  const ignoredHistoricalCandidates =
    nonMergedCandidates.length > 0
      ? mergedCandidates.filter((candidate) =>
          nonMergedCandidates.every((currentCandidate) =>
            isSnapshotStrictlyOlderThanSelection(candidate.snapshot, currentCandidate.snapshot)
          )
        )
      : [];
  const ignoredHistoricalPrUrls = ignoredHistoricalCandidates.map((candidate) => candidate.pr.url);
  const ignoredHistoricalUrlSet = new Set(ignoredHistoricalPrUrls);

  return {
    selected_pr: null,
    selected_snapshot: null,
    ignored_historical_pr_urls: ignoredHistoricalPrUrls,
    conflicting_attached_pr_urls: inspectedCandidates
      .filter((candidate) => !ignoredHistoricalUrlSet.has(candidate.pr.url))
      .map((candidate) => candidate.pr.url),
    selection_note: null
  };
}

function buildMultipleAttachedPrsSummary(input: {
  repoKey: string;
  ignoredHistoricalPrUrls: string[];
  conflictingAttachedPrUrls: string[];
}): string {
  const ignoredHistoricalSummary =
    input.ignoredHistoricalPrUrls.length > 0
      ? ` Ignored historical merged PR URLs: ${input.ignoredHistoricalPrUrls.join(', ')}.`
      : '';
  if (input.conflictingAttachedPrUrls.length === 0) {
    return `Attached GitHub pull requests match ${input.repoKey}, but no current merge candidate remains after historical filtering; merge closeout is not armed.${ignoredHistoricalSummary}`;
  }
  return `Multiple attached GitHub pull requests match ${input.repoKey}; conflicting attached PR URLs still require deterministic disambiguation: ${input.conflictingAttachedPrUrls.join(', ')}.${ignoredHistoricalSummary}`;
}

function classifyNonMergedSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord,
  prNumber: number
): {
  status: 'watching' | 'action_required';
  reason: string;
  summary: string;
} | null {
  if (snapshot.state === 'CLOSED') {
    return {
      status: 'action_required',
      reason: 'pr_closed_unmerged',
      summary: `Attached PR #${prNumber} is closed without merging; reopen it or attach a replacement PR.`
    };
  }
  if (snapshot.action_required_reasons.length > 0) {
    return {
      status: 'action_required',
      reason: snapshot.action_required_reasons[0] ?? 'merge_action_required',
      summary: `Merge closeout is blocked by: ${snapshot.action_required_reasons.join(', ')}.`
    };
  }
  if (snapshot.gate_reasons.length > 0 || !snapshot.ready_to_merge) {
    return {
      status: 'watching',
      reason: snapshot.gate_reasons[0] ?? 'waiting_for_merge_ready',
      summary:
        snapshot.gate_reasons.length > 0
          ? `Merge closeout is waiting for readiness gates to clear: ${snapshot.gate_reasons.join(', ')}.`
          : 'Merge closeout is waiting for the attached pull request to become merge-ready.'
    };
  }
  return null;
}

function isMergedPullRequestSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord
): boolean {
  return snapshot.merged_at !== null || snapshot.state === 'MERGED';
}

function isSnapshotStrictlyOlderThanSelection(
  candidate: ProviderMergeCloseoutSnapshotRecord,
  selected: ProviderMergeCloseoutSnapshotRecord
): boolean {
  const candidateTimestamp = resolveSnapshotDisambiguationTimestamp(candidate);
  const selectedTimestamp = resolveSnapshotDisambiguationTimestamp(selected);
  if (candidateTimestamp === null || selectedTimestamp === null) {
    return false;
  }
  return candidateTimestamp < selectedTimestamp;
}

function resolveSnapshotDisambiguationTimestamp(
  snapshot: ProviderMergeCloseoutSnapshotRecord
): number | null {
  const preferredTimestamp = isMergedPullRequestSnapshot(snapshot)
    ? snapshot.merged_at ?? snapshot.updated_at
    : snapshot.updated_at;
  const parsed = Date.parse(preferredTimestamp ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

function mapSnapshotRecord(
  snapshot: ProviderPrSnapshotRecord,
  actionRequiredReasons: string[]
): ProviderMergeCloseoutSnapshotRecord {
  const checks = readRecord(snapshot.checks);
  const requiredChecks = readRecord(snapshot.requiredChecks);
  return {
    state: normalizeOptionalString(snapshot.state),
    review_decision: normalizeOptionalString(snapshot.reviewDecision),
    merge_state_status: normalizeOptionalString(snapshot.mergeStateStatus),
    ready_to_merge: snapshot.readyToMerge === true,
    gate_reasons: readStringArray(snapshot.gateReasons),
    action_required_reasons: [...actionRequiredReasons],
    unresolved_thread_count: normalizeOptionalNumber(snapshot.unresolvedThreadCount),
    checks_pending: readArrayLength(checks?.pending),
    checks_failed: readArrayLength(checks?.failed),
    required_checks_pending: readArrayLength(requiredChecks?.pending),
    required_checks_failed: readArrayLength(requiredChecks?.failed),
    updated_at: normalizeOptionalString(snapshot.updatedAt),
    merged_at: normalizeOptionalString(snapshot.mergedAt),
    head_oid: normalizeOptionalString(snapshot.headOid)
  };
}

function assessSharedRootMergeSafety(
  statusOutput: string | null
): {
  safe: boolean;
  reason: string;
} {
  const lines = (statusOutput ?? '').split(/\r?\n/u).filter((line) => line.length > 0);
  const branchHeader = lines[0]?.trim() ?? '';
  if (!branchHeader.startsWith('## ')) {
    return {
      safe: false,
      reason: 'shared_root_status_header_missing'
    };
  }
  if (!/^## main(?:$|\.{3})/u.test(branchHeader)) {
    return {
      safe: false,
      reason: 'shared_root_not_on_main'
    };
  }
  const trackingStatusMatch = branchHeader.match(/\[([^\]]+)\]\s*$/u);
  if (trackingStatusMatch) {
    const trackingParts = trackingStatusMatch[1]!
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part.length > 0);
    const fastForwardSafe = trackingParts.every((part) => /^behind \d+$/u.test(part));
    if (!fastForwardSafe) {
      return {
        safe: false,
        reason: 'shared_root_not_ff_only_safe'
      };
    }
  }
  if (lines.length > 1) {
    return {
      safe: false,
      reason: 'shared_root_dirty'
    };
  }
  return {
    safe: true,
    reason: 'shared_root_clean_main'
  };
}

function parseGitHubPullRequestUrl(
  value: string | null | undefined
): ProviderMergeCloseoutPullRequestRecord | null {
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
  const number = normalizePrNumber(segments[3] ?? null);
  if (!owner || !repo || resource !== 'pull' || number === null) {
    return null;
  }
  return {
    url: `https://github.com/${owner}/${repo}/pull/${number}`,
    owner,
    repo,
    number
  };
}

function normalizePrNumber(value: string | null | undefined): number | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized || !/^\d+$/u.test(normalized)) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeProviderMergeCloseoutIssueState(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCommandText(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readArrayLength(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}
