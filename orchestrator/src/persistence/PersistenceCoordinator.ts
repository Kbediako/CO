import type { EventBus } from '../events/EventBus.js';
import type { RunSummary } from '../types.js';
import { logger } from '../logger.js';
import { TaskStateStore, TaskStateStoreLockError } from './TaskStateStore.js';
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
    let stateStoreError: unknown | null = null;

    try {
      await this.stateStore.recordRun(summary);
    } catch (error: unknown) {
      stateStoreError = error;
      if (error instanceof TaskStateStoreLockError) {
        logger.warn(
          `Task state snapshot skipped for task ${summary.taskId} (run ${summary.runId}): ${error.message}`
        );
      } else {
        logger.error(
          `Task state snapshot failed for task ${summary.taskId} (run ${summary.runId})`,
          error
        );
      }
    }

    try {
      await this.manifestWriter.write(summary);
    } catch (error: unknown) {
      this.options.onError?.(error, summary);
      if (!this.options.onError) {
        logger.error(
          `PersistenceCoordinator manifest write error for task ${summary.taskId} (run ${summary.runId})`,
          error
        );
      }
      return;
    }

    if (stateStoreError) {
      this.options.onError?.(stateStoreError, summary);
      if (!this.options.onError) {
        logger.warn(
          `Task state snapshot not recorded for task ${summary.taskId} (run ${summary.runId})`
        );
      }
    }
  }
}
