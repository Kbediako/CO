---
id: 20260309-1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction
title: Coordinator Symphony-Aligned Control Bootstrap Assembly Extraction
status: completed
owners:
  - Codex
created: 2026-03-09
last_review: 2026-03-09
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md
related_tasks:
  - tasks/tasks-1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Bootstrap Assembly Extraction

## Summary

Extract the remaining bootstrap collaborator assembly from `ControlServer.start()` into one helper so the server shell keeps bind/listen plus top-level startup handling while expiry lifecycle and Telegram bridge bootstrap lifecycle construction move behind one bounded seam.

## Scope

- Add one helper that assembles the expiry lifecycle plus the Telegram bridge bootstrap lifecycle.
- Delegate that assembly from `ControlServer.start()`.
- Preserve collaborator wiring, closures, and bootstrap sequencing exactly.

## Out of Scope

- `persistControlBootstrapMetadata(...)` changes.
- HTTP bind/listen or base URL derivation changes.
- Deep changes inside lifecycle helpers already extracted.
- Splitting expiry assembly and Telegram bridge bootstrap assembly into separate helpers/files.

## Notes

- 2026-03-09: Approved for docs-first registration as the next bounded Symphony-aligned slice after `1081`. Evidence: `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/14-next-slice-note.md`, `docs/findings/1082-control-bootstrap-assembly-extraction-deliberation.md`.
- 2026-03-09: Completed. `ControlServer.start()` now delegates expiry lifecycle plus Telegram bridge bootstrap assembly through `orchestrator/src/cli/control/controlBootstrapAssembly.ts`, the manifest-backed `1082-...-scout` diagnostics sub-run succeeded, focused regressions passed `4/4` files and `8/8` tests, the full local suite passed `175/175` files and `1190/1190` tests, and the remaining explicit non-green item is the timed-out standalone review wrapper override. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/00-summary.md`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/11-manual-bootstrap-assembly-check.json`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/13-override-notes.md`, `.runs/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction-scout/cli/2026-03-09T07-46-01-007Z-3683c0a9/manifest.json`.
