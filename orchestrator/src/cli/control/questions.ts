export type QuestionStatus = 'queued' | 'answered' | 'expired' | 'dismissed';
export type QuestionUrgency = 'low' | 'med' | 'high';

export interface QuestionRecord {
  question_id: string;
  parent_run_id: string;
  from_run_id: string;
  prompt: string;
  urgency: QuestionUrgency;
  status: QuestionStatus;
  queued_at: string;
  expires_at?: string | null;
  answer?: string | null;
  answered_by?: string | null;
  answered_at?: string | null;
  closed_at?: string | null;
}

export interface QuestionEnqueueInput {
  parentRunId: string;
  fromRunId: string;
  prompt: string;
  urgency: QuestionUrgency;
  expiresInMs?: number;
}

export interface QuestionQueueOptions {
  now?: () => string;
  seed?: QuestionRecord[];
}

export class QuestionQueue {
  private readonly now: () => string;
  private readonly records = new Map<string, QuestionRecord>();
  private counter = 0;

  constructor(options: QuestionQueueOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    if (options.seed) {
      this.hydrate(options.seed);
    }
  }

  enqueue(input: QuestionEnqueueInput): QuestionRecord {
    const queuedAt = this.now();
    const expiresAt =
      typeof input.expiresInMs === 'number' && input.expiresInMs > 0
        ? new Date(Date.parse(queuedAt) + input.expiresInMs).toISOString()
        : null;
    const question: QuestionRecord = {
      question_id: this.nextId(),
      parent_run_id: input.parentRunId,
      from_run_id: input.fromRunId,
      prompt: input.prompt,
      urgency: input.urgency,
      status: 'queued',
      queued_at: queuedAt,
      expires_at: expiresAt
    };
    this.records.set(question.question_id, question);
    return question;
  }

  get(questionId: string): QuestionRecord | undefined {
    return this.records.get(questionId);
  }

  list(): QuestionRecord[] {
    return Array.from(this.records.values());
  }

  answer(questionId: string, answer: string, answeredBy: string): void {
    const record = this.records.get(questionId);
    if (!record) {
      throw new Error('question_not_found');
    }
    const now = this.now();
    record.status = 'answered';
    record.answer = answer;
    record.answered_by = answeredBy;
    record.answered_at = now;
    record.closed_at = now;
  }

  dismiss(questionId: string, dismissedBy: string): void {
    const record = this.records.get(questionId);
    if (!record) {
      throw new Error('question_not_found');
    }
    const now = this.now();
    record.status = 'dismissed';
    record.answered_by = dismissedBy;
    record.closed_at = now;
  }

  expire(): QuestionRecord[] {
    const nowIso = this.now();
    const now = Date.parse(nowIso);
    const expired: QuestionRecord[] = [];
    for (const record of this.records.values()) {
      if (record.status !== 'queued' || !record.expires_at) {
        continue;
      }
      if (Date.parse(record.expires_at) <= now) {
        record.status = 'expired';
        record.closed_at = nowIso;
        expired.push({ ...record });
      }
    }
    return expired;
  }

  hydrate(records: QuestionRecord[]): void {
    for (const record of records) {
      this.records.set(record.question_id, { ...record });
    }
    this.counter = Math.max(this.counter, resolveCounter(records));
  }

  private nextId(): string {
    this.counter += 1;
    return `q-${this.counter.toString().padStart(4, '0')}`;
  }
}

function resolveCounter(records: QuestionRecord[]): number {
  let max = 0;
  for (const record of records) {
    const match = /^q-(\d+)/.exec(record.question_id);
    if (match) {
      const value = Number.parseInt(match[1] ?? '0', 10);
      if (Number.isFinite(value)) {
        max = Math.max(max, value);
      }
    }
  }
  return max;
}
