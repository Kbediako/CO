---
id: 20260313-1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop
title: Coordinator Symphony-Aligned Telegram Projection Notification Interleaving Backstop
status: draft
owners:
  - Codex
created: 2026-03-13
last_review: 2026-03-13
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop.md
related_tasks:
  - tasks/tasks-1142-coordinator-symphony-aligned-telegram-projection-notification-interleaving-backstop.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Telegram Projection Notification Interleaving Backstop

## Summary

Add a direct regression backstop for the bridge-owned interleaving semantics between Telegram update-offset handling and projection-notification patch application after `1141`.

## Current State

After `1141`, the production shape is correct and narrower:

1. the controller consumes only `pushState`,
2. the push helper returns a bridge-applied patch,
3. the bridge preserves `next_update_id` and keeps top-level `updated_at` monotonic when merging that patch.

What remains thin is proof, not architecture. The current bridge tests prove send/pending/flush behavior and seeded `next_update_id` preservation, but they do not directly pin the overlap case where update handling and projection notification both touch persisted bridge state in close succession.

## Proposed Design

### 1. Add one direct bridge-level interleaving backstop

Introduce one focused regression test path around `telegramOversightBridge.ts` that simulates:

- a projection notification starting from one bridge state,
- update handling advancing `next_update_id` / `updated_at`,
- final projection patch application merging back into the current bridge state,
- persisted state proving both invariants survive.

### 2. Keep production edits minimal and evidence-driven

Default expectation: tests only.

If the new backstop exposes a real defect, allow only the smallest production fix required to preserve:

- `next_update_id` ownership in the bridge,
- monotonic top-level `updated_at`,
- unchanged push dedupe/cooldown/send semantics.

### 3. Avoid reopening extraction scope

This lane should not introduce another controller/helper extraction. It is a regression-proof slice for the already-thinned Telegram bridge seam.

## Risks

- Accidentally broadening a proof lane into another bridge refactor.
- Introducing brittle test machinery that is more coupled than the runtime seam itself.
- Reopening the already-closed `1141` state-contract boundary instead of pinning it.

## Validation Plan

- Focused targeted Telegram bridge regressions as the primary proof surface.
- Full suite rerun after any production or test changes.
- Standard docs/pack/review lane validation.
