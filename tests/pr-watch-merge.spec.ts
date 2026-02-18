import { describe, expect, it } from 'vitest';

import {
  buildStatusSnapshot,
  isHumanReviewActor,
  resolveLatestBotRereviewRequests,
  resolveBotRereviewTimingForKind,
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
    expect(snapshot.botFeedbackFetchError).toBe(false);
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

  it('blocks merge readiness when requested bot re-review has not completed', () => {
    const response = makeResponse([]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['codex'],
        inProgressBots: ['codex'],
        coderabbit: {
          actionableCount: 2,
          outsideDiffCount: 1,
          nitpickCount: 3
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.gateReasons).toContain('bot_rereview_pending=codex');
    expect(snapshot.botRereviewInProgress).toEqual(['codex']);
    expect(snapshot.coderabbitReviewMeta.outsideDiffCount).toBe(1);
    expect(snapshot.coderabbitReviewMeta.nitpickCount).toBe(3);
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

describe('resolveBotRereviewTimingForKind', () => {
  const requestAtMs = Date.parse('2026-02-18T04:43:14Z');

  it('uses reaction signals for codex', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'codex',
      requestAtMs,
      issueComments: [],
      reviews: [],
      issueReactions: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          content: 'eyes',
          created_at: '2026-02-18T04:43:51Z'
        },
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          content: '+1',
          created_at: '2026-02-18T04:50:22Z'
        }
      ],
      requestCommentReactions: [],
      headOid: 'abc123'
    });

    expect(result.inProgressAtMs).toBe(Date.parse('2026-02-18T04:43:51Z'));
    expect(result.completeAtMs).toBe(Date.parse('2026-02-18T04:50:22Z'));
  });

  it('does not treat codex comments as completion signals', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'codex',
      requestAtMs,
      issueComments: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          created_at: '2026-02-18T04:45:00Z',
          __source: 'pull',
          commit_id: 'abc123'
        }
      ],
      reviews: [],
      issueReactions: [],
      requestCommentReactions: [],
      headOid: 'abc123'
    });

    expect(result.inProgressAtMs).toBeNull();
    expect(result.completeAtMs).toBeNull();
  });

  it('ignores reaction signals for coderabbit', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'coderabbit',
      requestAtMs,
      issueComments: [],
      reviews: [],
      issueReactions: [
        {
          user: { login: 'coderabbitai[bot]' },
          content: 'eyes',
          created_at: '2026-02-18T04:43:51Z'
        },
        {
          user: { login: 'coderabbitai[bot]' },
          content: '+1',
          created_at: '2026-02-18T04:50:22Z'
        }
      ],
      requestCommentReactions: [
        {
          user: { login: 'coderabbitai[bot]' },
          content: 'eyes',
          created_at: '2026-02-18T04:44:00Z'
        }
      ],
      headOid: 'abc123'
    });

    expect(result.inProgressAtMs).toBeNull();
    expect(result.completeAtMs).toBeNull();
  });

  it('only treats current-head pull comments as coderabbit completion signals', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'coderabbit',
      requestAtMs,
      issueComments: [
        {
          user: { login: 'coderabbitai[bot]' },
          created_at: '2026-02-18T04:44:00Z',
          __source: 'issue'
        },
        {
          user: { login: 'coderabbitai[bot]' },
          created_at: '2026-02-18T04:45:00Z',
          __source: 'pull',
          commit_id: 'old-head'
        },
        {
          user: { login: 'coderabbitai[bot]' },
          created_at: '2026-02-18T04:46:00Z',
          __source: 'pull',
          commit_id: 'abc123'
        }
      ],
      reviews: [],
      issueReactions: [],
      requestCommentReactions: [],
      headOid: 'abc123'
    });

    expect(result.inProgressAtMs).toBeNull();
    expect(result.completeAtMs).toBe(Date.parse('2026-02-18T04:46:00Z'));
  });
});

describe('resolveLatestBotRereviewRequests', () => {
  it('tracks the newest request per bot across issue, pull, and review-body comments', () => {
    const requests = resolveLatestBotRereviewRequests([
      {
        id: 10,
        body: '@coderabbitai please re-review',
        created_at: '2026-02-18T04:40:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'issue'
      },
      {
        id: 11,
        body: '@codex please re-review',
        created_at: '2026-02-18T04:41:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      },
      {
        id: 12,
        body: '@coderabbitai follow-up',
        created_at: '2026-02-18T04:42:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      },
      {
        id: 13,
        body: '@coderabbitai please re-review this iteration',
        created_at: '2026-02-18T04:43:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'review'
      }
    ]);

    expect(requests.codex.commentId).toBe(11);
    expect(requests.codex.source).toBe('pull');
    expect(requests.coderabbit.commentId).toBe(13);
    expect(requests.coderabbit.source).toBe('review');
  });

  it('ignores bot-authored mentions when deriving re-review requests', () => {
    const requests = resolveLatestBotRereviewRequests([
      {
        id: 20,
        body: '@codex',
        created_at: '2026-02-18T04:40:00Z',
        user: { login: 'chatgpt-codex-connector[bot]', type: 'Bot' },
        __source: 'issue'
      }
    ]);
    expect(Object.keys(requests)).toEqual([]);
  });

  it('ignores scoped aliases like @codex-team and @coderabbitai-internal', () => {
    const requests = resolveLatestBotRereviewRequests([
      {
        id: 30,
        body: '@codex-team please check this',
        created_at: '2026-02-18T04:40:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'issue'
      },
      {
        id: 31,
        body: '@coderabbitai-internal please check this',
        created_at: '2026-02-18T04:41:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      }
    ]);

    expect(Object.keys(requests)).toEqual([]);
  });
});
