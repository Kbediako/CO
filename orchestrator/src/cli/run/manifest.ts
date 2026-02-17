import { randomBytes } from 'node:crypto';
import { access, lstat, mkdir, readdir, readFile, realpath, symlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

import type {
  CliManifest,
  CliManifestCommand,
  CommandStage,
  PipelineDefinition,
  PipelineStage,
  SubPipelineStage,
  RunStatus
} from '../types.js';
import { writeJsonAtomic } from '../utils/fs.js';
import { slugify } from '../utils/strings.js';
import { isoTimestamp } from '../utils/time.js';
import { loadInstructionSet } from '../../../../packages/orchestrator/src/instructions/loader.js';
import type { EnvironmentPaths } from './environment.js';
import type { RunPaths } from './runPaths.js';
import { resolveRunPaths, relativeToRepo } from './runPaths.js';
import { ExperienceStore } from '../../persistence/ExperienceStore.js';
import { formatExperienceInjections } from '../exec/experience.js';
import { sanitizeRunId } from '../../persistence/sanitizeRunId.js';

export interface ManifestBootstrapOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  parentRunId?: string | null;
  taskSlug: string | null;
  approvalPolicy?: string | null;
  planTargetId?: string | null;
}

export interface GuardrailStatusSnapshot {
  present: boolean;
  recommendation: string | null;
  summary: string;
  computed_at: string;
  counts: GuardrailCounts;
}

interface GuardrailCounts {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  other: number;
}

const HEARTBEAT_INTERVAL_SECONDS = 5;
const HEARTBEAT_STALE_AFTER_SECONDS = 30;
const MAX_ERROR_DETAIL_CHARS = 8 * 1024;
const DEFAULT_MIN_EXPERIENCE_REWARD = 0.1;

export async function bootstrapManifest(runId: string, options: ManifestBootstrapOptions): Promise<{
  manifest: CliManifest;
  paths: RunPaths;
}> {
  const { env, pipeline, parentRunId = null, taskSlug, approvalPolicy = null } = options;
  const paths = resolveRunPaths(env, runId);
  await mkdir(paths.runDir, { recursive: true });
  await mkdir(paths.commandsDir, { recursive: true });
  await mkdir(paths.errorsDir, { recursive: true });

  const now = isoTimestamp();
  const resumeToken = randomBytes(32).toString('hex');
  const commands = buildCommandEntries(pipeline);

  const manifest: CliManifest = {
    version: 1,
    task_id: env.taskId,
    task_slug: taskSlug ?? null,
    run_id: runId,
    parent_run_id: parentRunId ?? null,
    pipeline_id: pipeline.id,
    pipeline_title: pipeline.title,
    runner: 'codex-cli',
    approval_policy: approvalPolicy,
    status: 'queued',
    status_detail: null,
    started_at: now,
    completed_at: null,
    updated_at: now,
    heartbeat_at: now,
    heartbeat_interval_seconds: HEARTBEAT_INTERVAL_SECONDS,
    heartbeat_stale_after_seconds: HEARTBEAT_STALE_AFTER_SECONDS,
    artifact_root: relativeToRepo(env, paths.runDir),
    compat_path: relative(env.repoRoot, dirname(paths.compatManifestPath)),
    log_path: relativeToRepo(env, paths.logPath),
    summary: null,
    metrics_recorded: false,
    resume_token: resumeToken,
    resume_events: [],
    approvals: [],
    commands,
    collab_tool_calls: [],
    child_runs: [],
    run_summary_path: null,
    plan_target_id: options.planTargetId ?? null,
    instructions_hash: null,
    instructions_sources: [],
    prompt_packs: [],
    guardrails_required: pipeline.guardrailsRequired !== false,
    cloud_execution: null,
    learning: {
      validation: {
        mode: 'per-task',
        grouping: null,
        status: 'pending'
      },
      alerts: [],
      approvals: []
    },
    tfgrpo: null
  };

  const instructions = await loadInstructionSet(env.repoRoot);
  const experienceStore = new ExperienceStore({
    outDir: env.outRoot,
    runsDir: env.runsRoot,
    maxSummaryWords: instructions.experienceMaxWords
  });
  const experienceSnippets = await Promise.all(
    instructions.promptPacks.map(async (pack) => {
      if (!pack.experienceSlots) {
        return [];
      }
      const minReward = resolveExperienceMinReward();
      const records = await experienceStore.fetchTop({
        domain: pack.domain,
        limit: pack.experienceSlots,
        minReward,
        taskId: env.taskId
      });
      return formatExperienceInjections(records, pack.experienceSlots);
    })
  );
  manifest.instructions_hash = instructions.hash || null;
  manifest.instructions_sources = instructions.sources.map((source) => source.path);
  manifest.prompt_packs = instructions.promptPacks.map((pack, index) => {
    const experiences = experienceSnippets[index] ?? [];
    return {
      id: pack.id,
      domain: pack.domain,
      stamp: pack.stamp,
      experience_slots: pack.experienceSlots,
      sources: pack.sources.map((source) => source.path),
      ...(experiences.length > 0 ? { experiences } : {})
    };
  });

  await writeJsonAtomic(paths.manifestPath, manifest);
  await writeFile(paths.resumeTokenPath, `${resumeToken}\n`, 'utf8');
  await writeFile(paths.heartbeatPath, `${now}\n`, 'utf8');
  await createCompatibilityPointer(env, paths);

  return { manifest, paths };
}

export async function saveManifest(paths: RunPaths, manifest: CliManifest): Promise<void> {
  manifest.updated_at = isoTimestamp();
  await writeJsonAtomic(paths.manifestPath, manifest);
}

export async function loadManifest(env: EnvironmentPaths, runId: string): Promise<{ manifest: CliManifest; paths: RunPaths }> {
  const manifestPath = await resolveManifestPathForRunId(env, runId);
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as CliManifest;
  const resolvedEnv = {
    ...env,
    taskId: typeof manifest.task_id === 'string' && manifest.task_id.trim().length > 0 ? manifest.task_id : env.taskId
  };
  const paths = resolveRunPathsForManifestPath(resolvedEnv, runId, manifestPath);
  return { manifest, paths };
}

export function updateCommandStatus(
  manifest: CliManifest,
  commandIndex: number,
  changes: Partial<CliManifestCommand>
): CliManifestCommand {
  const entry = manifest.commands[commandIndex];
  if (!entry) {
    throw new Error(`Manifest command index ${commandIndex} missing.`);
  }
  Object.assign(entry, changes);
  manifest.updated_at = isoTimestamp();
  return entry;
}

export async function appendCommandError(
  env: EnvironmentPaths,
  paths: RunPaths,
  manifest: CliManifest,
  command: CliManifestCommand,
  reason: string,
  details: Record<string, unknown>
): Promise<string> {
  const filename = `${String(command.index).padStart(2, '0')}-${slugify(command.id)}.json`;
  const errorPath = join(paths.errorsDir, filename);
  const payload = {
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    command_index: command.index,
    command_id: command.id,
    command: command.command,
    reason,
    details: sanitizeErrorDetails(details),
    created_at: isoTimestamp()
  };
  await writeJsonAtomic(errorPath, payload);
  return relativeToRepo(env, errorPath);
}

function sanitizeErrorDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (typeof value === 'string') {
      if (value.length > MAX_ERROR_DETAIL_CHARS) {
        sanitized[key] = `${value.slice(0, MAX_ERROR_DETAIL_CHARS)}…`;
        const truncatedKey = `${key}_truncated`;
        if (!(truncatedKey in details)) {
          sanitized[truncatedKey] = true;
        }
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function resolveExperienceMinReward(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TFGRPO_EXPERIENCE_MIN_REWARD;
  if (!raw || !raw.trim()) {
    return DEFAULT_MIN_EXPERIENCE_REWARD;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MIN_EXPERIENCE_REWARD;
  }
  return Math.max(0, parsed);
}

export function updateHeartbeat(manifest: CliManifest): void {
  manifest.heartbeat_at = isoTimestamp();
  if (manifest.status === 'in_progress') {
    manifest.status_detail = null;
  }
}

export function resetForResume(manifest: CliManifest): void {
  manifest.completed_at = null;
  manifest.metrics_recorded = false;
  manifest.status = 'in_progress';
  manifest.status_detail = 'resuming';
  manifest.guardrail_status = undefined;
  manifest.cloud_execution = null;
}

export function recordResumeEvent(
  manifest: CliManifest,
  event: { actor: string; reason: string; outcome: 'accepted' | 'blocked'; detail?: string }
): void {
  manifest.resume_events.push({ ...event, timestamp: isoTimestamp() });
}

export function ensureGuardrailStatus(manifest: CliManifest): GuardrailStatusSnapshot {
  if (manifest.guardrail_status) {
    return manifest.guardrail_status;
  }
  const snapshot = computeGuardrailStatus(manifest);
  manifest.guardrail_status = snapshot;
  return snapshot;
}

export function buildGuardrailSummary(manifest: CliManifest): string {
  return ensureGuardrailStatus(manifest).summary;
}

export function upsertGuardrailSummary(manifest: CliManifest): void {
  const summary = buildGuardrailSummary(manifest);
  const existing = manifest.summary ? manifest.summary.split('\n') : [];
  const filtered = existing.filter((line) => !line.toLowerCase().startsWith('guardrails:'));
  filtered.push(summary);
  manifest.summary = filtered.join('\n').trim();
  if (manifest.summary.length === 0) {
    manifest.summary = summary;
  }
}

function computeGuardrailStatus(manifest: CliManifest): GuardrailStatusSnapshot {
  const guardrailCommands = selectGuardrailCommands(manifest);
  const guardrailsRequired = manifest.guardrails_required ?? true;
  const counts: GuardrailCounts = {
    total: guardrailCommands.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    other: 0
  };

  for (const entry of guardrailCommands) {
    const status = classifyGuardrailCommand(entry);
    if (status === 'succeeded') {
      counts.succeeded += 1;
      continue;
    }
    if (status === 'failed') {
      counts.failed += 1;
      continue;
    }
    if (status === 'skipped') {
      counts.skipped += 1;
      continue;
    }
    counts.other += 1;
  }

  const present = counts.succeeded > 0;
  let recommendation: string | null = null;
  if (counts.total === 0) {
    recommendation = guardrailsRequired
      ? 'Guardrail command missing; run "codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive" to capture reviewer diagnostics.'
      : null;
  } else if (counts.failed > 0) {
    recommendation =
      'Guardrail command failed; re-run "codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive" to gather failure artifacts.';
  }

  const summary = formatGuardrailSummary(counts);

  return {
    present,
    recommendation,
    summary,
    computed_at: isoTimestamp(),
    counts
  };
}

function selectGuardrailCommands(manifest: CliManifest): CliManifestCommand[] {
  return manifest.commands.filter((entry) => {
    const id = entry.id?.toLowerCase() ?? '';
    const title = entry.title?.toLowerCase() ?? '';
    const command = entry.command?.toLowerCase() ?? '';
    const haystack = `${id} ${title} ${command}`;
    return haystack.includes('spec-guard') || haystack.includes('specguardrunner');
  });
}

function classifyGuardrailCommand(
  entry: CliManifestCommand
): 'succeeded' | 'failed' | 'skipped' | 'other' {
  if (entry.status === 'failed') {
    return 'failed';
  }
  if (entry.status === 'skipped') {
    return 'skipped';
  }
  if (entry.status === 'succeeded') {
    return isExplicitGuardrailSkip(entry.summary) ? 'skipped' : 'succeeded';
  }
  return 'other';
}

function isExplicitGuardrailSkip(summary: string | null | undefined): boolean {
  const normalized = summary?.toLowerCase() ?? '';
  if (!normalized) {
    return false;
  }
  return (
    normalized.includes('[spec-guard] skipped') ||
    normalized.includes('spec-guard skipped') ||
    normalized.includes('spec guard skipped')
  );
}

function formatGuardrailSummary(counts: GuardrailCounts): string {
  if (counts.total === 0) {
    return 'Guardrails: spec-guard command not found.';
  }
  if (counts.failed > 0) {
    return `Guardrails: spec-guard failed (${counts.failed}/${counts.total} failed).`;
  }
  if (counts.succeeded === counts.total) {
    return `Guardrails: spec-guard succeeded (${counts.total} passed).`;
  }
  if (counts.skipped === counts.total) {
    return `Guardrails: spec-guard skipped (all ${counts.total} skipped).`;
  }

  const parts: string[] = [];
  if (counts.succeeded > 0) {
    parts.push(`${counts.succeeded} passed`);
  }
  if (counts.skipped > 0) {
    parts.push(`${counts.skipped} skipped`);
  }
  if (counts.other > 0) {
    parts.push(`${counts.other} pending`);
  }

  return `Guardrails: spec-guard partial (${parts.join(', ')} of ${counts.total}).`;
}

export function appendSummary(manifest: CliManifest, message: string | null | undefined): void {
  if (!message) {
    return;
  }
  if (!manifest.summary) {
    manifest.summary = message;
    return;
  }
  if (manifest.summary.includes(message)) {
    return;
  }
  manifest.summary = `${manifest.summary}\n${message}`;
}

export function finalizeStatus(manifest: CliManifest, status: RunStatus, detail?: string | null): void {
  manifest.status = status;
  manifest.status_detail = detail ?? null;
  manifest.completed_at = isoTimestamp();
}

export async function writeHeartbeatFile(paths: RunPaths, manifest: CliManifest): Promise<void> {
  await writeFile(paths.heartbeatPath, `${manifest.heartbeat_at ?? isoTimestamp()}\n`, 'utf8');
}

async function createCompatibilityPointer(env: EnvironmentPaths, paths: RunPaths): Promise<void> {
  await mkdir(paths.compatDir, { recursive: true });
  await mkdir(paths.localCompatDir, { recursive: true });

  const relativeManifest = relative(env.repoRoot, paths.manifestPath);
  const artifactRootRelative = relative(env.repoRoot, paths.runDir);

  try {
    await writeJsonAtomic(paths.compatManifestPath, {
      redirect_to: artifactRootRelative,
      manifest: relativeManifest,
      created_at: isoTimestamp(),
      note: 'Generated by codex CLI for backward compatibility.'
    });
  } catch (error) {
    // Best effort; leave a stub if atomic write fails.
    await writeJsonAtomic(join(paths.compatDir, 'compat.json'), {
      redirect_to: artifactRootRelative,
      manifest: relativeManifest,
      error: (error as Error)?.message ?? String(error)
    });
  }

  const localCompatPath = join(paths.localCompatDir, 'manifest.json');
  try {
    await symlink(relative(paths.localCompatDir, paths.manifestPath), localCompatPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return;
    }
    await writeJsonAtomic(localCompatPath, {
      redirect_to: artifactRootRelative,
      manifest: relativeManifest
    });
  }
}

async function resolveManifestPathForRunId(env: EnvironmentPaths, runId: string): Promise<string> {
  const expectedPaths = resolveRunPaths(env, runId);
  try {
    await access(expectedPaths.manifestPath);
    return expectedPaths.manifestPath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const safeRunId = sanitizeRunId(runId);
  const localCompatResolved = await resolveLocalCompatManifestPath(env, safeRunId);
  if (localCompatResolved) {
    return localCompatResolved;
  }

  const discoveredManifestPath = await findManifestPathAcrossTasks(env.runsRoot, safeRunId);
  if (discoveredManifestPath) {
    return discoveredManifestPath;
  }

  return expectedPaths.manifestPath;
}

async function resolveLocalCompatManifestPath(
  env: EnvironmentPaths,
  safeRunId: string
): Promise<string | null> {
  const localCompatManifestPath = join(env.runsRoot, 'local-mcp', safeRunId, 'manifest.json');
  try {
    await access(localCompatManifestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let stats: import('node:fs').Stats;
  try {
    stats = await lstat(localCompatManifestPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  if (stats.isSymbolicLink()) {
    try {
      return await realpath(localCompatManifestPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  const redirectPath = await resolveRedirectManifestPath(env, localCompatManifestPath);
  if (!redirectPath) {
    return null;
  }
  try {
    await access(redirectPath);
    return redirectPath;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function resolveRedirectManifestPath(
  env: EnvironmentPaths,
  localCompatManifestPath: string
): Promise<string | null> {
  let raw: string;
  try {
    raw = await readFile(localCompatManifestPath, 'utf8');
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const data = parsed as Record<string, unknown>;

  const manifestRef =
    typeof data.manifest === 'string' && data.manifest.trim().length > 0 ? data.manifest.trim() : null;
  if (manifestRef) {
    return resolveManifestReference(env.repoRoot, manifestRef);
  }

  const redirectRef =
    typeof data.redirect_to === 'string' && data.redirect_to.trim().length > 0
      ? data.redirect_to.trim()
      : null;
  if (!redirectRef) {
    return null;
  }
  const redirectRoot = resolveManifestReference(env.repoRoot, redirectRef);
  if (redirectRoot.endsWith('manifest.json')) {
    return redirectRoot;
  }
  return join(redirectRoot, 'manifest.json');
}

function resolveManifestReference(repoRoot: string, reference: string): string {
  if (isAbsolute(reference)) {
    return reference;
  }
  return resolve(repoRoot, reference);
}

async function findManifestPathAcrossTasks(runsRoot: string, safeRunId: string): Promise<string | null> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(runsRoot, { withFileTypes: true, encoding: 'utf8' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name === 'local-mcp') {
      continue;
    }
    const taskRoot = join(runsRoot, entry.name);
    const cliManifestPath = join(taskRoot, 'cli', safeRunId, 'manifest.json');
    try {
      await access(cliManifestPath);
      return cliManifestPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    const legacyManifestPath = join(taskRoot, safeRunId, 'manifest.json');
    try {
      await access(legacyManifestPath);
      return legacyManifestPath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return null;
}

function resolveRunPathsForManifestPath(env: EnvironmentPaths, runId: string, manifestPath: string): RunPaths {
  const resolved = resolveRunPaths(env, runId);
  if (resolved.manifestPath === manifestPath) {
    return resolved;
  }
  const runDir = dirname(manifestPath);
  return {
    ...resolved,
    runDir,
    manifestPath,
    heartbeatPath: join(runDir, '.heartbeat'),
    resumeTokenPath: join(runDir, '.resume-token'),
    logPath: join(runDir, 'runner.ndjson'),
    eventsPath: join(runDir, 'events.jsonl'),
    controlPath: join(runDir, 'control.json'),
    controlAuthPath: join(runDir, 'control_auth.json'),
    controlEndpointPath: join(runDir, 'control_endpoint.json'),
    confirmationsPath: join(runDir, 'confirmations.json'),
    questionsPath: join(runDir, 'questions.json'),
    delegationTokensPath: join(runDir, 'delegation_tokens.json'),
    commandsDir: join(runDir, 'commands'),
    errorsDir: join(runDir, 'errors')
  };
}

function buildCommandEntries(pipeline: PipelineDefinition): CliManifestCommand[] {
  return pipeline.stages.map((stage, index) => buildCommandEntry(stage, index + 1));
}

function buildCommandEntry(stage: PipelineStage, index: number): CliManifestCommand {
  if (stage.kind === 'command') {
    return commandStageToManifest(stage, index);
  }
  return subPipelineStageToManifest(stage, index);
}

function commandStageToManifest(stage: CommandStage, index: number): CliManifestCommand {
  return {
    index,
    id: stage.id,
    title: stage.title,
    command: stage.command,
    kind: 'command',
    status: 'pending',
    started_at: null,
    completed_at: null,
    exit_code: null,
    summary: null,
    log_path: null,
    error_file: null,
    sub_run_id: null
  };
}

function subPipelineStageToManifest(stage: SubPipelineStage, index: number): CliManifestCommand {
  return {
    index,
    id: stage.id,
    title: stage.title,
    command: null,
    kind: 'subpipeline',
    status: 'pending',
    started_at: null,
    completed_at: null,
    exit_code: null,
    summary: null,
    log_path: null,
    error_file: null,
    sub_run_id: null
  };
}
