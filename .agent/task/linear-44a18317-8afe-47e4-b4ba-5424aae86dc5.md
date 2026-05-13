# Task Checklist - linear-44a18317-8afe-47e4-b4ba-5424aae86dc5

- Linear Issue: `CO-76` / `44a18317-8afe-47e4-b4ba-5424aae86dc5`
- MCP Task ID: `linear-44a18317-8afe-47e4-b4ba-5424aae86dc5`
- Primary PRD: `docs/PRD-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`
- TECH_SPEC: `tasks/specs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`

## Docs-First
- [x] PRD drafted for the `CO-76` STATUS hardening lane. Evidence: `docs/PRD-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`.
- [x] TECH_SPEC drafted with the explicit STATUS JSON contract and coverage-matrix scope. Evidence: `tasks/specs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`, `docs/TECH_SPEC-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, proof capture, and handoff. Evidence: `docs/ACTION_PLAN-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`. Evidence: `.agent/task/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`.
- [x] Standalone pre-implementation self-review captured in the spec review notes. Evidence: `tasks/specs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`.
- [x] docs-review approval captured for `linear-44a18317-8afe-47e4-b4ba-5424aae86dc5`. Evidence: `.runs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5-co-76-docs-review/cli/2026-04-03T10-57-30-814Z-627a7b80/manifest.json`.

## Implementation
- [x] Add the explicit `co-status --format json` STATUS snapshot contract while keeping `control-host --format json` on readiness semantics. Evidence: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/coStatusCliShell.ts`, `orchestrator/src/cli/coStatusAttachCliShell.ts`, `orchestrator/tests/CoStatusCliShell.test.ts`, `orchestrator/tests/CodexOrchestratorCli.test.ts`.
- [x] Reuse the shared operator-dashboard truth path for STATUS JSON output instead of inventing another status payload. Evidence: `orchestrator/src/cli/coStatusCliShell.ts`, `orchestrator/src/cli/coStatusAttachCliShell.ts`, `orchestrator/src/cli/control/operatorDashboardPresenter.ts`, `orchestrator/tests/UiDataController.test.ts`.
- [x] Document the STATUS coverage matrix for every currently rendered field/state. Evidence: `tasks/specs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`, `docs/TECH_SPEC-linear-44a18317-8afe-47e4-b4ba-5424aae86dc5.md`.
- [x] Add focused automated agreement coverage for summary fields, rows, state variants, and time-relative countdown semantics. Evidence: `orchestrator/tests/ControlStatusDashboard.test.ts`, `orchestrator/tests/ObservabilityApiController.test.ts`, `orchestrator/tests/UiDataController.test.ts`, `orchestrator/tests/CoStatusAttachCliShell.test.ts`, `orchestrator/tests/CoStatusCliShell.test.ts`.
- [x] Narrow or rename any stale legacy STATUS naming/helper surface touched by the contract change when the cleanup stays bounded. Evidence: `orchestrator/src/cli/control/controlRequestContext.ts`.

## Validation
- [x] Real live host/API verification confirms shared STATUS truth across `co-status --format json`, `/ui/data.json`, and `/api/v1/state`. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/live-status-verification.json`.
- [x] Capture terminal screenshot proof showing the exact command and normal live `CO STATUS` surface on this device. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/proof-normal-live.png`.
- [x] Capture terminal screenshot proof for paused/inspect state on this device. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/proof-paused-inspect.png`.
- [x] Capture terminal screenshot proof for compact or constrained-height state on this device. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/proof-compact-inspect.png`.
- [x] Capture terminal screenshot proof for empty or idle state on this device. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/proof-empty-idle.png`.
- [x] Capture terminal screenshot proof for retry or degraded/unavailable telemetry state on this device. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/proof-retry-queue.png`.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-76-docs-review --format json`. Evidence: `.runs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5-co-76-docs-review/cli/2026-04-03T10-57-30-814Z-627a7b80/manifest.json`.
- [x] Focused regression coverage for render/read-model/json truth agreement, rate-limit countdown semantics, and legacy-monitor or authority cleanup seams. Evidence: `npm run test:orchestrator -- orchestrator/tests/ControlStatusDashboard.test.ts orchestrator/tests/ObservabilityApiController.test.ts orchestrator/tests/ControlRequestContext.test.ts orchestrator/tests/CoStatusCliShell.test.ts orchestrator/tests/CoStatusAttachCliShell.test.ts orchestrator/tests/UiDataController.test.ts orchestrator/tests/CodexOrchestratorCli.test.ts`.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node scripts/delegation-guard.mjs`. Evidence: terminal output `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node scripts/spec-guard.mjs --dry-run`. Evidence: terminal output `✅ Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run build`. Evidence: terminal output `build` passed.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run lint`. Evidence: terminal output `lint` passed.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run test`. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/npm-test-full.log` ends with `Test Files 311 passed (311)` and `Tests 2893 passed (2893)` at `Duration 272.68s`.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run docs:check`. Evidence: terminal output `✅ docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run docs:freshness`. Evidence: terminal output `docs:freshness OK - 3275 docs, 3278 registry entries`.
- [x] `MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 node scripts/diff-budget.mjs`. Evidence: terminal output `✅ Diff budget: OK (scope=working-tree, files=14/25, lines=926/1200, +919/-7)`.
- [x] `env -u CODEX_ORCHESTRATOR_ROOT -u CODEX_ORCHESTRATOR_RUNS_DIR -u CODEX_ORCHESTRATOR_OUT_DIR -u CODEX_ORCHESTRATOR_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PACKAGE_ROOT -u CODEX_ORCHESTRATOR_PROVIDER_REPO_CONFIG_PATH -u CODEX_ORCHESTRATOR_PROVIDER_PACKAGE_ROOT MCP_RUNNER_TASK_ID=linear-44a18317-8afe-47e4-b4ba-5424aae86dc5 npm run pack:smoke`. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/20260403T115430Z-pack-smoke/00-pack-smoke.md`.
- [x] Manifest-backed standalone review wrapper executed before handoff, with any boundary fallback recorded truthfully. Evidence: `.runs/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/cli/2026-04-03T10-41-55-984Z-0d38b8c7/review/telemetry.json` reports `status: succeeded`, `review_outcome: clean-success`, `termination_boundary: null`.
- [x] Explicit elegance/minimality pass recorded after review findings are addressed. Evidence: `out/linear-44a18317-8afe-47e4-b4ba-5424aae86dc5/manual/20260403T115300Z-elegance-review/00-elegance-review.md`.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `2fc50904-0c15-4807-ba81-368af7f2926c`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
