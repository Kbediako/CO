---
id: 20260320-1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up
title: Coordinator Live Provider Child-Run Test-Stage Terminal Completion Follow-Up
relates_to: docs/PRD-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md
risk: high
owners:
  - Codex
last_review: 2026-03-20
dependencies:
  - docs/findings/1307-live-provider-child-run-test-stage-terminal-completion-follow-up-deliberation.md
  - docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md
  - tasks/tasks-1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md
---

# TECH_SPEC: Coordinator Live Provider Child-Run Test-Stage Terminal Completion Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Eliminate the current-tree `npm run test` long-tail blocker after `1306` by making CLI subprocess command-surface tests hermetic with respect to runtime selection, then rerun the live provider child run to the next exact stage boundary.
- In Scope: docs-first registration, delegated read-only analysis, docs review, a minimal CLI subprocess test-harness isolation fix, validation, live rerun, and closeout evidence.
- Out of Scope: provider-intake contract redesign, production runtime-provider changes without fresh evidence, and broad test-performance work outside the current blocker.

## Technical Requirements
1. CLI subprocess command-surface tests that are not explicitly about runtime behavior must default to deterministic CLI runtime env values.
2. Tests that do need runtime-specific behavior must still be able to override that default per case.
3. `npm run test` must return terminally on the implementation tree.
4. The live provider-started child run must either advance beyond `test` or record the next exact downstream blocker.

## Architecture & Data
- Prefer a test-only env baseline in [`tests/cli-command-surface.spec.ts`](../../tests/cli-command-surface.spec.ts) rather than a production runtime-provider change.
- Keep runtime-provider behavior covered by [`orchestrator/tests/RuntimeProvider.test.ts`](../../orchestrator/tests/RuntimeProvider.test.ts) and related runtime-shell tests.
- Fresh split-run evidence shows [`tests/cli-orchestrator.spec.ts`](../../tests/cli-orchestrator.spec.ts) exits cleanly while the quiet long tail stays in [`tests/cli-command-surface.spec.ts`](../../tests/cli-command-surface.spec.ts).
- If the first full-suite rerun still shows non-terminal behavior or a full-suite-only assertion failure, use fresh evidence to decide whether a small teardown cleanup in [`orchestrator/src/cli/services/commandRunner.ts`](../../orchestrator/src/cli/services/commandRunner.ts) or a timing-only test adjustment is warranted.

## Validation Plan
- Docs-review for `1307`
- Focused CLI subprocess regression rerun for the `flow-target` surface
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
- Risk: test-only runtime pinning hides a genuine runtime regression.
  - Mitigation: preserve per-test overrides and rely on dedicated runtime-provider tests for that contract.
- Risk: the full-suite non-return persists after the harness fix.
  - Mitigation: stop after capturing the fresh residual evidence and only then widen scope.

## Approvals
- Reviewer: Codex docs-review approved on 2026-03-19. Evidence: `.runs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up/cli/2026-03-19T23-03-46-459Z-587c5d05/manifest.json`
- Date: 2026-03-19
