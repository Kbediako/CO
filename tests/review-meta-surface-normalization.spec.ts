import { describe, expect, it } from 'vitest';

import {
  classifyMetaSurfaceDirectDetailed,
  expandMetaSurfaceOperandCandidates,
  isTouchedReviewScopePathFamilyOperand,
  segmentMatchesAuditStartupAnchorPath
} from '../scripts/lib/review-meta-surface-normalization.js';

describe('review meta-surface normalization', () => {
  it('classifies variable-indirected MANIFEST reads through audit env-path resolution', () => {
    const manifestPath = '/repo/.runs/sample-task/cli/sample-run/manifest.json';

    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', '$MANIFEST'],
        new Set(),
        '/repo',
        new Set(),
        new Map<string, string>(),
        new Map<string, string>([['MANIFEST', manifestPath]])
      )
    ).toEqual([{ kind: 'run-manifest', candidate: manifestPath, operand: '$MANIFEST' }]);
  });

  it('matches audit startup anchors through exported MANIFEST env var paths', () => {
    const manifestPath = '/repo/.runs/sample-task/cli/sample-run/manifest.json';

    expect(
      segmentMatchesAuditStartupAnchorPath(
        'cat',
        ['$MANIFEST'],
        new Map<string, string>(),
        new Set([manifestPath]),
        new Map<string, string>([['MANIFEST', manifestPath]]),
        new Set(),
        '/repo'
      )
    ).toBe(true);
  });

  it('does not match audit startup anchors through blocked MANIFEST env var paths', () => {
    const manifestPath = '/repo/.runs/sample-task/cli/sample-run/manifest.json';

    expect(
      segmentMatchesAuditStartupAnchorPath(
        'cat',
        ['$MANIFEST'],
        new Map<string, string>(),
        new Set([manifestPath]),
        new Map<string, string>([['MANIFEST', manifestPath]]),
        new Set(['MANIFEST']),
        '/repo'
      )
    ).toBe(false);
  });

  it('extracts git show rev:path operands as normalized path candidates', () => {
    expect(
      expandMetaSurfaceOperandCandidates(
        'git',
        ['show', 'HEAD:scripts/run-review.ts'],
        'HEAD:scripts/run-review.ts',
        new Map(),
        new Map(),
        new Set(),
        '/repo'
      )
    ).toEqual(['HEAD:scripts/run-review.ts', 'scripts/run-review.ts']);
  });

  it('classifies Windows-style active closeout bundle search results', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'rg',
        ['bounded review', 'C:\\repo\\out\\sample-task\\closeout\\00-summary.md'],
        new Set(),
        'C:/repo',
        new Set(['out/sample-task'])
      )
    ).toEqual([
      {
        kind: 'review-closeout-bundle',
        candidate: 'C:\\repo\\out\\sample-task\\closeout\\00-summary.md',
        operand: 'C:\\repo\\out\\sample-task\\closeout\\00-summary.md'
      }
    ]);
  });

  it('classifies the extracted normalization helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-meta-surface-normalization.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-meta-surface-normalization.ts',
        operand: 'scripts/lib/review-meta-surface-normalization.ts'
      }
    ]);
  });

  it('treats the extracted normalization helper family as touched when a sibling family path is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'dist/scripts/lib/review-meta-surface-normalization.js',
        new Set(['tests/review-meta-surface-normalization.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the extracted scope-advisory helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-scope-advisory.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-scope-advisory.ts',
        operand: 'scripts/lib/review-scope-advisory.ts'
      }
    ]);
  });

  it('treats the extracted scope-advisory helper family as touched when the focused helper spec is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'dist/scripts/lib/review-scope-advisory.js',
        new Set(['tests/review-scope-advisory.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted scope-advisory helper as touched when the scope-paths helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-scope-advisory.ts',
        new Set(['scripts/lib/review-scope-paths.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted scope-paths helper as touched when the scope-advisory helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-scope-paths.ts',
        new Set(['scripts/lib/review-scope-advisory.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted scope-advisory helper as touched when run-review is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-scope-advisory.ts',
        new Set(['tests/run-review.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the extracted inspection-target parsing helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-inspection-target-parsing.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-inspection-target-parsing.ts',
        operand: 'scripts/lib/review-inspection-target-parsing.ts'
      }
    ]);
  });

  it('treats the extracted inspection-target parsing helper family as touched when a sibling family path is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'dist/scripts/lib/review-inspection-target-parsing.js',
        new Set(['tests/review-inspection-target-parsing.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted inspection-target parsing helper family as touched when review-execution-state is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-inspection-target-parsing.ts',
        new Set(['scripts/lib/review-execution-state.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the extracted command-probe helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-command-probe-classification.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-command-probe-classification.ts',
        operand: 'scripts/lib/review-command-probe-classification.ts'
      }
    ]);
  });

  it('treats the extracted command-probe helper family as touched when review-execution-state is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-command-probe-classification.ts',
        new Set(['scripts/lib/review-execution-state.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the extracted command-intent helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-command-intent-classification.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-command-intent-classification.ts',
        operand: 'scripts/lib/review-command-intent-classification.ts'
      }
    ]);
  });

  it('treats the extracted command-intent helper family as touched when review-execution-state is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-command-intent-classification.ts',
        new Set(['scripts/lib/review-execution-state.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the extracted meta-surface boundary helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-meta-surface-boundary-analysis.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-meta-surface-boundary-analysis.ts',
        operand: 'scripts/lib/review-meta-surface-boundary-analysis.ts'
      }
    ]);
  });

  it('treats the extracted meta-surface boundary helper family as touched when review-execution-state is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-meta-surface-boundary-analysis.ts',
        new Set(['scripts/lib/review-execution-state.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the extracted launch-attempt helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-launch-attempt.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-launch-attempt.ts',
        operand: 'scripts/lib/review-launch-attempt.ts'
      }
    ]);
  });

  it('classifies the JS focused launch-attempt regression spec as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'tests/review-launch-attempt.spec.js'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'tests/review-launch-attempt.spec.js',
        operand: 'tests/review-launch-attempt.spec.js'
      }
    ]);
  });

  it('classifies the dist run-review host as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'dist/scripts/run-review.js'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'dist/scripts/run-review.js',
        operand: 'dist/scripts/run-review.js'
      }
    ]);
  });

  it('treats the extracted launch-attempt helper family as touched when its focused regression spec is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-launch-attempt.ts',
        new Set(['tests/review-launch-attempt.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the execution runtime helper as touched when the launch-attempt helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.ts',
        new Set(['scripts/lib/review-launch-attempt.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the execution-state sibling as touched when the launch-attempt helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-state.ts',
        new Set(['scripts/lib/review-launch-attempt.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the launch-attempt helper as touched when the execution runtime helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-launch-attempt.ts',
        new Set(['scripts/lib/review-execution-runtime.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the launch-attempt helper as touched when the execution-state sibling is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-launch-attempt.ts',
        new Set(['scripts/lib/review-execution-state.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS execution runtime helper as touched when the dist launch-attempt helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.js',
        new Set(['dist/scripts/lib/review-launch-attempt.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS execution-state sibling as touched when the JS launch-attempt helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-state.js',
        new Set(['scripts/lib/review-launch-attempt.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the execution runtime helper as touched when the focused launch-attempt regression spec is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.ts',
        new Set(['tests/review-launch-attempt.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the execution-state sibling as touched when the focused launch-attempt regression spec is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-state.ts',
        new Set(['tests/review-launch-attempt.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the launch-attempt helper as touched when the run-review regression spec host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-launch-attempt.ts',
        new Set(['tests/run-review.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS execution runtime helper as touched when the JS focused launch-attempt regression spec is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.js',
        new Set(['tests/review-launch-attempt.spec.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS launch-attempt helper as touched when the JS run-review regression spec host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-launch-attempt.js',
        new Set(['tests/run-review.spec.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the focused launch-attempt regression spec as touched when run-review is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'tests/review-launch-attempt.spec.ts',
        new Set(['scripts/run-review.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats run-review as touched when the focused launch-attempt regression spec is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/run-review.ts',
        new Set(['tests/review-launch-attempt.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS focused launch-attempt regression spec as touched when the JS run-review host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'tests/review-launch-attempt.spec.js',
        new Set(['scripts/run-review.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS run-review host as touched when the JS focused launch-attempt regression spec is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/run-review.js',
        new Set(['tests/review-launch-attempt.spec.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats review-execution-state as touched when the extracted meta-surface boundary helper is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-state.ts',
        new Set(['scripts/lib/review-meta-surface-boundary-analysis.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the extracted shell-command parser helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-shell-command-parser.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-shell-command-parser.ts',
        operand: 'scripts/lib/review-shell-command-parser.ts'
      }
    ]);
  });

  it('treats the extracted shell-command parser helper family as touched when the sibling source path is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'dist/scripts/lib/review-shell-command-parser.js',
        new Set(['scripts/lib/review-shell-command-parser.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted shell-command parser test host as touched when the parser source is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'tests/review-execution-state.spec.ts',
        new Set(['scripts/lib/review-shell-command-parser.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the shell-command parser normalization-spec host as touched when the parser source is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'tests/review-meta-surface-normalization.spec.ts',
        new Set(['scripts/lib/review-shell-command-parser.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the shell-command parser normalization source host as touched when the parser source is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-meta-surface-normalization.ts',
        new Set(['scripts/lib/review-shell-command-parser.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the shell-command parser direct consumer sources as touched when the parser source is touched', () => {
    for (const operand of [
      'scripts/lib/review-inspection-target-parsing.ts',
      'scripts/lib/review-command-probe-classification.ts',
      'scripts/lib/review-command-intent-classification.ts',
      'scripts/lib/review-meta-surface-boundary-analysis.ts',
      'scripts/lib/review-execution-state.ts'
    ]) {
      expect(
        isTouchedReviewScopePathFamilyOperand(
          operand,
          new Set(['scripts/lib/review-shell-command-parser.ts']),
          '/repo'
        )
      ).toBe(true);
    }
  });

  it('does not treat sibling shell-command parser consumer sources as touched when a different consumer source is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-command-intent-classification.ts',
        new Set(['scripts/lib/review-command-probe-classification.ts']),
        '/repo'
      )
    ).toBe(false);
  });

  it('classifies the extracted execution telemetry helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-execution-telemetry.ts'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-execution-telemetry.ts',
        operand: 'scripts/lib/review-execution-telemetry.ts'
      }
    ]);
  });

  it('treats the extracted execution telemetry helper family as touched when review-execution-state is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-telemetry.ts',
        new Set(['scripts/lib/review-execution-state.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted execution telemetry helper family as touched when run-review is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-telemetry.ts',
        new Set(['scripts/run-review.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted execution telemetry helper family as touched when the compiled review-execution-state sibling is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'dist/scripts/lib/review-execution-telemetry.js',
        new Set(['dist/scripts/lib/review-execution-state.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted execution telemetry helper family as touched when the compiled run-review sibling is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'dist/scripts/lib/review-execution-telemetry.js',
        new Set(['dist/scripts/run-review.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted execution runtime helper family as touched when review-execution-state is the touched sibling', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.ts',
        new Set(['scripts/lib/review-execution-state.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('classifies the JS-host execution runtime helper as review-support when it is inspected directly', () => {
    expect(
      classifyMetaSurfaceDirectDetailed(
        'sed',
        ['-n', '1,80p', 'scripts/lib/review-execution-runtime.js'],
        new Set(),
        '/repo'
      )
    ).toEqual([
      {
        kind: 'review-support',
        candidate: 'scripts/lib/review-execution-runtime.js',
        operand: 'scripts/lib/review-execution-runtime.js'
      }
    ]);
  });

  it('treats the JS-host execution runtime helper family as touched when the JS run-review host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.js',
        new Set(['scripts/run-review.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the run-review regression spec host as touched when the extracted execution runtime helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'tests/run-review.spec.ts',
        new Set(['scripts/lib/review-execution-runtime.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted execution runtime helper as touched when the run-review regression spec host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.ts',
        new Set(['tests/run-review.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the extracted execution runtime helper family as touched when the review-execution-state spec host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'dist/scripts/lib/review-execution-runtime.js',
        new Set(['tests/review-execution-state.spec.ts']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS-host execution runtime helper family as touched when the JS review-execution-state spec host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.js',
        new Set(['tests/review-execution-state.spec.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS run-review regression spec host as touched when the JS-host execution runtime helper is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'tests/run-review.spec.js',
        new Set(['scripts/lib/review-execution-runtime.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS-host execution runtime helper as touched when the JS run-review regression spec host is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.js',
        new Set(['tests/run-review.spec.js']),
        '/repo'
      )
    ).toBe(true);
  });

  it('treats the JS-host execution runtime helper family as touched when the source-host review-execution-state.js sibling is touched', () => {
    expect(
      isTouchedReviewScopePathFamilyOperand(
        'scripts/lib/review-execution-runtime.js',
        new Set(['scripts/lib/review-execution-state.js']),
        '/repo'
      )
    ).toBe(true);
  });
});
