import { saveManifest, writeHeartbeatFile } from './manifest.js';
import type { CliManifest } from '../types.js';
import type { RunPaths } from './runPaths.js';

export interface ManifestPersisterOptions {
  manifest: CliManifest;
  paths: RunPaths;
  persistIntervalMs: number;
  now?: () => number;
  writeManifest?: (paths: RunPaths, manifest: CliManifest) => Promise<void>;
  writeHeartbeat?: (paths: RunPaths, manifest: CliManifest) => Promise<void>;
}

export interface PersistRequest {
  manifest?: boolean;
  heartbeat?: boolean;
  force?: boolean;
}

export class ManifestPersister {
  private readonly manifest: CliManifest;
  private readonly paths: RunPaths;
  private readonly persistIntervalMs: number;
  private readonly now: () => number;
  private readonly writeManifest: (paths: RunPaths, manifest: CliManifest) => Promise<void>;
  private readonly writeHeartbeat: (paths: RunPaths, manifest: CliManifest) => Promise<void>;

  private dirtyManifest = false;
  private dirtyHeartbeat = false;
  private timer: NodeJS.Timeout | null = null;
  private timerResolver: (() => void) | null = null;
  private lastPersistAt = 0;
  private pendingPersist: Promise<void> = Promise.resolve();

  constructor(options: ManifestPersisterOptions) {
    this.manifest = options.manifest;
    this.paths = options.paths;
    this.persistIntervalMs = options.persistIntervalMs;
    this.now = options.now ?? Date.now;
    this.writeManifest = options.writeManifest ?? saveManifest;
    this.writeHeartbeat = options.writeHeartbeat ?? writeHeartbeatFile;
  }

  schedule(options: PersistRequest = {}): Promise<void> {
    this.pendingPersist = this.pendingPersist.catch(() => undefined);
    const { manifest: includeManifest = false, heartbeat: includeHeartbeat = false, force = false } = options;
    this.dirtyManifest = this.dirtyManifest || includeManifest;
    this.dirtyHeartbeat = this.dirtyHeartbeat || includeHeartbeat;
    if (!this.dirtyManifest && !this.dirtyHeartbeat) {
      return this.pendingPersist;
    }
    if (force) {
      this.clearTimer();
      if (this.timerResolver) {
        const resolver = this.timerResolver;
        this.timerResolver = null;
        resolver();
        return this.pendingPersist;
      }
      this.pendingPersist = this.pendingPersist.then(() => this.flushPersist());
      return this.pendingPersist;
    }
    if (this.timer) {
      return this.pendingPersist;
    }
    const waitMs = Math.max(0, this.lastPersistAt + this.persistIntervalMs - this.now());
    this.pendingPersist = this.pendingPersist
      .then(
        () =>
          new Promise<void>((resolve) => {
            this.timerResolver = resolve;
            this.timer = setTimeout(() => {
              this.clearTimer();
              resolve();
            }, waitMs);
          })
      )
      .then(() => this.flushPersist());
    return this.pendingPersist;
  }

  flush(): Promise<void> {
    return this.schedule({ force: true });
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async flushPersist(): Promise<void> {
    if (!this.dirtyManifest && !this.dirtyHeartbeat) {
      return;
    }
    const writeManifest = this.dirtyManifest;
    const writeHeartbeat = this.dirtyHeartbeat;
    this.dirtyManifest = false;
    this.dirtyHeartbeat = false;

    const tasks: Array<{ kind: 'manifest' | 'heartbeat'; promise: Promise<void> }> = [];
    if (writeManifest) {
      tasks.push({
        kind: 'manifest',
        promise: Promise.resolve().then(() => this.writeManifest(this.paths, this.manifest))
      });
    }
    if (writeHeartbeat) {
      tasks.push({
        kind: 'heartbeat',
        promise: Promise.resolve().then(() => this.writeHeartbeat(this.paths, this.manifest))
      });
    }

    const results = await Promise.allSettled(tasks.map((task) => task.promise));
    let manifestError: unknown = null;
    let heartbeatError: unknown = null;
    let manifestFailed = false;
    let heartbeatFailed = false;

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        if (tasks[index].kind === 'manifest') {
          this.dirtyManifest = true;
          manifestFailed = true;
          manifestError = result.reason;
        } else {
          this.dirtyHeartbeat = true;
          heartbeatFailed = true;
          heartbeatError = result.reason;
        }
      }
    });

    if (manifestFailed || heartbeatFailed) {
      throw manifestFailed ? manifestError : heartbeatError;
    }

    this.lastPersistAt = this.now();
  }
}

export async function persistManifest(
  paths: RunPaths,
  manifest: CliManifest,
  persister?: ManifestPersister,
  options: { force?: boolean } = {}
): Promise<void> {
  if (persister) {
    await persister.schedule({ manifest: true, force: options.force });
    return;
  }
  await saveManifest(paths, manifest);
}
