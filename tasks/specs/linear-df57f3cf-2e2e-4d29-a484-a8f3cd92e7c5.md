---
id: 20260507-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5
title: "CO-511 docs:freshness:maintain packet for CO-102 rows"
status: in_progress
owner: Codex
created: 2026-05-07
last_review: 2026-05-07
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md
related_action_plan: docs/ACTION_PLAN-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md
related_tasks:
  - tasks/tasks-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO-511 docs:freshness:maintain packet for CO-102 rows

## Canonical Reference
- PRD: `docs/PRD-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- Task checklist: `tasks/tasks-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`
- Agent mirror: `.agent/task/linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5.md`

## Summary
- Objective: restore live `docs:freshness:maintain` ownership for the CO-102 stale packet-row cluster while preserving the accepted child-lane packet contract, terminal owner replacement evidence, and historical `last_review=2026-04-06` rows.
- Scope:
  - accepted child packet: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and `.agent/task` mirror
  - parent implementation: owner metadata, registry mirrors, completed-lane source-spec reclassification, validation evidence, PR lifecycle, workpad, and Linear handoff
- Constraints:
  - preserve `docs:freshness:maintain`
  - preserve canonical owner key
  - preserve clean-main baseline
  - preserve terminal owner replacement
  - preserve CO-102 packet rows
  - preserve `last_review=2026-04-06`
  - preserve validation gate
  - keep parent-owned registry, owner metadata, validation, PR, workpad, and Linear lifecycle changes tied to live CO-511 evidence rather than child-lane mutation

## Issue-Shaping Contract
- User-request translation:
  - CO-511 needs a live same-project owner for `docs:freshness:maintain`, because terminal CO-444 cannot own the clean-main baseline stale rows.
  - The accepted child packet preserves the issue contract; the parent lane performs the owner/registry/validation work with that contract visible.
  - Historical CO-102 packet rows and `last_review=2026-04-06` must remain evidence, not deletion or blind-refresh targets.
  - The clean-main baseline and validation gate are required parent proof surfaces.
- Protected terms / exact artifact and surface names:
  - `docs:freshness:maintain`
  - canonical owner key
  - clean-main baseline
  - terminal owner replacement
  - CO-102 packet rows
  - `last_review=2026-04-06`
  - validation gate
  - `docs/docs-catalog.json`
  - `docs/docs-freshness-registry.json`
  - `docs/TASKS.md`
  - `tasks/index.json`
- Nearby wrong interpretations to reject:
  - blind `last_review` bumps
  - docs freshness/spec-guard weakening
  - historical CO-102 packet deletion
  - folding this into CO-507
  - treating terminal CO-444 as a live owner
  - treating child-lane scope limits as a prohibition on parent-owned CO-511 owner/registry repair
- Explicit non-goals:
  - no owner metadata edits from the child lane
  - no registry mirror edits from the child lane
  - no validation execution beyond scoped checks from the child lane
  - no Linear/GitHub mutations
  - no CO-507 scope merge

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Accepted child packet | CO-511 packet files exist from the bounded child lane. | Docs-first packet includes six packet/mirror files before parent validation. | Six scoped packet files preserve protected terms and remain traceable to the child manifest. | Additional child mutation of registry, owner, PR, or Linear lifecycle surfaces. |
| Historical rows | CO-102 packet rows carry `last_review=2026-04-06`. | Historical evidence must be classified truthfully, not deleted or blindly refreshed. | Completed-lane rows are archived or reclassified under live CO-511 owner evidence with `completed_at` metadata where the task is completed. | Deleting rows or blind date bumps. |
| Owner route | CO-444 is terminal, so it cannot own current `docs:freshness:maintain` debt. | Owner truth should use the canonical owner key and live same-project evidence. | CO-511 is the live same-project owner stamped with `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`. | Treating terminal CO-444 as usable owner evidence. |
| Validation | Clean-main baseline and validation gate are required proof surfaces. | Validation separates active diff responsibility from baseline debt. | Parent validation proves `docs:freshness:maintain -- --format json` no longer reports `block_unowned_repo_debt` for this cluster. | Weakening `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`. |

## Readiness Gate
- Not done if:
  - any protected term is missing from the packet
  - blind `last_review` bumps, docs freshness/spec-guard weakening, or historical CO-102 packet deletion are used, allowed, or cited as validation evidence
  - CO-511 is folded into CO-507
  - parent-owned owner metadata, registries, source-spec reclassification, workpad, PR, Linear state, or validation surfaces are missing live CO-511 evidence
- Pre-implementation issue-quality review evidence:
  - 2026-05-07: child lane scope is packet-only and can be completed without widening ownership.
  - 2026-05-07: parent-owned validation is explicitly preserved as a later gate.
  - 2026-05-07: parent lane scope includes live owner replacement, registry mirror updates, source-spec reclassification, validation, PR, and Linear lifecycle work.
- Safeguard ownership split:
  - child owns only six packet files
  - parent owns owner metadata, registry mirrors, source-spec reclassification, validation, PR, workpad, and Linear lifecycle

## Technical Requirements
- Functional requirements:
  1. Add the PRD.
  2. Add the TECH_SPEC mirror.
  3. Add the ACTION_PLAN.
  4. Add the canonical task spec.
  5. Add the task checklist.
  6. Add the `.agent/task` mirror.
  7. Include acceptance criteria, non-goals, Not Done If, and validation requirements.
  8. Re-home `docs:freshness:maintain` owner metadata to live CO-511 evidence.
  9. Reclassify or archive completed-lane stale packet/spec rows without deleting historical evidence or blind `last_review` churn.
  10. Record completed task timing for reclassified completed rows.
- Non-functional requirements:
  - docs-only diff inside the declared CO-511 maintenance surfaces
  - concise, reviewable packet
  - parent lifecycle and metadata mutations remain evidence-backed and scoped to CO-511
- Interfaces / contracts:
  - task id: `linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`
  - registry id for parent use: `20260507-linear-df57f3cf-2e2e-4d29-a484-a8f3cd92e7c5`
  - canonical owner marker for parent use: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `docs:freshness:maintain` | Historical CO-102 packet rows with `last_review=2026-04-06` | `remove fallback` | CO-511 parent lane | Terminal owner replacement plus clean-main baseline validation gate | 2026-04-06 | 2026-05-07 | Removed on 2026-05-07 | Completed-lane packet/spec rows are archived or reclassified under live CO-511 owner evidence, with no retained fallback before handoff | Parent-owned `docs:freshness:maintain -- --format json`, `npm run docs:freshness`, and `node scripts/spec-guard.mjs --dry-run` |

- Large-refactor decision: bounded metadata repair; no large refactor is warranted because CO-511 removes the stale active freshness seam for this completed-lane residue instead of adding another owner-routing branch.
- Minor-seam decision: remove the minor docs-freshness seam now by archiving or reclassifying the April 6 completed-lane rows under live CO-511 owner evidence.

## Acceptance Criteria
- The six CO-511 packet files exist in the declared file scope.
- The packet preserves `docs:freshness:maintain`, canonical owner key, clean-main baseline, terminal owner replacement, CO-102 packet rows, `last_review=2026-04-06`, and validation gate.
- The packet rejects blind `last_review` bumps, docs freshness/spec-guard weakening, historical CO-102 packet deletion, and folding this into CO-507.
- Parent-owned owner metadata, registry mirrors, completed-lane reclassification, validation, PR, workpad, and Linear lifecycle surfaces are named and tied to live CO-511 evidence.

## Validation Plan
- Child lane:
  - scoped path existence check
  - scoped protected-term scan
  - `git diff --check`
- Parent lane:
  - registry/index mirror updates
  - clean-main baseline proof
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - review, PR, and Linear handoff gates

## Open Questions
- None.

## Approvals
- Reviewer: CO-511 parent lane
- Date: 2026-05-07
