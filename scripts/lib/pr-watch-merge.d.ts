export interface PrWatchMergeOptions {
  usage?: string;
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

export interface PrWatchMergeBotRereviewSignals {
  fetchError: boolean;
  pendingBots: string[];
  inProgressBots: string[];
  coderabbit: PrWatchMergeCoderabbitReviewMeta;
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
  coderabbitReviewMeta: PrWatchMergeCoderabbitReviewMeta;
  checks: PrWatchMergeCheckSummary;
  requiredChecks: PrWatchMergeCheckSummary | null;
  gateChecksSource: 'required' | 'rollup';
  gateReasons: string[];
  readyToMerge: boolean;
  headOid: string | null;
}

export interface PrWatchMergeRequiredChecksCache {
  headOid: string | null;
  summary: PrWatchMergeCheckSummary;
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
    unacknowledgedCount: number;
    rereview?: PrWatchMergeBotRereviewSignals | null;
  } | null
): PrWatchMergeSnapshot;

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

export function runPrWatchMerge(argv: string[], options?: PrWatchMergeOptions): Promise<number>;
