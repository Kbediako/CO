---
id: 20260310-1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction
title: Coordinator Symphony-Aligned Linear Webhook Branch Shell Extraction
status: completed
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md
related_tasks:
  - tasks/tasks-1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction.md
---

# Task Spec - Coordinator Symphony-Aligned Linear Webhook Branch Shell Extraction

## Summary

Extract the inline `/integrations/linear/webhook` route shell from `controlServer.ts` into one controller-owned branch entrypoint while keeping `linearWebhookController.ts` ownership and request-entry ordering unchanged.

## Scope

- Update `controlServer.ts` to delegate the Linear webhook branch shell.
- Add one controller-owned branch entrypoint for pathname detection and controller-input assembly.
- Add focused coverage for the extracted helper seam.
- Keep docs/task mirrors aligned with the new route-shell contract.

## Out of Scope

- deeper `linearWebhookController.ts` logic changes beyond the new branch entrypoint.
- Public/UI/authenticated route ordering changes.
- Broader router abstractions.
- Review-wrapper replacement work.

## Notes

- 2026-03-10: Approved for docs-first registration based on the `1099` closeout evidence, the existing `1096` next-slice note pointing back to the inline `/integrations/linear/webhook` branch after the review-reliability detour, and a bounded scout confirming the tighter boundary is a controller-owned entrypoint inside `linearWebhookController.ts`, not another route-helper layer. Evidence: `docs/findings/1100-linear-webhook-branch-shell-extraction-deliberation.md`, `out/1099-coordinator-symphony-aligned-standalone-review-structured-scope-path-rendering-boundary/manual/20260310T011110Z-closeout/14-next-slice-note.md`, `out/1096-coordinator-symphony-aligned-authenticated-route-branch-shell-extraction/manual/20260309T182942Z-closeout/14-next-slice-note.md`.
- 2026-03-10: Completed. `controlServer.ts` now delegates the Linear webhook branch decision directly to `handleLinearWebhookRequest`, which owns the pathname gate and returns a handled/fallthrough boolean while preserving the existing webhook behavior and route ordering. Focused webhook regressions passed `5/5`, the final full suite passed `185/185` files and `1259/1259` tests, the bounded standalone review returned a clean diff verdict, and pack-smoke passed. Evidence: `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/00-summary.md`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/05-targeted-tests.log`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/05-test.log`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/09-review.log`, `out/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction/manual/20260310T015301Z-closeout/10-pack-smoke.log`, `.runs/1100-coordinator-symphony-aligned-linear-webhook-branch-shell-extraction-scout/cli/2026-03-10T01-53-09-159Z-d0f5e6cc/manifest.json`.
