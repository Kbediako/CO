import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { EventBus } from '../events/EventBus.js';
import type { RunSummary } from '../types.js';
import type { CloudRunsClient, UploadResult } from './CloudRunsClient.js';
import { CloudRunsHttpError } from './CloudRunsHttpClient.js';

export interface CloudSyncWorkerOptions {
  runsDir?: string;
  outDir?: string;
  enabled?: boolean;
  maxRetries?: number;
  backoffMs?: number;
  onError?: (error: unknown, summary: RunSummary, attempt: number) => void;
  onSuccess?: (result: UploadResult, summary: RunSummary) => void;
  retryDecider?: (error: unknown) => boolean;
  manifestReadRetries?: number;
  manifestInitialDelayMs?: number;
}

export class CloudSyncWorker {
  private readonly runsDir: string;
  private readonly outDir: string;
  private readonly enabled: boolean;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private unsubscribe?: () => void;
  private readonly manifestReadRetries: number;
  private readonly manifestInitialDelayMs: number;

  constructor(
    private readonly bus: EventBus,
    private readonly client: CloudRunsClient,
    private readonly options: CloudSyncWorkerOptions = {}
  ) {
    this.runsDir = options.runsDir ?? join(process.cwd(), '.runs');
    this.outDir = options.outDir ?? join(process.cwd(), 'out');
    this.enabled = options.enabled ?? true;
    this.maxRetries = options.maxRetries ?? 3;
    this.backoffMs = options.backoffMs ?? 250;
    this.manifestReadRetries = options.manifestReadRetries ?? 5;
    this.manifestInitialDelayMs = options.manifestInitialDelayMs ?? 50;
  }

  start(): void {
    if (!this.enabled || this.unsubscribe) {
      return;
    }
    this.unsubscribe = this.bus.on('run:completed', (event) => {
      void this.handleRunCompleted(event.payload);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  async handleRunCompleted(summary: RunSummary): Promise<void> {
    if (!this.enabled) {
      return;
    }

    let manifest: Record<string, unknown>;
    try {
      manifest = await this.readManifestWithRetry(summary);
    } catch (error: unknown) {
      this.options.onError?.(error, summary, 0);
      await this.appendAuditLog({
        level: 'error',
        message: 'Failed to read manifest before sync',
        summary,
        details: serializeError(error)
      });
      return;
    }

    const idempotencyKey = createHash('sha256')
      .update(`${summary.taskId}:${summary.runId}`)
      .digest('hex');

    let attempt = 0;
    let delay = this.backoffMs;
    while (attempt < this.maxRetries) {
      attempt += 1;
      try {
        const result = await this.client.uploadManifest({
          summary,
          manifest,
          idempotencyKey
        });
        this.options.onSuccess?.(result, summary);
        await this.appendAuditLog({
          level: 'info',
          message: 'Cloud sync completed',
          summary,
          details: { remoteId: result.remoteId, attempt }
        });
        return;
      } catch (error: unknown) {
        this.options.onError?.(error, summary, attempt);
        await this.appendAuditLog({
          level: 'error',
          message: 'Cloud sync attempt failed',
          summary,
          details: { attempt, error: serializeError(error) }
        });
        const shouldRetry = this.shouldRetry(error);
        if (attempt >= this.maxRetries || !shouldRetry) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  private buildManifestPath(summary: RunSummary): string {
    const runDir = join(this.runsDir, summary.taskId, summary.runId.replace(/[:]/g, '-'));
    return join(runDir, 'manifest.json');
  }

  private async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    const logDir = this.outDir;
    await mkdir(logDir, { recursive: true });
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      taskId: entry.summary.taskId,
      runId: entry.summary.runId,
      level: entry.level,
      message: entry.message,
      details: entry.details
    });
    await appendFile(join(logDir, 'audit.log'), `${line}\n`, 'utf-8');
  }

  private shouldRetry(error: unknown): boolean {
    if (this.options.retryDecider) {
      return this.options.retryDecider(error);
    }
    if (error instanceof CloudRunsHttpError) {
      if (error.status === 429) {
        return true;
      }
      return error.status >= 500;
    }
    return true;
  }

  private async readManifestWithRetry(summary: RunSummary): Promise<Record<string, unknown>> {
    const manifestPath = this.buildManifestPath(summary);
    let attempt = 0;
    let delay = this.manifestInitialDelayMs;
    while (attempt < this.manifestReadRetries) {
      attempt += 1;
      try {
        const contents = await readFile(manifestPath, 'utf-8');
        return JSON.parse(contents) as Record<string, unknown>;
      } catch (error: unknown) {
        if (isEnoent(error) && attempt < this.manifestReadRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Manifest not available after ${this.manifestReadRetries} attempts`);
  }
}

function isEnoent(error: unknown): boolean {
  return Boolean((error as NodeJS.ErrnoException)?.code === 'ENOENT');
}

interface AuditLogEntry {
  level: 'info' | 'error';
  message: string;
  summary: RunSummary;
  details: unknown;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }
  return { message: String(error) };
}
