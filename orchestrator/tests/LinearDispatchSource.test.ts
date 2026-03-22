import { describe, expect, it, vi } from 'vitest';

import {
  resolveLiveLinearDispatchRecommendation,
  resolveLiveLinearTrackedIssueById,
  resolveLiveLinearTrackedIssues
} from '../src/cli/control/linearDispatchSource.js';

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
      expect(body.query).toContain('inverseRelations(first: 50)');
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
            inverseRelations: {
              nodes: [
                {
                  type: 'blocks',
                  issue: {
                    id: 'lin-blocker-1',
                    identifier: 'PREPROD-99',
                    state: {
                      name: 'Custom Completed',
                      type: 'completed'
                    }
                  }
                },
                {
                  type: 'related',
                  issue: {
                    id: 'lin-related-1',
                    identifier: 'PREPROD-77',
                    state: {
                      name: 'In Progress'
                    }
                  }
                }
              ]
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
        blocked_by: [
          {
            id: 'lin-blocker-1',
            identifier: 'PREPROD-99',
            state: 'Custom Completed',
            state_type: 'completed'
          }
        ],
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

describe('resolveLiveLinearTrackedIssues', () => {
  it('parses priority and created_at fields and returns issues in Symphony dispatch order', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { after?: string | null; limit?: number };
      };
      expect(body.query).toContain('issues(orderBy: updatedAt, first: $limit, after: $after');
      expect(body.query).toContain('priority');
      expect(body.query).toContain('createdAt');
      expect(body.query).toContain('pageInfo');
      expect(body.variables?.after ?? null).toBeNull();
      expect(body.variables?.limit).toBe(50);
      return jsonResponse({
        data: {
          viewer: {
            organization: {
              id: 'lin-workspace-1'
            }
          },
          issues: {
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            },
            nodes: [
              {
                id: 'lin-issue-z',
                identifier: 'ZZ-9',
                title: 'Later identifier tie',
                priority: 1,
                createdAt: '2026-03-19T04:00:00.000Z',
                updatedAt: '2026-03-20T04:00:00.000Z',
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
                inverseRelations: { nodes: [] },
                history: { nodes: [] }
              },
              {
                id: 'lin-issue-null-priority',
                identifier: 'MID-2',
                title: 'Unknown priority',
                priority: null,
                createdAt: '2026-03-17T04:00:00.000Z',
                updatedAt: '2026-03-20T04:00:00.000Z',
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
                inverseRelations: { nodes: [] },
                history: { nodes: [] }
              },
              {
                id: 'lin-issue-old',
                identifier: 'MID-1',
                title: 'Older issue',
                priority: 1,
                createdAt: '2026-03-18T04:00:00.000Z',
                updatedAt: '2026-03-20T04:00:00.000Z',
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
                inverseRelations: { nodes: [] },
                history: { nodes: [] }
              },
              {
                id: 'lin-issue-a',
                identifier: 'AA-1',
                title: 'Earlier identifier tie',
                priority: 1,
                createdAt: '2026-03-19T04:00:00.000Z',
                updatedAt: '2026-03-20T04:00:00.000Z',
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
                inverseRelations: { nodes: [] },
                history: { nodes: [] }
              }
            ]
          }
        }
      });
    });

    const result = await resolveLiveLinearTrackedIssues({
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
      tracked_issues: [
        {
          id: 'lin-issue-old',
          priority: 1,
          created_at: '2026-03-18T04:00:00.000Z'
        },
        {
          id: 'lin-issue-a',
          priority: 1,
          created_at: '2026-03-19T04:00:00.000Z'
        },
        {
          id: 'lin-issue-z',
          priority: 1,
          created_at: '2026-03-19T04:00:00.000Z'
        },
        {
          id: 'lin-issue-null-priority',
          priority: null,
          created_at: '2026-03-17T04:00:00.000Z'
        }
      ]
    });
  });

  it('paginates the full active candidate set before sorting for dispatch', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { after?: string | null; limit?: number };
      };
      expect(body.query).toContain('after: $after');
      expect(body.variables?.limit).toBe(50);
      if ((body.variables?.after ?? null) === null) {
        return jsonResponse({
          data: {
            viewer: {
              organization: {
                id: 'lin-workspace-1'
              }
            },
            issues: {
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor-1'
              },
              nodes: [
                {
                  id: 'lin-issue-late',
                  identifier: 'LATE-2',
                  title: 'Late page one issue',
                  priority: 2,
                  createdAt: '2026-03-20T04:00:00.000Z',
                  updatedAt: '2026-03-21T04:00:00.000Z',
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
                  inverseRelations: { nodes: [] },
                  history: { nodes: [] }
                }
              ]
            }
          }
        });
      }

      expect(body.variables?.after).toBe('cursor-1');
      return jsonResponse({
        data: {
          viewer: {
            organization: {
              id: 'lin-workspace-1'
            }
          },
          issues: {
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            },
            nodes: [
              {
                id: 'lin-issue-early',
                identifier: 'EARLY-1',
                title: 'Older higher-priority issue',
                priority: 1,
                createdAt: '2026-03-18T04:00:00.000Z',
                updatedAt: '2026-03-19T04:00:00.000Z',
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
                inverseRelations: { nodes: [] },
                history: { nodes: [] }
              }
            ]
          }
        }
      });
    });

    const result = await resolveLiveLinearTrackedIssues({
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

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issues: [
        {
          id: 'lin-issue-early',
          priority: 1
        },
        {
          id: 'lin-issue-late',
          priority: 2
        }
      ]
    });
  });

  it('uses the Symphony default request timeout for candidate polling', async () => {
    vi.useFakeTimers();
    let aborted = false;
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const signal = init?.signal as AbortSignal | undefined;
      return await new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => {
            aborted = true;
            reject(new Error('aborted'));
          },
          { once: true }
        );
      });
    });

    const promise = resolveLiveLinearTrackedIssues({
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

    await vi.advanceTimersByTimeAsync(29_999);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toMatchObject({
      kind: 'unavailable',
      reason: 'dispatch_source_provider_request_failed'
    });
  });
});

describe('resolveLiveLinearDispatchRecommendation', () => {
  it('selects the first eligible issue in dispatch order rather than provider page order', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        variables?: { after?: string | null; limit?: number };
      };
      expect(body.variables?.limit).toBe(50);
      if ((body.variables?.after ?? null) === null) {
        return jsonResponse({
          data: {
            viewer: {
              organization: {
                id: 'lin-workspace-1'
              }
            },
            issues: {
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor-1'
              },
              nodes: [
                {
                  id: 'lin-issue-newest',
                  identifier: 'PREPROD-201',
                  title: 'Newest eligible issue',
                  priority: 3,
                  createdAt: '2026-03-20T04:00:00.000Z',
                  updatedAt: '2026-03-21T04:00:00.000Z',
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
                  inverseRelations: { nodes: [] },
                  history: { nodes: [] }
                }
              ]
            }
          }
        });
      }

      expect(body.variables?.after).toBe('cursor-1');
      return jsonResponse({
        data: {
          viewer: {
            organization: {
              id: 'lin-workspace-1'
            }
          },
          issues: {
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            },
            nodes: [
              {
                id: 'lin-issue-priority',
                identifier: 'PREPROD-101',
                title: 'Higher-priority eligible issue',
                priority: 1,
                createdAt: '2026-03-18T04:00:00.000Z',
                updatedAt: '2026-03-20T04:00:00.000Z',
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
                inverseRelations: { nodes: [] },
                history: { nodes: [] }
              }
            ]
          }
        }
      });
    });

    const result = await resolveLiveLinearDispatchRecommendation({
      source: {
        provider: 'linear',
        live: true
      },
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-1',
        project_id: 'lin-project-1'
      },
      defaultIssueIdentifier: 'task-1014',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issue: {
        identifier: 'PREPROD-101',
        title: 'Higher-priority eligible issue',
        state: 'In Progress'
      }
    });
  });
});
