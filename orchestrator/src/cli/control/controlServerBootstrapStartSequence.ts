import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import { persistControlBootstrapMetadata } from './controlBootstrapMetadataPersistence.js';
import type { ControlTelegramBridgeLifecycle } from './controlTelegramBridgeLifecycle.js';

interface ControlServerBootstrapStartSequenceContext {
  paths: Pick<RunPaths, 'controlAuthPath' | 'controlEndpointPath'>;
  persistControl: () => Promise<void>;
  startExpiryLifecycle: () => Promise<void> | void;
  telegramBridgeLifecycle: ControlTelegramBridgeLifecycle | null;
}

interface ControlServerBootstrapStartSequenceInput {
  baseUrl: string;
  controlToken: string;
}

export async function runControlServerBootstrapStartSequence(
  context: ControlServerBootstrapStartSequenceContext,
  input: ControlServerBootstrapStartSequenceInput
): Promise<void> {
  await persistControlBootstrapMetadata(
    {
      paths: context.paths,
      persistControl: context.persistControl
    },
    {
      baseUrl: input.baseUrl,
      controlToken: input.controlToken
    }
  );
  await context.startExpiryLifecycle();
  try {
    await context.telegramBridgeLifecycle?.start({
      baseUrl: input.baseUrl,
      controlToken: input.controlToken
    });
  } catch (error) {
    logger.warn(`Failed to start Telegram oversight bridge: ${(error as Error)?.message ?? String(error)}`);
  }
}
