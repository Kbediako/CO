---
id: 20260507-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5
title: "CO-511 docs:freshness:maintain packet for CO-102 rows"
relates_to: docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md
last_review: 2026-05-07
owners:
  - Codex
---

# TECH_SPEC - CO-511 docs:freshness:maintain packet for CO-102 rows

This mirror points to the canonical task spec at `tasks/specs/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`.

## Scope
- Preserve the six CO-511 docs-first packet files declared for `linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`.
- Complete parent-owned `docs:freshness:maintain` owner repair through owner metadata, registry mirrors, completed-lane source-spec reclassification, validation evidence, PR lifecycle, workpad, and Linear handoff.
- Preserve `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, and validation gate.
- Record that accepted child-lane scope stayed packet-only while parent implementation owns the lifecycle and metadata surfaces.

## Non-Goals
- No child-lane edits to `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `docs/TASKS.md`, or `tasks/index.json`.
- No child-lane Linear/GitHub helper calls or state transitions.
- No source code, policy, freshness script, spec-guard, or validation gate changes.
- No blind `last_review` bumps, historical CO-102 packet deletion, or folding this into CO-507.

## Acceptance Criteria
- The six packet files exist and cross-reference the same task id.
- PRD, canonical spec, action plan, checklist, and `.agent/task` mirror include acceptance criteria, non-goals, Not Done If, and validation requirements.
- Protected-term scan finds `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, and validation gate across the scoped files.
- Parent-owned owner metadata, registry mirrors, completed-lane reclassification, validation, PR, workpad, and Linear lifecycle surfaces are implemented under live CO-511 evidence.

## Validation Contract
- Child-lane validation is limited to scoped file existence and protected-term scan.
- Parent validation requirements:
  - register/mirror the packet in parent-owned indexes and registries
  - re-home the canonical owner metadata from terminal CO-444 to live CO-511
  - archive or reclassify completed-lane stale rows with `completed_at` evidence where applicable
  - capture clean-main baseline evidence
  - run the appropriate validation gate, including `docs:freshness`, `docs:freshness:maintain -- --format json`, and `node scripts/spec-guard.mjs --dry-run`
  - preserve CO-102 historical evidence rather than deleting rows or blindly bumping `last_review`

## CO-382 Fallback Decision Table
- Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-511 removes the stale active freshness seam for this completed-lane residue instead of adding another owner-routing branch.
- Minor-seam decision: remove the minor docs-freshness seam now by archiving or reclassifying the April 6 completed-lane rows under live CO-511 owner evidence.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Historical CO-102 packet rows with `last_review=2026-04-06` | `remove fallback` | CO-511 parent lane | Terminal owner replacement plus clean-main baseline validation gate | 2026-04-06 | 2026-05-07 | Removed on 2026-05-07 | Completed-lane packet/spec rows are archived or reclassified under live CO-511 owner evidence, with no retained fallback before handoff | Parent-owned `docs:freshness:maintain -- --format json`, `npm run docs:freshness`, and `node scripts/spec-guard.mjs --dry-run` |
