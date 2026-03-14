# Task Checklist - 1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction

- MCP Task ID: `1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`

> This lane follows the completed `1191` cloud execution lifecycle shell extraction. The next bounded Symphony-aligned move is to extract the remaining route-entry callback envelope around `executePipeline(...)` without reopening route policy, cloud/local shell behavior, or broader public lifecycle ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`, `tasks/specs/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`, `tasks/tasks-1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`, `.agent/task/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`
- [x] Deliberation/findings captured for the route-entry shell seam. Evidence: `docs/findings/1192-orchestrator-pipeline-route-entry-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction.md`, `docs/findings/1192-orchestrator-pipeline-route-entry-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1192`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/20260314T141414Z-docs-first/05-docs-review-override.md`

## Pipeline Route Entry Shell Extraction

- [ ] No route-entry callback envelope remains in `orchestrator.ts`; the remaining `executePipeline(...)` callback assembly moves behind one bounded helper. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] The extracted helper owns callback passthrough for runtime selection, cloud execution, auto-scout, and subpipeline restart behavior without changing contracts. Evidence: `orchestrator/src/cli/services/`, `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve callback wiring, `taskId` / `parentRunId` propagation, and nearby route-adapter behavior. Evidence: `orchestrator/tests/`, `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1192-coordinator-symphony-aligned-orchestrator-pipeline-route-entry-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
