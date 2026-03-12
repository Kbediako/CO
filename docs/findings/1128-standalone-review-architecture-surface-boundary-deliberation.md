# 1128 Deliberation - Standalone Review Architecture Surface Boundary

- Date: 2026-03-12
- Task: `1128-coordinator-symphony-aligned-standalone-review-architecture-surface-boundary`

## Why this slice

- Recent review-reliability work materially improved bounded `diff` and `audit` behavior, but the remaining drift is broader architectural reasoning leaking into diff review rather than pure historical-log drift.
- The wrapper currently exposes `diff` and `audit`, but there is no explicit surface for broader design/context review.
- `git show <rev>:<path>` currently behaves like a valid diff startup anchor, which blurs the line between touched-diff anchoring and broader historical inspection.

## In Scope

- Add one explicit `architecture` review surface.
- Keep `diff` default and bounded.
- Keep `audit` evidence-focused.
- Tighten startup-anchor handling for `git show <rev>:<path>`.

## Out of Scope

- Native review replacement or broad wrapper rewrite.
- Reopening `1098`/`1099` path-rendering/parser work.
- Generic new heuristics not attached to an explicit surface contract.
- Product/controller refactors outside review tooling.

## Recommendation

- Proceed with one bounded review-surface slice that makes architecture review explicit instead of implicit.
- Preserve the current centralized runtime authority in `ReviewExecutionState`.
- Treat this as the next truthful reliability seam before broader review redesign decisions.
