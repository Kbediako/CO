import { chmod } from 'node:fs/promises';

import type { RunPaths } from '../run/runPaths.js';
import { writeJsonAtomic } from '../utils/fs.js';
import { isoTimestamp } from '../utils/time.js';

export interface ControlBootstrapMetadataPersistenceContext {
  paths: Pick<RunPaths, 'controlAuthPath' | 'controlEndpointPath'>;
  persistControl: () => Promise<void>;
}

export async function persistControlBootstrapMetadata(
  context: ControlBootstrapMetadataPersistenceContext,
  input: {
    baseUrl: string;
    controlToken: string;
  }
): Promise<void> {
  await writeJsonAtomic(context.paths.controlAuthPath, {
    token: input.controlToken,
    created_at: isoTimestamp()
  });
  await chmod(context.paths.controlAuthPath, 0o600).catch(() => undefined);
  await writeJsonAtomic(context.paths.controlEndpointPath, {
    base_url: input.baseUrl,
    token_path: context.paths.controlAuthPath
  });
  await chmod(context.paths.controlEndpointPath, 0o600).catch(() => undefined);
  await context.persistControl();
}
