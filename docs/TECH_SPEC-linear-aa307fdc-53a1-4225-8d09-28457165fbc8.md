---
id: 20260410-linear-aa307fdc-53a1-4225-8d09-28457165fbc8
title: CO STATUS: stop synthetic linear-* task-id fallback rows from rendering as running issues
relates_to: docs/PRD-linear-aa307fdc-53a1-4225-8d09-28457165fbc8.md
risk: high
owners:
  - Codex
last_review: 2026-04-10
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-aa307fdc-53a1-4225-8d09-28457165fbc8.md`
- PRD: `docs/PRD-linear-aa307fdc-53a1-4225-8d09-28457165fbc8.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-aa307fdc-53a1-4225-8d09-28457165fbc8.md`
- Task checklist: `tasks/tasks-linear-aa307fdc-53a1-4225-8d09-28457165fbc8.md`

## Traceability
- Linear issue: `CO-146` / `aa307fdc-53a1-4225-8d09-28457165fbc8`
- Linear URL: https://linear.app/asabeko/issue/CO-146/co-status-stop-synthetic-linear-task-id-fallback-rows-from-rendering

## Summary
- Objective: stop fallback-only provider-worker task ids such as `linear-<uuid>` from surfacing as running issue identifiers in `CO STATUS`.
- Scope:
  - rebind fallback-only sources to canonical tracked or claim-backed issue identity when available
  - suppress fallback-only synthetic sources from running issue presentation when no canonical identity exists
  - add focused regressions for selected and discovered fallback shapes
- Constraints:
  - keep underlying run and manifest diagnostics available
  - avoid reopening EVENT provenance or retry-state work
  - keep renderer changes minimal and projection-first

## Implementation Boundary
- Identity repair:
  - treat `issue_identifier` / `issue_id` values that are only fallback `linear-*` task ids as non-authoritative
  - prefer tracked issue or matched intake-claim identity when building projection contexts
- Running-source admission:
  - suppress fallback-only synthetic identities from current running issue activity
  - preserve canonical provider-worker rows and non-provider rows with explicit identity
- Presentation:
  - let compatibility and operator presenters consume repaired upstream identity rather than inventing a new renderer-only filter

## Design
- Add a bounded fallback-identity classifier around task-id-derived `linear-*` identities.
- Rebind projection context identity from tracked issue or matched provider claim when the manifest lacks canonical issue identity.
- Tighten running-source authority checks so fallback-only synthetic identities do not enter the running issue table.
- Keep fallback task ids as lookup aliases or debug-adjacent values where useful.

## Validation
- `linear child-stream --pipeline docs-review`
- Focused regressions in:
  - `orchestrator/tests/SelectedRunProjection.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/CompatibilityIssuePresenter.test.ts` if projection grouping behavior changes
- Full repo validation floor before review handoff

## Approvals
- Reviewer: audited `docs-review` child stream completed cleanly
- Date: 2026-04-10
