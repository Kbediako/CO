import { describe, expect, it } from 'vitest';

import {
  buildStatusSnapshot,
  isHumanReviewActor,
  resolveCachedRequiredChecksSummary,
  resolveRequiredChecksSummary,
  summarizeRequiredChecks
} from '../scripts/lib/pr-watch-merge.js';

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

  it('blocks merge readiness when unacknowledged bot inline feedback exists', () => {
    const response = makeResponse([]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 1
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.gateReasons).toContain('unacknowledged_bot_feedback=1');
  });

  it('fails closed when bot inline feedback cannot be fetched', () => {
    const response = makeResponse([]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: true,
      unacknowledgedCount: 0
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.gateReasons).toContain('bot_feedback=unknown');
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

describe('resolveRequiredChecksSummary', () => {
  it('prefers fresh required-check data when available', () => {
    const fresh = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const previous = summarizeRequiredChecks([
      { name: 'legacy', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/legacy' }
    ]);

    const resolved = resolveRequiredChecksSummary(fresh, previous, true);
    expect(resolved).toEqual(fresh);
  });

  it('reuses the previous required-check summary on transient fetch errors', () => {
    const previous = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const resolved = resolveRequiredChecksSummary(null, previous, true);
    expect(resolved).toEqual(previous);
  });

  it('falls back to rollup when no required-check data is available and no fetch error occurred', () => {
    const previous = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const resolved = resolveRequiredChecksSummary(null, previous, false);
    expect(resolved).toBeNull();
  });
});

describe('resolveCachedRequiredChecksSummary', () => {
  it('returns cached required checks when cache head matches current head', () => {
    const summary = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const resolved = resolveCachedRequiredChecksSummary(
      {
        headOid: 'abc123',
        summary
      },
      'abc123'
    );
    expect(resolved).toEqual(summary);
  });

  it('invalidates cached required checks when head changes', () => {
    const summary = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const resolved = resolveCachedRequiredChecksSummary(
      {
        headOid: 'abc123',
        summary
      },
      'def456'
    );
    expect(resolved).toBeNull();
  });
});

describe('isHumanReviewActor', () => {
  it('requires non-bot actors before clearing feedback gates', () => {
    expect(
      isHumanReviewActor({
        login: 'chatgpt-codex-connector[bot]',
        type: 'Bot'
      })
    ).toBe(false);
    expect(
      isHumanReviewActor({
        login: 'some-other-bot[bot]'
      })
    ).toBe(false);
    expect(
      isHumanReviewActor({
        login: 'some-other-bot',
        type: 'Bot'
      })
    ).toBe(false);
    expect(
      isHumanReviewActor({
        login: 'maintainer',
        type: 'User'
      })
    ).toBe(true);
  });
});
