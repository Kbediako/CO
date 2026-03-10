---
id: 20260310-1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary
title: Coordinator Symphony-Aligned Standalone Review Startup-Anchor Boundary
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md
related_tasks:
  - tasks/tasks-1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md
---

# Task Spec - Coordinator Symphony-Aligned Standalone Review Startup-Anchor Boundary

## Summary

Add a diff-mode startup-anchor boundary so standalone review cannot front-load repeated memory/skills/manifest/review-artifact reads before it inspects the touched diff paths, and so those early broadenings cannot disappear from telemetry behind later nearby-code inspection.

## Scope

- Update `scripts/lib/review-execution-state.ts` with startup-anchor tracking and pre-anchor meta-surface accounting for diff-mode review.
- Update `scripts/run-review.ts` with explicit startup-anchor prompt guidance for diff-mode review.
- Add focused regression coverage in `tests/review-execution-state.spec.ts`.
- Add runtime wrapper regression coverage in `tests/run-review.spec.ts`.
- Keep docs/task mirrors aligned with the startup-anchor contract.

## Out of Scope

- Wrapper replacement or native review controller work.
- Broader audit-mode evidence changes.
- Reopening command-intent/heavy-command policy.
- Product/controller extraction work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the completed `1106` review trace, the final telemetry summary, and a direct local probe of `ReviewExecutionState`: the remaining defect is early diff-mode broadening before the first touched-path anchor, not shell-payload parser parity. Evidence: `docs/findings/1107-standalone-review-startup-anchor-boundary-deliberation.md`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/14-next-slice-note.md`, `.runs/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction-scout/cli/2026-03-10T04-17-31-957Z-da850ef8/review/output.log`, `.runs/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction-scout/cli/2026-03-10T04-17-31-957Z-da850ef8/review/telemetry.json`.
- 2026-03-10: Completed. Diff-mode review now enforces a real startup-anchor boundary before repeated memory/skills/review-docs/manifest/review-artifact reads can continue, repo-root-aware touched-path matching prevents same-suffix off-repo anchors, focused regressions passed `116/116`, the delegated diagnostics scout passed `190/190` files and `1287/1287` tests, and pack-smoke passed. The final live review attempt still drifted into speculative analysis instead of returning a bounded terminal verdict, so that remains an explicit wrapper override rather than an unrecorded correctness failure. Evidence: `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/00-summary.md`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/05-targeted-tests.log`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/05-test.log`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/09-review.log`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/10-pack-smoke.log`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/11-manual-startup-anchor-check.json`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/12-elegance-review.md`, `out/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary/manual/20260310T045656Z-closeout/13-override-notes.md`, `.runs/1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary-scout-final3/cli/2026-03-10T06-31-00-477Z-bef5e15d/manifest.json`.
