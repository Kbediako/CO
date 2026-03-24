import { describe, expect, it, vi } from 'vitest';

import {
  buildLargeScopeAdvisoryPromptLines,
  buildScopeNotes,
  formatScopeMetrics,
  getLargeScopeGateError,
  logReviewScopeAssessment,
  REVIEW_LARGE_SCOPE_OVERRIDE_REASON_ENV_KEY,
  resolveLargeScopeOverrideReason
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
      `[run-review] large uncommitted review scope now requires --base/--commit or ${REVIEW_LARGE_SCOPE_OVERRIDE_REASON_ENV_KEY} for an auditable override.`
    );
  });

  it('records large-scope overrides in logs and prompt lines', () => {
    const logger = {
      log: vi.fn<(message: string) => void>(),
      warn: vi.fn<(message: string) => void>()
    };
    const scope = {
      mode: 'uncommitted' as const,
      changedFiles: 3,
      changedLines: 6,
      largeScope: true,
      fileThreshold: 2,
      lineThreshold: 2
    };

    logReviewScopeAssessment(scope, '3 files, 6 lines', logger, 'operator accepted the full working tree');

    expect(logger.warn).toHaveBeenCalledWith(
      `[run-review] large uncommitted review scope override accepted via ${REVIEW_LARGE_SCOPE_OVERRIDE_REASON_ENV_KEY}: operator accepted the full working tree`
    );
    expect(
      buildLargeScopeAdvisoryPromptLines(
        scope,
        '3 files, 6 lines',
        'operator accepted the full working tree'
      )
    ).toEqual([
      'Scope advisory: large uncommitted diff detected (3 files, 6 lines; thresholds: 2 files / 2 lines).',
      'Large-scope override recorded: operator accepted the full working tree',
      'Prioritize highest-risk findings first and report actionable issues early; avoid exhaustive low-signal traversal before surfacing initial findings.',
      'If full coverage is incomplete, call out residual risk areas explicitly.'
    ]);
  });

  it('requires either explicit scoping or an auditable large-scope override', () => {
    const scope = {
      mode: 'uncommitted' as const,
      changedFiles: 3,
      changedLines: 6,
      largeScope: true,
      fileThreshold: 2,
      lineThreshold: 2
    };

    expect(getLargeScopeGateError(scope, '3 files, 6 lines', null)).toContain(
      REVIEW_LARGE_SCOPE_OVERRIDE_REASON_ENV_KEY
    );
    expect(getLargeScopeGateError(scope, '3 files, 6 lines', 'accepted')).toBeNull();
    expect(
      resolveLargeScopeOverrideReason({
        [REVIEW_LARGE_SCOPE_OVERRIDE_REASON_ENV_KEY]: 'operator accepted the full working tree'
      })
    ).toBe('operator accepted the full working tree');
  });
});
