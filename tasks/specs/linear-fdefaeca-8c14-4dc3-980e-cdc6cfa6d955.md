---
id: 20260401-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955
title: CO: Stabilize implementation-gate when nested npm run test hangs after green tail
status: done
owner: Codex
created: 2026-04-01
last_review: 2026-05-02
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md
related_action_plan: docs/ACTION_PLAN-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md
related_tasks:
  - tasks/tasks-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md
review_notes:
  - 2026-05-02: CO-479 live Linear audit confirmed CO-57 is Done (state_type=completed, updated_at=2026-04-09T13:28:53.032Z) with merged PR #338 attached; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-04-01` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-04-01: Opened from Linear issue `CO-57` in the provider-worker workspace using issue id `fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`.
  - 2026-04-01: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`, `Done`), showed no attached PR and no existing workpad.
  - 2026-04-01: Packaged `linear transition --state "In Progress"` failed with `linear_rate_limited` at `2026-03-31T14:29Z`; the reported reset time is `2026-03-31T15:28:20.250Z`, so state and workpad sync are pending retry rather than assumed complete.
  - 2026-04-01: The detached workspace was switched onto branch `linear/co-57-implementation-gate-quiet-tail`.
  - 2026-04-01: Prior repo context was reviewed before implementation: `CO-24` tracked the broader repo-wide `npm run test` idle family, and task `1307` tracked one historical contributor in CLI command-surface runtime isolation, but the current issue is narrower and gate-owned.
  - 2026-04-01: Current code-path review initially showed `implementation-gate` runs `npm run test` from `codex.orchestrator.json`, maps through `package.json` to `npm run test:orchestrator`, and executes via `runCommandStage(...)` plus `execRuntime`, so reproduction started from the command path before narrowing further.
  - 2026-04-01: Pre-implementation approval: proceed with a narrow implementation-gate stabilization lane that preserves real failing-test truth and avoids widening into a fresh repo-wide full-suite rewrite unless current evidence proves that unavoidable.
  - 2026-04-01: Audited child `docs-review` run `.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-co-57-docs-review/cli/2026-03-31T14-40-18-945Z-073506e4/manifest.json` ended with review telemetry `failed-other` and `termination_boundary: null` because the selected model was at capacity; manual docs review fallback was accepted instead of treating that tooling failure as a content finding.
  - 2026-04-01: Baseline implementation-gate reproduction `.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-co-57-baseline-implementation-gate/cli/2026-03-31T14-46-34-849Z-6904c5a4/manifest.json` showed the cited late suites were not terminal; the run continued into `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`, then succeeded. The false-stall diagnosis came from `manifest.json` heartbeat staleness while the sidecar heartbeat kept moving.
  - 2026-04-01: The minimal fix lives in `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`: periodic `pushHeartbeat(false)` now persists `manifest.json` as well as `.heartbeat`, keeping raw-manifest readers aligned with live activity.
  - 2026-04-01: Focused regression `npm run test:orchestrator -- orchestrator/tests/OrchestratorExecutionLifecycle.test.ts` passed after adding coverage for manifest-heartbeat persistence during an active long-running body.
  - 2026-04-01: Dist-backed implementation-gate validation `/Users/kbediako/Code/CO/.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-validation/cli/2026-03-31T15-01-50-702Z-8665b8ba/manifest.json` reached `status: succeeded`; review telemetry reported `status: succeeded`, `review_outcome: clean-success`, and manual sampling during the active `test` stage showed `manifest.json` heartbeat advancement at `2026-03-31T15:02:45.799Z`, `2026-03-31T15:03:05.804Z`, and `2026-03-31T15:04:40.823Z`.
  - 2026-04-01: After the reported Linear reset window, packaged `linear transition --state "In Progress"` succeeded and `linear upsert-workpad` created then refreshed the single required `## Codex Workpad` comment `0a564d72-2c46-4f08-be97-915fd0516769`.
  - 2026-04-01: The issue-scoped implementation-gate run `/Users/kbediako/Code/CO/.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/cli/2026-03-31T15-24-14-953Z-9efca032/manifest.json` reached `status: succeeded`; every pipeline stage (`delegation-guard`, `spec-guard`, `build`, `lint`, `test`, `docs-check`, `docs-freshness`, `diff-budget`, and forced `review`) succeeded, and review telemetry reported `review_outcome: clean-success`.
---

# Technical Specification

## Context

`CO-57` exists because a real provider-worker `implementation-gate` child stream observed during `CO-56` looked stalled after visible late-suite green output, and manual cleanup degraded that run into a generic failed command (`exit 128`). Current-tree reproduction narrowed the live fault: the cited late suites were not terminal, the run itself still finished successfully, and the operator-facing false stall came from stale `manifest.json` heartbeat data while the sidecar heartbeat kept advancing. This lane is therefore about restoring truthful in-flight progress visibility for raw-manifest readers, not about reopening the entire repo-wide `npm run test` history.

## Requirements

1. `manifest.json` heartbeat data must advance during an active long-running `implementation-gate` `test` stage.
2. Raw-manifest readers must be able to distinguish an active long-running test stage from a genuinely failing `npm run test` command in machine-checkable evidence.
3. The fix must preserve truthful stage output and the existing command exit contract for real failures.
4. The change must remain bounded to the implementation-gate lifecycle heartbeat seam unless fresh evidence shows a different minimal owner.
5. Regression coverage and an explicit evidence note must capture the provider-worker child-stream reproduction observed during `CO-56`.

## Current Truth

- `implementation-gate` in `codex.orchestrator.json` runs `npm run test` after scrubbing review and orchestration env vars from the stage.
- `package.json` maps `npm run test` to `npm run test:orchestrator`, which runs `vitest run --config vitest.config.core.ts`.
- The issue body cites a real child-stream run where late visible green suites included `tests/linear-cli-help.spec.ts` and `tests/cli-frontend-test.spec.ts`.
- Baseline reproduction on the current tree showed those suites were not terminal; the run continued into `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts`, then reached a clean terminal success.
- The false-stall signal came from the execution lifecycle: periodic heartbeat updates persisted only the sidecar `.heartbeat` file while leaving `manifest.json` stale.
- Older repo work (`CO-24`, `1307`) already narrowed the broader quiet-tail family, but the current lane still needed a gate-owned truthful progress signal for raw-manifest readers in a real provider-worker child stream.

## Issue-Shaping Contract

- User-request translation carried forward:
  - stabilize `implementation-gate` around the late-suite symptom
  - preserve distinction from genuine failing tests
  - avoid reopening the full repo-wide blocker lane
- Protected terms / exact artifact and surface names:
  - `implementation-gate`
  - `npm run test`
  - `npm run test:orchestrator`
  - `esbuild --service`
  - `exit 128`
  - manifest heartbeats
- Nearby wrong interpretations to reject:
  - treat any quiet timeout as success
  - broaden immediately into a new repo-wide Vitest cleanup campaign
  - keep describing the current tree as a reproduced terminal hang after `tests/linear-cli-help.spec.ts` and `tests/cli-frontend-test.spec.ts`
  - rely on manual PID cleanup and call the resulting generic failure good enough
- Explicit non-goals carried forward:
  - unrelated review-wrapper or provider-worker workflow work
  - generic repo-wide `npm run test` rewrites without fresh evidence
  - silent suppression of real test failures

## Parity / Alignment Matrix

- Not applicable.
- Current truth:
  - the current-tree baseline run completed successfully after the cited late suites
  - raw-manifest readers could still misclassify that active run as stalled because `manifest.json` heartbeat data stopped moving
- Reference truth:
  - the gate should emit a truthful terminal result for the current run
- Target truth / intended delta:
  - truthful heartbeat persistence for the long-running `test` stage
  - preserved failure truth for genuinely failing test runs without adding a new success classification path
- Explicitly out-of-scope differences:
  - unrelated repo-wide test-harness cleanup work

## Readiness Gate

- Not done if:
  - `manifest.json` heartbeat data still goes stale during an active long-running `test` stage
  - the final behavior no longer distinguishes active progress from real test failure
  - the lane ships without regression coverage or a concrete evidence note for the reproduced path
- Pre-implementation issue-quality review evidence:
  - the current issue is directionally about the quiet-tail family, but the live request is narrower than `CO-24`: restore truthful progress in the implementation-gate path first and only widen if fresh reproduction proves that inadequate.
- Safeguard ownership split:
  - gate and lifecycle behavior: `codex.orchestrator.json`, `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - focused regressions: `orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`
  - workflow docs and workpad truth: issue packet plus later Linear workpad refresh

## Validation Plan

- Retry packaged Linear state/workpad sync after the reported reset window.
- Run audited child `docs-review` after packet registration and record the manifest-backed result.
- Reproduce the late-suite / stale-manifest symptom through the implementation-gate path on the current tree and capture the later-suite evidence.
- Add focused lifecycle regressions plus an issue-scoped evidence note for the chosen fix.
- Run the required repo validation floor, standalone review, and explicit elegance review before any review handoff.

## Manifest Evidence

- Linear issue context:
  - packaged `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear issue-context --issue-id fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`
- Current branch:
  - `linear/co-57-implementation-gate-quiet-tail`
- Key source references:
  - `codex.orchestrator.json`
  - `package.json`
  - `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - `docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`
  - `docs/TECH_SPEC-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`
