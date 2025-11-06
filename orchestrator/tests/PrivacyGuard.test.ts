import { describe, expect, it } from 'vitest';

import { PrivacyGuard } from '../src/privacy/guard.js';
import type { ExecStreamFrame } from '../../packages/orchestrator/src/exec/handle-service.js';

function buildChunkFrame(data: string): ExecStreamFrame {
  return {
    sequence: 1,
    timestamp: new Date('2025-11-05T00:00:00Z').toISOString(),
    event: {
      type: 'exec:chunk',
      correlationId: 'corr-1',
      attempt: 1,
      timestamp: new Date('2025-11-05T00:00:00Z').toISOString(),
      payload: {
        stream: 'stdout',
        sequence: 1,
        bytes: data.length,
        data
      }
    }
  };
}

describe('PrivacyGuard', () => {
  it('redacts sensitive tokens in enforce mode', async () => {
    const guard = new PrivacyGuard({ mode: 'enforce' });
    const frame = buildChunkFrame('api_key=super-secret-token');

    const result = await guard.process(frame, { handleId: 'handle-1' });
    expect(result.decision.action).toBe('redact');
    const redactedEvent = result.frame?.event;
    expect(redactedEvent?.type).toBe('exec:chunk');
    if (redactedEvent?.type !== 'exec:chunk') {
      throw new Error('expected exec:chunk frame');
    }
    expect(redactedEvent.payload.data).toBe('[REDACTED]');
    const metrics = guard.getMetrics();
    expect(metrics.redactedFrames).toBe(1);
  });

  it('blocks private key output', async () => {
    const guard = new PrivacyGuard({ mode: 'enforce' });
    const frame = buildChunkFrame('-----BEGIN PRIVATE KEY-----');

    const result = await guard.process(frame, { handleId: 'handle-2' });
    expect(result.decision.action).toBe('block');
    expect(result.frame).toBeNull();
  });

  it('records detections without enforcement in shadow mode', async () => {
    const guard = new PrivacyGuard({ mode: 'shadow' });
    const frame = buildChunkFrame('password=secret');

    const result = await guard.process(frame, { handleId: 'handle-3' });
    expect(result.decision.action).toBe('allow');
    const metrics = guard.getMetrics();
    expect(metrics.decisions[0]?.reason).toBe('shadow-mode');
  });
});
