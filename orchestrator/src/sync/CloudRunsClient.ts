import type { RunSummary } from '../types.js';

export interface UploadResult {
  status: 'success';
  runId: string;
  remoteId?: string;
}

export interface UploadPayload {
  summary: RunSummary;
  manifest: Record<string, unknown>;
  idempotencyKey: string;
}

/**
 * Minimal client surface expected by the cloud-sync worker to mirror run manifests
 * into Codex Cloud. Concrete implementations handle authentication via the
 * credential broker.
 */
export interface CloudRunsClient {
  uploadManifest(payload: UploadPayload): Promise<UploadResult>;
}
