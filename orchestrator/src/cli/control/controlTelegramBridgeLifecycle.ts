import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlOversightFacade } from './controlOversightFacade.js';
import {
  startTelegramOversightBridge,
  type TelegramOversightBridge
} from './telegramOversightBridge.js';

interface ControlTelegramBridgeLifecycleOptions {
  runDir: Pick<RunPaths, 'runDir'>['runDir'];
  createOversightFacade: () => ControlOversightFacade;
  startTelegramBridgeImpl?: typeof startTelegramOversightBridge;
}

interface ControlTelegramBridgeLifecycleStartOptions {
  baseUrl: string;
  controlToken: string;
}

export interface ControlTelegramBridgeLifecycle {
  start(options: ControlTelegramBridgeLifecycleStartOptions): Promise<void>;
  close(): Promise<void>;
}

export function createControlTelegramBridgeLifecycle(
  options: ControlTelegramBridgeLifecycleOptions
): ControlTelegramBridgeLifecycle {
  return new ControlTelegramBridgeLifecycleRuntime(options);
}

class ControlTelegramBridgeLifecycleRuntime implements ControlTelegramBridgeLifecycle {
  private readonly runDir: Pick<RunPaths, 'runDir'>['runDir'];
  private readonly createOversightFacade: () => ControlOversightFacade;
  private readonly startTelegramBridgeImpl: typeof startTelegramOversightBridge;

  private telegramBridge: TelegramOversightBridge | null = null;
  private unsubscribeTelegramBridge: (() => void) | null = null;

  constructor(options: ControlTelegramBridgeLifecycleOptions) {
    this.runDir = options.runDir;
    this.createOversightFacade = options.createOversightFacade;
    this.startTelegramBridgeImpl = options.startTelegramBridgeImpl ?? startTelegramOversightBridge;
  }

  async start(options: ControlTelegramBridgeLifecycleStartOptions): Promise<void> {
    const oversightFacade = this.createOversightFacade();
    const bridge = await this.startTelegramBridgeImpl({
      runDir: this.runDir,
      readAdapter: oversightFacade,
      baseUrl: options.baseUrl,
      controlToken: options.controlToken
    });
    if (!bridge) {
      return;
    }
    await this.attachTelegramBridge(bridge, oversightFacade);
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

  private async attachTelegramBridge(
    bridge: TelegramOversightBridge,
    oversightFacade: ControlOversightFacade
  ): Promise<void> {
    try {
      this.unsubscribeTelegramBridge = oversightFacade.subscribe((input) =>
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
