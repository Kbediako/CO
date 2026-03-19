/* eslint-disable patterns/prefer-logger-over-console */

import process from 'node:process';

import { resolveEnvironmentPaths } from '../../../scripts/lib/run-manifests.js';
import { executeExecCommand, type ExecOutputMode } from './exec/command.js';
import { normalizeEnvironmentPaths, sanitizeTaskId, type EnvironmentPaths } from './run/environment.js';

type OutputStream = NodeJS.WritableStream & { isTTY?: boolean };

export interface RunExecCliShellParams {
  commandTokens: string[];
  notifyTargets: string[];
  otelEndpoint: string | null;
  requestedMode: ExecOutputMode | null;
  jsonPretty: boolean;
  cwd?: string;
  taskId?: string;
}

interface ExecCliShellDependencies {
  resolveEnvironmentPaths: () => EnvironmentPaths;
  normalizeEnvironmentPaths: (paths: EnvironmentPaths) => EnvironmentPaths;
  sanitizeTaskId: (taskId: string) => string;
  executeExecCommand: typeof executeExecCommand;
  stdout: OutputStream;
  stderr: OutputStream;
  maybeEmitAdoptionHint: (taskFilter: string | null | undefined) => Promise<void>;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: ExecCliShellDependencies = {
  resolveEnvironmentPaths,
  normalizeEnvironmentPaths,
  sanitizeTaskId,
  executeExecCommand,
  stdout: process.stdout,
  stderr: process.stderr,
  maybeEmitAdoptionHint: async () => undefined,
  setExitCode: (code: number) => {
    process.exitCode = code;
  }
};

export async function runExecCliShell(
  params: RunExecCliShellParams,
  overrides: Partial<ExecCliShellDependencies> = {}
): Promise<void> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  if (params.commandTokens.length === 0) {
    throw new Error('exec requires a command to run.');
  }

  const isInteractive = dependencies.stdout.isTTY === true && dependencies.stderr.isTTY === true;
  const outputMode: ExecOutputMode = params.requestedMode ?? (isInteractive ? 'interactive' : 'jsonl');

  const env = dependencies.normalizeEnvironmentPaths(dependencies.resolveEnvironmentPaths());
  if (params.taskId) {
    env.taskId = dependencies.sanitizeTaskId(params.taskId);
  }

  const result = await dependencies.executeExecCommand(
    {
      env,
      stdout: dependencies.stdout,
      stderr: dependencies.stderr
    },
    {
      command: params.commandTokens[0]!,
      args: params.commandTokens.slice(1),
      cwd: params.cwd,
      outputMode,
      notifyTargets: params.notifyTargets,
      otelEndpoint: params.otelEndpoint,
      jsonPretty: params.jsonPretty
    }
  );

  if (result.exitCode !== null) {
    dependencies.setExitCode(result.exitCode);
  } else if (result.status !== 'succeeded') {
    dependencies.setExitCode(1);
  }

  if (outputMode === 'interactive') {
    await dependencies.maybeEmitAdoptionHint(env.taskId);
  }
}
