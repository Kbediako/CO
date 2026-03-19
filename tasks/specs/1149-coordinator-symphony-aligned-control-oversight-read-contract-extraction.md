---
id: 20260313-1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction
title: Coordinator Symphony-Aligned Control Oversight Read Contract Extraction
status: completed
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md
related_tasks:
  - tasks/tasks-1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Control Oversight Read Contract Extraction

## Summary

Move the selected-run/dispatch/question read contract and its boundary-local payload types out of `telegramOversightBridge.ts` into a coordinator-owned oversight contract module after `1148`.

## Scope

- Coordinator-owned oversight read-contract boundary
- Selected-run/dispatch/question read interface ownership
- Boundary-local payload type ownership for dispatch/questions
- Rewiring of coordinator-owned service/facade plus Telegram consumer sites to use the extracted contract

## Out of Scope

- Telegram runtime lifecycle, polling, update handling, or projection delivery
- Read payload behavior changes
- Controller presentation changes
- New non-Telegram consumers
- Broader `controlServer` rewrites

## Notes

- 2026-03-13: Registered after `1148` completed. The next truthful seam is to move the read contract itself out of Telegram ownership so the coordinator-owned facade and read service no longer import `TelegramOversightReadAdapter` or related payload types from `telegramOversightBridge.ts`. Evidence: `out/1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction/manual/20260313T045000Z-closeout/14-next-slice-note.md`, `docs/findings/1149-control-oversight-read-contract-extraction-deliberation.md`.
- 2026-03-13: Pre-implementation local read-only review approved for docs-first registration. Evidence: `docs/findings/1149-control-oversight-read-contract-extraction-deliberation.md`.
- 2026-03-13: Docs-first registration completed with deterministic guards green (`spec-guard`, `docs:check`, `docs:freshness`) while keeping `docs/TASKS.md` within the archive threshold. The manifest-backed `docs-review` run failed at its own delegation guard before surfacing a concrete docs defect, so docs-review is recorded as an explicit override. A bounded delegated scout then confirmed the truthful next slice is coordinator-owned read-contract extraction only, not broader Telegram decoupling or bridge extraction. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T041500Z-docs-first/00-summary.md`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T041500Z-docs-first/05-docs-review-override.md`, `.runs/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/cli/2026-03-13T04-19-14-058Z-afd63eff/manifest.json`.
- 2026-03-13: Completed by moving the selected-run/dispatch/question read contract and boundary-local payload types into `controlOversightReadContract.ts`, then rewiring the coordinator-owned facade/read-service plus Telegram consumer sites to depend on that neutral contract instead of bridge-owned types. Focused final-tree regressions passed `4/4` files and `23/23` tests, the bounded review returned no findings, manual/mock evidence confirmed the neutral-contract import ownership, and deterministic guards (`delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, stacked-branch `diff-budget`, `pack:smoke`) are green. The only explicit non-green item is the recurring full-suite quiet-tail after visible `tests/cli-orchestrator.spec.ts` progress. Evidence: `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/00-summary.md`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/05b-targeted-tests.log`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/09-review.log`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/11-manual-oversight-read-contract-check.json`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/12-elegance-review.md`, `out/1149-coordinator-symphony-aligned-control-oversight-read-contract-extraction/manual/20260313T051126Z-closeout/13-override-notes.md`.
