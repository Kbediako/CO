import { exec } from 'node:child_process';
import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

import { logger } from '../logger.js';
import { resolveCodexCommand } from './utils/devtools.js';
import { detectValidator } from './rlm/validator.js';
import { buildRlmPrompt } from './rlm/prompt.js';
import { runRlmLoop } from './rlm/runner.js';
import { buildContextObject, ContextStore, type ContextSource } from './rlm/context.js';
import { runSymbolicLoop, type SymbolicBudgets } from './rlm/symbolic.js';
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
  if (
    options.delegated ||
    options.hasContextPath ||
    options.contextBytes >= options.symbolicMinBytes
  ) {
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
  const output = await runCodexCompletion(prompt, env, repoRoot, nonInteractive, subagentsEnabled, true);
  return { output };
}

async function runCodexExec(
  args: string[],
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  nonInteractive: boolean,
  subagentsEnabled: boolean,
  mirrorOutput: boolean
): Promise<{ stdout: string; stderr: string }> {
  const { command, args: resolvedArgs } = resolveCodexCommand(args, env);
  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env };

  if (nonInteractive) {
    childEnv.CODEX_NON_INTERACTIVE = childEnv.CODEX_NON_INTERACTIVE ?? '1';
    childEnv.CODEX_NO_INTERACTIVE = childEnv.CODEX_NO_INTERACTIVE ?? '1';
    childEnv.CODEX_INTERACTIVE = childEnv.CODEX_INTERACTIVE ?? '0';
  }
  childEnv.CODEX_SUBAGENTS = subagentsEnabled ? '1' : '0';

  const child = spawn(command, resolvedArgs, { cwd: repoRoot, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    if (mirrorOutput) {
      process.stdout.write(chunk);
    }
  });
  child.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    if (mirrorOutput) {
      process.stderr.write(chunk);
    }
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

  return { stdout, stderr };
}

async function runCodexCompletion(
  prompt: string,
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  nonInteractive: boolean,
  subagentsEnabled: boolean,
  mirrorOutput: boolean
): Promise<string> {
  const { stdout, stderr } = await runCodexExec(
    ['exec', prompt],
    env,
    repoRoot,
    nonInteractive,
    subagentsEnabled,
    mirrorOutput
  );
  return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
}

async function runCodexJsonlCompletion(
  prompt: string,
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  nonInteractive: boolean,
  mirrorOutput: boolean,
  extraArgs: string[] = [],
  options: { validateCollabLifecycle?: boolean } = {}
): Promise<string> {
  const { stdout, stderr } = await runCodexExec(
    ['exec', '--json', ...extraArgs, prompt],
    env,
    repoRoot,
    nonInteractive,
    false,
    mirrorOutput
  );
  if (options.validateCollabLifecycle) {
    const validation = validateCollabLifecycle(stdout);
    if (!validation.ok) {
      throw new Error(`Collab lifecycle validation failed: ${validation.reason}`);
    }
  }
  const message = extractAgentMessageFromJsonl(stdout);
  if (message) {
    return message;
  }
  return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
}

function extractAgentMessageFromJsonl(raw: string): string | null {
  let lastMessage: string | null = null;
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as { type?: string; item?: { type?: string; text?: string } };
      if (
        (parsed.type === 'item.completed' || parsed.type === 'item.updated') &&
        parsed.item?.type === 'agent_message' &&
        typeof parsed.item.text === 'string'
      ) {
        lastMessage = parsed.item.text;
      }
    } catch {
      // ignore parse errors for non-json lines
    }
  }
  return lastMessage;
}

interface ParsedCollabToolCall {
  sequence: number;
  eventType: 'item.started' | 'item.updated' | 'item.completed';
  tool: string;
  status: 'in_progress' | 'completed' | 'failed' | 'unknown';
  receiverThreadIds: string[];
}

function normalizeCollabStatus(value: unknown): ParsedCollabToolCall['status'] {
  if (value === 'in_progress' || value === 'completed' || value === 'failed') {
    return value;
  }
  return 'unknown';
}

function parseCollabToolCallsFromJsonl(raw: string): ParsedCollabToolCall[] {
  const lines = raw.split(/\r?\n/);
  const calls: ParsedCollabToolCall[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line || !line.startsWith('{') || !line.includes('"collab_tool_call"')) {
      continue;
    }
    try {
      const parsed = JSON.parse(line) as {
        type?: string;
        item?: {
          type?: string;
          tool?: unknown;
          status?: unknown;
          receiver_thread_ids?: unknown;
        };
      };
      if (
        (parsed.type !== 'item.started' && parsed.type !== 'item.updated' && parsed.type !== 'item.completed') ||
        parsed.item?.type !== 'collab_tool_call' ||
        typeof parsed.item.tool !== 'string'
      ) {
        continue;
      }
      const receiverThreadIds = Array.isArray(parsed.item.receiver_thread_ids)
        ? parsed.item.receiver_thread_ids.filter((entry): entry is string => typeof entry === 'string')
        : [];
      calls.push({
        sequence: index,
        eventType: parsed.type,
        tool: parsed.item.tool,
        status: normalizeCollabStatus(parsed.item.status),
        receiverThreadIds
      });
    } catch {
      continue;
    }
  }
  return calls;
}

function formatLifecycleIds(ids: string[]): string {
  return ids.slice(0, 3).join(', ');
}

function includesThreadLimit(text: string): boolean {
  return text.toLowerCase().includes('agent thread limit reached');
}

function hasCollabSpawnThreadLimitError(raw: string): boolean {
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as { item?: Record<string, unknown>; error?: Record<string, unknown> };
      const item = parsed.item;
      if (
        !item ||
        item.type !== 'collab_tool_call' ||
        item.tool !== 'spawn_agent'
      ) {
        continue;
      }
      const candidates: string[] = [];
      if (typeof item.error === 'string') {
        candidates.push(item.error);
      }
      if (typeof item.message === 'string') {
        candidates.push(item.message);
      }
      if (typeof item.output === 'string') {
        candidates.push(item.output);
      }
      if (typeof parsed.error?.message === 'string') {
        candidates.push(parsed.error.message);
      }
      if (candidates.some((entry) => includesThreadLimit(entry))) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

function validateCollabLifecycle(raw: string): { ok: true } | { ok: false; reason: string } {
  if (hasCollabSpawnThreadLimitError(raw)) {
    return { ok: false, reason: 'collab spawn hit thread limit' };
  }
  const calls = parseCollabToolCallsFromJsonl(raw);
  if (calls.length === 0) {
    return { ok: true };
  }

  const spawnedAt = new Map<string, number>();
  const waitedAt = new Map<string, number>();
  const closedAt = new Map<string, number>();

  for (const call of calls) {
    const isCompleted =
      call.status === 'completed' || (call.status === 'unknown' && call.eventType === 'item.completed');
    if (!isCompleted) {
      continue;
    }
    for (const threadId of call.receiverThreadIds) {
      if (call.tool === 'spawn_agent' && !spawnedAt.has(threadId)) {
        spawnedAt.set(threadId, call.sequence);
      } else if (call.tool === 'wait') {
        waitedAt.set(threadId, call.sequence);
      } else if (call.tool === 'close_agent') {
        closedAt.set(threadId, call.sequence);
      }
    }
  }

  const spawnedIds = Array.from(spawnedAt.keys());
  if (spawnedIds.length === 0) {
    return { ok: true };
  }

  const missingWait = spawnedIds.filter((threadId) => !waitedAt.has(threadId));
  if (missingWait.length > 0) {
    return {
      ok: false,
      reason: `missing wait for spawned agent(s): ${formatLifecycleIds(missingWait)}`
    };
  }

  const missingClose = spawnedIds.filter((threadId) => !closedAt.has(threadId));
  if (missingClose.length > 0) {
    return {
      ok: false,
      reason: `missing close_agent for spawned agent(s): ${formatLifecycleIds(missingClose)}`
    };
  }

  const invalidOrder = spawnedIds.filter((threadId) => {
    const waitSequence = waitedAt.get(threadId);
    const closeSequence = closedAt.get(threadId);
    if (waitSequence === undefined || closeSequence === undefined) {
      return false;
    }
    return closeSequence < waitSequence;
  });
  if (invalidOrder.length > 0) {
    return {
      ok: false,
      reason: `close_agent before wait for agent(s): ${formatLifecycleIds(invalidOrder)}`
    };
  }

  return { ok: true };
}

function buildCollabSubcallPrompt(prompt: string): string {
  return [
    'Use collab tools to run the sub-agent prompt below.',
    'For every spawned agent id, execute this lifecycle in order:',
    '1) spawn_agent',
    '2) wait (for that same id)',
    '3) close_agent (for that same id)',
    'Never leave spawned agents unclosed, including timeout or error paths.',
    'Return only the sub-agent response text and nothing else.',
    '',
    'Sub-agent prompt:',
    prompt
  ].join('\n');
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
      console.error(message);
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
        console.log(`Validator: ${detection.command} (${detection.reason ?? 'auto-detect'})`);
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
          console.error(candidates);
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
    console.log('Validator: none');
  } else {
    console.log(`Validator: ${validatorCommand}`);
  }

  const subagentsEnabled = envFlagEnabled(env.CODEX_SUBAGENTS) || envFlagEnabled(env.RLM_SUBAGENTS);
  const symbolicCollabEnabled = envFlagEnabled(env.RLM_SYMBOLIC_COLLAB);
  const symbolicDeliberationEnabled =
    env.RLM_SYMBOLIC_DELIBERATION === undefined
      ? true
      : envFlagEnabled(env.RLM_SYMBOLIC_DELIBERATION);
  const symbolicDeliberationIncludeInPlanner =
    env.RLM_SYMBOLIC_DELIBERATION_INCLUDE_IN_PLANNER === undefined
      ? true
      : envFlagEnabled(env.RLM_SYMBOLIC_DELIBERATION_INCLUDE_IN_PLANNER);
  const nonInteractive = shouldForceNonInteractive(env);

  if (mode === 'symbolic') {
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
      runPlanner: (prompt, _attempt) => {
        void _attempt;
        return runCodexJsonlCompletion(prompt, env, repoRoot, nonInteractive, false);
      },
      runSubcall: (prompt, _meta) => {
        void _meta;
        if (!symbolicCollabEnabled) {
          return runCodexCompletion(prompt, env, repoRoot, nonInteractive, false, false);
        }
        const collabPrompt = buildCollabSubcallPrompt(prompt);
        return runCodexJsonlCompletion(collabPrompt, env, repoRoot, nonInteractive, true, [
          '--enable',
          'collab',
          '--sandbox',
          'read-only'
        ], {
          validateCollabLifecycle: true
        });
      },
      deliberation: {
        enabled: symbolicDeliberationEnabled,
        strategy: symbolicCollabEnabled ? 'collab' : 'single-agent',
        minIntervalIterations: deliberationMinIntervalIterations,
        maxRuns: deliberationMaxRuns,
        maxSummaryBytes: deliberationMaxSummaryBytes,
        includeInPlannerPrompt: symbolicDeliberationIncludeInPlanner,
        run: (prompt, _meta) => {
          void _meta;
          if (!symbolicCollabEnabled) {
            return runCodexCompletion(prompt, env, repoRoot, nonInteractive, false, false);
          }
          const collabPrompt = buildCollabSubcallPrompt(prompt);
          return runCodexJsonlCompletion(collabPrompt, env, repoRoot, nonInteractive, true, [
            '--enable',
            'collab',
            '--sandbox',
            'read-only'
          ], {
            validateCollabLifecycle: true
          });
        }
      },
      logger: (line) => logger.info(line)
    });

    const finalStatus = result.state.final?.status ?? 'unknown';
    const iterationCount = result.state.symbolic_iterations.length;
    console.log(`RLM completed: status=${finalStatus} symbolic_iterations=${iterationCount} exit=${result.exitCode}`);
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
    runAgent: (input) => runCodexAgent(input, env, repoRoot, nonInteractive, subagentsEnabled),
    runValidator: (command) => runValidatorCommand(command, repoRoot),
    logger: (line) => logger.info(line)
  });

  const finalStatus = result.state.final?.status ?? 'unknown';
  const iterationCount = result.state.iterations.length;
  console.log(`RLM completed: status=${finalStatus} iterations=${iterationCount} exit=${result.exitCode}`);
  const hasTimeCap = resolvedMaxMinutes !== null && resolvedMaxMinutes > 0;
  const unboundedBudgetInvalid = validatorCommand === null && maxIterations === 0 && !hasTimeCap;
  if (finalStatus === 'invalid_config' && unboundedBudgetInvalid) {
    console.error(
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
  resolveRlmMode,
  parseCollabToolCallsFromJsonl,
  validateCollabLifecycle,
  buildCollabSubcallPrompt,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MAX_MINUTES,
  DEFAULT_SYMBOLIC_MIN_BYTES
};
