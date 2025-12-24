import { describe, expect, it } from 'vitest';
import {
  classifyTaskBucket,
  countPendingApprovals,
  isHeartbeatFresh,
  isHeartbeatStale
} from '../scripts/status-ui-build.mjs';

describe('status-ui-build classification', () => {
  const now = new Date('2025-12-24T00:00:00Z');

  it('marks pending when no run exists', () => {
    const result = classifyTaskBucket(null, { now });
    expect(result.bucket).toBe('pending');
  });

  it('marks complete for terminal runs with completed_at', () => {
    const result = classifyTaskBucket(
      {
        status: 'succeeded',
        started_at: '2025-12-23T23:58:00Z',
        completed_at: '2025-12-23T23:59:00Z',
        approvals: [],
        commands: []
      },
      { now }
    );
    expect(result.bucket).toBe('complete');
  });

  it('prioritizes ongoing when approvals are pending', () => {
    const result = classifyTaskBucket(
      {
        status: 'in_progress',
        started_at: '2025-12-23T23:58:00Z',
        heartbeat_at: '2025-12-23T23:59:59Z',
        heartbeat_stale_after_seconds: 30,
        approvals: [{ status: 'pending' }],
        commands: []
      },
      { now }
    );
    expect(result.bucket).toBe('ongoing');
  });

  it('marks ongoing when heartbeat is stale', () => {
    const result = classifyTaskBucket(
      {
        status: 'in_progress',
        started_at: '2025-12-23T23:58:00Z',
        heartbeat_at: '2025-12-23T23:59:00Z',
        heartbeat_stale_after_seconds: 10,
        approvals: [],
        commands: []
      },
      { now }
    );
    expect(result.bucket).toBe('ongoing');
  });

  it('marks active when heartbeat is fresh and no approvals are pending', () => {
    const result = classifyTaskBucket(
      {
        status: 'in_progress',
        started_at: '2025-12-23T23:58:00Z',
        heartbeat_at: '2025-12-23T23:59:55Z',
        heartbeat_stale_after_seconds: 30,
        approvals: [],
        commands: []
      },
      { now }
    );
    expect(result.bucket).toBe('active');
  });

  it('marks pending when run has not started any commands', () => {
    const result = classifyTaskBucket(
      {
        status: 'queued',
        started_at: null,
        completed_at: null,
        approvals: [],
        commands: [{ status: 'pending', started_at: null }]
      },
      { now }
    );
    expect(result.bucket).toBe('pending');
  });

  it('detects pending approvals using status flags', () => {
    const approvals = [{ status: 'pending' }, { state: 'approved' }];
    expect(countPendingApprovals(approvals)).toBe(1);
  });

  it('computes heartbeat freshness and staleness', () => {
    expect(isHeartbeatFresh('2025-12-23T23:59:55Z', 30, now)).toBe(true);
    expect(isHeartbeatStale('2025-12-23T23:59:00Z', 10, now)).toBe(true);
  });
});
