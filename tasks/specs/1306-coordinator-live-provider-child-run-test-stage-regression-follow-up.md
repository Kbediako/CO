---
id: 20260320-1306-coordinator-live-provider-child-run-test-stage-regression-follow-up
title: Coordinator Live Provider Child-Run Test-Stage Regression Follow-Up
relates_to: docs/PRD-coordinator-live-provider-child-run-test-stage-regression-follow-up.md
risk: high
owners:
  - Codex
last_review: 2026-03-20
dependencies:
  - docs/findings/1306-live-provider-child-run-test-stage-regression-follow-up-deliberation.md
  - docs/ACTION_PLAN-coordinator-live-provider-child-run-test-stage-regression-follow-up.md
  - tasks/tasks-1306-coordinator-live-provider-child-run-test-stage-regression-follow-up.md
---

## Summary
- Objective: Fix the concrete `04-test` regressions now blocking the provider-started live child-run branch after `1305`, while preserving the provider/delegation contract already proven live.
- Scope: one docs-first follow-up lane, one narrow runtime-shell env fix, one provider-intake truthfulness fix for newly spawned child runs, one `delegation-guard` provider-contract hardening fix, focused regressions, required validation, and a live provider rerun.
- Constraints:
  - do not revisit provider setup or the `1305` control-host-only trust boundary
  - do not broaden scope into generic runner-lifecycle work without new evidence

## Live Bug Context
- `1305` moved the live `CO-2` child run beyond `stage:delegation-guard:failed`; the current child run manifest is now terminal with `status_detail=stage:test:failed`.
- `commands/04-test.ndjson` shows the stage emitted `command:end` and failed with two test regressions, so the current blocker is the test content rather than a missing terminal event.
- The failing tests are:
  - `orchestrator/tests/RlmCodexRuntimeShell.test.ts > caches runtime context and shapes exec env`
  - `tests/delegation-guard.spec.ts > rejects provider-started fallback runs without control-host launch provenance`

## Technical Requirements
1. Empty-string non-interactive env vars in `createRlmCodexRuntimeShell(...)` must normalize like unset values when non-interactive mode is forced.
2. Provider-started claims must stay `starting` after manifest discovery until rehydrate proves the child manifest is actually `in_progress`, while still recording `run_id` and `run_manifest_path`.
3. `delegation-guard` must not emit provider-child-only diagnostics for a top-level provider-started fallback run unless there is an actual sanctioned provider parent-prefix contract to evaluate.
4. `delegation-guard` must keep resolving the authoritative provider-intake ledger when the control host runs under non-default `--task` / `--run` ids, using control-host provenance persisted on sanctioned provider-run manifests and backfilled on resume for older provider manifests.
5. Existing positive provider-started and provider-child regressions from `1305` must remain green.
6. Full repo validation must pass on the implementation tree.
7. Live rerun must confirm the provider-started child run gets beyond `stage:test:failed`, or else record the next exact blocker.

## Validation Plan
- Pre-implementation docs gate:
  - `npx codex-orchestrator start docs-review --format json --no-interactive --task 1306-coordinator-live-provider-child-run-test-stage-regression-follow-up`
- Implementation validation:
  - `npx vitest run orchestrator/tests/Manifest.test.ts orchestrator/tests/OrchestratorResumePreparationShell.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/RlmCodexRuntimeShell.test.ts tests/delegation-guard.spec.ts`
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
  - explicit elegance review pass
- Live verification:
  - verify the current control-host state files before rerun
  - trigger or observe the real started issue path using the existing live provider setup
  - confirm the provider-started child run gets beyond `stage:test:failed`
  - capture manifest/log evidence for the next blocker if one appears

## Approvals
- Reviewer: docs-review approved via `.runs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up/cli/2026-03-19T21-44-24-346Z-e87d8d12/manifest.json`
- Date: 2026-03-20
