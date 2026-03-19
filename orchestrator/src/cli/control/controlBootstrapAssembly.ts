import {
  createControlExpiryLifecycle,
  type ControlExpiryLifecycle
} from './controlExpiryLifecycle.js';
import {
  buildControlInternalContext,
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import { createControlQuestionChildResolutionAdapter } from './controlQuestionChildResolution.js';
import {
  createControlTelegramBridgeBootstrapLifecycle,
  type ControlTelegramBridgeBootstrapLifecycleContext
} from './controlTelegramBridgeBootstrapLifecycle.js';
import type { ControlServerBootstrapLifecycle } from './controlServerBootstrapLifecycle.js';

export interface ControlBootstrapAssembly {
  expiryLifecycle: ControlExpiryLifecycle;
  bootstrapLifecycle: ControlServerBootstrapLifecycle;
}

interface ControlBootstrapAssemblyOptions {
  intervalMs: number;
  requestContextShared: ControlRequestSharedContext;
  emitDispatchPilotAuditEvents: ControlTelegramBridgeBootstrapLifecycleContext['emitDispatchPilotAuditEvents'];
}

export function createControlBootstrapAssembly(
  options: ControlBootstrapAssemblyOptions
): ControlBootstrapAssembly {
  let expiryLifecycle: ControlExpiryLifecycle | null = null;

  const assembledExpiryLifecycle = createControlExpiryLifecycle({
    intervalMs: options.intervalMs,
    confirmationStore: options.requestContextShared.confirmationStore,
    questionQueue: options.requestContextShared.questionQueue,
    persist: {
      confirmations: options.requestContextShared.persist.confirmations,
      questions: options.requestContextShared.persist.questions
    },
    runtime: options.requestContextShared.runtime,
    emitControlEvent: (input) => options.requestContextShared.eventTransport.emitControlEvent(input),
    createQuestionChildResolutionAdapter: () =>
      createControlQuestionChildResolutionAdapter(
        buildControlInternalContext({
          ...options.requestContextShared,
          expiryLifecycle
        })
      )
  });
  expiryLifecycle = assembledExpiryLifecycle;

  const bootstrapLifecycle = createControlTelegramBridgeBootstrapLifecycle({
    paths: {
      runDir: options.requestContextShared.paths.runDir,
      controlAuthPath: options.requestContextShared.paths.controlAuthPath,
      controlEndpointPath: options.requestContextShared.paths.controlEndpointPath
    },
    persistControl: options.requestContextShared.persist.control,
    startExpiryLifecycle: () => expiryLifecycle?.start(),
    requestContextShared: options.requestContextShared,
    getExpiryLifecycle: () => expiryLifecycle,
    emitDispatchPilotAuditEvents: options.emitDispatchPilotAuditEvents
  });

  return {
    expiryLifecycle: assembledExpiryLifecycle,
    bootstrapLifecycle
  };
}
