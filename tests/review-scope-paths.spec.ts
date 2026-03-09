import { describe, expect, it } from 'vitest';

import { parseNameOnlyPaths, parseStatusZPaths } from '../scripts/lib/review-scope-paths.js';

describe('review-scope-paths', () => {
  it('parses untracked porcelain-z paths with spaces without preserving quotes', () => {
    expect(parseStatusZPaths('?? spaced file.txt\0')).toEqual(['spaced file.txt']);
  });

  it('parses rename porcelain-z entries and keeps only the destination path', () => {
    expect(parseStatusZPaths('R  new name.md\0old name.md\0')).toEqual(['new name.md']);
  });

  it('normalizes name-only scope paths', () => {
    expect(parseNameOnlyPaths('./docs/standalone-review-guide.md\n./tests/run-review.spec.ts\n')).toEqual([
      'docs/standalone-review-guide.md',
      'tests/run-review.spec.ts'
    ]);
  });
});
