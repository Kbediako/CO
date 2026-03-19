import type { ObservabilityUpdateListener } from './observabilityUpdateNotifier.js';

export interface ControlOversightUpdateContract {
  subscribe(listener: ObservabilityUpdateListener): () => void;
}
