#!/usr/bin/env node
/**
 * Build the Orchestrator Status UI dataset from local artifacts.
 */

import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'node:child_process';
import { register } from 'node:module';
import { promisify } from 'node:util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const OUTPUT_TASK_ID = '0911-orchestrator-status-ui';
const DEFAULT_LOG_LINE_LIMIT = 200;
const DEFAULT_LOG_BYTE_LIMIT = 100 * 1024;
const TERMINAL_RUN_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'canceled']);

const repoRoot = path.resolve(process.env.CODEX_ORCHESTRATOR_ROOT ?? process.cwd());
const runsRoot = path.resolve(process.env.CODEX_ORCHESTRATOR_RUNS_DIR ?? path.join(repoRoot, '.runs'));
const outRoot = path.resolve(process.env.CODEX_ORCHESTRATOR_OUT_DIR ?? path.join(repoRoot, 'out'));

let writeJsonAtomicPromise = null;

async function loadWriteJsonAtomic() {
  if (!writeJsonAtomicPromise) {
    writeJsonAtomicPromise = (async () => {
      register('ts-node/esm', new URL('..', import.meta.url));
      const module = await import('../orchestrator/src/cli/utils/fs.js');
      return module.writeJsonAtomic;
    })();
  }
  return writeJsonAtomicPromise;
}

function isoTimestamp(date = new Date()) {
  return date.toISOString();
}

async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}


function buildTaskKey(item) {
  const id = item?.id ?? '';
  const slug = item?.slug ?? '';
  if (!id) {
    return slug;
  }
  if (!slug) {
    return id;
  }
  if (slug.startsWith(`${id}-`)) {
    return slug;
  }
  return `${id}-${slug}`;
}

function resolveTaskCandidates(item) {
  const candidates = [buildTaskKey(item), item?.slug, item?.id]
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(candidates)];
}

function normalizeStatus(status) {
  if (!status || typeof status !== 'string') {
    return null;
  }
  return status.toLowerCase();
}

function isTerminalStatus(status) {
  const normalized = normalizeStatus(status);
  return normalized ? TERMINAL_RUN_STATUSES.has(normalized) : false;
}

function buildSyntheticRunFromTask(item, taskKey) {
  const completedAt = item?.completed_at ?? null;
  if (!completedAt) {
    return null;
  }
  const normalizedStatus = normalizeStatus(item?.status);
  const terminalStatus = normalizedStatus && isTerminalStatus(normalizedStatus) ? normalizedStatus : 'succeeded';
  const startedAt = item?.created_at ?? completedAt;
  return {
    task_id: taskKey,
    run_id: item?.gate?.run_id ?? null,
    status: terminalStatus,
    status_detail: null,
    started_at: startedAt,
    completed_at: completedAt,
    updated_at: completedAt,
    heartbeat_at: null,
    heartbeat_stale_after_seconds: null,
    approvals: [],
    commands: [],
    stages: [],
    summary: null,
    links: {
      manifest: item?.gate?.log ?? null,
      log: null
    },
    source: 'index'
  };
}

function parseRunIdTimestamp(runId) {
  if (typeof runId !== 'string') {
    return null;
  }
  const match = runId.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/);
  if (!match) {
    return null;
  }
  const [, datePart, hour, minute, second, millis] = match;
  const iso = `${datePart}T${hour}:${minute}:${second}.${millis}Z`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function pickLatestRunId(runIds) {
  if (!Array.isArray(runIds) || runIds.length === 0) {
    return null;
  }
  const sorted = [...runIds].sort((a, b) => {
    const aTime = parseRunIdTimestamp(a)?.getTime();
    const bTime = parseRunIdTimestamp(b)?.getTime();
    if (aTime != null && bTime != null) {
      return bTime - aTime;
    }
    return b.localeCompare(a);
  });
  return sorted[0] ?? null;
}

function countPendingApprovals(approvals) {
  if (!Array.isArray(approvals)) {
    return 0;
  }
  return approvals.filter((entry) => isPendingApproval(entry)).length;
}

function countTotalApprovals(approvals) {
  if (!Array.isArray(approvals)) {
    return 0;
  }
  return approvals.length;
}

function isPendingApproval(entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }
  const status = normalizeStatus(entry.status ?? entry.state ?? entry.approval_status ?? entry.result);
  if (status && ['pending', 'requested', 'open', 'awaiting', 'waiting', 'blocked'].includes(status)) {
    return true;
  }
  if (entry.pending === true) {
    return true;
  }
  if (entry.approved === false) {
    return true;
  }
  if (entry.decision === 'pending') {
    return true;
  }
  if (entry.requested_at && !(entry.approved_at || entry.resolved_at || entry.completed_at)) {
    return true;
  }
  return false;
}

function approvalKey(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const id = entry.id ?? entry.approval_id ?? entry.approvalId;
  if (typeof id === 'string' && id.trim()) {
    return id.trim();
  }
  const actor = typeof entry.actor === 'string' ? entry.actor.trim() : '';
  const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp.trim() : '';
  if (actor || timestamp) {
    return `${actor}|${timestamp}`;
  }
  return null;
}

function mergeApprovals(primary, secondary) {
  const merged = Array.isArray(primary) ? [...primary] : [];
  if (!Array.isArray(secondary)) {
    return merged;
  }
  const seen = new Set(merged.map(approvalKey).filter(Boolean));
  for (const entry of secondary) {
    const key = approvalKey(entry);
    if (key && seen.has(key)) {
      continue;
    }
    if (key) {
      seen.add(key);
    }
    merged.push(entry);
  }
  return merged;
}

function hasStartedCommands(commands) {
  if (!Array.isArray(commands)) {
    return false;
  }
  return commands.some((command) => {
    if (!command || typeof command !== 'object') {
      return false;
    }
    if (command.started_at) {
      return true;
    }
    const status = normalizeStatus(command.status);
    return status && status !== 'pending' && status !== 'queued';
  });
}

function isHeartbeatStale(heartbeatAt, staleAfterSeconds, now = new Date()) {
  if (!heartbeatAt || !Number.isFinite(Number(staleAfterSeconds))) {
    return false;
  }
  const heartbeatTime = new Date(heartbeatAt).getTime();
  if (Number.isNaN(heartbeatTime)) {
    return false;
  }
  const threshold = Number(staleAfterSeconds) * 1000;
  return now.getTime() - heartbeatTime > threshold;
}

function isHeartbeatFresh(heartbeatAt, staleAfterSeconds, now = new Date()) {
  if (!heartbeatAt || !Number.isFinite(Number(staleAfterSeconds))) {
    return null;
  }
  const heartbeatTime = new Date(heartbeatAt).getTime();
  if (Number.isNaN(heartbeatTime)) {
    return null;
  }
  const threshold = Number(staleAfterSeconds) * 1000;
  return now.getTime() - heartbeatTime <= threshold;
}

function classifyTaskBucket(run, { now = new Date() } = {}) {
  if (!run) {
    return { bucket: 'pending', reason: 'no-run', approvals_pending: 0, heartbeat_stale: false };
  }

  const startedAt = run.started_at ?? null;
  const commands = Array.isArray(run.commands) ? run.commands : [];
  if (!startedAt && !hasStartedCommands(commands)) {
    return { bucket: 'pending', reason: 'not-started', approvals_pending: 0, heartbeat_stale: false };
  }

  const status = normalizeStatus(run.status);
  const completedAt = run.completed_at ?? null;
  const approvalsPending = countPendingApprovals(run.approvals);
  const heartbeatStale = isHeartbeatStale(run.heartbeat_at, run.heartbeat_stale_after_seconds, now);

  if (status && isTerminalStatus(status) && completedAt) {
    return { bucket: 'complete', reason: 'terminal', approvals_pending: approvalsPending, heartbeat_stale: heartbeatStale };
  }

  if ((status && !isTerminalStatus(status)) || !status) {
    if (approvalsPending > 0 || heartbeatStale) {
      return {
        bucket: 'ongoing',
        reason: approvalsPending > 0 ? 'pending-approvals' : 'stale-heartbeat',
        approvals_pending: approvalsPending,
        heartbeat_stale: heartbeatStale
      };
    }
    return { bucket: 'active', reason: 'running', approvals_pending: approvalsPending, heartbeat_stale: heartbeatStale };
  }

  return { bucket: 'pending', reason: 'unknown', approvals_pending: approvalsPending, heartbeat_stale: heartbeatStale };
}

function buildTaskSummary(run) {
  if (!run) {
    return null;
  }
  if (run.summary) {
    return run.summary;
  }
  const commands = Array.isArray(run.commands) ? run.commands : [];
  if (!commands.length) {
    return null;
  }
  const total = commands.length;
  const runningIndex = commands.findIndex((command) => normalizeStatus(command.status) === 'running');
  if (runningIndex !== -1) {
    const current = commands[runningIndex];
    return `Stage ${runningIndex + 1}/${total}: ${current.id ?? current.title ?? 'running'}`;
  }
  const pendingIndex = commands.findIndex((command) => normalizeStatus(command.status) === 'pending');
  if (pendingIndex !== -1) {
    const current = commands[pendingIndex];
    return `Stage ${pendingIndex + 1}/${total}: ${current.id ?? current.title ?? 'pending'}`;
  }
  return `Stages ${total}/${total} complete`;
}

function durationMs(startedAt, completedAt) {
  if (!startedAt || !completedAt) {
    return null;
  }
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return Math.max(0, end - start);
}

function normalizeCliManifest(manifest, manifestPath) {
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  const stages = commands.map((command) => ({
    id: command.id,
    title: command.title ?? command.id,
    status: command.status ?? 'pending',
    started_at: command.started_at ?? null,
    completed_at: command.completed_at ?? null,
    duration_ms: durationMs(command.started_at, command.completed_at)
  }));

  return {
    task_id: manifest.task_id,
    run_id: manifest.run_id,
    status: manifest.status ?? null,
    status_detail: manifest.status_detail ?? null,
    started_at: manifest.started_at ?? null,
    completed_at: manifest.completed_at ?? null,
    updated_at: manifest.updated_at ?? manifest.completed_at ?? manifest.started_at ?? null,
    heartbeat_at: manifest.heartbeat_at ?? null,
    heartbeat_stale_after_seconds: manifest.heartbeat_stale_after_seconds ?? null,
    approvals: Array.isArray(manifest.approvals) ? manifest.approvals : [],
    commands,
    stages,
    summary: manifest.summary ?? null,
    links: {
      manifest: path.relative(repoRoot, manifestPath),
      log: manifest.log_path ?? null
    },
    source: 'cli'
  };
}

function deriveLegacyStatus(manifest) {
  const buildSuccess = manifest?.build?.success;
  const testSuccess = manifest?.test?.success;
  const reviewApproved = manifest?.review?.decision?.approved;

  if (buildSuccess === false || testSuccess === false) {
    return 'failed';
  }
  if (reviewApproved === false) {
    return 'failed';
  }
  if (buildSuccess === true && (testSuccess === true || typeof testSuccess === 'undefined')) {
    return 'succeeded';
  }
  return 'in_progress';
}

function normalizeLegacyManifest(manifest, manifestPath, taskKey) {
  const taskId = manifest?.taskId ?? manifest?.task_id ?? taskKey;
  const runId = manifest?.runId ?? manifest?.run_id ?? manifest?.build?.runId ?? null;
  const timestamp = manifest?.timestamp ?? null;
  const summary = manifest?.review?.summary ?? manifest?.build?.notes ?? null;

  return {
    task_id: taskId,
    run_id: runId,
    status: deriveLegacyStatus(manifest),
    status_detail: null,
    started_at: timestamp,
    completed_at: timestamp,
    updated_at: timestamp,
    heartbeat_at: null,
    heartbeat_stale_after_seconds: null,
    approvals: [],
    commands: [],
    stages: [],
    summary,
    links: manifestPath ? { manifest: path.relative(repoRoot, manifestPath), log: null } : { manifest: null, log: null },
    source: 'legacy'
  };
}

function deriveDesignStatus(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    return 'succeeded';
  }
  const statuses = stages.map((stage) => normalizeStatus(stage?.status));
  if (statuses.some((status) => status === 'failed')) {
    return 'failed';
  }
  if (statuses.some((status) => status && !['succeeded', 'skipped'].includes(status))) {
    return 'in_progress';
  }
  return 'succeeded';
}

function normalizeDesignRun(run, runIdFallback) {
  const runId = run?.run_id ?? run?.runId ?? runIdFallback ?? null;
  const taskId = run?.task_id ?? run?.taskId ?? null;
  const generatedAt = run?.generated_at ?? run?.summary?.generated_at ?? null;
  const stages = Array.isArray(run?.stages)
    ? run.stages.map((stage) => ({
        id: stage?.id ?? stage?.stage ?? stage?.title ?? 'stage',
        title: stage?.title ?? stage?.id ?? stage?.stage ?? 'Stage',
        status: stage?.status ?? 'pending',
        started_at: stage?.started_at ?? null,
        completed_at: stage?.completed_at ?? null,
        duration_ms: durationMs(stage?.started_at, stage?.completed_at)
      }))
    : [];

  return {
    task_id: taskId,
    run_id: runId,
    status: deriveDesignStatus(run?.stages),
    status_detail: null,
    started_at: generatedAt,
    completed_at: generatedAt,
    updated_at: generatedAt,
    heartbeat_at: null,
    heartbeat_stale_after_seconds: null,
    approvals: Array.isArray(run?.approvals) ? run.approvals : [],
    commands: [],
    stages,
    summary: null,
    links: {
      manifest: run?.manifest ?? null,
      log: null
    },
    source: 'design'
  };
}

async function listDirectories(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function listFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function selectLatestRunRecord(runs) {
  if (!Array.isArray(runs) || runs.length === 0) {
    return null;
  }
  const sorted = [...runs].sort((a, b) => {
    const aTimestamp = new Date(a?.timestamp ?? '').getTime();
    const bTimestamp = new Date(b?.timestamp ?? '').getTime();
    if (!Number.isNaN(aTimestamp) && !Number.isNaN(bTimestamp) && aTimestamp !== bTimestamp) {
      return bTimestamp - aTimestamp;
    }
    const aRun = parseRunIdTimestamp(a?.runId)?.getTime();
    const bRun = parseRunIdTimestamp(b?.runId)?.getTime();
    if (aRun != null && bRun != null && aRun !== bRun) {
      return bRun - aRun;
    }
    return String(b?.runId ?? '').localeCompare(String(a?.runId ?? ''));
  });
  return sorted[0] ?? null;
}

async function resolveLatestDesignRun(taskKey) {
  const runsPath = path.join(outRoot, taskKey, 'design', 'runs');
  const runFiles = (await listFiles(runsPath)).filter((name) => name.endsWith('.json'));
  if (runFiles.length === 0) {
    return null;
  }
  const runIds = runFiles.map((name) => name.replace(/\.json$/, ''));
  const latestRunId = pickLatestRunId(runIds);
  if (!latestRunId) {
    return null;
  }
  const runPath = path.join(runsPath, `${latestRunId}.json`);
  const run = await readJson(runPath);
  if (!run) {
    return null;
  }
  return { run, runPath, runId: latestRunId };
}

function findManifestArtifactPath(runRecord) {
  const artifacts = runRecord?.build?.artifacts;
  if (!Array.isArray(artifacts)) {
    return null;
  }
  const manifest = artifacts.find((artifact) =>
    typeof artifact?.path === 'string' && artifact.path.endsWith('/manifest.json')
  );
  return manifest?.path ?? null;
}

async function resolveRunFromOut(taskKey) {
  const runsPath = path.join(outRoot, taskKey, 'runs.json');
  const runsData = await readJson(runsPath);
  if (!runsData) {
    return null;
  }
  const latestRun = selectLatestRunRecord(runsData.runs);
  if (!latestRun) {
    return null;
  }
  const manifestPathRel = findManifestArtifactPath(latestRun);
  if (manifestPathRel) {
    const manifestPath = path.resolve(repoRoot, manifestPathRel);
    const manifest = await readJson(manifestPath);
    if (manifest) {
      return { manifest, manifestPath, source: 'cli', runRecord: latestRun };
    }
  }
  return { legacyRun: latestRun, runsPath };
}

async function resolveLatestCliRun(taskKey) {
  const cliRoot = path.join(runsRoot, taskKey, 'cli');
  const runIds = await listDirectories(cliRoot);
  const latestRunId = pickLatestRunId(runIds);
  if (!latestRunId) {
    return null;
  }
  const manifestPath = path.join(cliRoot, latestRunId, 'manifest.json');
  const manifest = await readJson(manifestPath);
  if (!manifest) {
    return null;
  }
  return { manifest, manifestPath, source: 'cli' };
}

async function resolveLatestLegacyRun(taskKey) {
  const taskRoot = path.join(runsRoot, taskKey);
  const runIds = (await listDirectories(taskRoot)).filter(
    (dir) => !['cli', 'mcp', 'metrics'].includes(dir)
  );
  const latestRunId = pickLatestRunId(runIds);
  if (!latestRunId) {
    return null;
  }
  const manifestPath = path.join(taskRoot, latestRunId, 'manifest.json');
  const manifest = await readJson(manifestPath);
  if (!manifest) {
    return null;
  }
  return { manifest, manifestPath, source: 'legacy' };
}

async function resolveLatestRun(taskKey) {
  const outRun = await resolveRunFromOut(taskKey);
  if (outRun?.manifest) {
    return normalizeCliManifest(outRun.manifest, outRun.manifestPath);
  }
  if (outRun?.legacyRun) {
    return normalizeLegacyManifest(outRun.legacyRun, null, taskKey);
  }

  const cliRun = await resolveLatestCliRun(taskKey);
  if (cliRun?.manifest) {
    return normalizeCliManifest(cliRun.manifest, cliRun.manifestPath);
  }

  const legacyRun = await resolveLatestLegacyRun(taskKey);
  if (legacyRun?.manifest) {
    return normalizeLegacyManifest(legacyRun.manifest, legacyRun.manifestPath, taskKey);
  }

  return null;
}

function shouldMergeDesignApprovals(run, designRun) {
  if (!run || !designRun) {
    return false;
  }
  if (run.source === 'design') {
    return false;
  }
  const runId = run.run_id ?? null;
  const designRunId = designRun.run_id ?? designRun.runId ?? null;
  if (runId && designRunId && runId === designRunId) {
    return true;
  }
  const runManifest = run.links?.manifest ?? null;
  const designManifest = designRun.manifest ?? null;
  return Boolean(runManifest && designManifest && runManifest === designManifest);
}

async function resolveLatestRunForTask(candidates) {
  for (const candidate of candidates) {
    const run = await resolveLatestRun(candidate);
    if (run) {
      return { run, resolvedKey: candidate };
    }
  }
  return { run: null, resolvedKey: null };
}

async function resolveGitStatus() {
  try {
    const [branch, headSha] = await Promise.all([
      execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoRoot }),
      execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot })
    ]);

    const log = await execFileAsync(
      'git',
      ['log', '-1', '--pretty=format:%H\n%an\n%ad\n%s', '--date=iso-strict'],
      { cwd: repoRoot }
    );

    const status = await execFileAsync('git', ['status', '--porcelain'], { cwd: repoRoot });
    const statusLines = status.stdout.split(/\r?\n/).filter(Boolean);
    let stagedCount = 0;
    let unstagedCount = 0;
    let untrackedCount = 0;

    for (const line of statusLines) {
      if (line.startsWith('??')) {
        untrackedCount += 1;
        continue;
      }
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      if (indexStatus && indexStatus !== ' ') {
        stagedCount += 1;
      }
      if (workTreeStatus && workTreeStatus !== ' ') {
        unstagedCount += 1;
      }
    }

    const diffStat = await collectDiffStat();
    const upstream = await resolveUpstream();

    const [commitSha, commitAuthor, commitTimestamp, commitSubject] = log.stdout.split(/\r?\n/);

    return {
      branch: branch.stdout.trim(),
      head_sha: headSha.stdout.trim(),
      last_commit: {
        sha: commitSha ?? null,
        author: commitAuthor ?? null,
        timestamp: commitTimestamp ?? null,
        subject: commitSubject ?? null
      },
      dirty: stagedCount + unstagedCount + untrackedCount > 0,
      staged_count: stagedCount,
      unstaged_count: unstagedCount,
      untracked_count: untrackedCount,
      diff_stat: diffStat,
      ...(upstream ?? {})
    };
  } catch {
    return null;
  }
}

async function collectDiffStat() {
  const [unstaged, staged] = await Promise.all([
    execFileAsync('git', ['diff', '--numstat'], { cwd: repoRoot }).catch(() => ({ stdout: '' })),
    execFileAsync('git', ['diff', '--numstat', '--cached'], { cwd: repoRoot }).catch(() => ({ stdout: '' }))
  ]);

  const fileSet = new Set();
  let additions = 0;
  let deletions = 0;

  const ingest = (output) => {
    const lines = output.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const [addedRaw, deletedRaw, filePath] = line.split('\t');
      if (filePath) {
        fileSet.add(filePath);
      }
      const added = Number(addedRaw);
      const deleted = Number(deletedRaw);
      if (Number.isFinite(added)) {
        additions += added;
      }
      if (Number.isFinite(deleted)) {
        deletions += deleted;
      }
    }
  };

  ingest(unstaged.stdout);
  ingest(staged.stdout);

  return {
    files: fileSet.size,
    additions,
    deletions
  };
}

async function resolveUpstream() {
  try {
    const upstream = await execFileAsync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], {
      cwd: repoRoot
    });
    const ref = upstream.stdout.trim();
    if (!ref) {
      return null;
    }
    const aheadBehind = await execFileAsync('git', ['rev-list', '--left-right', '--count', `${ref}...HEAD`], {
      cwd: repoRoot
    });
    const [behindRaw, aheadRaw] = aheadBehind.stdout.trim().split(/\s+/);
    const behind = Number(behindRaw);
    const ahead = Number(aheadRaw);
    return {
      ahead: Number.isFinite(ahead) ? ahead : null,
      behind: Number.isFinite(behind) ? behind : null
    };
  } catch {
    return null;
  }
}

async function readLogTail(filePath, { maxBytes, maxLines }) {
  const stats = await fs.stat(filePath);
  const size = stats.size;
  const start = Math.max(0, size - maxBytes);
  const length = size - start;
  const fileHandle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    await fileHandle.read(buffer, 0, length, start);
    let content = buffer.toString('utf8');
    let lines = content.split(/\r?\n/);
    if (start > 0 && lines.length > 0) {
      lines = lines.slice(1);
    }
    if (lines.length > maxLines) {
      lines = lines.slice(-maxLines);
    }
    return {
      lines,
      truncated: start > 0 || lines.length >= maxLines
    };
  } finally {
    await fileHandle.close();
  }
}

function buildActivity(runs) {
  const events = [];
  for (const run of runs) {
    if (!run) {
      continue;
    }
    for (const stage of run.stages ?? []) {
      if (!stage?.completed_at) {
        continue;
      }
      events.push({
        ts: stage.completed_at,
        type: 'stage_completed',
        task_id: run.task_id,
        run_id: run.run_id,
        message: `${run.task_id}: ${stage.id} ${stage.status}`
      });
    }
    if (run.completed_at) {
      events.push({
        ts: run.completed_at,
        type: 'run_completed',
        task_id: run.task_id,
        run_id: run.run_id,
        message: `${run.task_id}: ${run.status}`
      });
    }
  }

  return events
    .filter((event) => event.ts)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 30);
}

function parseArgs(argv) {
  const options = {
    includeLogs: false,
    logLines: DEFAULT_LOG_LINE_LIMIT,
    logBytes: DEFAULT_LOG_BYTE_LIMIT,
    output: path.join(outRoot, OUTPUT_TASK_ID, 'data.json'),
    taskFilter: null,
    quiet: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--include-logs') {
      options.includeLogs = true;
    } else if (arg === '--log-lines') {
      options.logLines = Number(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--log-lines=')) {
      options.logLines = Number(arg.split('=')[1]);
    } else if (arg === '--log-bytes') {
      options.logBytes = Number(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith('--log-bytes=')) {
      options.logBytes = Number(arg.split('=')[1]);
    } else if (arg === '--output') {
      options.output = argv[index + 1] ?? options.output;
      index += 1;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--task') {
      options.taskFilter = argv[index + 1] ?? null;
      index += 1;
    } else if (arg.startsWith('--task=')) {
      options.taskFilter = arg.split('=')[1];
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!Number.isFinite(options.logLines) || options.logLines <= 0) {
    options.logLines = DEFAULT_LOG_LINE_LIMIT;
  }
  if (!Number.isFinite(options.logBytes) || options.logBytes <= 0) {
    options.logBytes = DEFAULT_LOG_BYTE_LIMIT;
  }

  return options;
}

function printHelp() {
  console.log('Usage: node scripts/status-ui-build.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --include-logs           Include capped log tail data');
  console.log('  --log-lines <count>      Max lines to include from logs (default: 200)');
  console.log('  --log-bytes <bytes>      Max bytes to read from logs (default: 102400)');
  console.log('  --output <path>          Output JSON path');
  console.log('  --task <id>              Filter to a single task key');
  console.log('  --quiet                  Suppress success output');
  console.log('  -h, --help               Show help');
}

async function buildDataset(options) {
  const indexPath = path.join(repoRoot, 'tasks', 'index.json');
  const index = await readJson(indexPath);
  if (!index?.items) {
    throw new Error('tasks/index.json is missing or invalid.');
  }

  const tasks = [];
  const runs = [];
  const now = new Date();

  for (const item of index.items) {
    const taskKey = buildTaskKey(item);
    if (!taskKey) {
      continue;
    }
    if (options.taskFilter && options.taskFilter !== taskKey && options.taskFilter !== item.id) {
      continue;
    }

    const resolved = await resolveLatestRunForTask(resolveTaskCandidates(item));
    const designRun = await resolveLatestDesignRun(taskKey);
    let normalizedRun =
      resolved.run && resolved.run.task_id && resolved.run.task_id !== taskKey
        ? { ...resolved.run, task_id: taskKey }
        : resolved.run;
    let resolvedKey = resolved.resolvedKey;

    if (!normalizedRun && designRun?.run) {
      normalizedRun = normalizeDesignRun(designRun.run, designRun.runId);
      resolvedKey = taskKey;
    }

    if (normalizedRun && designRun?.run && shouldMergeDesignApprovals(normalizedRun, designRun.run)) {
      normalizedRun = {
        ...normalizedRun,
        approvals: mergeApprovals(normalizedRun.approvals, designRun.run.approvals)
      };
    }

    if (!normalizedRun) {
      const syntheticRun = buildSyntheticRunFromTask(item, taskKey);
      if (syntheticRun) {
        normalizedRun = syntheticRun;
        resolvedKey = taskKey;
      }
    }
    const bucketInfo = classifyTaskBucket(normalizedRun, { now });
    const summary = buildTaskSummary(normalizedRun);
    const lastUpdate = normalizedRun?.updated_at ?? normalizedRun?.completed_at ?? normalizedRun?.started_at ?? null;
    const approvalsTotal = countTotalApprovals(normalizedRun?.approvals);

    const taskEntry = {
      task_id: taskKey,
      title: item.title ?? taskKey,
      bucket: bucketInfo.bucket,
      bucket_reason: bucketInfo.reason,
      status: normalizedRun?.status ?? 'pending',
      last_update: lastUpdate,
      latest_run_id: normalizedRun?.run_id ?? null,
      approvals_pending: bucketInfo.approvals_pending,
      approvals_total: approvalsTotal,
      summary
    };

    if (normalizedRun) {
      const links = await decorateRunLinks(resolvedKey ?? taskKey, normalizedRun.links);
      const runEntry = {
        ...normalizedRun,
        links,
        approvals_pending: bucketInfo.approvals_pending,
        approvals_total: approvalsTotal,
        heartbeat_stale: bucketInfo.heartbeat_stale
      };

      if (options.includeLogs && runEntry.links?.log) {
        const logPath = path.resolve(repoRoot, runEntry.links.log);
        if (await fileExists(logPath)) {
          runEntry.logs = {
            runner: await readLogTail(logPath, { maxBytes: options.logBytes, maxLines: options.logLines })
          };
        }
      }

      runs.push(runEntry);
    }

    tasks.push(taskEntry);
  }

  const activity = buildActivity(runs);
  const codebase = await resolveGitStatus();

  return {
    generated_at: isoTimestamp(now),
    tasks,
    runs,
    codebase,
    activity
  };
}

async function decorateRunLinks(taskKey, links = {}) {
  const metricsPath = path.join(runsRoot, taskKey, 'metrics.json');
  const statePath = path.join(outRoot, taskKey, 'state.json');
  return {
    manifest: links?.manifest ?? null,
    log: links?.log ?? null,
    metrics: (await fileExists(metricsPath)) ? path.relative(repoRoot, metricsPath) : null,
    state: (await fileExists(statePath)) ? path.relative(repoRoot, statePath) : null
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const payload = await buildDataset(options);
  const writeJsonAtomic = await loadWriteJsonAtomic();
  await writeJsonAtomic(options.output, payload);
  if (!options.quiet) {
    console.log(`Status UI data written to ${path.relative(repoRoot, options.output)}`);
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  });
}

export {
  buildTaskKey,
  classifyTaskBucket,
  countPendingApprovals,
  isHeartbeatStale,
  isHeartbeatFresh,
  parseRunIdTimestamp
};
