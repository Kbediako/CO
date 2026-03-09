# PRD - Coordinator Symphony-Aligned Standalone Review Diff/Audit Surface Split

## Summary

After the earlier standalone-review drift guards, the remaining reliability problem is prompt-surface conflation: the default bounded review path still asks one reviewer invocation to judge changed code, docs mirroring, checklist/evidence state, and closeout/audit posture at the same time. This slice splits the default review surface into:

- `diff` review as the default bounded code-review surface
- `audit` review as an explicit opt-in evidence/docs validation surface

The goal is to keep bounded review truly diff-local by default while preserving a separate path for broader control-plane audit work.

## Problem

- `scripts/run-review.ts` currently injects task checklist context, PRD summary, manifest evidence, and explicit docs/evidence verification bullets into the same prompt used for bounded code review.
- That mixed prompt contract keeps encouraging broader task-lane inspection even when the wrapper is supposed to review only changed files and nearby dependencies.
- `ReviewExecutionState` can detect and terminate drift after it starts, but it does not change the upstream cause: the review prompt still mixes code review and audit review.
- Recent closeouts show the same pattern repeatedly:
  - `1060`: speculative meta inspection and extra validation activity
  - `1085`: closeout mirror/evidence reinspection
  - `1091`: historical logs and unrelated helper traversal

## Goals

- Make diff-local review the default standalone-review surface.
- Keep audit/evidence/docs verification available, but behind an explicit separate surface.
- Preserve the current thin-wrapper architecture unless new evidence later proves a native review controller is necessary.
- Align the review posture more closely with Symphony-style surface separation: runtime/control on one path, observability/audit on another.

## Non-Goals

- Rewriting standalone review into a new native review controller in this slice.
- Replacing existing runtime drift guards; those remain useful backstops.
- Broadly redesigning the review CLI beyond the bounded surface split.
- Automating closeout mirroring or task completion decisions.

## User-Facing Outcome

- `npm run review` / `codex-orchestrator review` defaults to a cleaner diff-only review surface.
- Broader checklist/docs/evidence verification becomes an explicit `audit` review path instead of being silently mixed into every review.
- Review results become faster, more bounded, and less likely to drift into historical logs or unrelated helper files when the goal is code review.
