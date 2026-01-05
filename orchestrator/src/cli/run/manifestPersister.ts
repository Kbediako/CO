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
    try {
      if (writeManifest) {
        await this.writeManifest(this.paths, this.manifest);
      }
      if (writeHeartbeat) {
        await this.writeHeartbeat(this.paths, this.manifest);
      }
      this.lastPersistAt = this.now();
    } catch (error) {
      this.dirtyManifest = this.dirtyManifest || writeManifest;
      this.dirtyHeartbeat = this.dirtyHeartbeat || writeHeartbeat;
      throw error;
    }
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
