import { exec } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { logger } from '../logger.js';
import { detectValidator } from './rlm/validator.js';
import { buildRlmPrompt } from './rlm/prompt.js';
import { runRlmLoop } from './rlm/runner.js';
import { buildContextObject, ContextStore, type ContextSource } from './rlm/context.js';
import { runSymbolicLoop, type SymbolicBudgets } from './rlm/symbolic.js';
import {
  createRlmCodexRuntimeShell,
  resolveCollabAllowDefaultRoleConfig,
  resolveCollabRolePolicyConfig,
  type RlmCodexRuntimeShell
} from './rlm/rlmCodexRuntimeShell.js';
import type { AlignmentPolicy } from './rlm/alignment.js';
import type {
  RlmAgentInput,
  RlmAgentResult,
  RlmContextInfo,
  RlmFinalStatus,
  RlmMode,
  RlmRoles,
  RlmState,
  RlmValidatorResult,
  ValidatorCandidate
} from './rlm/types.js';

const execAsync = promisify(exec);
const DEFAULT_MAX_ITERATIONS = 88;
const DEFAULT_MAX_MINUTES = 48 * 60;
const DEFAULT_SYMBOLIC_MIN_BYTES = 1024 * 1024;
const DEFAULT_CHUNK_TARGET_BYTES = 65536;
const DEFAULT_CHUNK_OVERLAP_BYTES = 4096;
const DEFAULT_MAX_SUBCALLS_PER_ITERATION = 4;
const DEFAULT_MAX_SEARCHES_PER_ITERATION = 4;
const DEFAULT_MAX_CHUNK_READS_PER_ITERATION = 8;
const DEFAULT_MAX_BYTES_PER_CHUNK_READ = 8192;
const DEFAULT_MAX_SNIPPETS_PER_SUBCALL = 8;
const DEFAULT_MAX_BYTES_PER_SNIPPET = 8192;
const DEFAULT_MAX_SUBCALL_INPUT_BYTES = 120000;
const DEFAULT_MAX_PLANNER_PROMPT_BYTES = 32768;
const DEFAULT_SEARCH_TOP_K = 20;
const DEFAULT_MAX_PREVIEW_BYTES = 512;
const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_SYMBOLIC_DELIBERATION_INTERVAL = 2;
const DEFAULT_SYMBOLIC_DELIBERATION_MAX_RUNS = 12;
const DEFAULT_SYMBOLIC_DELIBERATION_MAX_SUMMARY_BYTES = 2048;
const DEFAULT_ALIGNMENT_CHECKER_ENABLED = true;
const DEFAULT_ALIGNMENT_CHECKER_ENFORCE = false;
const DEFAULT_ALIGNMENT_DEEP_AUDIT_MIN_CONTRADICTIONS = 2;
const DEFAULT_ALIGNMENT_DEEP_AUDIT_OVERRIDE_STREAK = 2;
const DEFAULT_ALIGNMENT_VERBOSITY_FREE_TOKENS = 420;
const DEFAULT_ALIGNMENT_MAX_PENALTY = 0.35;
const DEFAULT_ALIGNMENT_COOLDOWN_TURNS = 2;
const DEFAULT_ALIGNMENT_CONSENSUS_TOP_SCORE_MIN = 0.7;
const DEFAULT_ALIGNMENT_CONSENSUS_MARGIN_MIN = 0.15;
const DEFAULT_ALIGNMENT_CONSENSUS_REQUIRED_VOTES = 2;
const DEFAULT_ALIGNMENT_SENTINEL_MODEL = 'gpt-5.3-spark';
const DEFAULT_ALIGNMENT_HIGH_REASONING_MODEL = 'gpt-5.3-codex';
const DEFAULT_ALIGNMENT_ARBITRATION_MODEL = 'gpt-5.3-codex';
const DEFAULT_ALIGNMENT_HIGH_REASONING_AVAILABLE = true;
const UNBOUNDED_ITERATION_ALIASES = new Set(['unbounded', 'unlimited', 'infinite', 'infinity']);

type SymbolicMultiAgentSource = 'canonical' | 'legacy' | null;

interface SymbolicMultiAgentConfig {
  enabled: boolean;
  source: SymbolicMultiAgentSource;
}

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

function resolveSymbolicMultiAgentConfig(env: NodeJS.ProcessEnv): SymbolicMultiAgentConfig {
  if (env.RLM_SYMBOLIC_MULTI_AGENT !== undefined) {
    return { enabled: envFlagEnabled(env.RLM_SYMBOLIC_MULTI_AGENT), source: 'canonical' };
  }
  if (env.RLM_SYMBOLIC_COLLAB !== undefined) {
    return { enabled: envFlagEnabled(env.RLM_SYMBOLIC_COLLAB), source: 'legacy' };
  }
  return { enabled: false, source: null };
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

function parseProbability(value: string | undefined, fallback: number): number | null {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
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

function resolveAlignmentCheckerEnabled(env: NodeJS.ProcessEnv): boolean {
  if (env.RLM_ALIGNMENT_CHECKER === undefined) {
    return DEFAULT_ALIGNMENT_CHECKER_ENABLED;
  }
  return envFlagEnabled(env.RLM_ALIGNMENT_CHECKER);
}

function resolveAlignmentCheckerEnforce(env: NodeJS.ProcessEnv): boolean {
  if (env.RLM_ALIGNMENT_CHECKER_ENFORCE === undefined) {
    return DEFAULT_ALIGNMENT_CHECKER_ENFORCE;
  }
  return envFlagEnabled(env.RLM_ALIGNMENT_CHECKER_ENFORCE);
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

function buildBaseState(params: {
  goal: string;
  validator: string | null;
  roles: RlmRoles;
  maxIterations: number;
  maxMinutes: number | null;
  mode: RlmMode;
  context: RlmContextInfo;
}): RlmState {
  return {
    version: 1,
    mode: params.mode,
    context: params.context,
    symbolic_iterations: [],
    goal: params.goal,
    validator: params.validator,
    roles: params.roles,
    maxIterations: params.maxIterations,
    maxMinutes: params.maxMinutes ?? null,
    iterations: []
  };
}

function resolveRlmMode(
  rawMode: string | undefined,
  options: {
    delegated: boolean;
    contextBytes: number;
    hasContextPath: boolean;
    symbolicMinBytes: number;
  }
): RlmMode | null {
  const normalized = (rawMode ?? 'auto').trim().toLowerCase();
  if (normalized === 'iterative') {
    return 'iterative';
  }
  if (normalized === 'symbolic') {
    return 'symbolic';
  }
  if (normalized !== 'auto') {
    return null;
  }
  const largeContext = options.contextBytes >= options.symbolicMinBytes;
  const explicitContextSignal = options.hasContextPath || options.delegated;
  if (largeContext && explicitContextSignal) {
    return 'symbolic';
  }
  return 'iterative';
}

async function resolveContextSource(
  env: NodeJS.ProcessEnv,
  fallbackText: string
): Promise<{ source: ContextSource; bytes: number }> {
  const rawPath = env.RLM_CONTEXT_PATH?.trim();
  if (rawPath) {
    const resolvedPath = resolve(rawPath);
    const info = await stat(resolvedPath);
    if (info.isDirectory()) {
      const indexPath = join(resolvedPath, 'index.json');
      const sourcePath = join(resolvedPath, 'source.txt');
      const rawIndex = await readFile(indexPath, 'utf8');
      const parsed = JSON.parse(rawIndex) as { source?: { byte_length?: number } };
      const byteLength =
        typeof parsed?.source?.byte_length === 'number'
          ? parsed.source.byte_length
          : (await stat(sourcePath)).size;
      return {
        source: { type: 'dir', value: resolvedPath },
        bytes: byteLength
      };
    }
    if (info.isFile()) {
      return { source: { type: 'file', value: resolvedPath }, bytes: info.size };
    }
    throw new Error('context_source invalid');
  }

  const text = fallbackText ?? '';
  return {
    source: { type: 'text', value: text },
    bytes: Buffer.byteLength(text, 'utf8')
  };
}

async function promptForValidator(candidates: ValidatorCandidate[]): Promise<string | null> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    logger.info('Validator auto-detect found multiple candidates:');
    candidates.forEach((candidate, index) => {
      logger.info(`  ${index + 1}) ${candidate.command} (${candidate.reason})`);
    });
    logger.info('  n) none');
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
  codexRuntimeShell: RlmCodexRuntimeShell,
  nonInteractive: boolean,
  subagentsEnabled: boolean
): Promise<RlmAgentResult> {
  const prompt = buildRlmPrompt(input);
  const output = await codexRuntimeShell.runCompletion(prompt, {
    nonInteractive,
    subagentsEnabled,
    mirrorOutput: true
  });
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
  const runIds = resolveRunIds(env);
  const runDir = resolveRunDir(env, repoRoot);

  const parsedArgs = parseArgs(process.argv.slice(2));
  const goal = (parsedArgs.goal ?? env.RLM_GOAL)?.trim();

  const roles = parseRoles(parsedArgs.roles ?? env.RLM_ROLES, 'single');
  const maxIterations = parseMaxIterations(
    parsedArgs.maxIterations ?? env.RLM_MAX_ITERATIONS,
    DEFAULT_MAX_ITERATIONS
  );
  const maxMinutes = parsePositiveInt(parsedArgs.maxMinutes ?? env.RLM_MAX_MINUTES, DEFAULT_MAX_MINUTES);
  const resolvedMaxMinutes = maxMinutes && maxMinutes > 0 ? maxMinutes : null;
  const fallbackContext: RlmContextInfo = {
    object_id: 'unknown',
    index_path: '',
    chunk_count: 0
  };
  const fallbackMode: RlmMode = 'iterative';

  const writeStateAndExit = async (
    status: RlmFinalStatus,
    exitCode: number,
    message: string,
    overrides: Partial<{
      goal: string;
      validator: string | null;
      roles: RlmRoles;
      maxIterations: number;
      maxMinutes: number | null;
      mode: RlmMode;
      context: RlmContextInfo;
    }> = {}
  ): Promise<void> => {
    const state = buildBaseState({
      goal: overrides.goal ?? goal ?? '',
      validator: overrides.validator ?? null,
      roles: overrides.roles ?? roles ?? 'single',
      maxIterations: overrides.maxIterations ?? maxIterations ?? DEFAULT_MAX_ITERATIONS,
      maxMinutes: overrides.maxMinutes ?? resolvedMaxMinutes,
      mode: overrides.mode ?? fallbackMode,
      context: overrides.context ?? fallbackContext
    });
    state.final = { status, exitCode };
    await writeTerminalState(runDir, state);
    if (message) {
      logger.error(message);
    }
    process.exitCode = exitCode;
  };

  if (!goal) {
    await writeStateAndExit(
      'invalid_config',
      5,
      'RLM goal is required. Set RLM_GOAL or pass --goal.'
    );
    return;
  }

  if (!roles) {
    await writeStateAndExit('invalid_config', 5, 'Invalid RLM roles value. Use "single" or "triad".', {
      goal,
      roles: 'single'
    });
    return;
  }

  if (maxIterations === null) {
    await writeStateAndExit(
      'invalid_config',
      5,
      'Invalid max iterations value. Use a non-negative integer or one of "unlimited", "unbounded", "infinite", "infinity".',
      {
        goal,
        roles,
        maxIterations: DEFAULT_MAX_ITERATIONS
      }
    );
    return;
  }

  if (maxMinutes === null) {
    await writeStateAndExit('invalid_config', 5, 'Invalid max minutes value.', {
      goal,
      roles,
      maxIterations,
      maxMinutes: null
    });
    return;
  }

  const symbolicMinBytes = parsePositiveInt(env.RLM_SYMBOLIC_MIN_BYTES, DEFAULT_SYMBOLIC_MIN_BYTES);
  if (symbolicMinBytes === null) {
    await writeStateAndExit('invalid_config', 5, 'Invalid RLM_SYMBOLIC_MIN_BYTES value.', {
      goal,
      roles,
      maxIterations,
      maxMinutes: resolvedMaxMinutes
    });
    return;
  }

  let contextSource: ContextSource;
  let contextBytes: number;
  try {
    const resolved = await resolveContextSource(env, goal);
    contextSource = resolved.source;
    contextBytes = resolved.bytes;
  } catch (error) {
    await writeStateAndExit(
      'invalid_config',
      5,
      `Invalid RLM_CONTEXT_PATH (${error instanceof Error ? error.message : String(error)}).`,
      {
        goal,
        roles,
        maxIterations,
        maxMinutes: resolvedMaxMinutes
      }
    );
    return;
  }

  const delegated = Boolean(env.CODEX_DELEGATION_PARENT_MANIFEST_PATH?.trim());
  const hasContextPath = Boolean(env.RLM_CONTEXT_PATH?.trim());
  const mode = resolveRlmMode(env.RLM_MODE, {
    delegated,
    contextBytes,
    hasContextPath,
    symbolicMinBytes
  });
  if (!mode) {
    await writeStateAndExit('invalid_config', 5, 'Invalid RLM_MODE value. Use auto, iterative, or symbolic.', {
      goal,
      roles,
      maxIterations,
      maxMinutes: resolvedMaxMinutes
    });
    return;
  }

  const chunkTargetBytes = parsePositiveInt(env.RLM_CHUNK_TARGET_BYTES, DEFAULT_CHUNK_TARGET_BYTES);
  if (!chunkTargetBytes || chunkTargetBytes <= 0) {
    await writeStateAndExit('invalid_config', 5, 'Invalid RLM_CHUNK_TARGET_BYTES value.', {
      goal,
      roles,
      maxIterations,
      maxMinutes: resolvedMaxMinutes,
      mode
    });
    return;
  }

  const chunkOverlapBytes = parsePositiveInt(env.RLM_CHUNK_OVERLAP_BYTES, DEFAULT_CHUNK_OVERLAP_BYTES);
  if (chunkOverlapBytes === null || chunkOverlapBytes < 0) {
    await writeStateAndExit('invalid_config', 5, 'Invalid RLM_CHUNK_OVERLAP_BYTES value.', {
      goal,
      roles,
      maxIterations,
      maxMinutes: resolvedMaxMinutes,
      mode
    });
    return;
  }

  const rlmRoot = join(runDir, 'rlm');
  let contextObject: Awaited<ReturnType<typeof buildContextObject>>;
  try {
    contextObject = await buildContextObject({
      source: contextSource,
      targetDir: join(rlmRoot, 'context'),
      chunking: {
        targetBytes: chunkTargetBytes,
        overlapBytes: chunkOverlapBytes,
        strategy: 'byte'
      }
    });
  } catch (error) {
    await writeStateAndExit(
      'invalid_config',
      5,
      `Invalid context source (${error instanceof Error ? error.message : String(error)}).`,
      {
        goal,
        roles,
        maxIterations,
        maxMinutes: resolvedMaxMinutes,
        mode
      }
    );
    return;
  }

  const contextInfo: RlmContextInfo = {
    object_id: contextObject.index.object_id,
    index_path: relative(repoRoot, contextObject.indexPath),
    chunk_count: contextObject.index.chunks.length
  };

  const validatorOverride = normalizeValidator(parsedArgs.validator ?? env.RLM_VALIDATOR);
  const isInteractive = !shouldForceNonInteractive(env);

  let validatorCommand: string | null = null;
  if (mode === 'symbolic') {
    if (validatorOverride && validatorOverride.toLowerCase() !== 'auto') {
      validatorCommand = validatorOverride.toLowerCase() === 'none' ? null : validatorOverride;
    } else {
      validatorCommand = null;
    }
  } else {
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
        logger.info(`Validator: ${detection.command} (${detection.reason ?? 'auto-detect'})`);
      } else if (detection.status === 'ambiguous') {
        if (isInteractive) {
          validatorCommand = await promptForValidator(detection.candidates);
        } else {
          const candidates = detection.candidates
            .map((candidate) => `- ${candidate.command} (${candidate.reason})`)
            .join('\n');
          await writeStateAndExit('no_validator', 2, 'Validator auto-detect ambiguous. Provide --validator or --validator none.', {
            goal,
            roles,
            maxIterations,
            maxMinutes: resolvedMaxMinutes,
            mode,
              context: contextInfo
            });
          logger.error(candidates);
          return;
        }
      } else {
        if (isInteractive) {
          validatorCommand = await promptForValidatorCommand();
        } else {
          await writeStateAndExit('no_validator', 2, 'Validator auto-detect failed. Provide --validator or --validator none.', {
            goal,
            roles,
            maxIterations,
            maxMinutes: resolvedMaxMinutes,
            mode,
            context: contextInfo
          });
          return;
        }
      }
    }
  }

  if (validatorCommand === null) {
    logger.info('Validator: none');
  } else {
    logger.info(`Validator: ${validatorCommand}`);
  }

  const subagentsEnabled = envFlagEnabled(env.CODEX_SUBAGENTS) || envFlagEnabled(env.RLM_SUBAGENTS);
  const symbolicMultiAgent = resolveSymbolicMultiAgentConfig(env);
  const symbolicCollabEnabled = symbolicMultiAgent.enabled;
  const collabRolePolicyConfig = resolveCollabRolePolicyConfig(env);
  const collabRolePolicy = collabRolePolicyConfig.value;
  const collabAllowDefaultRoleConfig = resolveCollabAllowDefaultRoleConfig(env);
  const collabAllowDefaultRole = collabAllowDefaultRoleConfig.value;
  const symbolicDeliberationEnabled =
    env.RLM_SYMBOLIC_DELIBERATION === undefined
      ? true
      : envFlagEnabled(env.RLM_SYMBOLIC_DELIBERATION);
  const symbolicDeliberationIncludeInPlanner =
    env.RLM_SYMBOLIC_DELIBERATION_INCLUDE_IN_PLANNER === undefined
      ? true
      : envFlagEnabled(env.RLM_SYMBOLIC_DELIBERATION_INCLUDE_IN_PLANNER);
  const symbolicDeliberationLogArtifacts = envFlagEnabled(env.RLM_SYMBOLIC_DELIBERATION_LOG);
  const nonInteractive = shouldForceNonInteractive(env);
  const codexRuntimeShell = createRlmCodexRuntimeShell({ env, repoRoot });

  if (mode === 'symbolic') {
    if (symbolicMultiAgent.source === 'legacy') {
      logger.warn('RLM_SYMBOLIC_COLLAB is a legacy alias; prefer RLM_SYMBOLIC_MULTI_AGENT.');
    }
    if (collabRolePolicyConfig.source === 'legacy') {
      logger.warn(
        `${COLLAB_ROLE_POLICY_ENV_LEGACY} is a legacy alias; prefer ${COLLAB_ROLE_POLICY_ENV_CANONICAL}.`
      );
    }
    if (collabAllowDefaultRoleConfig.source === 'legacy') {
      logger.warn(
        `${COLLAB_ALLOW_DEFAULT_ROLE_ENV_LEGACY} is a legacy alias; prefer ${COLLAB_ALLOW_DEFAULT_ROLE_ENV_CANONICAL}.`
      );
    }
    const collabFeatureKey = symbolicCollabEnabled
      ? await codexRuntimeShell.resolveCollabFeatureKey(nonInteractive)
      : COLLAB_FEATURE_LEGACY;
    if (symbolicCollabEnabled) {
      logger.info(`Symbolic collab feature key: ${collabFeatureKey}`);
      logger.info(
        `Symbolic collab role policy: ${collabRolePolicy} (allow_default_role=${collabAllowDefaultRole ? '1' : '0'})`
      );
    }
    const budgets: SymbolicBudgets = {
      maxSubcallsPerIteration:
        parsePositiveInt(env.RLM_MAX_SUBCALLS_PER_ITERATION, DEFAULT_MAX_SUBCALLS_PER_ITERATION) ??
        0,
      maxSearchesPerIteration:
        parsePositiveInt(env.RLM_MAX_SEARCHES_PER_ITERATION, DEFAULT_MAX_SEARCHES_PER_ITERATION) ?? 0,
      maxChunkReadsPerIteration:
        parsePositiveInt(env.RLM_MAX_CHUNK_READS_PER_ITERATION, DEFAULT_MAX_CHUNK_READS_PER_ITERATION) ??
        0,
      maxBytesPerChunkRead:
        parsePositiveInt(env.RLM_MAX_BYTES_PER_CHUNK_READ, DEFAULT_MAX_BYTES_PER_CHUNK_READ) ?? 0,
      maxSnippetsPerSubcall:
        parsePositiveInt(env.RLM_MAX_SNIPPETS_PER_SUBCALL, DEFAULT_MAX_SNIPPETS_PER_SUBCALL) ?? 0,
      maxBytesPerSnippet:
        parsePositiveInt(env.RLM_MAX_BYTES_PER_SNIPPET, DEFAULT_MAX_BYTES_PER_SNIPPET) ?? 0,
      maxSubcallInputBytes:
        parsePositiveInt(env.RLM_MAX_SUBCALL_INPUT_BYTES, DEFAULT_MAX_SUBCALL_INPUT_BYTES) ?? 0,
      maxPlannerPromptBytes:
        parsePositiveInt(env.RLM_MAX_PLANNER_PROMPT_BYTES, DEFAULT_MAX_PLANNER_PROMPT_BYTES) ?? 0,
      searchTopK: parsePositiveInt(env.RLM_SEARCH_TOP_K, DEFAULT_SEARCH_TOP_K) ?? 0,
      maxPreviewBytes: parsePositiveInt(env.RLM_MAX_PREVIEW_BYTES, DEFAULT_MAX_PREVIEW_BYTES) ?? 0,
      maxConcurrency: parsePositiveInt(env.RLM_MAX_CONCURRENCY, DEFAULT_MAX_CONCURRENCY) ?? 0
    };
    const deliberationMinIntervalIterations =
      parsePositiveInt(
        env.RLM_SYMBOLIC_DELIBERATION_INTERVAL,
        DEFAULT_SYMBOLIC_DELIBERATION_INTERVAL
      ) ?? 0;
    const deliberationMaxRuns =
      parsePositiveInt(env.RLM_SYMBOLIC_DELIBERATION_MAX_RUNS, DEFAULT_SYMBOLIC_DELIBERATION_MAX_RUNS) ??
      0;
    const deliberationMaxSummaryBytes =
      parsePositiveInt(
        env.RLM_SYMBOLIC_DELIBERATION_MAX_SUMMARY_BYTES,
        DEFAULT_SYMBOLIC_DELIBERATION_MAX_SUMMARY_BYTES
      ) ?? 0;
    const alignmentCheckerEnabled = resolveAlignmentCheckerEnabled(env);
    const alignmentCheckerEnforce = resolveAlignmentCheckerEnforce(env);
    const alignmentSentinelModel =
      env.RLM_ALIGNMENT_SENTINEL_MODEL?.trim() || DEFAULT_ALIGNMENT_SENTINEL_MODEL;
    const alignmentHighReasoningModel =
      env.RLM_ALIGNMENT_HIGH_REASONING_MODEL?.trim() || DEFAULT_ALIGNMENT_HIGH_REASONING_MODEL;
    const alignmentArbitrationModel =
      env.RLM_ALIGNMENT_ARBITRATION_MODEL?.trim() || DEFAULT_ALIGNMENT_ARBITRATION_MODEL;
    const alignmentHighReasoningAvailable =
      env.RLM_ALIGNMENT_HIGH_REASONING_AVAILABLE === undefined
        ? DEFAULT_ALIGNMENT_HIGH_REASONING_AVAILABLE
        : envFlagEnabled(env.RLM_ALIGNMENT_HIGH_REASONING_AVAILABLE);
    const alignmentConsensusTopScoreMin = parseProbability(
      env.RLM_ALIGNMENT_CONSENSUS_TOP_SCORE_MIN,
      DEFAULT_ALIGNMENT_CONSENSUS_TOP_SCORE_MIN
    );
    const alignmentConsensusMarginMin = parseProbability(
      env.RLM_ALIGNMENT_CONSENSUS_MARGIN_MIN,
      DEFAULT_ALIGNMENT_CONSENSUS_MARGIN_MIN
    );
    const alignmentConsensusRequiredVotes =
      parsePositiveInt(
        env.RLM_ALIGNMENT_CONSENSUS_REQUIRED_VOTES,
        DEFAULT_ALIGNMENT_CONSENSUS_REQUIRED_VOTES
      ) ?? 0;
    const alignmentDeepAuditMinContradictions =
      parsePositiveInt(
        env.RLM_ALIGNMENT_DEEP_AUDIT_MIN_CONTRADICTIONS,
        DEFAULT_ALIGNMENT_DEEP_AUDIT_MIN_CONTRADICTIONS
      ) ?? 0;
    const alignmentDeepAuditOverrideStreak =
      parsePositiveInt(
        env.RLM_ALIGNMENT_DEEP_AUDIT_OVERRIDE_STREAK,
        DEFAULT_ALIGNMENT_DEEP_AUDIT_OVERRIDE_STREAK
      ) ?? 0;
    const alignmentVerbosityFreeTokens =
      parsePositiveInt(
        env.RLM_ALIGNMENT_VERBOSITY_FREE_TOKENS,
        DEFAULT_ALIGNMENT_VERBOSITY_FREE_TOKENS
      ) ?? 0;
    const alignmentCooldownTurns = parsePositiveInt(
      env.RLM_ALIGNMENT_COOLDOWN_TURNS,
      DEFAULT_ALIGNMENT_COOLDOWN_TURNS
    );
    if (alignmentCheckerEnabled) {
      logger.info(
        `Alignment checker: enabled=1 enforce=${alignmentCheckerEnforce ? '1' : '0'} ` +
          `sentinel_model=${alignmentSentinelModel} high_reasoning_model=${alignmentHighReasoningModel} ` +
          `high_reasoning_available=${alignmentHighReasoningAvailable ? '1' : '0'}`
      );
    } else {
      logger.info('Alignment checker: enabled=0');
    }

    const invalidBudget = Object.entries(budgets).find(([, value]) => !value || value <= 0);
    if (invalidBudget) {
      await writeStateAndExit('invalid_config', 5, `Invalid ${invalidBudget[0]} value.`, {
        goal,
        roles,
        maxIterations,
        maxMinutes: resolvedMaxMinutes,
        mode,
        context: contextInfo,
        validator: validatorCommand ?? 'none'
      });
      return;
    }
    if (deliberationMinIntervalIterations <= 0) {
      await writeStateAndExit('invalid_config', 5, 'Invalid RLM_SYMBOLIC_DELIBERATION_INTERVAL value.', {
        goal,
        roles,
        maxIterations,
        maxMinutes: resolvedMaxMinutes,
        mode,
        context: contextInfo,
        validator: validatorCommand ?? 'none'
      });
      return;
    }
    if (deliberationMaxRuns <= 0) {
      await writeStateAndExit('invalid_config', 5, 'Invalid RLM_SYMBOLIC_DELIBERATION_MAX_RUNS value.', {
        goal,
        roles,
        maxIterations,
        maxMinutes: resolvedMaxMinutes,
        mode,
        context: contextInfo,
        validator: validatorCommand ?? 'none'
      });
      return;
    }
    if (deliberationMaxSummaryBytes <= 0) {
      await writeStateAndExit(
        'invalid_config',
        5,
        'Invalid RLM_SYMBOLIC_DELIBERATION_MAX_SUMMARY_BYTES value.',
        {
          goal,
          roles,
          maxIterations,
          maxMinutes: resolvedMaxMinutes,
          mode,
          context: contextInfo,
          validator: validatorCommand ?? 'none'
        }
      );
      return;
    }
    if (alignmentCheckerEnabled) {
      if (!alignmentSentinelModel || !alignmentHighReasoningModel || !alignmentArbitrationModel) {
        await writeStateAndExit('invalid_config', 5, 'Invalid alignment model route configuration.', {
          goal,
          roles,
          maxIterations,
          maxMinutes: resolvedMaxMinutes,
          mode,
          context: contextInfo,
          validator: validatorCommand ?? 'none'
        });
        return;
      }
      if (
        alignmentConsensusTopScoreMin === null ||
        alignmentConsensusMarginMin === null ||
        alignmentConsensusRequiredVotes <= 0 ||
        alignmentConsensusRequiredVotes > 3
      ) {
        await writeStateAndExit('invalid_config', 5, 'Invalid alignment consensus threshold configuration.', {
          goal,
          roles,
          maxIterations,
          maxMinutes: resolvedMaxMinutes,
          mode,
          context: contextInfo,
          validator: validatorCommand ?? 'none'
        });
        return;
      }
      if (
        alignmentDeepAuditMinContradictions <= 0 ||
        alignmentDeepAuditOverrideStreak <= 0 ||
        alignmentVerbosityFreeTokens <= 0 ||
        alignmentCooldownTurns === null ||
        alignmentCooldownTurns < 0
      ) {
        await writeStateAndExit('invalid_config', 5, 'Invalid alignment checker policy configuration.', {
          goal,
          roles,
          maxIterations,
          maxMinutes: resolvedMaxMinutes,
          mode,
          context: contextInfo,
          validator: validatorCommand ?? 'none'
        });
        return;
      }
    }

    const alignmentPolicy: Partial<AlignmentPolicy> = {
      route: {
        sentinel_model: alignmentSentinelModel,
        high_reasoning_model: alignmentHighReasoningModel,
        arbitration_model: alignmentArbitrationModel,
        high_reasoning_available: alignmentHighReasoningAvailable
      },
      deep_audit: {
        min_contradictions: alignmentDeepAuditMinContradictions,
        override_streak_trigger: alignmentDeepAuditOverrideStreak,
        on_high_risk: true
      },
      anti_gaming: {
        verbosity_free_tokens: alignmentVerbosityFreeTokens,
        max_penalty: DEFAULT_ALIGNMENT_MAX_PENALTY
      },
      anti_oscillation: {
        cooldown_turns: alignmentCooldownTurns ?? DEFAULT_ALIGNMENT_COOLDOWN_TURNS
      },
      consensus: {
        top_score_min: alignmentConsensusTopScoreMin ?? DEFAULT_ALIGNMENT_CONSENSUS_TOP_SCORE_MIN,
        margin_min: alignmentConsensusMarginMin ?? DEFAULT_ALIGNMENT_CONSENSUS_MARGIN_MIN,
        required_votes: alignmentConsensusRequiredVotes
      }
    };

    const baseState = buildBaseState({
      goal,
      validator: validatorCommand ?? 'none',
      roles,
      maxIterations,
      maxMinutes: resolvedMaxMinutes,
      mode,
      context: contextInfo
    });

    const contextStore = new ContextStore(contextObject);
    const result = await runSymbolicLoop({
      goal,
      baseState,
      maxIterations,
      maxMinutes: resolvedMaxMinutes,
      repoRoot,
      runDir: rlmRoot,
      contextStore,
      budgets,
      alignment: alignmentCheckerEnabled
        ? {
            enabled: true,
            enforce: alignmentCheckerEnforce,
            task_id: runIds.taskId,
            run_id: runIds.runId,
            thread_id:
              env.RLM_ALIGNMENT_THREAD_ID?.trim() ||
              `${runIds.taskId}:${runIds.runId}`,
            agent_id: env.RLM_ALIGNMENT_AGENT_ID?.trim() || 'top-level',
            policy: alignmentPolicy
          }
        : undefined,
      runPlanner: (prompt, _attempt) => {
        void _attempt;
        return codexRuntimeShell.runJsonlCompletion(prompt, {
          nonInteractive,
          mirrorOutput: false
        });
      },
      runSubcall: (prompt, _meta) => {
        void _meta;
        return codexRuntimeShell.runSymbolicPrompt(prompt, {
          nonInteractive,
          symbolicCollabEnabled,
          collabFeatureKey,
          collabRolePolicy,
          collabAllowDefaultRole
        });
      },
      deliberation: {
        enabled: symbolicDeliberationEnabled,
        strategy: symbolicCollabEnabled ? 'collab' : 'single-agent',
        minIntervalIterations: deliberationMinIntervalIterations,
        maxRuns: deliberationMaxRuns,
        maxSummaryBytes: deliberationMaxSummaryBytes,
        includeInPlannerPrompt: symbolicDeliberationIncludeInPlanner,
        logArtifacts: symbolicDeliberationLogArtifacts,
        run: (prompt, _meta) => {
          void _meta;
          return codexRuntimeShell.runSymbolicPrompt(prompt, {
            nonInteractive,
            symbolicCollabEnabled,
            collabFeatureKey,
            collabRolePolicy,
            collabAllowDefaultRole
          });
        }
      },
      logger: (line) => logger.info(line)
    });

    const finalStatus = result.state.final?.status ?? 'unknown';
    const iterationCount = result.state.symbolic_iterations.length;
    logger.info(`RLM completed: status=${finalStatus} symbolic_iterations=${iterationCount} exit=${result.exitCode}`);
    process.exitCode = result.exitCode;
    return;
  }

  const result = await runRlmLoop({
    mode,
    context: contextInfo,
    goal,
    validatorCommand,
    maxIterations,
    maxMinutes: resolvedMaxMinutes,
    roles,
    subagentsEnabled,
    repoRoot,
    runDir: rlmRoot,
    runAgent: (input) => runCodexAgent(input, codexRuntimeShell, nonInteractive, subagentsEnabled),
    runValidator: (command) => runValidatorCommand(command, repoRoot),
      logger: (line) => logger.info(line)
    });

  const finalStatus = result.state.final?.status ?? 'unknown';
  const iterationCount = result.state.iterations.length;
  logger.info(`RLM completed: status=${finalStatus} iterations=${iterationCount} exit=${result.exitCode}`);
  const hasTimeCap = resolvedMaxMinutes !== null && resolvedMaxMinutes > 0;
  const unboundedBudgetInvalid = validatorCommand === null && maxIterations === 0 && !hasTimeCap;
  if (finalStatus === 'invalid_config' && unboundedBudgetInvalid) {
    logger.error(
      'Invalid configuration: --validator none with unbounded iterations and --max-minutes 0 would run forever. Fix: set --max-minutes / RLM_MAX_MINUTES to a positive value (default 2880), set --max-iterations to a positive value, or provide a validator.'
    );
  }
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
  parseProbability,
  resolveAlignmentCheckerEnabled,
  resolveAlignmentCheckerEnforce,
  resolveSymbolicMultiAgentConfig,
  resolveRlmMode,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MAX_MINUTES,
  DEFAULT_SYMBOLIC_MIN_BYTES,
  DEFAULT_ALIGNMENT_CHECKER_ENABLED,
  DEFAULT_ALIGNMENT_CHECKER_ENFORCE
};
