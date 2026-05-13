---
id: 20260410-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc
title: CO STATUS: clear stale retry state when active claims rehydrate so one issue cannot appear in both Running and Backoff
status: done
owner: Codex
created: 2026-04-10
last_review: 2026-05-12
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md
related_action_plan: docs/ACTION_PLAN-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md
related_tasks:
  - tasks/tasks-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md
review_notes:
  - 2026-04-10: Restarted from Linear issue `CO-145` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, confirming the issue is in active `Rework`, closing prior PR `#412`, deleting the prior workpad comment, recording the required same-turn `stay_serial` / `single_bounded_change` parallelization decision, and switching the detached workspace at `f75e702ea` onto branch `linear/co-145-clear-stale-retry-state-active-claims-rework`.
  - 2026-04-10: Pre-implementation issue-quality review confirms this is a claim-state source-of-truth lane, not mainly a renderer lane. `providerIssueHandoff.ts` has active-run rehydrate writes that clear `merge_closeout` but can still preserve stale retry metadata, while `providerIntakeState.ts` can carry forward existing retry fields by default.
  - 2026-04-10: The lane remains narrower than generic retry redesign. Real `resumable` / `handoff_failed` flows still need retry ownership preserved, and the fix should stay focused on stale retry metadata surviving authoritative running rehydrate.
  - 2026-04-10: The first rework `docs-review` child stream stopped only because the replay temporarily pushed `docs/TASKS.md` to `451` lines. After restoring the one-line budget trim, rerun `docs-review-rework-rerun` passed `spec-guard`, `docs:check`, `docs:freshness`, and forced standalone review cleanly. Manifest: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/manifest.json`.
  - 2026-04-10: The current shared-root intake artifact no longer preserves a live running claim with stale retry queue metadata, so focused regressions are now the authoritative reproducer and proof for the `CO-127` stale-shape contract while the fix remains at the claim-state source seam.
  - 2026-05-12: CO-523 live Linear audit verified CO-145 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-cb368f80-6d3e-4deb-b89b-4bd3577562cc.json.
---

# Technical Specification

## Context
The live `CO-127` shape is a claim inconsistency. One claim can be restored to `state: running` for a live run while still carrying stale retry metadata, which makes downstream runtime/dashboard slices truthfully render the same issue in both `Running` and `Backoff`.

## Requirements
1. Authoritative active-run rehydrate/upsert paths must clear stale `retry_queued`, `retry_due_at`, and `retry_error` unless the claim is still genuinely retry-owned.
2. True retry-owned flows such as `resumable` and `handoff_failed` must preserve retry semantics.
3. The source-of-truth fix must cover the observed stale retry metadata shape from `CO-127`.
4. STATUS/runtime projection should remain simple and source-of-truth driven; no renderer-only duplicate suppression should be required for this case.
5. Focused regression coverage must prove both the stale-retry fix and the preserved retry-owned behavior.

## Design
- Reuse or extend the existing retry-field clearing helper in `providerIssueHandoff.ts` for active-run rehydrate writers.
- Tighten any `providerIntakeState.ts` defaulting behavior that still permits stale retry metadata to survive on a running claim.
- Keep the change additive and bounded to claim behavior; do not change renderer selection logic except where tests need to assert the corrected source state.

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
- Expected tests:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIntakeState.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`

## Protected Expectations
- Preserve real retry/backoff behavior for genuine retry-owned claims.
- Keep the renderer and STATUS projection thin.
- Do not reopen `CO-112`, `CO-138`, or fallback-row identity work.

## Reject These Wrong Interpretations
- `fix the duplication only in the renderer`
- `clear retry state for all non-retry claims without considering resumable or handoff-failed flows`
- `fold merge-closeout cleanup or fallback-row cleanup into this lane`

## Current Truth
- `providerIssueHandoff.ts` rehydrate writers already clear `merge_closeout` but not all stale retry metadata.
- `providerIntakeState.ts` can preserve retry metadata from the existing claim when incoming writes do not explicitly supersede it.
- runtime/dashboard layers already mostly reflect the underlying claim truth, which is why the same issue can currently appear in both sections.
- The current shared-root intake artifact no longer contains the original stale-shape claim, so tests rather than live local intake JSON are the authoritative rework reproducer.

## Proposed Design
- Explicitly clear retry metadata on authoritative running rehydrate writes.
- Preserve or reapply retry metadata only on paths that are intentionally retry-owned.
- Add focused regressions covering the stale retry rehydrate shape and continued retry queue behavior for genuine retry-owned claims.

## Non-Goals
- Renderer dedupe heuristics.
- EVENT provenance work.
- Merge-closeout stale-claim cleanup beyond this stale retry seam.

## Parity / Alignment Matrix
- Current truth:
  - one claim can look both running and retry-queued after rehydrate
- Reference truth:
  - authoritative running rehydrate should supersede stale retry queue state
- Target truth / intended delta:
  - running claims clear stale retry metadata unless still genuinely retry-owned
- Explicitly out-of-scope differences:
  - renderer-only suppression and unrelated claim cleanup

## Not Done If
- A running rehydrated claim can still carry stale retry metadata.
- True retry-owned flows stop projecting to Backoff correctly.
- Tests do not cover the `CO-127` stale-retry rehydrate shape.

## Validation Plan
- `linear child-stream --pipeline docs-review`
- Focused `ProviderIssueHandoff`, `ProviderIntakeState`, and `ControlRuntime` regressions
- Full repo validation floor before review handoff

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream `docs-review-rework-rerun` (`succeeded`, `clean-success`)
- Manifest: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/manifest.json`
- Override note: This rerun supersedes the earlier temporary `docs/TASKS.md` line-budget stop. See `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/run-summary.json`.
- Date: 2026-04-10
