import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  type ProviderDocsFreshnessOwnerCloseoutRecord,
  runProviderDeterministicMergeCloseout as runProviderDeterministicMergeCloseoutImpl,
  runProviderReviewHandoffPromotion
} from '../src/cli/control/providerMergeCloseout.js';

function docsFreshnessOwnerCloseout(
  overrides: Partial<ProviderDocsFreshnessOwnerCloseoutRecord> = {}
): ProviderDocsFreshnessOwnerCloseoutRecord {
  return {
    status: 'not_current_owner',
    terminal_transition_blocked: false,
    reason: 'rolling_freshness_owner_is_different_issue',
    policy_owner_issue: 'CO-431',
    policy_canonical_owner_key: 'docs:freshness:maintain',
    freshness_decision: null,
    owner_issue: null,
    owner_issue_action: null,
    owner_issue_verification: null,
    owner_finalizer: null,
    candidate_cohorts: [],
    blocking_changed_paths: null,
    command: null,
    args: null,
    exit_code: null,
    ok: null,
    stdout: null,
    stderr: null,
    parse_error: null,
    report_path: null,
    ...overrides
  };
}

const runProviderDeterministicMergeCloseout: typeof runProviderDeterministicMergeCloseoutImpl = (
  input,
  deps = {}
) =>
  runProviderDeterministicMergeCloseoutImpl(input, deps.resolveDocsFreshnessOwnerCloseout
    ? deps
    : { ...deps, resolveDocsFreshnessOwnerCloseout: vi.fn(async () => docsFreshnessOwnerCloseout()) });

const CO444_ISSUE_UPDATED_AT = '2026-04-30T08:44:00.000Z';
const CO444_NOW = '2026-04-30T08:46:00.000Z';

function okCommand(stdout = '') {
  return { ok: true, exitCode: 0, stdout, stderr: '' };
}

function mergedRunCommand() {
  return vi
    .fn()
    .mockResolvedValueOnce(okCommand('git@github.com:asabeko/CO.git\n'))
    .mockResolvedValueOnce(okCommand('## main...origin/main\n'))
    .mockResolvedValueOnce(okCommand())
    .mockResolvedValueOnce(okCommand('Already up to date.\n'))
    .mockResolvedValueOnce(okCommand('## main...origin/main\n'));
}

function mergedSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    state: 'MERGED',
    reviewDecision: 'APPROVED',
    mergeStateStatus: 'UNKNOWN',
    readyToMerge: false,
    gateReasons: ['state=MERGED'],
    unresolvedThreadCount: 0,
    updatedAt: '2026-04-30T08:45:00.000Z',
    mergedAt: '2026-04-30T08:45:00.000Z',
    headOid: 'abc123',
    checks: { pending: [], failed: [] },
    requiredChecks: { pending: [], failed: [] },
    ...overrides
  };
}

function readMergingIssueContext(issueUpdatedAt = CO444_ISSUE_UPDATED_AT) {
  return vi.fn(async () => ({
    ok: true as const,
    operation: 'issue-context' as const,
    issue: {
      id: 'lin-co-444',
      identifier: 'CO-444',
      title: 'Docs freshness owner renewal',
      description: null,
      url: null,
      updated_at: issueUpdatedAt,
      workspace_id: null,
      state: { id: 'state-merging', name: 'Merging', type: 'started' },
      team: null,
      project: null,
      comments: [],
      attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/730' }],
      workpad_comment: null
    },
    source_setup: null
  }));
}

function transitionToState(defaultName: 'Backlog' | 'Blocked' | 'Done', updatedAt = CO444_NOW) {
  return vi.fn(async (input: { stateName?: 'Backlog' | 'Blocked' | 'Done' } = {}) => {
    const name = input.stateName ?? defaultName;
    const type = name === 'Done' ? 'completed' : name === 'Backlog' ? 'backlog' : 'started';
    return {
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-co-444',
        identifier: 'CO-444',
        state: { id: `state-${name.toLowerCase()}`, name, type },
        updated_at: updatedAt
      },
      previous_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      target_state: { id: `state-${name.toLowerCase()}`, name, type },
      source_setup: null
    };
  });
}

async function runMergedCloseoutFixture(input: {
  repoRoot?: string;
  now?: string;
  issueUpdatedAt?: string;
  transitionState?: 'Backlog' | 'Blocked' | 'Done';
  docsFreshnessOwner?: ProviderDocsFreshnessOwnerCloseoutRecord;
  useDefaultDocsFreshnessResolver?: boolean;
  omitIssueIdentifier?: boolean;
}) {
  const issueUpdatedAt = input.issueUpdatedAt ?? CO444_ISSUE_UPDATED_AT;
  const transitionIssueState = transitionToState(input.transitionState ?? 'Blocked', input.now ?? CO444_NOW);
  const deps = {
    now: vi.fn().mockReturnValue(input.now ?? CO444_NOW),
    readIssueContext: readMergingIssueContext(issueUpdatedAt),
    fetchSnapshot: vi.fn().mockResolvedValue(mergedSnapshot()),
    resolveSnapshotActionRequiredReasons: vi.fn(() => []),
    runCommand: mergedRunCommand(),
    transitionIssueState,
    ...(input.docsFreshnessOwner
      ? { resolveDocsFreshnessOwnerCloseout: vi.fn(async () => input.docsFreshnessOwner!) }
      : {})
  };
  const result = await (input.useDefaultDocsFreshnessResolver
    ? runProviderDeterministicMergeCloseoutImpl
    : runProviderDeterministicMergeCloseout)(
    {
      issueId: 'lin-co-444',
      ...(input.omitIssueIdentifier ? {} : { issueIdentifier: 'CO-444' }),
      issueState: 'Merging',
      issueStateType: 'started',
      issueUpdatedAt,
      repoRoot: input.repoRoot ?? '/tmp/co'
    },
    deps
  );
  return { result, transitionIssueState };
}

async function writeDocsFreshnessFixtureRepo(input: {
  repoRoot: string;
  catalog: Record<string, unknown>;
  maintainDecision?: Record<string, unknown>;
  maintainExitCode?: number;
}) {
  await mkdir(join(input.repoRoot, 'docs'), { recursive: true });
  await writeFile(join(input.repoRoot, 'docs', 'docs-catalog.json'), JSON.stringify(input.catalog), 'utf8');
  if (!input.maintainDecision) {
    return;
  }
  await writeFile(
    join(input.repoRoot, 'package.json'),
    JSON.stringify({ scripts: { 'docs:freshness:maintain': 'node maintain.mjs' } }),
    'utf8'
  );
  await writeFile(
    join(input.repoRoot, 'maintain.mjs'),
    [
      `console.log(${JSON.stringify(JSON.stringify(input.maintainDecision))});`,
      Number.isInteger(input.maintainExitCode) && input.maintainExitCode !== 0
        ? `process.exitCode = ${input.maintainExitCode};`
        : ''
    ]
      .filter(Boolean)
      .join('\n') + '\n',
    'utf8'
  );
}

function canonicalDocsFreshnessCatalog() {
  return {
    policies: {
      rolling_freshness_cohorts: {
        canonical_owner_key: 'docs:freshness:maintain',
        owner_issue: 'CO-444'
      }
    }
  };
}

function ownerMaintenanceDecision(overrides: Record<string, unknown> = {}) {
  return {
    freshness_decision: 'pass_with_owned_rolling_debt',
    owner_issue: 'CO-444',
    owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
    owner_issue_verification: {
      issue: 'CO-444',
      state: 'Blocked',
      state_type: 'started',
      is_terminal: false,
      usable: true
    },
    candidate_cohorts: [{ id: 'co-420-apr-28-march-28-task-packet-mirror' }],
    blocking_changed_paths: [],
    ...overrides
  };
}

describe('runProviderDeterministicMergeCloseout', () => {
  it('records GitHub API rate limits as transient merge-closeout evidence', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'graphql',
      limit_type: 'primary',
      status: 403,
      reset_at: '2026-04-11T00:05:00.000Z',
      retry_after_seconds: null,
      retry_at: '2026-04-11T00:05:00.000Z',
      message: 'GraphQL: API rate limit exceeded.'
    };
    const error = Object.assign(new Error('GraphQL: API rate limit exceeded.'), {
      githubRateLimit
    });
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockRejectedValueOnce(error);

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-151',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-11T00:00:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-151',
            title: 'GitHub API backoff',
            description: null,
            url: null,
            updated_at: '2026-04-11T00:00:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/431' }],
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
      reason: 'github_rate_limited',
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 431
      },
      snapshot: null,
      github_rate_limit: githubRateLimit
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('reads snake_case embedded GitHub API rate-limit errors', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'secondary',
      status: 429,
      reset_at: null,
      retry_after_seconds: 60,
      retry_at: '2026-04-11T00:01:00.000Z',
      message: 'HTTP 429: You have exceeded a secondary rate limit.'
    };
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockRejectedValueOnce({
      github_rate_limit: githubRateLimit
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-151',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-11T00:00:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-151',
            title: 'GitHub API backoff',
            description: null,
            url: null,
            updated_at: '2026-04-11T00:00:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/431' }],
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
      reason: 'github_rate_limited',
      snapshot: null,
      github_rate_limit: githubRateLimit
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('preserves snapshot-backed GitHub API rate-limit evidence at the top level', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'secondary',
      status: 429,
      reset_at: null,
      retry_after_seconds: 60,
      retry_at: '2026-04-11T00:01:00.000Z',
      message: 'HTTP 429: You have exceeded a secondary rate limit.'
    };
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockResolvedValueOnce({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'UNKNOWN',
      readyToMerge: false,
      gateReasons: [],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-11T00:00:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] },
      githubRateLimit
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-151',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-11T00:00:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-151',
            title: 'GitHub API backoff',
            description: null,
            url: null,
            updated_at: '2026-04-11T00:00:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/431' }],
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
      reason: 'github_rate_limited',
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 431
      },
      github_rate_limit: githubRateLimit
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('keeps action-required snapshot blockers ahead of GitHub API rate-limit watching', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'primary',
      status: 403,
      reset_at: '2026-04-11T00:05:00.000Z',
      retry_after_seconds: null,
      retry_at: '2026-04-11T00:05:00.000Z',
      message: 'HTTP 403: API rate limit exceeded.'
    };
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockResolvedValueOnce({
      state: 'OPEN',
      reviewDecision: 'CHANGES_REQUESTED',
      mergeStateStatus: 'BLOCKED',
      readyToMerge: false,
      gateReasons: ['review=CHANGES_REQUESTED'],
      unresolvedThreadCount: 1,
      updatedAt: '2026-04-11T00:00:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] },
      githubRateLimit
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-151',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-11T00:00:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-151',
            title: 'GitHub API backoff',
            description: null,
            url: null,
            updated_at: '2026-04-11T00:00:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/431' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => ['review=CHANGES_REQUESTED']),
        runCommand
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'review=CHANGES_REQUESTED',
      github_rate_limit: null
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('preserves merge command failure when post-merge verification is GitHub rate-limited', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'graphql',
      limit_type: 'primary',
      status: 403,
      reset_at: '2026-04-11T00:05:00.000Z',
      retry_after_seconds: null,
      retry_at: '2026-04-11T00:05:00.000Z',
      message: 'GraphQL: API rate limit exceeded.'
    };
    const error = Object.assign(new Error('GraphQL: API rate limit exceeded.'), {
      githubRateLimit
    });
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'git@github.com:asabeko/CO.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: 'merge failed'
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
        updatedAt: '2026-04-11T00:00:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockRejectedValueOnce(error);

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-151',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-11T00:00:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-151',
            title: 'GitHub API backoff',
            description: null,
            url: null,
            updated_at: '2026-04-11T00:00:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/431' }],
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
      status: 'merge_failed',
      reason: 'merge_command_failed',
      merge_attempt: {
        ok: false,
        exit_code: 1,
        stderr: 'merge failed'
      },
      github_rate_limit: githubRateLimit
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(runCommand).toHaveBeenCalledTimes(2);
  });

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
          cache_fallback_used: true,
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

  it('moves a merged docs:freshness:maintain live-owner issue to Backlog instead of Done', async () => {
    const { result, transitionIssueState } = await runMergedCloseoutFixture({
      docsFreshnessOwner: docsFreshnessOwnerCloseout({
        status: 'evidence_checked',
        terminal_transition_blocked: true,
        reason: 'current_issue_owns_docs_freshness_rolling_debt',
        policy_owner_issue: 'CO-444',
        freshness_decision: 'pass_with_owned_rolling_debt',
        owner_issue: 'CO-444',
        owner_issue_action: {
          duplicate_policy: 'one_owner_issue_per_canonical_owner_key',
          canonical_owner_key: 'docs:freshness:maintain',
          mode: 'update_existing',
          issue: 'CO-444',
          existing_issue: null,
          reason: 'succeeded'
        },
        owner_issue_verification: {
          issue: 'CO-444',
          state: 'Blocked',
          state_type: 'started',
          is_terminal: false,
          usable: true,
          verification_status: 'succeeded'
        },
        candidate_cohorts: [{ id: 'co-420-apr-28-march-28-task-packet-mirror' }],
        blocking_changed_paths: []
      })
    });

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'docs_freshness_live_owner_blocks_done_transition',
      issue_state: 'Backlog',
      issue_state_type: 'backlog',
      shared_root: {
        status: 'reconciled',
        reason: 'shared_root_reconciled'
      },
      docs_freshness_owner: {
        terminal_transition_blocked: true,
        freshness_decision: 'pass_with_owned_rolling_debt',
        owner_issue: 'CO-444',
        blocking_changed_paths: []
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Backlog',
        issue_state: 'Backlog',
        issue_state_type: 'backlog'
      }
    });
    expect(result.summary).toContain('moved the issue to Backlog instead of transitioning it to Done');
    expect(transitionIssueState).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-co-444',
      stateName: 'Backlog',
      expectedStateName: 'Merging',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-30T08:44:00.000Z'
    }));
  });

  it('treats restore-existing-owner finalizer evidence as valid live-owner closeout evidence', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-restore-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'block_unowned_repo_debt',
          owner_issue: 'CO-444',
          owner_issue_action: {
            mode: 'restore_existing_owner',
            issue: 'CO-444',
            existing_issue: 'CO-444',
            reason: 'move_to_backlog_not_done',
            owner_lifecycle: 'active_owner',
            target_state: 'Backlog',
            target_state_type: 'backlog'
          },
          owner_finalizer: {
            status: 'restore_existing_owner',
            blocking_owner_issue: 'CO-444',
            active_owner_issue: 'CO-444',
            active_owner_issues: ['CO-444'],
            active_owner_records: [
              {
                owner_issue: 'CO-444',
                canonical_owner_key: 'docs:freshness:maintain',
                owner_lifecycle: 'active_owner',
                owner_issue_action_mode: 'restore_existing_owner',
                cohort_id: 'co-420-apr-28-march-28-task-packet-mirror'
              }
            ],
            canonical_owner_key: 'docs:freshness:maintain',
            active_canonical_owner_key: 'docs:freshness:maintain',
            reason: 'move_to_backlog_not_done',
            target_state: 'Backlog',
            target_state_type: 'backlog'
          },
          candidate_cohorts: [
            {
              id: 'co-420-apr-28-march-28-task-packet-mirror',
              canonical_owner_key: 'docs:freshness:maintain',
              owner_issue: 'CO-444',
              owner_issue_action: {
                mode: 'restore_existing_owner',
                issue: 'CO-444',
                owner_lifecycle: 'active_owner'
              }
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition',
        docs_freshness_owner: {
          status: 'evidence_checked',
          terminal_transition_blocked: true,
          owner_finalizer: {
            status: 'restore_existing_owner',
            active_owner_issue: 'CO-444',
            target_state: 'Backlog'
          }
        },
        linear_transition: {
          target_state: 'Backlog',
          issue_state: 'Backlog',
          issue_state_type: 'backlog'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Backlog'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('keeps Done closeout when exact cohort owner mapping has no active freshness candidates', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-policy-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: {
          policies: {
            rolling_freshness_cohorts: {
              canonical_owner_key: 'docs:freshness:maintain',
              owner_issue: 'CO-444',
              canonical_owner_issues: [{ canonical_owner_key: 'baseline:clean', owner_issue: 'CO-444' }]
            }
          }
        },
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'clean',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          owner_finalizer: {
            status: 'not_applicable',
            active_owner_issue: null,
            active_canonical_owner_key: null,
            ignored_terminal_owner_issues: []
          },
          candidate_cohorts: [],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true,
        transitionState: 'Done',
        omitIssueIdentifier: true
      });

      expect(result).toMatchObject({
        status: 'merged',
        reason: 'merged_and_transitioned_done_after_recovery',
        docs_freshness_owner: {
          policy_owner_issue: 'CO-444',
          policy_canonical_owner_key: 'docs:freshness:maintain',
          terminal_transition_blocked: false,
          owner_issue: 'CO-444',
          owner_finalizer: {
            status: 'not_applicable',
            active_owner_issue: null,
            active_canonical_owner_key: null,
            ignored_terminal_owner_issues: []
          },
          blocking_changed_paths: []
        },
        linear_transition: {
          target_state: 'Done'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Done'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when docs:freshness owner policy cannot be read', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-policy-read-'));
    try {
      await mkdir(join(repoRoot, 'docs'), { recursive: true });
      await writeFile(join(repoRoot, 'docs', 'docs-catalog.json'), '{', 'utf8');
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_owner_evidence_unavailable',
        summary: expect.stringContaining('owner evidence could not be verified'),
        docs_freshness_owner: {
          status: 'evidence_unavailable',
          terminal_transition_blocked: true,
          reason: expect.stringContaining('policy_read_failed')
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when docs freshness owner finalizer evidence is missing', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-missing-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'pass_with_owned_rolling_debt',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          candidate_cohorts: [
            {
              id: 'co-420-apr-28-march-28-task-packet-mirror',
              canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror',
              owner_issue: 'CO-444'
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_owner_evidence_unavailable',
        docs_freshness_owner: {
          status: 'evidence_unavailable',
          terminal_transition_blocked: true,
          reason: expect.stringContaining('owner_finalizer_missing'),
          owner_finalizer: null
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when docs freshness owner finalizer evidence is malformed', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-malformed-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'pass_with_owned_rolling_debt',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          owner_finalizer: {},
          candidate_cohorts: [
            {
              id: 'co-420-apr-28-march-28-task-packet-mirror',
              canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror',
              owner_issue: 'CO-444'
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_owner_evidence_unavailable',
        docs_freshness_owner: {
          status: 'evidence_unavailable',
          terminal_transition_blocked: true,
          reason: 'owner_finalizer_malformed',
          owner_finalizer: {}
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when docs freshness owner finalizer contradicts active candidate debt', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-stale-na-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'pass_with_owned_rolling_debt',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          owner_finalizer: {
            status: 'not_applicable',
            active_owner_issue: null,
            active_owner_issues: [],
            active_owner_records: [],
            active_canonical_owner_key: null,
            ignored_terminal_owner_issues: []
          },
          candidate_cohorts: [
            {
              id: 'co-420-apr-28-march-28-task-packet-mirror',
              canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror',
              owner_issue: 'CO-444'
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_owner_evidence_unavailable',
        docs_freshness_owner: {
          status: 'evidence_unavailable',
          terminal_transition_blocked: true,
          reason: 'owner_finalizer_malformed',
          owner_finalizer: {
            status: 'not_applicable'
          }
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when docs freshness owner finalizer active owners do not match candidates', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-stale-passed-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'pass_with_owned_rolling_debt',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          owner_finalizer: {
            status: 'passed_active_owner_finalizer',
            active_owner_issue: 'CO-568',
            active_owner_issues: ['CO-568'],
            active_owner_records: [
              {
                owner_issue: 'CO-568',
                canonical_owner_key: 'baseline_cohort_id:other-active-owner',
                cohort_id: 'other-active-owner'
              }
            ],
            active_canonical_owner_key: 'baseline_cohort_id:other-active-owner',
            ignored_terminal_owner_issues: []
          },
          candidate_cohorts: [
            {
              id: 'co-420-apr-28-march-28-task-packet-mirror',
              canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror',
              owner_issue: 'CO-444'
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_owner_evidence_unavailable',
        docs_freshness_owner: {
          status: 'evidence_unavailable',
          terminal_transition_blocked: true,
          reason: 'owner_finalizer_malformed',
          owner_finalizer: {
            status: 'passed_active_owner_finalizer',
            active_owner_issue: 'CO-568',
            active_owner_issues: ['CO-568']
          }
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when docs freshness maintain exits non-zero after printing parseable JSON', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-maintain-nonzero-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'clean',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          owner_finalizer: {
            status: 'not_applicable',
            active_owner_issue: null,
            active_canonical_owner_key: null,
            ignored_terminal_owner_issues: []
          },
          candidate_cohorts: [],
          blocking_changed_paths: []
        }),
        maintainExitCode: 1
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_owner_evidence_unavailable',
        docs_freshness_owner: {
          status: 'evidence_unavailable',
          terminal_transition_blocked: true,
          reason: 'docs_freshness_owner_command_failed',
          exit_code: 1,
          ok: false,
          freshness_decision: 'clean',
          owner_finalizer: {
            status: 'not_applicable'
          }
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('blocks Done closeout when docs freshness owner finalizer reports a terminal owner blocker', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-blocked-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'pass_with_owned_rolling_debt',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          owner_finalizer: {
            status: 'blocked_terminal_owner',
            blocking_owner_issue: 'CO-444',
            canonical_owner_key: 'docs:freshness:maintain',
            reason: 'owner_terminal_after_candidate_resolution'
          },
          candidate_cohorts: [
            {
              id: 'co-420-apr-28-march-28-task-packet-mirror',
              canonical_owner_key: 'docs:freshness:maintain',
              owner_issue: 'CO-444'
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition',
        docs_freshness_owner: {
          terminal_transition_blocked: true,
          owner_finalizer: {
            status: 'blocked_terminal_owner',
            blocking_owner_issue: 'CO-444',
            canonical_owner_key: 'docs:freshness:maintain',
            reason: 'owner_terminal_after_candidate_resolution'
          }
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('moves a restore-existing docs freshness owner to Backlog instead of Done', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-restore-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'pass_with_owned_rolling_debt',
          owner_issue: 'CO-444',
          owner_issue_action: {
            mode: 'restore_existing_owner',
            issue: 'CO-444',
            existing_issue: 'CO-444',
            reason: 'move_to_backlog_not_done',
            owner_lifecycle: 'active_owner'
          },
          owner_finalizer: {
            status: 'restore_existing_owner',
            active_owner_issue: 'CO-444',
            active_owner_issues: ['CO-444'],
            active_owner_records: [
              {
                owner_issue: 'CO-444',
                canonical_owner_key: 'docs:freshness:maintain',
                owner_lifecycle: 'active_owner',
                owner_issue_action_mode: 'restore_existing_owner'
              }
            ],
            active_canonical_owner_key: 'docs:freshness:maintain',
            blocking_owner_issue: 'CO-444',
            canonical_owner_key: 'docs:freshness:maintain',
            reason: 'move_to_backlog_not_done',
            target_state: 'Backlog',
            target_state_type: 'backlog',
            ignored_terminal_owner_issues: []
          },
          candidate_cohorts: [
            {
              id: 'co-579-active-owner',
              canonical_owner_key: 'docs:freshness:maintain',
              owner_issue: 'CO-444',
              owner_issue_action: {
                mode: 'restore_existing_owner',
                issue: 'CO-444',
                canonical_owner_key: 'docs:freshness:maintain'
              }
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true,
        transitionState: 'Backlog'
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition',
        docs_freshness_owner: {
          terminal_transition_blocked: true,
          owner_finalizer: {
            status: 'restore_existing_owner',
            blocking_owner_issue: 'CO-444',
            target_state: 'Backlog',
            reason: 'move_to_backlog_not_done'
          }
        },
        linear_transition: {
          target_state: 'Backlog'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Backlog'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('blocks Done closeout when owner finalizer verification is unavailable for a rehomed owner', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-finalizer-verification-unavailable-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: {
          policies: {
            rolling_freshness_cohorts: {
              canonical_owner_key: 'docs:freshness:maintain',
              owner_issue: 'CO-444',
              canonical_owner_issues: [
                {
                  canonical_owner_key: 'baseline_cohort_id:active-owner',
                  owner_issue: 'CO-568'
                }
              ]
            }
          }
        },
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'pass_with_owned_rolling_debt',
          owner_issue: 'CO-444',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-444', reason: 'succeeded' },
          owner_finalizer: {
            status: 'blocked_owner_verification_unavailable',
            blocking_owner_issue: 'CO-568',
            active_owner_issue: 'CO-568',
            active_owner_issues: ['CO-568'],
            active_owner_records: [
              {
                owner_issue: 'CO-568',
                canonical_owner_key: 'baseline_cohort_id:active-owner',
                cohort_id: 'active-owner'
              }
            ],
            canonical_owner_key: 'baseline_cohort_id:active-owner',
            active_canonical_owner_key: 'baseline_cohort_id:active-owner',
            reason: 'owner_verification_unavailable'
          },
          candidate_cohorts: [
            {
              id: 'active-owner',
              canonical_owner_key: 'baseline_cohort_id:active-owner',
              owner_issue: 'CO-568'
            }
          ],
          blocking_changed_paths: []
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition',
        docs_freshness_owner: {
          terminal_transition_blocked: true,
          policy_owner_issue: 'CO-444',
          owner_finalizer: {
            status: 'blocked_owner_verification_unavailable',
            blocking_owner_issue: 'CO-568',
            active_owner_issue: 'CO-568',
            active_owner_issues: ['CO-568'],
            reason: 'owner_verification_unavailable'
          }
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('blocks non-clean current-owner docs:freshness decisions without candidate cohorts', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-blocking-owner-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: canonicalDocsFreshnessCatalog(),
        maintainDecision: ownerMaintenanceDecision({
          freshness_decision: 'block_diff_local',
          candidate_cohorts: [],
          blocking_changed_paths: ['docs/TASKS.md']
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition',
        docs_freshness_owner: {
          terminal_transition_blocked: true,
          freshness_decision: 'block_diff_local',
          owner_issue: 'CO-444',
          candidate_cohorts: [],
          blocking_changed_paths: ['docs/TASKS.md']
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('ignores non-canonical top-level rolling freshness policy data', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-top-level-policy-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: {
          rolling_freshness_cohorts: {
            canonical_owner_key: 'docs:freshness:maintain',
            owner_issue: 'CO-444'
          }
        }
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true,
        transitionState: 'Done'
      });

      expect(result).toMatchObject({
        status: 'merged',
        docs_freshness_owner: {
          status: 'not_configured',
          terminal_transition_blocked: false,
          reason: 'rolling_freshness_owner_not_configured',
          policy_owner_issue: null,
          policy_canonical_owner_key: null
        },
        linear_transition: {
          target_state: 'Done'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Done'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('keeps normal Done closeout when docs:freshness:maintain ownership is re-homed', async () => {
    const { result, transitionIssueState } = await runMergedCloseoutFixture({
      issueUpdatedAt: '2026-04-30T09:09:00.000Z',
      now: '2026-04-30T09:11:00.000Z',
      transitionState: 'Done',
      docsFreshnessOwner: docsFreshnessOwnerCloseout({
        policy_owner_issue: 'CO-431',
        owner_issue: 'CO-431',
        freshness_decision: 'pass_with_owned_rolling_debt'
      })
    });

    expect(result).toMatchObject({
      status: 'merged',
      reason: 'merged_and_transitioned_done_after_recovery',
      docs_freshness_owner: {
        terminal_transition_blocked: false,
        policy_owner_issue: 'CO-431'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Done',
        issue_state: 'Done'
      }
    });
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      stateName: 'Done'
    }));
  });

  it('blocks Done closeout when the current issue owns a docs freshness cohort via canonical owner mapping', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-canonical-owner-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: {
          policies: {
            rolling_freshness_cohorts: {
              canonical_owner_key: 'docs:freshness:maintain',
              owner_issue: 'CO-431',
              canonical_owner_issues: [
                {
                  canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror',
                  owner_issue: 'CO-444'
                }
              ]
            }
          }
        },
        maintainDecision: ownerMaintenanceDecision({
          owner_issue: 'CO-431',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-431', reason: 'succeeded' },
          owner_finalizer: {
            status: 'blocked_terminal_owner',
            active_owner_issue: 'CO-444',
            blocking_owner_issue: 'CO-444',
            active_canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror',
            reason: 'owner_terminal_after_candidate_resolution'
          },
          candidate_cohorts: [
            {
              id: 'co-420-apr-28-march-28-task-packet-mirror',
              canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror',
              owner_issue: 'CO-444',
              owner_issue_action: {
                mode: 'update_existing',
                issue: 'CO-444',
                reason: 'canonical_owner_key_match'
              },
              owner_issue_resolution: {
                mode: 'canonical_owner_key_match',
                source: 'rolling_freshness_policy.canonical_owner_issues'
              }
            }
          ]
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true,
        transitionState: 'Blocked'
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition',
        docs_freshness_owner: {
          terminal_transition_blocked: true,
          policy_owner_issue: 'CO-431',
          owner_issue: 'CO-431',
          owner_finalizer: {
            status: 'blocked_terminal_owner',
            active_owner_issue: 'CO-444',
            blocking_owner_issue: 'CO-444',
            active_canonical_owner_key: 'baseline_cohort_id:co-420-apr-28-march-28-task-packet-mirror'
          },
          candidate_cohorts: [
            {
              owner_issue: 'CO-444',
              owner_issue_resolution: { mode: 'canonical_owner_key_match' }
            }
          ]
        },
        linear_transition: {
          target_state: 'Blocked'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Blocked'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('moves the current issue to Backlog when it is the second active docs freshness owner', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-merge-closeout-docs-second-active-owner-'));
    try {
      await writeDocsFreshnessFixtureRepo({
        repoRoot,
        catalog: {
          policies: {
            rolling_freshness_cohorts: {
              canonical_owner_key: 'docs:freshness:maintain',
              owner_issue: 'CO-431',
              canonical_owner_issues: [
                {
                  canonical_owner_key: 'baseline_cohort_id:first-active-owner',
                  owner_issue: 'CO-445'
                },
                {
                  canonical_owner_key: 'baseline_cohort_id:second-active-owner',
                  owner_issue: 'CO-444'
                }
              ]
            }
          }
        },
        maintainDecision: ownerMaintenanceDecision({
          owner_issue: 'CO-431',
          owner_issue_action: { mode: 'update_existing', issue: 'CO-431', reason: 'succeeded' },
          owner_finalizer: {
            status: 'passed_active_owner_finalizer',
            active_owner_issue: 'CO-445',
            active_owner_issues: ['CO-445', 'CO-444'],
            active_owner_records: [
              {
                owner_issue: 'CO-445',
                canonical_owner_key: 'baseline_cohort_id:first-active-owner',
                cohort_id: 'first-active-owner'
              },
              {
                owner_issue: 'CO-444',
                canonical_owner_key: 'baseline_cohort_id:second-active-owner',
                cohort_id: 'second-active-owner'
              }
            ],
            active_canonical_owner_key: 'baseline_cohort_id:first-active-owner',
            ignored_terminal_owner_issues: []
          },
          candidate_cohorts: [
            {
              id: 'first-active-owner',
              canonical_owner_key: 'baseline_cohort_id:first-active-owner',
              owner_issue: 'CO-445',
              owner_issue_resolution: {
                mode: 'canonical_owner_key_match',
                source: 'rolling_freshness_policy.canonical_owner_issues'
              }
            },
            {
              id: 'second-active-owner',
              canonical_owner_key: 'baseline_cohort_id:second-active-owner',
              owner_issue: 'CO-444',
              owner_issue_resolution: {
                mode: 'canonical_owner_key_match',
                source: 'rolling_freshness_policy.canonical_owner_issues'
              }
            }
          ]
        })
      });
      const { result, transitionIssueState } = await runMergedCloseoutFixture({
        repoRoot,
        useDefaultDocsFreshnessResolver: true
      });

      expect(result).toMatchObject({
        status: 'action_required',
        reason: 'docs_freshness_live_owner_blocks_done_transition',
        docs_freshness_owner: {
          terminal_transition_blocked: true,
          policy_owner_issue: 'CO-431',
          owner_finalizer: {
            status: 'passed_active_owner_finalizer',
            active_owner_issue: 'CO-445',
            active_owner_issues: ['CO-445', 'CO-444'],
            active_owner_records: [
              { owner_issue: 'CO-445' },
              { owner_issue: 'CO-444' }
            ]
          }
        },
        linear_transition: {
          target_state: 'Backlog'
        }
      });
      expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
        stateName: 'Backlog'
      }));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  it('treats merged recovery as authoritative when shared-root reconciliation succeeded but the Done transition is cooldown-suppressed', async () => {
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
        mode: 'probe-merged-recovery',
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
          ok: false,
          operation: 'transition',
          error: {
            code: 'linear_rate_limited',
            message: 'Linear shared budget cooldown is active.',
            status: 429,
            retryable: true
          }
        }))
      }
    );

    expect(result).toMatchObject({
      status: 'merged',
      reason: 'merged_and_shared_root_reconciled_transition_deferred',
      issue_state: 'Merging',
      issue_state_type: 'started',
      snapshot: {
        state: 'MERGED',
        merged_at: '2026-04-05T00:01:00.000Z'
      },
      shared_root: {
        status: 'reconciled',
        reason: 'shared_root_reconciled'
      },
      linear_transition: {
        status: 'failed',
        target_state: 'Done',
        error: 'linear_rate_limited: Linear shared budget cooldown is active.'
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
  });

  it('keeps probe-mode merged recovery read-only when cached issue context predates the tracked issue metadata', async () => {
    const fetchSnapshot = vi.fn();
    const transitionIssueState = vi.fn();
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:02:00.000Z',
        mode: 'probe-merged-recovery',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-05T00:02:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          cache_fallback_used: true,
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:01:00.000Z',
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
      reason: 'probe_issue_context_cache_stale',
      issue_state: 'Merging',
      issue_state_type: 'started',
      issue_updated_at: '2026-04-05T00:02:00.000Z',
      attached_pr_urls: ['https://github.com/asabeko/CO/pull/357']
    });
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('keeps cache fallback scoped to probe-only merged recovery mode', async () => {
    const readIssueContext = vi.fn(async () => ({
      ok: false as const,
      operation: 'issue-context' as const,
      error: {
        code: 'linear_rate_limited',
        message: 'Linear shared budget cooldown is active.',
        status: 429,
        retryable: true
      }
    }));
    const fetchSnapshot = vi.fn();
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
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
        now: vi.fn().mockReturnValue('2026-04-05T00:02:00.000Z'),
        readIssueContext,
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => []),
        runCommand,
        transitionIssueState: vi.fn()
      }
    );

    expect(readIssueContext).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      fallbackToCacheOnFailure: false
    }));
    expect(result).toMatchObject({
      status: 'merge_failed',
      reason: 'linear_issue_context_failed',
      summary: 'Linear issue context could not be loaded (linear_rate_limited).'
    });
    expect(fetchSnapshot).not.toHaveBeenCalled();
  });

  it('keeps the completed-state exception scoped to probe-only merged recovery', async () => {
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
            state: { id: 'state-done', name: 'Done', type: 'completed' },
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
      issue_state: 'Done',
      issue_state_type: 'completed',
      issue_updated_at: '2026-04-05T00:02:30.000Z'
    });
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(runCommand).toHaveBeenCalledTimes(1);
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
          requiredChecks: { pending: [], failed: [] },
          githubRateLimit: {
            kind: 'github_rate_limited',
            surface: 'graphql',
            limit_type: 'primary',
            status: 403,
            reset_at: '2026-04-06T20:05:00.000Z',
            retry_after_seconds: null,
            retry_at: '2026-04-06T20:05:00.000Z',
            message: 'GraphQL: API rate limit exceeded.'
          }
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

  it('selects the current merge-closeout PR after ignoring a later-closed unmerged prior attempt', async () => {
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
    let currentSnapshotReads = 0;
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 516) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-19T18:10:00.000Z',
          mergedAt: null,
          headOid: 'closed516',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 560) {
        currentSnapshotReads += 1;
        return currentSnapshotReads === 1
          ? {
              state: 'OPEN',
              reviewDecision: 'APPROVED',
              mergeStateStatus: 'CLEAN',
              readyToMerge: true,
              gateReasons: [],
              unresolvedThreadCount: 0,
              updatedAt: '2026-04-19T18:00:00.000Z',
              mergedAt: null,
              headOid: 'head560',
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
              updatedAt: '2026-04-19T19:00:00.000Z',
              mergedAt: '2026-04-19T19:00:00.000Z',
              headOid: 'head560',
              checks: { pending: [], failed: [] },
              requiredChecks: { pending: [], failed: [] }
            };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-220',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-19T18:30:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-19T18:30:00.000Z')
          .mockReturnValueOnce('2026-04-19T19:00:00.000Z')
          .mockReturnValueOnce('2026-04-19T19:00:01.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-220',
            title: 'Merge closeout prior attempts',
            description: null,
            url: null,
            updated_at: '2026-04-19T18:30:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-516', title: 'CO-220: stale closed prior attempt', url: 'https://github.com/asabeko/CO/pull/516' },
              { id: 'att-560', title: 'CO-220: current ready PR', url: 'https://github.com/asabeko/CO/pull/560' }
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
            identifier: 'CO-220',
            state: { id: 'state-done', name: 'Done', type: 'completed' },
            updated_at: '2026-04-19T19:00:01.000Z'
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
        'https://github.com/asabeko/CO/pull/516',
        'https://github.com/asabeko/CO/pull/560'
      ],
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/516'],
      conflicting_attached_pr_urls: [],
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 560
      }
    });
    expect(result.summary).toContain('Ignored closed prior-attempt PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'gh',
        args: expect.arrayContaining(['pr', 'merge', '560', '--repo', 'asabeko/CO', '--match-head-commit', 'head560'])
      })
    );
  });

  it('keeps merge closeout ambiguous after ignoring a closed-unmerged prior attempt when multiple current PRs remain', async () => {
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    }));
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 516) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-18T20:00:00.000Z',
          mergedAt: null,
          headOid: 'closed516',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 560 || prNumber === 561) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: prNumber === 560 ? '2026-04-19T18:00:00.000Z' : '2026-04-19T18:10:00.000Z',
          mergedAt: null,
          headOid: prNumber === 560 ? 'head560' : 'head561',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-220',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-19T18:30:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: () => '2026-04-19T18:30:00.000Z',
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-220',
            title: 'Merge closeout prior attempts',
            description: null,
            url: null,
            updated_at: '2026-04-19T18:30:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-516', title: 'CO-220: stale closed prior attempt', url: 'https://github.com/asabeko/CO/pull/516' },
              { id: 'att-560', title: 'CO-220: current ready PR A', url: 'https://github.com/asabeko/CO/pull/560' },
              { id: 'att-561', title: 'CO-220: current ready PR B', url: 'https://github.com/asabeko/CO/pull/561' }
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
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/516'],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/560',
        'https://github.com/asabeko/CO/pull/561'
      ],
      pr: null,
      snapshot: null
    });
    expect(result.summary).toContain('Ignored closed prior-attempt PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('keeps merge readiness blockers after selecting a current PR over an older closed-unmerged prior attempt', async () => {
    const runCommand = vi.fn(async () => ({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    }));
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 516) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-18T20:00:00.000Z',
          mergedAt: null,
          headOid: 'closed516',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 560) {
        return {
          state: 'OPEN',
          reviewDecision: 'CHANGES_REQUESTED',
          mergeStateStatus: 'BLOCKED',
          readyToMerge: false,
          gateReasons: ['review_decision=CHANGES_REQUESTED'],
          unresolvedThreadCount: 1,
          updatedAt: '2026-04-19T18:00:00.000Z',
          mergedAt: null,
          headOid: 'head560',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-220',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-19T18:30:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: () => '2026-04-19T18:30:00.000Z',
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-220',
            title: 'Merge closeout prior attempts',
            description: null,
            url: null,
            updated_at: '2026-04-19T18:30:00.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-516', title: 'CO-220: stale closed prior attempt', url: 'https://github.com/asabeko/CO/pull/516' },
              { id: 'att-560', title: 'CO-220: current blocked PR', url: 'https://github.com/asabeko/CO/pull/560' }
            ],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn((snapshot) =>
          (snapshot as { headOid?: string }).headOid === 'head560'
            ? ['review_decision=CHANGES_REQUESTED']
            : []
        ),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'review_decision=CHANGES_REQUESTED',
      ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/516'],
      conflicting_attached_pr_urls: [],
      pr: {
        number: 560
      },
      snapshot: {
        state: 'OPEN',
        action_required_reasons: ['review_decision=CHANGES_REQUESTED']
      }
    });
    expect(result.summary).toContain('Merge closeout is blocked by: review_decision=CHANGES_REQUESTED');
    expect(result.summary).toContain('Ignored closed prior-attempt PR URLs');
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('recovers the newest merged replacement PR when older merged historical and older unmerged stale same-repo attachments remain', async () => {
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
      if (prNumber === 355) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-05T18:00:00.000Z',
          mergedAt: '2026-04-05T18:00:00.000Z',
          headOid: 'old355',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
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
              { id: 'att-355', title: 'Historical merged PR', url: 'https://github.com/asabeko/CO/pull/355' },
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
        'https://github.com/asabeko/CO/pull/355',
        'https://github.com/asabeko/CO/pull/360',
        'https://github.com/asabeko/CO/pull/372'
      ],
      ignored_historical_pr_urls: [
        'https://github.com/asabeko/CO/pull/355',
        'https://github.com/asabeko/CO/pull/360'
      ],
      conflicting_attached_pr_urls: [],
      pr: {
        owner: 'asabeko',
        repo: 'CO',
        number: 372
      }
    });
    expect(result.summary).toContain('already merged');
    expect(result.summary).toContain('Ignored older merged PR URLs');
    expect(result.summary).toContain('Older unmerged PR URLs');
    expect(result.summary).toContain('https://github.com/asabeko/CO/pull/355');
    expect(result.summary).toContain('https://github.com/asabeko/CO/pull/360');
    expect(fetchSnapshot).toHaveBeenCalledTimes(3);
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
          requiredChecks: { pending: [], failed: [] },
          githubRateLimit: {
            kind: 'github_rate_limited',
            surface: 'rest',
            limit_type: 'primary',
            status: 403,
            reset_at: '2026-04-05T00:10:00.000Z',
            retry_after_seconds: null,
            retry_at: '2026-04-05T00:10:00.000Z',
            message: 'HTTP 403: API rate limit exceeded.'
          }
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
      },
      github_rate_limit: null
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

  it('does not request branch refresh for snapshot-backed GitHub throttles', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'secondary',
      status: 429,
      reset_at: null,
      retry_after_seconds: 60,
      retry_at: '2026-04-05T00:12:00.000Z',
      message: 'HTTP 429: You have exceeded a secondary rate limit.'
    };
    const runCommand = vi.fn(async (input: { command: string; args: string[] }) => {
      if (input.command === 'git') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'git@github.com:asabeko/CO.git\n',
          stderr: ''
        };
      }
      throw new Error(`Unexpected command ${input.command} ${input.args.join(' ')}`);
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'BEHIND',
      readyToMerge: false,
      gateReasons: ['merge_state=BEHIND'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-05T00:11:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] },
      githubRateLimit
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:11:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-05T00:11:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:11:00.000Z',
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
        resolveSnapshotActionRequiredReasons: vi.fn(() => ['merge_state=BEHIND']),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'watching',
      reason: 'github_rate_limited',
      branch_recovery: null,
      github_rate_limit: githubRateLimit,
      snapshot: {
        merge_state_status: 'BEHIND',
        action_required_reasons: ['merge_state=BEHIND']
      }
    });
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('does not merge ready snapshots that still carry GitHub throttle evidence', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'secondary',
      status: 429,
      reset_at: null,
      retry_after_seconds: 60,
      retry_at: '2026-04-05T00:12:00.000Z',
      message: 'HTTP 429: You have exceeded a secondary rate limit.'
    };
    const runCommand = vi.fn(async (input: { command: string; args: string[] }) => {
      if (input.command === 'git') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'git@github.com:asabeko/CO.git\n',
          stderr: ''
        };
      }
      throw new Error(`Unexpected command ${input.command} ${input.args.join(' ')}`);
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'CLEAN',
      readyToMerge: true,
      gateReasons: [],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-05T00:11:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] },
      githubRateLimit
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:11:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-05T00:11:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:11:00.000Z',
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
      reason: 'github_rate_limited',
      branch_recovery: null,
      merge_attempt: null,
      github_rate_limit: githubRateLimit,
      snapshot: {
        ready_to_merge: true,
        action_required_reasons: []
      }
    });
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('requests branch refresh for BEHIND Merging PRs and keeps watching while GitHub recomputes readiness', async () => {
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
        stdout: 'Updated branch',
        stderr: ''
      });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BEHIND',
        readyToMerge: false,
        gateReasons: ['merge_state=BEHIND'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:11:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BEHIND',
        readyToMerge: false,
        gateReasons: ['merge_state=BEHIND'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:11:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
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
        issueUpdatedAt: '2026-04-05T00:11:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:11:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:11:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:11:00.000Z',
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
        resolveSnapshotActionRequiredReasons: vi.fn((snapshot) =>
          snapshot?.mergeStateStatus === 'BEHIND' ? ['merge_state=BEHIND'] : []
        ),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'watching',
      reason: 'branch_refresh_requested',
      branch_recovery: {
        ok: true,
        recovery_reason: 'merge_state=BEHIND',
        failure_kind: null
      },
      snapshot: {
        merge_state_status: 'BEHIND',
        action_required_reasons: ['merge_state=BEHIND']
      }
    });
    expect(runCommand).toHaveBeenCalledWith(expect.objectContaining({
      command: 'gh',
      args: ['pr', 'update-branch', '357', '--repo', 'asabeko/CO']
    }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('reuses the last successful branch refresh for the same head instead of reissuing update-branch', async () => {
    const previousBranchRecovery = {
      attempted_at: '2026-04-05T00:11:00.000Z',
      head_oid: 'abc123',
      recovery_reason: 'merge_state=BEHIND',
      command: 'gh',
      args: ['pr', 'update-branch', '357', '--repo', 'asabeko/CO'],
      exit_code: 0,
      ok: true,
      stdout: 'Updated branch',
      stderr: null,
      failure_kind: null
    } as const;
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BEHIND',
        readyToMerge: false,
        gateReasons: ['merge_state=BEHIND'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:11:30.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BEHIND',
        readyToMerge: false,
        gateReasons: ['merge_state=BEHIND'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:12:00.000Z',
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
        issueUpdatedAt: '2026-04-05T00:11:30.000Z',
        previousBranchRecovery,
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-05T00:12:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:11:30.000Z',
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
        resolveSnapshotActionRequiredReasons: vi.fn((snapshot) =>
          snapshot?.mergeStateStatus === 'BEHIND' ? ['merge_state=BEHIND'] : []
        ),
        runCommand
      }
    );

    expect(result).toMatchObject({
      status: 'watching',
      reason: 'branch_refresh_requested',
      branch_recovery: previousBranchRecovery,
      snapshot: {
        merge_state_status: 'BEHIND',
        action_required_reasons: ['merge_state=BEHIND']
      }
    });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({
      command: 'gh'
    }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a prior branch refresh when the selected PR changes even if the head matches', async () => {
    const previousBranchRecovery = {
      attempted_at: '2026-04-05T00:11:00.000Z',
      head_oid: 'abc123',
      recovery_reason: 'merge_state=BEHIND',
      command: 'gh',
      args: ['pr', 'update-branch', '357', '--repo', 'asabeko/CO'],
      exit_code: 0,
      ok: true,
      stdout: 'Updated branch',
      stderr: null,
      failure_kind: null
    } as const;
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
        stdout: 'Updated branch',
        stderr: ''
      });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BEHIND',
        readyToMerge: false,
        gateReasons: ['merge_state=BEHIND'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:11:30.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BEHIND',
        readyToMerge: false,
        gateReasons: ['merge_state=BEHIND'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-05T00:12:00.000Z',
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
        issueUpdatedAt: '2026-04-05T00:11:30.000Z',
        previousBranchRecovery,
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-05T00:12:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:11:30.000Z',
            workspace_id: null,
            state: { id: 'state-merging', name: 'Merging', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/358' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn((snapshot) =>
          snapshot?.mergeStateStatus === 'BEHIND' ? ['merge_state=BEHIND'] : []
        ),
        runCommand
      }
    );

    expect(result).toMatchObject({
      status: 'watching',
      reason: 'branch_refresh_requested',
      branch_recovery: {
        ok: true,
        recovery_reason: 'merge_state=BEHIND',
        args: ['pr', 'update-branch', '358', '--repo', 'asabeko/CO']
      }
    });
    expect(runCommand).toHaveBeenCalledWith(expect.objectContaining({
      command: 'gh',
      args: ['pr', 'update-branch', '358', '--repo', 'asabeko/CO']
    }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });

  it('moves DIRTY Merging PRs into Rework when automatic conflict recovery hits merge conflicts', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'git@github.com:asabeko/CO.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: 'GraphQL: This branch cannot be rebased due to conflicts'
      });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'DIRTY',
      readyToMerge: false,
      gateReasons: ['merge_state=DIRTY'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-05T00:12:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] }
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-80',
        state: { id: 'state-rework', name: 'Rework', type: 'started' },
        updated_at: '2026-04-05T00:12:05.000Z'
      },
      previous_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      target_state: { id: 'state-rework', name: 'Rework', type: 'started' },
      source_setup: null
    }));

    const result = await runProviderDeterministicMergeCloseout(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-80',
        issueState: 'Merging',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-05T00:12:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-05T00:12:00.000Z')
          .mockReturnValueOnce('2026-04-05T00:12:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:12:00.000Z',
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
        resolveSnapshotActionRequiredReasons: vi.fn((snapshot) =>
          snapshot?.mergeStateStatus === 'DIRTY' ? ['merge_state=DIRTY'] : []
        ),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'branch_recovery_conflict',
      issue_state: 'Rework',
      issue_state_type: 'started',
      branch_recovery: {
        ok: false,
        recovery_reason: 'merge_state=DIRTY',
        failure_kind: 'conflict'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Rework',
        issue_state: 'Rework'
      }
    });
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Rework',
      expectedStateName: 'Merging',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-05T00:12:00.000Z'
    }));
  });

  it('keeps mixed-blocker Merging PRs out of automatic branch recovery', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'CHANGES_REQUESTED',
      mergeStateStatus: 'DIRTY',
      readyToMerge: false,
      gateReasons: ['merge_state=DIRTY', 'review=CHANGES_REQUESTED'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-05T00:12:30.000Z',
      mergedAt: null,
      headOid: 'abc123',
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
        issueUpdatedAt: '2026-04-05T00:12:30.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-05T00:12:30.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-80',
            title: 'Deterministic merge closeout',
            description: null,
            url: null,
            updated_at: '2026-04-05T00:12:30.000Z',
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
        resolveSnapshotActionRequiredReasons: vi.fn(() => [
          'review=CHANGES_REQUESTED',
          'merge_state=DIRTY'
        ]),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'review=CHANGES_REQUESTED',
      branch_recovery: null,
      snapshot: {
        merge_state_status: 'DIRTY',
        action_required_reasons: ['review=CHANGES_REQUESTED', 'merge_state=DIRTY']
      }
    });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });
});

describe('runProviderReviewHandoffPromotion', () => {
  it('promotes a merge-ready review handoff into Merging', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'CLEAN',
      readyToMerge: true,
      gateReasons: [],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-09T03:00:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] }
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-116',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-09T03:05:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:04:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-09T03:05:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:04:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      issue_state_type: 'started',
      pr: {
        number: 416
      },
      snapshot: {
        review_decision: 'APPROVED',
        merge_state_status: 'CLEAN',
        ready_to_merge: true
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Merging',
        issue_state: 'Merging'
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      owner: 'asabeko',
      repo: 'CO',
      prNumber: 416,
      readinessMode: 'merge'
    }));
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-09T03:04:00.000Z'
    }));
  });

  it('promotes an already-merged review handoff into Merging and preserves older attached PR URLs in structured truth', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 355) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-09T03:02:00.000Z',
          mergedAt: '2026-04-09T03:02:00.000Z',
          headOid: 'old355',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 360) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'BEHIND',
          readyToMerge: false,
          gateReasons: ['mergeStateStatus=BEHIND'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-09T03:03:00.000Z',
          mergedAt: null,
          headOid: 'old360',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 416) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-09T03:06:00.000Z',
          mergedAt: '2026-04-09T03:06:00.000Z',
          headOid: 'abc123',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-116',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-09T03:07:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [
          { id: 'att-355', title: 'Historical merged PR', url: 'https://github.com/asabeko/CO/pull/355' },
          { id: 'att-360', title: 'Stale PR', url: 'https://github.com/asabeko/CO/pull/360' },
          { id: 'att-416', title: 'Merged replacement PR', url: 'https://github.com/asabeko/CO/pull/416' }
        ],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:06:30.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-09T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:06:30.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-355', title: 'Historical merged PR', url: 'https://github.com/asabeko/CO/pull/355' },
              { id: 'att-360', title: 'Stale PR', url: 'https://github.com/asabeko/CO/pull/360' },
              { id: 'att-416', title: 'Merged replacement PR', url: 'https://github.com/asabeko/CO/pull/416' }
            ],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/355',
        'https://github.com/asabeko/CO/pull/360',
        'https://github.com/asabeko/CO/pull/416'
      ],
      ignored_historical_pr_urls: [
        'https://github.com/asabeko/CO/pull/355',
        'https://github.com/asabeko/CO/pull/360'
      ],
      pr: {
        number: 416
      },
      snapshot: {
        state: 'MERGED',
        ready_to_merge: false,
        merged_at: '2026-04-09T03:06:00.000Z'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Merging',
        issue_state: 'Merging'
      }
    });
    expect(result.summary).toContain('already merged');
    expect(result.summary).toContain('Older unmerged PR URLs');
    expect(result.summary).toContain('https://github.com/asabeko/CO/pull/360');
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-09T03:06:30.000Z'
    }));
  });

  it('promotes the current review handoff PR after ignoring closed prior-attempt and cross-issue attached PRs', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 401) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:00:00.000Z',
          mergedAt: null,
          headOid: 'cross401',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 412) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:02:00.000Z',
          mergedAt: null,
          headOid: 'closed412',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 416) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:06:00.000Z',
          mergedAt: null,
          headOid: 'head416',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 418) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'BLOCKED',
          readyToMerge: false,
          gateReasons: ['review=REVIEW_REQUIRED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:03:00.000Z',
          mergedAt: null,
          headOid: 'follow418',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-237',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-12T03:07:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [
          { id: 'att-401', title: 'CO-226: blocker PR', url: 'https://github.com/asabeko/CO/pull/401' },
          { id: 'att-412', title: 'CO-237: closed prior attempt PR', url: 'https://github.com/asabeko/CO/pull/412' },
          { id: 'att-416', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' },
          { id: 'att-418', title: 'CO-238: follow-up PR', url: 'https://github.com/asabeko/CO/pull/418' }
        ],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:30.000Z',
        blockedBy: [
          {
            id: 'lin-issue-2',
            identifier: 'CO-226',
            state: 'In Progress',
            state_type: 'started'
          }
        ],
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:30.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-401', title: 'CO-226: blocker PR', url: 'https://github.com/asabeko/CO/pull/401' },
              { id: 'att-412', title: 'CO-237: closed prior attempt PR', url: 'https://github.com/asabeko/CO/pull/412' },
              { id: 'att-416', title: 'Fix regression from CO-226', url: 'https://github.com/asabeko/CO/pull/416' },
              { id: 'att-418', title: 'CO-238: follow-up PR', url: 'https://github.com/asabeko/CO/pull/418' }
            ],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/401',
        'https://github.com/asabeko/CO/pull/412',
        'https://github.com/asabeko/CO/pull/416',
        'https://github.com/asabeko/CO/pull/418'
      ],
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/412'],
      ignored_cross_issue_pr_urls: [
        'https://github.com/asabeko/CO/pull/401',
        'https://github.com/asabeko/CO/pull/418'
      ],
      conflicting_attached_pr_urls: [],
      pr: {
        number: 416
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'APPROVED',
        merge_state_status: 'CLEAN',
        ready_to_merge: true,
        head_oid: 'head416'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Merging',
        issue_state: 'Merging'
      }
    });
    expect(result.summary).toContain('Ignored closed prior-attempt PR URLs');
    expect(result.summary).toContain('Ignored cross-issue PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-12T03:06:30.000Z'
    }));
  });

  it('keeps multiple_attached_prs truth after ignoring closed prior-attempt and cross-issue attached PRs', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 401) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:00:00.000Z',
          mergedAt: null,
          headOid: 'cross401',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 412) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:02:00.000Z',
          mergedAt: null,
          headOid: 'closed412',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 416 || prNumber === 419) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: prNumber === 416 ? '2026-04-12T03:06:00.000Z' : '2026-04-12T03:06:30.000Z',
          mergedAt: null,
          headOid: prNumber === 416 ? 'head416' : 'head419',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:45.000Z',
        blockedBy: [
          {
            id: 'lin-issue-2',
            identifier: 'CO-226',
            state: 'In Progress',
            state_type: 'started'
          }
        ],
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:45.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-401', title: 'CO-226: blocker PR', url: 'https://github.com/asabeko/CO/pull/401' },
              { id: 'att-412', title: 'CO-237: closed prior attempt PR', url: 'https://github.com/asabeko/CO/pull/412' },
              { id: 'att-416', title: 'CO-237: current review handoff PR A', url: 'https://github.com/asabeko/CO/pull/416' },
              { id: 'att-419', title: 'CO-237: current review handoff PR B', url: 'https://github.com/asabeko/CO/pull/419' }
            ],
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
      status: 'action_required',
      reason: 'multiple_attached_prs',
      issue_state: 'In Review',
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/412'],
      ignored_cross_issue_pr_urls: ['https://github.com/asabeko/CO/pull/401'],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/416',
        'https://github.com/asabeko/CO/pull/419'
      ],
      pr: null,
      snapshot: null,
      linear_transition: null
    });
    expect(result.summary).toContain('conflicting current-candidate PR URLs');
    expect(result.summary).toContain('Ignored closed prior-attempt PR URLs');
    expect(result.summary).toContain('Ignored cross-issue PR URLs');
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('uses the latest duplicate attachment title evidence before ignoring a current candidate as cross-issue', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 412) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:02:00.000Z',
          mergedAt: null,
          headOid: 'closed412',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 416) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:06:00.000Z',
          mergedAt: null,
          headOid: 'head416',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-237',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-12T03:07:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [
          { id: 'att-412', title: 'CO-237: closed prior attempt PR', url: 'https://github.com/asabeko/CO/pull/412' },
          { id: 'att-416a', title: 'CO-238: follow-up PR', url: 'https://github.com/asabeko/CO/pull/416' },
          { id: 'att-416b', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' }
        ],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:30.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:30.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-412', title: 'CO-237: closed prior attempt PR', url: 'https://github.com/asabeko/CO/pull/412' },
              { id: 'att-416a', title: 'CO-238: follow-up PR', url: 'https://github.com/asabeko/CO/pull/416' },
              { id: 'att-416b', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' }
            ],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/412',
        'https://github.com/asabeko/CO/pull/416'
      ],
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: ['https://github.com/asabeko/CO/pull/412'],
      ignored_cross_issue_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        number: 416
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'APPROVED',
        merge_state_status: 'CLEAN',
        ready_to_merge: true,
        head_oid: 'head416'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Merging',
        issue_state: 'Merging'
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-12T03:06:30.000Z'
    }));
  });

  it('uses the latest duplicate attachment title evidence when a reattached PR becomes cross-issue', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 419) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:06:30.000Z',
          mergedAt: null,
          headOid: 'head419',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected snapshot read for PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-237',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-12T03:07:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [
          { id: 'att-416a', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' },
          { id: 'att-416b', title: 'CO-238: follow-up PR', url: 'https://github.com/asabeko/CO/pull/416' },
          { id: 'att-419', title: 'CO-237: latest current review handoff PR', url: 'https://github.com/asabeko/CO/pull/419' }
        ],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:45.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:45.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-416a', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' },
              { id: 'att-416b', title: 'CO-238: follow-up PR', url: 'https://github.com/asabeko/CO/pull/416' },
              { id: 'att-419', title: 'CO-237: latest current review handoff PR', url: 'https://github.com/asabeko/CO/pull/419' }
            ],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/416',
        'https://github.com/asabeko/CO/pull/419'
      ],
      ignored_cross_issue_pr_urls: ['https://github.com/asabeko/CO/pull/416'],
      conflicting_attached_pr_urls: [],
      pr: {
        number: 419
      },
      snapshot: {
        state: 'OPEN',
        head_oid: 'head419'
      }
    });
    expect(result.summary).toContain('Ignored cross-issue PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      prNumber: 419
    }));
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-12T03:06:45.000Z'
    }));
  });

  it('classifies blocker titles that mention both the blocker issue and current issue as cross-issue', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 401) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:00:00.000Z',
          mergedAt: null,
          headOid: 'cross401',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 416) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:06:00.000Z',
          mergedAt: null,
          headOid: 'head416',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-237',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-12T03:07:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [
          { id: 'att-401', title: 'CO-226 blocker for CO-237', url: 'https://github.com/asabeko/CO/pull/401' },
          { id: 'att-416', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' }
        ],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:30.000Z',
        blockedBy: [
          {
            id: 'lin-issue-2',
            identifier: 'CO-226',
            state: 'In Progress',
            state_type: 'started'
          }
        ],
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:30.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-401', title: 'CO-226 blocker for CO-237', url: 'https://github.com/asabeko/CO/pull/401' },
              { id: 'att-416', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' }
            ],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/401',
        'https://github.com/asabeko/CO/pull/416'
      ],
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: [],
      ignored_cross_issue_pr_urls: ['https://github.com/asabeko/CO/pull/401'],
      conflicting_attached_pr_urls: [],
      pr: {
        number: 416
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'APPROVED',
        merge_state_status: 'CLEAN',
        ready_to_merge: true,
        head_oid: 'head416'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Merging',
        issue_state: 'Merging'
      }
    });
    expect(result.summary).toContain('Ignored cross-issue PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-12T03:06:30.000Z'
    }));
  });

  it('skips snapshot reads for cross-issue blocker attachments during review promotion', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 416) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:06:00.000Z',
          mergedAt: null,
          headOid: 'head416',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw Object.assign(new Error(`Unexpected snapshot read for PR ${String(prNumber)}`), {
        githubRateLimit: {
          kind: 'github_rate_limited',
          surface: 'graphql',
          limit_type: 'primary',
          status: 403,
          reset_at: '2026-04-12T03:10:00.000Z',
          retry_after_seconds: null,
          retry_at: '2026-04-12T03:10:00.000Z',
          message: 'GraphQL: API rate limit exceeded.'
        }
      });
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-237',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-12T03:07:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [
          { id: 'att-401', title: 'CO-226 blocker for CO-237', url: 'https://github.com/asabeko/CO/pull/401' },
          { id: 'att-416', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' }
        ],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:30.000Z',
        blockedBy: [
          {
            id: 'lin-issue-2',
            identifier: 'CO-226',
            state: 'In Progress',
            state_type: 'started'
          }
        ],
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:30.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-401', title: 'CO-226 blocker for CO-237', url: 'https://github.com/asabeko/CO/pull/401' },
              { id: 'att-416', title: 'CO-237: current review handoff PR', url: 'https://github.com/asabeko/CO/pull/416' }
            ],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      ignored_cross_issue_pr_urls: ['https://github.com/asabeko/CO/pull/401'],
      pr: {
        number: 416
      },
      snapshot: {
        state: 'OPEN',
        head_oid: 'head416'
      }
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      prNumber: 416
    }));
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-12T03:06:30.000Z'
    }));
  });

  it('selects open CO-219 PR 523 over merged CO-226 blocking attachment 522 during review promotion', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 522) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-19T02:30:00.000Z',
          mergedAt: '2026-04-19T02:30:00.000Z',
          headOid: 'merged522',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 523) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-19T02:20:00.000Z',
          mergedAt: null,
          headOid: 'head523',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'transitioned' as const,
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-219',
        title: 'Review handoff promotion',
        description: null,
        url: null,
        updated_at: '2026-04-19T02:41:00.000Z',
        workspace_id: null,
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        team: null,
        project: null,
        comments: [],
        attachments: [
          { id: 'att-522', title: 'CO-226: stabilize Doctor full-suite timeout lane blocking CO-219 handoff', url: 'https://github.com/asabeko/CO/pull/522' },
          { id: 'att-523', title: 'Fix stale accepted rehydration rows in CO STATUS', url: 'https://github.com/asabeko/CO/pull/523' }
        ],
        workpad_comment: null
      },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-219',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-19T02:40:00.000Z',
        blockedBy: [
          {
            id: 'lin-issue-2',
            identifier: 'CO-226',
            state: 'In Progress',
            state_type: 'started'
          }
        ],
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-19T02:41:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-219',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-19T02:40:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-522', title: 'CO-226: stabilize Doctor full-suite timeout lane blocking CO-219 handoff', url: 'https://github.com/asabeko/CO/pull/522' },
              { id: 'att-523', title: 'Fix stale accepted rehydration rows in CO STATUS', url: 'https://github.com/asabeko/CO/pull/523' }
            ],
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
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/522',
        'https://github.com/asabeko/CO/pull/523'
      ],
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: [],
      ignored_cross_issue_pr_urls: ['https://github.com/asabeko/CO/pull/522'],
      conflicting_attached_pr_urls: [],
      pr: {
        number: 523
      },
      snapshot: {
        state: 'OPEN',
        review_decision: 'APPROVED',
        merge_state_status: 'CLEAN',
        ready_to_merge: true,
        head_oid: 'head523'
      },
      linear_transition: {
        status: 'transitioned',
        target_state: 'Merging',
        issue_state: 'Merging'
      }
    });
    expect(result.summary).toContain('Ignored cross-issue PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      prNumber: 523
    }));
    expect(fetchSnapshot).not.toHaveBeenCalledWith(expect.objectContaining({
      prNumber: 522
    }));
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-19T02:40:00.000Z'
    }));
  });

  it('keeps review promotion ambiguous when merged CO-226 blocking attachment 522 leaves two current candidates', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 522) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=MERGED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-19T02:30:00.000Z',
          mergedAt: '2026-04-19T02:30:00.000Z',
          headOid: 'merged522',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 523 || prNumber === 524) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: prNumber === 523 ? '2026-04-19T02:20:00.000Z' : '2026-04-19T02:22:00.000Z',
          mergedAt: null,
          headOid: prNumber === 523 ? 'head523' : 'head524',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-219',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-19T02:40:00.000Z',
        blockedBy: [
          {
            id: 'lin-issue-2',
            identifier: 'CO-226',
            state: 'In Progress',
            state_type: 'started'
          }
        ],
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-19T02:41:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-219',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-19T02:40:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-522', title: 'CO-226: stabilize Doctor full-suite timeout lane blocking CO-219 handoff', url: 'https://github.com/asabeko/CO/pull/522' },
              { id: 'att-523', title: 'Fix stale accepted rehydration rows in CO STATUS', url: 'https://github.com/asabeko/CO/pull/523' },
              { id: 'att-524', title: 'CO-219: alternate current review handoff PR', url: 'https://github.com/asabeko/CO/pull/524' }
            ],
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
      status: 'action_required',
      reason: 'multiple_attached_prs',
      issue_state: 'In Review',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/522',
        'https://github.com/asabeko/CO/pull/523',
        'https://github.com/asabeko/CO/pull/524'
      ],
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: [],
      ignored_cross_issue_pr_urls: ['https://github.com/asabeko/CO/pull/522'],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/523',
        'https://github.com/asabeko/CO/pull/524'
      ],
      pr: null,
      snapshot: null,
      linear_transition: null
    });
    expect(result.summary).toContain('conflicting current-candidate PR URLs');
    expect(result.summary).toContain('Ignored cross-issue PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(fetchSnapshot).not.toHaveBeenCalledWith(expect.objectContaining({
      prNumber: 522
    }));
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('keeps undeclared cross-issue blocking attachments conflicting during review promotion', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 522 || prNumber === 523) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: prNumber === 522 ? '2026-04-19T02:18:00.000Z' : '2026-04-19T02:20:00.000Z',
          mergedAt: null,
          headOid: prNumber === 522 ? 'head522' : 'head523',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-219',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-19T02:40:00.000Z',
        blockedBy: [],
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-19T02:41:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-219',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-19T02:40:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-522', title: 'CO-226: blocking cleanup not declared as a blocker', url: 'https://github.com/asabeko/CO/pull/522' },
              { id: 'att-523', title: 'Fix stale accepted rehydration rows in CO STATUS', url: 'https://github.com/asabeko/CO/pull/523' }
            ],
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
      status: 'action_required',
      reason: 'multiple_attached_prs',
      issue_state: 'In Review',
      ignored_cross_issue_pr_urls: [],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/522',
        'https://github.com/asabeko/CO/pull/523'
      ],
      pr: null,
      snapshot: null,
      linear_transition: null
    });
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(fetchSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      prNumber: 522
    }));
    expect(fetchSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      prNumber: 523
    }));
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('keeps a newer closed replacement PR from promoting an older merged attachment', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 401) {
        return {
          state: 'MERGED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:00:00.000Z',
          mergedAt: '2026-04-12T03:00:00.000Z',
          headOid: 'merged401',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 412) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:06:30.000Z',
          mergedAt: null,
          headOid: 'closed412',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:45.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:45.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-401', title: 'CO-237: historical merged PR', url: 'https://github.com/asabeko/CO/pull/401' },
              { id: 'att-412', title: 'CO-237: closed replacement PR', url: 'https://github.com/asabeko/CO/pull/412' }
            ],
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
      status: 'action_required',
      reason: 'pr_closed_unmerged',
      issue_state: 'In Review',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/401',
        'https://github.com/asabeko/CO/pull/412'
      ],
      ignored_historical_pr_urls: ['https://github.com/asabeko/CO/pull/401'],
      ignored_closed_unmerged_pr_urls: [],
      ignored_cross_issue_pr_urls: [],
      conflicting_attached_pr_urls: [],
      pr: {
        number: 412
      },
      snapshot: {
        state: 'CLOSED',
        head_oid: 'closed412'
      },
      linear_transition: null
    });
    expect(result.summary).toContain('Attached PR #412 is closed without merging');
    expect(result.summary).toContain('Ignored historical merged PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('keeps an older open PR plus newer closed replacement ambiguous during review promotion', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn(async ({ prNumber }: { prNumber: number }) => {
      if (prNumber === 401) {
        return {
          state: 'OPEN',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'CLEAN',
          readyToMerge: true,
          gateReasons: [],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:01:00.000Z',
          mergedAt: null,
          headOid: 'open401',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      if (prNumber === 412) {
        return {
          state: 'CLOSED',
          reviewDecision: 'APPROVED',
          mergeStateStatus: 'UNKNOWN',
          readyToMerge: false,
          gateReasons: ['state=CLOSED'],
          unresolvedThreadCount: 0,
          updatedAt: '2026-04-12T03:06:30.000Z',
          mergedAt: null,
          headOid: 'closed412',
          checks: { pending: [], failed: [] },
          requiredChecks: { pending: [], failed: [] }
        };
      }
      throw new Error(`Unexpected PR ${String(prNumber)}`);
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-237',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-12T03:06:45.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-12T03:07:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-237',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-12T03:06:45.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [
              { id: 'att-401', title: 'CO-237: older still-open PR', url: 'https://github.com/asabeko/CO/pull/401' },
              { id: 'att-412', title: 'CO-237: newer closed replacement PR', url: 'https://github.com/asabeko/CO/pull/412' }
            ],
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
      status: 'action_required',
      reason: 'multiple_attached_prs',
      issue_state: 'In Review',
      attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/401',
        'https://github.com/asabeko/CO/pull/412'
      ],
      ignored_historical_pr_urls: [],
      ignored_closed_unmerged_pr_urls: [],
      ignored_cross_issue_pr_urls: [],
      conflicting_attached_pr_urls: [
        'https://github.com/asabeko/CO/pull/401',
        'https://github.com/asabeko/CO/pull/412'
      ],
      pr: null,
      snapshot: null,
      linear_transition: null
    });
    expect(result.summary).toContain('conflicting current-candidate PR URLs');
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('refuses review handoff promotion when review is still required', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'REVIEW_REQUIRED',
      mergeStateStatus: 'CLEAN',
      readyToMerge: false,
      gateReasons: ['review=REVIEW_REQUIRED'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-09T03:10:00.000Z',
      mergedAt: null,
      headOid: 'def456',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] }
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:10:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValue('2026-04-09T03:10:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:10:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => ['review=REVIEW_REQUIRED']),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'review=REVIEW_REQUIRED',
      snapshot: {
        review_decision: 'REVIEW_REQUIRED',
        ready_to_merge: false,
        action_required_reasons: ['review=REVIEW_REQUIRED']
      }
    });
    expect(result.summary).toContain('Review-handoff promotion is blocked by');
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('does not request review-promotion branch refresh for snapshot-backed GitHub throttles', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'secondary',
      status: 429,
      reset_at: null,
      retry_after_seconds: 60,
      retry_at: '2026-04-09T03:12:00.000Z',
      message: 'HTTP 429: You have exceeded a secondary rate limit.'
    };
    const runCommand = vi.fn(async (input: { command: string; args: string[] }) => {
      if (input.command === 'git') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'git@github.com:asabeko/CO.git\n',
          stderr: ''
        };
      }
      throw new Error(`Unexpected command ${input.command} ${input.args.join(' ')}`);
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'BEHIND',
      readyToMerge: false,
      gateReasons: ['merge_state=BEHIND'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-09T03:11:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] },
      githubRateLimit
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:11:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-09T03:11:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:11:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => ['merge_state=BEHIND']),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'watching',
      reason: 'github_rate_limited',
      issue_state: 'In Review',
      branch_recovery: null,
      github_rate_limit: githubRateLimit,
      snapshot: {
        merge_state_status: 'BEHIND',
        action_required_reasons: ['merge_state=BEHIND']
      }
    });
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('does not promote ready review handoff snapshots that still carry GitHub throttle evidence', async () => {
    const githubRateLimit = {
      kind: 'github_rate_limited',
      surface: 'rest',
      limit_type: 'secondary',
      status: 429,
      reset_at: null,
      retry_after_seconds: 60,
      retry_at: '2026-04-09T03:12:00.000Z',
      message: 'HTTP 429: You have exceeded a secondary rate limit.'
    };
    const runCommand = vi.fn(async (input: { command: string; args: string[] }) => {
      if (input.command === 'git') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'git@github.com:asabeko/CO.git\n',
          stderr: ''
        };
      }
      throw new Error(`Unexpected command ${input.command} ${input.args.join(' ')}`);
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'CLEAN',
      readyToMerge: true,
      gateReasons: [],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-09T03:11:00.000Z',
      mergedAt: null,
      headOid: 'abc123',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] },
      githubRateLimit
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:11:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-09T03:11:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:11:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
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
      reason: 'github_rate_limited',
      issue_state: 'In Review',
      branch_recovery: null,
      github_rate_limit: githubRateLimit,
      snapshot: {
        ready_to_merge: true,
        action_required_reasons: []
      }
    });
    expect(runCommand).not.toHaveBeenCalledWith(expect.objectContaining({ command: 'gh' }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('promotes BEHIND review handoff PRs after automatic branch refresh succeeds', async () => {
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
        stdout: 'Updated branch',
        stderr: ''
      });
    const fetchSnapshot = vi
      .fn()
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'BEHIND',
        readyToMerge: false,
        gateReasons: ['merge_state=BEHIND'],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-09T03:11:00.000Z',
        mergedAt: null,
        headOid: 'abc123',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      })
      .mockResolvedValueOnce({
        state: 'OPEN',
        reviewDecision: 'APPROVED',
        mergeStateStatus: 'CLEAN',
        readyToMerge: true,
        gateReasons: [],
        unresolvedThreadCount: 0,
        updatedAt: '2026-04-09T03:12:00.000Z',
        mergedAt: null,
        headOid: 'def456',
        checks: { pending: [], failed: [] },
        requiredChecks: { pending: [], failed: [] }
      });
    const transitionIssueState = vi.fn(async () => ({
      ok: true as const,
      operation: 'transition' as const,
      action: 'updated' as const,
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-116',
        state: { id: 'state-merging', name: 'Merging', type: 'started' },
        updated_at: '2026-04-09T03:12:05.000Z'
      },
      previous_state: { id: 'state-in-review', name: 'In Review', type: 'started' },
      target_state: { id: 'state-merging', name: 'Merging', type: 'started' },
      source_setup: null
    }));

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:11:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-09T03:11:00.000Z')
          .mockReturnValueOnce('2026-04-09T03:12:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:11:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn((snapshot) =>
          snapshot?.mergeStateStatus === 'BEHIND' ? ['merge_state=BEHIND'] : []
        ),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'promoted',
      reason: 'promoted_to_merging',
      issue_state: 'Merging',
      branch_recovery: {
        ok: true,
        recovery_reason: 'merge_state=BEHIND',
        failure_kind: null
      },
      snapshot: {
        merge_state_status: 'CLEAN',
        ready_to_merge: true,
        head_oid: 'def456'
      }
    });
    expect(runCommand).toHaveBeenCalledWith(expect.objectContaining({
      command: 'gh',
      args: ['pr', 'update-branch', '416', '--repo', 'asabeko/CO']
    }));
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
    expect(transitionIssueState).toHaveBeenCalledWith(expect.objectContaining({
      issueId: 'lin-issue-1',
      stateName: 'Merging',
      expectedStateName: 'In Review',
      expectedStateType: 'started',
      expectedUpdatedAt: '2026-04-09T03:11:00.000Z'
    }));
  });

  it('does not request branch refresh when BEHIND is accompanied by a review blocker', async () => {
    const runCommand = vi.fn(async (input: { command: string; args: string[] }) => {
      if (input.command === 'git') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'git@github.com:asabeko/CO.git\n',
          stderr: ''
        };
      }
      throw new Error(`Unexpected command ${input.command} ${input.args.join(' ')}`);
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'CHANGES_REQUESTED',
      mergeStateStatus: 'BEHIND',
      readyToMerge: false,
      gateReasons: ['review=CHANGES_REQUESTED', 'merge_state=BEHIND'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-09T03:13:00.000Z',
      mergedAt: null,
      headOid: 'ghi789',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] }
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:13:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-09T03:13:00.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:13:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => [
          'review=CHANGES_REQUESTED',
          'merge_state=BEHIND'
        ]),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'review=CHANGES_REQUESTED',
      issue_state: 'In Review',
      branch_recovery: null,
      snapshot: {
        review_decision: 'CHANGES_REQUESTED',
        merge_state_status: 'BEHIND',
        action_required_reasons: ['review=CHANGES_REQUESTED', 'merge_state=BEHIND']
      }
    });
    expect(transitionIssueState).not.toHaveBeenCalled();
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });

  it('records non-conflict branch refresh failures during review handoff promotion without forcing Rework', async () => {
    const runCommand = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        exitCode: 0,
        stdout: 'git@github.com:asabeko/CO.git\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: 'GitHub API temporarily unavailable'
      });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'APPROVED',
      mergeStateStatus: 'BEHIND',
      readyToMerge: false,
      gateReasons: ['merge_state=BEHIND'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-09T03:13:00.000Z',
      mergedAt: null,
      headOid: 'ghi789',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] }
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:13:00.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi
          .fn()
          .mockReturnValueOnce('2026-04-09T03:13:00.000Z')
          .mockReturnValueOnce('2026-04-09T03:13:05.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:13:00.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn((snapshot) =>
          snapshot?.mergeStateStatus === 'BEHIND' ? ['merge_state=BEHIND'] : []
        ),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'branch_recovery_failed',
      issue_state: 'In Review',
      branch_recovery: {
        ok: false,
        recovery_reason: 'merge_state=BEHIND',
        failure_kind: 'other'
      }
    });
    expect(transitionIssueState).not.toHaveBeenCalled();
  });

  it('keeps mixed-blocker review handoff PRs out of automatic branch recovery', async () => {
    const runCommand = vi.fn().mockResolvedValueOnce({
      ok: true,
      exitCode: 0,
      stdout: 'git@github.com:asabeko/CO.git\n',
      stderr: ''
    });
    const fetchSnapshot = vi.fn().mockResolvedValue({
      state: 'OPEN',
      reviewDecision: 'CHANGES_REQUESTED',
      mergeStateStatus: 'BEHIND',
      readyToMerge: false,
      gateReasons: ['merge_state=BEHIND', 'review=CHANGES_REQUESTED'],
      unresolvedThreadCount: 0,
      updatedAt: '2026-04-09T03:13:30.000Z',
      mergedAt: null,
      headOid: 'ghi789',
      checks: { pending: [], failed: [] },
      requiredChecks: { pending: [], failed: [] }
    });
    const transitionIssueState = vi.fn();

    const result = await runProviderReviewHandoffPromotion(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-116',
        issueState: 'In Review',
        issueStateType: 'started',
        issueUpdatedAt: '2026-04-09T03:13:30.000Z',
        repoRoot: '/tmp/co'
      },
      {
        now: vi.fn().mockReturnValueOnce('2026-04-09T03:13:30.000Z'),
        readIssueContext: vi.fn(async () => ({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-116',
            title: 'Review handoff promotion',
            description: null,
            url: null,
            updated_at: '2026-04-09T03:13:30.000Z',
            workspace_id: null,
            state: { id: 'state-in-review', name: 'In Review', type: 'started' },
            team: null,
            project: null,
            comments: [],
            attachments: [{ id: 'att-1', title: 'PR', url: 'https://github.com/asabeko/CO/pull/416' }],
            workpad_comment: null
          },
          source_setup: null
        })),
        fetchSnapshot,
        resolveSnapshotActionRequiredReasons: vi.fn(() => [
          'review=CHANGES_REQUESTED',
          'merge_state=BEHIND'
        ]),
        runCommand,
        transitionIssueState
      }
    );

    expect(result).toMatchObject({
      status: 'action_required',
      reason: 'review=CHANGES_REQUESTED',
      branch_recovery: null,
      snapshot: {
        merge_state_status: 'BEHIND',
        action_required_reasons: ['review=CHANGES_REQUESTED', 'merge_state=BEHIND']
      }
    });
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(transitionIssueState).not.toHaveBeenCalled();
  });
});
