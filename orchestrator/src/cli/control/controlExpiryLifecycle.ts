import type { ConfirmationStore } from './confirmations.js';
import type { ControlRuntime } from './controlRuntime.js';
import type { QuestionChildResolutionAdapter } from './questionChildResolutionAdapter.js';
import type { QuestionQueue } from './questions.js';

export type QuestionExpiryResolutionAdapter = Pick<
  QuestionChildResolutionAdapter,
  'resolveChildQuestion'
>;

export interface ControlExpiryLifecycle {
  start(): void;
  close(): void;
  expireConfirmations(): Promise<void>;
  expireQuestions(questionChildResolutionAdapter?: QuestionExpiryResolutionAdapter): Promise<void>;
}

interface ControlExpiryLifecycleOptions {
  intervalMs: number;
  confirmationStore: ConfirmationStore;
  questionQueue: QuestionQueue;
  runtime: Pick<ControlRuntime, 'publish'>;
  persist: {
    confirmations(): Promise<void>;
    questions(): Promise<void>;
  };
  emitControlEvent(input: {
    event: 'confirmation_resolved' | 'question_closed';
    actor: 'runner';
    payload: Record<string, unknown>;
  }): Promise<void>;
  createQuestionChildResolutionAdapter(): QuestionExpiryResolutionAdapter;
}

class DefaultControlExpiryLifecycle implements ControlExpiryLifecycle {
  private readonly intervalMs: number;
  private readonly confirmationStore: ConfirmationStore;
  private readonly questionQueue: QuestionQueue;
  private readonly runtime: Pick<ControlRuntime, 'publish'>;
  private readonly persist: ControlExpiryLifecycleOptions['persist'];
  private readonly emitControlEvent: ControlExpiryLifecycleOptions['emitControlEvent'];
  private readonly createQuestionChildResolutionAdapter:
    ControlExpiryLifecycleOptions['createQuestionChildResolutionAdapter'];
  private timer: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(options: ControlExpiryLifecycleOptions) {
    this.intervalMs = options.intervalMs;
    this.confirmationStore = options.confirmationStore;
    this.questionQueue = options.questionQueue;
    this.runtime = options.runtime;
    this.persist = options.persist;
    this.emitControlEvent = options.emitControlEvent;
    this.createQuestionChildResolutionAdapter = options.createQuestionChildResolutionAdapter;
  }

  start(): void {
    if (this.closed || this.timer) {
      return;
    }
    this.scheduleNext();
  }

  close(): void {
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async expireConfirmations(): Promise<void> {
    const expired = this.confirmationStore.expire();
    if (expired.length === 0) {
      return;
    }
    await this.persist.confirmations();
    for (const entry of expired) {
      await this.emitControlEvent({
        event: 'confirmation_resolved',
        actor: 'runner',
        payload: {
          request_id: entry.request.request_id,
          nonce_id: entry.nonce_id,
          outcome: 'expired'
        }
      });
    }
  }

  async expireQuestions(
    questionChildResolutionAdapter = this.createQuestionChildResolutionAdapter()
  ): Promise<void> {
    const expired = this.questionQueue.expire();
    if (expired.length === 0) {
      return;
    }
    await this.persist.questions();
    for (const record of expired) {
      await this.emitControlEvent({
        event: 'question_closed',
        actor: 'runner',
        payload: {
          question_id: record.question_id,
          parent_run_id: record.parent_run_id,
          outcome: 'expired',
          closed_at: record.closed_at ?? null,
          expires_at: record.expires_at ?? null
        }
      });
      await questionChildResolutionAdapter.resolveChildQuestion(record, 'expired');
    }
    this.runtime.publish({ source: 'questions.expire' });
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      void this.runScheduledSweep();
    }, this.intervalMs);
  }

  private async runScheduledSweep(): Promise<void> {
    this.timer = null;
    if (this.closed) {
      return;
    }
    try {
      await this.expireConfirmations();
    } catch {
      // Preserve prior best-effort background expiry behavior.
    }
    try {
      await this.expireQuestions();
    } catch {
      // Preserve prior best-effort background expiry behavior.
    }
    if (!this.closed) {
      this.scheduleNext();
    }
  }
}

export function createControlExpiryLifecycle(
  options: ControlExpiryLifecycleOptions
): ControlExpiryLifecycle {
  return new DefaultControlExpiryLifecycle(options);
}
