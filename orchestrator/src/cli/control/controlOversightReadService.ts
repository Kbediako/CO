import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import { readControlTelegramDispatch } from './controlTelegramDispatchRead.js';
import { readControlTelegramQuestions } from './controlTelegramQuestionRead.js';
import type {
  ControlOversightReadContract,
  ControlDispatchPayload,
  QuestionsPayload
} from './controlOversightReadContract.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';
import type { ControlRequestContext, ControlRequestSharedContext } from './controlRequestContext.js';

export interface ControlOversightReadServiceContext extends ControlRequestSharedContext {
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

export function createControlOversightReadService(
  context: ControlOversightReadServiceContext
): ControlOversightReadContract {
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
