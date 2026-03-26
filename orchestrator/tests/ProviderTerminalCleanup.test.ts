import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_PROVIDER_TERMINAL_CLEANUP_COMMENT_TEMPLATE,
  runProviderTerminalCleanup,
  type ProviderTerminalCleanupConfig,
  type ProviderTerminalCleanupCommandRunner
} from '../src/cli/control/providerTerminalCleanup.js';

const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('providerTerminalCleanup', () => {
  it('returns a noop when the issue has no attached GitHub PRs', async () => {
    const workspacePath = await createWorkspacePath();
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: []
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      expect(command).toBe('git');
      if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'feature/co-5\n',
          stderr: ''
        };
      }
      if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'https://github.com/example/co.git\n',
          stderr: ''
        };
      }
      return {
        ok: true,
        exitCode: 0,
        stdout: `${workspaceHeadOid}\n`,
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toEqual({
      attemptedAt: '2026-03-27T00:00:00.000Z',
      status: 'noop',
      summary: 'No attached GitHub PRs were present for branch feature/co-5.',
      error: null,
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-5',
      workspacePath,
      branch: 'feature/co-5',
      attachedPrUrls: [],
      matchingOpenPrUrls: [],
      closedPrUrls: []
    });
    expect(runCommand).toHaveBeenCalledTimes(3);
    expect(readIssueContext).toHaveBeenCalledTimes(1);
  });

  it('returns a detached-head summary when the issue has no attached GitHub PRs', async () => {
    const workspacePath = await createWorkspacePath();
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: []
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      expect(command).toBe('git');
      if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
        return {
          ok: true,
          exitCode: 0,
          stdout: '\n',
          stderr: ''
        };
      }
      if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'https://github.com/example/co.git\n',
          stderr: ''
        };
      }
      return {
        ok: true,
        exitCode: 0,
        stdout: `${workspaceHeadOid}\n`,
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toEqual({
      attemptedAt: '2026-03-27T00:00:00.000Z',
      status: 'noop',
      summary: 'No attached GitHub PRs were present for detached HEAD abc123def456.',
      error: null,
      issueId: 'lin-issue-1',
      issueIdentifier: 'CO-5',
      workspacePath,
      branch: null,
      attachedPrUrls: [],
      matchingOpenPrUrls: [],
      closedPrUrls: []
    });
    expect(runCommand).toHaveBeenCalledTimes(3);
    expect(readIssueContext).toHaveBeenCalledTimes(1);
  });

  it('returns a noop when the attached PR is already closed', async () => {
    const workspacePath = await createWorkspacePath();
    const attachedPrUrl = 'https://github.com/example/co/pull/123';
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [{ id: 'att-1', title: 'PR 123', url: attachedPrUrl, source_type: 'github' }]
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'https://github.com/example/co.git\n',
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      expect(command).toBe('gh');
      expect(args).toEqual(['pr', 'view', attachedPrUrl, '--json', 'state,headRefName,headRefOid,url']);
      return {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify({
          state: 'CLOSED',
          headRefName: 'feature/co-5',
          headRefOid: workspaceHeadOid,
          url: attachedPrUrl
        }),
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'noop',
      branch: 'feature/co-5',
      attachedPrUrls: [attachedPrUrl],
      matchingOpenPrUrls: [],
      closedPrUrls: []
    });
    expect(runCommand).toHaveBeenCalledTimes(4);
  });

  it('closes the attached open PR when its head branch matches the workspace branch', async () => {
    const workspacePath = await createWorkspacePath();
    const attachedPrUrl = 'https://github.com/example/co/pull/123';
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [{ id: 'att-1', title: 'PR 123', url: attachedPrUrl, source_type: 'github' }]
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'https://github.com/example/co.git\n',
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      if (args[1] === 'view') {
        return {
          ok: true,
          exitCode: 0,
          stdout: JSON.stringify({
            state: 'OPEN',
            headRefName: 'feature/co-5',
            headRefOid: workspaceHeadOid,
            url: attachedPrUrl
          }),
          stderr: ''
        };
      }
      expect(args).toEqual([
        'pr',
        'close',
        attachedPrUrl,
        '--comment',
        'Closing because the Linear issue for branch feature/co-5 entered a terminal state without merge.'
      ]);
      return {
        ok: true,
        exitCode: 0,
        stdout: 'Closed pull request\n',
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'succeeded',
      summary: 'Closed 1 attached PR(s) for branch feature/co-5.',
      branch: 'feature/co-5',
      attachedPrUrls: [attachedPrUrl],
      matchingOpenPrUrls: [attachedPrUrl],
      closedPrUrls: [attachedPrUrl]
    });
    expect(runCommand).toHaveBeenCalledTimes(5);
  });

  it.each([
    ['https://x-access-token:secret@github.com/example/co.git\n'],
    ['https://www.github.com/example/co.git\n']
  ])('accepts %s as the workspace origin remote', async (originUrl) => {
    const workspacePath = await createWorkspacePath();
    const attachedPrUrl = 'https://github.com/example/co/pull/123';
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [{ id: 'att-1', title: 'PR 123', url: attachedPrUrl, source_type: 'github' }]
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: originUrl,
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      if (args[1] === 'view') {
        return {
          ok: true,
          exitCode: 0,
          stdout: JSON.stringify({
            state: 'OPEN',
            headRefName: 'feature/co-5',
            headRefOid: workspaceHeadOid,
            url: attachedPrUrl
          }),
          stderr: ''
        };
      }
      return {
        ok: true,
        exitCode: 0,
        stdout: 'Closed pull request\n',
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'succeeded',
      summary: 'Closed 1 attached PR(s) for branch feature/co-5.',
      branch: 'feature/co-5',
      attachedPrUrls: [attachedPrUrl],
      matchingOpenPrUrls: [attachedPrUrl],
      closedPrUrls: [attachedPrUrl]
    });
    expect(runCommand).toHaveBeenCalledTimes(5);
  });

  it('surfaces a failed close attempt without throwing', async () => {
    const workspacePath = await createWorkspacePath();
    const attachedPrUrl = 'https://github.com/example/co/pull/123';
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [{ id: 'att-1', title: 'PR 123', url: attachedPrUrl, source_type: 'github' }]
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'https://github.com/example/co.git\n',
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      if (args[1] === 'view') {
        return {
          ok: true,
          exitCode: 0,
          stdout: JSON.stringify({
            state: 'OPEN',
            headRefName: 'feature/co-5',
            headRefOid: workspaceHeadOid,
            url: attachedPrUrl
          }),
          stderr: ''
        };
      }
      return {
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: 'close failed'
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'failed',
      summary:
        'Terminal cleanup closed 0 of 1 matching attached PR(s) for branch feature/co-5 and encountered 1 error(s).',
      branch: 'feature/co-5',
      attachedPrUrls: [attachedPrUrl],
      matchingOpenPrUrls: [attachedPrUrl],
      closedPrUrls: []
    });
    expect(result.error).toContain('gh pr close');
    expect(result.error).toContain('close failed');
    expect(runCommand).toHaveBeenCalledTimes(5);
  });

  it('ignores an attached PR when the branch matches but the head commit does not', async () => {
    const workspacePath = await createWorkspacePath();
    const attachedPrUrl = 'https://github.com/example/co/pull/123';
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [{ id: 'att-1', title: 'PR 123', url: attachedPrUrl, source_type: 'github' }]
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'https://github.com/example/co.git\n',
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      expect(args).toEqual(['pr', 'view', attachedPrUrl, '--json', 'state,headRefName,headRefOid,url']);
      return {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify({
          state: 'OPEN',
          headRefName: 'feature/co-5',
          headRefOid: 'ffffffffff56abc123def456abc123def456abcd',
          url: attachedPrUrl
        }),
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'noop',
      summary: 'No attached open PR matched branch feature/co-5.',
      branch: 'feature/co-5',
      attachedPrUrls: [attachedPrUrl],
      matchingOpenPrUrls: [],
      closedPrUrls: []
    });
    expect(runCommand).toHaveBeenCalledTimes(4);
  });

  it('ignores an attached PR from a different repository even when branch and head commit match', async () => {
    const workspacePath = await createWorkspacePath();
    const attachedPrUrl = 'https://github.com/other/co-fork/pull/123';
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [{ id: 'att-1', title: 'PR 123', url: attachedPrUrl, source_type: 'github' }]
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'https://github.com/example/co.git\n',
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      expect(args).toEqual(['pr', 'view', attachedPrUrl, '--json', 'state,headRefName,headRefOid,url']);
      return {
        ok: true,
        exitCode: 0,
        stdout: JSON.stringify({
          state: 'OPEN',
          headRefName: 'feature/co-5',
          headRefOid: workspaceHeadOid,
          url: attachedPrUrl
        }),
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'noop',
      summary: 'No attached open PR matched branch feature/co-5.',
      branch: 'feature/co-5',
      attachedPrUrls: [attachedPrUrl],
      matchingOpenPrUrls: [],
      closedPrUrls: []
    });
    expect(runCommand).toHaveBeenCalledTimes(3);
  });

  it('caps attached PR cleanup work and reports the skipped remainder as a non-fatal failure', async () => {
    const workspacePath = await createWorkspacePath();
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const attachedPrUrls = Array.from({ length: 21 }, (_, index) => `https://github.com/example/co/pull/${index + 1}`);
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: attachedPrUrls.map((url, index) => ({
          id: `att-${index + 1}`,
          title: `PR ${index + 1}`,
          url,
          source_type: 'github'
        }))
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'https://github.com/example/co.git\n',
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      if (args[1] === 'view') {
        return {
          ok: true,
          exitCode: 0,
          stdout: JSON.stringify({
            state: 'OPEN',
            headRefName: 'feature/co-5',
            headRefOid: workspaceHeadOid,
            url: args[2]
          }),
          stderr: ''
        };
      }
      return {
        ok: true,
        exitCode: 0,
        stdout: 'Closed pull request\n',
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z',
        nowMs: () => 0
      }
    );

    expect(result).toMatchObject({
      status: 'failed',
      summary:
        'Terminal cleanup closed 20 of 20 matching attached PR(s) for branch feature/co-5 and encountered 1 error(s).',
      branch: 'feature/co-5',
      matchingOpenPrUrls: attachedPrUrls.slice(0, 20),
      closedPrUrls: attachedPrUrls.slice(0, 20)
    });
    expect(result.attachedPrUrls).toEqual(attachedPrUrls);
    expect(result.error).toContain('skipped 1 attached PR(s) beyond cleanup cap of 20');
    expect(runCommand).toHaveBeenCalledTimes(43);
  });

  it('filters foreign-repo attachments before applying the cleanup cap', async () => {
    const workspacePath = await createWorkspacePath();
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const foreignRepoUrls = Array.from(
      { length: 25 },
      (_, index) => `https://github.com/other/co-fork/pull/${index + 1}`
    );
    const matchingPrUrl = 'https://github.com/example/co/pull/999';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [...foreignRepoUrls, matchingPrUrl].map((url, index) => ({
          id: `att-${index + 1}`,
          title: `PR ${index + 1}`,
          url,
          source_type: 'github'
        }))
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git') {
        if (args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'feature/co-5\n',
            stderr: ''
          };
        }
        if (args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
          return {
            ok: true,
            exitCode: 0,
            stdout: 'https://github.com/example/co.git\n',
            stderr: ''
          };
        }
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      if (args[1] === 'view') {
        expect(args).toEqual(['pr', 'view', matchingPrUrl, '--json', 'state,headRefName,headRefOid,url']);
        return {
          ok: true,
          exitCode: 0,
          stdout: JSON.stringify({
            state: 'OPEN',
            headRefName: 'feature/co-5',
            headRefOid: workspaceHeadOid,
            url: matchingPrUrl
          }),
          stderr: ''
        };
      }
      expect(args).toEqual([
        'pr',
        'close',
        matchingPrUrl,
        '--comment',
        'Closing because the Linear issue for branch feature/co-5 entered a terminal state without merge.'
      ]);
      return {
        ok: true,
        exitCode: 0,
        stdout: 'Closed pull request\n',
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z',
        nowMs: () => 0
      }
    );

    expect(result).toMatchObject({
      status: 'succeeded',
      summary: 'Closed 1 attached PR(s) for branch feature/co-5.',
      branch: 'feature/co-5',
      attachedPrUrls: [...foreignRepoUrls, matchingPrUrl],
      matchingOpenPrUrls: [matchingPrUrl],
      closedPrUrls: [matchingPrUrl]
    });
    expect(result.error).toBeNull();
    expect(runCommand).toHaveBeenCalledTimes(5);
  });

  it('closes an attached PR from a detached workspace when the PR head commit matches HEAD', async () => {
    const workspacePath = await createWorkspacePath();
    const attachedPrUrl = 'https://github.com/example/co/pull/123';
    const workspaceHeadOid = 'abc123def456abc123def456abc123def456abcd';
    const readIssueContext = vi.fn(async () => ({
      ok: true as const,
      operation: 'issue-context' as const,
      issue: {
        attachments: [{ id: 'att-1', title: 'PR 123', url: attachedPrUrl, source_type: 'github' }]
      }
    }));
    const runCommand = vi.fn<ProviderTerminalCleanupCommandRunner>(async ({ command, args }) => {
      if (command === 'git' && args.at(-2) === 'branch' && args.at(-1) === '--show-current') {
        return {
          ok: true,
          exitCode: 0,
          stdout: '\n',
          stderr: ''
        };
      }
      if (command === 'git' && args.at(-2) === 'rev-parse' && args.at(-1) === 'HEAD') {
        return {
          ok: true,
          exitCode: 0,
          stdout: `${workspaceHeadOid}\n`,
          stderr: ''
        };
      }
      if (command === 'git' && args.at(-3) === 'remote' && args.at(-2) === 'get-url' && args.at(-1) === 'origin') {
        return {
          ok: true,
          exitCode: 0,
          stdout: 'https://github.com/example/co.git\n',
          stderr: ''
        };
      }
      if (args[1] === 'view') {
        expect(args).toEqual(['pr', 'view', attachedPrUrl, '--json', 'state,headRefName,headRefOid,url']);
        return {
          ok: true,
          exitCode: 0,
          stdout: JSON.stringify({
            state: 'OPEN',
            headRefName: 'feature/co-5',
            headRefOid: workspaceHeadOid,
            url: attachedPrUrl
          }),
          stderr: ''
        };
      }
      expect(args).toEqual([
        'pr',
        'close',
        attachedPrUrl,
        '--comment',
        'Closing because the Linear issue for branch feature/co-5 entered a terminal state without merge.'
      ]);
      return {
        ok: true,
        exitCode: 0,
        stdout: 'Closed pull request\n',
        stderr: ''
      };
    });

    const result = await runProviderTerminalCleanup(
      {
        issueId: 'lin-issue-1',
        issueIdentifier: 'CO-5',
        workspacePath,
        config: buildEnabledCleanupConfig()
      },
      {
        readIssueContext,
        runCommand,
        now: () => '2026-03-27T00:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      status: 'succeeded',
      summary: 'Closed 1 attached PR(s) for branch feature/co-5.',
      branch: 'feature/co-5',
      attachedPrUrls: [attachedPrUrl],
      matchingOpenPrUrls: [attachedPrUrl],
      closedPrUrls: [attachedPrUrl]
    });
    expect(runCommand).toHaveBeenCalledTimes(5);
  });
});

async function createWorkspacePath(): Promise<string> {
  const workspacePath = await mkdtemp(join(tmpdir(), 'provider-terminal-cleanup-'));
  cleanupRoots.push(workspacePath);
  return workspacePath;
}

function buildEnabledCleanupConfig(): ProviderTerminalCleanupConfig {
  return {
    enabled: true,
    closeAttachedPr: {
      enabled: true,
      commentTemplate: DEFAULT_PROVIDER_TERMINAL_CLEANUP_COMMENT_TEMPLATE
    }
  };
}
