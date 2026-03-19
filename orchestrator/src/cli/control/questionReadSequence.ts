import type { QuestionRecord } from './questions.js';
import { createQuestionReadRetrySelector } from './questionReadRetryDeduplication.js';

interface QuestionReadSequenceContext {
  listQuestions(): QuestionRecord[];
  expireQuestions(): Promise<void>;
}

interface QuestionReadSequenceResult {
  questions: QuestionRecord[];
  retryCandidates: QuestionRecord[];
}

export async function runQuestionReadSequence(
  context: QuestionReadSequenceContext
): Promise<QuestionReadSequenceResult> {
  const selectRetryCandidates = createQuestionReadRetrySelector(context.listQuestions());
  await context.expireQuestions();
  const questions = context.listQuestions();
  return {
    questions,
    retryCandidates: selectRetryCandidates(questions)
  };
}
