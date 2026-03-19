/* eslint-disable patterns/prefer-logger-over-console */

import { formatSkillsInstallSummary, installSkills } from './skills.js';

type OutputFormat = 'json' | 'text';
type ArgMap = Record<string, string | boolean>;

export interface RunSkillsCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

interface SkillsCliShellDependencies {
  installSkills: typeof installSkills;
  formatSkillsInstallSummary: typeof formatSkillsInstallSummary;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: SkillsCliShellDependencies = {
  installSkills,
  formatSkillsInstallSummary,
  log: (line: string) => console.log(line)
};

export async function runSkillsCliShell(
  params: RunSkillsCliShellParams,
  overrides: Partial<SkillsCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const positionals = [...params.positionals];
  const subcommand = positionals.shift();
  const wantsHelp =
    params.flags['help'] === true
    || params.flags['--help'] === true
    || params.flags['h'] === true
    || !subcommand
    || subcommand === 'help'
    || subcommand === '--help'
    || subcommand === '-h';

  if (wantsHelp) {
    params.printHelp();
    return;
  }

  if (subcommand === 'install') {
    const format = resolveOutputFormat(params.flags);
    const result = await dependencies.installSkills({
      force: params.flags['force'] === true,
      codexHome: readStringFlag(params.flags, 'codex-home'),
      only: parseOnlyFlag(params.flags['only'])
    });
    if (format === 'json') {
      dependencies.log(JSON.stringify(result, null, 2));
      return;
    }
    for (const line of dependencies.formatSkillsInstallSummary(result)) {
      dependencies.log(line);
    }
    return;
  }

  throw new Error(`Unknown skills command: ${subcommand}`);
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function parseOnlyFlag(value: string | boolean | undefined): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error('--only requires a comma-separated list of skill names.');
  }
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}
