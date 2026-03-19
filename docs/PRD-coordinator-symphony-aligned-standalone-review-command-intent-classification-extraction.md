# PRD: Coordinator Symphony-Aligned Standalone Review Command-Intent Classification Extraction

## Summary

After `1214` extracted command-probe and heavy-command classification, the next truthful standalone-review helper boundary still inline in `scripts/lib/review-execution-state.ts` is the command-intent classification family that detects orchestration commands, direct validation runners, and package-script validation suites.

## Problem

`review-execution-state` still owns a deterministic command-intent classifier cluster that parses tool lines and shell segments, resolves binary launcher targets, distinguishes orchestration from direct validation intents, and formats violation labels. That logic is semantically separate from command-probe detection and remains inline inside the stateful review-boundary module.

## Goal

Extract the shared command-intent classification cluster from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening into command-probe classification, meta-surface analysis, startup-anchor handling, or `run-review.ts` runtime behavior.

## Non-Goals

- reopening command-probe / heavy-command work already closed in `1214`
- changing review-boundary counters, persistence, timeout logic, or state transitions
- widening into meta-surface, startup-anchor, relevant-reinspection, or runtime orchestration helpers
- changing review execution policy beyond moving the deterministic command-intent helpers

## Success Criteria

- the command-intent helper family is owned by a bounded helper seam
- `review-execution-state` keeps stateful policy ownership while reusing the extracted command-intent helper
- focused regressions prove orchestration-command detection, direct validation runner detection, package-script resolution, and violation-label formatting remain unchanged
