import { describe, expect, it } from 'vitest';

import {
  PARALLELIZATION_AUDIT_BASELINE,
  buildProviderLinearParallelizationCanaryReport,
  buildProviderLinearParallelizationCanaryScenarios,
  validateProviderLinearParallelizationCanaryReport
} from '../scripts/provider-linear-parallelization-canary.mjs';

describe('provider-linear parallelization canary', () => {
  it('proves higher safe parallelize_now adoption without metric-only child lanes', () => {
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174'
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: true,
      failures: []
    });
    expect(report.baseline.total_decisions).toBe(PARALLELIZATION_AUDIT_BASELINE.total_decisions);
    expect(report.baseline.decisions.parallelize_now).toBe(5);
    expect(report.summary.decision_counts.parallelize_now).toBeGreaterThan(0);
    expect(report.summary.canary_parallelize_now_rate).toBeGreaterThan(
      report.baseline.parallelize_now_rate
    );
    expect(report.summary.adoption_increased).toBe(true);
    expect(report.summary.metric_only_child_lane_count).toBe(0);
    expect(report.summary.launched_child_lane_outcomes).toMatchObject({
      accepted: 3,
      rejected: 1,
      invalidated: 1
    });
    expect(report.child_lane_cap).toMatchObject({
      value: 2,
      counts: ['active', 'pending', 'unaccepted'],
      preserves: 'CO-125 provider admission constraints'
    });
  });

  it('fails a malformed canary that serializes while a safe child lane remains', () => {
    const badSerial = {
      ...buildProviderLinearParallelizationCanaryScenarios()[0],
      id: 'bad-serial',
      decision: 'stay_serial',
      reason: 'single_bounded_change',
      launched_child_lanes: [],
      serial_evidence: {
        summary: 'bad serial choice',
        separable_slices_considered: ['docs', 'test', 'research', 'review'],
        safe_independent_candidates: 1
      }
    };
    delete badSerial.launched_child_lanes;
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-malformed',
      scenarios: [badSerial]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report).ok).toBe(false);
    expect(report.summary.failures).toEqual(
      expect.arrayContaining([
        'bad-serial: launched_child_lanes is missing or invalid',
        'bad-serial: single_bounded_change summary missing labeled slice evidence for docs, test, research, review',
        'bad-serial: stay_serial chosen while safe independent candidates remain',
        'canary parallelize_now rate did not exceed the audit baseline'
      ])
    );
  });

  it('recomputes validation instead of trusting a tampered summary', () => {
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174'
    });

    report.summary.decision_counts.parallelize_now = 0;
    report.summary.total_scenarios = 999;
    report.summary.adoption_increased = false;
    report.summary.launched_child_lane_count = 0;
    report.summary.launched_child_lane_outcomes.accepted = 0;
    report.summary.failures = ['tampered failure'];

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'report summary failures do not match recomputed validation',
        'report summary decision counts do not match recomputed validation',
        'report summary total scenarios does not match recomputed validation',
        'report summary adoption flag does not match recomputed validation',
        'report summary launched child lane count does not match recomputed validation',
        'report summary launched child lane outcomes do not match recomputed validation'
      ])
    });
  });

  it('returns validation failures for malformed matrix entries instead of throwing', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[0];
    scenario.id = 'bad-matrix-entry';
    scenario.matrix = [null];
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-bad-matrix-entry',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-matrix-entry: matrix candidate 0 is missing or invalid',
        'bad-matrix-entry: parallelize_now without a safe independent candidate'
      ])
    });
  });

  it('returns validation failures for malformed launched-lane entries instead of throwing', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[0];
    scenario.id = 'bad-launched-entry';
    scenario.launched_child_lanes = [null];
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-bad-launched-entry',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-launched-entry: child lane 0 is missing or invalid',
        'bad-launched-entry: parallelize_now without an accepted child lane outcome'
      ])
    });
  });

  it('rejects tampered baseline and cap metadata', () => {
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174'
    });

    report.baseline.total_decisions = 1;
    report.baseline.parallelize_now_rate = 1;
    report.child_lane_cap.counts = ['active'];
    report.child_lane_cap.preserves = 'tampered';

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'report baseline does not match recomputed validation',
        'report child-lane cap metadata does not match recomputed validation'
      ])
    });
  });

  it('rejects malformed cap overruns even when a candidate marks the cap exhausted', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[0];
    scenario.id = 'bad-cap-overrun';
    scenario.matrix[0].cap_slot_use.after = scenario.matrix[0].cap_slot_use.cap + 1;
    scenario.matrix[0].cap_slot_use.exhausted = true;
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-bad-cap',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-cap-overrun: cap overrun for docs-contract exceeds cap 2'
      ])
    });
  });

  it('rejects parallelize_now canary scenarios without an accepted child lane', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[0];
    scenario.id = 'bad-parallelize-no-accepted';
    scenario.launched_child_lanes = [
      {
        stream: 'docs-contract',
        outcome: 'rejected',
        reason: 'Parent rejected the output.'
      },
      {
        stream: 'prompt-test',
        outcome: 'invalidated',
        reason: 'Parent invalidated stale output.'
      }
    ];
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-no-accepted',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-parallelize-no-accepted: parallelize_now without an accepted child lane outcome'
      ])
    });
  });

  it('rejects reason codes that do not match the selected decision', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[0];
    scenario.id = 'bad-reason-pair';
    scenario.reason = 'merge_or_handoff_state';
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-bad-reason',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-reason-pair: reason merge_or_handoff_state is invalid for decision parallelize_now'
      ])
    });
  });

  it('rejects existing_child_lane_active scenarios without cap_exhausted summary evidence', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[3];
    scenario.id = 'bad-cap-exhausted-evidence';
    scenario.serial_evidence.summary = 'Two active lanes remain unresolved.';
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-bad-cap-evidence',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-cap-exhausted-evidence: existing_child_lane_active summary missing labeled cap_exhausted evidence'
      ])
    });
  });

  it('rejects launched child lanes that do not match a safe matrix candidate', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[0];
    scenario.id = 'bad-metric-only-stream';
    scenario.launched_child_lanes = [
      {
        stream: 'unrelated-metric-lane',
        outcome: 'accepted',
        reason: 'Forged launch that does not match the matrix.'
      }
    ];
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-metric-only-stream',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-metric-only-stream: child lane unrelated-metric-lane lacks a matching safe independent matrix candidate',
        'canary launched child lanes without safe independent matrix candidates'
      ])
    });
    expect(report.summary.metric_only_child_lane_count).toBe(1);
    expect(report.summary.metric_only_child_lanes[0]).toMatchObject({
      scenario_id: 'bad-metric-only-stream',
      stream: 'unrelated-metric-lane',
      reason: 'launched without a matching safe independent matrix candidate'
    });
  });

  it('rejects existing_child_lane_active scenarios without exhausted matrix cap evidence', () => {
    const scenario = buildProviderLinearParallelizationCanaryScenarios()[3];
    scenario.id = 'bad-cap-exhausted-matrix';
    scenario.matrix[0].cap_slot_use.before = 1;
    scenario.matrix[0].cap_slot_use.after = 1;
    scenario.matrix[0].cap_slot_use.exhausted = false;
    const report = buildProviderLinearParallelizationCanaryReport({
      generatedAt: '2026-04-14T00:00:00.000Z',
      taskId: 'linear-co-174-bad-cap-matrix',
      scenarios: [scenario]
    });

    expect(validateProviderLinearParallelizationCanaryReport(report)).toEqual({
      ok: false,
      failures: expect.arrayContaining([
        'bad-cap-exhausted-matrix: existing_child_lane_active without exhausted cap-slot matrix evidence'
      ])
    });
  });
});
