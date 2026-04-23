# ACTION_PLAN - CO: stop synthesizing `Guardrails: spec-guard command not found.` when no spec-guard stage exists

## Summary
- Goal: give the parent lane a bounded implementation plan for removing false runtime synthesis of `Guardrails: spec-guard command not found.` when no `spec-guard` stage exists, while keeping real guardrail outcomes explicit across manifest summaries, metrics closeout, provider issue observability, and retry truth.
- Scope: docs-first packet, registry/checklist mirrors, parent-owned guardrail-applicability implementation, and parent-owned focused validation.
- Assumptions:
  - the shared source payload itself is absent in this child checkout
  - the bounded handoff wording is authoritative for the issue checksum
  - the smallest correct fix is one shared guardrail-applicability contract, not separate surface-specific overrides

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Guardrails: spec-guard command not found.`
  - `no spec-guard stage exists`
  - `manifest summaries`
  - `metrics closeout`
  - `provider issue observability`
  - `retry truth`
  - `guardrail_status`
  - `guardrails_required`
  - `ensureGuardrailStatus(...)`
  - `appendMetricsEntry(...)`
- Not done if:
  - a run with no `spec-guard` stage can still synthesize `Guardrails: spec-guard command not found.`
  - metrics closeout can still preserve or append the fake missing-guardrail line for non-applicable runs
  - provider issue observability or retry truth can still treat the fake line as real failure truth
  - the lane widens into generic guardrail redesign, unrelated scheduler/provider work, or docs-only reinterpretation
- Pre-implementation issue-quality review:
  - 2026-04-18: the bounded handoff wording makes this a cross-surface applicability / truth lane, not a manifest-only cleanup and not a docs-only reinterpretation. The packet preserves the exact issue checksum and rejects widening into redesign work.

## Milestones & Sequencing
1. Create the docs-first packet and mirrors for `CO-225` within the declared docs scope.
2. Parent audits the current false-synthesis seam in `orchestrator/src/cli/run/manifest.ts`, especially `selectGuardrailCommands(...)`, `computeGuardrailStatus(...)`, and `formatGuardrailSummary(...)`.
3. Parent defines one shared guardrail-applicability contract for `not applicable`, `required missing`, and real present-stage outcomes.
4. Parent applies that contract to manifest summary and `guardrail_status` generation.
5. Parent applies the same contract to metrics closeout in `orchestrator/src/cli/metrics/metricsRecorder.ts` so provider-worker terminal summaries stay truthful.
6. Parent applies the same contract to provider issue observability and retry truth consumers, likely through `providerIssueObservability.ts`, `selectedRunProjection.ts`, `controlRuntime.ts`, `providerIssueHandoff.ts`, and `providerLinearWorkerRunner.ts`.
7. Parent adds focused regressions proving non-applicable runs no longer synthesize missing-guardrail summaries while real guardrail outcomes remain explicit.
8. Parent runs docs-review and scoped validation, then carries the packet into its normal review / PR path.

## Dependencies
- Shared source anchor: `ctx:sha256:55b1fe17233f9cfdd4784c7f69c01c4db4680de408150700c8ab551971417abc#chunk:c000001`
- Origin manifest: `.runs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2-docs-packet/cli/2026-04-17T20-05-40-785Z-50e95ea9/manifest.json`
- Likely parent implementation seams:
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/metrics/metricsRecorder.ts`
  - `orchestrator/src/cli/metrics/metricsAggregator.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- Likely parent focused tests:
  - focused guardrail-status coverage around `ensureGuardrailStatus(...)`, `computeGuardrailStatus(...)`, and `formatGuardrailSummary(...)`
  - `orchestrator/tests/MetricsAggregator.test.ts`
  - `orchestrator/tests/ProviderIssueObservability.test.ts`
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts` or `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`

## Validation
- Child lane only:
  - `python3 - <<'PY'\nimport json, pathlib\njson.loads(pathlib.Path('tasks/index.json').read_text())\nPY`
  - `rg -n "Guardrails: spec-guard command not found\\.|no spec-guard stage exists|manifest summaries|metrics closeout|provider issue observability|retry truth|docs-only reinterpretation|generic guardrail redesign" docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/TECH_SPEC-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/ACTION_PLAN-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/tasks-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md .agent/task/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
  - `git diff --check -- docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/TECH_SPEC-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md docs/ACTION_PLAN-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/tasks-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md .agent/task/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md tasks/index.json docs/TASKS.md`
- Parent implementation lane:
  - focused guardrail applicability regressions in manifest and metrics closeout
  - focused provider issue observability and retry-truth regressions proving the fake summary is not consumed as real failure truth
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits
- Rollback plan:
  - revert the shared applicability contract if it hides real `spec-guard` failure truth or widens into broader guardrail redesign

## Risks & Mitigations
- Risk: the parent lands multiple ad hoc overrides instead of one shared applicability contract.
  - Mitigation: keep the packet explicit that one shared contract is required across manifest, metrics, observability, and retry truth.
- Risk: false synthesis is removed by suppressing all missing-guardrail outcomes, including real required-missing states.
  - Mitigation: distinguish `not applicable` from `required missing` explicitly.
- Risk: the issue is reframed as docs-only interpretation rather than runtime truth.
  - Mitigation: keep docs-only reinterpretation listed as a wrong interpretation and non-goal in every packet artifact.

## Approvals
- Docs packet child lane: `.runs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2-docs-packet/cli/2026-04-17T20-05-40-785Z-50e95ea9/manifest.json`
- Parent docs-review: `.runs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2-co-225-docs-review-rerun/cli/2026-04-17T20-21-33-585Z-1c79ad95/manifest.json`
- Parent implementation/review/PR lifecycle: PR `#576`; implementation commit `e25e7de0d`; forced standalone review succeeded with `review_outcome=bounded-success`; PR checks and ready-review drain remain the final handoff gate.
