import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { promisify } from 'node:util';

import { isoTimestamp } from '../utils/time.js';
import type {
  RlmAgentResult,
  RlmLoopOptions,
  RlmLoopResult,
  RlmState,
  RlmValidatorResult
} from './types.js';

const execFileAsync = promisify(execFile);
const MAX_DIFF_CHARS = 2000;
const MAX_VALIDATOR_OUTPUT_CHARS = 4000;

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}...`;
}

function extractSummary(output: string): string | null {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? '';
    if (line.toLowerCase().startsWith('summary:')) {
      return line.slice('summary:'.length).trim() || null;
    }
  }
  return null;
}

function summarizeValidatorOutput(result: RlmValidatorResult): string | null {
  const combined = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  if (!combined) {
    return null;
  }
  return truncate(combined, MAX_VALIDATOR_OUTPUT_CHARS);
}

async function collectGitSummary(repoRoot: string): Promise<string> {
  try {
    const [statusResult, diffResult] = await Promise.all([
      execFileAsync('git', ['status', '--short'], { cwd: repoRoot }),
      execFileAsync('git', ['diff', '--stat'], { cwd: repoRoot })
    ]);

    const statusText = statusResult.stdout.trim() || 'clean';
    const diffText = diffResult.stdout.trim() || 'no diff';
    return [
      'status:',
      truncate(statusText, MAX_DIFF_CHARS),
      'diff:',
      truncate(diffText, MAX_DIFF_CHARS)
    ].join('\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `git summary unavailable: ${message}`;
  }
}

async function writeStateFile(path: string, state: RlmState): Promise<void> {
  await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
}

async function writeValidatorLog(
  path: string,
  command: string,
  result: RlmValidatorResult
): Promise<void> {
  const lines: string[] = [];
  lines.push(`[${isoTimestamp()}] $ ${command}`);
  if (result.spawnError) {
    lines.push('[validator] spawn error');
  }
  if (result.stdout.trim()) {
    lines.push(result.stdout.trimEnd());
  }
  if (result.stderr.trim()) {
    lines.push(result.stderr.trimEnd());
  }
  lines.push(`[exit] ${result.exitCode}`);
  await writeFile(path, `${lines.join('\n')}\n`, 'utf8');
}

export async function runRlmLoop(options: RlmLoopOptions): Promise<RlmLoopResult> {
  const now = options.now ?? isoTimestamp;
  const log = options.logger ?? (() => undefined);

  const state: RlmState = {
    goal: options.goal,
    validator: options.validatorCommand ?? 'none',
    roles: options.roles,
    maxIterations: options.maxIterations,
    maxMinutes: options.maxMinutes ?? null,
    iterations: []
  };

  const runDir = options.runDir;
  const statePath = join(runDir, 'state.json');
  await mkdir(runDir, { recursive: true });

  const collectSummary = options.collectDiffSummary ?? collectGitSummary;

  const maxIterations = options.maxIterations;
  const maxMinutes = options.maxMinutes ?? null;
  const startTime = Date.now();
  const deadline = maxMinutes && maxMinutes > 0 ? startTime + maxMinutes * 60 * 1000 : null;

  if (maxIterations === 0 && !options.validatorCommand && !deadline) {
    state.final = { status: 'invalid_config', exitCode: 5 };
    await writeStateFile(statePath, state);
    return { state, exitCode: 5, error: 'validator none with unbounded budget' };
  }

  const timeExceeded = (): boolean => deadline !== null && Date.now() >= deadline;

  let lastValidatorOutput: string | null = null;

  const finalize = async (status: RlmState['final']): Promise<RlmLoopResult> => {
    state.final = status ?? { status: 'error', exitCode: 10 };
    await writeStateFile(statePath, state);
    return { state, exitCode: state.final.exitCode };
  };

  try {
    for (let iteration = 1; maxIterations === 0 || iteration <= maxIterations; iteration += 1) {
      if (timeExceeded()) {
        if (options.validatorCommand) {
          return await finalize({ status: 'max_minutes', exitCode: 3 });
        }
        return await finalize({ status: 'budget_complete', exitCode: 0 });
      }

      const iterationStartedAt = now();
      const preDiffSummary = await collectSummary(options.repoRoot);

      const agentResult: RlmAgentResult = await options.runAgent({
        goal: options.goal,
        iteration,
        maxIterations,
        roles: options.roles,
        subagentsEnabled: options.subagentsEnabled,
        validatorCommand: options.validatorCommand,
        lastValidatorOutput,
        diffSummary: preDiffSummary,
        repoRoot: options.repoRoot
      });

      const postDiffSummary = await collectSummary(options.repoRoot);
      const summary = agentResult.summary ?? extractSummary(agentResult.output) ?? null;

      let validatorExitCode: number | null = null;
      let validatorLogPath: string | null = null;
      let validatorResult: RlmValidatorResult | null = null;

      if (options.validatorCommand) {
        if (!options.runValidator) {
          throw new Error('Validator runner missing');
        }
        const validatorLogFile = join(runDir, `validator-${iteration}.log`);
        validatorResult = await options.runValidator(options.validatorCommand);
        await writeValidatorLog(validatorLogFile, options.validatorCommand, validatorResult);
        validatorLogPath = relative(options.repoRoot, validatorLogFile);
        validatorExitCode = validatorResult.exitCode;
        lastValidatorOutput = summarizeValidatorOutput(validatorResult);
      }

      state.iterations.push({
        n: iteration,
        startedAt: iterationStartedAt,
        summary,
        validatorExitCode,
        validatorLogPath,
        diffSummary: postDiffSummary
      });
      await writeStateFile(statePath, state);

      if (validatorResult?.spawnError) {
        return await finalize({ status: 'error', exitCode: 4 });
      }

      if (validatorExitCode === 0) {
        return await finalize({ status: 'passed', exitCode: 0 });
      }

      if (maxIterations > 0 && iteration >= maxIterations) {
        if (options.validatorCommand) {
          return await finalize({ status: 'max_iterations', exitCode: 3 });
        }
        return await finalize({ status: 'budget_complete', exitCode: 0 });
      }

      if (timeExceeded()) {
        if (options.validatorCommand) {
          return await finalize({ status: 'max_minutes', exitCode: 3 });
        }
        return await finalize({ status: 'budget_complete', exitCode: 0 });
      }

      log(`RLM iteration ${iteration} complete; continuing.`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finalize({ status: 'error', exitCode: 10 });
    return { state, exitCode: 10, error: message };
  }

  return await finalize({ status: 'error', exitCode: 10 });
}
