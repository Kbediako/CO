import { spawn, type StdioOptions } from 'node:child_process';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { readFile, realpath } from 'node:fs/promises';

import { logger } from '../logger.js';
import {
  computeEffectiveDelegationConfig,
  loadDelegationConfigFiles,
  parseDelegationConfigOverride,
  splitDelegationConfigOverrides,
  type DelegationConfigLayer
} from './config/delegationConfig.js';
import {
  PROVIDER_CONTROL_HOST_RUN_ID_ENV,
  PROVIDER_CONTROL_HOST_TASK_ID_ENV,
  readProviderControlHostLocatorFromEnv,
  readProviderControlHostLocatorFromManifest
} from '../../../scripts/lib/provider-run-contract.js';
import {
  hasLinearSourceBinding,
  resolveLinearSourceSetup,
  resolveLiveLinearTrackedIssueById,
  type LiveLinearTrackedIssue
} from './control/linearDispatchSource.js';
import {
  classifyProviderLinearWorkerLifecycle,
} from './control/providerLinearWorkflowStates.js';
import {
  PROVIDER_LINEAR_AUDIT_ENV_VAR,
  summarizeProviderLinearAuditPath,
  type ProviderLinearAuditSummary
} from './control/providerLinearWorkflowAudit.js';
import type { DispatchPilotSourceSetup } from './control/trackerDispatchPilot.js';
import {
  PROVIDER_WORKSPACE_ROOT_DIRNAME,
  resolveProviderWorkspacePath
} from './run/workspacePath.js';
import { writeJsonAtomic } from './utils/fs.js';
import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext
} from './runtime/index.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import { resolveCodexHome } from './utils/codexPaths.js';

export const PROVIDER_LINEAR_WORKER_PROOF_FILENAME = 'provider-linear-worker-proof.json';
export const PROVIDER_LINEAR_WORKER_AUDIT_FILENAME = 'provider-linear-worker-linear-audit.jsonl';
const PROVIDER_WORKER_DEFAULT_MAX_TURNS = 20;
const PROVIDER_CONTROL_HOST_REFRESH_PATH = '/api/v1/refresh';
const PROVIDER_CONTROL_HOST_REFRESH_TIMEOUT_MS = 15_000;
const CSRF_HEADER = 'x-csrf-token';
const CONFIG_OVERRIDE_ENV_KEYS = ['CODEX_CONFIG_OVERRIDES', 'CODEX_MCP_CONFIG_OVERRIDES'];
const require = createRequire(import.meta.url);
const toml = require('@iarna/toml') as {
  parse: (source: string) => unknown;
};

export interface ProviderLinearWorkerContext {
  manifest: Record<string, unknown>;
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
  linear_audit: ProviderLinearAuditSummary | null;
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

interface ProviderWorkerRunLocation {
  canonicalRunsRoot: string;
  taskId: string;
  runId: string;
}

interface ProviderControlHostManifestTarget {
  currentRun: ProviderWorkerRunLocation;
  manifestPath: string;
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

export function defaultExecRunner(
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

    let settled = false;
    const finalizeError = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    const finalizeSuccess = (result: ProviderLinearWorkerExecResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolvePromise(result);
    };

    child.once('error', (error) => {
      finalizeError(error instanceof Error ? error : new Error(String(error)));
    });
    child.once('close', (exitCode) => {
      finalizeSuccess({ exitCode, stdout, stderr });
    });
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
  const manifestWorkspacePath =
    normalizeOptionalString(manifest.workspace_path) ??
    normalizeOptionalString(manifest.workspacePath);
  const repoRoot =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_ROOT) ??
    manifestWorkspacePath ??
    process.cwd();
  const runId =
    normalizeOptionalString(env.CODEX_ORCHESTRATOR_RUN_ID) ??
    normalizeOptionalString(manifest.run_id) ??
    `provider-linear-worker-${Date.now()}`;
  return {
    manifest,
    manifestPath,
    runDir: dirname(manifestPath),
    repoRoot,
    runId,
    workspacePath: manifestWorkspacePath ?? repoRoot,
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

function buildPreReviewHandoffGateSection(): string[] {
  return [
    '- Treat standalone review plus elegance review as a required pre-review-handoff gate for any non-trivial diff before opening a new PR for review handoff, before updating an already-attached PR for handoff, and before transitioning the issue to `Human Review` or `In Review`.',
    '- Use the repo heuristic for non-trivial work: about 2+ changed files or about 40+ changed lines, unless you record an explicit skip justification in the workpad.',
    '- Run the standalone review first. When manifest-backed evidence matters, use the wrapper-led review path by default; if review tooling is unavailable or stalls without a concrete verdict, do a manual correctness/regressions/missing-tests review plus a manual elegance checklist and record that fallback instead of stalling.',
    '- After addressing standalone-review findings, run an explicit elegance/minimality pass before PR create/update intended for handoff and before the review-state transition.',
    '- Refresh the workpad with the review goal, findings or fallback, and final clean or justified status before handoff.'
  ];
}

export function buildProviderWorkerPrompt(
  issue: LiveLinearTrackedIssue,
  turnNumber: number,
  maxTurns: number,
  helperCommand: string
): string {
  if (turnNumber > 1) {
    return [
      'Continuation guidance:',
      '',
      '- The previous Codex turn completed normally, but the Linear issue is still in an active state.',
      `- This is continuation turn #${turnNumber} of ${maxTurns} for the current provider worker run.`,
      '- The original task instructions and prior turn context are already present in this thread, so do not restate them before acting.',
      `- Keep the same workflow contract and continue using \`${helperCommand}\` for ticket updates with Linear issue id \`${issue.id}\` (not the human identifier \`${issue.identifier}\`).`,
      '- Follow the repo-local workflow skills: `skills/linear/SKILL.md` for workpad, review, and rework behavior, and `skills/land/SKILL.md` for the merge shepherding loop once the issue reaches `Merging`.',
      `- Keep exactly one active \`## Codex Workpad\` comment current, refresh it before new work and before any review handoff, and use \`${helperCommand} issue-context --issue-id ${issue.id}\` to inspect the team workflow states before any transition.`,
      '- If the issue is `Todo` or the live team\'s equivalent queued state (for example `Ready`) and not blocked by a non-terminal dependency, move it into the team\'s actual started state before active coding instead of assuming a fixed state name.',
      `- When you discover a meaningful out-of-scope improvement, use \`${helperCommand} create-follow-up --issue-id ${issue.id} ...\` to file a same-project follow-up issue in \`Backlog\` with a clear title, description, acceptance criteria, a \`related\` link, and optional blocker linkage instead of expanding scope.`,
      '- If a PR is already attached, run a full PR feedback sweep before any new implementation work: review top-level comments, inline review comments, and review summaries; resolve each actionable item or post explicit, justified pushback.',
      ...buildPreReviewHandoffGateSection(),
      '- Review handoff states are `Human Review` and `In Review`; treat `In Review` as the review alias when the team exposes it.',
      '- Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green, actionable PR feedback is handled or explicitly pushed back, the latest `origin/main` is merged into the branch, PR checks are green, and the workpad is refreshed to match completed work.',
      '- `Human Review` and `In Review` are review handoff states for the worker. If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.',
      '- `Merging` and `Rework` are optional active workflow states only when the team exposes them.',
      '- If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges, then move the issue to `Done`.',
      '- If the issue is in `Rework`, treat it as a full approach reset: close the previous PR, remove the previous workpad, create a fresh branch from `origin/main`, then restart execution under a new workpad before handing back to review.',
      '- Stop coding once the issue reaches the team\'s review handoff state (`Human Review` or `In Review`) and end the turn after the handoff is complete.',
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
    `- Use \`${helperCommand}\` for Linear reads and writes in this run with Linear issue id \`${issue.id}\` (not the human identifier \`${issue.identifier}\`).`,
    '- Follow the repo-local workflow skills: `skills/linear/SKILL.md` for workpad, review, and rework behavior, and `skills/land/SKILL.md` for the merge shepherding loop once the issue reaches `Merging`.',
    `- Use \`${helperCommand} issue-context --issue-id ${issue.id}\` to inspect the team workflow states before any transition.`,
    '- If the issue is `Todo` or the live team\'s equivalent queued state (for example `Ready`) and not blocked by a non-terminal dependency, move it into the team\'s actual started state before active coding instead of assuming a fixed state name.',
    `- When you discover a meaningful out-of-scope improvement, use \`${helperCommand} create-follow-up --issue-id ${issue.id} ...\` to file a same-project follow-up issue in \`Backlog\` with a clear title, description, acceptance criteria, a \`related\` link, and optional blocker linkage instead of expanding scope.`,
    '- Maintain exactly one active `## Codex Workpad` comment on the issue. Reuse and update it in place during a single attempt; on `Rework`, remove the old workpad before creating the fresh reset workpad. Do not create extra progress or summary comments.',
    '- If a PR is already attached, run a full PR feedback sweep before any new implementation work: review top-level comments, inline review comments, and review summaries; resolve each actionable item or post explicit, justified pushback.',
    ...buildPreReviewHandoffGateSection(),
    '- Review handoff states are `Human Review` and `In Review`; treat `In Review` as the review alias when the team exposes it.',
    '- Attach the PR to the Linear issue before handing off to the team\'s review state (`Human Review` or `In Review`).',
    '- Before handing off to the team\'s review state (`Human Review` or `In Review`), ensure required validation is green, actionable PR feedback is handled or explicitly pushed back, the latest `origin/main` is merged into the branch, PR checks are green, and the workpad is refreshed to match completed work.',
    '- `Human Review` and `In Review` are stop-coding handoff states. If the issue is in either review state, do not code; refresh the workpad if needed, record the handoff clearly, and end the turn.',
    '- Treat `Merging` and `Rework` as active workflow states only when the team exposes them.',
    '- If the issue is in `Merging`, keep ownership and shepherd the PR through conflicts, checks, and final review until it merges, then move the issue to `Done`.',
    '- If the issue is in `Rework`, treat it as a full approach reset: close the previous PR, remove the previous workpad, create a fresh branch from `origin/main`, then restart execution under a new workpad before handing back to review.',
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

async function resolveProviderWorkerRunLocation(
  currentManifestPath: string,
): Promise<ProviderWorkerRunLocation | null> {
  try {
    const canonicalManifestPath = await realpath(currentManifestPath);
    if (basename(canonicalManifestPath) !== 'manifest.json') {
      return null;
    }
    const canonicalRunDir = dirname(canonicalManifestPath);
    const cliDir = dirname(canonicalRunDir);
    if (basename(cliDir) !== 'cli') {
      return null;
    }
    const taskDir = dirname(cliDir);
    const canonicalRunsRoot = dirname(taskDir);
    if (dirname(canonicalRunsRoot) === canonicalRunsRoot) {
      return null;
    }
    return {
      canonicalRunsRoot,
      taskId: sanitizeTaskId(basename(taskDir)),
      runId: sanitizeRunId(basename(canonicalRunDir))
    };
  } catch {
    return null;
  }
}

async function resolveProviderControlHostManifestPath(
  currentManifestPath: string,
  env: NodeJS.ProcessEnv,
  manifest: Record<string, unknown>
): Promise<ProviderControlHostManifestTarget | null> {
  const locator =
    readProviderControlHostLocatorFromManifest(manifest) ??
    readProviderControlHostLocatorFromEnv({
      [PROVIDER_CONTROL_HOST_TASK_ID_ENV]: env[PROVIDER_CONTROL_HOST_TASK_ID_ENV],
      [PROVIDER_CONTROL_HOST_RUN_ID_ENV]: env[PROVIDER_CONTROL_HOST_RUN_ID_ENV],
      CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE: env.CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE
    });
  if (!locator) {
    return null;
  }
  const currentRun = await resolveProviderWorkerRunLocation(currentManifestPath);
  if (!currentRun) {
    return null;
  }
  return {
    currentRun,
    manifestPath: resolve(
      currentRun.canonicalRunsRoot,
      sanitizeTaskId(locator.taskId),
      'cli',
      sanitizeRunId(locator.runId),
      'manifest.json'
    )
  };
}

function isPathWithinRoot(targetPath: string, rootPath: string): boolean {
  const relativePath = relative(rootPath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function resolveProviderWorkerTaskId(
  currentRun: ProviderWorkerRunLocation,
  manifest: Record<string, unknown>
): string | null {
  const manifestTaskId =
    normalizeOptionalString(manifest.task_id) ??
    normalizeOptionalString(manifest.taskId);
  if (manifestTaskId) {
    const sanitizedTaskId = sanitizeTaskId(manifestTaskId);
    return sanitizedTaskId.length > 0 ? sanitizedTaskId : null;
  }
  return currentRun.taskId.length > 0 ? currentRun.taskId : null;
}

async function readControlEndpointToken(tokenPath: string): Promise<string> {
  const raw = await readFile(tokenPath, 'utf8');
  const trimmed = raw.trim();
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  try {
    const parsed = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed.token === 'string' && parsed.token.trim().length > 0) {
      return parsed.token.trim();
    }
    throw new Error('control auth token invalid');
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    if (looksLikeJson) {
      throw new Error('control auth token invalid');
    }
    // Fall back to plain-text token contents.
  }
  const token = trimmed;
  if (!token) {
    throw new Error('control auth token missing');
  }
  return token;
}

function collectDelegationEnvOverrides(env: NodeJS.ProcessEnv): DelegationConfigLayer[] {
  const layers: DelegationConfigLayer[] = [];
  for (const key of CONFIG_OVERRIDE_ENV_KEYS) {
    const raw = env[key];
    if (!raw) {
      continue;
    }
    const values = splitDelegationConfigOverrides(raw);
    for (const value of values) {
      try {
        const layer = parseDelegationConfigOverride(value, 'env');
        if (layer) {
          layers.push(layer);
        }
      } catch (error) {
        logger.warn(
          `Invalid delegation config override (env): ${(error as Error)?.message ?? String(error)}`
        );
      }
    }
  }
  return layers;
}

async function resolveAllowedControlHostBindHosts(
  repoRoot: string,
  env: NodeJS.ProcessEnv
): Promise<string[] | null> {
  const configFiles = await loadDelegationConfigFiles({ repoRoot, env });
  const layers = [configFiles.global, configFiles.repo, ...collectDelegationEnvOverrides(env)]
    .filter(Boolean) as DelegationConfigLayer[];
  const effective = computeEffectiveDelegationConfig({
    repoRoot,
    layers
  }).ui.allowedBindHosts;
  const hasExplicitAllowedBindHosts = Array.isArray(configFiles.repo?.ui?.allowedBindHosts);
  return hasExplicitAllowedBindHosts ? effective : null;
}

function normalizeControlHostName(host: string): string {
  const trimmed = host.trim().toLowerCase();
  const normalized =
    trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed;
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') {
    return 'loopback';
  }
  return normalized;
}

function validateControlHostBaseUrl(raw: unknown, allowedHosts: string[] | null): URL {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('control base_url missing');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('control base_url invalid');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('control base_url invalid');
  }
  if (parsed.username || parsed.password) {
    throw new Error('control base_url not permitted');
  }
  const normalizedAllowedHosts = new Set(
    (allowedHosts ?? ['127.0.0.1', 'localhost', '::1']).map((entry) =>
      normalizeControlHostName(entry)
    )
  );
  if (!normalizedAllowedHosts.has(normalizeControlHostName(parsed.hostname))) {
    throw new Error('control base_url not permitted');
  }
  return parsed;
}

function isCompatibleControlHostRepoRoot(
  candidateRepoRoot: string,
  workerWorkspacePath: string,
  taskId: string
): boolean {
  const canonicalCandidateRepoRoot = resolve(candidateRepoRoot);
  const canonicalWorkerWorkspacePath = resolve(workerWorkspacePath);
  if (
    canonicalWorkerWorkspacePath === canonicalCandidateRepoRoot &&
    !(
      basename(canonicalWorkerWorkspacePath) === taskId &&
      basename(dirname(canonicalWorkerWorkspacePath)) === PROVIDER_WORKSPACE_ROOT_DIRNAME
    )
  ) {
    return true;
  }
  try {
    return canonicalWorkerWorkspacePath === resolveProviderWorkspacePath(canonicalCandidateRepoRoot, taskId);
  } catch {
    return false;
  }
}

async function resolveProviderControlHostRepoRoot(input: {
  manifestPath: string;
  workerWorkspacePath: string;
  taskId: string;
}): Promise<string | null> {
  const canonicalWorkerWorkspacePath = await realpath(input.workerWorkspacePath).catch(() =>
    resolve(input.workerWorkspacePath)
  );
  const runDerivedRepoRoot = await realpath(
    resolve(dirname(input.manifestPath), '..', '..', '..', '..')
  ).catch(() => null);
  if (
    runDerivedRepoRoot &&
    isCompatibleControlHostRepoRoot(runDerivedRepoRoot, canonicalWorkerWorkspacePath, input.taskId)
  ) {
    return runDerivedRepoRoot;
  }
  try {
    const raw = JSON.parse(await readFile(input.manifestPath, 'utf8')) as Record<string, unknown>;
    const manifestWorkspacePath =
      normalizeOptionalString(raw.workspace_path) ??
      normalizeOptionalString(raw.workspacePath);
    if (!manifestWorkspacePath) {
      return null;
    }
    const canonicalManifestWorkspacePath = await realpath(manifestWorkspacePath);
    return isCompatibleControlHostRepoRoot(
      canonicalManifestWorkspacePath,
      canonicalWorkerWorkspacePath,
      input.taskId
    )
      ? canonicalManifestWorkspacePath
      : null;
  } catch {
    return null;
  }
}

async function requestProviderControlHostRefresh(input: {
  currentManifestPath: string;
  env: NodeJS.ProcessEnv;
  manifest: Record<string, unknown>;
  proof: ProviderLinearWorkerProof;
  repoRoot: string;
  log: Pick<typeof logger, 'warn'>;
}): Promise<void> {
  if (input.proof.owner_phase !== 'ended' || input.proof.owner_status !== 'failed') {
    return;
  }
  try {
    const manifestTarget = await resolveProviderControlHostManifestPath(
      input.currentManifestPath,
      input.env,
      input.manifest
    );
    if (!manifestTarget) {
      return;
    }
    const canonicalManifestPath = await realpath(manifestTarget.manifestPath);
    const canonicalRunsRoot = manifestTarget.currentRun.canonicalRunsRoot;
    if (!isPathWithinRoot(canonicalManifestPath, canonicalRunsRoot)) {
      throw new Error('control-host manifest path invalid');
    }
    const canonicalRunDir = dirname(canonicalManifestPath);
    const workerTaskId = resolveProviderWorkerTaskId(manifestTarget.currentRun, input.manifest);
    if (!workerTaskId) {
      throw new Error('provider task id unavailable');
    }
    const controlHostRepoRoot = await resolveProviderControlHostRepoRoot({
      manifestPath: canonicalManifestPath,
      workerWorkspacePath: input.repoRoot,
      taskId: workerTaskId
    });
    if (!controlHostRepoRoot) {
      throw new Error('control-host repo root unavailable');
    }
    const allowedBindHosts = await resolveAllowedControlHostBindHosts(controlHostRepoRoot, input.env);
    const endpointPath = resolve(canonicalRunDir, 'control_endpoint.json');
    const canonicalEndpointPath = await realpath(endpointPath);
    if (!isPathWithinRoot(canonicalEndpointPath, canonicalRunDir)) {
      throw new Error('control endpoint path invalid');
    }
    const endpointRaw = await readFile(canonicalEndpointPath, 'utf8');
    const endpoint = JSON.parse(endpointRaw) as { base_url?: unknown; token_path?: unknown };
    const baseUrl = validateControlHostBaseUrl(endpoint.base_url, allowedBindHosts);
    const resolvedTokenPath =
      typeof endpoint.token_path === 'string' && endpoint.token_path.trim().length > 0
        ? resolve(canonicalRunDir, endpoint.token_path)
        : resolve(canonicalRunDir, 'control_auth.json');
    if (!isPathWithinRoot(resolvedTokenPath, canonicalRunDir)) {
      throw new Error('control auth path invalid');
    }
    const canonicalTokenPath = await realpath(resolvedTokenPath);
    if (!isPathWithinRoot(canonicalTokenPath, canonicalRunDir)) {
      throw new Error('control auth path invalid');
    }
    const token = await readControlEndpointToken(canonicalTokenPath);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_CONTROL_HOST_REFRESH_TIMEOUT_MS);
    try {
      const response = await fetch(new URL(PROVIDER_CONTROL_HOST_REFRESH_PATH, baseUrl), {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          [CSRF_HEADER]: token
        },
        body: JSON.stringify({
          action: 'refresh',
          source: 'provider-linear-worker',
          issue_id: input.proof.issue_id,
          issue_identifier: input.proof.issue_identifier,
          owner_status: input.proof.owner_status,
          end_reason: input.proof.end_reason
        }),
        signal: controller.signal
      });
      const responseBody = await response.text();
      if (response.status !== 202) {
        const responseDetail = responseBody.trim();
        throw new Error(
          responseDetail
            ? `refresh request failed with status ${response.status}: ${responseDetail}`
            : `refresh request failed with status ${response.status}`
        );
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    const message = (error as Error)?.name === 'AbortError'
      ? 'refresh request timeout'
      : (error as Error)?.message ?? String(error);
    input.log.warn(
      `provider-linear-worker could not request control-host refresh for ${input.proof.issue_identifier}: ${message}`
    );
  }
}

async function writeProofSnapshot(
  deps: ProviderLinearWorkerDependencies,
  runDir: string,
  auditPath: string,
  proof: ProviderLinearWorkerProof
): Promise<ProviderLinearWorkerProof> {
  const hydratedProof = {
    ...proof,
    linear_audit: await summarizeProviderLinearAuditPath(auditPath)
  };
  await deps.writeProof(buildProofPath(runDir), hydratedProof);
  return hydratedProof;
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
  const auditPath = resolve(context.runDir, PROVIDER_LINEAR_WORKER_AUDIT_FILENAME);
  childEnv[PROVIDER_LINEAR_AUDIT_ENV_VAR] = auditPath;
  const helperCommand = resolveProviderLinearHelperCommand(childEnv);
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
    linear_audit: null,
    end_reason: null,
    updated_at: deps.now()
  };

  const persistProof = async (nextProof: ProviderLinearWorkerProof): Promise<ProviderLinearWorkerProof> => {
    const hydratedProof = await writeProofSnapshot(deps, context.runDir, auditPath, nextProof);
    await requestProviderControlHostRefresh({
      currentManifestPath: context.manifestPath,
      env,
      manifest: context.manifest,
      proof: hydratedProof,
      repoRoot: context.repoRoot,
      log: deps.log
    });
    return hydratedProof;
  };

  finalProof = await persistProof(finalProof);
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
      finalProof = await persistProof(finalProof);
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  let issue = await readTrackedIssueWithFailClosedProof();
  let threadId: string | null = null;
  let turnId: string | null = null;
  let lifecycle = classifyProviderLinearWorkerLifecycle(issue);

  if (!lifecycle.isExecutionEligible) {
    finalProof = {
      ...finalProof,
      owner_phase: 'ended',
      owner_status: 'succeeded',
      end_reason: lifecycle.terminalReason,
      updated_at: deps.now()
    };
    finalProof = await persistProof(finalProof);
    return finalProof;
  }

  for (let turnNumber = 1; turnNumber <= context.maxTurns; turnNumber += 1) {
    const prompt = buildProviderWorkerPrompt(issue, turnNumber, context.maxTurns, helperCommand);
    const args =
      turnNumber === 1
        ? ['exec', '--json', prompt]
        : ['exec', 'resume', '--json', threadId ?? '', prompt];
    const resolved = resolveRuntimeCodexCommand(args, runtimeContext);
    let execResult: ProviderLinearWorkerExecResult;
    try {
      execResult = await deps.execRunner({
        command: resolved.command,
        args: resolved.args,
        cwd: context.repoRoot,
        env: childEnv,
        mirrorOutput: false
      });
    } catch (error) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: 'exec_runner_failed',
        updated_at: deps.now()
      };
      finalProof = await persistProof(finalProof);
      throw error instanceof Error ? error : new Error(String(error));
    }
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
      linear_audit: finalProof.linear_audit,
      end_reason: null,
      updated_at: deps.now()
    };
    finalProof = await persistProof(finalProof);

    if (execResult.exitCode !== 0) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'failed',
        end_reason: `codex_exit_${execResult.exitCode ?? 'unknown'}`,
        updated_at: deps.now()
      };
      finalProof = await persistProof(finalProof);
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
      finalProof = await persistProof(finalProof);
      throw new Error('provider-linear-worker could not determine thread_id from Codex JSONL output.');
    }

    issue = await readTrackedIssueWithFailClosedProof();
    lifecycle = classifyProviderLinearWorkerLifecycle(issue);
    if (!lifecycle.isExecutionEligible) {
      finalProof = {
        ...finalProof,
        owner_phase: 'ended',
        owner_status: 'succeeded',
        end_reason: lifecycle.terminalReason,
        updated_at: deps.now()
      };
      finalProof = await persistProof(finalProof);
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
      finalProof = await persistProof(finalProof);
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
  finalProof = await persistProof(finalProof);
  return finalProof;
}

function resolveProviderLinearHelperCommand(env: NodeJS.ProcessEnv): string {
  const packageRoot = normalizeOptionalString(env.CODEX_ORCHESTRATOR_PACKAGE_ROOT);
  if (!packageRoot) {
    return 'codex-orchestrator linear';
  }
  return `node "${join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js')}" linear`;
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
