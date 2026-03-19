import type { ControlExpiryLifecycle } from './controlExpiryLifecycle.js';
import { createControlQuestionChildResolutionAdapter } from './controlQuestionChildResolution.js';
import {
  buildControlInternalContext,
  type ControlRequestSharedContext
} from './controlRequestContext.js';
import { runQuestionReadSequence } from './questionReadSequence.js';
import type { QuestionsPayload } from './controlOversightReadContract.js';

export interface ControlTelegramQuestionReadContext extends ControlRequestSharedContext {
  expiryLifecycle: ControlExpiryLifecycle | null;
}

export async function readControlTelegramQuestions(
  context: ControlTelegramQuestionReadContext
): Promise<QuestionsPayload> {
  const internalContext = buildControlInternalContext(context);
  const questionChildResolutionAdapter = createControlQuestionChildResolutionAdapter(internalContext);
  const result = await runQuestionReadSequence({
    listQuestions: () => internalContext.questionQueue.list(),
    expireQuestions: () =>
      internalContext.expiryLifecycle?.expireQuestions(questionChildResolutionAdapter) ?? Promise.resolve()
  });
  questionChildResolutionAdapter.queueQuestionResolutions(result.retryCandidates);
  return { questions: result.questions };
}
