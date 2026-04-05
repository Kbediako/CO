import { describe, expect, it, vi } from 'vitest';

import { runProviderDeterministicMergeCloseout } from '../src/cli/control/providerMergeCloseout.js';

describe('runProviderDeterministicMergeCloseout', () => {
  it('records merge attempt, shared-root reconciliation, and Done transition for a merge-ready attached PR', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'git@github.com:asabeko/CO.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'merged',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main...origin/main\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'Already up to date.\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main...origin/main\n',
        stderr: ''
      });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'CLEAN',
        readyToMerge: true,
        gateReasons: [],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:00:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'MERGED',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'UNKNOWN',
        readyToMerge: false,
        gateReasons: ['state=MERGED'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:01:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:00:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:00:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:00:05.000Z')
          .mockReturnValueOnce('2026-04-05T00:00:10.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:00:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/357' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand,
        transitionIssueState: vi.fn(async () => ({
          ok: true,
          operation: 'transition',
          action: 'updated',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            state: { id: 'state-done', name: 'Done', type: 'completed' }
          },
          previous_state: { id: 'state-merging', name: 'Merging', type: 'started' },
          target_state: { id: 'state-done', name: 'Done', type: 'completed' },
          source_setup: null
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done',
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 357
      },
      merge_attempt: {
        ok: true,
        exit_code: 0
      },
      shared_root: {
        status: 'reconciled',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Done',
        issue_state: 'Done',
        issue_state_type: 'completed'
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'gh',
        args: expect.arrayContaining(['pr', 'merge', '357', '--repo', 'asabeko/CO', '--match-head-commit', 'abc123'])
      })
    );
  });

  it('recovers an already-merged attached PR by reconciling shared root and transitioning Done without rerunning gh merge', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'git@github.com:asabeko/CO.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main...origin/main\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'Already up to date.\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main...origin/main\n',
        stderr: ''
      });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'MERGED',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'UNKNOWN',
      readyToMerge: false,
      gateReasons: ['state=MERGED'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-05T00:01:00.000Z',
      mergedAt: '2026-04-05T00:01:00.000Z',
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] }
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:02:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:02:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:02:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:02:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/357' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand,
        transitionIssueState: vi.fn(async () => ({
          ok: true,
          operation: 'transition',
          action: 'updated',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            state: { id: 'state-done', name: 'Done', type: 'completed' }
          },
          previous_state: { id: 'state-merging', name: 'Merging', type: 'started' },
          target_state: { id: 'state-done', name: 'Done', type: 'completed' },
          source_setup: null
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done_after_recovery',
      merge_attempt: null,
      shared_root: {
        status: 'reconciled',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Done',
        issue_state: 'Done',
        issue_state_type: 'completed'
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
  });

  it('accepts ssh shared-root GitHub origins whose repo names contain dots', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'ssh://git@github.com/asabeko/CO.control.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'merged',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main...origin/main\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'Already up to date.\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main...origin/main\n',
        stderr: ''
      });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'CLEAN',
        readyToMerge: true,
        gateReasons: [],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:03:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'MERGED',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'UNKNOWN',
        readyToMerge: false,
        gateReasons: ['state=MERGED'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:04:00.000Z',
        mergedAt: '2026-04-05T00:04:00.000Z',
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:03:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:03:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:03:05.000Z')
          .mockReturnValueOnce('2026-04-05T00:03:10.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:03:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO.control/pull/357' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand,
        transitionIssueState: vi.fn(async () => ({
          ok: true,
          operation: 'transition',
          action: 'updated',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            state: { id: 'state-done', name: 'Done', type: 'completed' }
          },
          previous_state: { id: 'state-merging', name: 'Merging', type: 'started' },
          target_state: { id: 'state-done', name: 'Done', type: 'completed' },
          source_setup: null
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done',
      pr: {
        owner: 'asabeko',
        repo: 'CO.control',
        number: 357
      }
    });
  });

  it('skips shared-root reconciliation when local main is not fast-forward-safe to origin/main', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'git@github.com:asabeko/CO.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'merged',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main...origin/main [ahead 1]\n',
        stderr: ''
      });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'CLEAN',
        readyToMerge: true,
        gateReasons: [],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:05:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'MERGED',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'UNKNOWN',
        readyToMerge: false,
        gateReasons: ['state=MERGED'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:06:00.000Z',
        mergedAt: '2026-04-05T00:06:00.000Z',
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:05:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:05:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:05:05.000Z')
          .mockReturnValueOnce('2026-04-05T00:05:10.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:05:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/357' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand,
        transitionIssueState: vi.fn(async () => ({
          ok: true,
          operation: 'transition',
          action: 'updated',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            state: { id: 'state-done', name: 'Done', type: 'completed' }
          },
          previous_state: { id: 'state-merging', name: 'Merging', type: 'started' },
          target_state: { id: 'state-done', name: 'Done', type: 'completed' },
          source_setup: null
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done',
      shared_root: {
        status: 'skipped',
        reason: 'shared_root_not_ff_only_safe',
        before_status: '## main...origin/main [ahead 1]',
        after_status: '## main...origin/main [ahead 1]'
      }
    });
    expect(runCommand).not.toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'git',
        args: ['-C', '/tmp/co', 'fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main']
      })
    );
  });

  it('skips shared-root reconciliation when the shared checkout is not on the exact main branch', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'git@github.com:asabeko/CO.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'merged',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: '## main-fix...origin/main-fix\n',
        stderr: ''
      });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'CLEAN',
        readyToMerge: true,
        gateReasons: [],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:07:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'MERGED',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'UNKNOWN',
        readyToMerge: false,
        gateReasons: ['state=MERGED'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:08:00.000Z',
        mergedAt: '2026-04-05T00:08:00.000Z',
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:07:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:07:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:07:05.000Z')
          .mockReturnValueOnce('2026-04-05T00:07:10.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:07:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/357' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand,
        transitionIssueState: vi.fn(async () => ({
          ok: true,
          operation: 'transition',
          action: 'updated',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            state: { id: 'state-done', name: 'Done', type: 'completed' }
          },
          previous_state: { id: 'state-merging', name: 'Merging', type: 'started' },
          target_state: { id: 'state-done', name: 'Done', type: 'completed' },
          source_setup: null
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done',
      shared_root: {
        status: 'skipped',
        reason: 'shared_root_not_on_main',
        before_status: '## main-fix...origin/main-fix',
        after_status: '## main-fix...origin/main-fix'
      }
    });
  });

  it('fails closed with an explicit action-required result when no attached PR is present', async () => {
    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:00:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: () => '2026-04-05T00:00:00.000Z',
        runCommand: vi.fn(async () => ({
          ok: true,
          exitCode: 0,
          stdout: 'git@github.com:asabeko/CO.git\n',
          stderr: ''
        })),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:00:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [],
            workpad_comment: null
          },
          source_setup: null
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'no_attached_pr',
      attached_pr_urls: []
    });
  });
});
