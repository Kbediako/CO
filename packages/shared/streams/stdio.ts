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
  data: Buffer;
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
    stdout: { data: Buffer.alloc(0) },
    stderr: { data: Buffer.alloc(0) }
  };

  const push = (stream: StdioStream, chunk: Buffer | string): SequencedStdioChunk => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    const target = buffers[stream];
    target.data = appendWithLimit(target.data, buffer, maxBufferBytes);

    const chunkRecord: SequencedStdioChunk = {
      sequence: ++sequence,
      stream,
      bytes: buffer.byteLength,
      data: buffer.toString(encoding),
      timestamp: now().toISOString()
    };
    return chunkRecord;
  };

  const getBuffered = (stream: StdioStream): string => buffers[stream].data.toString(encoding);

  const getBufferedBytes = (stream: StdioStream): number => buffers[stream].data.byteLength;

  const reset = (): void => {
    buffers.stdout.data = Buffer.alloc(0);
    buffers.stderr.data = Buffer.alloc(0);
    sequence = Math.max(0, options.startSequence ?? 0);
  };

  return {
    push,
    getBuffered,
    getBufferedBytes,
    reset
  };
}

function appendWithLimit(existing: Buffer, incoming: Buffer, limit: number): Buffer {
  if (limit <= 0) {
    return Buffer.alloc(0);
  }
  const combined = Buffer.concat([existing, incoming]);
  if (combined.byteLength <= limit) {
    return combined;
  }
  return combined.subarray(combined.byteLength - limit);
}
