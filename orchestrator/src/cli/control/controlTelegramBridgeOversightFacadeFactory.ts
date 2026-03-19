import {
  createControlOversightFacade,
  type ControlOversightFacade
} from './controlOversightFacade.js';
import type { ControlOversightReadServiceContext } from './controlOversightReadService.js';
import type { ControlRequestSharedContext } from './controlRequestContext.js';

export interface ControlTelegramBridgeOversightFacadeFactoryContext {
  requestContextShared: ControlRequestSharedContext;
  getExpiryLifecycle(): ControlOversightReadServiceContext['expiryLifecycle'];
  emitDispatchPilotAuditEvents: ControlOversightReadServiceContext['emitDispatchPilotAuditEvents'];
}

export function createControlTelegramBridgeOversightFacadeFactory(
  context: ControlTelegramBridgeOversightFacadeFactoryContext
): () => ControlOversightFacade {
  return () =>
    createControlOversightFacade({
      ...context.requestContextShared,
      expiryLifecycle: context.getExpiryLifecycle(),
      emitDispatchPilotAuditEvents: context.emitDispatchPilotAuditEvents
    });
}
