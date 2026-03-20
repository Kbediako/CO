---
id: 20260320-1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up
title: Coordinator Live Provider Child-Run Delegation-Guard Launch-Provenance Test Hermeticity Follow-Up
relates_to: docs/PRD-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md
risk: high
owners:
  - Codex
last_review: 2026-03-20
dependencies:
  - docs/findings/1309-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up-deliberation.md
  - docs/ACTION_PLAN-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md
  - tasks/tasks-1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up.md
---

# TECH_SPEC: Coordinator Live Provider Child-Run Delegation-Guard Launch-Provenance Test Hermeticity Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Validate that the current tree already removes the live-only delegation-guard test hermeticity failure under ambient provider launch provenance, then rerun the local floor and live provider replay until the next exact blocker is known.
- In Scope: docs-first registration, delegated read-only analysis, docs review, validation of the existing test hermeticity helper, closeout evidence, and live replay.
- Out of Scope: weakening runtime delegation-guard semantics, reopening the `1307` command-surface contract, or broad provider-runtime refactors.

## Technical Requirements
1. Delegation-guard test child envs must be hermetic under ambient provider launch provenance.
2. Explicit per-test provider launch overrides must remain stable even when they match inherited parent values.
3. Runtime/provider contracts for live control-host-launched runs must remain unchanged.
4. If full direct `npm run test` does not return cleanly on the implementation tree, the lane must record the exact post-suite blocker instead of claiming a pass.
5. The live `CO-2` replay must either advance beyond `stage:test:failed` or capture the next exact blocker.

## Architecture & Data
- Prefer a test-harness fix in [`tests/delegation-guard.spec.ts`](../../tests/delegation-guard.spec.ts) over production-path edits.
- Validate the current-tree helper that builds child envs from a sanitized base by stripping inherited provider launch and provider control-host locator env vars before applying explicit overrides.
- Keep the targeted regression coverage for a parent process that already carries `CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE=control-host` with a different token.
- Keep [`scripts/delegation-guard.mjs`](../../scripts/delegation-guard.mjs) behavior unchanged unless the repro proves a true runtime regression.

## Validation Plan
- Docs-review for `1309`
- Targeted `npx vitest run tests/delegation-guard.spec.ts`
- Explicit ambient-env repro for delegation-guard child invocations
- Full validation floor:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Explicit elegance review pass
- Live provider replay against the existing control host

## Risks & Mitigations
- Risk: the already-present helper fix is mistaken for an unresolved runtime regression.
  - Mitigation: validate the current tree under injected ambient env first, and keep runtime guard behavior unchanged unless new evidence forces scope changes.
- Risk: live replay exposes another downstream blocker after `test`.
  - Mitigation: stop at the next exact blocker and record it truthfully.
- Risk: stacked-branch diff volume obscures the narrow fix.
  - Mitigation: keep the implementation slice tightly scoped and record any necessary diff-budget override evidence.

## Approvals
- Reviewer: Waiver granted by the top-level orchestrator on 2026-03-20; the stacked docs-review wrapper remained non-terminal at the final review step. Evidence: `out/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up/manual/20260320T011421Z-live-provider-test-hermeticity-closeout/14-review-waiver.md`
- Date: 2026-03-20
