import { describe, expect, it, vi } from 'vitest';

import {
  buildLargeScopeAdvisoryPromptLines,
  buildScopeNotes,
  formatScopeMetrics,
  logReviewScopeAssessment
} from '../scripts/lib/review-scope-advisory.js';

describe('review-scope-advisory', () => {
  it('renders path-only uncommitted scope notes', () => {
    expect(
      buildScopeNotes(
        {},
        {
          paths: ['scripts/run-review.ts', 'tests/run-review.spec.ts'],
          renderedLines: ['scripts/run-review.ts', 'tests/run-review.spec.ts']
        }
      )
    ).toEqual([
      'Review scope hint: uncommitted working tree changes (default).',
      '',
      'Review scope paths (2):',
      '```',
      'scripts/run-review.ts',
      'tests/run-review.spec.ts',
      '```'
    ]);
  });

  it('formats metrics and emits advisory prompt lines only for large uncommitted scope', () => {
    const scope = {
      mode: 'uncommitted' as const,
      changedFiles: 3,
      changedLines: 6,
      largeScope: true,
      fileThreshold: 2,
      lineThreshold: 2
    };

    expect(formatScopeMetrics(scope)).toBe('3 files, 6 lines');
    expect(buildLargeScopeAdvisoryPromptLines(scope, '3 files, 6 lines')).toEqual([
      'Scope advisory: large uncommitted diff detected (3 files, 6 lines; thresholds: 2 files / 2 lines).',
      'Prioritize highest-risk findings first and report actionable issues early; avoid exhaustive low-signal traversal before surfacing initial findings.',
      'If full coverage is incomplete, call out residual risk areas explicitly.'
    ]);
    expect(
      buildLargeScopeAdvisoryPromptLines(
        { ...scope, largeScope: false },
        '3 files, 6 lines'
      )
    ).toEqual([]);
  });

  it('logs scope metrics and large-scope warnings for uncommitted scope only', () => {
    const logger = {
      log: vi.fn<(message: string) => void>(),
      warn: vi.fn<(message: string) => void>()
    };

    logReviewScopeAssessment(
      {
        mode: 'uncommitted',
        changedFiles: 1,
        changedLines: 30,
        largeScope: true,
        fileThreshold: 99,
        lineThreshold: 10
      },
      '1 files, 30 lines',
      logger
    );

    expect(logger.log).toHaveBeenCalledWith('[run-review] review scope metrics: 1 files, 30 lines.');
    expect(logger.warn).toHaveBeenCalledWith(
      '[run-review] large uncommitted review scope detected (1 files, 30 lines; thresholds: 99 files / 10 lines).'
    );
    expect(logger.warn).toHaveBeenCalledWith(
      '[run-review] this scope profile is known to produce long CO review traversals; prefer scoped reviews (`--base`/`--commit`) when practical.'
    );
  });
});
