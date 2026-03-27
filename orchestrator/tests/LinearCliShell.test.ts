import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { runLinearCliShell } from '../src/cli/linearCliShell.js';

const tempDirs: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      rm(dir, {
        force: true,
        recursive: true
      })
    )
  );
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
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
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

  it('treats string boolean literals as enabled for blocked-by-source', async () => {
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: true,
          operation: 'create-follow-up',
          action: 'created',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up',
            description: 'Investigate',
            url: 'https://linear.app/example/issue/CO-2',
            state: null,
            team: null,
            project: null
          },
          relations: {
            related: true,
            blocked_by_source: true
          },
          source_setup: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate',
          'acceptance-criteria': '- [ ] Captured',
          'blocked-by-source': 'true'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        log: vi.fn()
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      title: 'Follow-up',
      description: 'Investigate',
      acceptanceCriteria: '- [ ] Captured',
      blockedBySource: true,
      sourceSetup: null,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      }
    });
  });

  it('routes runtime-proof into the policy resolver and records audit metadata', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const resolveProviderLinearRuntimeProofMock =
      vi.fn<typeof import('../src/cli/control/providerLinearRuntimeProof.js').resolveProviderLinearRuntimeProof>()
        .mockResolvedValue({
          ok: true,
          policy: {
            origin: 'https://app.example.com',
            permit_path: '/repo/compliance/permit.json',
            permit_status: 'found',
            approval_id: 'approval-1',
            approver: 'Approval Board',
            capabilities: {
              screenshot: true,
              external_link: false,
              video: false
            },
            allowed_kinds: ['screenshot'],
            blocked_kinds: ['external-link', 'video'],
            summary:
              'screenshot proof is permitted for https://app.example.com; external-link and video are blocked.'
          },
          proof: {
            kind: 'screenshot',
            reviewer_url: 'https://review-assets.example.com/proof.png',
            title: 'Dashboard after launch-app validation',
            summary: 'Signed-in dashboard state.'
          },
          handoff: {
            workpad_markdown:
              '- Runtime proof policy: screenshot proof is permitted for https://app.example.com; external-link and video are blocked.',
            pr_markdown: '### Runtime Proof'
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['runtime-proof'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          origin: 'https://app.example.com',
          kind: 'screenshot',
          'proof-url': 'https://review-assets.example.com/proof.png',
          title: 'Dashboard after launch-app validation',
          summary: 'Signed-in dashboard state.'
        },
        printHelp: vi.fn()
      },
      {
        resolveProviderLinearRuntimeProof: resolveProviderLinearRuntimeProofMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        getCwd: () => '/repo',
        now: () => '2026-03-27T05:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(resolveProviderLinearRuntimeProofMock).toHaveBeenCalledWith({
      repoRoot: '/repo',
      origin: 'https://app.example.com',
      kind: 'screenshot',
      proofUrl: 'https://review-assets.example.com/proof.png',
      title: 'Dashboard after launch-app validation',
      summary: 'Signed-in dashboard state.'
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'runtime-proof',
      issue_id: 'lin-issue-1',
      proof: {
        kind: 'screenshot'
      },
      handoff: {
        pr_markdown: '### Runtime Proof'
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-27T05:00:00.000Z',
      operation: 'runtime-proof',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: 'screenshot',
      via: 'permit:found',
      state: null,
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
  });

  it('resolves runtime-proof permits from the repo root when invoked in a nested package directory', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'linear-cli-runtime-proof-root-'));
    tempDirs.push(repoRoot);
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(repoRoot, 'tasks', 'index.json'), '{"items":[]}', 'utf8');
    await mkdir(join(repoRoot, 'packages', 'app'), { recursive: true });

    const resolveProviderLinearRuntimeProofMock =
      vi.fn<typeof import('../src/cli/control/providerLinearRuntimeProof.js').resolveProviderLinearRuntimeProof>()
        .mockResolvedValue({
          ok: true,
          policy: {
            origin: 'https://app.example.com',
            permit_path: join(repoRoot, 'compliance', 'permit.json'),
            permit_status: 'missing',
            approval_id: null,
            approver: null,
            capabilities: {
              screenshot: false,
              external_link: false,
              video: false
            },
            allowed_kinds: [],
            blocked_kinds: ['screenshot', 'external-link', 'video'],
            summary: 'No permit'
          },
          proof: null,
          handoff: null
        } as never);

    await runLinearCliShell(
      {
        positionals: ['runtime-proof'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          origin: 'https://app.example.com'
        },
        printHelp: vi.fn()
      },
      {
        resolveProviderLinearRuntimeProof: resolveProviderLinearRuntimeProofMock,
        getEnv: () => ({ CO_LINEAR_API_TOKEN: 'lin-api-token' }),
        getCwd: () => join(repoRoot, 'packages', 'app'),
        log: vi.fn()
      }
    );

    expect(resolveProviderLinearRuntimeProofMock).toHaveBeenCalledWith({
      repoRoot,
      origin: 'https://app.example.com',
      kind: null,
      proofUrl: null,
      title: undefined,
      summary: undefined
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
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: 'linear_graphql_error',
      error_message: 'Linear GraphQL returned operation errors.'
    });
  });

  it('routes create-follow-up into the facade and records audit metadata', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: true,
          operation: 'create-follow-up',
          action: 'created',
          issue: {
            id: 'lin-issue-1',
            identifier: 'CO-1'
          },
          follow_up_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up',
            description: 'Do the thing',
            url: 'https://linear.app/example/issue/CO-2',
            state: {
              id: 'state-backlog',
              name: 'Backlog',
              type: 'unstarted'
            },
            team: {
              id: 'lin-team-1',
              key: 'CO',
              name: 'Codex Orchestrator'
            },
            project: {
              id: 'lin-project-1',
              name: 'CO'
            }
          },
          relations: {
            related: true,
            blocked_by_source: true
          },
          source_setup: {
            provider: 'linear',
            workspace_id: 'lin-workspace-1',
            team_id: 'lin-team-1',
            project_id: 'lin-project-1'
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'acceptance-criteria-file': '/tmp/acceptance.md',
          'blocked-by-source': true,
          'workspace-id': 'lin-workspace-1',
          'team-id': 'lin-team-1',
          'project-id': 'lin-project-1'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        readTextFile: vi.fn(async () => '- [ ] Captured'),
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-22T12:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(createProviderLinearFollowUpIssueMock).toHaveBeenCalledWith({
      issueId: 'lin-issue-1',
      title: 'Follow-up',
      description: 'Investigate the remaining improvement',
      acceptanceCriteria: '- [ ] Captured',
      blockedBySource: true,
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'create-follow-up',
      follow_up_issue: {
        identifier: 'CO-2',
        url: 'https://linear.app/example/issue/CO-2'
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'create-follow-up',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-1',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      action: 'created',
      via: 'related+blocks',
      state: 'Backlog',
      follow_up_issue_id: 'lin-issue-2',
      follow_up_issue_identifier: 'CO-2',
      failed_relation_type: null,
      comment_id: null,
      attachment_id: null,
      error_code: null,
      error_message: null
    });
  });

  it('records follow-up recovery metadata when create-follow-up fails after issue creation', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const appendAuditEntry = vi.fn();
    const createProviderLinearFollowUpIssueMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').createProviderLinearFollowUpIssue>()
        .mockResolvedValue({
          ok: false,
          operation: 'create-follow-up',
          error: {
            code: 'linear_graphql_error',
            message: 'Linear GraphQL returned operation errors.',
            status: 502,
            details: {
              errors: ['relation failed'],
              created_issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2'
              },
              failed_relation_type: 'blocks'
            }
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['create-follow-up'],
        flags: {
          format: 'json',
          'issue-id': 'lin-issue-1',
          title: 'Follow-up',
          description: 'Investigate the remaining improvement',
          'acceptance-criteria': '- [ ] Captured'
        },
        printHelp: vi.fn()
      },
      {
        createProviderLinearFollowUpIssue: createProviderLinearFollowUpIssueMock,
        getEnv: () => ({
          CO_LINEAR_API_TOKEN: 'lin-api-token',
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
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 502,
        details: {
          errors: ['relation failed'],
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2'
          },
          failed_relation_type: 'blocks'
        }
      }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', {
      recorded_at: '2026-03-22T12:00:00.000Z',
      operation: 'create-follow-up',
      ok: false,
      issue_id: 'lin-issue-1',
      issue_identifier: null,
      source_setup: null,
      action: null,
      via: null,
      state: null,
      follow_up_issue_id: 'lin-issue-2',
      follow_up_issue_identifier: 'CO-2',
      failed_relation_type: 'blocks',
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
      follow_up_issue_id: null,
      follow_up_issue_identifier: null,
      failed_relation_type: null,
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

  it('routes child-stream into the provider worker launcher and audits the result', async () => {
    const log = vi.fn();
    const appendAuditEntry = vi.fn();
    const runProviderLinearChildStreamShellMock =
      vi.fn<typeof import('../src/cli/providerLinearChildStreamShell.js').runProviderLinearChildStreamShell>()
        .mockResolvedValue({
          ok: true,
          operation: 'child-stream',
          action: 'launched',
          issue: { id: 'lin-issue-1', identifier: 'CO-13' },
          source_setup: null,
          stream: 'docs-review',
          pipeline_id: 'docs-review',
          child_run: {
            run_id: 'docs-run-1',
            task_id: 'linear-lin-issue-1-docs-review',
            pipeline_id: 'docs-review',
            status: 'succeeded',
            artifact_root: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1',
            manifest_path: '/tmp/repo/.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/manifest.json',
            log_path: '.runs/linear-lin-issue-1-docs-review/cli/docs-run-1/run.log',
            summary: 'docs-review passed',
            runtime_mode_requested: null,
            runtime_mode: null,
            runtime_provider: null
          }
        } as never);

    await runLinearCliShell(
      {
        positionals: ['child-stream'],
        flags: {
          format: 'json',
          pipeline: 'docs-review'
        },
        printHelp: vi.fn()
      },
      {
        runProviderLinearChildStreamShell: runProviderLinearChildStreamShellMock,
        getEnv: () => ({
          CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
        }),
        now: () => '2026-03-27T01:00:00.000Z',
        appendAuditEntry,
        log
      }
    );

    expect(runProviderLinearChildStreamShellMock).toHaveBeenCalledWith({
      pipelineId: 'docs-review',
      streamName: null,
      env: {
        CODEX_PROVIDER_LINEAR_AUDIT_PATH: '/tmp/provider-linear-audit.jsonl'
      }
    });
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      ok: true,
      operation: 'child-stream',
      stream: 'docs-review',
      child_run: { run_id: 'docs-run-1', status: 'succeeded' }
    });
    expect(appendAuditEntry).toHaveBeenCalledWith('/tmp/provider-linear-audit.jsonl', expect.objectContaining({
      recorded_at: '2026-03-27T01:00:00.000Z',
      operation: 'child-stream',
      ok: true,
      issue_id: 'lin-issue-1',
      issue_identifier: 'CO-13',
      action: 'stream:docs-review',
      via: 'pipeline:docs-review',
      state: 'succeeded'
    }));
  });

  it('rejects whitespace-only file-backed required text inputs', async () => {
    const log = vi.fn();
    const setExitCode = vi.fn();
    const upsertProviderLinearWorkpadCommentMock =
      vi.fn<typeof import('../src/cli/control/providerLinearWorkflowFacade.js').upsertProviderLinearWorkpadComment>();

    await expect(
      runLinearCliShell(
        {
          positionals: ['upsert-workpad'],
          flags: {
            format: 'json',
            'issue-id': 'lin-issue-1',
            'body-file': '/tmp/workpad.md'
          },
          printHelp: vi.fn()
        },
        {
          readTextFile: vi.fn(async () => '   \n'),
          upsertProviderLinearWorkpadComment: upsertProviderLinearWorkpadCommentMock,
          log,
          setExitCode
        }
      )
    ).resolves.toBeUndefined();

    expect(upsertProviderLinearWorkpadCommentMock).not.toHaveBeenCalled();
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      ok: false,
      error: {
        code: 'linear_body_missing',
        message: '--body or --body-file is required.',
        status: 422
      }
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
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

  it('treats unreadable file-backed required text inputs as usage errors', async () => {
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
        code: 'linear_body_file_unreadable',
        message: '--body-file must reference a readable file.',
        status: 422
      }
    });
    expect(setExitCode).toHaveBeenCalledWith(1);
  });
});
