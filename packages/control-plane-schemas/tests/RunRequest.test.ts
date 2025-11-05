import { describe, expect, it } from 'vitest';

import {
  CONTROL_PLANE_RUN_REQUEST_SCHEMA,
  CONTROL_PLANE_RUN_REQUEST_VERSION,
  validateRunRequestV2
} from '../src/index.js';

describe('validateRunRequestV2', () => {
  it('accepts a well-formed run request', () => {
    const payload = buildValidPayload();
    const result = validateRunRequestV2(payload);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.value).toMatchObject({
      schema: CONTROL_PLANE_RUN_REQUEST_SCHEMA,
      version: CONTROL_PLANE_RUN_REQUEST_VERSION,
      requestId: payload.requestId,
      task: payload.task,
      pipeline: payload.pipeline,
      schedule: payload.schedule,
      streaming: payload.streaming,
      constraints: payload.constraints,
      metrics: payload.metrics,
      requestedAt: payload.requestedAt,
      requestedBy: payload.requestedBy,
      metadata: payload.metadata
    });
  });

  it('rejects payloads missing required sections', () => {
    const payload = {
      schema: CONTROL_PLANE_RUN_REQUEST_SCHEMA,
      version: CONTROL_PLANE_RUN_REQUEST_VERSION,
      requestId: 'run-missing',
      task: {
        id: 'task',
        title: 'Task'
      }
      // pipeline omitted
    } as unknown;

    const result = validateRunRequestV2(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.path === '$.pipeline')).toBe(true);
  });

  it('reports descriptive errors for scheduling mismatches', () => {
    const payload = buildValidPayload();
    payload.schedule.minInstances = 3;
    payload.schedule.maxInstances = 1;

    const result = validateRunRequestV2(payload);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((error) =>
        error.message.includes('maxInstances must be greater than or equal to minInstances')
      )
    ).toBe(true);
  });
});

function buildValidPayload() {
  const now = new Date().toISOString();
  return {
    schema: CONTROL_PLANE_RUN_REQUEST_SCHEMA,
    version: CONTROL_PLANE_RUN_REQUEST_VERSION,
    requestId: 'run-123',
    task: {
      id: 'autonomy-upgrade',
      slug: 'autonomy-upgrade',
      title: 'Codex Multi-Instance Autonomy Upgrade',
      metadata: { initiative: 'autonomy', priority: 'high' },
      tags: ['autonomy', 'control-plane']
    },
    pipeline: {
      id: 'diagnostics-with-eval',
      version: '1.0.0',
      title: 'Diagnostics With Eval',
      capabilities: ['general', 'sandbox'],
      stages: [
        {
          id: 'build',
          kind: 'command' as const,
          title: 'Build',
          capabilities: ['general']
        },
        {
          id: 'test',
          kind: 'command' as const,
          title: 'Test',
          optional: false,
          capabilities: ['sandbox']
        }
      ]
    },
    schedule: {
      strategy: 'auto' as const,
      minInstances: 1,
      maxInstances: 2,
      fanOut: [
        { capability: 'general', weight: 1 },
        { capability: 'sandbox', weight: 0.5, maxConcurrency: 1 }
      ],
      recovery: {
        heartbeatIntervalSeconds: 30,
        missingHeartbeatTimeoutSeconds: 120,
        maxRetries: 3
      }
    },
    streaming: {
      handles: true,
      resumeSupported: true,
      observers: {
        maxSubscribers: 5,
        defaultBackpressureMs: 250
      }
    },
    constraints: {
      privacyLevel: 'standard' as const,
      policyVersion: '2025-10-01'
    },
    metrics: {
      emitIntervalSeconds: 30,
      requiredDimensions: ['instanceId', 'phase', 'status']
    },
    requestedAt: now,
    requestedBy: {
      actorId: 'codex-cli',
      channel: 'cli',
      name: 'Codex CLI'
    },
    metadata: {
      artifactRoot: '.runs/autonomy-upgrade/cli/run-123',
      guardrails: ['spec-guard']
    }
  };
}
