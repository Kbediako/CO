import { afterEach, describe, expect, it, vi } from 'vitest';

import { runLinearCliShell } from '../src/cli/linearCliShell.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runLinearCliShell', () => {
  it('routes issue-context into the facade and emits json', async () => {
    const printHelp = vi.fn();
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const getProviderLinearIssueContextMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').getProviderLinearIssueContext>()
        .mockResolvedValue({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1',
            title: 'Add Linear helper',
            description: null,
            url: null,
            updated_at: null,
            workspace_id: 'lin-workspace-1',
            state: null,
            team: null,
            project: null,
            comments: [],
            attachments: [],
            workpad_comment: null
          },
          source_setup: {
            provider: 'linear',
            workspace_id: 'lin-workspace-1',
            team_id: 'lin-team-1',
            project_id: null
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['issue-context'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          'workspace-id': 'lin-workspace-1',
          'team-id': 'lin-team-1'
        },
        printHelp
      },
      {
        getProviderLinearIssueContext: getProviderLinearIssueContextMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(printHelp).not.toHaveBeenCalled();
    expect(getProviderLinearIssueContextMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: null
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-1'
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'issue-context',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-1',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: null
      },
      action: null,
      via: null,
      state: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
  });

  it('reads workpad content from a file before calling the facade', async () => {
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'upsert-workpad',
          action: 'noop',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment: {
            id: 'comment-1',
            body: '## Codex Workpad\n\nPlan',
            url: null,
            created_at: null,
            updated_at: null
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['upsert-workpad'],
        flags: {
          'issue-id': 'lin-issue-1',
          'body-file': '/tmp/workpad.md'
        },
        printHelp: vi.fn()
      },
      {
        upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
        readTextFile: vi.fn(async () => '## Codex Workpad\n\nPlan'),
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log: vi.fn()
      }
    );

    expect(upsertProviderLinearWorkpadCommentMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      body: '## Codex Workpad\n\nPlan',
      commentId: null,
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
  });

  it('preserves raw inline workpad body text instead of trimming surrounding newlines', async () => {
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'upsert-workpad',
          action: 'noop',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment: {
            id: 'comment-1',
            body: '\n## Codex Workpad\n\nPlan\n',
            url: null,
            created_at: null,
            updated_at: null
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['upsert-workpad'],
        flags: {
          'issue-id': 'lin-issue-1',
          body: '\n## Codex Workpad\n\nPlan\n'
        },
        printHelp: vi.fn()
      },
      {
        upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log: vi.fn()
      }
    );

    expect(upsertProviderLinearWorkpadCommentMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      body: '\n## Codex Workpad\n\nPlan\n',
      commentId: null,
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
  });

  it('routes delete-workpad into the facade and emits json', async () => {
    const log = vi.fn();
    const deleteProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').deleteProviderLinearWorkpadComment>()
        .mockResolvedValue({
          ok: true,
          operation: 'delete-workpad',
          action: 'deleted',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          comment_id: 'comment-1',
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['delete-workpad'],
        flags: {
          'issue-id': 'lin-issue-1',
          'comment-id': 'comment-1'
        },
        printHelp: vi.fn()
      },
      {
        deleteProviderLinearWorkpadComment: deleteProviderLinearWorkpadCommentMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log
      }
    );

    expect(deleteProviderLinearWorkpadCommentMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      commentId: 'comment-1',
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: true,
      operation: 'delete-workpad',
      action: 'deleted',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment_id: 'comment-1',
      source_setup: null
    });
  });

  it('sets a non-zero exit code when a structured Linear operation fails', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const attachProviderLinearIssuePrMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').attachProviderLinearIssuePr>()
        .mockResolvedValue({
          ok: false,
          operation: 'attach-pr',
          error: {
            code: 'linear_graphql_error',
            message: 'Linear GraphQL returned operation errors.',
            status: 422
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['attach-pr'],
        flags: {
          'issue-id': 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123'
        },
        printHelp: vi.fn()
      },
      {
        attachProviderLinearIssuePr: attachProviderLinearIssuePrMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CO_LINEAR_WORKSPACE_ID: 'lin-workspace-1',
          CO_LINEAR_TEAM_ID: 'lin-team-1',
          CO_LINEAR_PROJECT_ID: 'lin-project-1',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 422
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'attach-pr',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      action: null,
      via: null,
      state: null,
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_graphql_error',
      error_message: 'Linear GraphQL returned operation errors.'
    });
  });

  it('records only the explicitly requested scope for failed audit entries', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const attachProviderLinearIssuePrMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').attachProviderLinearIssuePr>()
        .mockResolvedValue({
          ok: false,
          operation: 'attach-pr',
          error: {
            code: 'linear_graphql_error',
            message: 'Linear GraphQL returned operation errors.',
            status: 422
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['attach-pr'],
        flags: {
          'issue-id': 'lin-issue-1',
          'workspace-id': 'lin-workspace-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123'
        },
        printHelp: vi.fn()
      },
      {
        attachProviderLinearIssuePr: attachProviderLinearIssuePrMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CO_LINEAR_TEAM_ID: 'lin-team-1',
          CO_LINEAR_PROJECT_ID: 'lin-project-1',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log,
        setExitCode
      }
    );

    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 422
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'attach-pr',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: null,
        project_id: null
      },
      action: null,
      via: null,
      state: null,
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_graphql_error',
      error_message: 'Linear GraphQL returned operation errors.'
    });
  });

  it('does not fail a successful helper call when audit append best-effort logging fails', async () => {
    const log = vi.fn();
    const warn = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn().mockRejectedValue(new Error('disk full'));
    const getProviderLinearIssueContextMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').getProviderLinearIssueContext>()
        .mockResolvedValue({
          ok: true,
          operation: 'issue-context',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1',
            title: 'Add Linear helper',
            description: null,
            url: null,
            updated_at: null,
            workspace_id: 'lin-workspace-1',
            state: null,
            team: null,
            project: null,
            comments: [],
            attachments: [],
            workpad_comment: null
          },
          source_setup: null
        } as never);

    await expect(
      runLinearCliShell(
        {
          positionals: ['issue-context'],
          flags: {
            format: 'json',
            'issue-id': 'lin-issue-1'
          },
          printHelp: vi.fn()
        },
        {
          getProviderLinearIssueContext: getProviderLinearIssueContextMock,
          getEnv: () => ({
            CO_LINEAR_API_TOKEN: 'lin-api-token',
            CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
          }),
          now: () => '2026-03-22T12:00:00.000Z',
          appendAuditEntry,
          log,
          warn,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-1'
      }
    });
    expect(warn).toHaveBeenCalledWith(
      'linear audit warning: failed to append audit entry to /tmp/provider-linear-audit.jsonl: disk full'
    );
    expect(setExitCode).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'unknown subcommands',
      params: {
        positionals: ['unknown'],
        flags: {}
      },
      expected: {
        code: 'linear_unknown_subcommand',
        message: 'Unknown linear subcommand: unknown',
        status: 422
      }
    },
    {
      name: 'missing required flags',
      params: {
        positionals: ['issue-context'],
        flags: {}
      },
      expected: {
        code: 'linear_missing_flag',
        message: '--issue-id is required.',
        status: 422
      }
    },
    {
      name: 'unknown flags',
      params: {
        positionals: ['issue-context'],
        flags: {
          'issue-id': 'lin-issue-1',
          bogus: 'value'
        }
      },
      expected: {
        code: 'linear_unknown_flag',
        message: 'Unknown linear flag: --bogus',
        status: 422
      }
    }
  ])('emits machine-readable json for %s', async ({ params, expected }) => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await expect(
      runLinearCliShell(
        {
          ...params,
          printHelp: vi.fn()
        },
        {
          log,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: expected
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
  });

  it('emits machine-readable json when a local runtime error escapes argument validation', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();

    await expect(
      runLinearCliShell(
        {
          positionals: ['upsert-workpad'],
          flags: {
            'issue-id': 'lin-issue-1',
            'body-file': '/missing/workpad.md'
          },
          printHelp: vi.fn()
        },
        {
          readTextFile: vi.fn(async () => {
            throw new Error('ENOENT: missing workpad file');
          }),
          log,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_cli_error',
        message: 'ENOENT: missing workpad file',
        status: 500
      }
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
  });
});
