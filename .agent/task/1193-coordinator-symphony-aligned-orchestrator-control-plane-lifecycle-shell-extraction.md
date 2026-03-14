# Task Checklist - 1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction

- MCP Task ID: `1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md`

> This lane follows the completed `1192` pipeline route-entry shell extraction. The next bounded Symphony-aligned move is to extract the remaining private control-plane lifecycle shell without reopening public lifecycle preparation, validator/service behavior, or route execution seams.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-with-control-plane-lifecycle-shell-extraction.md`, `tasks/specs/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `tasks/tasks-1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `.agent/task/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`
- [x] Deliberation/findings captured for the control-plane lifecycle shell seam. Evidence: `docs/findings/1193-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction.md`, `docs/findings/1193-orchestrator-control-plane-lifecycle-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1193`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260314T144615Z-docs-first/05-docs-review-override.md`

## Control Plane Lifecycle Shell Extraction

- [ ] No private control-plane lifecycle shell remains in `orchestrator.ts`; the remaining `withControlPlaneLifecycle(...)` envelope moves behind one bounded helper. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] The extracted helper owns control-plane startup, failure handling, run-event publication, and cleanup ordering without changing contracts. Evidence: `orchestrator/src/cli/services/`, `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve control-plane lifecycle startup, run-event publication, and cleanup behavior. Evidence: `orchestrator/tests/OrchestratorControlPlaneLifecycle.test.ts`, `orchestrator/tests/RunEvents.test.ts`, `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
