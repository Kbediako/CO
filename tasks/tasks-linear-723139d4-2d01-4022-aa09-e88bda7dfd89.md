# Task Checklist - linear-723139d4-2d01-4022-aa09-e88bda7dfd89

- Linear Issue: `CO-24` / `723139d4-2d01-4022-aa09-e88bda7dfd89`
- MCP Task ID: `linear-723139d4-2d01-4022-aa09-e88bda7dfd89`
- Primary PRD: `docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`
- TECH_SPEC: `tasks/specs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`

## Docs-First
- [x] PRD drafted for the repo-wide full-suite `npm run test` instability blocker. Evidence: `docs/PRD-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`.
- [x] TECH_SPEC drafted with the current-main reproduction evidence and bounded fix/contract path. Evidence: `tasks/specs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`, `docs/TECH_SPEC-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`.
- [x] ACTION_PLAN drafted for docs-review, isolation, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`.
- [x] Durable baseline reproduction note recorded for this workspace. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T052000Z-baseline-reproduction.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`. Evidence: `.agent/task/linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md`.
- [x] Standalone pre-implementation review approval captured in spec notes. Evidence: `tasks/specs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89.md` `review_notes`.
- [x] docs-review approval captured for registered `linear-723139d4-2d01-4022-aa09-e88bda7dfd89`. Evidence: `.runs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/cli/2026-03-28T05-30-58-373Z-5ca3fa20/manifest.json`, `.runs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/cli/2026-03-28T05-30-58-373Z-5ca3fa20/run-summary.json`.

## Implementation
- [x] Owning cause of the surviving post-suite idle path isolated with concrete handle/process/code-path evidence. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] Smallest responsible fix or adopted explicit validation contract landed. Evidence: `vitest.config.core.ts`, `vitest.config.ts`, `orchestrator/src/cli/control/controlServerOwnedRuntimeLifecycle.ts`, `tests/cli-frontend-test.spec.ts`, `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] Focused regressions updated for the chosen seam. Evidence: `orchestrator/tests/ControlServerReadyInstanceLifecycle.test.ts`, `orchestrator/tests/ControlServerRequestShell.test.ts`, `orchestrator/tests/OrchestratorStartPreparationShell.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/QuestionChildResolutionAdapter.test.ts`, `orchestrator/tests/TelegramOversightBridge.test.ts`, `tests/cli-frontend-test.spec.ts`.
- [x] `CO-14` no longer remains blocked solely because repo-wide `npm run test` lacks terminal truth. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 node scripts/delegation-guard.mjs`. Evidence: terminal output recorded in this lane; summary mirrored in `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 node scripts/spec-guard.mjs --dry-run`. Evidence: terminal output recorded in this lane; summary mirrored in `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] Focused reproduction/isolation commands for the chosen seam. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T052000Z-baseline-reproduction.md`, `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run build`. Evidence: terminal output recorded in this lane; summary mirrored in `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run lint`. Evidence: terminal output recorded in this lane; summary mirrored in `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run test`. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T063601Z-npm-run-test-after-review-fixes.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run test` rerun after CodeRabbit follow-up fixes. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T070053Z-test.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run test:adapters`. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T070053Z-test-adapters.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run eval:test` is optional for this lane and currently fails in `evaluation/tests/harness.test.ts` (`runs the TypeScript smoke scenario successfully`) outside the CO-24 changed surface. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T070053Z-eval-test.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run docs:check`. Evidence: terminal output recorded in this lane; summary mirrored in `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run docs:freshness`. Evidence: terminal output recorded in this lane; summary mirrored in `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 node scripts/diff-budget.mjs`. Evidence: terminal output recorded in this lane; summary mirrored in `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T064700Z-root-cause-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run review`. Evidence: `.runs/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/cli/2026-03-28T05-30-58-373Z-5ca3fa20/review/output.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-723139d4-2d01-4022-aa09-e88bda7dfd89 npm run pack:smoke` because the final diff touches downstream-facing CLI runtime/test config surfaces. Evidence: `out/linear-723139d4-2d01-4022-aa09-e88bda7dfd89/manual/20260328T070053Z-pack-smoke-rerun.log`.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `adf9f26f-b1ca-421b-96cc-6293fa5ed1c5`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
