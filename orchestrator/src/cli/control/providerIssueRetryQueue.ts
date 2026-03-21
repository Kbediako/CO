import { performance } from 'node:perf_hooks';

export interface ProviderIssueRetryQueueEntry {
  key: string;
  dueAt: string;
  fire: () => Promise<void> | void;
}

interface ScheduledRetryEntry {
  dueAt: string;
  dueAtMonotonicMs: number;
  generation: number;
  timer: NodeJS.Timeout | null;
  firing: boolean;
  fire: () => Promise<void> | void;
}

export interface ProviderIssueRetryQueue {
  sync(entries: ProviderIssueRetryQueueEntry[]): void;
  cancel(key: string): void;
}

const RETRY_QUEUE_FIRE_FAILURE_DELAY_MS = 1_000;

export function createProviderIssueRetryQueue(): ProviderIssueRetryQueue {
  const scheduled = new Map<string, ScheduledRetryEntry>();

  const schedule = (key: string, entry: ScheduledRetryEntry, minimumDelayMs = 0): void => {
    const delayMs = Math.max(minimumDelayMs, entry.dueAtMonotonicMs - performance.now(), 0);
    const generation = entry.generation;
    const timer = setTimeout(() => {
      const current = scheduled.get(key);
      if (!current || current.generation !== generation) {
        return;
      }
      current.timer = null;
      current.firing = true;
      void Promise.resolve()
        .then(() => current.fire())
        .then(() => {
          const latest = scheduled.get(key);
          if (latest && latest.generation === generation && latest.firing) {
            scheduled.delete(key);
          }
        })
        .catch(() => {
          const latest = scheduled.get(key);
          if (!latest || latest.generation !== generation || !latest.firing) {
            return;
          }
          latest.firing = false;
          schedule(key, latest, RETRY_QUEUE_FIRE_FAILURE_DELAY_MS);
        });
    }, delayMs);
    timer.unref?.();
    entry.timer = timer;
  };

  const cancel = (key: string): void => {
    const existing = scheduled.get(key);
    if (!existing) {
      return;
    }
    if (existing.timer) {
      clearTimeout(existing.timer);
    }
    scheduled.delete(key);
  };

  const replace = (entry: ProviderIssueRetryQueueEntry): void => {
    const dueTime = Date.parse(entry.dueAt);
    if (!Number.isFinite(dueTime)) {
      cancel(entry.key);
      return;
    }

    const existing = scheduled.get(entry.key);
    if (existing && existing.dueAt === entry.dueAt) {
      existing.fire = entry.fire;
      return;
    }

    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    const generation = (existing?.generation ?? 0) + 1;
    const delayMs = Math.max(0, dueTime - Date.now());
    const nextEntry: ScheduledRetryEntry = {
      dueAt: entry.dueAt,
      dueAtMonotonicMs: performance.now() + delayMs,
      generation,
      timer: null,
      firing: false,
      fire: entry.fire
    };
    scheduled.set(entry.key, nextEntry);
    schedule(entry.key, nextEntry);
  };

  return {
    sync(entries) {
      const desired = new Set(entries.map((entry) => entry.key));
      for (const key of scheduled.keys()) {
        if (!desired.has(key)) {
          cancel(key);
        }
      }
      entries.forEach((entry) => replace(entry));
    },

    cancel
  };
}
