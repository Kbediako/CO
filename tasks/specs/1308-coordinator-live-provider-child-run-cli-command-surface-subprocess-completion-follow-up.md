---
id: 20260320-1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up
title: Coordinator Live Provider Child-Run CLI Command-Surface Subprocess Completion Follow-Up
relates_to: docs/PRD-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md
risk: high
owners:
  - Codex
last_review: 2026-03-20
dependencies:
  - docs/findings/1308-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-deliberation.md
  - docs/ACTION_PLAN-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md
  - tasks/tasks-1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up.md
---

# TECH_SPEC: Coordinator Live Provider Child-Run CLI Command-Surface Subprocess Completion Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Reassess the apparent post-`1307` command-surface completion blocker with fresh terminal evidence, avoid an unjustified code change, then rerun the live provider child run to the next exact stage boundary.
- In Scope: docs-first registration, delegated read-only analysis, docs review, truthful evidence correction, validation, live rerun, and closeout evidence.
- Out of Scope: provider-intake contract redesign, reopening runtime-env selection in the shared test helper, and broad CLI refactors without a new concrete blocker.

## Technical Requirements
1. The lane must record that focused CLI command-surface coverage is terminal on the implementation tree.
2. Runtime-env override precedence from `1307` must remain intact.
3. `npm run test` must be rerun with patience-first monitoring on the implementation tree.
4. The live provider-started child run must either advance beyond `test` or record the next exact downstream blocker.

## Architecture & Data
- Keep the `1307` runtime-env defaults in [`tests/cli-command-surface.spec.ts`](../../tests/cli-command-surface.spec.ts); do not reopen that contract because the focused rerun passed.
- Treat the fresh `297.91s` focused pass as evidence that the suspected help-path hang was a duration/patience issue rather than a proven CLI entry bug.
- Prefer no code change unless the full suite or live rerun reproduces another concrete blocker.
- If the first full-suite rerun still shows another blocker, stop at that next exact blocker instead of widening scope.

## Validation Plan
- Docs-review for `1308`
- Focused CLI command-surface rerun proving the suspected blocker is terminal after a long runtime
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
- Live provider rerun against the existing control host

## Risks & Mitigations
- Risk: the focused suite result is misread and a later full-suite blocker still exists.
  - Mitigation: continue to the full validation floor instead of stopping at the focused pass.
- Risk: stale docs keep describing a non-return after the focused rerun disproves it.
  - Mitigation: update the lane docs immediately.
- Risk: the live rerun exposes a downstream blocker after the local reassessment.
  - Mitigation: stop after capturing that new blocker rather than broadening this lane.

## Approvals
- Reviewer: Waiver granted by the top-level orchestrator on 2026-03-20; the stacked docs-review wrapper remained non-terminal at the final review step. Evidence: `out/1309-coordinator-live-provider-child-run-delegation-guard-launch-provenance-test-hermeticity-follow-up/manual/20260320T011421Z-live-provider-test-hermeticity-closeout/14-review-waiver.md`
- Date: 2026-03-20
