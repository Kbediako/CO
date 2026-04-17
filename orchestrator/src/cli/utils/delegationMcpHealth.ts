import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';

import { buildCommandPreview } from './commandPreview.js';
import { resolveCodexCliBin } from './codexCli.js';
import { resolveCodexHome } from './codexPaths.js';
import { readDelegationFallbackConfig } from './delegationConfigParser.js';
import { findPackageRoot } from './packageInfo.js';
import { resolveCodexOrchestratorBootstrapInvocation } from './packageProgramResolver.js';

const DEFAULT_STARTUP_TIMEOUT_MS = 3000;
const DEFAULT_STARTUP_SLOW_THRESHOLD_MS = 1000;
const DEFAULT_STALE_THRESHOLD_SECONDS = 10 * 60;

export type DelegationTransportKind = 'direct-dist' | 'wrapper' | 'other' | 'not-delegation' | 'missing';

export interface DelegationServerInvocation {
  command: string;
  args: string[];
  distPath: string;
  commandLine: string;
}

export interface DelegationMcpConfigEntry {
  source: 'codex-cli' | 'fallback';
  command: string | null;
  args: string[];
  envVars: Record<string, string>;
  pinnedRepo: string | null;
  commandLine: string;
}

export interface DelegationMcpConfigSnapshot {
  status: 'ok' | 'missing';
  path: string;
  entry: DelegationMcpConfigEntry | null;
  detail?: string;
}

export interface DelegationTransportAssessment {
  status: 'safe' | 'unsafe' | 'missing';
  kind: DelegationTransportKind;
  commandLine: string | null;
  detail: string;
}

export interface DelegationStartupProbeResult {
  status: 'ok' | 'slow' | 'failed' | 'skipped';
  latencyMs: number | null;
  thresholdMs: number;
  detail: string;
}

export interface DelegateServerProcessInspection {
  status: 'ok' | 'stale' | 'unavailable';
  activeCount: number;
  staleCount: number;
  activePids: number[];
  stalePids: number[];
  staleRssKb: number;
  thresholdSeconds: number;
  detail: string;
  details: DelegateServerProcessDetail[];
}

export interface DelegateServerCleanupResult extends DelegateServerProcessInspection {
  dryRun: boolean;
  replacedPids: number[];
  terminatedPids: number[];
  forcedPids: number[];
  remainingPids: number[];
}

interface DelegateServerProcessRecord {
  pid: number;
  ppid: number;
  elapsedSeconds: number | null;
  rssKb: number;
  command: string;
}

export type DelegateServerProcessClassification =
  | 'active-associated'
  | 'active-unassociated'
  | 'idle-parent-session'
  | 'idle-orphan'
  | 'stale-parent-session'
  | 'stale-orphan';

export interface DelegateServerManifestAssociation {
  manifestPath: string;
  workspacePath: string | null;
  status: string | null;
  pipelineId: string | null;
  taskId: string | null;
  runId: string | null;
  issueId: string | null;
  issueIdentifier: string | null;
  proofPid: number | null;
}

export interface DelegateServerProcessDetail {
  pid: number;
  ppid: number;
  elapsedSeconds: number | null;
  rssKb: number;
  command: string;
  cwd: string | null;
  parentPid: number | null;
  parentCommand: string | null;
  parentCwd: string | null;
  rootCodexParentPid: number | null;
  rootCodexParentCommand: string | null;
  rootCodexParentCwd: string | null;
  manifestAssociation: DelegateServerManifestAssociation | null;
  classification: DelegateServerProcessClassification;
  classificationDetail: string;
}

export function formatDelegateServerProcessSummary(detail: {
  pid: number;
  classification: string;
  cwd: string | null;
  parentPid: number | null;
  parentCwd: string | null;
  rootCodexParentPid: number | null;
  rootCodexParentCwd: string | null;
  manifestPath: string | null;
}): string {
  return `pid ${detail.pid} (${detail.classification}), parent ${detail.rootCodexParentPid ?? detail.parentPid ?? 'none'}, cwd ${detail.rootCodexParentCwd ?? detail.parentCwd ?? detail.cwd ?? '<unknown>'}, manifest ${detail.manifestPath ?? '<none>'}`;
}

interface DelegateServerProcessDraft {
  record: DelegateServerProcessRecord;
  cwd: string | null;
  parentRecord: DelegateServerProcessRecord | null;
  parentCwd: string | null;
  rootCodexParent: DelegateServerProcessRecord | null;
  rootCodexParentCwd: string | null;
  manifestAssociation: DelegateServerManifestAssociation | null;
  ancestryPids: number[];
}

interface DelegateServerProcessInspectionBundle {
  inspection: DelegateServerProcessInspection;
  staleRecords: DelegateServerProcessRecord[];
}

interface DelegateServerCleanupDependencies {
  inspect: (options: { staleThresholdSeconds?: number; repoRoot?: string }) => DelegateServerProcessInspectionBundle;
  readProcessRecord: (pid: number) => DelegateServerProcessRecord | null;
  tryKillProcess: (pid: number, signal: NodeJS.Signals) => KillProcessOutcome;
  isProcessAlive: (pid: number) => boolean;
  waitForMs: (durationMs: number) => Promise<void>;
}

type KillProcessOutcome =
  | { status: 'signaled' }
  | { status: 'missing' }
  | { status: 'blocked'; code: string | null; detail: string };

const DEFAULT_DELEGATE_SERVER_CLEANUP_DEPENDENCIES: DelegateServerCleanupDependencies = {
  inspect: inspectDelegateServerProcessBundle,
  readProcessRecord: readDelegateServerProcessRecord,
  tryKillProcess,
  isProcessAlive,
  waitForMs
};

export function resolveDelegationServerInvocation(options: {
  allowMissingDist?: boolean;
  env?: NodeJS.ProcessEnv;
  execPath?: string;
} = {}): DelegationServerInvocation {
  const command = options.execPath ?? process.execPath;
  const distPath = resolveDelegationDistPath({
    allowMissingDist: options.allowMissingDist === true,
    command,
    env: options.env
  });
  if (!options.allowMissingDist && !existsSync(distPath)) {
    throw new Error(
      `Delegation MCP requires a built dist entrypoint for stdio startup; missing ${distPath}.`
    );
  }
  const args = [distPath, 'delegate-server'];
  return {
    command,
    args,
    distPath,
    commandLine: buildCommandPreview(command, args)
  };
}

function resolveDelegationDistPath(options: {
  allowMissingDist: boolean;
  command: string;
  env?: NodeJS.ProcessEnv;
}): string {
  try {
    return resolveCodexOrchestratorBootstrapInvocation({
      env: options.env,
      execPath: options.command
    }).distPath;
  } catch (error) {
    if (!options.allowMissingDist || !isSourceFallbackBootstrapDistError(error)) {
      throw error;
    }
    return join(findPackageRoot(import.meta.url), 'dist', 'bin', 'codex-orchestrator.js');
  }
}

function isSourceFallbackBootstrapDistError(error: unknown): boolean {
  const detail = error instanceof Error ? error.message : String(error);
  return detail.includes('Unable to run ')
    && detail.includes('ts-node/esm is unavailable')
    && /dist(?:\/|\\)bin(?:\/|\\)codex-orchestrator\.js/u.test(detail);
}

export function inspectDelegationMcpConfig(env: NodeJS.ProcessEnv = process.env): DelegationMcpConfigSnapshot {
  const codexBin = resolveCodexCliBin(env);
  const codexHome = resolveCodexHome(env);
  const configPath = join(codexHome, 'config.toml');
  const cliEntry = readDelegationMcpServer(codexBin, env);
  if (cliEntry) {
    return {
      status: 'ok',
      path: configPath,
      entry: {
        source: 'codex-cli',
        ...cliEntry,
        commandLine: buildCommandPreview(cliEntry.command ?? '<missing>', cliEntry.args)
      }
    };
  }

  const fallback = readDelegationFallbackConfig(configPath);
  if (!fallback) {
    if (!existsSync(configPath)) {
      return { status: 'missing', path: configPath, entry: null, detail: 'config.toml not found' };
    }
    return { status: 'missing', path: configPath, entry: null, detail: 'mcp_servers.delegation entry not found' };
  }

  return {
    status: 'ok',
    path: configPath,
    entry: {
      source: 'fallback',
      command: fallback.command,
      args: fallback.args,
      envVars: fallback.envVars,
      pinnedRepo: readPinnedRepo(fallback.args),
      commandLine: buildCommandPreview(fallback.command ?? '<missing>', fallback.args)
    }
  };
}

export function classifyDelegationTransport(
  entry: DelegationMcpConfigEntry | null | undefined
): DelegationTransportAssessment {
  if (!entry) {
    return {
      status: 'missing',
      kind: 'missing',
      commandLine: null,
      detail: 'Delegation MCP entry is not configured.'
    };
  }

  const delegateIndex = findDelegateServerIndex(entry.args);
  if (delegateIndex === -1) {
    return {
      status: 'unsafe',
      kind: 'not-delegation',
      commandLine: entry.commandLine,
      detail: 'Delegation MCP entry does not invoke delegate-server.'
    };
  }

  if (isDirectDistDelegateServer(entry.command, entry.args, delegateIndex)) {
    return {
      status: 'safe',
      kind: 'direct-dist',
      commandLine: entry.commandLine,
      detail: 'Delegation MCP uses the direct dist entrypoint, which is safe for stdio initialize latency.'
    };
  }

  if (isWrapperDelegateServer(entry.command, entry.args, delegateIndex)) {
    return {
      status: 'unsafe',
      kind: 'wrapper',
      commandLine: entry.commandLine,
      detail: 'Delegation MCP still routes through the codex-orchestrator wrapper; re-register with the direct dist entrypoint.'
    };
  }

  return {
    status: 'unsafe',
    kind: 'other',
    commandLine: entry.commandLine,
    detail: 'Delegation MCP uses a non-standard delegate-server command; verify a direct dist entrypoint before relying on startup timing.'
  };
}

export function probeDelegationInitialize(
  entry: DelegationMcpConfigEntry | null | undefined,
  options: {
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    slowThresholdMs?: number;
  } = {}
): DelegationStartupProbeResult {
  const thresholdMs = options.slowThresholdMs ?? DEFAULT_STARTUP_SLOW_THRESHOLD_MS;
  const transport = classifyDelegationTransport(entry);
  if (!entry || transport.status !== 'safe' || !entry.command) {
    return {
      status: 'skipped',
      latencyMs: null,
      thresholdMs,
      detail:
        transport.status === 'missing'
          ? 'Startup probe skipped because delegation MCP is not configured.'
          : 'Startup probe skipped until the configured transport is re-registered to the direct dist entrypoint.'
    };
  }

  const payload = `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' })}\n`;
  const start = Date.now();
  const result = spawnSync(entry.command, entry.args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: options.timeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS,
    input: payload,
    env: {
      ...(options.env ?? process.env),
      ...entry.envVars
    }
  });
  const latencyMs = Date.now() - start;

  if (result.error) {
    const message = result.error.message || `spawn failed for ${entry.commandLine}`;
    return { status: 'failed', latencyMs: null, thresholdMs, detail: message };
  }

  if (typeof result.signal === 'string' && result.signal.length > 0) {
    return {
      status: 'failed',
      latencyMs,
      thresholdMs,
      detail: `Initialize probe timed out or terminated with signal ${result.signal}.`
    };
  }

  const response = parseInitializeResponse(String(result.stdout ?? ''));
  if (!response.ok) {
    const stderr = String(result.stderr ?? '').trim();
    const detail = stderr.length > 0 ? `${response.detail} stderr=${stderr}` : response.detail;
    return { status: 'failed', latencyMs, thresholdMs, detail };
  }

  return {
    status: latencyMs > thresholdMs ? 'slow' : 'ok',
    latencyMs,
    thresholdMs,
    detail:
      latencyMs > thresholdMs
        ? `Initialize succeeded in ${latencyMs} ms, slower than the ${thresholdMs} ms threshold.`
        : `Initialize succeeded in ${latencyMs} ms.`
  };
}

export function inspectDelegateServerProcesses(options: {
  snapshot?: string;
  staleThresholdSeconds?: number;
  repoRoot?: string;
  processCwdLookup?: Record<number, string | null>;
  manifestCatalog?: DelegateServerManifestAssociation[];
} = {}): DelegateServerProcessInspection {
  return inspectDelegateServerProcessBundle(options).inspection;
}

function inspectDelegateServerProcessBundle(options: {
  snapshot?: string;
  staleThresholdSeconds?: number;
  repoRoot?: string;
  processCwdLookup?: Record<number, string | null>;
  manifestCatalog?: DelegateServerManifestAssociation[];
} = {}): DelegateServerProcessInspectionBundle {
  const thresholdSeconds = options.staleThresholdSeconds ?? DEFAULT_STALE_THRESHOLD_SECONDS;
  const snapshotResult: { ok: true; output: string } | { ok: false; detail: string } =
    options.snapshot === undefined ? readDelegateServerProcessSnapshot() : { ok: true, output: options.snapshot };
  if (!snapshotResult.ok) {
    return {
      inspection: {
        status: 'unavailable',
        activeCount: 0,
        staleCount: 0,
        activePids: [],
        stalePids: [],
        staleRssKb: 0,
        thresholdSeconds,
        detail: snapshotResult.detail,
        details: []
      },
      staleRecords: []
    };
  }

  const allProcesses = parseDelegateServerProcessSnapshot(snapshotResult.output);
  const processes = allProcesses.filter((record) => isDelegateServerCommand(record.command));
  const processMap = new Map(allProcesses.map((record) => [record.pid, record]));
  const preloadPids = resolveDelegateServerRelatedPids(processes, processMap);
  const lookupProcessCwd = createProcessCwdReader(
    options.processCwdLookup,
    preloadPids
  );
  const manifestCatalog =
    options.manifestCatalog ?? loadDelegateServerManifestCatalog(resolveDelegateServerInspectionRepoRoot(options.repoRoot));
  const manifestCatalogByWorkspace = buildManifestCatalogByWorkspace(manifestCatalog);
  const drafts = processes.map((record) =>
    buildDelegateServerProcessDraft(record, processMap, lookupProcessCwd, manifestCatalogByWorkspace)
  );
  const freshestUnassociatedPidByRootParent = resolveFreshestUnassociatedPidByRootParent(drafts);
  const details = drafts.map((draft) =>
    finalizeDelegateServerProcessDetail(draft, freshestUnassociatedPidByRootParent, thresholdSeconds)
  );
  const activePids = details
    .filter((detail) => detail.classification === 'active-associated' || detail.classification === 'active-unassociated')
    .map((detail) => detail.pid);
  const idleDetails = details.filter(
    (detail) => detail.classification === 'idle-parent-session' || detail.classification === 'idle-orphan'
  );
  const staleDetails = details.filter((detail) =>
    detail.classification === 'stale-parent-session' || detail.classification === 'stale-orphan'
  );
  const stalePids = staleDetails.map((detail) => detail.pid);
  const staleRecords = processes.filter((record) => stalePids.includes(record.pid));
  const staleRssKb = staleDetails.reduce((sum, detail) => sum + detail.rssKb, 0);

  const detail =
    processes.length === 0
      ? 'No delegate-server processes detected.'
      : stalePids.length > 0
        ? buildDelegateServerInspectionDetail(idleDetails, staleDetails)
        : idleDetails.length > 0
          ? buildDelegateServerInspectionDetail(idleDetails, [])
          : 'No stale delegate-server processes detected.';

  return {
    inspection: {
      status: stalePids.length > 0 ? 'stale' : 'ok',
      activeCount: activePids.length,
      staleCount: stalePids.length,
      activePids,
      stalePids,
      staleRssKb,
      thresholdSeconds,
      detail,
      details
    },
    staleRecords
  };
}

export async function cleanupStaleDelegateServerProcesses(options: {
  apply?: boolean;
  staleThresholdSeconds?: number;
  repoRoot?: string;
} = {}, dependencies: Partial<DelegateServerCleanupDependencies> = {}): Promise<DelegateServerCleanupResult> {
  const cleanupDependencies = { ...DEFAULT_DELEGATE_SERVER_CLEANUP_DEPENDENCIES, ...dependencies };
  const { inspection, staleRecords } = cleanupDependencies.inspect({
    staleThresholdSeconds: options.staleThresholdSeconds,
    repoRoot: options.repoRoot
  });
  if (!options.apply || inspection.status === 'unavailable' || inspection.stalePids.length === 0) {
    return {
      ...inspection,
      dryRun: !options.apply,
      replacedPids: [],
      terminatedPids: [],
      forcedPids: [],
      remainingPids: inspection.stalePids
    };
  }

  const stalePidRecords = [...staleRecords].sort((left, right) => right.pid - left.pid);
  const replacedSet = new Set<number>();
  const terminatedSet = new Set<number>();
  const remainingSet = new Set<number>();
  const forcedSet = new Set<number>();

  for (const record of stalePidRecords) {
    const revalidation = classifyCleanupCandidate(record, cleanupDependencies);
    if (revalidation === 'missing') {
      terminatedSet.add(record.pid);
      continue;
    }
    if (revalidation === 'replaced') {
      replacedSet.add(record.pid);
      continue;
    }
    if (revalidation === 'remaining') {
      remainingSet.add(record.pid);
      continue;
    }
    const killResult = cleanupDependencies.tryKillProcess(record.pid, 'SIGTERM');
    if (killResult.status === 'missing') {
      terminatedSet.add(record.pid);
      continue;
    }
    if (killResult.status === 'blocked') {
      remainingSet.add(record.pid);
    }
  }
  await cleanupDependencies.waitForMs(250);

  for (const record of stalePidRecords) {
    if (replacedSet.has(record.pid) || terminatedSet.has(record.pid)) {
      continue;
    }
    const revalidation = classifyCleanupCandidate(record, cleanupDependencies);
    if (revalidation === 'missing') {
      remainingSet.delete(record.pid);
      terminatedSet.add(record.pid);
      continue;
    }
    if (revalidation === 'replaced') {
      remainingSet.delete(record.pid);
      replacedSet.add(record.pid);
      continue;
    }
    if (revalidation === 'remaining') {
      remainingSet.add(record.pid);
      continue;
    }
    if (remainingSet.has(record.pid)) {
      continue;
    }
    const killResult = cleanupDependencies.tryKillProcess(record.pid, 'SIGKILL');
    if (killResult.status === 'signaled') {
      forcedSet.add(record.pid);
      continue;
    }
    if (killResult.status === 'missing') {
      terminatedSet.add(record.pid);
      continue;
    }
    remainingSet.add(record.pid);
  }
  if (forcedSet.size > 0) {
    await cleanupDependencies.waitForMs(250);
  }

  for (const record of stalePidRecords) {
    if (replacedSet.has(record.pid) || terminatedSet.has(record.pid)) {
      continue;
    }
    const revalidation = classifyCleanupCandidate(record, cleanupDependencies);
    if (revalidation === 'missing') {
      remainingSet.delete(record.pid);
      terminatedSet.add(record.pid);
      continue;
    }
    if (revalidation === 'replaced') {
      remainingSet.delete(record.pid);
      replacedSet.add(record.pid);
      continue;
    }
    remainingSet.add(record.pid);
  }

  const stalePids = stalePidRecords.map((record) => record.pid);
  const forcedPids = stalePids.filter((pid) => forcedSet.has(pid));
  const terminatedPids = stalePids.filter((pid) => !forcedSet.has(pid) && terminatedSet.has(pid));
  const replacedPids = stalePids.filter(
    (pid) => !forcedSet.has(pid) && !terminatedSet.has(pid) && replacedSet.has(pid)
  );
  const remainingPids = stalePids.filter(
    (pid) => !forcedSet.has(pid) && !terminatedSet.has(pid) && !replacedSet.has(pid) && remainingSet.has(pid)
  );

  return {
    ...inspection,
    dryRun: false,
    replacedPids,
    terminatedPids,
    forcedPids,
    remainingPids
  };
}

export function formatDelegateServerCleanupSummary(result: DelegateServerCleanupResult): string[] {
  const lines: string[] = [];
  const operationLabel =
    result.status === 'unavailable'
      ? 'unavailable'
      : result.dryRun
        ? 'planned'
        : result.staleCount === 0
          ? 'clean'
          : result.remainingPids.length === 0
            ? 'applied'
            : 'partial';
  lines.push(`Delegation cleanup: ${operationLabel}`);
  lines.push(`- Active delegate-server processes: ${result.activeCount}`);
  lines.push(
    `- Stale delegate-server processes: ${result.staleCount} (threshold ${(result.thresholdSeconds / 60).toFixed(0)}m, rss ${(result.staleRssKb / 1024).toFixed(1)} MB)`
  );
  if (result.stalePids.length > 0) {
    lines.push(`- Stale pids: ${result.stalePids.join(', ')}`);
  }
  if (result.replacedPids.length > 0) {
    lines.push(`- Replaced pids: ${result.replacedPids.join(', ')}`);
  }
  if (result.terminatedPids.length > 0) {
    lines.push(`- Terminated pids: ${result.terminatedPids.join(', ')}`);
  }
  if (result.forcedPids.length > 0) {
    lines.push(`- Force-killed pids: ${result.forcedPids.join(', ')}`);
  }
  if (result.remainingPids.length > 0) {
    lines.push(`- Remaining pids: ${result.remainingPids.join(', ')}`);
  }
  lines.push(`- Detail: ${result.detail}`);
  const staleDetails = result.details.filter(
    (detail) => detail.classification === 'stale-parent-session' || detail.classification === 'stale-orphan'
  );
  for (const detail of staleDetails.slice(0, 3)) {
    lines.push(`- Stale detail: ${formatDelegateServerProcessSummary({
      pid: detail.pid,
      classification: detail.classification,
      cwd: detail.cwd,
      parentPid: detail.parentPid,
      parentCwd: detail.parentCwd,
      rootCodexParentPid: detail.rootCodexParentPid,
      rootCodexParentCwd: detail.rootCodexParentCwd,
      manifestPath: detail.manifestAssociation?.manifestPath ?? null
    })}`);
  }
  if (result.dryRun && result.status !== 'unavailable') {
    lines.push('Run with --yes to terminate stale delegate-server processes.');
  }
  return lines;
}

export function readPinnedRepo(args: string[]): string | null {
  const index = args.indexOf('--repo');
  if (index === -1) {
    return null;
  }
  const candidate = args[index + 1];
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
}

function readDelegationMcpServer(
  codexBin: string,
  env: NodeJS.ProcessEnv
): Omit<DelegationMcpConfigEntry, 'source' | 'commandLine'> | null {
  const result = spawnSync(codexBin, ['mcp', 'get', 'delegation', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
    env
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  const stdout = String(result.stdout ?? '').trim();
  if (!stdout) {
    return null;
  }
  try {
    const parsed = JSON.parse(stdout) as Record<string, unknown>;
    const transport = parsed.transport as Record<string, unknown> | undefined;
    const command = typeof transport?.command === 'string' ? transport.command : null;
    const args = Array.isArray(transport?.args)
      ? (transport.args as unknown[]).filter((value) => typeof value === 'string') as string[]
      : [];
    const envVars: Record<string, string> = {};
    const envRecord = transport?.env;
    if (envRecord && typeof envRecord === 'object' && !Array.isArray(envRecord)) {
      for (const [key, value] of Object.entries(envRecord as Record<string, unknown>)) {
        if (typeof value === 'string') {
          envVars[key] = value;
        }
      }
    }
    return { command, args, envVars, pinnedRepo: readPinnedRepo(args) };
  } catch {
    return null;
  }
}

function findDelegateServerIndex(args: string[]): number {
  return args.findIndex((arg) => arg === 'delegate-server' || arg === 'delegation-server');
}

function isDirectDistDelegateServer(command: string | null, args: string[], delegateIndex: number): boolean {
  if (command && isDistCodexOrchestratorPath(command) && delegateIndex === 0) {
    return true;
  }
  const precedingToken = delegateIndex > 0 ? args[delegateIndex - 1] : null;
  return precedingToken ? isDistCodexOrchestratorPath(precedingToken) : false;
}

function isWrapperDelegateServer(command: string | null, args: string[], delegateIndex: number): boolean {
  if (command && isCodexOrchestratorWrapperPath(command) && delegateIndex === 0) {
    return true;
  }
  const precedingToken = delegateIndex > 0 ? args[delegateIndex - 1] : null;
  return precedingToken ? isCodexOrchestratorWrapperPath(precedingToken) : false;
}

function isDistCodexOrchestratorPath(candidate: string): boolean {
  return /(?:^|[/\\])dist[/\\]bin[/\\]codex-orchestrator\.js$/u.test(candidate);
}

function isCodexOrchestratorWrapperPath(candidate: string): boolean {
  if (isDistCodexOrchestratorPath(candidate)) {
    return false;
  }
  const token = basenameFromCommandToken(candidate);
  return token === 'codex-orchestrator' || token === 'codex-orchestrator.js';
}

function basenameFromCommandToken(token: string): string {
  return basename(token.replace(/\\/gu, '/'));
}

function parseInitializeResponse(stdout: string): { ok: true } | { ok: false; detail: string } {
  const lines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const responseLine = [...lines].reverse().find((line) => line.startsWith('{'));
  if (!responseLine) {
    return { ok: false, detail: 'Initialize probe did not emit a JSON-RPC response.' };
  }
  try {
    const parsed = JSON.parse(responseLine) as Record<string, unknown>;
    const result = parsed.result as Record<string, unknown> | undefined;
    if (parsed.id !== 1 || !result || typeof result.protocolVersion !== 'string') {
      return { ok: false, detail: 'Initialize probe returned an unexpected JSON-RPC payload.' };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'Failed to parse initialize probe response.'
    };
  }
}

function readDelegateServerProcessSnapshot(): { ok: true; output: string } | { ok: false; detail: string } {
  const result = spawnSync('ps', ['-ax', '-o', 'pid=,ppid=,etime=,rss=,args='], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000
  });
  if (result.error) {
    return { ok: false, detail: result.error.message };
  }
  if (result.status !== 0) {
    const stderr = String(result.stderr ?? '').trim();
    return { ok: false, detail: stderr || `ps exited with code ${result.status ?? 'unknown'}` };
  }
  return { ok: true, output: String(result.stdout ?? '') };
}

function readDelegateServerProcessRecord(pid: number): DelegateServerProcessRecord | null {
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'pid=,ppid=,etime=,rss=,args='], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  return parseDelegateServerProcessSnapshot(String(result.stdout ?? ''))[0] ?? null;
}

function parseDelegateServerProcessSnapshot(snapshot: string): DelegateServerProcessRecord[] {
  const records: DelegateServerProcessRecord[] = [];
  for (const line of snapshot.split(/\r?\n/u)) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(.*)$/u);
    if (!match) {
      continue;
    }
    const pid = Number(match[1]);
    const ppid = Number(match[2]);
    const elapsedSeconds = parseElapsedSeconds(match[3] ?? '');
    const rssKb = Number(match[4] ?? '0');
    const command = (match[5] ?? '').trim();
    if (!Number.isInteger(pid) || !Number.isInteger(ppid) || !command) {
      continue;
    }
    records.push({ pid, ppid, elapsedSeconds, rssKb: Number.isFinite(rssKb) ? rssKb : 0, command });
  }
  return records;
}

function isDelegateServerCommand(command: string): boolean {
  if (command.includes('mcp add delegation') || command.includes('mcp get delegation')) {
    return false;
  }
  const args = parseShellStyleArguments(command);
  const delegateIndex = findDelegateServerIndex(args);
  if (delegateIndex === -1) {
    return false;
  }
  if (args.some((arg) => arg === 'mcp') && args.some((arg) => arg === 'add')) {
    return false;
  }
  const precedingToken = delegateIndex > 0 ? args[delegateIndex - 1] ?? null : null;
  if (precedingToken && (isDistCodexOrchestratorPath(precedingToken) || isCodexOrchestratorWrapperPath(precedingToken))) {
    return delegateIndex === 1 || isNodeLauncherToken(args[delegateIndex - 2] ?? '');
  }
  return delegateIndex === 1 && isCodexOrchestratorWrapperPath(args[0] ?? '');
}

function resolveDelegateServerRootCodexParent(
  record: DelegateServerProcessRecord,
  processMap: Map<number, DelegateServerProcessRecord>
): DelegateServerProcessRecord | null {
  let current: DelegateServerProcessRecord | undefined = record;
  const visited = new Set<number>();
  while (current && !visited.has(current.pid)) {
    visited.add(current.pid);
    if (isCodexClientCommand(current.command)) {
      return current;
    }
    if (current.ppid <= 1) {
      return null;
    }
    current = processMap.get(current.ppid);
  }
  return null;
}

function isCodexClientCommand(command: string): boolean {
  const args = parseShellStyleArguments(command);
  const recognizedBasenames = buildRecognizedCodexClientBasenames();
  return args.some((arg) => recognizedBasenames.has(basenameFromCommandToken(arg).toLowerCase()));
}

function buildRecognizedCodexClientBasenames(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const basenames = new Set(['codex', 'codex.exe', 'codex.cmd']);
  try {
    basenames.add(basenameFromCommandToken(resolveCodexCliBin(env)).toLowerCase());
  } catch {
    // Ignore local codex binary resolution failures and keep the default names.
  }
  return basenames;
}

function isNodeLauncherToken(token: string): boolean {
  const normalized = basenameFromCommandToken(token).toLowerCase();
  return normalized === 'node'
    || normalized === 'node.exe'
    || normalized === 'nodejs'
    || normalized === 'nodejs.exe';
}

function createProcessCwdReader(
  seed: Record<number, string | null> | undefined,
  preloadPids: number[] = []
): (pid: number) => string | null {
  const cache = new Map<number, string | null>();
  if (seed) {
    for (const [key, value] of Object.entries(seed)) {
      const pid = Number.parseInt(key, 10);
      if (Number.isInteger(pid)) {
        cache.set(pid, value);
      }
    }
  }
  const missingPids = preloadPids.filter((pid, index, values) => {
    return Number.isInteger(pid) && pid > 0 && !cache.has(pid) && values.indexOf(pid) === index;
  });
  if (missingPids.length > 0) {
    for (const [pid, cwd] of readProcessCwds(missingPids)) {
      cache.set(pid, cwd);
    }
  }
  return (pid: number): string | null => {
    if (cache.has(pid)) {
      return cache.get(pid) ?? null;
    }
    const cwd = readProcessCwd(pid);
    cache.set(pid, cwd);
    return cwd;
  };
}

function resolveDelegateServerRelatedPids(
  processes: DelegateServerProcessRecord[],
  processMap: Map<number, DelegateServerProcessRecord>
): number[] {
  const related = new Set<number>();
  for (const record of processes) {
    let current: DelegateServerProcessRecord | null = record;
    const seen = new Set<number>();
    while (current && !seen.has(current.pid)) {
      seen.add(current.pid);
      related.add(current.pid);
      current = processMap.get(current.ppid) ?? null;
    }
  }
  return [...related];
}

function readProcessCwds(pids: number[]): Map<number, string | null> {
  const results = new Map<number, string | null>();
  for (const chunk of chunkProcessIds(pids, 128)) {
    const result = spawnSync('lsof', ['-a', '-d', 'cwd', '-Fpfn', '-p', chunk.join(',')], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 1000
    });
    if (result.error || result.status !== 0) {
      continue;
    }
    let currentPid: number | null = null;
    for (const rawLine of String(result.stdout ?? '').split(/\r?\n/u)) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }
      if (line.startsWith('p')) {
        const parsedPid = Number.parseInt(line.slice(1), 10);
        currentPid = Number.isInteger(parsedPid) ? parsedPid : null;
        continue;
      }
      if (line.startsWith('n') && currentPid !== null) {
        const cwd = line.slice(1).trim();
        results.set(currentPid, cwd.length > 0 ? cwd : null);
      }
    }
  }
  return results;
}

function chunkProcessIds(pids: number[], chunkSize: number): number[][] {
  const chunks: number[][] = [];
  for (let index = 0; index < pids.length; index += chunkSize) {
    chunks.push(pids.slice(index, index + chunkSize));
  }
  return chunks;
}

function resolveDelegateServerInspectionRepoRoot(repoRoot: string | undefined): string {
  const configuredRoot = normalizeRepoRootHint(repoRoot);
  if (configuredRoot) {
    return collapseWorkspaceRepoRoot(resolveRepoRootFromHint(configuredRoot));
  }
  const envRoot = normalizeRepoRootHint(process.env.CODEX_ORCHESTRATOR_ROOT);
  if (envRoot) {
    return collapseWorkspaceRepoRoot(resolveRepoRootFromHint(envRoot));
  }
  const cwd = normalizeRepoRootHint(process.cwd());
  if (cwd) {
    return collapseWorkspaceRepoRoot(resolveRepoRootFromHint(cwd));
  }
  try {
    return collapseWorkspaceRepoRoot(findPackageRoot(import.meta.url));
  } catch {
    return collapseWorkspaceRepoRoot(process.cwd());
  }
}

function normalizeRepoRootHint(value: string | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveRepoRootFromHint(rootHint: string): string {
  const normalizedHint = resolve(rootHint);
  const gitBoundary = findNearestGitBoundary(normalizedHint);
  let current: string | null = normalizedHint;
  while (current) {
    if (existsSync(join(current, 'tasks', 'index.json'))) {
      return current;
    }
    if (gitBoundary && current === gitBoundary) {
      break;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return gitBoundary ?? normalizedHint;
}

function findNearestGitBoundary(start: string): string | null {
  let current: string | null = resolve(start);
  while (current) {
    if (existsSync(join(current, '.git'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

function collapseWorkspaceRepoRoot(candidate: string): string {
  const resolved = resolve(candidate);
  const normalized = resolved.replace(/\\/gu, '/');
  const marker = '/.workspaces/';
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex === -1) {
    return resolved;
  }
  return resolved.slice(0, markerIndex) || resolved;
}

function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === ''
    || (!relativePath.startsWith('..') && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath));
}

function readProcessCwd(pid: number): string | null {
  const result = spawnSync('lsof', ['-a', '-d', 'cwd', '-Fn', '-p', String(pid)], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 3000
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  const line = String(result.stdout ?? '')
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .find((value) => value.startsWith('n'));
  if (!line) {
    return null;
  }
  const cwd = line.slice(1).trim();
  return cwd.length > 0 ? cwd : null;
}

function loadDelegateServerManifestCatalog(repoRoot: string): DelegateServerManifestAssociation[] {
  const catalog: DelegateServerManifestAssociation[] = [];
  for (const runsRoot of resolveDelegateServerManifestCatalogRunsRoots(repoRoot, repoRoot)) {
    collectManifestCatalogFromRunsRoot(runsRoot, catalog);
  }
  const workspacesRoot = join(repoRoot, '.workspaces');
  if (existsSync(workspacesRoot)) {
    for (const entry of readdirSync(workspacesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const workspaceRoot = join(workspacesRoot, entry.name);
      for (const runsRoot of resolveDelegateServerManifestCatalogRunsRoots(repoRoot, workspaceRoot)) {
        collectManifestCatalogFromRunsRoot(runsRoot, catalog);
      }
      const childLanesRoot = join(workspaceRoot, '.child-lanes');
      if (!existsSync(childLanesRoot)) {
        continue;
      }
      for (const childLaneEntry of readdirSync(childLanesRoot, { withFileTypes: true })) {
        if (!childLaneEntry.isDirectory()) {
          continue;
        }
        const childLaneRoot = join(childLanesRoot, childLaneEntry.name);
        for (const runsRoot of resolveDelegateServerManifestCatalogRunsRoots(repoRoot, childLaneRoot)) {
          collectManifestCatalogFromRunsRoot(runsRoot, catalog);
        }
      }
    }
  }
  return catalog;
}

function resolveDelegateServerManifestCatalogRunsRoots(sharedRoot: string, ownerRoot: string): string[] {
  const runsRoots = new Set<string>([join(ownerRoot, '.runs')]);
  const configured = normalizeRepoRootHint(process.env.CODEX_ORCHESTRATOR_RUNS_DIR);
  if (!configured) {
    return [...runsRoots];
  }
  const configuredRunsRoot = isAbsolute(configured) ? resolve(configured) : resolve(sharedRoot, configured);
  if (ownerRoot === sharedRoot) {
    runsRoots.add(configuredRunsRoot);
    return [...runsRoots];
  }
  if (isPathWithinRoot(sharedRoot, configuredRunsRoot)) {
    runsRoots.add(resolve(ownerRoot, relative(sharedRoot, configuredRunsRoot)));
  }
  return [...runsRoots];
}

function collectManifestCatalogFromRunsRoot(root: string, catalog: DelegateServerManifestAssociation[]): void {
  if (!existsSync(root)) {
    return;
  }
  for (const taskEntry of readdirSync(root, { withFileTypes: true })) {
    if (!taskEntry.isDirectory()) {
      continue;
    }
    const taskRoot = join(root, taskEntry.name);
    const cliRoot = join(taskRoot, 'cli');
    if (existsSync(cliRoot)) {
      for (const runEntry of readdirSync(cliRoot, { withFileTypes: true })) {
        if (!runEntry.isDirectory()) {
          continue;
        }
        const manifestPath = join(cliRoot, runEntry.name, 'manifest.json');
        const association = readManifestAssociation(manifestPath);
        if (association) {
          catalog.push(association);
        }
      }
      continue;
    }
    for (const runEntry of readdirSync(taskRoot, { withFileTypes: true })) {
      if (!runEntry.isDirectory()) {
        continue;
      }
      const manifestPath = join(taskRoot, runEntry.name, 'manifest.json');
      const association = readManifestAssociation(manifestPath);
      if (association) {
        catalog.push(association);
      }
    }
  }
}

function readManifestAssociation(manifestPath: string): DelegateServerManifestAssociation | null {
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
    return {
      manifestPath,
      workspacePath: normalizeOptionalString(parsed.workspace_path),
      status: normalizeOptionalString(parsed.status),
      pipelineId: normalizeOptionalString(parsed.pipeline_id),
      taskId: normalizeOptionalString(parsed.task_id),
      runId: normalizeOptionalString(parsed.run_id),
      issueId: normalizeOptionalString(parsed.issue_id),
      issueIdentifier: normalizeOptionalString(parsed.issue_identifier),
      proofPid: readManifestProofPid(manifestPath)
    };
  } catch {
    return null;
  }
}

function readManifestProofPid(manifestPath: string): number | null {
  const runRoot = dirname(manifestPath);
  const proofPath = join(runRoot, 'provider-linear-worker-proof.json');
  if (!existsSync(proofPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(proofPath, 'utf8')) as Record<string, unknown>;
    return parsePositiveInteger(parsed.pid);
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d+$/u.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return parsed > 0 ? parsed : null;
}

function buildManifestCatalogByWorkspace(
  catalog: DelegateServerManifestAssociation[]
): Map<string, DelegateServerManifestAssociation[]> {
  const byWorkspace = new Map<string, DelegateServerManifestAssociation[]>();
  for (const association of catalog) {
    if (!association.workspacePath) {
      continue;
    }
    const existing = byWorkspace.get(association.workspacePath) ?? [];
    existing.push(association);
    byWorkspace.set(association.workspacePath, existing);
  }
  return byWorkspace;
}

function resolveManifestCandidatesForWorkspace(
  workspacePath: string,
  manifestCatalogByWorkspace: Map<string, DelegateServerManifestAssociation[]>
): DelegateServerManifestAssociation[] {
  const exactCandidates = manifestCatalogByWorkspace.get(workspacePath);
  if (exactCandidates && exactCandidates.length > 0) {
    return exactCandidates;
  }
  const fallbackWorkspaceRoot = [...manifestCatalogByWorkspace.keys()]
    .filter((candidateWorkspacePath) => isPathWithinWorkspaceRoot(candidateWorkspacePath, workspacePath))
    .sort((left, right) => right.length - left.length)[0];
  if (!fallbackWorkspaceRoot) {
    return [];
  }
  return manifestCatalogByWorkspace.get(fallbackWorkspaceRoot) ?? [];
}

function buildDelegateServerProcessDraft(
  record: DelegateServerProcessRecord,
  processMap: Map<number, DelegateServerProcessRecord>,
  readProcessCwdValue: (pid: number) => string | null,
  manifestCatalogByWorkspace: Map<string, DelegateServerManifestAssociation[]>
): DelegateServerProcessDraft {
  const parentRecord = processMap.get(record.ppid) ?? null;
  const rootCodexParent = resolveDelegateServerRootCodexParent(record, processMap);
  const cwd = readProcessCwdValue(record.pid);
  const parentCwd = parentRecord ? readProcessCwdValue(parentRecord.pid) : null;
  const rootCodexParentCwd = rootCodexParent ? readProcessCwdValue(rootCodexParent.pid) : null;
  const ancestryPids = resolveProcessAncestryPids(record, processMap);
  return {
    record,
    cwd,
    parentRecord,
    parentCwd,
    rootCodexParent,
    rootCodexParentCwd,
    ancestryPids,
    manifestAssociation: resolveManifestAssociationForProcess(
      [cwd, parentCwd, rootCodexParentCwd],
      ancestryPids,
      manifestCatalogByWorkspace
    )
  };
}

function resolveProcessAncestryPids(
  record: DelegateServerProcessRecord,
  processMap: Map<number, DelegateServerProcessRecord>
): number[] {
  const ancestry: number[] = [];
  const seen = new Set<number>();
  let current: DelegateServerProcessRecord | null = record;
  while (current && !seen.has(current.pid)) {
    ancestry.push(current.pid);
    seen.add(current.pid);
    current = processMap.get(current.ppid) ?? null;
  }
  return ancestry;
}

function resolveManifestAssociationForProcess(
  candidateWorkspaces: Array<string | null>,
  ancestryPids: number[],
  manifestCatalogByWorkspace: Map<string, DelegateServerManifestAssociation[]>
): DelegateServerManifestAssociation | null {
  const ancestryPidSet = new Set(ancestryPids);
  for (const workspacePath of candidateWorkspaces) {
    if (!workspacePath) {
      continue;
    }
    const candidates = resolveManifestCandidatesForWorkspace(workspacePath, manifestCatalogByWorkspace);
    if (!candidates || candidates.length === 0) {
      continue;
    }
    const exactAncestryMatch = candidates
      .filter((candidate) => candidate.proofPid !== null && ancestryPidSet.has(candidate.proofPid))
      .sort(compareManifestAssociations)[0];
    if (exactAncestryMatch) {
      return exactAncestryMatch;
    }
    if (isScopedWorkspacePath(workspacePath)) {
      const scopedFallback = resolveScopedWorkspaceFallbackAssociation(candidates);
      if (scopedFallback) {
        return scopedFallback;
      }
    }
  }
  return null;
}

function isScopedWorkspacePath(workspacePath: string): boolean {
  const normalized = workspacePath.replace(/\\/gu, '/');
  return normalized.includes('/.workspaces/') || normalized.includes('/.child-lanes/');
}

function isPathWithinWorkspaceRoot(root: string, candidate: string): boolean {
  const normalizedRoot = normalizePathForComparison(root);
  const normalizedCandidate = normalizePathForComparison(candidate);
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

function normalizePathForComparison(value: string): string {
  return value.replace(/\\/gu, '/').replace(/\/+$/u, '');
}

function resolveScopedWorkspaceFallbackAssociation(
  candidates: DelegateServerManifestAssociation[]
): DelegateServerManifestAssociation | null {
  if (candidates.length === 0) {
    return null;
  }
  const liveCandidates = candidates.filter((candidate) => !isTerminalManifestStatus(candidate.status));
  const terminalCandidates = candidates.filter((candidate) => isTerminalManifestStatus(candidate.status));
  if (liveCandidates.length === 0) {
    return [...terminalCandidates].sort(compareManifestAssociations)[0] ?? null;
  }
  if (terminalCandidates.length === 0) {
    return [...liveCandidates].sort(compareManifestAssociations)[0] ?? null;
  }
  if (liveCandidates.every((candidate) => candidate.proofPid !== null)) {
    return [...terminalCandidates].sort(compareManifestAssociations)[0] ?? null;
  }
  return null;
}

function compareManifestAssociations(
  left: DelegateServerManifestAssociation,
  right: DelegateServerManifestAssociation
): number {
  const leftTerminal = isTerminalManifestStatus(left.status);
  const rightTerminal = isTerminalManifestStatus(right.status);
  if (leftTerminal !== rightTerminal) {
    return leftTerminal ? 1 : -1;
  }
  return (right.runId ?? '').localeCompare(left.runId ?? '');
}

function isTerminalManifestStatus(status: string | null): boolean {
  return status === 'succeeded'
    || status === 'failed'
    || status === 'cancelled'
    || status === 'canceled'
    || status === 'done';
}

function resolveFreshestUnassociatedPidByRootParent(
  drafts: DelegateServerProcessDraft[]
): Map<number, number> {
  const freshest = new Map<number, number>();
  for (const draft of drafts) {
    if (!draft.rootCodexParent || draft.manifestAssociation) {
      continue;
    }
    const rootPid = draft.rootCodexParent.pid;
    const currentPid = freshest.get(rootPid);
    if (currentPid === undefined) {
      freshest.set(rootPid, draft.record.pid);
      continue;
    }
    const currentDraft = drafts.find((candidate) => candidate.record.pid === currentPid) ?? null;
    if (!currentDraft) {
      freshest.set(rootPid, draft.record.pid);
      continue;
    }
    const currentAge = currentDraft.record.elapsedSeconds ?? Number.MAX_SAFE_INTEGER;
    const nextAge = draft.record.elapsedSeconds ?? Number.MAX_SAFE_INTEGER;
    if (nextAge < currentAge || (nextAge === currentAge && draft.record.pid > currentDraft.record.pid)) {
      freshest.set(rootPid, draft.record.pid);
    }
  }
  return freshest;
}

function finalizeDelegateServerProcessDetail(
  draft: DelegateServerProcessDraft,
  freshestUnassociatedPidByRootParent: Map<number, number>,
  thresholdSeconds: number
): DelegateServerProcessDetail {
  const association = draft.manifestAssociation;
  let classification: DelegateServerProcessClassification = 'active-unassociated';
  let classificationDetail = 'delegate-server is still rooted in a live codex session.';

  if (!draft.rootCodexParent) {
    if (draft.record.elapsedSeconds !== null && draft.record.elapsedSeconds >= thresholdSeconds) {
      classification = 'stale-orphan';
      classificationDetail = 'delegate-server is no longer rooted in a live codex parent and exceeded the stale threshold.';
    } else {
      classification = 'idle-orphan';
      classificationDetail = 'delegate-server is not rooted in a live codex parent and is still within the stale threshold.';
    }
  } else if (association && !isTerminalManifestStatus(association.status)) {
    classification = 'active-associated';
    classificationDetail = `delegate-server is rooted in codex parent ${draft.rootCodexParent.pid} and matches live manifest ${association.manifestPath}.`;
  } else if (association && isTerminalManifestStatus(association.status)) {
    if (draft.record.elapsedSeconds !== null && draft.record.elapsedSeconds >= thresholdSeconds) {
      classification = 'stale-parent-session';
      classificationDetail = `delegate-server is still parented by codex pid ${draft.rootCodexParent.pid}, but the matched manifest ${association.manifestPath} is terminal (${association.status ?? 'unknown'}).`;
    } else {
      classification = 'idle-parent-session';
      classificationDetail = `delegate-server matches terminal manifest ${association.manifestPath} but is still below the stale threshold.`;
    }
  } else {
    const freshestPid = freshestUnassociatedPidByRootParent.get(draft.rootCodexParent.pid) ?? null;
    if (freshestPid !== null && freshestPid !== draft.record.pid) {
      if (draft.record.elapsedSeconds !== null && draft.record.elapsedSeconds >= thresholdSeconds) {
        classification = 'stale-parent-session';
        classificationDetail =
          `delegate-server is an older sibling under live codex parent ${draft.rootCodexParent.pid}; pid ${freshestPid} is the freshest unassociated sibling kept active.`;
      } else {
        classification = 'idle-parent-session';
        classificationDetail =
          `delegate-server is an older sibling under live codex parent ${draft.rootCodexParent.pid} and remains below the stale threshold while pid ${freshestPid} stays active.`;
      }
    } else if (draft.record.elapsedSeconds !== null && draft.record.elapsedSeconds >= thresholdSeconds) {
      classification = 'idle-parent-session';
      classificationDetail =
        `delegate-server is the freshest unassociated sibling under live codex parent ${draft.rootCodexParent.pid}; it exceeded the stale threshold without a live manifest association, but no fresher sibling displaced it.`;
    } else {
      classificationDetail =
        `delegate-server is the freshest unassociated sibling under live codex parent ${draft.rootCodexParent.pid} and remains below the stale threshold.`;
    }
  }

  return {
    pid: draft.record.pid,
    ppid: draft.record.ppid,
    elapsedSeconds: draft.record.elapsedSeconds,
    rssKb: draft.record.rssKb,
    command: draft.record.command,
    cwd: draft.cwd,
    parentPid: draft.parentRecord?.pid ?? null,
    parentCommand: draft.parentRecord?.command ?? null,
    parentCwd: draft.parentCwd,
    rootCodexParentPid: draft.rootCodexParent?.pid ?? null,
    rootCodexParentCommand: draft.rootCodexParent?.command ?? null,
    rootCodexParentCwd: draft.rootCodexParentCwd,
    manifestAssociation: draft.manifestAssociation,
    classification,
    classificationDetail
  };
}

function buildDelegateServerInspectionDetail(
  idleDetails: DelegateServerProcessDetail[],
  staleDetails: DelegateServerProcessDetail[]
): string {
  const idleParentSessionCount = idleDetails.filter(
    (detail) => detail.classification === 'idle-parent-session'
  ).length;
  const idleOrphanCount = idleDetails.length - idleParentSessionCount;
  const staleParentSessionCount = staleDetails.filter(
    (detail) => detail.classification === 'stale-parent-session'
  ).length;
  const staleOrphanCount = staleDetails.length - staleParentSessionCount;
  const parts: string[] = [];
  if (idleDetails.length > 0) {
    parts.push(`Detected ${idleDetails.length} idle delegate-server processes`);
  }
  if (idleParentSessionCount > 0) {
    parts.push(`${idleParentSessionCount} idle parent-session`);
  }
  if (idleOrphanCount > 0) {
    parts.push(`${idleOrphanCount} idle orphan`);
  }
  if (staleDetails.length > 0) {
    parts.push(`Detected ${staleDetails.length} stale delegate-server processes`);
  }
  if (staleParentSessionCount > 0) {
    parts.push(`${staleParentSessionCount} stale parent-session`);
  }
  if (staleOrphanCount > 0) {
    parts.push(`${staleOrphanCount} orphaned`);
  }
  return `${parts.join(' / ')}.`;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseShellStyleArguments(command: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  const flushCurrent = (): void => {
    if (current.length === 0) {
      return;
    }
    args.push(current);
    current = '';
  };

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index]!;
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (quote === "'") {
      if (character === "'") {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }
    if (quote === '"') {
      if (character === '"') {
        quote = null;
        continue;
      }
      if (character === '\\') {
        const nextCharacter = command[index + 1];
        if (nextCharacter && ['\\', '"', '$', '`'].includes(nextCharacter)) {
          current += nextCharacter;
          index += 1;
          continue;
        }
      }
      current += character;
      continue;
    }
    if (/\s/u.test(character)) {
      flushCurrent();
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    current += character;
  }

  if (escaped) {
    current += '\\';
  }
  flushCurrent();
  return args;
}

function parseElapsedSeconds(value: string): number | null {
  if (!value) {
    return null;
  }
  const daySplit = value.split('-');
  let days = 0;
  let timePart = value;
  if (daySplit.length === 2) {
    days = Number(daySplit[0]);
    timePart = daySplit[1] ?? '';
  }
  const segments = timePart.split(':').map((part) => Number(part));
  if (segments.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (segments.length === 2) {
    return days * 86400 + segments[0]! * 60 + segments[1]!;
  }
  if (segments.length === 3) {
    return days * 86400 + segments[0]! * 3600 + segments[1]! * 60 + segments[2]!;
  }
  return null;
}

function classifyCleanupCandidate(
  original: DelegateServerProcessRecord,
  dependencies: Pick<DelegateServerCleanupDependencies, 'readProcessRecord' | 'isProcessAlive'>
): 'ready' | 'missing' | 'replaced' | 'remaining' {
  const current = dependencies.readProcessRecord(original.pid);
  if (!current) {
    return dependencies.isProcessAlive(original.pid) ? 'remaining' : 'missing';
  }
  const status = classifyMatchingDelegateServerProcess(original, current);
  if (status === 'replaced') {
    return 'replaced';
  }
  if (status === 'different') {
    return 'remaining';
  }
  return 'ready';
}

function classifyMatchingDelegateServerProcess(
  original: DelegateServerProcessRecord,
  current: DelegateServerProcessRecord
): 'same' | 'replaced' | 'different' {
  if (!isDelegateServerCommand(current.command)) {
    return 'replaced';
  }
  if (current.command !== original.command) {
    return 'replaced';
  }
  if (original.elapsedSeconds !== null && current.elapsedSeconds !== null && current.elapsedSeconds < original.elapsedSeconds) {
    return 'replaced';
  }
  return 'same';
}

function tryKillProcess(pid: number, signal: NodeJS.Signals): KillProcessOutcome {
  try {
    process.kill(pid, signal);
    return { status: 'signaled' };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code ?? null;
    if (code === 'ESRCH') {
      return { status: 'missing' };
    }
    return {
      status: 'blocked',
      code,
      detail: error instanceof Error ? error.message : `process.kill(${pid}, ${signal}) failed`
    };
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'EPERM') {
      return true;
    }
    return false;
  }
}

async function waitForMs(durationMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
