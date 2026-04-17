/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { formatDelegationSetupSummary, runDelegationSetup } from './delegationSetup.js';
import {
  cleanupStaleDelegateServerProcesses,
  formatDelegateServerCleanupSummary
} from './utils/delegationMcpHealth.js';

type OutputFormat = 'json' | 'text';
type ArgMap = Record<string, string | boolean>;

export interface RunDelegationCliShellParams {
  positionals: string[];
  flags: ArgMap;
}

interface DelegationCliShellDependencies {
  runDelegationSetup: typeof runDelegationSetup;
  formatDelegationSetupSummary: typeof formatDelegationSetupSummary;
  cleanupStaleDelegateServerProcesses: typeof cleanupStaleDelegateServerProcesses;
  formatDelegateServerCleanupSummary: typeof formatDelegateServerCleanupSummary;
  getCwd: () => string;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: DelegationCliShellDependencies = {
  runDelegationSetup,
  formatDelegationSetupSummary,
  cleanupStaleDelegateServerProcesses,
  formatDelegateServerCleanupSummary,
  getCwd: () => process.cwd(),
  log: (line: string) => console.log(line)
};

export async function runDelegationCliShell(
  params: RunDelegationCliShellParams,
  overrides: Partial<DelegationCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const positionals = [...params.positionals];
  const subcommand = positionals.shift();

  if (!subcommand) {
    throw new Error('delegation requires a subcommand (setup|cleanup-stale).');
  }
  if (subcommand !== 'setup' && subcommand !== 'cleanup-stale') {
    throw new Error(`Unknown delegation subcommand: ${subcommand}`);
  }

  const format = resolveOutputFormat(params.flags);
  const repoRoot = readStringFlag(params.flags, 'repo') ?? dependencies.getCwd();
  if (subcommand === 'cleanup-stale') {
    const result = await dependencies.cleanupStaleDelegateServerProcesses({
      apply: Boolean(params.flags['yes']),
      repoRoot
    });
    if (format === 'json') {
      dependencies.log(JSON.stringify(result, null, 2));
      return;
    }
    for (const line of dependencies.formatDelegateServerCleanupSummary(result)) {
      dependencies.log(line);
    }
    return;
  }

  const apply = Boolean(params.flags['yes']);
  if (format === 'json' && apply) {
    throw new Error('delegation setup does not support --format json with --yes.');
  }

  const result = await dependencies.runDelegationSetup({ apply, repoRoot });

  if (format === 'json') {
    dependencies.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const line of dependencies.formatDelegationSetupSummary(result)) {
    dependencies.log(line);
  }
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
