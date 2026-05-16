---
id: 20260516-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa
title: CO-516 reconcile provider-intake terminal merge closeout truth
relates_to: docs/PRD-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md
risk: high
owners:
  - Codex
last_review: 2026-05-16
related_action_plan: docs/ACTION_PLAN-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md
task_checklists:
  - tasks/tasks-linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md
---

# TECH_SPEC Mirror - CO-516 reconcile provider-intake terminal merge closeout truth

This mirror intentionally matches `tasks/specs/linear-089348e9-a67f-4cf0-a9f5-a55bd885f0aa.md` for docs-surface discoverability.

## Objective
Reconcile provider-intake claims that retain stale review-handoff or merge-closeout metadata after the PR is merged and Linear is terminal, while preserving historical audit details and excluding terminal evidence from active non-release alarms.

## Scope
- provider-intake claim reconciliation for terminal merged/Done closeout
- active/non-release classification for retained terminal closeout claims
- focused provider handoff/projection regression coverage
- docs-first packet and registry mirrors

## Key Requirements
- Detect claims with terminal merged closeout evidence and live terminal Linear truth.
- Refresh stale issue state metadata for retained terminal claims when fresh terminal truth is available.
- Convert terminal completed claims to a non-active hygiene state or classify them with terminal evidence so active non-release alarms exclude them.
- Preserve `review_promotion` / `merge_closeout` audit details.
- Add CO-492 / PR #793-style In Review -> Merging -> Done regression coverage.
- Do not mutate Linear, GitHub, live control-host state files, `goal_evidence`, manifest serialization, or dispatch pilot config.

## Fallback / Refactor Decision
This lane removes stale terminal closeout metadata authority while retaining provider-intake closeout audit rows as a durable historical evidence contract. A narrow fix is acceptable because terminal merged/Done truth is the missing authority boundary and the lane does not introduce a new launch path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terminal closeout metadata | Cached `Merging` / stale non-terminal issue fields survive after merged PR plus Linear `Done`. | `remove fallback` | CO-516 | Live terminal issue truth is available for a claim with merged closeout evidence. | Existing provider closeout behavior | 2026-05-16 | This issue | Claim state/summary no longer treats cached non-terminal closeout metadata as active authority. | Focused provider-intake closeout regression. |
| Retained closeout audit row | Historical `review_promotion` / `merge_closeout` evidence remains on non-active claims. | `justify retaining fallback` | Provider-intake control-host | Claim has terminal closeout history after PR merge/Done. | Existing provider-intake retention behavior | 2026-05-16 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows. | Regression asserts audit fields remain present while active counts exclude the claim. |

## Validation Plan
- Focused provider handoff/intake regression for terminal merged/Done closeout.
- Projection/status regression if active alarm classification changes.
- Spec guard, build, lint, focused tests, and diff budget.
