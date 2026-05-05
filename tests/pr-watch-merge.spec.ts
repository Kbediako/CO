import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

import {
  buildPrNumberViewArgs,
  buildPrMergeArgs,
  buildPrUpdateBranchArgs,
  buildAutomaticBranchRecoveryKey,
  buildStatusSnapshot,
  isConflictLikeBranchRecoveryFailureMessage,
  isNoRequiredChecksReportedErrorMessage,
  isHumanReviewActor,
  parseGitHubRepoFromRemoteUrl,
  planGitHubRateLimitBackoff,
  resolveAutomaticBranchRecoveryReason,
  resolveActionRequiredReasons,
  resolveBotRereviewRequestMentions,
  resolveLatestBotRereviewRequests,
  resolveBotRereviewTimingForKind,
  resolveCachedRequiredChecksSummary,
  resolveGitHubRateLimitStatus,
  resolveRequiredChecksSummary,
  runPrWatchMerge,
  shouldAttemptAutomaticBranchRecovery,
  shouldSucceedAfterTimeout,
  summarizeRequiredChecks
} from '../scripts/lib/pr-watch-merge.js';

function makeResponse(checkNodes: unknown[], overrides: Record<string, unknown> = {}) {
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
          },
          ...overrides
        }
      }
    }
  };
}

describe('buildPrMergeArgs', () => {
  it('includes explicit repo context for gh pr merge', () => {
    const args = buildPrMergeArgs({
      owner: 'Kbediako',
      repo: 'CO',
      prNumber: 253,
      mergeMethod: 'squash',
      deleteBranch: true,
      headOid: 'abc123'
    });

    expect(args).toContain('--repo');
    expect(args).toContain('Kbediako/CO');
    expect(args).toContain('--match-head-commit');
    expect(args).toContain('abc123');
  });
});

describe('buildPrNumberViewArgs', () => {
  it('scopes PR number inference to an explicit repository', () => {
    expect(buildPrNumberViewArgs('Kbediako', 'CO')).toEqual([
      'pr',
      'view',
      '--json',
      'number',
      '--repo',
      'Kbediako/CO'
    ]);
  });
});

describe('buildPrUpdateBranchArgs', () => {
  it('includes explicit repo context for gh pr update-branch', () => {
    expect(buildPrUpdateBranchArgs({
      owner: 'Kbediako',
      repo: 'CO',
      prNumber: 253
    })).toEqual(['pr', 'update-branch', '253', '--repo', 'Kbediako/CO']);
  });
});

describe('buildAutomaticBranchRecoveryKey', () => {
  it('stays stable for the same head even when GitHub metadata timestamps change', () => {
    expect(
      buildAutomaticBranchRecoveryKey(
        {
          headOid: 'abc123'
        },
        'merge_state=BEHIND'
      )
    ).toBe('merge_state=BEHIND|abc123');
  });

  it('falls back to a stable no-head marker when the snapshot has no head oid', () => {
    expect(buildAutomaticBranchRecoveryKey(null, 'merge_state=DIRTY')).toBe('merge_state=DIRTY|no-head');
  });
});

describe('parseGitHubRepoFromRemoteUrl', () => {
  it('parses https remotes', () => {
    expect(parseGitHubRepoFromRemoteUrl('https://github.com/Kbediako/CO.git')).toEqual({
      owner: 'Kbediako',
      repo: 'CO'
    });
  });

  it('parses ssh remotes', () => {
    expect(parseGitHubRepoFromRemoteUrl('git@github.com:Kbediako/CO.git')).toEqual({
      owner: 'Kbediako',
      repo: 'CO'
    });
  });

  it('returns null for non-github remotes', () => {
    expect(parseGitHubRepoFromRemoteUrl('https://gitlab.com/org/repo.git')).toBeNull();
  });
});

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

  it('classifies terminal Codex connector failures distinctly from pending rereview', () => {
    const response = makeResponse([]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: [],
        terminalFailureBots: ['codex'],
        inProgressBots: [],
        requestTimesByBot: {
          codex: Date.parse('2026-02-18T04:43:00.000Z')
        },
        terminalFailuresByBot: {
          codex: {
            requestAtMs: Date.parse('2026-02-18T04:43:00.000Z'),
            terminalFailureAtMs: Date.parse('2026-02-18T04:44:00.000Z'),
            signal: 'unknown_error;manual_retry=@codex_review'
          }
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.botRereviewPending).toEqual([]);
    expect(snapshot.botRereviewTerminalFailures).toEqual(['codex']);
    expect(snapshot.gateReasons).toContain(
      'bot_rereview_terminal_failure=codex(unknown_error;manual_retry=@codex_review)'
    );
  });

  it('clears stale coderabbit rereview pending from an older completion when current-head rollup is successful', () => {
    const response = makeResponse([
      {
        __typename: 'StatusContext',
        context: 'CodeRabbit',
        state: 'SUCCESS',
        createdAt: '2026-02-18T04:45:00.000Z',
        targetUrl: 'https://example.com/coderabbit'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['coderabbitai'],
        inProgressBots: [],
        requestTimesByBot: {
          coderabbitai: Date.parse('2026-02-18T04:43:00.000Z')
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(true);
    expect(snapshot.gateReasons).toEqual([]);
    expect(snapshot.botRereviewPending).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.rawPendingBots).toEqual(['coderabbitai']);
    expect(snapshot.botRereviewDiagnostics.clearedPendingBots).toEqual(['coderabbitai']);
    expect(snapshot.botRereviewDiagnostics.coderabbit.stalePendingCleared).toBe(true);
    expect(snapshot.botRereviewDiagnostics.coderabbit.statusCheckRollup.state).toBe('success');
    expect(snapshot.botRereviewDiagnostics.coderabbit.successAfterRequest).toBe(true);
  });

  it('ignores acknowledgement-only coderabbit mentions after a current-head clean rollup', () => {
    const mentionSignals = resolveBotRereviewRequestMentions([
      {
        id: 732,
        body: '@coderabbitai acknowledged, the current-head clean rollup is enough for handoff.',
        created_at: '2026-04-30T04:46:00.000Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'issue'
      }
    ]);
    const response = makeResponse([
      {
        __typename: 'StatusContext',
        context: 'CodeRabbit',
        state: 'SUCCESS',
        createdAt: '2026-04-30T04:45:00.000Z',
        targetUrl: 'https://example.com/coderabbit'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(
      response,
      requiredChecks,
      {
        fetchError: false,
        unacknowledgedCount: 0,
        rereview: {
          fetchError: false,
          pendingBots: [],
          inProgressBots: [],
          ignoredMentions: mentionSignals.ignoredMentions,
          coderabbit: {
            actionableCount: 0,
            outsideDiffCount: 0,
            nitpickCount: 0
          }
        }
      },
      { readinessMode: 'review' }
    );

    expect(mentionSignals.requests).toEqual({});
    expect(mentionSignals.ignoredMentions).toEqual([
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 732,
        createdAtMs: Date.parse('2026-04-30T04:46:00.000Z'),
        source: 'issue'
      }
    ]);
    expect(snapshot.readyToMerge).toBe(true);
    expect(snapshot.gateReasons).toEqual([]);
    expect(snapshot.botRereviewPending).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.ignoredMentions).toEqual(mentionSignals.ignoredMentions);
  });

  it('keeps unacknowledged bot feedback as a hard gate even when a coderabbit mention is acknowledgement-only', () => {
    const mentionSignals = resolveBotRereviewRequestMentions([
      {
        id: 733,
        body: '@coderabbitai thanks, noted for the current clean rollup.',
        created_at: '2026-04-30T04:46:00.000Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      }
    ]);
    const response = makeResponse([
      {
        __typename: 'StatusContext',
        context: 'CodeRabbit',
        state: 'SUCCESS',
        createdAt: '2026-04-30T04:45:00.000Z',
        targetUrl: 'https://example.com/coderabbit'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 1,
      rereview: {
        fetchError: false,
        pendingBots: [],
        inProgressBots: [],
        ignoredMentions: mentionSignals.ignoredMentions,
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.gateReasons).toEqual(['unacknowledged_bot_feedback=1']);
    expect(snapshot.botRereviewPending).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.ignoredMentions).toEqual(mentionSignals.ignoredMentions);
  });

  it('reports merge-state blockers instead of stale coderabbit rereview pending after current-head success', () => {
    const response = makeResponse(
      [
        {
          __typename: 'StatusContext',
          context: 'CodeRabbit',
          state: 'SUCCESS',
          createdAt: '2026-02-18T04:45:00.000Z',
          targetUrl: 'https://example.com/coderabbit'
        }
      ],
      { mergeStateStatus: 'DIRTY' }
    );
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['coderabbitai'],
        inProgressBots: [],
        requestTimesByBot: {
          coderabbitai: Date.parse('2026-02-18T04:43:00.000Z')
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.gateReasons).toEqual(['merge_state=DIRTY']);
    expect(snapshot.botRereviewPending).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.clearedPendingBots).toEqual(['coderabbitai']);
  });

  it('keeps coderabbit rereview pending when the current-head success predates the latest request', () => {
    const response = makeResponse([
      {
        __typename: 'StatusContext',
        context: 'CodeRabbit',
        state: 'SUCCESS',
        createdAt: '2026-02-18T04:40:00.000Z',
        targetUrl: 'https://example.com/coderabbit'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['coderabbitai'],
        inProgressBots: [],
        requestTimesByBot: {
          coderabbitai: Date.parse('2026-02-18T04:43:00.000Z')
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.botRereviewPending).toEqual(['coderabbitai']);
    expect(snapshot.gateReasons).toContain(
      'bot_rereview_pending=coderabbitai(status_check_rollup=success:CodeRabbit;success_before_request)'
    );
    expect(snapshot.botRereviewDiagnostics.clearedPendingBots).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.coderabbit.successAfterRequest).toBe(false);
  });

  it('keeps coderabbit rereview pending when the current-head rollup is still in progress', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'CodeRabbit',
        status: 'IN_PROGRESS',
        conclusion: null,
        startedAt: '2026-02-18T04:44:00.000Z',
        detailsUrl: 'https://example.com/coderabbit'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['coderabbitai'],
        inProgressBots: ['coderabbitai'],
        requestTimesByBot: {
          coderabbitai: Date.parse('2026-02-18T04:43:00.000Z')
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.botRereviewPending).toEqual(['coderabbitai']);
    expect(snapshot.gateReasons).toContain('bot_rereview_pending=coderabbitai(status_check_rollup=pending:CodeRabbit)');
    expect(snapshot.botRereviewDiagnostics.clearedPendingBots).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.coderabbit.statusCheckRollup.state).toBe('pending');
  });

  it('keeps coderabbit rereview pending when the current-head check run is skipped', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'CodeRabbit',
        status: 'COMPLETED',
        conclusion: 'SKIPPED',
        startedAt: '2026-02-18T04:44:00.000Z',
        completedAt: '2026-02-18T04:45:00.000Z',
        detailsUrl: 'https://example.com/coderabbit'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['coderabbitai'],
        inProgressBots: [],
        requestTimesByBot: {
          coderabbitai: Date.parse('2026-02-18T04:43:00.000Z')
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.botRereviewPending).toEqual(['coderabbitai']);
    expect(snapshot.gateReasons).toContain('bot_rereview_pending=coderabbitai(status_check_rollup=failed:CodeRabbit)');
    expect(snapshot.botRereviewDiagnostics.clearedPendingBots).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.coderabbit.statusCheckRollup.state).toBe('failed');
    expect(snapshot.botRereviewDiagnostics.coderabbit.successAfterRequest).toBe(false);
  });

  it('does not clear coderabbit rereview pending from unrelated matching-name checks', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'not-coderabbit-cache',
        status: 'COMPLETED',
        conclusion: 'SUCCESS',
        startedAt: '2026-02-18T04:44:00.000Z',
        completedAt: '2026-02-18T04:45:00.000Z',
        detailsUrl: 'https://example.com/not-coderabbit-cache'
      }
    ]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['coderabbitai'],
        inProgressBots: [],
        requestTimesByBot: {
          coderabbitai: Date.parse('2026-02-18T04:43:00.000Z')
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.botRereviewPending).toEqual(['coderabbitai']);
    expect(snapshot.gateReasons).toContain('bot_rereview_pending=coderabbitai(status_check_rollup=missing)');
    expect(snapshot.botRereviewDiagnostics.clearedPendingBots).toEqual([]);
    expect(snapshot.botRereviewDiagnostics.coderabbit.statusCheckRollup.contexts).toEqual([]);
  });

  it('does not clear coderabbit rereview pending while current-head review threads remain unresolved', () => {
    const response = makeResponse(
      [
        {
          __typename: 'StatusContext',
          context: 'CodeRabbit',
          state: 'SUCCESS',
          createdAt: '2026-02-18T04:45:00.000Z',
          targetUrl: 'https://example.com/coderabbit'
        }
      ],
      {
        reviewThreads: {
          nodes: [{ isResolved: false, isOutdated: false }]
        }
      }
    );
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0,
      rereview: {
        fetchError: false,
        pendingBots: ['coderabbitai'],
        inProgressBots: [],
        requestTimesByBot: {
          coderabbitai: Date.parse('2026-02-18T04:43:00.000Z')
        },
        coderabbit: {
          actionableCount: 0,
          outsideDiffCount: 0,
          nitpickCount: 0
        }
      }
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.botRereviewPending).toEqual(['coderabbitai']);
    expect(snapshot.gateReasons).toContain('unresolved_threads=1');
    expect(snapshot.gateReasons).toContain('bot_rereview_pending=coderabbitai(status_check_rollup=success:CodeRabbit)');
    expect(snapshot.botRereviewDiagnostics.clearedPendingBots).toEqual([]);
  });

  it('treats REVIEW_REQUIRED as informational in ready-review mode when other gates are clean', () => {
    const response = makeResponse([], {
      reviewDecision: 'REVIEW_REQUIRED',
      mergeStateStatus: 'BLOCKED'
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(
      response,
      requiredChecks,
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review'
      }
    );

    expect(snapshot.readyToMerge).toBe(true);
    expect(snapshot.gateReasons).toEqual([]);
  });

  it('fails closed when required-check verification errors in ready-review mode', () => {
    const response = makeResponse([], {
      reviewDecision: 'REVIEW_REQUIRED',
      mergeStateStatus: 'BLOCKED'
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);

    const snapshot = buildStatusSnapshot(
      response,
      requiredChecks,
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review',
        requiredChecksQueryFailed: true
      }
    );

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.requiredChecksQueryFailed).toBe(true);
    expect(snapshot.gateReasons).toContain('required_checks_query_failed');
  });
});

describe('resolveActionRequiredReasons', () => {
  it('classifies review and thread feedback blockers as action-required', () => {
    const response = makeResponse([], {
      reviewDecision: 'CHANGES_REQUESTED',
      reviewThreads: {
        nodes: [
          {
            isResolved: false,
            isOutdated: false
          }
        ]
      }
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 2
    });

    const reasons = resolveActionRequiredReasons(snapshot);
    expect(reasons).toContain('review=CHANGES_REQUESTED');
    expect(reasons).toContain('unresolved_threads=1');
    expect(reasons).toContain('unacknowledged_bot_feedback=2');
  });

  it('classifies draft PRs as action-required', () => {
    const response = makeResponse([], {
      isDraft: true
    });
    const snapshot = buildStatusSnapshot(response, null, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(resolveActionRequiredReasons(snapshot)).toContain('draft');
  });

  it('classifies do-not-merge labels as action-required', () => {
    const response = makeResponse([], {
      labels: {
        nodes: [{ name: 'do-not-merge' }]
      }
    });
    const snapshot = buildStatusSnapshot(response, null, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(resolveActionRequiredReasons(snapshot)).toContain('label:do-not-merge');
  });

  it('does not classify pending checks as action-required by itself', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'corelane',
        status: 'IN_PROGRESS',
        conclusion: null,
        detailsUrl: 'https://example.com/corelane'
      }
    ]);
    const snapshot = buildStatusSnapshot(response, null, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(resolveActionRequiredReasons(snapshot)).toEqual([]);
  });

  it('does not classify REVIEW_REQUIRED as action-required in ready-review mode', () => {
    const response = makeResponse([], {
      reviewDecision: 'REVIEW_REQUIRED'
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(
      response,
      requiredChecks,
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review'
      }
    );

    expect(resolveActionRequiredReasons(snapshot, { readinessMode: 'review' })).toEqual([]);
  });

  it('classifies required-check query failures as action-required in ready-review mode', () => {
    const response = makeResponse([], {
      reviewDecision: 'REVIEW_REQUIRED',
      mergeStateStatus: 'BLOCKED'
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(
      response,
      requiredChecks,
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review',
        requiredChecksQueryFailed: true
      }
    );

    expect(resolveActionRequiredReasons(snapshot, { readinessMode: 'review' }))
      .toContain('required_checks_query_failed');
  });

  it('classifies terminal Codex connector failures as action-required in ready-review mode', () => {
    const response = makeResponse([]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(
      response,
      requiredChecks,
      {
        fetchError: false,
        unacknowledgedCount: 0,
        rereview: {
          fetchError: false,
          pendingBots: [],
          terminalFailureBots: ['codex'],
          inProgressBots: [],
          terminalFailuresByBot: {
            codex: {
              requestAtMs: Date.parse('2026-02-18T04:43:00.000Z'),
              terminalFailureAtMs: Date.parse('2026-02-18T04:44:00.000Z'),
              signal: 'unknown_error;manual_retry=@codex_review'
            }
          },
          coderabbit: {
            actionableCount: 0,
            outsideDiffCount: 0,
            nitpickCount: 0
          }
        }
      },
      {
        readinessMode: 'review'
      }
    );

    expect(resolveActionRequiredReasons(snapshot, { readinessMode: 'review' })).toContain(
      'bot_rereview_terminal_failure=codex(unknown_error;manual_retry=@codex_review)'
    );
  });

  it('classifies behind merge state as action-required', () => {
    const response = makeResponse([], {
      mergeStateStatus: 'BEHIND'
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(resolveActionRequiredReasons(snapshot)).toContain('merge_state=BEHIND');
  });

  it('classifies dirty merge state as action-required', () => {
    const response = makeResponse([], {
      mergeStateStatus: 'DIRTY'
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(resolveActionRequiredReasons(snapshot)).toContain('merge_state=DIRTY');
  });

  it('classifies failing required checks as action-required', () => {
    const response = makeResponse([], {
      mergeStateStatus: 'BLOCKED'
    });
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'FAILURE', bucket: 'fail', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(resolveActionRequiredReasons(snapshot)).toContain('required_checks_failed=1');
  });

  it('blocks ready snapshots when required checks fail even if merge state still looks clean', () => {
    const response = makeResponse([]);
    const requiredChecks = summarizeRequiredChecks([
      { name: 'corelane', state: 'FAILURE', bucket: 'fail', link: 'https://example.com/corelane' }
    ]);
    const snapshot = buildStatusSnapshot(response, requiredChecks, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(snapshot.readyToMerge).toBe(false);
    expect(snapshot.gateReasons).toContain('required_checks_failed=1');
    expect(resolveActionRequiredReasons(snapshot)).toContain('required_checks_failed=1');
  });

  it('does not classify rollup-only failing checks as action-required', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'optional-check',
        status: 'COMPLETED',
        conclusion: 'FAILURE',
        detailsUrl: 'https://example.com/optional-check'
      }
    ]);
    const snapshot = buildStatusSnapshot(response, null, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(snapshot.requiredChecks).toBeNull();
    expect(resolveActionRequiredReasons(snapshot)).toEqual([]);
  });

  it('classifies rollup failures as action-required when merge state is non-mergeable', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'corelane',
        status: 'COMPLETED',
        conclusion: 'FAILURE',
        detailsUrl: 'https://example.com/corelane'
      }
    ], {
      mergeStateStatus: 'BLOCKED'
    });
    const snapshot = buildStatusSnapshot(response, null, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(snapshot.requiredChecks).toBeNull();
    expect(resolveActionRequiredReasons(snapshot)).toContain('checks_failed=1');
  });

  it('does not classify rollup failures as action-required in ready-review mode when BLOCKED only reflects review gating', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'optional-check',
        status: 'COMPLETED',
        conclusion: 'FAILURE',
        detailsUrl: 'https://example.com/optional-check'
      }
    ], {
      mergeStateStatus: 'BLOCKED',
      reviewDecision: 'REVIEW_REQUIRED'
    });
    const snapshot = buildStatusSnapshot(
      response,
      null,
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review'
      }
    );

    expect(snapshot.readyToMerge).toBe(true);
    expect(resolveActionRequiredReasons(snapshot, { readinessMode: 'review' })).toEqual([]);
  });

  it('does not classify rollup failures as action-required while rollup checks are pending in merge mode', () => {
    const response = makeResponse([
      {
        __typename: 'CheckRun',
        name: 'corelane',
        status: 'IN_PROGRESS',
        conclusion: null,
        detailsUrl: 'https://example.com/corelane'
      },
      {
        __typename: 'CheckRun',
        name: 'optional-check',
        status: 'COMPLETED',
        conclusion: 'FAILURE',
        detailsUrl: 'https://example.com/optional-check'
      }
    ], {
      mergeStateStatus: 'BLOCKED'
    });
    const snapshot = buildStatusSnapshot(response, null, {
      fetchError: false,
      unacknowledgedCount: 0
    });

    expect(snapshot.requiredChecks).toBeNull();
    expect(resolveActionRequiredReasons(snapshot)).toEqual([]);
  });
});

describe('resolveAutomaticBranchRecoveryReason', () => {
  it('picks BEHIND from action-required snapshots', () => {
    const snapshot = buildStatusSnapshot(
      makeResponse([], {
        mergeStateStatus: 'BEHIND'
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      }
    );

    expect(resolveAutomaticBranchRecoveryReason(snapshot)).toBe('merge_state=BEHIND');
    expect(shouldAttemptAutomaticBranchRecovery(snapshot)).toBe(true);
  });

  it('ignores non-recovery action-required reasons', () => {
    const snapshot = buildStatusSnapshot(
      makeResponse([], {
        reviewDecision: 'CHANGES_REQUESTED'
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      }
    );

    expect(resolveAutomaticBranchRecoveryReason(snapshot)).toBeNull();
  });

  it('accepts precomputed action-required reason lists', () => {
    expect(resolveAutomaticBranchRecoveryReason([
      'review=CHANGES_REQUESTED',
      'merge_state=DIRTY'
    ])).toBe('merge_state=DIRTY');
  });
});

describe('shouldAttemptAutomaticBranchRecovery', () => {
  it('requires BEHIND or DIRTY to be the only action-required blocker', () => {
    expect(shouldAttemptAutomaticBranchRecovery(['merge_state=BEHIND'])).toBe(true);
    expect(
      shouldAttemptAutomaticBranchRecovery(['review=CHANGES_REQUESTED', 'merge_state=BEHIND'])
    ).toBe(false);
    expect(
      shouldAttemptAutomaticBranchRecovery(['merge_state=DIRTY', 'unresolved_threads=2'])
    ).toBe(false);
  });

  it('requires the snapshot to be otherwise green before mutating the branch', () => {
    const snapshot = buildStatusSnapshot(
      makeResponse([], {
        mergeStateStatus: 'BEHIND'
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'PENDING', bucket: 'pending', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      }
    );

    expect(snapshot.gateReasons).toEqual(['required_checks_pending=1', 'merge_state=BEHIND']);
    expect(resolveActionRequiredReasons(snapshot)).toEqual(['merge_state=BEHIND']);
    expect(resolveAutomaticBranchRecoveryReason(snapshot)).toBe('merge_state=BEHIND');
    expect(resolveAutomaticBranchRecoveryReason(snapshot, { requireExclusive: true })).toBeNull();
    expect(shouldAttemptAutomaticBranchRecovery(snapshot)).toBe(false);
  });
});

describe('isConflictLikeBranchRecoveryFailureMessage', () => {
  it('recognizes GitHub conflict-style update-branch failures', () => {
    expect(
      isConflictLikeBranchRecoveryFailureMessage(
        'GraphQL: This branch cannot be rebased due to conflicts'
      )
    ).toBe(true);
    expect(
      isConflictLikeBranchRecoveryFailureMessage(
        'Update failed because of merge conflicts in src/index.ts'
      )
    ).toBe(true);
  });

  it('ignores non-conflict branch refresh failures', () => {
    expect(
      isConflictLikeBranchRecoveryFailureMessage('HTTP 502 from GitHub while updating branch')
    ).toBe(false);
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

describe('isNoRequiredChecksReportedErrorMessage', () => {
  it('recognizes the gh no-required-checks response as a clean fallback case', () => {
    expect(
      isNoRequiredChecksReportedErrorMessage(
        "gh pr checks 297 --required failed: no required checks reported on the 'co-10-pre-review-feedback-drain' branch"
      )
    ).toBe(true);
    expect(
      isNoRequiredChecksReportedErrorMessage('gh pr checks 297 --required failed: transport timeout')
    ).toBe(false);
  });
});

describe('resolveGitHubRateLimitStatus', () => {
  const nowMs = Date.parse('2026-04-11T00:00:00.000Z');

  it('classifies REST primary rate limits with reset metadata', () => {
    const resetEpochSeconds = 1_777_000_000;
    const rateLimit = resolveGitHubRateLimitStatus(
      {
        args: ['pr', 'checks', '431'],
        stderr: `HTTP 403: API rate limit exceeded for user ID 123\nx-ratelimit-reset: ${resetEpochSeconds}`
      },
      { nowMs }
    );

    expect(rateLimit).toMatchObject({
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'primary',
      status: 403,
      reset_at: new Date(resetEpochSeconds * 1000).toISOString()
    });
  });

  it('classifies REST secondary throttles with retry-after metadata', () => {
    const rateLimit = resolveGitHubRateLimitStatus(
      {
        args: ['api', 'repos/asabeko/CO/issues/431/comments'],
        stderr: 'HTTP 429: You have exceeded a secondary rate limit.\nretry-after: 60'
      },
      { nowMs }
    );

    expect(rateLimit).toMatchObject({
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'secondary',
      status: 429,
      retry_after_seconds: 60,
      retry_at: '2026-04-11T00:01:00.000Z'
    });
  });

  it('classifies GraphQL RATE_LIMITED payloads', () => {
    const rateLimit = resolveGitHubRateLimitStatus(
      {
        errors: [
          {
            type: 'RATE_LIMITED',
            message: 'API rate limit exceeded for GraphQL.'
          }
        ]
      },
      { surface: 'graphql', nowMs }
    );

    expect(rateLimit).toMatchObject({
      kind: 'github_rate_limited',
      surface: 'graphql',
      limit_type: 'primary'
    });
  });

  it('does not classify parsed success payload text without transport evidence', () => {
    expect(
      resolveGitHubRateLimitStatus(
        {
          data: {
            repository: {
              pullRequest: {
                comments: {
                  nodes: [
                    {
                      body: 'Reviewer quoted: API rate limit exceeded for a different command.'
                    }
                  ]
                }
              }
            }
          }
        },
        { surface: 'graphql', nowMs }
      )
    ).toBeNull();
  });

  it('does not classify parsed success payload retry-after text without transport evidence', () => {
    expect(
      resolveGitHubRateLimitStatus(
        {
          data: {
            repository: {
              pullRequest: {
                comments: {
                  nodes: [
                    {
                      body: 'Example header from docs: retry-after: 60'
                    }
                  ]
                }
              }
            }
          }
        },
        { surface: 'graphql', nowMs }
      )
    ).toBeNull();
  });

  it('ignores out-of-range reset epochs instead of throwing', () => {
    expect(() =>
      resolveGitHubRateLimitStatus(
        {
          args: ['pr', 'checks', '431'],
          stderr: 'HTTP 403: API rate limit exceeded\nx-ratelimit-reset: 999999999999999999999'
        },
        { nowMs }
      )
    ).not.toThrow();

    expect(
      resolveGitHubRateLimitStatus(
        {
          args: ['pr', 'checks', '431'],
          stderr: 'HTTP 403: API rate limit exceeded\nx-ratelimit-reset: 999999999999999999999'
        },
        { nowMs }
      )
    ).toMatchObject({
      kind: 'github_rate_limited',
      reset_at: null
    });
  });

  it('ignores out-of-range retry-after values instead of throwing', () => {
    expect(() =>
      resolveGitHubRateLimitStatus(
        {
          args: ['pr', 'checks', '431'],
          stderr: 'HTTP 429: You have exceeded a secondary rate limit.\nretry-after: 999999999999999999999'
        },
        { nowMs }
      )
    ).not.toThrow();

    expect(
      resolveGitHubRateLimitStatus(
        {
          args: ['pr', 'checks', '431'],
          stderr: 'HTTP 429: You have exceeded a secondary rate limit.\nretry-after: 999999999999999999999'
        },
        { nowMs }
      )
    ).toMatchObject({
      kind: 'github_rate_limited',
      retry_at: null
    });
  });

  it('does not classify CodeRabbit service cooldown prose as GitHub API throttling', () => {
    expect(
      resolveGitHubRateLimitStatus(
        'CodeRabbit service cooldown: daily review rate limit reached. Please try again later.',
        { nowMs }
      )
    ).toBeNull();
  });

  it('does not classify generic REST 403 failures without rate-limit evidence', () => {
    expect(
      resolveGitHubRateLimitStatus(
        {
          args: ['api', 'repos/asabeko/CO/issues/431/comments'],
          stderr: 'HTTP 403: Resource not accessible by integration'
        },
        { nowMs }
      )
    ).toBeNull();
  });

  it('does not classify generic REST 403 failures just because reset headers are present', () => {
    expect(
      resolveGitHubRateLimitStatus(
        {
          args: ['api', 'repos/asabeko/CO/issues/431/comments'],
          stderr: 'HTTP 403: Resource not accessible by integration\nx-ratelimit-reset: 1777000000'
        },
        { nowMs }
      )
    ).toBeNull();
  });
});

describe('planGitHubRateLimitBackoff', () => {
  it('prefers reset-aware waits with bounded deterministic jitter', () => {
    const nowMs = Date.parse('2026-04-11T00:00:00.000Z');
    const retryAt = '2026-04-11T00:02:00.000Z';
    const planned = planGitHubRateLimitBackoff(
      {
        kind: 'github_rate_limited',
        surface: 'graphql',
        limit_type: 'primary',
        status: 403,
        reset_at: retryAt,
        retry_after_seconds: null,
        retry_at: null,
        message: null
      },
      {
        nowMs,
        fallbackMs: 30_000,
        maxJitterMs: 0,
        remainingMs: 180_000
      }
    );

    expect(planned).toBe(120_000);
  });

  it('caps waits to the remaining monitor budget', () => {
    const nowMs = Date.parse('2026-04-11T00:00:00.000Z');
    const planned = planGitHubRateLimitBackoff(
      {
        kind: 'github_rate_limited',
        surface: 'rest',
        limit_type: 'secondary',
        status: 429,
        reset_at: null,
        retry_after_seconds: 120,
        retry_at: null,
        message: null
      },
      {
        nowMs,
        fallbackMs: 30_000,
        maxJitterMs: 0,
        remainingMs: 15_000
      }
    );

    expect(planned).toBe(15_000);
  });

  it('uses fallback cooldown when reset metadata is stale', () => {
    const nowMs = Date.parse('2026-04-11T02:13:00.000Z');
    const planned = planGitHubRateLimitBackoff(
      {
        kind: 'github_rate_limited',
        surface: 'rest',
        limit_type: 'secondary',
        status: 429,
        reset_at: '2026-04-11T01:37:25.000Z',
        retry_after_seconds: null,
        retry_at: '2026-04-11T01:37:25.000Z',
        message: null
      },
      {
        nowMs,
        fallbackMs: 30_000,
        maxJitterMs: 0,
        remainingMs: 180_000
      }
    );

    expect(planned).toBe(30_000);
  });

  it('uses fallback cooldown when retry-after metadata is outside the valid date range', () => {
    const nowMs = Date.parse('2026-04-11T00:00:00.000Z');
    const planned = planGitHubRateLimitBackoff(
      {
        kind: 'github_rate_limited',
        surface: 'rest',
        limit_type: 'secondary',
        status: 429,
        reset_at: null,
        retry_after_seconds: 999999999999999999999,
        retry_at: null,
        message: 'HTTP 429: You have exceeded a secondary rate limit.'
      },
      {
        nowMs,
        fallbackMs: 30_000,
        maxJitterMs: 0,
        remainingMs: 180_000
      }
    );

    expect(planned).toBe(30_000);
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

describe('shouldSucceedAfterTimeout', () => {
  it('allows clean ready-review snapshots to exit successfully at the bounded timeout', () => {
    const snapshot = buildStatusSnapshot(
      makeResponse([], {
        reviewDecision: 'REVIEW_REQUIRED',
        mergeStateStatus: 'BLOCKED'
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review'
      }
    );

    expect(shouldSucceedAfterTimeout(snapshot, { readinessMode: 'review' })).toBe(true);
  });

  it('fails closed after bounded polling errors even when the last clean review snapshot looked ready', () => {
    const snapshot = buildStatusSnapshot(
      makeResponse([], {
        reviewDecision: 'REVIEW_REQUIRED',
        mergeStateStatus: 'BLOCKED'
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review'
      }
    );

    expect(shouldSucceedAfterTimeout(snapshot, { readinessMode: 'review', pollingHealthy: false })).toBe(false);
  });

  it('keeps merge mode and blocked review-handoff snapshots non-successful at timeout', () => {
    const mergeSnapshot = buildStatusSnapshot(
      makeResponse([]),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      }
    );
    const blockedReviewSnapshot = buildStatusSnapshot(
      makeResponse([], {
        reviewThreads: {
          nodes: [
            {
              isResolved: false,
              isOutdated: false
            }
          ]
        }
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review'
      }
    );

    expect(shouldSucceedAfterTimeout(mergeSnapshot)).toBe(false);
    expect(shouldSucceedAfterTimeout(blockedReviewSnapshot, { readinessMode: 'review' })).toBe(false);
  });

  it('keeps ready-review snapshots with failed required checks non-successful at timeout', () => {
    const failedRequiredChecksSnapshot = buildStatusSnapshot(
      makeResponse([], {
        reviewDecision: 'REVIEW_REQUIRED',
        mergeStateStatus: 'BLOCKED'
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'FAILURE', bucket: 'fail', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review'
      }
    );

    expect(failedRequiredChecksSnapshot.readyToMerge).toBe(false);
    expect(failedRequiredChecksSnapshot.gateReasons).toContain('required_checks_failed=1');
    expect(resolveActionRequiredReasons(failedRequiredChecksSnapshot, { readinessMode: 'review' }))
      .toContain('required_checks_failed=1');
    expect(shouldSucceedAfterTimeout(failedRequiredChecksSnapshot, { readinessMode: 'review' })).toBe(false);
  });

  it('keeps ready-review snapshots with required-check query failures non-successful at timeout', () => {
    const staleRequiredChecksSnapshot = buildStatusSnapshot(
      makeResponse([], {
        reviewDecision: 'REVIEW_REQUIRED',
        mergeStateStatus: 'BLOCKED'
      }),
      summarizeRequiredChecks([
        { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
      ]),
      {
        fetchError: false,
        unacknowledgedCount: 0
      },
      {
        readinessMode: 'review',
        requiredChecksQueryFailed: true
      }
    );

    expect(staleRequiredChecksSnapshot.readyToMerge).toBe(false);
    expect(staleRequiredChecksSnapshot.gateReasons).toContain('required_checks_query_failed');
    expect(shouldSucceedAfterTimeout(staleRequiredChecksSnapshot, { readinessMode: 'review' })).toBe(false);
  });
});

describe('runPrWatchMerge review-mode flag validation', () => {
  it('rejects valueless merge-method flags in ready-review mode', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runPrWatchMerge(['--merge-method'], { readinessMode: 'review' })).resolves.toBe(1);

    expect(errorSpy).toHaveBeenCalledWith(
      'ready-review does not support merge flags: --merge-method'
    );
  });

  it('does not retry a failed automatic branch recovery for the same head and reason', async () => {
    vi.resetModules();
    const snapshotPayloads = [
      makeResponse([], {
        mergeStateStatus: 'BEHIND',
        updatedAt: '2026-02-16T03:00:00.000Z'
      }),
      makeResponse([], {
        mergeStateStatus: 'BEHIND',
        updatedAt: '2026-02-16T03:01:00.000Z'
      }),
      makeResponse([], {
        state: 'MERGED',
        mergeStateStatus: 'CLEAN',
        mergedAt: '2026-02-16T03:02:00.000Z',
        updatedAt: '2026-02-16T03:02:00.000Z'
      })
    ];
    let snapshotIndex = 0;
    let updateBranchAttempts = 0;
    const spawnMock = vi.fn((command: string, args: string[]) => {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const child = Object.assign(new EventEmitter(), { stdout, stderr });
      let result: { exitCode: number; stdout: string; stderr: string };

      if (command !== 'gh') {
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
      }

      if (args[0] === 'auth' && args[1] === 'status') {
        result = { exitCode: 0, stdout: '', stderr: '' };
      } else if (args[0] === 'api' && args[1] === 'graphql') {
        const payload = snapshotPayloads[Math.min(snapshotIndex, snapshotPayloads.length - 1)];
        snapshotIndex += 1;
        result = { exitCode: 0, stdout: JSON.stringify(payload), stderr: '' };
      } else if (args[0] === 'pr' && args[1] === 'checks') {
        result = { exitCode: 0, stdout: '[]', stderr: '' };
      } else if (args[0] === 'pr' && args[1] === 'update-branch') {
        updateBranchAttempts += 1;
        result = {
          exitCode: 1,
          stdout: '',
          stderr: 'HTTP 502 from GitHub while updating branch'
        };
      } else if (args[0] === 'api') {
        result = { exitCode: 0, stdout: '[[]]', stderr: '' };
      } else {
        throw new Error(`Unexpected gh args: ${args.join(' ')}`);
      }

      queueMicrotask(() => {
        if (result.stdout) {
          stdout.emit('data', Buffer.from(result.stdout));
        }
        if (result.stderr) {
          stderr.emit('data', Buffer.from(result.stderr));
        }
        child.emit('close', result.exitCode);
      });

      return child as any;
    });
    const sleepMock = vi.fn(async () => undefined);
    vi.doMock('node:child_process', () => ({
      spawn: spawnMock
    }));
    vi.doMock('node:timers/promises', () => ({
      setTimeout: sleepMock
    }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { runPrWatchMerge: runPrWatchMergeWithMocks } = await import('../scripts/lib/pr-watch-merge.js');

      await expect(
        runPrWatchMergeWithMocks(
          [
            '--owner',
            'Kbediako',
            '--repo',
            'CO',
            '--pr',
            '211',
            '--interval-seconds',
            '0.001',
            '--quiet-minutes',
            '0.001',
            '--timeout-minutes',
            '1',
            '--no-exit-on-action-required'
          ],
          {
            enableAutomaticBranchRecovery: true
          }
        )
      ).resolves.toBe(0);

      expect(updateBranchAttempts).toBe(1);
      expect(snapshotIndex).toBe(3);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      vi.doUnmock('node:child_process');
      vi.doUnmock('node:timers/promises');
      vi.resetModules();
    }
  });

  it('retries automatic branch recovery after a GitHub rate-limited update-branch attempt', async () => {
    vi.resetModules();
    const snapshotPayloads = [
      makeResponse([], {
        mergeStateStatus: 'BEHIND',
        updatedAt: '2026-02-16T03:00:00.000Z'
      }),
      makeResponse([], {
        mergeStateStatus: 'BEHIND',
        updatedAt: '2026-02-16T03:01:00.000Z'
      }),
      makeResponse([], {
        state: 'MERGED',
        mergeStateStatus: 'CLEAN',
        mergedAt: '2026-02-16T03:02:00.000Z',
        updatedAt: '2026-02-16T03:02:00.000Z'
      })
    ];
    let snapshotIndex = 0;
    let updateBranchAttempts = 0;
    const spawnMock = vi.fn((command: string, args: string[]) => {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const child = Object.assign(new EventEmitter(), { stdout, stderr });
      let result: { exitCode: number; stdout: string; stderr: string };

      if (command !== 'gh') {
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
      }

      if (args[0] === 'auth' && args[1] === 'status') {
        result = { exitCode: 0, stdout: '', stderr: '' };
      } else if (args[0] === 'api' && args[1] === 'graphql') {
        const payload = snapshotPayloads[Math.min(snapshotIndex, snapshotPayloads.length - 1)];
        snapshotIndex += 1;
        result = { exitCode: 0, stdout: JSON.stringify(payload), stderr: '' };
      } else if (args[0] === 'pr' && args[1] === 'checks') {
        result = { exitCode: 0, stdout: '[]', stderr: '' };
      } else if (args[0] === 'pr' && args[1] === 'update-branch') {
        updateBranchAttempts += 1;
        result = updateBranchAttempts === 1
          ? {
              exitCode: 1,
              stdout: '',
              stderr: 'HTTP 403: API rate limit exceeded for user ID 123\nx-ratelimit-reset: 1777000000'
            }
          : {
              exitCode: 0,
              stdout: '',
              stderr: ''
            };
      } else if (args[0] === 'api') {
        result = { exitCode: 0, stdout: '[[]]', stderr: '' };
      } else {
        throw new Error(`Unexpected gh args: ${args.join(' ')}`);
      }

      queueMicrotask(() => {
        if (result.stdout) {
          stdout.emit('data', Buffer.from(result.stdout));
        }
        if (result.stderr) {
          stderr.emit('data', Buffer.from(result.stderr));
        }
        child.emit('close', result.exitCode);
      });

      return child as any;
    });
    const sleepMock = vi.fn(async () => undefined);
    vi.doMock('node:child_process', () => ({
      spawn: spawnMock
    }));
    vi.doMock('node:timers/promises', () => ({
      setTimeout: sleepMock
    }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { runPrWatchMerge: runPrWatchMergeWithMocks } = await import('../scripts/lib/pr-watch-merge.js');

      await expect(
        runPrWatchMergeWithMocks(
          [
            '--owner',
            'Kbediako',
            '--repo',
            'CO',
            '--pr',
            '211',
            '--interval-seconds',
            '0.001',
            '--quiet-minutes',
            '0.001',
            '--timeout-minutes',
            '1',
            '--no-exit-on-action-required'
          ],
          {
            enableAutomaticBranchRecovery: true
          }
        )
      ).resolves.toBe(0);

      expect(updateBranchAttempts).toBe(2);
      expect(snapshotIndex).toBe(3);
      expect(errorSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('is rate limited'));
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      vi.doUnmock('node:child_process');
      vi.doUnmock('node:timers/promises');
      vi.resetModules();
    }
  });

  it('exits on deterministic action-required blockers before rate-limit retries', async () => {
    vi.resetModules();
    const snapshotPayload = makeResponse([], {
      reviewDecision: 'CHANGES_REQUESTED',
      updatedAt: '2026-04-11T00:00:00.000Z'
    });
    let graphqlCalls = 0;
    const spawnMock = vi.fn((command: string, args: string[]) => {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const child = Object.assign(new EventEmitter(), { stdout, stderr });
      let result: { exitCode: number; stdout: string; stderr: string };

      if (command !== 'gh') {
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
      }

      if (args[0] === 'auth' && args[1] === 'status') {
        result = { exitCode: 0, stdout: '', stderr: '' };
      } else if (args[0] === 'api' && args[1] === 'graphql') {
        graphqlCalls += 1;
        result = { exitCode: 0, stdout: JSON.stringify(snapshotPayload), stderr: '' };
      } else if (args[0] === 'pr' && args[1] === 'checks') {
        result = {
          exitCode: 1,
          stdout: '',
          stderr: 'HTTP 429: You have exceeded a secondary rate limit.\nretry-after: 60'
        };
      } else if (args[0] === 'api') {
        result = { exitCode: 0, stdout: '[[]]', stderr: '' };
      } else {
        throw new Error(`Unexpected gh args: ${args.join(' ')}`);
      }

      queueMicrotask(() => {
        if (result.stdout) {
          stdout.emit('data', Buffer.from(result.stdout));
        }
        if (result.stderr) {
          stderr.emit('data', Buffer.from(result.stderr));
        }
        child.emit('close', result.exitCode);
      });

      return child as any;
    });
    const sleepMock = vi.fn(async () => undefined);
    vi.doMock('node:child_process', () => ({
      spawn: spawnMock
    }));
    vi.doMock('node:timers/promises', () => ({
      setTimeout: sleepMock
    }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { runPrWatchMerge: runPrWatchMergeWithMocks } = await import('../scripts/lib/pr-watch-merge.js');

      await expect(
        runPrWatchMergeWithMocks(
          [
            '--owner',
            'Kbediako',
            '--repo',
            'CO',
            '--pr',
            '211',
            '--interval-seconds',
            '0.001',
            '--quiet-minutes',
            '0.001',
            '--timeout-minutes',
            '1'
          ],
          {
            defaultExitOnActionRequired: true
          }
        )
      ).resolves.toBe(2);

      expect(graphqlCalls).toBe(1);
      expect(sleepMock).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Action required before merge: review=CHANGES_REQUESTED')
      );
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('GitHub API fan-out is rate limited'));
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      vi.doUnmock('node:child_process');
      vi.doUnmock('node:timers/promises');
      vi.resetModules();
    }
  });

  it('reuses same-head fan-out evidence during quiet-window polling', async () => {
    vi.resetModules();
    const snapshotPayloads = [
      makeResponse([], {
        updatedAt: '2026-04-11T00:00:00.000Z',
        mergedAt: null
      }),
      makeResponse([], {
        state: 'MERGED',
        updatedAt: '2026-04-11T00:00:00.000Z',
        mergedAt: '2026-04-11T00:00:30.000Z'
      })
    ];
    let snapshotIndex = 0;
    let graphqlCalls = 0;
    let requiredCheckCalls = 0;
    let restFanoutCalls = 0;
    const spawnMock = vi.fn((command: string, args: string[]) => {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const child = Object.assign(new EventEmitter(), { stdout, stderr });
      let result: { exitCode: number; stdout: string; stderr: string };

      if (command !== 'gh') {
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
      }

      if (args[0] === 'auth' && args[1] === 'status') {
        result = { exitCode: 0, stdout: '', stderr: '' };
      } else if (args[0] === 'api' && args[1] === 'graphql') {
        graphqlCalls += 1;
        const payload = snapshotPayloads[Math.min(snapshotIndex, snapshotPayloads.length - 1)];
        snapshotIndex += 1;
        result = { exitCode: 0, stdout: JSON.stringify(payload), stderr: '' };
      } else if (args[0] === 'pr' && args[1] === 'checks') {
        requiredCheckCalls += 1;
        result = {
          exitCode: 0,
          stdout: JSON.stringify([
            { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
          ]),
          stderr: ''
        };
      } else if (args[0] === 'api') {
        restFanoutCalls += 1;
        result = { exitCode: 0, stdout: '[[]]', stderr: '' };
      } else {
        throw new Error(`Unexpected gh args: ${args.join(' ')}`);
      }

      queueMicrotask(() => {
        if (result.stdout) {
          stdout.emit('data', Buffer.from(result.stdout));
        }
        if (result.stderr) {
          stderr.emit('data', Buffer.from(result.stderr));
        }
        child.emit('close', result.exitCode);
      });

      return child as any;
    });
    const sleepMock = vi.fn(async () => undefined);
    vi.doMock('node:child_process', () => ({
      spawn: spawnMock
    }));
    vi.doMock('node:timers/promises', () => ({
      setTimeout: sleepMock
    }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { runPrWatchMerge: runPrWatchMergeWithMocks } = await import('../scripts/lib/pr-watch-merge.js');

      await expect(
        runPrWatchMergeWithMocks([
          '--owner',
          'Kbediako',
          '--repo',
          'CO',
          '--pr',
          '211',
          '--interval-seconds',
          '0.001',
          '--quiet-minutes',
          '1',
          '--timeout-minutes',
          '1',
          '--no-exit-on-action-required'
        ])
      ).resolves.toBe(0);

      expect(graphqlCalls).toBe(2);
      expect(requiredCheckCalls).toBe(2);
      expect(restFanoutCalls).toBe(5);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      vi.doUnmock('node:child_process');
      vi.doUnmock('node:timers/promises');
      vi.resetModules();
    }
  });

  it('does not reuse same-head bot fan-out while bot re-review is pending', async () => {
    vi.resetModules();
    const snapshotPayloads = [
      makeResponse([], {
        updatedAt: '2026-04-11T00:00:00.000Z',
        mergedAt: null
      }),
      makeResponse([], {
        state: 'MERGED',
        updatedAt: '2026-04-11T00:00:00.000Z',
        mergedAt: '2026-04-11T00:00:30.000Z'
      })
    ];
    let snapshotIndex = 0;
    let issueCommentCalls = 0;
    const spawnMock = vi.fn((command: string, args: string[]) => {
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      const child = Object.assign(new EventEmitter(), { stdout, stderr });
      let result: { exitCode: number; stdout: string; stderr: string };

      if (command !== 'gh') {
        throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
      }

      if (args[0] === 'auth' && args[1] === 'status') {
        result = { exitCode: 0, stdout: '', stderr: '' };
      } else if (args[0] === 'api' && args[1] === 'graphql') {
        const payload = snapshotPayloads[Math.min(snapshotIndex, snapshotPayloads.length - 1)];
        snapshotIndex += 1;
        result = { exitCode: 0, stdout: JSON.stringify(payload), stderr: '' };
      } else if (args[0] === 'pr' && args[1] === 'checks') {
        result = {
          exitCode: 0,
          stdout: JSON.stringify([
            { name: 'corelane', state: 'SUCCESS', bucket: 'pass', link: 'https://example.com/corelane' }
          ]),
          stderr: ''
        };
      } else if (args[0] === 'api' && args[1] === 'repos/Kbediako/CO/issues/211/comments') {
        issueCommentCalls += 1;
        result = {
          exitCode: 0,
          stdout: JSON.stringify([
            [
              {
                id: 10,
                body: '@codex please re-review this iteration',
                created_at: '2026-04-11T00:00:01.000Z',
                user: { login: 'maintainer', type: 'User' }
              }
            ]
          ]),
          stderr: ''
        };
      } else if (args[0] === 'api') {
        result = { exitCode: 0, stdout: '[[]]', stderr: '' };
      } else {
        throw new Error(`Unexpected gh args: ${args.join(' ')}`);
      }

      queueMicrotask(() => {
        if (result.stdout) {
          stdout.emit('data', Buffer.from(result.stdout));
        }
        if (result.stderr) {
          stderr.emit('data', Buffer.from(result.stderr));
        }
        child.emit('close', result.exitCode);
      });

      return child as any;
    });
    const sleepMock = vi.fn(async () => undefined);
    vi.doMock('node:child_process', () => ({
      spawn: spawnMock
    }));
    vi.doMock('node:timers/promises', () => ({
      setTimeout: sleepMock
    }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { runPrWatchMerge: runPrWatchMergeWithMocks } = await import('../scripts/lib/pr-watch-merge.js');

      await expect(
        runPrWatchMergeWithMocks([
          '--owner',
          'Kbediako',
          '--repo',
          'CO',
          '--pr',
          '211',
          '--interval-seconds',
          '0.001',
          '--quiet-minutes',
          '1',
          '--timeout-minutes',
          '1',
          '--no-exit-on-action-required'
        ])
      ).resolves.toBe(0);

      expect(issueCommentCalls).toBe(2);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      vi.doUnmock('node:child_process');
      vi.doUnmock('node:timers/promises');
      vi.resetModules();
    }
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
    expect(result.terminalFailureAtMs).toBeNull();
  });

  it('classifies Codex connector terminal failure comments after the rereview request', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'codex',
      requestAtMs,
      issueComments: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: 'Codex Review: Something went wrong. Try again later by commenting @codex review.',
          created_at: '2026-02-18T04:45:00Z',
          __source: 'issue'
        }
      ],
      reviews: [],
      issueReactions: [],
      requestCommentReactions: [],
      headOid: 'abc123'
    });

    expect(result.inProgressAtMs).toBeNull();
    expect(result.completeAtMs).toBeNull();
    expect(result.terminalFailureAtMs).toBe(Date.parse('2026-02-18T04:45:00Z'));
  });

  it('ignores Codex connector terminal failure comments older than the latest request', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'codex',
      requestAtMs,
      issueComments: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: 'Codex Review: Something went wrong. Try again later by commenting @codex review.',
          created_at: '2026-02-18T04:42:00Z',
          __source: 'issue'
        }
      ],
      reviews: [],
      issueReactions: [],
      requestCommentReactions: [],
      headOid: 'abc123'
    });

    expect(result.terminalFailureAtMs).toBeNull();
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

  it('treats current-cycle issue comments with current-head completion signatures as coderabbit completion signals', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'coderabbit',
      requestAtMs,
      issueComments: [
        {
          user: { login: 'coderabbitai[bot]' },
          created_at: '2026-02-18T04:46:00Z',
          __source: 'issue',
          body: '`@maintainer`: Reviewed at head `abc123`. Everything is clean — no issues found.\n\nPR is ready to merge.'
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

  it('ignores coderabbit issue comments without a current-head completion signature and still accepts pull comments', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'coderabbit',
      requestAtMs,
      issueComments: [
        {
          user: { login: 'coderabbitai[bot]' },
          created_at: '2026-02-18T04:44:00Z',
          __source: 'issue',
          body: 'No actionable comments were generated in the recent review.'
        },
        {
          user: { login: 'coderabbitai[bot]' },
          created_at: '2026-02-18T04:44:30Z',
          __source: 'issue',
          body: '`@maintainer`: Reviewed at head `old-head`. Everything is clean — no issues found.\n\nPR is ready to merge.'
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

  it('uses updated_at for coderabbit issue comments edited after the latest rereview request', () => {
    const result = resolveBotRereviewTimingForKind({
      kind: 'coderabbit',
      requestAtMs,
      issueComments: [
        {
          user: { login: 'coderabbitai[bot]' },
          created_at: '2026-02-18T04:40:00Z',
          updated_at: '2026-02-18T04:46:00Z',
          __source: 'issue',
          body: '`@maintainer`: Reviewed at head `abc123`. Everything is clean — no issues found.\n\nPR is ready to merge.'
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

  it('does not treat acknowledgement-only coderabbit mentions as rereview requests', () => {
    const signals = resolveBotRereviewRequestMentions([
      {
        id: 14,
        body: '@coderabbitai thanks, clean rollup acknowledged.',
        created_at: '2026-02-18T04:44:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'issue'
      },
      {
        id: 15,
        body: 'Addressed the CodeRabbit comments; @coderabbitai status noted.',
        created_at: '2026-02-18T04:45:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      },
      {
        id: 16,
        body: 'I will resolve the remaining thread @coderabbitai.',
        created_at: '2026-02-18T04:46:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'review'
      },
      {
        id: 17,
        body: 'The @coderabbitai check passed.',
        created_at: '2026-02-18T04:47:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'issue'
      },
      {
        id: 19,
        body: '@coderabbitai check is green.',
        created_at: '2026-02-18T04:48:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      },
      {
        id: 21,
        body: '@coderabbitai review complete.',
        created_at: '2026-02-18T04:49:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'review'
      }
    ]);

    expect(signals.requests).toEqual({});
    expect(signals.ignoredMentions).toEqual([
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 14,
        createdAtMs: Date.parse('2026-02-18T04:44:00Z'),
        source: 'issue'
      },
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 15,
        createdAtMs: Date.parse('2026-02-18T04:45:00Z'),
        source: 'pull'
      },
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 16,
        createdAtMs: Date.parse('2026-02-18T04:46:00Z'),
        source: 'review'
      },
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 17,
        createdAtMs: Date.parse('2026-02-18T04:47:00Z'),
        source: 'issue'
      },
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 19,
        createdAtMs: Date.parse('2026-02-18T04:48:00Z'),
        source: 'pull'
      },
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 21,
        createdAtMs: Date.parse('2026-02-18T04:49:00Z'),
        source: 'review'
      }
    ]);
  });

  it('does not borrow another bot request phrase for acknowledgement-only coderabbit mentions', () => {
    const signals = resolveBotRereviewRequestMentions([
      {
        id: 18,
        body: '@codex please re-review; @coderabbitai status acknowledged.',
        created_at: '2026-02-18T04:47:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      },
      {
        id: 19,
        body: '@codex please re-review and @coderabbitai status acknowledged.',
        created_at: '2026-02-18T04:48:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'review'
      },
      {
        id: 20,
        body: '@coderabbitai thanks, please re-review @codex',
        created_at: '2026-02-18T04:49:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'issue'
      }
    ]);

    expect(signals.requests.codex).toEqual({
      commentId: 20,
      createdAtMs: Date.parse('2026-02-18T04:49:00Z'),
      source: 'issue'
    });
    expect(signals.requests.coderabbit).toBeUndefined();
    expect(signals.ignoredMentions).toEqual([
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 18,
        createdAtMs: Date.parse('2026-02-18T04:47:00Z'),
        source: 'pull'
      },
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 19,
        createdAtMs: Date.parse('2026-02-18T04:48:00Z'),
        source: 'review'
      },
      {
        kind: 'coderabbitai',
        reason: 'acknowledgement_only',
        commentId: 20,
        createdAtMs: Date.parse('2026-02-18T04:49:00Z'),
        source: 'issue'
      }
    ]);
  });

  it('keeps modal and adjacent coderabbit rereview requests blocking', () => {
    for (const body of [
      '@coderabbitai can you please re-review?',
      '@coderabbitai. Please re-review', '@coderabbitai\nplease re-review',
      '@coderabbitai please review',
      '@coderabbitai please check this',
      '@coderabbitai thanks, please re-review',
      '@coderabbitai thanks, please resolve',
      '@coderabbitai fixed it, please re-review',
      '@coderabbitai fixed the comments (commit abc123). Please re-review',
      '@coderabbitai addressed this, please resolve',
      'please re-review this iteration @coderabbitai',
      'please resolve the remaining thread @coderabbitai',
      'please review @coderabbitai',
      'please review these changes @coderabbitai',
      'can you please review the fixes @coderabbitai',
      '@codex acknowledged, please re-review @coderabbitai',
      '@coderabbitai and @codex please re-review',
      '@coderabbitai, @codex please re-review',
      'please re-review @codex and @coderabbitai',
      'please re-review @codex, @coderabbitai'
    ]) {
      const signals = resolveBotRereviewRequestMentions([
        {
          id: 20,
          body,
          created_at: '2026-02-18T04:49:00Z',
          user: { login: 'maintainer', type: 'User' },
          __source: 'pull'
        }
      ]);

      expect(signals.requests.coderabbit).toEqual({
        commentId: 20,
        createdAtMs: Date.parse('2026-02-18T04:49:00Z'),
        source: 'pull'
      });
      expect(signals.ignoredMentions).toEqual([]);
    }
  });

  it('keeps explicit coderabbit rereview and resolve requests blocking', () => {
    const requests = resolveLatestBotRereviewRequests([
      {
        id: 16,
        body: '@coderabbitai please re-review this iteration',
        created_at: '2026-02-18T04:44:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'issue'
      },
      {
        id: 17,
        body: '@coderabbitai please resolve the addressed threads',
        created_at: '2026-02-18T04:45:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'pull'
      },
      {
        id: 18,
        body: '@coderabbitai resolve the remaining thread',
        created_at: '2026-02-18T04:46:00Z',
        user: { login: 'maintainer', type: 'User' },
        __source: 'review'
      }
    ]);

    expect(requests.coderabbit.commentId).toBe(18);
    expect(requests.coderabbit.source).toBe('review');
    expect(requests.coderabbit.createdAtMs).toBe(Date.parse('2026-02-18T04:46:00Z'));
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
