---
id: 20260311-1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint
title: Coordinator Symphony-Aligned Standalone Review Active Closeout-Root Provenance Hint
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md
related_tasks:
  - tasks/tasks-1112-coordinator-symphony-aligned-standalone-review-active-closeout-root-provenance-hint.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Active Closeout-Root Provenance Hint

## Summary

Extend bounded standalone review so the diff-mode handoff discloses the already-resolved active closeout roots, reducing provenance rediscovery after `run-review` has already resolved them.

## Scope

- Update `scripts/run-review.ts` so diff-mode handoff or prompt shaping discloses the resolved active closeout root set.
- Add focused coverage in `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and keep docs/task mirrors aligned.

## Out of Scope

- Reopening direct active closeout-bundle reread classification from `1111`.
- Broad helper-policy or history-policy redesign.
- `scripts/lib/review-execution-state.ts` classification changes unless a tiny formatting helper extraction is unavoidable.
- Unrelated Symphony controller extraction work.

## Proposed Design

### 1. Surface the resolved active closeout roots

Use the existing `resolveActiveCloseoutBundleRoots(...)` result to emit a short active closeout provenance note in the diff-mode review handoff.

### 2. Reuse the runtime-owned resolver

Do not re-derive provenance in a second place. The handoff text should reflect the same resolved roots already used by the runtime boundary work from `1111`.

### 3. Keep the wording self-limiting

Frame the note as an already-resolved self-referential surface so it discourages re-derivation instead of inviting more closeout rereads.

## Files / Modules

- `scripts/run-review.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- If the wording is too path-forward, it could invite more closeout rereads instead of preventing them.
- If the handoff re-derives provenance separately from the existing resolver, prompt output can drift from runtime behavior.
- If mixed with a general helper-surface redesign, the lane will lose the bounded shape proven by `1111`.

## Validation Plan

- Wrapper-facing regressions for direct task, delegated parent-task inheritance, and `TODO-closeout` plus latest completed closeout handling in the diff-mode handoff text.
- Docs-first guards before implementation, then the bounded validation lane plus review/pack smoke at closeout.
