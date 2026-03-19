import { describe, expect, it } from 'vitest';

import {
  analyzeStartupAnchorBoundaryProgress,
  classifyMetaSurfaceCommandLine,
  classifyMetaSurfaceOutputLine,
  classifyMetaSurfaceToolLine
} from '../scripts/lib/review-meta-surface-boundary-analysis.js';

describe('review meta-surface boundary analysis', () => {
  it('classifies delegation control tool lines as meta-surface activity', () => {
    expect(classifyMetaSurfaceToolLine(`tool delegation.delegate.status({"pipeline":"docs-review"})`)).toBe(
      'delegation-control'
    );
  });

  it('classifies active closeout bundle output lines, including Windows-style paths', () => {
    expect(
      classifyMetaSurfaceOutputLine(
        `C:/repo/out/sample-task/manual/TODO-closeout/09-review.log:278:shellProbeCount`,
        new Set(['out/sample-task/manual/TODO-closeout']),
        'C:/repo'
      )
    ).toBe('review-closeout-bundle');
  });

  it('classifies audit MANIFEST rebinding before the first anchor', () => {
    expect(
      classifyMetaSurfaceCommandLine(
        `/bin/zsh -lc 'export MANIFEST=manual-review/other-manifest.json && sed -n 1,80p \"$MANIFEST\"'`,
        new Set(['scripts/run-review.ts']),
        '/repo',
        new Set(),
        {
          allowedMetaSurfacePaths: new Set(['/repo/manual-review/manifest.json']),
          allowedMetaSurfaceEnvVarPaths: new Map([['MANIFEST', '/repo/manual-review/manifest.json']])
        }
      )
    ).toBe('run-manifest');
  });

  it('tracks pre-anchor meta-surface drift before a touched-path anchor', () => {
    expect(
      analyzeStartupAnchorBoundaryProgress(
        `/bin/zsh -lc 'sed -n 1,120p /Users/kbediako/.codex/memories/MEMORY.md && sed -n 1,120p scripts/run-review.ts'`,
        {
          repoRoot: '/Users/kbediako/Code/CO',
          activeCloseoutBundleRoots: new Set(),
          touchedPaths: new Set(['scripts/run-review.ts']),
          scopeMode: 'base',
          startupAnchorMode: 'diff',
          auditStartupAnchorPaths: new Set(),
          auditStartupAnchorEnvVarPaths: new Map()
        }
      )
    ).toEqual({
      anchorObserved: true,
      preAnchorMetaSurfaceSamples: ['codex-memories']
    });
  });
});
