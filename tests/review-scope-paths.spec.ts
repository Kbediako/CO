import { describe, expect, it } from 'vitest';

import {
  parseNameStatusPathCollection,
  parseNameStatusPaths,
  parseStatusZPathCollection,
  parseStatusZPaths
} from '../scripts/lib/review-scope-paths.js';

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

  it('renders rename porcelain-z entries as paired scope lines', () => {
    expect(parseStatusZPathCollection('R  new name.md\0old name.md\0').renderedLines).toEqual([
      'old name.md -> new name.md'
    ]);
  });

  it('quotes rename porcelain-z paths when a filename contains the pair delimiter', () => {
    expect(parseStatusZPathCollection('R  c.txt\0a -> b.txt\0').renderedLines).toEqual([
      '"a -> b.txt" -> c.txt'
    ]);
  });

  it('parses name-status rename lines and keeps both source and destination paths', () => {
    expect(parseNameStatusPaths('R100\told name.md\tnew name.md\n')).toEqual([
      'old name.md',
      'new name.md'
    ]);
  });

  it('renders name-status rename lines as paired scope lines', () => {
    expect(parseNameStatusPathCollection('R100\told name.md\tnew name.md\n').renderedLines).toEqual([
      'old name.md -> new name.md'
    ]);
  });

  it('quotes name-status rename paths when a filename contains the pair delimiter', () => {
    expect(parseNameStatusPathCollection('R100\ta -> b.txt\tc.txt\n').renderedLines).toEqual([
      '"a -> b.txt" -> c.txt'
    ]);
  });

  it('normalizes name-status scope paths', () => {
    expect(parseNameStatusPaths('M\t./docs/standalone-review-guide.md\n')).toEqual([
      'docs/standalone-review-guide.md'
    ]);
  });

  it('keeps quoted unusual name-status paths deterministic in rendered lines', () => {
    expect(parseNameStatusPathCollection('A\t\"a\\\\tb.txt\"\n').renderedLines).toEqual([
      '"a\\\\tb.txt"'
    ]);
  });
});
