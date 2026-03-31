# Task Checklist - linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955

- Linear Issue: `CO-57` / `fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`
- MCP Task ID: `linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`
- Primary PRD: `docs/PRD-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`
- TECH_SPEC: `tasks/specs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`

## Docs-First
- [x] PRD drafted for the implementation-gate quiet-tail stabilization lane. Evidence: `docs/PRD-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`.
- [x] TECH_SPEC drafted with the bounded gate-owned handling seam and validation plan. Evidence: `tasks/specs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`, `docs/TECH_SPEC-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`.
- [x] ACTION_PLAN drafted for docs-review, reproduction, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`. Evidence: `.agent/task/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md` `review_notes`.
- [x] docs-review approval captured for `linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955`. Evidence: child `docs-review` manifest `.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-co-57-docs-review/cli/2026-03-31T14-40-18-945Z-073506e4/manifest.json`; telemetry `.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-co-57-docs-review/cli/2026-03-31T14-40-18-945Z-073506e4/review/telemetry.json` ended `failed-other` with `termination_boundary: null` because the selected model was at capacity, so manual docs review fallback was recorded in `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-docs-review-fallback.md`.

## Workflow
- Linear write-back note: packaged `linear transition` hit `linear_rate_limited` at `2026-03-31T14:29Z`, with reset reported at `2026-03-31T15:28:20.250Z`.
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded at `2026-03-31T15:28Z`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created and then updated comment `0a564d72-2c46-4f08-be97-915fd0516769`.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-57-implementation-gate-quiet-tail`.

## Investigation
- [x] The current gate execution path is narrowed before implementation. Evidence: `codex.orchestrator.json`, `package.json`, `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`.
- [x] Older repo context was reviewed so this lane does not silently reopen broader scope. Evidence: `docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`, `docs/TECH_SPEC-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up.md`.
- [x] Baseline current-tree reproduction of the implementation-gate symptom captured. Evidence: `.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-co-57-baseline-implementation-gate/cli/2026-03-31T14-46-34-849Z-6904c5a4/manifest.json`, `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-validation-summary.md`.

## Implementation
- [x] `implementation-gate` reaches a truthful terminal outcome when the reproduced long-running `test` stage appears. Evidence: `/Users/kbediako/Code/CO/.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-validation/cli/2026-03-31T15-01-50-702Z-8665b8ba/manifest.json`, `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-validation-summary.md`.
- [x] The gate distinguishes active long-running progress from genuine failing test output in machine-checkable evidence. Evidence: `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`, `orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`, `/Users/kbediako/Code/CO/.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-validation/cli/2026-03-31T15-01-50-702Z-8665b8ba/review/telemetry.json`.
- [x] Any automated cleanup stays bounded to current-run processes and preserves late-suite output truth. Evidence: no cleanup path was added; the fix is heartbeat persistence only in `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`.
- [x] Focused regression coverage or an explicit runbook captures the reproduced path. Evidence: `orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`, `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-validation-summary.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-57-docs-review --format json`. Evidence: `.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-co-57-docs-review/cli/2026-03-31T14-40-18-945Z-073506e4/manifest.json`, `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-docs-review-fallback.md`.
- [x] Baseline implementation-gate symptom reproduction on the current tree. Evidence: `.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955-co-57-baseline-implementation-gate/cli/2026-03-31T14-46-34-849Z-6904c5a4/manifest.json`, `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-validation-summary.md`.
- [x] Focused regressions or runbook verification for the chosen handling seam. Evidence: `npm run test:orchestrator -- orchestrator/tests/OrchestratorExecutionLifecycle.test.ts`, `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-validation-summary.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 node scripts/delegation-guard.mjs`. Evidence: issue-scoped implementation-gate manifest `/Users/kbediako/Code/CO/.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/cli/2026-03-31T15-24-14-953Z-9efca032/manifest.json` command `delegation-guard` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 node scripts/spec-guard.mjs --dry-run`. Evidence: same manifest command `spec-guard` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 npm run build`. Evidence: same manifest command `build` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 npm run lint`. Evidence: same manifest command `lint` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 npm run test`. Evidence: same manifest command `test` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 npm run docs:check`. Evidence: same manifest command `docs-check` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 npm run docs:freshness`. Evidence: same manifest command `docs-freshness` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 node scripts/diff-budget.mjs`. Evidence: same manifest command `diff-budget` succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: same manifest command `review` succeeded; telemetry `/Users/kbediako/Code/CO/.runs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/cli/2026-03-31T15-24-14-953Z-9efca032/review/telemetry.json` reported `status: succeeded`, `review_outcome: clean-success`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955/manual/20260401T151500Z-elegance-review.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955 npm run pack:smoke` if downstream-facing CLI, package, or skill surfaces change. Evidence: not needed; this lane touched lifecycle heartbeat persistence and docs only, not downstream-facing CLI, package, or skill surfaces.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: docs and implementation milestones are recorded in Linear comment `0a564d72-2c46-4f08-be97-915fd0516769`; final pre-handoff refresh remains pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: review-state transition not attempted while required Linear writes and main-task validation are still pending.
