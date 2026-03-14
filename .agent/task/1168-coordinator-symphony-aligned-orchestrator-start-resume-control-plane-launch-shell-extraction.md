# Task Checklist — Coordinator Symphony-Aligned Orchestrator Start-Resume Control-Plane Launch Shell Extraction (1168)

> Set `MCP_RUNNER_TASK_ID=1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction` for orchestrator commands. Mirror status with `tasks/tasks-1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (for example `.runs/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/cli/<run-id>/manifest.json`).

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md`, `tasks/specs/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md`, `tasks/tasks-1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md`, `.agent/task/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md`, `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T000651Z-docs-first/00-summary.md`
- [x] Deliberation/findings captured for the shared launch-shell seam. Evidence: `docs/findings/1168-orchestrator-start-resume-control-plane-launch-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction.md`, `docs/findings/1168-orchestrator-start-resume-control-plane-launch-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1168`. Evidence: `.runs/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/cli/2026-03-14T00-12-23-846Z-7a2c8e25/manifest.json`, `.runs/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/cli/2026-03-14T00-21-13-121Z-673b8024/manifest.json`, `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/13-override-notes.md`

## Implementation

- [x] `start()` and `resume()` share one adjacent control-plane launch helper. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/00-summary.md`
- [x] Resume pre-start failure persistence remains unchanged through an explicit helper hook. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/05b-targeted-tests.log`
- [x] Cleanup ordering remains unchanged for control-plane startup failures. Evidence: `orchestrator/tests/OrchestratorCleanupOrder.test.ts`, `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/05-test.log`
- [x] `npm run docs:check`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/08-diff-budget.log`
- [x] `npm run review`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction/manual/20260314T002727Z-closeout/10-pack-smoke.log`
