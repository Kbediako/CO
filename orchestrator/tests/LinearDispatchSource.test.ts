import { describe, expect, it, vi } from 'vitest';

import { resolveLiveLinearTrackedIssueById } from '../src/cli/control/linearDispatchSource.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('resolveLiveLinearTrackedIssueById', () => {
  it('resolves a specific Linear issue by id and preserves the normalized tracked shape', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string } };
      expect(body.query).toContain('$issueId: String!');
      expect(body.query).toContain('issue(id: $issueId)');
      expect(body.variables?.issueId).toBe('lin-issue-1');
      return jsonResponse({
        data: {
          viewer: {
            organization: {
              id: 'lin-workspace-1'
            }
          },
          issue: {
            id: 'lin-issue-1',
            identifier: 'PREPROD-101',
            title: 'Investigate advisory routing',
            url: 'https://linear.app/asabeko/issue/PREPROD-101',
            updatedAt: '2026-03-06T02:00:00.000Z',
            state: {
              name: 'In Progress',
              type: 'started'
            },
            team: {
              id: 'lin-team-1',
              key: 'PREPROD',
              name: 'PRE-PRO/PRODUCTION'
            },
            project: {
              id: 'lin-project-1',
              name: 'Icon Agency (Bookings)'
            },
            history: {
              nodes: [
                {
                  id: 'history-1',
                  createdAt: '2026-03-06T01:00:00.000Z',
                  actor: {
                    displayName: 'Operator One'
                  },
                  fromState: {
                    name: 'Todo'
                  },
                  toState: {
                    name: 'In Progress'
                  }
                }
              ]
            }
          }
        }
      });
    });

    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-1',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      kind: 'ready',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      tracked_issue: {
        identifier: 'PREPROD-101',
        title: 'Investigate advisory routing',
        state: 'In Progress',
        team_key: 'PREPROD',
        project_name: 'Icon Agency (Bookings)'
      }
    });
  });

  it('fails closed when the exact issue falls outside the configured team scope', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        data: {
          viewer: {
            organization: {
              id: 'lin-workspace-1'
            }
          },
          issue: {
            id: 'lin-issue-1',
            identifier: 'PREPROD-101',
            title: 'Investigate advisory routing',
            team: {
              id: 'lin-team-other',
              key: 'PREPROD',
              name: 'PRE-PRO/PRODUCTION'
            },
            project: {
              id: 'lin-project-1',
              name: 'Icon Agency (Bookings)'
            },
            history: {
              nodes: []
            }
          }
        }
      })
    );

    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-1',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      kind: 'malformed',
      status: 422,
      code: 'dispatch_source_malformed',
      reason: 'dispatch_source_team_mismatch'
    });
  });

  it('fails closed when the exact issue is missing', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        data: {
          viewer: {
            organization: {
              id: 'lin-workspace-1'
            }
          },
          issue: null
        }
      })
    );

    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-missing',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toEqual({
      kind: 'unavailable',
      status: 503,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_issue_not_found'
    });
  });
});
