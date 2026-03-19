# PRD: Coordinator Symphony-Aligned Standalone Review Inspection Target Parsing Pipeline Extraction

## Summary

After `1212` extracted the shared operand/path normalization seam, the next truthful standalone-review helper boundary inside `scripts/lib/review-execution-state.ts` is the deterministic inspection-target parsing pipeline still reused by command-line, narrative, and touched-path-aware inspection analysis.

## Problem

`review-execution-state` still owns a four-function inspection-target parsing cluster that normalizes command text, walks nested shell payloads, resolves touched-path matches, and falls back to generic file-like targets. That cluster is deterministic and reused across multiple inspection-signal analyzers, but it remains inline inside the stateful review-boundary module.

## Goal

Extract the shared inspection-target parsing pipeline from `scripts/lib/review-execution-state.ts` into a bounded helper module without widening into stateful review-boundary policy or runtime changes.

## Non-Goals

- reopening operand/path normalization work already closed in `1212`
- changing command-intent, shell-probe, startup-anchor, verdict-stability, or summary-state policy
- widening into shell-env traversal or shell-command parser ownership
- changing `scripts/run-review.ts` runtime, prompt, or telemetry behavior

## Success Criteria

- the deterministic inspection-target parsing cluster is owned by a bounded helper seam
- `review-execution-state` keeps stateful policy ownership while reusing the extracted parsing helper
- focused regressions prove touched-path prioritization, nested payload parsing, and generic fallback behavior remain unchanged
