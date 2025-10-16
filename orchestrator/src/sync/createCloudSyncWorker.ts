import type { EventBus } from '../events/EventBus.js';
import type { CredentialBroker } from '../credentials/CredentialBroker.js';
import { CloudRunsHttpClient, type CloudRunsHttpClientOptions } from './CloudRunsHttpClient.js';
import { CloudSyncWorker, type CloudSyncWorkerOptions } from './CloudSyncWorker.js';

export interface CreateCloudSyncWorkerParams {
  bus: EventBus;
  broker: CredentialBroker;
  client?: Partial<Omit<CloudRunsHttpClientOptions, 'broker'>>;
  worker?: CloudSyncWorkerOptions;
}

export interface CreateCloudSyncWorkerResult {
  worker: CloudSyncWorker;
  client: CloudRunsHttpClient;
}

/**
 * Convenience factory that wires the CloudRuns HTTP client to the CloudSync worker using
 * the credential broker defined in the architecture spec. Callers can override client or
 * worker options as needed.
 */
export function createCloudSyncWorker(params: CreateCloudSyncWorkerParams): CreateCloudSyncWorkerResult {
  const client = new CloudRunsHttpClient({
    broker: params.broker,
    ...(params.client ?? {})
  });
  const worker = new CloudSyncWorker(params.bus, client, params.worker);
  return { worker, client };
}
