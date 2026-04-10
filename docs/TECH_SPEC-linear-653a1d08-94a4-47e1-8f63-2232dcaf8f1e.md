---
id: 20260410-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e
title: CO: stabilize provider-worker validation and review gating for long-running suites
relates_to: docs/PRD-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`
- PRD: `docs/PRD-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`
- Task checklist: `tasks/tasks-linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e.md`

## Traceability
- Linear issue: `CO-134` / `653a1d08-94a4-47e1-8f63-2232dcaf8f1e`
- Linear URL: https://linear.app/asabeko/issue/CO-134/co-stabilize-provider-worker-validation-and-review-gating-for-long

## Summary
- Objective: restore a truthful provider-worker validation and standalone-review path for long-running suites by reproducing and classifying the current blocker, then fixing the smallest owner surface needed for clean implementation-gate and pre-handoff review evidence.
- Scope:
  - reproduce the current blocker with saved manifest and log evidence
  - classify the owner as stage-timeout contract, test-suite regression, review-boundary drift, or an evidence-backed combination
  - land the smallest repair or narrowed contract on the current owner surfaces
  - keep CO-117 feature work separate from the validation and review fix
- Constraints:
  - keep the diff bounded to validation and review-owner surfaces unless fresh evidence forces a different minimal owner
  - preserve existing bounded-review enforcement for genuinely heavy commands
  - do not silently substitute manual review fallback for a stable wrapper path

## Implementation Boundary
- Pipeline and stage surfaces:
  - `codex.orchestrator.json`
  - `orchestrator/src/cli/services/commandRunner.ts`
- Validation and regression hosts:
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `tests/cli-frontend-test.spec.ts`
- Review-wrapper surfaces that may own the boundary defect:
  - `scripts/run-review.ts`
  - `scripts/lib/review-command-intent-classification.ts`
  - `scripts/lib/review-execution-state.ts`
  - `scripts/lib/review-execution-telemetry.ts`
- Supporting focused regression hosts as needed:
  - `tests/run-review.spec.ts`
  - `tests/review-execution-state.spec.ts`
  - `tests/review-execution-telemetry.spec.ts`

## Design
- Evidence-first classification:
  - rerun the named focused suites and a manifest-backed `implementation-gate` path before changing the contract
  - preserve the distinction between stage timeout, real suite failure, and post-stage review evidence mismatch
- Timeout and validation truth:
  - if the owner is stage timeout, make the timeout contract or closeout evidence truthful rather than masking it as a generic suite failure
  - if the owner is a real suite regression, keep the fix local to the failing tests or harness and do not relabel it as a pipeline problem
- Review-wrapper truth:
  - if the owner is an avoidable review boundary, narrow the boundary or provider-worker review contract so necessary same-lane evidence capture remains allowed
  - keep `bounded-success`, `failed-boundary`, and `failed-other` semantics explicit and consistent between telemetry writers and stage closeout consumers
- Diff discipline:
  - keep the change bounded to the classified owner surfaces plus the required docs and evidence paths

## Validation
- Focused reproduction and classification:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `npx vitest run --config vitest.config.core.ts tests/cli-frontend-test.spec.ts`
  - manifest-backed `implementation-gate` rerun or equivalent provider-worker child-stream evidence
  - forced standalone-review rerun with `review/telemetry.json` captured and classified
- Required repo floor before review handoff:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review` or truthful manual fallback
  - `npm run pack:smoke` if downstream-facing CLI or review-wrapper surfaces remain touched

## Approvals
- Reviewer: `codex-orchestrator docs-review (manual fallback accepted)`
- Date: 2026-04-10
- Evidence: `.runs/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e-co-134-docs-review/cli/2026-04-10T00-23-47-516Z-b5b978f9/manifest.json`, `out/linear-653a1d08-94a4-47e1-8f63-2232dcaf8f1e/manual/20260410T002347Z-docs-review-fallback.md`
