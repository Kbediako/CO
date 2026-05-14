# Task Checklist - 1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction

- MCP Task ID: `1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`

> This lane follows `1101` by extracting only the remaining inline pre-dispatch shell from `handleRequest()` without reopening route sequencing or deeper control-surface helpers.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`, `tasks/specs/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`, `tasks/tasks-1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`, `.agent/task/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1102-control-request-predispatch-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction.md`, `docs/findings/1102-control-request-predispatch-shell-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1102`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T033438Z-docs-first/05-docs-review-override.md`.

## Control Request Predispatch Shell

- [x] `controlServer.ts` delegates the remaining inline pre-dispatch request assembly through one dedicated helper. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlRequestPredispatch.ts`.
- [x] The helper owns only the missing-request guard, URL parsing, presenter/runtime context assembly, and dispatcher-input shaping. Evidence: `orchestrator/src/cli/control/controlRequestPredispatch.ts`, `orchestrator/src/cli/control/controlRequestContext.ts`, `orchestrator/src/cli/control/controlRequestRouteDispatch.ts`.
- [x] Focused regression coverage proves the new pre-dispatch seam without reopening route-dispatch/controller logic. Evidence: `orchestrator/tests/ControlRequestPredispatch.test.ts`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/05-targeted-tests.log`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/11-manual-request-predispatch-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/08-diff-budget.log`, `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/10-pack-smoke.log`.
- [x] Manual pre-dispatch evidence captured. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/11-manual-request-predispatch-check.json`.
- [x] Elegance review completed. Evidence: `out/1102-coordinator-symphony-aligned-control-request-predispatch-shell-extraction/manual/20260310T025103Z-closeout/12-elegance-review.md`.
