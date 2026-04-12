import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

import type { CliManifest } from '../types.js';
import { buildContextObject } from '../rlm/context.js';
import type { EnvironmentPaths } from './environment.js';
import type { RunPaths } from './runPaths.js';
import { isoTimestamp } from '../utils/time.js';

const RUN_SOURCE0_SCHEMA_VERSION = 1;
const RUN_MEMORY_OBSERVABILITY_SCHEMA_VERSION = 1;
const RUN_SOURCE0_CONTEXT_KIND = 'context_object';
const RUN_SOURCE0_PAYLOAD_KIND = 'run_source_0';
const RUN_SOURCE0_CHUNK_TARGET_BYTES = 65_536;
const RUN_SOURCE0_CHUNK_OVERLAP_BYTES = 4_096;
const WINDOWS_DRIVE_ABSOLUTE_PATH_RE = /^[A-Za-z]:[\\/]/u;

export interface RunSource0Lineage {
  run_id: string;
  task_id: string;
  manifest_path: string;
}

export interface RunSource0Descriptor {
  schema_version: number;
  kind: 'context_object';
  object_id: string;
  pointer: string;
  dir_path: string;
  index_path: string;
  source_path: string;
  byte_length: number;
  chunk_count: number;
  created_at: string;
  origin: RunSource0Lineage;
  inherited_from: RunSource0Lineage | null;
}

export type RunMemorySelection = 'root' | 'inherited_reuse' | 'fresh_rebuild';
export type RunMemoryRejectedReason = 'missing_artifacts' | 'provenance_contradiction';

export interface RunMemoryProvenanceDescriptor {
  pointer: string;
  object_id: string;
  dir_path: string;
  index_path: string;
  source_path: string;
  created_at: string;
  origin: RunSource0Lineage;
  inherited_from: RunSource0Lineage | null;
}

export interface RunMemorySelectedDescriptor extends RunMemoryProvenanceDescriptor {
  selection: RunMemorySelection;
}

export interface RunMemoryRejectedCandidate extends RunMemoryProvenanceDescriptor {
  reason: RunMemoryRejectedReason;
  detail: string | null;
}

export interface RunMemoryRediscovery {
  from_pointer: string;
  from_object_id: string;
  to_pointer: string;
  to_object_id: string;
  reason: RunMemoryRejectedReason;
}

export interface RunMemoryManualRepair {
  timestamp: string;
  actor: string;
  reason: string;
  outcome: 'accepted';
  detail: string | null;
}

export interface RunMemoryObservabilityCounters {
  contradiction_count: number;
  rediscovery_count: number;
  resume_latency_ms: number | null;
  manual_repair_count: number;
  repeated_failure_streak: number;
  retrieval_hits: number;
  retrieval_misses: number;
}

export interface RunMemoryObservability {
  schema_version: number;
  recorded_at: string;
  selected_memory: RunMemorySelectedDescriptor;
  rejected_candidates: RunMemoryRejectedCandidate[];
  rediscovered_memory: RunMemoryRediscovery | null;
  manual_repairs: RunMemoryManualRepair[];
  counters: RunMemoryObservabilityCounters;
}

export interface RunMemoryContract {
  source_0: RunSource0Descriptor;
  observability: RunMemoryObservability;
}

interface RunSource0PromptPackPayload {
  id: string;
  domain: string;
  stamp: string;
  source_count: number;
  experience_count: number;
}

export interface RunSource0Payload {
  schema_version: number;
  kind: 'run_source_0';
  generated_at: string;
  run_contract: {
    task_id: string;
    run_id: string;
    parent_run_id: string | null;
    pipeline_id: string;
    pipeline_title: string;
  };
  artifacts: {
    manifest_path: string;
    artifact_root: string;
    log_path: string;
    workspace_path: string | null;
  };
  issue: {
    provider: string | null;
    id: string | null;
    identifier: string | null;
    updated_at: string | null;
  };
  instructions: {
    hash: string | null;
    sources: string[];
    prompt_packs: RunSource0PromptPackPayload[];
  };
}

export interface ResolvedRunSource0Paths {
  dirPath: string;
  indexPath: string;
  sourcePath: string;
}

interface RejectedInheritedCandidate {
  descriptor: RunSource0Descriptor;
  reason: RunMemoryRejectedReason;
  detail: string | null;
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

function readRunSource0Lineage(value: unknown): RunSource0Lineage | null {
  if (!isRecord(value)) {
    return null;
  }
  const runId = readNonEmptyString(value.run_id);
  const taskId = readNonEmptyString(value.task_id);
  const manifestPath = readNonEmptyString(value.manifest_path);
  if (!runId || !taskId || !manifestPath) {
    return null;
  }
  return {
    run_id: runId,
    task_id: taskId,
    manifest_path: manifestPath
  };
}

function readSource0Candidate(input: unknown): Record<string, unknown> | null {
  if (!isRecord(input)) {
    return null;
  }
  if (isRecord(input.memory) && isRecord(input.memory.source_0)) {
    return input.memory.source_0;
  }
  return input;
}

function buildRunSource0Payload(params: {
  manifest: CliManifest;
}): RunSource0Payload {
  const promptPacks = Array.isArray(params.manifest.prompt_packs) ? params.manifest.prompt_packs : [];
  const manifestPath = join(params.manifest.artifact_root, 'manifest.json');
  return {
    schema_version: RUN_SOURCE0_SCHEMA_VERSION,
    kind: RUN_SOURCE0_PAYLOAD_KIND,
    generated_at: params.manifest.updated_at,
    run_contract: {
      task_id: params.manifest.task_id,
      run_id: params.manifest.run_id,
      parent_run_id: params.manifest.parent_run_id ?? null,
      pipeline_id: params.manifest.pipeline_id,
      pipeline_title: params.manifest.pipeline_title
    },
    artifacts: {
      manifest_path: manifestPath,
      artifact_root: params.manifest.artifact_root,
      log_path: params.manifest.log_path,
      workspace_path: params.manifest.workspace_path ?? null
    },
    issue: {
      provider: params.manifest.issue_provider ?? null,
      id: params.manifest.issue_id ?? null,
      identifier: params.manifest.issue_identifier ?? null,
      updated_at: params.manifest.issue_updated_at ?? null
    },
    instructions: {
      hash: params.manifest.instructions_hash ?? null,
      sources: [...params.manifest.instructions_sources],
      prompt_packs: promptPacks.map((pack) => ({
        id: pack.id,
        domain: pack.domain,
        stamp: pack.stamp,
        source_count: Array.isArray(pack.sources) ? pack.sources.length : 0,
        experience_count: Array.isArray(pack.experiences) ? pack.experiences.length : 0
      }))
    }
  };
}

function buildRunMemoryProvenanceDescriptor(
  descriptor: RunSource0Descriptor
): RunMemoryProvenanceDescriptor {
  return {
    pointer: descriptor.pointer,
    object_id: descriptor.object_id,
    dir_path: descriptor.dir_path,
    index_path: descriptor.index_path,
    source_path: descriptor.source_path,
    created_at: descriptor.created_at,
    origin: descriptor.origin,
    inherited_from: descriptor.inherited_from
  };
}

function buildRunMemorySelectedDescriptor(params: {
  descriptor: RunSource0Descriptor;
  selection: RunMemorySelection;
}): RunMemorySelectedDescriptor {
  return {
    selection: params.selection,
    ...buildRunMemoryProvenanceDescriptor(params.descriptor)
  };
}

function buildRunMemoryRejectedCandidate(params: RejectedInheritedCandidate): RunMemoryRejectedCandidate {
  return {
    ...buildRunMemoryProvenanceDescriptor(params.descriptor),
    reason: params.reason,
    detail: params.detail
  };
}

function buildRunSource0Pointer(objectId: string, chunkId: string): string {
  return `ctx:${objectId}#chunk:${chunkId}`;
}

function buildRunMemoryRediscovery(params: {
  rejected: RejectedInheritedCandidate;
  selected: RunSource0Descriptor;
}): RunMemoryRediscovery {
  return {
    from_pointer: params.rejected.descriptor.pointer,
    from_object_id: params.rejected.descriptor.object_id,
    to_pointer: params.selected.pointer,
    to_object_id: params.selected.object_id,
    reason: params.rejected.reason
  };
}

function readAcceptedManualRepairEvents(
  manifest: Pick<CliManifest, 'resume_events'>
): RunMemoryManualRepair[] {
  return manifest.resume_events
    .filter((event) => event.outcome === 'accepted' && event.reason === 'manual-resume')
    .map((event) => ({
      timestamp: event.timestamp,
      actor: event.actor,
      reason: event.reason,
      outcome: 'accepted' as const,
      detail: event.detail ?? null
    }));
}

function resolveResumeLatencyMs(
  recordedAt: string,
  manualRepairs: RunMemoryManualRepair[]
): number | null {
  const latestRepair = manualRepairs.at(-1);
  if (!latestRepair) {
    return null;
  }
  const recordedAtMs = Date.parse(recordedAt);
  const repairAtMs = Date.parse(latestRepair.timestamp);
  if (Number.isNaN(recordedAtMs) || Number.isNaN(repairAtMs)) {
    return null;
  }
  return Math.max(0, recordedAtMs - repairAtMs);
}

function readRepeatedFailureStreak(manifest: CliManifest | null | undefined): number {
  const streak = manifest?.memory?.observability?.counters?.repeated_failure_streak;
  return typeof streak === 'number' && Number.isInteger(streak) && streak >= 0 ? streak : 0;
}

function applyRunMemoryManualRepairState(
  observability: RunMemoryObservability,
  manifest: Pick<CliManifest, 'resume_events'>,
  recordedAt: string
): void {
  const manualRepairs = readAcceptedManualRepairEvents(manifest);
  observability.recorded_at = recordedAt;
  observability.manual_repairs = manualRepairs;
  observability.counters.manual_repair_count = manualRepairs.length;
  observability.counters.resume_latency_ms = resolveResumeLatencyMs(recordedAt, manualRepairs);
}

function buildRunMemoryObservability(params: {
  manifest: CliManifest;
  recordedAt: string;
  selected: RunSource0Descriptor;
  selection: RunMemorySelection;
  rejectedCandidates: RejectedInheritedCandidate[];
  repeatedFailureStreak: number;
}): RunMemoryObservability {
  const rejectedCandidates = params.rejectedCandidates.map((candidate) =>
    buildRunMemoryRejectedCandidate(candidate)
  );
  const rediscoveredMemory =
    params.selection === 'fresh_rebuild' && params.rejectedCandidates[0]
      ? buildRunMemoryRediscovery({
          rejected: params.rejectedCandidates[0],
          selected: params.selected
        })
      : null;
  const observability: RunMemoryObservability = {
    schema_version: RUN_MEMORY_OBSERVABILITY_SCHEMA_VERSION,
    recorded_at: params.recordedAt,
    selected_memory: buildRunMemorySelectedDescriptor({
      descriptor: params.selected,
      selection: params.selection
    }),
    rejected_candidates: rejectedCandidates,
    rediscovered_memory: rediscoveredMemory,
    manual_repairs: [],
    counters: {
      contradiction_count: params.rejectedCandidates.filter(
        (candidate) => candidate.reason === 'provenance_contradiction'
      ).length,
      rediscovery_count: rediscoveredMemory ? 1 : 0,
      resume_latency_ms: null,
      manual_repair_count: 0,
      repeated_failure_streak: params.repeatedFailureStreak,
      retrieval_hits: params.selection === 'inherited_reuse' ? 1 : 0,
      retrieval_misses: params.rejectedCandidates.length > 0 ? 1 : 0
    }
  };
  applyRunMemoryManualRepairState(observability, params.manifest, params.recordedAt);
  return observability;
}

async function assessInheritedRunSource0Candidate(params: {
  repoRoot: string;
  descriptor: RunSource0Descriptor;
}): Promise<RejectedInheritedCandidate | null> {
  if (!(await hasRunSource0Artifacts(params.repoRoot, params.descriptor))) {
    return {
      descriptor: params.descriptor,
      reason: 'missing_artifacts',
      detail: 'inherited source_0 artifacts are missing'
    };
  }

  try {
    const payload = await readRunSource0Payload(params.repoRoot, params.descriptor);
    if (!payload) {
      return {
        descriptor: params.descriptor,
        reason: 'provenance_contradiction',
        detail: 'inherited source_0 payload is invalid'
      };
    }

    if (payload.run_contract.run_id !== params.descriptor.origin.run_id) {
      return {
        descriptor: params.descriptor,
        reason: 'provenance_contradiction',
        detail: 'inherited source_0 payload run_id does not match descriptor origin'
      };
    }
    if (payload.run_contract.task_id !== params.descriptor.origin.task_id) {
      return {
        descriptor: params.descriptor,
        reason: 'provenance_contradiction',
        detail: 'inherited source_0 payload task_id does not match descriptor origin'
      };
    }
    if (payload.artifacts.manifest_path !== params.descriptor.origin.manifest_path) {
      return {
        descriptor: params.descriptor,
        reason: 'provenance_contradiction',
        detail: 'inherited source_0 payload manifest_path does not match descriptor origin'
      };
    }

    const inheritedPaths = resolveRunSource0Paths(params.repoRoot, params.descriptor);
    const contextObject = await buildContextObject({
      source: { type: 'dir', value: inheritedPaths.dirPath },
      targetDir: inheritedPaths.dirPath,
      chunking: {
        targetBytes: RUN_SOURCE0_CHUNK_TARGET_BYTES,
        overlapBytes: RUN_SOURCE0_CHUNK_OVERLAP_BYTES,
        strategy: 'byte'
      }
    });
    validateRunSource0DescriptorAgainstArtifacts({
      repoRoot: params.repoRoot,
      descriptor: params.descriptor,
      contextObject
    });
  } catch (error: unknown) {
    return {
      descriptor: params.descriptor,
      reason: 'provenance_contradiction',
      detail: (error as Error)?.message ?? 'failed to read inherited source_0 payload'
    };
  }

  return null;
}

export function readRunSource0Descriptor(input: unknown): RunSource0Descriptor | null {
  const candidate = readSource0Candidate(input);
  if (!candidate) {
    return null;
  }
  const schemaVersion = readInteger(candidate.schema_version);
  const kind = readNonEmptyString(candidate.kind);
  const objectId = readNonEmptyString(candidate.object_id);
  const pointer = readNonEmptyString(candidate.pointer);
  const dirPath = readNonEmptyString(candidate.dir_path);
  const indexPath = readNonEmptyString(candidate.index_path);
  const sourcePath = readNonEmptyString(candidate.source_path);
  const byteLength = readInteger(candidate.byte_length);
  const chunkCount = readInteger(candidate.chunk_count);
  const createdAt = readNonEmptyString(candidate.created_at);
  const origin = readRunSource0Lineage(candidate.origin);
  const inheritedFrom =
    candidate.inherited_from === null ? null : readRunSource0Lineage(candidate.inherited_from);
  if (
    schemaVersion === null ||
    schemaVersion < 1 ||
    kind !== RUN_SOURCE0_CONTEXT_KIND ||
    !objectId ||
    !pointer ||
    !dirPath ||
    !indexPath ||
    !sourcePath ||
    byteLength === null ||
    byteLength < 0 ||
    chunkCount === null ||
    chunkCount < 1 ||
    !createdAt ||
    !origin ||
    candidate.inherited_from === undefined ||
    (candidate.inherited_from !== null && inheritedFrom === null)
  ) {
    return null;
  }
  return {
    schema_version: schemaVersion,
    kind: RUN_SOURCE0_CONTEXT_KIND,
    object_id: objectId,
    pointer,
    dir_path: dirPath,
    index_path: indexPath,
    source_path: sourcePath,
    byte_length: byteLength,
    chunk_count: chunkCount,
    created_at: createdAt,
    origin,
    inherited_from: inheritedFrom
  };
}

export function resolveRunSource0Paths(
  repoRoot: string,
  descriptor: RunSource0Descriptor
): ResolvedRunSource0Paths {
  const resolvedRepoRoot = resolve(repoRoot);
  return {
    dirPath: resolveRepoRelativeSource0Path(resolvedRepoRoot, descriptor.dir_path, 'dir_path'),
    indexPath: resolveRepoRelativeSource0Path(resolvedRepoRoot, descriptor.index_path, 'index_path'),
    sourcePath: resolveRepoRelativeSource0Path(resolvedRepoRoot, descriptor.source_path, 'source_path')
  };
}

function resolveRepoRelativeSource0Path(repoRoot: string, candidate: string, field: string): string {
  if (isAbsolute(candidate) || WINDOWS_DRIVE_ABSOLUTE_PATH_RE.test(candidate)) {
    throw new Error(`source_0 ${field} must be repo-relative`);
  }
  const normalizedCandidate = candidate.replaceAll('\\', '/');
  if (normalizedCandidate.split('/').some((segment) => segment === '..')) {
    throw new Error(`source_0 ${field} must not traverse outside the repo root`);
  }
  const resolvedPath = resolve(repoRoot, candidate);
  const relativePath = relative(repoRoot, resolvedPath);
  if (
    !relativePath ||
    relativePath === '.' ||
    isAbsolute(relativePath) ||
    WINDOWS_DRIVE_ABSOLUTE_PATH_RE.test(relativePath) ||
    relativePath.split(/[\\/]+/u).some((segment) => segment === '..')
  ) {
    throw new Error(`source_0 ${field} escapes the repo root`);
  }
  return resolvedPath;
}

export function buildRunSource0PromptLines(descriptor: RunSource0Descriptor | null): string[] {
  if (!descriptor) {
    return [];
  }
  const lines = [
    'Shared source 0 anchor:',
    `- Pointer: \`${descriptor.pointer}\``,
    `- Object id: \`${descriptor.object_id}\``,
    `- Context dir: \`${descriptor.dir_path}\``,
    `- Source payload: \`${descriptor.source_path}\``,
    `- Origin: run=\`${descriptor.origin.run_id}\`, task=\`${descriptor.origin.task_id}\`, manifest=\`${descriptor.origin.manifest_path}\``
  ];
  if (descriptor.inherited_from) {
    lines.push(
      `- Inherited from: run=\`${descriptor.inherited_from.run_id}\`, task=\`${descriptor.inherited_from.task_id}\`, manifest=\`${descriptor.inherited_from.manifest_path}\``
    );
  }
  return lines;
}

export async function readRunSource0Payload(
  repoRoot: string,
  descriptor: RunSource0Descriptor
): Promise<RunSource0Payload | null> {
  const raw = await readFile(resolveRunSource0Paths(repoRoot, descriptor).sourcePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    return null;
  }
  if (readInteger(parsed.schema_version) !== RUN_SOURCE0_SCHEMA_VERSION) {
    return null;
  }
  if (readNonEmptyString(parsed.kind) !== RUN_SOURCE0_PAYLOAD_KIND) {
    return null;
  }
  return parsed as unknown as RunSource0Payload;
}

export async function hasRunSource0Artifacts(
  repoRoot: string,
  descriptor: RunSource0Descriptor
): Promise<boolean> {
  try {
    const paths = resolveRunSource0Paths(repoRoot, descriptor);
    const [dirInfo, indexInfo, sourceInfo] = await Promise.all([
      stat(paths.dirPath),
      stat(paths.indexPath),
      stat(paths.sourcePath)
    ]);
    return dirInfo.isDirectory() && indexInfo.isFile() && sourceInfo.isFile();
  } catch {
    return false;
  }
}

function buildRunSource0Descriptor(params: {
  repoRoot: string;
  runDir: string;
  contextObject: Awaited<ReturnType<typeof buildContextObject>>;
  origin: RunSource0Lineage;
  inheritedFrom: RunSource0Lineage | null;
}): RunSource0Descriptor {
  const firstChunk = params.contextObject.index.chunks[0];
  if (!firstChunk) {
    throw new Error('source_0 context object must contain at least one chunk');
  }
  return {
    schema_version: RUN_SOURCE0_SCHEMA_VERSION,
    kind: RUN_SOURCE0_CONTEXT_KIND,
    object_id: params.contextObject.index.object_id,
    pointer: buildRunSource0Pointer(params.contextObject.index.object_id, firstChunk.id),
    dir_path: relative(params.repoRoot, params.runDir),
    index_path: relative(params.repoRoot, params.contextObject.indexPath),
    source_path: relative(params.repoRoot, params.contextObject.sourcePath),
    byte_length: params.contextObject.index.source.byte_length,
    chunk_count: params.contextObject.index.chunks.length,
    created_at: params.contextObject.index.created_at,
    origin: params.origin,
    inherited_from: params.inheritedFrom
  };
}

function validateRunSource0DescriptorAgainstArtifacts(params: {
  repoRoot: string;
  descriptor: RunSource0Descriptor;
  contextObject: Awaited<ReturnType<typeof buildContextObject>>;
}): void {
  const firstChunk = params.contextObject.index.chunks[0];
  if (!firstChunk) {
    throw new Error('source_0 context object must contain at least one chunk');
  }

  const expectedPointer = buildRunSource0Pointer(params.contextObject.index.object_id, firstChunk.id);
  const expectedDirPath = relative(params.repoRoot, params.contextObject.dir);
  const expectedIndexPath = relative(params.repoRoot, params.contextObject.indexPath);
  const expectedSourcePath = relative(params.repoRoot, params.contextObject.sourcePath);

  if (params.descriptor.object_id !== params.contextObject.index.object_id) {
    throw new Error('inherited source_0 descriptor object_id does not match artifacts');
  }
  if (params.descriptor.pointer !== expectedPointer) {
    throw new Error('inherited source_0 descriptor pointer does not match artifacts');
  }
  if (params.descriptor.dir_path !== expectedDirPath) {
    throw new Error('inherited source_0 descriptor dir_path does not match artifacts');
  }
  if (params.descriptor.index_path !== expectedIndexPath) {
    throw new Error('inherited source_0 descriptor index_path does not match artifacts');
  }
  if (params.descriptor.source_path !== expectedSourcePath) {
    throw new Error('inherited source_0 descriptor source_path does not match artifacts');
  }
  if (params.descriptor.byte_length !== params.contextObject.index.source.byte_length) {
    throw new Error('inherited source_0 descriptor byte_length does not match artifacts');
  }
  if (params.descriptor.chunk_count !== params.contextObject.index.chunks.length) {
    throw new Error('inherited source_0 descriptor chunk_count does not match artifacts');
  }
  if (params.descriptor.created_at !== params.contextObject.index.created_at) {
    throw new Error('inherited source_0 descriptor created_at does not match artifacts');
  }
}

function buildCurrentRunLineage(manifest: CliManifest): RunSource0Lineage {
  return {
    run_id: manifest.run_id,
    task_id: manifest.task_id,
    manifest_path: join(manifest.artifact_root, 'manifest.json')
  };
}

async function materializeFreshRunSource0(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  targetDir: string;
  inheritedFrom: RunSource0Lineage | null;
}): Promise<{ source_0: RunSource0Descriptor }> {
  const payload = buildRunSource0Payload({
    manifest: params.manifest
  });
  const contextObject = await buildContextObject({
    source: {
      type: 'text',
      value: `${JSON.stringify(payload, null, 2)}\n`
    },
    targetDir: params.targetDir,
    chunking: {
      targetBytes: RUN_SOURCE0_CHUNK_TARGET_BYTES,
      overlapBytes: RUN_SOURCE0_CHUNK_OVERLAP_BYTES,
      strategy: 'byte'
    }
  });
  return {
    source_0: buildRunSource0Descriptor({
      repoRoot: params.env.repoRoot,
      runDir: params.targetDir,
      contextObject,
      origin: buildCurrentRunLineage(params.manifest),
      inheritedFrom: params.inheritedFrom
    })
  };
}

export async function materializeRunSource0(params: {
  env: EnvironmentPaths;
  paths: RunPaths;
  manifest: CliManifest;
  inheritedFrom?: {
    manifest: CliManifest;
    paths: RunPaths;
  } | null;
}): Promise<RunMemoryContract> {
  const targetDir = join(params.paths.runDir, 'memory', 'source-0');
  const inheritedDescriptor = params.inheritedFrom
    ? readRunSource0Descriptor(params.inheritedFrom.manifest)
    : null;
  const inheritedLineage = params.inheritedFrom
    ? buildCurrentRunLineage(params.inheritedFrom.manifest)
    : null;
  const recordedAt = isoTimestamp();

  if (inheritedDescriptor) {
    let rejectedCandidate = await assessInheritedRunSource0Candidate({
      repoRoot: params.env.repoRoot,
      descriptor: inheritedDescriptor
    });
    if (!rejectedCandidate) {
      try {
        const inheritedPaths = resolveRunSource0Paths(params.env.repoRoot, inheritedDescriptor);
        const contextObject = await buildContextObject({
          source: { type: 'dir', value: inheritedPaths.dirPath },
          targetDir,
          chunking: {
            targetBytes: RUN_SOURCE0_CHUNK_TARGET_BYTES,
            overlapBytes: RUN_SOURCE0_CHUNK_OVERLAP_BYTES,
            strategy: 'byte'
          }
        });
        const source0 = buildRunSource0Descriptor({
          repoRoot: params.env.repoRoot,
          runDir: targetDir,
          contextObject,
          origin: inheritedDescriptor.origin,
          inheritedFrom: inheritedLineage
        });
        return {
          source_0: source0,
          observability: buildRunMemoryObservability({
            manifest: params.manifest,
            recordedAt,
            selected: source0,
            selection: 'inherited_reuse',
            rejectedCandidates: [],
            repeatedFailureStreak: 0
          })
        };
      } catch (error: unknown) {
        rejectedCandidate = {
          descriptor: inheritedDescriptor,
          reason: 'provenance_contradiction',
          detail: (error as Error)?.message ?? 'failed to materialize inherited source_0 context'
        };
      }
    }

    const fresh = await materializeFreshRunSource0({
      env: params.env,
      paths: params.paths,
      manifest: params.manifest,
      targetDir,
      inheritedFrom: inheritedLineage
    });
    return {
      source_0: fresh.source_0,
      observability: buildRunMemoryObservability({
        manifest: params.manifest,
        recordedAt,
        selected: fresh.source_0,
        selection: 'fresh_rebuild',
        rejectedCandidates: [rejectedCandidate],
        repeatedFailureStreak: readRepeatedFailureStreak(params.inheritedFrom?.manifest) + 1
      })
    };
  }

  const fresh = await materializeFreshRunSource0({
    env: params.env,
    paths: params.paths,
    manifest: params.manifest,
    targetDir,
    inheritedFrom: null
  });
  return {
    source_0: fresh.source_0,
    observability: buildRunMemoryObservability({
      manifest: params.manifest,
      recordedAt,
      selected: fresh.source_0,
      selection: 'root',
      rejectedCandidates: [],
      repeatedFailureStreak: 0
    })
  };
}

export function refreshRunMemoryObservability(
  manifest: CliManifest,
  recordedAt: string = isoTimestamp()
): boolean {
  const observability = manifest.memory?.observability;
  if (!observability) {
    return false;
  }
  applyRunMemoryManualRepairState(observability, manifest, recordedAt);
  return true;
}

export function buildRunMemoryObservabilityMetrics(
  observability: RunMemoryObservability | null | undefined
):
  | {
      recorded_at: string;
      selected_memory: RunMemorySelectedDescriptor;
      counters: RunMemoryObservabilityCounters;
    }
  | undefined {
  if (!observability) {
    return undefined;
  }
  return {
    recorded_at: observability.recorded_at,
    selected_memory: observability.selected_memory,
    counters: observability.counters
  };
}
