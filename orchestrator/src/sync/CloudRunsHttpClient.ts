import type { CredentialBroker } from '../credentials/CredentialBroker.js';
import type { CloudRunsClient, UploadPayload, UploadResult } from './CloudRunsClient.js';

export class CloudRunsHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'CloudRunsHttpError';
  }
}

export interface CloudRunsHttpClientOptions {
  broker: CredentialBroker;
  baseUrl?: string;
  workspaceId?: string;
  bucket?: string;
  vaultPath?: string;
  scope?: string;
  fetchImpl?: typeof fetch;
}

interface RunsResponseBody {
  id?: string;
  runId?: string;
}

export class CloudRunsHttpClient implements CloudRunsClient {
  private readonly broker: CredentialBroker;
  private readonly baseUrl: string;
  private readonly workspaceId: string;
  private readonly bucket?: string;
  private readonly vaultPath?: string;
  private readonly scope: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CloudRunsHttpClientOptions) {
    this.broker = options.broker;
    this.baseUrl = options.baseUrl ?? process.env.CODEX_CLOUD_BASE_URL ?? 'https://api.codex.cloud';
    this.workspaceId = options.workspaceId ?? process.env.CODEX_CLOUD_WORKSPACE_ID ?? '';
    this.bucket = options.bucket ?? process.env.CLOUD_SYNC_BUCKET ?? undefined;
    this.vaultPath = options.vaultPath ?? process.env.CLOUD_SYNC_VAULT_PATH ?? undefined;
    this.scope = options.scope ?? 'runs:write';
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;

    if (!this.workspaceId) {
      throw new Error('CloudRunsHttpClient requires a workspace id (set CODEX_CLOUD_WORKSPACE_ID)');
    }
    if (!this.fetchImpl) {
      throw new Error('CloudRunsHttpClient requires a fetch implementation');
    }
  }

  async uploadManifest(payload: UploadPayload): Promise<UploadResult> {
    const token = await this.fetchToken();

    const response = await this.fetchImpl(
      `${this.baseUrl}/workspaces/${this.workspaceId}/runs/import`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          'x-idempotency-key': payload.idempotencyKey
        },
        body: JSON.stringify({
          summary: payload.summary,
          manifest: payload.manifest,
          bucket: this.bucket,
          idempotencyKey: payload.idempotencyKey
        })
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new CloudRunsHttpError(
        `CloudRuns upload failed with status ${response.status}`,
        response.status,
        response.statusText,
        text
      );
    }

    let remoteId: string | undefined;
    try {
      const data = (await response.json()) as RunsResponseBody;
      remoteId = data.id ?? data.runId;
    } catch (error) {
      // Ignore JSON parse errors; remote id stays undefined.
      remoteId = undefined;
    }

    return {
      status: 'success',
      runId: payload.summary.runId,
      remoteId
    };
  }

  private async fetchToken(): Promise<string> {
    const { token } = await this.broker.getToken({
      service: 'codex-cloud',
      scope: this.scope,
      vaultPath: this.vaultPath
    });
    if (!token) {
      throw new Error('Credential broker returned an empty token for codex-cloud');
    }
    return token;
  }
}
