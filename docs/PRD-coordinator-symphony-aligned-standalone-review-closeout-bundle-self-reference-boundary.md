# PRD - Coordinator Symphony-Aligned Standalone Review Closeout-Bundle Self-Reference Boundary

## Summary

`1110` closed repeated shell-probe drift, but the live review still failed to converge because it began rereading the active closeout bundle, especially the current `09-review.log` and nearby generated artifacts, instead of returning a bounded verdict on the touched code.

## Problem

- The current bounded review surface already guards heavy validation, startup-anchor drift, command-intent drift, low-signal drift, and broad meta-surface expansion.
- It does not yet treat the active closeout bundle for the same task as a self-referential review surface in diff mode.
- As a result, repo-wide searches or nearby artifact reads can still pull the reviewer back into the current `out/.../manual/*-closeout/` bundle and restart another low-signal loop.

## Goals

- Teach bounded diff review to treat reads of the current closeout bundle as a self-referential surface rather than ordinary inspection.
- Catch both direct reads and repo-wide searches that surface the active closeout bundle.
- Preserve legitimate manifest/runner-log audit surfaces and ordinary touched-file code inspection.

## Non-Goals

- Shell-probe parity changes beyond the completed `1110` seam.
- Broad review prompt redesign or native review replacement.
- General artifact bans unrelated to the active closeout bundle.
- Unrelated Symphony controller extraction work.

## User Value

- Standalone review stops wasting time rereading the active closeout bundle it is supposed to judge.
- Bounded diff review becomes more deterministic after a valid finding or inspection path has already been established.
- CO moves closer to the hardened Symphony-style posture: explicit boundaries, smaller reliable surfaces, and less self-referential drift.

## Acceptance Criteria

- In diff mode, reads of the current task’s `out/.../manual/*-closeout/` bundle count as self-referential review surfaces unless explicitly required by the current boundary mode.
- Repo-wide searches that surface those active closeout-bundle paths contribute to the same boundary.
- Legitimate startup-anchor/audit evidence (`MANIFEST`, `RUNNER_LOG`) still works.
- Focused regressions cover direct reads and search-driven closeout-bundle self-reference without reopening unrelated meta-surface work.
