# Task Checklist - 1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction

- MCP Task ID: `1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`
- TECH_SPEC: `tasks/specs/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`

> This lane extracts the remaining seeded runtime assembly block from `ControlServer.start()` so the server method keeps seed loading plus server/startup-shell composition while seeded store/runtime creation, persist helpers, and `requestContextShared` assembly move behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`, `tasks/specs/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`, `tasks/tasks-1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`, `.agent/task/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1084-control-server-seeded-runtime-assembly-extraction-deliberation.md`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction.md`, `docs/findings/1084-control-server-seeded-runtime-assembly-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1084`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Seeded Runtime Assembly Extraction

- [ ] Seeded runtime assembly extracted behind one bounded helper. Evidence: extracted control-local helper, focused seeded-runtime tests.
- [ ] `ControlServer.start()` delegates seeded store/runtime/persist/request-context assembly while preserving identity wiring and defaults. Evidence: `orchestrator/src/cli/control/controlServer.ts`, focused seeded-runtime evidence.
- [ ] Runtime defaults and live persist closures remain intact under focused regressions. Evidence: focused seeded-runtime/server tests.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction-*/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock seeded-runtime evidence captured. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/11-manual-seeded-runtime-check.json`.
- [ ] Elegance review completed. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
