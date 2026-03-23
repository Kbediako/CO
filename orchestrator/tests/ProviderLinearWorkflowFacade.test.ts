import { describe, expect, it, vi } from 'vitest';

import {
  attachProviderLinearIssuePr,
  deleteProviderLinearWorkpadComment,
  getProviderLinearIssueContext,
  transitionProviderLinearIssueState,
  upsertProviderLinearWorkpadComment
} from '../src/cli/control/providerLinearWorkflowFacade.js';

const scopedSourceSetup = {
  provider: 'linear' as const,
  workspace_id: 'lin-workspace-1',
  team_id: 'lin-team-1',
  project_id: 'lin-project-1'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function buildIssueContextBody(overrides: Record<string, unknown> = {}): unknown {
  return {
    data: {
      viewer: {
        organization: {
          id: 'lin-workspace-1'
        }
      },
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1',
        title: 'Add Linear parity helper',
        description: 'Implement the worker-visible helper surface.',
        url: 'https://linear.app/example/issue/CO-1',
        updatedAt: '2026-03-22T10:00:00.000Z',
        state: {
          id: 'state-in-progress',
          name: 'In Progress',
          type: 'started'
        },
        team: {
          id: 'lin-team-1',
          key: 'CO',
          name: 'Codex Orchestrator',
          states: {
            nodes: [
              {
                id: 'state-in-progress',
                name: 'In Progress',
                type: 'started'
              },
              {
                id: 'state-human-review',
                name: 'Human Review',
                type: 'started'
              },
              {
                id: 'state-done',
                name: 'Done',
                type: 'completed'
              }
            ]
          }
        },
        project: {
          id: 'lin-project-1',
          name: 'CO'
        },
        comments: {
          nodes: [
            {
              id: 'comment-workpad',
              body: '## Codex Workpad\n\nOld plan',
              url: 'https://linear.app/comment/workpad',
              createdAt: '2026-03-22T09:00:00.000Z',
              updatedAt: '2026-03-22T09:30:00.000Z',
              resolvedAt: null
            },
            {
              id: 'comment-note',
              body: 'Unrelated note',
              url: 'https://linear.app/comment/note',
              createdAt: '2026-03-22T08:00:00.000Z',
              updatedAt: '2026-03-22T08:30:00.000Z',
              resolvedAt: null
            }
          ]
        },
        attachments: {
          nodes: []
        },
        ...overrides
      }
    }
  };
}

describe('providerLinearWorkflowFacade', () => {
  it('returns issue context with comments, team states, attachments, and resolved workpad comment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string } };
      expect(body.query).toContain('comments(first: 50, after: $commentsAfter)');
      expect(body.query).toContain('states(first: 50)');
      expect(body.query).toContain('attachments(first: 20)');
      expect(body.variables?.issueId).toBe('lin-issue-1');
      return jsonResponse(buildIssueContextBody());
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      issue: {
        identifier: 'CO-1',
        team: {
          key: 'CO',
          states: [
            { id: 'state-in-progress', name: 'In Progress', type: 'started' },
            { id: 'state-human-review', name: 'Human Review', type: 'started' },
            { id: 'state-done', name: 'Done', type: 'completed' }
          ]
        },
        workpad_comment: {
          id: 'comment-workpad',
          body: '## Codex Workpad\n\nOld plan'
        }
      }
    });
  });

  it.each([
    ['team', { team: null }, 'linear_team_mismatch', 'lin-team-1'],
    ['project', { project: null }, 'linear_project_mismatch', 'lin-project-1']
  ])('fails closed when the scoped %s binding is missing from the issue context', async (_scope, overrides, code, expected) => {
    const fetchImpl: typeof fetch = vi.fn(async () => jsonResponse(buildIssueContextBody(overrides)));

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      sourceSetup: scopedSourceSetup,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: false,
      operation: 'issue-context',
      error: {
        code,
        status: 422,
        details: {
          expected,
          actual: null
        }
      }
    });
  });

  it('keeps a caller-supplied persisted scope authoritative instead of backfilling missing fields from env', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => jsonResponse(buildIssueContextBody()));

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: null,
        project_id: null
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CO_LINEAR_TEAM_ID: 'lin-team-from-env',
        CO_LINEAR_PROJECT_ID: 'lin-project-from-env'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'issue-context',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: null,
        project_id: null
      }
    });
  });

  it('updates an existing workpad comment instead of creating a duplicate', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad',
          body: '## Codex Workpad\n\nUpdated plan'
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: '## Codex Workpad\n\nUpdated plan'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: '## Codex Workpad\n\nUpdated plan',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad',
        url: 'https://linear.app/comment/workpad',
        body: '## Codex Workpad\n\nUpdated plan',
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when commentId points at an unresolved human comment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: '## Codex Workpad\n\nUpdated plan',
      commentId: 'comment-note',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'linear_workpad_comment_id_invalid',
        message: 'Comment id must reference an unresolved Codex workpad comment.',
        status: 422,
        details: {
          comment_id: 'comment-note'
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('updates the caller-selected unresolved workpad comment when commentId is valid', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: [
                {
                  id: 'comment-workpad-target',
                  body: '## Codex Workpad\n\nTarget plan',
                  url: 'https://linear.app/comment/workpad-target',
                  createdAt: '2026-03-22T07:00:00.000Z',
                  updatedAt: '2026-03-22T07:30:00.000Z',
                  resolvedAt: null
                },
                {
                  id: 'comment-workpad-current',
                  body: '## Codex Workpad\n\nCurrent plan',
                  url: 'https://linear.app/comment/workpad-current',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad-target',
          body: '## Codex Workpad\n\nUpdated plan'
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad-target',
                url: 'https://linear.app/comment/workpad-target',
                body: '## Codex Workpad\n\nUpdated plan'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: '## Codex Workpad\n\nUpdated plan',
      commentId: 'comment-workpad-target',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad-target',
        url: 'https://linear.app/comment/workpad-target',
        body: '## Codex Workpad\n\nUpdated plan',
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('ignores resolved workpad comments when selecting the active workpad', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-workpad-old',
                body: '## Codex Workpad\n\nOld resolved plan',
                url: 'https://linear.app/comment/workpad-old',
                createdAt: '2026-03-22T07:00:00.000Z',
                updatedAt: '2026-03-22T07:30:00.000Z',
                resolvedAt: '2026-03-22T07:45:00.000Z'
              },
              {
                id: 'comment-workpad-current',
                body: '## Codex Workpad\n\nCurrent active plan',
                url: 'https://linear.app/comment/workpad-current',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        }));
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      issue: {
        workpad_comment: {
          id: 'comment-workpad-current',
          body: '## Codex Workpad\n\nCurrent active plan'
        }
      }
    });
  });

  it('paginates comments so an active workpad beyond the first page is updated instead of duplicated', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string | null>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        if (body.variables?.commentsAfter === null) {
          return jsonResponse(
            buildIssueContextBody({
              comments: {
                nodes: Array.from({ length: 50 }, (_, index) => ({
                  id: `comment-note-${index + 1}`,
                  body: `Unrelated note ${index + 1}`,
                  url: `https://linear.app/comment/note-${index + 1}`,
                  createdAt: '2026-03-22T08:00:00.000Z',
                  updatedAt: '2026-03-22T08:30:00.000Z',
                  resolvedAt: null
                })),
                pageInfo: {
                  hasNextPage: true,
                  endCursor: 'cursor-1'
                }
              }
            })
          );
        }
        if (body.variables?.commentsAfter === 'cursor-1') {
          return jsonResponse(
            buildIssueContextBody({
              comments: {
                nodes: [
                  {
                    id: 'comment-workpad-later',
                    body: '## Codex Workpad\n\nCurrent active plan',
                    url: 'https://linear.app/comment/workpad-later',
                    createdAt: '2026-03-22T09:00:00.000Z',
                    updatedAt: '2026-03-22T09:30:00.000Z',
                    resolvedAt: null
                  }
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null
                }
              }
            })
          );
        }
      }
      if (body.query?.includes('ProviderLinearUpdateComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad-later',
          body: '## Codex Workpad\n\nUpdated plan'
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad-later',
                url: 'https://linear.app/comment/workpad-later',
                body: '## Codex Workpad\n\nUpdated plan'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: '## Codex Workpad\n\nUpdated plan',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      ok: true,
      operation: 'upsert-workpad',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-workpad-later',
        body: '## Codex Workpad\n\nUpdated plan'
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('deletes the current unresolved workpad comment when requested', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearDeleteComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad'
        });
        return jsonResponse({
          data: {
            commentDelete: {
              success: true,
              entityId: 'comment-workpad'
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'delete-workpad',
      action: 'deleted',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment_id: 'comment-workpad',
      source_setup: null
    });
  });

  it('treats an already-removed workpad comment as an idempotent delete success', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearDeleteComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad'
        });
        return jsonResponse({
          data: {
            commentDelete: {
              success: false,
              entityId: 'comment-workpad'
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'delete-workpad',
      action: 'deleted',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment_id: 'comment-workpad',
      source_setup: null
    });
  });

  it('fails delete-workpad when Linear reports failure without confirming the deleted comment id', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearDeleteComment')) {
        expect(body.variables).toEqual({
          id: 'comment-workpad'
        });
        return jsonResponse({
          data: {
            commentDelete: {
              success: false,
              entityId: null
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await deleteProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'delete-workpad',
      error: {
        code: 'comment_delete_failed',
        message: 'Linear comment delete did not succeed.',
        status: 503
      }
    });
  });

  it('resolves a state name to a state id before transitioning the issue', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearMoveIssue')) {
        expect(body.variables).toEqual({
          id: 'lin-issue-1',
          stateId: 'state-human-review'
        });
        return jsonResponse({
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: 'lin-issue-1',
                identifier: 'CO-1',
                state: {
                  id: 'state-human-review',
                  name: 'Human Review',
                  type: 'started'
                }
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await transitionProviderLinearIssueState({
      issueId: 'lin-issue-1',
      stateName: 'human review',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'transition',
      action: 'updated',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1',
        state: {
          id: 'state-human-review',
          name: 'Human Review',
          type: 'started'
        }
      },
      previous_state: {
        id: 'state-in-progress',
        name: 'In Progress',
        type: 'started'
      },
      target_state: {
        id: 'state-human-review',
        name: 'Human Review',
        type: 'started'
      },
      source_setup: null
    });
  });

  it('falls back to a plain URL attachment when the GitHub-specific mutation errors', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123',
          title: 'PR 123'
        });
        return jsonResponse({
          errors: [{ message: 'GitHub attachment mutation unavailable.' }]
        });
      }
      if (body.query?.includes('ProviderLinearAttachUrl')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123',
          title: 'PR 123'
        });
        return jsonResponse({
          data: {
            attachmentLinkURL: {
              success: true,
              attachment: {
                id: 'attachment-1',
                title: 'PR 123',
                url: 'https://github.com/openai/codex-orchestrator/pull/123',
                sourceType: 'url'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/pull/123',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'attached',
      via: 'url',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-1',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'url'
      },
      source_setup: null
    });
  });

  it('normalizes 2xx GraphQL errors to an upstream-safe status code', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        errors: [{ message: 'Linear returned operation errors.' }]
      })
    );

    const result = await getProviderLinearIssueContext({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'issue-context',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 502,
        details: {
          errors: ['Linear returned operation errors.']
        }
      }
    });
  });

  it('dedupes existing PR attachments using canonicalized GitHub URLs', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            attachments: {
              nodes: [
                {
                  id: 'attachment-pr',
                  title: 'PR 123',
                  url: 'https://github.com/openai/codex-orchestrator/pull/123',
                  sourceType: 'github'
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr') || body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('attach mutation should not run when a canonical-equivalent PR link already exists');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://www.github.com/openai/codex-orchestrator/pull/123/files?utm_source=test#discussion_r1',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'noop',
      via: 'existing',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-pr',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'github'
      },
      source_setup: null
    });
  });

  it('canonicalizes noisy GitHub PR URLs before creating a new attachment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          url: 'https://github.com/openai/codex-orchestrator/pull/123',
          title: 'PR 123'
        });
        return jsonResponse({
          data: {
            attachmentLinkGitHubPR: {
              success: true,
              attachment: {
                id: 'attachment-1',
                title: 'PR 123',
                url: 'https://github.com/openai/codex-orchestrator/pull/123',
                sourceType: 'github'
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('URL fallback should not run when the GitHub PR attachment succeeds');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://www.github.com/openai/codex-orchestrator/pull/123/files?utm_source=test#discussion_r1',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'attached',
      via: 'github_pr',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-1',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'github'
      },
      source_setup: null
    });
  });

  it('rejects non-pull-request URLs for attach-pr', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('attach-pr should fail before issuing any Linear request for non-PR URLs');
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/compare/main...feature',
      title: 'not a pull request',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'attach-pr',
      error: {
        code: 'linear_pr_url_invalid',
        message: 'PR URL must be a GitHub pull request URL.',
        status: 422
      }
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('paginates attachments before deciding whether a PR link already exists', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string | null>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            attachments: {
              nodes: Array.from({ length: 20 }, (_, index) => ({
                id: `attachment-${index + 1}`,
                title: `Attachment ${index + 1}`,
                url: `https://example.com/attachment-${index + 1}`,
                sourceType: 'url'
              })),
              pageInfo: {
                hasNextPage: true,
                endCursor: 'attachment-cursor-1'
              }
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearIssueAttachments')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          attachmentsAfter: 'attachment-cursor-1'
        });
        return jsonResponse({
          data: {
            issue: {
              id: 'lin-issue-1',
              attachments: {
                nodes: [
                  {
                    id: 'attachment-pr',
                    title: 'PR 123',
                    url: 'https://github.com/openai/codex-orchestrator/pull/123',
                    sourceType: 'github'
                  }
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null
                }
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearAttachGitHubPr') || body.query?.includes('ProviderLinearAttachUrl')) {
        throw new Error('attach mutation should not run when the PR link already exists on a later attachment page');
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await attachProviderLinearIssuePr({
      issueId: 'lin-issue-1',
      url: 'https://github.com/openai/codex-orchestrator/pull/123',
      title: 'PR 123',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'attach-pr',
      action: 'noop',
      via: 'existing',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      attachment: {
        id: 'attachment-pr',
        title: 'PR 123',
        url: 'https://github.com/openai/codex-orchestrator/pull/123',
        source_type: 'github'
      },
      source_setup: null
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
