# ACTION_PLAN - CO-454 resolve March 31 docs freshness candidate cohorts

## Summary
- Goal: create the CO-454 traceability packet and registry mirrors so autopilot can clear `backlog_head_follow_up_traceability_pending` for the Backlog follow-up.
- Scope: six packet files, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - CO-454 is the canonical follow-up for CO-452's clean-main March 31 docs freshness blocker.
  - The current traceability branch does not resolve the underlying `block_diff_local` decision.
  - Parent CO-454 implementation owns fresh validator evidence and any row refresh/archive/reclassification.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
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
- Not done if:
  - packet or registry mirrors are missing
  - the packet claims CO-452 owns March 31 docs-freshness debt
  - the packet weakens `docs:freshness`, deletes registry rows, or blindly bumps review dates
  - the packet claims owner re-home or cohort resolution without fresh validator evidence
- Pre-implementation issue-quality review:
  - 2026-05-01: CO-454 is not narrower than the user request because its immediate job is traceability packet setup before Backlog promotion, while actual March 31 cohort resolution remains explicitly parent-owned.
  - 2026-05-01: micro-task shortcut is inappropriate because correctness depends on protected terms, exact registry mirrors, and canonical owner marker compatibility.
- Fallback / refactor decision: this branch expires the temporary autopilot traceability hold by adding the missing packet. It does not add a runtime fallback or alter docs freshness behavior.
- Large-refactor check: not applicable; the change is packet and registry metadata only.

## Milestones & Sequencing
1. Reconcile live CO-454 Linear context and source CO-452 lineage.
2. Create the six CO-454 packet files with protected terms, non-goals, Not Done If, and validation boundaries.
3. Register the task in `tasks/index.json`.
4. Add a top snapshot to `docs/TASKS.md`.
5. Add six active rows to `docs/docs-freshness-registry.json`.
6. Run lightweight validation: JSON parse, protected-term scan, and diff whitespace check.
7. Commit, push, and open a draft PR if GitHub auth is available.

## Dependencies
- Linear issue `CO-454` / `9aedac3e-09df-4859-b818-b6f2d4dc8ccc`.
- Source issue `CO-452` / `d412792b-9a2a-43d9-96dc-ca021e728d09`.
- Canonical owner key `docs:freshness:maintain`.
- Existing validator evidence for `block_diff_local`, `co-429-completed-lane-registry-residue`, and `blocking_changed_paths=[]`.

## Validation
- Checks / tests:
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - protected-term scan over the six packet files and `docs/TASKS.md`
  - `git diff --check`
- Rollback plan:
  - revert only the CO-454 packet files, task index item, docs task snapshot, and docs freshness registry rows if the packet is rejected.

## Risks & Mitigations
- Risk: traceability packet gets mistaken for actual freshness resolution.
  - Mitigation: state that parent CO-454 owns fresh validator evidence and the actual row/owner decisions.
- Risk: March 31 rows are blindly bumped or deleted.
  - Mitigation: preserve explicit non-goals against deleting registry rows, weakening freshness, or blind `last_review:2026-03-31` updates.
- Risk: CO-452 scope expands.
  - Mitigation: preserve source CO-452 only as provenance and keep CO-454 as the docs freshness follow-up owner.

## Approvals
- Reviewer: CO-454 traceability packet branch
- Date: 2026-05-01
