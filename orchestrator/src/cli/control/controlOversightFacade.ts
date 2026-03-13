import {
  createControlOversightReadService,
  type ControlOversightReadServiceContext
} from './controlOversightReadService.js';
import type { ControlOversightReadContract } from './controlOversightReadContract.js';
import type { ControlOversightUpdateContract } from './controlOversightUpdateContract.js';

export type ControlOversightFacade =
  ControlOversightReadContract &
  ControlOversightUpdateContract;

export function createControlOversightFacade(
  context: ControlOversightReadServiceContext
): ControlOversightFacade {
  const readService = createControlOversightReadService(context);
  return {
    ...readService,
    subscribe: (listener) => context.runtime.subscribe(listener)
  };
}
