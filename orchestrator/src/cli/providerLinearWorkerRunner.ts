import { spawn, type StdioOptions } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

import { logger } from '../logger.js';
import {
  hasLinearSourceBinding,
  resolveLinearSourceSetup,
  resolveLiveLinearTrackedIssueById,
  type LiveLinearTrackedIssue
} from './control/linearDispatchSource.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';
import { writeJsonAtomic } from './utils/fs.js';
import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext
} from './runtime/index.js';
import { resolveCodexHome } from './utils/codexPaths.js';

export const PROVIDER_LINEAR_WORKER_PROOF_FILENAME = 'provider-linear-worker-proof.json';
const PROVIDER_WORKER_DEFAULT_MAX_TURNS = 20;
const ACTIVE_PROVIDER_ISSUE_STATES = new Set(['todo', 'in progress']);
const TERMINAL_PROVIDER_ISSUE_STATES = new Set(['closed', 'cancelled', 'canceled', 'duplicate', 'done']);
const TERMINAL_PROVIDER_ISSUE_STATE_TYPES = new Set(['completed', 'cancelled', 'canceled']);
const require = createRequire(import.meta.url);
const toml = require('@iarna/toml') as {
  parse: (source: string) => unknown;
};

export interface ProviderLinearWorkerContext {
  manifestPath: string;
  runDir: string;
  repoRoot: string;
  runId: string;
  workspacePath: string | null;
  sourceSetup: DispatchPilotSourceSetup | null;
  issueId: string;
  issueIdentifier: string;
  maxTurns: number;
}

export interface ProviderLinearWorkerTokenUsage {
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
}

export interface ProviderLinearWorkerProof {
  issue_id: string;
  issue_identifier: string;
  thread_id: string | null;
  latest_turn_id: string | null;
  latest_session_id: string | null;
  latest_session_id_source: 'derived_from_thread_and_turn' | null;
  turn_count: number;
  last_event: string | null;
  last_message: string | null;
  last_event_at: string | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rate_limits: Record<string, unknown> | null;
  owner_phase: string;
  owner_status: 'in_progress' | 'succeeded' | 'failed';
  workspace_path: string | null;
  source_setup?: DispatchPilotSourceSetup | null;
  end_reason: string | null;
  updated_at: string;
}

export interface ProviderLinearWorkerJsonlParseResult {
  threadId: string | null;
  turnId: string | null;
  finalMessage: string | null;
  lastEvent: string | null;
  lastEventAt: string | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rateLimits: Record<string, unknown> | null;
}

export interface ProviderLinearWorkerExecRequest {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  mirrorOutput: boolean;
}

export interface ProviderLinearWorkerExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface ProviderLinearWorkerDependencies {
  now: () => string;
  readManifest: (path: string) => Promise<Record<string, unknown>>;
  readTrackedIssue: (input: {
    issueId: string;
    env: NodeJS.ProcessEnv;
    sourceSetup?: DispatchPilotSourceSetup | null;
  }) => Promise<LiveLinearTrackedIssue>;
  resolveRuntimeContext: (
    env: NodeJS.ProcessEnv,
    repoRoot: string,
    runId: string
  ) => Promise<RuntimeCodexCommandContext>;
  execRunner: (request: ProviderLinearWorkerExecRequest) => Promise<ProviderLinearWorkerExecResult>;
  writeProof: (path: string, proof: ProviderLinearWorkerProof) => Promise<void>;
  log: Pick<typeof logger, 'info' | 'warn' | 'error'>;
}

function buildEmptyProviderLinearWorkerTokenUsage(): ProviderLinearWorkerTokenUsage {
  return {
    input_tokens: null,
    output_tokens: null,
    total_tokens: null
  };
}

function defaultExecRunner(
  request: ProviderLinearWorkerExecRequest
): Promise<ProviderLinearWorkerExecResult> {
  return new Promise((resolvePromise, reject) => {
    const stdio: StdioOptions = request.mirrorOutput ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'];
    const child = spawn(request.command, request.args, {
      cwd: request.cwd,
      env: request.env,
      stdio
    });
    let stdout = '';
    let stderr = '';

    if (!request.mirrorOutput) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    child.once('exit', (exitCode) => resolvePromise({ exitCode, stdout, stderr }));
  });
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

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePositiveInteger(value: unknown, source: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
    throw new Error(`${source} must be a positive integer.`);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    if (!/^\d+$/u.test(trimmed)) {
      throw new Error(`${source} must be a positive integer.`);
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  throw new Error(`${source} must be a positive integer.`);
}

async function resolveProviderWorkerMaxTurns(
  env: NodeJS.ProcessEnv,
  readText: (path: string) => Promise<string> = async (path) => await readFile(path, 'utf8')
): Promise<number> {
  const explicitTurns = parsePositiveInteger(
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS) ??
      normalizeOptionalString(env.CO_PROVIDER_WORKER_MAX_TURNS),
    'CODEX_ORCHESTRATOR_PROVIDER_WORKER_MAX_TURNS/CO_PROVIDER_WORKER_MAX_TURNS'
  );
  if (explicitTurns !== null) {
    return explicitTurns;
  }

  const configPath = join(resolveCodexHome(env), 'config.toml');
  let rawConfig: string | null = null;
  try {
    rawConfig = await readText(configPath);
  } catch {
    rawConfig = null;
  }

  if (rawConfig) {
    let parsedConfig: unknown;
    try {
      parsedConfig = toml.parse(rawConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse Codex config TOML at ${configPath}: ${message}`);
    }
    if (isRecord(parsedConfig)) {
      const agentConfig = isRecord(parsedConfig.agent)
        ? parsedConfig.agent
        : parsedConfig['agent.max_turns'];
      const configuredTurns = isRecord(agentConfig)
        ? parsePositiveInteger(agentConfig.max_turns, `${configPath} [agent].max_turns`)
        : parsePositiveInteger(agentConfig, `${configPath} agent.max_turns`);
      if (configuredTurns !== null) {
        return configuredTurns;
      }
    }
  }

  return PROVIDER_WORKER_DEFAULT_MAX_TURNS;
}

function resolveProviderLinearWorkerSourceSetup(
  env: NodeJS.ProcessEnv
): DispatchPilotSourceSetup | null {
  const sourceSetup = resolveLinearSourceSetup(
    {
      provider: 'linear',
      workspace_id: null,
      team_id: null,
      project_id: null
    },
    env
  );
  return hasLinearSourceBinding(sourceSetup) ? sourceSetup : null;
}

export async function loadProviderLinearWorkerContext(
  env: NodeJS.ProcessEnv = process.env,
  readManifest: (path: string) => Promise<Record<string, unknown>> = async (path) =>
    JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>
): Promise<ProviderLinearWorkerContext> {
  const manifestPath = normalizeOptionalString(env.CODEX_ORCHESTRATOR_MANIFEST_PATH);
  if (!manifestPath) {
    throw new Error('CODEX_ORCHESTRATOR_MANIFEST_PATH is required for provider-linear-worker.');
  }
  const manifest = await readManifest(manifestPath);
  const issueId =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_ISSUE_ID) ??
    normalizeOptionalString(manifest.issue_id) ??
    normalizeOptionalString(manifest.issueId);
  const issueIdentifier =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_ISSUE_IDENTIFIER) ??
    normalizeOptionalString(manifest.issue_identifier) ??
    normalizeOptionalString(manifest.issueIdentifier) ??
    issueId;
  if (!issueId || !issueIdentifier) {
    throw new Error('Provider worker requires issue_id and issue_identifier in env or manifest.');
  }
  const repoRoot =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_ROOT) ??
    normalizeOptionalString(manifest.workspace_path) ??
    process.cwd();
  const runId =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_RUN_ID) ??
    normalizeOptionalString(manifest.run_id) ??
    `provider-linear-worker-${Date.now()}`;
  return {
    manifestPath,
    runDir: dirname(manifestPath),
    repoRoot,
    runId,
    workspacePath:
      normalizeOptionalString(manifest.workspace_path) ??
      normalizeOptionalString(manifest.workspacePath) ??
      repoRoot,
    sourceSetup: resolveProviderLinearWorkerSourceSetup(env),
    issueId,
    issueIdentifier,
    maxTurns: await resolveProviderWorkerMaxTurns(env)
  };
}

function buildIssueDescriptionSection(issue: LiveLinearTrackedIssue): string[] {
  const description = normalizeOptionalString((issue as LiveLinearTrackedIssue & { description?: string | null }).description);
  if (!description) {
    return [];
  }
  return ['', 'Issue description:', description];
}

function buildRecentActivitySection(issue: LiveLinearTrackedIssue): string[] {
  if (!issue.recent_activity.length) {
    return [];
  }
  return [
    '',
    'Recent activity:',
    ...issue.recent_activity.map((entry) => `- ${entry.summary}${entry.created_at ? ` at ${entry.created_at}` : ''}`)
  ];
}

function buildBlockersSection(issue: LiveLinearTrackedIssue): string[] {
  if (!issue.blocked_by?.length) {
    return [];
  }
  return [
    '',
    'Known blockers:',
    ...issue.blocked_by.map((entry) => `- ${entry.identifier ?? entry.id ?? 'unknown'} (${entry.state ?? 'unknown'})`)
  ];
}

export function buildProviderWorkerPrompt(
  issue: LiveLinearTrackedIssue,
  turnNumber: number,
  maxTurns: number
): string {
  if (turnNumber > 1) {
    return [
      'Continuation guidance:',
      '',
      '- The previous Codex turn completed normally, but the Linear issue is still in an active state.',
      `- This is continuation turn #${turnNumber} of ${maxTurns} for the current provider worker run.`,
      '- Resume from the current workspace and workpad state instead of restarting from scratch.',
      '- The original task instructions and prior turn context are already present in this thread, so do not restate them before acting.',
      '- Focus on the remaining ticket work and do not end the turn while the issue stays active unless you are truly blocked.'
    ].join('\n');
  }

  return [
    `You are the provider worker for Linear issue ${issue.identifier}: ${issue.title}.`,
    '',
    'Treat this as the full first-turn task prompt for the current worker run.',
    '- Work in the current repository and workspace state.',
    '- Focus on completing the Linear issue in the current workspace.',
    '- Be concrete and action-oriented. Use tools where needed.',
    issue.url ? `- Linear URL: ${issue.url}` : null,
    issue.state ? `- Current state: ${issue.state}` : null,
    `- This is turn #1 of ${maxTurns} for the current worker run.`,
    ...buildIssueDescriptionSection(issue),
    ...buildRecentActivitySection(issue),
    ...buildBlockersSection(issue)
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

export function parseProviderLinearWorkerJsonl(raw: string): ProviderLinearWorkerJsonlParseResult {
  let threadId: string | null = null;
  let turnId: string | null = null;
  let finalMessage: string | null = null;
  let lastEvent: string | null = null;
  let lastEventAt: string | null = null;
  let tokens = buildEmptyProviderLinearWorkerTokenUsage();
  let rateLimits: Record<string, unknown> | null = null;

  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const eventSummary = extractProviderWorkerEventSummary(parsed);
      if (eventSummary.event) {
        lastEvent = eventSummary.event;
      }
      if (eventSummary.at) {
        lastEventAt = eventSummary.at;
      }
      if (eventSummary.message) {
        finalMessage = eventSummary.message;
      }
      const observedTokens = extractProviderWorkerTokenUsage(parsed);
      if (observedTokens && hasProviderWorkerTokenUsage(observedTokens)) {
        tokens = observedTokens;
      }
      const observedRateLimits = extractProviderWorkerRateLimits(parsed);
      if (observedRateLimits) {
        rateLimits = observedRateLimits;
      }
      if (parsed.type === 'thread.started' && typeof parsed.thread_id === 'string') {
        threadId = parsed.thread_id;
        continue;
      }
      if (parsed.type === 'turn_context' && isRecord(parsed.payload)) {
        turnId = normalizeOptionalString(parsed.payload.turn_id) ?? turnId;
        continue;
      }
      if (parsed.type === 'event_msg' && isRecord(parsed.payload)) {
        if (parsed.payload.type === 'task_complete') {
          turnId = normalizeOptionalString(parsed.payload.turn_id) ?? turnId;
        }
        if (parsed.payload.type === 'agent_message') {
          finalMessage = normalizeOptionalString(parsed.payload.message) ?? finalMessage;
        }
        continue;
      }
      if (
        parsed.type === 'response_item' &&
        isRecord(parsed.payload) &&
        parsed.payload.type === 'message' &&
        Array.isArray(parsed.payload.content)
      ) {
        for (const item of parsed.payload.content) {
          if (
            isRecord(item) &&
            item.type === 'output_text' &&
            typeof item.text === 'string'
          ) {
            finalMessage = item.text;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return { threadId, turnId, finalMessage, lastEvent, lastEventAt, tokens, rateLimits };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasProviderWorkerTokenUsage(value: ProviderLinearWorkerTokenUsage): boolean {
  return value.input_tokens !== null || value.output_tokens !== null || value.total_tokens !== null;
}

function extractProviderWorkerEventSummary(input: Record<string, unknown>): {
  event: string | null;
  message: string | null;
  at: string | null;
} {
  const timestamp =
    normalizeOptionalString(input.timestamp) ??
    (isRecord(input.payload)
      ? normalizeOptionalString(input.payload.timestamp) ??
        normalizeOptionalString(input.payload.created_at) ??
        normalizeOptionalString(input.payload.at)
      : null);
  if (input.type === 'event_msg' && isRecord(input.payload)) {
    return {
      event: normalizeOptionalString(input.payload.type),
      message: normalizeOptionalString(input.payload.message),
      at: timestamp
    };
  }
  if (
    input.type === 'response_item' &&
    isRecord(input.payload) &&
    input.payload.type === 'message' &&
    Array.isArray(input.payload.content)
  ) {
    let outputText: string | null = null;
    for (const item of input.payload.content) {
      if (isRecord(item) && item.type === 'output_text') {
        outputText = normalizeOptionalString(item.text) ?? outputText;
      }
    }
    return {
      event: outputText ? 'message' : null,
      message: outputText,
      at: timestamp
    };
  }
  return {
    event: normalizeOptionalString(input.type),
    message: null,
    at: timestamp
  };
}

function extractProviderWorkerTokenUsage(input: unknown): ProviderLinearWorkerTokenUsage | null {
  if (!isRecord(input)) {
    return null;
  }

  const directTotalUsage = findRecordAtPaths(input, [
    ['params', 'msg', 'payload', 'info', 'total_token_usage'],
    ['params', 'msg', 'info', 'total_token_usage'],
    ['params', 'tokenUsage', 'total'],
    ['tokenUsage', 'total']
  ]);
  const normalizedDirectUsage = normalizeProviderWorkerTokenUsage(directTotalUsage);
  if (normalizedDirectUsage) {
    return normalizedDirectUsage;
  }

  const method =
    normalizeOptionalString(input.method) ??
    normalizeOptionalString((input.payload as Record<string, unknown> | undefined)?.method);
  if (method === 'turn/completed' || method === 'turn_completed') {
    const turnUsage = normalizeProviderWorkerTokenUsage(
      findRecordAtPaths(input, [
        ['usage'],
        ['payload', 'usage'],
        ['params', 'usage']
      ])
    );
    if (turnUsage) {
      return turnUsage;
    }
  }

  return null;
}

function normalizeProviderWorkerTokenUsage(
  input: Record<string, unknown> | null
): ProviderLinearWorkerTokenUsage | null {
  if (!input) {
    return null;
  }
  const inputTokens = readTokenCount(input, [
    'input_tokens',
    'inputTokens',
    'total_input_tokens',
    'totalInputTokens',
    'input'
  ]);
  const outputTokens = readTokenCount(input, [
    'output_tokens',
    'outputTokens',
    'total_output_tokens',
    'totalOutputTokens',
    'output'
  ]);
  const totalTokens = readTokenCount(input, [
    'total_tokens',
    'totalTokens',
    'total'
  ]);
  if (inputTokens === null && outputTokens === null && totalTokens === null) {
    return null;
  }
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: totalTokens
  };
}

function readTokenCount(input: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.trunc(value));
    }
  }
  return null;
}

function extractProviderWorkerRateLimits(input: unknown): Record<string, unknown> | null {
  return findRateLimitsRecord(input);
}

function findRateLimitsRecord(input: unknown): Record<string, unknown> | null {
  if (Array.isArray(input)) {
    for (const item of input) {
      const nested = findRateLimitsRecord(item);
      if (nested) {
        return nested;
      }
    }
    return null;
  }
  if (!isRecord(input)) {
    return null;
  }
  if (isProviderWorkerRateLimitsRecord(input)) {
    return input;
  }
  for (const value of Object.values(input)) {
    const nested = findRateLimitsRecord(value);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function isProviderWorkerRateLimitsRecord(input: Record<string, unknown>): boolean {
  const limitId =
    normalizeOptionalString(input.limit_id) ??
    normalizeOptionalString(input.limit_name);
  const hasBucket =
    Object.prototype.hasOwnProperty.call(input, 'primary') ||
    Object.prototype.hasOwnProperty.call(input, 'secondary') ||
    Object.prototype.hasOwnProperty.call(input, 'credits');
  return Boolean(limitId) && hasBucket;
}

function findRecordAtPaths(
  input: Record<string, unknown>,
  paths: string[][]
): Record<string, unknown> | null {
  for (const path of paths) {
    let current: unknown = input;
    let found = true;
    for (const segment of path) {
      if (!isRecord(current)) {
        found = false;
        break;
      }
      current = current[segment];
    }
    if (found && isRecord(current)) {
      return current;
    }
  }
  return null;
}

export function deriveLatestTurnSessionId(input: {
  threadId: string | null;
  turnId: string | null;
}): {
  sessionId: string | null;
  source: ProviderLinearWorkerProof['latest_session_id_source'];
} {
  if (!input.threadId || !input.turnId) {
    return {
      sessionId: null,
      source: null
    };
  }
  return {
    sessionId: `${input.threadId}-${input.turnId}`,
    source: 'derived_from_thread_and_turn'
  };
}

function isTrackedIssueActive(issue: LiveLinearTrackedIssue): boolean {
  const state = normalizeOptionalString(issue.state)?.toLowerCase() ?? null;
  const stateType = normalizeOptionalString(issue.state_type)?.toLowerCase() ?? null;
  const isStartedState = stateType === 'started';
  const isTodoState = state === 'todo';
  const isActiveState = (state !== null && ACTIVE_PROVIDER_ISSUE_STATES.has(state)) || isStartedState;
  if (
    (state === null && !isStartedState) ||
    (state !== null && TERMINAL_PROVIDER_ISSUE_STATES.has(state)) ||
    (stateType !== null && TERMINAL_PROVIDER_ISSUE_STATE_TYPES.has(stateType)) ||
    !isActiveState
  ) {
    return false;
  }
  if (isTodoState && todoIssueBlockedByNonTerminal(issue.blocked_by)) {
    return false;
  }
  return true;
}

function todoIssueBlockedByNonTerminal(
  blockers: LiveLinearTrackedIssue['blocked_by'] | null | undefined
): boolean {
  return (blockers ?? []).some((blocker) => {
    const blockerStateType = normalizeOptionalString(blocker.state_type)?.toLowerCase() ?? null;
    if (blockerStateType !== null) {
      return !TERMINAL_PROVIDER_ISSUE_STATE_TYPES.has(blockerStateType);
    }
    const blockerState = normalizeOptionalString(blocker.state)?.toLowerCase() ?? null;
    return blockerState === null || !TERMINAL_PROVIDER_ISSUE_STATES.has(blockerState);
  });
}

async function resolveProviderLinearWorkerRuntimeContext(
  env: NodeJS.ProcessEnv,
  repoRoot: string,
  runId: string
): Promise<RuntimeCodexCommandContext> {
  const requestedMode = parseRuntimeMode(
    env.CODEX_ORCHESTRATOR_RUNTIME_MODE_ACTIVE ?? env.CODEX_ORCHESTRATOR_RUNTIME_MODE ?? null
  );
  return await createRuntimeCodexCommandContext({
    requestedMode,
    executionMode: 'mcp',
    repoRoot,
    env: { ...process.env, ...env },
    runId
  });
}

async function readTrackedIssueOrThrow(input: {
  issueId: string;
  env: NodeJS.ProcessEnv;
  sourceSetup?: DispatchPilotSourceSetup | null;
}): Promise<LiveLinearTrackedIssue> {
  const resolution = await resolveLiveLinearTrackedIssueById({
    issueId: input.issueId,
    env: input.env,
    sourceSetup: input.sourceSetup
  });
  if (resolution.kind !== 'ready') {
    throw new Error(`Unable to resolve provider issue ${input.issueId}: ${resolution.reason}`);
  }
  return resolution.tracked_issue;
}

function buildProofPath(runDir: string): string {
  return resolve(runDir, PROVIDER_LINEAR_WORKER_PROOF_FILENAME);
}

async function writeProofSnapshot(
  deps: ProviderLinearWorkerDependencies,
  runDir: string,
  proof: ProviderLinearWorkerProof
): Promise<void> {
  await deps.writeProof(buildProofPath(runDir), proof);
}

export async function runProviderLinearWorker(
  env: NodeJS.ProcessEnv = process.env,
  dependencyOverrides: Partial<ProviderLinearWorkerDependencies> = {}
): Promise<ProviderLinearWorkerProof> {
  const deps: ProviderLinearWorkerDependencies = {
    now: () => new Date().toISOString(),
    readManifest: async (path) => JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>,
    readTrackedIssue: readTrackedIssueOrThrow,
    resolveRuntimeContext: resolveProviderLinearWorkerRuntimeContext,
    execRunner: defaultExecRunner,
    writeProof: async (path, proof) => writeJsonAtomic(path, proof),
    log: logger,
    ...dependencyOverrides
  };

  const context = await loadProviderLinearWorkerContext(env, deps.readManifest);
  const runtimeContext = await deps.resolveRuntimeContext(env, context.repoRoot, context.runId);
  deps.log.info(`[provider-linear-worker-runtime] ${formatRuntimeSelectionSummary(runtimeContext.runtime)}`);
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...env,
    ...runtimeContext.env
  };
  if (shouldForceNonInteractive(childEnv)) {
    childEnv.CODEX_NON_INTERACTIVE = childEnv.CODEX_NON_INTERACTIVE ?? '1';
    childEnv.CODEX_NO_INTERACTIVE = childEnv.CODEX_NO_INTERACTIVE ?? '1';
    childEnv.CODEX_INTERACTIVE = childEnv.CODEX_INTERACTIVE ?? '0';
  }

  let finalProof: ProviderLinearWorkerProof = {
    issue_id: context.issueId,
    issue_identifier: context.issueIdentifier,
    thread_id: null,
    latest_turn_id: null,
    latest_session_id: null,
    latest_session_id_source: null,
    turn_count: 0,
    last_event: null,
    last_message: null,
    last_event_at: null,
    tokens: buildEmptyProviderLinearWorkerTokenUsage(),
    rate_limits: null,
    owner_phase: 'bootstrapping',
    owner_status: 'in_progress',
    workspace_path: context.workspacePath,
    source_setup: context.sourceSetup,
    end_reason: null,
    updated_at: deps.now()
  };

  await writeProofSnapshot(deps, context.runDir, finalProof);
  const readTrackedIssueWithFailClosedProof = async (): Promise<LiveLinearTrackedIssue> => {
    try {
      return await deps.readTrackedIssue({
        issueId: context.issueId,
        env: childEnv,
        sourceSetup: context.sourceSetup
      });
    } catch (error) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'tracked_issue_read_failed',
        updated_at: deps.now()
      };
      await writeProofSnapshot(deps, context.runDir, finalProof);
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  let issue = await readTrackedIssueWithFailClosedProof();
  let threadId: string | null = null;
  let turnId: string | null = null;

  if (!isTrackedIssueActive(issue)) {
    finalProof = {
      ...finalProof,
      owner_phase: 'ended',
      owner_status: 'succeeded',
      end_reason: 'issue_inactive',
      updated_at: deps.now()
    };
    await writeProofSnapshot(deps, context.runDir, finalProof);
    return finalProof;
  }

  for (let turnNumber = 1; turnNumber <= context.maxTurns; turnNumber += 1) {
    const prompt = buildProviderWorkerPrompt(issue, turnNumber, context.maxTurns);
    const args =
      turnNumber === 1
        ? ['exec', '--json', prompt]
        : ['exec', 'resume', '--json', threadId ?? '', prompt];
    const resolved = resolveRuntimeCodexCommand(args, runtimeContext);
    const execResult = await deps.execRunner({
      command: resolved.command,
      args: resolved.args,
      cwd: context.repoRoot,
      env: childEnv,
      mirrorOutput: false
    });
    const parsed = parseProviderLinearWorkerJsonl(execResult.stdout);
    threadId = parsed.threadId ?? threadId;
    turnId = parsed.turnId ?? turnId;
    const session = deriveLatestTurnSessionId({ threadId, turnId });

    finalProof = {
      issue_id: context.issueId,
      issue_identifier: context.issueIdentifier,
      thread_id: threadId,
      latest_turn_id: turnId,
      latest_session_id: session.sessionId,
      latest_session_id_source: session.source,
      turn_count: turnNumber,
      last_event: parsed.lastEvent ?? finalProof.last_event,
      last_message: parsed.finalMessage ?? finalProof.last_message,
      last_event_at: parsed.lastEventAt ?? finalProof.last_event_at,
      tokens: hasProviderWorkerTokenUsage(parsed.tokens) ? parsed.tokens : finalProof.tokens,
      rate_limits: parsed.rateLimits ?? finalProof.rate_limits,
      owner_phase: execResult.exitCode === 0 ? 'turn_completed' : 'turn_failed',
      owner_status: execResult.exitCode === 0 ? 'in_progress' : 'failed',
      workspace_path: context.workspacePath,
      source_setup: context.sourceSetup,
      end_reason: null,
      updated_at: deps.now()
    };
    await writeProofSnapshot(deps, context.runDir, finalProof);

    if (execResult.exitCode !== 0) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: `codex_exit_${execResult.exitCode ?? 'unknown'}`,
        updated_at: deps.now()
      };
      await writeProofSnapshot(deps, context.runDir, finalProof);
      throw new Error(
        `provider-linear-worker turn ${turnNumber} failed with exit code ${execResult.exitCode ?? 'unknown'}`
      );
    }

    if (!threadId) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'thread_id_missing',
        updated_at: deps.now()
      };
      await writeProofSnapshot(deps, context.runDir, finalProof);
      throw new Error('provider-linear-worker could not determine thread_id from Codex JSONL output.');
    }

    issue = await readTrackedIssueWithFailClosedProof();
    if (!isTrackedIssueActive(issue)) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'issue_inactive',
        updated_at: deps.now()
      };
      await writeProofSnapshot(deps, context.runDir, finalProof);
      return finalProof;
    }

    if (turnNumber === context.maxTurns) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: 'max_turns_reached_issue_still_active',
        updated_at: deps.now()
      };
      await writeProofSnapshot(deps, context.runDir, finalProof);
      return finalProof;
    }
  }

  finalProof = {
    ...finalProof,
    owner_phase: 'ended',
    owner_status: 'succeeded',
    end_reason: 'worker_completed',
    updated_at: deps.now()
  };
  await writeProofSnapshot(deps, context.runDir, finalProof);
  return finalProof;
}

async function main(): Promise<void> {
  await runProviderLinearWorker();
}

const entry = process.argv[1] ? resolve(process.argv[1]) : null;
const self = resolve(fileURLToPath(import.meta.url));
if (entry && entry === self) {
  main().catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
