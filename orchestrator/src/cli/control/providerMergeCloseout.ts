import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import type { LiveLinearTrackedBlocker } from './linearDispatchSource.js';
import type { DispatchPilotSourceSetup } from './trackerDispatchPilot.js';
import { classifyProviderLinearWorkflowState } from './providerLinearWorkflowStates.js';
import {
  getProviderLinearIssueContext,
  transitionProviderLinearIssueState,
  type ProviderLinearIssueContext
} from './providerLinearWorkflowFacade.js';
import { isoTimestamp } from '../utils/time.js';
import {
  buildPrMergeArgs,
  buildPrUpdateBranchArgs,
  fetchPrStatusSnapshot,
  formatGitHubRateLimitStatus,
  isConflictLikeBranchRecoveryFailureMessage,
  parseGitHubRepoFromRemoteUrl,
  resolveAutomaticBranchRecoveryReason,
  resolveActionRequiredReasons,
  resolveGitHubRateLimitStatus,
  shouldAttemptAutomaticBranchRecovery,
  type PrWatchMergeGitHubRateLimitStatus,
  type PrWatchMergeSnapshot
} from '../../../../scripts/lib/pr-watch-merge.js';

const execFileAsync = promisify(execFile);
const PROVIDER_MERGE_CLOSEOUT_COMMAND_TIMEOUT_MS = 15_000;
const PROVIDER_MERGE_CLOSEOUT_DOCS_FRESHNESS_TIMEOUT_MS = 120_000;
const PROVIDER_MERGE_CLOSEOUT_MERGE_METHOD = 'squash';
const DOCS_FRESHNESS_MAINTAIN_OWNER_KEY = 'docs:freshness:maintain';

export type ProviderMergeCloseoutStatus =
  | 'watching'
  | 'action_required'
  | 'merged'
  | 'merge_failed'
  | 'transition_failed';

export type ProviderMergeCloseoutMode = 'full' | 'probe-merged-recovery';

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
  github_rate_limit?: ProviderGitHubRateLimitRecord | null;
}

export interface ProviderGitHubRateLimitRecord {
  kind: 'github_rate_limited';
  surface: string;
  limit_type: string;
  status: number | null;
  reset_at: string | null;
  retry_after_seconds: number | null;
  retry_at: string | null;
  message: string | null;
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

export interface ProviderBranchRecoveryAttemptRecord {
  attempted_at: string;
  head_oid: string | null;
  recovery_reason: string;
  command: string;
  args: string[];
  exit_code: number | null;
  ok: boolean;
  stdout: string | null;
  stderr: string | null;
  failure_kind: 'conflict' | 'other' | null;
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

export interface ProviderDocsFreshnessOwnerCloseoutRecord {
  status: 'not_configured' | 'not_current_owner' | 'evidence_checked' | 'evidence_unavailable';
  terminal_transition_blocked: boolean;
  reason: string | null;
  policy_owner_issue: string | null;
  policy_canonical_owner_key: string | null;
  freshness_decision: string | null;
  owner_issue: string | null;
  owner_issue_action: Record<string, unknown> | null;
  owner_issue_verification: Record<string, unknown> | null;
  candidate_cohorts: Record<string, unknown>[];
  blocking_changed_paths: string[] | null;
  command: string | null;
  args: string[] | null;
  exit_code: number | null;
  ok: boolean | null;
  stdout: string | null;
  stderr: string | null;
  parse_error: string | null;
  report_path: string | null;
}

export type ProviderReviewHandoffPromotionStatus =
  | 'watching'
  | 'action_required'
  | 'promoted'
  | 'promotion_failed'
  | 'transition_failed';

export interface ProviderReviewHandoffPromotionRecord {
  recorded_at: string;
  issue_id: string;
  issue_identifier: string | null;
  issue_state: string | null;
  issue_state_type: string | null;
  issue_updated_at: string | null;
  status: ProviderReviewHandoffPromotionStatus;
  reason: string;
  summary: string;
  attached_pr_urls: string[];
  ignored_historical_pr_urls: string[];
  ignored_closed_unmerged_pr_urls?: string[];
  ignored_cross_issue_pr_urls?: string[];
  conflicting_attached_pr_urls: string[];
  pr: ProviderMergeCloseoutPullRequestRecord | null;
  snapshot: ProviderMergeCloseoutSnapshotRecord | null;
  branch_recovery: ProviderBranchRecoveryAttemptRecord | null;
  linear_transition: ProviderMergeCloseoutLinearTransitionRecord | null;
  github_rate_limit?: ProviderGitHubRateLimitRecord | null;
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
  ignored_closed_unmerged_pr_urls?: string[];
  conflicting_attached_pr_urls: string[];
  pr: ProviderMergeCloseoutPullRequestRecord | null;
  snapshot: ProviderMergeCloseoutSnapshotRecord | null;
  branch_recovery: ProviderBranchRecoveryAttemptRecord | null;
  merge_attempt: ProviderMergeCloseoutAttemptRecord | null;
  shared_root: ProviderMergeCloseoutSharedRootRecord | null;
  docs_freshness_owner: ProviderDocsFreshnessOwnerCloseoutRecord | null;
  linear_transition: ProviderMergeCloseoutLinearTransitionRecord | null;
  github_rate_limit?: ProviderGitHubRateLimitRecord | null;
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
  resolveDocsFreshnessOwnerCloseout?: (input: {
    repoRoot: string;
    issueIdentifier: string | null;
    env: NodeJS.ProcessEnv;
  }) => Promise<ProviderDocsFreshnessOwnerCloseoutRecord>;
  resolveSnapshotActionRequiredReasons?: (
    snapshot: ProviderPrSnapshotRecord,
    options?: { readinessMode?: 'merge' | 'review' }
  ) => string[];
}

type ProviderDocsFreshnessOwnerPolicy = {
  owner_issue: string | null;
  canonical_owner_key: string | null;
  owner_issues: string[];
};

interface ProviderAttachedSameRepoPullRequestCandidate {
  pr: ProviderMergeCloseoutPullRequestRecord;
  attachment_title: string | null;
}

interface ProviderMergeCloseoutAttachedPrResolution {
  selected_pr: ProviderMergeCloseoutPullRequestRecord | null;
  selected_snapshot: ProviderMergeCloseoutSnapshotRecord | null;
  ignored_historical_pr_urls: string[];
  ignored_closed_unmerged_pr_urls: string[];
  ignored_cross_issue_pr_urls: string[];
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
    mode?: ProviderMergeCloseoutMode;
    previousBranchRecovery?: ProviderBranchRecoveryAttemptRecord | null;
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
  const resolveDocsFreshnessOwnerCloseout =
    deps.resolveDocsFreshnessOwnerCloseout ?? resolveProviderDocsFreshnessOwnerCloseout;
  const resolveSnapshotActionRequiredReasons =
    deps.resolveSnapshotActionRequiredReasons ??
    ((snapshot: ProviderPrSnapshotRecord, options?: { readinessMode?: 'merge' | 'review' }) =>
      resolveActionRequiredReasons(snapshot as PrWatchMergeSnapshot, options));
  const mode = input.mode ?? 'full';

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
    ignored_closed_unmerged_pr_urls: [] as string[],
    conflicting_attached_pr_urls: [] as string[],
    pr: null as ProviderMergeCloseoutPullRequestRecord | null,
    snapshot: null as ProviderMergeCloseoutSnapshotRecord | null,
    branch_recovery: null as ProviderBranchRecoveryAttemptRecord | null,
    merge_attempt: null as ProviderMergeCloseoutAttemptRecord | null,
    shared_root: null as ProviderMergeCloseoutSharedRootRecord | null,
    docs_freshness_owner: null as ProviderDocsFreshnessOwnerCloseoutRecord | null,
    linear_transition: null as ProviderMergeCloseoutLinearTransitionRecord | null,
    github_rate_limit: null as ProviderGitHubRateLimitRecord | null
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
    sourceSetup: input.sourceSetup,
    fallbackToCacheOnFailure: mode === 'probe-merged-recovery'
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

  const attachedPrCandidates = collectAttachedGitHubPrCandidates(issueContext.issue.attachments);
  const attachedPrUrls = attachedPrCandidates.map((candidate) => candidate.pr.url);
  const usedCachedIssueContext = issueContext.cache_fallback_used === true;
  if (
    mode === 'probe-merged-recovery' &&
    usedCachedIssueContext &&
    !isProbeRecoveryCacheContextFreshEnough({
      issueState: input.issueState,
      issueStateType: input.issueStateType,
      issueUpdatedAt: input.issueUpdatedAt,
      issueContext: issueContext.issue
    })
  ) {
    return {
      ...base,
      attached_pr_urls: [...attachedPrUrls],
      status: 'watching',
      reason: 'probe_issue_context_cache_stale',
      summary:
        'Cached Linear issue context does not match the tracked issue metadata, so merged recovery will not transition the issue to Done until a fresh issue-context read succeeds.',
      pr: null,
      snapshot: null,
      merge_attempt: null,
      shared_root: null,
      linear_transition: null
    };
  }

  const sameRepoPrs = attachedPrCandidates.filter(
    (candidate) => `${candidate.pr.owner.toLowerCase()}/${candidate.pr.repo.toLowerCase()}` === repoKey
  );
  const currentIssueState = issueContext.issue.state?.name ?? base.issue_state;
  const currentIssueStateType = issueContext.issue.state?.type ?? base.issue_state_type;
  const currentIssueUpdatedAt = issueContext.issue.updated_at ?? base.issue_updated_at;
  const currentIssueIdentifier = normalizeOptionalString(issueContext.issue.identifier) ?? base.issue_identifier;
  const currentIssueAlreadyCompleted = currentIssueStateType === 'completed';
  const allowCompletedIssueRecovery =
    mode === 'probe-merged-recovery' && currentIssueAlreadyCompleted;
  const baseWithContext = {
    ...base,
    issue_identifier: currentIssueIdentifier,
    issue_state: currentIssueState,
    issue_state_type: currentIssueStateType,
    issue_updated_at: currentIssueUpdatedAt,
    attached_pr_urls: [...attachedPrUrls]
  };

  if (
    normalizeProviderMergeCloseoutIssueState(currentIssueState) !== 'merging' &&
    !allowCompletedIssueRecovery
  ) {
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
  let ignoredClosedUnmergedPrUrls: string[] = [];
  let conflictingAttachedPrUrls: string[] = [];
  let selectionNote: string | null = null;
  let pr = sameRepoPrs[0]!.pr;
  let snapshot: ProviderMergeCloseoutSnapshotRecord | null = null;

  if (sameRepoPrs.length > 1) {
    let resolution: ProviderMergeCloseoutAttachedPrResolution;
    try {
      resolution = await resolveAttachedSameRepoPullRequestCandidate({
        candidates: sameRepoPrs,
        mode: 'merge_closeout',
        resolveSnapshot,
        resolveSnapshotActionRequiredReasons
      });
    } catch (error) {
      const githubRateLimit = resolveProviderGitHubRateLimitRecord(error);
      if (githubRateLimit) {
        return {
          ...baseWithContext,
          status: 'watching',
          reason: 'github_rate_limited',
          summary: `GitHub API budget blocked attached pull-request disambiguation during merge closeout: ${formatProviderGitHubRateLimitSummary(githubRateLimit)}.`,
          github_rate_limit: githubRateLimit
        };
      }
      return {
        ...baseWithContext,
        status: 'merge_failed',
        reason: 'snapshot_read_failed',
        summary: `GitHub merge-readiness snapshot could not be loaded while disambiguating attached pull requests: ${(error as Error)?.message ?? String(error)}.`
      };
    }

    ignoredHistoricalPrUrls = resolution.ignored_historical_pr_urls;
    ignoredClosedUnmergedPrUrls = resolution.ignored_closed_unmerged_pr_urls;
    conflictingAttachedPrUrls = resolution.conflicting_attached_pr_urls;
    selectionNote = resolution.selection_note;
    if (!resolution.selected_pr) {
      return {
        ...baseWithContext,
        ignored_historical_pr_urls: [...ignoredHistoricalPrUrls],
        ignored_closed_unmerged_pr_urls: [...ignoredClosedUnmergedPrUrls],
        conflicting_attached_pr_urls: [...conflictingAttachedPrUrls],
        status: 'action_required',
        reason: 'multiple_attached_prs',
        summary: buildMultipleAttachedPrsSummary({
          repoKey,
          ignoredHistoricalPrUrls,
          ignoredClosedUnmergedPrUrls,
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
    ignored_closed_unmerged_pr_urls: [...ignoredClosedUnmergedPrUrls],
    conflicting_attached_pr_urls: [...conflictingAttachedPrUrls]
  };
  const summarizeSelection = (summary: string): string =>
    selectionNote ? `${summary} ${selectionNote}` : summary;

  if (!snapshot) {
    try {
      snapshot = await loadProviderSnapshotRecord({
        owner: pr.owner,
        repo: pr.repo,
        prNumber: pr.number,
        readinessMode: 'merge',
        resolveSnapshot,
        resolveSnapshotActionRequiredReasons
      });
    } catch (error) {
      const githubRateLimit = resolveProviderGitHubRateLimitRecord(error);
      if (githubRateLimit) {
        return {
          ...baseWithResolution,
          pr,
          status: 'watching',
          reason: 'github_rate_limited',
          summary: summarizeSelection(
            `GitHub API budget blocked merge-readiness snapshot loading: ${formatProviderGitHubRateLimitSummary(githubRateLimit)}.`
          ),
          snapshot: null,
          github_rate_limit: githubRateLimit
        };
      }
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

  let alreadyMerged = snapshot.merged_at !== null || snapshot.state === 'MERGED';

  if (mode === 'probe-merged-recovery' && !alreadyMerged) {
    return {
      ...baseWithResolution,
      pr,
      snapshot,
      status: 'watching',
      reason: 'probe_pr_not_merged',
      summary: summarizeSelection(
        `Attached PR #${pr.number} is not merged yet, so merged recovery cannot retire the rehydrated Merging claim.`
      )
    };
  }

  let branchRecovery: ProviderBranchRecoveryAttemptRecord | null = null;
  if (!alreadyMerged && !snapshot.ready_to_merge) {
    const preRecoveryOutcome = classifyPreBranchRecoverySnapshot(
      snapshot,
      pr.number,
      'merge_closeout'
    );
    if (preRecoveryOutcome) {
      return {
        ...baseWithResolution,
        pr,
        snapshot,
        ...preRecoveryOutcome,
        summary: summarizeSelection(preRecoveryOutcome.summary)
      };
    }
    branchRecovery = await attemptProviderBranchRecovery({
      pr,
      snapshot,
      previousBranchRecovery: input.previousBranchRecovery ?? null,
      repoRoot: input.repoRoot,
      now,
      runCommand
    });
    if (branchRecovery?.ok) {
      try {
        snapshot = await loadProviderSnapshotRecord({
          owner: pr.owner,
          repo: pr.repo,
          prNumber: pr.number,
          readinessMode: 'merge',
          resolveSnapshot,
          resolveSnapshotActionRequiredReasons
        });
      } catch (error) {
        const githubRateLimit = resolveProviderGitHubRateLimitRecord(error);
        if (githubRateLimit) {
          return {
            ...baseWithResolution,
            pr,
            snapshot,
            branch_recovery: branchRecovery,
            status: 'watching',
            reason: 'github_rate_limited',
            summary: summarizeSelection(
              `GitHub API budget blocked post-branch-recovery readiness verification: ${formatProviderGitHubRateLimitSummary(githubRateLimit)}.`
            ),
            github_rate_limit: githubRateLimit
          };
        }
        // Preserve the pre-recovery snapshot when verification cannot be reread.
      }
      alreadyMerged = snapshot.merged_at !== null || snapshot.state === 'MERGED';
      if (!alreadyMerged && !snapshot.ready_to_merge) {
        const prePendingRecoveryOutcome = classifyPreBranchRecoverySnapshot(
          snapshot,
          pr.number,
          'merge_closeout'
        );
        if (prePendingRecoveryOutcome) {
          return {
            ...baseWithResolution,
            pr,
            snapshot,
            branch_recovery: branchRecovery,
            ...prePendingRecoveryOutcome,
            summary: summarizeSelection(prePendingRecoveryOutcome.summary)
          };
        }
        const pendingRecovery = classifyPendingBranchRecovery({
          snapshot,
          recoveryAttempt: branchRecovery,
          prNumber: pr.number,
          mode: 'merge_closeout'
        });
        if (pendingRecovery) {
          return {
            ...baseWithResolution,
            pr,
            snapshot,
            branch_recovery: branchRecovery,
            ...pendingRecovery,
            summary: summarizeSelection(pendingRecovery.summary)
          };
        }
        const nonMergedOutcome = classifyNonMergedSnapshot(snapshot, pr.number)!;
        return {
          ...baseWithResolution,
          pr,
          snapshot,
          branch_recovery: branchRecovery,
          ...nonMergedOutcome,
          summary: summarizeSelection(nonMergedOutcome.summary)
        };
      }
    } else if (branchRecovery?.failure_kind === 'conflict') {
      const transitionAttemptedAt = now();
      const transitionResult = await transitionIssueState({
        issueId: input.issueId,
        stateName: 'Rework',
        expectedStateName: currentIssueState,
        expectedStateType: currentIssueStateType,
        expectedUpdatedAt: currentIssueUpdatedAt,
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
            target_state: 'Rework',
            issue_state: currentIssueState ?? null,
            issue_state_type: currentIssueStateType ?? null,
            issue_updated_at: currentIssueUpdatedAt,
            error: `${transitionResult.error.code}: ${transitionResult.error.message}`
          };
      if (!transitionResult.ok) {
        return {
          ...baseWithResolution,
          pr,
          snapshot,
          branch_recovery: branchRecovery,
          linear_transition: linearTransition,
          status: 'transition_failed',
          reason: 'linear_rework_transition_failed_after_branch_recovery_conflict',
          summary: summarizeSelection(
            `Automatic ${describeProviderBranchRecoveryReason(
              branchRecovery.recovery_reason
            )} hit a merge conflict for attached PR #${pr.number}, and the Linear issue could not transition to Rework.`
          )
        };
      }
      return {
        ...baseWithResolution,
        issue_state: linearTransition.issue_state,
        issue_state_type: linearTransition.issue_state_type,
        issue_updated_at: linearTransition.issue_updated_at,
        pr,
        snapshot,
        branch_recovery: branchRecovery,
        linear_transition: linearTransition,
        status: 'action_required',
        reason: 'branch_recovery_conflict',
        summary: summarizeSelection(
          `Automatic ${describeProviderBranchRecoveryReason(
            branchRecovery.recovery_reason
          )} hit a merge conflict for attached PR #${pr.number}; moved the issue to Rework with exact recovery metadata recorded.`
        )
      };
    } else if (branchRecovery) {
      return {
        ...baseWithResolution,
        pr,
        snapshot,
        branch_recovery: branchRecovery,
        status: 'action_required',
        reason: 'branch_recovery_failed',
        summary: summarizeSelection(
          `Automatic ${describeProviderBranchRecoveryReason(
            branchRecovery.recovery_reason
          )} failed for attached PR #${pr.number}; inspect the recorded gh output before merge closeout can continue.`
        )
      };
    }
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
  }

  const preMergeRateLimitOutcome = classifyProviderMutationRateLimitSnapshot(
    snapshot,
    pr.number,
    'merge_closeout'
  );
  if (preMergeRateLimitOutcome) {
    return {
      ...baseWithResolution,
      pr,
      snapshot,
      branch_recovery: branchRecovery,
      ...preMergeRateLimitOutcome,
      summary: summarizeSelection(preMergeRateLimitOutcome.summary)
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

    let verificationRateLimit: ProviderGitHubRateLimitRecord | null = null;
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
    } catch (error) {
      verificationRateLimit = resolveProviderGitHubRateLimitRecord(error);
      // Preserve the pre-merge readiness snapshot when verification cannot be reread.
    }

    if (verificationRateLimit && mergeResult.ok === false) {
      return {
        ...baseWithResolution,
        pr,
        snapshot: verificationSnapshot,
        branch_recovery: branchRecovery,
        merge_attempt: mergeAttempt,
        status: 'merge_failed',
        reason: 'merge_command_failed',
        summary: summarizeSelection(
          `GitHub merge command failed before the pull request was confirmed merged; post-merge verification was also blocked by GitHub API budget: ${formatProviderGitHubRateLimitSummary(verificationRateLimit)}.`
        ),
        github_rate_limit: verificationRateLimit
      };
    }

    if (verificationRateLimit) {
      return {
        ...baseWithResolution,
        pr,
        snapshot: verificationSnapshot,
        branch_recovery: branchRecovery,
        merge_attempt: mergeAttempt,
        status: 'watching',
        reason: 'github_rate_limited',
        summary: summarizeSelection(
          `GitHub API budget blocked post-merge verification snapshot loading: ${formatProviderGitHubRateLimitSummary(verificationRateLimit)}.`
        ),
        github_rate_limit: verificationRateLimit
      };
    }

    if (verificationSnapshot.merged_at === null && verificationSnapshot.state !== 'MERGED') {
      const verificationOutcome = classifyNonMergedSnapshot(verificationSnapshot, pr.number);
      if (verificationOutcome) {
        return {
          ...baseWithResolution,
          pr,
          snapshot: verificationSnapshot,
          branch_recovery: branchRecovery,
          merge_attempt: mergeAttempt,
          ...verificationOutcome,
          summary: summarizeSelection(verificationOutcome.summary)
        };
      }
      return {
        ...baseWithResolution,
        pr,
        snapshot: verificationSnapshot,
        branch_recovery: branchRecovery,
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
      branch_recovery: branchRecovery,
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
      branch_recovery: branchRecovery,
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

  const docsFreshnessOwner = await resolveDocsFreshnessOwnerCloseout({
    repoRoot: input.repoRoot,
    issueIdentifier: baseWithResolution.issue_identifier,
    env
  });
  if (docsFreshnessOwner.terminal_transition_blocked) {
    const ownerEvidenceUnavailable = docsFreshnessOwner.status === 'evidence_unavailable';
    const blockedTransitionReason = ownerEvidenceUnavailable
      ? 'docs_freshness_owner_evidence_unavailable'
      : 'docs_freshness_live_owner_blocks_done_transition';
    const blockedTransitionSummary = ownerEvidenceUnavailable
      ? `Attached PR #${pr.number} merged and the shared root is reconciled, but ${DOCS_FRESHNESS_MAINTAIN_OWNER_KEY} owner evidence could not be verified; moved the issue to Blocked instead of transitioning it to Done.`
      : `Attached PR #${pr.number} merged and the shared root is reconciled, but ${baseWithResolution.issue_identifier ?? input.issueId} is still the live ${DOCS_FRESHNESS_MAINTAIN_OWNER_KEY} owner; moved the issue to Blocked instead of transitioning it to Done.`;
    const blockedTransitionFailureReason = ownerEvidenceUnavailable
      ? 'linear_blocked_transition_failed_for_docs_freshness_owner_evidence_unavailable'
      : 'linear_blocked_transition_failed_for_docs_freshness_owner';
    const blockedTransitionFailureSummary = ownerEvidenceUnavailable
      ? `Attached PR #${pr.number} merged and the shared root is reconciled, but ${DOCS_FRESHNESS_MAINTAIN_OWNER_KEY} owner evidence could not be verified and the Linear issue could not transition to Blocked instead of Done.`
      : `Attached PR #${pr.number} merged and the shared root is reconciled, but ${DOCS_FRESHNESS_MAINTAIN_OWNER_KEY} still identifies ${baseWithResolution.issue_identifier ?? input.issueId} as the live owner and the Linear issue could not transition to Blocked instead of Done.`;
    const transitionAttemptedAt = now();
    const transitionResult = await transitionIssueState({
      issueId: input.issueId,
      stateName: 'Blocked',
      expectedStateName: currentIssueState,
      expectedStateType: currentIssueStateType,
      expectedUpdatedAt: currentIssueUpdatedAt,
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
          target_state: 'Blocked',
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
        branch_recovery: branchRecovery,
        merge_attempt: mergeAttempt,
        shared_root: sharedRoot,
        docs_freshness_owner: docsFreshnessOwner,
        linear_transition: linearTransition,
        status: 'transition_failed',
        reason: blockedTransitionFailureReason,
        summary: summarizeSelection(blockedTransitionFailureSummary)
      };
    }
    return {
      ...baseWithResolution,
      issue_state: linearTransition.issue_state,
      issue_state_type: linearTransition.issue_state_type,
      issue_updated_at: linearTransition.issue_updated_at,
      pr,
      snapshot: verificationSnapshot,
      branch_recovery: branchRecovery,
      merge_attempt: mergeAttempt,
      shared_root: sharedRoot,
      docs_freshness_owner: docsFreshnessOwner,
      linear_transition: linearTransition,
      status: 'action_required',
      reason: blockedTransitionReason,
      summary: summarizeSelection(blockedTransitionSummary)
    };
  }

  const transitionAttemptedAt = now();
  const transitionResult = await transitionIssueState({
    issueId: input.issueId,
    stateName: 'Done',
    expectedStateName: currentIssueState,
    expectedStateType: currentIssueStateType,
    expectedUpdatedAt: currentIssueUpdatedAt,
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
    if (alreadyMerged && transitionResult.error.code === 'linear_rate_limited') {
      return {
        ...baseWithResolution,
        pr,
        snapshot: verificationSnapshot,
        branch_recovery: branchRecovery,
        merge_attempt: mergeAttempt,
        shared_root: sharedRoot,
        docs_freshness_owner: docsFreshnessOwner,
        linear_transition: linearTransition,
        status: 'merged',
        reason: 'merged_and_shared_root_reconciled_transition_deferred',
        summary: summarizeSelection(
          `Attached PR #${pr.number} was already merged and the shared root is reconciled; local merge closeout is authoritative while the Linear Done transition is deferred by shared-budget cooldown.`
        )
      };
    }
    return {
      ...baseWithResolution,
      pr,
      snapshot: verificationSnapshot,
      branch_recovery: branchRecovery,
      merge_attempt: mergeAttempt,
      shared_root: sharedRoot,
      docs_freshness_owner: docsFreshnessOwner,
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
    branch_recovery: branchRecovery,
    merge_attempt: mergeAttempt,
    shared_root: sharedRoot,
    docs_freshness_owner: docsFreshnessOwner,
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

export async function runProviderReviewHandoffPromotion(
  input: {
    issueId: string;
    issueIdentifier?: string | null;
    issueState?: string | null;
    issueStateType?: string | null;
    issueUpdatedAt?: string | null;
    blockedBy?: readonly LiveLinearTrackedBlocker[] | null;
    previousBranchRecovery?: ProviderBranchRecoveryAttemptRecord | null;
    repoRoot: string;
    sourceSetup?: DispatchPilotSourceSetup | null;
    env?: NodeJS.ProcessEnv;
  },
  deps: ProviderMergeCloseoutDependencies = {}
): Promise<ProviderReviewHandoffPromotionRecord> {
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
    ignored_closed_unmerged_pr_urls: [] as string[],
    ignored_cross_issue_pr_urls: [] as string[],
    conflicting_attached_pr_urls: [] as string[],
    pr: null as ProviderMergeCloseoutPullRequestRecord | null,
    snapshot: null as ProviderMergeCloseoutSnapshotRecord | null,
    branch_recovery: null as ProviderBranchRecoveryAttemptRecord | null,
    linear_transition: null as ProviderMergeCloseoutLinearTransitionRecord | null,
    github_rate_limit: null as ProviderGitHubRateLimitRecord | null
  };

  const repoOriginResult = await runCommand({
    command: 'git',
    args: ['-C', input.repoRoot, 'remote', 'get-url', 'origin'],
    cwd: input.repoRoot
  });
  if (!repoOriginResult.ok) {
    return {
      ...base,
      status: 'promotion_failed',
      reason: 'shared_root_origin_unavailable',
      summary: 'Shared repo origin remote could not be resolved.'
    };
  }
  const parsedRepo = parseGitHubRepoFromRemoteUrl(repoOriginResult.stdout);
  const repoKey = parsedRepo
    ? `${parsedRepo.owner.toLowerCase()}/${parsedRepo.repo.toLowerCase()}`
    : null;
  if (!repoKey) {
    return {
      ...base,
      status: 'promotion_failed',
      reason: 'shared_root_repo_unrecognized',
      summary: 'Shared repo origin is not a GitHub repository URL.'
    };
  }

  const issueContext = await readIssueContext({
    issueId: input.issueId,
    env,
    sourceSetup: input.sourceSetup,
    fallbackToCacheOnFailure: false
  });
  if (!issueContext.ok) {
    return {
      ...base,
      status: 'promotion_failed',
      reason: 'linear_issue_context_failed',
      summary: `Linear issue context could not be loaded (${issueContext.error.code}).`
    };
  }

  const attachedPrCandidates = collectAttachedGitHubPrCandidates(issueContext.issue.attachments);
  const attachedPrUrls = attachedPrCandidates.map((candidate) => candidate.pr.url);
  const sameRepoPrs = attachedPrCandidates.filter(
    (candidate) => `${candidate.pr.owner.toLowerCase()}/${candidate.pr.repo.toLowerCase()}` === repoKey
  );
  const currentIssueState = issueContext.issue.state?.name ?? base.issue_state;
  const currentIssueStateType = issueContext.issue.state?.type ?? base.issue_state_type;
  const currentIssueUpdatedAt = issueContext.issue.updated_at ?? base.issue_updated_at;
  const currentWorkflowState = classifyProviderLinearWorkflowState({
    state: currentIssueState,
    state_type: currentIssueStateType
  });
  const baseWithContext = {
    ...base,
    issue_state: currentIssueState,
    issue_state_type: currentIssueStateType,
    issue_updated_at: currentIssueUpdatedAt,
    attached_pr_urls: [...attachedPrUrls]
  };

  if (!currentWorkflowState.isHandoff) {
    return {
      ...baseWithContext,
      status: 'action_required',
      reason: 'issue_no_longer_review_handoff',
      summary:
        currentIssueState && currentIssueState.trim().length > 0
          ? `Live Linear issue state is ${currentIssueState}, so review-handoff promotion is not armed.`
          : 'Live Linear issue state is no longer a review handoff state, so review-handoff promotion is not armed.'
    };
  }

  if (sameRepoPrs.length === 0) {
    return {
      ...baseWithContext,
      status: 'action_required',
      reason: attachedPrUrls.length === 0 ? 'no_attached_pr' : 'attached_pr_repo_mismatch',
      summary:
        attachedPrUrls.length === 0
          ? 'No attached GitHub pull request is present for this review handoff issue.'
          : 'Attached GitHub pull requests do not match the shared repository root.'
    };
  }

  let ignoredHistoricalPrUrls: string[] = [];
  let ignoredClosedUnmergedPrUrls: string[] = [];
  let ignoredCrossIssuePrUrls: string[] = [];
  let conflictingAttachedPrUrls: string[] = [];
  let selectionNote: string | null = null;
  let pr = sameRepoPrs[0]!.pr;
  let snapshot: ProviderMergeCloseoutSnapshotRecord | null = null;

  if (sameRepoPrs.length > 1) {
    let resolution: ProviderMergeCloseoutAttachedPrResolution;
    try {
      resolution = await resolveAttachedSameRepoPullRequestCandidate({
        candidates: sameRepoPrs,
        mode: 'review_promotion',
        issueIdentifier: issueContext.issue.identifier,
        blockedBy: input.blockedBy ?? null,
        resolveSnapshot,
        resolveSnapshotActionRequiredReasons
      });
    } catch (error) {
      const githubRateLimit = resolveProviderGitHubRateLimitRecord(error);
      if (githubRateLimit) {
        return {
          ...baseWithContext,
          status: 'watching',
          reason: 'github_rate_limited',
          summary: `GitHub API budget blocked attached pull-request disambiguation during review-handoff promotion: ${formatProviderGitHubRateLimitSummary(githubRateLimit)}.`,
          github_rate_limit: githubRateLimit
        };
      }
      return {
        ...baseWithContext,
        status: 'promotion_failed',
        reason: 'snapshot_read_failed',
        summary: `GitHub merge-readiness snapshot could not be loaded while disambiguating attached pull requests: ${(error as Error)?.message ?? String(error)}.`
      };
    }

    ignoredHistoricalPrUrls = resolution.ignored_historical_pr_urls;
    ignoredClosedUnmergedPrUrls = resolution.ignored_closed_unmerged_pr_urls;
    ignoredCrossIssuePrUrls = resolution.ignored_cross_issue_pr_urls;
    conflictingAttachedPrUrls = resolution.conflicting_attached_pr_urls;
    selectionNote = resolution.selection_note;
    if (!resolution.selected_pr) {
      return {
        ...baseWithContext,
        ignored_historical_pr_urls: [...ignoredHistoricalPrUrls],
        ignored_closed_unmerged_pr_urls: [...ignoredClosedUnmergedPrUrls],
        ignored_cross_issue_pr_urls: [...ignoredCrossIssuePrUrls],
        conflicting_attached_pr_urls: [...conflictingAttachedPrUrls],
        status: 'action_required',
        reason: 'multiple_attached_prs',
        summary: buildMultipleAttachedPrsPromotionSummary({
          repoKey,
          ignoredHistoricalPrUrls,
          ignoredClosedUnmergedPrUrls,
          ignoredCrossIssuePrUrls,
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
    ignored_closed_unmerged_pr_urls: [...ignoredClosedUnmergedPrUrls],
    ignored_cross_issue_pr_urls: [...ignoredCrossIssuePrUrls],
    conflicting_attached_pr_urls: [...conflictingAttachedPrUrls]
  };
  const summarizeSelection = (summary: string): string =>
    selectionNote ? `${summary} ${selectionNote}` : summary;

  if (!snapshot) {
    try {
      snapshot = await loadProviderSnapshotRecord({
        owner: pr.owner,
        repo: pr.repo,
        prNumber: pr.number,
        readinessMode: 'merge',
        resolveSnapshot,
        resolveSnapshotActionRequiredReasons
      });
    } catch (error) {
      const githubRateLimit = resolveProviderGitHubRateLimitRecord(error);
      if (githubRateLimit) {
        return {
          ...baseWithResolution,
          pr,
          status: 'watching',
          reason: 'github_rate_limited',
          summary: summarizeSelection(
            `GitHub API budget blocked review-handoff readiness snapshot loading: ${formatProviderGitHubRateLimitSummary(githubRateLimit)}.`
          ),
          snapshot: null,
          github_rate_limit: githubRateLimit
        };
      }
      return {
        ...baseWithResolution,
        pr,
        status: 'promotion_failed',
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
      status: 'promotion_failed',
      reason: 'snapshot_read_failed',
      summary: summarizeSelection('GitHub merge-readiness snapshot could not be loaded.'),
      snapshot: null
    };
  }

  let alreadyMerged = isMergedPullRequestSnapshot(snapshot);

  let branchRecovery: ProviderBranchRecoveryAttemptRecord | null = null;
  if (!alreadyMerged && !snapshot.ready_to_merge) {
    const preRecoveryOutcome = classifyPreBranchRecoverySnapshot(
      snapshot,
      pr.number,
      'review_promotion'
    );
    if (preRecoveryOutcome) {
      return {
        ...baseWithResolution,
        pr,
        snapshot,
        ...preRecoveryOutcome,
        summary: summarizeSelection(preRecoveryOutcome.summary)
      };
    }
    branchRecovery = await attemptProviderBranchRecovery({
      pr,
      snapshot,
      previousBranchRecovery: input.previousBranchRecovery ?? null,
      repoRoot: input.repoRoot,
      now,
      runCommand
    });
    if (branchRecovery?.ok) {
      try {
        snapshot = await loadProviderSnapshotRecord({
          owner: pr.owner,
          repo: pr.repo,
          prNumber: pr.number,
          readinessMode: 'merge',
          resolveSnapshot,
          resolveSnapshotActionRequiredReasons
        });
      } catch (error) {
        const githubRateLimit = resolveProviderGitHubRateLimitRecord(error);
        if (githubRateLimit) {
          return {
            ...baseWithResolution,
            pr,
            snapshot,
            branch_recovery: branchRecovery,
            status: 'watching',
            reason: 'github_rate_limited',
            summary: summarizeSelection(
              `GitHub API budget blocked post-branch-recovery review-handoff verification: ${formatProviderGitHubRateLimitSummary(githubRateLimit)}.`
            ),
            github_rate_limit: githubRateLimit
          };
        }
        // Preserve the pre-recovery snapshot when verification cannot be reread.
      }
      alreadyMerged = isMergedPullRequestSnapshot(snapshot);
      if (!alreadyMerged && !snapshot.ready_to_merge) {
        const prePendingRecoveryOutcome = classifyPreBranchRecoverySnapshot(
          snapshot,
          pr.number,
          'review_promotion'
        );
        if (prePendingRecoveryOutcome) {
          return {
            ...baseWithResolution,
            pr,
            snapshot,
            branch_recovery: branchRecovery,
            ...prePendingRecoveryOutcome,
            summary: summarizeSelection(prePendingRecoveryOutcome.summary)
          };
        }
        const pendingRecovery = classifyPendingBranchRecovery({
          snapshot,
          recoveryAttempt: branchRecovery,
          prNumber: pr.number,
          mode: 'review_promotion'
        });
        if (pendingRecovery) {
          return {
            ...baseWithResolution,
            pr,
            snapshot,
            branch_recovery: branchRecovery,
            ...pendingRecovery,
            summary: summarizeSelection(pendingRecovery.summary)
          };
        }
        const promotionOutcome = classifyNonMergedReviewPromotionSnapshot(snapshot, pr.number)!;
        return {
          ...baseWithResolution,
          pr,
          snapshot,
          branch_recovery: branchRecovery,
          ...promotionOutcome,
          summary: summarizeSelection(promotionOutcome.summary)
        };
      }
    } else if (branchRecovery?.failure_kind === 'conflict') {
      const transitionAttemptedAt = now();
      const transitionResult = await transitionIssueState({
        issueId: input.issueId,
        stateName: 'Rework',
        expectedStateName: currentIssueState,
        expectedStateType: currentIssueStateType,
        expectedUpdatedAt: currentIssueUpdatedAt,
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
            target_state: 'Rework',
            issue_state: currentIssueState ?? null,
            issue_state_type: currentIssueStateType ?? null,
            issue_updated_at: currentIssueUpdatedAt,
            error: `${transitionResult.error.code}: ${transitionResult.error.message}`
          };
      if (!transitionResult.ok) {
        return {
          ...baseWithResolution,
          pr,
          snapshot,
          branch_recovery: branchRecovery,
          linear_transition: linearTransition,
          status: 'transition_failed',
          reason: 'linear_rework_transition_failed_after_branch_recovery_conflict',
          summary: summarizeSelection(
            `Automatic ${describeProviderBranchRecoveryReason(
              branchRecovery.recovery_reason
            )} hit a merge conflict for attached PR #${pr.number}, and the Linear issue could not transition to Rework before review handoff could continue.`
          )
        };
      }
      return {
        ...baseWithResolution,
        issue_state: linearTransition.issue_state,
        issue_state_type: linearTransition.issue_state_type,
        issue_updated_at: linearTransition.issue_updated_at,
        pr,
        snapshot,
        branch_recovery: branchRecovery,
        linear_transition: linearTransition,
        status: 'action_required',
        reason: 'branch_recovery_conflict',
        summary: summarizeSelection(
          `Automatic ${describeProviderBranchRecoveryReason(
            branchRecovery.recovery_reason
          )} hit a merge conflict for attached PR #${pr.number}; moved the issue to Rework with exact recovery metadata recorded.`
        )
      };
    } else if (branchRecovery) {
      return {
        ...baseWithResolution,
        pr,
        snapshot,
        branch_recovery: branchRecovery,
        status: 'action_required',
        reason: 'branch_recovery_failed',
        summary: summarizeSelection(
          `Automatic ${describeProviderBranchRecoveryReason(
            branchRecovery.recovery_reason
          )} failed for attached PR #${pr.number}; inspect the recorded gh output before review-handoff promotion can continue.`
        )
      };
    }
    if (!alreadyMerged && !snapshot.ready_to_merge) {
      const promotionOutcome = classifyNonMergedReviewPromotionSnapshot(snapshot, pr.number)!;
      return {
        ...baseWithResolution,
        pr,
        snapshot,
        ...promotionOutcome,
        summary: summarizeSelection(promotionOutcome.summary)
      };
    }
  }

  const prePromotionRateLimitOutcome = classifyProviderMutationRateLimitSnapshot(
    snapshot,
    pr.number,
    'review_promotion'
  );
  if (prePromotionRateLimitOutcome) {
    return {
      ...baseWithResolution,
      pr,
      snapshot,
      branch_recovery: branchRecovery,
      ...prePromotionRateLimitOutcome,
      summary: summarizeSelection(prePromotionRateLimitOutcome.summary)
    };
  }

  const transitionAttemptedAt = now();
  const transitionResult = await transitionIssueState({
    issueId: input.issueId,
    stateName: 'Merging',
    expectedStateName: currentIssueState,
    expectedStateType: currentIssueStateType,
    expectedUpdatedAt: currentIssueUpdatedAt,
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
        target_state: 'Merging',
        issue_state: currentIssueState ?? null,
        issue_state_type: currentIssueStateType ?? null,
        issue_updated_at: currentIssueUpdatedAt,
        error: `${transitionResult.error.code}: ${transitionResult.error.message}`
      };

  if (!transitionResult.ok) {
    return {
      ...baseWithResolution,
      pr,
      snapshot,
      branch_recovery: branchRecovery,
      linear_transition: linearTransition,
      status: 'transition_failed',
      reason: 'linear_merging_transition_failed',
      summary: summarizeSelection(
        alreadyMerged
          ? `Attached PR #${pr.number} is already merged, but the Linear issue could not transition to Merging for deterministic closeout.`
          : `Attached PR #${pr.number} is merge-ready, but the Linear issue could not transition to Merging.`
      )
    };
  }

  return {
    ...baseWithResolution,
    issue_state: linearTransition.issue_state,
    issue_state_type: linearTransition.issue_state_type,
    issue_updated_at: linearTransition.issue_updated_at,
    pr,
    snapshot,
    branch_recovery: branchRecovery,
    linear_transition: linearTransition,
    status: 'promoted',
    reason: 'promoted_to_merging',
    summary: summarizeSelection(
      alreadyMerged
        ? `Attached PR #${pr.number} is already merged; promoted the issue from review handoff into Merging for deterministic closeout.`
        : `Promoted attached PR #${pr.number} from review handoff into Merging.`
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

async function resolveProviderDocsFreshnessOwnerCloseout(input: {
  repoRoot: string;
  issueIdentifier: string | null;
  env: NodeJS.ProcessEnv;
}): Promise<ProviderDocsFreshnessOwnerCloseoutRecord> {
  const issueIdentifier = normalizeOptionalString(input.issueIdentifier);
  let policy: ProviderDocsFreshnessOwnerPolicy | null = null;
  try {
    policy = await readDocsFreshnessOwnerPolicy(input.repoRoot);
  } catch (error) {
    return {
      status: 'evidence_unavailable',
      terminal_transition_blocked: true,
      reason: `policy_read_failed: ${(error as Error)?.message ?? String(error)}`,
      policy_owner_issue: null,
      policy_canonical_owner_key: null,
      freshness_decision: null,
      owner_issue: null,
      owner_issue_action: null,
      owner_issue_verification: null,
      candidate_cohorts: [],
      blocking_changed_paths: null,
      command: null,
      args: null,
      exit_code: null,
      ok: null,
      stdout: null,
      stderr: null,
      parse_error: null,
      report_path: null
    };
  }

  if (!policy || policy.owner_issues.length === 0) {
    return {
      status: 'not_configured',
      terminal_transition_blocked: false,
      reason: 'rolling_freshness_owner_not_configured',
      policy_owner_issue: policy?.owner_issue ?? null,
      policy_canonical_owner_key: policy?.canonical_owner_key ?? null,
      freshness_decision: null,
      owner_issue: null,
      owner_issue_action: null,
      owner_issue_verification: null,
      candidate_cohorts: [],
      blocking_changed_paths: null,
      command: null,
      args: null,
      exit_code: null,
      ok: null,
      stdout: null,
      stderr: null,
      parse_error: null,
      report_path: null
    };
  }

  if (!issueIdentifier || !policy.owner_issues.includes(issueIdentifier)) {
    return {
      status: 'not_current_owner',
      terminal_transition_blocked: false,
      reason: issueIdentifier ? 'rolling_freshness_owner_is_different_issue' : 'issue_identifier_unavailable',
      policy_owner_issue: policy.owner_issue,
      policy_canonical_owner_key: policy.canonical_owner_key,
      freshness_decision: null,
      owner_issue: null,
      owner_issue_action: null,
      owner_issue_verification: null,
      candidate_cohorts: [],
      blocking_changed_paths: null,
      command: null,
      args: null,
      exit_code: null,
      ok: null,
      stdout: null,
      stderr: null,
      parse_error: null,
      report_path: null
    };
  }

  return await readDocsFreshnessMaintainOwnerEvidence({
    repoRoot: input.repoRoot,
    env: input.env,
    policyOwnerIssue: policy.owner_issue,
    policyCanonicalOwnerKey: policy.canonical_owner_key,
    issueIdentifier
  });
}

async function readDocsFreshnessOwnerPolicy(
  repoRoot: string
): Promise<ProviderDocsFreshnessOwnerPolicy | null> {
  const raw = await readFile(path.join(repoRoot, 'docs', 'docs-catalog.json'), 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const policies = parsed.policies && typeof parsed.policies === 'object'
    ? (parsed.policies as Record<string, unknown>)
    : null;
  const policy = policies?.rolling_freshness_cohorts;
  if (!policy || typeof policy !== 'object') {
    return null;
  }
  const policyRecord = policy as Record<string, unknown>;
  const ownerIssue = normalizeOptionalString(policyRecord.owner_issue);
  const canonicalOwnerIssues = Array.isArray(policyRecord.canonical_owner_issues)
    ? policyRecord.canonical_owner_issues
        .map((entry) =>
          entry && typeof entry === 'object'
            ? normalizeOptionalString((entry as Record<string, unknown>).owner_issue)
            : null
        )
        .filter((entry): entry is string => Boolean(entry))
    : [];
  return {
    owner_issue: ownerIssue,
    canonical_owner_key: normalizeOptionalString(policyRecord.canonical_owner_key),
    owner_issues: [...new Set([ownerIssue, ...canonicalOwnerIssues].filter((entry): entry is string => Boolean(entry)))]
  };
}

async function readDocsFreshnessMaintainOwnerEvidence(input: {
  repoRoot: string;
  env: NodeJS.ProcessEnv;
  policyOwnerIssue: string | null;
  policyCanonicalOwnerKey: string | null;
  issueIdentifier: string;
}): Promise<ProviderDocsFreshnessOwnerCloseoutRecord> {
  const command = 'npm';
  const args = ['--silent', 'run', 'docs:freshness:maintain', '--', '--format', 'json'];
  let stdout = '';
  let stderr = '';
  let exitCode: number | null = 0;
  let ok = true;
  try {
    const result = await execFileAsync(command, args, {
      cwd: input.repoRoot,
      env: input.env,
      timeout: PROVIDER_MERGE_CLOSEOUT_DOCS_FRESHNESS_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    const failed = error as Error & {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      code?: number | string | null;
    };
    stdout = String(failed.stdout ?? '');
    stderr = String(failed.stderr ?? failed.message ?? '');
    exitCode = typeof failed.code === 'number' ? failed.code : null;
    ok = false;
  }

  const parsed = parseDocsFreshnessMaintainJson(stdout);
  const normalized = normalizeDocsFreshnessMaintainDecision(parsed.value);
  return {
    status: parsed.error ? 'evidence_unavailable' : 'evidence_checked',
    terminal_transition_blocked: true,
    reason: parsed.error
      ? 'docs_freshness_owner_evidence_unavailable'
      : 'current_issue_owns_docs_freshness_rolling_debt',
    policy_owner_issue: input.policyOwnerIssue,
    policy_canonical_owner_key: input.policyCanonicalOwnerKey,
    freshness_decision: normalized.freshness_decision,
    owner_issue: normalized.owner_issue,
    owner_issue_action: normalized.owner_issue_action,
    owner_issue_verification: normalized.owner_issue_verification,
    candidate_cohorts: normalized.candidate_cohorts,
    blocking_changed_paths: normalized.blocking_changed_paths,
    command,
    args,
    exit_code: exitCode,
    ok,
    stdout: normalizeCommandText(stdout),
    stderr: normalizeCommandText(stderr),
    parse_error: parsed.error,
    report_path: normalized.report_path
  };
}

function parseDocsFreshnessMaintainJson(
  stdout: string
): { value: Record<string, unknown> | null; error: string | null } {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { value: null, error: 'empty_stdout' };
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace < firstBrace) {
    return { value: null, error: 'json_object_not_found' };
  }
  try {
    const value = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    return value && typeof value === 'object'
      ? { value: value as Record<string, unknown>, error: null }
      : { value: null, error: 'json_value_not_object' };
  } catch (error) {
    return { value: null, error: `json_parse_failed: ${(error as Error)?.message ?? String(error)}` };
  }
}

function normalizeDocsFreshnessMaintainDecision(value: Record<string, unknown> | null): {
  freshness_decision: string | null;
  owner_issue: string | null;
  owner_issue_action: Record<string, unknown> | null;
  owner_issue_verification: Record<string, unknown> | null;
  candidate_cohorts: Record<string, unknown>[];
  blocking_changed_paths: string[] | null;
  report_path: string | null;
} {
  const ownerIssueAction =
    value?.owner_issue_action && typeof value.owner_issue_action === 'object'
      ? (value.owner_issue_action as Record<string, unknown>)
      : null;
  const ownerIssueVerification =
    value?.owner_issue_verification && typeof value.owner_issue_verification === 'object'
      ? (value.owner_issue_verification as Record<string, unknown>)
      : null;
  const candidateCohorts = Array.isArray(value?.candidate_cohorts)
    ? value.candidate_cohorts.filter((cohort): cohort is Record<string, unknown> =>
        Boolean(cohort && typeof cohort === 'object')
      )
    : [];
  return {
    freshness_decision: normalizeOptionalString(value?.freshness_decision),
    owner_issue: normalizeOptionalString(value?.owner_issue),
    owner_issue_action: ownerIssueAction,
    owner_issue_verification: ownerIssueVerification,
    candidate_cohorts: candidateCohorts,
    blocking_changed_paths: Array.isArray(value?.blocking_changed_paths)
      ? value.blocking_changed_paths.map(normalizeOptionalString).filter((entry): entry is string => Boolean(entry))
      : null,
    report_path: normalizeOptionalString(value?.report_path)
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

function collectAttachedGitHubPrCandidates(
  attachments: Array<{ title?: string | null; url?: string | null }>
): ProviderAttachedSameRepoPullRequestCandidate[] {
  const candidatesByUrl = new Map<string, ProviderAttachedSameRepoPullRequestCandidate>();
  for (const attachment of attachments) {
    const parsed = parseGitHubPullRequestUrl(attachment?.url);
    const comparisonKey = parsed
      ? `${parsed.owner.toLowerCase()}/${parsed.repo.toLowerCase()}#${parsed.number}`
      : null;
    if (!parsed || !comparisonKey) {
      continue;
    }
    const title = normalizeOptionalString(attachment?.title);
    const existingCandidate = candidatesByUrl.get(comparisonKey);
    if (existingCandidate) {
      existingCandidate.attachment_title = title;
      continue;
    }
    candidatesByUrl.set(comparisonKey, {
      pr: parsed,
      attachment_title: title
    });
  }
  return [...candidatesByUrl.values()];
}

async function resolveAttachedSameRepoPullRequestCandidate(input: {
  candidates: ProviderAttachedSameRepoPullRequestCandidate[];
  mode?: 'merge_closeout' | 'review_promotion';
  issueIdentifier?: string | null;
  blockedBy?: readonly LiveLinearTrackedBlocker[] | null;
  resolveSnapshot: (
    input: ProviderPrSnapshotReaderInput
  ) => Promise<ProviderPrSnapshotRecord>;
  resolveSnapshotActionRequiredReasons: (
    snapshot: ProviderPrSnapshotRecord,
    options?: { readinessMode?: 'merge' | 'review' }
  ) => string[];
}): Promise<ProviderMergeCloseoutAttachedPrResolution> {
  const mode = input.mode ?? 'merge_closeout';
  const ignoredCrossIssueCandidates =
    mode === 'review_promotion'
      ? input.candidates.filter((candidate) =>
          isReviewPromotionCrossIssueCandidate({
            attachmentTitle: candidate.attachment_title,
            issueIdentifier: input.issueIdentifier ?? null,
            blockedBy: input.blockedBy ?? null
          })
        )
      : [];
  const ignoredCrossIssuePrUrls = ignoredCrossIssueCandidates.map((candidate) => candidate.pr.url);
  const ignoredCrossIssueUrlSet = new Set(ignoredCrossIssuePrUrls);

  const inspectedCandidates: Array<{
    pr: ProviderMergeCloseoutPullRequestRecord;
    snapshot: ProviderMergeCloseoutSnapshotRecord;
    attachment_title: string | null;
  }> = [];

  for (const candidate of input.candidates) {
    if (ignoredCrossIssueUrlSet.has(candidate.pr.url)) {
      continue;
    }
    const rawSnapshot = await input.resolveSnapshot({
      owner: candidate.pr.owner,
      repo: candidate.pr.repo,
      prNumber: candidate.pr.number,
      readinessMode: 'merge'
    });
    const snapshot = mapSnapshotRecord(
      rawSnapshot,
      input.resolveSnapshotActionRequiredReasons(rawSnapshot as never, {
        readinessMode: 'merge'
      })
    );
    if (snapshot.github_rate_limit && !isTerminalPullRequestSnapshot(snapshot)) {
      throw buildProviderGitHubRateLimitError(snapshot.github_rate_limit);
    }
    inspectedCandidates.push({
      pr: candidate.pr,
      snapshot,
      attachment_title: candidate.attachment_title
    });
  }

  const openUnmergedCandidates = inspectedCandidates.filter(
    (candidate) =>
      !isMergedPullRequestSnapshot(candidate.snapshot) && candidate.snapshot.state !== 'CLOSED'
  );

  const ignoredClosedUnmergedCandidates =
    mode === 'merge_closeout' && openUnmergedCandidates.length === 1
      ? inspectedCandidates.filter((candidate) =>
          isClosedUnmergedPullRequestSnapshot(candidate.snapshot)
        )
      : inspectedCandidates.filter(
          (candidate) =>
            isClosedUnmergedPullRequestSnapshot(candidate.snapshot) &&
            openUnmergedCandidates.some((openCandidate) =>
              isSnapshotStrictlyOlderThanSelection(candidate.snapshot, openCandidate.snapshot)
            )
        );
  const ignoredClosedUnmergedPrUrls = ignoredClosedUnmergedCandidates.map(
    (candidate) => candidate.pr.url
  );
  const ignoredClosedUnmergedUrlSet = new Set(ignoredClosedUnmergedPrUrls);
  const resolutionCandidates = inspectedCandidates.filter(
    (candidate) => !ignoredClosedUnmergedUrlSet.has(candidate.pr.url)
  );

  if (resolutionCandidates.length === 1) {
    const selectedCandidate = resolutionCandidates[0]!;
    return {
      selected_pr: selectedCandidate.pr,
      selected_snapshot: selectedCandidate.snapshot,
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: ignoredClosedUnmergedPrUrls,
      ignored_cross_issue_pr_urls: ignoredCrossIssuePrUrls,
      conflicting_attached_pr_urls: [],
      selection_note: buildIgnoredAttachedPrSelectionNote({
        ignoredClosedUnmergedPrUrls,
        ignoredCrossIssuePrUrls
      })
    };
  }

  const mergedCandidates = resolutionCandidates.filter((candidate) =>
    isMergedPullRequestSnapshot(candidate.snapshot)
  );
  const nonMergedCandidates = resolutionCandidates.filter(
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
        ignored_closed_unmerged_pr_urls: ignoredClosedUnmergedPrUrls,
        ignored_cross_issue_pr_urls: ignoredCrossIssuePrUrls,
        conflicting_attached_pr_urls: [],
        selection_note: appendIgnoredAttachedPrSelectionNote(
          ignoredHistoricalPrUrls.length > 0
            ? `Ignored historical merged PR URLs: ${ignoredHistoricalPrUrls.join(', ')}.`
            : null,
          {
            ignoredClosedUnmergedPrUrls,
            ignoredCrossIssuePrUrls
          }
        )
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
      const ignoredHistoricalMergedPrUrls = ignoredHistoricalMergedCandidates.map(
        (candidate) => candidate.pr.url
      );
      const staleUnmergedPrUrls = staleUnmergedCandidates.map((candidate) => candidate.pr.url);
      const ignoredHistoricalPrUrls = [
        ...ignoredHistoricalMergedPrUrls,
        ...staleUnmergedPrUrls
      ];
      return {
        selected_pr: selectedMergedCandidate.pr,
        selected_snapshot: selectedMergedCandidate.snapshot,
        ignored_historical_pr_urls: ignoredHistoricalPrUrls,
        ignored_closed_unmerged_pr_urls: ignoredClosedUnmergedPrUrls,
        ignored_cross_issue_pr_urls: ignoredCrossIssuePrUrls,
        conflicting_attached_pr_urls: [],
        selection_note: appendIgnoredAttachedPrSelectionNote(
          `Selected already-merged PR ${selectedMergedCandidate.pr.url} because all remaining attached same-repo PR URLs are older.${ignoredHistoricalMergedPrUrls.length > 0 ? ` Ignored older merged PR URLs: ${ignoredHistoricalMergedPrUrls.join(', ')}.` : ''}${staleUnmergedPrUrls.length > 0 ? ` Older unmerged PR URLs: ${staleUnmergedPrUrls.join(', ')}.` : ''}`,
          {
            ignoredClosedUnmergedPrUrls,
            ignoredCrossIssuePrUrls
          }
        )
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
    ignored_closed_unmerged_pr_urls: ignoredClosedUnmergedPrUrls,
    ignored_cross_issue_pr_urls: ignoredCrossIssuePrUrls,
    conflicting_attached_pr_urls: resolutionCandidates
      .filter((candidate) => !ignoredHistoricalUrlSet.has(candidate.pr.url))
      .map((candidate) => candidate.pr.url),
    selection_note: null
  };
}

function buildMultipleAttachedPrsSummary(input: {
  repoKey: string;
  ignoredHistoricalPrUrls: string[];
  ignoredClosedUnmergedPrUrls: string[];
  conflictingAttachedPrUrls: string[];
}): string {
  const ignoredSummary = buildIgnoredAttachedPrSummary({
    ignoredHistoricalPrUrls: input.ignoredHistoricalPrUrls,
    ignoredClosedUnmergedPrUrls: input.ignoredClosedUnmergedPrUrls,
    ignoredCrossIssuePrUrls: []
  });
  if (input.conflictingAttachedPrUrls.length === 0) {
    return `Attached GitHub pull requests match ${input.repoKey}, but no current merge candidate remains after bounded filtering; merge closeout is not armed.${ignoredSummary}`;
  }
  return `Multiple attached GitHub pull requests match ${input.repoKey}; conflicting attached PR URLs still require deterministic disambiguation: ${input.conflictingAttachedPrUrls.join(', ')}.${ignoredSummary}`;
}

function buildMultipleAttachedPrsPromotionSummary(input: {
  repoKey: string;
  ignoredHistoricalPrUrls: string[];
  ignoredClosedUnmergedPrUrls: string[];
  ignoredCrossIssuePrUrls: string[];
  conflictingAttachedPrUrls: string[];
}): string {
  const ignoredSummary = buildIgnoredAttachedPrSummary({
    ignoredHistoricalPrUrls: input.ignoredHistoricalPrUrls,
    ignoredClosedUnmergedPrUrls: input.ignoredClosedUnmergedPrUrls,
    ignoredCrossIssuePrUrls: input.ignoredCrossIssuePrUrls
  });
  if (input.conflictingAttachedPrUrls.length === 0) {
    return `Attached GitHub pull requests match ${input.repoKey}, but no current review-handoff promotion candidate remains after bounded filtering.${ignoredSummary}`;
  }
  return `Multiple attached GitHub pull requests match ${input.repoKey}; conflicting current-candidate PR URLs still require deterministic disambiguation before review-handoff promotion can continue: ${input.conflictingAttachedPrUrls.join(', ')}.${ignoredSummary}`;
}

async function loadProviderSnapshotRecord(input: {
  owner: string;
  repo: string;
  prNumber: number;
  readinessMode: 'merge' | 'review';
  resolveSnapshot: (input: ProviderPrSnapshotReaderInput) => Promise<ProviderPrSnapshotRecord>;
  resolveSnapshotActionRequiredReasons: (
    snapshot: ProviderPrSnapshotRecord,
    options?: { readinessMode?: 'merge' | 'review' }
  ) => string[];
}): Promise<ProviderMergeCloseoutSnapshotRecord> {
  const rawSnapshot = await input.resolveSnapshot({
    owner: input.owner,
    repo: input.repo,
    prNumber: input.prNumber,
    readinessMode: input.readinessMode
  });
  const actionRequiredReasons = input.resolveSnapshotActionRequiredReasons(rawSnapshot, {
    readinessMode: input.readinessMode
  });
  return mapSnapshotRecord(rawSnapshot, actionRequiredReasons);
}

function describeProviderBranchRecoveryReason(reason: string): string {
  if (reason === 'merge_state=DIRTY') {
    return 'conflict recovery';
  }
  return 'branch refresh';
}

function doesProviderBranchRecoveryMatchPullRequest(
  recovery: ProviderBranchRecoveryAttemptRecord | null | undefined,
  pr: ProviderMergeCloseoutPullRequestRecord
): boolean {
  if (!recovery || recovery.command !== 'gh') {
    return false;
  }
  const expectedRepo = `${pr.owner}/${pr.repo}`;
  return (
    recovery.args[0] === 'pr'
    && recovery.args[1] === 'update-branch'
    && recovery.args[2] === String(pr.number)
    && recovery.args.includes(expectedRepo)
  );
}

async function attemptProviderBranchRecovery(input: {
  pr: ProviderMergeCloseoutPullRequestRecord;
  snapshot: ProviderMergeCloseoutSnapshotRecord;
  previousBranchRecovery?: ProviderBranchRecoveryAttemptRecord | null;
  repoRoot: string;
  now: () => string;
  runCommand: ProviderMergeCloseoutCommandRunner;
}): Promise<ProviderBranchRecoveryAttemptRecord | null> {
  const recoveryReason = resolveAutomaticBranchRecoveryReason(input.snapshot, {
    requireExclusive: true
  });
  if (
    !recoveryReason
    || !shouldAttemptAutomaticBranchRecovery(input.snapshot)
  ) {
    return null;
  }
  const previousBranchRecovery = input.previousBranchRecovery ?? null;
  if (
    previousBranchRecovery?.ok === true
    && previousBranchRecovery.failure_kind === null
    && doesProviderBranchRecoveryMatchPullRequest(previousBranchRecovery, input.pr)
    && previousBranchRecovery.head_oid === input.snapshot.head_oid
    && previousBranchRecovery.recovery_reason === recoveryReason
  ) {
    return previousBranchRecovery;
  }
  const attemptedAt = input.now();
  const args = buildPrUpdateBranchArgs({
    owner: input.pr.owner,
    repo: input.pr.repo,
    prNumber: input.pr.number
  });
  const result = await input.runCommand({
    command: 'gh',
    args,
    cwd: input.repoRoot
  });
  const details = normalizeCommandText(result.stderr) ?? normalizeCommandText(result.stdout);
  return {
    attempted_at: attemptedAt,
    head_oid: input.snapshot.head_oid,
    recovery_reason: recoveryReason,
    command: 'gh',
    args,
    exit_code: result.exitCode,
    ok: result.ok,
    stdout: normalizeCommandText(result.stdout),
    stderr: normalizeCommandText(result.stderr),
    failure_kind: result.ok
      ? null
      : isConflictLikeBranchRecoveryFailureMessage(details) ? 'conflict' : 'other'
  };
}

function classifyPreBranchRecoverySnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord,
  prNumber: number,
  mode: 'merge_closeout' | 'review_promotion'
): {
  status: 'watching' | 'action_required';
  reason: string;
  summary: string;
  github_rate_limit?: ProviderGitHubRateLimitRecord | null;
} | null {
  if (snapshot.state === 'CLOSED') {
    return {
      status: 'action_required',
      reason: 'pr_closed_unmerged',
      summary:
        mode === 'review_promotion'
          ? `Attached PR #${prNumber} is closed without merging; reopen it or attach a replacement PR before review-handoff promotion can continue.`
          : `Attached PR #${prNumber} is closed without merging; reopen it or attach a replacement PR.`
    };
  }
  if (
    snapshot.action_required_reasons.length > 0
    && !shouldAttemptAutomaticBranchRecovery(snapshot)
  ) {
    return {
      status: 'action_required',
      reason:
        snapshot.action_required_reasons[0] ??
        (mode === 'review_promotion'
          ? 'review_handoff_promotion_blocked'
          : 'merge_action_required'),
      summary:
        mode === 'review_promotion'
          ? `Review-handoff promotion is blocked by: ${snapshot.action_required_reasons.join(', ')}.`
          : `Merge closeout is blocked by: ${snapshot.action_required_reasons.join(', ')}.`
    };
  }
  if (snapshot.github_rate_limit) {
    return {
      status: 'watching',
      reason: 'github_rate_limited',
      summary:
        mode === 'review_promotion'
          ? `Review-handoff promotion is waiting for GitHub API budget recovery before rereading PR #${prNumber}: ${formatProviderGitHubRateLimitSummary(snapshot.github_rate_limit)}.`
          : `Merge closeout is waiting for GitHub API budget recovery before rereading PR #${prNumber}: ${formatProviderGitHubRateLimitSummary(snapshot.github_rate_limit)}.`,
      github_rate_limit: snapshot.github_rate_limit
    };
  }
  return null;
}

function classifyProviderMutationRateLimitSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord,
  prNumber: number,
  mode: 'merge_closeout' | 'review_promotion'
): {
  status: 'watching';
  reason: 'github_rate_limited';
  summary: string;
  github_rate_limit: ProviderGitHubRateLimitRecord;
} | null {
  if (!snapshot.github_rate_limit || isMergedPullRequestSnapshot(snapshot)) {
    return null;
  }
  return {
    status: 'watching',
    reason: 'github_rate_limited',
    summary:
      mode === 'review_promotion'
        ? `Review-handoff promotion is waiting for GitHub API budget recovery before mutating PR #${prNumber}: ${formatProviderGitHubRateLimitSummary(snapshot.github_rate_limit)}.`
        : `Merge closeout is waiting for GitHub API budget recovery before mutating PR #${prNumber}: ${formatProviderGitHubRateLimitSummary(snapshot.github_rate_limit)}.`,
    github_rate_limit: snapshot.github_rate_limit
  };
}

function classifyPendingBranchRecovery(input: {
  snapshot: ProviderMergeCloseoutSnapshotRecord;
  recoveryAttempt: ProviderBranchRecoveryAttemptRecord;
  prNumber: number;
  mode: 'merge_closeout' | 'review_promotion';
}): {
  status: 'watching';
  reason: 'branch_refresh_requested';
  summary: string;
} | null {
  const pendingReason = resolveAutomaticBranchRecoveryReason(input.snapshot, {
    requireExclusive: true
  });
  if (
    pendingReason !== input.recoveryAttempt.recovery_reason
    || !shouldAttemptAutomaticBranchRecovery(input.snapshot)
  ) {
    return null;
  }
  const action = describeProviderBranchRecoveryReason(input.recoveryAttempt.recovery_reason);
  return {
    status: 'watching',
    reason: 'branch_refresh_requested',
    summary:
      input.mode === 'review_promotion'
        ? `Requested automatic ${action} for attached PR #${input.prNumber}; waiting for GitHub to recompute review-handoff readiness.`
        : `Requested automatic ${action} for attached PR #${input.prNumber}; waiting for GitHub to recompute merge readiness.`
  };
}

function classifyNonMergedSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord,
  prNumber: number
): {
  status: 'watching' | 'action_required';
  reason: string;
  summary: string;
  github_rate_limit?: ProviderGitHubRateLimitRecord | null;
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
  if (snapshot.github_rate_limit) {
    return {
      status: 'watching',
      reason: 'github_rate_limited',
      summary: `Merge closeout is waiting for GitHub API budget recovery before rereading PR #${prNumber}: ${formatProviderGitHubRateLimitSummary(snapshot.github_rate_limit)}.`,
      github_rate_limit: snapshot.github_rate_limit
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

function classifyNonMergedReviewPromotionSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord,
  prNumber: number
): {
  status: 'watching' | 'action_required';
  reason: string;
  summary: string;
  github_rate_limit?: ProviderGitHubRateLimitRecord | null;
} | null {
  if (snapshot.state === 'CLOSED') {
    return {
      status: 'action_required',
      reason: 'pr_closed_unmerged',
      summary:
        `Attached PR #${prNumber} is closed without merging; reopen it or attach a replacement PR before review-handoff promotion can continue.`
    };
  }
  if (snapshot.action_required_reasons.length > 0) {
    return {
      status: 'action_required',
      reason: snapshot.action_required_reasons[0] ?? 'review_handoff_promotion_blocked',
      summary: `Review-handoff promotion is blocked by: ${snapshot.action_required_reasons.join(', ')}.`
    };
  }
  if (snapshot.github_rate_limit) {
    return {
      status: 'watching',
      reason: 'github_rate_limited',
      summary: `Review-handoff promotion is waiting for GitHub API budget recovery before rereading PR #${prNumber}: ${formatProviderGitHubRateLimitSummary(snapshot.github_rate_limit)}.`,
      github_rate_limit: snapshot.github_rate_limit
    };
  }
  if (snapshot.gate_reasons.length > 0 || !snapshot.ready_to_merge) {
    return {
      status: 'watching',
      reason: snapshot.gate_reasons[0] ?? 'waiting_for_merge_ready',
      summary:
        snapshot.gate_reasons.length > 0
          ? `Review-handoff promotion is waiting for readiness gates to clear: ${snapshot.gate_reasons.join(', ')}.`
          : 'Review-handoff promotion is waiting for the attached pull request to become merge-ready.'
    };
  }
  return null;
}

function isMergedPullRequestSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord
): boolean {
  return snapshot.merged_at !== null || snapshot.state === 'MERGED';
}

function isClosedUnmergedPullRequestSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord
): boolean {
  return snapshot.state === 'CLOSED' && !isMergedPullRequestSnapshot(snapshot);
}

function isTerminalPullRequestSnapshot(
  snapshot: ProviderMergeCloseoutSnapshotRecord
): boolean {
  return isMergedPullRequestSnapshot(snapshot) || snapshot.state === 'CLOSED';
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

function buildIgnoredAttachedPrSummary(input: {
  ignoredHistoricalPrUrls: string[];
  ignoredClosedUnmergedPrUrls: string[];
  ignoredCrossIssuePrUrls: string[];
}): string {
  const parts: string[] = [];
  if (input.ignoredHistoricalPrUrls.length > 0) {
    parts.push(`Ignored historical merged PR URLs: ${input.ignoredHistoricalPrUrls.join(', ')}.`);
  }
  if (input.ignoredClosedUnmergedPrUrls.length > 0) {
    parts.push(
      `Ignored closed prior-attempt PR URLs: ${input.ignoredClosedUnmergedPrUrls.join(', ')}.`
    );
  }
  if (input.ignoredCrossIssuePrUrls.length > 0) {
    parts.push(`Ignored cross-issue PR URLs: ${input.ignoredCrossIssuePrUrls.join(', ')}.`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

function buildIgnoredAttachedPrSelectionNote(input: {
  ignoredClosedUnmergedPrUrls: string[];
  ignoredCrossIssuePrUrls: string[];
}): string | null {
  return appendIgnoredAttachedPrSelectionNote(null, input);
}

function appendIgnoredAttachedPrSelectionNote(
  baseNote: string | null,
  input: {
    ignoredClosedUnmergedPrUrls: string[];
    ignoredCrossIssuePrUrls: string[];
  }
): string | null {
  const parts: string[] = [];
  if (typeof baseNote === 'string' && baseNote.trim().length > 0) {
    parts.push(baseNote.trim());
  }
  if (input.ignoredClosedUnmergedPrUrls.length > 0) {
    parts.push(
      `Ignored closed prior-attempt PR URLs: ${input.ignoredClosedUnmergedPrUrls.join(', ')}.`
    );
  }
  if (input.ignoredCrossIssuePrUrls.length > 0) {
    parts.push(`Ignored cross-issue PR URLs: ${input.ignoredCrossIssuePrUrls.join(', ')}.`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

function isReviewPromotionCrossIssueCandidate(input: {
  attachmentTitle: string | null;
  issueIdentifier: string | null;
  blockedBy?: readonly LiveLinearTrackedBlocker[] | null;
}): boolean {
  const currentIssueIdentifier = normalizeIssueIdentifierToken(input.issueIdentifier);
  if (!currentIssueIdentifier) {
    return false;
  }
  const leadingIssueIdentifier = extractLeadingIssueIdentifier(input.attachmentTitle);
  if (!leadingIssueIdentifier || leadingIssueIdentifier === currentIssueIdentifier) {
    return false;
  }
  const title = normalizeOptionalString(input.attachmentTitle) ?? '';
  const blockedIssueIdentifiers = new Set(
    (input.blockedBy ?? [])
      .map((blocker) => normalizeIssueIdentifierToken(blocker.identifier))
      .filter((value): value is string => value !== null)
  );
  if (
    blockedIssueIdentifiers.has(leadingIssueIdentifier) &&
    hasReviewPromotionBlockerWording(title)
  ) {
    return true;
  }
  return /\bfollow(?:-| )up\b/i.test(title);
}

function extractLeadingIssueIdentifier(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^\s*[[(]?([A-Z][A-Z0-9]+-\d+)\b/i.exec(value);
  return normalizeIssueIdentifierToken(match?.[1] ?? null);
}

function hasReviewPromotionBlockerWording(value: string): boolean {
  return /\bblock(?:er|ed|ing)?\b/i.test(value);
}

function normalizeIssueIdentifierToken(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z][A-Z0-9]+-\d+$/.test(trimmed) ? trimmed : null;
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
  const snapshotRecord = readRecord(snapshot);
  const checks = readRecord(snapshot.checks);
  const requiredChecks = readRecord(snapshot.requiredChecks);
  const githubRateLimit = mapProviderGitHubRateLimit(
    readRecord(snapshotRecord?.githubRateLimit) ?? readRecord(snapshotRecord?.github_rate_limit)
  );
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
    head_oid: normalizeOptionalString(snapshot.headOid),
    github_rate_limit: githubRateLimit
  };
}

function resolveProviderGitHubRateLimitRecord(input: unknown): ProviderGitHubRateLimitRecord | null {
  const inputRecord = readRecord(input);
  const embedded = inputRecord?.githubRateLimit ?? inputRecord?.github_rate_limit;
  const embeddedRateLimit = mapProviderGitHubRateLimit(embedded);
  if (embeddedRateLimit) {
    return embeddedRateLimit;
  }
  return mapProviderGitHubRateLimit(resolveGitHubRateLimitStatus(input));
}

function mapProviderGitHubRateLimit(input: unknown): ProviderGitHubRateLimitRecord | null {
  const rateLimit = readRecord(input);
  if (!rateLimit || rateLimit.kind !== 'github_rate_limited') {
    return null;
  }
  return {
    kind: 'github_rate_limited',
    surface: normalizeOptionalString(rateLimit.surface) ?? 'unknown',
    limit_type: normalizeOptionalString(rateLimit.limit_type) ?? 'unknown',
    status: normalizeOptionalNumber(rateLimit.status),
    reset_at: normalizeOptionalString(rateLimit.reset_at),
    retry_after_seconds: normalizeOptionalNumber(rateLimit.retry_after_seconds),
    retry_at: normalizeOptionalString(rateLimit.retry_at),
    message: normalizeOptionalString(rateLimit.message)
  };
}

function formatProviderGitHubRateLimitSummary(rateLimit: ProviderGitHubRateLimitRecord): string {
  return formatGitHubRateLimitStatus(rateLimit as PrWatchMergeGitHubRateLimitStatus);
}

function buildProviderGitHubRateLimitError(rateLimit: ProviderGitHubRateLimitRecord): Error {
  const error = new Error(formatProviderGitHubRateLimitSummary(rateLimit)) as Error & {
    githubRateLimit?: ProviderGitHubRateLimitRecord;
  };
  error.githubRateLimit = rateLimit;
  return error;
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

function isProbeRecoveryCacheContextFreshEnough(input: {
  issueState?: string | null;
  issueStateType?: string | null;
  issueUpdatedAt?: string | null;
  issueContext: ProviderLinearIssueContext;
}): boolean {
  const expectedState = normalizeProviderMergeCloseoutIssueState(input.issueState);
  const cachedState = normalizeProviderMergeCloseoutIssueState(input.issueContext.state?.name ?? null);
  if (expectedState !== null && cachedState !== expectedState) {
    return false;
  }

  const expectedStateType = normalizeOptionalString(input.issueStateType);
  const cachedStateType = normalizeOptionalString(input.issueContext.state?.type ?? null);
  if (expectedStateType !== null && cachedStateType !== expectedStateType) {
    return false;
  }

  const expectedUpdatedAt = normalizeOptionalString(input.issueUpdatedAt);
  if (expectedUpdatedAt === null) {
    return true;
  }
  const cachedUpdatedAt = normalizeOptionalString(input.issueContext.updated_at);
  if (cachedUpdatedAt === null) {
    return false;
  }

  const expectedUpdatedAtMs = Date.parse(expectedUpdatedAt);
  const cachedUpdatedAtMs = Date.parse(cachedUpdatedAt);
  if (Number.isFinite(expectedUpdatedAtMs) && Number.isFinite(cachedUpdatedAtMs)) {
    return cachedUpdatedAtMs >= expectedUpdatedAtMs;
  }

  return cachedUpdatedAt === expectedUpdatedAt;
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
