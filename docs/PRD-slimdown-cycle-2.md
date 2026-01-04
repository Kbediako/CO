# PRD - Slimdown Refactor Cycle 2 (Task 0102-slimdown-cycle-2)

## Problem Statement
- Post-Phase 6 closeout, the repo still carries unused entrypoints (scripts, pipelines, workflows) and extra indirection layers that increase maintenance cost and drift risk.
- Some CLI/internal scaffolding remains duplicated, making fixes harder to apply consistently.
- Packaging and workflow surfaces remain wider than necessary, increasing the chance of unused artifacts and CI drift.
- Cleanup must stay evidence-first and net-negative to avoid regressions or accidental removals of live paths.

## Target Outcomes
- Inventory and remove dead surface area with explicit evidence (repo/docs/workflow references + .runs usage checks).
- Remove low-risk indirection (barrels/shims) where fan-in is small and the API is internal-only.
- Consolidate internal CLI scaffolding without changing any user-facing flags, outputs, or pipeline IDs.
- Tighten packaging and workflow surfaces while preserving stable entrypoints and documentation references.
- Keep docs, checklists, and freshness registry in sync with evidence and manifests.

## Non-goals
- No changes to public CLI flags, default behavior, or user-facing strings.
- No renaming/removal of stable pipeline IDs without an explicit alias/deprecation window.
- No new dependencies or broad refactors; deletions and small mechanical consolidations only.
- No removal of still-referenced tooling (for example, `scripts/status-ui-build.mjs`).

## Success Metrics
- Net-negative diff for each deletion/refactor tranche (tranche = one deletion/refactor PR; docs-only and characterization-test PRs are exempt but still within diff budget).
- Evidence-backed deletions only (proof requirements by artifact type: pipelines/scripts = 2-part; workflows = 3-part).
- docs-review passes with updated registry entries.
- Guardrail chain remains green for any code changes.

## Constraints
- Keep diffs small and reviewable (one theme per PR).
- Prefer deletions over rewrites; avoid scope creep.
- Mirror task status across `docs/TASKS.md`, `tasks/`, and `.agent/task/` once manifests exist.
