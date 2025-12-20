import { WINDOWS_FORBIDDEN_CHARACTERS } from './identifierGuards.js';

type IdentifierKind = 'task' | 'run';

export function sanitizeIdentifier(kind: IdentifierKind, value: string): string {
  const label = kind === 'task' ? 'task' : 'run';
  if (!value) {
    throw new Error(`Invalid ${label} ID: value must be a non-empty string.`);
  }

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint !== undefined && (codePoint <= 31 || codePoint === 127)) {
      throw new Error(`Invalid ${label} ID "${value}": control characters are not allowed.`);
    }
    if (WINDOWS_FORBIDDEN_CHARACTERS.has(char)) {
      throw new Error(`Invalid ${label} ID "${value}": character "${char}" is not allowed.`);
    }
  }

  if (value.startsWith('.')) {
    throw new Error(`Invalid ${label} ID "${value}": leading dots are not allowed.`);
  }

  if (value === '..') {
    throw new Error(`Invalid ${label} ID "${value}": traversal sequences are not allowed.`);
  }

  if (value.includes('/') || value.includes('\\')) {
    throw new Error(`Invalid ${label} ID "${value}": slashes are not allowed.`);
  }

  return value;
}
