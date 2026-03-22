import { describe, expect, it } from 'vitest';

import {
  evaluateTrackerDispatchPilot,
  evaluateTrackerDispatchPilotAsync,
  summarizeTrackerDispatchPilotPolicy
} from '../src/cli/control/trackerDispatchPilot.js';

describe('TrackerDispatchPilot', () => {
  it('defaults to disabled when dispatch pilot config is missing', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: null
    });

    expect(evaluation.summary).toEqual({
      advisory_only: true,
      configured: false,
      enabled: false,
      kill_switch: false,
      status: 'disabled',
      source_status: 'disabled',
      reason: 'pilot_disabled_default_off',
      source_setup: null
    });
    expect(evaluation.recommendation).toBeNull();
    expect(evaluation.failure).toBeNull();
  });

  it('returns advisory recommendation when enabled with valid static source', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            team_id: 'lin-team-1',
            dispatch_id: 'dispatch-1',
            summary: 'route advisory to review queue',
            reason: 'tracker confidence threshold met',
            confidence: 0.87,
            generated_at: '2026-03-05T00:00:00.000Z'
          }
        }
      },
      defaultIssueIdentifier: 'task-1000'
    });

    expect(evaluation.summary.status).toBe('ready');
    expect(evaluation.summary.source_status).toBe('ready');
    expect(evaluation.summary.source_setup).toEqual({
      provider: 'linear',
      workspace_id: null,
      team_id: 'lin-team-1',
      project_id: null
    });
    expect(evaluation.failure).toBeNull();
    expect(evaluation.recommendation).toEqual({
      issue_identifier: 'task-1000',
      dispatch_id: 'dispatch-1',
      summary: 'route advisory to review queue',
      rationale: 'tracker confidence threshold met',
      confidence: 0.87,
      generated_at: '2026-03-05T00:00:00.000Z',
      source_setup: {
        provider: 'linear',
        workspace_id: null,
        team_id: 'lin-team-1',
        project_id: null
      },
      tracked_issue: null
    });
  });

  it('fails closed in synchronous mode when live evaluation is configured', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true,
            team_id: 'lin-team-live'
          }
        }
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      } as NodeJS.ProcessEnv
    });

    expect(evaluation.summary.status).toBe('source_unavailable');
    expect(evaluation.summary.reason).toBe('dispatch_source_live_requires_async_evaluation');
    expect(evaluation.failure).toEqual({
      status: 503,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_live_requires_async_evaluation'
    });
  });

  it('fails closed in synchronous mode when live evaluation bindings are missing', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true
          }
        }
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      } as NodeJS.ProcessEnv
    });

    expect(evaluation.summary.status).toBe('source_malformed');
    expect(evaluation.summary.reason).toBe('dispatch_source_binding_missing');
    expect(evaluation.failure).toEqual({
      status: 422,
      code: 'dispatch_source_malformed',
      reason: 'dispatch_source_binding_missing'
    });
  });

  it('surfaces missing live Linear bindings in snapshot summaries', () => {
    const summary = summarizeTrackerDispatchPilotPolicy({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true
          }
        }
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      } as NodeJS.ProcessEnv
    });

    expect(summary).toMatchObject({
      status: 'source_malformed',
      source_status: 'malformed',
      reason: 'dispatch_source_binding_missing',
      source_setup: {
        provider: 'linear',
        workspace_id: null,
        team_id: null,
        project_id: null
      }
    });
  });

  it('honors nested kill-switch config and blocks recommendations', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        coordinator: {
          dispatch_pilot: {
            enabled: true,
            kill_switch: true,
            source: {
              provider: 'linear_advisory',
              project_id: 'lin-project-1',
              summary: 'should never appear'
            }
          }
        }
      }
    });

    expect(evaluation.summary).toMatchObject({
      configured: true,
      enabled: true,
      kill_switch: true,
      status: 'kill_switched',
      source_status: 'blocked',
      reason: 'pilot_kill_switch_enabled',
      source_setup: {
        provider: 'linear',
        workspace_id: null,
        team_id: null,
        project_id: 'lin-project-1'
      }
    });
    expect(evaluation.recommendation).toBeNull();
    expect(evaluation.failure).toBeNull();
  });

  it('fails closed when enabled with unavailable source', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        dispatch_pilot: {
          enabled: true
        }
      }
    });

    expect(evaluation.summary.status).toBe('source_unavailable');
    expect(evaluation.summary.source_status).toBe('unavailable');
    expect(evaluation.recommendation).toBeNull();
    expect(evaluation.failure).toEqual({
      status: 503,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_unavailable'
    });
  });

  it('fails closed when source payload is malformed', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            project_id: 'lin-project-1',
            summary: 'malformed confidence',
            confidence: 3
          }
        }
      }
    });

    expect(evaluation.summary.status).toBe('source_malformed');
    expect(evaluation.summary.source_status).toBe('malformed');
    expect(evaluation.recommendation).toBeNull();
    expect(evaluation.failure).toEqual({
      status: 422,
      code: 'dispatch_source_malformed',
      reason: 'dispatch_source_confidence_out_of_range'
    });
  });

  it('fails closed when source provider is missing', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            project_id: 'lin-project-1',
            summary: 'provider missing'
          }
        }
      }
    });

    expect(evaluation.summary.status).toBe('source_malformed');
    expect(evaluation.recommendation).toBeNull();
    expect(evaluation.failure).toEqual({
      status: 422,
      code: 'dispatch_source_malformed',
      reason: 'dispatch_source_provider_missing'
    });
  });

  it('fails closed when linear binding identifiers are missing for static mode', () => {
    const evaluation = evaluateTrackerDispatchPilot({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            summary: 'binding missing'
          }
        }
      }
    });

    expect(evaluation.summary.status).toBe('source_malformed');
    expect(evaluation.recommendation).toBeNull();
    expect(evaluation.failure).toEqual({
      status: 422,
      code: 'dispatch_source_malformed',
      reason: 'dispatch_source_binding_missing'
    });
  });

  it('evaluates a live Linear source asynchronously and returns tracked issue metadata', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              organization: {
                id: 'lin-workspace-1'
              }
            },
            issues: {
              nodes: [
                {
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
                    id: 'lin-team-live',
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
              ]
            }
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    const evaluation = await evaluateTrackerDispatchPilotAsync({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true,
            workspace_id: 'lin-workspace-1',
            team_id: 'lin-team-live',
            project_id: 'lin-project-1'
          }
        }
      },
      defaultIssueIdentifier: 'task-1014',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      } as NodeJS.ProcessEnv,
      fetchImpl
    });

    expect(evaluation.summary).toMatchObject({
      status: 'ready',
      source_status: 'ready',
      source_setup: {
        provider: 'linear',
        workspace_id: 'lin-workspace-1',
        team_id: 'lin-team-live',
        project_id: 'lin-project-1'
      }
    });
    expect(evaluation.failure).toBeNull();
    expect(evaluation.recommendation).toMatchObject({
      issue_identifier: 'PREPROD-101',
      dispatch_id: 'dispatch-advisory-live-linear',
      tracked_issue: {
        identifier: 'PREPROD-101',
        title: 'Investigate advisory routing',
        state: 'In Progress',
        team_key: 'PREPROD',
        project_name: 'Icon Agency (Bookings)',
        recent_activity: [
          {
            summary: 'State Todo -> In Progress'
          }
        ]
      }
    });
  });

  it('skips review-handoff and blocked Todo issues when choosing a live Linear recommendation', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
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
                  id: 'lin-issue-review',
                  identifier: 'PREPROD-100',
                  title: 'Already in review',
                  priority: 1,
                  createdAt: '2026-03-05T01:00:00.000Z',
                  updatedAt: '2026-03-06T02:10:00.000Z',
                  state: {
                    name: 'In Review',
                    type: 'started'
                  },
                  team: {
                    id: 'lin-team-live',
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
                  id: 'lin-issue-blocked',
                  identifier: 'PREPROD-101',
                  title: 'Blocked todo',
                  priority: 1,
                  createdAt: '2026-03-05T02:00:00.000Z',
                  updatedAt: '2026-03-06T02:05:00.000Z',
                  state: {
                    name: 'Todo',
                    type: 'unstarted'
                  },
                  team: {
                    id: 'lin-team-live',
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
                          identifier: 'PREPROD-099',
                          state: {
                            name: 'In Progress',
                            type: 'started'
                          }
                        }
                      }
                    ]
                  },
                  history: { nodes: [] }
                },
                {
                  id: 'lin-issue-active',
                  identifier: 'PREPROD-102',
                  title: 'Runnable issue',
                  priority: 2,
                  createdAt: '2026-03-05T03:00:00.000Z',
                  updatedAt: '2026-03-06T02:00:00.000Z',
                  state: {
                    name: 'In Progress',
                    type: 'started'
                  },
                  team: {
                    id: 'lin-team-live',
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
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    const evaluation = await evaluateTrackerDispatchPilotAsync({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true,
            workspace_id: 'lin-workspace-1',
            team_id: 'lin-team-live',
            project_id: 'lin-project-1'
          }
        }
      },
      defaultIssueIdentifier: 'task-1014',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      } as NodeJS.ProcessEnv,
      fetchImpl
    });

    expect(evaluation.summary).toMatchObject({
      status: 'ready',
      source_status: 'ready'
    });
    expect(evaluation.failure).toBeNull();
    expect(evaluation.recommendation).toMatchObject({
      issue_identifier: 'PREPROD-102',
      tracked_issue: {
        identifier: 'PREPROD-102',
        title: 'Runnable issue',
        state: 'In Progress'
      }
    });
  });

  it('preserves provider order when multiple live Linear issues remain eligible', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
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
                  id: 'lin-issue-newer',
                  identifier: 'PREPROD-200',
                  title: 'Newest eligible issue',
                  priority: 3,
                  createdAt: '2026-03-06T01:00:00.000Z',
                  updatedAt: '2026-03-06T02:10:00.000Z',
                  state: {
                    name: 'In Progress',
                    type: 'started'
                  },
                  team: {
                    id: 'lin-team-live',
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
                  id: 'lin-issue-older',
                  identifier: 'PREPROD-199',
                  title: 'Older but higher dispatch priority',
                  priority: 1,
                  createdAt: '2026-03-05T01:00:00.000Z',
                  updatedAt: '2026-03-06T02:00:00.000Z',
                  state: {
                    name: 'In Progress',
                    type: 'started'
                  },
                  team: {
                    id: 'lin-team-live',
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
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    const evaluation = await evaluateTrackerDispatchPilotAsync({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true,
            workspace_id: 'lin-workspace-1',
            team_id: 'lin-team-live',
            project_id: 'lin-project-1'
          }
        }
      },
      defaultIssueIdentifier: 'task-1014',
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      } as NodeJS.ProcessEnv,
      fetchImpl
    });

    expect(evaluation.summary).toMatchObject({
      status: 'ready',
      source_status: 'ready'
    });
    expect(evaluation.failure).toBeNull();
    expect(evaluation.recommendation).toMatchObject({
      issue_identifier: 'PREPROD-200',
      tracked_issue: {
        identifier: 'PREPROD-200',
        title: 'Newest eligible issue',
        state: 'In Progress'
      }
    });
  });

  it('fails closed when live Linear confidence is outside the allowed range', async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              organization: {
                id: 'lin-workspace-1'
              }
            },
            issues: {
              nodes: [
                {
                  id: 'lin-issue-1',
                  identifier: 'PREPROD-101',
                  title: 'Investigate advisory routing'
                }
              ]
            }
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    const evaluation = await evaluateTrackerDispatchPilotAsync({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true,
            workspace_id: 'lin-workspace-1',
            confidence: 2
          }
        }
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token'
      } as NodeJS.ProcessEnv,
      fetchImpl
    });

    expect(evaluation.summary.status).toBe('source_malformed');
    expect(evaluation.failure).toEqual({
      status: 422,
      code: 'dispatch_source_malformed',
      reason: 'dispatch_source_confidence_out_of_range'
    });
  });

  it('fails closed when the live Linear request times out', async () => {
    const fetchImpl: typeof fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal?.aborted) {
          reject(new Error('aborted'));
          return;
        }
        signal?.addEventListener(
          'abort',
          () => {
            reject(new Error('aborted'));
          },
          { once: true }
        );
      });

    const evaluation = await evaluateTrackerDispatchPilotAsync({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            live: true,
            workspace_id: 'lin-workspace-1'
          }
        }
      },
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CO_LINEAR_REQUEST_TIMEOUT_MS: '10'
      } as NodeJS.ProcessEnv,
      fetchImpl
    });

    expect(evaluation.summary.status).toBe('source_unavailable');
    expect(evaluation.failure).toEqual({
      status: 503,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_provider_request_failed'
    });
  });

  it('fails closed asynchronously when the live Linear token is missing', async () => {
    const evaluation = await evaluateTrackerDispatchPilotAsync({
      featureToggles: {
        dispatch_pilot: {
          enabled: true,
          source: {
            provider: 'linear',
            mode: 'live',
            team_id: 'lin-team-live'
          }
        }
      },
      defaultIssueIdentifier: 'task-1014',
      env: {} as NodeJS.ProcessEnv,
      fetchImpl: async () => {
        throw new Error('should_not_fetch_without_token');
      }
    });

    expect(evaluation.summary.status).toBe('source_unavailable');
    expect(evaluation.summary.reason).toBe('dispatch_source_credentials_missing');
    expect(evaluation.failure).toEqual({
      status: 503,
      code: 'dispatch_source_unavailable',
      reason: 'dispatch_source_credentials_missing'
    });
  });
});
