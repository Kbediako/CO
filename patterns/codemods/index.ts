export { default as structuredEventEmit } from './structured-event-emit.js';
export { default as ensureRunSummaryFields } from './ensure-run-summary-fields.js';

export const codemodCatalog = [
  {
    id: 'structured-event-emit',
    description: 'Convert eventBus.emit string calls into structured event objects.',
    entry: './structured-event-emit.js'
  },
  {
    id: 'ensure-run-summary-fields',
    description: 'Ensure run summary objects include mode and timestamp fields.',
    entry: './ensure-run-summary-fields.js'
  }
] as const;
