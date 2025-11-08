import { WINDOWS_FORBIDDEN_CHARACTERS } from './identifierGuards.js';

/**
 * Validates task identifiers before they are used in filesystem paths.
 * Rejects traversal sequences and characters that would break directory layout.
 */
export function sanitizeTaskId(taskId: string): string {
  if (!taskId) {
    throw new Error('Invalid task ID: value must be a non-empty string.');
  }

  for (const char of taskId) {
    const codePoint = char.codePointAt(0);

    if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
      throw new Error(`Invalid task ID "${taskId}": control characters are not allowed.`);
    }
    if (WINDOWS_FORBIDDEN_CHARACTERS.has(char)) {
      throw new Error(`Invalid task ID "${taskId}": character "${char}" is not allowed.`);
    }
  }

  if (taskId.startsWith('.')) {
    throw new Error(`Invalid task ID "${taskId}": leading dots are not allowed.`);
  }

  if (taskId === '..') {
    throw new Error(`Invalid task ID "${taskId}": traversal sequences are not allowed.`);
  }

  if (taskId.includes('/') || taskId.includes('\\')) {
    throw new Error(`Invalid task ID "${taskId}": slashes are not allowed.`);
  }

  return taskId;
}
