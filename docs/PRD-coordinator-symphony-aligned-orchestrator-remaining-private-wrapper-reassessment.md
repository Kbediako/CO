# PRD: Coordinator Symphony-Aligned Orchestrator Remaining Private Wrapper Reassessment

## Summary

After `1200`, the remaining nearby `orchestrator.ts` surface is mostly thin forwarding glue. The next truthful move is a bounded reassessment of that surface before forcing another extraction.

## Problem

The previously obvious resume-local seam is now closed. What remains around `orchestrator/src/cli/orchestrator.ts` is limited to:

- `executePipeline(...)`
- `runAutoScout(...)`
- `performRunLifecycle(...)`

Two of those look like straightforward forwarding wrappers into already-extracted services. Extracting them without a reassessment risks inventing a fake abstraction and broadening the lane without real Symphony alignment value.

## Goal

Reassess the remaining private wrapper ownership around `orchestrator.ts` and identify whether one bounded implementation seam still exists nearby or whether the correct result is an explicit no-op / stop signal.

## Non-Goals

- changing public `start()`, `resume()`, `status()`, or `plan()` behavior
- changing runtime selection or manifest mutation behavior
- changing control-plane lifecycle sequencing
- reopening the `1200` resume pre-start failure persistence seam
- extracting wrappers that are only thin pass-throughs without a real boundary benefit

## Success Criteria

- docs-first artifacts capture the reassessment boundary and the likely candidate seam
- the reassessment explicitly excludes `executePipeline(...)` and `runAutoScout(...)` unless new evidence proves otherwise
- the reassessment records whether `performRunLifecycle(...)` is the only plausible next implementation seam or whether no truthful nearby seam remains
