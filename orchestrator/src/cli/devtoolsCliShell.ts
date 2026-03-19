/* eslint-disable patterns/prefer-logger-over-console */

import { formatDevtoolsSetupSummary, runDevtoolsSetup } from './devtoolsSetup.js';

type OutputFormat = 'json' | 'text';
type ArgMap = Record<string, string | boolean>;

export interface RunDevtoolsCliShellParams {
  positionals: string[];
  flags: ArgMap;
}

interface DevtoolsCliShellDependencies {
  runDevtoolsSetup: typeof runDevtoolsSetup;
  formatDevtoolsSetupSummary: typeof formatDevtoolsSetupSummary;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: DevtoolsCliShellDependencies = {
  runDevtoolsSetup,
  formatDevtoolsSetupSummary,
  log: (line: string) => console.log(line)
};

export async function runDevtoolsCliShell(
  params: RunDevtoolsCliShellParams,
  overrides: Partial<DevtoolsCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const positionals = [...params.positionals];
  const subcommand = positionals.shift();
  if (!subcommand) {
    throw new Error('devtools requires a subcommand (setup).');
  }
  if (subcommand !== 'setup') {
    throw new Error(`Unknown devtools subcommand: ${subcommand}`);
  }

  const format = resolveOutputFormat(params.flags);
  const apply = Boolean(params.flags['yes']);
  if (format === 'json' && apply) {
    throw new Error('devtools setup does not support --format json with --yes.');
  }

  const result = await dependencies.runDevtoolsSetup({ apply });
  if (format === 'json') {
    dependencies.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const line of dependencies.formatDevtoolsSetupSummary(result)) {
    dependencies.log(line);
  }
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
}
