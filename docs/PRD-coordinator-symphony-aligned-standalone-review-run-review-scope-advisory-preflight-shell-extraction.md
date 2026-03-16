# PRD: Coordinator Symphony-Aligned Standalone Review Run-Review Scope Advisory Preflight Shell Extraction

## Summary

After `1222`, the next truthful standalone-review implementation seam is the remaining pre-launch scope assessment and scope-advisory block still owned by [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts).

## Problem

`run-review.ts` still owns one cohesive pre-launch scope/advisory contract that sits above artifact preparation and runtime launch:

- resolving the effective review scope mode for `--commit`, `--base`, and uncommitted reviews
- collecting path-only scope hints from git status/diff output
- assessing large uncommitted review scope using file-count and line-count thresholds, including untracked file lines
- logging scope metrics and large-scope console warnings
- appending large-scope prompt guidance before the review launch

Leaving that block inline keeps `run-review.ts` responsible for lower-level scope/advisory preflight policy that no longer belongs beside artifact preparation, non-interactive handoff, runtime resolution, and final telemetry/reporting.

## Goal

Extract the pre-launch scope assessment and scope-advisory preflight shell from `scripts/run-review.ts` into a dedicated standalone-review helper while preserving current scope-note wording, large-diff thresholds, metric logging, and advisory prompt behavior.

## Non-Goals

- changing artifact preparation, non-interactive handoff, or runtime command resolution
- reopening the already-extracted launch-attempt shell in `scripts/lib/review-launch-attempt.ts`
- changing large-scope thresholds, git data sources, or prompt wording semantics
- widening the lane into monitor/timeouts or final closeout/reporting orchestration

## Success Criteria

- the scope/advisory preflight block is extracted behind a dedicated helper/module
- `run-review.ts` keeps higher-level orchestration ownership for prompt context assembly, artifact/handoff setup, runtime selection, live monitor messaging, and final telemetry persistence
- focused regressions prove scope-note rendering, rename/copy identity preservation, large-scope advisory emission, and untracked-line counting remain behavior-preserving
