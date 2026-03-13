import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import {
  buildControlInternalContext,
  type ControlRequestContext,
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import {
  readDispatchExtension,
  type DispatchExtensionResult
} from './observabilitySurface.js';
import type { DispatchPilotEvaluation } from './trackerDispatchPilot.js';
import type { ControlDispatchPayload } from './controlOversightReadContract.js';

export interface ControlTelegramDispatchReadContext extends ControlRequestSharedContext {
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

export async function readControlTelegramDispatch(
  context: ControlTelegramDispatchReadContext
): Promise<ControlDispatchPayload> {
  const internalContext = buildControlInternalContext(context);
  const runtimeSnapshot = internalContext.runtime.snapshot();
  const result = await readDispatchExtension({
    readDispatchEvaluation: () => runtimeSnapshot.readDispatchEvaluation()
  });
  await context.emitDispatchPilotAuditEvents(internalContext, {
    surface: 'telegram_dispatch',
    evaluation: result.evaluation,
    issueIdentifier: result.issueIdentifier
  });
  return buildTelegramOversightDispatchPayload(result);
}

function buildTelegramOversightDispatchPayload(
  result: DispatchExtensionResult
): ControlDispatchPayload {
  if (result.kind === 'ok') {
    const payload = result.payload;
    return {
      dispatch_pilot:
        payload.dispatch_pilot && typeof payload.dispatch_pilot === 'object'
          ? (payload.dispatch_pilot as NonNullable<ControlDispatchPayload['dispatch_pilot']>)
          : result.evaluation.summary,
      recommendation:
        payload.recommendation && typeof payload.recommendation === 'object'
          ? (payload.recommendation as NonNullable<ControlDispatchPayload['recommendation']>)
          : null
    };
  }
  const dispatchPilot =
    result.details.dispatch_pilot && typeof result.details.dispatch_pilot === 'object'
      ? (result.details.dispatch_pilot as NonNullable<ControlDispatchPayload['dispatch_pilot']>)
      : result.evaluation.summary;
  return {
    dispatch_pilot: dispatchPilot,
    error: {
      code: result.failure.code,
      details: {
        dispatch_pilot: dispatchPilot
      }
    }
  };
}
