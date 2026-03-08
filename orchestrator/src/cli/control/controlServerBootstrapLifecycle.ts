import { chmod } from 'node:fs/promises';

import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import { writeJsonAtomic } from '../utils/fs.js';
import { isoTimestamp } from '../utils/time.js';
import type { ControlRuntime } from './controlRuntime.js';
import {
  startTelegramOversightBridge,
  type TelegramOversightBridge,
  type TelegramOversightReadAdapter
} from './telegramOversightBridge.js';

interface ControlServerBootstrapLifecycleOptions {
  paths: Pick<RunPaths, 'runDir' | 'controlAuthPath' | 'controlEndpointPath'>;
  persistControl: () => Promise<void>;
  startExpiryLifecycle?: () => Promise<void> | void;
  controlRuntime: Pick<ControlRuntime, 'subscribe'>;
  createTelegramReadAdapter: () => TelegramOversightReadAdapter;
  startTelegramBridgeImpl?: typeof startTelegramOversightBridge;
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
  private readonly paths: Pick<RunPaths, 'runDir' | 'controlAuthPath' | 'controlEndpointPath'>;
  private readonly persistControl: () => Promise<void>;
  private readonly startExpiryLifecycle: () => Promise<void> | void;
  private readonly controlRuntime: Pick<ControlRuntime, 'subscribe'>;
  private readonly createTelegramReadAdapter: () => TelegramOversightReadAdapter;
  private readonly startTelegramBridgeImpl: typeof startTelegramOversightBridge;

  private telegramBridge: TelegramOversightBridge | null = null;
  private unsubscribeTelegramBridge: (() => void) | null = null;

  constructor(options: ControlServerBootstrapLifecycleOptions) {
    this.paths = options.paths;
    this.persistControl = options.persistControl;
    this.startExpiryLifecycle = options.startExpiryLifecycle ?? (() => undefined);
    this.controlRuntime = options.controlRuntime;
    this.createTelegramReadAdapter = options.createTelegramReadAdapter;
    this.startTelegramBridgeImpl = options.startTelegramBridgeImpl ?? startTelegramOversightBridge;
  }

  async start(options: ControlServerBootstrapLifecycleStartOptions): Promise<void> {
    await this.persistBootstrapMetadata(options.baseUrl, options.controlToken);
    await this.startExpiryLifecycle();
    await this.startTelegramBridge(options.baseUrl, options.controlToken);
  }

  async close(): Promise<void> {
    this.unsubscribeTelegramBridge?.();
    this.unsubscribeTelegramBridge = null;
    if (this.telegramBridge) {
      await this.telegramBridge.close().catch((error) => {
        logger.warn(`Failed to close Telegram oversight bridge: ${(error as Error)?.message ?? String(error)}`);
      });
      this.telegramBridge = null;
    }
  }

  private async persistBootstrapMetadata(baseUrl: string, controlToken: string): Promise<void> {
    await writeJsonAtomic(this.paths.controlAuthPath, {
      token: controlToken,
      created_at: isoTimestamp()
    });
    await chmod(this.paths.controlAuthPath, 0o600).catch(() => undefined);
    await writeJsonAtomic(this.paths.controlEndpointPath, {
      base_url: baseUrl,
      token_path: this.paths.controlAuthPath
    });
    await chmod(this.paths.controlEndpointPath, 0o600).catch(() => undefined);
    await this.persistControl();
  }

  private async startTelegramBridge(
    baseUrl: string,
    controlToken: string
  ): Promise<void> {
    try {
      const bridge = await this.startTelegramBridgeImpl({
        runDir: this.paths.runDir,
        readAdapter: this.createTelegramReadAdapter(),
        baseUrl,
        controlToken
      });
      if (!bridge) {
        return;
      }
      await this.attachTelegramBridge(bridge);
    } catch (error) {
      logger.warn(`Failed to start Telegram oversight bridge: ${(error as Error)?.message ?? String(error)}`);
    }
  }

  private async attachTelegramBridge(bridge: TelegramOversightBridge): Promise<void> {
    try {
      this.unsubscribeTelegramBridge = this.controlRuntime.subscribe((input) =>
        bridge.notifyProjectionDelta(input)
      );
      this.telegramBridge = bridge;
    } catch (error) {
      await bridge.close().catch((closeError) => {
        logger.warn(
          `Failed to close Telegram oversight bridge: ${(closeError as Error)?.message ?? String(closeError)}`
        );
      });
      throw error;
    }
  }
}
