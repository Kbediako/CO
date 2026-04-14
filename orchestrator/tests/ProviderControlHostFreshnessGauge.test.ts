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
  ] as const)('classifies fixture %s as %s', async (fixture, verdict, findingCode) => {
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

  it('does not flag terminal proof contradictions without a run id match', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'terminal-proof-missing-run-id'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('unknown');
    expect(report.strict_failed).toBe(false);
    expect(report.metrics.terminal_reconciliation_lag_ms).toMatchObject({
      value: null,
      verdict: 'unknown',
      source_field: 'run_id'
    });
    expect(report.findings.map((finding) => finding.code)).toContain('terminal_proof_missing_run_id');
    expect(report.findings.map((finding) => finding.code)).not.toContain('terminal_proof_with_active_claim');
  });

  it('flags terminal proof contradictions even when terminal timestamps are missing', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'terminal-proof-active-claim-no-timestamp'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('contradictory');
    expect(report.strict_failed).toBe(true);
    expect(report.metrics.terminal_reconciliation_lag_ms).toMatchObject({
      value: null,
      verdict: 'contradictory',
      source_field: 'owner_status'
    });
    expect(report.findings.map((finding) => finding.code)).toContain('terminal_proof_with_active_claim');
  });

  it('uses the newest proof Linear budget snapshot when no explicit budget artifact exists', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'proof-budget-newest'),
      now: NOW
    });

    expect(report.verdict).toBe('healthy');
    expect(report.findings.map((finding) => finding.code)).not.toContain('linear_headroom_low');
  });

  it('does not treat control endpoint metadata alone as provider/control-host evidence', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'control-endpoint-only'),
      now: NOW
    });

    expect(report.sources.control_endpoint_metadata).toHaveLength(1);
    expect(report.verdict).toBe('unknown');
    expect(report.findings.map((finding) => finding.code)).toContain('no_provider_control_host_artifacts');
  });

  it('scopes launch and heartbeat latency to active claims and proofs', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'active-scope-latencies'),
      now: NOW
    });

    expect(report.verdict).toBe('healthy');
    expect(report.metrics.claim_to_start_latency_ms.value).toBe(20_000);
    expect(report.metrics.start_to_first_heartbeat_latency_ms.value).toBe(15_000);
    expect(report.findings.map((finding) => finding.code)).not.toContain('claim_to_start_latency_degraded');
    expect(report.findings.map((finding) => finding.code)).not.toContain('start_to_first_heartbeat_latency_degraded');
  });

  it('scopes child-lane cap pressure to the busiest parent run', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'child-lane-cap-per-parent'),
      now: NOW
    });

    expect(report.verdict).toBe('healthy');
    expect(report.metrics.child_lane_cap_pressure.value).toBe(0.5);
    expect(report.findings.map((finding) => finding.code)).not.toContain('child_lane_cap_pressure');
  });

  it('matches explicitly supplied proofs and manifests by run id across artifact directories', async () => {
    const fixtureRoot = join(FIXTURE_ROOT, 'separate-manifest-proof-run-id');
    const report = await evaluateProviderControlHostFreshnessGauge({
      now: NOW,
      strict: true,
      paths: {
        provider_intake_state: [join(fixtureRoot, 'provider-intake-state.json')],
        provider_manifests: [join(fixtureRoot, 'manifests/manifest.json')],
        provider_proofs: [join(fixtureRoot, 'proofs/provider-linear-worker-proof.json')]
      }
    });

    expect(report.verdict).toBe('contradictory');
    expect(report.strict_failed).toBe(true);
    expect(report.metrics.terminal_reconciliation_lag_ms.source_path).toContain('provider-linear-worker-proof.json');
    expect(report.findings.map((finding) => finding.code)).toContain('terminal_proof_with_active_claim');
  });

  it('excludes terminal proofs from child-lane cap pressure', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'terminal-child-lane-cap-pressure'),
      now: NOW
    });

    expect(report.verdict).toBe('healthy');
    expect(report.metrics.child_lane_cap_pressure.value).toBe(0);
    expect(report.findings.map((finding) => finding.code)).not.toContain('child_lane_cap_pressure');
  });

  it('rejects invalid now values instead of using wall-clock time', async () => {
    await expect(evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'healthy'),
      now: 'not-a-timestamp'
    })).rejects.toThrow(/Invalid now value/);
  });

  it('requires an explicit artifact root or artifact path flags for CLI replay', async () => {
    await expect(runControlHostFreshnessGaugeCliShell({
      flags: { format: 'json', now: NOW },
      printHelp: vi.fn()
    })).rejects.toThrow(/requires --artifact-root/);
  });

  it('supports explicit path flags without recursively scanning an artifact root', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await runControlHostFreshnessGaugeCliShell({
      flags: {
        'provider-intake-state': join(FIXTURE_ROOT, 'stale-refresh/provider-intake-state.json'),
        format: 'json',
        now: NOW,
        strict: true
      },
      printHelp: vi.fn()
    });

    expect(process.exitCode).toBe(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      verdict: 'stale',
      strict_failed: true
    });
  });
});
