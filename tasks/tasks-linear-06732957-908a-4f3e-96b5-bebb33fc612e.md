# Task Checklist - linear-06732957-908a-4f3e-96b5-bebb33fc612e

- Linear Issue: `CO-54` / `06732957-908a-4f3e-96b5-bebb33fc612e`
- MCP Task ID: `linear-06732957-908a-4f3e-96b5-bebb33fc612e`
- Primary PRD: `docs/PRD-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`
- TECH_SPEC: `tasks/specs/linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`

## Docs-First
- [x] PRD drafted for the hermetic validation follow-up lane. Evidence: `docs/PRD-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`.
- [x] TECH_SPEC drafted with the narrowed current truth and validation plan. Evidence: `tasks/specs/linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`, `docs/TECH_SPEC-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`. Evidence: `.agent/task/linear-06732957-908a-4f3e-96b5-bebb33fc612e.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-06732957-908a-4f3e-96b5-bebb33fc612e.md` `review_notes`.
- [x] docs-review approval captured for `linear-06732957-908a-4f3e-96b5-bebb33fc612e`. Evidence: `.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/manifest.json`, `tasks/index.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-54`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` updated comment `7adcd2ab-a343-47e9-85a6-6fbc88ea1cbd`.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-54-hermetic-validation-fixtures`.

## Investigation
- [x] Focused baseline reproduced and narrowed. Evidence: `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npx vitest run --config vitest.config.core.ts orchestrator/tests/UserConfigStageSets.test.ts tests/cli-frontend-test.spec.ts`.
- [x] `UserConfigStageSets` is currently green in a normal shell and already loads its temp fixture config. Evidence: focused Vitest run and `tasks/specs/linear-06732957-908a-4f3e-96b5-bebb33fc612e.md` `review_notes`.
- [x] The active failing seam is the temp-workspace `frontend-test` package-fallback path. Evidence: failing manifest shows `MODULE_NOT_FOUND` for `dist/orchestrator/src/cli/frontendTestingRunner.js`; `Guardrails: spec-guard command not found.` is summary noise, not the stage failure.

## Implementation
- [x] `UserConfigStageSets` has explicit hostile-env regression coverage and remains temp-fixture-scoped. Evidence: `orchestrator/tests/UserConfigStageSets.test.ts`.
- [x] `cli-frontend-test` temp workspace is self-contained and no longer depends on repo-root package fallback assets. Evidence: `tests/cli-frontend-test.spec.ts`.
- [x] The patch stays bounded to the two cited tests and their immediate fixture helpers unless a narrower test-local fix proves impossible. Evidence: only `orchestrator/tests/UserConfigStageSets.test.ts` and `tests/cli-frontend-test.spec.ts` changed outside the docs/workpad packet.

## Validation
- Workspace-local validation note: final repo-floor commands were executed with `CODEX_ORCHESTRATOR_ROOT="$PWD" CODEX_ORCHESTRATOR_RUNS_DIR="$PWD/.runs" CODEX_ORCHESTRATOR_OUT_DIR="$PWD/out"` because the ambient provider-worker env still pointed `.runs` and `out` at the shared `/Users/kbediako/Code/CO` checkout.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-54-docs-review --format json`. Evidence: `.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/manifest.json`.
- [x] Focused baseline repro for the two cited tests. Evidence: `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npx vitest run --config vitest.config.core.ts orchestrator/tests/UserConfigStageSets.test.ts tests/cli-frontend-test.spec.ts` (`UserConfigStageSets` passed; `cli-frontend-test` failed with temp-workspace package fallback to missing `dist/orchestrator/src/cli/frontendTestingRunner.js`).
- [x] Post-fix focused Vitest rerun for the two cited tests. Evidence: `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npx vitest run --config vitest.config.core.ts orchestrator/tests/UserConfigStageSets.test.ts tests/cli-frontend-test.spec.ts` passed with `2` files and `6` tests green.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node scripts/delegation-guard.mjs`. Evidence: workspace-local override run reported `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node scripts/spec-guard.mjs --dry-run`. Evidence: workspace-local override run reported `Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run build`. Evidence: workspace-local override run succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run lint`. Evidence: workspace-local override run succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run test`. Evidence: workspace-local override run passed with `302` files and `2729` tests green.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run docs:check`. Evidence: workspace-local override run reported `docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e npm run docs:freshness`. Evidence: workspace-local override run reported `docs:freshness OK - 3124 docs, 3134 registry entries`.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e node scripts/diff-budget.mjs`. Evidence: workspace-local override run reported `Diff budget: OK (scope=working-tree, files=9/25, lines=585/1200, +575/-10)`.
- [x] `MCP_RUNNER_TASK_ID=linear-06732957-908a-4f3e-96b5-bebb33fc612e FORCE_CODEX_REVIEW=1 npm run review -- --manifest "$PWD/.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/manifest.json"`. Evidence: `.runs/linear-06732957-908a-4f3e-96b5-bebb33fc612e-co-54-docs-review/cli/2026-03-31T08-25-28-926Z-ced6037e/review/telemetry.json` reports `status: "succeeded"`, `review_outcome: "clean-success"`, and `termination_boundary: null`; the wrapper shell stalled after the clean verdict landed, so the stale post-verdict process was stopped instead of treated as a blocker.
- [x] Explicit elegance review recorded before any review handoff. Evidence: manual post-review pass concluded no further simplification was warranted because the fix stayed test-local and avoided production/runtime code changes.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending.
- [x] PR attached to the Linear issue before review-state transition. Evidence: `linear issue-context` now shows GitHub attachment `CO-54: make validation fixtures hermetic` at `https://github.com/Kbediako/CO/pull/335`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main` completed and `git merge-base --is-ancestor origin/main HEAD` returned `up_to_date`.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue remains `In Progress`.
