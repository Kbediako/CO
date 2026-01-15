import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface ContextChunk {
  id: string;
  start: number;
  end: number;
  sha256: string;
}

export interface ContextIndex {
  version: number;
  object_id: string;
  created_at: string;
  source: {
    path: string;
    byte_length: number;
  };
  chunking: {
    target_bytes: number;
    overlap_bytes: number;
    strategy: string;
  };
  chunks: ContextChunk[];
}

export interface ContextObject {
  dir: string;
  indexPath: string;
  sourcePath: string;
  index: ContextIndex;
}

export type ContextSource =
  | { type: 'text'; value: string }
  | { type: 'file'; value: string }
  | { type: 'dir'; value: string };

export interface ContextBuildOptions {
  source: ContextSource;
  targetDir: string;
  chunking: {
    targetBytes: number;
    overlapBytes: number;
    strategy: string;
  };
  now?: () => string;
}

const DEFAULT_POINTER_PREFIX = 'ctx:';
const DEFAULT_CHUNK_PREFIX = '#chunk:';

async function pathExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname);
    return true;
  } catch {
    return false;
  }
}

function hashBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function clampOverlap(targetBytes: number, overlapBytes: number): number {
  if (overlapBytes < 0) {
    return 0;
  }
  if (targetBytes <= 0) {
    return 0;
  }
  if (overlapBytes >= targetBytes) {
    return Math.max(0, targetBytes - 1);
  }
  return overlapBytes;
}

function foldAsciiBytes(buffer: Buffer): Buffer {
  let needsFold = false;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i] ?? 0;
    if (byte >= 65 && byte <= 90) {
      needsFold = true;
      break;
    }
  }
  if (!needsFold) {
    return buffer;
  }
  const output = Buffer.from(buffer);
  for (let i = 0; i < output.length; i += 1) {
    const byte = output[i] ?? 0;
    if (byte >= 65 && byte <= 90) {
      output[i] = byte + 32;
    }
  }
  return output;
}

function buildChunks(source: Buffer, targetBytes: number, overlapBytes: number): ContextChunk[] {
  const chunks: ContextChunk[] = [];
  if (source.length === 0) {
    return chunks;
  }
  const safeTarget = Number.isFinite(targetBytes) ? Math.floor(targetBytes) : 0;
  if (safeTarget <= 0) {
    throw new Error('context chunk target_bytes must be > 0');
  }
  const safeOverlap = Number.isFinite(overlapBytes) ? Math.floor(overlapBytes) : 0;
  const overlap = clampOverlap(safeTarget, safeOverlap);
  let index = 0;
  let start = 0;
  while (start < source.length) {
    const end = Math.min(start + safeTarget, source.length);
    const slice = source.subarray(start, end);
    index += 1;
    const id = `c${String(index).padStart(6, '0')}`;
    chunks.push({
      id,
      start,
      end,
      sha256: hashBytes(slice)
    });
    if (end >= source.length) {
      break;
    }
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

function validateIndex(index: ContextIndex): void {
  if (!index || typeof index !== 'object') {
    throw new Error('context index invalid');
  }
  if (index.version !== 1) {
    throw new Error('context index version invalid');
  }
  if (!index.object_id || typeof index.object_id !== 'string') {
    throw new Error('context index object_id missing');
  }
  if (!index.created_at || typeof index.created_at !== 'string') {
    throw new Error('context index created_at missing');
  }
  if (!index.source || typeof index.source.path !== 'string' || typeof index.source.byte_length !== 'number') {
    throw new Error('context index source invalid');
  }
  if (
    !index.chunking ||
    typeof index.chunking.target_bytes !== 'number' ||
    typeof index.chunking.overlap_bytes !== 'number' ||
    typeof index.chunking.strategy !== 'string'
  ) {
    throw new Error('context index chunking invalid');
  }
  if (!Array.isArray(index.chunks)) {
    throw new Error('context index chunks missing');
  }
}

export function parseContextPointer(pointer: string): { objectId: string; chunkId: string } | null {
  if (typeof pointer !== 'string' || !pointer.startsWith(DEFAULT_POINTER_PREFIX)) {
    return null;
  }
  const splitIndex = pointer.indexOf(DEFAULT_CHUNK_PREFIX);
  if (splitIndex <= DEFAULT_POINTER_PREFIX.length) {
    return null;
  }
  const objectId = pointer.slice(DEFAULT_POINTER_PREFIX.length, splitIndex);
  const chunkId = pointer.slice(splitIndex + DEFAULT_CHUNK_PREFIX.length);
  if (!objectId || !chunkId) {
    return null;
  }
  return { objectId, chunkId };
}

export async function buildContextObject(options: ContextBuildOptions): Promise<ContextObject> {
  const targetDir = resolve(options.targetDir);
  const now = options.now ?? (() => new Date().toISOString());
  const sourcePath = join(targetDir, 'source.txt');
  const indexPath = join(targetDir, 'index.json');

  await mkdir(targetDir, { recursive: true });

  if (options.source.type === 'dir') {
    const sourceDir = resolve(options.source.value);
    const existingIndexPath = join(sourceDir, 'index.json');
    const existingSourcePath = join(sourceDir, 'source.txt');
    if (!(await pathExists(existingIndexPath)) || !(await pathExists(existingSourcePath))) {
      throw new Error('context_source invalid');
    }
    const raw = await readFile(existingIndexPath, 'utf8');
    const parsed = JSON.parse(raw) as ContextIndex;
    validateIndex(parsed);
    if (sourceDir !== targetDir) {
      await copyFile(existingIndexPath, indexPath);
      await copyFile(existingSourcePath, sourcePath);
    }
    return {
      dir: targetDir,
      indexPath,
      sourcePath,
      index: parsed
    };
  }

  let sourceBytes: Buffer;
  if (options.source.type === 'file') {
    const resolvedFile = resolve(options.source.value);
    sourceBytes = await readFile(resolvedFile);
  } else {
    sourceBytes = Buffer.from(options.source.value ?? '', 'utf8');
  }

  await writeFile(sourcePath, sourceBytes);

  const targetBytes = options.chunking.targetBytes;
  const overlapBytes = options.chunking.overlapBytes;
  const chunks = buildChunks(sourceBytes, targetBytes, overlapBytes);
  const objectId = `sha256:${hashBytes(sourceBytes)}`;
  const index: ContextIndex = {
    version: 1,
    object_id: objectId,
    created_at: now(),
    source: {
      path: 'source.txt',
      byte_length: sourceBytes.length
    },
    chunking: {
      target_bytes: targetBytes,
      overlap_bytes: overlapBytes,
      strategy: options.chunking.strategy
    },
    chunks
  };

  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf8');

  return {
    dir: targetDir,
    indexPath,
    sourcePath,
    index
  };
}

async function readSpanBytes(sourcePath: string, startByte: number, length: number): Promise<Buffer> {
  if (length <= 0) {
    return Buffer.alloc(0);
  }
  const handle = await openFile(sourcePath);
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, startByte);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function openFile(sourcePath: string) {
  return open(sourcePath, 'r');
}

export class ContextStore {
  private readonly chunkMap: Map<string, ContextChunk>;

  constructor(private readonly context: ContextObject) {
    this.chunkMap = new Map(context.index.chunks.map((chunk) => [chunk.id, chunk]));
  }

  get objectId(): string {
    return this.context.index.object_id;
  }

  get chunkCount(): number {
    return this.context.index.chunks.length;
  }

  get sourceByteLength(): number {
    return this.context.index.source.byte_length;
  }

  validatePointer(pointer: string): { objectId: string; chunkId: string } | null {
    const parsed = parseContextPointer(pointer);
    if (!parsed) {
      return null;
    }
    if (parsed.objectId !== this.context.index.object_id) {
      return null;
    }
    if (!this.chunkMap.has(parsed.chunkId)) {
      return null;
    }
    return parsed;
  }

  async read(pointer: string, offset: number, bytes: number): Promise<{ text: string; startByte: number; endByte: number }> {
    const parsed = parseContextPointer(pointer);
    if (!parsed) {
      throw new Error('context pointer invalid');
    }
    if (parsed.objectId !== this.context.index.object_id) {
      throw new Error('context object mismatch');
    }
    const chunk = this.chunkMap.get(parsed.chunkId);
    if (!chunk) {
      throw new Error('context chunk missing');
    }
    const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
    const safeBytes = Number.isFinite(bytes) ? Math.max(0, Math.floor(bytes)) : 0;
    const maxBytes = Math.max(0, Math.min(safeBytes, chunk.end - chunk.start));
    const absoluteStart = Math.min(chunk.end, chunk.start + safeOffset);
    const remaining = Math.max(0, chunk.end - absoluteStart);
    const length = Math.min(maxBytes, remaining);
    const slice = await readSpanBytes(this.context.sourcePath, absoluteStart, length);
    return {
      text: slice.toString('utf8'),
      startByte: absoluteStart,
      endByte: absoluteStart + slice.length
    };
  }

  async readSpan(startByte: number, bytes: number): Promise<{ text: string; startByte: number; endByte: number }> {
    const safeStart = Number.isFinite(startByte) ? Math.max(0, Math.floor(startByte)) : 0;
    const safeBytes = Number.isFinite(bytes) ? Math.max(0, Math.floor(bytes)) : 0;
    const remaining = Math.max(0, this.context.index.source.byte_length - safeStart);
    const length = Math.min(safeBytes, remaining);
    const slice = await readSpanBytes(this.context.sourcePath, safeStart, length);
    return {
      text: slice.toString('utf8'),
      startByte: safeStart,
      endByte: safeStart + slice.length
    };
  }

  async search(
    query: string,
    topK: number,
    previewBytes: number
  ): Promise<Array<{
    pointer: string;
    offset: number;
    start_byte: number;
    match_bytes: number;
    score: number;
    preview: string;
  }>> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }
    const queryBytes = Buffer.from(trimmed, 'utf8');
    if (queryBytes.length === 0) {
      return [];
    }
    const foldedQuery = foldAsciiBytes(queryBytes);
    const matchLength = foldedQuery.length;
    const matchBytes = queryBytes.length;
    const safePreviewBytes = Math.max(0, Math.floor(previewBytes));
    const hits: Array<{
      pointer: string;
      offset: number;
      start_byte: number;
      match_bytes: number;
      score: number;
      preview: string;
      firstHit: number;
      chunkId: string;
    }> = [];

    for (const chunk of this.context.index.chunks) {
      const slice = await readSpanBytes(this.context.sourcePath, chunk.start, chunk.end - chunk.start);
      const foldedText = foldAsciiBytes(slice);
      let count = 0;
      let firstHit = -1;
      let offset = foldedText.indexOf(foldedQuery);
      while (offset !== -1) {
        if (firstHit === -1) {
          firstHit = offset;
        }
        count += 1;
        offset = foldedText.indexOf(foldedQuery, offset + matchLength);
      }
      if (count === 0) {
        continue;
      }
      const absoluteStart = chunk.start + firstHit;
      const previewSlice = slice.subarray(firstHit, Math.min(slice.length, firstHit + safePreviewBytes));
      hits.push({
        pointer: `${DEFAULT_POINTER_PREFIX}${this.context.index.object_id}${DEFAULT_CHUNK_PREFIX}${chunk.id}`,
        offset: firstHit,
        start_byte: absoluteStart,
        match_bytes: matchBytes,
        score: count,
        preview: previewSlice.toString('utf8'),
        firstHit: absoluteStart,
        chunkId: chunk.id
      });
    }

    hits.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (a.firstHit !== b.firstHit) {
        return a.firstHit - b.firstHit;
      }
      return a.chunkId.localeCompare(b.chunkId);
    });

    return hits.slice(0, Math.max(0, Math.floor(topK))).map(({ pointer, offset, start_byte, match_bytes, score, preview }) => ({
      pointer,
      offset,
      start_byte,
      match_bytes,
      score,
      preview
    }));
  }
}
