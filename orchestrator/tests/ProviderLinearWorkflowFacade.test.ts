import { describe, expect, it, vi } from 'vitest';

import {
  attachProviderLinearIssuePr,
  createProviderLinearFollowUpIssue,
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
                id: 'state-backlog',
                name: 'Backlog',
                type: 'unstarted'
              },
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

function buildStructuredWorkpadBody(overrides: {
  environmentLines?: string[];
  planLines?: string[];
  acceptanceCriteriaLines?: string[];
  validationLines?: string[];
  notesLines?: string[];
  extraSections?: Array<{ title: string; lines: string[] }>;
} = {}): string {
  const {
    environmentLines = ['- Issue: `CO-1`.', '- Workspace: `linear-workspace`.'],
    planLines = ['- Update the durable workpad contract.'],
    acceptanceCriteriaLines = ['- Keep the canonical five-section workpad shape.'],
    validationLines = ['- Run npm test.', '- Run npm run lint.'],
    notesLines = ['- Preserve a single active workpad comment.'],
    extraSections = []
  } = overrides;

  const renderSection = (title: string, lines: string[]) => [`### ${title}`, ...lines, ''];

  return [
    '## Codex Workpad',
    '',
    ...renderSection('Environment / Workspace Stamp', environmentLines),
    ...renderSection('Plan', planLines),
    ...renderSection('Acceptance Criteria', acceptanceCriteriaLines),
    ...renderSection('Validation', validationLines),
    ...renderSection('Notes', notesLines),
    ...extraSections.flatMap((section) => renderSection(section.title, section.lines))
  ]
    .join('\n')
    .trimEnd();
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
            { id: 'state-backlog', name: 'Backlog', type: 'unstarted' },
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

  it('ignores fenced marker examples when selecting the active workpad comment', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string } };
      expect(body.variables?.issueId).toBe('lin-issue-1');
      return jsonResponse(
        buildIssueContextBody({
          comments: {
            nodes: [
              {
                id: 'comment-example',
                body: ['```md', '## Codex Workpad', '### Notes', '- Example only.', '```'].join('\n'),
                url: 'https://linear.app/comment/example',
                createdAt: '2026-03-22T10:00:00.000Z',
                updatedAt: '2026-03-22T10:30:00.000Z',
                resolvedAt: null
              },
              {
                id: 'comment-workpad',
                body: '## Codex Workpad\n\nOld plan',
                url: 'https://linear.app/comment/workpad',
                createdAt: '2026-03-22T09:00:00.000Z',
                updatedAt: '2026-03-22T09:30:00.000Z',
                resolvedAt: null
              }
            ]
          }
        })
      );
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
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated plan.'],
      notesLines: ['- Updated existing active workpad.']
    });
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
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad',
                url: 'https://linear.app/comment/workpad',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
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
        body: updatedWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('creates a bootstrap workpad comment when no active workpad exists and the ticket test plan is mirrored', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Bootstrap the new workpad contract.'],
      acceptanceCriteriaLines: ['- Mirror ticket test-plan requirements into the workpad.'],
      validationLines: ['- Run npm test.', '- Run npm run lint.'],
      notesLines: ['- Fresh bootstrap workpad for this issue.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Bootstrap the issue.', '', 'Test Plan', '- Run npm test.', '- Run npm run lint.'].join(
              '\n'
            ),
            comments: {
              nodes: [
                {
                  id: 'comment-note',
                  body: 'Unrelated note',
                  url: 'https://linear.app/comment/note',
                  createdAt: '2026-03-22T08:00:00.000Z',
                  updatedAt: '2026-03-22T08:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created',
                url: 'https://linear.app/comment/workpad-created',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created',
        url: 'https://linear.app/comment/workpad-created',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('mirrors plain-text validation requirements that are not bullet-prefixed', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['Run npm test', 'Run npm run lint'],
      notesLines: ['- Plain-text validation requirements were preserved.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Tighten validation parsing.', '', 'Validation', 'Run npm test', 'Run npm run lint'].join(
              '\n'
            ),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-plain-text',
                url: 'https://linear.app/comment/workpad-created-plain-text',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-plain-text',
        url: 'https://linear.app/comment/workpad-created-plain-text',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('normalizes checklist-prefixed validation requirements before mirroring', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.', '- Run npm run lint.'],
      notesLines: ['- Checklist-prefixed ticket requirements were normalized before validation mirroring.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Tighten validation parsing.', '', 'Validation', '- [ ] Run npm test.', '- [ ] Run npm run lint.'].join(
              '\n'
            ),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-checklist-validation',
                url: 'https://linear.app/comment/workpad-created-checklist-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-checklist-validation',
        url: 'https://linear.app/comment/workpad-created-checklist-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('normalizes CommonMark ordered-list validation requirements before mirroring', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.', '- Run npm run lint.'],
      notesLines: ['- Ordered-list ticket requirements using `1)` were normalized before validation mirroring.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Context',
              'Tighten validation parsing.',
              '',
              'Validation',
              'Run these commands:',
              '1) Run npm test.',
              '2) Run npm run lint.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-ordered-list-validation',
                url: 'https://linear.app/comment/workpad-created-ordered-list-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-ordered-list-validation',
        url: 'https://linear.app/comment/workpad-created-ordered-list-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('stops mirroring validation requirements when a custom plain heading starts a prose section', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Validation mirroring should not absorb later rollout bullets.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', 'Rollout', 'Notify the team.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-custom-heading',
                url: 'https://linear.app/comment/workpad-created-custom-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-custom-heading',
        url: 'https://linear.app/comment/workpad-created-custom-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('stops mirroring validation requirements when a custom plain heading follows validation prose after a blank line', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Standalone prose headings should stop validation extraction after prose requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', 'Run npm test.', '', 'Rollout', 'This prose belongs to a different section.'].join(
              '\n'
            ),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-prose-heading',
                url: 'https://linear.app/comment/workpad-created-prose-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-prose-heading',
        url: 'https://linear.app/comment/workpad-created-prose-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('stops mirroring validation requirements when a custom markdown heading starts a prose section', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Validation mirroring should stop at markdown section boundaries.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '- Run npm test.', '### Rollout', 'Notify the team.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-markdown-heading',
                url: 'https://linear.app/comment/workpad-created-markdown-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-markdown-heading',
        url: 'https://linear.app/comment/workpad-created-markdown-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('keeps mirroring validation requirements inside nested markdown subheadings', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Nested markdown validation subheadings should still contribute requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '### Automated',
              '- Run npm test.',
              '### Manual',
              '- Capture screenshots.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('keeps mirroring validation requirements when nested markdown subheadings are followed by blank lines', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Blank lines after nested markdown validation subheadings should not drop requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '### Automated',
              '',
              '- Run npm test.',
              '### Manual',
              '',
              '- Capture screenshots.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Capture screenshots.'],
          source_sections: ['Validation']
        }
      }
    });
  });

  it('ignores fenced code headings when validating the canonical workpad section structure', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      notesLines: ['```md', '### Sample Heading', '- This is example markdown, not a real section.', '```']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-code-fence',
                url: 'https://linear.app/comment/workpad-created-code-fence',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-code-fence',
        url: 'https://linear.app/comment/workpad-created-code-fence',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when the workpad marker only appears inside a fenced example', async () => {
    const invalidWorkpadBody = [
      '```md',
      '## Codex Workpad',
      '',
      '### Environment / Workspace Stamp',
      '- Example only.',
      '',
      '### Plan',
      '- Example only.',
      '',
      '### Acceptance Criteria',
      '- Example only.',
      '',
      '### Validation',
      '- Example only.',
      '',
      '### Notes',
      '- Example only.',
      '```'
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_marker_missing',
        message: 'Workpad body must contain "## Codex Workpad".',
        status: 422
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(0);
  });

  it('ignores setext underline rows when mirroring validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Setext underline rows should not become mirrored requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Validation', '----------', '- Run npm test.'].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-setext',
                url: 'https://linear.app/comment/workpad-created-setext',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-setext',
        url: 'https://linear.app/comment/workpad-created-setext',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when validation prose introduces a checklist with missing mirrored requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Prose introductions should not terminate validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              'Run these commands:',
              '- Run npm test.',
              '- Run npm run lint.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('ignores fenced validation examples when mirroring ticket requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Fenced examples should not become required validation items.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '```sh',
              '- Run npm run lint.',
              '```',
              '- Run npm test.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-fenced-validation',
                url: 'https://linear.app/comment/workpad-created-fenced-validation',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-fenced-validation',
        url: 'https://linear.app/comment/workpad-created-fenced-validation',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats non-ASCII markdown headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Markdown subheadings should stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              '### Rollout 🚀',
              'This prose belongs to a different section.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-non-ascii-heading',
                url: 'https://linear.app/comment/workpad-created-non-ascii-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-non-ascii-heading',
        url: 'https://linear.app/comment/workpad-created-non-ascii-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats fully bold non-ASCII headings as section boundaries when parsing validation requirements', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Bold non-ASCII headings should stop validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              'Run npm test.',
              '',
              '**Rollout 🚀**',
              'This prose belongs to a different section.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-bold-non-ascii-heading',
                url: 'https://linear.app/comment/workpad-created-bold-non-ascii-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-bold-non-ascii-heading',
        url: 'https://linear.app/comment/workpad-created-bold-non-ascii-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('treats title-cased plain headings as section boundaries when they precede lists', async () => {
    const createdWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Title-cased plain headings still terminate validation extraction.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, string>;
      };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              'Validation',
              '- Run npm test.',
              'Implementation Notes',
              '- This list is not part of validation.'
            ].join('\n'),
            comments: {
              nodes: []
            }
          })
        );
      }
      if (body.query?.includes('ProviderLinearCreateComment')) {
        expect(body.variables).toEqual({
          issueId: 'lin-issue-1',
          body: createdWorkpadBody
        });
        return jsonResponse({
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: 'comment-created-plain-heading',
                url: 'https://linear.app/comment/workpad-created-plain-heading',
                body: createdWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: createdWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: true,
      operation: 'upsert-workpad',
      action: 'created',
      issue: {
        id: 'lin-issue-1',
        identifier: 'CO-1'
      },
      comment: {
        id: 'comment-created-plain-heading',
        url: 'https://linear.app/comment/workpad-created-plain-heading',
        body: createdWorkpadBody,
        created_at: null,
        updated_at: null,
        resolved_at: null
      },
      source_setup: null
    });
  });

  it('fails closed when decorated markdown validation headings contain unmet requirements', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Capture screenshots.'],
      notesLines: ['- Decorated validation headings should still mirror ticket requirements.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: [
              '### Validation ✅',
              '- Run npm test.',
              '',
              '### Testing (required)',
              '- Run npm run lint.'
            ].join('\n')
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm test.', 'Run npm run lint.'],
          source_sections: ['Validation ✅', 'Testing (required)']
        }
      }
    });
  });

  it('fails closed when the workpad body omits or reorders the canonical top-level sections', async () => {
    const invalidWorkpadBody = [
      '## Codex Workpad',
      '',
      '### Plan',
      '- Updated plan.',
      '',
      '### Environment / Workspace Stamp',
      '- Issue: `CO-1`.'
    ].join('\n');
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        message:
          'Workpad body must contain these H3 sections in order after "## Codex Workpad": Environment / Workspace Stamp, Plan, Acceptance Criteria, Validation, Notes.',
        status: 422,
        details: {
          required_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes'
          ],
          actual_sections: ['Plan', 'Environment / Workspace Stamp']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the workpad body appends extra sections after the canonical five', async () => {
    const invalidWorkpadBody = buildStructuredWorkpadBody({
      extraSections: [{ title: 'Extra', lines: ['- This section should not be accepted.'] }]
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(buildIssueContextBody());
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: invalidWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_structure_invalid',
        message:
          'Workpad body must contain these H3 sections in order after "## Codex Workpad": Environment / Workspace Stamp, Plan, Acceptance Criteria, Validation, Notes.',
        status: 422,
        details: {
          required_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes'
          ],
          actual_sections: [
            'Environment / Workspace Stamp',
            'Plan',
            'Acceptance Criteria',
            'Validation',
            'Notes',
            'Extra'
          ]
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when ticket validation requirements are not mirrored into the workpad', async () => {
    const incompleteWorkpadBody = buildStructuredWorkpadBody({
      validationLines: ['- Run npm test.'],
      notesLines: ['- Missing one required ticket validation item.']
    });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
      if (body.query?.includes('ProviderLinearIssueContext')) {
        return jsonResponse(
          buildIssueContextBody({
            description: ['Context', 'Tighten validation.', '', 'Validation', '- Run npm test.', '- Run npm run lint.'].join(
              '\n'
            )
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: incompleteWorkpadBody,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'upsert-workpad',
      error: {
        code: 'workpad_validation_requirements_missing',
        message:
          'Workpad must mirror ticket-provided Validation, Test Plan, or Testing requirements in the Acceptance Criteria or Validation sections.',
        status: 422,
        details: {
          missing_requirements: ['Run npm run lint.'],
          source_sections: ['Validation']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed when commentId points at an unresolved human comment', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated plan.'],
      notesLines: ['- Invalid comment id should fail closed.']
    });
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
      body: updatedWorkpadBody,
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

  it('fails closed when commentId points at a comment whose marker only appears inside a fenced example', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated targeted workpad.'],
      notesLines: ['- Fenced examples are not valid workpad comments.']
    });
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
                  id: 'comment-example',
                  body: ['```md', '## Codex Workpad', '### Notes', '- Example only.', '```'].join('\n'),
                  url: 'https://linear.app/comment/example',
                  createdAt: '2026-03-22T10:00:00.000Z',
                  updatedAt: '2026-03-22T10:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
      commentId: 'comment-example',
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
          comment_id: 'comment-example'
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('updates the caller-selected unresolved workpad comment when commentId is valid', async () => {
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated targeted workpad.'],
      notesLines: ['- Explicit comment selection stayed within the active workpad set.']
    });
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
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad-target',
                url: 'https://linear.app/comment/workpad-target',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
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
        body: updatedWorkpadBody,
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
    const updatedWorkpadBody = buildStructuredWorkpadBody({
      planLines: ['- Updated paginated workpad.'],
      notesLines: ['- The update reused the active workpad from a later comments page.']
    });
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
          body: updatedWorkpadBody
        });
        return jsonResponse({
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: 'comment-workpad-later',
                url: 'https://linear.app/comment/workpad-later',
                body: updatedWorkpadBody
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await upsertProviderLinearWorkpadComment({
      issueId: 'lin-issue-1',
      body: updatedWorkpadBody,
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
        body: updatedWorkpadBody
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

  it('fails delete-workpad without comment_id when multiple unresolved workpads exist', async () => {
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
                  id: 'comment-workpad-newer',
                  body: '## Codex Workpad\n\nNew plan',
                  url: 'https://linear.app/comment/workpad-newer',
                  createdAt: '2026-03-22T10:00:00.000Z',
                  updatedAt: '2026-03-22T10:30:00.000Z',
                  resolvedAt: null
                },
                {
                  id: 'comment-workpad-older',
                  body: '## Codex Workpad\n\nOld plan',
                  url: 'https://linear.app/comment/workpad-older',
                  createdAt: '2026-03-22T09:00:00.000Z',
                  updatedAt: '2026-03-22T09:30:00.000Z',
                  resolvedAt: null
                }
              ]
            }
          })
        );
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
        code: 'ambiguous_workpad_state',
        message:
          'Multiple unresolved Codex workpad comments exist; provide comment_id to delete one explicitly.',
        status: 409,
        details: {
          comment_ids: ['comment-workpad-newer', 'comment-workpad-older']
        }
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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

  it('creates a same-project Backlog follow-up issue with related and blocker linkage', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: Record<string, unknown>;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        expect(body.query).not.toContain('comments(');
        expect(body.query).not.toContain('attachments(');
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        expect(body.variables).toEqual({
          input: {
            teamId: 'lin-team-1',
            projectId: 'lin-project-1',
            stateId: 'state-backlog',
            title: 'Follow-up issue',
            description: [
              'Investigate the remaining improvement.',
              '',
              '## Acceptance Criteria',
              '- [ ] Captured'
            ].join('\n')
          }
        });
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: 'Investigate the remaining improvement.\n\n## Acceptance Criteria\n- [ ] Captured',
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
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        if ((body.variables?.input as Record<string, unknown> | undefined)?.type === 'related') {
          expect(body.variables).toEqual({
            input: {
              type: 'related',
              issueId: 'lin-issue-1',
              relatedIssueId: 'lin-issue-2'
            }
          });
          return jsonResponse({
            data: {
              issueRelationCreate: {
                success: true,
                issueRelation: {
                  id: 'relation-related',
                  type: 'related'
                }
              }
            }
          });
        }
        expect(body.variables).toEqual({
          input: {
            type: 'blocks',
            issueId: 'lin-issue-1',
            relatedIssueId: 'lin-issue-2'
          }
        });
        return jsonResponse({
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: {
                id: 'relation-blocks',
                type: 'blocks'
              }
            }
          }
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      acceptanceCriteria: '- [ ] Captured',
      blockedBySource: true,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
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
        title: 'Follow-up issue',
        description: 'Investigate the remaining improvement.\n\n## Acceptance Criteria\n- [ ] Captured',
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
      source_setup: null
    });
  });

  it('fails closed when the source issue is not assigned to a project', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          project: null
        })
      )
    );

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_project_missing',
        message: 'Linear issue CO-1 is missing a project assignment; same-project follow-up creation requires one.',
        status: 422
      }
    });
  });

  it('fails closed when the live team does not expose Backlog for follow-up creation', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse(
        buildIssueContextBody({
          team: {
            id: 'lin-team-1',
            key: 'CO',
            name: 'Codex Orchestrator',
            states: {
              nodes: [
                {
                  id: 'state-ready',
                  name: 'Ready',
                  type: 'unstarted'
                },
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
          }
        })
      )
    );

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_follow_up_backlog_state_missing',
        message: 'Linear team state "Backlog" was not found for issue CO-1.',
        status: 422
      }
    });
  });

  it('surfaces the created follow-up issue when relation creation fails after issue creation', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: 'Investigate the remaining improvement.\n\n## Acceptance Criteria\n- [ ] Captured',
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
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        return jsonResponse({
          errors: [{ message: 'relation failed' }]
        });
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      acceptanceCriteria: '- [ ] Captured',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 409,
        retryable: false,
        details: {
          errors: ['relation failed'],
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: 'Investigate the remaining improvement.\n\n## Acceptance Criteria\n- [ ] Captured',
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
          failed_relation_type: 'related'
        }
      }
    });
  });

  it('surfaces the created follow-up issue when blocker relation creation fails after related succeeds', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: {
          input?: {
            type?: string;
          };
        };
      };
      if (body.query?.includes('ProviderLinearIssueSummary')) {
        return jsonResponse(buildIssueContextBody());
      }
      if (body.query?.includes('ProviderLinearCreateFollowUpIssue')) {
        return jsonResponse({
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: 'lin-issue-2',
                identifier: 'CO-2',
                title: 'Follow-up issue',
                description: 'Investigate the remaining improvement.\n\n## Acceptance Criteria\n- [ ] Captured',
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
              }
            }
          }
        });
      }
      if (body.query?.includes('ProviderLinearCreateIssueRelation')) {
        if (body.variables?.input?.type === 'related') {
          return jsonResponse({
            data: {
              issueRelationCreate: {
                success: true
              }
            }
          });
        }
        if (body.variables?.input?.type === 'blocks') {
          return jsonResponse({
            errors: [{ message: 'block relation failed' }]
          });
        }
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });

    const result = await createProviderLinearFollowUpIssue({
      issueId: 'lin-issue-1',
      title: 'Follow-up issue',
      description: 'Investigate the remaining improvement.',
      acceptanceCriteria: '- [ ] Captured',
      blockedBySource: true,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      ok: false,
      operation: 'create-follow-up',
      error: {
        code: 'linear_graphql_error',
        message: 'Linear GraphQL returned operation errors.',
        status: 409,
        retryable: false,
        details: {
          errors: ['block relation failed'],
          created_issue: {
            id: 'lin-issue-2',
            identifier: 'CO-2',
            title: 'Follow-up issue',
            description: 'Investigate the remaining improvement.\n\n## Acceptance Criteria\n- [ ] Captured',
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
          failed_relation_type: 'blocks'
        }
      }
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
