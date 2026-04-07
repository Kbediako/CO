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
            state: { id: 'state-done', name: 'Done', type: 'completed' },
            updated_at: '2026-04-05T00:00:10.000Z'
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
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T00:00:10.000Z'
      }
    });
    expect(result.issue_updated_at).toBe('2026-04-05T00:00:10.000Z');
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
            state: { id: 'state-done', name: 'Done', type: 'completed' },
            updated_at: '2026-04-05T00:02:05.000Z'
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
        issue_state_type: 'completed',
        issue_updated_at: '2026-04-05T00:02:05.000Z'
      }
    });
    expect(result.issue_updated_at).toBe('2026-04-05T00:02:05.000Z');
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
  });

  it('does not arm deterministic merge closeout when the live Linear issue is no longer in Merging', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn();
    const transitionIssueState = vi.fn();

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
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:02:30.000Z',
            workspace_id: null,
            state: { id: 'state-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/357' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'issue_no_longer_merging',
      issue_state: 'In Review',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-05T00:02:30.000Z'
    });
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(runCommand).toHaveBeenCalledTimes(1);
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

  it('dedupes attached PR URLs case-insensitively before multiple-PR arming checks', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockResolvedValueOnce({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'BLOCKED',
      readyToMerge: false,
      gateReasons: ['required_checks_pending'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-05T00:04:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: ['Core Lane'], failed: [] },
      requiredChecks: { pending: ['Core Lane'], failed: [] }
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:04:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: () => '2026-04-05T00:04:00.000Z',
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:04:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-1', title: 'PR', url: 'https://github.com/Asabeko/CO/pull/357' },
              { id: 'att-2', title: 'PR dup', url: 'https://github.com/asabeko/co/pull/357' }
            ],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand
      }
    );

    expect(result).toMatchObject({
      status: 'watching',
      reason: 'required_checks_pending',
      pr: {
        owner: 'Asabeko',
        repo: 'CO',
        number: 357
      }
    });
    expect(result.attached_pr_urls).toHaveLength(1);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
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
      status: 'action_required',
      reason: 'pending_shared_root_reconciliation',
      issue_state: 'Merging',
      issue_state_type: 'started',
      shared_root: {
        status: 'skipped',
        reason: 'shared_root_not_ff_only_safe',
        before_status: '## main...origin/main [ahead 1]',
        after_status: '## main...origin/main [ahead 1]'
      },
      linear_transition: null,
      summary:
        'Merged attached PR #357; shared-root reconciliation is pending (shared_root_not_ff_only_safe) before the Linear issue can transition to Done.'
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
      status: 'action_required',
      reason: 'pending_shared_root_reconciliation',
      issue_state: 'Merging',
      issue_state_type: 'started',
      shared_root: {
        status: 'skipped',
        reason: 'shared_root_not_on_main',
        before_status: '## main-fix...origin/main-fix',
        after_status: '## main-fix...origin/main-fix'
      },
      linear_transition: null,
      summary:
        'Merged attached PR #357; shared-root reconciliation is pending (shared_root_not_on_main) before the Linear issue can transition to Done.'
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
      attached_pr_urls: [],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: []
    });
  });

  it('selects the one remaining current same-repo candidate after ignoring a historical merged PR attachment', async () => {
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
    let replacementSnapshotReads = 0;
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 360) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-06T20:06:45.000Z',
          mergedAt: '2026-04-06T19:50:00.000Z',
          headOid: 'old360',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 372) {
        replacementSnapshotReads += 1;
        return replacementSnapshotReads === 1
          ? {
              state: 'OPEN',
              reviewDecision: 'APPROVED',
              mergeStateStatus: 'CLEAN',
              readyToMerge: true,
              gateReasons: [],
              unresolvedThreadCount: 0,
              updatedAt: '2026-04-06T20:06:45.000Z',
              mergedAt: null,
              headOid: 'new372',
              checks: { pending: [], failed: [] },
              requiredChecks: { pending: [], failed: [] }
            }
          : {
              state: 'MERGED',
              reviewDecision: 'APPROVED',
              mergeStateStatus: 'UNKNOWN',
              readyToMerge: false,
              gateReasons: ['state=MERGED'],
              unresolvedThreadCount: 0,
              updatedAt: '2026-04-06T23:58:08.645Z',
              mergedAt: '2026-04-06T23:58:08.645Z',
              headOid: 'new372',
              checks: { pending: [], failed: [] },
              requiredChecks: { pending: [], failed: [] }
            };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-81',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-06T20:06:45.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-06T20:06:45.000Z')
          .mockReturnValueOnce('2026-04-06T23:58:08.645Z')
          .mockReturnValueOnce('2026-04-06T23:58:09.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-81',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-06T20:06:45.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-360', title: 'Historical PR', url: 'https://github.com/asabeko/CO/pull/360' },
              { id: 'att-372', title: 'Replacement PR', url: 'https://github.com/asabeko/CO/pull/372' }
            ],
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
            identifier: 'CO-81',
            state: { id: 'state-done', name: 'Done', type: 'completed' },
            updated_at: '2026-04-06T23:58:09.000Z'
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
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/360',
        'https://github.com/asabeko/CO/pull/372'
      ],
      ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/360'],
      conflicting_attached_pr_urls: [],
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 372
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'gh',
        args: expect.arrayContaining(['pr', 'merge', '372', '--repo', 'asabeko/CO', '--match-head-commit', 'new372'])
      })
    );
  });

  it('recovers the already-merged replacement PR when the only other same-repo attachment is an older unmerged stale PR', async () => {
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
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 360) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'BLOCKED',
          readyToMerge: false,
          gateReasons: ['checks_pending'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-06T20:06:45.000Z',
          mergedAt: null,
          headOid: 'stale360',
          checks: { pending: ['build'], failed: [] },
          requiredChecks: { pending: ['build'], failed: [] }
        };
      }
      if (prNumber === 372) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-06T23:58:08.645Z',
          mergedAt: '2026-04-06T23:58:08.645Z',
          headOid: 'new372',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-81',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-06T23:58:08.645Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-06T23:58:08.645Z')
          .mockReturnValueOnce('2026-04-06T23:58:09.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-81',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-06T23:58:08.645Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-360', title: 'Stale PR', url: 'https://github.com/asabeko/CO/pull/360' },
              { id: 'att-372', title: 'Merged replacement PR', url: 'https://github.com/asabeko/CO/pull/372' }
            ],
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
            identifier: 'CO-81',
            state: { id: 'state-done', name: 'Done', type: 'completed' },
            updated_at: '2026-04-06T23:58:09.000Z'
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
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/360',
        'https://github.com/asabeko/CO/pull/372'
      ],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 372
      }
    });
    expect(result.summary).toContain('already merged');
    expect(result.summary).toContain('older and unmerged');
    expect(result.summary).toContain('https://github.com/asabeko/CO/pull/360');
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
  });

  it('keeps multiple_attached_prs action-required truth when multiple current same-repo candidates remain after historical filtering', async () => {
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    }));
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 360) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-06T20:06:45.000Z',
          mergedAt: '2026-04-06T19:50:00.000Z',
          headOid: 'old360',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 372 || prNumber === 373) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-06T20:06:45.000Z',
          mergedAt: null,
          headOid: `head-${String(prNumber)}`,
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-81',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-06T20:06:45.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: () => '2026-04-06T20:06:45.000Z',
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-81',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-06T20:06:45.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-360', title: 'Historical PR', url: 'https://github.com/asabeko/CO/pull/360' },
              { id: 'att-372', title: 'Replacement PR', url: 'https://github.com/asabeko/CO/pull/372' },
              { id: 'att-373', title: 'Conflicting PR', url: 'https://github.com/asabeko/CO/pull/373' }
            ],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'multiple_attached_prs',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/360',
        'https://github.com/asabeko/CO/pull/372',
        'https://github.com/asabeko/CO/pull/373'
      ],
      ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/360'],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/372',
        'https://github.com/asabeko/CO/pull/373'
      ],
      pr: null
    });
    expect(result.summary).toContain('https://github.com/asabeko/CO/pull/372');
    expect(result.summary).toContain('https://github.com/asabeko/CO/pull/373');
    expect(result.summary).toContain('https://github.com/asabeko/CO/pull/360');
    expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('preserves attached_pr_repo_mismatch behavior when attached PRs target another repository', async () => {
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
            attachments: [
              { id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/other-repo/pull/357' }
            ],
            workpad_comment: null
          },
          source_setup: null
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'attached_pr_repo_mismatch',
      attached_pr_urls: ['https://github.com/asabeko/other-repo/pull/357'],
      ignored_historical_pr_urls: [],
      conflicting_attached_pr_urls: []
    });
  });

  it('treats a closed-unmerged attached PR as action required instead of watchable', async () => {
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    }));
    const transitionIssueState = vi.fn();

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:09:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: () => '2026-04-05T00:09:00.000Z',
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:09:00.000Z',
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
        fetchSnapshot: vi.fn(async () => ({
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-05T00:09:00.000Z',
          mergedAt: null,
          headOid: 'abc123',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        })),
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'pr_closed_unmerged',
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 357
      },
      snapshot: {
        state: 'CLOSED',
        gate_reasons: ['state=CLOSED']
      }
    });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('reuses snapshot classification when merge verification reread shows new merge blockers', async () => {
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
        updatedAt: '2026-04-05T00:10:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'CHANGES_REQUESTED',
        mergeStateStatus: 'BLOCKED',
        readyToMerge: false,
        gateReasons: ['review_decision=CHANGES_REQUESTED'],
        unresolvedThreadCount: 1,
        updatedAt: '2026-04-05T00:10:30.000Z',
        mergedAt: null,
        headOid: 'def456',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      });
    const transitionIssueState = vi.fn();

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:10:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:10:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:10:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:10:00.000Z',
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
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'watching',
      reason: 'review_decision=CHANGES_REQUESTED',
      snapshot: {
        review_decision: 'CHANGES_REQUESTED',
        gate_reasons: ['review_decision=CHANGES_REQUESTED'],
        head_oid: 'def456'
      },
      merge_attempt: {
        ok: true,
        exit_code: 0
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });
});
