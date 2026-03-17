/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { splitDelegationConfigOverrides } from './config/delegationConfig.js';
import { startDelegationServer } from './delegationServer.js';

type ArgMap = Record<string, string | boolean>;
type DelegationMode = 'full' | 'question_only' | 'status_only';

export interface RunDelegationServerCliShellParams {
  positionals: string[];
  flags: ArgMap;
  printHelp: () => void;
}

interface DelegationServerCliShellDependencies {
  startDelegationServer: typeof startDelegationServer;
  getCwd: () => string;
  getEnvMode: () => string | undefined;
  warn: (line: string) => void;
}

const DEFAULT_DEPENDENCIES: DelegationServerCliShellDependencies = {
  startDelegationServer,
  getCwd: () => process.cwd(),
  getEnvMode: () => process.env.CODEX_DELEGATE_MODE,
  warn: (line: string) => console.warn(line)
};

export async function runDelegationServerCliShell(
  params: RunDelegationServerCliShellParams,
  overrides: Partial<DelegationServerCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };

  if (isHelpRequest(params.positionals, params.flags)) {
    params.printHelp();
    return;
  }

  const repoRoot = readStringFlag(params.flags, 'repo') ?? dependencies.getCwd();
  const modeFlag = readStringFlag(params.flags, 'mode');
  const overrideFlag = readStringFlag(params.flags, 'config') ?? readStringFlag(params.flags, 'config-override');
  const envMode = dependencies.getEnvMode()?.trim();
  const resolvedMode = modeFlag ?? envMode;
  let mode: DelegationMode | undefined;

  if (resolvedMode) {
    if (isDelegationMode(resolvedMode)) {
      mode = resolvedMode;
    } else {
      dependencies.warn(`Invalid delegate mode "${resolvedMode}". Falling back to config default.`);
    }
  }

  const configOverrides = overrideFlag
    ? splitDelegationConfigOverrides(overrideFlag).map((value) => ({
        source: 'cli' as const,
        value
      }))
    : [];

  await dependencies.startDelegationServer({ repoRoot, mode, configOverrides });
}

function isHelpRequest(positionals: string[], flags: ArgMap): boolean {
  if (flags['help'] !== undefined) {
    return true;
  }
  const first = positionals[0];
  return first === 'help' || first === '--help' || first === '-h';
}

function readStringFlag(flags: ArgMap, key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

function isDelegationMode(value: string): value is DelegationMode {
  return value === 'full' || value === 'question_only' || value === 'status_only';
}
