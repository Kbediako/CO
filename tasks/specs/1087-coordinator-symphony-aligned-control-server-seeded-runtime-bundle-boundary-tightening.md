---
id: 20260309-1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening
title: Coordinator Symphony-Aligned Control Server Seeded Runtime Bundle Boundary Tightening
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md
related_tasks:
  - tasks/tasks-1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Seeded Runtime Bundle Boundary Tightening

## Summary

Tighten the seeded-runtime assembly and `ControlServer` startup contract around one shared runtime bundle so the server no longer stores duplicated runtime pieces that already live inside `requestContextShared`, and move the linear advisory state filename constant to a neutral owner used by both the seed loader and the seeded-runtime assembly.

## Scope

- Tighten the seeded-runtime assembly return contract around one shared runtime bundle.
- Update `ControlServer` to consume that tighter bundle without changing startup behavior.
- Move the linear advisory state filename constant to a neutral owner used by both the read and write paths.

## Out of Scope

- Changes to control runtime behavior.
- Changes to request-shell, bootstrap-lifecycle, or startup-sequence behavior.
- Changes to route/controller logic.
- Broad runtime refactors outside the seeded-runtime/startup boundary.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1086`. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/12-elegance-review.md`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/14-next-slice-note.md`, `docs/findings/1087-control-server-seeded-runtime-bundle-boundary-tightening-deliberation.md`.
- 2026-03-09: Completed. `createControlServerSeededRuntimeAssembly(...)` now returns only `requestContextShared`, `ControlServer` stores only the shared bundle plus server/lifecycle fields, `LINEAR_ADVISORY_STATE_FILE` now lives in `orchestrator/src/cli/control/controlPersistenceFiles.ts`, `selectedRunProjection.ts` reuses the neutral advisory filename owner, focused runtime-bundle regressions passed `4/4` files and `8/8` tests, the full local suite passed `179/179` files and `1208/1208` tests, the manual runtime-bundle check confirmed the one-bundle contract plus shared constant ownership, and the lane-discovered Telegram bridge test race was tightened so full-suite validation stays deterministic. The delegated `1087-...-scout` diagnostics manifest remains delegation evidence only because it failed on the pre-fix tree and exposed the stale seed-loading test import that the completed lane fixed. Evidence: `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/00-summary.md`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/05b-targeted-tests.log`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/11-manual-runtime-bundle-check.json`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/12-elegance-review.md`, `out/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening/manual/20260309T122328Z-closeout/13-override-notes.md`, `.runs/1087-coordinator-symphony-aligned-control-server-seeded-runtime-bundle-boundary-tightening-scout/cli/2026-03-09T12-11-11-079Z-6b81a06b/manifest.json`.
