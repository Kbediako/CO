import type { ObservabilityUpdateListener } from './observabilityUpdateNotifier.js';
import {
  createControlOversightReadService,
  type ControlOversightReadServiceContext
} from './controlOversightReadService.js';
import type { ControlOversightReadContract } from './controlOversightReadContract.js';

export interface ControlOversightFacade extends ControlOversightReadContract {
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
