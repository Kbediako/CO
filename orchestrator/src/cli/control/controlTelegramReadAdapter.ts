import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import { readControlTelegramDispatch } from './controlTelegramDispatchRead.js';
import { readControlTelegramQuestions } from './controlTelegramQuestionRead.js';
import type {
  ControlDispatchPayload,
  QuestionsPayload,
  TelegramOversightReadAdapter
} from './telegramOversightBridge.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';
import type { ControlRequestContext, ControlRequestSharedContext } from './controlRequestContext.js';

export interface ControlTelegramReadAdapterContext extends ControlRequestSharedContext {
  expiryLifecycle: ControlExpiryLifecycle | null;
  emitDispatchPilotAuditEvents(
    context: ControlRequestContext,
    input: {
      surface: 'telegram_dispatch';
      evaluation: DispatchPilotEvaluation;
      issueIdentifier: string | null;
    }
  ): Promise<void>;
}

export function createControlTelegramReadAdapter(
  context: ControlTelegramReadAdapterContext
): TelegramOversightReadAdapter {
  return {
    readSelectedRun: async () => context.runtime.snapshot().readSelectedRunSnapshot(),

    readDispatch: async (): Promise<ControlDispatchPayload> =>
      readControlTelegramDispatch({
        ...context,
        expiryLifecycle: context.expiryLifecycle,
        emitDispatchPilotAuditEvents: context.emitDispatchPilotAuditEvents
      }),

    readQuestions: async (): Promise<QuestionsPayload> =>
      readControlTelegramQuestions({
        ...context,
        expiryLifecycle: context.expiryLifecycle
      })
  };
}
