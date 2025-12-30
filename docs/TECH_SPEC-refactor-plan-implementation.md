# Technical Spec - Refactor Plan Implementation (Task 0920)

Source of truth for requirements: `tasks/0920-prd-refactor-plan-implementation.md`.

## Overview
- Objective: Execute the refactor plan with defined phases, guardrails, and evidence capture.
- In Scope:
  - Pipeline DRY consolidation.
  - Checklist mirror automation.
  - Legacy wrapper consolidation and deprecation.
  - Optional module modularization (phased).
- Out of Scope:
  - Manifest schema changes without a compatibility window.
  - Removal of downstream `packages/*` without deprecation.

## Architecture & Design

### Current State
- Pipelines are defined in both `codex.orchestrator.json` and `orchestrator/src/cli/pipelines/*`.
- Multiple MCP wrapper scripts resolve the CLI independently.
- Checklist mirrors are manual across `tasks/`, `docs/`, and `.agent/`.
- Optional modules (control-plane, scheduler, sync, learning) are embedded in the core runtime.

### Proposed Changes

#### Phase 1: Quick wins
- Consolidate pipeline stage definitions via shared templates or single-source configuration.
  - Add `stageSets` to `codex.orchestrator.json` and expand them in the config loader before pipeline resolution.
- Extend `scripts/docs-hygiene.ts --sync` to manage checklist mirrors even when `docs/TASKS.md` sections predate managed markers.
- Deprecate legacy MCP wrappers with a single shared resolver entrypoint (thin shell helpers only).

#### Phase 2: Structural consolidation
- Reduce overlap between `orchestrator/` and `packages/orchestrator/` by tightening the public surface:
  - Export handle-service types from `packages/orchestrator/src/index.ts` and update CLI imports to avoid deep package paths.
- Collapse `packages/shared` where it is only used internally:
  - Move `packages/shared/streams/stdio.ts` into packages/orchestrator/src/exec/stdio.ts.
  - Keep a compatibility re-export in `packages/shared/streams/stdio.ts` during the transition.

#### Phase 3: Optional modularization
- Move optional modules into dynamic imports to avoid eager loading:
  - Gate `orchestrator/src/learning/*` behind a lazy import in `orchestrator/src/cli/exec/learning.ts`.
- Preserve compatibility with feature flags and shims during transition:
  - Keep `LEARNING_PIPELINE_ENABLED` semantics unchanged.
  - Maintain shim exports for relocated shared utilities until downstream usage is updated.

## Data Persistence / State Impact
- Preserve manifest and checklist evidence paths during refactors.
- Maintain `.runs/<task-id>/cli/<run-id>/manifest.json` contract.

## External Dependencies
- Node 20 runtime, Codex CLI, existing pipeline tooling.

## Operational Considerations
- Failure Modes:
  - Pipeline mismatches across sources.
  - Legacy wrapper removal breaking older workflows.
  - Checklist automation drift if managed blocks are missing.
- Observability:
  - Use implementation-gate manifests for evidence.

## Testing Strategy
- Use `implementation-gate` per phase.
- Add targeted tests for pipeline resolution and docs-hygiene sync logic.
- Manual smoke checks for legacy wrapper behavior during deprecation window.

## Documentation & Evidence
- PRD: `docs/PRD-refactor-plan-implementation.md`
- Action Plan: `docs/ACTION_PLAN-refactor-plan-implementation.md`
- Refactor Plan: `docs/REFRACTOR_PLAN.md`

## Open Questions
- Optional modules usage still needs downstream confirmation; in-repo usage indicates:
  - Control-plane + scheduler run on every CLI pipeline.
  - Learning is gated by `LEARNING_PIPELINE_ENABLED`.
  - Cloud sync worker is not wired in CLI paths (no in-repo references).
- Checklist managed blocks are now inserted during docs-hygiene sync when legacy sections are detected; confirm if reviewers want manual checkpoints.

## Approvals
- Engineering: Pending
- Reviewer: Pending
