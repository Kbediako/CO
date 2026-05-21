# ACTION PLAN - CO-570 docs-review change bundle explicit scope

## Summary
- Goal: create the CO-570 docs-first packet and registry mirrors for explicit `docs-review` scope metadata in `change-bundle.json`.
- Scope: declared docs/task packet files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`; parent owns implementation, tests, validation, Linear/workpad state, GitHub/PR lifecycle, and review handoff.
- Assumptions:
  - the parent-provided source anchor is authoritative for this packet
  - `change-bundle.json` is the durable review metadata artifact
  - the parent implementation must distinguish committed branch diff, uncommitted working tree, and base diff review

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs-review`
  - `change-bundle.json`
  - `committed branch diff`
  - `explicit review scope`
  - `bounded review`
  - `uncommitted working tree`
  - `base diff`
- Not done if:
  - protected terms are missing
  - `change-bundle.json` cannot distinguish committed branch diff, uncommitted working tree, and base diff
  - `docs-review` can silently run with ambiguous scope
  - the solution infers scope only from dirty checkout state
  - this child lane edits implementation, tests, Linear state, workpad, PR lifecycle, GitHub state, or review-handoff state
- Pre-implementation issue-quality review:
  - 2026-05-21: approved as a docs-first packet for a review metadata contract. The issue is not a micro-task because correctness depends on exact protected artifact names, explicit non-goals, Not Done If, and parity between three review surfaces.

## Milestones & Sequencing
1. [x] Create PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and `.agent` mirror.
2. [x] Preserve source anchor, source object id, parent manifest pointer, and source payload pointer.
3. [x] Add user request translation, protected terms, wrong interpretations to reject, explicit non-goals, Not Done If, and parity matrix.
4. [x] Record fallback/refactor decision for implicit review-scope inference.
5. [x] Add CO-570 registry mirrors in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
6. [x] Parent reconciles this packet against authoritative Linear issue/workpad truth.
7. [x] Parent inspects `change-bundle.json` producer/consumer seams and implements explicit review scope metadata.
8. [x] Parent adds focused tests for committed branch diff, uncommitted working tree, base diff, and missing/unknown scope diagnostics.
9. [ ] Parent runs scoped validation, review, PR lifecycle, and Linear handoff.

## Parent-Owned Follow-On Plan
1. [x] Locate the `change-bundle.json` producer and `docs-review` consumption path.
2. [x] Choose the smallest explicit review scope representation that separates committed branch diff, uncommitted working tree, and base diff.
3. [x] Preserve existing bundle fields and evidence while adding scope metadata.
4. [x] Make bounded review diagnostics expose the selected scope or fail closed on missing/unknown scope.
5. [x] Add focused tests for each scope and for ambiguous metadata.
6. Run parent-owned docs/review validation and lifecycle handoff.

## Dependencies
- Source anchor `ctx:sha256:d9c322b93b1673e1fcb654e148e78489e74df51b03ab890768e710d3ad9e5bcc#chunk:c000001`.
- Source object id `sha256:d9c322b93b1673e1fcb654e148e78489e74df51b03ab890768e710d3ad9e5bcc`.
- Parent manifest `.runs/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316-docs-packet-r2/cli/2026-05-21T22-29-44-832Z-e1af18db/manifest.json`.
- Parent source payload `.runs/linear-7aeca30c-c52c-4213-9d40-0ac0cf81b316-docs-packet-r2/cli/2026-05-21T22-29-44-832Z-e1af18db/memory/source-0/source.txt`.
- Parent-owned review wrapper / docs-review / change-bundle source seams.

## Validation
- Child-lane checks:
  - protected-term scan over declared files
  - scoped markdown trailing-whitespace check
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `git status --short` confirms changed files stay inside the declared file scope
- Parent-owned checks:
  - committed branch diff scope regression
  - uncommitted working tree scope regression
  - base diff scope regression
  - missing/unknown explicit review scope diagnostics
  - scoped `docs-review` or bounded review evidence after implementation
- Rollback plan: remove the CO-570 docs packet and registry mirror rows from the parent patch import; no source, Linear, GitHub, PR, or review lifecycle rollback is required from this child lane.

## Risks & Mitigations
- Risk: review scope remains implicit and reviewers inspect the wrong surface.
  - Mitigation: Not Done If and parent validation require explicit review scope metadata.
- Risk: `change-bundle.json` grows broad schema churn.
  - Mitigation: parent should add the smallest durable scope representation and preserve unrelated fields.
- Risk: committed branch diff, uncommitted working tree, and base diff are collapsed into one bounded review mode.
  - Mitigation: parity matrix and focused tests require distinct coverage.
- Risk: child lane drifts into lifecycle work.
  - Mitigation: this packet records parent ownership for implementation, review, validation, Linear state, workpad, GitHub/PR lifecycle, and handoff.

## Approvals
- Docs packet child lane: produced in this workspace for parent patch export.
- Parent implementation/review/Linear lifecycle: pending parent ownership.
- Date: 2026-05-21
