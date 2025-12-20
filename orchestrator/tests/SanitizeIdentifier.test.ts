import { describe, expect, it } from 'vitest';
import { sanitizeTaskId } from '../src/persistence/sanitizeTaskId.js';
import { sanitizeRunId } from '../src/persistence/sanitizeRunId.js';

const cases = [
  { label: 'task', sanitize: sanitizeTaskId },
  { label: 'run', sanitize: sanitizeRunId }
];

describe.each(cases)('$label id sanitization', ({ label, sanitize }) => {
  const prefix = `Invalid ${label} ID`;

  it('returns valid identifiers unchanged', () => {
    expect(sanitize(`${label}-001`)).toBe(`${label}-001`);
  });

  it('rejects empty identifiers', () => {
    expect(() => sanitize('')).toThrow(`${prefix}: value must be a non-empty string.`);
  });

  it('rejects control characters', () => {
    const value = `${label}\u0001`;
    try {
      sanitize(value);
      throw new Error('expected sanitize to throw');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toBe(`${prefix} "${value}": control characters are not allowed.`);
    }
  });

  it('rejects Windows-forbidden characters', () => {
    const value = `${label}:bad`;
    expect(() => sanitize(value)).toThrow(`${prefix} "${value}": character ":" is not allowed.`);
  });

  it('rejects leading dots before traversal checks', () => {
    const value = '..';
    expect(() => sanitize(value)).toThrow(`${prefix} "${value}": leading dots are not allowed.`);
  });

  it('rejects slashes', () => {
    const value = `${label}/path`;
    expect(() => sanitize(value)).toThrow(`${prefix} "${value}": slashes are not allowed.`);
  });
});
