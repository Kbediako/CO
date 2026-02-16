#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { parseArgs, hasFlag } from './lib/cli-args.js';

const execFileAsync = promisify(execFile);

const DEFAULT_STATE_PATH = '.git/codex-orchestrator/subagent-edit-guard-state.json';
const DEFAULT_NAMESPACE = 'default';
const DEFAULT_MAX_AGE_MINUTES = 120;
const KNOWN_COMMANDS = new Set(['start', 'snapshot', 'finish', 'list', 'cleanup']);
const KNOWN_FLAGS = new Set([
  'stream',
  'scopes',
  'scope',
  'allow',
  'mode',
  'state',
  'namespace',
  'format',
  'max-age-minutes',
  'keep',
  'h',
  'help'
]);

function showUsage() {
  console.log(`Usage: node scripts/subagent-edit-guard.mjs <command> [options]

Commands:
  start      Capture baseline for a stream before spawn/wait
  snapshot   Refresh baseline for an existing stream
  finish     Compare current git status with baseline and classify scope drift
  list       Show active streams in the namespace
  cleanup    Remove stale streams from state

Options:
  --stream <id>               Stream name (required for start/snapshot/finish)
  --mode <read-only|write-enabled>
                              Stream write policy for start (default: write-enabled)
  --scopes <a,b,c>            Repo-relative scope roots/files for start
  --allow <a,b,c>             Extra paths allowed during finish
  --state <path>              State file path (default: ${DEFAULT_STATE_PATH})
  --namespace <id>            Namespace key (default: MCP_RUNNER_TASK_ID or "${DEFAULT_NAMESPACE}")
  --format <plain|json>       Output format for finish/list/cleanup (default: plain)
  --max-age-minutes <number>  Cleanup cutoff age in minutes (default: ${DEFAULT_MAX_AGE_MINUTES})
  --keep                      Keep stream entry after finish (default removes it)
  -h, --help                  Show this help text

Examples:
  node scripts/subagent-edit-guard.mjs start --stream impl --mode write-enabled --scopes src,tests
  node scripts/subagent-edit-guard.mjs finish --stream impl --allow README.md --format json
  node scripts/subagent-edit-guard.mjs start --stream scout --mode read-only --scopes docs
  node scripts/subagent-edit-guard.mjs cleanup --max-age-minutes 180`);
}

function resolveRepoRoot() {
  const configured = process.env.CODEX_ORCHESTRATOR_ROOT?.trim();
  if (!configured) {
    return process.cwd();
  }
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

function resolveStatePath(repoRoot, stateArg, defaultStatePath) {
  if (!stateArg) {
    return defaultStatePath;
  }
  return isAbsolute(stateArg) ? stateArg : resolve(repoRoot, stateArg);
}

function normalizePath(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function parseCsv(value) {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map((entry) => normalizePath(entry))
    .filter((entry, index, list) => entry.length > 0 && list.indexOf(entry) === index);
}

function shouldIgnorePath(path, ignoredPathPrefixes) {
  return ignoredPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}.tmp-`));
}

function parseStatusMap(raw, ignoredPathPrefixes = []) {
  const map = {};
  const entries = raw.split('\0');
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry || entry.length < 3) {
      continue;
    }
    const status = entry.slice(0, 2);
    const path = entry.slice(3);
    if ((status.includes('R') || status.includes('C')) && index + 1 < entries.length && entries[index + 1]) {
      const sourcePath = normalizePath(entries[index + 1]);
      if (sourcePath && !shouldIgnorePath(sourcePath, ignoredPathPrefixes)) {
        map[sourcePath] = status;
      }
      index += 1;
    }
    const normalized = normalizePath(path);
    if (normalized && !shouldIgnorePath(normalized, ignoredPathPrefixes)) {
      map[normalized] = status;
    }
  }
  return map;
}

function toChangedPaths(baseline, current, baselineSignatures, currentSignatures) {
  const baselineEntries = baseline && typeof baseline === 'object' ? baseline : {};
  const currentEntries = current && typeof current === 'object' ? current : {};
  const baselineSignatureEntries = baselineSignatures && typeof baselineSignatures === 'object' ? baselineSignatures : {};
  const currentSignatureEntries = currentSignatures && typeof currentSignatures === 'object' ? currentSignatures : {};
  const paths = new Set([
    ...Object.keys(baselineEntries),
    ...Object.keys(currentEntries),
    ...Object.keys(baselineSignatureEntries),
    ...Object.keys(currentSignatureEntries)
  ]);
  return Array.from(paths)
    .filter(
      (path) =>
        baselineEntries[path] !== currentEntries[path] || baselineSignatureEntries[path] !== currentSignatureEntries[path]
    )
    .sort((left, right) => left.localeCompare(right));
}

function pathInScope(path, scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    return false;
  }
  return scopes.some((scope) => {
    if (typeof scope !== 'string' || scope.length === 0) {
      return false;
    }
    if (scope === '.') {
      return true;
    }
    return path === scope || path.startsWith(`${scope}/`);
  });
}

function uniqueSorted(paths) {
  return Array.from(new Set(paths)).sort((left, right) => left.localeCompare(right));
}

function classifyPaths(paths, options) {
  const allowScopes = Array.isArray(options.allowScopes) ? options.allowScopes : [];
  const ownScopes = Array.isArray(options.ownScopes) ? options.ownScopes : [];
  const peerScopes = Array.isArray(options.peerScopes) ? options.peerScopes : [];
  const allowedPaths = [];
  const ownScopePaths = [];
  const peerScopePaths = [];
  const collisionPaths = [];
  const outOfScopePaths = [];
  for (const path of paths) {
    if (pathInScope(path, allowScopes)) {
      allowedPaths.push(path);
      continue;
    }
    const inOwnScope = pathInScope(path, ownScopes);
    const inPeerScope = pathInScope(path, peerScopes);
    if (inOwnScope && inPeerScope) {
      collisionPaths.push(path);
      continue;
    }
    if (inOwnScope) {
      ownScopePaths.push(path);
      continue;
    }
    if (inPeerScope) {
      peerScopePaths.push(path);
      continue;
    }
    outOfScopePaths.push(path);
  }
  return { allowedPaths, ownScopePaths, peerScopePaths, collisionPaths, outOfScopePaths };
}

function snapshotMatchesPath(snapshot, current, path) {
  const snapshotStatus = snapshot?.status?.[path];
  const snapshotSignature = snapshot?.signatures?.[path];
  const currentStatus = current?.status?.[path];
  const currentSignature = current?.signatures?.[path];
  return snapshotStatus === currentStatus && snapshotSignature === currentSignature;
}

function isClosedPeerAllowed(path, closedPeers, current) {
  for (const peer of closedPeers) {
    if (!pathInScope(path, peer.scopes)) {
      continue;
    }
    if (snapshotMatchesPath(peer.closed_snapshot, current, path)) {
      return true;
    }
  }
  return false;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeMode(rawMode) {
  const mode = typeof rawMode === 'string' ? rawMode.trim() : '';
  if (!mode) {
    return 'write-enabled';
  }
  if (mode !== 'read-only' && mode !== 'write-enabled') {
    throw new Error(`Invalid mode '${mode}'. Use 'read-only' or 'write-enabled'.`);
  }
  return mode;
}

function resolveNamespace(args) {
  const fromArg = typeof args.namespace === 'string' ? args.namespace.trim() : '';
  if (fromArg) {
    return fromArg;
  }
  const fromEnv = process.env.MCP_RUNNER_TASK_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return DEFAULT_NAMESPACE;
}

async function runGit(repoRoot, gitArgs) {
  const { stdout } = await execFileAsync('git', gitArgs, { cwd: repoRoot });
  return stdout;
}

async function resolveDefaultStatePath(repoRoot) {
  try {
    const gitDir = (await runGit(repoRoot, ['rev-parse', '--path-format=absolute', '--git-dir'])).trim();
    if (gitDir) {
      return resolve(gitDir, 'codex-orchestrator', 'subagent-edit-guard-state.json');
    }
  } catch {
    // Fallback for non-git contexts.
  }
  return resolve(repoRoot, DEFAULT_STATE_PATH);
}

function resolveIgnoredStatusPrefixes(repoRoot, statePath) {
  const stateRelative = normalizePath(relative(repoRoot, statePath));
  if (!stateRelative || stateRelative.startsWith('..')) {
    return [];
  }
  return [stateRelative];
}

async function captureBaseline(repoRoot, ignoredPathPrefixes = []) {
  const statusRaw = await runGit(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const status = parseStatusMap(statusRaw, ignoredPathPrefixes);
  let head = null;
  try {
    head = (await runGit(repoRoot, ['rev-parse', 'HEAD'])).trim() || null;
  } catch {
    head = null;
  }
  return {
    captured_at: nowIso(),
    head,
    status,
    signatures: await buildSignatures(repoRoot, status)
  };
}

function hashContent(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function signatureForPath(repoRoot, path) {
  const absolutePath = resolve(repoRoot, path);
  try {
    const content = await readFile(absolutePath);
    return `sha256:${hashContent(content)}`;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String(error.code ?? '');
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        return 'missing';
      }
      if (code === 'EISDIR') {
        return 'directory';
      }
      return `error:${code}`;
    }
    return 'error:unknown';
  }
}

async function buildSignatures(repoRoot, statusMap) {
  const signatures = {};
  const paths = Object.keys(statusMap ?? {}).sort((left, right) => left.localeCompare(right));
  await Promise.all(
    paths.map(async (path) => {
      signatures[path] = await signatureForPath(repoRoot, path);
    })
  );
  return signatures;
}

async function readState(statePath) {
  try {
    const raw = await readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    const namespaces = parsed && typeof parsed === 'object' && parsed.namespaces && typeof parsed.namespaces === 'object'
      ? parsed.namespaces
      : {};
    return { version: 1, namespaces };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { version: 1, namespaces: {} };
    }
    throw error;
  }
}

async function writeState(statePath, state) {
  await mkdir(dirname(statePath), { recursive: true });
  const tmpPath = `${statePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tmpPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  await rename(tmpPath, statePath);
}

function requireStream(args) {
  const stream = typeof args.stream === 'string' ? args.stream.trim() : '';
  if (!stream) {
    throw new Error('--stream is required');
  }
  return stream;
}

function printReport(report, format) {
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (report.kind === 'finish') {
    console.log(`subagent-edit-guard finish [${report.namespace}/${report.stream}]`);
    console.log(`mode: ${report.mode}`);
    console.log(`status: ${report.status}`);
    console.log(`changed paths: ${report.changed_paths.length}`);
    if (report.in_scope_paths.length > 0) {
      console.log(`in scope: ${report.in_scope_paths.join(', ')}`);
    }
    if (report.out_of_scope_paths.length > 0) {
      console.log(`out of scope: ${report.out_of_scope_paths.join(', ')}`);
    }
    if (Array.isArray(report.collision_paths) && report.collision_paths.length > 0) {
      console.log(`collisions: ${report.collision_paths.join(', ')}`);
    }
    return;
  }
  if (report.kind === 'list') {
    console.log(`subagent-edit-guard list [${report.namespace}]`);
    if (report.streams.length === 0) {
      console.log('no active streams');
      return;
    }
    for (const stream of report.streams) {
      console.log(`- ${stream.stream} (${stream.mode}) scopes=${stream.scopes.join(',') || '<none>'}`);
    }
    return;
  }
  if (report.kind === 'cleanup') {
    console.log(`subagent-edit-guard cleanup [${report.namespace}]`);
    console.log(`removed: ${report.removed.length}`);
    if (report.removed.length > 0) {
      console.log(report.removed.map((entry) => `- ${entry}`).join('\n'));
    }
    return;
  }
  console.log(JSON.stringify(report, null, 2));
}

async function handleStart({ repoRoot, statePath, namespace, args }) {
  const stream = requireStream(args);
  const mode = normalizeMode(args.mode);
  const scopes = parseCsv(args.scopes ?? args.scope ?? '');
  if (mode === 'write-enabled' && scopes.length === 0) {
    throw new Error('--scopes is required for write-enabled streams');
  }

  const state = await readState(statePath);
  const namespaceState = state.namespaces[namespace] ?? { streams: {}, closed_streams: {} };
  const ignoredPaths = resolveIgnoredStatusPrefixes(repoRoot, statePath);
  if (namespaceState.streams[stream]) {
    throw new Error(`Stream '${stream}' already exists in namespace '${namespace}'. Use snapshot/finish first.`);
  }
  if (namespaceState.closed_streams && typeof namespaceState.closed_streams === 'object') {
    delete namespaceState.closed_streams[stream];
  }

  namespaceState.streams[stream] = {
    stream,
    mode,
    scopes,
    created_at: nowIso(),
    updated_at: nowIso(),
    baseline: await captureBaseline(repoRoot, ignoredPaths)
  };
  state.namespaces[namespace] = namespaceState;
  await writeState(statePath, state);

  console.log(`subagent-edit-guard start [${namespace}/${stream}]`);
  console.log(`mode: ${mode}`);
  console.log(`scopes: ${scopes.join(',') || '<none>'}`);
}

async function handleSnapshot({ repoRoot, statePath, namespace, args }) {
  const stream = requireStream(args);
  const state = await readState(statePath);
  const namespaceState = state.namespaces[namespace];
  const ignoredPaths = resolveIgnoredStatusPrefixes(repoRoot, statePath);
  if (!namespaceState?.streams?.[stream]) {
    throw new Error(`Stream '${stream}' not found in namespace '${namespace}'.`);
  }

  namespaceState.streams[stream].baseline = await captureBaseline(repoRoot, ignoredPaths);
  namespaceState.streams[stream].updated_at = nowIso();
  await writeState(statePath, state);

  console.log(`subagent-edit-guard snapshot [${namespace}/${stream}] updated`);
}

async function handleFinish({ repoRoot, statePath, namespace, args }) {
  const stream = requireStream(args);
  const format = args.format === 'json' ? 'json' : 'plain';
  const keep = hasFlag(args, 'keep');
  const allow = parseCsv(args.allow ?? '');

  const state = await readState(statePath);
  const namespaceState = state.namespaces[namespace];
  const streamState = namespaceState?.streams?.[stream];
  const ignoredPaths = resolveIgnoredStatusPrefixes(repoRoot, statePath);
  if (!streamState) {
    throw new Error(`Stream '${stream}' not found in namespace '${namespace}'.`);
  }

  const current = await captureBaseline(repoRoot, ignoredPaths);
  const changedPaths = toChangedPaths(
    streamState.baseline?.status,
    current.status,
    streamState.baseline?.signatures,
    current.signatures
  );
  const activePeerScopes = Object.values(namespaceState.streams)
    .filter((entry) => entry.stream !== stream && entry.mode === 'write-enabled')
    .flatMap((entry) => (Array.isArray(entry.scopes) ? entry.scopes : []));
  const closedPeers = Object.values(namespaceState.closed_streams ?? {}).filter(
    (entry) => entry.stream !== stream && entry.mode === 'write-enabled'
  );
  const scoped = classifyPaths(changedPaths, {
    ownScopes: streamState.scopes,
    peerScopes: activePeerScopes,
    allowScopes: allow
  });
  const closedPeerScopePaths = [];
  const outOfScopePaths = [];
  for (const path of scoped.outOfScopePaths) {
    if (isClosedPeerAllowed(path, closedPeers, current)) {
      closedPeerScopePaths.push(path);
      continue;
    }
    outOfScopePaths.push(path);
  }

  let status = 'ok';
  let violations = [];
  if (streamState.mode === 'read-only') {
    const disallowed = uniqueSorted([...scoped.ownScopePaths, ...scoped.collisionPaths, ...outOfScopePaths]);
    if (disallowed.length > 0) {
      status = 'read_only_violation';
      violations = disallowed;
    }
  } else if (scoped.collisionPaths.length > 0) {
    status = 'ownership_collision';
    violations = uniqueSorted(scoped.collisionPaths);
  } else if (outOfScopePaths.length > 0) {
    status = 'out_of_scope_changes';
    violations = uniqueSorted(outOfScopePaths);
  }

  if (!keep) {
    namespaceState.closed_streams = namespaceState.closed_streams ?? {};
    namespaceState.closed_streams[stream] = {
      stream,
      mode: streamState.mode,
      scopes: Array.isArray(streamState.scopes) ? streamState.scopes : [],
      closed_snapshot: {
        captured_at: current.captured_at,
        status: current.status,
        signatures: current.signatures
      },
      updated_at: nowIso(),
      closed_at: nowIso()
    };
    delete namespaceState.streams[stream];
    if (Object.keys(namespaceState.streams).length === 0) {
      delete state.namespaces[namespace];
    } else {
      namespaceState.updated_at = nowIso();
      state.namespaces[namespace] = namespaceState;
    }
    await writeState(statePath, state);
  } else {
    if (namespaceState.closed_streams && typeof namespaceState.closed_streams === 'object') {
      delete namespaceState.closed_streams[stream];
    }
    namespaceState.streams[stream].baseline = current;
    namespaceState.streams[stream].updated_at = nowIso();
    state.namespaces[namespace] = namespaceState;
    await writeState(statePath, state);
  }

  const report = {
    kind: 'finish',
    namespace,
    stream,
    mode: streamState.mode,
    status,
    changed_paths: changedPaths,
    in_scope_paths: uniqueSorted([
      ...scoped.allowedPaths,
      ...scoped.ownScopePaths,
      ...scoped.peerScopePaths,
      ...closedPeerScopePaths
    ]),
    own_scope_paths: uniqueSorted(scoped.ownScopePaths),
    peer_scope_paths: uniqueSorted([...scoped.peerScopePaths, ...closedPeerScopePaths]),
    active_peer_scope_paths: uniqueSorted(scoped.peerScopePaths),
    closed_peer_scope_paths: uniqueSorted(closedPeerScopePaths),
    collision_paths: uniqueSorted(scoped.collisionPaths),
    allowed_paths: uniqueSorted(scoped.allowedPaths),
    out_of_scope_paths: uniqueSorted(outOfScopePaths),
    violations,
    baseline_head: streamState.baseline?.head ?? null,
    current_head: current.head ?? null,
    baseline_captured_at: streamState.baseline?.captured_at ?? null,
    checked_at: nowIso(),
    removed_from_state: !keep
  };

  printReport(report, format);
  if (status !== 'ok') {
    process.exitCode = 1;
  }
}

async function handleList({ statePath, namespace, args }) {
  const format = args.format === 'json' ? 'json' : 'plain';
  const state = await readState(statePath);
  const streams = Object.values(state.namespaces[namespace]?.streams ?? {});
  const report = {
    kind: 'list',
    namespace,
    stream_count: streams.length,
    streams: streams.map((entry) => ({
      stream: entry.stream,
      mode: entry.mode,
      scopes: Array.isArray(entry.scopes) ? entry.scopes : [],
      updated_at: entry.updated_at ?? null
    }))
  };
  printReport(report, format);
}

async function handleCleanup({ statePath, namespace, args }) {
  const format = args.format === 'json' ? 'json' : 'plain';
  const maxAgeMinutesRaw = typeof args['max-age-minutes'] === 'string' ? Number(args['max-age-minutes']) : DEFAULT_MAX_AGE_MINUTES;
  const maxAgeMinutes = Number.isFinite(maxAgeMinutesRaw) && maxAgeMinutesRaw > 0 ? maxAgeMinutesRaw : DEFAULT_MAX_AGE_MINUTES;
  const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;
  const state = await readState(statePath);
  const namespaceState = state.namespaces[namespace] ?? { streams: {}, closed_streams: {} };
  const removed = [];

  for (const [stream, entry] of Object.entries(namespaceState.streams)) {
    const timestamp = Date.parse(entry.updated_at ?? entry.created_at ?? '');
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      delete namespaceState.streams[stream];
      removed.push(stream);
    }
  }

  for (const [stream, entry] of Object.entries(namespaceState.closed_streams ?? {})) {
    const timestamp = Date.parse(entry.updated_at ?? entry.closed_at ?? '');
    if (!Number.isFinite(timestamp) || timestamp < cutoff) {
      delete namespaceState.closed_streams[stream];
      removed.push(`${stream} (closed)`);
    }
  }

  if (Object.keys(namespaceState.streams).length > 0 || Object.keys(namespaceState.closed_streams ?? {}).length > 0) {
    state.namespaces[namespace] = namespaceState;
  } else {
    delete state.namespaces[namespace];
  }
  await writeState(statePath, state);

  const report = { kind: 'cleanup', namespace, removed, max_age_minutes: maxAgeMinutes };
  printReport(report, format);
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, 'h') || hasFlag(args, 'help') || positionals.length === 0) {
    showUsage();
    process.exit(positionals.length === 0 && !hasFlag(args, 'h') && !hasFlag(args, 'help') ? 2 : 0);
  }

  const command = positionals[0];
  if (!KNOWN_COMMANDS.has(command)) {
    console.error(`Unknown command: ${command}`);
    showUsage();
    process.exit(2);
  }

  const unknownFlags = Object.keys(args).filter((key) => !KNOWN_FLAGS.has(key));
  if (unknownFlags.length > 0) {
    console.error(`Unknown option: --${unknownFlags[0]}`);
    showUsage();
    process.exit(2);
  }

  const repoRoot = resolveRepoRoot();
  const namespace = resolveNamespace(args);
  const defaultStatePath = await resolveDefaultStatePath(repoRoot);
  const statePath = resolveStatePath(repoRoot, args.state, defaultStatePath);
  const context = { repoRoot, namespace, statePath, args };

  switch (command) {
    case 'start':
      await handleStart(context);
      break;
    case 'snapshot':
      await handleSnapshot(context);
      break;
    case 'finish':
      await handleFinish(context);
      break;
    case 'list':
      await handleList(context);
      break;
    case 'cleanup':
      await handleCleanup(context);
      break;
    default:
      throw new Error(`Unsupported command: ${command}`);
  }
}

main().catch((error) => {
  const message =
    error && typeof error === 'object' && error !== null && 'message' in error ? error.message : String(error);
  console.error(`subagent-edit-guard failed: ${message}`);
  process.exit(1);
});
