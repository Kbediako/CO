import { describe, expect, it } from 'vitest';

import { parseNameStatusPaths, parseStatusZPaths } from '../scripts/lib/review-scope-paths.js';

describe('review-scope-paths', () => {
  it('parses untracked porcelain-z paths with spaces without preserving quotes', () => {
    expect(parseStatusZPaths('?? spaced file.txt\0')).toEqual(['spaced file.txt']);
  });

  it('parses rename porcelain-z entries and keeps both source and destination paths', () => {
    expect(parseStatusZPaths('R  new name.md\0old name.md\0')).toEqual([
      'new name.md',
      'old name.md'
    ]);
  });

  it('parses name-status rename lines and keeps both source and destination paths', () => {
    expect(parseNameStatusPaths('R100\told name.md\tnew name.md\n')).toEqual([
      'old name.md',
      'new name.md'
    ]);
  });

  it('normalizes name-status scope paths', () => {
    expect(parseNameStatusPaths('M\t./docs/standalone-review-guide.md\n')).toEqual([
      'docs/standalone-review-guide.md'
    ]);
  });
});
