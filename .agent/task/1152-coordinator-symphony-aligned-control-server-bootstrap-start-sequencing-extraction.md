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

- [x] One adjacent helper replaces the inline generic bootstrap start sequence in `controlServerBootstrapLifecycle.ts`. Evidence: `orchestrator/src/cli/control/controlServerBootstrapStartSequence.ts`
- [x] `controlServerBootstrapLifecycle.ts` consumes the extracted helper without changing the generic lifecycle contract. Evidence: `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`, `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/11-manual-bootstrap-start-sequencing-check.json`
- [x] Focused bootstrap lifecycle regressions preserve ordering and non-fatal bridge-start behavior. Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/05b-targeted-tests.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/01-delegation-guard.log`, `.runs/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction-docs-guard/cli/2026-03-13T07-35-46-639Z-5dc5bfd0/manifest.json`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/03-build.log`
- [x] `npm run lint` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/04-lint.log`
- [x] `npm run test` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/05-test.log`, `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/13-override-notes.md`
- [x] `npm run docs:check` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/08-diff-budget.log`, `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/13-override-notes.md`
- [x] `npm run review` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/09-review.log`, `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/10-pack-smoke.log`
- [x] Manual/mock bootstrap start-sequencing evidence captured. Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/11-manual-bootstrap-start-sequencing-check.json`
- [x] Elegance review completed. Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/12-elegance-review.md`
