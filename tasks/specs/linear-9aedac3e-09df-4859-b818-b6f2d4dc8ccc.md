---
id: 20260501-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc
title: "CO-454 resolve March 31 docs freshness candidate cohorts"
status: in_progress
owner: Codex
created: 2026-05-01
last_review: 2026-05-01
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md
related_tech_spec_mirror: docs/TECH_SPEC-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md
related_action_plan: docs/ACTION_PLAN-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md
related_tasks:
  - tasks/tasks-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md
review_notes:
  - 2026-05-01: Traceability packet branch created the packet and registry mirrors needed before Backlog promotion.
canonical_owner_marker: codex-orchestrator:canonical-owner-key=docs:freshness:maintain
---

# TECH_SPEC - CO-454 resolve March 31 docs freshness candidate cohorts

## Canonical Reference
- PRD: `docs/PRD-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Task checklist: `tasks/tasks-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Agent mirror: `.agent/task/linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc.md`
- Linear issue: `CO-454`
- Source issue: `CO-452`

## Summary
- Objective: create the repo traceability packet and registry mirrors for CO-454 so `backlog_head_follow_up_traceability_pending` no longer blocks Backlog promotion after this PR lands.
- Scope:
  - six packet files
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`
- Constraints:
  - preserve `docs:freshness:maintain`
  - preserve `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - preserve March 31 docs freshness candidate cohorts
  - preserve `block_diff_local`, `co-429-completed-lane-registry-residue`, `candidate-2026-03-31-cadence-30-age-31`, `docs_freshness_candidate`, `last_review:2026-03-31`, and `blocking_changed_paths=[]`
  - avoid source code, tests, validation scripts, Linear state, GitHub lifecycle, and freshness policy changes

## Issue-Shaping Contract
- User-request translation:
  - CO-452 reproduced a clean-main docs freshness blocker that belongs to a canonical CO-454 follow-up.
  - This branch creates the traceability packet and mirrors required before CO-454 leaves Backlog.
  - March 31 candidate cohort repair still requires fresh review rationale and validator evidence.
  - Owner re-home or owner action must not be claimed complete without fresh `docs:freshness:maintain -- --format json` proof.
- Protected terms / exact artifact and surface names:
  - `CO-454`
  - source `CO-452`
  - `docs:freshness:maintain`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - March 31 docs freshness candidate cohorts
  - `block_diff_local`
  - `co-429-completed-lane-registry-residue`
  - `candidate-2026-03-31-cadence-30-age-31`
  - `docs_freshness_candidate`
  - `last_review:2026-03-31`
  - `blocking_changed_paths=[]`
  - `backlog_head_follow_up_traceability_pending`
- Nearby wrong interpretations to reject:
  - CO-452 owns the March 31 stale packet/mirror debt.
  - A packet-only PR fixes `block_diff_local`.
  - Registry rows can be deleted or blindly refreshed to clear validation.
  - `docs:freshness` or `docs:freshness:maintain` can be weakened.
  - Owner re-home is complete without fresh validator evidence.
- Explicit non-goals:
  - no CO-452 js_repl posture changes
  - no source/test/script/package edits
  - no Linear state or GitHub lifecycle mutation from the packet itself
  - no registry row deletion
  - no docs freshness policy weakening

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| CO-454 packet | Linear names required packet files and mirrors; repo lacks them before this branch. | Autopilot traceability follow-ups need packet and registry mirrors before promotion. | Six files plus three mirrors exist in repo. | Promoting Linear or launching worker from this packet branch. |
| `docs:freshness:maintain` evidence | Current evidence is `block_diff_local` with `blocking_changed_paths=[]`. | Machine-readable evidence must remain explicit. | Packet preserves the exact route and blocker terms. | Claiming validator success. |
| March 31 cohorts | Candidate rows are stale candidates under `co-429-completed-lane-registry-residue`. | Candidate cohorts need review rationale and preserved history. | Packet sets the contract for later intentional resolution. | Blind bumps, deletion, or policy weakening. |
| Source lineage | CO-452 reproduced the issue but should not absorb docs freshness maintenance. | Product-scope lanes should not widen into unrelated docs debt. | CO-452 remains provenance; CO-454 owns the follow-up packet and parent resolution. | CO-452 implementation changes. |

## Readiness Gate
- Not done if:
  - any packet file or mirror is missing
  - protected terms are missing
  - the packet weakens docs freshness gates
  - registry rows or historical packets are deleted
  - it claims owner re-home or `block_diff_local` resolution without fresh validator evidence
- Pre-implementation issue-quality review evidence:
  - 2026-05-01: live `linear issue-context` confirmed CO-454 in Backlog with Immediate Traceability and no current PR attachment.
- Safeguard ownership split:
  - this branch owns packet and mirror setup
  - parent CO-454 provider worker owns actual March 31 cohort resolution, fresh validator evidence, Linear state, workpad, PR review, and handoff

## Technical Requirements
1. Create the six CO-454 packet files.
2. Register `20260501-linear-9aedac3e-09df-4859-b818-b6f2d4dc8ccc` in `tasks/index.json`.
3. Add a CO-454 snapshot to `docs/TASKS.md`.
4. Add six active registry rows to `docs/docs-freshness-registry.json`.
5. Preserve the protected terms and non-goals in packet/checklist surfaces.
6. Keep the diff packet-only.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Backlog promotion traceability hold | `backlog_head_follow_up_traceability_pending` while packet files and mirrors are absent | expire fallback | CO-454 | Helper-created follow-up has Immediate Traceability but no repo packet | 2026-05-01 | 2026-05-01 | until packet PR lands | Packet files and registry mirrors exist on main | JSON parse, protected-term scan, `git diff --check` |

- Large-refactor check: not applicable; this branch expires a traceability hold with docs metadata only.

## Acceptance Criteria
- CO-454 packet docs are created in the declared file scope.
- `tasks/index.json` registers the canonical task id.
- `docs/TASKS.md` includes the CO-454 traceability snapshot.
- `docs/docs-freshness-registry.json` includes six active rows with `last_review=2026-05-01`.
- The packet preserves all protected terms.
- The packet does not claim March 31 cohort resolution, registry deletion, docs freshness weakening, or owner re-home completion.

## Validation Plan
- JSON parse for `tasks/index.json`.
- JSON parse for `docs/docs-freshness-registry.json`.
- Protected-term scan over packet files and `docs/TASKS.md`.
- `git diff --check`.
- Parent CO-454 work owns `docs:freshness`, `docs:freshness:maintain -- --format json`, and implementation gate validation after actual cohort decisions.

## Open Questions
- None for traceability packet setup.

## Approvals
- Reviewer: CO-454 traceability packet branch
- Date: 2026-05-01
