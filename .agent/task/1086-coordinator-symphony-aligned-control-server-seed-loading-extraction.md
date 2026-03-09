# Task Checklist - 1086-coordinator-symphony-aligned-control-server-seed-loading-extraction

- MCP Task ID: `1086-coordinator-symphony-aligned-control-server-seed-loading-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`
- TECH_SPEC: `tasks/specs/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`

> This lane extracts the remaining five JSON seed reads from `ControlServer.start()` so the server method keeps token generation, seeded runtime assembly, request shell creation, bootstrap assembly, startup sequencing, and ready-instance return while startup seed hydration moves behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`, `tasks/specs/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`, `tasks/tasks-1086-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`, `.agent/task/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1086-control-server-seed-loading-extraction-deliberation.md`, `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction.md`, `docs/findings/1086-control-server-seed-loading-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1086`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T113200Z-docs-first/00-summary.md`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T113200Z-docs-first/05-docs-review-override.md`.

## Seed Loading Extraction

- [x] Seed loading extracted behind one bounded helper. Evidence: `orchestrator/src/cli/control/controlServerSeedLoading.ts`, `orchestrator/tests/ControlServerSeedLoading.test.ts`.
- [x] `ControlServer.start()` delegates the five seed reads while preserving missing-file tolerance and payload shape. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/11-manual-seed-loading-check.json`.
- [x] Seed-loading regressions prove non-fatal missing-file handling and preserved loaded seed payloads remain intact. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/05b-targeted-tests.log`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/11-manual-seed-loading-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/01-delegation-guard.log`, `.runs/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction-scout/cli/2026-03-09T11-34-54-316Z-d4918433/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/05-test.log`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/08-diff-budget.log`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/09-review.log`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock seed-loading evidence captured. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/11-manual-seed-loading-check.json`.
- [x] Elegance review completed. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/12-elegance-review.md`.
