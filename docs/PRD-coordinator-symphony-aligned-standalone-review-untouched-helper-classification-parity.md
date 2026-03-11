# PRD - Coordinator Symphony-Aligned Standalone Review Untouched Helper Classification Parity

## Summary

`1112` closed the active closeout-root provenance rediscovery gap, but the live review still briefly expanded into untouched adjacent review-owned helper surfaces such as `scripts/lib/review-scope-paths.ts` after the provenance hint was already present.

## Problem

- Bounded standalone review now knows the active closeout roots up front.
- It still treats some untouched adjacent review-owned helper files used by standalone review as ordinary nearby inspection surfaces instead of the same review-support meta-surface family as `run-review` itself.
- That lets review spend time re-deriving wrapper support behavior after the bounded diff has already been understood.

## Goals

- Extend standalone review's review-support classification to the smallest set of untouched adjacent review-owned helper files that still cause repeat drift after `1112`.
- Preserve legitimate reads of touched diff files even when those files are part of the review-support helper family.
- Keep explicit audit evidence, startup-anchor behavior, and closeout provenance handling unchanged.

## Non-Goals

- Another prompt or handoff rewrite after `1112`.
- Broad helper/history bans across unrelated scripts.
- Native review replacement or broader Symphony controller extraction.
- Reopening active closeout-bundle policy from `1111`.

## User Value

- Standalone review becomes more decisive on bounded diffs instead of wandering into untouched wrapper helper internals.
- CO moves closer to the hardened Symphony-like posture: explicit seams, smaller trusted surfaces, and less meta-level re-derivation.
- Review reliability improves without penalizing real diffs that intentionally touch helper files.

## Acceptance Criteria

- Untouched adjacent review-owned helper files that exist only to support standalone review classification/path handling are treated with the same review-support parity as the existing `run-review` and `review-execution-state` support surfaces.
- Touched diff reads of those same helper files remain normal in-scope diff inspection and are not reclassified as off-task meta-surface drift.
- Focused tests prove untouched helper parity and touched-helper preservation.
- Docs/task mirrors stay aligned, and the next live manifest-backed review no longer needs another closeout/provenance rewrite to converge.
