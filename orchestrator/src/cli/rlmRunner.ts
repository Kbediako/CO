import { exec } from 'node:child_process';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { logger } from '../logger.js';
import { resolveCodexCommand } from './utils/devtools.js';
import { detectValidator } from './rlm/validator.js';
import { buildRlmPrompt } from './rlm/prompt.js';
import { runRlmLoop } from './rlm/runner.js';
import type {
  RlmAgentInput,
  RlmAgentResult,
  RlmRoles,
  RlmState,
  RlmValidatorResult,
  ValidatorCandidate
} from './rlm/types.js';

const execAsync = promisify(exec);
const DEFAULT_MAX_ITERATIONS = 88;
const DEFAULT_MAX_MINUTES = 48 * 60;
const UNBOUNDED_ITERATION_ALIASES = new Set(['unbounded', 'unlimited', 'infinite', 'infinity']);

interface ParsedArgs {
  goal?: string;
  validator?: string;
  maxIterations?: string;
  maxMinutes?: string;
  roles?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    if (!token.startsWith('--')) {
      continue;
    }
    const [flag, inlineValue] = token.slice(2).split('=', 2);
    const nextValue = inlineValue ?? argv[i + 1];
    switch (flag) {
      case 'goal':
        if (!inlineValue && nextValue && !nextValue.startsWith('--')) {
          parsed.goal = nextValue;
          i += 1;
        } else if (inlineValue) {
          parsed.goal = inlineValue;
        }
        break;
      case 'validator':
        if (!inlineValue && nextValue && !nextValue.startsWith('--')) {
          parsed.validator = nextValue;
          i += 1;
        } else if (inlineValue) {
          parsed.validator = inlineValue;
        }
        break;
      case 'max-iterations':
        if (!inlineValue && nextValue && !nextValue.startsWith('--')) {
          parsed.maxIterations = nextValue;
          i += 1;
        } else if (inlineValue) {
          parsed.maxIterations = inlineValue;
        }
        break;
      case 'max-minutes':
        if (!inlineValue && nextValue && !nextValue.startsWith('--')) {
          parsed.maxMinutes = nextValue;
          i += 1;
        } else if (inlineValue) {
          parsed.maxMinutes = inlineValue;
        }
        break;
      case 'roles':
        if (!inlineValue && nextValue && !nextValue.startsWith('--')) {
          parsed.roles = nextValue;
          i += 1;
        } else if (inlineValue) {
          parsed.roles = inlineValue;
        }
        break;
      default:
        break;
    }
  }
  return parsed;
}

function envFlagEnabled(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function shouldForceNonInteractive(env: NodeJS.ProcessEnv): boolean {
  const stdinIsTTY = process.stdin?.isTTY === true;
  return (
    !stdinIsTTY ||
    envFlagEnabled(env.CI) ||
    envFlagEnabled(env.CODEX_REVIEW_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NON_INTERACTIVE) ||
    envFlagEnabled(env.CODEX_NONINTERACTIVE) ||
    envFlagEnabled(env.CODEX_NO_INTERACTIVE)
  );
}

function resolveRepoRoot(env: NodeJS.ProcessEnv): string {
  return env.CODEX_ORCHESTRATOR_ROOT?.trim() || process.cwd();
}

function resolveRunIds(env: NodeJS.ProcessEnv): { taskId: string; runId: string } {
  const taskId = env.CODEX_ORCHESTRATOR_TASK_ID || env.MCP_RUNNER_TASK_ID || 'rlm-adhoc';
  const runId = env.CODEX_ORCHESTRATOR_RUN_ID || 'rlm-adhoc';
  return { taskId, runId };
}

function resolveRunsRoot(env: NodeJS.ProcessEnv, repoRoot: string): string {
  return env.CODEX_ORCHESTRATOR_RUNS_DIR?.trim() || join(repoRoot, '.runs');
}

function resolveRunDir(env: NodeJS.ProcessEnv, repoRoot: string): string {
  const explicit = env.CODEX_ORCHESTRATOR_RUN_DIR?.trim();
  if (explicit) {
    return explicit;
  }
  const { taskId, runId } = resolveRunIds(env);
  const runsRoot = resolveRunsRoot(env, repoRoot);
  return join(runsRoot, taskId, 'cli', runId);
}

function parsePositiveInt(value: string | undefined, fallback: number): number | null {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseMaxIterations(value: string | undefined, fallback: number): number | null {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (UNBOUNDED_ITERATION_ALIASES.has(normalized)) {
    return 0;
  }
  return parsePositiveInt(value, fallback);
}

function parseRoles(value: string | undefined, fallback: RlmRoles): RlmRoles | null {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'single' || normalized === 'triad') {
    return normalized;
  }
  return null;
}

function normalizeValidator(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

async function promptForValidator(candidates: ValidatorCandidate[]): Promise<string | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('Validator auto-detect found multiple candidates:');
    candidates.forEach((candidate, index) => {
      console.log(`  ${index + 1}) ${candidate.command} (${candidate.reason})`);
    });
    console.log('  n) none');
    const answer = (await rl.question('Select validator [1-n or n for none]: ')).trim().toLowerCase();
    if (!answer || answer === 'n' || answer === 'none') {
      return null;
    }
    const selectedIndex = Number.parseInt(answer, 10);
    if (!Number.isFinite(selectedIndex) || selectedIndex < 1 || selectedIndex > candidates.length) {
      throw new Error('Invalid selection');
    }
    return candidates[selectedIndex - 1]?.command ?? null;
  } finally {
    rl.close();
  }
}

async function promptForValidatorCommand(): Promise<string | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question('Enter validator command (or "none"): ')).trim();
    if (!answer || answer.toLowerCase() === 'none') {
      return null;
    }
    return answer;
  } finally {
    rl.close();
  }
}

async function writeTerminalState(runDir: string, state: RlmState): Promise<void> {
  const rlmDir = join(runDir, 'rlm');
  await mkdir(rlmDir, { recursive: true });
  await writeFile(join(rlmDir, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
}

async function runCodexAgent(
  input: RlmAgentInput,
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  nonInteractive: boolean,
  subagentsEnabled: boolean
): Promise<RlmAgentResult> {
  const prompt = buildRlmPrompt(input);
  const { command, args } = resolveCodexCommand(['exec', prompt], env);
  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env };

  if (nonInteractive) {
    childEnv.CODEX_NON_INTERACTIVE = childEnv.CODEX_NON_INTERACTIVE ?? '1';
    childEnv.CODEX_NO_INTERACTIVE = childEnv.CODEX_NO_INTERACTIVE ?? '1';
    childEnv.CODEX_INTERACTIVE = childEnv.CODEX_INTERACTIVE ?? '0';
  }
  if (subagentsEnabled) {
    childEnv.CODEX_SUBAGENTS = childEnv.CODEX_SUBAGENTS ?? '1';
  }

  const child = spawn(command, args, { cwd: repoRoot, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
    process.stdout.write(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
    process.stderr.write(chunk);
  });

  await new Promise<void>((resolvePromise, reject) => {
    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`codex exec exited with code ${code ?? 'unknown'}`));
      }
    });
  });

  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
  return { output };
}

function normalizeExitCode(code: number | string | undefined): number {
  if (typeof code === 'number' && Number.isInteger(code)) {
    return code;
  }
  if (typeof code === 'string') {
    const parsed = Number.parseInt(code, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return 1;
}

async function runValidatorCommand(command: string, repoRoot: string): Promise<RlmValidatorResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: repoRoot,
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024
    });
    return { exitCode: 0, stdout: stdout ?? '', stderr: stderr ?? '' };
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number | string };
    const exitCode = normalizeExitCode(execError.code);
    const spawnError = execError.code === 'ENOENT' || exitCode === 127;
    return {
      exitCode,
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? execError.message ?? '',
      spawnError
    };
  }
}

async function main(): Promise<void> {
  const env = process.env;
  const repoRoot = resolveRepoRoot(env);
  const runDir = resolveRunDir(env, repoRoot);

  const parsedArgs = parseArgs(process.argv.slice(2));
  const goal = (parsedArgs.goal ?? env.RLM_GOAL)?.trim();

  const roles = parseRoles(parsedArgs.roles ?? env.RLM_ROLES, 'single');
  const maxIterations = parseMaxIterations(
    parsedArgs.maxIterations ?? env.RLM_MAX_ITERATIONS,
    DEFAULT_MAX_ITERATIONS
  );
  const maxMinutes = parsePositiveInt(parsedArgs.maxMinutes ?? env.RLM_MAX_MINUTES, DEFAULT_MAX_MINUTES);

  if (!goal) {
    const state: RlmState = {
      goal: '',
      validator: null,
      roles: roles ?? 'single',
      maxIterations: maxIterations ?? DEFAULT_MAX_ITERATIONS,
      maxMinutes: maxMinutes && maxMinutes > 0 ? maxMinutes : null,
      iterations: [],
      final: { status: 'invalid_config', exitCode: 5 }
    };
    await writeTerminalState(runDir, state);
    console.error('RLM goal is required. Set RLM_GOAL or pass --goal.');
    process.exitCode = 5;
    return;
  }

  if (!roles) {
    const state: RlmState = {
      goal,
      validator: null,
      roles: 'single',
      maxIterations: maxIterations ?? DEFAULT_MAX_ITERATIONS,
      maxMinutes: maxMinutes && maxMinutes > 0 ? maxMinutes : null,
      iterations: [],
      final: { status: 'invalid_config', exitCode: 5 }
    };
    await writeTerminalState(runDir, state);
    console.error('Invalid RLM roles value. Use "single" or "triad".');
    process.exitCode = 5;
    return;
  }

  if (maxIterations === null) {
    const state: RlmState = {
      goal,
      validator: null,
      roles,
      maxIterations: DEFAULT_MAX_ITERATIONS,
      maxMinutes: maxMinutes && maxMinutes > 0 ? maxMinutes : null,
      iterations: [],
      final: { status: 'invalid_config', exitCode: 5 }
    };
    await writeTerminalState(runDir, state);
    console.error('Invalid max iterations value. Use a non-negative integer or "unlimited".');
    process.exitCode = 5;
    return;
  }

  if (maxMinutes === null) {
    const state: RlmState = {
      goal,
      validator: null,
      roles,
      maxIterations,
      maxMinutes: null,
      iterations: [],
      final: { status: 'invalid_config', exitCode: 5 }
    };
    await writeTerminalState(runDir, state);
    console.error('Invalid max minutes value.');
    process.exitCode = 5;
    return;
  }

  const validatorOverride = normalizeValidator(parsedArgs.validator ?? env.RLM_VALIDATOR);
  const isInteractive = !shouldForceNonInteractive(env);

  let validatorCommand: string | null = null;
  if (validatorOverride && validatorOverride.toLowerCase() !== 'auto') {
    if (validatorOverride.toLowerCase() === 'none') {
      validatorCommand = null;
    } else {
      validatorCommand = validatorOverride;
    }
  } else {
    const detection = await detectValidator(repoRoot);
    if (detection.status === 'selected' && detection.command) {
      validatorCommand = detection.command;
      console.log(`Validator: ${detection.command} (${detection.reason ?? 'auto-detect'})`);
    } else if (detection.status === 'ambiguous') {
      if (isInteractive) {
        validatorCommand = await promptForValidator(detection.candidates);
      } else {
        const candidates = detection.candidates
          .map((candidate) => `- ${candidate.command} (${candidate.reason})`)
          .join('\n');
        const state: RlmState = {
          goal,
          validator: null,
          roles,
          maxIterations,
          maxMinutes: maxMinutes && maxMinutes > 0 ? maxMinutes : null,
          iterations: [],
          final: { status: 'no_validator', exitCode: 2 }
        };
        await writeTerminalState(runDir, state);
        console.error('Validator auto-detect ambiguous. Provide --validator or --validator none.');
        console.error(candidates);
        process.exitCode = 2;
        return;
      }
    } else {
      if (isInteractive) {
        validatorCommand = await promptForValidatorCommand();
      } else {
        const state: RlmState = {
          goal,
          validator: null,
          roles,
          maxIterations,
          maxMinutes: maxMinutes && maxMinutes > 0 ? maxMinutes : null,
          iterations: [],
          final: { status: 'no_validator', exitCode: 2 }
        };
        await writeTerminalState(runDir, state);
        console.error('Validator auto-detect failed. Provide --validator or --validator none.');
        process.exitCode = 2;
        return;
      }
    }
  }

  if (validatorCommand === null) {
    console.log('Validator: none');
  } else {
    console.log(`Validator: ${validatorCommand}`);
  }

  const subagentsEnabled = envFlagEnabled(env.CODEX_SUBAGENTS) || envFlagEnabled(env.RLM_SUBAGENTS);
  const nonInteractive = shouldForceNonInteractive(env);

  const result = await runRlmLoop({
    goal,
    validatorCommand,
    maxIterations,
    maxMinutes: maxMinutes && maxMinutes > 0 ? maxMinutes : null,
    roles,
    subagentsEnabled,
    repoRoot,
    runDir: join(runDir, 'rlm'),
    runAgent: (input) => runCodexAgent(input, env, repoRoot, nonInteractive, subagentsEnabled),
    runValidator: (command) => runValidatorCommand(command, repoRoot),
    logger: (line) => logger.info(line)
  });

  const finalStatus = result.state.final?.status ?? 'unknown';
  const iterationCount = result.state.iterations.length;
  console.log(`RLM completed: status=${finalStatus} iterations=${iterationCount} exit=${result.exitCode}`);
  process.exitCode = result.exitCode;
}

const entry = process.argv[1] ? resolve(process.argv[1]) : null;
const self = resolve(fileURLToPath(import.meta.url));
if (entry && entry === self) {
  main().catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 10;
  });
}

export const __test__ = {
  parseMaxIterations,
  parsePositiveInt,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MAX_MINUTES
};
