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
});
