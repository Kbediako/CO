# PRD: Coordinator Symphony-Aligned Standalone Review Command-Probe Classification Extraction

## Summary

After `1213` extracted the inspection-target parsing seam, the next truthful standalone-review helper boundary inside `scripts/lib/review-execution-state.ts` is the deterministic shell-probe and heavy-command classification cluster still reused by review-command-line analysis.

## Problem

`review-execution-state` still owns a pure command-probe prefilter cluster that tokenizes shell segments, walks nested payloads, distinguishes explicit `grep` search targets from flags, detects shell-probe environment-variable heuristics, and identifies heavy review commands. That logic is deterministic and locally cohesive, but it remains inline inside the stateful review-boundary module.

## Goal

Extract the shared shell-probe and heavy-command classification cluster from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening into command-intent policy, meta-surface analysis, startup-anchor handling, or runtime changes.

## Non-Goals

- reopening inspection-target parsing work already closed in `1213`
- changing command-intent, meta-surface, startup-anchor, verdict-stability, or summary-state policy
- widening into `run-review.ts` runtime, prompt, or telemetry behavior
- changing review-boundary counters, persistence, or timeout logic

## Success Criteria

- the deterministic shell-probe and heavy-command classification cluster is owned by a bounded helper seam
- `review-execution-state` keeps stateful policy ownership while reusing the extracted classifier helper
- focused regressions prove nested payload probe detection, `grep` option parsing, env-var probe heuristics, and heavy-command detection behavior remain unchanged
