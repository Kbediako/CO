/* eslint-disable patterns/prefer-logger-over-console */

import { formatCodexCliSetupSummary, runCodexCliSetup } from './codexCliSetup.js';
import { formatCodexDefaultsSetupSummary, runCodexDefaultsSetup } from './codexDefaultsSetup.js';

type OutputFormat = 'json' | 'text';
type ArgMap = Record<string, string | boolean>;

export interface RunCodexCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

interface CodexCliShellDependencies {
  runCodexCliSetup: typeof runCodexCliSetup;
  runCodexDefaultsSetup: typeof runCodexDefaultsSetup;
  formatCodexCliSetupSummary: typeof formatCodexCliSetupSummary;
  formatCodexDefaultsSetupSummary: typeof formatCodexDefaultsSetupSummary;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: CodexCliShellDependencies = {
  runCodexCliSetup,
  runCodexDefaultsSetup,
  formatCodexCliSetupSummary,
  formatCodexDefaultsSetupSummary,
  log: (line: string) => console.log(line)
};

export async function runCodexCliShell(
  params: RunCodexCliShellParams,
  overrides: Partial<CodexCliShellDependencies> = {}
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

  if (subcommand === 'setup') {
    const format = resolveOutputFormat(params.flags);
    const apply = Boolean(params.flags['yes']);
    const force = Boolean(params.flags['force']);
    const result = await dependencies.runCodexCliSetup({
      apply,
      force,
      source: readStringFlag(params.flags, 'source'),
      ref: readStringFlag(params.flags, 'ref'),
      downloadUrl: readStringFlag(params.flags, 'download-url'),
      downloadSha256: readStringFlag(params.flags, 'download-sha256')
    });
    if (format === 'json') {
      dependencies.log(JSON.stringify(result, null, 2));
      return;
    }
    for (const line of dependencies.formatCodexCliSetupSummary(result)) {
      dependencies.log(line);
    }
    return;
  }

  if (subcommand === 'defaults') {
    const format = resolveOutputFormat(params.flags);
    const apply = Boolean(params.flags['yes']);
    const force = Boolean(params.flags['force']);
    const result = await dependencies.runCodexDefaultsSetup({
      apply,
      force
    });
    if (format === 'json') {
      dependencies.log(JSON.stringify(result, null, 2));
      return;
    }
    for (const line of dependencies.formatCodexDefaultsSetupSummary(result)) {
      dependencies.log(line);
    }
    return;
  }

  throw new Error(`Unknown codex subcommand: ${subcommand}`);
}

function resolveOutputFormat(flags: ArgMap): OutputFormat {
  return (flags['format'] as string | undefined) === 'json' ? 'json' : 'text';
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}
