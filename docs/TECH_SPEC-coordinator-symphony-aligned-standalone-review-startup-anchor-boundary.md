---
id: 20260310-1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary
title: Coordinator Symphony-Aligned Standalone Review Startup-Anchor Boundary
status: draft
owners:
  - Codex
created: 2026-03-10
last_review: 2026-03-10
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md
related_tasks:
  - tasks/tasks-1107-coordinator-symphony-aligned-standalone-review-startup-anchor-boundary.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Startup-Anchor Boundary

## Summary

Add a diff-mode startup-anchor boundary to standalone review so repeated pre-anchor reads of memory, skills, manifests, or review artifacts are tracked and rejected before the reviewer has inspected touched diff paths. Pair that with a prompt nudge that tells the reviewer to start from touched paths, scoped diff commands, or nearby changed code before reading meta surfaces.

## Scope

- Update `scripts/lib/review-execution-state.ts` with startup-anchor tracking for diff-mode reviews.
- Update `scripts/run-review.ts` prompt guidance for diff-mode startup behavior.
- Add focused coverage in `tests/review-execution-state.spec.ts`.
- Add runtime-facing regression coverage in `tests/run-review.spec.ts`.

## Out of Scope

- Native review-controller replacement.
- Broader audit-mode evidence changes.
- Heavy-command or validation-runner policy changes.
- Product/controller extraction work in `controlServer.ts`.

## Proposed Design

### 1. Startup-anchor state

Track whether diff-mode review has established a startup anchor. An anchor is established when the reviewer inspects touched diff paths or otherwise executes a diff-scoped command whose resolved inspection targets intersect the touched-path set. Audit mode and empty touched-path sets do not enable this guard.

### 2. Pre-anchor meta-surface budget

Before the startup anchor is established, keep a separate record of off-task meta-surface samples. Allow at most a tiny incidental budget; repeated pre-anchor meta-surface activity should trip a new startup-anchor boundary even if later normal inspection would otherwise evict those samples from the recent rolling meta-surface window.

### 3. Prompt alignment

In diff mode, add one explicit instruction telling the reviewer to start with touched paths, scoped `git diff`, or nearby changed-code reads before consulting memory, skills, manifests, or review artifacts.

### 4. Existing sustained guards stay authoritative

Keep the existing low-signal and sustained meta-surface guards in place. The new startup-anchor boundary only covers the early broaden-before-anchor behavior that the existing recent-window logic can miss.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`

## Risks

- Over-triggering on harmless one-off context reads before a legitimate diff anchor.
- Treating touched-path matching too narrowly and missing genuine early anchors.
- Accidentally applying the guard to audit-mode reviews that intentionally inspect manifests and runner logs first.

## Validation Plan

- Focused unit regressions for pre-anchor meta-surface reads, startup-anchor establishment, and post-anchor non-triggering flows.
- Runtime regression proving the diff-mode prompt contains the startup-anchor instruction.
- Preserve existing sustained meta-surface and command-intent classification coverage.
- Standard docs-first guard bundle before implementation.
