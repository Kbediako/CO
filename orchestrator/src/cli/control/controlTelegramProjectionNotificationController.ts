import {
  computeTelegramProjectionStateTransition,
  type TelegramOversightBridgeState
} from './controlTelegramPushState.js';
import type { TelegramProjectionDeltaPresentation } from './controlTelegramReadController.js';

export interface ControlTelegramProjectionNotificationController {
  notifyProjectionDelta(input: {
    state: TelegramOversightBridgeState;
    eventSeq?: number | null;
  }): Promise<ControlTelegramProjectionNotificationResult>;
}

export interface ControlTelegramProjectionNotificationResult {
  delivery: 'skip' | 'pending' | 'send';
  nextState: TelegramOversightBridgeState;
}

export function createControlTelegramProjectionNotificationController(input: {
  allowedChatIds: ReadonlySet<string>;
  pushCooldownMs: number;
  renderProjectionDeltaMessage: () => Promise<TelegramProjectionDeltaPresentation>;
  sendMessage: (chatId: string, text: string) => Promise<void>;
  nowMs?: () => number;
}): ControlTelegramProjectionNotificationController {
  return {
    async notifyProjectionDelta({
      state,
      eventSeq
    }: {
      state: TelegramOversightBridgeState;
      eventSeq?: number | null;
    }): Promise<ControlTelegramProjectionNotificationResult> {
      const nowMs = input.nowMs?.() ?? Date.now();
      const projection = await input.renderProjectionDeltaMessage();
      const transition = computeTelegramProjectionStateTransition({
        state,
        projectionHash: projection.projectionHash,
        eventSeq,
        nowMs,
        pushCooldownMs: input.pushCooldownMs
      });

      if (transition.kind !== 'send') {
        return {
          delivery: transition.kind,
          nextState: transition.nextState
        };
      }

      for (const chatId of input.allowedChatIds) {
        await input.sendMessage(chatId, projection.text);
      }

      return {
        delivery: 'send',
        nextState: transition.nextState
      };
    }
  };
}
