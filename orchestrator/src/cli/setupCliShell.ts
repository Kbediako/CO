/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { runSetupBootstrapShell } from './setupBootstrapShell.js';

type OutputFormat = 'json' | 'text';
type ArgMap = Record<string, string | boolean>;

const SETUP_CLI_HELP = `Usage: codex-orchestrator setup [--yes] [--refresh-skills] [--format json]

One-shot bootstrap for downstream users. Installs bundled skills and configures
delegation + DevTools MCP wiring.

Options:
  --yes                 Apply setup (otherwise plan only).
  --refresh-skills      Overwrite bundled skills in $CODEX_HOME/skills during setup.
  --repo <path>         Repo root for delegation wiring (default cwd).
  --format json         Emit machine-readable output (dry-run only).
`;

export interface RunSetupCliShellParams {
  flags: ArgMap;
}

interface SetupCliShellDependencies {
  runSetupBootstrapShell: typeof runSetupBootstrapShell;
  getCwd: () => string;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: SetupCliShellDependencies = {
  runSetupBootstrapShell,
  getCwd: () => process.cwd(),
  log: (line: string) => console.log(line)
};

export async function runSetupCliShell(
  params: RunSetupCliShellParams,
  overrides: Partial<SetupCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const format = resolveOutputFormat(params.flags);
  const apply = Boolean(params.flags['yes']);
  const refreshSkills = Boolean(params.flags['refresh-skills']);
  if (format === 'json' && apply) {
    throw new Error('setup does not support --format json with --yes.');
  }

  const repoFlag = readStringFlag(params.flags, 'repo');
  const repoRoot = repoFlag ?? dependencies.getCwd();
  await dependencies.runSetupBootstrapShell({
    format,
    apply,
    refreshSkills,
    repoRoot,
    repoFlag: repoFlag ?? undefined
  });
}

export function printSetupCliHelp(log: (line: string) => void = DEFAULT_DEPENDENCIES.log): void {
  log(SETUP_CLI_HELP);
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
