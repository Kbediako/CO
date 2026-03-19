---
id: 20260311-1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary
title: Coordinator Symphony-Aligned Standalone Review Diff-Local Concrete Progress Evidence Boundary
status: completed
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md
related_tasks:
  - tasks/tasks-1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Diff-Local Concrete Progress Evidence Boundary

## Summary

Keep standalone-review concrete-progress evidence sourcing inside the touched diff/current review output so the reviewer does not widen into repo-wide citation/pattern hunts after `1115`.

## Scope

- Tighten the bounded diff-review prompt contract in `scripts/run-review.ts`.
- Add focused runtime-facing coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md`.
- Keep docs/task mirrors aligned.

## Out of Scope

- Reopening `1115` generic speculative-dwell detection.
- Changing `scripts/lib/review-execution-state.ts` concrete-progress classification without new contradictory evidence.
- Historical closeout/log/task drift work already closed by earlier slices.
- Native review replacement.
- Broad prompt-only reviewer rewrites.

## Notes

- 2026-03-11: Approved for docs-first registration based on the completed `1115` closeout, its explicit next-slice note, and the final-tree review trace showing the remaining drift now sits in repo-wide citation/pattern hunting to justify concrete same-diff progress after the broader speculative-dwell seams were already closed. The existing `1115` state layer already accepts touched-path citations with explicit locations as concrete progress, so this next slice is prompt/runtime contract tightening rather than another state heuristic. Evidence: `docs/findings/1116-standalone-review-diff-local-concrete-progress-evidence-boundary-deliberation.md`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/00-summary.md`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/09-review.log`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/13-override-notes.md`, `out/1115-coordinator-symphony-aligned-standalone-review-generic-speculative-dwell-boundary/manual/20260311T092917Z-closeout/14-next-slice-note.md`.
- 2026-03-11: Completed. The bounded diff-review prompt now explicitly treats touched-path citations with locations as sufficient concrete same-diff progress and tells the reviewer not to search the wider repo for more examples of that rendering. Focused prompt/runtime regressions passed `1/1` each, preserved `1115` state parity stayed green at `94/94`, the saved prompt artifact carries the new contract, and the forced final-tree `npm run review` no longer reopened manifests/closeout bundles or global memory/skills surfaces before timing out after `180s` inside adjacent review-support seams without surfacing a concrete `1116` defect. `npm run test` hit the known quiet-tail after reaching the large CLI suite, so the lane records that as an explicit override rather than overstating a clean full-suite pass. Evidence: `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/00-summary.md`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05a-prompt-contract-test.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05b-runtime-citation-contract-test.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05c-review-execution-state.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/05-test.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/09-review.log`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/11-manual-diff-local-citation-contract-check.json`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/12-elegance-review.md`, `out/1116-coordinator-symphony-aligned-standalone-review-diff-local-concrete-progress-evidence-boundary/manual/20260311T103412Z-closeout/13-override-notes.md`.
