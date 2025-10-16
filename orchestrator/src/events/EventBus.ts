import { EventEmitter } from 'node:events';
import type {
  OrchestratorEvent,
  OrchestratorEventName,
  PlanCompletedEvent,
  BuildCompletedEvent,
  TestCompletedEvent,
  ReviewCompletedEvent,
  RunCompletedEvent
} from '../types.js';

type EventMap = {
  'plan:completed': PlanCompletedEvent;
  'build:completed': BuildCompletedEvent;
  'test:completed': TestCompletedEvent;
  'review:completed': ReviewCompletedEvent;
  'run:completed': RunCompletedEvent;
};

type Listener<K extends OrchestratorEventName> = (event: EventMap[K]) => void;

/**
 * Lightweight typed event bus so the manager can notify downstream subscribers
 * (e.g. cloud-sync worker) whenever orchestration milestones complete.
 */
export class EventBus {
  private readonly emitter = new EventEmitter({ captureRejections: false });

  emit(event: OrchestratorEvent): void {
    this.emitter.emit(event.type, event);
  }

  on<K extends OrchestratorEventName>(event: K, listener: Listener<K>): () => void {
    const wrapped = (payload: OrchestratorEvent) => listener(payload as EventMap[K]);
    this.emitter.on(event, wrapped);
    return () => {
      this.emitter.off(event, wrapped);
    };
  }

  once<K extends OrchestratorEventName>(event: K, listener: Listener<K>): () => void {
    const wrapped = (payload: OrchestratorEvent) => listener(payload as EventMap[K]);
    this.emitter.once(event, wrapped);
    return () => {
      this.emitter.off(event, wrapped);
    };
  }
}
