# PRD - Coordinator Symphony-Aligned Standalone Review Run-Review Spec Whole-File Probe Truthfulness

## Summary

`1117` closed ambient fake-Codex env leakage in `tests/run-review.spec.ts`, but its saved whole-file probe only captured the default Vitest startup banner and was treated as likely determinism drift. Fresh local reruns now show the full file terminates cleanly, so the next truthful slice is not a spec split but a validation-evidence correction.

## Problem

- `1117` and its follow-on note treated startup-banner-only default-reporter evidence as if `tests/run-review.spec.ts` remained non-deterministic.
- Fresh current-tree reruns now show `npx vitest run tests/run-review.spec.ts` and `npx vitest run tests/run-review.spec.ts --reporter=verbose` both terminate successfully at `101/101`.
- That means the remaining issue is evidence quality and truthful validation posture, not a proven monolithic test defect.
- Leaving the stale determinism claim in task/docs mirrors would misroute the next slice and fossilize a false problem statement.

## Goals

- Replace stale whole-file determinism claims with current reporter-aware terminal evidence.
- Record the canonical whole-file validation command and expected quiet default-reporter behavior.
- Keep the next slice docs/evidence only unless fresh reporter-aware reruns surface a real harness or product defect.

## Non-Goals

- Reopening `tests/run-review.spec.ts`, `scripts/run-review.ts`, or `scripts/lib/review-execution-state.ts`.
- Tail-splitting `tests/run-review.spec.ts` based on stale evidence.
- Native review replacement or broader prompt/wrapper redesign.
- Historical artifact rewrites beyond bounded corrections and superseding notes.

## User Value

- Review-reliability work stays evidence-backed instead of chasing a stale defect theory.
- Future slices can focus on real remaining noise rather than misclassifying quiet reporter behavior as non-determinism.
- CO stays aligned with the Symphony-like posture we want: current evidence wins, contracts stay explicit, and follow-on seams are chosen from verified behavior.

## Acceptance Criteria

- Task/docs artifacts no longer claim `tests/run-review.spec.ts` remains non-deterministic without current reporter-aware terminal evidence.
- The canonical whole-file validation evidence records successful current-tree runs for both the default and verbose reporters.
- The old startup-banner-only probe is treated as non-diagnostic rather than proof of a monolithic defect.
- No harness or product code changes land in this slice.
