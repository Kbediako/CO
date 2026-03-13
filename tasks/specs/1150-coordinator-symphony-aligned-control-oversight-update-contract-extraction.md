---
id: 20260313-1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction
title: Coordinator Symphony-Aligned Control Oversight Update Contract Extraction
status: completed
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md
related_tasks:
  - tasks/tasks-1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Oversight Update Contract Extraction

## Summary

Move the update-side `subscribe(...)` contract used by Telegram bridge lifecycle out of the facade-specific surface into a coordinator-owned oversight update contract after `1149`.

## Scope

- Coordinator-owned oversight update contract boundary
- Projection-update `subscribe(...)` contract ownership
- Rewiring of `controlOversightFacade.ts` plus Telegram bridge lifecycle to use the extracted update contract

## Out of Scope

- Telegram runtime lifecycle, polling, projection delivery, or state-store behavior changes
- Read-contract or read-payload changes
- Controller presentation changes
- New non-Telegram consumers
- Broader `controlServer` rewrites

## Notes

- 2026-03-13: Registered after `1149` completed. The next truthful seam is to extract the remaining update-side `subscribe(...)` contract out of the facade-specific surface so Telegram bridge lifecycle can consume a neutral coordinator-owned update boundary. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/14-next-slice-note.md`, `docs/findings/1150-control-oversight-update-contract-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1150-control-oversight-update-contract-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green (`spec-guard`, `docs:check`, `docs:freshness`). The manifest-backed `docs-review` run failed at its own delegation guard before surfacing a concrete docs defect, so docs-review is recorded as an explicit override. Evidence: `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T053108Z-docs-first/00-summary.md`, `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T053108Z-docs-first/05-docs-review-override.md`, `.runs/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/cli/2026-03-13T05-43-19-850Z-0fdda032/manifest.json`.
- 2026-03-13: Completed the coordinator-owned update-contract move by adding `controlOversightUpdateContract.ts`, retargeting `controlOversightFacade.ts` and `controlTelegramBridgeLifecycle.ts` to the neutral read-plus-update seam, and serializing bridge `start()` / `close()` to prevent repeated-start leakage and in-flight close races surfaced during the bounded elegance pass. Final-tree focused regressions passed `4/4` files and `23/23` tests, deterministic guards passed (`delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, `pack:smoke`), and explicit overrides were recorded for the recurring full-suite quiet-tail and bounded review-wrapper drift. Evidence: `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T060724Z-closeout/00-summary.md`, `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T060724Z-closeout/05b-targeted-tests.log`, `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T060724Z-closeout/11-manual-oversight-update-contract-check.json`, `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T060724Z-closeout/12-elegance-review.md`, `out/1150-coordinator-symphony-aligned-control-oversight-update-contract-extraction/manual/20260313T060724Z-closeout/13-override-notes.md`.
