import {
  computeTelegramProjectionStateTransition,
  type TelegramOversightStatePatch,
  type TelegramOversightPushState
} from './controlTelegramPushState.js';
import type { TelegramProjectionDeltaPresentation } from './controlTelegramReadController.js';

export interface ControlTelegramProjectionNotificationController {
  notifyProjectionDelta(input: {
    pushState: TelegramOversightPushState;
    eventSeq?: number | null;
  }): Promise<ControlTelegramProjectionNotificationResult>;
}

export interface ControlTelegramProjectionNotificationResult {
  delivery: 'skip' | 'pending' | 'send';
  statePatch: TelegramOversightStatePatch;
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
      pushState,
      eventSeq
    }: {
      pushState: TelegramOversightPushState;
      eventSeq?: number | null;
    }): Promise<ControlTelegramProjectionNotificationResult> {
      const nowMs = input.nowMs?.() ?? Date.now();
      const projection = await input.renderProjectionDeltaMessage();
      const transition = computeTelegramProjectionStateTransition({
        pushState,
        projectionHash: projection.projectionHash,
        eventSeq,
        nowMs,
        pushCooldownMs: input.pushCooldownMs
      });

      if (transition.kind !== 'send') {
        return {
          delivery: transition.kind,
          statePatch: transition.statePatch
        };
      }

      for (const chatId of input.allowedChatIds) {
        await input.sendMessage(chatId, projection.text);
      }

      return {
        delivery: 'send',
        statePatch: transition.statePatch
      };
    }
  };
}
