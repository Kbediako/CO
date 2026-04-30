export interface PrWatchMergeOptions {
  usage?: string;
  defaultAutoMerge?: boolean;
  defaultExitOnActionRequired?: boolean;
  enableAutomaticBranchRecovery?: boolean;
  readinessMode?: 'merge' | 'review';
}

export interface PrWatchMergeCheckFailure {
  name: string;
  state: string;
  detailsUrl: string | null;
}

export interface PrWatchMergeCheckSummary {
  total: number;
  successCount: number;
  pending: string[];
  failed: PrWatchMergeCheckFailure[];
}

export interface PrWatchMergeCoderabbitReviewMeta {
  actionableCount: number;
  outsideDiffCount: number;
  nitpickCount: number;
}

export interface PrWatchMergeBotRereviewRollupContext {
  name: string;
  state: 'success' | 'pending' | 'failed' | 'missing' | string;
  signal: string;
  observedAt: string | null;
  observedAtMs: number | null;
  detailsUrl: string | null;
}

export interface PrWatchMergeBotRereviewDiagnostics {
  rawPendingBots: string[];
  effectivePendingBots: string[];
  clearedPendingBots: string[];
  ignoredMentions: PrWatchMergeIgnoredBotRereviewMention[];
  coderabbit: {
    statusCheckRollup: {
      state: 'success' | 'pending' | 'failed' | 'missing' | string;
      contexts: PrWatchMergeBotRereviewRollupContext[];
      latestSuccessAtMs: number | null;
    };
    stalePendingCleared: boolean;
    latestRequestAtMs: number | null;
    latestSuccessAtMs: number | null;
    successAfterRequest: boolean;
    pendingBlockerSignal: string;
  };
}

export interface PrWatchMergeIgnoredBotRereviewMention {
  kind: string;
  reason: string;
  commentId: number | null;
  createdAtMs: number | null;
  source: 'issue' | 'pull' | 'review';
}

export interface PrWatchMergeBotRereviewSignals {
  fetchError: boolean;
  rateLimit?: PrWatchMergeGitHubRateLimitStatus | null;
  pendingBots: string[];
  inProgressBots: string[];
  requestTimesByBot?: Record<string, number>;
  ignoredMentions?: PrWatchMergeIgnoredBotRereviewMention[];
  coderabbit: PrWatchMergeCoderabbitReviewMeta;
}

export interface PrWatchMergeGitHubRateLimitStatus {
  kind: 'github_rate_limited';
  surface: 'graphql' | 'rest' | 'unknown' | string;
  limit_type: 'primary' | 'secondary' | string;
  status: number | null;
  reset_at: string | null;
  retry_after_seconds: number | null;
  retry_at: string | null;
  message: string | null;
}

export interface PrWatchMergeSnapshot {
  number: number;
  url: string | null;
  state: string;
  isDraft: boolean;
  reviewDecision: string;
  mergeStateStatus: string;
  updatedAt: string | null;
  mergedAt: string | null;
  labels: string[];
  hasDoNotMergeLabel: boolean;
  unresolvedThreadCount: number;
  unacknowledgedBotFeedbackCount: number;
  botFeedbackFetchError: boolean;
  botRereviewFetchError: boolean;
  botRereviewPending: string[];
  botRereviewInProgress: string[];
  botRereviewDiagnostics: PrWatchMergeBotRereviewDiagnostics;
  coderabbitReviewMeta: PrWatchMergeCoderabbitReviewMeta;
  checks: PrWatchMergeCheckSummary;
  requiredChecks: PrWatchMergeCheckSummary | null;
  requiredChecksQueryFailed: boolean;
  gateChecksSource: 'required' | 'rollup';
  gateReasons: string[];
  readinessMode: 'merge' | 'review';
  readyToMerge: boolean;
  headOid: string | null;
  fanoutCacheHit: boolean;
  githubRateLimit: PrWatchMergeGitHubRateLimitStatus | null;
  githubRateLimits: PrWatchMergeGitHubRateLimitStatus[];
}

export interface PrWatchMergeRequiredChecksCache {
  headOid: string | null;
  updatedAt?: string | null;
  summary?: PrWatchMergeCheckSummary;
  requiredChecks?: PrWatchMergeCheckSummary | null;
  requiredChecksFetchError?: boolean;
  requiredChecksForNextPoll?: PrWatchMergeRequiredChecksCache | null;
  inlineBotFeedback?: {
    fetchError: boolean;
    rateLimit?: PrWatchMergeGitHubRateLimitStatus | null;
    unacknowledgedCount: number;
  } | null;
  botRereviewSignals?: PrWatchMergeBotRereviewSignals | null;
}

export interface PrWatchMergeArgsOptions {
  owner: string;
  repo: string;
  prNumber: number;
  mergeMethod: 'merge' | 'squash' | 'rebase' | string;
  deleteBranch: boolean;
  headOid?: string | null;
}

export interface PrWatchMergeUpdateBranchArgsOptions {
  owner: string;
  repo: string;
  prNumber: number;
}

export interface PrWatchMergeSnapshotInput {
  owner: string;
  repo: string;
  prNumber: number;
  readinessMode?: 'merge' | 'review';
}

export function printPrWatchMergeHelp(options?: PrWatchMergeOptions): void;

export function isHumanReviewActor(
  user:
    | {
        login?: string | null;
        type?: string | null;
      }
    | null
    | undefined
): boolean;

export function parseGitHubRepoFromRemoteUrl(rawUrl: string): { owner: string; repo: string } | null;
export function buildPrNumberViewArgs(owner?: string, repo?: string): string[];
export function buildPrUpdateBranchArgs(options: PrWatchMergeUpdateBranchArgsOptions): string[];
export function buildAutomaticBranchRecoveryKey(
  snapshot: Pick<PrWatchMergeSnapshot, 'headOid'> | null | undefined,
  recoveryReason: string
): string;
export function isNoRequiredChecksReportedErrorMessage(value: string | null | undefined): boolean;

export function summarizeRequiredChecks(entries: unknown): PrWatchMergeCheckSummary;

export function resolveRequiredChecksSummary(
  freshSummary: PrWatchMergeCheckSummary | null,
  previousSummary: PrWatchMergeCheckSummary | null,
  fetchError?: boolean
): PrWatchMergeCheckSummary | null;

export function resolveCachedRequiredChecksSummary(
  previousCache: PrWatchMergeRequiredChecksCache | null,
  currentHeadOid: string | null
): PrWatchMergeCheckSummary | null;

export function buildStatusSnapshot(
  response: unknown,
  requiredChecks?: PrWatchMergeCheckSummary | null,
  inlineBotFeedback?: {
    fetchError: boolean;
    rateLimit?: PrWatchMergeGitHubRateLimitStatus | null;
    unacknowledgedCount: number;
    rereview?: PrWatchMergeBotRereviewSignals | null;
  } | null,
  options?: Pick<PrWatchMergeOptions, 'readinessMode'> & {
    requiredChecksQueryFailed?: boolean;
    fanoutCacheHit?: boolean;
    githubRateLimits?: PrWatchMergeGitHubRateLimitStatus[];
  }
): PrWatchMergeSnapshot;

export function resolveGitHubRateLimitStatus(
  input: unknown,
  options?: {
    surface?: 'graphql' | 'rest' | 'unknown' | string;
    nowMs?: number;
  }
): PrWatchMergeGitHubRateLimitStatus | null;

export function formatGitHubRateLimitStatus(
  rateLimit: PrWatchMergeGitHubRateLimitStatus | null | undefined
): string;

export function planGitHubRateLimitBackoff(
  rateLimit: PrWatchMergeGitHubRateLimitStatus | null | undefined,
  options?: {
    nowMs?: number;
    fallbackMs?: number;
    maxJitterMs?: number;
    remainingMs?: number;
    jitterSeed?: string;
  }
): number;

export function resolveActionRequiredReasons(
  snapshot: PrWatchMergeSnapshot,
  options?: Pick<PrWatchMergeOptions, 'readinessMode'>
): string[];

export interface AutomaticBranchRecoverySnapshotLike {
  action_required_reasons?: string[] | null;
  gate_reasons?: string[] | null;
  gateReasons?: string[] | null;
}

export function resolveAutomaticBranchRecoveryReason(
  snapshotOrReasons: PrWatchMergeSnapshot | AutomaticBranchRecoverySnapshotLike | string[],
  options?: Pick<PrWatchMergeOptions, 'readinessMode'> & {
    requireExclusive?: boolean;
  }
): 'merge_state=BEHIND' | 'merge_state=DIRTY' | null;

export function shouldAttemptAutomaticBranchRecovery(
  snapshotOrReasons: PrWatchMergeSnapshot | AutomaticBranchRecoverySnapshotLike | string[],
  options?: Pick<PrWatchMergeOptions, 'readinessMode'>
): boolean;

export function isConflictLikeBranchRecoveryFailureMessage(
  value: string | null | undefined
): boolean;

export function shouldSucceedAfterTimeout(
  snapshot: PrWatchMergeSnapshot | null | undefined,
  options?: Pick<PrWatchMergeOptions, 'readinessMode'> & {
    pollingHealthy?: boolean;
  }
): boolean;

export function resolveLatestBotRereviewRequests(
  comments: Array<{
    id?: number | string | null;
    body?: string | null;
    created_at?: string | null;
    user?: {
      login?: string | null;
      type?: string | null;
    } | null;
    __source?: 'issue' | 'pull' | 'review' | string | null;
  }>
): Record<
  string,
  {
    commentId: number | null;
    createdAtMs: number;
    source: 'issue' | 'pull' | 'review';
  }
>;

export function resolveBotRereviewRequestMentions(
  comments: Array<{
    id?: number | string | null;
    body?: string | null;
    created_at?: string | null;
    user?: {
      login?: string | null;
      type?: string | null;
    } | null;
    __source?: 'issue' | 'pull' | 'review' | string | null;
  }>
): {
  requests: Record<
    string,
    {
      commentId: number | null;
      createdAtMs: number;
      source: 'issue' | 'pull' | 'review';
    }
  >;
  ignoredMentions: PrWatchMergeIgnoredBotRereviewMention[];
};

export function resolveBotRereviewTimingForKind(params: {
  kind: string;
  requestAtMs: number;
  issueComments: Array<{
    user?: { login?: string | null } | null;
    created_at?: string | null;
    commit_id?: string | null;
    __source?: 'issue' | 'pull' | 'review' | string | null;
  }>;
  reviews: Array<{
    user?: { login?: string | null } | null;
    commit_id?: string | null;
    submitted_at?: string | null;
  }>;
  issueReactions: Array<{
    user?: { login?: string | null } | null;
    content?: string | null;
    created_at?: string | null;
  }>;
  requestCommentReactions: Array<{
    user?: { login?: string | null } | null;
    content?: string | null;
    created_at?: string | null;
  }>;
  headOid?: string | null;
}): {
  completeAtMs: number | null;
  inProgressAtMs: number | null;
};

export function fetchPrStatusSnapshot(input: PrWatchMergeSnapshotInput): Promise<PrWatchMergeSnapshot>;
export function buildPrMergeArgs(options: PrWatchMergeArgsOptions): string[];

export function runPrWatchMerge(argv: string[], options?: PrWatchMergeOptions): Promise<number>;
