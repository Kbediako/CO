---
id: 20260310-1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction
title: Coordinator Symphony-Aligned Authenticated Route Branch Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md
related_tasks:
  - tasks/tasks-1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Authenticated Route Branch Shell Extraction

## Summary

Extract the remaining authenticated-route branch shell from `controlServer.ts` while preserving current auth gating, branch ordering, handled-route dispatch, and protected `404 not_found` behavior.

## Scope

- Extract the authenticated-route shell from `controlServer.ts`.
- Preserve `authenticatedControlRouteGate.ts` and `controlAuthenticatedRouteController.ts` behavior.
- Add focused regression coverage for auth failure, handled routes, and protected `404` outcomes.
- Keep public/UI-session/Linear ordering unchanged.

## Out of Scope

- Changing auth, CSRF, or runner-only policy.
- Changing authenticated controller route implementations.
- Broader router/middleware abstraction work.
- Review-wrapper follow-on work beyond the completed `1095` slice.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1092` next-slice note plus a bounded `gpt-5.4` scout confirming the remaining seam is the authenticated-route branch shell, not a broader router refactor. Evidence: `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T150731Z-closeout/14-next-slice-note.md`, `docs/findings/1096-authenticated-route-branch-shell-extraction-deliberation.md`.
- 2026-03-10: Completed. `controlServer.ts` now delegates the terminal authenticated branch to `controlServerAuthenticatedRouteBranch.ts`, focused regressions passed (`3/3` files, `101/101` tests), the full suite passed (`185/185` files, `1244/1244` tests), pack-smoke passed, and the live review returned a bounded no-findings verdict. Evidence: `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/00-summary.md`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/05-targeted-tests.log`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/05-test.log`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/09-review.log`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/10-pack-smoke.log`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/13-override-notes.md`.
