# PRD - Coordinator Symphony-Aligned Standalone Review Active Closeout-Root Provenance Hint

## Summary

`1111` closed direct rereads of the active closeout bundle, but the live review still failed to converge because it began re-deriving how the wrapper chooses active closeout roots by inspecting helper code and repo-wide `out/*/manual/*-closeout` listings instead of returning a bounded verdict.

## Problem

- The bounded review surface now blocks direct active-closeout rereads and search-result surfacing of those same bundle paths.
- It still leaves the reviewer to rediscover active closeout-root selection logic even though `run-review` has already resolved `activeCloseoutBundleRoots`.
- That provenance-only exploration broadens into helper/history context without producing a diff-local conclusion.

## Goals

- Surface the already-resolved active closeout root set in the diff-mode handoff so reviewers do not need to rediscover it.
- Reuse the existing root-resolution path instead of introducing a second provenance resolver.
- Preserve legitimate touched-file inspection and explicit audit evidence handling.

## Non-Goals

- Reopening active closeout-bundle matching from `1111`.
- Broad helper/history bans unrelated to closeout-root provenance.
- Native review replacement, unrelated Symphony controller work, or broader prompt redesign beyond the active-closeout provenance note.

## User Value

- Standalone review spends less time rediscovering wrapper internals it already knows.
- Bounded diff review becomes more decisive because the already-resolved active closeout provenance is surfaced up front.
- CO moves closer to the hardened Symphony-style posture: explicit state ownership, smaller trustworthy surfaces, and less meta-level re-derivation.

## Acceptance Criteria

- Diff-mode prompt or handoff text includes a short active closeout provenance note when roots are resolved.
- That note uses the same resolved root set already enforced at runtime, including delegated parent-task fallback and `TODO-closeout` plus latest completed closeout behavior.
- The note frames those paths as already-resolved self-referential surfaces so reviewers do not need to re-derive or re-enumerate them unless directly necessary.
- Focused regressions cover direct task, delegated parent-task inheritance, and `TODO-closeout` plus latest completed closeout handling without widening review scope.
