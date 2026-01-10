export type QuestionStatus = 'queued' | 'answered' | 'expired' | 'dismissed';
export type QuestionUrgency = 'low' | 'med' | 'high';

export interface QuestionRecord {
  question_id: string;
  parent_run_id: string;
  from_run_id: string;
  from_manifest_path?: string | null;
  prompt: string;
  urgency: QuestionUrgency;
  status: QuestionStatus;
  queued_at: string;
  expires_at?: string | null;
  expires_in_ms?: number | null;
  auto_pause?: boolean;
  expiry_fallback?: 'pause' | 'resume' | 'fail' | null;
  answer?: string | null;
  answered_by?: string | null;
  answered_at?: string | null;
  dismissed_by?: string | null;
  closed_at?: string | null;
}

export interface QuestionEnqueueInput {
  parentRunId: string;
  fromRunId: string;
  fromManifestPath?: string | null;
  prompt: string;
  urgency: QuestionUrgency;
  expiresInMs?: number;
  autoPause?: boolean;
  expiryFallback?: 'pause' | 'resume' | 'fail';
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
      from_manifest_path: input.fromManifestPath ?? null,
      prompt: input.prompt,
      urgency: input.urgency,
      status: 'queued',
      queued_at: queuedAt,
      expires_at: expiresAt,
      expires_in_ms: typeof input.expiresInMs === 'number' ? input.expiresInMs : null,
      auto_pause: input.autoPause ?? true,
      expiry_fallback: input.expiryFallback ?? null
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
    if (record.status !== 'queued') {
      throw new Error('question_closed');
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
    if (record.status !== 'queued') {
      throw new Error('question_closed');
    }
    const now = this.now();
    record.status = 'dismissed';
    record.dismissed_by = dismissedBy;
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
