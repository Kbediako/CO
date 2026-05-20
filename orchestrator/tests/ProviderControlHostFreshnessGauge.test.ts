import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  evaluateProviderControlHostFreshnessGauge
} from '../src/cli/control/providerControlHostFreshnessGauge.js';
import { runControlHostFreshnessGaugeCliShell } from '../src/cli/controlHostFreshnessGaugeCliShell.js';
import { inspectSourceRootFreshness } from '../src/cli/utils/sourceRootFreshness.js';

const FIXTURE_ROOT = join(process.cwd(), 'orchestrator/tests/fixtures/provider-control-host-freshness');
const NOW = '2026-04-14T06:00:00.000Z';
const cleanupRoots: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  process.exitCode = 0;
  await Promise.all(cleanupRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function git(root: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

async function createSourceRootRepo(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  cleanupRoots.push(root);
  await mkdir(join(root, 'bin'), { recursive: true });
  await writeFile(join(root, 'bin', 'codex-orchestrator.ts'), 'console.log("control host");\n', 'utf8');
  git(root, ['init']);
  git(root, ['config', 'user.email', 'codex@example.com']);
  git(root, ['config', 'user.name', 'Codex']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'initial control host source']);
  git(root, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  return root;
}

function createControlHostOwner(repoRoot: string, sourceRootFreshness: unknown) {
  return {
    status: 'owned',
    updated_at: NOW,
    owner: {
      owner_token: 'owner-token',
      status: 'owned',
      pid: 123,
      hostname: 'host.local',
      acquired_at: NOW,
      updated_at: NOW,
      repo_root: repoRoot,
      run_id: 'control-host',
      run_dir: join(repoRoot, '.runs', 'local-mcp', 'cli', 'control-host'),
      lock_dir: join(repoRoot, '.runs', 'control-host-owner.lock'),
      owner_path: join(repoRoot, '.runs', 'control-host-owner.json'),
      source_root_freshness: sourceRootFreshness
    }
  };
}

function createStaleSupervisedControlHostOwner(repoRoot = '/repo') {
  return createControlHostOwner(repoRoot, {
    schema_version: 1,
    status: 'warning',
    observed_at: NOW,
    entrypoint_kind: 'bootstrap',
    source_checkout: { status: 'stale', repo_root: repoRoot, dirty: { status: 'clean' } },
    intended_checkout: { status: 'current', repo_root: repoRoot, dirty: { status: 'clean' } },
    drift_classes: ['supervised_source_root_drift'],
    provenance: {},
    guidance: [],
    detail: 'Detected source/root drift: supervised_source_root_drift.'
  });
}

async function createCurrentAtAcquisitionOwnerThatBecomesStale() {
  const repoRoot = await createSourceRootRepo('provider-freshness-current-at-acquisition-stale-');
  const sourceRootFreshness = inspectSourceRootFreshness({
    intendedRepoRoot: repoRoot,
    packageRoot: repoRoot,
    argv: ['node', join(repoRoot, 'bin', 'codex-orchestrator.ts')],
    cwd: repoRoot,
    now: () => NOW
  });
  const residentHash = git(repoRoot, ['rev-parse', 'HEAD']).trim();
  await writeFile(join(repoRoot, 'co-556-main-advance.txt'), 'main advanced\n', 'utf8');
  git(repoRoot, ['add', '.']);
  git(repoRoot, ['commit', '-m', 'CO-556 main advance']);
  git(repoRoot, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  git(repoRoot, ['reset', '--hard', residentHash]);
  return createControlHostOwner(repoRoot, sourceRootFreshness);
}

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
    expect(report.findings.map((finding) => finding.code)).not.toContain('linear_budget_suppressed');
    expect(report.findings).toEqual([]);
  });

  it.each([
    ['stale-refresh', 'stale', 'stale_refresh'],
    ['stale-refresh-recent-intake-write', 'stale', 'stale_refresh'],
    ['stale-success-failed-completed', 'stale', 'stale_refresh'],
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

  it('does not let intake claim writes mask stale polling refresh evidence', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'stale-refresh-recent-intake-write'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('stale');
    expect(report.metrics.last_successful_refresh_age_ms).toMatchObject({
      value: 3_600_000,
      verdict: 'stale',
      source_field: 'last_success_at'
    });
    expect(report.findings.map((finding) => finding.code)).toContain('stale_refresh');
  });

  it('does not treat failed polling completion as successful refresh evidence', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'stale-success-failed-completed'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('stale');
    expect(report.metrics.last_successful_refresh_age_ms).toMatchObject({
      value: 3_600_000,
      verdict: 'stale',
      source_field: 'last_success_at'
    });
    expect(report.findings.map((finding) => finding.code)).toContain('stale_refresh');
  });

  it('does not render healthy when core refresh timestamps are missing', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'missing-refresh-timestamp'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('unknown');
    expect(report.strict_failed).toBe(false);
    expect(report.metrics.last_successful_refresh_age_ms).toMatchObject({
      value: null,
      verdict: 'unknown',
      source_field: 'last_success_at'
    });
    expect(report.findings.map((finding) => finding.code)).toContain('refresh_timestamp_missing');
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

  it('reads nested Linear budget state from combined status rate limits', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'healthy'),
      now: NOW
    });

    expect(report.verdict).toBe('healthy');
    expect(report.findings.map((finding) => finding.code)).not.toContain('linear_budget_suppressed');
    expect(report.findings.map((finding) => finding.code)).not.toContain('linear_headroom_low');
  });

  it('does not treat missing Linear budget suppression as active suppression', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'linear-budget-no-suppression'),
      now: NOW
    });

    expect(report.verdict).toBe('healthy');
    expect(report.findings.map((finding) => finding.code)).not.toContain('linear_budget_suppressed');
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

  it('does not let worker audit evidence alone render core freshness healthy', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'worker-audit-only'),
      now: NOW,
      strict: true
    });

    expect(report.sources.worker_audit_jsonl).toHaveLength(1);
    expect(report.verdict).toBe('unknown');
    expect(report.strict_failed).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toContain('missing_core_freshness_artifacts');
  });

  it('does not treat provider manifests alone as core freshness evidence', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'manifest-only'),
      now: NOW,
      strict: true
    });

    expect(report.sources.provider_manifests).toHaveLength(1);
    expect(report.verdict).toBe('unknown');
    expect(report.strict_failed).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toContain('missing_core_freshness_artifacts');
  });

  it('selects timestamp-less artifacts deterministically by path tie-break', async () => {
    const fixtureRoot = join(FIXTURE_ROOT, 'timestampless-tie');
    const stalePath = join(fixtureRoot, 'a-status-dataset.json');
    const healthyPath = join(fixtureRoot, 'z-status-dataset.json');

    const forward = await evaluateProviderControlHostFreshnessGauge({
      paths: { status_datasets: [stalePath, healthyPath] },
      now: NOW,
      strict: true
    });
    const reverse = await evaluateProviderControlHostFreshnessGauge({
      paths: { status_datasets: [healthyPath, stalePath] },
      now: NOW,
      strict: true
    });

    expect(forward.verdict).toBe('healthy');
    expect(reverse.verdict).toBe('healthy');
    expect(forward.metrics.last_successful_refresh_age_ms.source_path).toBe(healthyPath);
    expect(reverse.metrics.last_successful_refresh_age_ms.source_path).toBe(healthyPath);
  });

  it('orders standalone polling health artifacts by polling timestamps', async () => {
    const fixtureRoot = join(FIXTURE_ROOT, 'polling-health-freshness-order');
    const currentPath = join(fixtureRoot, 'a-current/provider-polling-health.json');
    const stalePath = join(fixtureRoot, 'z-stale/provider-polling-health.json');

    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: { polling_health: [stalePath, currentPath] },
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('healthy');
    expect(report.metrics.last_successful_refresh_age_ms).toMatchObject({
      value: 30_000,
      verdict: 'healthy',
      source_path: currentPath,
      source_field: 'last_success_at'
    });
    expect(report.findings.map((finding) => finding.code)).not.toContain('stale_refresh');
  });

  it('selects duplicate run-id manifests deterministically by freshness', async () => {
    const fixtureRoot = join(FIXTURE_ROOT, 'duplicate-run-id-manifests');
    const intakePath = join(fixtureRoot, 'provider-intake-state.json');
    const proofPath = join(fixtureRoot, 'proofs/provider-linear-worker-proof.json');
    const oldManifestPath = join(fixtureRoot, 'manifests/a-old/manifest.json');
    const currentManifestPath = join(fixtureRoot, 'manifests/z-current/manifest.json');

    const forward = await evaluateProviderControlHostFreshnessGauge({
      paths: {
        provider_intake_state: [intakePath],
        provider_manifests: [oldManifestPath, currentManifestPath],
        provider_proofs: [proofPath]
      },
      now: NOW,
      strict: true
    });
    const reverse = await evaluateProviderControlHostFreshnessGauge({
      paths: {
        provider_intake_state: [intakePath],
        provider_manifests: [currentManifestPath, oldManifestPath],
        provider_proofs: [proofPath]
      },
      now: NOW,
      strict: true
    });

    expect(forward.verdict).toBe('healthy');
    expect(reverse.verdict).toBe('healthy');
    expect(forward.metrics.claim_to_start_latency_ms).toMatchObject({
      value: 20_000,
      verdict: 'healthy',
      source_path: currentManifestPath
    });
    expect(reverse.metrics.claim_to_start_latency_ms).toMatchObject({
      value: 20_000,
      verdict: 'healthy',
      source_path: currentManifestPath
    });
    expect(forward.findings.map((finding) => finding.code)).not.toContain('active_worker_proof_missing');
    expect(reverse.findings.map((finding) => finding.code)).not.toContain('active_worker_proof_missing');
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

  it('uses the resumed worker attempt as the heartbeat latency baseline', async () => {
    const fixtureRoot = join(FIXTURE_ROOT, 'resumed-attempt-heartbeat-latency');
    const healthyRoot = join(FIXTURE_ROOT, 'healthy');
    const report = await evaluateProviderControlHostFreshnessGauge({
      now: NOW,
      paths: {
        provider_intake_state: [join(healthyRoot, 'control-host/provider-intake-state.json')],
        polling_health: [join(healthyRoot, 'control-host/provider-polling-health.json')],
        provider_manifests: [join(fixtureRoot, 'run/manifest.json')],
        provider_proofs: [join(fixtureRoot, 'run/provider-linear-worker-proof.json')]
      }
    });

    expect(report.verdict).toBe('healthy');
    expect(report.metrics.start_to_first_heartbeat_latency_ms.value).toBe(10_000);
    expect(report.findings.map((finding) => finding.code)).not.toContain('start_to_first_heartbeat_latency_degraded');
  });

  it('uses explicit first-heartbeat evidence instead of latest activity for start latency', async () => {
    const fixtureRoot = join(FIXTURE_ROOT, 'latest-activity-not-first-heartbeat');
    const healthyRoot = join(FIXTURE_ROOT, 'healthy');
    const report = await evaluateProviderControlHostFreshnessGauge({
      now: NOW,
      paths: {
        provider_intake_state: [join(healthyRoot, 'control-host/provider-intake-state.json')],
        polling_health: [join(healthyRoot, 'control-host/provider-polling-health.json')],
        provider_manifests: [join(healthyRoot, 'runs/worker/manifest.json')],
        provider_proofs: [join(fixtureRoot, 'run/provider-linear-worker-proof.json')]
      }
    });

    expect(report.verdict).toBe('healthy');
    expect(report.metrics.start_to_first_heartbeat_latency_ms).toMatchObject({
      value: 10_000,
      verdict: 'healthy',
      source_field: 'first_heartbeat_at'
    });
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

  it('excludes recoverable stale in-flight child lanes from cap pressure', async () => {
    const fixtureRoot = join(FIXTURE_ROOT, 'stale-in-flight-child-lane');
    const healthyRoot = join(FIXTURE_ROOT, 'healthy');
    const report = await evaluateProviderControlHostFreshnessGauge({
      now: NOW,
      paths: {
        provider_intake_state: [join(healthyRoot, 'control-host/provider-intake-state.json')],
        polling_health: [join(healthyRoot, 'control-host/provider-polling-health.json')],
        provider_manifests: [join(healthyRoot, 'runs/worker/manifest.json')],
        provider_proofs: [join(fixtureRoot, 'run/provider-linear-worker-proof.json')]
      }
    });

    expect(report.verdict).toBe('healthy');
    expect(report.metrics.child_lane_cap_pressure.value).toBe(0);
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

  it('keeps retry claims out of active queue and terminal proof contradiction checks', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'retry-claim-terminal-proof'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('healthy');
    expect(report.strict_failed).toBe(false);
    expect(report.metrics.claim_queue_age_ms.value).toBeNull();
    expect(report.metrics.retry_backoff_age_ms).toMatchObject({
      value: 0,
      verdict: 'healthy'
    });
    expect(report.findings.map((finding) => finding.code)).not.toContain('claim_queue_stale');
    expect(report.findings.map((finding) => finding.code)).not.toContain('terminal_proof_with_active_claim');
  });

  it('ignores retained terminal Linear retry metadata in freshness-gauge retry age', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-freshness-terminal-retry-'));
    cleanupRoots.push(root);
    const intakePath = join(root, 'provider-intake-state.json');
    await writeFile(
      intakePath,
      JSON.stringify(
        {
          schema_version: 1,
          updated_at: '2026-04-14T05:59:30.000Z',
          polling: {
            last_success_at: '2026-04-14T05:59:30.000Z',
            stuck: false,
            restart_required: false
          },
          claims: [
            {
              provider: 'linear',
              provider_key: 'linear:terminal-retry',
              issue_id: 'terminal-retry',
              issue_identifier: 'CO-512',
              issue_title: 'Governed review contract for spec standards code and agent loop',
              issue_state: 'Done',
              issue_state_type: 'completed',
              task_id: 'linear-terminal-retry',
              mapping_source: 'provider_id_fallback',
              state: 'resumable',
              reason: 'provider_issue_rehydrated_resumable_run',
              accepted_at: '2026-04-14T05:20:00.000Z',
              updated_at: '2026-04-14T05:59:30.000Z',
              run_id: 'run-terminal-retry',
              retry_queued: true,
              retry_attempt: 1,
              retry_due_at: '2026-04-14T05:30:00.000Z',
              retry_error: 'retained terminal audit retry evidence'
            }
          ]
        },
        null,
        2
      )
    );

    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: { provider_intake_state: [intakePath] },
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('healthy');
    expect(report.strict_failed).toBe(false);
    expect(report.metrics.retry_backoff_age_ms).toMatchObject({
      value: null,
      verdict: 'unknown',
      source_path: null,
      reason: 'no retry/backoff evidence observed'
    });
    expect(report.findings.map((finding) => finding.code)).not.toContain('retry_queue_stale');
    expect(report.findings.map((finding) => finding.code)).not.toContain('claim_queue_stale');
  });

  it('fails strict audit when stale supervised source still has active provider-intake claims', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-freshness-stale-source-claims-'));
    cleanupRoots.push(root);
    const intakePath = join(root, 'provider-intake-state.json');
    await writeFile(
      intakePath,
      JSON.stringify({
        schema_version: 1,
        updated_at: NOW,
        polling: {
          control_host_owner: createStaleSupervisedControlHostOwner()
        },
        claims: [
          {
            state: 'resumable',
            retry_queued: true,
            issue_state: 'In Progress',
            issue_state_type: 'started'
          }
        ]
      })
    );

    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: { provider_intake_state: [intakePath] },
      now: NOW,
      strict: true
    });

    expect(report.strict_failed).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'stale_supervised_source_active_claims',
          verdict: 'stale'
        })
      ])
    );
  });

  it('fails strict audit when selected polling health has stale supervised source with active provider-intake claims', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-freshness-stale-polling-health-claims-'));
    cleanupRoots.push(root);
    const intakePath = join(root, 'provider-intake-state.json');
    const pollingHealthPath = join(root, 'provider-polling-health.json');
    await writeFile(
      intakePath,
      JSON.stringify({
        schema_version: 1,
        updated_at: NOW,
        claims: [
          {
            state: 'resumable',
            retry_queued: true,
            issue_state: 'In Progress',
            issue_state_type: 'started'
          }
        ]
      })
    );
    await writeFile(
      pollingHealthPath,
      JSON.stringify({
        schema_version: 1,
        updated_at: NOW,
        control_host_owner: createStaleSupervisedControlHostOwner()
      })
    );

    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: {
        provider_intake_state: [intakePath],
        polling_health: [pollingHealthPath]
      },
      now: NOW,
      strict: true
    });

    expect(report.strict_failed).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'stale_supervised_source_active_claims',
          verdict: 'stale',
          source_path: pollingHealthPath,
          source_field: 'control_host_owner.owner.source_root_freshness'
        })
      ])
    );
  });

  it('fails strict audit when a status dataset has stale supervised source with active WIP', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-freshness-stale-status-dataset-wip-'));
    cleanupRoots.push(root);
    const statusDatasetPath = join(root, 'co-status-dataset.json');
    await writeFile(
      statusDatasetPath,
      JSON.stringify({
        generated_at: NOW,
        polling: {
          control_host_owner: createStaleSupervisedControlHostOwner()
        },
        counts: {
          running: 0,
          retrying: 3
        },
        running: [],
        retrying: [
          { issue_identifier: 'CO-512' },
          { issue_identifier: 'CO-554' },
          { issue_identifier: 'CO-555' }
        ],
        provider_intake: {
          active_claim_count: 3,
          running_claim_count: 0
        }
      })
    );

    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: { status_datasets: [statusDatasetPath] },
      now: NOW,
      strict: true
    });

    expect(report.strict_failed).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'stale_supervised_source_active_claims',
          verdict: 'stale',
          source_path: statusDatasetPath,
          source_field: 'polling.control_host_owner.owner.source_root_freshness'
        })
      ])
    );
  });

  it('refreshes owner freshness before auditing stale supervised source active claims', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-freshness-stale-after-acquisition-claims-'));
    cleanupRoots.push(root);
    const intakePath = join(root, 'provider-intake-state.json');
    await writeFile(
      intakePath,
      JSON.stringify({
        schema_version: 1,
        updated_at: NOW,
        polling: {
          control_host_owner: await createCurrentAtAcquisitionOwnerThatBecomesStale()
        },
        claims: [
          {
            state: 'resumable',
            retry_queued: true,
            issue_state: 'In Progress',
            issue_state_type: 'started'
          }
        ]
      })
    );

    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: { provider_intake_state: [intakePath] },
      now: NOW,
      strict: true
    });

    expect(report.strict_failed).toBe(true);
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'stale_supervised_source_active_claims',
          verdict: 'stale'
        })
      ])
    );
  });

  it('flags running intake claims that have no matching active worker proof', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'missing-active-worker-proof'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('unknown');
    expect(report.strict_failed).toBe(false);
    expect(report.metrics.active_heartbeat_age_ms).toMatchObject({
      value: null,
      verdict: 'unknown',
      source_field: 'claims[].run_id'
    });
    expect(report.findings.map((finding) => finding.code)).toContain('active_worker_proof_missing');
  });

  it('does not require active worker proof for cached pending-revalidation claims without a run', async () => {
    const root = await mkdtemp(join(tmpdir(), 'provider-freshness-pending-revalidation-'));
    cleanupRoots.push(root);
    const intakePath = join(root, 'provider-intake-state.json');
    await writeFile(
      intakePath,
      JSON.stringify({
        schema_version: 1,
        updated_at: NOW,
        rehydrated_at: NOW,
        polling: {
          last_success_at: NOW
        },
        claims: [
          {
            provider: 'linear',
            provider_key: 'linear:lin-issue-510',
            issue_id: 'lin-issue-510',
            issue_identifier: 'CO-510',
            issue_title: 'Recognize clean review wording',
            issue_state: 'In Progress',
            issue_state_type: 'started',
            issue_updated_at: '2026-05-14T12:00:00.000Z',
            task_id: 'linear-lin-issue-510',
            mapping_source: 'provider_id_fallback',
            state: 'accepted',
            reason: 'provider_issue_rehydration_pending_revalidation',
            accepted_at: NOW,
            updated_at: NOW,
            run_id: null,
            run_manifest_path: null,
            launch_source: null,
            launch_token: null
          }
        ]
      })
    );

    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: {
        provider_intake_state: [intakePath]
      },
      now: NOW,
      strict: true
    });

    expect(report.sources.provider_intake_state).toEqual([intakePath]);
    expect(report.metrics.active_heartbeat_age_ms).toMatchObject({
      value: null,
      verdict: 'unknown',
      source_field: null,
      reason: 'no active provider proof observed'
    });
    expect(report.findings.map((finding) => finding.code)).not.toContain('active_worker_proof_missing');
  });

  it('follows claim run_manifest_path evidence outside the control-host artifact root', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: join(FIXTURE_ROOT, 'claim-linked-external-run/control-host'),
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('healthy');
    expect(report.sources.provider_intake_state).toHaveLength(1);
    expect(report.sources.provider_manifests).toEqual([
      join(FIXTURE_ROOT, 'claim-linked-external-run/run/manifest.json')
    ]);
    expect(report.sources.provider_proofs).toEqual([
      join(FIXTURE_ROOT, 'claim-linked-external-run/run/provider-linear-worker-proof.json')
    ]);
    expect(report.metrics.active_heartbeat_age_ms).toMatchObject({
      value: 15_000,
      verdict: 'healthy',
      source_field: 'updated_at'
    });
    expect(report.findings.map((finding) => finding.code)).not.toContain('active_worker_proof_missing');
  });

  it('resolves repo-relative claim run_manifest_path evidence from a .runs intake without using cwd', async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), 'provider-freshness-repo-'));
    cleanupRoots.push(repoRoot);
    const controlHostRoot = join(repoRoot, '.runs/local-mcp/cli/control-host');
    const runRoot = join(repoRoot, 'out/linear-claim-linked-proof/cli/run-claim-linked-proof');
    await mkdir(controlHostRoot, { recursive: true });
    await mkdir(runRoot, { recursive: true });
    await writeFile(
      join(controlHostRoot, 'provider-intake-state.json'),
      JSON.stringify({
        schema_version: 1,
        updated_at: '2026-04-14T05:59:30.000Z',
        polling: {
          last_success_at: '2026-04-14T05:59:30.000Z',
          stuck: false,
          restart_required: false
        },
        claims: [
          {
            provider: 'linear',
            provider_key: 'linear:claim-linked-proof',
            issue_id: 'claim-linked-proof',
            issue_identifier: 'CO-CLAIM-LINKED-PROOF',
            issue_title: 'Running claim with repo-relative manifest proof',
            issue_state: 'In Progress',
            issue_state_type: 'started',
            task_id: 'linear-claim-linked-proof',
            mapping_source: 'provider_id_fallback',
            state: 'running',
            accepted_at: '2026-04-14T05:57:00.000Z',
            updated_at: '2026-04-14T05:59:30.000Z',
            run_id: 'run-claim-linked-proof',
            run_manifest_path: 'out/linear-claim-linked-proof/cli/run-claim-linked-proof/manifest.json',
            launch_started_at: '2026-04-14T05:57:10.000Z'
          }
        ]
      }),
      'utf8'
    );
    await writeFile(
      join(runRoot, 'manifest.json'),
      JSON.stringify({
        run_id: 'run-claim-linked-proof',
        status: 'running',
        started_at: '2026-04-14T05:57:10.000Z',
        heartbeat_at: '2026-04-14T05:59:45.000Z',
        updated_at: '2026-04-14T05:59:45.000Z'
      }),
      'utf8'
    );
    await writeFile(
      join(runRoot, 'provider-linear-worker-proof.json'),
      JSON.stringify({
        run_id: 'run-claim-linked-proof',
        attempt_started_at: '2026-04-14T05:57:10.000Z',
        first_heartbeat_at: '2026-04-14T05:57:40.000Z',
        current_turn_activity: {
          recorded_at: '2026-04-14T05:59:45.000Z'
        },
        owner_phase: 'turn_running',
        owner_status: 'in_progress',
        child_lanes: [],
        updated_at: '2026-04-14T05:59:45.000Z'
      }),
      'utf8'
    );

    const report = await evaluateProviderControlHostFreshnessGauge({
      artifactRoot: controlHostRoot,
      now: NOW,
      strict: true
    });

    expect(report.verdict).toBe('healthy');
    expect(report.sources.provider_manifests).toEqual([
      join(runRoot, 'manifest.json')
    ]);
    expect(report.sources.provider_proofs).toEqual([
      join(runRoot, 'provider-linear-worker-proof.json')
    ]);
    expect(report.findings.map((finding) => finding.code)).not.toContain('active_worker_proof_missing');
  });

  it('ignores claim-linked run artifacts from stale intake snapshots', async () => {
    const report = await evaluateProviderControlHostFreshnessGauge({
      paths: {
        provider_intake_state: [
          join(FIXTURE_ROOT, 'claim-linked-external-run/control-host/provider-intake-state.json'),
          join(FIXTURE_ROOT, 'claim-linked-external-run/current-provider-intake-state.json')
        ]
      },
      now: NOW,
      strict: true
    });

    expect(report.sources.provider_intake_state).toHaveLength(2);
    expect(report.sources.provider_manifests).toEqual([]);
    expect(report.sources.provider_proofs).toEqual([]);
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

  it('rejects file paths passed as artifact roots', async () => {
    await expect(runControlHostFreshnessGaugeCliShell({
      flags: {
        'artifact-root': join(FIXTURE_ROOT, 'healthy/runs/worker/manifest.json'),
        format: 'json',
        now: NOW
      },
      printHelp: vi.fn()
    })).rejects.toThrow(/must be a directory/);
  });

  it('rejects unknown CLI output formats', async () => {
    await expect(runControlHostFreshnessGaugeCliShell({
      flags: {
        'artifact-root': join(FIXTURE_ROOT, 'healthy'),
        format: 'jsno',
        now: NOW
      },
      printHelp: vi.fn()
    })).rejects.toThrow(/Invalid --format: expected text\|json/);
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
