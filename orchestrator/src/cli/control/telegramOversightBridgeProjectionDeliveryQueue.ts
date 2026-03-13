import type {
  ControlTelegramProjectionNotificationResult
} from './controlTelegramProjectionNotificationController.js';
import type {
  TelegramOversightPushState,
  TelegramOversightStatePatch
} from './controlTelegramPushState.js';

interface ProjectionDeltaInput {
  eventSeq?: number | null;
  source?: string | null;
}

export interface TelegramOversightBridgeProjectionDeliveryQueue {
  notifyProjectionDelta(input?: ProjectionDeltaInput): Promise<void>;
  flushNotifications(): Promise<void>;
}

export function createTelegramOversightBridgeProjectionDeliveryQueue(input: {
  pushEnabled: boolean;
  isClosed: () => boolean;
  readPushState: () => TelegramOversightPushState;
  notifyProjectionDelta: (
    request: {
      pushState: TelegramOversightPushState;
      eventSeq?: number | null;
    }
  ) => Promise<ControlTelegramProjectionNotificationResult>;
  applyStatePatchAndSave: (statePatch: TelegramOversightStatePatch) => Promise<void>;
  logDeliveryFailure: (error: unknown) => void;
}): TelegramOversightBridgeProjectionDeliveryQueue {
  let notificationQueue: Promise<void> = Promise.resolve();

  return {
    async notifyProjectionDelta(request: ProjectionDeltaInput = {}): Promise<void> {
      if (!input.pushEnabled || input.isClosed()) {
        return;
      }

      notificationQueue = notificationQueue
        .then(async () => {
          const result = await input.notifyProjectionDelta({
            pushState: input.readPushState(),
            eventSeq: request.eventSeq
          });
          await input.applyStatePatchAndSave(result.statePatch);
        })
        .catch((error) => {
          input.logDeliveryFailure(error);
        });
      await notificationQueue;
    },

    async flushNotifications(): Promise<void> {
      await notificationQueue;
    }
  };
}
