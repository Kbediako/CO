import { describe, expect, it } from 'vitest';
import structuredEventEmit from '../structured-event-emit.js';
import { runCodemod } from '../../tests/runCodemod.js';

describe('structured-event-emit codemod', () => {
  it('converts string-based emits to structured payloads', () => {
    const input = `
      eventBus.emit('plan:completed', { task, plan });
    `;
    const output = runCodemod(structuredEventEmit, input);
    const normalized = output.replace(/\s+/g, ' ').trim();
    expect(normalized).toContain(
      "eventBus.emit({ type: 'plan:completed', payload: { task, plan } })"
    );
  });

  it('skips emit calls without string literal events', () => {
    const input = `
      const eventName = 'plan:completed';
      eventBus.emit(eventName, { task, plan });
    `;
    const output = runCodemod(structuredEventEmit, input);
    expect(output.trim()).toContain("eventBus.emit(eventName, { task, plan });");
  });

  it('does not touch non-eventBus emitters', () => {
    const input = `
      socket.emit('message', payload);
      this.eventBus.emit('plan:completed', data);
    `;
    const output = runCodemod(structuredEventEmit, input);
    expect(output).toContain("socket.emit('message', payload);");
    expect(output).toContain("this.eventBus.emit({");
  });
});
