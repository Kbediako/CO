import type { ControlSelectedRunRuntimeSnapshot } from './observabilityReadModel.js';
import type { ObservabilityUpdateListener } from './observabilityUpdateNotifier.js';
import {
  createControlTelegramReadAdapter,
  type ControlTelegramReadAdapterContext
} from './controlTelegramReadAdapter.js';
import type { ControlDispatchPayload, QuestionsPayload } from './telegramOversightBridge.js';

export interface ControlOversightFacade {
  readSelectedRun(): Promise<ControlSelectedRunRuntimeSnapshot>;
  readDispatch(): Promise<ControlDispatchPayload>;
  readQuestions(): Promise<QuestionsPayload>;
  subscribe(listener: ObservabilityUpdateListener): () => void;
}

export function createControlOversightFacade(
  context: ControlTelegramReadAdapterContext
): ControlOversightFacade {
  const readAdapter = createControlTelegramReadAdapter(context);
  return {
    ...readAdapter,
    subscribe: (listener) => context.runtime.subscribe(listener)
  };
}
