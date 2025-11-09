import { describe, expect, it } from 'vitest';
import { normalizeSentenceSpacing } from '../../scripts/design/pipeline/toolkit/snapshot.js';

describe('normalizeSentenceSpacing', () => {
  it('inserts a space after punctuation when followed by alphanumerics', () => {
    expect(normalizeSentenceSpacing('You deserve the best.You deserve More')).toBe(
      'You deserve the best. You deserve More'
    );
  });

  it('does not double-insert spaces when one already exists', () => {
    expect(normalizeSentenceSpacing('All set. Ready to go')).toBe('All set. Ready to go');
  });

  it('handles percentage values followed by copy', () => {
    expect(normalizeSentenceSpacing('Protein 99%Plant Powered')).toBe('Protein 99% Plant Powered');
  });

  it('returns empty string for falsy input', () => {
    expect(normalizeSentenceSpacing('')).toBe('');
  });
});
