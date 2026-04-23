---
id: 20260418-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2
title: CO stop synthesizing Guardrails spec-guard command not found when no spec-guard stage exists
relates_to: docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
- PRD: `docs/PRD-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`
- Task checklist: `tasks/tasks-linear-7896d3c1-7a62-4b79-97df-a71984fab5b2.md`

## Traceability
- Linear issue: `CO-225` / `7896d3c1-7a62-4b79-97df-a71984fab5b2`
- Source anchor: `ctx:sha256:55b1fe17233f9cfdd4784c7f69c01c4db4680de408150700c8ab551971417abc#chunk:c000001`
- Docs packet child lane manifest: `.runs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2-docs-packet/cli/2026-04-17T20-05-40-785Z-50e95ea9/manifest.json`
- Shared source note: the expected shared source payload is absent in this child checkout, so the packet is anchored on the bounded lane prompt and current repo seam names only.

## Summary
- Objective: stop false runtime synthesis of `Guardrails: spec-guard command not found.` when no `spec-guard` stage exists, and make manifest summaries, metrics closeout, provider issue observability, and retry truth consume the same applicability contract.
- Scope:
  - docs-first packet and registry/checklist mirrors
  - one parent-owned guardrail-applicability contract
  - parent-owned focused validation only
- Constraints:
  - preserve exact issue wording
  - preserve real `spec-guard` succeeded / failed / skipped outcomes
  - do not widen into generic guardrail redesign, unrelated scheduler/provider work, or docs-only reinterpretation

## Issue-Shaping Contract
- User-request translation carried forward: this lane is about false synthesis of a nonexistent `spec-guard` failure across manifest / metrics / observability / retry surfaces, not about broad guardrail policy changes.
- Protected terms / exact artifact and surface names:
  - `Guardrails: spec-guard command not found.`
  - `no spec-guard stage exists`
  - `manifest summaries`
  - `metrics closeout`
  - `provider issue observability`
  - `retry truth`
  - `guardrail_status`
  - `guardrails_required`
  - `ensureGuardrailStatus(...)`
  - `computeGuardrailStatus(...)`
  - `selectGuardrailCommands(...)`
  - `formatGuardrailSummary(...)`
  - `appendMetricsEntry(...)`
  - `upsertGuardrailSummary(...)`
  - `provider-linear-worker`
  - `provider-linear-worker-proof.json`
- Nearby wrong interpretations to reject:
  - generic guardrail redesign
  - unrelated scheduler or provider-worker lifecycle changes
  - docs-only reinterpretation or manual waiver
  - treating every missing `spec-guard` state as skipped or harmless without checking applicability
  - suppressing real `spec-guard` failures because the current string is noisy elsewhere
- Explicit non-goals carried forward:
  - no stage-set overhaul
  - no scheduler redesign
  - no unrelated provider-worker retry or merge-closeout changes
  - no docs-only reinterpretation
  - no code or test edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - `selectGuardrailCommands(...)` only detects `spec-guard` commands by substring, and `formatGuardrailSummary(...)` emits `Guardrails: spec-guard command not found.` whenever `counts.total === 0`
  - `metricsRecorder.ts` terminal closeout can preserve or append the fake missing-guardrail summary into successful provider-worker manifests and metrics
  - observability and retry surfaces can inherit or react to this fake summary instead of a real guardrail contract
- Reference truth:
  - a run with no `spec-guard` stage should be `not applicable`, not `missing`
  - only a real stage or explicit required-missing condition should generate missing/failure truth
  - manifest, metrics, provider issue observability, and retry truth should all consume the same structured applicability state
- Target truth / intended delta:
  - one shared applicability contract distinguishes `not applicable`, `required missing`, and real present-stage outcomes
  - manifest / metrics / observability / retry surfaces all use that same contract
  - real `spec-guard` success, failure, skip, and pending semantics remain explicit
- Explicitly out-of-scope differences:
  - generic guardrail redesign
  - unrelated scheduler/provider changes
  - docs-only reinterpretation
  - disabling real `spec-guard` behavior

## Readiness Gate
- Not done if:
  - runs with no `spec-guard` stage can still end with `Guardrails: spec-guard command not found.`
  - metrics closeout can still append or preserve fake missing-guardrail summaries for non-applicable runs
  - provider issue observability or retry truth can still treat the fake missing-guardrail line as real failure truth
  - real `spec-guard` outcomes become less explicit
  - the solution broadens into generic guardrail redesign, unrelated scheduler/provider changes, or docs-only reinterpretation
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: the bounded handoff wording makes `CO-225` a cross-surface applicability / truth lane, not a narrower manifest-only or docs-only cleanup. The issue is not plausibly narrower than one shared contract because correctness depends on keeping manifest summaries, metrics closeout, provider issue observability, and retry truth aligned on the same applicability state.
  - 2026-04-18: the micro-task path is ineligible because correctness depends on exact wording, explicit non-goals, explicit not-done-if conditions, and the cross-surface parity contract before implementation starts.
- Safeguard ownership split:
  - child lane owns only the declared docs/checklist/registry files
  - parent lane owns source/test inspection, implementation, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
- Functional requirements:
  1. Preserve the exact protected issue wording in the docs-first packet.
  2. Distinguish `no spec-guard stage exists` from `spec-guard stage required but missing`.
  3. Ensure `manifest.summary` and `guardrail_status.summary` do not emit the missing-guardrail string for non-applicable runs.
  4. Ensure metrics closeout does not preserve or append fake missing-guardrail summaries for non-applicable runs.
  5. Ensure provider issue observability and retry truth consume the same applicability contract instead of raw synthesized summary text.
  6. Preserve explicit succeeded, failed, skipped, and pending semantics when a real `spec-guard` stage exists.
- Non-functional requirements:
  - deterministic cross-surface applicability truth
  - additive only; no destructive cleanup of historical artifacts
  - smallest shared seam, not multiple ad hoc overrides
- Interfaces / contracts:
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/metrics/metricsRecorder.ts`
  - `orchestrator/src/cli/metrics/metricsAggregator.ts`
  - `orchestrator/src/cli/control/providerIssueObservability.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`

## Architecture & Data
- Architecture / design adjustments:
  - replace the current two-way `present` versus `not found` interpretation with an explicit shared applicability contract such as `not_applicable`, `required_missing`, and `present_*`, or an equivalent structured representation
  - keep one helper or one structured guardrail-status path reused by manifest summaries, metrics closeout, provider issue observability, and retry truth
  - distinguish command-discovery absence from actual contract absence; substring discovery alone cannot imply a missing-guardrail failure
- Required artifact/content expectations:
  - `guardrail_status.summary` and `manifest.summary` do not emit `Guardrails: spec-guard command not found.` when no stage exists
  - metrics closeout and provider-worker summary preservation do not reintroduce the fake missing-guardrail line
  - provider issue observability and retry truth do not project a nonexistent `spec-guard` failure as current operator truth
- Data model changes / migrations:
  - additive `applicable`, `expected`, or equivalent structured guardrail state is acceptable
  - no historical artifact migration is required beyond truthful future summary / metrics behavior
- External dependencies / integrations:
  - no Linear mutation from this child lane
  - parent lane may reuse existing summary / proof / read-model helpers instead of creating new artifacts if one shared applicability seam is sufficient

## Current Truth
- `computeGuardrailStatus(...)` in `orchestrator/src/cli/run/manifest.ts` computes counts from `selectGuardrailCommands(...)`, which matches only `spec-guard` / `specguardrunner` substrings in command id, title, or command text.
- `formatGuardrailSummary(...)` currently returns `Guardrails: spec-guard command not found.` whenever `counts.total === 0`, even if no `spec-guard` stage was part of the pipeline.
- When `guardrails_required` is true, `computeGuardrailStatus(...)` also produces the recommendation `Guardrail command missing; run "codex-orchestrator start diagnostics --approval-policy never --format json --no-interactive" to capture reviewer diagnostics.` under that same non-applicable condition.
- `appendMetricsEntry(...)` in `orchestrator/src/cli/metrics/metricsRecorder.ts` calls `ensureGuardrailStatus(...)`, preserves the primary provider-worker summary, appends the recommendation, then `upsertGuardrailSummary(...)`, so false missing-guardrail summaries can persist into terminal closeout and metrics aggregation.
- `orchestrator/tests/MetricsAggregator.test.ts` currently asserts that synthesized summary for a successful provider-worker run, so parent validation must update the explicit regression surface rather than waive it.
- Parent implementation must also keep provider issue observability and retry truth aligned with the corrected contract so the fake summary string does not outrank real run truth once the source fix lands.

## Proposed Design
- Introduce or reuse one shared guardrail-applicability contract that distinguishes:
  - no `spec-guard` stage exists
  - `spec-guard` stage exists and succeeded / failed / skipped / pending
  - `spec-guard` stage was required but is missing
- Apply that contract in:
  - `ensureGuardrailStatus(...)` / `computeGuardrailStatus(...)` / summary formatting
  - metrics closeout and provider-worker terminal summary preservation
  - provider issue observability and retry truth consumers
- Ensure non-applicable runs remain silent about missing `spec-guard`, while real present-stage and required-missing outcomes remain explicit.

## 2026-04-21 Implementation Update
- Shipped contract:
  - `bootstrapManifest(...)` now derives `guardrails_required` from an explicit pipeline override or from an actual `spec-guard` / `specGuardRunner` stage, and records `guardrails_required_source` so explicit opt-ins stay distinguishable from legacy defaulted provider manifests; child-lane metadata carries the same source through parent projections.
  - `provider-linear-worker` is explicitly configured with `guardrailsRequired: false` because that pipeline has no `spec-guard` stage.
  - `resolveGuardrailsRequiredForManifest(...)` preserves explicit `guardrails_required: true` for real required-missing cases, while known stale provider-worker manifests are treated as non-applicable.
  - `stripNonApplicableGuardrailSummaryLines(...)` removes stale `Guardrails: spec-guard command not found.` and related recommendation lines only when manifest applicability proves guardrails are not required.
- Surface alignment:
  - manifest summary / `guardrail_status` now stop synthesizing missing `spec-guard` truth for non-applicable runs.
  - provider handoff, selected-run projection, child-lane shell, and provider-worker retry/proof surfaces sanitize stale non-applicable guardrail summary lines before projecting operator truth.
  - provider issue observability has focused child-lane progress coverage proving stale non-applicable guardrail text is not surfaced as current failure truth.
- Preservation rule:
  - explicit required-missing and real present-stage outcomes remain visible; tests cover explicit required-missing text alongside non-guardrail summary text so the sanitizer cannot hide genuine guardrail failures.
- Validation evidence:
  - commit `e25e7de0d` / PR `#576`
  - focused tests: `npm run test:orchestrator -- orchestrator/tests/Manifest.test.ts orchestrator/tests/MetricsAggregator.test.ts orchestrator/tests/ProviderIssueObservability.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts tests/cli-orchestrator.spec.ts`
  - full lane validation: `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and forced `npm run review -- --uncommitted` with `review_outcome=bounded-success`

## Protected Expectations
- Preserve exact issue wording around false runtime synthesis of `Guardrails: spec-guard command not found.` when no `spec-guard` stage exists across manifest summaries, metrics closeout, provider issue observability, and retry truth.
- Preserve real `spec-guard` succeeded / failed / skipped semantics when a stage exists.
- Keep one bounded applicability contract rather than multiple surface-specific overrides.
- Keep docs-only reinterpretation explicitly rejected as a completion path.

## Reject These Wrong Interpretations
- `This is a generic guardrail redesign.`
- `This is an unrelated scheduler or provider-worker lifecycle issue.`
- `Leave runtime unchanged and just document that the string is noisy.`
- `Hide all missing-guardrail outcomes, including real required-missing cases.`
- `Let each surface decide applicability independently.`

## Validation Plan
- Child-lane checks:
  - JSON parse of `tasks/index.json`
  - protected-term grep across the touched packet files
  - `git diff --check` over the declared docs scope
- Parent-lane checks:
  - focused coverage for `ensureGuardrailStatus(...)` / `computeGuardrailStatus(...)` / `formatGuardrailSummary(...)`
  - focused `MetricsAggregator.test.ts` coverage for terminal closeout and summary preservation
  - focused `ProviderIssueObservability.test.ts`, `SelectedRunProjection.test.ts`, `ControlRuntime.test.ts`, and `ProviderIssueHandoff.test.ts` or `ProviderIssueHandoffRefreshSerialization.test.ts` coverage as needed to prove observability and retry truth consume the same applicability contract
  - parent docs-review before implementation
  - parent-selected scoped validation after source edits

## Approvals
- Reviewer: `codex-orchestrator docs-review` and parent implementation
- Date: 2026-04-18
- Docs-review manifest: `.runs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2-co-225-docs-review-rerun/cli/2026-04-17T20-21-33-585Z-1c79ad95/manifest.json`
- Docs-review telemetry: `.runs/linear-7896d3c1-7a62-4b79-97df-a71984fab5b2-co-225-docs-review-rerun/cli/2026-04-17T20-21-33-585Z-1c79ad95/review/telemetry.json`
