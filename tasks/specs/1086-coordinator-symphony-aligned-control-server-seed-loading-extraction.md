---
id: 20260309-1086-coordinator-symphony-aligned-control-server-seed-loading-extraction
title: Coordinator Symphony-Aligned Control Server Seed Loading Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-seed-loading-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-seed-loading-extraction.md
related_tasks:
  - tasks/tasks-1086-coordinator-symphony-aligned-control-server-seed-loading-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Seed Loading Extraction

## Summary

Extract the five JSON seed reads from `ControlServer.start()` into one helper so the server method keeps token generation, seeded runtime assembly, request shell creation, bootstrap assembly, startup sequencing, and ready-instance return while seed hydration moves behind one bounded seam.

## Scope

- Add one helper that owns reading the control, confirmations, questions, delegation-tokens, and linear-advisory seed files.
- Delegate that seed-loading block from `ControlServer.start()`.
- Preserve current tolerant `ENOENT -> null` behavior and loaded payload shape exactly.

## Out of Scope

- Changes to token generation.
- Changes to seeded runtime assembly from `1084`.
- Changes to request-shell behavior from `1085`.
- Changes to bootstrap assembly or startup sequencing.
- Changes to route logic or shutdown ordering.
- Splitting seed loading into multiple helpers/files.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1085`. Evidence: `out/1085-coordinator-symphony-aligned-control-server-request-shell-extraction/manual/20260309T110955Z-closeout/14-next-slice-note.md`, `docs/findings/1086-control-server-seed-loading-extraction-deliberation.md`.
- 2026-03-09: Completed. `ControlServer.start()` now delegates the five tolerant startup seed reads through `orchestrator/src/cli/control/controlServerSeedLoading.ts`; focused seed-loading regressions passed `2/2` files and `4/4` tests, the full local suite passed `179/179` files and `1208/1208` tests, the manual seed-loading check confirmed all-missing `null` behavior plus preserved nested payload shape, pack-smoke passed on the final tree, and the only explicit non-green item is the standalone review wrapper override after it drifted into stale scout-manifest/checklist inspection instead of returning a bounded code verdict. The delegated `1086-...-scout` diagnostics manifest remains delegation evidence only because it failed on the stale pre-fix WIP tree before final validation. Evidence: `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/00-summary.md`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/05b-targeted-tests.log`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/11-manual-seed-loading-check.json`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/12-elegance-review.md`, `out/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction/manual/20260309T114157Z-closeout/13-override-notes.md`, `.runs/1086-coordinator-symphony-aligned-control-server-seed-loading-extraction-scout/cli/2026-03-09T11-34-54-316Z-d4918433/manifest.json`.
