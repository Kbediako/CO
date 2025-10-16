import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { CredentialBroker } from '../src/credentials/CredentialBroker.js';
import { CloudRunsHttpClient, CloudRunsHttpError } from '../src/sync/CloudRunsHttpClient.js';
import type { UploadPayload } from '../src/sync/CloudRunsClient.js';

const summary = {
  taskId: '0001',
  runId: 'run-123',
  mode: 'mcp' as const,
  plan: { items: [], notes: undefined },
  build: { subtaskId: 'sub', artifacts: [], mode: 'mcp' as const },
  test: { subtaskId: 'sub', success: true, reports: [] },
  review: { summary: 'ok', decision: { approved: true } },
  timestamp: '2025-10-16T02:00:00Z'
};

const manifest = { artifacts: [] };

const defaultPayload: UploadPayload = {
  summary,
  manifest,
  idempotencyKey: 'key-123'
};

describe('CloudRunsHttpClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uploads manifest with credentials and returns remote id', async () => {
    const broker: CredentialBroker = {
      getToken: vi.fn().mockResolvedValue({ token: 'token-abc' })
    };
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'remote-run-1' }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      })
    );

    const client = new CloudRunsHttpClient({
      broker,
      baseUrl: 'https://codex.example.com',
      workspaceId: 'workspace-42',
      bucket: 'audit-bucket',
      vaultPath: 'secret/codex/orchestrator/prod',
      fetchImpl
    });

    const result = await client.uploadManifest(defaultPayload);

    expect(result).toEqual({ status: 'success', runId: summary.runId, remoteId: 'remote-run-1' });
    expect(broker.getToken).toHaveBeenCalledWith({
      service: 'codex-cloud',
      scope: 'runs:write',
      vaultPath: 'secret/codex/orchestrator/prod'
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://codex.example.com/workspaces/workspace-42/runs/import',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer token-abc',
          'x-idempotency-key': 'key-123'
        })
      })
    );
  });

  it('derives configuration from environment variables', async () => {
    process.env.CODEX_CLOUD_WORKSPACE_ID = 'workspace-env';
    process.env.CODEX_CLOUD_BASE_URL = 'https://env.example.com';
    process.env.CLOUD_SYNC_BUCKET = 'env-bucket';
    process.env.CLOUD_SYNC_VAULT_PATH = 'secret/env';

    const broker: CredentialBroker = {
      getToken: vi.fn().mockResolvedValue({ token: 'env-token' })
    };
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));

    const client = new CloudRunsHttpClient({ broker, fetchImpl });
    await client.uploadManifest(defaultPayload);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://env.example.com/workspaces/workspace-env/runs/import',
      expect.any(Object)
    );
    expect(broker.getToken).toHaveBeenCalledWith({
      service: 'codex-cloud',
      scope: 'runs:write',
      vaultPath: 'secret/env'
    });
  });

  it('throws when response is not ok', async () => {
    const broker: CredentialBroker = {
      getToken: vi.fn().mockResolvedValue({ token: 'token-abc' })
    };
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    const client = new CloudRunsHttpClient({ broker, workspaceId: 'workspace-1', fetchImpl });

    const promise = client.uploadManifest(defaultPayload);
    await expect(promise).rejects.toBeInstanceOf(CloudRunsHttpError);
    await expect(promise).rejects.toMatchObject({ status: 500 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws if workspace id missing', () => {
    const broker: CredentialBroker = {
      getToken: vi.fn().mockResolvedValue({ token: 'token' })
    };

    expect(() => new CloudRunsHttpClient({ broker })).toThrow(/workspace id/);
  });

  it('throws if broker returns empty token', async () => {
    const broker: CredentialBroker = {
      getToken: vi.fn().mockResolvedValue({ token: '' })
    };
    const fetchImpl = vi.fn();

    const client = new CloudRunsHttpClient({
      broker,
      workspaceId: 'workspace-1',
      fetchImpl
    });

    await expect(client.uploadManifest(defaultPayload)).rejects.toThrow(/empty token/);
  });
});
