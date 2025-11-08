import { WINDOWS_FORBIDDEN_CHARACTERS } from './identifierGuards.js';

/**
 * Validates run identifiers before they are used in filesystem paths.
 * Rejects traversal sequences and characters that are unsafe on Windows.
 */
export function sanitizeRunId(runId: string): string {
  if (!runId) {
    throw new Error('Invalid run ID: value must be a non-empty string.');
  }

  for (const char of runId) {
    const codePoint = char.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
      throw new Error(`Invalid run ID "${runId}": control characters are not allowed.`);
    }
    if (WINDOWS_FORBIDDEN_CHARACTERS.has(char)) {
      throw new Error(`Invalid run ID "${runId}": character "${char}" is not allowed.`);
    }
  }

  if (runId.startsWith('.')) {
    throw new Error(`Invalid run ID "${runId}": leading dots are not allowed.`);
  }

  if (runId === '..') {
    throw new Error(`Invalid run ID "${runId}": traversal sequences are not allowed.`);
  }

  if (runId.includes('/') || runId.includes('\\')) {
    throw new Error(`Invalid run ID "${runId}": slashes are not allowed.`);
  }

  return runId;
}
