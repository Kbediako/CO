/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { formatCodexCliSetupSummary, runCodexCliSetup } from './codexCliSetup.js';
import { formatInitSummary, initCodexTemplates } from './init.js';

type ArgMap = Record<string, string | boolean>;

export interface RunInitCliShellParams {
  positionals: string[];
  flags: ArgMap;
}

interface InitCliShellDependencies {
  initCodexTemplates: typeof initCodexTemplates;
  formatInitSummary: typeof formatInitSummary;
  runCodexCliSetup: typeof runCodexCliSetup;
  formatCodexCliSetupSummary: typeof formatCodexCliSetupSummary;
  getCwd: () => string;
  log: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: InitCliShellDependencies = {
  initCodexTemplates,
  formatInitSummary,
  runCodexCliSetup,
  formatCodexCliSetupSummary,
  getCwd: () => process.cwd(),
  log: (line: string) => console.log(line)
};

export async function runInitCliShell(
  params: RunInitCliShellParams,
  overrides: Partial<InitCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const template = params.positionals[0];

  if (!template) {
    throw new Error('init requires a template name (e.g. init codex).');
  }
  if (template !== 'codex') {
    throw new Error(`Unknown init template: ${template}`);
  }

  const cwd = readStringFlag(params.flags, 'cwd') ?? dependencies.getCwd();
  const force = Boolean(params.flags['force']);
  const result = await dependencies.initCodexTemplates({ template, cwd, force });
  for (const line of dependencies.formatInitSummary(result, cwd)) {
    dependencies.log(line);
  }

  if (params.flags['codex-cli'] !== true) {
    return;
  }

  const setupResult = await dependencies.runCodexCliSetup({
    apply: Boolean(params.flags['yes']),
    force: Boolean(params.flags['codex-force']),
    source: readStringFlag(params.flags, 'codex-source'),
    ref: readStringFlag(params.flags, 'codex-ref'),
    downloadUrl: readStringFlag(params.flags, 'codex-download-url'),
    downloadSha256: readStringFlag(params.flags, 'codex-download-sha256')
  });
  for (const line of dependencies.formatCodexCliSetupSummary(setupResult)) {
    dependencies.log(line);
  }
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
