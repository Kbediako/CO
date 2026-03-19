import type { QuestionRecord } from './questions.js';

export function createQuestionReadRetrySelector(
  beforeExpiry: readonly Pick<QuestionRecord, 'question_id' | 'status'>[]
): (afterExpiry: readonly QuestionRecord[]) => QuestionRecord[] {
  const statusBeforeRead = new Map(beforeExpiry.map((record) => [record.question_id, record.status]));
  return (afterExpiry) =>
    afterExpiry.filter((record) => {
      if (record.status === 'queued') {
        return false;
      }
      return !(statusBeforeRead.get(record.question_id) === 'queued' && record.status === 'expired');
    });
}
