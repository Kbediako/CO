import { execFile } from 'node:child_process';
import { mkdir, open, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, isAbsolute, join, parse as parsePath, relative, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { logger } from '../logger.js';
import { acquireLockWithRetry, type LockRetryOptions } from '../persistence/lockFile.js';
import { writeAtomicFile } from '../utils/atomicWrite.js';
import {
  buildEmptyProviderLinearWorkerTokenUsage,
  defaultExecRunner,
  parseProviderLinearWorkerJsonl,
  type ProviderLinearWorkerChildLaneParentSnapshot,
  type ProviderLinearWorkerChildLaneScope,
  type ProviderLinearWorkerTokenUsage
} from './providerLinearWorkerRunner.js';
import {
  createRuntimeCodexCommandContext,
  formatRuntimeSelectionSummary,
  parseRuntimeMode,
  resolveRuntimeCodexCommand,
  type RuntimeCodexCommandContext
} from './runtime/index.js';
import {
  buildRunMemoryPromptLines,
  selectRunMemoryForRole
} from './run/runMemoryController.js';
import { resolveProviderLinearChildLaneScopeContract } from './providerLinearChildLanePhaseContract.js';
import { resolveCodexHome } from './utils/codexPaths.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const PROVIDER_LINEAR_CHILD_LANE_APPSERVER_STARTUP_TIMEOUT_MS = 90 * 1000;
const PROVIDER_LINEAR_CHILD_LANE_APPSERVER_STARTUP_POLL_INTERVAL_MS = 250;
const PROVIDER_LINEAR_CHILD_LANE_SCOPE_DRIFT_POLL_INTERVAL_MS = 250;
const PROVIDER_LINEAR_CHILD_LANE_SESSION_LOG_DISCOVERY_WINDOW_MS = 10 * 60 * 1000;
const PROVIDER_LINEAR_CHILD_LANE_SESSION_LOG_HEADER_BYTES = 256 * 1024;
const PROVIDER_LINEAR_CHILD_LANE_SESSION_LOG_MTIME_SKEW_MS = 1000;
let tomlParser: { parse: (source: string) => unknown } | null | undefined;
const PROVIDER_LINEAR_CHILD_LANE_TRUSTED_PROJECT_CONFIG_LOCK_RETRY: LockRetryOptions = {
  maxAttempts: 50,
  initialDelayMs: 10,
  backoffFactor: 1.5,
  maxDelayMs: 250,
  staleMs: 30_000
};

export const PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME = 'provider-linear-child-lane-proof.json';
export const PROVIDER_LINEAR_CHILD_LANE_STREAM_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_STREAM';
export const PROVIDER_LINEAR_CHILD_LANE_PURPOSE_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PURPOSE';
export const PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS';
export const PROVIDER_LINEAR_CHILD_LANE_FILES_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_FILES';
export const PROVIDER_LINEAR_CHILD_LANE_PHASES_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PHASES';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV = 'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE';
export const PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV =
  'CODEX_PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT';

export interface ProviderLinearChildLaneProof {
  issue_id: string;
  issue_identifier: string;
  task_id: string;
  run_id: string;
  parent_run_id: string;
  stream: string;
  purpose: string;
  instructions: string | null;
  scope: ProviderLinearWorkerChildLaneScope;
  parent_snapshot: ProviderLinearWorkerChildLaneParentSnapshot;
  lane_workspace_path: string;
  lane_branch: string;
  patch_artifact_path: string;
  patch_bytes: number;
  thread_id: string | null;
  latest_turn_id: string | null;
  latest_session_id: string | null;
  latest_session_id_source: 'derived_from_thread_and_turn' | null;
  last_event: string | null;
  last_message: string | null;
  last_event_at: string | null;
  tokens: ProviderLinearWorkerTokenUsage;
  rate_limits: Record<string, unknown> | null;
  status: 'succeeded' | 'failed';
  updated_at: string;
}

interface ProviderLinearChildLaneContext {
  manifestPath: string;
  runDir: string;
  repoRoot: string;
  runId: string;
  taskId: string;
  parentRunId: string;
  issueId: string;
  issueIdentifier: string;
  stream: string;
  purpose: string;
  instructions: string | null;
  scope: ProviderLinearWorkerChildLaneScope;
  runMemoryPromptLines: string[];
  parentWorkspacePath: string;
  parentSnapshot: ProviderLinearWorkerChildLaneParentSnapshot;
}

interface ProviderLinearChildLaneRunnerDependencies {
  now: () => string;
  sleep: (ms: number) => Promise<void>;
  execRunner: typeof defaultExecRunner;
  discoverStartupSessionLogPath: (input: {
    env: NodeJS.ProcessEnv;
    workspacePath: string;
    promptNeedles: readonly string[];
    startedAt: string;
  }) => Promise<string | null>;
}

type ProviderLinearChildLaneExecResult = Awaited<ReturnType<typeof defaultExecRunner>>;

interface TrustedProjectCleanupPlan {
  configPath: string;
  anchorProject: string | null;
  removedProjects: string[];
  changed: boolean;
  nextConfig: string | null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTomlParser(): { parse: (source: string) => unknown } {
  if (tomlParser) {
    return tomlParser;
  }
  if (tomlParser === null) {
    throw new Error('Failed to load @iarna/toml.');
  }
  try {
    tomlParser = require('@iarna/toml') as { parse: (source: string) => unknown };
    return tomlParser;
  } catch (error) {
    tomlParser = null;
    throw error;
  }
}

function normalizeProjectPath(value: string): string {
  const resolved = resolve(value);
  const root = parsePath(resolved).root;
  let normalized = resolved;
  while (normalized.length > root.length && /[\\/]$/u.test(normalized)) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function isPathAncestorOf(ancestor: string, candidate: string): boolean {
  const relativePath = relative(ancestor, candidate);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function pathContainsSegment(path: string, segment: string): boolean {
  return normalizeProjectPath(path).split(/[\\/]+/u).includes(segment);
}

function isTrustedProjectEntry(value: unknown): boolean {
  return isRecord(value) && normalizeOptionalString(value.trust_level)?.toLowerCase() === 'trusted';
}

function decodeTomlQuotedString(raw: string): string {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return JSON.parse(raw) as string;
  }
  return raw.slice(1, -1);
}

function isProjectsTableKeyPath(keyPath: string | null): boolean {
  return keyPath === 'projects' || keyPath === '"projects"' || keyPath === '\'projects\'';
}

function parseProjectTableHeader(line: string): string | null {
  const keyPath = parseTomlTableKeyPath(line);
  if (!keyPath) {
    return null;
  }
  const match = keyPath.match(/^(?:"projects"|'projects'|projects)\s*\.\s*("(?:[^"\\]|\\.)*"|'[^']*')\s*$/u);
  if (!match) {
    return null;
  }
  return normalizeProjectPath(decodeTomlQuotedString(match[1]));
}

function parseTomlTableKeyPath(line: string): string | null {
  const match = line
    .trim()
    .match(/^(?:\[\[((?:[^"'\\\]]+|"(?:[^"\\]|\\.)*"|'[^']*')+)\]\]|\[((?:[^"'\\\]]+|"(?:[^"\\]|\\.)*"|'[^']*')+)\])\s*(?:#.*)?$/u);
  return (match?.[1] ?? match?.[2] ?? null)?.trim() ?? null;
}

function parseProjectNamespaceHeader(line: string): string | null {
  const keyPath = parseTomlTableKeyPath(line);
  if (!keyPath) {
    return null;
  }
  const match = keyPath.match(/^(?:"projects"|'projects'|projects)\s*\.\s*("(?:[^"\\]|\\.)*"|'[^']*')(?:\s*\.\s*|$)/u);
  if (!match) {
    return null;
  }
  return normalizeProjectPath(decodeTomlQuotedString(match[1]));
}

function parseInlineProjectEntry(
  line: string,
  currentTableKeyPath: string | null
): string | null {
  const trimmed = line.trim();
  const inlineKeyPattern = /^("(?:[^"\\]|\\.)*"|'[^']*')\s*=\s*\{.*\}\s*(?:#.*)?$/u;
  const dottedInlineKeyPattern =
    /^(?:"projects"|'projects'|projects)\s*\.\s*("(?:[^"\\]|\\.)*"|'[^']*')\s*=\s*\{.*\}\s*(?:#.*)?$/u;
  const inlineMatch =
    isProjectsTableKeyPath(currentTableKeyPath)
      ? trimmed.match(inlineKeyPattern)
      : currentTableKeyPath === null
        ? trimmed.match(dottedInlineKeyPattern)
        : null;
  if (inlineMatch) {
    return normalizeProjectPath(decodeTomlQuotedString(inlineMatch[1]));
  }

  const dottedAssignmentPattern =
    /^("(?:[^"\\]|\\.)*"|'[^']*')\s*\.\s*.+?=\s*(.+)$/u;
  const topLevelDottedAssignmentPattern =
    /^(?:"projects"|'projects'|projects)\s*\.\s*("(?:[^"\\]|\\.)*"|'[^']*')\s*\.\s*.+?=\s*(.+)$/u;
  const dottedMatch =
    isProjectsTableKeyPath(currentTableKeyPath)
      ? trimmed.match(dottedAssignmentPattern)
      : currentTableKeyPath === null
        ? trimmed.match(topLevelDottedAssignmentPattern)
        : null;
  if (!dottedMatch) {
    return null;
  }
  const value = dottedMatch[2].trim();
  if (advanceTomlMultilineStringState(value, null) !== null || advanceTomlArrayDepth(value) > 0) {
    return null;
  }
  return normalizeProjectPath(decodeTomlQuotedString(dottedMatch[1]));
}

type TomlMultilineStringState = 'basic' | 'literal' | null;

function isBackslashEscaped(line: string, index: number): boolean {
  let backslashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && line[cursor] === '\\'; cursor -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
}

function advanceTomlArrayDepth(line: string, initialDepth = 0, multilineStringState: TomlMultilineStringState = null): number {
  let arrayDepth = initialDepth;
  let stringState = multilineStringState;
  for (let index = 0; index < line.length; index += 1) {
    if (stringState === 'basic') {
      if (line.startsWith('"""', index) && !isBackslashEscaped(line, index)) { stringState = null; index += 2; }
      continue;
    }
    if (stringState === 'literal') {
      if (line.startsWith("'''", index)) { stringState = null; index += 2; }
      continue;
    }
    const character = line[index];
    if (character === '#') break;
    if (line.startsWith('"""', index) && !isBackslashEscaped(line, index)) { stringState = 'basic'; index += 2; continue; }
    if (line.startsWith("'''", index)) { stringState = 'literal'; index += 2; continue; }
    if (character === '"' && !isBackslashEscaped(line, index)) {
      for (index += 1; index < line.length && (line[index] !== '"' || isBackslashEscaped(line, index)); index += line[index] === '\\' ? 2 : 1);
      continue;
    }
    if (character === '\'') {
      for (index += 1; index < line.length && line[index] !== '\''; index += 1);
      continue;
    }
    if (character === '[') arrayDepth += 1;
    if (character === ']') arrayDepth = Math.max(0, arrayDepth - 1);
  }
  return arrayDepth;
}

function advanceTomlMultilineStringState(line: string, state: TomlMultilineStringState): TomlMultilineStringState {
  let nextState = state;
  let index = 0;
  while (index < line.length) {
    if (nextState === 'basic') {
      if (line.startsWith('"""', index) && !isBackslashEscaped(line, index)) {
        nextState = null;
        index += 3;
        continue;
      }
      index += line[index] === '\\' ? 2 : 1;
      continue;
    }
    if (nextState === 'literal') {
      if (line.startsWith("'''", index)) {
        nextState = null;
        index += 3;
        continue;
      }
      index += 1;
      continue;
    }
    if (line[index] === '#') {
      break;
    }
    if (line.startsWith('"""', index) && !isBackslashEscaped(line, index)) {
      nextState = 'basic';
      index += 3;
      continue;
    }
    if (line.startsWith("'''", index)) {
      nextState = 'literal';
      index += 3;
      continue;
    }
    if (line[index] === '"' && !isBackslashEscaped(line, index)) {
      index += 1;
      while (index < line.length) {
        if (line[index] === '\\') {
          index += 2;
          continue;
        }
        if (line[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (line[index] === '\'') {
      const literalEnd = line.indexOf('\'', index + 1);
      index = literalEnd === -1 ? line.length : literalEnd + 1;
      continue;
    }
    index += 1;
  }
  return nextState;
}

function findTrustedAncestorProject(
  projects: Record<string, unknown>,
  laneWorkspacePath: string
): string | null {
  const normalizedLaneWorkspacePath = normalizeProjectPath(laneWorkspacePath);
  return Object.entries(projects)
    .map(([path, value]) => ({ path: normalizeProjectPath(path), value }))
    .filter(({ path, value }) =>
      path !== normalizedLaneWorkspacePath
      && isTrustedProjectEntry(value)
      && !pathContainsSegment(path, '.child-lanes')
      && isPathAncestorOf(path, normalizedLaneWorkspacePath)
    )
    .sort((left, right) => right.path.length - left.path.length)
    .map(({ path }) => path)[0] ?? null;
}

function hasTrustedProjectEntry(
  projects: Record<string, unknown>,
  candidatePath: string
): boolean {
  const normalizedCandidatePath = normalizeProjectPath(candidatePath);
  return Object.entries(projects).some(([path, value]) =>
    normalizeProjectPath(path) === normalizedCandidatePath && isTrustedProjectEntry(value)
  );
}

function removeProjectTablesFromRawConfig(rawConfig: string, removableProjects: ReadonlySet<string>): string {
  const lines = rawConfig.split(/\r?\n/u);
  const keptLines: string[] = [];
  let skippingProjectTable: string | null = null;
  let currentTableKeyPath: string | null = null;
  let multilineStringState: TomlMultilineStringState = null;
  let multilineArrayDepth = 0;

  for (const line of lines) {
    const tableHeaderPath = multilineStringState || multilineArrayDepth > 0 ? null : parseTomlTableKeyPath(line);
    if (skippingProjectTable) {
      if (!tableHeaderPath || parseProjectNamespaceHeader(line) === skippingProjectTable) {
        multilineArrayDepth = advanceTomlArrayDepth(line, multilineArrayDepth, multilineStringState);
        multilineStringState = advanceTomlMultilineStringState(line, multilineStringState);
        continue;
      }
      skippingProjectTable = null;
    }

    const projectHeaderPath = tableHeaderPath ? parseProjectTableHeader(line) : null;
    if (projectHeaderPath && removableProjects.has(projectHeaderPath)) {
      skippingProjectTable = projectHeaderPath;
      multilineStringState = advanceTomlMultilineStringState(line, multilineStringState);
      continue;
    }

    const inlineProjectPath =
      tableHeaderPath || multilineStringState
        ? null
        : parseInlineProjectEntry(line, currentTableKeyPath);
    if (inlineProjectPath && removableProjects.has(inlineProjectPath)) {
      multilineArrayDepth = advanceTomlArrayDepth(line, multilineArrayDepth, multilineStringState);
      multilineStringState = advanceTomlMultilineStringState(line, multilineStringState);
      continue;
    }

    keptLines.push(line);
    multilineArrayDepth = advanceTomlArrayDepth(line, multilineArrayDepth, multilineStringState);
    multilineStringState = advanceTomlMultilineStringState(line, multilineStringState);
    if (tableHeaderPath) {
      currentTableKeyPath = tableHeaderPath.trim();
    }
  }

  const nextConfig = keptLines.join('\n');
  return rawConfig.endsWith('\n') && !nextConfig.endsWith('\n') ? `${nextConfig}\n` : nextConfig;
}

function planTrustedProjectCleanup(input: {
  rawConfig: string;
  laneWorkspacePath: string;
  configPath: string;
}): TrustedProjectCleanupPlan {
  const parsed = getTomlParser().parse(input.rawConfig);
  if (!isRecord(parsed) || !isRecord(parsed.projects)) {
    return {
      configPath: input.configPath,
      anchorProject: null,
      removedProjects: [],
      changed: false,
      nextConfig: null
    };
  }

  const projects = parsed.projects as Record<string, unknown>;
  const anchorProject = findTrustedAncestorProject(projects, input.laneWorkspacePath);
  if (!anchorProject) {
    return {
      configPath: input.configPath,
      anchorProject: null,
      removedProjects: [],
      changed: false,
      nextConfig: null
    };
  }

  const normalizedLaneWorkspacePath = normalizeProjectPath(input.laneWorkspacePath);
  const removedProjects = hasTrustedProjectEntry(projects, normalizedLaneWorkspacePath)
    ? [normalizedLaneWorkspacePath]
    : [];

  if (removedProjects.length === 0) {
    return {
      configPath: input.configPath,
      anchorProject,
      removedProjects: [],
      changed: false,
      nextConfig: null
    };
  }

  const nextConfig = removeProjectTablesFromRawConfig(input.rawConfig, new Set(removedProjects));
  return {
    configPath: input.configPath,
    anchorProject,
    removedProjects,
    changed: nextConfig !== input.rawConfig,
    nextConfig
  };
}

async function compactRedundantTrustedChildLaneProjects(input: {
  env: NodeJS.ProcessEnv;
  laneWorkspacePath: string;
}): Promise<TrustedProjectCleanupPlan> {
  const configPath = join(resolveCodexHome(input.env), 'config.toml');
  const lockPath = `${configPath}.lock`;
  const lock = await acquireLockWithRetry({
    taskId: configPath,
    lockPath,
    retry: PROVIDER_LINEAR_CHILD_LANE_TRUSTED_PROJECT_CONFIG_LOCK_RETRY,
    ensureDirectory: async () => {
      await mkdir(dirname(lockPath), { recursive: true });
    },
    createError: (_taskId, attempts) =>
      new Error(
        `Failed to acquire provider-linear-child-lane trusted-project config lock after ${attempts} attempts.`
      )
  });
  try {
    let rawConfig: string;
    try {
      rawConfig = await readFile(configPath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          configPath,
          anchorProject: null,
          removedProjects: [],
          changed: false,
          nextConfig: null
        };
      }
      throw error;
    }

    const plan = planTrustedProjectCleanup({
      rawConfig,
      laneWorkspacePath: input.laneWorkspacePath,
      configPath
    });
    if (plan.changed && plan.nextConfig !== null) {
      await writeAtomicFile(configPath, plan.nextConfig, { ensureDir: true, encoding: 'utf8' });
    }
    return plan;
  } finally {
    await lock.release();
  }
}

async function compactRedundantTrustedChildLaneProjectsBestEffort(input: {
  env: NodeJS.ProcessEnv;
  laneWorkspacePath: string;
}): Promise<void> {
  try {
    const cleanup = await compactRedundantTrustedChildLaneProjects(input);
    if (cleanup.removedProjects.length > 0) {
      logger.info(
        `[provider-linear-child-lane-trust] removed ${cleanup.removedProjects.length} child-lane trusted project entr${cleanup.removedProjects.length === 1 ? 'y' : 'ies'} from ${cleanup.configPath} using ancestor ${cleanup.anchorProject}.`
      );
    }
  } catch (error) {
    logger.warn(
      `provider-linear-child-lane warning: failed to compact redundant trusted project entries in ${join(resolveCodexHome(input.env), 'config.toml')}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function normalizeStringArrayFromEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => normalizeOptionalString(entry))
      .filter((entry): entry is string => entry !== null);
  } catch {
    return [];
  }
}

function ensurePathWithinRoot(root: string, candidate: string): string {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidate);
  const relativePath = relative(resolvedRoot, resolvedCandidate);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Path escapes parent workspace boundary: ${candidate}`);
  }
  return resolvedCandidate;
}

function deriveLatestTurnSessionId(input: {
  threadId: string | null;
  turnId: string | null;
}): {
  sessionId: string | null;
  source: 'derived_from_thread_and_turn' | null;
} {
  if (!input.threadId || !input.turnId) {
    return { sessionId: null, source: null };
  }
  return {
    sessionId: `${input.threadId}-${input.turnId}`,
    source: 'derived_from_thread_and_turn'
  };
}

function buildChildLanePromptHeader(issueIdentifier: string): string {
  return `You are a bounded same-issue child lane for Linear issue ${issueIdentifier}.`;
}

function buildChildLanePrompt(context: ProviderLinearChildLaneContext): string {
  const scopeLines = [
    context.scope.files.length > 0
      ? `- File scope: ${context.scope.files.join(', ')}`
      : '- File scope: none declared',
    context.scope.phases.length > 0
      ? `- Phase scope: ${context.scope.phases.join(', ')}`
      : '- Phase scope: none declared'
  ];
  return [
    buildChildLanePromptHeader(context.issueIdentifier),
    '',
    'Constraints:',
    '- Work only inside this lane workspace. The parent lane owns the authoritative issue workspace, Linear state, workpad, and PR lifecycle.',
    '- Stay strictly inside the declared scope below. Do not edit files outside the declared file or phase scope.',
    '- If the change cannot be completed within that scope, stop and report back to the parent lane so it can relaunch with widened ownership.',
    '- Do not call Linear mutation helpers. Parent-owned integration happens by patch artifact only.',
    '- Do not run full repo validation suites. Keep checks tightly scoped to the touched area when needed.',
    '- If the lane is advisory/read-only and no file changes are needed, finish with a concise evidence summary. The parent will classify a zero-byte patch as no-output advisory evidence, not as an applicable patch.',
    '',
    `Purpose: ${context.purpose}`,
    ...scopeLines,
    ...(context.runMemoryPromptLines.length > 0 ? ['', ...context.runMemoryPromptLines] : []),
    '',
    context.instructions ? `Additional instructions:\n${context.instructions}` : 'Additional instructions: none.',
    '',
    'Finish by leaving the lane workspace changes in place for patch export. Do not commit.'
  ].join('\n');
}

function buildProviderLinearChildLaneSessionPromptNeedles(
  context: ProviderLinearChildLaneContext
): string[] {
  return [buildChildLanePromptHeader(context.issueIdentifier)];
}

function buildProviderLinearChildLaneRecentSessionDayDirs(
  sessionRoot: string,
  referenceDates: readonly Date[]
): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  for (const referenceDate of referenceDates) {
    for (const dayOffset of [0, -1]) {
      const current = new Date(referenceDate.getTime());
      current.setDate(current.getDate() + dayOffset);
      const dir = join(
        sessionRoot,
        String(current.getFullYear()),
        String(current.getMonth() + 1).padStart(2, '0'),
        String(current.getDate()).padStart(2, '0')
      );
      if (!seen.has(dir)) {
        seen.add(dir);
        results.push(dir);
      }
    }
  }
  return results;
}

function providerLinearChildLaneSessionLogPathMatchesThreadId(path: string, threadId: string): boolean {
  return basename(path, '.jsonl').endsWith(`-${threadId}`);
}

async function readProviderLinearChildLaneFilePrefix(path: string, maxBytes: number): Promise<string> {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    await handle.close();
  }
}

function parseProviderLinearChildLaneSessionJsonlLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function commandShowsParentOwnedScopeDrift(command: string): boolean {
  return (
    /\bgh\b/u.test(command) ||
    /\bgit\s+(?:commit|push)\b/u.test(command) ||
    /codex-orchestrator(?:\.js)?(?:["'\s]|$).*?\slinear\b/u.test(command)
  );
}

function queryShowsParentOwnedScopeDrift(query: string): boolean {
  if (/\bgithub\b/iu.test(query) || /\bpull request\b/iu.test(query)) {
    return true;
  }
  return (
    /\blinear\b/iu.test(query) &&
    /\b(?:issue|issues|ticket|tickets|project|projects|comment|comments|status|state|workflow)\b/iu.test(
      query
    )
  );
}

function formatProviderLinearChildLaneScopeDriftEvidence(
  timestamp: string | null,
  detail: string
): string {
  return timestamp ? `${timestamp} ${detail}` : detail;
}

function truncateProviderLinearChildLaneScopeDriftText(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function extractProviderLinearChildLaneScopeDriftEvidenceFromRecord(
  record: Record<string, unknown>
): string[] {
  const timestamp = normalizeOptionalString(record.timestamp);
  if (normalizeOptionalString(record.type) !== 'response_item') {
    return [];
  }
  const payload =
    typeof record.payload === 'object' && record.payload !== null
      ? (record.payload as Record<string, unknown>)
      : null;
  if (!payload) {
    return [];
  }
  const payloadType = normalizeOptionalString(payload.type);
  if (payloadType === 'tool_search_call') {
    const argumentsValue =
      typeof payload.arguments === 'object' && payload.arguments !== null
        ? (payload.arguments as Record<string, unknown>)
        : null;
    const query = normalizeOptionalString(argumentsValue?.query);
    if (query && queryShowsParentOwnedScopeDrift(query)) {
      return [
        formatProviderLinearChildLaneScopeDriftEvidence(
          timestamp,
          `tool_search ${truncateProviderLinearChildLaneScopeDriftText(query)}`
        )
      ];
    }
    return [];
  }
  if (payloadType !== 'function_call') {
    return [];
  }
  const functionName = normalizeOptionalString(payload.name);
  if (!functionName) {
    return [];
  }
  if (functionName.includes('github') || functionName.includes('linear')) {
    return [
      formatProviderLinearChildLaneScopeDriftEvidence(timestamp, `function_call ${functionName}`)
    ];
  }
  if (functionName !== 'exec_command') {
    return [];
  }
  const rawArguments = normalizeOptionalString(payload.arguments);
  if (!rawArguments) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawArguments) as Record<string, unknown>;
    const command = normalizeOptionalString(parsed.cmd);
    if (!command || !commandShowsParentOwnedScopeDrift(command)) {
      return [];
    }
    return [
      formatProviderLinearChildLaneScopeDriftEvidence(
        timestamp,
        `exec_command ${truncateProviderLinearChildLaneScopeDriftText(command)}`
      )
    ];
  } catch {
    return [];
  }
}

async function scanProviderLinearChildLaneSessionLogForParentScopeDrift(
  sessionLogPath: string
): Promise<string[]> {
  const raw = await readFile(sessionLogPath, 'utf8');
  const evidence = new Set<string>();
  for (const line of raw.split(/\r?\n/u)) {
    const parsed = parseProviderLinearChildLaneSessionJsonlLine(line);
    if (!parsed) {
      continue;
    }
    for (const detail of extractProviderLinearChildLaneScopeDriftEvidenceFromRecord(parsed)) {
      evidence.add(detail);
      if (evidence.size >= 3) {
        return [...evidence];
      }
    }
  }
  return [...evidence];
}

function buildProviderLinearChildLaneScopeDriftMessage(input: {
  context: Pick<ProviderLinearChildLaneContext, 'issueIdentifier'>;
  sessionLogPath: string;
  evidence: readonly string[];
}): string {
  const renderedEvidence = input.evidence.map((entry) => `"${entry}"`).join('; ');
  return `Appserver child lane drifted into parent-owned GitHub/Linear/PR lifecycle work for ${input.context.issueIdentifier}. Session log ${basename(input.sessionLogPath)} captured ${renderedEvidence}. Invalidate the lane and relaunch with tighter bounded scope; parent-owned Linear/GitHub/PR handling must stay in the provider worker.`;
}

async function waitForProviderLinearChildLaneScopeDrift(input: {
  context: Pick<ProviderLinearChildLaneContext, 'issueIdentifier'>;
  sessionLogPath: string;
  isExecSettled: () => boolean;
  deps: Pick<ProviderLinearChildLaneRunnerDependencies, 'sleep'>;
}): Promise<string | null> {
  while (!input.isExecSettled()) {
    const evidence = await scanProviderLinearChildLaneSessionLogForParentScopeDrift(input.sessionLogPath).catch(
      () => []
    );
    if (evidence.length > 0) {
      return buildProviderLinearChildLaneScopeDriftMessage({
        context: input.context,
        sessionLogPath: input.sessionLogPath,
        evidence
      });
    }
    await input.deps.sleep(PROVIDER_LINEAR_CHILD_LANE_SCOPE_DRIFT_POLL_INTERVAL_MS);
  }
  return null;
}

function valueContainsProviderLinearChildLaneSessionNeedle(value: unknown, needle: string): boolean {
  if (typeof value === 'string') {
    return value.includes(needle);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueContainsProviderLinearChildLaneSessionNeedle(item, needle));
  }
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).some((item) =>
    valueContainsProviderLinearChildLaneSessionNeedle(item, needle)
  );
}

function valueEqualsProviderLinearChildLaneSessionNeedle(value: unknown, needle: string): boolean {
  if (typeof value === 'string') {
    return value === needle;
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueEqualsProviderLinearChildLaneSessionNeedle(item, needle));
  }
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Object.values(value).some((item) =>
    valueEqualsProviderLinearChildLaneSessionNeedle(item, needle)
  );
}

function prefixContainsProviderLinearChildLaneSessionHeader(
  prefix: string,
  workspacePath: string,
  promptNeedles: readonly string[]
): boolean {
  let hasExactWorkspacePath = false;
  let hasPromptNeedle = promptNeedles.some((needle) => prefix.includes(needle));
  for (const line of prefix.split(/\r?\n/u)) {
    const parsed = parseProviderLinearChildLaneSessionJsonlLine(line);
    const payload =
      parsed?.type === 'session_meta' && parsed.payload && typeof parsed.payload === 'object'
        ? (parsed.payload as Record<string, unknown>)
        : parsed?.payload && typeof parsed.payload === 'object'
          ? (parsed.payload as Record<string, unknown>)
          : null;
    if (!payload) {
      continue;
    }
    hasExactWorkspacePath =
      hasExactWorkspacePath || valueEqualsProviderLinearChildLaneSessionNeedle(payload, workspacePath);
    if (!hasPromptNeedle) {
      hasPromptNeedle = promptNeedles.some((needle) =>
        valueContainsProviderLinearChildLaneSessionNeedle(payload, needle)
      );
    }
    if (hasExactWorkspacePath && hasPromptNeedle) {
      return true;
    }
  }
  return false;
}

function prefixHasProviderLinearChildLaneSessionTimestampAtOrAfter(
  prefix: string,
  startedAtMs: number
): boolean {
  if (!Number.isFinite(startedAtMs)) {
    return false;
  }
  for (const line of prefix.split(/\r?\n/u)) {
    const parsed = parseProviderLinearChildLaneSessionJsonlLine(line);
    if (parsed?.type !== 'session_meta' && parsed?.type !== 'turn_context') {
      continue;
    }
    const timestamp =
      typeof parsed?.timestamp === 'string' ? Date.parse(parsed.timestamp) : Number.NaN;
    if (Number.isFinite(timestamp) && timestamp >= startedAtMs) {
      return true;
    }
  }
  return false;
}

async function discoverProviderLinearChildLaneSessionLogPath(input: {
  env: NodeJS.ProcessEnv;
  workspacePath: string;
  promptNeedles: readonly string[];
  startedAt: string;
}): Promise<string | null> {
  const sessionRoot = join(resolveCodexHome(input.env), 'sessions');
  const startedAtMs = Date.parse(input.startedAt);
  const referenceDate = Number.isFinite(startedAtMs) ? new Date(startedAtMs) : new Date();
  const currentDate = new Date();
  const cutoffMs = Number.isFinite(startedAtMs)
    ? startedAtMs - PROVIDER_LINEAR_CHILD_LANE_SESSION_LOG_DISCOVERY_WINDOW_MS
    : Date.now() - PROVIDER_LINEAR_CHILD_LANE_SESSION_LOG_DISCOVERY_WINDOW_MS;
  const threadIdHint = normalizeOptionalString(input.env.CODEX_THREAD_ID);
  const sessionMetaNeedle = threadIdHint ? `"id":"${threadIdHint}"` : null;
  const candidates: Array<{ path: string; mtimeMs: number }> = [];

  for (const dayDir of buildProviderLinearChildLaneRecentSessionDayDirs(sessionRoot, [
    currentDate,
    referenceDate
  ])) {
    let entries: string[];
    try {
      entries = await readdir(dayDir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.startsWith('rollout-') || !entry.endsWith('.jsonl')) {
        continue;
      }
      const candidatePath = join(dayDir, entry);
      let fileStat;
      try {
        fileStat = await stat(candidatePath);
      } catch {
        continue;
      }
      if (!fileStat.isFile() || fileStat.mtimeMs < cutoffMs) {
        continue;
      }
      candidates.push({ path: candidatePath, mtimeMs: fileStat.mtimeMs });
    }
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const requireThreadHint of threadIdHint ? [true, false] : [false]) {
    for (const candidate of candidates) {
      let prefix: string;
      try {
        prefix = await readProviderLinearChildLaneFilePrefix(
          candidate.path,
          PROVIDER_LINEAR_CHILD_LANE_SESSION_LOG_HEADER_BYTES
        );
      } catch {
        continue;
      }
      const matchesThreadHint =
        !threadIdHint ||
        providerLinearChildLaneSessionLogPathMatchesThreadId(candidate.path, threadIdHint) ||
        (sessionMetaNeedle !== null && prefix.includes(sessionMetaNeedle));
      if (requireThreadHint && !matchesThreadHint) {
        continue;
      }
      if (!requireThreadHint && Number.isFinite(startedAtMs) && candidate.mtimeMs < startedAtMs) {
        const mtimeWithinSkewWindow =
          candidate.mtimeMs + PROVIDER_LINEAR_CHILD_LANE_SESSION_LOG_MTIME_SKEW_MS >= startedAtMs;
        if (
          !mtimeWithinSkewWindow ||
          !prefixHasProviderLinearChildLaneSessionTimestampAtOrAfter(prefix, startedAtMs)
        ) {
          continue;
        }
      }
      if (
        prefixContainsProviderLinearChildLaneSessionHeader(
          prefix,
          input.workspacePath,
          input.promptNeedles
        )
      ) {
        return candidate.path;
      }
    }
  }
  return null;
}

function buildProviderLinearChildLaneAppserverStartupTimeoutMessage(
  context: ProviderLinearChildLaneContext,
  timeoutMs: number
): string {
  const timeoutSeconds = Math.max(1, Math.floor(timeoutMs / 1000));
  return `Appserver child lane startup stalled after runtime selection for ${timeoutSeconds}s without matching session-log startup evidence. Invalidate the lane and relaunch under CLI, or inspect appserver session startup for ${context.issueIdentifier}.`;
}

async function waitForProviderLinearChildLaneAppserverStartup(input: {
  context: ProviderLinearChildLaneContext;
  laneWorkspacePath: string;
  env: NodeJS.ProcessEnv;
  startedAt: string;
  isExecSettled: () => boolean;
  deps: ProviderLinearChildLaneRunnerDependencies;
}): Promise<string | null> {
  const promptNeedles = buildProviderLinearChildLaneSessionPromptNeedles(input.context);
  const currentClockMs = (): number => {
    const parsed = Date.parse(input.deps.now());
    return Number.isFinite(parsed) ? parsed : Date.now();
  };
  const startClockMs = currentClockMs();
  const startupDeadlineMs =
    startClockMs + PROVIDER_LINEAR_CHILD_LANE_APPSERVER_STARTUP_TIMEOUT_MS;
  for (;;) {
    if (input.isExecSettled()) {
      return null;
    }
    const remainingBeforeDiscoveryMs = startupDeadlineMs - currentClockMs();
    if (remainingBeforeDiscoveryMs < 0) {
      break;
    }
    const sessionLogPath = await input.deps.discoverStartupSessionLogPath({
      env: input.env,
      workspacePath: input.laneWorkspacePath,
      promptNeedles,
      startedAt: input.startedAt
    });
    if (sessionLogPath) {
      return sessionLogPath;
    }
    const remainingAfterDiscoveryMs = startupDeadlineMs - currentClockMs();
    if (remainingAfterDiscoveryMs <= 0) {
      break;
    }
    const nextSleepMs = Math.min(
      PROVIDER_LINEAR_CHILD_LANE_APPSERVER_STARTUP_POLL_INTERVAL_MS,
      remainingAfterDiscoveryMs
    );
    await input.deps.sleep(nextSleepMs);
  }
  throw new Error(
    buildProviderLinearChildLaneAppserverStartupTimeoutMessage(
      input.context,
      PROVIDER_LINEAR_CHILD_LANE_APPSERVER_STARTUP_TIMEOUT_MS
    )
  );
}

async function recoverProviderLinearChildLaneExecResultAfterAbort(input: {
  abortController: AbortController;
  error: Error;
  execPromise: Promise<ProviderLinearChildLaneExecResult> | null;
  execSettled: boolean;
}): Promise<ProviderLinearChildLaneExecResult | null> {
  if (!input.execSettled) {
    input.abortController.abort(input.error);
  }
  if (!input.execPromise) {
    return null;
  }
  try {
    return await input.execPromise;
  } catch {
    return null;
  }
}

async function resolveChildLaneRuntimeContext(
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

async function loadProviderLinearChildLaneContext(
  env: NodeJS.ProcessEnv = process.env
): Promise<ProviderLinearChildLaneContext> {
  const manifestPath = normalizeOptionalString(env.CODEX_ORCHESTRATOR_MANIFEST_PATH);
  if (!manifestPath) {
    throw new Error('CODEX_ORCHESTRATOR_MANIFEST_PATH is required for provider-linear-child-lane.');
  }
  const rawManifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8')) as Record<string, unknown>;
  const runDir = dirname(resolve(manifestPath));
  const repoRoot = normalizeOptionalString(env.CODEX_ORCHESTRATOR_ROOT) ?? process.cwd();
  const runId = normalizeOptionalString(rawManifest.run_id) ?? normalizeOptionalString(env.CODEX_ORCHESTRATOR_RUN_ID);
  const taskId = normalizeOptionalString(rawManifest.task_id) ?? normalizeOptionalString(env.CODEX_ORCHESTRATOR_TASK_ID);
  const parentRunId = normalizeOptionalString(rawManifest.parent_run_id);
  const issueId = normalizeOptionalString(rawManifest.issue_id);
  const issueIdentifier = normalizeOptionalString(rawManifest.issue_identifier);
  const stream = normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_STREAM_ENV]);
  const purpose = normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PURPOSE_ENV]);
  const parentWorkspacePath = normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_WORKSPACE_PATH_ENV]);
  const rawScope: ProviderLinearWorkerChildLaneScope = {
    files: normalizeStringArrayFromEnv(env[PROVIDER_LINEAR_CHILD_LANE_FILES_ENV]),
    phases: normalizeStringArrayFromEnv(env[PROVIDER_LINEAR_CHILD_LANE_PHASES_ENV])
  };
  let scope: ProviderLinearWorkerChildLaneScope;
  try {
    scope = resolveProviderLinearChildLaneScopeContract(rawScope);
  } catch (error) {
    throw new Error(
      `provider-linear-child-lane scope is invalid: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (
    !runId ||
    !taskId ||
    !parentRunId ||
    !issueId ||
    !issueIdentifier ||
    !stream ||
    !purpose ||
    !parentWorkspacePath ||
    (rawScope.files.length === 0 && rawScope.phases.length === 0)
  ) {
    throw new Error('provider-linear-child-lane context is missing required manifest or env fields.');
  }
  const capturedAt = new Date().toISOString();
  return {
    manifestPath: resolve(manifestPath),
    runDir,
    repoRoot: resolve(repoRoot),
    runId,
    taskId,
    parentRunId,
    issueId,
    issueIdentifier,
    stream,
    purpose,
    instructions: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_INSTRUCTIONS_ENV]),
    scope,
    runMemoryPromptLines: buildRunMemoryPromptLines(
      selectRunMemoryForRole({
        role: 'delegate',
        manifest: rawManifest,
        hints: [purpose, ...scope.files, ...scope.phases]
      })
    ),
    parentWorkspacePath: resolve(parentWorkspacePath),
    parentSnapshot: {
      base_sha: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_BASE_SHA_ENV]),
      issue_updated_at: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_UPDATED_AT_ENV]),
      issue_state: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_ENV]),
      issue_state_type: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_ISSUE_STATE_TYPE_ENV]),
      captured_at: normalizeOptionalString(env[PROVIDER_LINEAR_CHILD_LANE_PARENT_SNAPSHOT_CAPTURED_AT_ENV]) ?? capturedAt
    }
  };
}

function sanitizeChildLaneStreamSegment(stream: string): string {
  const collapsed = stream.trim().replaceAll('\\', '/').split('/').map((segment) => segment.trim()).filter(Boolean).join('-');
  const sanitized = collapsed
    .replace(/[^A-Za-z0-9._-]+/gu, '-')
    .replace(/\.{2,}/gu, '-')
    .replace(/^-+/u, '')
    .replace(/-+$/u, '')
    .replace(/^\.+/u, '')
    .replace(/\.+$/u, '');
  return sanitized.length > 0 ? sanitized : 'lane';
}

async function prepareLaneWorkspace(
  context: ProviderLinearChildLaneContext
): Promise<{ laneWorkspacePath: string; laneBranch: string }> {
  const safeStream = sanitizeChildLaneStreamSegment(context.stream);
  const laneWorkspacePath = ensurePathWithinRoot(
    context.parentWorkspacePath,
    join(context.parentWorkspacePath, '.child-lanes', `${safeStream}-${context.runId}`)
  );
  const laneBranch = `child-lane/${safeStream}-${context.runId}`.slice(0, 120);
  await rm(laneWorkspacePath, { recursive: true, force: true });
  await mkdir(dirname(laneWorkspacePath), { recursive: true });
  await execFileAsync('git', ['clone', '--local', context.parentWorkspacePath, laneWorkspacePath]);
  const baseSha = context.parentSnapshot.base_sha ?? 'HEAD';
  await execFileAsync('git', ['-C', laneWorkspacePath, 'checkout', '--detach', baseSha]);
  await execFileAsync('git', ['-C', laneWorkspacePath, 'switch', '-c', laneBranch]);
  const remotes = (
    await execFileAsync('git', ['-C', laneWorkspacePath, 'remote'], {
      maxBuffer: 1024 * 1024
    })
  ).stdout
    .split(/\r?\n/u)
    .map((entry) => normalizeOptionalString(entry))
    .filter((entry): entry is string => entry !== null);
  for (const remote of remotes) {
    await execFileAsync('git', [
      '-C',
      laneWorkspacePath,
      'remote',
      'set-url',
      '--push',
      remote,
      'no_push://provider-linear-child-lane'
    ]);
  }
  return { laneWorkspacePath, laneBranch };
}

async function createPatchArtifact(
  laneWorkspacePath: string,
  runDir: string,
  baselineRef = 'HEAD'
): Promise<{ patchArtifactPath: string; patchBytes: number }> {
  await execFileAsync('git', ['-C', laneWorkspacePath, 'add', '-N', '.']);
  const diff = await execFileAsync(
    'git',
    ['-C', laneWorkspacePath, 'diff', '--binary', '--no-ext-diff', baselineRef, '--', '.'],
    {
      maxBuffer: 20 * 1024 * 1024
    }
  );
  const patchArtifactPath = join(runDir, 'provider-linear-child-lane.patch');
  await writeFile(patchArtifactPath, diff.stdout, 'utf8');
  return {
    patchArtifactPath,
    patchBytes: Buffer.byteLength(diff.stdout, 'utf8')
  };
}

async function readProviderLinearChildLaneHeadSha(laneWorkspacePath: string): Promise<string | null> {
  const result = await execFileAsync('git', ['-C', laneWorkspacePath, 'rev-parse', 'HEAD'], {
    maxBuffer: 1024 * 1024
  });
  return normalizeOptionalString(result.stdout);
}

async function countProviderLinearChildLaneReflogEntries(laneWorkspacePath: string): Promise<number> {
  const result = await execFileAsync('git', ['-C', laneWorkspacePath, 'reflog', '--format=%H'], {
    maxBuffer: 1024 * 1024
  });
  return result.stdout
    .split(/\r?\n/u)
    .map((line) => normalizeOptionalString(line))
    .filter((line): line is string => line !== null).length;
}

async function detectProviderLinearChildLaneCreatedCommitShas(
  laneWorkspacePath: string,
  startingHeadSha: string | null,
  startingReflogEntryCount = 0
): Promise<string[]> {
  if (!startingHeadSha) {
    return [];
  }
  const result = await execFileAsync('git', ['-C', laneWorkspacePath, 'reflog', '--format=%H%x09%gs'], {
    maxBuffer: 1024 * 1024
  });
  const reflogEntries = result.stdout.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  const newEntryCount = Math.max(0, reflogEntries.length - Math.max(0, startingReflogEntryCount));
  const createdCommitShas: string[] = [];
  const seen = new Set<string>();
  for (const line of reflogEntries.slice(0, newEntryCount)) {
    const [rawSha, rawSummary = ''] = line.split('\t', 2);
    const sha = normalizeOptionalString(rawSha);
    const summary = normalizeOptionalString(rawSummary);
    if (
      !sha ||
      !summary ||
      sha === startingHeadSha ||
      seen.has(sha) ||
      !/^commit(?:\s+\([^)]*\))?:/u.test(summary)
    ) {
      continue;
    }
    seen.add(sha);
    createdCommitShas.push(sha);
  }
  return createdCommitShas;
}

function resolveProviderLinearChildLaneUnauthorizedCommitMessage(input: {
  context: Pick<ProviderLinearChildLaneContext, 'issueIdentifier'>;
  expectedBaseSha: string | null;
  currentHeadSha: string | null;
  createdCommitShas: readonly string[];
}): string | null {
  if (input.createdCommitShas.length === 0) {
    if (!input.expectedBaseSha || !input.currentHeadSha || input.expectedBaseSha === input.currentHeadSha) {
      return null;
    }
    return `Child lane created commit ${input.currentHeadSha} from parent base ${input.expectedBaseSha} for ${input.context.issueIdentifier} instead of returning an uncommitted patch artifact. Invalidate the lane and relaunch; parent acceptance owns integration and branch updates.`;
  }
  const renderedCreatedCommitShas = input.createdCommitShas.slice(0, 3).join(', ');
  const currentHeadSuffix =
    input.expectedBaseSha && input.currentHeadSha === input.expectedBaseSha
      ? ' and reset HEAD back to the parent base'
      : input.currentHeadSha
        ? ` and left HEAD at ${input.currentHeadSha}`
        : '';
  if (!input.expectedBaseSha) {
    return `Child lane created commit(s) ${renderedCreatedCommitShas} for ${input.context.issueIdentifier} instead of returning an uncommitted patch artifact${currentHeadSuffix}. Invalidate the lane and relaunch; parent acceptance owns integration and branch updates.`;
  }
  return `Child lane created commit(s) ${renderedCreatedCommitShas} from parent base ${input.expectedBaseSha} for ${input.context.issueIdentifier} instead of returning an uncommitted patch artifact${currentHeadSuffix}. Invalidate the lane and relaunch; parent acceptance owns integration and branch updates.`;
}

async function writeChildLaneProof(
  runDir: string,
  proof: ProviderLinearChildLaneProof
): Promise<void> {
  await writeFile(join(runDir, PROVIDER_LINEAR_CHILD_LANE_PROOF_FILENAME), `${JSON.stringify(proof, null, 2)}\n`, 'utf8');
}

function buildFailedChildLaneProof(input: {
  context: ProviderLinearChildLaneContext;
  laneWorkspacePath: string;
  laneBranch: string;
  lastMessage: string;
  updatedAt: string;
  parsed?: ReturnType<typeof parseProviderLinearWorkerJsonl>;
  session?: ReturnType<typeof deriveLatestTurnSessionId>;
  patchArtifactPath?: string;
  patchBytes?: number;
}): ProviderLinearChildLaneProof {
  return {
    issue_id: input.context.issueId,
    issue_identifier: input.context.issueIdentifier,
    task_id: input.context.taskId,
    run_id: input.context.runId,
    parent_run_id: input.context.parentRunId,
    stream: input.context.stream,
    purpose: input.context.purpose,
    instructions: input.context.instructions,
    scope: input.context.scope,
    parent_snapshot: input.context.parentSnapshot,
    lane_workspace_path: input.laneWorkspacePath,
    lane_branch: input.laneBranch,
    patch_artifact_path:
      input.patchArtifactPath ?? join(input.context.runDir, 'provider-linear-child-lane.patch'),
    patch_bytes: input.patchBytes ?? 0,
    thread_id: input.parsed?.threadId ?? null,
    latest_turn_id: input.parsed?.turnId ?? null,
    latest_session_id: input.session?.sessionId ?? null,
    latest_session_id_source: input.session?.source ?? null,
    last_event: input.parsed?.lastEvent ?? null,
    last_message: input.lastMessage,
    last_event_at: input.parsed?.lastEventAt ?? null,
    tokens: input.parsed?.tokens ?? buildEmptyProviderLinearWorkerTokenUsage(),
    rate_limits: input.parsed?.rateLimits ?? null,
    status: 'failed',
    updated_at: input.updatedAt
  };
}

export async function runProviderLinearChildLane(
  env: NodeJS.ProcessEnv = process.env,
  dependencyOverrides: Partial<ProviderLinearChildLaneRunnerDependencies> = {}
): Promise<ProviderLinearChildLaneProof> {
  const deps: ProviderLinearChildLaneRunnerDependencies = {
    now: () => new Date().toISOString(),
    sleep: async (ms) => {
      await new Promise((resolvePromise) => {
        setTimeout(resolvePromise, ms);
      });
    },
    execRunner: defaultExecRunner,
    discoverStartupSessionLogPath: discoverProviderLinearChildLaneSessionLogPath,
    ...dependencyOverrides
  };
  const context = await loadProviderLinearChildLaneContext(env);
  const { laneWorkspacePath, laneBranch } = await prepareLaneWorkspace(context);
  const startingHeadSha = await readProviderLinearChildLaneHeadSha(laneWorkspacePath).catch(() => null);
  const startingReflogEntryCount = await countProviderLinearChildLaneReflogEntries(laneWorkspacePath).catch(
    () => 0
  );
  try {
    const runtimeContext = await resolveChildLaneRuntimeContext(env, laneWorkspacePath, context.runId);
    logger.info(`[provider-linear-child-lane-runtime] ${formatRuntimeSelectionSummary(runtimeContext.runtime)}`);
    const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env, ...runtimeContext.env };
    childEnv.CODEX_NON_INTERACTIVE = '1';
    childEnv.CODEX_NO_INTERACTIVE = '1';
    childEnv.CODEX_INTERACTIVE = '0';
    delete childEnv.CODEX_THREAD_ID;
    const prompt = buildChildLanePrompt(context);
    const { command, args } = resolveRuntimeCodexCommand(['exec', '--json', prompt], runtimeContext);
    const startedAt = deps.now();
    const execAbortController = new AbortController();
    let execSettled = false;
    let execPromise: ReturnType<typeof deps.execRunner> | null = null;
    let scopeDriftMessage: string | null = null;

    let execResult: ProviderLinearChildLaneExecResult | null = null;
    try {
      execPromise = deps.execRunner({
        command,
        args,
        cwd: laneWorkspacePath,
        env: childEnv,
        mirrorOutput: false,
        abortSignal: execAbortController.signal
      });
      void execPromise.then(
        () => {
          execSettled = true;
        },
        () => {
          execSettled = true;
        }
      );
      if (runtimeContext.runtime.selected_mode === 'appserver') {
        const startupRace = await Promise.race([
          execPromise.then((result) => ({ kind: 'exec' as const, result })),
          waitForProviderLinearChildLaneAppserverStartup({
            context,
            laneWorkspacePath,
            env: childEnv,
            startedAt,
            isExecSettled: () => execSettled,
            deps
          }).then((sessionLogPath) => ({ kind: 'startup' as const, sessionLogPath }))
        ]);
        if (startupRace.kind === 'exec') {
          execResult = startupRace.result;
        } else {
          if (startupRace.sessionLogPath) {
            logger.info(
              `[provider-linear-child-lane-runtime] appserver startup observed via session log ${basename(startupRace.sessionLogPath)}`
            );
          }
          const execOrDriftRace = startupRace.sessionLogPath
            ? await Promise.race([
                execPromise.then((result) => ({ kind: 'exec' as const, result })),
                waitForProviderLinearChildLaneScopeDrift({
                  context,
                  sessionLogPath: startupRace.sessionLogPath,
                  isExecSettled: () => execSettled,
                  deps
                }).then((message) => ({ kind: 'drift' as const, message }))
              ])
            : ({ kind: 'exec' as const, result: await execPromise });
          if (execOrDriftRace.kind === 'exec') {
            execResult = execOrDriftRace.result;
          } else {
            scopeDriftMessage = execOrDriftRace.message;
            if (scopeDriftMessage) {
              execResult = await recoverProviderLinearChildLaneExecResultAfterAbort({
                abortController: execAbortController,
                error: new Error(scopeDriftMessage),
                execPromise,
                execSettled
              });
              if (!execResult) {
                throw new Error(scopeDriftMessage);
              }
            } else {
              execResult = await execPromise;
            }
          }
        }
      } else {
        execResult = await execPromise;
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      execResult = await recoverProviderLinearChildLaneExecResultAfterAbort({
        abortController: execAbortController,
        error: normalizedError,
        execPromise,
        execSettled
      });
      if (execResult) {
        execSettled = true;
      } else {
        const failedProof = buildFailedChildLaneProof({
          context,
          laneWorkspacePath,
          laneBranch,
          lastMessage: normalizedError.message,
          updatedAt: deps.now()
        });
        await writeChildLaneProof(context.runDir, failedProof);
        throw normalizedError;
      }
    }

    if (!execResult) {
      throw new Error('provider-linear-child-lane completed without an exec result');
    }
    const parsed = parseProviderLinearWorkerJsonl(execResult.stdout);
    const session = deriveLatestTurnSessionId({
      threadId: parsed.threadId,
      turnId: parsed.turnId
    });
    const currentHeadSha = await readProviderLinearChildLaneHeadSha(laneWorkspacePath).catch(() => null);
    const createdCommitShas = await detectProviderLinearChildLaneCreatedCommitShas(
      laneWorkspacePath,
      startingHeadSha,
      startingReflogEntryCount
    ).catch(() => []);
    const unauthorizedCommitMessage = resolveProviderLinearChildLaneUnauthorizedCommitMessage({
      context,
      expectedBaseSha: context.parentSnapshot.base_sha,
      currentHeadSha,
      createdCommitShas
    });
    const patchBaselineRef =
      context.parentSnapshot.base_sha && currentHeadSha && context.parentSnapshot.base_sha !== currentHeadSha
        ? context.parentSnapshot.base_sha
        : 'HEAD';
    const forcedFailureMessage = scopeDriftMessage ?? unauthorizedCommitMessage;
    let patchArtifactPath = join(context.runDir, 'provider-linear-child-lane.patch');
    let patchBytes = 0;
    let proof: ProviderLinearChildLaneProof;
    try {
      ({ patchArtifactPath, patchBytes } = await createPatchArtifact(
        laneWorkspacePath,
        context.runDir,
        patchBaselineRef
      ));
      proof = {
        issue_id: context.issueId,
        issue_identifier: context.issueIdentifier,
        task_id: context.taskId,
        run_id: context.runId,
        parent_run_id: context.parentRunId,
        stream: context.stream,
        purpose: context.purpose,
        instructions: context.instructions,
        scope: context.scope,
        parent_snapshot: context.parentSnapshot,
        lane_workspace_path: laneWorkspacePath,
        lane_branch: laneBranch,
        patch_artifact_path: patchArtifactPath,
        patch_bytes: patchBytes,
        thread_id: parsed.threadId,
        latest_turn_id: parsed.turnId,
        latest_session_id: session.sessionId,
        latest_session_id_source: session.source,
        last_event: parsed.lastEvent,
        last_message: forcedFailureMessage ?? parsed.finalMessage,
        last_event_at: parsed.lastEventAt,
        tokens: parsed.tokens,
        rate_limits: parsed.rateLimits,
        status: execResult.exitCode === 0 && !forcedFailureMessage ? 'succeeded' : 'failed',
        updated_at: deps.now()
      };
      await writeChildLaneProof(context.runDir, proof);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      const failedProof = buildFailedChildLaneProof({
        context,
        laneWorkspacePath,
        laneBranch,
        lastMessage: normalizedError.message,
        updatedAt: deps.now(),
        parsed,
        session,
        patchArtifactPath,
        patchBytes
      });
      try {
        await writeChildLaneProof(context.runDir, failedProof);
      } catch (proofWriteError) {
        logger.warn(
          `[provider-linear-child-lane-proof] failed to persist failure proof after post-exec export error: ${
            proofWriteError instanceof Error ? proofWriteError.message : String(proofWriteError)
          }`
        );
      }
      throw normalizedError;
    }
    if (proof.status !== 'succeeded') {
      throw new Error(
        proof.last_message ?? `provider-linear-child-lane exited with code ${execResult.exitCode ?? 'unknown'}`
      );
    }
    return proof;
  } finally {
    await compactRedundantTrustedChildLaneProjectsBestEffort({
      env,
      laneWorkspacePath
    });
  }
}

async function main(): Promise<void> {
  await runProviderLinearChildLane();
}

const entry = process.argv[1] ? resolve(process.argv[1]) : null;
const self = resolve(fileURLToPath(import.meta.url));
if (entry && entry === self) {
  main().catch((error) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export const __test__ = {
  buildChildLanePrompt,
  buildProviderLinearChildLaneAppserverStartupTimeoutMessage,
  detectProviderLinearChildLaneCreatedCommitShas,
  discoverProviderLinearChildLaneSessionLogPath,
  planTrustedProjectCleanup,
  extractProviderLinearChildLaneScopeDriftEvidenceFromRecord,
  recoverProviderLinearChildLaneExecResultAfterAbort,
  resolveProviderLinearChildLaneUnauthorizedCommitMessage,
  scanProviderLinearChildLaneSessionLogForParentScopeDrift,
  waitForProviderLinearChildLaneAppserverStartup
};
