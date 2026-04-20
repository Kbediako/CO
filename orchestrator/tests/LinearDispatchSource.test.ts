import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  resolveLiveLinearDispatchRecommendation,
  resolveLiveLinearTrackedIssueById,
  resolveLiveLinearTrackedIssues
} from '../src/cli/control/linearDispatchSource.js';
import {
  readSharedLinearBudgetStatus,
  recordLinearBudgetHeadersObservation,
  recordLinearBudgetRateLimitObservation
} from '../src/cli/control/linearBudgetState.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('resolveLiveLinearTrackedIssueById', () => {
  it('fails fast from shared cooldown state before issuing another tracked-issue request', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-dispatch-source-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

    await recordLinearBudgetRateLimitObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      rateLimit: {
        code: 'linear_rate_limited',
        message: 'Linear API rate limit exceeded.',
        status: 429,
        retryable: true,
        details: {
          retry_after_seconds: 60,
          requests_remaining: 0,
          requests_limit: 100,
          requests_reset_at: new Date(Date.now() + 60_000).toISOString()
        }
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('shared cooldown should fail closed before fetch');
    });

    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: 'unavailable',
      reason: 'dispatch_source_provider_rate_limited',
      status: 429,
      retryable: true,
      details: {
        error_code: 'linear_rate_limited',
        shared_budget_fail_fast: true,
        shared_budget_cooldown_active: true,
        requests_remaining: 0
      }
    });
  });

  it('fails fast from shared request reserve state before issuing another tracked-issue request', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-dispatch-source-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

    await recordLinearBudgetHeadersObservation({
      env,
      source: 'dispatch_source_issue_by_id',
      headers: {
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-remaining': '1',
        'x-ratelimit-requests-reset': String(Date.now() + 60_000)
      }
    });

    const fetchImpl: typeof fetch = vi.fn(async () => {
      throw new Error('shared request reserve should fail closed before fetch');
    });

    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-1',
      env,
      fetchImpl
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: 'unavailable',
      reason: 'dispatch_source_provider_rate_limited',
      status: 429,
      retryable: true,
      details: {
        error_code: 'linear_rate_limited',
        shared_budget_fail_fast: true,
        request_headroom_reserve_bucket: 'requests',
        request_headroom_remaining: 1,
        request_headroom_reserve: 1,
        request_headroom_usable_remaining: 0,
        requests_remaining: 1
      }
    });
  });

  it('resolves a specific Linear issue by id and preserves the normalized tracked shape', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string; after?: string } };
      if (body.query?.includes('ResolveLiveLinearIssueInverseRelationsPage')) {
        expect(body.variables).toMatchObject({
          issueId: 'lin-issue-1',
          after: 'inverse-cursor-1'
        });
        return jsonResponse({
          data: {
            issue: {
              id: 'lin-issue-1',
              inverseRelations: {
                nodes: [
                  {
                    type: 'related',
                    issue: {
                      id: 'lin-related-2',
                      identifier: 'PREPROD-78',
                      state: {
                        name: 'Todo',
                        type: 'unstarted'
                      }
                    }
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
      expect(body.query).toContain('$issueId: String!');
      expect(body.query).toContain('issue(id: $issueId)');
      expect(body.query).toContain('inverseRelations(first: 50)');
      expect(body.query).toContain('relations(first: 50)');
      expect(body.query).toContain('relatedIssue');
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
            archivedAt: null,
            trashed: false,
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
              ],
              pageInfo: {
                hasNextPage: true,
                endCursor: 'inverse-cursor-1'
              }
            },
            relations: {
              nodes: [
                {
                  type: 'duplicate',
                  relatedIssue: {
                    id: 'lin-duplicate-1',
                    identifier: 'PREPROD-102',
                    state: {
                      name: 'Duplicate',
                      type: 'canceled'
                    }
                  }
                }
              ],
              pageInfo: {
                hasNextPage: true
              }
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
        archived_at: null,
        trashed: false,
        blocked_by: [
          {
            id: 'lin-blocker-1',
            identifier: 'PREPROD-99',
            state: 'Custom Completed',
            state_type: 'completed'
          }
        ],
        blocked_by_truncated: false,
        relations_truncated: true,
        relations: [
          {
            direction: 'outbound',
            type: 'duplicate',
            issue: {
              id: 'lin-duplicate-1',
              identifier: 'PREPROD-102',
              state: 'Duplicate',
              state_type: 'canceled'
            }
          },
          {
            direction: 'inbound',
            type: 'blocks',
            issue: {
              id: 'lin-blocker-1',
              identifier: 'PREPROD-99',
              state: 'Custom Completed',
              state_type: 'completed'
            }
          },
          {
            direction: 'inbound',
            type: 'related',
            issue: {
              id: 'lin-related-1',
              identifier: 'PREPROD-77',
              state: 'In Progress',
              state_type: null
            }
          },
          {
            direction: 'inbound',
            type: 'related',
            issue: {
              id: 'lin-related-2',
              identifier: 'PREPROD-78',
              state: 'Todo',
              state_type: 'unstarted'
            }
          }
        ],
        team_key: 'PREPROD',
        project_name: 'Icon Agency (Bookings)'
      }
    });
  });

  it('hydrates paginated inbound relations before deciding blocker truncation', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string; variables?: { issueId?: string; after?: string } };
      if (body.query?.includes('ResolveLiveLinearIssueInverseRelationsPage')) {
        expect(body.variables).toMatchObject({
          issueId: 'lin-issue-1',
          after: 'blocker-cursor-1'
        });
        return jsonResponse({
          data: {
            issue: {
              id: 'lin-issue-1',
              inverseRelations: {
                nodes: [
                  {
                    type: 'blocks',
                    issue: {
                      id: 'lin-blocker-50',
                      identifier: 'PREPROD-50',
                      state: {
                        name: 'In Progress',
                        type: 'started'
                      }
                    }
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
            updatedAt: '2026-03-06T02:00:00.000Z',
            inverseRelations: {
              nodes: Array.from({ length: 50 }, (_unused, index) => ({
                type: 'blocks',
                issue: {
                  id: `lin-blocker-${index}`,
                  identifier: `PREPROD-${index}`,
                  state: {
                    name: 'Done',
                    type: 'completed'
                  }
                }
              })),
              pageInfo: {
                hasNextPage: true,
                endCursor: 'blocker-cursor-1'
              }
            },
            relations: {
              nodes: [],
              pageInfo: {
                hasNextPage: false
              }
            },
            history: {
              nodes: []
            }
          }
        }
      });
    });

    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-1',
      sourceSetup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1'
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl
    });

    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issue: {
        blocked_by_truncated: false
      }
    });
    expect(result.kind === 'ready' ? result.tracked_issue.blocked_by : []).toHaveLength(51);
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

  it('surfaces explicit Linear rate-limit metadata for by-id rereads', async () => {
    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-1',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      },
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
                path: ['issue'],
                extensions: {
                  code: 'RATELIMITED',
                  statusCode: 429
                }
              }
            ]
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'retry-after': '3',
              'x-ratelimit-requests-limit': '5000',
              'x-ratelimit-requests-remaining': '0',
              'x-ratelimit-requests-reset': '1774701380970',
              'x-request-id': 'req-by-id-1'
            }
          }
        )
      )
    });

    expect(result).toEqual({
      kind: 'unavailable',
      status: 429,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_provider_rate_limited',
      message: 'Linear API rate limit exceeded.',
      retryable: true,
      details: {
        error_code: 'linear_rate_limited',
        errors: [
          {
            message: 'Rate limit exceeded. Only 5000 requests are allowed per 1 hour.',
            path: ['issue'],
            extensions: {
              code: 'RATELIMITED',
              statusCode: 429
            }
          }
        ],
        retry_after_seconds: 3,
        requests_remaining: 0,
        requests_limit: 5000,
        requests_reset_at: '2026-03-28T12:36:20.970Z',
        request_id: 'req-by-id-1'
      }
    });
  });

  it('records shared budget headers from non-rate-limit GraphQL failures for by-id rereads', async () => {
    const codexHome = await mkdtemp(join(tmpdir(), 'linear-dispatch-source-'));
    tempDirs.push(codexHome);
    const env = {
      CODEX_HOME: codexHome,
      CO_LINEAR_API_TOKEN: 'lin-api-token'
    };

    const result = await resolveLiveLinearTrackedIssueById({
      issueId: 'lin-issue-1',
      env,
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({
            errors: [{ message: 'Issue query unavailable.' }]
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'x-ratelimit-requests-limit': '100',
              'x-ratelimit-requests-remaining': '9',
              'x-ratelimit-requests-reset': String(Date.now() + 60_000)
            }
          }
        )
      )
    });

    expect(result).toEqual({
      kind: 'unavailable',
      status: 503,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_provider_request_failed'
    });
    await expect(readSharedLinearBudgetStatus(env)).resolves.toMatchObject({
      requests: {
        limit: 100,
        remaining: 9
      }
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

  it('keeps polling when one issue inverse relation hydration page fails', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { issueId?: string; after?: string | null; limit?: number };
      };
      if (body.query?.includes('ResolveLiveLinearIssueInverseRelationsPage')) {
        expect(body.variables).toMatchObject({
          issueId: 'lin-issue-a',
          after: 'inverse-cursor-a'
        });
        return jsonResponse(
          {
            errors: [
              {
                message: 'temporary Linear inverse relation page failure'
              }
            ]
          },
          503
        );
      }

      expect(body.query).toContain('issues(orderBy: updatedAt, first: $limit, after: $after');
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
                id: 'lin-issue-a',
                identifier: 'PREPROD-101',
                title: 'Blocked candidate with partial blockers',
                priority: 1,
                createdAt: '2026-03-18T04:00:00.000Z',
                updatedAt: '2026-03-20T04:00:00.000Z',
                state: {
                  name: 'Blocked',
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
                          name: 'Done',
                          type: 'completed'
                        }
                      }
                    }
                  ],
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'inverse-cursor-a'
                  }
                },
                history: { nodes: [] }
              },
              {
                id: 'lin-issue-b',
                identifier: 'PREPROD-102',
                title: 'Independent tracked issue',
                priority: 2,
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
                inverseRelations: {
                  nodes: [],
                  pageInfo: {
                    hasNextPage: false,
                    endCursor: null
                  }
                },
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
          id: 'lin-issue-a',
          blocked_by: [
            {
              id: 'lin-blocker-1',
              identifier: 'PREPROD-99',
              state: 'Done',
              state_type: 'completed'
            }
          ],
          blocked_by_truncated: true
        },
        {
          id: 'lin-issue-b',
          blocked_by: [],
          blocked_by_truncated: false
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

  it('uses a lighter discovery query and stops paginating once enough eligible candidates are found', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        query?: string;
        variables?: { before?: string | null; limit?: number; priority?: number };
      };

      expect(body.query).toContain('issues(orderBy: createdAt, last: $limit, before: $before');
      expect(body.query).not.toContain('description');
      expect(body.query).not.toContain('history(');
      expect(body.query).toContain('inverseRelations');
      expect(body.variables?.limit).toBe(50);

      if ((body.variables?.priority ?? null) === 1 && (body.variables?.before ?? null) === null) {
        return jsonResponse({
          data: {
            viewer: {
              id: 'viewer-1',
              organization: { id: 'lin-workspace-1' }
            },
            issues: {
              pageInfo: {
                hasPreviousPage: true,
                startCursor: 'cursor-1'
              },
              nodes: [
                {
                  id: 'lin-issue-unowned',
                  identifier: 'CO-9',
                  title: 'Assigned elsewhere',
                  priority: 1,
                  createdAt: '2026-03-18T04:00:00.000Z',
                  updatedAt: '2026-03-20T04:00:00.000Z',
                  assignee: {
                    id: 'someone-else',
                    name: 'Else',
                    displayName: 'Else'
                  },
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
                  inverseRelations: { nodes: [] }
                }
              ]
            }
          }
        });
      }

      if ((body.variables?.priority ?? null) === 1 && body.variables?.before === 'cursor-1') {
        return jsonResponse({
          data: {
            viewer: {
              id: 'viewer-1',
              organization: { id: 'lin-workspace-1' }
            },
            issues: {
              pageInfo: {
                hasPreviousPage: false,
                startCursor: null
              },
              nodes: [
                {
                  id: 'lin-issue-eligible-2',
                  identifier: 'CO-1',
                  title: 'Second eligible',
                  priority: 1,
                  createdAt: '2026-03-16T04:00:00.000Z',
                  updatedAt: '2026-03-20T04:10:00.000Z',
                  assignee: null,
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
                  inverseRelations: { nodes: [] }
                }
              ]
            }
          }
        });
      }

      expect(body.variables?.priority).toBe(2);
      expect(body.variables?.before ?? null).toBe(null);
      return jsonResponse({
        data: {
          viewer: {
            id: 'viewer-1',
            organization: { id: 'lin-workspace-1' }
          },
          issues: {
            pageInfo: {
              hasPreviousPage: false,
              startCursor: null
            },
            nodes: [
              {
                id: 'lin-issue-eligible-1',
                identifier: 'CO-2',
                title: 'First eligible',
                priority: 2,
                createdAt: '2026-03-17T04:00:00.000Z',
                updatedAt: '2026-03-20T04:05:00.000Z',
                assignee: null,
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
                inverseRelations: { nodes: [] }
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
      fetchImpl,
      queryMode: 'fresh_discovery',
      eligibleIssueTargetCount: 2
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issues: [
        {
          id: 'lin-issue-eligible-2',
          priority: 1
        },
        {
          id: 'lin-issue-unowned',
          assignee_id: 'someone-else'
        },
        {
          id: 'lin-issue-eligible-1',
          priority: 2
        }
      ]
    });
  });

  it('keeps scanning discovery pages until it finds dispatchable work after saturated states', async () => {
    const issueNode = (
      id: string,
      priority: number,
      state: { name: string; type: string },
      createdAt: string
    ) => ({
      id,
      identifier: `CO-${priority}`,
      title: id,
      priority,
      createdAt,
      updatedAt: '2026-03-20T04:15:00.000Z',
      assignee: null,
      state,
      team: { id: 'lin-team-1', key: 'PREPROD', name: 'PRE-PRO/PRODUCTION' },
      project: { id: 'lin-project-1', name: 'Icon Agency (Bookings)' },
      inverseRelations: { nodes: [] }
    });
    const responseFor = (nodes: unknown[]) =>
      jsonResponse({
        data: {
          viewer: { id: 'viewer-1', organization: { id: 'lin-workspace-1' } },
          issues: {
            pageInfo: { hasPreviousPage: false, startCursor: null },
            nodes
          }
        }
      });
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        variables?: { before?: string | null; priority?: number };
      };
      expect(body.variables?.before ?? null).toBe(null);
      return (body.variables?.priority ?? null) === 1
        ? responseFor([
            issueNode('lin-issue-in-progress-1', 1, { name: 'In Progress', type: 'started' }, '2026-03-17T04:00:00.000Z')
          ])
        : responseFor([
            issueNode('lin-issue-todo-1', 2, { name: 'Todo', type: 'unstarted' }, '2026-03-18T04:00:00.000Z')
          ]);
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
      fetchImpl,
      queryMode: 'fresh_discovery',
      eligibleIssueTargetCount: 1,
      eligibleStateSlotCounts: {
        'in progress': 0
      }
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issues: [{ id: 'lin-issue-in-progress-1' }, { id: 'lin-issue-todo-1' }]
    });
  });

  it('keeps scanning discovery pages until it finds a non-excluded eligible issue', async () => {
    const fetchImpl: typeof fetch = vi.fn(async (_input, init) => {
      const priority = (JSON.parse(String(init?.body ?? '{}')) as { variables?: { priority?: number } }).variables
        ?.priority;
      return jsonResponse({
        data: {
          viewer: { id: 'viewer-1', organization: { id: 'lin-workspace-1' } },
          issues: {
            pageInfo: { hasPreviousPage: false, startCursor: null },
            nodes:
              priority === 1
                ? [
                    {
                      id: 'lin-issue-existing',
                      identifier: 'CO-1',
                      title: 'Existing eligible issue',
                      priority: 1,
                      createdAt: '2026-03-17T04:00:00.000Z',
                      updatedAt: '2026-03-20T04:05:00.000Z',
                      assignee: null,
                      state: { name: 'Todo', type: 'unstarted' },
                      team: { id: 'lin-team-1', key: 'PREPROD', name: 'PRE-PRO/PRODUCTION' },
                      project: { id: 'lin-project-1', name: 'Icon Agency (Bookings)' },
                      inverseRelations: { nodes: [] }
                    }
                  ]
                : [
                    {
                      id: 'lin-issue-new',
                      identifier: 'CO-2',
                      title: 'New eligible issue',
                      priority: 2,
                      createdAt: '2026-03-18T04:00:00.000Z',
                      updatedAt: '2026-03-20T04:10:00.000Z',
                      assignee: null,
                      state: { name: 'Todo', type: 'unstarted' },
                      team: { id: 'lin-team-1', key: 'PREPROD', name: 'PRE-PRO/PRODUCTION' },
                      project: { id: 'lin-project-1', name: 'Icon Agency (Bookings)' },
                      inverseRelations: { nodes: [] }
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
      env: { CO_LINEAR_API_TOKEN: 'lin-api-token' },
      fetchImpl,
      queryMode: 'fresh_discovery',
      eligibleIssueTargetCount: 1,
      excludedIssueIds: ['lin-issue-existing']
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issues: [{ id: 'lin-issue-existing' }, { id: 'lin-issue-new' }]
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

  it('skips issues assigned to someone else and selects the current viewer issue', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        data: {
          viewer: {
            id: 'viewer-1',
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
                id: 'lin-issue-foreign',
                identifier: 'PREPROD-100',
                title: 'Higher-priority issue owned by someone else',
                priority: 1,
                createdAt: '2026-03-18T04:00:00.000Z',
                updatedAt: '2026-03-20T04:00:00.000Z',
                assignee: {
                  id: 'viewer-2',
                  displayName: 'Other Owner'
                },
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
                id: 'lin-issue-owned',
                identifier: 'PREPROD-101',
                title: 'Viewer-owned issue',
                priority: 2,
                createdAt: '2026-03-19T04:00:00.000Z',
                updatedAt: '2026-03-20T05:00:00.000Z',
                assignee: {
                  id: 'viewer-1',
                  displayName: 'Codex'
                },
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
                id: 'lin-issue-unassigned',
                identifier: 'PREPROD-102',
                title: 'Unassigned fallback issue',
                priority: 3,
                createdAt: '2026-03-20T04:00:00.000Z',
                updatedAt: '2026-03-20T06:00:00.000Z',
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
      })
    );

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

    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issue: {
        identifier: 'PREPROD-101',
        title: 'Viewer-owned issue',
        viewer_id: 'viewer-1',
        assignee_id: 'viewer-1',
        assignee_name: 'Codex'
      }
    });
  });

  it('skips started states that are outside the explicit active-state allowlist', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        data: {
          viewer: {
            id: 'viewer-1',
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
                id: 'lin-issue-blocked',
                identifier: 'PREPROD-103',
                title: 'Blocked issue should not dispatch',
                priority: 1,
                createdAt: '2026-03-20T04:00:00.000Z',
                updatedAt: '2026-03-20T06:00:00.000Z',
                assignee: {
                  id: 'viewer-1',
                  displayName: 'Codex'
                },
                state: {
                  name: 'Blocked',
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
      })
    );

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

    expect(result).toEqual({
      kind: 'unavailable',
      status: 503,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_issue_not_found'
    });
  });

  it('treats Ready as the live Todo-equivalent queue state when selecting a fresh dispatch target', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        data: {
          viewer: {
            id: 'viewer-1',
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
                id: 'lin-issue-ready',
                identifier: 'PREPROD-104',
                title: 'Queued Ready issue should dispatch',
                priority: 1,
                createdAt: '2026-03-20T04:00:00.000Z',
                updatedAt: '2026-03-20T06:00:00.000Z',
                assignee: {
                  id: 'viewer-1',
                  displayName: 'Codex'
                },
                state: {
                  name: 'Ready',
                  type: 'unstarted'
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
      })
    );

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

    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issue: {
        identifier: 'PREPROD-104',
        state: 'Ready',
        state_type: 'unstarted'
      }
    });
  });

  it('excludes archived or trashed issues from fresh dispatch admission', async () => {
    const fetchImpl: typeof fetch = vi.fn(async () =>
      jsonResponse({
        data: {
          viewer: {
            id: 'viewer-1',
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
                id: 'lin-issue-archived',
                identifier: 'PREPROD-100',
                title: 'Archived issue should not dispatch',
                priority: 1,
                createdAt: '2026-03-18T04:00:00.000Z',
                updatedAt: '2026-03-20T06:00:00.000Z',
                archivedAt: '2026-04-11T05:00:00.000Z',
                trashed: false,
                assignee: {
                  id: 'viewer-1',
                  displayName: 'Codex'
                },
                state: {
                  name: 'Ready',
                  type: 'unstarted'
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
                id: 'lin-issue-trashed',
                identifier: 'PREPROD-100B',
                title: 'Trashed issue should not dispatch',
                priority: 1,
                createdAt: '2026-03-18T04:30:00.000Z',
                updatedAt: '2026-03-20T06:10:00.000Z',
                archivedAt: null,
                trashed: true,
                assignee: {
                  id: 'viewer-1',
                  displayName: 'Codex'
                },
                state: {
                  name: 'Ready',
                  type: 'unstarted'
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
                id: 'lin-issue-active',
                identifier: 'PREPROD-101',
                title: 'Mutable Ready issue should dispatch',
                priority: 2,
                createdAt: '2026-03-19T04:00:00.000Z',
                updatedAt: '2026-03-20T06:30:00.000Z',
                archivedAt: null,
                trashed: false,
                assignee: {
                  id: 'viewer-1',
                  displayName: 'Codex'
                },
                state: {
                  name: 'Ready',
                  type: 'unstarted'
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
      })
    );

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

    expect(result).toMatchObject({
      kind: 'ready',
      tracked_issue: {
        id: 'lin-issue-active',
        identifier: 'PREPROD-101',
        archived_at: null,
        trashed: false
      }
    });
  });
});
