# PRD - Coordinator Symphony-Aligned Standalone Review Shell-Probe Stop Condition

## Summary

`1109` finished exported-env startup propagation correctness, but bounded standalone review still has one reliability gap: after a diff-local shell-semantics issue is investigated with a direct external shell probe, the review can continue launching more shell experiments instead of returning a bounded verdict.

## Problem

- The current wrapper already blocks heavy validation, nested review orchestration, startup-anchor drift, command-intent drift, and low-signal inspection drift.
- None of those guards directly address repeated ad hoc shell verification commands such as `/bin/bash -lc '...'` or `/bin/zsh -lc '...'` that are launched to confirm shell semantics.
- In the `1109` live rerun, the reviewer found the real `export -n MANIFEST` issue, but then continued speculative shell experiments instead of converging to a bounded verdict.
- That leaves the review surface less deterministic than the Symphony-aligned posture we want: evidence-first, bounded, and willing to stop once the high-signal issue has been confirmed.

## Goals

- Add a bounded stop condition for repeated external shell-probe verification during standalone review.
- Allow one focused shell-probe cycle when bounded review genuinely needs it, but fail closed on repeated follow-on shell probes in the same run.
- Keep ordinary shell-wrapped file reads and valid startup-anchor commands allowed.
- Keep the change inside the existing standalone-review wrapper/state/test seams.

## Non-Goals

- Natural-language finding extraction or full “review understands every issue” parsing.
- General shell execution bans or broad command-policy redesign.
- Native review-controller replacement or prompt redesign.
- Broader Symphony controller extraction work.

## User Value

- Bounded review becomes more deterministic after diff-local shell verification work begins.
- Review time is spent surfacing actionable findings instead of spiraling into repeated shell experiments.
- CO moves closer to the hardened Symphony-like operational shape: bounded agents, explicit stop conditions, and cleaner authority surfaces.

## Acceptance Criteria

- In bounded review mode, the first direct external shell-probe verification command is tolerated.
- A repeated shell-probe verification command in the same run triggers a deterministic boundary failure with a review-wrapper reason instead of continuing speculative shell experimentation.
- Ordinary shell-wrapped file reads, audit startup-anchor reads, and other already-allowed review commands do not trip the new boundary.
- Focused regressions cover both the allowed first probe and the terminating repeated-probe path.
- `docs/standalone-review-guide.md` documents the shell-probe stop condition without broad workflow redesign.
