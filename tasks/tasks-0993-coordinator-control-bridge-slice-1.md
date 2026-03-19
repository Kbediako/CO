# Task Checklist - 0993-coordinator-control-bridge-slice-1

- MCP Task ID: `0993-coordinator-control-bridge-slice-1`
- Primary PRD: `docs/PRD-coordinator-control-bridge-slice-1.md`
- TECH_SPEC: `tasks/specs/0993-coordinator-control-bridge-slice-1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-control-bridge-slice-1.md`

> Set `MCP_RUNNER_TASK_ID=0993-coordinator-control-bridge-slice-1` for orchestrator commands. Required quality lane: `node scripts/delegation-guard.mjs --task 0993-coordinator-control-bridge-slice-1`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`, `npm run pack:smoke`.

## Foundation
- [x] Standalone pre-implementation review of task/spec recorded in spec + checklist notes. - Evidence: scope/constraints recorded in `tasks/specs/0993-coordinator-control-bridge-slice-1.md` (docs-only hard stop for this stream).
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: placeholder docs artifacts created in this stream: `docs/PRD-coordinator-control-bridge-slice-1.md`, `docs/TECH_SPEC-coordinator-control-bridge-slice-1.md`, `docs/ACTION_PLAN-coordinator-control-bridge-slice-1.md`, this file, `.agent/task/0993-coordinator-control-bridge-slice-1.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task/spec registration and snapshot. - Evidence: placeholder index/task mirror updates captured in `tasks/index.json` and `docs/TASKS.md`.
- [x] Required coordinator realignment captured (`still applies`, `changed in CO`, `must update before coding`). - Evidence: `docs/PRD-coordinator-control-bridge-slice-1.md`, `tasks/specs/0993-coordinator-control-bridge-slice-1.md`.
- [x] docs-review manifest captured (pre-implementation). - Evidence: `.runs/0993-coordinator-control-bridge-slice-1/cli/2026-03-03T09-39-40-168Z-996785b7/manifest.json` (run `2026-03-03T09-39-40-168Z-996785b7`, status `succeeded`).

## Implementation
- [x] Control bridge contract implemented for Coordinator `pause/resume/cancel/status` forwarding into CO. - Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlState.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Strict auth/token boundary enforced for control actions (issuer/audience/scope/expiry/replay handling). - Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/delegationServer.ts`, `orchestrator/tests/DelegationServer.test.ts`.
- [x] Idempotency behavior implemented for duplicate intents/requests across all four control actions. - Evidence: `orchestrator/src/cli/control/controlState.ts`, `orchestrator/src/cli/control/controlWatcher.ts`, `orchestrator/tests/ControlWatcher.test.ts`.
- [x] Traceability chain emission implemented (`intent_id -> task_id -> run_id -> manifest_path`) across status/manifests/events. - Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlWatcher.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] Audit behavior implemented in manifest/events/status outputs with actor/reason/result timestamps. - Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlWatcher.ts`, `orchestrator/tests/ControlWatcher.test.ts`.
- [x] Invariant enforcement implemented: no scheduler ownership transfer, no control bypass, no silent drops. - Evidence: `orchestrator/src/cli/control/controlState.ts`, `orchestrator/src/cli/delegationServer.ts`, `orchestrator/tests/DelegationServer.test.ts`.

## Validation
- [x] 01 `node scripts/delegation-guard.mjs --task 0993-coordinator-control-bridge-slice-1`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-01-delegation-guard.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-02-spec-guard.log`.
- [x] 03 `npm run build`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-03-build.log`.
- [x] 04 `npm run lint`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-04-lint.log`.
- [x] 05 `npm run test`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-05-test.log`, `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-05-test.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-08-diff-budget.log`.
- [x] 09 `npm run review`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-09-review.log`.
- [x] 10 `npm run pack:smoke`. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-10-pack-smoke.log`.

## Closeout
- [x] Checklist mirrors synced after implementation (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: `tasks/tasks-0993-coordinator-control-bridge-slice-1.md`, `.agent/task/0993-coordinator-control-bridge-slice-1.md`, `docs/TASKS.md`.
- [x] Final GO/NO-GO decision recorded with manifest-backed evidence. - Evidence: `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-09-review.log`, `out/0993-coordinator-control-bridge-slice-1/manual/final-endstate-10-pack-smoke.log`, `.runs/0993-coordinator-control-bridge-slice-1/cli/2026-03-03T09-39-40-168Z-996785b7/manifest.json` (GO: succeeded).
