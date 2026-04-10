/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { runPrWatchMerge } from '../../../scripts/lib/pr-watch-merge.js';

type PrSubcommandMode = {
  usage: string;
  defaultAutoMerge?: boolean;
  defaultExitOnActionRequired?: boolean;
  enableAutomaticBranchRecovery?: boolean;
  readinessMode?: 'merge' | 'review';
};

export interface RunPrCliShellParams {
  rawArgs: string[];
}

interface PrCliShellDependencies {
  runPrWatchMerge: typeof runPrWatchMerge;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: PrCliShellDependencies = {
  runPrWatchMerge,
  setExitCode: (code: number) => {
    process.exitCode = code;
  }
};

const MODE_BY_SUBCOMMAND: Record<string, PrSubcommandMode> = {
  'watch-merge': {
    usage: 'codex-orchestrator pr watch-merge',
    readinessMode: 'merge'
  },
  'resolve-merge': {
    usage: 'codex-orchestrator pr resolve-merge',
    defaultExitOnActionRequired: true,
    enableAutomaticBranchRecovery: true,
    readinessMode: 'merge'
  },
  'ready-review': {
    usage: 'codex-orchestrator pr ready-review',
    defaultExitOnActionRequired: true,
    readinessMode: 'review'
  }
};

export async function runPrCliShell(
  params: RunPrCliShellParams,
  overrides: Partial<PrCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const [subcommand, ...subcommandArgs] = params.rawArgs;
  if (!subcommand) {
    throw new Error('pr requires a subcommand (watch-merge|resolve-merge|ready-review).');
  }

  const mode = MODE_BY_SUBCOMMAND[subcommand];
  if (!mode) {
    throw new Error(`Unknown pr subcommand: ${subcommand}`);
  }

  const exitCode = await dependencies.runPrWatchMerge(subcommandArgs, mode);
  if (exitCode !== 0) {
    dependencies.setExitCode(exitCode);
  }
}
