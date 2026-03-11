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
related_tasks:
  - tasks/tasks-1111-coordinator-symphony-aligned-standalone-review-direct-shell-probe-detection-and-redaction-parity.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Direct Shell-Probe Detection and Redaction Parity

## Summary

Extend standalone review shell-probe detection so direct env-probe commands are classified with the same bounded semantics already used for shell payloads, and reduce shell-probe failure output to a redacted inner probe sample rather than the full wrapper command line.

## Scope

- Update `scripts/lib/review-execution-state.ts` so direct non-shell-wrapped probe commands can count as shell probes.
- Introduce a bounded shell-probe sample formatter that returns the inner probe segment without raw wrapper/path noise.
- Keep `scripts/run-review.ts` on the existing shell-probe boundary flow unless the message-formatting seam proves a wrapper change is required.
- Add focused coverage in `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and task mirrors.

## Out of Scope

- Self-referential review-output drift.
- Broad shell parser expansion.
- Native review replacement or broader review-policy redesign.
- Unrelated Symphony controller work.

## Proposed Design

### 1. Reuse probe semantics for direct commands

When a normalized review command line does not expose a shell payload, attempt bounded direct-command probe classification against the tokenized command itself. Reuse the existing probe heuristics instead of creating a second unrelated classifier.

### 2. Return probe-focused samples

Replace the raw full-line shell-probe sample with a smaller formatted sample centered on the probe segment or direct probe command. That sample should be path-light and stable enough for boundary failure messages and telemetry.

### 3. Preserve existing `1110` behavior

Do not regress:

- shell-wrapped touched-file inspection,
- valid audit startup-anchor reads,
- mixed probe-plus-read detection,
- nested shell probe detection,
- file-targeted `grep` remaining ordinary inspection.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Over-broad direct-command classification could start counting ordinary direct inspection as shell probes.
- Over-tight redaction could make boundary failures too vague to debug.
- If direct-probe parity and self-referential output-surface drift are mixed together, the slice will lose its bounded shape.

## Validation Plan

- Focused state regressions for direct `printenv` and similar bounded direct-probe forms.
- Wrapper-facing regressions proving direct probe repetition terminates bounded review.
- Coverage proving shell-probe failure output shows the smaller probe sample instead of the full raw wrapper string.
- Docs-first guards before implementation, then the bounded validation lane plus review/pack smoke at closeout.
