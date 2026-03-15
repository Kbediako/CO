import { describe, expect, it } from 'vitest';

import {
  extractInspectionTargets,
  extractParsedInspectionTargets,
  resolveTouchedInspectionTarget
} from '../scripts/lib/review-inspection-target-parsing.js';

describe('review inspection target parsing', () => {
  it('normalizes backslashes and strips leading dot-slash segments in extracted targets', () => {
    expect(
      extractInspectionTargets('cat .\\scripts\\run-review.ts ./tests/run-review.spec.ts')
    ).toEqual(['scripts/run-review.ts', 'tests/run-review.spec.ts']);
  });

  it('prioritizes touched review-support family targets over generic parsed targets', () => {
    expect(
      extractInspectionTargets(
        'cat dist/scripts/lib/review-inspection-target-parsing.js scripts/lib/review-scope-paths.ts',
        {
          touchedPaths: new Set(['tests/review-inspection-target-parsing.spec.ts']),
          repoRoot: '/repo'
        }
      )
    ).toEqual(['tests/review-inspection-target-parsing.spec.ts']);
  });

  it('parses nested shell payloads when touched paths are available', () => {
    expect(
      extractParsedInspectionTargets(
        "/bin/zsh -lc 'cat scripts/run-review.ts && cat tests/run-review.spec.ts'",
        new Set(['scripts/run-review.ts']),
        '/repo'
      )
    ).toEqual(['scripts/run-review.ts']);
  });

  it('does not promote grep pattern operands into inspection targets without a real file operand', () => {
    expect(extractParsedInspectionTargets('grep -n scripts/run-review.ts', new Set(), '/repo')).toEqual(
      []
    );
  });

  it('falls back to generic parsed targets when no touched paths are available', () => {
    expect(
      extractParsedInspectionTargets(
        'cat scripts/run-review.ts tests/run-review.spec.ts',
        new Set(),
        '/repo'
      )
    ).toEqual(['scripts/run-review.ts', 'tests/run-review.spec.ts']);
  });

  it('matches touched review-support siblings through the extracted helper family', () => {
    expect(
      resolveTouchedInspectionTarget(
        'dist/scripts/lib/review-inspection-target-parsing.js',
        new Set(['tests/review-inspection-target-parsing.spec.ts']),
        '/repo'
      )
    ).toBe('tests/review-inspection-target-parsing.spec.ts');
  });
});
