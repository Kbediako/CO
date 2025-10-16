import type { EventBus } from '../events/EventBus.js';
import type { RunSummary } from '../types.js';
import { TaskStateStore } from './TaskStateStore.js';
import { RunManifestWriter } from './RunManifestWriter.js';

export interface PersistenceCoordinatorOptions {
  onError?: (error: unknown, summary: RunSummary) => void;
}

/**
 * Subscribes to `run:completed` events and persists run metadata locally
 * leveraging the TaskStateStore and RunManifestWriter. Errors are surfaced via
 * the optional `onError` callback but do not throw to avoid crashing the manager.
 */
export class PersistenceCoordinator {
  private unsubscribe?: () => void;

  constructor(
    private readonly eventBus: EventBus,
    private readonly stateStore: TaskStateStore,
    private readonly manifestWriter: RunManifestWriter,
    private readonly options: PersistenceCoordinatorOptions = {}
  ) {}

  start(): void {
    if (this.unsubscribe) {
      return;
    }
    this.unsubscribe = this.eventBus.on('run:completed', (event) => {
      void this.handleRunCompleted(event.payload);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  async handleRunCompleted(summary: RunSummary): Promise<void> {
    try {
      await this.stateStore.recordRun(summary);
      await this.manifestWriter.write(summary);
    } catch (error: unknown) {
      this.options.onError?.(error, summary);
      if (!this.options.onError) {
        // eslint-disable-next-line no-console
        console.error('PersistenceCoordinator error', error);
      }
    }
  }
}
