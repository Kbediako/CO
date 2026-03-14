# Task Checklist - 1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction

- MCP Task ID: `1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`

## Docs-first

- [x] PRD drafted and aligned to the current user goal. Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`
- [x] TECH_SPEC drafted with bounded scope, invariants, and validation plan. Evidence: `tasks/specs/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`
- [x] ACTION_PLAN drafted for implementation and closeout. Evidence: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`, `tasks/specs/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`, `tasks/tasks-1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`, `.agent/task/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`
- [x] Deliberation/findings captured for the start-preparation shell seam. Evidence: `docs/findings/1194-orchestrator-start-preparation-shell-extraction-deliberation.md`
- [x] `tasks/index.json` updated with the linked TECH_SPEC path. Evidence: `tasks/index.json`
- [x] `docs/docs-freshness-registry.json` updated for all new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`
- [x] `docs/TASKS.md` updated with the current snapshot and evidence. Evidence: `docs/TASKS.md`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction.md`, `docs/findings/1194-orchestrator-start-preparation-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1194`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/20260314T153716Z-docs-first/05-docs-review-override.md`

## Implementation

- [ ] One bounded helper owns the `start()` preparation shell before the control-plane lifecycle handoff. Evidence: `orchestrator/src/cli/services/`, `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] `orchestrator.ts` no longer directly owns the `start()` manifest/bootstrap preparation cluster. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/00-summary.md`
- [ ] Focused regressions preserve `start()` bootstrap, manifest/runtime-mode setup, and lifecycle handoff behavior. Evidence: `orchestrator/tests/`, `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`

## Validation & Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`
- [ ] `npm run build`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/03-build.log`
- [ ] `npm run lint`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/04-lint.log`
- [ ] `npm run test`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/05-test.log`
- [ ] `npm run docs:check`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`
- [ ] `npm run docs:freshness`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`
- [ ] `npm run review`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/09-review.log`
- [ ] `npm run pack:smoke`. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`
- [ ] Elegance review completed. Evidence: `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`
