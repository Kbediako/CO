import http from 'node:http';
import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ControlState } from '../src/cli/control/controlState.js';
import {
  handleLinearWebhookRequest,
  normalizeLinearAdvisoryState
} from '../src/cli/control/linearWebhookController.js';

function createResponseRecorder() {
  const state: {
    statusCode: number | null;
    headers: Record<string, string> | null;
    body: unknown;
  } = {
    statusCode: null,
    headers: null,
    body: null
  };

  const res = {
    writeHead(statusCode: number, headers: Record<string, string>) {
      state.statusCode = statusCode;
      state.headers = headers;
      return this;
    },
    end(payload?: string) {
      state.body = payload ? JSON.parse(payload) : null;
      return this;
    }
  } as unknown as http.ServerResponse;

  return { res, state };
}

function createRequest(
  input: Partial<Pick<http.IncomingMessage, 'method' | 'url' | 'headers'>>
): Pick<http.IncomingMessage, 'method' | 'url' | 'headers'> {
  return {
    method: input.method ?? 'POST',
    url: input.url ?? '/integrations/linear/webhook',
    headers: input.headers ?? {}
  };
}

function signLinearWebhook(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function createDispatchPilotFeatureToggles(): ControlState['feature_toggles'] {
  return {
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
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('LinearWebhookController', () => {
  it('returns false for non-webhook pathnames without invoking the webhook controller path', async () => {
    const { res, state } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    const readRawBody = vi.fn(async () => Buffer.from(''));

    const handled = await handleLinearWebhookRequest({
      req: createRequest({ method: 'POST', url: '/api/v1/state' }),
      res,
      linearAdvisoryState: advisoryState,
      readRawBody,
      persistLinearAdvisory: vi.fn(async () => undefined),
      emitAuditEvent: vi.fn(async () => undefined),
      readFeatureToggles: () => null,
      publishRuntime: vi.fn()
    });

    expect(handled).toBe(false);
    expect(readRawBody).not.toHaveBeenCalled();
    expect(state.statusCode).toBeNull();
    expect(state.body).toBeNull();
  });

  it('handles webhook pathnames through the controller-owned branch entrypoint', async () => {
    const { res, state } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    const readRawBody = vi.fn(async () => Buffer.from(''));

    const handled = await handleLinearWebhookRequest({
      req: createRequest({ method: 'GET' }),
      res,
      linearAdvisoryState: advisoryState,
      readRawBody,
      persistLinearAdvisory: vi.fn(async () => undefined),
      emitAuditEvent: vi.fn(async () => undefined),
      readFeatureToggles: () => null,
      publishRuntime: vi.fn()
    });

    expect(handled).toBe(true);
    expect(readRawBody).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(405);
    expect(state.body).toMatchObject({
      status: 'rejected',
      reason: 'method_not_allowed'
    });
  });

  it('returns method-not-allowed for non-POST webhook methods', async () => {
    const { res, state } = createResponseRecorder();
    const readRawBody = vi.fn(async () => Buffer.from(''));

    await handleLinearWebhookRequest({
      req: createRequest({
        method: 'GET'
      }),
      res,
      linearAdvisoryState: normalizeLinearAdvisoryState(null),
      readRawBody,
      persistLinearAdvisory: vi.fn(async () => undefined),
      emitAuditEvent: vi.fn(async () => undefined),
      readFeatureToggles: () => null,
      publishRuntime: vi.fn()
    });

    expect(readRawBody).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(405);
    expect(state.body).toMatchObject({
      status: 'rejected',
      reason: 'method_not_allowed'
    });
  });

  it('rejects invalid signatures without mutating advisory state', async () => {
    const { res, state } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    const persistLinearAdvisory = vi.fn(async () => undefined);
    const emitAuditEvent = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const body = JSON.stringify({
      action: 'update',
      type: 'Issue',
      webhookTimestamp: Date.now(),
      data: { id: 'lin-issue-1' }
    });

    await handleLinearWebhookRequest({
      req: createRequest({
        headers: {
          'linear-delivery': 'delivery-invalid',
          'linear-event': 'Issue',
          'linear-signature': 'invalid-signature'
        }
      }),
      res,
      linearAdvisoryState: advisoryState,
      readRawBody: vi.fn(async () => Buffer.from(body)),
      persistLinearAdvisory,
      emitAuditEvent,
      readFeatureToggles: () => createDispatchPilotFeatureToggles(),
      publishRuntime,
      env: {
        CO_LINEAR_WEBHOOK_SECRET: 'linear-webhook-secret'
      }
    });

    expect(state.statusCode).toBe(401);
    expect(state.body).toMatchObject({
      status: 'rejected',
      reason: 'linear_signature_invalid'
    });
    expect(advisoryState.latest_result).toBeNull();
    expect(advisoryState.seen_deliveries).toHaveLength(0);
    expect(persistLinearAdvisory).not.toHaveBeenCalled();
    expect(emitAuditEvent).not.toHaveBeenCalled();
    expect(publishRuntime).not.toHaveBeenCalled();
  });

  it('rejects invalid timestamps at the extracted controller seam', async () => {
    const { res, state } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    const persistLinearAdvisory = vi.fn(async () => undefined);
    const emitAuditEvent = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const webhookSecret = 'linear-webhook-secret';
    const body = JSON.stringify({
      action: 'update',
      type: 'Issue',
      webhookTimestamp: 'not-a-timestamp',
      data: { id: 'lin-issue-1' }
    });

    await handleLinearWebhookRequest({
      req: createRequest({
        headers: {
          'linear-delivery': 'delivery-invalid-timestamp',
          'linear-event': 'Issue',
          'linear-signature': signLinearWebhook(body, webhookSecret)
        }
      }),
      res,
      linearAdvisoryState: advisoryState,
      readRawBody: vi.fn(async () => Buffer.from(body)),
      persistLinearAdvisory,
      emitAuditEvent,
      readFeatureToggles: () => createDispatchPilotFeatureToggles(),
      publishRuntime,
      env: {
        CO_LINEAR_WEBHOOK_SECRET: webhookSecret
      }
    });

    expect(state.statusCode).toBe(401);
    expect(state.body).toMatchObject({
      status: 'rejected',
      reason: 'linear_webhook_timestamp_invalid'
    });
    expect(advisoryState.latest_result).toBe('rejected');
    expect(advisoryState.latest_reason).toBe('linear_webhook_timestamp_invalid');
    expect(persistLinearAdvisory).toHaveBeenCalledTimes(1);
    expect(emitAuditEvent).toHaveBeenCalledWith({
      deliveryId: 'delivery-invalid-timestamp',
      event: 'Issue',
      action: 'update',
      issueId: 'lin-issue-1',
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_invalid'
    });
    expect(publishRuntime).not.toHaveBeenCalled();
  });

  it('rejects expired timestamps at the extracted controller seam', async () => {
    const { res, state } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    const persistLinearAdvisory = vi.fn(async () => undefined);
    const emitAuditEvent = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const webhookSecret = 'linear-webhook-secret';
    const now = Date.parse('2026-03-07T07:00:00.000Z');
    const body = JSON.stringify({
      action: 'update',
      type: 'Issue',
      webhookTimestamp: now - 6 * 60 * 1000,
      data: { id: 'lin-issue-1' }
    });

    await handleLinearWebhookRequest({
      req: createRequest({
        headers: {
          'linear-delivery': 'delivery-expired-timestamp',
          'linear-event': 'Issue',
          'linear-signature': signLinearWebhook(body, webhookSecret)
        }
      }),
      res,
      linearAdvisoryState: advisoryState,
      readRawBody: vi.fn(async () => Buffer.from(body)),
      persistLinearAdvisory,
      emitAuditEvent,
      readFeatureToggles: () => createDispatchPilotFeatureToggles(),
      publishRuntime,
      env: {
        CO_LINEAR_WEBHOOK_SECRET: webhookSecret
      },
      now: () => now
    });

    expect(state.statusCode).toBe(401);
    expect(state.body).toMatchObject({
      status: 'rejected',
      reason: 'linear_webhook_timestamp_expired'
    });
    expect(advisoryState.latest_result).toBe('rejected');
    expect(advisoryState.latest_reason).toBe('linear_webhook_timestamp_expired');
    expect(persistLinearAdvisory).toHaveBeenCalledTimes(1);
    expect(emitAuditEvent).toHaveBeenCalledWith({
      deliveryId: 'delivery-expired-timestamp',
      event: 'Issue',
      action: 'update',
      issueId: 'lin-issue-1',
      outcome: 'rejected',
      reason: 'linear_webhook_timestamp_expired'
    });
    expect(publishRuntime).not.toHaveBeenCalled();
  });

  it('marks duplicate deliveries without re-evaluating dispatch source state', async () => {
    const { res, state } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    advisoryState.seen_deliveries.push({
      delivery_id: 'delivery-1',
      event: 'Issue',
      action: 'update',
      issue_id: 'lin-issue-1',
      webhook_timestamp: 1,
      processed_at: '2026-03-07T07:00:00.000Z',
      outcome: 'accepted',
      reason: 'linear_delivery_accepted'
    });
    const persistLinearAdvisory = vi.fn(async () => undefined);
    const emitAuditEvent = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const webhookSecret = 'linear-webhook-secret';
    const body = JSON.stringify({
      action: 'update',
      type: 'Issue',
      webhookTimestamp: Date.now(),
      data: { id: 'lin-issue-1' }
    });

    await handleLinearWebhookRequest({
      req: createRequest({
        headers: {
          'linear-delivery': 'delivery-1',
          'linear-event': 'Issue',
          'linear-signature': signLinearWebhook(body, webhookSecret)
        }
      }),
      res,
      linearAdvisoryState: advisoryState,
      readRawBody: vi.fn(async () => Buffer.from(body)),
      persistLinearAdvisory,
      emitAuditEvent,
      readFeatureToggles: vi.fn(() => null),
      publishRuntime,
      env: {
        CO_LINEAR_WEBHOOK_SECRET: webhookSecret
      }
    });

    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({
      status: 'duplicate',
      reason: 'linear_delivery_duplicate'
    });
    expect(advisoryState.latest_result).toBe('duplicate');
    expect(persistLinearAdvisory).toHaveBeenCalledTimes(1);
    expect(emitAuditEvent).toHaveBeenCalledWith({
      deliveryId: 'delivery-1',
      event: 'Issue',
      action: 'update',
      issueId: 'lin-issue-1',
      outcome: 'duplicate',
      reason: 'linear_delivery_duplicate'
    });
    expect(publishRuntime).not.toHaveBeenCalled();
  });

  it('accepts a valid signed delivery and publishes runtime updates', async () => {
    const { res, state } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    const persistLinearAdvisory = vi.fn(async () => undefined);
    const emitAuditEvent = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(async () => undefined),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };
    const webhookSecret = 'linear-webhook-secret';
    const body = JSON.stringify({
      action: 'update',
      type: 'Issue',
      webhookTimestamp: Date.now(),
      data: { id: 'lin-issue-1' }
    });
    const realFetch = globalThis.fetch;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        return new Response(
          JSON.stringify({
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
                updatedAt: '2026-03-06T05:00:00.000Z',
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
                  nodes: []
                }
              }
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return realFetch(input, init);
    });

    await handleLinearWebhookRequest({
      req: createRequest({
        headers: {
          'content-type': 'application/json',
          'linear-delivery': 'delivery-accepted',
          'linear-event': 'Issue',
          'linear-signature': signLinearWebhook(body, webhookSecret)
        }
      }),
      res,
      linearAdvisoryState: advisoryState,
      readRawBody: vi.fn(async () => Buffer.from(body)),
      persistLinearAdvisory,
      emitAuditEvent,
      readFeatureToggles: () => createDispatchPilotFeatureToggles(),
      providerIssueHandoff,
      publishRuntime,
      env: {
        CO_LINEAR_API_TOKEN: 'lin-api-token',
        CO_LINEAR_WEBHOOK_SECRET: webhookSecret
      }
    });

    expect(state.statusCode).toBe(200);
    expect(state.body).toMatchObject({
      status: 'accepted',
      reason: 'linear_delivery_accepted'
    });
    expect(advisoryState.latest_result).toBe('accepted');
    expect(advisoryState.tracked_issue).toMatchObject({
      identifier: 'PREPROD-101',
      team_key: 'PREPROD'
    });
    expect(persistLinearAdvisory).toHaveBeenCalledTimes(1);
    expect(emitAuditEvent).toHaveBeenCalledWith({
      deliveryId: 'delivery-accepted',
      event: 'Issue',
      action: 'update',
      issueId: 'lin-issue-1',
      outcome: 'accepted',
      reason: 'linear_delivery_accepted'
    });
    expect(providerIssueHandoff.handleAcceptedTrackedIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryId: 'delivery-accepted',
        action: 'update',
        trackedIssue: expect.objectContaining({
          id: 'lin-issue-1',
          identifier: 'PREPROD-101',
          state_type: 'started'
        })
      })
    );
    expect(publishRuntime).toHaveBeenCalledTimes(1);
  });

  it('does not persist an accepted delivery before provider handoff succeeds', async () => {
    const { res } = createResponseRecorder();
    const advisoryState = normalizeLinearAdvisoryState(null);
    const persistLinearAdvisory = vi.fn(async () => undefined);
    const emitAuditEvent = vi.fn(async () => undefined);
    const publishRuntime = vi.fn();
    const providerIssueHandoff = {
      handleAcceptedTrackedIssue: vi.fn(async () => {
        throw new Error('provider handoff failed');
      }),
      rehydrate: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    };
    const webhookSecret = 'linear-webhook-secret';
    const body = JSON.stringify({
      action: 'update',
      type: 'Issue',
      webhookTimestamp: Date.now(),
      data: { id: 'lin-issue-1' }
    });
    const realFetch = globalThis.fetch;

    vi.stubGlobal('fetch', async (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl);
      if (url.toString() === 'https://api.linear.app/graphql') {
        return new Response(
          JSON.stringify({
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
                updatedAt: '2026-03-06T05:00:00.000Z',
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
                  nodes: []
                }
              }
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      return realFetch(input, init);
    });

    await expect(
      handleLinearWebhookRequest({
        req: createRequest({
          headers: {
            'content-type': 'application/json',
            'linear-delivery': 'delivery-handoff-failure',
            'linear-event': 'Issue',
            'linear-signature': signLinearWebhook(body, webhookSecret)
          }
        }),
        res,
        linearAdvisoryState: advisoryState,
        readRawBody: vi.fn(async () => Buffer.from(body)),
        persistLinearAdvisory,
        emitAuditEvent,
        readFeatureToggles: () => createDispatchPilotFeatureToggles(),
        providerIssueHandoff,
        publishRuntime,
        env: {
          CO_LINEAR_API_TOKEN: 'lin-api-token',
          CO_LINEAR_WEBHOOK_SECRET: webhookSecret
        }
      })
    ).rejects.toThrow('provider handoff failed');

    expect(advisoryState.latest_result).toBeNull();
    expect(advisoryState.latest_reason).toBeNull();
    expect(advisoryState.seen_deliveries).toHaveLength(0);
    expect(persistLinearAdvisory).not.toHaveBeenCalled();
    expect(emitAuditEvent).not.toHaveBeenCalled();
    expect(publishRuntime).not.toHaveBeenCalled();
  });
});
