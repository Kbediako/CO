import { readFile } from 'node:fs/promises';

import type { CliManifest } from '../types.js';
import type { RunPaths } from '../run/runPaths.js';
import { isoTimestamp } from '../utils/time.js';
import type { RunEventStream, RunEventStreamEntry } from '../events/runEventStream.js';
import { appendSummary } from '../run/manifest.js';
import { logger } from '../../logger.js';

interface ControlFile {
  control_seq?: number;
  latest_action?: {
    request_id?: string | null;
    requested_by?: string | null;
    requested_at?: string | null;
    action?: 'pause' | 'resume' | 'cancel' | 'fail';
    reason?: string | null;
    confirm_nonce?: unknown;
  } | null;
}

export interface ControlWatcherOptions {
  paths: RunPaths;
  manifest: CliManifest;
  eventStream?: RunEventStream;
  onEntry?: (entry: RunEventStreamEntry) => void;
  persist: () => Promise<void>;
  now?: () => string;
  pollIntervalMs?: number;
}

export class ControlWatcher {
  private readonly paths: RunPaths;
  private readonly manifest: CliManifest;
  private readonly persist: () => Promise<void>;
  private readonly eventStream?: RunEventStream;
  private readonly onEntry?: (entry: RunEventStreamEntry) => void;
  private readonly now: () => string;
  private readonly pollIntervalMs: number;
  private lastControlSeq = 0;
  private paused = false;
  private lastPauseRequestId: string | null = null;
  private lastPauseReason: string | null = null;
  private cancelRequested = false;
  private failureRequested = false;

  constructor(options: ControlWatcherOptions) {
    this.paths = options.paths;
    this.manifest = options.manifest;
    this.persist = options.persist;
    this.eventStream = options.eventStream;
    this.onEntry = options.onEntry;
    this.now = options.now ?? isoTimestamp;
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
  }

  isCanceled(): boolean {
    return this.cancelRequested;
  }

  isFailed(): boolean {
    return this.failureRequested;
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
    const latest = snapshot.latest_action;
    if (latest && typeof latest === 'object' && 'confirm_nonce' in latest) {
      await this.safeAppend({
        event: 'security_violation',
        actor: 'runner',
        payload: {
          kind: 'confirm_nonce_present',
          summary: 'confirm_nonce present in control action',
          severity: 'high',
          related_request_id: latest.request_id ?? null,
          details_redacted: true
        },
        timestamp: this.now()
      });
      return;
    }

    const action = latest?.action;
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
      return;
    }
    if (action === 'fail') {
      await this.handleFail(snapshot);
    }
  }

  async waitForResume(): Promise<void> {
    if (!this.paused) {
      return;
    }
    while (this.paused && !this.cancelRequested && !this.failureRequested) {
      await delay(this.pollIntervalMs);
      await this.sync();
    }
  }

  private async handlePause(snapshot: ControlFile): Promise<void> {
    const nextRequestId = snapshot.latest_action?.request_id ?? null;
    const nextReason = snapshot.latest_action?.reason ?? null;
    if (this.paused && nextRequestId === this.lastPauseRequestId && nextReason === this.lastPauseReason) {
      return;
    }
    const wasPaused = this.paused;
    this.paused = true;
    this.lastPauseRequestId = nextRequestId;
    this.lastPauseReason = nextReason;
    const nextDetail = nextReason ?? 'paused';
    if (!wasPaused || this.manifest.status_detail !== nextDetail) {
      this.manifest.status_detail = nextDetail;
      if (!wasPaused) {
        appendSummary(this.manifest, 'Run paused by control request.');
      }
      await this.persist();
    }
    await this.safeAppend({
      event: 'pause_requested',
      actor: snapshot.latest_action?.requested_by ?? 'user',
      payload: {
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_by: snapshot.latest_action?.requested_by ?? null,
        reason: snapshot.latest_action?.reason ?? null
      },
      timestamp: this.now()
    });
    await this.safeAppend({
      event: 'run_paused',
      actor: 'runner',
      payload: {
        reason: 'control_request',
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_reason: snapshot.latest_action?.reason ?? null
      },
      timestamp: this.now()
    });
  }

  private async handleResume(snapshot: ControlFile): Promise<void> {
    if (!this.paused) {
      return;
    }
    this.paused = false;
    this.lastPauseRequestId = null;
    this.lastPauseReason = null;
    this.manifest.status_detail = null;
    appendSummary(this.manifest, 'Run resumed by control request.');
    await this.persist();
    await this.safeAppend({
      event: 'run_resumed',
      actor: 'runner',
      payload: {
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_by: snapshot.latest_action?.requested_by ?? null,
        requested_reason: snapshot.latest_action?.reason ?? null
      },
      timestamp: this.now()
    });
  }

  private async handleCancel(snapshot: ControlFile): Promise<void> {
    if (this.cancelRequested) {
      return;
    }
    this.cancelRequested = true;
    appendSummary(this.manifest, 'Run cancellation requested.');
    await this.persist();
    await this.safeAppend({
      event: 'run_canceled',
      actor: 'runner',
      payload: {
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_by: snapshot.latest_action?.requested_by ?? null,
        requested_reason: snapshot.latest_action?.reason ?? null
      },
      timestamp: this.now()
    });
  }

  private async handleFail(snapshot: ControlFile): Promise<void> {
    if (this.failureRequested) {
      return;
    }
    this.failureRequested = true;
    this.manifest.status_detail = snapshot.latest_action?.reason ?? 'control_failed';
    appendSummary(this.manifest, 'Run failed by control request.');
    await this.persist();
    await this.safeAppend({
      event: 'run_failed',
      actor: 'runner',
      payload: {
        reason: 'control_request',
        request_id: snapshot.latest_action?.request_id ?? null,
        control_seq: snapshot.control_seq ?? null,
        requested_by: snapshot.latest_action?.requested_by ?? null,
        requested_reason: snapshot.latest_action?.reason ?? null
      },
      timestamp: this.now()
    });
  }

  private async safeAppend(
    entry: Parameters<NonNullable<RunEventStream['append']>>[0]
  ): Promise<void> {
    try {
      const appended = await this.eventStream?.append(entry);
      if (appended) {
        this.onEntry?.(appended);
      }
    } catch (error) {
      logger.warn(`[ControlWatcher] Failed to append event: ${(error as Error)?.message ?? String(error)}`);
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
    logger.warn(`[ControlWatcher] Failed to read control file: ${(error as Error)?.message ?? String(error)}`);
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
