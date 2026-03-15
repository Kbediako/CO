# PRD: Coordinator Symphony-Aligned Standalone Review Shell Command Parser Primitives Extraction

## Summary

After `1210` closed the shell-env helper support-family parity gap, the next truthful standalone-review seam is the shared shell-command parser cluster still embedded inside `scripts/lib/review-execution-state.ts`.

This lane is the output of the required post-`1210` docs-first reassessment, not an automatic parity follow-on: the reassessment found a sharper shared parser substrate than the previously named operand/path-normalization or shell-traversal candidates.

## Problem

`review-execution-state` currently owns a shared parser family for shell-control segmentation, token normalization, env-assignment stripping, `env` unwrap handling, shell truthiness inference, and shell-command payload extraction. That parser cluster is reused by multiple boundary families:

- heavy-command detection
- shell-probe detection
- command-intent parsing
- meta-surface parsing
- startup-anchor parsing
- inspection-target extraction

The parser logic is now a cross-cutting shared seam, but it is still inline inside a boundary-policy module rather than owned by a bounded helper.

## Goal

Extract the shared shell-command parser primitives from `scripts/lib/review-execution-state.ts` into a bounded helper without widening into boundary-policy changes, shell-env interpretation, or `run-review` runtime work.

## Non-Goals

- changing command-intent, shell-probe, meta-surface, startup-anchor, or heavy-command policy thresholds
- changing shell-env interpretation already owned by `scripts/lib/review-shell-env-interpreter.ts`
- changing review wrapper runtime behavior in `scripts/run-review.ts`
- reshaping output-summary or telemetry-family helpers

## Success Criteria

- the shared shell-command parser primitives are owned by a bounded helper seam
- existing `review-execution-state` policy analyzers reuse that helper without behavior drift
- focused regressions prove the extracted parser preserves current shell segmentation, launcher unwrap, and payload parsing behavior
