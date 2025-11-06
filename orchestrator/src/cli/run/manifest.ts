import { randomBytes } from 'node:crypto';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

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

export interface ManifestBootstrapOptions {
  env: EnvironmentPaths;
  pipeline: PipelineDefinition;
  parentRunId?: string | null;
  taskSlug: string | null;
  approvalPolicy?: string | null;
  planTargetId?: string | null;
}

export interface HeartbeatState {
  stale: boolean;
  ageSeconds: number | null;
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
    child_runs: [],
    run_summary_path: null,
    plan_target_id: options.planTargetId ?? null,
    instructions_hash: null,
    instructions_sources: []
  };

  const instructions = await loadInstructionSet(env.repoRoot);
  manifest.instructions_hash = instructions.hash || null;
  manifest.instructions_sources = instructions.sources.map((source) => source.path);

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
  const paths = resolveRunPaths(env, runId);
  const raw = await readFile(paths.manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as CliManifest;
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
  const updated: CliManifestCommand = { ...entry, ...changes };
  manifest.commands[commandIndex] = updated;
  manifest.updated_at = isoTimestamp();
  return updated;
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

export function computeHeartbeatState(manifest: CliManifest): HeartbeatState {
  if (!manifest.heartbeat_at) {
    return { ageSeconds: null, stale: false };
  }
  const parsed = Date.parse(manifest.heartbeat_at);
  if (Number.isNaN(parsed)) {
    return { ageSeconds: null, stale: false };
  }
  const ageMs = Date.now() - parsed;
  return {
    ageSeconds: Math.max(0, ageMs / 1000),
    stale: ageMs > manifest.heartbeat_stale_after_seconds * 1000
  };
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

export function guardrailCommandPresent(manifest: CliManifest): boolean {
  return ensureGuardrailStatus(manifest).present;
}

export function guardrailRecommendation(manifest: CliManifest): string | null {
  return ensureGuardrailStatus(manifest).recommendation;
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
  const counts: GuardrailCounts = {
    total: guardrailCommands.length,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    other: 0
  };

  for (const entry of guardrailCommands) {
    if (entry.status === 'succeeded') {
      counts.succeeded += 1;
    } else if (entry.status === 'failed') {
      counts.failed += 1;
    } else if (entry.status === 'skipped') {
      counts.skipped += 1;
    } else {
      counts.other += 1;
    }
  }

  const present = counts.succeeded > 0;
  let recommendation: string | null = null;
  if (counts.total === 0) {
    recommendation = 'Guardrail command missing; run scripts/run-mcp-diagnostics.sh --no-watch to capture reviewer diagnostics.';
  } else if (counts.failed > 0) {
    recommendation = 'Guardrail command failed; re-run scripts/run-mcp-diagnostics.sh --no-watch to gather failure artifacts.';
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
  return manifest.commands.filter((entry) => entry.command?.includes('spec-guard'));
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
