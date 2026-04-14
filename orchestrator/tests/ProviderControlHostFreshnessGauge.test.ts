import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  evaluateProviderControlHostFreshnessGauge
} from '../src/cli/control/providerControlHostFreshnessGauge.js';
import { runControlHostFreshnessGaugeCliShell } from '../src/cli/controlHostFreshnessGaugeCliShell.js';

const FIXTURE_ROOT = join(process.cwd(), 'orchestrator/tests/fixtures/provider-control-host-freshness');
const NOW = '2026-04-14T06:00:00.000Z';

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe('provider/control-host freshness gauge', () => {
  it('emits a healthy machine-readable report from replayed provider/control-host artifacts', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'healthy'),
      now: NOW,
      strict: true
    });

    expect(report).toMatchObject({
      schema_version: 1,
      read_only: true,
      verdict: 'healthy',
      strict_failed: false
    });
    expect(report.sources.provider_intake_state).toHaveLength(1);
    expect(report.sources.provider_manifests).toHaveLength(1);
    expect(report.sources.provider_proofs).toHaveLength(1);
    expect(report.sources.worker_audit_jsonl).toHaveLength(1);
    expect(report.sources.control_endpoint_metadata).toHaveLength(1);
    expect(report.sources.status_datasets).toHaveLength(1);
    expect(Object.keys(report.metrics).sort()).toEqual([
      'active_heartbeat_age_ms',
      'child_lane_cap_pressure',
      'claim_queue_age_ms',
      'claim_to_start_latency_ms',
      'last_successful_refresh_age_ms',
      'polling_health',
      'retry_backoff_age_ms',
      'stale_source_verdict',
      'start_to_first_heartbeat_latency_ms',
      'terminal_reconciliation_lag_ms'
    ].sort());
    expect(report.metrics.claim_queue_age_ms.value).toBeNull();
    expect(report.metrics.last_successful_refresh_age_ms.value).toBe(30_000);
    expect(report.metrics.claim_to_start_latency_ms.value).toBe(20_000);
    expect(report.metrics.start_to_first_heartbeat_latency_ms.value).toBe(25_000);
    expect(report.metrics.active_heartbeat_age_ms.value).toBe(10_000);
    expect(report.metrics.stale_source_verdict.value).toBe('healthy');
    expect(report.findings).toEqual([]);
  });

  it.each([
    ['stale-refresh', 'stale', 'stale_refresh'],
    ['active-manifest-stale-proof', 'stale', 'active_heartbeat_stale'],
    ['terminal-proof-active-claim', 'contradictory', 'terminal_proof_with_active_claim'],
    ['low-linear-headroom', 'degraded', 'linear_headroom_low'],
    ['stale-retry-queue', 'stale', 'retry_queue_stale'],
    ['child-lane-cap-pressure', 'degraded', 'child_lane_cap_pressure']
  ] as const)('classifies degraded fixture %s as %s', async (fixture, verdict, findingCode) => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, fixture),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe(verdict);
    expect(report.findings.map((finding) => finding.code)).toContain(findingCode);
    expect(report.metrics.stale_source_verdict.value).toBe(verdict);
    expect(report.strict_failed).toBe(verdict === 'stale' || verdict === 'contradictory');
  });

  it('parses worker audit JSONL and flags malformed audit evidence', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'malformed-worker-audit'),
      now: NOW
    });

    expect(report.sources.worker_audit_jsonl).toHaveLength(1);
    expect(report.verdict).toBe('unknown');
    expect(report.findings.map((finding) => finding.code)).toContain('worker_audit_jsonl_malformed');
  });

  it('sets a strict non-zero exit code for stale or contradictory CLI output', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runControlHostFreshnessGaugeCliShell({
      flags: {
        'artifact-root': join(FIXTURE_ROOT, 'terminal-proof-active-claim'),
        format: 'json',
        now: NOW,
        strict: true
      },
      printHelp: vi.fn()
    });

    expect(process.exitCode).toBe(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      verdict: 'contradictory',
      strict_failed: true
    });
  });
});
