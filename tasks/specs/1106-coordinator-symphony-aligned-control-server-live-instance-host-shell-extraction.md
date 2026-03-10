---
id: 20260310-1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction
title: Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
related_tasks:
  - tasks/tasks-1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Live-Instance Host Shell Extraction

## Summary

Extract only the pending ready-instance host shell from `ControlServer.start()` into one same-file private helper that returns the fully started `ControlServer`, while preserving the already-extracted request-shell binding and ready-instance startup sequencing contracts.

## Scope

- Update `controlServer.ts` to delegate pending instance construction, callback bridge assembly, and ready-instance startup handoff through one same-file private helper.
- Keep request-shell binding and ready-instance startup sequencing on their existing extracted seams.
- Add focused coverage for live request-shell reads, bootstrap callback mutation, and fail-closed cleanup over the same instance.
- Keep docs/task mirrors aligned with the extracted helper contract.

## Out of Scope

- Seed loading changes.
- Seeded runtime assembly changes.
- Request-shell binding behavior changes.
- Ready-instance startup helper behavior changes.
- `close()` shutdown ordering changes.
- Review-wrapper work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1105` closeout evidence plus bounded scout confirmation that the remaining seam is the pending instance host shell inside `ControlServer.start()`, and that it should stay a same-file `private static` helper rather than a new exported module. Evidence: `docs/findings/1106-control-server-live-instance-host-shell-extraction-deliberation.md`, `out/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction/manual/20260310T041150Z-closeout/14-next-slice-note.md`.
- 2026-03-10: Completed. `ControlServer.start()` now delegates the remaining pending live-instance host shell to `startPendingReadyInstance(...)`, focused regressions passed `99/99`, the delegated diagnostics scout passed `190/190` files and `1273/1273` tests, standalone review returned a clean diff-local verdict, and pack-smoke passed. Evidence: `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/00-summary.md`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/05-targeted-tests.log`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/05-test.log`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/09-review.log`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/10-pack-smoke.log`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/11-manual-live-instance-host-shell-check.json`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/12-elegance-review.md`, `out/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction/manual/20260310T041640Z-closeout/13-override-notes.md`, `.runs/1106-coordinator-symphony-aligned-control-server-live-instance-host-shell-extraction-scout/cli/2026-03-10T04-17-31-957Z-da850ef8/manifest.json`.
