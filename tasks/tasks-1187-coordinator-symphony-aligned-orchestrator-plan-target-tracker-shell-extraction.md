# Task Checklist - 1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction

- MCP Task ID: `1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`

> This lane follows the completed `1186` route-adapter extraction. The next bounded Symphony-aligned move is to extract only the remaining plan-target tracker shell without reopening broader lifecycle or routing ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`, `tasks/specs/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`, `tasks/tasks-1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`, `.agent/task/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`
- [x] Deliberation/findings captured for the plan-target tracker shell. Evidence: `docs/findings/1187-orchestrator-plan-target-tracker-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction.md`, `docs/findings/1187-orchestrator-plan-target-tracker-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1187`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/20260314T113555Z-docs-first/05-docs-review-override.md`

## Plan-Target Tracker Shell Extraction

- [ ] One bounded helper owns the remaining `attachPlanTargetTracker(...)` shell in `orchestrator.ts`. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `createRunLifecycleTaskManager(...)` delegates tracker attachment without changing registration assembly or broader lifecycle authority. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve tracker attachment, no-attach-on-manager-failure behavior, unchanged-target skips, and `plan_target_id` tracking behavior. Evidence: `orchestrator/tests/OrchestratorRunLifecycleTaskManagerRegistration.test.ts`, `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1187-coordinator-symphony-aligned-orchestrator-plan-target-tracker-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
