import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export interface ExecSessionHandle {
  dispose(): Promise<void> | void;
}

export type EnvSnapshot = Record<string, string>;

export interface ExecSessionCreateContext {
  id: string;
  env: EnvSnapshot;
  persisted: boolean;
  createdAt: string;
}

export type ExecSessionFactory<THandle extends ExecSessionHandle> = (
  context: ExecSessionCreateContext
) => Promise<THandle>;

export interface ExecSessionManagerOptions<THandle extends ExecSessionHandle> {
  factory: ExecSessionFactory<THandle>;
  baseEnv?: NodeJS.ProcessEnv;
  now?: () => Date;
  idGenerator?: () => string;
}

export interface ExecSessionAcquireOptions {
  /**
   * Session identifier used for reuse. If omitted, a new ephemeral session is created.
   */
  id?: string;
  /**
   * Whether to reuse an existing session when available. Defaults to true when an id is provided.
   */
  reuse?: boolean;
  /**
   * Whether the newly created session should be persisted for reuse. Defaults to true when an id is provided.
   */
  persist?: boolean;
  /**
   * Environment overrides applied on top of the manager's base snapshot.
   */
  env?: NodeJS.ProcessEnv;
}

export interface ExecSessionLease<THandle extends ExecSessionHandle> {
  id: string;
  handle: THandle;
  envSnapshot: EnvSnapshot;
  createdAt: string;
  lastUsedAt: string;
  persisted: boolean;
  reused: boolean;
  release(): Promise<void>;
}

export type ExecSessionManagerEventType = 'session:created' | 'session:disposed';

export interface ExecSessionLifecycleEvent<THandle extends ExecSessionHandle> {
  type: ExecSessionManagerEventType;
  session: {
    id: string;
    envSnapshot: EnvSnapshot;
    createdAt: string;
    lastUsedAt: string;
    persisted: boolean;
    handle: THandle;
  };
}

interface ManagedSession<THandle extends ExecSessionHandle> {
  id: string;
  handle: THandle;
  envSnapshot: EnvSnapshot;
  createdAt: string;
  lastUsedAt: string;
  persisted: boolean;
}

/**
 * Manages reusable exec sessions (e.g. PTY handles) keyed by identifier while
 * providing lifecycle hooks and environment snapshots for observability.
 */
export class ExecSessionManager<THandle extends ExecSessionHandle> {
  private readonly sessions = new Map<string, ManagedSession<THandle>>();
  private readonly emitter = new EventEmitter({ captureRejections: false });
  private readonly factory: ExecSessionFactory<THandle>;
  private readonly baseEnv: NodeJS.ProcessEnv;
  private readonly now: () => Date;
  private readonly idGenerator: () => string;

  constructor(options: ExecSessionManagerOptions<THandle>) {
    this.factory = options.factory;
    this.baseEnv = options.baseEnv ? { ...options.baseEnv } : { ...process.env };
    this.now = options.now ?? (() => new Date());
    this.idGenerator = options.idGenerator ?? (() => randomUUID());
  }

  async acquire(options: ExecSessionAcquireOptions = {}): Promise<ExecSessionLease<THandle>> {
    const id = options.id ?? this.idGenerator();
    const reuse = options.reuse ?? Boolean(options.id);
    const persisted = options.persist ?? Boolean(options.id);
    const envSnapshot = this.snapshotEnv(options.env);

    if (persisted && reuse) {
      const existing = this.sessions.get(id);
      if (existing) {
        existing.lastUsedAt = this.now().toISOString();
        if (options.env !== undefined) {
          existing.envSnapshot = envSnapshot;
        }
        return this.createLease(existing, true, persisted);
      }
    }

    if (!reuse && persisted) {
      await this.dispose(id);
    }

    const managed = await this.createSession(id, envSnapshot, persisted);
    if (persisted) {
      this.sessions.set(id, managed);
    }
    return this.createLease(managed, false, persisted);
  }

  async dispose(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }
    this.sessions.delete(id);
    await this.teardown(session);
  }

  async disposeAll(): Promise<void> {
    const disposals = Array.from(this.sessions.values()).map((session) => this.teardown(session));
    this.sessions.clear();
    await Promise.all(disposals);
  }

  getSnapshot(id: string): EnvSnapshot | undefined {
    const session = this.sessions.get(id);
    return session ? { ...session.envSnapshot } : undefined;
  }

  on(event: ExecSessionManagerEventType, listener: (event: ExecSessionLifecycleEvent<THandle>) => void): () => void {
    this.emitter.on(event, listener);
    return () => {
      this.emitter.off(event, listener);
    };
  }

  private async createSession(
    id: string,
    envSnapshot: EnvSnapshot,
    persisted: boolean
  ): Promise<ManagedSession<THandle>> {
    const createdAt = this.now().toISOString();
    const handle = await this.factory({
      id,
      env: envSnapshot,
      persisted,
      createdAt
    });
    const managed: ManagedSession<THandle> = {
      id,
      handle,
      envSnapshot,
      createdAt,
      lastUsedAt: createdAt,
      persisted
    };
    this.emit('session:created', managed);
    return managed;
  }

  private createLease(
    session: ManagedSession<THandle>,
    reused: boolean,
    persisted: boolean
  ): ExecSessionLease<THandle> {
    return {
      id: session.id,
      handle: session.handle,
      envSnapshot: { ...session.envSnapshot },
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      persisted,
      reused,
      release: async () => {
        if (!persisted) {
          await this.teardown(session);
        } else {
          session.lastUsedAt = this.now().toISOString();
        }
      }
    };
  }

  private async teardown(session: ManagedSession<THandle>): Promise<void> {
    try {
      await session.handle.dispose();
    } finally {
      session.lastUsedAt = this.now().toISOString();
      this.emit('session:disposed', session);
    }
  }

  private emit(event: ExecSessionManagerEventType, session: ManagedSession<THandle>): void {
    const payload: ExecSessionLifecycleEvent<THandle> = {
      type: event,
      session: {
        id: session.id,
        envSnapshot: { ...session.envSnapshot },
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        persisted: session.persisted,
        handle: session.handle
      }
    };
    this.emitter.emit(event, payload);
  }

  private snapshotEnv(overrides?: NodeJS.ProcessEnv): EnvSnapshot {
    const snapshot: EnvSnapshot = {};
    for (const [key, value] of Object.entries(this.baseEnv)) {
      if (typeof value === 'string') {
        snapshot[key] = value;
      }
    }
    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined) {
          delete snapshot[key];
        } else {
          snapshot[key] = value;
        }
      }
    }
    return snapshot;
  }
}
