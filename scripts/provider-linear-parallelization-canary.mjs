#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path, { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const PARALLELIZATION_AUDIT_BASELINE = Object.freeze({
  total_decisions: 235,
  decisions: Object.freeze({
    parallelize_now: 5,
    stay_serial: 161,
    forbid_parallel: 69
  })
});

export const PARALLEL_FIRST_CHILD_LANE_CAP = 2;

const OUTCOME_VALUES = new Set(['accepted', 'rejected', 'invalidated']);
const DECISION_VALUES = new Set(['parallelize_now', 'stay_serial', 'forbid_parallel']);
const REASONS_BY_DECISION = Object.freeze({
  parallelize_now: new Set(['independent_scope_available']),
  stay_serial: new Set([
    'single_bounded_change',
    'overlapping_scope',
    'existing_child_lane_active',
    'review_or_validation_only'
  ]),
  forbid_parallel: new Set(['parent_only_mutation', 'merge_or_handoff_state', 'blocked_by_dependency'])
});

function rate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : 0;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw?.startsWith('-')) {
      continue;
    }
    const cleaned = raw.replace(/^--?/, '');
    const equalsIndex = cleaned.indexOf('=');
    if (equalsIndex !== -1) {
      const key = cleaned.slice(0, equalsIndex);
      args[key] = cleaned.slice(equalsIndex + 1);
      continue;
    }
    const key = cleaned;
    const next = argv[index + 1];
    if (next && !next.startsWith('-')) {
      args[key] = next;
      index += 1;
      continue;
    }
    args[key] = true;
  }
  return args;
}

function buildCandidate(input) {
  return {
    lane: input.lane,
    file_phase_scope: input.file_phase_scope,
    dependencies: input.dependencies,
    overlap_risk: input.overlap_risk,
    expected_validation_artifact: input.expected_validation_artifact,
    child_lane_owner: input.child_lane_owner,
    cap_slot_use: {
      before: input.cap_before,
      use: input.cap_use,
      after: input.cap_before + input.cap_use,
      cap: PARALLEL_FIRST_CHILD_LANE_CAP,
      exhausted: input.cap_before >= PARALLEL_FIRST_CHILD_LANE_CAP
    },
    safe_independent: input.safe_independent,
    safety_rationale: input.safety_rationale
  };
}

export function buildProviderLinearParallelizationCanaryScenarios() {
  return [
    {
      id: 'docs-tests-split',
      selected_for: 'Plausible docs plus focused test slice can run while parent owns integration.',
      issue_shape: 'provider-worker policy update with docs and tests',
      matrix: [
        buildCandidate({
          lane: 'docs-contract',
          file_phase_scope: ['skills/linear/SKILL.md', 'bin/codex-orchestrator.ts help text'],
          dependencies: 'No dependency on parent implementation internals.',
          overlap_risk: 'low',
          expected_validation_artifact: 'linear help and docs-discoverability assertion',
          child_lane_owner: 'child:docs-contract',
          cap_before: 0,
          cap_use: 1,
          safe_independent: true,
          safety_rationale: 'Docs/help slice is separable from parent runtime edits.'
        }),
        buildCandidate({
          lane: 'prompt-test',
          file_phase_scope: ['orchestrator/tests/ProviderLinearWorkerRunner.test.ts'],
          dependencies: 'Uses protected prompt strings from the issue.',
          overlap_risk: 'low',
          expected_validation_artifact: 'provider prompt regression test',
          child_lane_owner: 'child:prompt-test',
          cap_before: 1,
          cap_use: 1,
          safe_independent: true,
          safety_rationale: 'Prompt assertion work can proceed without touching runtime cap code.'
        })
      ],
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      launched_child_lanes: [
        {
          stream: 'docs-contract',
          outcome: 'accepted',
          reason: 'Parent accepted the bounded docs/help result after focused validation.'
        }
      ],
      serial_evidence: null
    },
    {
      id: 'implementation-validation-split',
      selected_for: 'Runtime cap enforcement and separate validation can be owned by different lanes.',
      issue_shape: 'child-lane launch guard plus test additions',
      matrix: [
        buildCandidate({
          lane: 'cap-runtime',
          file_phase_scope: ['orchestrator/src/cli/providerLinearChildLaneShell.ts'],
          dependencies: 'Depends only on existing child-lane ledger status vocabulary.',
          overlap_risk: 'medium: runtime edit must not collide with prompt text changes',
          expected_validation_artifact: 'cap exhaustion unit test',
          child_lane_owner: 'child:cap-runtime',
          cap_before: 0,
          cap_use: 1,
          safe_independent: true,
          safety_rationale: 'Runtime cap guard is isolated from canary report generation.'
        }),
        buildCandidate({
          lane: 'cap-validation',
          file_phase_scope: ['orchestrator/tests/ProviderLinearChildLaneShell.test.ts'],
          dependencies: 'Depends on the cap-runtime contract but owns only focused validation.',
          overlap_risk: 'low',
          expected_validation_artifact: 'accepted cap accounting regression test',
          child_lane_owner: 'child:cap-validation',
          cap_before: 1,
          cap_use: 1,
          safe_independent: true,
          safety_rationale: 'Validation can be accepted independently from a rejected runtime patch.'
        })
      ],
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      launched_child_lanes: [
        {
          stream: 'cap-runtime',
          outcome: 'rejected',
          reason: 'Parent rejected the patch because it exceeded the declared file scope, not for metric counting.'
        },
        {
          stream: 'cap-validation',
          outcome: 'accepted',
          reason: 'Parent accepted the bounded validation artifact after reconciling it with the parent-owned runtime patch.'
        }
      ],
      serial_evidence: null
    },
    {
      id: 'research-review-split',
      selected_for: 'Read-only inventory/review work can run before parent implementation acceptance.',
      issue_shape: 'surface inventory for policy, cap, parent ownership, and canary tests',
      matrix: [
        buildCandidate({
          lane: 'surface-inventory',
          file_phase_scope: ['research phase', 'tests phase'],
          dependencies: 'Read-only inventory depends on current workspace snapshot.',
          overlap_risk: 'low until parent docs mutate the issue timestamp',
          expected_validation_artifact: 'child-lane proof bundle and patch artifact',
          child_lane_owner: 'child:surface-inventory',
          cap_before: 0,
          cap_use: 1,
          safe_independent: true,
          safety_rationale: 'Research/review lane is independent from parent Linear mutation.'
        }),
        buildCandidate({
          lane: 'policy-review',
          file_phase_scope: ['review phase', 'docs/review notes'],
          dependencies: 'Reads current policy surfaces after surface inventory completes.',
          overlap_risk: 'low',
          expected_validation_artifact: 'accepted policy-review notes',
          child_lane_owner: 'child:policy-review',
          cap_before: 1,
          cap_use: 1,
          safe_independent: true,
          safety_rationale: 'Review notes are independently accept-ready even if another inventory lane becomes stale.'
        })
      ],
      decision: 'parallelize_now',
      reason: 'independent_scope_available',
      launched_child_lanes: [
        {
          stream: 'surface-inventory',
          outcome: 'invalidated',
          reason: 'Parent invalidated stale child output after the issue updated_at changed.'
        },
        {
          stream: 'policy-review',
          outcome: 'accepted',
          reason: 'Parent accepted the review artifact because it stayed within declared read-only scope.'
        }
      ],
      serial_evidence: null
    },
    {
      id: 'cap-exhausted',
      selected_for: 'A plausible independent slice exists but no safe cap slot remains.',
      issue_shape: 'two unresolved same-issue child lanes are already active, pending, or unaccepted',
      matrix: [
        buildCandidate({
          lane: 'third-independent-slice',
          file_phase_scope: ['orchestrator/tests/LinearCliShell.test.ts'],
          dependencies: 'No code dependency, but blocked by cap.',
          overlap_risk: 'low',
          expected_validation_artifact: 'focused CLI helper test',
          child_lane_owner: 'child:third-independent-slice',
          cap_before: 2,
          cap_use: 0,
          safe_independent: false,
          safety_rationale: 'Candidate is independently scoped but unsafe to launch because cap_exhausted.'
        })
      ],
      decision: 'stay_serial',
      reason: 'existing_child_lane_active',
      launched_child_lanes: [],
      serial_evidence: {
        summary: 'cap_exhausted: 2/2 active, pending, or unaccepted same-issue child lanes.',
        separable_slices_considered: ['docs', 'test', 'research', 'review'],
        safe_independent_candidates: 0
      }
    },
    {
      id: 'single-bounded-change',
      selected_for: 'Tiny parent-owned mutation with no separable supporting slice.',
      issue_shape: 'one-line metadata-only helper text correction',
      matrix: [
        buildCandidate({
          lane: 'none',
          file_phase_scope: ['single parent-owned text line'],
          dependencies: 'All validation is the same focused command.',
          overlap_risk: 'high: a child lane would touch the same line as parent',
          expected_validation_artifact: 'same parent command output',
          child_lane_owner: 'parent',
          cap_before: 0,
          cap_use: 0,
          safe_independent: false,
          safety_rationale: 'No docs, test, research, or review slice can split safely.'
        })
      ],
      decision: 'stay_serial',
      reason: 'single_bounded_change',
      launched_child_lanes: [],
      serial_evidence: {
        summary: 'docs: no docs-only slice separates safely; test: no test-only slice separates safely; research: no research-only slice separates safely; review: no review-only slice separates safely.',
        separable_slices_considered: ['docs', 'test', 'research', 'review'],
        safe_independent_candidates: 0
      }
    },
    {
      id: 'merge-handoff-state',
      selected_for: 'Review or merge shepherding must stay parent-owned.',
      issue_shape: 'PR handoff, review drain, or merge state',
      matrix: [
        buildCandidate({
          lane: 'none',
          file_phase_scope: ['Linear state mutation', 'PR merge shepherding'],
          dependencies: 'Requires parent authority and latest PR/check state.',
          overlap_risk: 'unsafe parent-only mutation',
          expected_validation_artifact: 'review drain or merge status',
          child_lane_owner: 'parent',
          cap_before: 0,
          cap_use: 0,
          safe_independent: false,
          safety_rationale: 'forbid_parallel remains truthful for merge/handoff state.'
        })
      ],
      decision: 'forbid_parallel',
      reason: 'merge_or_handoff_state',
      launched_child_lanes: [],
      serial_evidence: {
        summary: 'Merge/handoff state is parent-owned and child_lanes remain empty.',
        separable_slices_considered: ['review'],
        safe_independent_candidates: 0
      }
    }
  ];
}

function countDecisions(scenarios) {
  const counts = {
    parallelize_now: 0,
    stay_serial: 0,
    forbid_parallel: 0
  };
  for (const scenario of scenarios) {
    if (DECISION_VALUES.has(scenario.decision)) {
      counts[scenario.decision] += 1;
    }
  }
  return counts;
}

function findSafeIndependentCandidates(scenario) {
  return Array.isArray(scenario?.matrix)
    ? scenario.matrix.filter((candidate) => candidate.safe_independent === true)
    : [];
}

function validateScenario(scenario) {
  const failures = [];
  const id = scenario?.id ?? 'unknown-scenario';
  const matrix = Array.isArray(scenario?.matrix) ? scenario.matrix : [];
  const launched = Array.isArray(scenario?.launched_child_lanes)
    ? scenario.launched_child_lanes
    : [];
  if (!scenario || typeof scenario !== 'object') {
    return [`${id}: scenario is missing or invalid`];
  }
  if (!Array.isArray(scenario.matrix)) {
    failures.push(`${id}: matrix is missing or invalid`);
  }
  if (!Array.isArray(scenario.launched_child_lanes)) {
    failures.push(`${id}: launched_child_lanes is missing or invalid`);
  }
  const safeCandidates = findSafeIndependentCandidates(scenario);
  if (!DECISION_VALUES.has(scenario.decision)) {
    failures.push(`${id}: decision ${scenario.decision} is invalid`);
  } else if (!REASONS_BY_DECISION[scenario.decision].has(scenario.reason)) {
    failures.push(`${id}: reason ${scenario.reason} is invalid for decision ${scenario.decision}`);
  }
  for (const candidate of matrix) {
    const cap = candidate?.cap_slot_use;
    if (
      !cap ||
      typeof cap.after !== 'number' ||
      typeof cap.cap !== 'number' ||
      typeof cap.exhausted !== 'boolean'
    ) {
      failures.push(`${id}: candidate ${candidate?.lane ?? 'unknown'} has invalid cap-slot use`);
      continue;
    }
    if (cap.after > cap.cap) {
      failures.push(`${id}: cap overrun for ${candidate.lane} exceeds cap ${cap.cap}`);
    }
  }
  if (scenario.decision === 'parallelize_now') {
    if (safeCandidates.length === 0) {
      failures.push(`${id}: parallelize_now without a safe independent candidate`);
    }
    if (launched.length === 0) {
      failures.push(`${id}: parallelize_now without a launched child lane outcome`);
    }
    if (!launched.some((lane) => lane?.outcome === 'accepted')) {
      failures.push(`${id}: parallelize_now without an accepted child lane outcome`);
    }
  } else {
    if (safeCandidates.length > 0) {
      failures.push(`${id}: ${scenario.decision} chosen while safe independent candidates remain`);
    }
    if (launched.length > 0) {
      failures.push(`${id}: serial/forbid scenario launched child lanes`);
    }
  }
  if (scenario.decision === 'stay_serial' && scenario.reason === 'single_bounded_change') {
    const summary = typeof scenario.serial_evidence?.summary === 'string'
      ? scenario.serial_evidence.summary
      : '';
    const missingSummarySlices = findMissingLabeledSliceEvidence(summary);
    if (missingSummarySlices.length > 0) {
      failures.push(
        `${id}: single_bounded_change summary missing labeled slice evidence for ${missingSummarySlices.join(', ')}`
      );
    }
    const considered = new Set(scenario.serial_evidence?.separable_slices_considered ?? []);
    for (const required of ['docs', 'test', 'research', 'review']) {
      if (!considered.has(required)) {
        failures.push(`${id}: single_bounded_change did not consider ${required} slice`);
      }
    }
  }
  if (scenario.decision === 'stay_serial' && scenario.reason === 'existing_child_lane_active') {
    const summary = typeof scenario.serial_evidence?.summary === 'string'
      ? scenario.serial_evidence.summary
      : '';
    if (!hasLabeledCapExhaustedEvidence(summary)) {
      failures.push(`${id}: existing_child_lane_active summary missing labeled cap_exhausted evidence`);
    }
  }
  for (const lane of launched) {
    if (!OUTCOME_VALUES.has(lane.outcome)) {
      failures.push(`${id}: child lane ${lane.stream} has invalid outcome ${lane.outcome}`);
    }
    if (typeof lane.reason !== 'string' || lane.reason.trim().length === 0) {
      failures.push(`${id}: child lane ${lane.stream} is missing outcome reason`);
    }
  }
  return failures;
}

function findMissingLabeledSliceEvidence(summary) {
  return ['docs', 'test', 'research', 'review'].filter(
    (slice) => !new RegExp(`(?:^|;)\\s*${slice}\\s*:\\s*[^;\\s][^;]*`, 'i').test(summary)
  );
}

function hasLabeledCapExhaustedEvidence(summary) {
  return /(?:^|;)\s*cap_exhausted\s*:\s*[^;\s][^;]*/i.test(summary);
}

export function buildProviderLinearParallelizationCanaryReport(options = {}) {
  const taskId = options.taskId ?? process.env.MCP_RUNNER_TASK_ID ?? process.env.TASK ?? 'provider-linear-parallelization-canary';
  const scenarios = options.scenarios ?? buildProviderLinearParallelizationCanaryScenarios();
  const scenarioFailures = scenarios.flatMap(validateScenario);
  const decisionCounts = countDecisions(scenarios);
  const launchedChildLanes = scenarios.flatMap((scenario) =>
    (Array.isArray(scenario?.launched_child_lanes) ? scenario.launched_child_lanes : []).map((lane) => ({
      scenario_id: scenario.id,
      ...lane
    }))
  );
  const metricOnlyChildLanes = scenarios.flatMap((scenario) => {
    if (findSafeIndependentCandidates(scenario).length > 0) {
      return [];
    }
    return (Array.isArray(scenario?.launched_child_lanes) ? scenario.launched_child_lanes : []).map((lane) => ({
      scenario_id: scenario.id,
      stream: lane.stream,
      reason: 'launched without a safe independent matrix candidate'
    }));
  });
  const baselineParallelizeRate = rate(
    PARALLELIZATION_AUDIT_BASELINE.decisions.parallelize_now,
    PARALLELIZATION_AUDIT_BASELINE.total_decisions
  );
  const canaryParallelizeRate = rate(decisionCounts.parallelize_now, scenarios.length);
  const outcomeCounts = Object.fromEntries([...OUTCOME_VALUES].map((outcome) => [outcome, 0]));
  for (const lane of launchedChildLanes) {
    outcomeCounts[lane.outcome] += 1;
  }
  const failures = [
    ...scenarioFailures,
    ...(canaryParallelizeRate > baselineParallelizeRate
      ? []
      : ['canary parallelize_now rate did not exceed the audit baseline']),
    ...(metricOnlyChildLanes.length === 0
      ? []
      : ['canary launched child lanes without safe independent matrix candidates'])
  ];

  return {
    schema_version: 1,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    task_id: taskId,
    baseline: {
      ...PARALLELIZATION_AUDIT_BASELINE,
      parallelize_now_rate: baselineParallelizeRate
    },
    child_lane_cap: {
      value: PARALLEL_FIRST_CHILD_LANE_CAP,
      counts: ['active', 'pending', 'unaccepted'],
      preserves: 'CO-125 provider admission constraints'
    },
    scenarios,
    summary: {
      ok: failures.length === 0,
      failures,
      total_scenarios: scenarios.length,
      decision_counts: decisionCounts,
      canary_parallelize_now_rate: canaryParallelizeRate,
      adoption_increased: canaryParallelizeRate > baselineParallelizeRate,
      launched_child_lane_count: launchedChildLanes.length,
      launched_child_lanes: launchedChildLanes,
      launched_child_lane_outcomes: outcomeCounts,
      metric_only_child_lane_count: metricOnlyChildLanes.length,
      metric_only_child_lanes: metricOnlyChildLanes
    }
  };
}

export function validateProviderLinearParallelizationCanaryReport(report) {
  if (!report || !Array.isArray(report.scenarios)) {
    return {
      ok: false,
      failures: ['report missing or scenarios invalid']
    };
  }

  const recomputed = buildProviderLinearParallelizationCanaryReport({
    generatedAt: report.generated_at,
    taskId: report.task_id,
    scenarios: report.scenarios
  });
  const failures = [...recomputed.summary.failures];
  const reportedFailures = Array.isArray(report.summary?.failures)
    ? report.summary.failures
    : ['report summary failures missing'];
  if (report.summary?.ok !== recomputed.summary.ok) {
    failures.push('report summary ok does not match recomputed validation');
  }
  if (JSON.stringify(reportedFailures) !== JSON.stringify(recomputed.summary.failures)) {
    failures.push('report summary failures do not match recomputed validation');
  }
  if (
    JSON.stringify(report.summary?.decision_counts) !==
    JSON.stringify(recomputed.summary.decision_counts)
  ) {
    failures.push('report summary decision counts do not match recomputed validation');
  }
  if (report.summary?.canary_parallelize_now_rate !== recomputed.summary.canary_parallelize_now_rate) {
    failures.push('report summary canary parallelize_now rate does not match recomputed validation');
  }
  if (report.summary?.adoption_increased !== recomputed.summary.adoption_increased) {
    failures.push('report summary adoption flag does not match recomputed validation');
  }
  if (report.summary?.launched_child_lane_count !== recomputed.summary.launched_child_lane_count) {
    failures.push('report summary launched child lane count does not match recomputed validation');
  }
  if (
    JSON.stringify(report.summary?.launched_child_lanes) !==
    JSON.stringify(recomputed.summary.launched_child_lanes)
  ) {
    failures.push('report summary launched child lanes do not match recomputed validation');
  }
  if (
    JSON.stringify(report.summary?.launched_child_lane_outcomes) !==
    JSON.stringify(recomputed.summary.launched_child_lane_outcomes)
  ) {
    failures.push('report summary launched child lane outcomes do not match recomputed validation');
  }
  if (report.summary?.metric_only_child_lane_count !== recomputed.summary.metric_only_child_lane_count) {
    failures.push('report summary metric-only child lane count does not match recomputed validation');
  }
  if (
    JSON.stringify(report.summary?.metric_only_child_lanes) !==
    JSON.stringify(recomputed.summary.metric_only_child_lanes)
  ) {
    failures.push('report summary metric-only child lanes do not match recomputed validation');
  }
  if (report.child_lane_cap?.value !== PARALLEL_FIRST_CHILD_LANE_CAP) {
    failures.push('report child-lane cap does not match the parallel-first cap');
  }

  if (failures.length > 0) {
    return {
      ok: false,
      failures
    };
  }
  return {
    ok: true,
    failures: []
  };
}

function resolveOutputPath(args, taskId) {
  const explicit = args.output ?? args.out;
  if (typeof explicit === 'string' && explicit.trim().length > 0) {
    return path.isAbsolute(explicit) ? explicit : path.resolve(process.cwd(), explicit);
  }
  return join(process.cwd(), 'out', taskId, 'provider-linear-parallelization-canary.json');
}

function printHelp() {
  console.log(`Usage: node scripts/provider-linear-parallelization-canary.mjs [--output <path>]

Generates a deterministic shaped canary report for provider-worker same-issue
child-lane parallel-first adoption. The report compares a bounded scenario set
against the audit baseline of 5/235 parallelize_now decisions and fails closed
when child lanes are launched only to satisfy the adoption metric.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }
  const report = buildProviderLinearParallelizationCanaryReport();
  const outputPath = resolveOutputPath(args, report.task_id);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: report.summary.ok, output: outputPath, summary: report.summary }, null, 2));
  if (!report.summary.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    console.error(`provider-linear-parallelization-canary failed: ${error?.message ?? String(error)}`);
    process.exitCode = 1;
  });
}
