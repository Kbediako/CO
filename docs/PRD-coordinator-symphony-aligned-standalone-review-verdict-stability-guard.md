# PRD - Coordinator Symphony-Aligned Standalone Review Verdict Stability Guard

## Summary

`1113` closed the real review-owned helper parity gap, but the latest live `npm run review` still drifted into verbose speculative dwell after the concrete same-slice defects were already fixed.

## Problem

- Bounded standalone review now has stronger helper-family classification, startup-anchor handling, and closeout provenance shaping.
- The residual failure mode is not another missing helper or meta-surface rule. Instead, the reviewer can keep producing speculative no-progress output after the bounded diff has stopped yielding new concrete findings.
- That leaves the wrapper waiting for timeout or manual termination instead of returning an explicit reliability verdict.

## Goals

- Add a small verdict-stability guard so bounded standalone review terminates explicitly when repeated speculative expansion no longer introduces new diff-relevant signals.
- Reuse the existing review execution state / wait-loop architecture instead of reopening prompt-only rewrites or a native-review replacement.
- Preserve legitimate long-form review progress when the reviewer is still surfacing new concrete targets, commands, or findings.

## Non-Goals

- Another helper-family classification slice after `1113`.
- Broad prompt or persona rewriting for review.
- Native review replacement.
- Reopening broader Symphony controller extraction work.

## User Value

- Review failures become explicit and machine-checkable instead of ending in long ambiguous dwell.
- CO moves closer to a hardened Symphony-like operator surface: decisive boundaries, explicit stop conditions, and smaller trusted loops.
- Future downstream operators get more reliable review behavior without supervising a speculative stall manually.

## Acceptance Criteria

- A synthetic bounded-review trace that keeps producing verbose speculative inspection without new diff-relevant signals terminates with an explicit verdict-stability / no-progress reason instead of idling to timeout.
- A parallel simulated trace that continues introducing new concrete review signals does not trip the new guard.
- Existing low-signal, meta-surface, startup-anchor, command-intent, and shell-probe boundaries keep their current behavior.
- Docs/task mirrors stay aligned and the new stop condition is documented in the standalone-review guide.
