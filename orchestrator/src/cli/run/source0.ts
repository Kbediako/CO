import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import type { CliManifest } from '../types.js';
import { buildContextObject } from '../rlm/context.js';
import type { EnvironmentPaths } from './environment.js';
import type { RunPaths } from './runPaths.js';

const RUN_SOURCE0_SCHEMA_VERSION = 1;
const RUN_SOURCE0_CONTEXT_KIND = 'context_object';
const RUN_SOURCE0_PAYLOAD_KIND = 'run_source_0';
const RUN_SOURCE0_CHUNK_TARGET_BYTES = 65_536;
const RUN_SOURCE0_CHUNK_OVERLAP_BYTES = 4_096;

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

export interface RunMemoryContract {
  source_0: RunSource0Descriptor;
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
  return {
    dirPath: resolve(repoRoot, descriptor.dir_path),
    indexPath: resolve(repoRoot, descriptor.index_path),
    sourcePath: resolve(repoRoot, descriptor.source_path)
  };
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
    pointer: `ctx:${params.contextObject.index.object_id}#chunk:${firstChunk.id}`,
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

  if (inheritedDescriptor) {
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
    const inheritedFrom: RunSource0Lineage = {
      run_id: params.inheritedFrom!.manifest.run_id,
      task_id: params.inheritedFrom!.manifest.task_id,
      manifest_path: join(params.inheritedFrom!.manifest.artifact_root, 'manifest.json')
    };
    return {
      source_0: buildRunSource0Descriptor({
        repoRoot: params.env.repoRoot,
        runDir: targetDir,
        contextObject,
        origin: inheritedDescriptor.origin,
        inheritedFrom
      })
    };
  }

  const manifestPath = join(params.manifest.artifact_root, 'manifest.json');
  const payload = buildRunSource0Payload({
    manifest: params.manifest
  });
  const contextObject = await buildContextObject({
    source: {
      type: 'text',
      value: `${JSON.stringify(payload, null, 2)}\n`
    },
    targetDir,
    chunking: {
      targetBytes: RUN_SOURCE0_CHUNK_TARGET_BYTES,
      overlapBytes: RUN_SOURCE0_CHUNK_OVERLAP_BYTES,
      strategy: 'byte'
    }
  });
  return {
    source_0: buildRunSource0Descriptor({
      repoRoot: params.env.repoRoot,
      runDir: targetDir,
      contextObject,
      origin: {
        run_id: params.manifest.run_id,
        task_id: params.manifest.task_id,
        manifest_path: manifestPath
      },
      inheritedFrom: null
    })
  };
}
