---
id: 20260311-1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary
title: Coordinator Symphony-Aligned Standalone Review Generic Speculative Dwell Boundary
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md
related_tasks:
  - tasks/tasks-1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Generic Speculative Dwell Boundary

## Summary

Add a bounded generic-speculative-dwell detector so standalone review exits explicitly when the reviewer keeps hypothesizing without surfacing new concrete diff-local findings.

## Scope

- Extend `scripts/lib/review-execution-state.ts` with a broader generic speculative-dwell detector.
- Add focused state-level and runtime-facing coverage.
- Touch `scripts/run-review.ts` only if surfaced wording or termination plumbing must change.
- Keep docs/task mirrors aligned.

## Out of Scope

- Reopening the touched-fixture false-positive case from `1114`.
- Native review replacement.
- Broad prompt-only reviewer rewrites.
- Other helper-family or meta-surface semantics changes.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1114` closeout, its explicit next-slice note, and the final-tree review trace showing a broader generic speculative loop after the file-output boundary already held. Evidence: `docs/findings/1115-standalone-review-generic-speculative-dwell-boundary-deliberation.md`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/00-summary.md`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/10-review.log`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/14-override-notes.md`, `out/1114-coordinator-symphony-aligned-standalone-review-verdict-stability-guard/manual/20260311T081855Z-closeout/15-next-slice-note.md`.
