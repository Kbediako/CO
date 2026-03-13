---
id: 20260313-1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction
title: Coordinator Symphony-Aligned Control Server Ready Instance Lifecycle Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md
related_tasks:
  - tasks/tasks-1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Server Ready Instance Lifecycle Shell Extraction

## Summary

Extract the higher-order ready-instance lifecycle shell out of `controlServer.ts` after `1152` removed the remaining inline bootstrap start sequencing.

## Scope

- Ready-instance activation/orchestration ownership
- Rewiring of `controlServer.ts` to delegate pending-ready startup/rollback and owned shutdown orchestration
- Focused ready-instance lifecycle regression coverage

## Out of Scope

- Telegram bridge/runtime internals
- Route/controller decomposition or request-surface rewrites
- Bootstrap metadata schema or persistence-path changes
- Expiry lifecycle policy changes
- One-line helper-only churn

## Notes

- 2026-03-13: Registered after `1152` completed. The next truthful seam is the higher-order ready-instance lifecycle shell still inline in `ControlServer`, which owns pending instance request-shell binding, ready-instance startup rollback, and owned shutdown ordering after startup input prep and bootstrap start sequencing were extracted. Evidence: `out/1152-coordinator-symphony-aligned-control-server-bootstrap-start-sequencing-extraction/manual/20260313T074736Z-closeout/14-next-slice-note.md`, `docs/findings/1153-control-server-ready-instance-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1153-control-server-ready-instance-lifecycle-shell-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green (`spec-guard`, `docs:check`, `docs:freshness`). The initial manifest-backed `docs-review` failed at the pipeline's own delegation guard; after seeding a prefixed delegated diagnostics manifest, the rerun cleared delegation guard and deterministic stages but left a stale in-progress review manifest after repetitive docs-file and nearby-helper reinspection without a verdict, so docs-review is recorded as an explicit override. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T081150Z-docs-first/00-summary.md`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T081150Z-docs-first/07-docs-review-override.md`, `.runs/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/cli/2026-03-13T08-21-25-170Z-4039e389/manifest.json`, `.runs/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction-docs-guard/cli/2026-03-13T08-22-12-311Z-53e08e25/manifest.json`, `.runs/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/cli/2026-03-13T08-24-28-558Z-2aa8d3a1/manifest.json`.
- 2026-03-13: Closed as completed. The bounded review rerun caught a real shared-state regression in the initial extraction, which was repaired by sharing one `ControlServerOwnedLifecycleState` between request-shell reads and shutdown mutation. Final focused regressions passed `4/4` files and `104/104` tests; deterministic gates plus `pack:smoke` passed; explicit overrides remain for stacked-branch `diff-budget`, the recurring full-suite quiet-tail after visible `tests/cli-orchestrator.spec.ts` progress, and the final review-wrapper drift after the repaired tree was already green. Evidence: `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/00-summary.md`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/05b-targeted-tests.log`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/10-pack-smoke.log`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/11-manual-ready-instance-lifecycle-check.json`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/12-elegance-review.md`, `out/1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction/manual/20260313T084108Z-closeout/13-override-notes.md`.
