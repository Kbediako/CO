import type { RunPaths } from '../run/runPaths.js';
import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import {
  createControlServerBootstrapLifecycle,
  type ControlServerBootstrapLifecycle
} from './controlServerBootstrapLifecycle.js';
import { createControlTelegramReadAdapter } from './controlTelegramReadAdapter.js';
import type { ControlRequestContext, ControlRequestSharedContext } from './controlRequestContext.js';
import type { ControlRuntime } from './controlRuntime.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';

export interface ControlTelegramBridgeBootstrapLifecycleContext {
  paths: Pick<RunPaths, 'runDir' | 'controlAuthPath' | 'controlEndpointPath'>;
  persistControl: () => Promise<void>;
  startExpiryLifecycle: () => Promise<void> | void;
  controlRuntime: Pick<ControlRuntime, 'subscribe'>;
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
  return createControlServerBootstrapLifecycle({
    paths: context.paths,
    persistControl: context.persistControl,
    startExpiryLifecycle: context.startExpiryLifecycle,
    controlRuntime: context.controlRuntime,
    createTelegramReadAdapter: () =>
      createControlTelegramReadAdapter({
        ...context.requestContextShared,
        expiryLifecycle: context.getExpiryLifecycle(),
        emitDispatchPilotAuditEvents: context.emitDispatchPilotAuditEvents
      })
  });
}
