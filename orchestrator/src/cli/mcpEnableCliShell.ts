/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { formatMcpEnableSummary, runMcpEnable } from './mcpEnable.js';

type OutputFormat = 'json' | 'text';

export interface RunMcpEnableCliShellParams {
  rawArgs: string[];
}

interface McpEnableCliShellDependencies {
  runMcpEnable: typeof runMcpEnable;
  formatMcpEnableSummary: typeof formatMcpEnableSummary;
  log: (line: string) => void;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: McpEnableCliShellDependencies = {
  runMcpEnable,
  formatMcpEnableSummary,
  log: (line: string) => console.log(line),
  setExitCode: (code: number) => {
    process.exitCode = code;
  }
};

export async function runMcpEnableCliShell(
  params: RunMcpEnableCliShellParams,
  overrides: Partial<McpEnableCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const allowedEnableFlags = new Set(['yes', 'format', 'servers']);
  let yesFlag: string | boolean | undefined;
  let formatFlag: string | boolean | undefined;
  let serversFlag: string | boolean | undefined;
  const unexpectedPositionals: string[] = [];

  for (let index = 0; index < params.rawArgs.length; index += 1) {
    const token = params.rawArgs[index];
    if (!token) {
      continue;
    }
    if (token === '--') {
      unexpectedPositionals.push(...params.rawArgs.slice(index + 1));
      break;
    }
    if (!token.startsWith('--')) {
      unexpectedPositionals.push(token);
      continue;
    }
    const [key, inlineValue] = token.slice(2).split('=', 2);
    if (!allowedEnableFlags.has(key)) {
      throw new Error(`Unknown mcp enable flag: --${key}`);
    }
    let resolvedValue: string | boolean = true;
    if (inlineValue !== undefined) {
      resolvedValue = inlineValue;
    } else {
      const nextToken = params.rawArgs[index + 1];
      if (nextToken && !nextToken.startsWith('--')) {
        resolvedValue = nextToken;
        index += 1;
      }
    }
    if (key === 'yes') {
      if (yesFlag !== undefined) {
        throw new Error('--yes specified multiple times.');
      }
      yesFlag = resolvedValue;
      continue;
    }
    if (key === 'format') {
      if (formatFlag !== undefined) {
        throw new Error('--format specified multiple times.');
      }
      formatFlag = resolvedValue;
      continue;
    }
    if (serversFlag !== undefined) {
      throw new Error('--servers specified multiple times.');
    }
    serversFlag = resolvedValue;
  }

  if (unexpectedPositionals.length > 0) {
    throw new Error(`mcp enable does not accept positional arguments: ${unexpectedPositionals.join(' ')}`);
  }

  const apply = coerceApplyFlag(yesFlag);
  const format = resolveOutputFormat(formatFlag);
  const serverNames = resolveServerNames(serversFlag);
  const result = await dependencies.runMcpEnable({ apply, serverNames });
  const hasApplyFailures =
    apply && result.actions.some((action) => action.status !== 'enabled' && action.status !== 'already_enabled');

  if (format === 'json') {
    dependencies.log(JSON.stringify(result, null, 2));
  } else {
    for (const line of dependencies.formatMcpEnableSummary(result)) {
      dependencies.log(line);
    }
  }

  if (hasApplyFailures) {
    dependencies.setExitCode(1);
  }
}

function coerceApplyFlag(yesFlag: string | boolean | undefined): boolean {
  if (yesFlag === true) {
    return true;
  }
  if (typeof yesFlag !== 'string') {
    return false;
  }
  const normalizedYes = yesFlag.trim().toLowerCase();
  if (normalizedYes === 'true' || normalizedYes === '1' || normalizedYes === 'yes' || normalizedYes === 'on') {
    return true;
  }
  if (normalizedYes === 'false' || normalizedYes === '0' || normalizedYes === 'no' || normalizedYes === 'off') {
    return false;
  }
  throw new Error('--yes expects true/false when provided as --yes=<value>.');
}

function resolveOutputFormat(formatFlag: string | boolean | undefined): OutputFormat {
  if (formatFlag === undefined) {
    return 'text';
  }
  if (formatFlag === true) {
    throw new Error('--format requires a value of "text" or "json".');
  }
  if (formatFlag === 'json') {
    return 'json';
  }
  if (formatFlag === 'text') {
    return 'text';
  }
  throw new Error('--format must be "text" or "json".');
}

function resolveServerNames(serversFlag: string | boolean | undefined): string[] | undefined {
  if (serversFlag === undefined) {
    return undefined;
  }
  if (typeof serversFlag !== 'string') {
    throw new Error('--servers must include a comma-separated list of MCP server names.');
  }
  const serverNames = serversFlag
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (serverNames.length === 0) {
    throw new Error('--servers must include a comma-separated list of MCP server names.');
  }
  return serverNames;
}
