import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
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

interface DelegateServerProcessInspectionBundle {
  inspection: DelegateServerProcessInspection;
  staleRecords: DelegateServerProcessRecord[];
}

interface DelegateServerCleanupDependencies {
  inspect: (options: { staleThresholdSeconds?: number }) => DelegateServerProcessInspectionBundle;
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
} = {}): DelegateServerProcessInspection {
  return inspectDelegateServerProcessBundle(options).inspection;
}

function inspectDelegateServerProcessBundle(options: {
  snapshot?: string;
  staleThresholdSeconds?: number;
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
        detail: snapshotResult.detail
      },
      staleRecords: []
    };
  }

  const allProcesses = parseDelegateServerProcessSnapshot(snapshotResult.output);
  const processes = allProcesses.filter((record) => isDelegateServerCommand(record.command));
  const processMap = new Map(allProcesses.map((record) => [record.pid, record]));
  const activePids: number[] = [];
  const stalePids: number[] = [];
  const staleRecords: DelegateServerProcessRecord[] = [];
  let staleRssKb = 0;

  for (const record of processes) {
    if (isDelegateServerRootedInCodex(record, processMap)) {
      activePids.push(record.pid);
      continue;
    }
    if (record.elapsedSeconds !== null && record.elapsedSeconds >= thresholdSeconds) {
      stalePids.push(record.pid);
      staleRecords.push(record);
      staleRssKb += record.rssKb;
    }
  }

  const detail =
    processes.length === 0
      ? 'No delegate-server processes detected.'
      : stalePids.length > 0
        ? `Detected ${stalePids.length} stale delegate-server processes not rooted in a live codex client.`
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
      detail
    },
    staleRecords
  };
}

export async function cleanupStaleDelegateServerProcesses(options: {
  apply?: boolean;
  staleThresholdSeconds?: number;
} = {}, dependencies: Partial<DelegateServerCleanupDependencies> = {}): Promise<DelegateServerCleanupResult> {
  const cleanupDependencies = { ...DEFAULT_DELEGATE_SERVER_CLEANUP_DEPENDENCIES, ...dependencies };
  const { inspection, staleRecords } = cleanupDependencies.inspect({
    staleThresholdSeconds: options.staleThresholdSeconds
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
  const token = basename(candidate);
  return token === 'codex-orchestrator' || token === 'codex-orchestrator.js';
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
  if (delegateIndex === 0) {
    return isCodexOrchestratorWrapperPath(args[0] ?? '') || isDistCodexOrchestratorPath(args[0] ?? '');
  }
  return args.slice(0, delegateIndex).some((token) => {
    return isCodexOrchestratorWrapperPath(token) || isDistCodexOrchestratorPath(token);
  });
}

function isDelegateServerRootedInCodex(
  record: DelegateServerProcessRecord,
  processMap: Map<number, DelegateServerProcessRecord>
): boolean {
  let current: DelegateServerProcessRecord | undefined = record;
  const visited = new Set<number>();
  while (current && !visited.has(current.pid)) {
    visited.add(current.pid);
    if (isCodexClientCommand(current.command)) {
      return true;
    }
    if (current.ppid <= 1) {
      return false;
    }
    current = processMap.get(current.ppid);
  }
  return false;
}

function isCodexClientCommand(command: string): boolean {
  const args = parseShellStyleArguments(command);
  const recognizedBasenames = buildRecognizedCodexClientBasenames();
  return args.some((arg) => recognizedBasenames.has(basename(arg).toLowerCase()));
}

function buildRecognizedCodexClientBasenames(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const basenames = new Set(['codex', 'codex.exe', 'codex.cmd']);
  try {
    basenames.add(basename(resolveCodexCliBin(env)).toLowerCase());
  } catch {
    // Ignore local codex binary resolution failures and keep the default names.
  }
  return basenames;
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
