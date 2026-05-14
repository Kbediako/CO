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
- [x] docs-review approval/override captured for registered `1084`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T100947Z-docs-first/00-summary.md`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T100947Z-docs-first/05-docs-review-override.md`.

## Seeded Runtime Assembly Extraction

- [x] Seeded runtime assembly extracted behind one bounded helper. Evidence: `orchestrator/src/cli/control/controlServerSeededRuntimeAssembly.ts`, `orchestrator/tests/ControlServerSeededRuntimeAssembly.test.ts`.
- [x] `ControlServer.start()` delegates seeded store/runtime/persist/request-context assembly while preserving identity wiring and defaults. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/11-manual-seeded-runtime-check.json`.
- [x] Runtime defaults and live persist closures remain intact under focused regressions. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/05b-targeted-tests.log`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/11-manual-seeded-runtime-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/01-delegation-guard.log`, `.runs/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction-scout/cli/2026-03-09T10-23-08-551Z-be0e7df3/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/05-test.log`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/09-review.log`, `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock seeded-runtime evidence captured. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/11-manual-seeded-runtime-check.json`.
- [x] Elegance review completed. Evidence: `out/1084-coordinator-symphony-aligned-control-server-seeded-runtime-assembly-extraction/manual/20260309T102726Z-closeout/12-elegance-review.md`.
