# Task Checklist - 1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening

- MCP Task ID: `1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`
- TECH_SPEC: `tasks/specs/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`

> This lane tightens the seeded-runtime/startup contract after `1086` so `ControlServer` consumes one shared runtime bundle instead of mirrored seeded runtime pieces, while the linear advisory state filename constant moves to a neutral control-surface owner shared by the seed loader and seeded-runtime assembly.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`, `tasks/specs/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`, `tasks/tasks-1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`, `.agent/task/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1087-control-server-seeded-runtime-bundle-boundary-tightening-deliberation.md`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/12-elegance-review.md`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md`, `docs/findings/1087-control-server-seeded-runtime-bundle-boundary-tightening-deliberation.md`.
- [x] docs-review approval/override captured for registered `1087`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T120330Z-docs-first/00-summary.md`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T120330Z-docs-first/05-docs-review-override.md`.

## Runtime Bundle Boundary Tightening

- [x] Seeded-runtime assembly contract tightened around one shared runtime bundle. Evidence: `orchestrator/src/cli/control/controlServerSeededRuntimeAssembly.ts`, `orchestrator/tests/ControlServerSeededRuntimeAssembly.test.ts`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/11-manual-runtime-bundle-check.json`.
- [x] `ControlServer` consumes the tighter runtime bundle without duplicating seeded runtime surface. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/05b-targeted-tests.log`.
- [x] The linear advisory state filename constant is owned by a neutral control-surface module shared by the seed loader, seeded-runtime assembly, and compatibility projection read path. Evidence: `orchestrator/src/cli/control/controlPersistenceFiles.ts`, `orchestrator/src/cli/control/controlServerSeedLoading.ts`, `orchestrator/src/cli/control/controlServerSeededRuntimeAssembly.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/11-manual-runtime-bundle-check.json`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/01-delegation-guard.log`, `.runs/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening-scout/cli/2026-03-09T12-11-11-079Z-6b81a06b/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/05-test.log`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/08-diff-budget.log`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/09-review.log`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock seeded-runtime bundle evidence captured. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/11-manual-runtime-bundle-check.json`.
- [x] Elegance review completed. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/12-elegance-review.md`.
