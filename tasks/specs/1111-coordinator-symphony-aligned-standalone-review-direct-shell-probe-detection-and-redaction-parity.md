---
id: 20260311-1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity
title: Coordinator Symphony-Aligned Standalone Review Direct Shell-Probe Detection and Redaction Parity
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md
related_tasks:
  - tasks/tasks-1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Direct Shell-Probe Detection and Redaction Parity

## Summary

Close the direct env-probe parity gap left by `1110` and shrink shell-probe failure output to a redacted inner probe sample so bounded review cannot bypass the new stop condition simply by avoiding a shell wrapper.

## Scope

- Update `scripts/lib/review-execution-state.ts` so direct non-shell-wrapped probe commands can count as shell probes.
- Keep shell-probe boundary reasons centered on a smaller probe sample rather than the full wrapper command line.
- Add focused coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Self-referential review-output drift.
- Broad shell parser expansion or native review replacement.
- Reopening the shell-wrapped repetition logic already completed in `1110`.
- Broader Symphony controller extraction work.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1110` closeout, the explicit next-slice note, and the live review drift around direct `printenv` parity and raw shell-probe failure rendering. Evidence: `docs/findings/1111-standalone-review-direct-shell-probe-detection-and-redaction-parity-deliberation.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/13-override-notes.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/14-next-slice-note.md`, `out/1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition/manual/20260311T021705Z-closeout/09-review.log`.
