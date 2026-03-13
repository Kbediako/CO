import type { ControlSelectedRunRuntimeSnapshot } from './observabilityReadModel.js';
import type { ObservabilityUpdateListener } from './observabilityUpdateNotifier.js';
import {
  createControlOversightReadService,
  type ControlOversightReadServiceContext
} from './controlOversightReadService.js';
import type { ControlDispatchPayload, QuestionsPayload } from './telegramOversightBridge.js';

export interface ControlOversightFacade {
  readSelectedRun(): Promise<ControlSelectedRunRuntimeSnapshot>;
  readDispatch(): Promise<ControlDispatchPayload>;
  readQuestions(): Promise<QuestionsPayload>;
  subscribe(listener: ObservabilityUpdateListener): () => void;
}

export function createControlOversightFacade(
  context: ControlOversightReadServiceContext
): ControlOversightFacade {
  const readService = createControlOversightReadService(context);
  return {
    ...readService,
    subscribe: (listener) => context.runtime.subscribe(listener)
  };
}
