import { describe, expect, it } from 'vitest';

import { buildStatusSnapshot, summarizeRequiredChecks } from '../scripts/lib/pr-watch-merge.js';

function makeResponse(checkNodes: unknown[]) {
  return {
    data: {
      repository: {
        pullRequest: {
          number: 211,
          url: 'https://github.com/Kbediako/CO/pull/211',
          state: 'OPEN',
          isDraft: false,
          reviewDecision: null,
          mergeStateStatus: 'CLEAN',
          updatedAt: '2026-02-16T03:00:00.000Z',
          mergedAt: null,
          labels: { nodes: [] },
          reviewThreads: { nodes: [] },
          commits: {
            nodes: [
              {
                commit: {
                  oid: 'abc123',
                  statusCheckRollup: {
                    contexts: {
                      nodes: checkNodes
                    }
                  }
                }
              }
            ]
          }
        }
      }
    }
  };
}

describe('pr watch-merge required-check gating', () => {
  it('uses required checks for gate decisions when available', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'coderabbit',
        status: 'IN_PROGRESS',
        conclusion: null,
        detailsUrl: 'https://example.com/optional'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks);

    expect(snapshot.gateChecksSource).toBe('required');
    expect(snapshot.readyToMerge).toBe(true);
    expect(snapshot.checks.pending).toEqual(['coderabbit']);
    expect(snapshot.requiredChecks?.pending).toEqual([]);
    expect(snapshot.gateReasons).toEqual([]);
  });

  it('falls back to rollup pending checks when required checks are unavailable', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'corelane',
        status: 'IN_PROGRESS',
        conclusion: null,
        detailsUrl: 'https://example.com/corelane'
      }
    ]);

    const snapshot = buildStatusSnapshot(response, null);

    expect(snapshot.gateChecksSource).toBe('rollup');
    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.gateReasons).toContain('checks_pending=1');
  });
});

describe('summarizeRequiredChecks', () => {
  it('maps bucket values to pass/pending/fail buckets conservatively', () => {
    const summary = summarizeRequiredChecks([
      { name: 'lint', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/lint' },
      { name: 'tests', state: 'PENDING', bucket: 'pending', link: 'https://example.com/tests' },
      { name: 'release', state: 'FAILURE', bucket: 'fail', link: 'https://example.com/release' },
      { name: 'security', state: 'CANCELLED', bucket: 'cancel', link: 'https://example.com/security' },
      { name: 'docs', state: 'SKIPPED', bucket: 'skipping', link: 'https://example.com/docs' }
    ]);

    expect(summary.total).toBe(5);
    expect(summary.successCount).toBe(1);
    expect(summary.pending).toEqual(['tests']);
    expect(summary.failed.map((item) => item.name)).toEqual(['release', 'security', 'docs']);
  });
});
