# Task Checklist - 1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction

- MCP Task ID: `1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`
- TECH_SPEC: `tasks/specs/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`

> This lane follows `1151` from the now-thinned Telegram bootstrap adapter. The next bounded Symphony-aligned move is to extract the remaining generic bootstrap start sequencing out of `ControlServerBootstrapLifecycleRuntime.start()` without reopening Telegram runtime behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`, `tasks/specs/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`, `tasks/tasks-1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`, `.agent/task/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`
- [x] Deliberation/findings captured for the generic bootstrap start-sequencing seam. Evidence: `docs/findings/1152-control-server-bootstrap-start-sequencing-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction.md`, `docs/findings/1152-control-server-bootstrap-start-sequencing-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1152`. Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T073453Z-docs-first/00-summary.md`, `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T073453Z-docs-first/05-docs-review-override.md`

## Control Server Bootstrap Start Sequencing Extraction

- [ ] One adjacent helper replaces the inline generic bootstrap start sequence in `controlServerBootstrapLifecycle.ts`.
- [ ] `controlServerBootstrapLifecycle.ts` consumes the extracted helper without changing the generic lifecycle contract.
- [ ] Focused bootstrap lifecycle regressions preserve ordering and non-fatal bridge-start behavior.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock bootstrap start-sequencing evidence captured.
- [ ] Elegance review completed.
