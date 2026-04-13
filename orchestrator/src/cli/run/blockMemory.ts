import { mkdir, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import type { CliManifest, CliManifestCommand } from '../types.js';
import { buildContextObject } from '../rlm/context.js';
import type { EnvironmentPaths } from './environment.js';
import type { RunPaths } from './runPaths.js';
import { relativeToRepo } from './runPaths.js';
import { writeJsonAtomic } from '../utils/fs.js';

const RUN_BLOCK_MEMORY_SCHEMA_VERSION = 1;
const RUN_BLOCK_MEMORY_DESCRIPTOR_KIND = 'index';
const RUN_BLOCK_MEMORY_INDEX_KIND = 'run_block_memory';
const RUN_BLOCK_MEMORY_BLOCK_KIND = 'run_block_memory_block';
const RUN_BLOCK_MEMORY_CHUNK_TARGET_BYTES = 65_536;
const RUN_BLOCK_MEMORY_CHUNK_OVERLAP_BYTES = 4_096;
const WINDOWS_DRIVE_PATH_RE = /^[A-Za-z]:/u;

export interface RunBlockMemoryDescriptor {
  schema_version: number;
  kind: 'index';
  index_path: string;
  generated_at: string;
  block_count: number;
}

export interface RunBlockMemoryEventQuery {
  event_types: string[];
  stage_id: string | null;
  stage_index: number | null;
}

export interface RunBlockMemoryTraceability {
  manifest_path: string;
  run_summary_path: string | null;
  events_path: string;
  runner_log_path: string | null;
  command_log_path: string | null;
  sub_run_manifest_path: string | null;
  event_query: RunBlockMemoryEventQuery;
}

export interface RunBlockMemoryBlockDescriptor {
  id: string;
  phase_kind: 'run' | 'stage';
  title: string;
  status: string;
  summary: string | null;
  pointer: string;
  object_id: string;
  dir_path: string;
  index_path: string;
  source_path: string;
  byte_length: number;
  chunk_count: number;
  created_at: string;
  traceability: RunBlockMemoryTraceability;
}

export interface RunBlockMemoryIndex {
  schema_version: number;
  kind: 'run_block_memory';
  generated_at: string;
  run_contract: {
    task_id: string;
    run_id: string;
    pipeline_id: string;
    pipeline_title: string;
  };
  artifacts: {
    manifest_path: string;
    run_summary_path: string | null;
    events_path: string;
    runner_log_path: string | null;
  };
  blocks: RunBlockMemoryBlockDescriptor[];
}

interface RunBlockMemoryPayload {
  schema_version: number;
  kind: 'run_block_memory_block';
  generated_at: string;
  block: {
    id: string;
    phase_kind: 'run' | 'stage';
    title: string;
    status: string;
    summary: string | null;
    started_at: string | null;
    completed_at: string | null;
    command:
      | {
          index: number;
          id: string;
          kind: CliManifestCommand['kind'];
          exit_code: number | null;
          sub_run_id: string | null;
        }
      | null;
  };
  traceability: RunBlockMemoryTraceability;
}

interface RunBlockMemoryContract {
  block_memory: RunBlockMemoryDescriptor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  return null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const strings = value
    .map((entry) => readNonEmptyString(entry))
    .filter((entry): entry is string => entry !== null);
  return strings.length === value.length ? strings : null;
}

function readRunBlockMemoryCandidate(input: unknown): Record<string, unknown> | null {
  if (!isRecord(input)) {
    return null;
  }
  if (isRecord(input.memory) && isRecord(input.memory.block_memory)) {
    return input.memory.block_memory;
  }
  return input;
}

export function readRunBlockMemoryDescriptor(input: unknown): RunBlockMemoryDescriptor | null {
  const candidate = readRunBlockMemoryCandidate(input);
  if (!candidate) {
    return null;
  }
  const schemaVersion = readInteger(candidate.schema_version);
  const kind = readNonEmptyString(candidate.kind);
  const indexPath = readNonEmptyString(candidate.index_path);
  const generatedAt = readNonEmptyString(candidate.generated_at);
  const blockCount = readInteger(candidate.block_count);
  if (
    schemaVersion === null ||
    schemaVersion < 1 ||
    kind !== RUN_BLOCK_MEMORY_DESCRIPTOR_KIND ||
    !indexPath ||
    !generatedAt ||
    blockCount === null ||
    blockCount < 1
  ) {
    return null;
  }
  return {
    schema_version: schemaVersion,
    kind: RUN_BLOCK_MEMORY_DESCRIPTOR_KIND,
    index_path: indexPath,
    generated_at: generatedAt,
    block_count: blockCount
  };
}

function readRunBlockMemoryEventQuery(input: unknown): RunBlockMemoryEventQuery | null {
  if (!isRecord(input)) {
    return null;
  }
  const eventTypes = readStringArray(input.event_types);
  const stageId = input.stage_id === null ? null : readNonEmptyString(input.stage_id);
  const stageIndex = input.stage_index === null ? null : readInteger(input.stage_index);
  if (
    !eventTypes ||
    eventTypes.length === 0 ||
    input.stage_id === undefined ||
    input.stage_index === undefined ||
    (input.stage_id !== null && stageId === null) ||
    (input.stage_index !== null && stageIndex === null)
  ) {
    return null;
  }
  return {
    event_types: eventTypes,
    stage_id: stageId,
    stage_index: stageIndex
  };
}

function readRunBlockMemoryTraceability(input: unknown): RunBlockMemoryTraceability | null {
  if (!isRecord(input)) {
    return null;
  }
  const manifestPath = readNonEmptyString(input.manifest_path);
  const runSummaryPath = input.run_summary_path === null ? null : readNonEmptyString(input.run_summary_path);
  const eventsPath = readNonEmptyString(input.events_path);
  const runnerLogPath = input.runner_log_path === null ? null : readNonEmptyString(input.runner_log_path);
  const commandLogPath = input.command_log_path === null ? null : readNonEmptyString(input.command_log_path);
  const subRunManifestPath =
    input.sub_run_manifest_path === null ? null : readNonEmptyString(input.sub_run_manifest_path);
  const eventQuery = readRunBlockMemoryEventQuery(input.event_query);
  if (
    !manifestPath ||
    !eventsPath ||
    input.run_summary_path === undefined ||
    input.runner_log_path === undefined ||
    input.command_log_path === undefined ||
    input.sub_run_manifest_path === undefined ||
    (input.run_summary_path !== null && runSummaryPath === null) ||
    (input.runner_log_path !== null && runnerLogPath === null) ||
    (input.command_log_path !== null && commandLogPath === null) ||
    (input.sub_run_manifest_path !== null && subRunManifestPath === null) ||
    !eventQuery
  ) {
    return null;
  }
  return {
    manifest_path: manifestPath,
    run_summary_path: runSummaryPath,
    events_path: eventsPath,
    runner_log_path: runnerLogPath,
    command_log_path: commandLogPath,
    sub_run_manifest_path: subRunManifestPath,
    event_query: eventQuery
  };
}

function readRunBlockMemoryBlockDescriptor(input: unknown): RunBlockMemoryBlockDescriptor | null {
  if (!isRecord(input)) {
    return null;
  }
  const id = readNonEmptyString(input.id);
  const phaseKind = readNonEmptyString(input.phase_kind);
  const title = readNonEmptyString(input.title);
  const status = readNonEmptyString(input.status);
  const summary = input.summary === null ? null : readNonEmptyString(input.summary);
  const pointer = readNonEmptyString(input.pointer);
  const objectId = readNonEmptyString(input.object_id);
  const dirPath = readNonEmptyString(input.dir_path);
  const indexPath = readNonEmptyString(input.index_path);
  const sourcePath = readNonEmptyString(input.source_path);
  const byteLength = readInteger(input.byte_length);
  const chunkCount = readInteger(input.chunk_count);
  const createdAt = readNonEmptyString(input.created_at);
  const traceability = readRunBlockMemoryTraceability(input.traceability);
  if (
    !id ||
    (phaseKind !== 'run' && phaseKind !== 'stage') ||
    !title ||
    !status ||
    input.summary === undefined ||
    (input.summary !== null && summary === null) ||
    !pointer ||
    !objectId ||
    !dirPath ||
    !indexPath ||
    !sourcePath ||
    byteLength === null ||
    byteLength < 0 ||
    chunkCount === null ||
    chunkCount < 1 ||
    !createdAt ||
    !traceability
  ) {
    return null;
  }
  return {
    id,
    phase_kind: phaseKind,
    title,
    status,
    summary,
    pointer,
    object_id: objectId,
    dir_path: dirPath,
    index_path: indexPath,
    source_path: sourcePath,
    byte_length: byteLength,
    chunk_count: chunkCount,
    created_at: createdAt,
    traceability
  };
}

function resolveRepoRelativePath(repoRoot: string, candidate: string, field: string): string {
  const normalizedCandidate = candidate.replaceAll('\\', '/');
  if (
    isAbsolute(candidate) ||
    WINDOWS_DRIVE_PATH_RE.test(candidate) ||
    normalizedCandidate.startsWith('/')
  ) {
    throw new Error(`block_memory ${field} must be repo-relative`);
  }
  if (normalizedCandidate.split('/').some((segment) => segment === '..')) {
    throw new Error(`block_memory ${field} must not traverse outside the repo root`);
  }
  const resolvedPath = resolve(repoRoot, candidate);
  const relativePath = relative(repoRoot, resolvedPath);
  if (
    !relativePath ||
    relativePath === '.' ||
    isAbsolute(relativePath) ||
    WINDOWS_DRIVE_PATH_RE.test(relativePath) ||
    relativePath.split(/[\\/]+/u).some((segment) => segment === '..')
  ) {
    throw new Error(`block_memory ${field} escapes the repo root`);
  }
  return resolvedPath;
}

function assertContainedWithinRepoRoot(repoRoot: string, candidatePath: string, field: string): void {
  const relativePath = relative(repoRoot, candidatePath);
  if (
    !relativePath ||
    relativePath === '.' ||
    isAbsolute(relativePath) ||
    WINDOWS_DRIVE_PATH_RE.test(relativePath) ||
    relativePath.split(/[\\/]+/u).some((segment) => segment === '..')
  ) {
    throw new Error(`block_memory ${field} escapes the repo root`);
  }
}

export async function readRunBlockMemoryIndex(
  repoRoot: string,
  descriptor: RunBlockMemoryDescriptor
): Promise<RunBlockMemoryIndex | null> {
  const resolvedRepoRoot = resolve(repoRoot);
  const resolvedIndexPath = resolveRepoRelativePath(resolvedRepoRoot, descriptor.index_path, 'index_path');
  const canonicalRepoRoot = await realpath(resolvedRepoRoot);
  let canonicalIndexPath: string;
  try {
    canonicalIndexPath = await realpath(resolvedIndexPath);
  } catch {
    return null;
  }
  assertContainedWithinRepoRoot(canonicalRepoRoot, canonicalIndexPath, 'index_path');
  let parsed: unknown;
  try {
    const raw = await readFile(canonicalIndexPath, 'utf8');
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const schemaVersion = readInteger(parsed.schema_version);
  const kind = readNonEmptyString(parsed.kind);
  const generatedAt = readNonEmptyString(parsed.generated_at);
  const runContract = isRecord(parsed.run_contract) ? parsed.run_contract : null;
  const artifacts = isRecord(parsed.artifacts) ? parsed.artifacts : null;
  const decodedBlocks = Array.isArray(parsed.blocks)
    ? parsed.blocks.map((entry) => readRunBlockMemoryBlockDescriptor(entry))
    : null;
  const blocks =
    decodedBlocks?.filter((entry): entry is RunBlockMemoryBlockDescriptor => entry !== null) ?? null;
  if (
    schemaVersion !== RUN_BLOCK_MEMORY_SCHEMA_VERSION ||
    kind !== RUN_BLOCK_MEMORY_INDEX_KIND ||
    !generatedAt ||
    !runContract ||
    !artifacts ||
    !decodedBlocks ||
    !blocks ||
    blocks.length !== decodedBlocks.length
  ) {
    return null;
  }
  const taskId = readNonEmptyString(runContract.task_id);
  const runId = readNonEmptyString(runContract.run_id);
  const pipelineId = readNonEmptyString(runContract.pipeline_id);
  const pipelineTitle = readNonEmptyString(runContract.pipeline_title);
  const manifestPath = readNonEmptyString(artifacts.manifest_path);
  const runSummaryPath =
    artifacts.run_summary_path === null ? null : readNonEmptyString(artifacts.run_summary_path);
  const eventsPath = readNonEmptyString(artifacts.events_path);
  const runnerLogPath =
    artifacts.runner_log_path === null ? null : readNonEmptyString(artifacts.runner_log_path);
  if (
    !taskId ||
    !runId ||
    !pipelineId ||
    !pipelineTitle ||
    !manifestPath ||
    !eventsPath ||
    artifacts.run_summary_path === undefined ||
    artifacts.runner_log_path === undefined ||
    (artifacts.run_summary_path !== null && runSummaryPath === null) ||
    (artifacts.runner_log_path !== null && runnerLogPath === null) ||
    blocks.length < 1
  ) {
    return null;
  }
  return {
    schema_version: schemaVersion,
    kind: RUN_BLOCK_MEMORY_INDEX_KIND,
    generated_at: generatedAt,
    run_contract: {
      task_id: taskId,
      run_id: runId,
      pipeline_id: pipelineId,
      pipeline_title: pipelineTitle
    },
    artifacts: {
      manifest_path: manifestPath,
      run_summary_path: runSummaryPath,
      events_path: eventsPath,
      runner_log_path: runnerLogPath
    },
    blocks
  };
}

export function buildRunBlockMemoryPromptLines(params: {
  descriptor: RunBlockMemoryDescriptor | null;
  index: RunBlockMemoryIndex | null;
  maxBlocks?: number;
}): string[] {
  const { descriptor, index } = params;
  if (!descriptor || !index) {
    return [];
  }
  const maxBlocks = Math.max(1, Math.trunc(params.maxBlocks ?? 3));
  const blockCount = index.blocks.length;
  const lines = [
    'Shared block memory:',
    `- Index: \`${descriptor.index_path}\``,
    `- Blocks: ${blockCount}`
  ];
  for (const block of index.blocks.slice(0, maxBlocks)) {
    lines.push(`- Block \`${block.id}\` (${block.phase_kind}, ${block.status}): \`${block.pointer}\``);
  }
  if (index.blocks.length > maxBlocks) {
    lines.push(`- Additional blocks: ${index.blocks.length - maxBlocks} more in \`${descriptor.index_path}\``);
  }
  return lines;
}

function resolveRunSummaryArtifactPath(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
}): string {
  return (
    params.manifest.run_summary_path ??
    relativeToRepo(params.env, join(params.paths.runDir, 'run-summary.json'))
  );
}

function sanitizeBlockSegment(input: string): string {
  const sanitized = input
    .trim()
    .replace(/[^A-Za-z0-9._-]+/gu, '-')
    .replace(/^-+/u, '')
    .replace(/-+$/u, '');
  return sanitized.length > 0 ? sanitized : 'block';
}

function findChildManifestPath(
  manifest: CliManifest,
  subRunId: string | null
): string | null {
  if (!subRunId) {
    return null;
  }
  const child = manifest.child_runs.find((entry) => entry.run_id === subRunId);
  return child?.manifest ?? null;
}

function buildRunTraceability(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
}): RunBlockMemoryTraceability {
  return {
    manifest_path: relativeToRepo(params.env, params.paths.manifestPath),
    run_summary_path: resolveRunSummaryArtifactPath(params),
    events_path: relativeToRepo(params.env, params.paths.eventsPath),
    runner_log_path: params.manifest.log_path ?? relativeToRepo(params.env, params.paths.logPath),
    command_log_path: null,
    sub_run_manifest_path: null,
    event_query: {
      event_types: ['run_started', 'run_completed'],
      stage_id: null,
      stage_index: null
    }
  };
}

function buildStageTraceability(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  command: CliManifestCommand;
}): RunBlockMemoryTraceability {
  return {
    manifest_path: relativeToRepo(params.env, params.paths.manifestPath),
    run_summary_path: resolveRunSummaryArtifactPath(params),
    events_path: relativeToRepo(params.env, params.paths.eventsPath),
    runner_log_path: params.manifest.log_path ?? relativeToRepo(params.env, params.paths.logPath),
    command_log_path: params.command.log_path ?? null,
    sub_run_manifest_path: findChildManifestPath(params.manifest, params.command.sub_run_id),
    event_query: {
      event_types: ['step_started', 'step_completed', 'step_failed'],
      stage_id: params.command.id,
      stage_index: params.command.index
    }
  };
}

function buildRunBlockPayload(params: {
  manifest: CliManifest;
  traceability: RunBlockMemoryTraceability;
}): RunBlockMemoryPayload {
  return {
    schema_version: RUN_BLOCK_MEMORY_SCHEMA_VERSION,
    kind: RUN_BLOCK_MEMORY_BLOCK_KIND,
    generated_at: params.manifest.completed_at ?? params.manifest.updated_at,
    block: {
      id: 'run:completion',
      phase_kind: 'run',
      title: 'Run completion',
      status: params.manifest.status,
      summary: params.manifest.summary,
      started_at: params.manifest.started_at,
      completed_at: params.manifest.completed_at,
      command: null
    },
    traceability: params.traceability
  };
}

function buildStageBlockPayload(params: {
  manifest: CliManifest;
  command: CliManifestCommand;
  traceability: RunBlockMemoryTraceability;
}): RunBlockMemoryPayload {
  return {
    schema_version: RUN_BLOCK_MEMORY_SCHEMA_VERSION,
    kind: RUN_BLOCK_MEMORY_BLOCK_KIND,
    generated_at: params.manifest.completed_at ?? params.manifest.updated_at,
    block: {
      id: `stage:${params.command.id}`,
      phase_kind: 'stage',
      title: params.command.title,
      status: params.command.status,
      summary: params.command.summary,
      started_at: params.command.started_at,
      completed_at: params.command.completed_at,
      command: {
        index: params.command.index,
        id: params.command.id,
        kind: params.command.kind,
        exit_code: params.command.exit_code,
        sub_run_id: params.command.sub_run_id
      }
    },
    traceability: params.traceability
  };
}

async function materializeBlockDescriptor(params: {
  env: EnvironmentPaths;
  targetDir: string;
  payload: RunBlockMemoryPayload;
}): Promise<RunBlockMemoryBlockDescriptor> {
  const contextObject = await buildContextObject({
    source: {
      type: 'text',
      value: `${JSON.stringify(params.payload, null, 2)}\n`
    },
    targetDir: params.targetDir,
    chunking: {
      targetBytes: RUN_BLOCK_MEMORY_CHUNK_TARGET_BYTES,
      overlapBytes: RUN_BLOCK_MEMORY_CHUNK_OVERLAP_BYTES,
      strategy: 'byte'
    }
  });
  const firstChunk = contextObject.index.chunks[0];
  if (!firstChunk) {
    throw new Error('block_memory context object must contain at least one chunk');
  }
  return {
    id: params.payload.block.id,
    phase_kind: params.payload.block.phase_kind,
    title: params.payload.block.title,
    status: params.payload.block.status,
    summary: params.payload.block.summary,
    pointer: `ctx:${contextObject.index.object_id}#chunk:${firstChunk.id}`,
    object_id: contextObject.index.object_id,
    dir_path: relativeToRepo(params.env, params.targetDir),
    index_path: relativeToRepo(params.env, contextObject.indexPath),
    source_path: relativeToRepo(params.env, contextObject.sourcePath),
    byte_length: contextObject.index.source.byte_length,
    chunk_count: contextObject.index.chunks.length,
    created_at: contextObject.index.created_at,
    traceability: params.payload.traceability
  };
}

export async function materializeRunBlockMemory(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
}): Promise<RunBlockMemoryContract> {
  const rootDir = join(params.paths.runDir, 'memory', 'block-memory');
  await mkdir(rootDir, { recursive: true });

  const blocks: RunBlockMemoryBlockDescriptor[] = [];
  blocks.push(
    await materializeBlockDescriptor({
      env: params.env,
      targetDir: join(rootDir, 'blocks', '00-run-completion'),
      payload: buildRunBlockPayload({
        manifest: params.manifest,
        traceability: buildRunTraceability(params)
      })
    })
  );

  const emittedCommands = params.manifest.commands.filter((command) => command.status !== 'pending');
  for (const command of emittedCommands) {
    const segment = `${String(command.index).padStart(2, '0')}-${sanitizeBlockSegment(command.id)}`;
    blocks.push(
      await materializeBlockDescriptor({
        env: params.env,
        targetDir: join(rootDir, 'blocks', segment),
        payload: buildStageBlockPayload({
          manifest: params.manifest,
          command,
          traceability: buildStageTraceability({
            env: params.env,
            paths: params.paths,
            manifest: params.manifest,
            command
          })
        })
      })
    );
  }

  const indexPath = join(rootDir, 'index.json');
  const index: RunBlockMemoryIndex = {
    schema_version: RUN_BLOCK_MEMORY_SCHEMA_VERSION,
    kind: RUN_BLOCK_MEMORY_INDEX_KIND,
    generated_at: params.manifest.completed_at ?? params.manifest.updated_at,
    run_contract: {
      task_id: params.manifest.task_id,
      run_id: params.manifest.run_id,
      pipeline_id: params.manifest.pipeline_id,
    pipeline_title: params.manifest.pipeline_title
  },
  artifacts: {
      manifest_path: relativeToRepo(params.env, params.paths.manifestPath),
      run_summary_path: resolveRunSummaryArtifactPath(params),
      events_path: relativeToRepo(params.env, params.paths.eventsPath),
      runner_log_path: params.manifest.log_path ?? relativeToRepo(params.env, params.paths.logPath)
    },
    blocks
  };
  await writeJsonAtomic(indexPath, index);

  return {
    block_memory: {
      schema_version: RUN_BLOCK_MEMORY_SCHEMA_VERSION,
      kind: RUN_BLOCK_MEMORY_DESCRIPTOR_KIND,
      index_path: relativeToRepo(params.env, indexPath),
      generated_at: index.generated_at,
      block_count: blocks.length
    }
  };
}
