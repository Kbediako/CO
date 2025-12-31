# Technical Spec — Docs Freshness Systemization (Task 0922)

Source of truth for requirements: `tasks/0922-prd-docs-freshness-systemization.md`.

## Objective
Systemize a post-work docs freshness audit that verifies coverage, ownership, and review recency across all documentation sources.

## Scope
### In scope
- A docs registry that enumerates every doc in scope with ownership and last review metadata.
- A deterministic audit script (`docs:freshness`) that validates registry coverage and freshness thresholds.
- Pipeline integration so docs freshness runs after work completes (docs-review + implementation-gate).
- Report artifacts stored under `out/<task-id>/docs-freshness.json`.

### Out of scope
- Auto-editing or summarizing docs content.
- Changing doc authoring workflows outside metadata updates.
- Networked tooling or CI-only review automation that requires Codex auth.

## Design

### Registry file
- Proposed location: `docs/<docs-freshness-registry>.json`.
- Each entry:
  - `path` (repo-relative)
  - `owner` (string)
  - `status` (`active` | `archived` | `deprecated`)
  - `last_review` (YYYY-MM-DD)
  - `cadence_days` (integer)
  - `notes` (optional)
- Rules:
  - `active` docs must have a non-placeholder owner and `last_review` within `cadence_days`.
  - `archived` docs may be excluded from freshness checks but must still exist in the registry.
  - `deprecated` docs require a review cadence but can allow longer windows.

### Audit script
- Script: `scripts/<docs-freshness>.mjs`.
- Behavior:
  - Load registry; validate schema and required fields.
  - Enumerate docs under `.agent/`, `.ai-dev-tasks/`, `docs/`, and `tasks/`.
  - Ensure every doc in scope is present in the registry (no missing coverage).
  - Check that registry entries reference existing files.
  - Enforce freshness windows for `active` and `deprecated` docs.
  - Emit a JSON report to `out/<task-id>/docs-freshness.json` with pass/fail summaries.
- CLI:
  - planned npm script `docs:freshness` maps to `node scripts/docs-freshness.mjs --check`.

### Pipeline integration
- Add a `docs-freshness` stage to:
  - `docs-review` (post-change validation).
  - `implementation-gate` (post-implementation validation).
- Stage order: after `docs:check`, before `npm run review`.

### Rollout strategy
1. Phase 1: Registry scaffold with initial coverage + audit script in warn-only mode.
2. Phase 2: Enforce coverage (no missing docs in registry).
3. Phase 3: Enforce freshness windows for active docs; keep archived docs excluded.

## Testing Strategy
- Unit: registry schema validation and date calculations.
- Integration: planned npm script `docs:freshness` on a seeded registry.
- Pipeline: verify docs-review and implementation-gate include the new stage.

## Documentation & Evidence
- PRD: `docs/PRD-docs-freshness-systemization.md`
- Action Plan: `docs/ACTION_PLAN-docs-freshness-systemization.md`
- Task checklist: `tasks/tasks-0922-docs-freshness-systemization.md`
- Mini-spec: `tasks/specs/0922-docs-freshness-systemization.md`

## Open Questions (for review agent)
- What is the default freshness window for `active` docs?
- Do we require owners for `deprecated` docs, or allow a global owner?

## Approvals
- Engineering: Pending
- Reviewer: Pending
