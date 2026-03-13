import type { RunPaths } from '../run/runPaths.js';
import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import {
  createControlServerBootstrapLifecycle,
  type ControlServerBootstrapLifecycle
} from './controlServerBootstrapLifecycle.js';
import { createControlOversightFacade } from './controlOversightFacade.js';
import { createControlTelegramBridgeLifecycle } from './controlTelegramBridgeLifecycle.js';
import type { ControlRequestContext, ControlRequestSharedContext } from './controlRequestContext.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';

export interface ControlTelegramBridgeBootstrapLifecycleContext {
  paths: Pick<RunPaths, 'runDir' | 'controlAuthPath' | 'controlEndpointPath'>;
  persistControl: () => Promise<void>;
  startExpiryLifecycle: () => Promise<void> | void;
  requestContextShared: ControlRequestSharedContext;
  getExpiryLifecycle(): ControlExpiryLifecycle | null;
  emitDispatchPilotAuditEvents(
    context: ControlRequestContext,
    input: {
      surface: 'telegram_dispatch';
      evaluation: DispatchPilotEvaluation;
      issueIdentifier: string | null;
    }
  ): Promise<void>;
}

export function createControlTelegramBridgeBootstrapLifecycle(
  context: ControlTelegramBridgeBootstrapLifecycleContext
): ControlServerBootstrapLifecycle {
  const telegramBridgeLifecycle = createControlTelegramBridgeLifecycle({
    runDir: context.paths.runDir,
    createOversightFacade: () =>
      createControlOversightFacade({
        ...context.requestContextShared,
        expiryLifecycle: context.getExpiryLifecycle(),
        emitDispatchPilotAuditEvents: context.emitDispatchPilotAuditEvents
      })
  });
  return createControlServerBootstrapLifecycle({
    paths: {
      controlAuthPath: context.paths.controlAuthPath,
      controlEndpointPath: context.paths.controlEndpointPath
    },
    persistControl: context.persistControl,
    startExpiryLifecycle: context.startExpiryLifecycle,
    telegramBridgeLifecycle
  });
}
