import { sanitizeIdentifier } from './sanitizeIdentifier.js';

/**
 * Validates run identifiers before they are used in filesystem paths.
 * Rejects traversal sequences and characters that are unsafe on Windows.
 */
export function sanitizeRunId(runId: string): string {
  return sanitizeIdentifier('run', runId);
}
