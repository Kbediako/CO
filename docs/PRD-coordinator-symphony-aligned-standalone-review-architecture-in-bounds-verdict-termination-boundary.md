# PRD - Coordinator Symphony-Aligned Standalone Review Architecture In-Bounds Verdict Termination Boundary

## Summary

`1128` established an explicit `architecture` review surface and a dedicated runtime `architecture-context` family for canonical task docs. The remaining live gap is narrower: under Codex CLI `0.114.0`, an architecture-mode review can stay fully in-bounds, reread the same canonical docs plus touched implementation files, and still run until the global wrapper timeout with no verdict.

## Problem

The current wrapper has multiple termination boundaries:
- meta-surface expansion,
- heavy-command blocking,
- startup-anchor enforcement,
- verdict-stability,
- relevant reinspection dwell.

Those boundaries now prevent the earlier off-surface and evidence-audit drift, but they do not terminate the specific failure mode seen in the final `1128` rerun:
- the review stayed on canonical architecture docs and the touched implementation/test files,
- telemetry recorded repeated command starts and review progress,
- no heavy commands or meta-surface violations occurred,
- the review still timed out after `300s` without producing a verdict.

That means the remaining issue is not review-surface selection anymore. It is the absence of a deterministic in-bounds no-verdict boundary for architecture review.

## Goals

- Terminate repetitive in-bounds architecture review loops before the global wrapper timeout.
- Reuse the existing review-runtime boundary model instead of inventing a new review subsystem.
- Keep `architecture` broader than `diff`, but still deterministic and auditable.
- Preserve current `diff` and `audit` behavior unless the new boundary work proves a safe shared improvement.
- Keep the fix small, testable, and aligned with the Symphony-style explicit capability approach.

## Non-Goals

- Reopening the `architecture` surface contract from `1128`.
- Reintroducing a historical closeout-archive boundary based on the stale pre-fix run.
- Replacing the wrapper with a native review controller in this slice.
- Broad prompt changes or new generic review heuristics unrelated to the observed timeout loop.
- Product/controller refactors outside standalone review tooling.

## User Value

- Architecture review becomes reliably usable instead of timing out after long speculative rereads.
- Operators can trust that a broader design review either returns a verdict or fails with a narrow, explicit no-verdict boundary.
- The wrapper moves closer to a Symphony-like posture where review capabilities are explicit, bounded, and composable instead of depending on patience and luck.

## Acceptance Criteria

- The final `0.114.0` architecture-mode failure pattern from `1128` is reproduced in a focused regression and then terminated earlier by the new boundary.
- Repeated in-bounds rereads of canonical architecture docs plus touched implementation paths trip a deterministic boundary before the global review timeout.
- `diff` and `audit` contracts remain unchanged unless a shared tightening is both necessary and explicitly covered by tests.
- Focused tests cover the new boundary at both wrapper and execution-state levels.
- Docs/task mirrors explain that the remaining architecture-review gap shifted from off-surface drift to in-bounds no-verdict termination.
