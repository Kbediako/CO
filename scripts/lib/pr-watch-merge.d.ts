export interface PrWatchMergeOptions {
  usage?: string;
}

export function printPrWatchMergeHelp(options?: PrWatchMergeOptions): void;

export function runPrWatchMerge(argv: string[], options?: PrWatchMergeOptions): Promise<number>;

