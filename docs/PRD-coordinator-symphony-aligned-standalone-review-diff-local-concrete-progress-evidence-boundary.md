# PRD - Coordinator Symphony-Aligned Standalone Review Diff-Local Concrete Progress Evidence Boundary

## Summary

`1115` closed the generic targetless speculative-dwell seam, but the final live `npm run review` still widened into repo-wide citation-pattern hunting to justify concrete same-diff progress instead of staying inside the touched review surface.

## Problem

- Bounded standalone review now stops both repeated file-targeted speculative dwell (`1114`) and repeated targetless speculative no-progress dwell (`1115`).
- The remaining failure mode is narrower: when the reviewer tries to reason about whether concrete same-diff findings are valid, it can still search beyond the touched diff for citation-style path examples instead of concluding from diff-local evidence.
- The state layer already accepts citation-style touched-path findings with explicit locations as concrete progress; the missing piece is that the bounded diff-review prompt does not tell the reviewer that this shape is already sufficient.
- That leaves the review truthful but still inefficient, and it keeps `npm run review` vulnerable to timeout on small bounded diffs even after the broader drift classes were closed.

## Goals

- Keep concrete-progress evidence sourcing inside the touched diff and current review output.
- Prevent repo-wide citation/pattern hunts from becoming the next low-signal review loop.
- Preserve legitimate same-diff concrete findings with explicit touched-path locations.
- Keep the change bounded to the bounded diff-review prompt/runtime contract rather than adding another state heuristic or broad native-review replacement.

## Non-Goals

- Reopening `1115` generic targetless speculative-dwell detection.
- Reopening historical closeout/log/task drift work already closed by earlier slices.
- Changing the accepted citation-style concrete-progress shapes already established in `1115`.
- Native review replacement.
- Broad repo-wide review prompt redesign.

## User Value

- Review loops terminate sooner and more honestly on small bounded diffs.
- Operators get fewer manual interrupts from low-signal repo-wide proof hunting.
- CO moves closer to a hardened Symphony-like shape: explicit diff-local authority, bounded controller state, and auditable stop reasons.

## Acceptance Criteria

- The saved bounded diff-review prompt explicitly states that concrete same-diff progress can be shown by citing touched paths with explicit locations (`path:line`, `path:line:col`, `path#Lline`, `path#LlineCcol`) and that repo-wide example hunts for that rendering are unnecessary.
- A bounded review that previously widened into repo-wide citation/pattern hunts now stays diff-local or otherwise no longer times out on that trace.
- A bounded review that surfaces concrete touched-path findings with explicit locations from the touched diff/current review output still avoids verdict-stability drift.
- `1114` and `1115` behavior stays intact.
- Docs/task mirrors stay aligned and the standalone-review guide reflects the tightened diff-local concrete-progress boundary.
