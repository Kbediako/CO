# PRD: Coordinator Symphony-Aligned Standalone Review Meta-Surface Boundary Analysis Extraction

## Summary

After `1215` extracted command-intent classification, the next truthful standalone-review helper boundary still inline in `scripts/lib/review-execution-state.ts` is the meta-surface and startup-anchor interpreter cluster that classifies off-scope review surfaces, tracks pre-anchor drift, and distinguishes valid startup anchors from self-referential rereads.

## Problem

`review-execution-state` still owns a large deterministic interpreter cluster that parses meta-surface tool lines, shell command segments, output lines, startup-anchor progress, audit env rebinding, and active closeout reread boundaries before the stateful review policy reacts. That pure analysis logic is now the largest remaining helper family still mixed into the stateful boundary owner.

## Goal

Extract the bounded meta-surface boundary analysis cluster from `scripts/lib/review-execution-state.ts` into a shared helper module without widening into review-boundary counters, persistence, timeout handling, relevant-reinspection policy, or `run-review.ts` runtime behavior.

## Non-Goals

- reopening command-probe or command-intent work already closed in `1214` and `1215`
- changing shell-env interpreter ownership, command parsing primitives, or prompt-context handling outside the extracted helper boundary
- changing review-boundary counters, startup-budget thresholds, persistence, telemetry, or termination policy
- widening into verdict-stability, relevant-reinspection, low-signal, or summary-builder helpers

## Success Criteria

- the meta-surface/startup-anchor interpreter family is owned by a bounded helper seam
- `review-execution-state` keeps stateful review-boundary ownership while reusing the extracted analyzer
- focused regressions prove meta-surface classification, startup-anchor boundary detection, audit rebinding handling, and active closeout reread behavior remain unchanged
