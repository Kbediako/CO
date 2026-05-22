/* eslint-disable patterns/prefer-logger-over-console */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { findPackageRoot } from './utils/packageInfo.js';

export interface RunReviewCliLaunchShellParams {
  rawArgs: string[];
}

interface ExternalReviewRunner {
  command: string;
  args: string[];
}

interface ReviewCliLaunchShellDependencies {
  runningFromSourceRuntime: () => boolean;
  getPackageRoot: () => string;
  fileExists: (path: string) => boolean;
  resolveModule: (specifier: string, fromPath: string) => string | null;
  execPath: string;
  getCwd: () => string;
  getEnv: () => NodeJS.ProcessEnv;
  runPassthroughCommand: (
    command: string,
    args: string[],
    options?: { env?: NodeJS.ProcessEnv; cwd?: string }
  ) => Promise<number>;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: ReviewCliLaunchShellDependencies = {
  runningFromSourceRuntime: () => fileURLToPath(import.meta.url).endsWith('.ts'),
  getPackageRoot: () => findPackageRoot(import.meta.url),
  fileExists: existsSync,
  resolveModule: (specifier: string, fromPath: string) => {
    try {
      return createRequire(fromPath).resolve(specifier);
    } catch {
      return null;
    }
  },
  execPath: process.execPath,
  getCwd: () => process.cwd(),
  getEnv: () => process.env,
  runPassthroughCommand,
  setExitCode: (code: number) => {
    process.exitCode = code;
  }
};

export async function runReviewCliLaunchShell(
  params: RunReviewCliLaunchShellParams,
  overrides: Partial<ReviewCliLaunchShellDependencies> = {}
): Promise<number> {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const runner = resolveReviewRunner(dependencies);
  const exitCode = await dependencies.runPassthroughCommand(runner.command, [...runner.args, ...params.rawArgs], {
    cwd: dependencies.getCwd(),
    env: dependencies.getEnv()
  });
  if (exitCode !== 0) {
    dependencies.setExitCode(exitCode);
  }
  return exitCode;
}

function resolveReviewRunner(dependencies: ReviewCliLaunchShellDependencies): ExternalReviewRunner {
  const packageRoot = dependencies.getPackageRoot();
  const sourceRunner = join(packageRoot, 'scripts', 'run-review.ts');
  const distRunner = join(packageRoot, 'dist', 'scripts', 'run-review.js');
  const sourceRunnerExists = dependencies.fileExists(sourceRunner);
  const distRunnerExists = dependencies.fileExists(distRunner);

  if (dependencies.runningFromSourceRuntime() && sourceRunnerExists) {
    return {
      command: dependencies.execPath,
      args: ['--loader', 'ts-node/esm', sourceRunner]
    };
  }

  if (sourceRunnerExists) {
    if (dependencies.resolveModule('ts-node/esm', join(packageRoot, 'package.json')) !== null) {
      return {
        command: dependencies.execPath,
        args: ['--loader', 'ts-node/esm', sourceRunner]
      };
    }
    throw new Error(
      'Unable to launch source review runner because ts-node/esm is unavailable; refusing to run dist/scripts/run-review.js while scripts/run-review.ts is present because generated runtime freshness is unproven.'
    );
  }

  if (distRunnerExists) {
    return {
      command: dependencies.execPath,
      args: [distRunner]
    };
  }

  throw new Error(
    'Unable to locate review runner. Expected dist/scripts/run-review.js (npm) or scripts/run-review.ts (source checkout).'
  );
}

async function runPassthroughCommand(
  command: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; cwd?: string } = {}
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      cwd: options.cwd ?? process.cwd(),
      stdio: 'inherit'
    });
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('close', (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(typeof code === 'number' ? code : 1);
    });
  });
}
