import { randomUUID } from 'node:crypto';

import type { ExecEvent } from '../../../shared/events/types.js';

export type StreamFrameGuardAction = 'allow' | 'redact' | 'block';

export interface StreamFrameGuardDecision {
  action: StreamFrameGuardAction;
  rule?: string;
  reason?: string;
}

export interface StreamFrameGuardResult {
  frame: ExecStreamFrame | null;
  decision: StreamFrameGuardDecision;
}

export interface StreamFrameGuardContext {
  handleId: string;
}

export interface StreamFrameGuard {
  process(
    frame: ExecStreamFrame,
    context: StreamFrameGuardContext
  ): StreamFrameGuardResult | Promise<StreamFrameGuardResult>;
}

export interface ExecStreamFrame {
  sequence: number;
  event: ExecEvent;
  timestamp: string;
}

export interface ExecHandleDescriptor {
  id: string;
  correlationId: string;
  createdAt: string;
  frameCount: number;
  status: 'open' | 'closed';
  latestSequence: number;
}

export interface SubscribeOptions {
  fromSequence?: number;
  maxQueueSize?: number;
}

export interface SubscribeResult {
  unsubscribe(): void;
  stats(): ObserverStats;
}

export interface ObserverStats {
  delivered: number;
  dropped: number;
}

interface ObserverState {
  id: string;
  queue: ExecStreamFrame[];
  maxQueueSize: number;
  delivered: number;
  dropped: number;
  flushing: boolean;
  callback: (frame: ExecStreamFrame) => void;
}

interface ExecHandle {
  id: string;
  correlationId: string;
  createdAt: string;
  frames: ExecStreamFrame[];
  status: 'open' | 'closed';
  observers: Map<string, ObserverState>;
  nextSequence: number;
  decisions: Array<{ sequence: number; decision: StreamFrameGuardDecision }>;
}

export interface RemoteExecHandleServiceOptions {
  maxStoredFrames?: number;
  now?: () => Date;
  guard?: StreamFrameGuard;
}

const DEFAULT_MAX_STORED_FRAMES = 500;
const DEFAULT_MAX_QUEUE_SIZE = 32;

export class RemoteExecHandleService {
  private readonly handles = new Map<string, ExecHandle>();
  private readonly maxStoredFrames: number;
  private readonly now: () => Date;
  private guard?: StreamFrameGuard;

  constructor(options: RemoteExecHandleServiceOptions = {}) {
    this.maxStoredFrames = options.maxStoredFrames ?? DEFAULT_MAX_STORED_FRAMES;
    this.now = options.now ?? (() => new Date());
    this.guard = options.guard;
  }

  setGuard(guard: StreamFrameGuard | undefined): void {
    this.guard = guard;
  }

  issueHandle(correlationId: string): ExecHandleDescriptor {
    const id = randomUUID();
    const createdAt = this.now().toISOString();
    const handle: ExecHandle = {
      id,
      correlationId,
      createdAt,
      frames: [],
      status: 'open',
      observers: new Map(),
      nextSequence: 1,
      decisions: []
    };
    this.handles.set(id, handle);
    return this.describeHandle(handle);
  }

  async append(handleId: string, event: ExecEvent): Promise<void> {
    const handle = this.getHandle(handleId);
    if (handle.status === 'closed') {
      return;
    }
    const frame: ExecStreamFrame = {
      sequence: handle.nextSequence,
      event,
      timestamp: event.timestamp
    };

    handle.nextSequence += 1;

    const processed = this.guard
      ? await this.guard.process(frame, { handleId })
      : { frame, decision: { action: 'allow' as const } };
    handle.decisions.push({ sequence: frame.sequence, decision: processed.decision });

    if (!processed.frame) {
      return;
    }

    handle.frames.push(processed.frame);
    if (handle.frames.length > this.maxStoredFrames) {
      handle.frames.splice(0, handle.frames.length - this.maxStoredFrames);
    }

    this.notifyObservers(handle, processed.frame);
  }

  close(handleId: string): void {
    const handle = this.getHandle(handleId);
    handle.status = 'closed';
  }

  subscribe(
    handleId: string,
    observerId: string,
    options: SubscribeOptions,
    onFrame: (frame: ExecStreamFrame) => void
  ): SubscribeResult {
    const handle = this.getHandle(handleId);
    const state: ObserverState = {
      id: observerId,
      queue: [],
      maxQueueSize: Math.max(1, options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE),
      delivered: 0,
      dropped: 0,
      flushing: false,
      callback: onFrame
    };

    handle.observers.set(observerId, state);

    // Replay frames from requested sequence.
    const fromSequence = options.fromSequence ?? 1;
    const replay = handle.frames.filter((frame) => frame.sequence >= fromSequence);
    for (const frame of replay) {
      this.enqueueFrame(state, frame);
    }

    const unsubscribe = () => {
      handle.observers.delete(observerId);
    };

    return {
      unsubscribe,
      stats: () => ({ delivered: state.delivered, dropped: state.dropped })
    };
  }

  getSnapshot(handleId: string, fromSequence = 1): ExecStreamFrame[] {
    const handle = this.getHandle(handleId);
    return handle.frames.filter((frame) => frame.sequence >= fromSequence);
  }

  getDescriptor(handleId: string): ExecHandleDescriptor {
    const handle = this.getHandle(handleId);
    return this.describeHandle(handle);
  }

  getDecisions(handleId: string): Array<{ sequence: number; decision: StreamFrameGuardDecision }> {
    const handle = this.getHandle(handleId);
    return [...handle.decisions];
  }

  private getHandle(handleId: string): ExecHandle {
    const handle = this.handles.get(handleId);
    if (!handle) {
      throw new Error(`Exec handle ${handleId} not found.`);
    }
    return handle;
  }

  private enqueueFrame(observer: ObserverState, frame: ExecStreamFrame): void {
    if (observer.queue.length >= observer.maxQueueSize) {
      observer.queue.shift();
      observer.dropped += 1;
    }
    observer.queue.push(frame);
    this.flush(observer);
  }

  private notifyObservers(handle: ExecHandle, frame: ExecStreamFrame): void {
    for (const observer of handle.observers.values()) {
      this.enqueueFrame(observer, frame);
    }
  }

  private flush(observer: ObserverState): void {
    if (observer.flushing) {
      return;
    }
    observer.flushing = true;
    queueMicrotask(() => {
      observer.flushing = false;
      while (observer.queue.length > 0) {
        const frame = observer.queue.shift();
        if (!frame) {
          continue;
        }
        observer.delivered += 1;
        observer.callback(frame);
      }
    });
  }

  private describeHandle(handle: ExecHandle): ExecHandleDescriptor {
    return {
      id: handle.id,
      correlationId: handle.correlationId,
      createdAt: handle.createdAt,
      frameCount: handle.frames.length,
      status: handle.status,
      latestSequence: handle.nextSequence - 1
    };
  }
}
