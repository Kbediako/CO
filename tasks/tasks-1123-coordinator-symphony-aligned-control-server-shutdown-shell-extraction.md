# Task Checklist - 1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction

- MCP Task ID: `1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`

> This lane continues the broader Symphony-aligned control-server thinning track after `1122` by extracting the remaining inline shutdown shell from `ControlServer.close()` while leaving startup helpers, request routing, and event transport unchanged.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`, `tasks/specs/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`, `tasks/tasks-1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`, `.agent/task/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T234315Z-docs-first/00-summary.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1123-control-server-shutdown-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction.md`, `docs/findings/1123-control-server-shutdown-shell-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1123`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T234315Z-docs-first/05-docs-review-override.md`.

## Control Server Shutdown Shell

- [x] The `ControlServer.close()` shutdown shell is extracted through one bounded helper while preserving the public close contract. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/00-summary.md`.
- [x] The extracted helper owns only expiry teardown/reset, bootstrap teardown/reset, open-client termination, and the final `server.close()` promise wrapper. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/11-manual-control-server-shutdown-shell-check.json`.
- [x] Focused regression coverage proves teardown ordering and post-close field reset behavior remain unchanged. Evidence: `orchestrator/tests/ControlServer.test.ts`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/05-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/04-lint.log`.
- [x] `npm run test` executed, with the recurring quiet-tail override recorded explicitly instead of claiming a full-suite pass. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/05-test.log`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs` with the explicit stacked-branch override. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/08-diff-budget.log`, `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/09-review.log`.
- [x] `npm run pack:smoke`. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/10-pack-smoke.log`.
- [x] Manual shutdown-shell evidence captured. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/11-manual-control-server-shutdown-shell-check.json`.
- [x] Elegance review completed. Evidence: `out/1123-coordinator-symphony-aligned-control-server-shutdown-shell-extraction/manual/20260311T235001Z-closeout/12-elegance-review.md`.
