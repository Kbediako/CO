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
  checks: PrWatchMergeCheckSummary;
  requiredChecks: PrWatchMergeCheckSummary | null;
  gateChecksSource: 'required' | 'rollup';
  gateReasons: string[];
  readyToMerge: boolean;
  headOid: string | null;
}

export function printPrWatchMergeHelp(options?: PrWatchMergeOptions): void;

export function summarizeRequiredChecks(entries: unknown): PrWatchMergeCheckSummary;

export function resolveRequiredChecksSummary(
  freshSummary: PrWatchMergeCheckSummary | null,
  previousSummary: PrWatchMergeCheckSummary | null,
  fetchError?: boolean
): PrWatchMergeCheckSummary | null;

export function buildStatusSnapshot(
  response: unknown,
  requiredChecks?: PrWatchMergeCheckSummary | null
): PrWatchMergeSnapshot;

export function runPrWatchMerge(argv: string[], options?: PrWatchMergeOptions): Promise<number>;
