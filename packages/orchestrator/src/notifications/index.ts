import type { RunSummaryEvent } from '../../../shared/events/types.js';

export interface NotificationOptions {
  targets?: string[] | null;
  envTargets?: string[] | null;
  configTargets?: string[] | null;
  dispatcher?: NotificationDispatcher;
  logger?: { warn(message: string): void };
  fetch?: typeof fetch;
}

export interface NotificationResult {
  delivered: string[];
  failures: Array<{ target: string; error: string }>;
}

export interface ExecNotificationSink {
  targets: string[];
  notify(summary: RunSummaryEvent): Promise<NotificationResult>;
  shutdown(): Promise<void>;
}

type NotificationDispatcher = (target: string, summary: RunSummaryEvent) => Promise<void>;

export function createNotificationSink(options: NotificationOptions = {}): ExecNotificationSink {
  const targets = resolveTargets(options.targets, options.envTargets, options.configTargets);
  if (targets.length === 0) {
    return new NoopNotificationSink();
  }
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const dispatcher = options.dispatcher ?? createHttpDispatcher(fetchImpl);
  return new HttpNotificationSink(targets, dispatcher, options.logger ?? console);
}

class NoopNotificationSink implements ExecNotificationSink {
  constructor(public readonly targets: string[] = []) {}

  async notify(): Promise<NotificationResult> {
    return { delivered: [], failures: [] };
  }

  async shutdown(): Promise<void> {
    // no-op
  }
}

class HttpNotificationSink implements ExecNotificationSink {
  constructor(
    public readonly targets: string[],
    private readonly dispatcher: NotificationDispatcher,
    private readonly logger: { warn(message: string): void }
  ) {}

  async notify(summary: RunSummaryEvent): Promise<NotificationResult> {
    const delivered: string[] = [];
    const failures: Array<{ target: string; error: string }> = [];
    await Promise.all(
      this.targets.map(async (target) => {
        try {
          await this.dispatcher(target, summary);
          delivered.push(target);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push({ target, error: message });
          this.logger.warn(`Notification delivery failed for ${target}: ${message}`);
        }
      })
    );
    return { delivered, failures };
  }

  async shutdown(): Promise<void> {
    // nothing to clean up yet
  }
}

function resolveTargets(
  cliTargets?: string[] | null,
  envTargets?: string[] | null,
  configTargets?: string[] | null
): string[] {
  const source = cliTargets?.length ? cliTargets : envTargets?.length ? envTargets : configTargets ?? [];
  const normalized = source.map((target) => target.trim()).filter(Boolean);
  return Array.from(new Set(normalized));
}

function createHttpDispatcher(fetchImpl: typeof fetch | undefined): NotificationDispatcher {
  if (!fetchImpl) {
    return async () => {
      throw new Error('Notifications disabled: fetch API unavailable');
    };
  }
  return async (target: string, summary: RunSummaryEvent) => {
    const response = await fetchImpl(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(summary)
    });
    if (!response.ok) {
      throw new Error(`Notification endpoint responded with status ${response.status}`);
    }
  };
}
