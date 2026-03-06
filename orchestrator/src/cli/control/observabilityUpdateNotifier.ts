import { logger } from '../../logger.js';

export interface ObservabilityUpdate {
  eventSeq?: number | null;
  source?: string | null;
}

export type ObservabilityUpdateListener = (
  input?: ObservabilityUpdate
) => void | Promise<void>;

export interface ObservabilityUpdateNotifier {
  publish(input?: ObservabilityUpdate): void;
  subscribe(listener: ObservabilityUpdateListener): () => void;
}

export function createObservabilityUpdateNotifier(): ObservabilityUpdateNotifier {
  const listeners = new Set<ObservabilityUpdateListener>();

  return {
    publish(input) {
      const snapshot = Array.from(listeners);
      for (const listener of snapshot) {
        Promise.resolve()
          .then(() => listener(input))
          .catch((error) => {
          logger.warn(
            `Failed to handle observability update: ${(error as Error)?.message ?? String(error)}`
          );
          });
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
