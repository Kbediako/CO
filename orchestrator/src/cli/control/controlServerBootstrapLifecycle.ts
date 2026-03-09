import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import { persistControlBootstrapMetadata } from './controlBootstrapMetadataPersistence.js';
import type { ControlTelegramBridgeLifecycle } from './controlTelegramBridgeLifecycle.js';

interface ControlServerBootstrapLifecycleOptions {
  paths: Pick<RunPaths, 'controlAuthPath' | 'controlEndpointPath'>;
  persistControl: () => Promise<void>;
  startExpiryLifecycle?: () => Promise<void> | void;
  telegramBridgeLifecycle?: ControlTelegramBridgeLifecycle | null;
}

interface ControlServerBootstrapLifecycleStartOptions {
  baseUrl: string;
  controlToken: string;
}

export interface ControlServerBootstrapLifecycle {
  start(options: ControlServerBootstrapLifecycleStartOptions): Promise<void>;
  close(): Promise<void>;
}

export function createControlServerBootstrapLifecycle(
  options: ControlServerBootstrapLifecycleOptions
): ControlServerBootstrapLifecycle {
  return new ControlServerBootstrapLifecycleRuntime(options);
}

class ControlServerBootstrapLifecycleRuntime implements ControlServerBootstrapLifecycle {
  private readonly paths: Pick<RunPaths, 'controlAuthPath' | 'controlEndpointPath'>;
  private readonly persistControl: () => Promise<void>;
  private readonly startExpiryLifecycle: () => Promise<void> | void;
  private readonly telegramBridgeLifecycle: ControlTelegramBridgeLifecycle | null;

  constructor(options: ControlServerBootstrapLifecycleOptions) {
    this.paths = options.paths;
    this.persistControl = options.persistControl;
    this.startExpiryLifecycle = options.startExpiryLifecycle ?? (() => undefined);
    this.telegramBridgeLifecycle = options.telegramBridgeLifecycle ?? null;
  }

  async start(options: ControlServerBootstrapLifecycleStartOptions): Promise<void> {
    await persistControlBootstrapMetadata(
      {
        paths: this.paths,
        persistControl: this.persistControl
      },
      {
        baseUrl: options.baseUrl,
        controlToken: options.controlToken
      }
    );
    await this.startExpiryLifecycle();
    try {
      await this.telegramBridgeLifecycle?.start({
        baseUrl: options.baseUrl,
        controlToken: options.controlToken
      });
    } catch (error) {
      logger.warn(`Failed to start Telegram oversight bridge: ${(error as Error)?.message ?? String(error)}`);
    }
  }

  async close(): Promise<void> {
    await this.telegramBridgeLifecycle?.close();
  }
}
