import { describe, expect, it, vi } from 'vitest';
import type http from 'node:http';

import {
  emitControlActionAuditEvent,
  emitDispatchPilotAuditEvents,
  emitLinearWebhookAuditEvent,
  writeControlError
} from '../src/cli/control/controlServerAuditAndErrorHelpers.js';

describe('controlServerAuditAndErrorHelpers', () => {
  it('writes canonical control errors with optional traceability', () => {
    const writeHead = vi.fn();
    const end = vi.fn();
    const response = { writeHead, end } as unknown as Pick<http.ServerResponse, 'writeHead' | 'end'>;

    writeControlError(response, 409, 'control_action_conflict', { request_id: 'req-1088' });

    expect(writeHead).toHaveBeenCalledWith(409, { 'Content-Type': 'application/json' });
    expect(end).toHaveBeenCalledWith(
      JSON.stringify({
        error: 'control_action_conflict',
        traceability: { request_id: 'req-1088' }
      })
    );
  });

  it('emits canonical Linear webhook audit payloads', async () => {
    const emitControlEvent = vi.fn(async () => undefined);

    await emitLinearWebhookAuditEvent(
      {
        eventTransport: { emitControlEvent } as never
      },
      {
        deliveryId: 'delivery-1088',
        event: 'Issue',
        action: 'update',
        issueId: 'issue-1088',
        outcome: 'accepted',
        reason: 'linear_delivery_accepted'
      }
    );

    expect(emitControlEvent).toHaveBeenCalledWith({
      event: 'linear_advisory_webhook_processed',
      actor: 'runner',
      payload: {
        delivery_id: 'delivery-1088',
        event_name: 'Issue',
        action: 'update',
        issue_id: 'issue-1088',
        outcome: 'accepted',
        reason: 'linear_delivery_accepted',
        advisory_only: true
      }
    });
  });

  it('emits dispatch-pilot evaluated and viewed events with fail-closed shaping', async () => {
    const emitControlEvent = vi.fn(async () => undefined);

    await emitDispatchPilotAuditEvents(
      {
        controlStore: {
          snapshot: () => ({
            run_id: 'run-1088',
            control_seq: 17
          })
        } as never,
        eventTransport: { emitControlEvent } as never,
        paths: {
          manifestPath: '/tmp/.runs/task-1088/cli/run-1088/manifest.json'
        } as never
      },
      {
        surface: 'api_v1_dispatch',
        issueIdentifier: 'issue-1088',
        evaluation: {
          summary: {
            status: 'source_unavailable',
            source_status: 'unavailable',
            reason: 'dispatch_source_live_requires_async_evaluation'
          },
          recommendation: null,
          failure: {
            status: 503,
            code: 'dispatch_source_unavailable',
            reason: 'dispatch_source_live_requires_async_evaluation'
          }
        } as never
      }
    );

    expect(emitControlEvent).toHaveBeenNthCalledWith(1, {
      event: 'dispatch_pilot_evaluated',
      actor: 'runner',
      payload: {
        surface: 'api_v1_dispatch',
        advisory_only: true,
        issue_identifier: 'issue-1088',
        task_id: 'task-1088',
        run_id: 'run-1088',
        control_seq: 17,
        decision: 'fail_closed',
        status: 'source_unavailable',
        source_status: 'unavailable',
        reason: 'dispatch_source_live_requires_async_evaluation'
      }
    });
    expect(emitControlEvent).toHaveBeenNthCalledWith(2, {
      event: 'dispatch_pilot_viewed',
      actor: 'runner',
      payload: {
        surface: 'api_v1_dispatch',
        advisory_only: true,
        issue_identifier: 'issue-1088',
        task_id: 'task-1088',
        run_id: 'run-1088',
        control_seq: 17,
        decision: 'fail_closed',
        status: 'source_unavailable',
        source_status: 'unavailable',
        reason: 'dispatch_source_live_requires_async_evaluation',
        http_status: 503,
        recommendation_available: false
      }
    });
  });

  it('emits control-action replay audit payloads with explicit trace overrides', async () => {
    const emitControlEvent = vi.fn(async () => undefined);

    await emitControlActionAuditEvent(
      {
        eventTransport: { emitControlEvent } as never,
        paths: {
          manifestPath: '/tmp/.runs/task-1088/cli/run-1088/manifest.json'
        } as never
      },
      {
        outcome: 'replayed',
        action: 'pause',
        requestedBy: 'operator',
        reason: 'duplicate_request',
        requestId: 'req-1088',
        intentId: 'intent-1088',
        snapshot: {
          run_id: 'run-1088',
          control_seq: 18,
          latest_action: {
            action: 'pause',
            requested_by: 'runner',
            requested_at: '2026-03-09T12:45:00.000Z',
            actor_id: 'runner-1',
            actor_source: 'telegram.user',
            transport: 'telegram',
            transport_principal: 'telegram:user:1'
          }
        } as never,
        traceability: {
          transport: 'telegram',
          actor_id: 42,
          transport_principal: 'telegram:user:override'
        }
      }
    );

    expect(emitControlEvent).toHaveBeenCalledWith({
      event: 'control_action_replayed',
      actor: 'runner',
      payload: {
        idempotent_replay: true,
        action: 'pause',
        request_id: 'req-1088',
        intent_id: 'intent-1088',
        requested_by: 'operator',
        requested_reason: 'duplicate_request',
        control_seq: 18,
        task_id: 'task-1088',
        run_id: 'run-1088',
        manifest_path: '/tmp/.runs/task-1088/cli/run-1088/manifest.json',
        transport: 'telegram',
        actor_id: null,
        actor_source: 'telegram.user',
        transport_principal: 'telegram:user:override',
        traceability: {
          transport: 'telegram',
          actor_id: 42,
          transport_principal: 'telegram:user:override'
        }
      }
    });
  });
});
