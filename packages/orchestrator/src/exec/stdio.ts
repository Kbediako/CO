import { Buffer } from 'node:buffer';

export type StdioStream = 'stdout' | 'stderr';

export interface SequencedStdioChunk {
  sequence: number;
  stream: StdioStream;
  bytes: number;
  data: string;
  timestamp: string;
}

export interface StdioTrackerOptions {
  /**
   * Maximum number of bytes retained per stream. Defaults to 64 KiB.
   */
  maxBufferBytes?: number;
  /**
   * Encoder used to stringify buffered data. Defaults to `utf-8`.
   */
  encoding?: BufferEncoding;
  /**
   * Function used to generate timestamps for chunks. Defaults to `() => new Date()`.
   */
  now?: () => Date;
  /**
   * Initial sequence offset. Defaults to 0.
   */
  startSequence?: number;
}

export interface StdioTracker {
  push(stream: StdioStream, chunk: Buffer | string): SequencedStdioChunk;
  getBuffered(stream: StdioStream): string;
  getBufferedBytes(stream: StdioStream): number;
  reset(): void;
}

interface InternalBuffer {
  chunks: Buffer[];
  start: number;
  byteLength: number;
}

/**
 * Creates a tracker that sequences stdout/stderr chunks while maintaining
 * bounded in-memory buffers for each stream.
 */
export function createStdioTracker(options: StdioTrackerOptions = {}): StdioTracker {
  const encoding = options.encoding ?? 'utf-8';
  const maxBufferBytes = options.maxBufferBytes ?? 64 * 1024;
  const now = options.now ?? (() => new Date());
  let sequence = Math.max(0, options.startSequence ?? 0);

  const buffers: Record<StdioStream, InternalBuffer> = {
    stdout: createInternalBuffer(),
    stderr: createInternalBuffer()
  };

  const push = (stream: StdioStream, chunk: Buffer | string): SequencedStdioChunk => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    const target = buffers[stream];
    appendWithLimit(target, buffer, maxBufferBytes);

    const chunkRecord: SequencedStdioChunk = {
      sequence: ++sequence,
      stream,
      bytes: buffer.byteLength,
      data: buffer.toString(encoding),
      timestamp: now().toISOString()
    };
    return chunkRecord;
  };

  const getBuffered = (stream: StdioStream): string => {
    const target = buffers[stream];
    if (target.byteLength === 0) {
      return '';
    }
    const activeChunks = snapshotChunks(target);
    if (activeChunks.length === 0) {
      return '';
    }
    if (activeChunks.length === 1) {
      return activeChunks[0]!.toString(encoding);
    }
    return Buffer.concat(activeChunks, target.byteLength).toString(encoding);
  };

  const getBufferedBytes = (stream: StdioStream): number => buffers[stream].byteLength;

  const reset = (): void => {
    buffers.stdout = createInternalBuffer();
    buffers.stderr = createInternalBuffer();
    sequence = Math.max(0, options.startSequence ?? 0);
  };

  return {
    push,
    getBuffered,
    getBufferedBytes,
    reset
  };
}

function createInternalBuffer(): InternalBuffer {
  return { chunks: [], start: 0, byteLength: 0 };
}

function snapshotChunks(buffer: InternalBuffer): Buffer[] {
  if (buffer.start === 0) {
    return buffer.chunks;
  }
  return buffer.chunks.slice(buffer.start);
}

function appendWithLimit(target: InternalBuffer, incoming: Buffer, limit: number): void {
  if (limit <= 0) {
    target.chunks = [];
    target.start = 0;
    target.byteLength = 0;
    return;
  }

  if (!incoming || incoming.byteLength === 0) {
    trimExcess(target, limit);
    return;
  }

  if (incoming.byteLength >= limit) {
    const trimmed = Buffer.from(incoming.subarray(incoming.byteLength - limit));
    target.chunks = [trimmed];
    target.start = 0;
    target.byteLength = trimmed.byteLength;
    return;
  }

  target.chunks.push(incoming);
  target.byteLength += incoming.byteLength;
  trimExcess(target, limit);
}

function trimExcess(target: InternalBuffer, limit: number): void {
  if (target.byteLength <= limit) {
    return;
  }

  let startIndex = target.start;
  const chunks = target.chunks;

  while (target.byteLength > limit && startIndex < chunks.length) {
    const head = chunks[startIndex];
    if (!head) {
      break;
    }
    const overflow = target.byteLength - limit;
    if (head.byteLength <= overflow) {
      target.byteLength -= head.byteLength;
      startIndex += 1;
      continue;
    }
    chunks[startIndex] = head.subarray(overflow);
    target.byteLength -= overflow;
    break;
  }

  target.start = startIndex;

  if (target.start > 0 && target.start * 2 >= chunks.length) {
    target.chunks = chunks.slice(target.start);
    target.start = 0;
  }
}
