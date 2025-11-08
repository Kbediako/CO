import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { EventBus } from '../src/events/EventBus.js';
import { RunManifestWriter } from '../src/persistence/RunManifestWriter.js';
import type { RunSummary } from '../src/types.js';
import { CloudSyncWorker } from '../src/sync/CloudSyncWorker.js';
import type { CloudRunsClient, UploadPayload, UploadResult } from '../src/sync/CloudRunsClient.js';
import { CloudRunsHttpError } from '../src/sync/CloudRunsHttpClient.js';
import { createCloudSyncWorker } from '../src/sync/createCloudSyncWorker.js';
import type { CredentialBroker } from '../src/credentials/CredentialBroker.js';
import { sanitizeTaskId } from '../src/persistence/sanitizeTaskId.js';
import { sanitizeRunId } from '../src/persistence/sanitizeRunId.js';

const createSummary = (): RunSummary => ({
  taskId: '0001',
  runId: 'run-2025-10-16T01-41-05Z',
  mode: 'mcp',
  plan: { items: [], notes: undefined },
  build: { subtaskId: 'sub', artifacts: [], mode: 'mcp', runId: 'run-2025-10-16T01-41-05Z', success: true },
  test: { subtaskId: 'sub', success: true, reports: [], runId: 'run-2025-10-16T01-41-05Z' },
  review: { summary: 'ok', decision: { approved: true } },
  timestamp: new Date().toISOString()
});

const readAuditLog = async (outDir: string, summary: RunSummary): Promise<string> => {
  const taskDir = sanitizeTaskId(summary.taskId);
  return await readFile(join(outDir, taskDir, 'cloud-sync', 'audit.log'), 'utf-8');
};

describe('CloudSyncWorker', () => {
  it('uploads manifest and writes audit log on success', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-sync-worker-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const summary = createSummary();

    const writer = new RunManifestWriter({ runsDir });
    await writer.write(summary);

    const bus = new EventBus();
    const upload = vi.fn<[UploadPayload], Promise<UploadResult>>().mockResolvedValue({
      status: 'success',
      runId: summary.runId,
      remoteId: 'remote-123'
    });
    const client: CloudRunsClient = { uploadManifest: upload };
    const worker = new CloudSyncWorker(bus, client, { runsDir, outDir });

    worker.start();
    bus.emit({ type: 'run:completed', payload: summary });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(upload).toHaveBeenCalledTimes(1);
    const expectedKey = createHash('sha256')
      .update(`${summary.taskId}:${summary.runId}`)
      .digest('hex');
    expect(upload.mock.calls[0][0].idempotencyKey).toBe(expectedKey);

    const audit = await readAuditLog(outDir, summary);
    expect(audit).toContain('Cloud sync completed');
  });

  it('waits for manifest to appear before syncing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-sync-wait-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const summary = createSummary();

    const bus = new EventBus();
    const upload = vi.fn<[UploadPayload], Promise<UploadResult>>().mockResolvedValue({
      status: 'success',
      runId: summary.runId
    });
    const client: CloudRunsClient = { uploadManifest: upload };
    const worker = new CloudSyncWorker(bus, client, {
      runsDir,
      outDir,
      manifestInitialDelayMs: 5,
      manifestReadRetries: 5
    });

    worker.start();
    bus.emit({ type: 'run:completed', payload: summary });

    const writer = new RunManifestWriter({ runsDir });
    setTimeout(() => {
      void writer.write(summary);
    }, 10);

    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(upload).toHaveBeenCalledTimes(1);
    const audit = await readAuditLog(outDir, summary);
    expect(audit).toContain('Cloud sync completed');
  });

  it('retries reading manifest after transient parse errors and logs success', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-sync-parse-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const summary = createSummary();

    const runDir = join(runsDir, summary.taskId, sanitizeRunId(summary.runId));
    await mkdir(runDir, { recursive: true });
    const manifestPath = join(runDir, 'manifest.json');

    const partialStream = createWriteStream(manifestPath, { encoding: 'utf-8' });
    partialStream.write('{"taskId":');
    partialStream.end();
    await new Promise<void>((resolve, reject) => {
      partialStream.once('close', resolve);
      partialStream.once('error', reject);
    });

    const bus = new EventBus();
    const upload = vi.fn<[UploadPayload], Promise<UploadResult>>().mockResolvedValue({
      status: 'success',
      runId: summary.runId
    });
    const client: CloudRunsClient = { uploadManifest: upload };
    const worker = new CloudSyncWorker(bus, client, {
      runsDir,
      outDir,
      manifestInitialDelayMs: 5,
      manifestReadRetries: 6
    });

    worker.start();
    bus.emit({ type: 'run:completed', payload: summary });

    const serialized = JSON.stringify(summary, null, 2);
    const finalizeManifest = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        writeFile(manifestPath, serialized, 'utf-8').then(() => resolve()).catch(reject);
      }, 15);
    });

    await finalizeManifest;
    await new Promise((resolve) => setTimeout(resolve, 80));

    expect(upload).toHaveBeenCalledTimes(1);
    const audit = await readAuditLog(outDir, summary);
    expect(audit).toContain('Cloud sync completed');
  });

  it('retries failures with exponential backoff and logs errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-sync-retry-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const summary = createSummary();
    const writer = new RunManifestWriter({ runsDir });
    await writer.write(summary);

    const bus = new EventBus();
    const upload = vi
      .fn<[UploadPayload], Promise<UploadResult>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockRejectedValueOnce(new Error('still failing'))
      .mockResolvedValue({ status: 'success', runId: summary.runId });
    const client: CloudRunsClient = { uploadManifest: upload };
    const worker = new CloudSyncWorker(bus, client, {
      runsDir,
      outDir,
      backoffMs: 5,
      maxRetries: 3
    });

    worker.start();
    bus.emit({ type: 'run:completed', payload: summary });

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(upload).toHaveBeenCalledTimes(3);
    const audit = await readAuditLog(outDir, summary);
    expect(audit).toContain('Cloud sync attempt failed');
    expect(audit).toContain('Cloud sync completed');
  });

  it('invokes onError when manifest missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-sync-missing-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const summary = createSummary();

    const bus = new EventBus();
    const upload = vi.fn();
    const onError = vi.fn();
    const worker = new CloudSyncWorker(bus, { uploadManifest: upload }, {
      runsDir,
      outDir,
      onError,
      manifestInitialDelayMs: 5,
      manifestReadRetries: 2
    });

    worker.start();
    bus.emit({ type: 'run:completed', payload: summary });

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(upload).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('does not retry on non-retryable HTTP errors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-sync-noretry-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const summary = createSummary();
    const writer = new RunManifestWriter({ runsDir });
    await writer.write(summary);

    const bus = new EventBus();
    const upload = vi
      .fn<[UploadPayload], Promise<UploadResult>>()
      .mockRejectedValue(new CloudRunsHttpError('bad request', 400, 'Bad Request', ''));
    const onError = vi.fn();
    const worker = new CloudSyncWorker(bus, { uploadManifest: upload }, {
      runsDir,
      outDir,
      onError,
      backoffMs: 5,
      maxRetries: 3
    });

    worker.start();
    bus.emit({ type: 'run:completed', payload: summary });

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(upload).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(CloudRunsHttpError), summary, 1);
    const audit = await readAuditLog(outDir, summary);
    const occurrences = audit.match(/Cloud sync attempt failed/g)?.length ?? 0;
    expect(occurrences).toBe(1);
  });

  it('factory creates worker wired with http client', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cloud-sync-factory-'));
    const runsDir = join(root, 'runs');
    const outDir = join(root, 'out');
    const summary = createSummary();
    const writer = new RunManifestWriter({ runsDir });
    await writer.write(summary);

    const broker: CredentialBroker = {
      getToken: vi.fn().mockResolvedValue({ token: 'factory-token' })
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'remote-factory' }), { status: 201 })
    );

    const bus = new EventBus();
    const { worker } = createCloudSyncWorker({
      bus,
      broker,
      client: { workspaceId: 'factory-workspace', baseUrl: 'https://factory.example.com', fetchImpl },
      worker: { runsDir, outDir }
    });

    worker.start();
    bus.emit({ type: 'run:completed', payload: summary });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const audit = await readAuditLog(outDir, summary);
    expect(audit).toContain('Cloud sync completed');
  });
});
