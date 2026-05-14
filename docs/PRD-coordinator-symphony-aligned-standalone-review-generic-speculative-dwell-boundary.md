# PRD - Coordinator Symphony-Aligned Standalone Review Generic Speculative Dwell Boundary

## Summary

`1114` closed the file-targeted verdict-stability seam, but the latest live `npm run review` still drifted into broader generic speculative reasoning after the bounded diff had already stopped yielding concrete findings.

## Problem

- Bounded standalone review now stops repeated file-targeted speculative dwell and correctly ignores touched fixture file contents.
- The residual failure mode is broader: the reviewer can keep looping through conceptual hypotheses about small-diff revisit policy, generic follow-on ideas, or other non-concrete speculation without surfacing a new diff-local defect.
- That means `npm run review` still needs manual termination in a class of drift that does not fit the narrower file-output boundary from `1114`.

## Goals

- Add the next smallest truthful stop condition for repeated generic speculative dwell that no longer produces concrete diff-local findings.
- Preserve legitimate small-diff revisits when they continue surfacing concrete findings, file targets, or actionable evidence.
- Keep the change inside the existing standalone-review execution state and wait-loop architecture instead of broad prompt rewriting or native review replacement.

## Non-Goals

- Reopening the touched-fixture false-positive case already closed by `1114`.
- Native review replacement.
- Broad prompt-only reviewer behavior rewriting.
- Reopening helper-family or meta-surface classification work already closed by earlier slices.

## User Value

- Review reliability moves from a narrow file-targeted drift boundary toward a more complete terminal-verdict boundary.
- Operators get fewer manual review interrupts on small bounded diffs where the reviewer starts hypothesizing instead of producing findings.
- CO continues converging toward the hardened Symphony-like shape: explicit runtime boundaries, smaller trusted loops, and machine-checkable stop reasons.

## Acceptance Criteria

- A bounded-review trace that repeats generic speculative hypotheses without introducing new concrete findings or diff-local evidence terminates explicitly instead of idling to timeout.
- A parallel small-diff trace that revisits the same files but keeps surfacing concrete findings or actionable evidence does not trip the new boundary.
- The `1114` file-targeted verdict-stability boundary keeps its current behavior.
- Docs/task mirrors stay aligned and the standalone-review guide records the new stop-condition scope.
