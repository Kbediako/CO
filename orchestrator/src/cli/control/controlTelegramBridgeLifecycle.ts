import { logger } from '../../logger.js';
import type { RunPaths } from '../run/runPaths.js';
import type { ControlOversightReadContract } from './controlOversightReadContract.js';
import type { ControlOversightUpdateContract } from './controlOversightUpdateContract.js';
import {
  startTelegramOversightBridge,
  type TelegramOversightBridge
} from './telegramOversightBridge.js';

type ControlTelegramBridgeOversightContract =
  ControlOversightReadContract &
  ControlOversightUpdateContract;

interface ControlTelegramBridgeLifecycleOptions {
  runDir: Pick<RunPaths, 'runDir'>['runDir'];
  createOversightFacade: () => ControlTelegramBridgeOversightContract;
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
  private readonly createOversightFacade: () => ControlTelegramBridgeOversightContract;
  private readonly startTelegramBridgeImpl: typeof startTelegramOversightBridge;

  private telegramBridge: TelegramOversightBridge | null = null;
  private unsubscribeTelegramBridge: (() => void) | null = null;
  private lifecycleOperation: Promise<void> = Promise.resolve();

  constructor(options: ControlTelegramBridgeLifecycleOptions) {
    this.runDir = options.runDir;
    this.createOversightFacade = options.createOversightFacade;
    this.startTelegramBridgeImpl = options.startTelegramBridgeImpl ?? startTelegramOversightBridge;
  }

  async start(options: ControlTelegramBridgeLifecycleStartOptions): Promise<void> {
    await this.enqueueLifecycleOperation(async () => {
      await this.closeActiveBridge();
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
    });
  }

  async close(): Promise<void> {
    await this.enqueueLifecycleOperation(async () => {
      await this.closeActiveBridge();
    });
  }

  private enqueueLifecycleOperation(operation: () => Promise<void>): Promise<void> {
    const nextOperation = this.lifecycleOperation.then(operation, operation);
    this.lifecycleOperation = nextOperation.then(
      () => undefined,
      () => undefined
    );
    return nextOperation;
  }

  private async closeActiveBridge(): Promise<void> {
    this.unsubscribeTelegramBridge?.();
    this.unsubscribeTelegramBridge = null;
    const bridge = this.telegramBridge;
    this.telegramBridge = null;
    if (bridge) {
      await bridge.close().catch((error) => {
        logger.warn(`Failed to close Telegram oversight bridge: ${(error as Error)?.message ?? String(error)}`);
      });
    }
  }

  private async attachTelegramBridge(
    bridge: TelegramOversightBridge,
    oversightFacade: ControlTelegramBridgeOversightContract
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
