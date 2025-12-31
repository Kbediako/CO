# Technical Spec — Implementation Docs Archive Allowlist (Task 0927)

Source of truth for requirements: `tasks/0927-prd-implementation-docs-archive-allowlist.md`.

## Objective
Add allowlist controls to the implementation-docs archive policy so specified tasks or document paths are exempt from archiving.

## Scope
### In scope
- Extend the policy file with allowlist fields.
- Update the archiver to skip allowlisted docs and report the skip reason.
- Keep registry and stub behavior unchanged for non-allowlisted docs.

### Out of scope
- Changing archive branch or workflow behavior.
- Adding new doc categories outside the existing policy patterns.
- Auto-merging archive PRs.

## Design

### Archive policy allowlist
- Policy file: `docs/implementation-docs-archive-policy.json`.
- New fields:
  - `allowlist_task_keys`: task keys (e.g., `0913-orchestrator-refactor-roadmap`) whose linked docs should never be archived.
  - `allowlist_paths`: glob-style path patterns that should never be archived.
- Allowlist always wins over retention age, line threshold, or registry status.

### Archiver behavior
- Script: `scripts/implementation-docs-archive.mjs`.
- Parse allowlist fields and normalize entries.
- For task-linked docs:
  - If `taskKey` is allowlisted, skip all docs tied to that task and report `allowlist`.
  - If the doc path matches `allowlist_paths`, skip and report `allowlist`.
- For stray docs:
  - If the doc path matches `allowlist_paths`, skip and report `allowlist`.
- Allowlisted docs remain in the docs freshness registry with their existing status.

### Status UI impact
- None: the Status UI does not consume implementation doc contents.

## Testing Strategy
- Run docs-review (pre-change) to capture baseline.
- Run the archiver in dry-run mode to validate allowlist skips in the report.
- Validate changes with the implementation-gate pipeline.

## Documentation & Evidence
- PRD: `docs/PRD-implementation-docs-archive-allowlist.md`
- Action Plan: `docs/ACTION_PLAN-implementation-docs-archive-allowlist.md`
- Task checklist: `tasks/tasks-0927-implementation-docs-archive-allowlist.md`
- Mini-spec: `tasks/specs/0927-implementation-docs-archive-allowlist.md`

## Assumptions
- The allowlist is curated by maintainers who need long-lived docs to remain on main.

## Open Questions (for review agent)
- None.

## Approvals
- Engineering: Pending
- Reviewer: Pending
