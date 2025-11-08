import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { EventBus } from '../events/EventBus.js';
import type { RunSummary } from '../types.js';
import type { CloudRunsClient, UploadResult } from './CloudRunsClient.js';
import { CloudRunsHttpError } from './CloudRunsHttpClient.js';
import { sanitizeTaskId } from '../persistence/sanitizeTaskId.js';
import { sanitizeRunId } from '../persistence/sanitizeRunId.js';

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
    const safeTaskId = sanitizeTaskId(summary.taskId);
    const safeRunId = sanitizeRunId(summary.runId);
    const runDir = join(this.runsDir, safeTaskId, safeRunId);
    return join(runDir, 'manifest.json');
  }

  private async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    const safeTaskId = sanitizeTaskId(entry.summary.taskId);
    const logDir = join(this.outDir, safeTaskId, 'cloud-sync');
    await mkdir(logDir, { recursive: true });
    const logPath = join(logDir, 'audit.log');
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      taskId: entry.summary.taskId,
      runId: entry.summary.runId,
      level: entry.level,
      message: entry.message,
      details: entry.details
    });
    await appendFile(logPath, `${line}\n`, 'utf-8');
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
    let lastError: unknown;
    let lastContents: string | null = null;
    while (attempt < this.manifestReadRetries) {
      attempt += 1;
      try {
        const contents = await readFile(manifestPath, 'utf-8');
        lastContents = contents;
        return JSON.parse(contents) as Record<string, unknown>;
      } catch (error: unknown) {
        lastError = error;
        if (shouldRetryManifestRead(error) && attempt < this.manifestReadRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        break;
      }
    }
    if (lastContents && lastError instanceof SyntaxError) {
      const repaired = attemptJsonRecovery(lastContents);
      if (repaired) {
        try {
          const parsed = JSON.parse(repaired) as Record<string, unknown>;
          await this.appendAuditLog({
            level: 'info',
            message: 'Recovered manifest from partial JSON',
            summary,
            details: { strategy: 'trim-trailing', attempts: attempt }
          });
          return parsed;
        } catch (parseError) {
          lastError = parseError;
        }
      }
    }
    throw lastError ?? new Error(`Manifest not available after ${this.manifestReadRetries} attempts`);
  }
}

function shouldRetryManifestRead(error: unknown): boolean {
  if (error instanceof SyntaxError) {
    return true;
  }
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === 'ENOENT' || code === 'EBUSY' || code === 'EMFILE';
}

function attemptJsonRecovery(contents: string): string | null {
  const lastBrace = contents.lastIndexOf('}');
  if (lastBrace === -1) {
    return null;
  }
  const candidate = contents.slice(0, lastBrace + 1);
  return candidate.trim().length > 0 ? candidate : null;
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
