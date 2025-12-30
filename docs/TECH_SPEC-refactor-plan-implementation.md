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
- Extend `scripts/docs-hygiene.ts --sync` to fully manage `docs/TASKS.md` and `.agent/task/*.md` mirrors.
- Deprecate legacy MCP wrappers with a single shared resolver entrypoint.

#### Phase 2: Structural consolidation
- Reduce overlap between `orchestrator/` and `packages/orchestrator/` (merge or rename for clarity).
- Collapse `packages/shared` where it is only used internally.

#### Phase 3: Optional modularization
- Move optional modules into dynamic imports or standalone packages.
- Preserve compatibility with feature flags and shims during transition.

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
- Which optional modules are actively used and must remain in the default runtime?
- How should checklist managed blocks be introduced to avoid docs-hygiene failures?

## Approvals
- Engineering: Pending
- Reviewer: Pending
