import { readFile } from 'node:fs/promises';

import type { CliManifest } from '../types.js';
import type { RunPaths } from '../run/runPaths.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { appendSummary } from '../run/manifest.js';

interface ControlFile {
  control_seq?: number;
  latest_action?: {
    request_id?: string | null;
    requested_by?: string | null;
    requested_at?: string | null;
    action?: 'pause' | 'resume' | 'cancel';
  } | null;
}

export interface ControlWatcherOptions {
  paths: RunPaths;
  manifest: CliManifest;
  eventStream?: RunEventStream;
  onEntry?: (entry: RunEventStreamEntry) => void;
  persist: () => Promise<void>;
  now?: () => string;
}

export class ControlWatcher {
  private readonly paths: RunPaths;
  private readonly manifest: CliManifest;
  private readonly persist: () => Promise<void>;
  private readonly eventStream?: RunEventStream;
  private readonly onEntry?: (entry: RunEventStreamEntry) => void;
  private readonly now: () => string;
  private lastControlSeq = 0;
  private paused = false;
  private cancelRequested = false;

  constructor(options: ControlWatcherOptions) {
    this.paths = options.paths;
    this.manifest = options.manifest;
    this.persist = options.persist;
    this.eventStream = options.eventStream;
    this.onEntry = options.onEntry;
    this.now = options.now ?? isoTimestamp;
  }

  isCanceled(): boolean {
    return this.cancelRequested;
  }

  async sync(): Promise<void> {
    const snapshot = await readControlFile(this.paths.controlPath);
    if (!snapshot) {
      return;
    }
    const controlSeq = snapshot.control_seq ?? 0;
    if (controlSeq <= this.lastControlSeq) {
      return;
    }
    this.lastControlSeq = controlSeq;
    const action = snapshot.latest_action?.action;
    if (!action) {
      return;
    }

    if (action === 'pause') {
      await this.handlePause(snapshot);
      return;
    }
    if (action === 'resume') {
      await this.handleResume(snapshot);
      return;
    }
    if (action === 'cancel') {
      await this.handleCancel(snapshot);
    }
  }

  async waitForResume(): Promise<void> {
    if (!this.paused) {
      return;
    }
    while (this.paused && !this.cancelRequested) {
      await delay(1000);
      await this.sync();
    }
  }

  private async handlePause(snapshot: ControlFile): Promise<void> {
    if (this.paused) {
      return;
    }
    this.paused = true;
    this.manifest.status_detail = 'paused';
    appendSummary(this.manifest, 'Run paused by control request.');
    await this.persist();
    const entry = await this.eventStream?.append({
      event: 'pause_requested',
      actor: snapshot.latest_action?.requested_by ?? 'user',
      payload: {
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_by: snapshot.latest_action?.requested_by ?? null
      },
      timestamp: this.now()
    });
    if (entry) {
      this.onEntry?.(entry);
    }
    const pausedEntry = await this.eventStream?.append({
      event: 'run_paused',
      actor: 'runner',
      payload: {
        reason: 'control_request',
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null
      },
      timestamp: this.now()
    });
    if (pausedEntry) {
      this.onEntry?.(pausedEntry);
    }
  }

  private async handleResume(snapshot: ControlFile): Promise<void> {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.manifest.status_detail = null;
    appendSummary(this.manifest, 'Run resumed by control request.');
    await this.persist();
    const entry = await this.eventStream?.append({
      event: 'run_resumed',
      actor: 'runner',
      payload: {
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_by: snapshot.latest_action?.requested_by ?? null
      },
      timestamp: this.now()
    });
    if (entry) {
      this.onEntry?.(entry);
    }
  }

  private async handleCancel(snapshot: ControlFile): Promise<void> {
    if (this.cancelRequested) {
      return;
    }
    this.cancelRequested = true;
    appendSummary(this.manifest, 'Run cancellation requested.');
    await this.persist();
    const entry = await this.eventStream?.append({
      event: 'run_canceled',
      actor: 'runner',
      payload: {
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_by: snapshot.latest_action?.requested_by ?? null
      },
      timestamp: this.now()
    });
    if (entry) {
      this.onEntry?.(entry);
    }
  }
}

async function readControlFile(pathname: string): Promise<ControlFile | null> {
  try {
    const raw = await readFile(pathname, 'utf8');
    return JSON.parse(raw) as ControlFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
