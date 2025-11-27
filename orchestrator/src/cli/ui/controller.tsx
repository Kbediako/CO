import React from 'react';
import { render } from 'ink';

import type { RunEventEmitter } from '../events/runEvents.js';
import { HudApp } from './HudApp.js';
import { HudStore } from './store.js';

export interface HudController {
  stop(): void;
  store: HudStore;
}

export interface HudStartOptions {
  emitter: RunEventEmitter;
  footerNote?: string;
  logLimit?: number;
  batchIntervalMs?: number;
}

export function startHud(options: HudStartOptions): HudController {
  const store = new HudStore({
    logLimit: options.logLimit,
    batchIntervalMs: options.batchIntervalMs
  });
  const unsubscribe = options.emitter.on('*', (event) => {
    store.enqueue(event);
  });
  const ink = render(<HudApp store={store} footerNote={options.footerNote} />);

  let stopped = false;
  return {
    store,
    stop() {
      if (stopped) return;
      stopped = true;
      unsubscribe();
      store.dispose();
      ink.unmount();
    }
  };
}
