const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/u;

/**
 * Validates task identifiers before they are used in filesystem paths.
 * Rejects traversal sequences and characters that would break directory layout.
 */
export function sanitizeTaskId(taskId: string): string {
  if (!taskId) {
    throw new Error('Invalid task ID: value must be a non-empty string.');
  }

  if (CONTROL_CHAR_PATTERN.test(taskId)) {
    throw new Error(`Invalid task ID "${taskId}": control characters are not allowed.`);
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
