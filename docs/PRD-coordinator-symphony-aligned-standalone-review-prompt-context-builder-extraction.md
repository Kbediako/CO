# PRD: Coordinator Symphony-Aligned Standalone Review Prompt Context Builder Extraction

## Summary

After the earlier standalone-review boundary splits, the remaining dense local seam in `scripts/run-review.ts` is the prompt/context support cluster that still resolves task docs, active closeout provenance, NOTES fallback, and surface-specific prompt scaffolding inline.

## Problem

`scripts/run-review.ts` currently mixes the review-launch shell with prompt/context support that is now large enough to be its own owner:

- task index and checklist resolution
- task-context extraction for audit and architecture review surfaces
- active closeout root resolution and provenance lines
- generated NOTES fallback
- prompt scaffolding for diff, audit, and architecture surfaces before runtime monitoring begins

That density keeps the wrapper harder to reason about even though the runtime, termination, and telemetry families have already been extracted into other helpers.

## Goal

Extract the remaining prompt/context support into a dedicated helper while preserving the exact bounded-review behavior, task-parent lookup behavior, architecture-context path collection, and active closeout provenance contract already covered by `tests/run-review.spec.ts`.

## Non-Goals

- changing runtime selection or Codex command resolution
- changing `ReviewExecutionState` ownership, telemetry, or termination boundaries
- changing scope-path collection, git diff metrics, or large-scope advisories
- changing review-execution launch, monitor, or artifact persistence behavior
- changing the review surface taxonomy or widening the standalone-review boundary set

## Success Criteria

- prompt/context support moves out of `scripts/run-review.ts` into a dedicated helper with a narrow API
- `scripts/run-review.ts` keeps the CLI/runtime shell and delegates task-context, NOTES fallback, and prompt scaffolding through the helper
- current prompt content stays stable for diff, audit, and architecture surfaces
- focused review-wrapper tests continue to pin task-context lookup, active closeout provenance, and surface-specific prompt behavior
