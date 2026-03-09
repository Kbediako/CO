---
id: 20260309-1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction
title: Coordinator Symphony-Aligned Control Bootstrap Assembly Extraction
status: draft
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
