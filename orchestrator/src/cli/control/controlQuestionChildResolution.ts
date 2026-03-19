import type { ControlRequestContext } from './controlRequestContext.js';
import type { QuestionChildResolutionFallbackEvent } from './questionChildResolutionAdapter.js';
import {
  createQuestionChildResolutionAdapter,
  type QuestionChildResolutionAdapter
} from './questionChildResolutionAdapter.js';

export interface ControlQuestionChildResolutionContext
  extends Pick<ControlRequestContext, 'config' | 'controlStore' | 'delegationTokens' | 'eventTransport'> {}

export function createControlQuestionChildResolutionAdapter(
  context: ControlQuestionChildResolutionContext
): QuestionChildResolutionAdapter {
  return createQuestionChildResolutionAdapter({
    allowedRunRoots: context.config.ui.allowedRunRoots,
    allowedBindHosts: context.config.ui.allowedBindHosts,
    expiryFallback: context.config.delegate.expiryFallback,
    readParentRunId: () => context.controlStore.snapshot().run_id,
    validateDelegationToken: (token, parentRunId, childRunId) =>
      Boolean(context.delegationTokens.validate(token, parentRunId, childRunId)),
    emitResolutionFallback: (payload) =>
      emitControlQuestionChildResolutionFallbackEvent(context, payload)
  });
}

async function emitControlQuestionChildResolutionFallbackEvent(
  context: Pick<ControlQuestionChildResolutionContext, 'eventTransport'>,
  payload: QuestionChildResolutionFallbackEvent
): Promise<void> {
  await context.eventTransport.emitControlEvent({
    event: 'question.resolve_child_fallback',
    actor: 'control',
    payload: payload as unknown as Record<string, unknown>
  });
}
