# Task Checklist - linear-f0d312eb-055f-4926-80df-8fcaaf56839c

- Linear Issue: `CO-102` / `f0d312eb-055f-4926-80df-8fcaaf56839c`
- MCP Task ID: `linear-f0d312eb-055f-4926-80df-8fcaaf56839c`
- Primary PRD: `docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- TECH_SPEC: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`

## Docs-First
- [x] PRD drafted for the repo-wide freshness unblock lane. Evidence: `docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] TECH_SPEC drafted for the stale-surface audit and reconciliation lane. Evidence: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`, `docs/TECH_SPEC-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] ACTION_PLAN drafted for docs review, stale-surface reconciliation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`. Evidence: `.agent/task/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md` `review_notes`.
- [x] docs-review approval captured for `linear-f0d312eb-055f-4926-80df-8fcaaf56839c`. Evidence: `.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c-co-102-docs-review/cli/2026-04-06T03-20-19-962Z-29dd089f/manifest.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded on 2026-04-06.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-102-spec-docs-freshness-blockers`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` reused comment `3bb36aeb-adcf-44a3-8a86-7040107bef69`.

## Investigation
- [x] Exact `Spec guard` stale-surface inventory captured on the current branch. Evidence: `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/spec-guard.mjs --dry-run` surfaced only stale `last_review: 2026-03-06` task specs `1001` and `1009`-`1031`.
- [x] Exact `docs:freshness` stale-surface inventory captured on the current branch. Evidence: `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:freshness` reported `stale docs: 19`, and the stale registry cohort was `.agent/SOPs/instruction-stamps.md` plus the `0932`-`0934` PRD/TECH_SPEC/ACTION_PLAN/task/mirror family in `docs/docs-freshness-registry.json`.
- [x] Any out-of-scope stale follow-up surfaces split into a separate issue instead of expanding scope. Evidence: not needed; the exact stale set stayed within the repo-wide blocker cohort described in `CO-102`.

## Implementation
- [x] All stale docs/spec blocker surfaces required for clean freshness gates are refreshed or otherwise reconciled. Evidence: `tasks/specs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`, `tasks/specs/1009-coordinator-telegram-setup-canary-and-runbook-implementation.md` through `tasks/specs/1031-coordinator-symphony-aligned-core-compatibility-response-builders.md`, and `docs/docs-freshness-registry.json`.
- [x] The final packet records which surfaces were refreshed, archived, or otherwise reconciled. Evidence: `docs/PRD-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`, `docs/TECH_SPEC-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`, `docs/ACTION_PLAN-linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`, `tasks/specs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c.md`, and `out/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/manual/workpad.md`.
- [x] No freshness policy weakening or unrelated runtime scope changes were introduced. Evidence: `/Users/kbediako/Code/CO/.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/cli/2026-04-06T03-10-12-967Z-a94af73c/review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`) plus the docs-only touched-path list in `git diff --name-only`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-102-docs-review --format json`. Evidence: `.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c-co-102-docs-review/cli/2026-04-06T03-20-19-962Z-29dd089f/manifest.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/delegation-guard.mjs`. Evidence: command returned `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c node scripts/spec-guard.mjs --dry-run`. Evidence: command returned `Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:freshness`. Evidence: command returned `docs:freshness OK - 3344 docs, 3347 registry entries`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run docs:check`. Evidence: command returned `docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run build`. Evidence: command succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run lint`. Evidence: command succeeded.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c npm run test`. Evidence: command succeeded with `313` files and `3030` tests passing.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c DIFF_BUDGET_OVERRIDE_REASON=... node scripts/diff-budget.mjs`. Evidence: override accepted because the lane had to update the docs-first packet plus the stale blocker cohort together.
- [x] `MCP_RUNNER_TASK_ID=linear-f0d312eb-055f-4926-80df-8fcaaf56839c FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/cli/2026-04-06T03-10-12-967Z-a94af73c/review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`); later rerun fallback recorded at `out/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/manual/review-rerun-fallback-2026-04-06.md`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/manual/elegance-review-2026-04-06.md`.
- [x] Required repo validation floor rerun if the final diff touches non-doc surfaces. Evidence: not needed for scope control, and the optional full floor (`build`, `lint`, `test`) was still rerun on this docs-only diff.

## Handoff
- [x] Workpad refreshed after docs, after stale-surface reconciliation, and before the current stop point. Evidence: `out/linear-f0d312eb-055f-4926-80df-8fcaaf56839c/manual/workpad.md` plus workpad comment `3bb36aeb-adcf-44a3-8a86-7040107bef69`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: Linear state remains `In Progress` while review/elegance/PR handoff work is still open.
