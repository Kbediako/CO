import { sanitizeIdentifier } from './sanitizeIdentifier.js';

/**
 * Validates task identifiers before they are used in filesystem paths.
 * Rejects traversal sequences and characters that would break directory layout.
 */
export function sanitizeTaskId(taskId: string): string {
  return sanitizeIdentifier('task', taskId);
}
