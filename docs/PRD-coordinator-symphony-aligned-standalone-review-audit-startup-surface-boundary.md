# PRD - Coordinator Symphony-Aligned Standalone Review Audit Startup-Surface Boundary

## Summary

`1107` completed diff-mode startup anchoring, but audit-mode standalone review still has an asymmetric startup posture: it has prompt separation and sustained meta-surface guardrails, yet it does not enforce an early evidence-first startup boundary. That leaves room for audit review to front-load memory, skills, or review-doc reads before it anchors on the manifest or runner log.

## Problem

- Audit mode is intentionally different from diff mode because manifest and runner-log inspection are legitimate first steps.
- The wrapper already separates audit prompts from diff prompts and allowlists audit evidence surfaces, but startup ordering remains diff-only.
- Without an early audit startup boundary, the reviewer can still broaden into memory, skills, or review docs before it establishes any real audit evidence anchor.
- That broadening is smaller than the earlier diff problem, but it is now the next remaining asymmetry in review reliability.

## Goals

- Add a bounded audit startup-surface boundary that keeps bounded audit review evidence-first.
- Allow legitimate audit startup on manifest and runner-log surfaces without tripping false positives.
- Reject repeated off-surface startup reads such as memory, skills, or review docs before the first audit startup anchor.
- Keep the slice narrow and wrapper-local so Symphony-aligned control-shape work can continue afterward.

## Non-Goals

- Native review-controller replacement.
- Reopening diff-mode startup anchoring.
- Retuning low-signal or sustained meta-surface heuristics.
- Reopening prompt-only scope rendering or broader task-context slimming lanes.
- Product/controller extraction work.

## User Value

- Audit reviews become more predictable and evidence-led.
- The wrapper gets closer to a clean split between bounded review execution and broader optional context gathering.
- CO stays on the current hardened-wrapper path rather than forcing a broad review rewrite.

## Acceptance Criteria

- Bounded audit mode tracks whether an audit startup anchor has been observed.
- The active evidence manifest and active runner log remain valid bounded-audit startup anchors.
- Repeated pre-anchor off-surface reads of memory, skills, or review docs trigger the bounded audit startup boundary.
- Audit prompt guidance explicitly tells the reviewer to start from the active manifest or runner log before consulting memory, skills, or review docs.
- Focused regressions cover both triggering and non-triggering audit startup flows.
