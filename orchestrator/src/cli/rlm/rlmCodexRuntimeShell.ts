import { spawn } from 'node:child_process';
import process from 'node:process';

import { logger } from '../../logger.js';
import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext
} from '../runtime/index.js';

export const COLLAB_FEATURE_CANONICAL = 'multi_agent';
export const COLLAB_FEATURE_LEGACY = 'collab';

const DEFAULT_COLLAB_ROLE_POLICY = 'enforce';
const COLLAB_ROLE_POLICY_ENV_CANONICAL = 'RLM_SYMBOLIC_MULTI_AGENT_ROLE_POLICY';
const COLLAB_ROLE_POLICY_ENV_LEGACY = 'RLM_COLLAB_ROLE_POLICY';
const COLLAB_ROLE_TAG_PATTERN = /^\s*\[(?:agent_type|role)\s*:\s*([a-z0-9._-]+)\]/i;
const COLLAB_ROLE_TOKEN_PATTERN = /^[a-z0-9._-]+$/;

export type CollabFeatureKey = typeof COLLAB_FEATURE_CANONICAL | typeof COLLAB_FEATURE_LEGACY;
export type CollabRolePolicy = 'enforce' | 'warn' | 'off';
export type CollabLifecycleReasonCode =
  | 'thread_limit'
  | 'missing_wait'
  | 'missing_close'
  | 'close_before_wait'
  | 'missing_role'
  | 'default_role_disallowed'
  | 'role_mismatch';

export type CollabLifecycleValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: string;
      reasonCode: CollabLifecycleReasonCode;
    };

export interface ParsedCollabToolCall {
  sequence: number;
  eventType: 'item.started' | 'item.updated' | 'item.completed';
  tool: string;
  status: 'in_progress' | 'completed' | 'failed' | 'unknown';
  receiverThreadIds: string[];
  prompt: string | null;
  agentType: string | null;
  promptRole: string | null;
}

interface RuntimeShellLogger {
  info(message: string): void;
  warn(message: string): void;
  debug(message: string): void;
}

interface RuntimeExecRequest {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  mirrorOutput: boolean;
}

interface RlmCodexRuntimeShellOptions {
  env: NodeJS.ProcessEnv;
  repoRoot: string;
  createRuntimeContextImpl?: typeof createRuntimeCodexCommandContext;
  resolveRuntimeCommandImpl?: typeof resolveRuntimeCodexCommand;
  formatRuntimeSelectionSummaryImpl?: typeof formatRuntimeSelectionSummary;
  execRunner?: (request: RuntimeExecRequest) => Promise<{ stdout: string; stderr: string }>;
  log?: RuntimeShellLogger;
}

interface RlmCodexExecOptions {
  nonInteractive: boolean;
  subagentsEnabled: boolean;
  mirrorOutput: boolean;
}

interface RlmCodexJsonlCompletionOptions {
  nonInteractive: boolean;
  mirrorOutput: boolean;
  extraArgs?: string[];
  validateCollabLifecycle?: boolean;
  collabRolePolicy?: CollabRolePolicy;
  collabAllowDefaultRole?: boolean;
}

export interface RlmCodexRuntimeShell {
  runCompletion(prompt: string, options: RlmCodexExecOptions): Promise<string>;
  runJsonlCompletion(prompt: string, options: RlmCodexJsonlCompletionOptions): Promise<string>;
  resolveCollabFeatureKey(nonInteractive: boolean): Promise<CollabFeatureKey>;
}

function defaultExecRunner(request: RuntimeExecRequest): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(request.command, request.args, {
      cwd: request.cwd,
      env: request.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (request.mirrorOutput) {
        process.stdout.write(chunk);
      }
    });
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (request.mirrorOutput) {
        process.stderr.write(chunk);
      }
    });

    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new Error(`codex exec exited with code ${code ?? 'unknown'}`));
      }
    });
  });
}

export function createRlmCodexRuntimeShell(
  options: RlmCodexRuntimeShellOptions
): RlmCodexRuntimeShell {
  const createRuntimeContextImpl =
    options.createRuntimeContextImpl ?? createRuntimeCodexCommandContext;
  const resolveRuntimeCommandImpl =
    options.resolveRuntimeCommandImpl ?? resolveRuntimeCodexCommand;
  const formatRuntimeSelectionSummaryImpl =
    options.formatRuntimeSelectionSummaryImpl ?? formatRuntimeSelectionSummary;
  const execRunner = options.execRunner ?? defaultExecRunner;
  const log = options.log ?? logger;
  let runtimeCodexContextPromise: Promise<RuntimeCodexCommandContext> | null = null;
  let runtimeCodexContextLogged = false;

  async function resolveRlmRuntimeCodexContext(): Promise<RuntimeCodexCommandContext> {
    if (!runtimeCodexContextPromise) {
      const requestedMode = parseRuntimeMode(
        options.env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE ??
          options.env.CODEX_ORCHESTRATOR_RUNTIME_MODE ??
          null
      );
      const runId =
        typeof options.env.CODEX_ORCHESTRATOR_RUN_ID === 'string' &&
        options.env.CODEX_ORCHESTRATOR_RUN_ID.trim().length > 0
          ? options.env.CODEX_ORCHESTRATOR_RUN_ID.trim()
          : `rlm-${Date.now()}`;
      runtimeCodexContextPromise = createRuntimeContextImpl({
        requestedMode,
        executionMode: 'mcp',
        repoRoot: options.repoRoot,
        env: { ...process.env, ...options.env },
        runId
      });
    }

    const runtimeContext = await runtimeCodexContextPromise;
    if (!runtimeCodexContextLogged) {
      log.info(`[rlm-runtime] ${formatRuntimeSelectionSummaryImpl(runtimeContext.runtime)}`);
      runtimeCodexContextLogged = true;
    }
    return runtimeContext;
  }

  async function runCodexExec(
    args: string[],
    execOptions: RlmCodexExecOptions
  ): Promise<{ stdout: string; stderr: string }> {
    const runtimeContext = await resolveRlmRuntimeCodexContext();
    const { command, args: resolvedArgs } = resolveRuntimeCommandImpl(args, runtimeContext);
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...options.env,
      ...runtimeContext.env
    };

    if (execOptions.nonInteractive) {
      childEnv.CODEX_NON_INTERACTIVE = childEnv.CODEX_NON_INTERACTIVE ?? '1';
      childEnv.CODEX_NO_INTERACTIVE = childEnv.CODEX_NO_INTERACTIVE ?? '1';
      childEnv.CODEX_INTERACTIVE = childEnv.CODEX_INTERACTIVE ?? '0';
    }
    childEnv.CODEX_SUBAGENTS = execOptions.subagentsEnabled ? '1' : '0';

    return execRunner({
      command,
      args: resolvedArgs,
      cwd: options.repoRoot,
      env: childEnv,
      mirrorOutput: execOptions.mirrorOutput
    });
  }

  return {
    async runCompletion(prompt: string, execOptions: RlmCodexExecOptions): Promise<string> {
      const { stdout, stderr } = await runCodexExec(['exec', prompt], execOptions);
      return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
    },

    async runJsonlCompletion(
      prompt: string,
      completionOptions: RlmCodexJsonlCompletionOptions
    ): Promise<string> {
      const { stdout, stderr } = await runCodexExec(
        ['exec', '--json', ...(completionOptions.extraArgs ?? []), prompt],
        {
          nonInteractive: completionOptions.nonInteractive,
          subagentsEnabled: false,
          mirrorOutput: completionOptions.mirrorOutput
        }
      );
      if (completionOptions.validateCollabLifecycle) {
        const rolePolicy =
          completionOptions.collabRolePolicy ?? DEFAULT_COLLAB_ROLE_POLICY;
        const validation = validateCollabLifecycle(stdout, {
          requireSpawnRole: rolePolicy !== 'off',
          allowDefaultRole: completionOptions.collabAllowDefaultRole ?? false
        });
        if (!validation.ok) {
          const rolePolicyFailure = isRolePolicyValidationReason(validation.reasonCode);
          if (rolePolicy === 'warn' && rolePolicyFailure) {
            log.warn(`Collab lifecycle validation warning: ${validation.reason}`);
          } else {
            throw new Error(`Collab lifecycle validation failed: ${validation.reason}`);
          }
        }
      }
      const message = extractAgentMessageFromJsonl(stdout);
      if (message) {
        return message;
      }
      return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
    },

    async resolveCollabFeatureKey(nonInteractive: boolean): Promise<CollabFeatureKey> {
      try {
        const { stdout } = await runCodexExec(['features', 'list'], {
          nonInteractive,
          subagentsEnabled: false,
          mirrorOutput: false
        });
        return resolveCollabFeatureKeyFromFlags(parseFeatureFlagsFromText(stdout));
      } catch (error) {
        log.debug(
          `Unable to resolve Codex collab feature key via \`codex features list\`: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return COLLAB_FEATURE_LEGACY;
      }
    }
  };
}

export function parseFeatureFlagsFromText(raw: string): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const tokens = trimmed.split(/\s+/u);
    if (tokens.length < 2) {
      continue;
    }
    const name = tokens[0] ?? '';
    const enabledToken = tokens[tokens.length - 1] ?? '';
    if (!name) {
      continue;
    }
    if (enabledToken === 'true') {
      flags[name] = true;
    } else if (enabledToken === 'false') {
      flags[name] = false;
    }
  }
  return flags;
}

export function resolveCollabFeatureKeyFromFlags(
  flags: Record<string, boolean>
): CollabFeatureKey {
  if (Object.prototype.hasOwnProperty.call(flags, COLLAB_FEATURE_CANONICAL)) {
    return COLLAB_FEATURE_CANONICAL;
  }
  if (Object.prototype.hasOwnProperty.call(flags, COLLAB_FEATURE_LEGACY)) {
    return COLLAB_FEATURE_LEGACY;
  }
  return COLLAB_FEATURE_LEGACY;
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
      const parsed = JSON.parse(trimmed) as {
        type?: string;
        item?: { type?: string; text?: string };
      };
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

function normalizeCollabStatus(value: unknown): ParsedCollabToolCall['status'] {
  if (value === 'in_progress' || value === 'completed' || value === 'failed') {
    return value;
  }
  return 'unknown';
}

export function parseCollabToolCallsFromJsonl(raw: string): ParsedCollabToolCall[] {
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
          prompt?: unknown;
          agent_type?: unknown;
        };
      };
      if (
        (parsed.type !== 'item.started' &&
          parsed.type !== 'item.updated' &&
          parsed.type !== 'item.completed') ||
        parsed.item?.type !== 'collab_tool_call' ||
        typeof parsed.item.tool !== 'string'
      ) {
        continue;
      }
      const receiverThreadIds = Array.isArray(parsed.item.receiver_thread_ids)
        ? parsed.item.receiver_thread_ids.filter(
            (entry): entry is string => typeof entry === 'string'
          )
        : [];
      const prompt = typeof parsed.item.prompt === 'string' ? parsed.item.prompt : null;
      calls.push({
        sequence: index,
        eventType: parsed.type,
        tool: parsed.item.tool,
        status: normalizeCollabStatus(parsed.item.status),
        receiverThreadIds,
        prompt,
        agentType: normalizeCollabRoleToken(parsed.item.agent_type),
        promptRole: resolveCollabRoleFromPrompt(prompt)
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

function normalizeCollabRoleToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized || !COLLAB_ROLE_TOKEN_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

function resolveCollabRoleFromPrompt(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = value.match(COLLAB_ROLE_TAG_PATTERN);
  if (!match || typeof match[1] !== 'string') {
    return null;
  }
  return normalizeCollabRoleToken(match[1]);
}

export function resolveCollabRolePolicy(value: string | undefined): CollabRolePolicy {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_COLLAB_ROLE_POLICY;
  }
  if (
    normalized === 'off' ||
    normalized === 'disabled' ||
    normalized === 'none' ||
    normalized === '0' ||
    normalized === 'false'
  ) {
    return 'off';
  }
  if (normalized === 'warn' || normalized === 'warning' || normalized === 'soft') {
    return 'warn';
  }
  if (
    normalized === 'enforce' ||
    normalized === 'strict' ||
    normalized === 'on' ||
    normalized === 'true' ||
    normalized === '1'
  ) {
    return 'enforce';
  }
  logger.warn(
    `Invalid multi-agent role policy value "${value}". Using "${DEFAULT_COLLAB_ROLE_POLICY}" ` +
      `(expected: enforce|warn|off; canonical env ${COLLAB_ROLE_POLICY_ENV_CANONICAL}, ` +
      `legacy alias ${COLLAB_ROLE_POLICY_ENV_LEGACY}).`
  );
  return DEFAULT_COLLAB_ROLE_POLICY;
}

export function isRolePolicyValidationReason(
  reasonCode: CollabLifecycleReasonCode
): boolean {
  return (
    reasonCode === 'missing_role' ||
    reasonCode === 'default_role_disallowed' ||
    reasonCode === 'role_mismatch'
  );
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
      const parsed = JSON.parse(trimmed) as {
        item?: Record<string, unknown>;
        error?: Record<string, unknown>;
      };
      const item = parsed.item;
      if (!item || item.type !== 'collab_tool_call' || item.tool !== 'spawn_agent') {
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

export function validateCollabLifecycle(
  raw: string,
  options: { requireSpawnRole?: boolean; allowDefaultRole?: boolean } = {}
): CollabLifecycleValidationResult {
  const requireSpawnRole = options.requireSpawnRole !== false;
  const allowDefaultRole = options.allowDefaultRole === true;
  if (hasCollabSpawnThreadLimitError(raw)) {
    return { ok: false, reason: 'collab spawn hit thread limit', reasonCode: 'thread_limit' };
  }
  const calls = parseCollabToolCallsFromJsonl(raw);
  if (calls.length === 0) {
    return { ok: true };
  }

  const spawnedAt = new Map<string, number>();
  const waitedAt = new Map<string, number>();
  const closedAt = new Map<string, number>();
  const missingRoleIds = new Set<string>();
  const disallowedDefaultRoleIds = new Set<string>();
  const mismatchedRoleIds = new Set<string>();
  const roleByThread = new Map<string, string>();

  for (const call of calls) {
    const isCompleted =
      call.status === 'completed' ||
      (call.status === 'unknown' && call.eventType === 'item.completed');
    if (!isCompleted) {
      continue;
    }
    if (call.tool === 'spawn_agent') {
      const explicitRole = call.agentType;
      const promptRole = call.promptRole;
      const effectiveRole = explicitRole ?? promptRole;
      const roleTargets =
        call.receiverThreadIds.length > 0 ? call.receiverThreadIds : [`spawn@${call.sequence}`];
      if (requireSpawnRole && !effectiveRole) {
        for (const target of roleTargets) {
          missingRoleIds.add(target);
        }
      } else if (effectiveRole === 'default' && !allowDefaultRole) {
        for (const target of roleTargets) {
          disallowedDefaultRoleIds.add(target);
        }
      }
      if (explicitRole && promptRole && explicitRole !== promptRole) {
        for (const target of roleTargets) {
          mismatchedRoleIds.add(target);
        }
      }
      for (const threadId of call.receiverThreadIds) {
        if (!spawnedAt.has(threadId)) {
          spawnedAt.set(threadId, call.sequence);
        }
        if (!effectiveRole) {
          continue;
        }
        const previous = roleByThread.get(threadId);
        if (previous && previous !== effectiveRole) {
          mismatchedRoleIds.add(threadId);
          continue;
        }
        roleByThread.set(threadId, effectiveRole);
      }
      continue;
    }

    for (const threadId of call.receiverThreadIds) {
      if (call.tool === 'wait') {
        waitedAt.set(threadId, call.sequence);
      } else if (call.tool === 'close_agent') {
        closedAt.set(threadId, call.sequence);
      }
    }
  }

  const spawnedIds = Array.from(spawnedAt.keys());
  if (spawnedIds.length > 0) {
    const missingWait = spawnedIds.filter((threadId) => !waitedAt.has(threadId));
    if (missingWait.length > 0) {
      return {
        ok: false,
        reason: `missing wait for spawned agent(s): ${formatLifecycleIds(missingWait)}`,
        reasonCode: 'missing_wait'
      };
    }

    const missingClose = spawnedIds.filter((threadId) => !closedAt.has(threadId));
    if (missingClose.length > 0) {
      return {
        ok: false,
        reason: `missing close_agent for spawned agent(s): ${formatLifecycleIds(missingClose)}`,
        reasonCode: 'missing_close'
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
        reason: `close_agent before wait for agent(s): ${formatLifecycleIds(invalidOrder)}`,
        reasonCode: 'close_before_wait'
      };
    }
  }

  if (!requireSpawnRole) {
    return { ok: true };
  }

  if (missingRoleIds.size > 0) {
    return {
      ok: false,
      reason:
        `missing explicit role for spawn_agent call(s): ${formatLifecycleIds(Array.from(missingRoleIds))}. ` +
        'Prefix prompts with [agent_type:<role>] and set spawn_agent.agent_type when supported.',
      reasonCode: 'missing_role'
    };
  }

  if (disallowedDefaultRoleIds.size > 0) {
    return {
      ok: false,
      reason:
        `spawn_agent used disallowed default role for: ${formatLifecycleIds(Array.from(disallowedDefaultRoleIds))}. ` +
        'Set a non-default agent_type explicitly.',
      reasonCode: 'default_role_disallowed'
    };
  }

  if (mismatchedRoleIds.size > 0) {
    return {
      ok: false,
      reason: `spawn_agent role mismatch for agent(s): ${formatLifecycleIds(Array.from(mismatchedRoleIds))}`,
      reasonCode: 'role_mismatch'
    };
  }

  return { ok: true };
}

export function buildCollabSubcallPrompt(prompt: string): string {
  return [
    'Use collab tools to run the sub-agent prompt below.',
    'For every spawned agent id, execute this lifecycle in order:',
    '1) spawn_agent with explicit agent_type (never omit it; omission defaults to `default`),',
    '   and prefix the spawned prompt with [agent_type:<same-role>] on the first line',
    '2) wait (for that same id)',
    '3) close_agent (for that same id)',
    'Never leave spawned agents unclosed, including timeout or error paths.',
    'Return only the sub-agent response text and nothing else.',
    '',
    'Sub-agent prompt:',
    prompt
  ].join('\n');
}
